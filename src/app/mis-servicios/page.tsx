import Link from "next/link";
import { prisma } from "@/lib/db";
import { requerirUsuario } from "@/lib/sesion";
import { cambiarEstadoServicio } from "@/actions/servicios";
import { lempiras, fecha } from "@/lib/formato";
import { Titulo, Vacio, Aviso } from "@/components/ui";
import { ConfirmarBoton } from "@/components/forms/ConfirmarBoton";

export const metadata = { title: "Mis servicios" };

export default async function MisServicios({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requerirUsuario("/mis-servicios");
  const sp = await searchParams;
  const servicios = await prisma.servicio.findMany({
    where: { proveedorId: u.id },
    orderBy: [{ estado: "asc" }, { fechaPublicacion: "desc" }],
    include: {
      categoria: { select: { nombre: true, icono: true } },
      _count: { select: { solicitudes: true } },
      solicitudes: { where: { estado: "PENDIENTE" }, select: { id: true } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Titulo sup="Proveedor" desc="Administra tus publicaciones. Un servicio retirado conserva su historial y reseñas (RN-10).">
          Mis servicios
        </Titulo>
        <Link href="/servicios/nuevo" className="btn-acento">
          + Publicar servicio
        </Link>
      </div>
      <div className="mb-5 space-y-2">
        {sp.retirado && <Aviso>Servicio retirado del catálogo.</Aviso>}
        {sp.reactivado && <Aviso>Servicio publicado de nuevo.</Aviso>}
        {sp.error === "denegado" && <Aviso tipo="error">Acceso denegado.</Aviso>}
      </div>

      {servicios.length === 0 ? (
        <Vacio titulo="Todavía no publicas servicios">
          ¿Eres bueno en algo? Programación, matemáticas, idiomas, diseño…{" "}
          <Link href="/servicios/nuevo" className="font-semibold text-bosque-700 underline">
            Publica tu primer servicio
          </Link>
        </Vacio>
      ) : (
        <div className="tarjeta overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-tinta/10 text-xs tracking-wider text-tinta/55 uppercase">
              <tr>
                <th className="px-5 py-3">Servicio</th>
                <th className="px-3 py-3">Precio</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3">Solicitudes</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tinta/5">
              {servicios.map((s) => (
                <tr key={s.id} className={s.estado === "RETIRADO" ? "bg-zinc-50 text-tinta/60" : ""}>
                  <td className="px-5 py-4">
                    <Link href={`/servicios/${s.id}`} className="font-semibold hover:text-bosque-700">
                      {s.titulo}
                    </Link>
                    <p className="text-xs text-tinta/55">
                      {s.categoria.icono} {s.categoria.nombre} · {fecha(s.fechaPublicacion)}
                    </p>
                  </td>
                  <td className="px-3 py-4 font-semibold">{lempiras(s.precio)}</td>
                  <td className="px-3 py-4">
                    <span className={`chip ${s.estado === "ACTIVO" ? "bg-bosque-100 text-bosque-800" : "bg-zinc-200 text-zinc-700"}`}>
                      {s.estado === "ACTIVO" ? "Activo" : "Retirado"}
                    </span>
                  </td>
                  <td className="px-3 py-4">
                    {s._count.solicitudes}
                    {s.solicitudes.length > 0 && <span className="chip ml-2 bg-mango-300 text-oscuro">{s.solicitudes.length} nuevas</span>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Link href={`/servicios/${s.id}/editar`} className="btn-secundario px-3 py-1.5 text-xs">
                        Editar
                      </Link>
                      <form action={cambiarEstadoServicio}>
                        <input type="hidden" name="id" value={s.id} />
                        {s.estado === "ACTIVO" ? (
                          <>
                            <input type="hidden" name="estado" value="RETIRADO" />
                            <ConfirmarBoton
                              clase="btn-peligro px-3 py-1.5 text-xs"
                              mensaje="¿Retirar este servicio? Dejará de aparecer en el catálogo y no recibirá nuevas solicitudes. Las solicitudes en curso continúan."
                            >
                              Retirar
                            </ConfirmarBoton>
                          </>
                        ) : (
                          <>
                            <input type="hidden" name="estado" value="ACTIVO" />
                            <button className="btn-secundario px-3 py-1.5 text-xs">Reactivar</button>
                          </>
                        )}
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
