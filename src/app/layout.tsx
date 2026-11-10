import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import Link from "next/link";
import { cookies } from "next/headers";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "Marketplace Académico · Servicios entre estudiantes", template: "%s · Marketplace Académico" },
  description:
    "Publica, encuentra y solicita servicios entre estudiantes: tutorías, programación, diseño, proyectos y más, con reputación verificada por reseñas.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#186442", width: "device-width", initialScale: 1 };

// Todas las páginas dependen de la sesión: se renderizan en el servidor en cada petición.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tema = (await cookies()).get("tema")?.value;
  const dataTheme = tema === "oscuro" ? "dark" : tema === "claro" ? "light" : undefined;
  return (
    <html lang="es" className={`${jakarta.variable} ${fraunces.variable}`} data-theme={dataTheme} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col">
        <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-superficie focus:px-3 focus:py-2">
          Saltar al contenido
        </a>
        <Navbar />
        <main id="contenido" className="flex-1">
          {children}
        </main>
        <footer className="mt-16 border-t border-tinta/10 bg-superficie/60">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-tinta/60 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>
              <span className="font-semibold text-tinta">Marketplace Académico</span> · Ingeniería de Software I · Universidad Tecnológica de Honduras
            </p>
            <div className="flex gap-4">
              <Link href="/normas" className="hover:text-tinta">
                Normas y privacidad
              </Link>
              <Link href="/servicios" className="hover:text-tinta">
                Catálogo
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
