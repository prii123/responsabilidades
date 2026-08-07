// Cliente delgado sobre PostgREST. No hay un backend de aplicación aparte:
// esto habla directo con las vistas/RPC del esquema "api" (ver backend/).

const API_URL = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  code?: string;
  details?: string | null;
  hint?: string | null;
  status: number;

  constructor(status: number, body: { message?: string; code?: string; details?: string | null; hint?: string | null }) {
    super(body.message || `Error HTTP ${status}`);
    this.status = status;
    this.code = body.code;
    this.details = body.details;
    this.hint = body.hint;
  }
}

let currentToken: string | null = null;

export function setAuthToken(token: string | null) {
  currentToken = token;
}

export function getAuthToken(): string | null {
  return currentToken;
}

// AuthContext se suscribe aquí para cerrar sesión sola cuando el JWT expira
// (PostgREST responde 401 "JWT expired") — sin esto, cada página tendría que
// acordarse de mostrar el error y las tablas se ven vacías sin explicación.
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

function headers(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };
  if (currentToken) h.Authorization = `Bearer ${currentToken}`;
  return h;
}

async function handle<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    if (res.status === 401) onUnauthorized?.();
    throw new ApiError(res.status, data ?? {});
  }
  return data as T;
}

/** GET a una vista/tabla de la API. `query` son parámetros crudos de PostgREST, ej: { select: "*", order: "nombre" }. */
export async function apiGet<T>(path: string, query: Record<string, string> = {}): Promise<T> {
  const params = new URLSearchParams(query);
  const qs = params.toString();
  const res = await fetch(`${API_URL}/${path}${qs ? `?${qs}` : ""}`, {
    headers: headers(),
  });
  return handle<T>(res);
}

/**
 * GET paginado: usa limit/offset + "Prefer: count=exact" de PostgREST, que
 * devuelve el total en el header Content-Range (ej. "0-19/145"). Páginas de
 * 1 (no 0).
 */
export async function apiGetPaginated<T>(
  path: string,
  query: Record<string, string>,
  page: number,
  pageSize: number
): Promise<{ data: T[]; total: number }> {
  const offset = (page - 1) * pageSize;
  const params = new URLSearchParams({ ...query, limit: String(pageSize), offset: String(offset) });
  const res = await fetch(`${API_URL}/${path}?${params.toString()}`, {
    headers: headers({ Prefer: "count=exact" }),
  });
  const data = await handle<T[]>(res);
  const contentRange = res.headers.get("Content-Range");
  const total = contentRange ? Number(contentRange.split("/")[1]) : data.length;
  return { data, total: Number.isFinite(total) ? total : data.length };
}

export async function apiPost<T>(path: string, body: unknown, opts: { returnRepresentation?: boolean } = {}): Promise<T> {
  const res = await fetch(`${API_URL}/${path}`, {
    method: "POST",
    headers: headers(opts.returnRepresentation === false ? {} : { Prefer: "return=representation" }),
    body: JSON.stringify(body),
  });
  return handle<T>(res);
}

export async function apiPatch<T>(path: string, query: Record<string, string>, body: unknown): Promise<T> {
  const params = new URLSearchParams(query);
  const res = await fetch(`${API_URL}/${path}?${params.toString()}`, {
    method: "PATCH",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify(body),
  });
  return handle<T>(res);
}

export async function apiDelete(path: string, query: Record<string, string>): Promise<void> {
  const params = new URLSearchParams(query);
  const res = await fetch(`${API_URL}/${path}?${params.toString()}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401) onUnauthorized?.();
    throw new ApiError(res.status, text ? JSON.parse(text) : {});
  }
}

/** Llama a una función expuesta como POST /rpc/<nombre>. */
export async function apiRpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${API_URL}/rpc/${name}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(args),
  });
  return handle<T>(res);
}
