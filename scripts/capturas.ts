// Genera capturas de pantalla del prototipo y el diagrama entidad-relación para la documentación.
// Uso: (con la app corriendo en E2E_URL) npx tsx scripts/capturas.ts
import { chromium, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

if (existsSync(".env")) {
  for (const l of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && process.env[m[1]!] === undefined) process.env[m[1]!] = m[2];
  }
}
const URL = process.env.E2E_URL ?? "http://localhost:3005";
const OUT = "docs/capturas";
mkdirSync(OUT, { recursive: true });
const db = new PrismaClient();

async function login(p: Page, correo: string, pass: string) {
  await p.goto(`${URL}/login`);
  await p.locator("#campo-correo").fill(correo);
  await p.locator("#campo-contrasenia").fill(pass);
  await p.getByRole("button", { name: "Iniciar sesión" }).click();
  await p.waitForURL((u) => !u.pathname.startsWith("/login"));
}

async function main() {
  const demo = process.env.SEED_DEMO_PASSWORD!;
  const adminPass = process.env.SEED_ADMIN_PASSWORD!;
  const browser = await chromium.launch({ channel: "msedge" });
  const shot = async (p: Page, ruta: string, nombre: string, completa = false) => {
    await p.goto(URL + ruta);
    await p.waitForLoadState("networkidle");
    await p.screenshot({ path: `${OUT}/${nombre}.png`, fullPage: completa });
    console.log("✔", nombre);
  };

  const anon = await (await browser.newContext({ viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1.5 })).newPage();
  await shot(anon, "/", "01-inicio", true);
  await shot(anon, "/servicios", "02-catalogo");
  await shot(anon, "/servicios?q=tutor%C3%ADa&cat=matematicas", "03-busqueda-filtro");
  await shot(anon, "/registro", "04-registro");
  await shot(anon, "/login", "05-login");

  const ana = await db.usuario.findUniqueOrThrow({ where: { correo: "ana@marketplace.test" } });
  const servicioSofia = await db.servicio.findFirstOrThrow({ where: { proveedor: { correo: "sofia@marketplace.test" } } });
  const p = await (await browser.newContext({ viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1.5 })).newPage();
  await login(p, "ana@marketplace.test", demo);
  await shot(p, `/servicios/${servicioSofia.id}`, "06-detalle-servicio");
  await shot(p, "/servicios/nuevo", "07-publicar-servicio");
  await shot(p, "/mis-servicios", "08-mis-servicios");
  await shot(p, "/solicitudes", "09-mis-solicitudes");
  const enCurso = await db.solicitud.findFirst({
    where: { servicio: { proveedorId: ana.id }, estado: "ENTREGADA" },
  });
  const pagada = await db.solicitud.findFirst({ where: { OR: [{ clienteId: ana.id }, { servicio: { proveedorId: ana.id } }], estado: "PAGO_CONFIRMADO" } });
  const sol = pagada ?? enCurso;
  if (sol) await shot(p, `/solicitudes/${sol.id}`, "10-detalle-solicitud-chat", true);
  await shot(p, "/perfil", "11-mi-perfil");
  await shot(p, `/usuarios/${ana.id}`, "12-perfil-publico-resenas", true);

  const adm = await (await browser.newContext({ viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1.5 })).newPage();
  await login(adm, process.env.SEED_ADMIN_EMAIL ?? "admin@marketplace.test", adminPass);
  await shot(adm, "/admin", "13-panel-admin", true);

  const movil = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true })).newPage();
  await shot(movil, "/", "14-movil-inicio");
  await shot(movil, "/servicios", "15-movil-catalogo");

  // Diagrama entidad-relación (base de datos conceptual)
  const er = await (await browser.newContext({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 })).newPage();
  await er.setContent(readFileSync("docs/diagrama-er.html", "utf8"));
  await er.locator("#diagrama").screenshot({ path: `${OUT}/diagrama-er.png` });
  console.log("✔ diagrama-er");

  await browser.close();
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
