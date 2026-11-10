// =====================================================================
// Máquina de estados de la solicitud (SRS sección 3.3, RF-11, RF-15).
// Lógica pura, sin base de datos, para poder probarla con pruebas unitarias.
// =====================================================================

export type Estado =
  | "PENDIENTE"
  | "ACEPTADA"
  | "PAGO_CONFIRMADO"
  | "ENTREGADA"
  | "COMPLETADA"
  | "RECHAZADA"
  | "CANCELADA";

export type Accion = "ACEPTAR" | "RECHAZAR" | "CANCELAR" | "CONFIRMAR_PAGO" | "ENTREGAR" | "CONFIRMAR_RECEPCION";

export type Rol = "CLIENTE" | "PROVEEDOR";

interface Transicion {
  desde: Estado;
  hacia: Estado;
  quien: Rol;
}

/** Tabla de transiciones permitidas, exactamente como en la SRS. */
export const TRANSICIONES: Record<Accion, Transicion[]> = {
  ACEPTAR: [{ desde: "PENDIENTE", hacia: "ACEPTADA", quien: "PROVEEDOR" }],
  RECHAZAR: [{ desde: "PENDIENTE", hacia: "RECHAZADA", quien: "PROVEEDOR" }],
  CANCELAR: [
    { desde: "PENDIENTE", hacia: "CANCELADA", quien: "CLIENTE" },
    { desde: "ACEPTADA", hacia: "CANCELADA", quien: "CLIENTE" },
  ],
  CONFIRMAR_PAGO: [{ desde: "ACEPTADA", hacia: "PAGO_CONFIRMADO", quien: "PROVEEDOR" }],
  ENTREGAR: [{ desde: "PAGO_CONFIRMADO", hacia: "ENTREGADA", quien: "PROVEEDOR" }],
  CONFIRMAR_RECEPCION: [{ desde: "ENTREGADA", hacia: "COMPLETADA", quien: "CLIENTE" }],
};

export type ResultadoTransicion = { ok: true; nuevoEstado: Estado } | { ok: false; motivo: string };

const MOTIVOS: Partial<Record<Accion, string>> = {
  ENTREGAR: "No se puede marcar como entregada sin pago confirmado (RN-05).",
  CONFIRMAR_RECEPCION: "Solo se puede confirmar la recepción después de la entrega.",
  CONFIRMAR_PAGO: "El pago solo se confirma con la solicitud en estado Aceptada y una sola vez.",
  CANCELAR: "Solo se puede cancelar antes de que el pago esté confirmado.",
};

/** Evalúa si un actor puede ejecutar una acción sobre una solicitud en cierto estado. */
export function evaluarTransicion(estado: Estado, accion: Accion, rol: Rol): ResultadoTransicion {
  const opciones = TRANSICIONES[accion];
  if (!opciones) return { ok: false, motivo: "Acción desconocida." };
  const porRol = opciones.filter((t) => t.quien === rol);
  if (porRol.length === 0) {
    return { ok: false, motivo: `Esta acción le corresponde al ${rol === "CLIENTE" ? "proveedor" : "cliente"}.` };
  }
  const t = porRol.find((t) => t.desde === estado);
  if (!t) return { ok: false, motivo: MOTIVOS[accion] ?? `No se permite esta acción en el estado ${etiquetaEstado(estado)}.` };
  return { ok: true, nuevoEstado: t.hacia };
}

/** Acciones que un rol puede ejecutar en un estado (para mostrar solo los botones válidos). */
export function accionesDisponibles(estado: Estado, rol: Rol): Accion[] {
  return (Object.keys(TRANSICIONES) as Accion[]).filter((a) => evaluarTransicion(estado, a, rol).ok);
}

export const ESTADOS_FINALES: Estado[] = ["COMPLETADA", "RECHAZADA", "CANCELADA"];

/** El chat queda en solo lectura si la solicitud fue rechazada o cancelada (RF-16). */
export function chatHabilitado(estado: Estado): boolean {
  return estado !== "RECHAZADA" && estado !== "CANCELADA";
}

/** RNF-03: el contacto externo solo se muestra entre las partes con pago confirmado. */
export function contactoVisible(estado: Estado): boolean {
  return estado === "PAGO_CONFIRMADO" || estado === "ENTREGADA" || estado === "COMPLETADA";
}

export function etiquetaEstado(e: Estado): string {
  return {
    PENDIENTE: "Pendiente",
    ACEPTADA: "Aceptada",
    PAGO_CONFIRMADO: "Pago confirmado",
    ENTREGADA: "Entregada",
    COMPLETADA: "Completada",
    RECHAZADA: "Rechazada",
    CANCELADA: "Cancelada",
  }[e];
}

export function etiquetaAccion(a: Accion): string {
  return {
    ACEPTAR: "Aceptar solicitud",
    RECHAZAR: "Rechazar",
    CANCELAR: "Cancelar solicitud",
    CONFIRMAR_PAGO: "Confirmar pago recibido",
    ENTREGAR: "Marcar como entregada",
    CONFIRMAR_RECEPCION: "Confirmar recepción",
  }[a];
}

/** Orden lineal para la línea de tiempo visual. */
export const FLUJO_PRINCIPAL: Estado[] = ["PENDIENTE", "ACEPTADA", "PAGO_CONFIRMADO", "ENTREGADA", "COMPLETADA"];
