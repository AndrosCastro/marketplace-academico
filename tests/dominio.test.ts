// Pruebas unitarias de las reglas de negocio (casos de prueba de la SRS, sección 5.2)
import { describe, it, expect } from "vitest";
import { evaluarTransicion, accionesDisponibles, chatHabilitado, contactoVisible } from "../src/lib/estados";
import { calcularPromedio, formatoReputacion } from "../src/lib/reputacion";
import { registroSchema, servicioSchema, resenaSchema, violaIntegridadAcademica, perfilSchema } from "../src/lib/validacion";
import { validarArchivo, TAMANO_MAXIMO } from "../src/lib/archivos";
import { rutaSegura } from "../src/lib/form";

describe("Máquina de estados de la solicitud (RF-11, RF-15)", () => {
  it("CP-19: el proveedor acepta una solicitud Pendiente", () => {
    expect(evaluarTransicion("PENDIENTE", "ACEPTAR", "PROVEEDOR")).toEqual({ ok: true, nuevoEstado: "ACEPTADA" });
  });
  it("CP-20: no se puede marcar Entregada desde Aceptada (sin pago)", () => {
    const r = evaluarTransicion("ACEPTADA", "ENTREGAR", "PROVEEDOR");
    expect(r.ok).toBe(false);
  });
  it("CP-21: el proveedor confirma el pago desde Aceptada", () => {
    expect(evaluarTransicion("ACEPTADA", "CONFIRMAR_PAGO", "PROVEEDOR")).toEqual({ ok: true, nuevoEstado: "PAGO_CONFIRMADO" });
  });
  it("el pago no se confirma dos veces", () => {
    expect(evaluarTransicion("PAGO_CONFIRMADO", "CONFIRMAR_PAGO", "PROVEEDOR").ok).toBe(false);
  });
  it("el cliente no puede aceptar su propia solicitud", () => {
    expect(evaluarTransicion("PENDIENTE", "ACEPTAR", "CLIENTE").ok).toBe(false);
  });
  it("el cliente no confirma recepción antes de la entrega", () => {
    expect(evaluarTransicion("PAGO_CONFIRMADO", "CONFIRMAR_RECEPCION", "CLIENTE").ok).toBe(false);
    expect(evaluarTransicion("ENTREGADA", "CONFIRMAR_RECEPCION", "CLIENTE")).toEqual({ ok: true, nuevoEstado: "COMPLETADA" });
  });
  it("el cliente cancela solo antes del pago confirmado", () => {
    expect(evaluarTransicion("PENDIENTE", "CANCELAR", "CLIENTE").ok).toBe(true);
    expect(evaluarTransicion("ACEPTADA", "CANCELAR", "CLIENTE").ok).toBe(true);
    expect(evaluarTransicion("PAGO_CONFIRMADO", "CANCELAR", "CLIENTE").ok).toBe(false);
  });
  it("los estados finales no admiten acciones", () => {
    for (const e of ["COMPLETADA", "RECHAZADA", "CANCELADA"] as const) {
      expect(accionesDisponibles(e, "CLIENTE")).toEqual([]);
      expect(accionesDisponibles(e, "PROVEEDOR")).toEqual([]);
    }
  });
  it("chat en solo lectura tras rechazo/cancelación; contacto solo con pago confirmado", () => {
    expect(chatHabilitado("RECHAZADA")).toBe(false);
    expect(chatHabilitado("COMPLETADA")).toBe(true);
    expect(contactoVisible("ACEPTADA")).toBe(false);
    expect(contactoVisible("PAGO_CONFIRMADO")).toBe(true);
  });
});

describe("Reputación (RF-14, CP-28)", () => {
  it("5 y 4 → 4.50; agregando 3 → 4.00", () => {
    expect(calcularPromedio([5, 4])).toBe(4.5);
    expect(calcularPromedio([5, 4, 3])).toBe(4);
  });
  it("sin calificaciones no se calcula", () => {
    expect(calcularPromedio([])).toBeNull();
    expect(formatoReputacion(null)).toBe("Sin calificaciones");
  });
  it("redondea a dos decimales", () => {
    expect(calcularPromedio([5, 4, 4])).toBe(4.33);
  });
});

describe("Validaciones (RF-01, RF-04, RF-12, RNF-06)", () => {
  const base = { nombre: "Ana Reyes", correo: "ana@uth.hn", carrera: "", contrasenia: "segura123", confirmacion: "segura123" };
  it("CP-01: registro válido", () => {
    expect(registroSchema.safeParse(base).success).toBe(true);
  });
  it("CP-03: contraseña de 5 caracteres se rechaza", () => {
    expect(registroSchema.safeParse({ ...base, contrasenia: "ab123", confirmacion: "ab123" }).success).toBe(false);
  });
  it("contraseñas distintas y correo inválido se rechazan", () => {
    expect(registroSchema.safeParse({ ...base, confirmacion: "otra1234" }).success).toBe(false);
    expect(registroSchema.safeParse({ ...base, correo: "no-es-correo" }).success).toBe(false);
  });
  const svc = { titulo: "Tutoría de Cálculo", descripcion: "Repaso completo de derivadas e integrales.", categoriaId: "1", precio: "150", unidadPrecio: "HORA", modalidad: "", horario: "" };
  it("CP-08: servicio con precio 150 es válido", () => {
    expect(servicioSchema.safeParse(svc).success).toBe(true);
  });
  it("CP-09: precio -10 se rechaza", () => {
    expect(servicioSchema.safeParse({ ...svc, precio: "-10" }).success).toBe(false);
    expect(servicioSchema.safeParse({ ...svc, precio: "abc" }).success).toBe(false);
  });
  it("calificación fuera de 1..5 se rechaza", () => {
    const id = "clx0000000000000000000000";
    expect(resenaSchema.safeParse({ solicitudId: id, calificacion: "6" }).success).toBe(false);
    expect(resenaSchema.safeParse({ solicitudId: id, calificacion: "0" }).success).toBe(false);
    expect(resenaSchema.safeParse({ solicitudId: id, calificacion: "5" }).success).toBe(true);
  });
  it("contacto con formato inválido se rechaza", () => {
    expect(perfilSchema.safeParse({ nombre: "Ana", contacto: "<script>" }).success).toBe(false);
    expect(perfilSchema.safeParse({ nombre: "Ana", contacto: "+504 9999-8888" }).success).toBe(true);
  });
  it("RN-11: detecta ofertas contra la integridad académica", () => {
    expect(violaIntegridadAcademica("Hago tu tarea de cálculo")).toBe(true);
    expect(violaIntegridadAcademica("Resuelvo exámenes en línea")).toBe(true);
    expect(violaIntegridadAcademica("Tutoría de cálculo para tu examen")).toBe(false);
  });
});

describe("Archivos del chat (RF-16, CP-23)", () => {
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
  it("acepta un PDF real", () => {
    expect(validarArchivo("guia.pdf", 1000, pdf).ok).toBe(true);
  });
  it("rechaza archivos mayores al límite", () => {
    expect(validarArchivo("grande.pdf", TAMANO_MAXIMO + 1, pdf).ok).toBe(false);
  });
  it("rechaza extensiones no permitidas y contenido disfrazado", () => {
    expect(validarArchivo("virus.exe", 100, new Uint8Array([0x4d, 0x5a])).ok).toBe(false);
    expect(validarArchivo("falso.pdf", 100, new Uint8Array([0x4d, 0x5a, 0, 0])).ok).toBe(false);
  });
});

describe("Seguridad de redirecciones", () => {
  it("solo permite rutas internas", () => {
    expect(rutaSegura("/solicitudes")).toBe("/solicitudes");
    expect(rutaSegura("https://malicioso.com")).toBe("/servicios");
    expect(rutaSegura("//malicioso.com")).toBe("/servicios");
  });
});
