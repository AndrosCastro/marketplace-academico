"use server";
// RF-03: gestión del perfil. Solo se modifica el perfil del usuario con sesión
// (el id se toma de la sesión del servidor, nunca del formulario).
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { perfilSchema, contraseniaSchema, erroresDeCampo } from "@/lib/validacion";
import { requerirUsuario, bitacora, crearSesion } from "@/lib/sesion";
import { type EstadoForm, str } from "@/lib/form";

export async function actualizarPerfil(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirUsuario();
  const r = perfilSchema.safeParse({
    nombre: str(fd, "nombre"),
    carrera: str(fd, "carrera"),
    descripcion: str(fd, "descripcion"),
    habilidades: str(fd, "habilidades"),
    contacto: str(fd, "contacto"),
  });
  if (!r.success) return { campos: erroresDeCampo(r.error) };

  await prisma.usuario.update({ where: { id: u.id }, data: r.data });
  await bitacora(u.id, "PERFIL_ACTUALIZADO");
  revalidatePath("/perfil");
  revalidatePath(`/usuarios/${u.id}`);
  return { ok: "Perfil actualizado correctamente." };
}

export async function cambiarContrasenia(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirUsuario();
  const actual = str(fd, "actual") ?? "";
  const nueva = contraseniaSchema.safeParse(str(fd, "nueva"));
  if (!nueva.success) return { campos: { nueva: nueva.error.issues[0].message } };
  if (nueva.data !== str(fd, "confirmacion")) return { campos: { confirmacion: "Las contraseñas no coinciden." } };

  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: u.id } });
  if (!(await bcrypt.compare(actual, usuario.contrasenia))) return { campos: { actual: "La contraseña actual no es correcta." } };

  await prisma.usuario.update({ where: { id: u.id }, data: { contrasenia: await bcrypt.hash(nueva.data, 12) } });
  // Cierra todas las demás sesiones abiertas y crea una nueva para este dispositivo.
  await prisma.sesion.deleteMany({ where: { usuarioId: u.id } });
  await crearSesion(u.id);
  await bitacora(u.id, "CONTRASENIA_CAMBIADA");
  return { ok: "Contraseña actualizada. Se cerraron las sesiones en otros dispositivos." };
}
