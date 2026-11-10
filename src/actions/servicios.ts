"use server";
// M2 - Servicios: publicar (RF-04), editar y retirar (RF-05). Reporte de servicios (RN-11).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { servicioSchema, erroresDeCampo, violaIntegridadAcademica } from "@/lib/validacion";
import { requerirUsuario, bitacora, limiteExcedido } from "@/lib/sesion";
import { type EstadoForm, valoresDe, str } from "@/lib/form";

const CAMPOS = ["titulo", "descripcion", "categoriaId", "precio", "unidadPrecio", "modalidad", "horario"];

function leerServicio(fd: FormData) {
  return servicioSchema.safeParse(Object.fromEntries(CAMPOS.map((c) => [c, str(fd, c)])));
}

async function validarCategoria(id: number) {
  return !!(await prisma.categoria.findUnique({ where: { id }, select: { id: true } }));
}

export async function crearServicio(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirUsuario();
  const valores = valoresDe(fd, CAMPOS);
  const r = leerServicio(fd);
  if (!r.success) return { campos: erroresDeCampo(r.error), valores };
  if (!(await validarCategoria(r.data.categoriaId))) return { campos: { categoriaId: "Categoría inexistente." }, valores };
  if (violaIntegridadAcademica(r.data.titulo, r.data.descripcion)) {
    return {
      error: "La publicación parece ofrecer hacer tareas o exámenes por otra persona. Esto no está permitido (RN-11, integridad académica).",
      valores,
    };
  }
  if (await limiteExcedido(`publicar:${u.id}`, 20, 24 * 60 * 60 * 1000)) {
    return { error: "Alcanzaste el límite de publicaciones por día.", valores };
  }

  const s = await prisma.servicio.create({ data: { ...r.data, proveedorId: u.id } });
  await bitacora(u.id, "SERVICIO_PUBLICADO", s.id);
  revalidatePath("/servicios");
  redirect(`/servicios/${s.id}?publicado=1`);
}

/** Obtiene un servicio verificando que el usuario sea su propietario (RN-02). */
async function servicioPropio(servicioId: string, usuarioId: string) {
  const s = await prisma.servicio.findUnique({ where: { id: servicioId } });
  if (!s || s.proveedorId !== usuarioId) return null;
  return s;
}

export async function editarServicio(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirUsuario();
  const id = z.string().cuid().safeParse(str(fd, "id"));
  if (!id.success) return { error: "Servicio inválido." };
  const s = await servicioPropio(id.data, u.id);
  if (!s) {
    await bitacora(u.id, "ACCESO_DENEGADO", `editar servicio ${id.data}`);
    return { error: "Acceso denegado: solo el propietario puede modificar este servicio." };
  }
  const valores = valoresDe(fd, CAMPOS);
  const r = leerServicio(fd);
  if (!r.success) return { campos: erroresDeCampo(r.error), valores };
  if (!(await validarCategoria(r.data.categoriaId))) return { campos: { categoriaId: "Categoría inexistente." }, valores };
  if (violaIntegridadAcademica(r.data.titulo, r.data.descripcion)) {
    return { error: "La publicación infringe la regla de integridad académica (RN-11).", valores };
  }
  await prisma.servicio.update({ where: { id: s.id }, data: r.data });
  await bitacora(u.id, "SERVICIO_EDITADO", s.id);
  revalidatePath(`/servicios/${s.id}`);
  redirect(`/servicios/${s.id}?editado=1`);
}

export async function cambiarEstadoServicio(fd: FormData) {
  const u = await requerirUsuario();
  const id = z.string().cuid().safeParse(str(fd, "id"));
  const nuevo = z.enum(["ACTIVO", "RETIRADO"]).safeParse(str(fd, "estado"));
  if (!id.success || !nuevo.success) return;
  const s = await servicioPropio(id.data, u.id);
  if (!s) {
    await bitacora(u.id, "ACCESO_DENEGADO", `estado servicio ${id.data}`);
    redirect("/mis-servicios?error=denegado");
  }
  await prisma.servicio.update({ where: { id: s.id }, data: { estado: nuevo.data } });
  await bitacora(u.id, nuevo.data === "RETIRADO" ? "SERVICIO_RETIRADO" : "SERVICIO_REACTIVADO", s.id);
  revalidatePath("/mis-servicios");
  revalidatePath("/servicios");
  redirect(`/mis-servicios?${nuevo.data === "RETIRADO" ? "retirado" : "reactivado"}=1`);
}

export async function reportarServicio(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirUsuario();
  const id = z.string().cuid().safeParse(str(fd, "servicioId"));
  const motivo = z.string().trim().min(10, "Explica el motivo (mínimo 10 caracteres).").max(500).safeParse(str(fd, "motivo"));
  if (!id.success) return { error: "Servicio inválido." };
  if (!motivo.success) return { campos: { motivo: motivo.error.issues[0].message } };
  const s = await prisma.servicio.findUnique({ where: { id: id.data }, select: { proveedorId: true } });
  if (!s) return { error: "Servicio inexistente." };
  if (s.proveedorId === u.id) return { error: "No puedes reportar tu propio servicio." };
  if (await limiteExcedido(`reporte:${u.id}`, 10, 24 * 60 * 60 * 1000)) return { error: "Límite de reportes diario alcanzado." };
  try {
    await prisma.reporte.create({ data: { servicioId: id.data, reportanteId: u.id, motivo: motivo.data } });
  } catch {
    return { error: "Ya reportaste este servicio. La administración lo revisará." };
  }
  await bitacora(u.id, "SERVICIO_REPORTADO", id.data);
  return { ok: "Gracias. El reporte fue enviado a la administración." };
}
