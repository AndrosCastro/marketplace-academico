// Panel de administración: métricas, moderación de reportes, cuentas y bitácora de seguridad.
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requerirAdmin } from "@/lib/sesion";
import { resolverReporte, cambiarEstadoUsuario } from "@/actions/admin";
import { fechaHora, hace } from "@/lib/formato";
import { etiquetaEstado, type Estado } from "@/lib/estados";
import { Titulo } from "@/components/ui";
import { ConfirmarBoton } from "@/components/forms/ConfirmarBoton";

export const metadata = { title: "Administración" };

export default async function Admin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requerirAdmin();
  const sp = await searchParams;
  const qUsuario = (sp.u ?? "").trim().slice(0, 80);

  const [usuarios, servicios, porEstado, reportes, cuentas, eventos, fallidos24h] = await Promise.all([
    prisma.usuario.count(),
    prisma.servicio.count({ where: { estado: "ACTIVO" } }),
    prisma.solicitud.groupBy({ by: ["estado"], _count: true }),
    prisma.reporte.findMany({
      where: { estado: "ABIERTO" },
      orderBy: { fecha: "desc" },
      take: 50,
      include: { servicio: { select: { id: true, titulo: true, estado: true, proveedor: { select: { nombre: true } } } }, reportante: { select: { nombre: true } } },
    }),
    prisma.usuario.findMany({
      where: qUsuario ? { OR: [{ nombre: { contains: qUsuario, mode: "insensitive" } }, { correo: { contains: qUsuario, mode: "insensitive" } }] } : {},
      orderBy: { fechaRegistro: "desc" },
      take: 20,
      select: { id: true, nombre: true, correo: true, rol: true, activo: true, fechaRegistro: true, _count: { select: { servicios: true } } },
    }),
    prisma.bitacora.findMany({ orderBy: { fecha: "desc" }, take: 25, include: { usuario: { select: { nombre: true } } } }),
    prisma.bitacora.count({ where: { accion: "LOGIN_FALLIDO", fecha: { gte: new Date(Date.now() - 86400000) } } }),
  ]);
  const totalSol = porEstado.reduce((a, b) => a + b._count, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Titulo sup="Administración" desc={`Sesión de ${admin.nombre}. Todas las acciones quedan registradas en la bitácora.`}>
        Panel de control
      </Titulo>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["Usuarios", usuarios],
          ["Servicios activos", servicios],
          ["Solicitudes", totalSol],
          ["Reportes abiertos", reportes.length],
        ].map(([t, n]) => (
          <div key={t as string} className="tarjeta p-5">
            <p className="text-xs font-bold tracking-wider text-tinta/50 uppercase">{t}</p>
            <p className="mt-1 font-display text-3xl font-semibold">{n}</p>
          </div>
        ))}
      </div>

      <section className="tarjeta mt-6 p-6">
        <h2 className="font-display text-xl font-semibold">Solicitudes por estado</h2>
        <div className="mt-4 space-y-2">
          {porEstado
            .sort((a, b) => b._count - a._count)
            .map((e) => (
              <div key={e.estado} className="flex items-center gap-3 text-sm">
                <span className="w-36 shrink-0 font-medium">{etiquetaEstado(e.estado as Estado)}</span>
                <span className="h-3 flex-1 overflow-hidden rounded-full bg-tinta/5">
                  <span className="block h-full rounded-full bg-bosque-500" style={{ width: `${(e._count / Math.max(1, totalSol)) * 100}%` }} />
                </span>
                <span className="w-8 text-right font-semibold">{e._count}</span>
              </div>
            ))}
        </div>
      </section>

      <section className="tarjeta mt-6 p-6">
        <h2 className="font-display text-xl font-semibold">Reportes por revisar (RN-11)</h2>
        {reportes.length === 0 ? (
          <p className="mt-3 text-sm text-tinta/55">No hay reportes abiertos. 🎉</p>
        ) : (
          <ul className="mt-4 divide-y divide-tinta/10">
            {reportes.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/servicios/${r.servicio.id}`} className="font-semibold hover:text-bosque-700">
                    {r.servicio.titulo}
                  </Link>
                  <p className="text-xs text-tinta/55">
                    De {r.servicio.proveedor.nombre} · reportado por {r.reportante.nombre} · {hace(r.fecha)}
                  </p>
                  <p className="mt-1 text-sm text-tinta/80">“{r.motivo}”</p>
                </div>
                <div className="flex gap-2">
                  <form action={resolverReporte}>
                    <input type="hidden" name="reporteId" value={r.id} />
                    <input type="hidden" name="decision" value="RETIRAR" />
                    <ConfirmarBoton clase="btn-peligro px-3 py-1.5 text-xs" mensaje="¿Retirar el servicio del catálogo?">
                      Retirar servicio
                    </ConfirmarBoton>
                  </form>
                  <form action={resolverReporte}>
                    <input type="hidden" name="reporteId" value={r.id} />
                    <input type="hidden" name="decision" value="DESCARTAR" />
                    <button className="btn-secundario px-3 py-1.5 text-xs">Descartar</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="tarjeta mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-6 pb-3">
          <h2 className="font-display text-xl font-semibold">Cuentas</h2>
          <form className="flex gap-2">
            <input name="u" defaultValue={qUsuario} placeholder="Buscar nombre o correo" className="campo py-2" maxLength={80} />
            <button className="btn-secundario py-2">Buscar</button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-y border-tinta/10 text-xs tracking-wider text-tinta/55 uppercase">
              <tr>
                <th className="px-6 py-2">Usuario</th>
                <th className="px-3 py-2">Rol</th>
                <th className="px-3 py-2">Servicios</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-6 py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tinta/5">
              {cuentas.map((c) => (
                <tr key={c.id}>
                  <td className="px-6 py-3">
                    <p className="font-semibold">{c.nombre}</p>
                    <p className="text-xs text-tinta/55">{c.correo}</p>
                  </td>
                  <td className="px-3 py-3">{c.rol === "ADMIN" ? "Admin" : "Estudiante"}</td>
                  <td className="px-3 py-3">{c._count.servicios}</td>
                  <td className="px-3 py-3">
                    <span className={`chip ${c.activo ? "bg-bosque-100 text-bosque-800" : "bg-red-100 text-red-700"}`}>{c.activo ? "Activa" : "Suspendida"}</span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    {c.rol !== "ADMIN" && (
                      <form action={cambiarEstadoUsuario}>
                        <input type="hidden" name="usuarioId" value={c.id} />
                        <input type="hidden" name="activo" value={c.activo ? "false" : "true"} />
                        {c.activo ? (
                          <ConfirmarBoton clase="btn-peligro px-3 py-1.5 text-xs" mensaje={`¿Suspender a ${c.nombre}? Se cerrarán sus sesiones.`}>
                            Suspender
                          </ConfirmarBoton>
                        ) : (
                          <button className="btn-secundario px-3 py-1.5 text-xs">Reactivar</button>
                        )}
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="tarjeta mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-semibold">Bitácora de seguridad</h2>
          <span className={`chip ${fallidos24h > 10 ? "bg-red-100 text-red-700" : "bg-bosque-100 text-bosque-800"}`}>{fallidos24h} accesos fallidos en 24 h</span>
        </div>
        <ul className="mt-4 divide-y divide-tinta/5 font-mono text-xs">
          {eventos.map((e) => (
            <li key={e.id} className="flex flex-wrap gap-x-4 gap-y-0.5 py-2">
              <span className="text-tinta/50">{fechaHora(e.fecha)}</span>
              <span className={`font-bold ${e.accion.includes("DENEGADO") || e.accion.includes("FALLIDO") ? "text-red-700" : "text-bosque-700"}`}>{e.accion}</span>
              <span className="text-tinta/70">{e.usuario?.nombre ?? "—"}</span>
              {e.detalle && <span className="truncate text-tinta/45">{e.detalle}</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
