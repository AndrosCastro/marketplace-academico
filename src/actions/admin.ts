"use server";
// Panel de administración (evolución prevista 2.6 de la SRS): moderar reportes y cuentas.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requerirAdmin, bitacora } from "@/lib/sesion";
import { str } from "@/lib/form";

export async function resolverReporte(fd: FormData) {
  const admin = await requerirAdmin();
  const id = z.string().cuid().safeParse(str(fd, "reporteId"));
  const decision = z.enum(["RETIRAR", "DESCARTAR"]).safeParse(str(fd, "decision"));
  if (!id.success || !decision.success) return;

  const rep = await prisma.reporte.findUnique({ where: { id: id.data } });
  if (!rep) return;
  if (decision.data === "RETIRAR") {
    await prisma.$transaction([
      prisma.servicio.update({ where: { id: rep.servicioId }, data: { estado: "RETIRADO" } }),
      prisma.reporte.updateMany({ where: { servicioId: rep.servicioId, estado: "ABIERTO" }, data: { estado: "RESUELTO" } }),
    ]);
  } else {
    await prisma.reporte.update({ where: { id: rep.id }, data: { estado: "DESCARTADO" } });
  }
  await bitacora(admin.id, `ADMIN_REPORTE_${decision.data}`, rep.servicioId);
  revalidatePath("/admin");
}

export async function cambiarEstadoUsuario(fd: FormData) {
  const admin = await requerirAdmin();
  const id = z.string().cuid().safeParse(str(fd, "usuarioId"));
  const activo = str(fd, "activo") === "true";
  if (!id.success || id.data === admin.id) return; // un admin no puede suspenderse a sí mismo
  const objetivo = await prisma.usuario.findUnique({ where: { id: id.data }, select: { rol: true } });
  if (!objetivo || objetivo.rol === "ADMIN") return;

  await prisma.usuario.update({ where: { id: id.data }, data: { activo } });
  if (!activo) await prisma.sesion.deleteMany({ where: { usuarioId: id.data } }); // expulsa sesiones activas
  await bitacora(admin.id, activo ? "ADMIN_USUARIO_REACTIVADO" : "ADMIN_USUARIO_SUSPENDIDO", id.data);
  revalidatePath("/admin");
}
