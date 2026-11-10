import { prisma } from "@/lib/db";
import { requerirUsuario } from "@/lib/sesion";
import { FormServicio } from "@/components/forms/ServicioForms";
import { Titulo } from "@/components/ui";

export const metadata = { title: "Publicar servicio" };

export default async function NuevoServicio() {
  await requerirUsuario("/servicios/nuevo");
  const categorias = await prisma.categoria.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, icono: true } });
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Titulo sup="Publicar" desc="Cuéntale a la comunidad qué sabes hacer. Podrás editarlo o retirarlo cuando quieras.">
        Publica tu servicio
      </Titulo>
      <div className="tarjeta p-6 sm:p-8">
        <FormServicio categorias={categorias} />
      </div>
    </div>
  );
}
