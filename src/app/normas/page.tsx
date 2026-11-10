import { Titulo } from "@/components/ui";

export const metadata = { title: "Normas y privacidad" };

const NORMAS = [
  ["Integridad académica (RN-11)", "No se permiten servicios para realizar tareas, proyectos o exámenes que otra persona entregará como propios. Se permite enseñar, acompañar, revisar y asesorar."],
  ["Una cuenta, dos roles (RN-01)", "Con la misma cuenta puedes ofrecer y contratar servicios. No puedes solicitar ni calificar tus propios servicios (RN-08)."],
  ["Pago por adelantado (RN-04, RN-05)", "El cliente paga fuera de la plataforma (efectivo o transferencia) y el proveedor confirma el pago. Sin pago confirmado, el trabajo no inicia."],
  ["Reseñas honestas (RN-06, RN-09)", "Solo el cliente califica, una sola vez y únicamente cuando confirmó la recepción del trabajo."],
  ["Respeto en el chat (RN-12)", "El chat es privado entre cliente y proveedor. No compartas contraseñas ni datos bancarios completos."],
];

const PRIVACIDAD = [
  "Tu correo y tu contraseña nunca se muestran a otros usuarios. La contraseña se guarda cifrada con bcrypt; nadie puede leerla, ni siquiera la administración.",
  "Tu WhatsApp o teléfono solo lo ve la otra parte de una solicitud cuando el pago está confirmado.",
  "Los archivos del chat solo los pueden descargar las dos personas de la solicitud.",
  "La sesión se cierra sola tras 30 minutos sin actividad. Cerrar sesión la elimina del servidor.",
  "Se registran eventos de seguridad (inicios de sesión, accesos denegados) para proteger la plataforma.",
];

export default function Normas() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Titulo sup="Comunidad">Normas y privacidad</Titulo>
      <div className="space-y-4">
        {NORMAS.map(([t, d]) => (
          <div key={t} className="tarjeta p-5">
            <p className="font-bold">{t}</p>
            <p className="mt-1 text-sm text-tinta/70">{d}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-12 mb-4 font-display text-2xl font-semibold">Cómo protegemos tus datos</h2>
      <ul className="tarjeta list-disc space-y-2 p-6 pl-10 text-sm text-tinta/75">
        {PRIVACIDAD.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}
