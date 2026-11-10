import { redirect } from "next/navigation";
import { usuarioActual } from "@/lib/sesion";
import { rutaSegura } from "@/lib/form";
import { FormLogin } from "@/components/forms/AuthForms";
import { PantallaAuth } from "@/components/PantallaAuth";
import { Aviso } from "@/components/ui";

export const metadata = { title: "Iniciar sesión" };

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = rutaSegura(sp.next);
  if (await usuarioActual()) redirect(next);
  return (
    <PantallaAuth titulo="Bienvenido de vuelta" sub="Inicia sesión para solicitar y publicar servicios.">
      {sp.registrado && (
        <div className="mb-4">
          <Aviso>¡Cuenta creada! Ya puedes iniciar sesión.</Aviso>
        </div>
      )}
      {sp.next && (
        <div className="mb-4">
          <Aviso tipo="info">Inicia sesión para continuar.</Aviso>
        </div>
      )}
      <FormLogin next={next} />
    </PantallaAuth>
  );
}
