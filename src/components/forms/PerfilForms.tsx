"use client";
import { useActionState } from "react";
import { actualizarPerfil, cambiarContrasenia } from "@/actions/perfil";
import { Campo, BotonEnviar } from "@/components/Campo";
import { Aviso } from "@/components/ui";

type Perfil = { nombre: string; carrera: string; descripcion: string; habilidades: string; contacto: string };

export function FormPerfil({ p }: { p: Perfil }) {
  const [st, accion] = useActionState(actualizarPerfil, undefined);
  const e = st?.campos ?? {};
  return (
    <form action={accion} className="space-y-5" noValidate>
      {st?.ok && <Aviso>{st.ok}</Aviso>}
      {st?.error && <Aviso tipo="error">{st.error}</Aviso>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo nombre="nombre" etiqueta="Nombre" required maxLength={100} valor={p.nombre} error={e.nombre} />
        <Campo nombre="carrera" etiqueta="Carrera" maxLength={100} valor={p.carrera} error={e.carrera} />
      </div>
      <Campo nombre="descripcion" etiqueta="Sobre mí" area filas={4} maxLength={1000} valor={p.descripcion} error={e.descripcion} placeholder="Tu experiencia, cómo trabajas…" />
      <Campo
        nombre="habilidades"
        etiqueta="Habilidades"
        maxLength={255}
        valor={p.habilidades}
        error={e.habilidades}
        ayuda="Sepáralas con comas. Ej: Python, Cálculo, Canva"
      />
      <Campo
        nombre="contacto"
        etiqueta="WhatsApp o teléfono"
        tipo="tel"
        maxLength={30}
        valor={p.contacto}
        error={e.contacto}
        ayuda="🔒 Solo lo verá la otra parte de una solicitud con pago confirmado."
      />
      <BotonEnviar pendiente="Guardando…">Guardar perfil</BotonEnviar>
    </form>
  );
}

export function FormContrasenia() {
  const [st, accion] = useActionState(cambiarContrasenia, undefined);
  const e = st?.campos ?? {};
  return (
    <form action={accion} className="space-y-4" noValidate>
      {st?.ok && <Aviso>{st.ok}</Aviso>}
      <Campo nombre="actual" etiqueta="Contraseña actual" tipo="password" autoComplete="current-password" required error={e.actual} />
      <Campo nombre="nueva" etiqueta="Nueva contraseña" tipo="password" autoComplete="new-password" required error={e.nueva} />
      <Campo nombre="confirmacion" etiqueta="Confirmar nueva contraseña" tipo="password" autoComplete="new-password" required error={e.confirmacion} />
      <BotonEnviar clase="btn-secundario" pendiente="Actualizando…">
        Cambiar contraseña
      </BotonEnviar>
    </form>
  );
}
