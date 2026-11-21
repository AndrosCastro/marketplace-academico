// Marca studia: símbolo de la guacamaya roja (ave nacional de Honduras) y logotipo.
// Mismos trazos que los archivos de "Marca Studia/SVG (para Figma)".

export function SimboloStudia({ tam = 40, className = "" }: { tam?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={tam} height={tam} className={className} aria-hidden="true" focusable="false">
      <path d="M8.5 45.5 C13.5 55.5 25 60 37.5 58.5 L37 53 C25.5 53.5 15.5 51 8.5 45.5 Z" fill="#2C5BC4" />
      <path d="M10 38 C13.5 47 23.5 51.5 35.5 50.5 L35 45 C24 45.5 15.5 43 10 38 Z" fill="#F3B23B" />
      <circle cx="27" cy="29" r="17.5" fill="#DB2B39" />
      <circle cx="34.2" cy="25.6" r="8.6" fill="#FFFFFF" />
      <circle cx="33.4" cy="25" r="3.7" fill="#1B2236" />
      <circle cx="34.7" cy="23.7" r="1.15" fill="#FFFFFF" />
      <path
        d="M40.5 12.5 C52 12 60.5 21 59.5 33.5 C59 39.5 57 44.5 53.5 46.5 C53.5 40.5 50 35.5 43.5 33.8 C42.2 27 41.6 19.5 40.5 12.5 Z"
        fill="#F8F2E7"
        stroke="#1B2236"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      <path d="M41.5 33 C48.5 33.5 53.8 39 53.5 46.5 C48 46.5 43 43 40 38.5 Z" fill="#1B2236" stroke="#1B2236" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

export function LogoStudia({ compacto = false }: { compacto?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <SimboloStudia tam={compacto ? 32 : 38} />
      <span className="leading-none">
        <span className="block font-display text-[24px] font-extrabold tracking-[-0.02em] text-tinta">studia</span>
        {!compacto && (
          <span className="mt-0.5 hidden text-[9.5px] font-semibold tracking-[0.16em] text-tinta/60 uppercase sm:block">Marketplace Académico</span>
        )}
      </span>
    </span>
  );
}
