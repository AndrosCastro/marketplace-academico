// RF-08: detalle del servicio y datos públicos del proveedor
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { usuarioActual } from "@/lib/sesion";
import { num } from "@/lib/consultas";
import { fecha } from "@/lib/formato";
import { Avatar, Estrellas, Precio, Aviso, Vacio } from "@/components/ui";
import { FormSolicitud, FormReporte } from "@/components/forms/ServicioForms";
import { listarResenas, ListaResenas } from "@/components/Resenas";

export default async function DetalleServicio({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^c[a-z0-9]{20,30}$/.test(id)) notFound();

  const u = await usuarioActual();
  const s = await prisma.servicio.findUnique({
    where: { id },
    select: {
      id: true,
      titulo: true,
      descripcion: true,
      precio: true,
      unidadPrecio: true,
      modalidad: true,
      horario: true,
      estado: true,
      fechaPublicacion: true,
      categoria: { select: { nombre: true, icono: true, slug: true } },
      // Datos públicos del proveedor: sin correo ni contacto (RF-08, RNF-03)
      proveedor: { select: { id: true, nombre: true, carrera: true, habilidades: true, reputacion: true, totalResenas: true, activo: true } },
      _count: { select: { solicitudes: { where: { estado: "COMPLETADA" } } } },
    },
  });

  const esPropio = !!u && s?.proveedor.id === u.id;
  if (!s || ((s.estado !== "ACTIVO" || !s.proveedor.activo) && !esPropio && u?.rol !== "ADMIN")) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Vacio titulo="El servicio no está disponible">
          Puede que haya sido retirado por su proveedor.{" "}
          <Link href="/servicios" className="font-semibold text-bosque-700 underline">
            Volver al catálogo
          </Link>
        </Vacio>
      </div>
    );
  }

  const { filas } = await listarResenas(s.proveedor.id, 1, 5);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav className="mb-6 text-sm text-tinta/55" aria-label="Ruta">
        <Link href="/servicios" className="hover:text-tinta">
          Catálogo
        </Link>{" "}
        /{" "}
        <Link href={`/servicios?cat=${s.categoria.slug}`} className="hover:text-tinta">
          {s.categoria.nombre}
        </Link>
      </nav>

      <div className="mb-6 space-y-3">
        {sp.publicado && <Aviso>¡Servicio publicado! Ya aparece en el catálogo.</Aviso>}
        {sp.editado && <Aviso>Cambios guardados.</Aviso>}
        {s.estado === "RETIRADO" && <Aviso tipo="info">Este servicio está retirado: no aparece en el catálogo ni recibe solicitudes.</Aviso>}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <article className="space-y-6">
          <div className="tarjeta p-6 sm:p-8">
            <span className="chip bg-bosque-100 text-bosque-800">
              {s.categoria.icono} {s.categoria.nombre}
            </span>
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{s.titulo}</h1>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-tinta/65">
              <span>📅 Publicado el {fecha(s.fechaPublicacion)}</span>
              {s.modalidad && <span>{s.modalidad === "PRESENCIAL" ? "📍 Presencial" : "💻 Videoconferencia"}</span>}
              {s.horario && <span>🕒 {s.horario}</span>}
              <span>✅ {s._count.solicitudes} completados</span>
            </div>
            <div className="mt-6 text-[15px] leading-relaxed whitespace-pre-line text-tinta/85">{s.descripcion}</div>
          </div>

          <section className="tarjeta p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold">Reseñas del proveedor</h2>
              <Estrellas valor={num(s.proveedor.reputacion)} />
            </div>
            <ListaResenas filas={filas} />
            {s.proveedor.totalResenas > 5 && (
              <Link href={`/usuarios/${s.proveedor.id}`} className="text-sm font-semibold text-bosque-700 hover:underline">
                Ver las {s.proveedor.totalResenas} reseñas →
              </Link>
            )}
          </section>
        </article>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="tarjeta p-6">
            <p className="text-2xl">
              <Precio valor={Number(s.precio)} unidad={s.unidadPrecio} />
            </p>
            <div className="mt-5">
              {!u ? (
                <Link href={`/login?next=/servicios/${s.id}`} className="btn-primario w-full">
                  Inicia sesión para solicitar
                </Link>
              ) : esPropio ? (
                <div className="space-y-2">
                  <p className="rounded-lg bg-bosque-50 px-3 py-2 text-sm text-tinta/70">Este es tu servicio.</p>
                  <Link href={`/servicios/${s.id}/editar`} className="btn-secundario w-full">
                    Editar servicio
                  </Link>
                </div>
              ) : s.estado === "ACTIVO" ? (
                <FormSolicitud servicioId={s.id} modalidad={s.modalidad} />
              ) : null}
            </div>
          </div>

          <div className="tarjeta p-6">
            <p className="mb-3 text-xs font-bold tracking-widest text-tinta/50 uppercase">Proveedor</p>
            <Link href={`/usuarios/${s.proveedor.id}`} className="group flex items-center gap-3">
              <Avatar id={s.proveedor.id} nombre={s.proveedor.nombre} tam={48} />
              <div>
                <p className="font-bold group-hover:text-bosque-700">{s.proveedor.nombre}</p>
                {s.proveedor.carrera && <p className="text-xs text-tinta/60">{s.proveedor.carrera}</p>}
              </div>
            </Link>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Estrellas valor={num(s.proveedor.reputacion)} />
              {s.proveedor.totalResenas > 0 && <span className="text-tinta/50">({s.proveedor.totalResenas})</span>}
            </div>
            {s.proveedor.habilidades && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {s.proveedor.habilidades
                  .split(",")
                  .map((h) => h.trim())
                  .filter(Boolean)
                  .slice(0, 8)
                  .map((h) => (
                    <span key={h} className="chip bg-papel text-tinta/75 ring-1 ring-tinta/10">
                      {h}
                    </span>
                  ))}
              </div>
            )}
            <p className="mt-4 text-xs text-tinta/50">🔒 El contacto por WhatsApp se comparte solo cuando el pago está confirmado.</p>
          </div>

          {u && !esPropio && (
            <div className="px-2">
              <FormReporte servicioId={s.id} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
