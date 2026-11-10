// M3 - Catálogo (RF-06) con búsqueda y filtrado (RF-07)
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { seleccionTarjeta, aTarjeta } from "@/lib/consultas";
import { TarjetaServicio, Paginacion, Vacio, Titulo } from "@/components/ui";

export const metadata = { title: "Catálogo de servicios" };

const POR_PAGINA = 12;
const ORDENES: Record<string, Prisma.ServicioOrderByWithRelationInput[]> = {
  recientes: [{ fechaPublicacion: "desc" }],
  precio_asc: [{ precio: "asc" }],
  precio_desc: [{ precio: "desc" }],
  reputacion: [{ proveedor: { reputacion: { sort: "desc", nulls: "last" } } }, { fechaPublicacion: "desc" }],
};

export default async function Catalogo({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const cat = (sp.cat ?? "").slice(0, 100);
  const modalidad = sp.modalidad === "PRESENCIAL" || sp.modalidad === "VIDEOCONFERENCIA" ? sp.modalidad : undefined;
  const orden = sp.orden && ORDENES[sp.orden] ? sp.orden : "recientes";
  const pagina = Math.max(1, Math.min(500, parseInt(sp.pagina ?? "1", 10) || 1));

  const where: Prisma.ServicioWhereInput = {
    estado: "ACTIVO", // RF-06: solo servicios activos
    proveedor: { activo: true },
    ...(q ? { titulo: { contains: q, mode: "insensitive" } } : {}), // coincidencia parcial sin distinguir mayúsculas
    ...(cat ? { categoria: { slug: cat } } : {}),
    ...(modalidad ? { modalidad } : {}),
  };

  const [categorias, total, servicios] = await Promise.all([
    prisma.categoria.findMany({ orderBy: { nombre: "asc" }, select: { slug: true, nombre: true, icono: true } }),
    prisma.servicio.count({ where }),
    prisma.servicio.findMany({
      where,
      orderBy: ORDENES[orden],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: seleccionTarjeta,
    }),
  ]);

  const base = new URLSearchParams();
  if (q) base.set("q", q);
  if (cat) base.set("cat", cat);
  if (modalidad) base.set("modalidad", modalidad);
  if (orden !== "recientes") base.set("orden", orden);
  const hayFiltros = !!(q || cat || modalidad);
  const catActual = categorias.find((c) => c.slug === cat);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Titulo sup="Catálogo" desc="Servicios publicados por estudiantes. Compara precio, modalidad y reputación antes de solicitar.">
        {catActual ? `${catActual.icono} ${catActual.nombre}` : "Encuentra el apoyo que necesitas"}
      </Titulo>

      <form className="tarjeta mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1.2fr_1fr_1fr_auto]" role="search">
        <div>
          <label htmlFor="q" className="sr-only">
            Buscar por nombre
          </label>
          <input id="q" name="q" defaultValue={q} maxLength={80} placeholder="Buscar por nombre del servicio…" className="campo" />
        </div>
        <div>
          <label htmlFor="cat" className="sr-only">
            Categoría
          </label>
          <select id="cat" name="cat" defaultValue={cat} className="campo">
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.icono} {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="modalidad" className="sr-only">
            Modalidad
          </label>
          <select id="modalidad" name="modalidad" defaultValue={modalidad ?? ""} className="campo">
            <option value="">Cualquier modalidad</option>
            <option value="PRESENCIAL">Presencial</option>
            <option value="VIDEOCONFERENCIA">Videoconferencia</option>
          </select>
        </div>
        <div>
          <label htmlFor="orden" className="sr-only">
            Ordenar
          </label>
          <select id="orden" name="orden" defaultValue={orden} className="campo">
            <option value="recientes">Más recientes</option>
            <option value="reputacion">Mejor valorados</option>
            <option value="precio_asc">Precio: menor a mayor</option>
            <option value="precio_desc">Precio: mayor a menor</option>
          </select>
        </div>
        <button className="btn-primario">Aplicar</button>
      </form>

      <div className="mb-4 flex items-center justify-between gap-3 text-sm">
        <p className="font-medium text-tinta/65" aria-live="polite">
          {total} {total === 1 ? "resultado" : "resultados"}
          {q && (
            <>
              {" "}
              para <strong className="text-tinta">“{q}”</strong>
            </>
          )}
        </p>
        {hayFiltros && (
          <Link href="/servicios" className="font-semibold text-bosque-700 hover:underline">
            Quitar filtros
          </Link>
        )}
      </div>

      {servicios.length === 0 ? (
        hayFiltros ? (
          <Vacio titulo="Sin resultados">
            No encontramos servicios con esos criterios. Prueba{" "}
            <Link className="font-semibold text-bosque-700 underline" href="/servicios">
              quitar los filtros
            </Link>{" "}
            o usar otra palabra.
          </Vacio>
        ) : (
          <Vacio titulo="Aún no hay servicios publicados">
            ¡Sé el primero!{" "}
            <Link className="font-semibold text-bosque-700 underline" href="/servicios/nuevo">
              Publica tu servicio
            </Link>
          </Vacio>
        )
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {servicios.map((s) => (
            <TarjetaServicio key={s.id} s={aTarjeta(s)} />
          ))}
        </div>
      )}
      <Paginacion pagina={pagina} total={total} porPagina={POR_PAGINA} base={base} />
    </div>
  );
}
