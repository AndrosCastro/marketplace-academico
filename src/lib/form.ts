export type EstadoForm =
  | {
      ok?: string;
      error?: string;
      campos?: Record<string, string>;
      valores?: Record<string, string>;
    }
  | undefined;

/** Evita redirecciones abiertas: solo rutas internas relativas. */
export function rutaSegura(destino: unknown, porDefecto = "/servicios"): string {
  if (typeof destino !== "string") return porDefecto;
  if (!destino.startsWith("/") || destino.startsWith("//") || destino.startsWith("/\\")) return porDefecto;
  return destino.slice(0, 200);
}

export function valoresDe(fd: FormData, campos: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of campos) {
    const v = fd.get(c);
    if (typeof v === "string") out[c] = v;
  }
  return out;
}

export function str(fd: FormData, k: string): string | undefined {
  const v = fd.get(k);
  return typeof v === "string" ? v : undefined;
}
