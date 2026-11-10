export function lempiras(v: number | string | { toString(): string }): string {
  const n = typeof v === "number" ? v : Number(v.toString());
  return "L " + n.toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fecha(d: Date): string {
  return d.toLocaleDateString("es-HN", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Tegucigalpa" });
}

export function fechaHora(d: Date): string {
  return d.toLocaleString("es-HN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Tegucigalpa",
  });
}

export function hace(d: Date): string {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "hace un momento";
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.round(h / 24);
  if (dias < 30) return `hace ${dias} d`;
  return fecha(d);
}

export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

const PALETA = ["#1c7d50", "#b45309", "#7c3aed", "#0e7490", "#be185d", "#4d7c0f", "#c2410c", "#1d4ed8"];
export function colorDe(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETA[h % PALETA.length]!;
}

export function tamanoArchivo(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
