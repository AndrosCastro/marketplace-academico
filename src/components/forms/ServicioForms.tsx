"use client";
import { useActionState } from "react";
import Link from "next/link";
import { crearServicio, editarServicio, reportarServicio } from "@/actions/servicios";
import { crearSolicitud } from "@/actions/solicitudes";
import { Campo, BotonEnviar } from "@/components/Campo";
import { Aviso } from "@/components/ui";

type Cat = { id: number; nombre: string; icono: string };
type Inicial = Partial<Record<"id" | "titulo" | "descripcion" | "categoriaId" | "precio" | "unidadPrecio" | "modalidad" | "horario", string>>;

export function FormServicio({ categorias, inicial }: { categorias: Cat[]; inicial?: Inicial }) {
  const editar = !!inicial?.id;
  const [st, accion] = useActionState(editar ? editarServicio : crearServicio, undefined);
  const v = { ...inicial, ...st?.valores };
  const e = st?.campos ?? {};
  return (
    <form action={accion} className="space-y-5" noValidate>
      {st?.error && <Aviso tipo="error">{st.error}</Aviso>}
      {editar && <input type="hidden" name="id" value={inicial!.id} />}
      <Campo
        nombre="titulo"
        etiqueta="Título del servicio"
        required
        maxLength={100}
        valor={v.titulo}
        error={e.titulo}
        placeholder="Ej. Tutoría de Cálculo I para parciales"
        ayuda="Claro y específico, hasta 100 caracteres."
      />
      <Campo
        nombre="descripcion"
        etiqueta="Descripción"
        area
        filas={6}
        required
        maxLength={3000}
        valor={v.descripcion}
        error={e.descripcion}
        placeholder="¿Qué incluye? ¿Qué experiencia tienes? ¿Cómo trabajas?"
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="categoriaId" className="etiqueta">
            Categoría <span className="text-red-500">*</span>
          </label>
          <select id="categoriaId" name="categoriaId" defaultValue={v.categoriaId ?? ""} className={`campo ${e.categoriaId ? "campo-error" : ""}`} required>
            <option value="" disabled>
              Elige una categoría
            </option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icono} {c.nombre}
              </option>
            ))}
          </select>
          {e.categoriaId && <p className="mt-1.5 text-xs font-semibold text-red-600">{e.categoriaId}</p>}
        </div>
        <div>
          <label htmlFor="modalidad" className="etiqueta">
            Modalidad
          </label>
          <select id="modalidad" name="modalidad" defaultValue={v.modalidad ?? ""} className="campo">
            <option value="">Ambas / a convenir</option>
            <option value="PRESENCIAL">Presencial</option>
            <option value="VIDEOCONFERENCIA">Videoconferencia</option>
          </select>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo nombre="precio" etiqueta="Precio (Lempiras)" tipo="number" min={0} step="0.01" required valor={v.precio} error={e.precio} placeholder="150" />
        <div>
          <label htmlFor="unidadPrecio" className="etiqueta">
            Cobro por
          </label>
          <select id="unidadPrecio" name="unidadPrecio" defaultValue={v.unidadPrecio ?? "HORA"} className="campo">
            <option value="HORA">Hora</option>
            <option value="SERVICIO">Servicio completo</option>
          </select>
        </div>
      </div>
      <Campo nombre="horario" etiqueta="Horario disponible" maxLength={150} valor={v.horario} error={e.horario} placeholder="Ej. Lunes a viernes, 6:00–9:00 p. m." />
      <div className="rounded-xl border border-mango-300 bg-mango-300/20 p-4 text-sm text-tinta/80">
        <strong>Integridad académica (RN-11):</strong> no se permiten servicios para hacer tareas, proyectos o exámenes que otra persona entregará como
        propios. Ofrece acompañamiento, explicación y revisión.
      </div>
      <div className="flex flex-wrap gap-3">
        <BotonEnviar pendiente="Guardando…">{editar ? "Guardar cambios" : "Publicar servicio"}</BotonEnviar>
        <Link href={editar ? `/servicios/${inicial!.id}` : "/servicios"} className="btn-secundario">
          Cancelar
        </Link>
      </div>
    </form>
  );
}

export function FormSolicitud({ servicioId, modalidad }: { servicioId: string; modalidad: string | null }) {
  const [st, accion] = useActionState(crearSolicitud, undefined);
  return (
    <form action={accion} className="space-y-3">
      {st?.error && <Aviso tipo="error">{st.error}</Aviso>}
      <input type="hidden" name="servicioId" value={servicioId} />
      <Campo
        nombre="mensaje"
        etiqueta="¿Qué necesitas? (opcional)"
        area
        filas={3}
        maxLength={1000}
        error={st?.campos?.mensaje}
        placeholder="Ej. Tengo parcial de derivadas el jueves y necesito repasar regla de la cadena."
      />
      {!modalidad && (
        <div>
          <label htmlFor="modalidad-sol" className="etiqueta">
            Modalidad preferida
          </label>
          <select id="modalidad-sol" name="modalidad" className="campo" defaultValue="">
            <option value="">A convenir</option>
            <option value="PRESENCIAL">Presencial</option>
            <option value="VIDEOCONFERENCIA">Videoconferencia</option>
          </select>
        </div>
      )}
      <BotonEnviar clase="btn-primario w-full" pendiente="Enviando…">
        Solicitar servicio
      </BotonEnviar>
      <p className="text-center text-xs text-tinta/55">El pago se hace por adelantado, fuera de la plataforma, después de que el proveedor acepte.</p>
    </form>
  );
}

export function FormReporte({ servicioId }: { servicioId: string }) {
  const [st, accion] = useActionState(reportarServicio, undefined);
  if (st?.ok) return <Aviso>{st.ok}</Aviso>;
  return (
    <details className="group">
      <summary className="cursor-pointer text-xs font-semibold text-tinta/50 hover:text-red-700">⚑ Reportar esta publicación</summary>
      <form action={accion} className="mt-3 space-y-3">
        {st?.error && <Aviso tipo="error">{st.error}</Aviso>}
        <input type="hidden" name="servicioId" value={servicioId} />
        <Campo nombre="motivo" etiqueta="Motivo" area filas={3} maxLength={500} required error={st?.campos?.motivo} placeholder="Ej. Ofrece hacer exámenes por otra persona." />
        <BotonEnviar clase="btn-peligro" pendiente="Enviando…">
          Enviar reporte
        </BotonEnviar>
      </form>
    </details>
  );
}
