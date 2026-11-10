import { redirect } from "next/navigation";
import { usuarioActual } from "@/lib/sesion";
import { FormRegistro } from "@/components/forms/AuthForms";
import { PantallaAuth } from "@/components/PantallaAuth";

export const metadata = { title: "Crear cuenta" };

export default async function Registro() {
  if (await usuarioActual()) redirect("/servicios");
  const dominios = (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
  return (
    <PantallaAuth titulo="Crea tu cuenta" sub="Una sola cuenta para ofrecer y contratar servicios (RN-01).">
      <FormRegistro dominios={dominios} />
    </PantallaAuth>
  );
}
