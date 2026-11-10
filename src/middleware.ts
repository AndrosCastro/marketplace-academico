// Middleware: política de seguridad de contenido (CSP) con nonce por petición
// y redirección temprana de rutas privadas cuando no hay cookie de sesión.
// La verificación real de la sesión se hace en el servidor (src/lib/sesion.ts).
import { NextResponse, type NextRequest } from "next/server";

const RUTAS_PRIVADAS = ["/perfil", "/mis-servicios", "/solicitudes", "/servicios/nuevo", "/admin"];
const COOKIE = process.env.NODE_ENV === "production" ? "__Host-mk_sesion" : "mk_sesion";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const esPrivada =
    RUTAS_PRIVADAS.some((r) => pathname === r || pathname.startsWith(r + "/")) || /^\/servicios\/[^/]+\/editar$/.test(pathname);
  if (esPrivada && !req.cookies.get(COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  const reqHeaders = new Headers(req.headers);
  reqHeaders.set("x-nonce", nonce);
  reqHeaders.set("Content-Security-Policy", csp);

  const res = NextResponse.next({ request: { headers: reqHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  // Las páginas privadas no deben quedar en caché (CP-05: volver atrás tras cerrar sesión)
  if (esPrivada) res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
