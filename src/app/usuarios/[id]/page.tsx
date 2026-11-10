// Perfil público (RF-03 salida, RF-13 reseñas, RF-14 promedio)
import { prisma } from "@/lib/db";
import { seleccionTarjeta, aTarjeta, num } from "@/lib/consultas";
import { fecha } from "@/lib/formato";
import { Avatar, Estrellas, TarjetaServicio, Vacio, Paginacion } from "@/components/ui";
import { listarResenas, ListaResenas } from "@/components/Resenas";

export default async function PerfilPublico({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const pagina = Math.max(1, parseInt(sp.pagina ?? "1", 10) || 1);

  const p = await prisma.usuario.findUnique({
    where: { id },
    // Nunca se seleccionan correo, contraseña ni contacto (RNF-03)
    select: { id: true, nombre: true, carrera: true, descripcion: true, habilidades: true, reputacion: true, totalResenas: true, fechaRegistro: true, activo: true },
  });
  if (!p || !p.activo) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Vacio titulo="Perfil no disponible" />
      </div>
    );
  }

  const [servicios, resenas, distribucion] = await Promise.all([
    prisma.servicio.findMany({ where: { proveedorId: id, estado: "ACTIVO" }, orderBy: { fechaPublicacion: "desc" }, select: seleccionTarjeta }),
    listarResenas(id, pagina, 10),
    prisma.resena.groupBy({ by: ["calificacion"], where: { solicitud: { servicio: { proveedorId: id } } }, _count: true }),
  ]);
  const rep = num(p.reputacion);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <section className="tarjeta fondo-grano relative overflow-hidden p-6 sm:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <Avatar id={p.id} nombre={p.nombre} tam={96} />
          <div className="flex-1">
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">{p.nombre}</h1>
            {p.carrera && <p className="text-tinta/65">{p.carrera}</p>}
            <p className="mt-1 text-xs text-tinta/50">Miembro desde {fecha(p.fechaRegistro)}</p>
          </div>
          <div className="tarjeta min-w-48 p-5 text-center">
            <p className="font-display text-4xl font-semibold">{rep === null ? "—" : rep.toFixed(2)}</p>
            <Estrellas valor={rep} />
            <p className="mt-1 text-xs text-tinta/55">{p.totalResenas} calificaciones</p>
          </div>
        </div>
        {p.descripcion && <p className="mt-6 max-w-3xl whitespace-pre-line text-tinta/80">{p.descripcion}</p>}
        {p.habilidades && (
          <div className="mt-4 flex flex-wrap gap-2">
            {p.habilidades
              .split(",")
              .map((h) => h.trim())
              .filter(Boolean)
              .map((h) => (
                <span key={h} className="chip bg-superficie text-bosque-800 ring-1 ring-bosque-200">
                  {h}
                </span>
              ))}
          </div>
        )}
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        <section>
          <h2 className="mb-5 font-display text-2xl font-semibold">Servicios ({servicios.length})</h2>
          {servicios.length === 0 ? (
            <Vacio titulo="Sin servicios activos" />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {servicios.map((s) => (
                <TarjetaServicio key={s.id} s={aTarjeta(s)} />
              ))}
            </div>
          )}
        </section>
        <section>
          <h2 className="mb-5 font-display text-2xl font-semibold">Reseñas</h2>
          <div className="tarjeta p-5">
            {p.totalResenas > 0 && (
              <div className="mb-4 space-y-1.5">
                {[5, 4, 3, 2, 1].map((n) => {
                  const c = distribucion.find((d) => d.calificacion === n)?._count ?? 0;
                  const pct = p.totalResenas ? Math.round((c / p.totalResenas) * 100) : 0;
                  return (
                    <div key={n} className="flex items-center gap-2 text-xs">
                      <span className="w-6 font-semibold">{n}★</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-tinta/10">
                        <span className="block h-full rounded-full bg-mango-400" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="w-6 text-right text-tinta/55">{c}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <ListaResenas filas={resenas.filas} />
            <Paginacion pagina={pagina} total={resenas.total} porPagina={10} base={new URLSearchParams()} />
          </div>
        </section>
      </div>
    </div>
  );
}
