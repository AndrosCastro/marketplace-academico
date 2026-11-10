import Link from "next/link";
import { Vacio } from "@/components/ui";

export default function NoEncontrado() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <Vacio titulo="Página no encontrada">
        <Link href="/" className="font-semibold text-bosque-700 underline">
          Volver al inicio
        </Link>
      </Vacio>
    </div>
  );
}
