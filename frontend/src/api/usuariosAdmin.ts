// Administración de usuarios: crear/activar/desactivar pasa por
// presign-service (no por PostgREST) porque requiere la API de
// administración de Cognito. Ver presign-service/src/index.js.

import { ApiError, getAuthToken } from "./client";
import type { Rol, Usuario } from "./types";

const PRESIGN_URL = import.meta.env.VITE_PRESIGN_URL;

async function presignRequest<T>(method: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${PRESIGN_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAuthToken() ?? ""}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, data ?? {});
  return data as T;
}

export function crearUsuario(input: { email: string; password: string; rol: Rol; id_profesional: number | null }) {
  return presignRequest<Usuario>("POST", "/usuarios", input);
}

export function cambiarActivoUsuario(sub: string, email: string, activo: boolean) {
  return presignRequest<{ ok: true }>("PATCH", `/usuarios/${encodeURIComponent(sub)}`, { email, activo });
}
