"use server";
// M1 - Cuentas: registro (RF-01), inicio y cierre de sesión (RF-02)
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { registroSchema, loginSchema, erroresDeCampo, dominioPermitido } from "@/lib/validacion";
import {
  crearSesion,
  destruirSesion,
  accesoBloqueado,
  registrarIntento,
  ipCliente,
  bitacora,
  usuarioActual,
} from "@/lib/sesion";
import { type EstadoForm, rutaSegura, valoresDe, str } from "@/lib/form";

const COSTO_BCRYPT = 12;
// Cuentas nuevas permitidas por red y por hora (configurable; en una universidad muchos comparten la misma red).
const MAX_REGISTROS_HORA = Math.max(1, Number(process.env.MAX_REGISTROS_HORA) || 30);
// Hash ficticio para igualar el tiempo de respuesta cuando el correo no existe (evita enumerar cuentas).
const HASH_FICTICIO = "$2b$12$CnojZToP3EH0pcI0zbHJA.hAE.UJFUvfLhUnsoxwMvklxAjhZD0/6";

export async function registrar(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const valores = valoresDe(fd, ["nombre", "correo", "carrera"]);
  const r = registroSchema.safeParse({
    nombre: str(fd, "nombre"),
    correo: str(fd, "correo"),
    carrera: str(fd, "carrera"),
    contrasenia: str(fd, "contrasenia"),
    confirmacion: str(fd, "confirmacion"),
  });
  if (!r.success) return { campos: erroresDeCampo(r.error), valores };

  // Límite anti-abuso: solo cuentan las cuentas creadas con éxito (no los intentos con errores).
  const ip = await ipCliente();
  const claveRegistro = `registro:${ip}`;
  const creadasUltimaHora = await prisma.intentoAcceso.count({
    where: { clave: claveRegistro, fecha: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (creadasUltimaHora >= MAX_REGISTROS_HORA) {
    return { error: "Demasiados registros desde esta red. Intenta más tarde.", valores };
  }
  if (!dominioPermitido(r.data.correo)) {
    return { campos: { correo: "Acceso exclusivo para la comunidad universitaria: usa tu correo institucional." }, valores };
  }

  const existe = await prisma.usuario.findUnique({ where: { correo: r.data.correo }, select: { id: true } });
  if (existe) return { campos: { correo: "Este correo ya está registrado." }, valores };

  const hash = await bcrypt.hash(r.data.contrasenia, COSTO_BCRYPT);
  try {
    const u = await prisma.usuario.create({
      data: { nombre: r.data.nombre, correo: r.data.correo, carrera: r.data.carrera, contrasenia: hash },
    });
    await bitacora(u.id, "REGISTRO");
    await prisma.intentoAcceso.create({ data: { clave: claveRegistro, exitoso: true } });
  } catch {
    return { campos: { correo: "Este correo ya está registrado." }, valores };
  }
  redirect("/login?registrado=1");
}

export async function iniciarSesion(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const valores = valoresDe(fd, ["correo"]);
  const r = loginSchema.safeParse({ correo: str(fd, "correo"), contrasenia: str(fd, "contrasenia") });
  if (!r.success) return { campos: erroresDeCampo(r.error), valores };

  const { correo, contrasenia } = r.data;
  const ip = await ipCliente();

  if (await accesoBloqueado(correo, ip)) {
    return { error: "Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo.", valores };
  }

  const usuario = await prisma.usuario.findUnique({ where: { correo } });
  const valida = await bcrypt.compare(contrasenia, usuario?.contrasenia ?? HASH_FICTICIO);

  if (!usuario || !valida) {
    await registrarIntento(correo, ip, false);
    await bitacora(usuario?.id ?? null, "LOGIN_FALLIDO", `correo=${correo}`);
    // Mensaje general: no indica cuál dato falló (RF-02)
    return { error: "Correo o contraseña incorrectos.", valores };
  }
  if (!usuario.activo) {
    return { error: "Tu cuenta está suspendida. Contacta a la administración.", valores };
  }

  await registrarIntento(correo, ip, true);
  await crearSesion(usuario.id);
  await bitacora(usuario.id, "LOGIN");
  redirect(rutaSegura(str(fd, "next")));
}

export async function cerrarSesion() {
  const u = await usuarioActual();
  await destruirSesion();
  if (u) await bitacora(u.id, "LOGOUT");
  redirect("/?sesion=cerrada");
}
