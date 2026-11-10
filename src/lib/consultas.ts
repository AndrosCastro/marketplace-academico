import type { Prisma } from "@prisma/client";
import type { ServicioTarjeta } from "@/components/ui";

// Selección mínima para tarjetas: nunca incluye correo, contraseña ni contacto (RNF-03).
export const seleccionTarjeta = {
  id: true,
  titulo: true,
  descripcion: true,
  precio: true,
  unidadPrecio: true,
  modalidad: true,
  categoria: { select: { nombre: true, icono: true } },
  proveedor: { select: { id: true, nombre: true, reputacion: true, totalResenas: true } },
} satisfies Prisma.ServicioSelect;

type FilaTarjeta = Prisma.ServicioGetPayload<{ select: typeof seleccionTarjeta }>;

export function aTarjeta(s: FilaTarjeta): ServicioTarjeta {
  return {
    ...s,
    precio: Number(s.precio),
    proveedor: { ...s.proveedor, reputacion: s.proveedor.reputacion === null ? null : Number(s.proveedor.reputacion) },
  };
}

export const num = (d: Prisma.Decimal | null | undefined) => (d === null || d === undefined ? null : Number(d));
