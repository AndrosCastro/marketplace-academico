// =====================================================================
// Autenticación y sesiones (RF-02, RNF-02).
// - Sesiones guardadas en el servidor (tabla "sesiones"): cerrar sesión las destruye de verdad.
// - La cookie solo lleva un token aleatorio de 256 bits; en la BD se guarda su HMAC-SHA256.
// - Cookie HttpOnly + Secure + SameSite=Lax (protege contra XSS y CSRF).
// - Expira tras 30 minutos de inactividad (propuesta de la SRS).
// =====================================================================
import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createHmac, randomBytes } from "node:crypto";
import { prisma } from "./db";

export const INACTIVIDAD_MS = 30 * 60 * 1000;
const RENOVAR_CADA_MS = 60 * 1000;
const DURACION_COOKIE_S = 8 * 60 * 60; // tope absoluto de la cookie; la BD controla la inactividad

const PROD = process.env.NODE_ENV === "production";
export const COOKIE_SESION = PROD ? "__Host-mk_sesion" : "mk_sesion";

function secreto(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET no está configurado o es demasiado corto (mínimo 32 caracteres).");
  }
  return s;
}

export function hashToken(token: string): string {
  return createHmac("sha256", secreto()).update(token).digest("hex");
}

export async function ipCliente(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim().slice(0, 64);
}

/** Crea la sesión en BD y coloca la cookie. Solo se llama desde Server Actions. */
export async function crearSesion(usuarioId: string) {
  const token = randomBytes(32).toString("base64url");
  const h = await headers();
  await prisma.sesion.create({
    data: {
      tokenHash: hashToken(token),
      usuarioId,
      expira: new Date(Date.now() + INACTIVIDAD_MS),
      userAgent: h.get("user-agent")?.slice(0, 255) ?? null,
    },
  });
  // Limpieza oportunista de sesiones vencidas del usuario
  await prisma.sesion.deleteMany({ where: { usuarioId, expira: { lt: new Date() } } });

  const c = await cookies();
  c.set(COOKIE_SESION, token, {
    httpOnly: true,
    secure: PROD,
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_COOKIE_S,
  });
}

export async function destruirSesion() {
  const c = await cookies();
  const token = c.get(COOKIE_SESION)?.value;
  if (token) await prisma.sesion.deleteMany({ where: { tokenHash: hashToken(token) } });
  c.delete(COOKIE_SESION);
}

export type UsuarioSesion = {
  id: string;
  nombre: string;
  correo: string;
  rol: "ESTUDIANTE" | "ADMIN";
};

/** Devuelve el usuario autenticado o null. Se memoriza por petición. */
export const usuarioActual = cache(async (): Promise<UsuarioSesion | null> => {
  const c = await cookies();
  const token = c.get(COOKIE_SESION)?.value;
  if (!token || token.length > 100) return null;

  const sesion = await prisma.sesion.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { usuario: { select: { id: true, nombre: true, correo: true, rol: true, activo: true } } },
  });
  if (!sesion) return null;

  const ahora = Date.now();
  if (sesion.expira.getTime() < ahora || !sesion.usuario.activo) {
    await prisma.sesion.delete({ where: { id: sesion.id } }).catch(() => {});
    return null;
  }

  // Expiración deslizante: cada actividad extiende 30 minutos.
  if (ahora - sesion.ultimoUso.getTime() > RENOVAR_CADA_MS) {
    await prisma.sesion
      .update({ where: { id: sesion.id }, data: { ultimoUso: new Date(ahora), expira: new Date(ahora + INACTIVIDAD_MS) } })
      .catch(() => {});
  }

  const { id, nombre, correo, rol } = sesion.usuario;
  return { id, nombre, correo, rol };
});

/** Exige sesión; si no hay, redirige al inicio de sesión (RF-02). */
export async function requerirUsuario(destino?: string): Promise<UsuarioSesion> {
  const u = await usuarioActual();
  if (!u) redirect(`/login${destino ? `?next=${encodeURIComponent(destino)}` : ""}`);
  return u;
}

export async function requerirAdmin(): Promise<UsuarioSesion> {
  const u = await requerirUsuario("/admin");
  if (u.rol !== "ADMIN") redirect("/?error=sin-permiso");
  return u;
}

// ---------------------------------------------------------------------
// Limitación de intentos (fuerza bruta)
// ---------------------------------------------------------------------
const VENTANA_MS = 15 * 60 * 1000;
const MAX_FALLOS_CORREO = 5;
const MAX_FALLOS_IP = 30;

export async function accesoBloqueado(correo: string, ip: string): Promise<boolean> {
  const desde = new Date(Date.now() - VENTANA_MS);
  const [porCorreo, porIp] = await Promise.all([
    prisma.intentoAcceso.count({ where: { clave: `correo:${correo}`, exitoso: false, fecha: { gte: desde } } }),
    prisma.intentoAcceso.count({ where: { clave: `ip:${ip}`, exitoso: false, fecha: { gte: desde } } }),
  ]);
  return porCorreo >= MAX_FALLOS_CORREO || porIp >= MAX_FALLOS_IP;
}

export async function registrarIntento(correo: string, ip: string, exitoso: boolean) {
  await prisma.intentoAcceso.createMany({
    data: [
      { clave: `correo:${correo}`, exitoso },
      { clave: `ip:${ip}`, exitoso },
    ],
  });
  if (exitoso) {
    // Un acceso correcto reinicia el contador del correo.
    await prisma.intentoAcceso.deleteMany({ where: { clave: `correo:${correo}`, exitoso: false } });
  }
}

/** Limita acciones repetitivas (registro, mensajes, reportes) por clave. */
export async function limiteExcedido(clave: string, max: number, ventanaMs: number): Promise<boolean> {
  const desde = new Date(Date.now() - ventanaMs);
  const n = await prisma.intentoAcceso.count({ where: { clave, fecha: { gte: desde } } });
  if (n >= max) return true;
  await prisma.intentoAcceso.create({ data: { clave, exitoso: true } });
  return false;
}

export async function bitacora(usuarioId: string | null, accion: string, detalle?: string) {
  await prisma.bitacora.create({ data: { usuarioId, accion, detalle: detalle?.slice(0, 500) } }).catch(() => {});
}
