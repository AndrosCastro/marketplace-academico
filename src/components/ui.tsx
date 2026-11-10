import Link from "next/link";
import { colorDe, iniciales, lempiras } from "@/lib/formato";
import { etiquetaEstado, type Estado } from "@/lib/estados";

export function Avatar({ id, nombre, tam = 40 }: { id: string; nombre: string; tam?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-superficie"
      style={{ width: tam, height: tam, background: colorDe(id), fontSize: tam * 0.38 }}
    >
      {iniciales(nombre)}
    </span>
  );
}

export function Estrellas({ valor, tam = "text-base" }: { valor: number | null; tam?: string }) {
  if (valor === null) return <span className="text-xs font-medium text-tinta/50">Sin calificaciones</span>;
  const llenas = Math.round(valor);
  return (
    <span className={`inline-flex items-center gap-1 ${tam}`} aria-label={`Calificación ${valor.toFixed(2)} de 5`}>
      <span className="tracking-tight text-mango-500">
        {"★".repeat(llenas)}
        <span className="text-tinta/15">{"★".repeat(5 - llenas)}</span>
      </span>
      <span className="text-sm font-bold text-tinta">{valor.toFixed(2)}</span>
    </span>
  );
}

const COLORES_ESTADO: Record<Estado, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800",
  ACEPTADA: "bg-sky-100 text-sky-800",
  PAGO_CONFIRMADO: "bg-violet-100 text-violet-800",
  ENTREGADA: "bg-teal-100 text-teal-800",
  COMPLETADA: "bg-bosque-100 text-bosque-800",
  RECHAZADA: "bg-red-100 text-red-700",
  CANCELADA: "bg-zinc-200 text-zinc-700",
};

export function BadgeEstado({ estado }: { estado: Estado }) {
  return <span className={`chip ${COLORES_ESTADO[estado]}`}>{etiquetaEstado(estado)}</span>;
}

export function Precio({ valor, unidad }: { valor: number; unidad: "HORA" | "SERVICIO" }) {
  return (
    <span className="font-bold text-tinta">
      {lempiras(valor)}
      <span className="text-xs font-medium text-tinta/55">{unidad === "HORA" ? " / hora" : " / servicio"}</span>
    </span>
  );
}

export type ServicioTarjeta = {
  id: string;
  titulo: string;
  descripcion: string;
  precio: number;
  unidadPrecio: "HORA" | "SERVICIO";
  modalidad: "PRESENCIAL" | "VIDEOCONFERENCIA" | null;
  categoria: { nombre: string; icono: string };
  proveedor: { id: string; nombre: string; reputacion: number | null; totalResenas: number };
};

export function TarjetaServicio({ s }: { s: ServicioTarjeta }) {
  return (
    <Link
      href={`/servicios/${s.id}`}
      className="tarjeta group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-bosque-300 hover:shadow-lg"
    >
      <div className="flex items-center justify-between gap-2 border-b border-tinta/5 bg-bosque-50/60 px-5 py-3">
        <span className="chip bg-superficie text-bosque-800 ring-1 ring-bosque-200">
          <span aria-hidden>{s.categoria.icono}</span> {s.categoria.nombre}
        </span>
        {s.modalidad && (
          <span className="text-xs font-medium text-tinta/55">{s.modalidad === "PRESENCIAL" ? "Presencial" : "Videollamada"}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="line-clamp-2 text-lg leading-snug font-bold group-hover:text-bosque-700">{s.titulo}</h3>
        <p className="line-clamp-2 text-sm text-tinta/65">{s.descripcion}</p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar id={s.proveedor.id} nombre={s.proveedor.nombre} tam={34} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{s.proveedor.nombre}</p>
              <Estrellas valor={s.proveedor.reputacion} tam="text-xs" />
            </div>
          </div>
          <Precio valor={s.precio} unidad={s.unidadPrecio} />
        </div>
      </div>
    </Link>
  );
}

export function Aviso({ tipo = "ok", children }: { tipo?: "ok" | "error" | "info"; children: React.ReactNode }) {
  const c = {
    ok: "border-bosque-200 bg-bosque-50 text-bosque-800",
    error: "border-red-200 bg-red-50 text-red-800",
    info: "border-sky-200 bg-sky-50 text-sky-900",
  }[tipo];
  return (
    <div role={tipo === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm font-medium ${c}`}>
      {children}
    </div>
  );
}

export function Vacio({ titulo, children }: { titulo: string; children?: React.ReactNode }) {
  return (
    <div className="tarjeta fondo-grano flex flex-col items-center gap-3 px-6 py-14 text-center">
      <p className="font-display text-2xl font-semibold">{titulo}</p>
      {children && <div className="max-w-md text-sm text-tinta/65">{children}</div>}
    </div>
  );
}

export function Paginacion({ pagina, total, porPagina, base }: { pagina: number; total: number; porPagina: number; base: URLSearchParams }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (paginas <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams(base);
    q.set("pagina", String(p));
    return `?${q.toString()}`;
  };
  return (
    <nav aria-label="Paginación" className="flex items-center justify-center gap-2 pt-4">
      {pagina > 1 ? (
        <Link className="btn-secundario" href={href(pagina - 1)}>
          ← Anterior
        </Link>
      ) : (
        <span className="btn-secundario pointer-events-none opacity-40">← Anterior</span>
      )}
      <span className="px-3 text-sm font-medium text-tinta/65">
        Página {pagina} de {paginas}
      </span>
      {pagina < paginas ? (
        <Link className="btn-secundario" href={href(pagina + 1)}>
          Siguiente →
        </Link>
      ) : (
        <span className="btn-secundario pointer-events-none opacity-40">Siguiente →</span>
      )}
    </nav>
  );
}

export function Titulo({ sup, children, desc }: { sup?: string; children: React.ReactNode; desc?: React.ReactNode }) {
  return (
    <header className="mb-8">
      {sup && <p className="mb-1 text-xs font-bold tracking-[0.18em] text-bosque-700 uppercase">{sup}</p>}
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{children}</h1>
      {desc && <p className="mt-2 max-w-2xl text-tinta/65">{desc}</p>}
    </header>
  );
}
