"use client";
// Selector de tema: Sistema → Claro → Oscuro. La preferencia se guarda en una cookie
// para que el servidor pinte la página con el tema correcto desde el primer momento.
import { useEffect, useState } from "react";

type Tema = "sistema" | "claro" | "oscuro";
const SIGUIENTE: Record<Tema, Tema> = { sistema: "claro", claro: "oscuro", oscuro: "sistema" };
const ETIQUETA: Record<Tema, string> = { sistema: "Tema: según el sistema", claro: "Tema: claro", oscuro: "Tema: oscuro" };

export function SelectorTema({ inicial }: { inicial: Tema }) {
  const [tema, setTema] = useState<Tema>(inicial);

  useEffect(() => {
    const raiz = document.documentElement;
    if (tema === "sistema") raiz.removeAttribute("data-theme");
    else raiz.setAttribute("data-theme", tema === "oscuro" ? "dark" : "light");
    document.cookie = `tema=${tema}; path=/; max-age=31536000; samesite=lax`;
  }, [tema]);

  return (
    <button
      type="button"
      onClick={() => setTema(SIGUIENTE[tema])}
      className="grid h-9 w-9 place-items-center rounded-full text-tinta/70 hover:bg-bosque-50 hover:text-tinta"
      aria-label={`${ETIQUETA[tema]}. Pulsa para cambiar.`}
      title={ETIQUETA[tema]}
    >
      {tema === "oscuro" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      ) : tema === "claro" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8M12 16v4" />
        </svg>
      )}
    </button>
  );
}
