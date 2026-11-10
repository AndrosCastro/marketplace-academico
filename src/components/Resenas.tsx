import { prisma } from "@/lib/db";
import { fecha } from "@/lib/formato";
import { Avatar } from "./ui";

/** RF-13: reseñas de solicitudes completadas de un proveedor, de la más reciente a la más antigua. */
export async function listarResenas(proveedorId: string, pagina = 1, porPagina = 10) {
  const where = { solicitud: { servicio: { proveedorId } } };
  const [total, filas] = await Promise.all([
    prisma.resena.count({ where }),
    prisma.resena.findMany({
      where,
      orderBy: { fechaResena: "desc" },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      select: {
        id: true,
        calificacion: true,
        comentario: true,
        fechaResena: true,
        solicitud: { select: { servicio: { select: { titulo: true } }, cliente: { select: { id: true, nombre: true } } } },
      },
    }),
  ]);
  return { total, filas };
}

export function ListaResenas({ filas }: { filas: Awaited<ReturnType<typeof listarResenas>>["filas"] }) {
  if (filas.length === 0) return <p className="rounded-xl bg-bosque-50 px-4 py-6 text-center text-sm font-medium text-tinta/60">Sin calificaciones</p>;
  return (
    <ul className="divide-y divide-tinta/10">
      {filas.map((r) => (
        <li key={r.id} className="flex gap-3 py-4">
          <Avatar id={r.solicitud.cliente.id} nombre={r.solicitud.cliente.nombre} tam={36} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-sm font-bold">{r.solicitud.cliente.nombre}</span>
              <span className="text-sm text-mango-500" aria-label={`${r.calificacion} de 5`}>
                {"★".repeat(r.calificacion)}
                <span className="text-tinta/15">{"★".repeat(5 - r.calificacion)}</span>
              </span>
              <span className="text-xs text-tinta/50">{fecha(r.fechaResena)}</span>
            </div>
            <p className="text-xs text-tinta/55">Servicio: {r.solicitud.servicio.titulo}</p>
            {r.comentario && <p className="mt-1.5 text-sm text-tinta/80">{r.comentario}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
