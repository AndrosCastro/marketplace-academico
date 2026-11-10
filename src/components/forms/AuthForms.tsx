"use client";
import { useActionState } from "react";
import Link from "next/link";
import { registrar, iniciarSesion } from "@/actions/auth";
import { Campo, BotonEnviar } from "@/components/Campo";
import { Aviso } from "@/components/ui";

export function FormLogin({ next }: { next?: string }) {
  const [st, accion] = useActionState(iniciarSesion, undefined);
  return (
    <form action={accion} className="space-y-4" noValidate>
      {st?.error && <Aviso tipo="error">{st.error}</Aviso>}
      <input type="hidden" name="next" value={next ?? "/servicios"} />
      <Campo nombre="correo" etiqueta="Correo" tipo="email" autoComplete="email" required valor={st?.valores?.correo} error={st?.campos?.correo} />
      <Campo nombre="contrasenia" etiqueta="Contraseña" tipo="password" autoComplete="current-password" required error={st?.campos?.contrasenia} />
      <BotonEnviar clase="btn-primario w-full" pendiente="Verificando…">
        Iniciar sesión
      </BotonEnviar>
      <p className="text-center text-sm text-tinta/60">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-bosque-700 hover:underline">
          Regístrate
        </Link>
      </p>
    </form>
  );
}

export function FormRegistro({ dominios }: { dominios: string[] }) {
  const [st, accion] = useActionState(registrar, undefined);
  // autoComplete="off": evita la lista de sugerencias de autocompletado, que hace cerrarse
  // Brave 1.99 en Windows (falla de Brave en UIAutomationCore al mostrar sugerencias).
  return (
    <form action={accion} className="space-y-4" noValidate autoComplete="off">
      {st?.error && <Aviso tipo="error">{st.error}</Aviso>}
      <Campo nombre="nombre" etiqueta="Nombre completo" autoComplete="off" required maxLength={100} valor={st?.valores?.nombre} error={st?.campos?.nombre} />
      <Campo
        nombre="correo"
        etiqueta="Correo"
        tipo="email"
        autoComplete="off"
        required
        maxLength={150}
        valor={st?.valores?.correo}
        error={st?.campos?.correo}
        ayuda={dominios.length ? `Solo correos institucionales: ${dominios.map((d) => "@" + d).join(", ")}` : "Tu correo nunca se muestra públicamente."}
      />
      <Campo nombre="carrera" etiqueta="Carrera" autoComplete="off" maxLength={100} placeholder="Ej. Ingeniería en Computación" valor={st?.valores?.carrera} error={st?.campos?.carrera} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          nombre="contrasenia"
          etiqueta="Contraseña"
          tipo="password"
          autoComplete="new-password"
          required
          minLength={8}
          error={st?.campos?.contrasenia}
          ayuda="Mínimo 8 caracteres, con letras y números."
        />
        <Campo nombre="confirmacion" etiqueta="Confirmar contraseña" tipo="password" autoComplete="new-password" required error={st?.campos?.confirmacion} />
      </div>
      <BotonEnviar clase="btn-primario w-full" pendiente="Creando cuenta…">
        Crear cuenta
      </BotonEnviar>
      <p className="text-center text-xs text-tinta/55">
        Al registrarte aceptas las{" "}
        <Link href="/normas" className="underline">
          normas de la comunidad
        </Link>
        , incluida la integridad académica.
      </p>
    </form>
  );
}
