"use client";
// No se muestran detalles técnicos al usuario (evita filtrar información interna).
export default function ErrorGlobal({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
      <p className="font-display text-3xl font-semibold">Algo salió mal</p>
      <p className="mt-2 text-tinta/60">Ocurrió un error inesperado. Intenta de nuevo.</p>
      <button onClick={reset} className="btn-primario mt-6">
        Reintentar
      </button>
    </div>
  );
}
