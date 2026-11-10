import { defineConfig } from "@playwright/test";

// Pruebas de extremo a extremo (casos CP-01 a CP-34 de la SRS).
// Usa Microsoft Edge / Google Chrome instalados en el equipo (no descarga navegadores).
// Requiere la app corriendo:  npm run build && npm start  (o E2E_URL apuntando a otro entorno)
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  workers: 1,
  fullyParallel: false,
  reporter: [["list"], ["json", { outputFile: "e2e-resultados.json" }]],
  use: {
    baseURL: process.env.E2E_URL ?? "http://localhost:3005",
    channel: process.env.E2E_CHANNEL ?? "msedge",
    locale: "es-HN",
    timezoneId: "America/Tegucigalpa",
    viewport: { width: 1280, height: 860 },
  },
});
