"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cambiarEstadoSolicitud, confirmarPago, enviarMensaje, calificar } from "@/actions/solicitudes";
import { BotonEnviar, Campo } from "@/components/Campo";
import { Aviso } from "@/components/ui";
import { etiquetaAccion, type Accion } from "@/lib/estados";

const CONFIRMAR: Partial<Record<Accion, string>> = {
  RECHAZAR: "¿Rechazar esta solicitud? Esta acción es final.",
  CANCELAR: "¿Cancelar esta solicitud? Esta acción es final.",
  CONFIRMAR_RECEPCION: "¿Confirmas que recibiste el trabajo conforme? La solicitud pasará a Completada.",
  ENTREGAR: "¿Marcar el trabajo como entregado?",
};

export function AccionesSolicitud({ solicitudId, acciones }: { solicitudId: string; acciones: Accion[] }) {
  const [st, accion] = useActionState(cambiarEstadoSolicitud, undefined);
  const visibles = acciones.filter((a) => a !== "CONFIRMAR_PAGO");
  if (visibles.length === 0) return st?.error ? <Aviso tipo="error">{st.error}</Aviso> : null;
  return (
    <div className="space-y-3">
      {st?.error && <Aviso tipo="error">{st.error}</Aviso>}
      <div className="flex flex-wrap gap-2">
        {visibles.map((a) => (
          <form
            key={a}
            action={accion}
            onSubmit={(e) => {
              const m = CONFIRMAR[a];
              if (m && !window.confirm(m)) e.preventDefault();
            }}
          >
            <input type="hidden" name="solicitudId" value={solicitudId} />
            <input type="hidden" name="accion" value={a} />
            <BotonEnviar clase={a === "RECHAZAR" || a === "CANCELAR" ? "btn-peligro" : "btn-primario"}>{etiquetaAccion(a)}</BotonEnviar>
          </form>
        ))}
      </div>
    </div>
  );
}

export function FormPago({ solicitudId }: { solicitudId: string }) {
  const [st, accion] = useActionState(confirmarPago, undefined);
  return (
    <form
      action={accion}
      className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/60 p-4"
      onSubmit={(e) => {
        if (!window.confirm("¿Confirmas que ya recibiste el pago? Se registra una sola vez.")) e.preventDefault();
      }}
    >
      <p className="text-sm font-bold text-violet-900">💰 Confirmar pago adelantado (RF-15)</p>
      <p className="text-xs text-violet-900/70">Hazlo solo cuando el cliente ya te haya pagado. Sin esta confirmación no puedes entregar el trabajo.</p>
      {st?.error && <Aviso tipo="error">{st.error}</Aviso>}
      <input type="hidden" name="solicitudId" value={solicitudId} />
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <div>
          <label htmlFor="metodoPago" className="etiqueta">
            Medio
          </label>
          <select id="metodoPago" name="metodoPago" className="campo" defaultValue="TRANSFERENCIA">
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="EFECTIVO">Efectivo</option>
          </select>
        </div>
        <Campo nombre="nota" etiqueta="Nota (opcional)" maxLength={200} placeholder="Ej. Transferencia BAC #1234" error={st?.campos?.nota} />
      </div>
      <BotonEnviar clase="btn-primario bg-violet-700 hover:bg-violet-800">Confirmar pago recibido</BotonEnviar>
    </form>
  );
}

export function FormChat({ solicitudId, accept }: { solicitudId: string; accept: string }) {
  const [st, accion] = useActionState(enviarMensaje, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const [archivo, setArchivo] = useState<string | null>(null);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  useEffect(() => {
    if (st?.ok) {
      ref.current?.reset();
      setArchivo(null);
    }
  }, [st]);
  return (
    <form
      ref={ref}
      action={accion}
      className="space-y-2"
      onSubmit={(e) => {
        // Validación previa en el navegador; el servidor vuelve a validar todo.
        const f = (e.currentTarget.elements.namedItem("archivo") as HTMLInputElement | null)?.files?.[0];
        if (f && f.size > 4 * 1024 * 1024) {
          e.preventDefault();
          setErrorLocal("El archivo supera el límite de 4 MB.");
        } else setErrorLocal(null);
      }}
    >
      {(errorLocal || st?.error) && <Aviso tipo="error">{errorLocal ?? st?.error}</Aviso>}
      <input type="hidden" name="solicitudId" value={solicitudId} />
      <div className="flex items-end gap-2">
        <label className="btn-secundario cursor-pointer px-3" title="Adjuntar archivo (máx. 4 MB)">
          📎<span className="sr-only">Adjuntar archivo</span>
          <input type="file" name="archivo" accept={accept} className="sr-only" onChange={(e) => setArchivo(e.target.files?.[0]?.name ?? null)} />
        </label>
        <label htmlFor="chat-mensaje" className="sr-only">
          Mensaje
        </label>
        <textarea
          id="chat-mensaje"
          name="contenido"
          rows={1}
          maxLength={2000}
          placeholder="Escribe un mensaje…"
          className="campo min-h-11 flex-1 resize-y"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ref.current?.requestSubmit();
            }
          }}
        />
        <BotonEnviar pendiente="…">Enviar</BotonEnviar>
      </div>
      {archivo && <p className="text-xs text-tinta/60">📄 {archivo}</p>}
      <p className="text-[11px] text-tinta/45">PDF, imágenes o Office · máx. 4 MB · Enter para enviar, Shift+Enter para salto de línea</p>
    </form>
  );
}

/** Refresca la conversación cada 8 s mientras la pestaña está visible. */
export function AutoRefresco({ ms = 8000 }: { ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, ms);
    return () => clearInterval(t);
  }, [router, ms]);
  return null;
}

export function FormResena({ solicitudId }: { solicitudId: string }) {
  const [st, accion] = useActionState(calificar, undefined);
  const [nota, setNota] = useState(0);
  const [hover, setHover] = useState(0);
  if (st?.ok) return <Aviso>{st.ok}</Aviso>;
  return (
    <form action={accion} className="space-y-4">
      {st?.error && <Aviso tipo="error">{st.error}</Aviso>}
      <input type="hidden" name="solicitudId" value={solicitudId} />
      <input type="hidden" name="calificacion" value={nota || ""} />
      <fieldset>
        <legend className="etiqueta">Tu calificación</legend>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} estrellas`}
              aria-pressed={nota === n}
              onClick={() => setNota(n)}
              onMouseEnter={() => setHover(n)}
              className={`text-4xl leading-none transition hover:scale-110 ${(hover || nota) >= n ? "text-mango-400" : "text-tinta/15"}`}
            >
              ★
            </button>
          ))}
        </div>
        {st?.campos?.calificacion && <p className="mt-1 text-xs font-semibold text-red-600">{st.campos.calificacion}</p>}
      </fieldset>
      <Campo nombre="comentario" etiqueta="Reseña (opcional)" area filas={3} maxLength={500} placeholder="¿Cómo fue tu experiencia?" error={st?.campos?.comentario} />
      <button type="submit" disabled={!nota} className="btn-acento">
        Publicar calificación
      </button>
    </form>
  );
}
