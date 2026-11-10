"use client";
import { useFormStatus } from "react-dom";

type Props = {
  nombre: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
  tipo?: string;
  valor?: string;
  area?: boolean;
  filas?: number;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "name">;

export function Campo({ nombre, etiqueta, error, ayuda, tipo = "text", valor, area, filas = 4, ...rest }: Props) {
  const id = `campo-${nombre}`;
  const desc = error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined;
  const cls = `campo ${error ? "campo-error" : ""}`;
  return (
    <div>
      <label htmlFor={id} className="etiqueta">
        {etiqueta}
        {rest.required && <span className="text-red-500"> *</span>}
      </label>
      {area ? (
        <textarea
          id={id}
          name={nombre}
          defaultValue={valor}
          rows={filas}
          className={cls}
          aria-invalid={!!error}
          aria-describedby={desc}
          required={rest.required}
          maxLength={rest.maxLength}
          minLength={rest.minLength}
          placeholder={rest.placeholder}
        />
      ) : (
        <input id={id} name={nombre} type={tipo} defaultValue={valor} className={cls} aria-invalid={!!error} aria-describedby={desc} {...rest} />
      )}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-semibold text-red-600">
          {error}
        </p>
      ) : ayuda ? (
        <p id={`${id}-ayuda`} className="mt-1.5 text-xs text-tinta/55">
          {ayuda}
        </p>
      ) : null}
    </div>
  );
}

export function BotonEnviar({ children, clase = "btn-primario", pendiente = "Procesando…" }: { children: React.ReactNode; clase?: string; pendiente?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={clase} disabled={pending} aria-busy={pending}>
      {pending ? pendiente : children}
    </button>
  );
}
