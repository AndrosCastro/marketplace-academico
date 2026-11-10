"use client";
// Pide confirmación antes de acciones que no se pueden deshacer fácilmente (lineamientos de interfaz SRS 3.4).
export function ConfirmarBoton({ mensaje, children, clase }: { mensaje: string; children: React.ReactNode; clase: string }) {
  return (
    <button
      type="submit"
      className={clase}
      onClick={(e) => {
        if (!window.confirm(mensaje)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
