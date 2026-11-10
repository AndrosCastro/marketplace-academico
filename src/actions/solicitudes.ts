"use server";
// M4 - Solicitudes, pago y chat (RF-09 a RF-11, RF-15, RF-16) y M5 - Calificaciones (RF-12, RF-14)
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { solicitudSchema, resenaSchema, pagoSchema, erroresDeCampo } from "@/lib/validacion";
import { requerirUsuario, bitacora, limiteExcedido } from "@/lib/sesion";
import { evaluarTransicion, chatHabilitado, type Accion, type Estado } from "@/lib/estados";
import { calcularPromedio } from "@/lib/reputacion";
import { validarArchivo } from "@/lib/archivos";
import { type EstadoForm, str } from "@/lib/form";

/** Carga la solicitud y determina el rol del usuario; null si no participa (RN-12, CP-18). */
async function solicitudParticipante(solicitudId: string, usuarioId: string) {
  const s = await prisma.solicitud.findUnique({
    where: { id: solicitudId },
    include: { servicio: { select: { proveedorId: true, estado: true, titulo: true } } },
  });
  if (!s) return null;
  const rol = s.clienteId === usuarioId ? "CLIENTE" : s.servicio.proveedorId === usuarioId ? "PROVEEDOR" : null;
  if (!rol) return null;
  return { s, rol: rol as "CLIENTE" | "PROVEEDOR" };
}

// RF-09: crear solicitud
export async function crearSolicitud(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirUsuario();
  const r = solicitudSchema.safeParse({
    servicioId: str(fd, "servicioId"),
    mensaje: str(fd, "mensaje"),
    modalidad: str(fd, "modalidad"),
  });
  if (!r.success) return { campos: erroresDeCampo(r.error) };

  const servicio = await prisma.servicio.findUnique({ where: { id: r.data.servicioId } });
  if (!servicio || servicio.estado !== "ACTIVO") return { error: "El servicio no está disponible (RN-03)." };
  if (servicio.proveedorId === u.id) return { error: "No puedes solicitar tu propio servicio (RN-08)." };

  const abierta = await prisma.solicitud.findFirst({
    where: { servicioId: servicio.id, clienteId: u.id, estado: { in: ["PENDIENTE", "ACEPTADA", "PAGO_CONFIRMADO", "ENTREGADA"] } },
    select: { id: true },
  });
  if (abierta) redirect(`/solicitudes/${abierta.id}?ya=1`);
  if (await limiteExcedido(`solicitud:${u.id}`, 30, 24 * 60 * 60 * 1000)) return { error: "Límite diario de solicitudes alcanzado." };

  const sol = await prisma.solicitud.create({
    data: {
      clienteId: u.id,
      servicioId: servicio.id,
      mensajeInicial: r.data.mensaje,
      modalidad: r.data.modalidad ?? servicio.modalidad,
      precioAcordado: servicio.precio, // precio histórico
    },
  });
  await bitacora(u.id, "SOLICITUD_CREADA", sol.id);
  revalidatePath("/solicitudes");
  redirect(`/solicitudes/${sol.id}?creada=1`);
}

// RF-11: transición de estado según la tabla de la SRS
export async function cambiarEstadoSolicitud(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirUsuario();
  const id = z.string().cuid().safeParse(str(fd, "solicitudId"));
  const accion = z.enum(["ACEPTAR", "RECHAZAR", "CANCELAR", "ENTREGAR", "CONFIRMAR_RECEPCION"]).safeParse(str(fd, "accion"));
  if (!id.success || !accion.success) return { error: "Acción inválida." };

  const p = await solicitudParticipante(id.data, u.id);
  if (!p) {
    await bitacora(u.id, "ACCESO_DENEGADO", `solicitud ${id.data}`);
    return { error: "No participas en esta solicitud." };
  }
  if (accion.data === "ACEPTAR" && p.s.servicio.estado !== "ACTIVO") {
    return { error: "El servicio fue retirado; no se pueden aceptar nuevas solicitudes." };
  }

  const t = evaluarTransicion(p.s.estado as Estado, accion.data as Accion, p.rol);
  if (!t.ok) return { error: t.motivo };

  const ahora = new Date();
  // Actualización condicionada al estado leído: evita condiciones de carrera (doble clic, dos pestañas).
  const res = await prisma.solicitud.updateMany({
    where: { id: p.s.id, estado: p.s.estado },
    data: {
      estado: t.nuevoEstado,
      fechaUltimoCambio: ahora,
      ...(t.nuevoEstado === "ENTREGADA" ? { fechaEntrega: ahora } : {}),
      ...(t.nuevoEstado === "COMPLETADA" ? { fechaFinalizacion: ahora } : {}),
    },
  });
  if (res.count === 0) return { error: "La solicitud cambió mientras tanto. Recarga la página." };

  await bitacora(u.id, `SOLICITUD_${accion.data}`, p.s.id);
  revalidatePath(`/solicitudes/${p.s.id}`);
  revalidatePath("/solicitudes");
  return { ok: "Estado actualizado." };
}

// RF-15: confirmación del pago adelantado (solo proveedor, solo desde ACEPTADA, una sola vez)
export async function confirmarPago(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirUsuario();
  const id = z.string().cuid().safeParse(str(fd, "solicitudId"));
  if (!id.success) return { error: "Solicitud inválida." };
  const datos = pagoSchema.safeParse({ metodoPago: str(fd, "metodoPago"), nota: str(fd, "nota") });
  if (!datos.success) return { campos: erroresDeCampo(datos.error) };

  const p = await solicitudParticipante(id.data, u.id);
  if (!p) return { error: "No participas en esta solicitud." };
  const t = evaluarTransicion(p.s.estado as Estado, "CONFIRMAR_PAGO", p.rol);
  if (!t.ok) return { error: t.motivo };

  const ahora = new Date();
  const res = await prisma.solicitud.updateMany({
    where: { id: p.s.id, estado: "ACEPTADA", fechaPagoConfirmado: null },
    data: {
      estado: "PAGO_CONFIRMADO",
      metodoPago: datos.data.metodoPago,
      notaPago: datos.data.nota,
      fechaPagoConfirmado: ahora,
      fechaUltimoCambio: ahora,
    },
  });
  if (res.count === 0) return { error: "El pago ya fue confirmado o la solicitud cambió." };
  await bitacora(u.id, "PAGO_CONFIRMADO", p.s.id);
  revalidatePath(`/solicitudes/${p.s.id}`);
  return { ok: "Pago confirmado. Ya puedes iniciar el trabajo." };
}

// RF-16: chat con archivos
export async function enviarMensaje(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirUsuario();
  const id = z.string().cuid().safeParse(str(fd, "solicitudId"));
  if (!id.success) return { error: "Solicitud inválida." };
  const p = await solicitudParticipante(id.data, u.id);
  if (!p) {
    await bitacora(u.id, "ACCESO_DENEGADO", `chat ${id.data}`);
    return { error: "No participas en esta conversación." };
  }
  if (!chatHabilitado(p.s.estado as Estado)) return { error: "El chat está en solo lectura porque la solicitud terminó." };

  const contenido = (str(fd, "contenido") ?? "").trim().slice(0, 2000);
  const archivo = fd.get("archivo");
  const hayArchivo = archivo instanceof File && archivo.size > 0;
  if (!contenido && !hayArchivo) return { error: "Escribe un mensaje o adjunta un archivo." };
  if (await limiteExcedido(`mensaje:${u.id}`, 60, 10 * 60 * 1000)) return { error: "Estás enviando mensajes muy rápido. Espera un momento." };

  let adj: { archivoNombre: string; archivoTipo: string; archivoTamano: number; archivoDatos: Uint8Array<ArrayBuffer> } | null = null;
  if (hayArchivo) {
    const bytes = new Uint8Array(await archivo.arrayBuffer());
    const v = validarArchivo(archivo.name, archivo.size, bytes);
    if (!v.ok) return { error: v.error };
    adj = { archivoNombre: v.nombre, archivoTipo: v.mime, archivoTamano: archivo.size, archivoDatos: bytes };
  }

  await prisma.mensaje.create({
    data: { solicitudId: p.s.id, remitenteId: u.id, contenido: contenido || null, ...(adj ?? {}) },
  });
  revalidatePath(`/solicitudes/${p.s.id}`);
  return { ok: "enviado" };
}

// RF-12 + RF-14: calificar y recalcular reputación en una transacción
export async function calificar(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirUsuario();
  const r = resenaSchema.safeParse({
    solicitudId: str(fd, "solicitudId"),
    calificacion: str(fd, "calificacion"),
    comentario: str(fd, "comentario"),
  });
  if (!r.success) return { campos: erroresDeCampo(r.error) };

  const p = await solicitudParticipante(r.data.solicitudId, u.id);
  if (!p || p.rol !== "CLIENTE") return { error: "Solo el cliente de la solicitud puede calificarla (RN-08, RN-09)." };
  if (p.s.estado !== "COMPLETADA") return { error: "Solo se califican solicitudes completadas (RN-06)." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.resena.create({
        data: { solicitudId: p.s.id, calificacion: r.data.calificacion, comentario: r.data.comentario },
      });
      const proveedorId = p.s.servicio.proveedorId;
      const notas = await tx.resena.findMany({
        where: { solicitud: { servicio: { proveedorId } } },
        select: { calificacion: true },
      });
      const promedio = calcularPromedio(notas.map((n) => n.calificacion));
      await tx.usuario.update({ where: { id: proveedorId }, data: { reputacion: promedio, totalResenas: notas.length } });
    });
  } catch {
    return { error: "Esta solicitud ya fue calificada (RN-09)." };
  }
  await bitacora(u.id, "RESENA_CREADA", p.s.id);
  revalidatePath(`/solicitudes/${p.s.id}`);
  revalidatePath(`/usuarios/${p.s.servicio.proveedorId}`);
  return { ok: "¡Gracias por tu calificación!" };
}
