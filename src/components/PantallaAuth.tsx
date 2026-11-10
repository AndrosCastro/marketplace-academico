export function PantallaAuth({ titulo, sub, children }: { titulo: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2">
      <div className="hidden lg:block">
        <div className="tarjeta fondo-grano relative overflow-hidden bg-bosque-800 p-10 text-white">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-mango-400/30 blur-3xl" aria-hidden />
          <p className="font-display text-4xl leading-tight font-semibold">“Lo que sabes hacer también puede ayudar a alguien más.”</p>
          <ul className="mt-8 space-y-3 text-sm text-white/80">
            <li>🔒 Contraseñas cifradas y sesiones seguras</li>
            <li>⭐ Reputación basada en servicios completados</li>
            <li>💬 Chat privado por solicitud, con archivos</li>
            <li>🎓 Normas de integridad académica</li>
          </ul>
        </div>
      </div>
      <div className="tarjeta mx-auto w-full max-w-md p-7 sm:p-9">
        <h1 className="font-display text-3xl font-semibold">{titulo}</h1>
        <p className="mt-1 mb-6 text-sm text-tinta/60">{sub}</p>
        {children}
      </div>
    </div>
  );
}
