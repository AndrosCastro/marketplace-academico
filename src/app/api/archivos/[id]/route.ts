// Descarga de archivos del chat: solo para el cliente o el proveedor de la solicitud (RN-12, CP-22).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { usuarioActual, bitacora } from "@/lib/sesion";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await usuarioActual();
  if (!u) return new NextResponse("No autorizado", { status: 401 });

  const m = await prisma.mensaje.findUnique({
    where: { id },
    select: {
      archivoDatos: true,
      archivoNombre: true,
      archivoTipo: true,
      solicitud: { select: { clienteId: true, servicio: { select: { proveedorId: true } } } },
    },
  });
  const participa = m && (m.solicitud.clienteId === u.id || m.solicitud.servicio.proveedorId === u.id);
  if (!m || !participa || !m.archivoDatos) {
    if (m) await bitacora(u.id, "ACCESO_DENEGADO", `archivo ${id}`);
    return new NextResponse("No encontrado", { status: 404 });
  }

  const nombre = (m.archivoNombre ?? "archivo").replace(/["\r\n]/g, "_");
  return new NextResponse(Buffer.from(m.archivoDatos), {
    headers: {
      "Content-Type": m.archivoTipo ?? "application/octet-stream",
      // Siempre como descarga: nunca se ejecuta en el navegador
      "Content-Disposition": `attachment; filename="${nombre.replace(/[^\x20-\x7E]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(nombre)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
