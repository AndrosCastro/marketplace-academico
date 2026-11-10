import Link from "next/link";
import { prisma } from "@/lib/db";
import { requerirUsuario } from "@/lib/sesion";
import { num } from "@/lib/consultas";
import { fecha } from "@/lib/formato";
import { FormPerfil, FormContrasenia } from "@/components/forms/PerfilForms";
import { Avatar, Estrellas, Titulo } from "@/components/ui";

export const metadata = { title: "Mi perfil" };

export default async function Perfil() {
  const u = await requerirUsuario("/perfil");
  // Solo los datos del propio usuario: el id sale de la sesión (RF-03)
  const p = await prisma.usuario.findUniqueOrThrow({
    where: { id: u.id },
    select: { id: true, nombre: true, correo: true, carrera: true, descripcion: true, habilidades: true, contacto: true, reputacion: true, totalResenas: true, fechaRegistro: true },
  });
  const [activos, enviadas, completadasComoProveedor] = await Promise.all([
    prisma.servicio.count({ where: { proveedorId: u.id, estado: "ACTIVO" } }),
    prisma.solicitud.count({ where: { clienteId: u.id } }),
    prisma.solicitud.count({ where: { servicio: { proveedorId: u.id }, estado: "COMPLETADA" } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Titulo sup="Cuenta">Mi perfil</Titulo>
      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-5">
          <div className="tarjeta p-6 text-center">
            <div className="flex justify-center">
              <Avatar id={p.id} nombre={p.nombre} tam={84} />
            </div>
            <p className="mt-3 text-lg font-bold">{p.nombre}</p>
            <p className="text-xs text-tinta/55">{p.correo} · solo tú lo ves</p>
            <div className="mt-3 flex justify-center">
              <Estrellas valor={num(p.reputacion)} />
            </div>
            <p className="mt-2 text-xs text-tinta/50">Miembro desde {fecha(p.fechaRegistro)}</p>
            <Link href={`/usuarios/${p.id}`} className="btn-secundario mt-4 w-full">
              Ver mi perfil público
            </Link>
          </div>
          <div className="tarjeta grid grid-cols-3 divide-x divide-tinta/10 py-4 text-center">
            {[
              [activos, "servicios activos"],
              [completadasComoProveedor, "completados"],
              [enviadas, "solicitudes hechas"],
            ].map(([n, t]) => (
              <div key={t as string} className="px-1">
                <p className="font-display text-2xl font-semibold text-bosque-700">{n}</p>
                <p className="text-[11px] leading-tight text-tinta/55">{t}</p>
              </div>
            ))}
          </div>
        </aside>
        <div className="space-y-8">
          <section className="tarjeta p-6 sm:p-8">
            <h2 className="mb-5 font-display text-2xl font-semibold">Información del perfil</h2>
            <FormPerfil
              p={{
                nombre: p.nombre,
                carrera: p.carrera ?? "",
                descripcion: p.descripcion ?? "",
                habilidades: p.habilidades ?? "",
                contacto: p.contacto ?? "",
              }}
            />
          </section>
          <section className="tarjeta p-6 sm:p-8">
            <h2 className="mb-1 font-display text-2xl font-semibold">Seguridad</h2>
            <p className="mb-5 text-sm text-tinta/60">Al cambiar la contraseña se cierran tus sesiones en otros dispositivos.</p>
            <FormContrasenia />
          </section>
        </div>
      </div>
    </div>
  );
}
