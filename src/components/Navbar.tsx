import Link from "next/link";
import { usuarioActual } from "@/lib/sesion";
import { prisma } from "@/lib/db";
import { cerrarSesion } from "@/actions/auth";
import { Avatar } from "./ui";
import { SelectorTema } from "./SelectorTema";
import { cookies } from "next/headers";

async function pendientes(usuarioId: string) {
  // Solicitudes que esperan una acción del usuario (aviso en el menú)
  const [comoProveedor, comoCliente] = await Promise.all([
    prisma.solicitud.count({ where: { servicio: { proveedorId: usuarioId }, estado: { in: ["PENDIENTE", "ACEPTADA"] } } }),
    prisma.solicitud.count({ where: { clienteId: usuarioId, OR: [{ estado: "ENTREGADA" }, { estado: "COMPLETADA", resena: null }] } }),
  ]);
  return comoProveedor + comoCliente;
}

export async function Navbar() {
  const u = await usuarioActual();
  const n = u ? await pendientes(u.id) : 0;
  const t = (await cookies()).get("tema")?.value;
  const tema = t === "claro" || t === "oscuro" ? t : "sistema";

  const enlaces = u
    ? [
        { href: "/servicios", txt: "Explorar" },
        { href: "/solicitudes", txt: "Solicitudes", badge: n },
        { href: "/mis-servicios", txt: "Mis servicios" },
        ...(u.rol === "ADMIN" ? [{ href: "/admin", txt: "Admin" }] : []),
      ]
    : [{ href: "/servicios", txt: "Explorar servicios" }];

  return (
    <header className="sticky top-0 z-30 border-b border-tinta/10 bg-papel/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Inicio">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-bosque-700 font-display text-lg font-bold text-mango-300 shadow-sm">
            M
          </span>
          <span className="leading-tight">
            <span className="block font-display text-[17px] font-semibold">Marketplace</span>
            <span className="-mt-0.5 block text-[11px] font-bold tracking-[0.16em] text-bosque-700 uppercase">Académico</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {enlaces.map((e) => (
            <Link key={e.href} href={e.href} className="relative rounded-lg px-3 py-2 text-sm font-semibold text-tinta/75 hover:bg-bosque-50 hover:text-tinta">
              {e.txt}
              {"badge" in e && e.badge ? (
                <span className="ml-1.5 rounded-full bg-mango-400 px-1.5 py-0.5 text-[10px] font-bold text-oscuro">{e.badge}</span>
              ) : null}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <SelectorTema inicial={tema} />
          {u ? (
            <>
              <Link href="/servicios/nuevo" className="btn-acento hidden sm:inline-flex">
                + Publicar
              </Link>
              <details className="relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full p-0.5 hover:bg-bosque-50 [&::-webkit-details-marker]:hidden">
                  <Avatar id={u.id} nombre={u.nombre} tam={36} />
                  {n > 0 && <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-mango-400 ring-2 ring-papel md:hidden" />}
                </summary>
                <div className="tarjeta absolute right-0 mt-2 w-60 overflow-hidden p-1.5">
                  <p className="truncate px-3 pt-2 text-sm font-bold">{u.nombre}</p>
                  <p className="truncate px-3 pb-2 text-xs text-tinta/55">{u.correo}</p>
                  <div className="my-1 h-px bg-tinta/10" />
                  {[
                    ...enlaces,
                    { href: "/servicios/nuevo", txt: "Publicar servicio" },
                    { href: "/perfil", txt: "Mi perfil" },
                    { href: `/usuarios/${u.id}`, txt: "Ver mi perfil público" },
                  ].map((e) => (
                    <Link key={e.href + e.txt} href={e.href} className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-bosque-50">
                      {e.txt}
                    </Link>
                  ))}
                  <div className="my-1 h-px bg-tinta/10" />
                  <form action={cerrarSesion}>
                    <button className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50">Cerrar sesión</button>
                  </form>
                </div>
              </details>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secundario">
                Iniciar sesión
              </Link>
              <Link href="/registro" className="btn-primario hidden sm:inline-flex">
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
