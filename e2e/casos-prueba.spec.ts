// =====================================================================
// Pruebas de extremo a extremo: casos de prueba CP-01 a CP-34 de la SRS (sección 5.2).
// Cada prueba lleva en su nombre el código del caso para trazar resultados.
// =====================================================================
import { test, expect, chromium, type Page, type BrowserContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync, existsSync } from "node:fs";

if (existsSync(".env")) {
  for (const l of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && process.env[m[1]!] === undefined) process.env[m[1]!] = m[2];
  }
}

const db = new PrismaClient();
const RUN = Date.now().toString(36);
const PASS = "PruebaE2e#2026";
const A = { nombre: "Proveedor Prueba", correo: `prov.${RUN}@e2e.test` };
const B = { nombre: "Cliente Prueba", correo: `cli.${RUN}@e2e.test` };
const C = { nombre: "Tercero Prueba", correo: `ter.${RUN}@e2e.test` };
const TITULO = `Tutoría E2E de Álgebra ${RUN}`;

let ctxA: BrowserContext, ctxB: BrowserContext, ctxC: BrowserContext;
let pA: Page, pB: Page, pC: Page;
let servicioId = "";
let solicitudId = "";
let mensajeArchivoId = "";

test.describe.configure({ mode: "serial" });

async function login(p: Page, correo: string, pass = PASS) {
  await p.goto("/login");
  await p.locator("#campo-correo").fill(correo);
  await p.locator("#campo-contrasenia").fill(pass);
  await p.getByRole("button", { name: "Iniciar sesión" }).click();
  await p.waitForURL((u) => !u.pathname.startsWith("/login"));
}

test.beforeAll(async ({ browser }) => {
  // B y C se crean directo en la BD (el límite de registros por red protege el formulario).
  const hash = await bcrypt.hash(PASS, 10);
  await db.usuario.createMany({
    data: [
      { nombre: B.nombre, correo: B.correo, contrasenia: hash },
      { nombre: C.nombre, correo: C.correo, contrasenia: hash },
    ],
  });
  ctxA = await browser.newContext();
  ctxB = await browser.newContext();
  ctxC = await browser.newContext();
  pA = await ctxA.newPage();
  pB = await ctxB.newPage();
  pC = await ctxC.newPage();
  for (const p of [pA, pB, pC]) p.on("dialog", (d) => d.accept());
});

test.afterAll(async () => {
  await Promise.all([ctxA?.close(), ctxB?.close(), ctxC?.close()]);
  // Limpieza: elimina todo lo creado por esta corrida para no ensuciar los datos de demostración.
  const ids = (await db.usuario.findMany({ where: { correo: { endsWith: `${RUN}@e2e.test` } }, select: { id: true } })).map((u) => u.id);
  const sol = { OR: [{ clienteId: { in: ids } }, { servicio: { proveedorId: { in: ids } } }] };
  await db.mensaje.deleteMany({ where: { solicitud: sol } });
  await db.resena.deleteMany({ where: { solicitud: sol } });
  await db.solicitud.deleteMany({ where: sol });
  await db.reporte.deleteMany({ where: { OR: [{ reportanteId: { in: ids } }, { servicio: { proveedorId: { in: ids } } }] } });
  await db.servicio.deleteMany({ where: { proveedorId: { in: ids } } });
  await db.intentoAcceso.deleteMany({ where: { clave: { contains: `${RUN}@e2e.test` } } });
  await db.usuario.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
});

// ---------------------------------------------------------------- M1
test("CP-01 Registro válido crea la cuenta y permite iniciar sesión", async () => {
  await pA.goto("/registro");
  await pA.locator("#campo-nombre").fill(A.nombre);
  await pA.locator("#campo-correo").fill(A.correo);
  await pA.locator("#campo-carrera").fill("Ingeniería en Computación");
  await pA.locator("#campo-contrasenia").fill(PASS);
  await pA.locator("#campo-confirmacion").fill(PASS);
  await pA.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(pA).toHaveURL(/\/login\?registrado=1/);
  await expect(pA.getByText("¡Cuenta creada!")).toBeVisible();
  const u = await db.usuario.findUnique({ where: { correo: A.correo } });
  expect(u?.contrasenia.startsWith("$2")).toBe(true); // contraseña cifrada con bcrypt
});

test("CP-02 Registro con correo ya registrado se rechaza", async () => {
  await pC.goto("/registro");
  await pC.locator("#campo-nombre").fill("Duplicado");
  await pC.locator("#campo-correo").fill(A.correo);
  await pC.locator("#campo-contrasenia").fill(PASS);
  await pC.locator("#campo-confirmacion").fill(PASS);
  await pC.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(pC.getByText("Este correo ya está registrado.")).toBeVisible();
  expect(await db.usuario.count({ where: { correo: A.correo } })).toBe(1);
});

test("CP-03 Registro con contraseña de 5 caracteres se rechaza", async () => {
  await pC.goto("/registro");
  await pC.locator("#campo-nombre").fill("Clave Corta");
  await pC.locator("#campo-correo").fill(`corta.${RUN}@e2e.test`);
  await pC.locator("#campo-contrasenia").fill("ab123");
  await pC.locator("#campo-confirmacion").fill("ab123");
  await pC.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(pC.getByText("al menos 8 caracteres")).toBeVisible();
  expect(await db.usuario.count({ where: { correo: `corta.${RUN}@e2e.test` } })).toBe(0);
});

test("CP-05 Inicio de sesión con contraseña errónea muestra mensaje general", async () => {
  await pA.goto("/login");
  await pA.locator("#campo-correo").fill(A.correo);
  await pA.locator("#campo-contrasenia").fill("Equivocada123");
  await pA.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(pA.getByText("Correo o contraseña incorrectos.")).toBeVisible();
  await expect(pA).toHaveURL(/\/login/);
});

test("CP-04 Inicio de sesión con credenciales correctas da acceso al catálogo", async () => {
  await login(pA, A.correo);
  await expect(pA).toHaveURL(/\/servicios/);
  await expect(pA.getByRole("link", { name: "+ Publicar" })).toBeVisible();
  await login(pB, B.correo);
  await login(pC, C.correo);
});

test("CP-06 Cerrar sesión y volver atrás no muestra datos privados", async ({ browser }) => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await login(p, C.correo);
  await p.goto("/perfil");
  await expect(p.getByText(`${C.correo} · solo tú lo ves`)).toBeVisible();
  await p.locator("summary").click();
  await p.getByRole("button", { name: "Cerrar sesión" }).click();
  await p.waitForURL(/sesion=cerrada/);
  await p.goBack();
  await p.reload();
  await expect(p).toHaveURL(/\/login/);
  await expect(p.getByText(C.correo)).toHaveCount(0);
  await ctx.close();
});

test("CP-07 Editar habilidades del perfil; nadie más puede editarlo", async () => {
  await pA.goto("/perfil");
  await pA.locator("#campo-habilidades").fill("Álgebra, Cálculo, Python");
  await pA.locator("#campo-contacto").fill("+504 9999-0000");
  await pA.getByRole("button", { name: "Guardar perfil" }).click();
  await expect(pA.getByText("Perfil actualizado correctamente.")).toBeVisible();
  const a = await db.usuario.findUniqueOrThrow({ where: { correo: A.correo } });
  await pC.goto(`/usuarios/${a.id}`);
  await expect(pC.getByText("Álgebra")).toBeVisible();
  // El formulario de perfil solo edita al usuario de la sesión: C en /perfil ve SUS datos, no los de A.
  await pC.goto("/perfil");
  await expect(pC.locator("#campo-nombre")).toHaveValue(C.nombre);
});

// ---------------------------------------------------------------- M2
test("CP-09 Publicar con precio -10 no se guarda y marca el campo", async () => {
  await pA.goto("/servicios/nuevo");
  await pA.locator("#campo-titulo").fill(TITULO);
  await pA.locator("#campo-descripcion").fill("Repaso de ecuaciones, matrices y sistemas lineales con ejercicios.");
  await pA.locator("#categoriaId").selectOption({ label: "📐 Matemáticas" });
  await pA.locator("#campo-precio").fill("-10");
  await pA.getByRole("button", { name: "Publicar servicio" }).click();
  await expect(pA.getByText("El precio no puede ser negativo.")).toBeVisible();
  expect(await db.servicio.count({ where: { titulo: TITULO } })).toBe(0);
});

test("RN-11 Publicación que ofrece hacer tareas se bloquea", async () => {
  await pA.goto("/servicios/nuevo");
  await pA.locator("#campo-titulo").fill("Hago tu tarea de álgebra");
  await pA.locator("#campo-descripcion").fill("Hago tus tareas y te las entrego listas para presentar.");
  await pA.locator("#categoriaId").selectOption({ label: "📐 Matemáticas" });
  await pA.locator("#campo-precio").fill("100");
  await pA.getByRole("button", { name: "Publicar servicio" }).click();
  await expect(pA.getByText(/integridad académica/).first()).toBeVisible();
});

test("CP-08 Publicar un servicio con precio 150 aparece en el catálogo", async () => {
  await pA.goto("/servicios/nuevo");
  await pA.locator("#campo-titulo").fill(TITULO);
  await pA.locator("#campo-descripcion").fill("Repaso de ecuaciones, matrices y sistemas lineales con ejercicios.");
  await pA.locator("#categoriaId").selectOption({ label: "📐 Matemáticas" });
  await pA.locator("#campo-precio").fill("150");
  await pA.getByRole("button", { name: "Publicar servicio" }).click();
  await expect(pA.getByText("¡Servicio publicado!")).toBeVisible();
  servicioId = pA.url().split("/servicios/")[1]!.split("?")[0]!;
  await pB.goto(`/servicios?q=${encodeURIComponent(RUN)}`);
  await expect(pB.getByRole("heading", { name: TITULO })).toBeVisible();
});

test("CP-11 Otro usuario intenta modificar un servicio ajeno: acceso denegado", async () => {
  await pC.goto(`/servicios/${servicioId}/editar`);
  await expect(pC.getByText("Acceso denegado")).toBeVisible();
  await expect(pC.locator("#campo-titulo")).toHaveCount(0);
});

// ---------------------------------------------------------------- M3
test("CP-13 Buscar una palabra y elegir categoría: solo coincidencias de ambas", async () => {
  await pB.goto(`/servicios?q=${encodeURIComponent("E2E")}&cat=matematicas`);
  const titulos = await pB.locator("h3").allTextContents();
  expect(titulos.length).toBeGreaterThan(0);
  for (const t of titulos) expect(t.toLowerCase()).toContain("e2e");
  await pB.goto(`/servicios?q=${encodeURIComponent("E2E " + RUN)}&cat=idiomas`);
  await expect(pB.getByRole("heading", { name: TITULO })).toHaveCount(0);
});

test("CP-14 Buscar un texto inexistente sugiere quitar filtros", async () => {
  await pB.goto("/servicios?q=zzzz-no-existe-xyz");
  await expect(pB.getByText("Sin resultados")).toBeVisible();
  await expect(pB.getByRole("link", { name: "quitar los filtros" })).toBeVisible();
});

test("CP-15 El detalle ajeno muestra Solicitar; el propio no", async () => {
  await pB.goto(`/servicios/${servicioId}`);
  await expect(pB.getByRole("button", { name: "Solicitar servicio" })).toBeVisible();
  await pA.goto(`/servicios/${servicioId}`);
  await expect(pA.getByRole("button", { name: "Solicitar servicio" })).toHaveCount(0);
  await expect(pA.getByText("Este es tu servicio.")).toBeVisible();
  // RNF-03: el contacto externo no se muestra en el detalle
  await expect(pB.getByText("+504 9999-0000")).toHaveCount(0);
});

// ---------------------------------------------------------------- M4
test("CP-16 Solicitar un servicio activo de otra persona crea una solicitud Pendiente", async () => {
  await pB.goto(`/servicios/${servicioId}`);
  await pB.locator("#campo-mensaje").fill("Necesito repasar matrices para el parcial.");
  await pB.getByRole("button", { name: "Solicitar servicio" }).click();
  await pB.waitForURL(/\/solicitudes\/.+\?creada=1/);
  solicitudId = pB.url().split("/solicitudes/")[1]!.split("?")[0]!;
  await expect(pB.locator(".chip", { hasText: "Pendiente" }).first()).toBeVisible();
  await pA.goto("/solicitudes?rol=recibidas");
  await expect(pA.getByText(TITULO).first()).toBeVisible();
});

test("CP-17 Solicitar un servicio propio se rechaza (también en la base de datos)", async () => {
  const a = await db.usuario.findUniqueOrThrow({ where: { correo: A.correo } });
  await expect(db.solicitud.create({ data: { clienteId: a.id, servicioId, precioAcordado: 150 } })).rejects.toThrow(/RN-08/);
});

test("CP-18 Un usuario ajeno abre la dirección de una solicitud: acceso rechazado", async () => {
  await pC.goto(`/solicitudes/${solicitudId}`);
  await expect(pC.getByText("Acceso denegado")).toBeVisible();
  await expect(pC.getByText("Necesito repasar matrices")).toHaveCount(0);
});

test("CP-20 No se puede marcar Entregada sin pago confirmado", async () => {
  await pA.goto(`/solicitudes/${solicitudId}`);
  await pA.getByRole("button", { name: "Aceptar solicitud" }).click();
  await expect(pA.locator(".chip", { hasText: "Aceptada" }).first()).toBeVisible();
  await expect(pA.getByRole("button", { name: "Marcar como entregada" })).toHaveCount(0);
  await expect(pA.getByText("Confirmar pago adelantado")).toBeVisible();
});

test("CP-19 El proveedor acepta: estado Aceptada visible para el cliente", async () => {
  await pB.goto(`/solicitudes/${solicitudId}`);
  await expect(pB.locator(".chip", { hasText: "Aceptada" }).first()).toBeVisible();
  // RNF-03: aún sin pago, el contacto externo está oculto
  await expect(pB.getByText("+504 9999-0000")).toHaveCount(0);
});

test("CP-22 Mensaje con PDF: lo ve la otra parte y no una tercera persona", async () => {
  await pB.goto(`/solicitudes/${solicitudId}`);
  await pB.locator("#chat-mensaje").fill("Te envío la guía del parcial.");
  await pB.locator('input[name="archivo"]').setInputFiles({
    name: "guia-parcial.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n% guia de prueba\n"),
  });
  await pB.getByRole("button", { name: "Enviar" }).click();
  await expect(pB.getByText("guia-parcial.pdf")).toBeVisible();
  await pA.goto(`/solicitudes/${solicitudId}`);
  const enlace = pA.getByRole("link", { name: /guia-parcial\.pdf/ });
  await expect(enlace).toBeVisible();
  mensajeArchivoId = (await enlace.getAttribute("href"))!.split("/").pop()!;
  const rA = await pA.request.get(`/api/archivos/${mensajeArchivoId}`);
  expect(rA.status()).toBe(200);
  expect(rA.headers()["content-disposition"]).toContain("attachment");
  const rC = await pC.request.get(`/api/archivos/${mensajeArchivoId}`);
  expect(rC.status()).toBe(404);
});

test("CP-23 Enviar un archivo mayor al límite se rechaza", async () => {
  await pB.goto(`/solicitudes/${solicitudId}`);
  const grande = Buffer.alloc(Math.round(4.2 * 1024 * 1024), 0x41);
  grande.write("%PDF-1.4");
  await pB.locator('input[name="archivo"]').setInputFiles({ name: "grande.pdf", mimeType: "application/pdf", buffer: grande });
  await pB.getByRole("button", { name: "Enviar" }).click();
  await expect(pB.getByText("El archivo supera el límite de 4 MB.")).toBeVisible();
  // Archivo disfrazado (ejecutable con extensión .pdf)
  await pB.locator('input[name="archivo"]').setInputFiles({ name: "factura.pdf", mimeType: "application/pdf", buffer: Buffer.from("MZ\x90\x00binario") });
  await pB.getByRole("button", { name: "Enviar" }).click();
  await expect(pB.getByText("no coincide con su extensión")).toBeVisible();
});

test("CP-21 El proveedor confirma el pago desde Aceptada", async () => {
  await pA.goto(`/solicitudes/${solicitudId}`);
  await pA.locator("#campo-nota").fill("Transferencia de prueba");
  await pA.getByRole("button", { name: "Confirmar pago recibido" }).click();
  await expect(pA.getByText("Pago confirmado: realiza el trabajo")).toBeVisible();
  // Contacto visible para ambas partes tras el pago confirmado
  await pB.goto(`/solicitudes/${solicitudId}`);
  await expect(pB.getByText("+504 9999-0000")).toBeVisible();
});

test("CP-26 Calificar una solicitud en estado Entregada no se permite", async () => {
  await pA.goto(`/solicitudes/${solicitudId}`);
  await pA.getByRole("button", { name: "Marcar como entregada" }).click();
  await expect(pA.getByText("Esperando que el cliente confirme")).toBeVisible();
  await pB.goto(`/solicitudes/${solicitudId}`);
  await expect(pB.getByRole("button", { name: "Publicar calificación" })).toHaveCount(0);
});

test("CP-24 Calificar con 5 una solicitud Completada", async () => {
  await pB.goto(`/solicitudes/${solicitudId}`);
  await pB.getByRole("button", { name: "Confirmar recepción" }).click();
  await expect(pB.getByText("¡Califica tu experiencia!")).toBeVisible();
  await pB.getByRole("button", { name: "5 estrellas" }).click();
  await pB.locator("#campo-comentario").fill("Excelente explicación, muy recomendado.");
  await pB.getByRole("button", { name: "Publicar calificación" }).click();
  await expect(pB.getByText(/Publicada el/)).toBeVisible();
});

test("CP-25 Calificar de nuevo la misma solicitud no se permite", async () => {
  await pB.goto(`/solicitudes/${solicitudId}`);
  await expect(pB.getByRole("button", { name: "Publicar calificación" })).toHaveCount(0);
  await expect(db.resena.create({ data: { solicitudId, calificacion: 1 } })).rejects.toThrow();
});

async function flujoCompleto(nota: number) {
  await pB.goto(`/servicios/${servicioId}`);
  await pB.getByRole("button", { name: "Solicitar servicio" }).click();
  await pB.waitForURL(/creada=1/);
  const id = pB.url().split("/solicitudes/")[1]!.split("?")[0]!;
  await pA.goto(`/solicitudes/${id}`);
  await pA.getByRole("button", { name: "Aceptar solicitud" }).click();
  await pA.getByRole("button", { name: "Confirmar pago recibido" }).click();
  await pA.getByRole("button", { name: "Marcar como entregada" }).click();
  await expect(pA.getByText("Esperando que el cliente confirme")).toBeVisible();
  await pB.goto(`/solicitudes/${id}`);
  await pB.getByRole("button", { name: "Confirmar recepción" }).click();
  await pB.getByRole("button", { name: `${nota} estrellas` }).click();
  await pB.getByRole("button", { name: "Publicar calificación" }).click();
  await expect(pB.getByText(/Publicada el/)).toBeVisible();
}

test("CP-28 Promedio: 5 y 4 → 4.50; agregando 3 → 4.00", async () => {
  const a = await db.usuario.findUniqueOrThrow({ where: { correo: A.correo } });
  await flujoCompleto(4);
  expect(Number((await db.usuario.findUniqueOrThrow({ where: { id: a.id } })).reputacion)).toBe(4.5);
  await pC.goto(`/usuarios/${a.id}`);
  await expect(pC.getByText("4.50").first()).toBeVisible();
  await flujoCompleto(3);
  expect(Number((await db.usuario.findUniqueOrThrow({ where: { id: a.id } })).reputacion)).toBe(4);
});

test("CP-27 Perfil con calificaciones muestra reseñas; sin calificaciones muestra el aviso", async () => {
  const a = await db.usuario.findUniqueOrThrow({ where: { correo: A.correo } });
  const c = await db.usuario.findUniqueOrThrow({ where: { correo: C.correo } });
  await pB.goto(`/usuarios/${a.id}`);
  await expect(pB.getByText("Excelente explicación, muy recomendado.")).toBeVisible();
  await pB.goto(`/usuarios/${c.id}`);
  await expect(pB.getByText("Sin calificaciones").first()).toBeVisible();
});

test("CP-10 / CP-12 Retirar un servicio propio: sale del catálogo y conserva historial", async () => {
  await pA.goto("/mis-servicios");
  const fila = pA.locator("tr", { hasText: TITULO });
  await fila.getByRole("button", { name: "Retirar" }).click();
  await expect(pA.getByText("Servicio retirado del catálogo.")).toBeVisible();
  await pB.goto(`/servicios?q=${encodeURIComponent(RUN)}`);
  await expect(pB.getByRole("heading", { name: TITULO })).toHaveCount(0);
  await pB.goto(`/servicios/${servicioId}`);
  await expect(pB.getByText("El servicio no está disponible")).toBeVisible();
  // historial y reseñas se conservan
  const a = await db.usuario.findUniqueOrThrow({ where: { correo: A.correo } });
  expect(await db.resena.count({ where: { solicitud: { servicio: { proveedorId: a.id } } } })).toBe(3);
  await pB.goto(`/solicitudes/${solicitudId}`);
  await expect(pB.getByText(TITULO)).toBeVisible();
});

// ---------------------------------------------------------------- RNF
test("CP-30 Seguridad: rutas privadas sin sesión, datos sensibles ocultos y encabezados", async ({ browser }) => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  for (const ruta of ["/perfil", "/solicitudes", "/mis-servicios", "/servicios/nuevo", "/admin", `/solicitudes/${solicitudId}`]) {
    await p.goto(ruta);
    await expect(p).toHaveURL(/\/login/);
  }
  const r = await p.request.get(`/api/archivos/${mensajeArchivoId}`);
  expect(r.status()).toBe(401);
  // Las pantallas públicas nunca muestran correos ni contraseñas
  const a = await db.usuario.findUniqueOrThrow({ where: { correo: A.correo } });
  for (const ruta of ["/", "/servicios", `/usuarios/${a.id}`]) {
    await p.goto(ruta);
    const html = await p.content();
    expect(html).not.toContain(A.correo);
    expect(html).not.toContain("$2b$");
  }
  // Un estudiante no entra al panel de administración
  await pC.goto("/admin");
  await expect(pC).toHaveURL(/sin-permiso/);
  // Encabezados de seguridad
  const h = (await p.request.get("/servicios")).headers();
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  // Cookie de sesión HttpOnly
  const cookies = await ctxA.cookies();
  const sesion = cookies.find((c) => c.name.includes("mk_sesion"));
  expect(sesion?.httpOnly).toBe(true);
  expect(sesion?.sameSite).toBe("Lax");
  await ctx.close();
});

test("CP-30b Fuerza bruta: 5 intentos fallidos bloquean el acceso", async ({ browser }) => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  for (let i = 0; i < 5; i++) {
    await p.goto("/login");
    await p.locator("#campo-correo").fill(C.correo);
    await p.locator("#campo-contrasenia").fill(`Mala${i}12345`);
    await p.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(p.getByText("Correo o contraseña incorrectos.")).toBeVisible();
  }
  await p.goto("/login");
  await p.locator("#campo-correo").fill(C.correo);
  await p.locator("#campo-contrasenia").fill(PASS); // incluso con la contraseña correcta
  await p.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(p.getByText("Demasiados intentos fallidos")).toBeVisible();
  await ctx.close();
});

test("CP-31 Rendimiento: listar y buscar con 500 servicios en menos de 3 s", async () => {
  const d = await db.usuario.create({ data: { nombre: "Carga Masiva", correo: `carga.${RUN}@e2e.test`, contrasenia: "x" } });
  const cat = await db.categoria.findFirstOrThrow({ where: { slug: "otros" } });
  await db.servicio.createMany({
    data: Array.from({ length: 500 }, (_, i) => ({
      proveedorId: d.id,
      categoriaId: cat.id,
      titulo: `Servicio de carga ${RUN} #${i}`,
      descripcion: "Servicio generado para la prueba de rendimiento.",
      precio: 100 + i,
    })),
  });
  try {
    const t0 = Date.now();
    await pB.goto("/servicios");
    const tLista = Date.now() - t0;
    const t1 = Date.now();
    await pB.goto(`/servicios?q=${encodeURIComponent("carga " + RUN + " #49")}&cat=otros`);
    const tBusqueda = Date.now() - t1;
    await expect(pB.getByText(/resultados?/).first()).toBeVisible();
    console.log(`CP-31 tiempos -> listado: ${tLista} ms, búsqueda: ${tBusqueda} ms`);
    test.info().annotations.push({ type: "tiempos", description: `listado ${tLista} ms; búsqueda ${tBusqueda} ms` });
    expect(tLista).toBeLessThan(3000);
    expect(tBusqueda).toBeLessThan(3000);
  } finally {
    await db.servicio.deleteMany({ where: { proveedorId: d.id } });
    await db.usuario.delete({ where: { id: d.id } });
  }
});

test("CP-32 Compatibilidad: 360 px sin desplazamiento horizontal (Edge y Chrome)", async ({ browser }) => {
  const rutas = ["/", "/servicios", `/servicios/${servicioId}`, "/login", "/registro"];
  const revisar = async (ctx: BrowserContext) => {
    const p = await ctx.newPage();
    for (const r of rutas) {
      await p.goto(r);
      const ancho = await p.evaluate(() => document.documentElement.scrollWidth);
      expect(ancho, `ancho en ${r}`).toBeLessThanOrEqual(360);
    }
  };
  const edge = await browser.newContext({ viewport: { width: 360, height: 740 } });
  await revisar(edge);
  await edge.close();
  const chrome = await chromium.launch({ channel: "chrome" });
  const ctxChrome = await chrome.newContext({ viewport: { width: 360, height: 740 } });
  await revisar(ctxChrome);
  await chrome.close();
});

test("CP-33 Integridad: formularios incompletos y servicio inexistente se rechazan", async () => {
  const antes = await db.servicio.count();
  await pA.goto("/servicios/nuevo");
  await pA.getByRole("button", { name: "Publicar servicio" }).click();
  await expect(pA.getByText("El título debe tener al menos 5 caracteres.")).toBeVisible();
  expect(await db.servicio.count()).toBe(antes);
  await pB.goto("/servicios/cnoexiste0000000000000000");
  await expect(pB.getByText("El servicio no está disponible")).toBeVisible();
  // Restricciones en la base de datos (CHECK)
  const a = await db.usuario.findUniqueOrThrow({ where: { correo: A.correo } });
  const cat = await db.categoria.findFirstOrThrow();
  await expect(db.servicio.create({ data: { proveedorId: a.id, categoriaId: cat.id, titulo: "x", descripcion: "x", precio: -5 } })).rejects.toThrow();
});
