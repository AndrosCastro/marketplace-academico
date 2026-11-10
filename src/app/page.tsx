import Link from "next/link";
import { prisma } from "@/lib/db";
import { usuarioActual } from "@/lib/sesion";
import { seleccionTarjeta, aTarjeta } from "@/lib/consultas";
import { TarjetaServicio, Aviso } from "@/components/ui";

const PASOS = [
  ["Regístrate", "Crea tu cuenta y completa tu perfil con tus habilidades."],
  ["Explora", "Busca por nombre o categoría y compara precios y reputación."],
  ["Solicita", "Envía tu solicitud; el proveedor la acepta o la rechaza."],
  ["Paga por adelantado", "Pagas fuera de la plataforma y el proveedor confirma el pago."],
  ["Coordina", "Usa el chat con archivos o el WhatsApp que se habilita tras el pago."],
  ["Recibe", "El proveedor entrega y tú confirmas la recepción."],
  ["Califica", "Tu reseña de 1 a 5 estrellas actualiza la reputación del proveedor."],
];

export default async function Inicio({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const u = await usuarioActual();
  const [categorias, destacados, totales] = await Promise.all([
    prisma.categoria.findMany({
      orderBy: { nombre: "asc" },
      select: { slug: true, nombre: true, icono: true, _count: { select: { servicios: { where: { estado: "ACTIVO" } } } } },
    }),
    prisma.servicio.findMany({
      where: { estado: "ACTIVO", proveedor: { activo: true } },
      orderBy: [{ proveedor: { reputacion: { sort: "desc", nulls: "last" } } }, { fechaPublicacion: "desc" }],
      take: 6,
      select: seleccionTarjeta,
    }),
    Promise.all([
      prisma.servicio.count({ where: { estado: "ACTIVO" } }),
      prisma.usuario.count({ where: { rol: "ESTUDIANTE" } }),
      prisma.solicitud.count({ where: { estado: "COMPLETADA" } }),
    ]),
  ]);

  return (
    <>
      {sp.sesion === "cerrada" && (
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <Aviso>Cerraste sesión correctamente.</Aviso>
        </div>
      )}
      {sp.error === "sin-permiso" && (
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <Aviso tipo="error">No tienes permiso para ver esa página.</Aviso>
        </div>
      )}

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="fondo-grano absolute inset-0 opacity-70" aria-hidden />
        <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-mango-300/40 blur-3xl" aria-hidden />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-bosque-300/40 blur-3xl" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div>
            <p className="chip mb-5 bg-bosque-100 text-bosque-800">Hecho por y para estudiantes UTH</p>
            <h1 className="font-display text-4xl leading-[1.05] font-semibold tracking-tight sm:text-6xl">
              El talento de tu campus,
              <span className="relative ml-2 inline-block text-bosque-700">
                a un clic
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" aria-hidden>
                  <path d="M2 9 Q 100 -2 198 7" stroke="#ffbd45" strokeWidth="5" fill="none" strokeLinecap="round" />
                </svg>
              </span>
              .
            </h1>
            <p className="mt-6 max-w-xl text-lg text-tinta/70">
              Tutorías, programación, diseño, proyectos y más. Publica lo que sabes hacer, encuentra a quien te ayude y decide con
              confianza gracias a reseñas reales de servicios completados.
            </p>
            <form action="/servicios" className="mt-8 flex max-w-xl flex-col gap-2 sm:flex-row" role="search">
              <label htmlFor="q-inicio" className="sr-only">
                Buscar servicios
              </label>
              <input id="q-inicio" name="q" className="campo h-12 flex-1 text-base" placeholder="¿Qué necesitas? Ej: cálculo, Python, AutoCAD…" maxLength={80} />
              <button className="btn-primario h-12 px-6 text-base">Buscar</button>
            </form>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              {u ? (
                <Link href="/servicios/nuevo" className="font-semibold text-bosque-700 underline-offset-4 hover:underline">
                  ¿Tienes una habilidad? Publica tu servicio →
                </Link>
              ) : (
                <Link href="/registro" className="font-semibold text-bosque-700 underline-offset-4 hover:underline">
                  Crea tu cuenta gratis →
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 self-center">
            {[
              ["95%", "considera útil la plataforma", "bg-bosque-700 text-white"],
              ["85%", "revisa reseñas antes de contratar", "bg-white"],
              ["80%", "nunca había contratado una tutoría formal", "bg-white"],
              ["95%", "la usaría en su universidad", "bg-mango-400"],
            ].map(([n, t, c], i) => (
              <div key={i} className={`tarjeta p-5 ${c} ${i % 2 ? "translate-y-6" : ""}`}>
                <p className="font-display text-4xl font-semibold">{n}</p>
                <p className="mt-1 text-sm opacity-80">{t}</p>
              </div>
            ))}
            <p className="col-span-2 mt-6 text-center text-xs text-tinta/50">Encuesta del Avance II · 20 estudiantes · nov. 2026</p>
          </div>
        </div>
      </section>

      {/* CIFRAS EN VIVO */}
      <section className="border-y border-tinta/10 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-tinta/10 px-4 sm:px-6">
          {[
            [totales[0], "servicios activos"],
            [totales[1], "estudiantes registrados"],
            [totales[2], "servicios completados"],
          ].map(([n, t]) => (
            <div key={t as string} className="px-2 py-6 text-center">
              <p className="font-display text-3xl font-semibold text-bosque-700">{n}</p>
              <p className="text-xs font-medium text-tinta/60 sm:text-sm">{t}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORÍAS */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-3xl font-semibold">Explora por categoría</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categorias.map((c) => (
            <Link
              key={c.slug}
              href={`/servicios?cat=${c.slug}`}
              className="tarjeta group flex flex-col gap-2 p-4 transition hover:-translate-y-0.5 hover:border-bosque-300"
            >
              <span className="text-2xl" aria-hidden>
                {c.icono}
              </span>
              <span className="font-semibold leading-tight group-hover:text-bosque-700">{c.nombre}</span>
              <span className="text-xs text-tinta/55">{c._count.servicios} servicios</span>
            </Link>
          ))}
        </div>
      </section>

      {/* DESTACADOS */}
      {destacados.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-3xl font-semibold">Mejor valorados</h2>
            <Link href="/servicios?orden=reputacion" className="text-sm font-semibold text-bosque-700 hover:underline">
              Ver todo →
            </Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {destacados.map((s) => (
              <TarjetaServicio key={s.id} s={aTarjeta(s)} />
            ))}
          </div>
        </section>
      )}

      {/* CÓMO FUNCIONA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="tarjeta overflow-hidden bg-bosque-900 p-8 text-white sm:p-12">
          <h2 className="font-display text-3xl font-semibold">Cómo funciona</h2>
          <p className="mt-2 max-w-xl text-white/70">Un proceso claro y seguro de principio a fin. Sin pago confirmado, el trabajo no inicia.</p>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PASOS.map(([t, d], i) => (
              <li key={t} className="relative">
                <span className="font-display text-5xl font-semibold text-mango-400/90">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-1 font-bold">{t}</p>
                <p className="mt-1 text-sm text-white/65">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
