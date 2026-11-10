// Esquemas de validación del lado del servidor (RNF-06). Nunca se confía en el navegador.
import { z } from "zod";

const texto = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    // Elimina caracteres de control invisibles (excepto saltos de línea y tabulaciones)
    .transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ""));

const opcional = (max: number) =>
  texto(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

export const correoSchema = z.string().trim().toLowerCase().max(150).email("Correo con formato inválido.");

export const contraseniaSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .max(72, "Máximo 72 caracteres.")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Usa al menos una letra y un número.");

export const registroSchema = z
  .object({
    nombre: texto(100).pipe(z.string().min(2, "Escribe tu nombre completo.")),
    correo: correoSchema,
    carrera: opcional(100),
    contrasenia: contraseniaSchema,
    confirmacion: z.string(),
  })
  .refine((d) => d.contrasenia === d.confirmacion, {
    path: ["confirmacion"],
    message: "Las contraseñas no coinciden.",
  });

export const loginSchema = z.object({
  correo: correoSchema,
  contrasenia: z.string().min(1, "Escribe tu contraseña.").max(72),
});

export const perfilSchema = z.object({
  nombre: texto(100).pipe(z.string().min(2, "El nombre es obligatorio.")),
  carrera: opcional(100),
  descripcion: opcional(1000),
  habilidades: opcional(255),
  contacto: texto(30)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null))
    .refine((v) => v === null || /^\+?[0-9 ()-]{8,20}$/.test(v), "Escribe un número válido (ej. +504 9999-9999)."),
});

export const servicioSchema = z.object({
  titulo: texto(100).pipe(z.string().min(5, "El título debe tener al menos 5 caracteres.")),
  descripcion: texto(3000).pipe(z.string().min(20, "Describe el servicio con al menos 20 caracteres.")),
  categoriaId: z.coerce.number().int().positive("Elige una categoría."),
  precio: z.coerce
    .number({ invalid_type_error: "El precio debe ser un número." })
    .min(0, "El precio no puede ser negativo.")
    .max(100000, "Precio demasiado alto."),
  unidadPrecio: z.enum(["HORA", "SERVICIO"]),
  modalidad: z
    .enum(["PRESENCIAL", "VIDEOCONFERENCIA", ""])
    .optional()
    .transform((v) => (v ? v : null)),
  horario: opcional(150),
});

export const solicitudSchema = z.object({
  servicioId: z.string().cuid(),
  mensaje: opcional(1000),
  modalidad: z
    .enum(["PRESENCIAL", "VIDEOCONFERENCIA", ""])
    .optional()
    .transform((v) => (v ? v : null)),
});

export const resenaSchema = z.object({
  solicitudId: z.string().cuid(),
  calificacion: z.coerce.number().int().min(1, "La calificación va de 1 a 5.").max(5, "La calificación va de 1 a 5."),
  comentario: opcional(500),
});

export const pagoSchema = z.object({
  metodoPago: z.enum(["EFECTIVO", "TRANSFERENCIA"]),
  nota: opcional(200),
});

/**
 * RN-11 (integridad académica): bloquea publicaciones que ofrecen hacer tareas o exámenes
 * para entregarlos como propios. Es un filtro inicial; los reportes permiten moderar el resto.
 */
const FRASES_PROHIBIDAS = [
  /hago\s+(tu|tus|su|sus)\s+(tarea|tareas|examen|ex[aá]menes|trabajo|trabajos|proyecto)/i,
  /resuelvo\s+(tu|tus|su|sus)?\s*(examen|ex[aá]menes|parcial|parciales|prueba)/i,
  /(realizo|hago)\s+(ex[aá]menes|parciales|quices|quizzes)/i,
  /te\s+paso\s+(el|la)\s+(clase|materia)/i,
  /suplantaci[oó]n|me\s+hago\s+pasar/i,
];

export function violaIntegridadAcademica(...textos: string[]): boolean {
  const t = textos.join(" ");
  return FRASES_PROHIBIDAS.some((r) => r.test(t));
}

/** Convierte errores de zod en un objeto { campo: mensaje } para mostrarlos junto al campo. */
export function erroresDeCampo(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const k = String(issue.path[0] ?? "_");
    if (!out[k]) out[k] = issue.message;
  }
  return out;
}

export function dominioPermitido(correo: string): boolean {
  const lista = (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  if (lista.length === 0) return true;
  const dominio = correo.split("@")[1]?.toLowerCase() ?? "";
  return lista.some((d) => dominio === d || dominio.endsWith("." + d));
}
