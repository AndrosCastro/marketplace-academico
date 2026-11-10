// Detalle de solicitud: estado, acciones según el rol, pago, contacto y chat (CU-03, CU-10, CU-11, CU-04)
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requerirUsuario, bitacora } from "@/lib/sesion";
import { accionesDisponibles, chatHabilitado, contactoVisible, etiquetaEstado, FLUJO_PRINCIPAL, type Estado } from "@/lib/estados";
import { fecha, fechaHora, lempiras, tamanoArchivo } from "@/lib/formato";
import { ACCEPT_ATTR } from "@/lib/archivos";
import { Avatar, BadgeEstado, Aviso, Vacio } from "@/components/ui";
import { AccionesSolicitud, FormPago, FormChat, FormResena, AutoRefresco } from "@/components/forms/SolicitudForms";

export const metadata = { title: "Detalle de solicitud" };

export default async function DetalleSolicitud({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const u = await requerirUsuario(`/solicitudes/${id}`);

  const s = await prisma.solicitud.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nombre: true, carrera: true, contacto: true } },
      servicio: {
        select: { id: true, titulo: true, unidadPrecio: true, proveedor: { select: { id: true, nombre: true, carrera: true, contacto: true } } },
      },
      resena: true,
      mensajes: {
        orderBy: { fechaEnvio: "asc" },
        take: 300,
        select: { id: true, contenido: true, fechaEnvio: true, remitenteId: true, archivoNombre: true, archivoTamano: true, archivoTipo: true },
      },
    },
  });

  // RN-12 / CP-18: un usuario ajeno no ve la solicitud (mismo mensaje si no existe, para no revelar nada)
  const rol = s ? (s.clienteId === u.id ? "CLIENTE" : s.servicio.proveedor.id === u.id ? "PROVEEDOR" : null) : null;
  if (!s || !rol) {
    if (s) await bitacora(u.id, "ACCESO_DENEGADO", `ver solicitud ${id}`);
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Vacio titulo="Acceso denegado">
          Esta solicitud no existe o no participas en ella.{" "}
          <Link href="/solicitudes" className="font-semibold text-bosque-700 underline">
            Ir a mis solicitudes
          </Link>
        </Vacio>
      </div>
    );
  }

  const estado = s.estado as Estado;
  const otra = rol === "CLIENTE" ? s.servicio.proveedor : s.cliente;
  const acciones = accionesDisponibles(estado, rol);
  const idxFlujo = FLUJO_PRINCIPAL.indexOf(estado);
  const fechasPaso: Partial<Record<Estado, Date | null>> = {
    PENDIENTE: s.fechaSolicitud,
    PAGO_CONFIRMADO: s.fechaPagoConfirmado,
    ENTREGADA: s.fechaEntrega,
    COMPLETADA: s.fechaFinalizacion,
  };

  const guia: Record<Estado, Record<"CLIENTE" | "PROVEEDOR", string>> = {
    PENDIENTE: { CLIENTE: "Esperando que el proveedor acepte tu solicitud.", PROVEEDOR: "Revisa la solicitud y acéptala o recházala." },
    ACEPTADA: {
      CLIENTE: "¡Aceptada! Realiza el pago por adelantado por el medio acordado en el chat.",
      PROVEEDOR: "Coordina el pago con el cliente por el chat y confírmalo cuando lo recibas.",
    },
    PAGO_CONFIRMADO: { CLIENTE: "Pago confirmado. El proveedor ya puede iniciar el trabajo.", PROVEEDOR: "Pago confirmado: realiza el trabajo y márcalo como entregado." },
    ENTREGADA: { CLIENTE: "El proveedor entregó el trabajo. Confirma la recepción si todo está conforme.", PROVEEDOR: "Esperando que el cliente confirme la recepción." },
    COMPLETADA: { CLIENTE: "Servicio completado. ¡Califica tu experiencia!", PROVEEDOR: "Servicio completado. ¡Buen trabajo!" },
    RECHAZADA: { CLIENTE: "El proveedor rechazó esta solicitud.", PROVEEDOR: "Rechazaste esta solicitud." },
    CANCELADA: { CLIENTE: "Cancelaste esta solicitud.", PROVEEDOR: "El cliente canceló esta solicitud." },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {chatHabilitado(estado) && estado !== "COMPLETADA" && <AutoRefresco />}
      <Link href="/solicitudes" className="text-sm font-medium text-tinta/55 hover:text-tinta">
        ← Mis solicitudes
      </Link>

      <div className="mt-4 mb-6 space-y-2">
        {sp.creada && <Aviso>¡Solicitud enviada! El proveedor la verá en sus solicitudes recibidas.</Aviso>}
        {sp.ya && <Aviso tipo="info">Ya tienes una solicitud abierta para este servicio.</Aviso>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* Cabecera */}
          <section className="tarjeta p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-widest text-tinta/50 uppercase">{rol === "CLIENTE" ? "Solicitud enviada" : "Solicitud recibida"}</p>
                <Link href={`/servicios/${s.servicio.id}`} className="mt-1 block font-display text-2xl font-semibold hover:text-bosque-700 sm:text-3xl">
                  {s.servicio.titulo}
                </Link>
                <p className="mt-1 text-sm text-tinta/60">
                  {lempiras(s.precioAcordado)} {s.servicio.unidadPrecio === "HORA" ? "/ hora" : "/ servicio"} · Solicitada el {fecha(s.fechaSolicitud)}
                  {s.modalidad && ` · ${s.modalidad === "PRESENCIAL" ? "Presencial" : "Videoconferencia"}`}
                </p>
              </div>
              <BadgeEstado estado={estado} />
            </div>

            {/* Línea de tiempo */}
            {idxFlujo >= 0 ? (
              <ol className="mt-8 grid grid-cols-5 gap-1">
                {FLUJO_PRINCIPAL.map((e, i) => {
                  const hecho = i <= idxFlujo;
                  return (
                    <li key={e} className="flex flex-col items-center text-center">
                      <div className="flex w-full items-center">
                        <span className={`h-1 flex-1 ${i === 0 ? "invisible" : hecho ? "bg-bosque-500" : "bg-tinta/10"}`} />
                        <span
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                            i === idxFlujo ? "bg-mango-400 text-tinta ring-4 ring-mango-300/40" : hecho ? "bg-bosque-600 text-white" : "bg-tinta/10 text-tinta/50"
                          }`}
                        >
                          {hecho && i !== idxFlujo ? "✓" : i + 1}
                        </span>
                        <span className={`h-1 flex-1 ${i === FLUJO_PRINCIPAL.length - 1 ? "invisible" : i < idxFlujo ? "bg-bosque-500" : "bg-tinta/10"}`} />
                      </div>
                      <span className={`mt-2 text-[11px] leading-tight font-semibold sm:text-xs ${hecho ? "text-tinta" : "text-tinta/45"}`}>{etiquetaEstado(e)}</span>
                      {fechasPaso[e] && <span className="text-[10px] text-tinta/45">{fecha(fechasPaso[e]!)}</span>}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="mt-6 rounded-xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-700">Estado final: {etiquetaEstado(estado)}</p>
            )}

            <div className="mt-6 rounded-xl bg-bosque-50 px-4 py-3 text-sm font-medium text-bosque-900">👉 {guia[estado][rol]}</div>

            {s.mensajeInicial && (
              <div className="mt-5">
                <p className="text-xs font-bold tracking-widest text-tinta/50 uppercase">Lo que necesita el cliente</p>
                <p className="mt-1 whitespace-pre-line text-sm text-tinta/80">{s.mensajeInicial}</p>
              </div>
            )}

            <div className="mt-6 space-y-4">
              {acciones.includes("CONFIRMAR_PAGO") && <FormPago solicitudId={s.id} />}
              <AccionesSolicitud solicitudId={s.id} acciones={acciones} />
            </div>
          </section>

          {/* Chat */}
          <section className="tarjeta flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-tinta/10 px-6 py-4">
              <h2 className="font-display text-xl font-semibold">Chat de la solicitud</h2>
              <span className="text-xs text-tinta/50">🔒 Solo ustedes dos pueden verlo</span>
            </div>
            <div className="fondo-grano max-h-[480px] min-h-48 space-y-3 overflow-y-auto bg-papel/70 px-4 py-5 sm:px-6">
              {s.mensajes.length === 0 && <p className="py-10 text-center text-sm text-tinta/50">Aún no hay mensajes. ¡Saluda y coordina los detalles!</p>}
              {s.mensajes.map((m) => {
                const mio = m.remitenteId === u.id;
                return (
                  <div key={m.id} className={`flex ${mio ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-xs ${mio ? "rounded-br-sm bg-bosque-700 text-white" : "rounded-bl-sm bg-white ring-1 ring-tinta/10"}`}>
                      {!mio && <p className="mb-0.5 text-xs font-bold text-bosque-700">{otra.nombre}</p>}
                      {m.contenido && <p className="whitespace-pre-line break-words">{m.contenido}</p>}
                      {m.archivoNombre && (
                        <a
                          href={`/api/archivos/${m.id}`}
                          className={`mt-1.5 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${mio ? "bg-white/15 hover:bg-white/25" : "bg-bosque-50 hover:bg-bosque-100"}`}
                        >
                          📄 <span className="truncate">{m.archivoNombre}</span>
                          <span className="opacity-70">{tamanoArchivo(m.archivoTamano ?? 0)}</span>
                        </a>
                      )}
                      <p className={`mt-1 text-right text-[10px] ${mio ? "text-white/60" : "text-tinta/45"}`}>{fechaHora(m.fechaEnvio)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-tinta/10 bg-white p-4">
              {chatHabilitado(estado) ? (
                <FormChat solicitudId={s.id} accept={ACCEPT_ATTR} />
              ) : (
                <p className="text-center text-sm text-tinta/55">El chat está en solo lectura porque la solicitud terminó.</p>
              )}
            </div>
          </section>
        </div>

        {/* Lateral */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="tarjeta p-6">
            <p className="mb-3 text-xs font-bold tracking-widest text-tinta/50 uppercase">{rol === "CLIENTE" ? "Proveedor" : "Cliente"}</p>
            <Link href={`/usuarios/${otra.id}`} className="flex items-center gap-3 hover:text-bosque-700">
              <Avatar id={otra.id} nombre={otra.nombre} tam={48} />
              <div>
                <p className="font-bold">{otra.nombre}</p>
                {otra.carrera && <p className="text-xs text-tinta/60">{otra.carrera}</p>}
              </div>
            </Link>
            <div className="mt-4 rounded-xl border border-tinta/10 p-3 text-sm">
              {contactoVisible(estado) ? (
                otra.contacto ? (
                  <>
                    <p className="text-xs font-semibold text-tinta/55">WhatsApp / teléfono</p>
                    <p className="font-bold">{otra.contacto}</p>
                    <a
                      href={`https://wa.me/${otra.contacto.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs font-semibold text-bosque-700 hover:underline"
                    >
                      Abrir WhatsApp ↗
                    </a>
                  </>
                ) : (
                  <p className="text-tinta/55">Esta persona no registró un contacto externo. Usen el chat.</p>
                )
              ) : (
                <p className="text-tinta/55">🔒 El contacto externo se muestra cuando el pago está confirmado (RNF-03).</p>
              )}
            </div>
          </div>

          {s.fechaPagoConfirmado && (
            <div className="tarjeta p-6 text-sm">
              <p className="mb-2 text-xs font-bold tracking-widest text-tinta/50 uppercase">Pago</p>
              <p>
                <strong>Confirmado</strong> el {fechaHora(s.fechaPagoConfirmado)}
              </p>
              <p className="text-tinta/65">Medio: {s.metodoPago === "EFECTIVO" ? "Efectivo" : "Transferencia"}</p>
              {s.notaPago && <p className="text-tinta/65">Nota: {s.notaPago}</p>}
            </div>
          )}

          {estado === "COMPLETADA" && (
            <div className="tarjeta p-6">
              <p className="mb-3 font-display text-xl font-semibold">Calificación</p>
              {s.resena ? (
                <div>
                  <p className="text-2xl text-mango-500">
                    {"★".repeat(s.resena.calificacion)}
                    <span className="text-tinta/15">{"★".repeat(5 - s.resena.calificacion)}</span>
                  </p>
                  {s.resena.comentario && <p className="mt-2 text-sm text-tinta/80">“{s.resena.comentario}”</p>}
                  <p className="mt-2 text-xs text-tinta/50">Publicada el {fecha(s.resena.fechaResena)}</p>
                </div>
              ) : rol === "CLIENTE" ? (
                <FormResena solicitudId={s.id} />
              ) : (
                <p className="text-sm text-tinta/60">El cliente aún no ha calificado.</p>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
