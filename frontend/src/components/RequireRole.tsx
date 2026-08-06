import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import type { Rol } from "../api/types";

/** Oculta una ruta/sección para roles que no la necesitan (ej. módulos de admin). */
export default function RequireRole({ role, children }: { role: Rol; children: ReactNode }) {
  const { sesion } = useAuth();
  if (sesion?.rol !== role) {
    return (
      <div className="empty-state">
        <p>No tienes permisos para ver esta sección.</p>
      </div>
    );
  }
  return <>{children}</>;
}
