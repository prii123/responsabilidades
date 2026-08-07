import type { ReactNode } from "react";

/**
 * Modal genérico: overlay + caja centrada. El formulario/contenido va como
 * children; el título es opcional para reusar en confirmaciones simples.
 * `wide` da más espacio a formularios de dos columnas (grid-form).
 */
export default function Modal({
  title,
  onClose,
  wide,
  children,
}: {
  title?: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={wide ? "modal max-w-[560px]" : "modal"} onClick={(e) => e.stopPropagation()}>
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </div>
  );
}
