// RF-10: consulta de solicitudes enviadas y recibidas
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requerirUsuario } from "@/lib/sesion";
import { hace, lempiras } from "@/lib/formato";
import { etiquetaEstado, type Estado } from "@/lib/estados";
import { Avatar, BadgeEstado, Titulo, Vacio } from "@/components/ui";

export const metadata = { title: "Mis solicitudes" };

const ESTADOS: Estado[] = ["PENDIENTE", "ACEPTADA", "PAGO_CONFIRMADO", "ENTREGADA", "COMPLETADA", "RECHAZADA", "CANCELADA"];

export default async function Solicitudes({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requerirUsuario("/solicitudes");
  const sp = await searchParams;
  const rol = sp.rol === "recibidas" ? "recibidas" : sp.rol === "enviadas" ? "enviadas" : "todas";
  const estado = ESTADOS.includes(sp.estado as Estado) ? (sp.estado as Estado) : undefined;

  // Solo solicitudes donde el usuario es cliente o proveedor del servicio
  const participa: Prisma.SolicitudWhereInput =
    rol === "enviadas" ? { clienteId: u.id } : rol === "recibidas" ? { servicio: { proveedorId: u.id } } : { OR: [{ clienteId: u.id }, { servicio: { proveedorId: u.id } }] };

  const lista = await prisma.solicitud.findMany({
    where: { ...participa, ...(estado ? { estado } : {}) },
    orderBy: { fechaUltimoCambio: "desc" },
    take: 100,
    select: {
      id: true,
      estado: true,
      precioAcordado: true,
      fechaUltimoCambio: true,
      clienteId: true,
      cliente: { select: { id: true, nombre: true } },
      servicio: { select: { titulo: true, proveedor: { select: { id: true, nombre: true } } } },
      resena: { select: { id: true } },
      _count: { select: { mensajes: true } },
    },
  });

  const tab = (r: string, txt: string) => {
    const q = new URLSearchParams();
    if (r !== "todas") q.set("rol", r);
    if (estado) q.set("estado", estado);
    return (
      <Link
        href={`/solicitudes${q.size ? "?" + q : ""}`}
        className={`rounded-lg px-3.5 py-2 text-sm font-semibold ${rol === r ? "bg-bosque-700 text-white" : "text-tinta/70 hover:bg-bosque-50"}`}
      >
        {txt}
      </Link>
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Titulo sup="Seguimiento" desc="Las que enviaste como cliente y las que recibiste como proveedor.">
        Mis solicitudes
      </Titulo>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="tarjeta inline-flex gap-1 p-1">
          {tab("todas", "Todas")}
          {tab("enviadas", "Enviadas")}
          {tab("recibidas", "Recibidas")}
        </div>
        <form className="flex items-center gap-2">
          {rol !== "todas" && <input type="hidden" name="rol" value={rol} />}
          <label htmlFor="estado" className="text-sm font-medium text-tinta/60">
            Estado
          </label>
          <select id="estado" name="estado" defaultValue={estado ?? ""} className="campo w-auto py-2">
            <option value="">Todos</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {etiquetaEstado(e)}
              </option>
            ))}
          </select>
          <button className="btn-secundario py-2">Filtrar</button>
        </form>
      </div>

      {lista.length === 0 ? (
        <Vacio titulo="No hay solicitudes aquí">
          Explora el{" "}
          <Link href="/servicios" className="font-semibold text-bosque-700 underline">
            catálogo
          </Link>{" "}
          para solicitar tu primer servicio.
        </Vacio>
      ) : (
        <ul className="space-y-3">
          {lista.map((s) => {
            const soyCliente = s.clienteId === u.id;
            const otra = soyCliente ? s.servicio.proveedor : s.cliente;
            const meToca =
              (!soyCliente && (s.estado === "PENDIENTE" || s.estado === "ACEPTADA" || s.estado === "PAGO_CONFIRMADO")) ||
              (soyCliente && (s.estado === "ENTREGADA" || (s.estado === "COMPLETADA" && !s.resena)));
            return (
              <li key={s.id}>
                <Link href={`/solicitudes/${s.id}`} className="tarjeta flex flex-wrap items-center gap-4 p-4 transition hover:border-bosque-300 sm:flex-nowrap">
                  <Avatar id={otra.id} nombre={otra.nombre} tam={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{s.servicio.titulo}</p>
                    <p className="text-sm text-tinta/60">
                      <span className={`chip mr-1.5 py-0.5 ${soyCliente ? "bg-sky-50 text-sky-800" : "bg-mango-300/40 text-tinta"}`}>
                        {soyCliente ? "Enviada" : "Recibida"}
                      </span>
                      {soyCliente ? "Proveedor" : "Cliente"}: {otra.nombre} · {lempiras(s.precioAcordado)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <BadgeEstado estado={s.estado} />
                    <span className="text-xs text-tinta/50">
                      {hace(s.fechaUltimoCambio)} · 💬 {s._count.mensajes}
                    </span>
                  </div>
                  {meToca && <span className="chip bg-mango-400 text-oscuro">Requiere tu acción</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
