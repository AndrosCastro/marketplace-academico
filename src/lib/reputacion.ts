// RF-14: promedio aritmético de las calificaciones, redondeado a dos decimales.
// Sin calificaciones no se calcula ningún valor (RN-07).
export function calcularPromedio(calificaciones: number[]): number | null {
  if (calificaciones.length === 0) return null;
  const suma = calificaciones.reduce((a, b) => a + b, 0);
  return Math.round((suma / calificaciones.length) * 100) / 100;
}

export function formatoReputacion(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "Sin calificaciones";
  return valor.toFixed(2);
}
