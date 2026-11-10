import { prisma } from "@/lib/db";
import { requerirUsuario, bitacora } from "@/lib/sesion";
import { FormServicio } from "@/components/forms/ServicioForms";
import { Titulo, Vacio } from "@/components/ui";

export const metadata = { title: "Editar servicio" };

export default async function EditarServicio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requerirUsuario(`/servicios/${id}/editar`);
  const s = await prisma.servicio.findUnique({ where: { id } });
  // RN-02: solo el propietario
  if (!s || s.proveedorId !== u.id) {
    if (s) await bitacora(u.id, "ACCESO_DENEGADO", `pantalla editar ${id}`);
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Vacio titulo="Acceso denegado">Solo el propietario puede modificar este servicio.</Vacio>
      </div>
    );
  }
  const categorias = await prisma.categoria.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, icono: true } });
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Titulo sup="Editar">{s.titulo}</Titulo>
      <div className="tarjeta p-6 sm:p-8">
        <FormServicio
          categorias={categorias}
          inicial={{
            id: s.id,
            titulo: s.titulo,
            descripcion: s.descripcion,
            categoriaId: String(s.categoriaId),
            precio: s.precio.toString(),
            unidadPrecio: s.unidadPrecio,
            modalidad: s.modalidad ?? "",
            horario: s.horario ?? "",
          }}
        />
      </div>
    </div>
  );
}
