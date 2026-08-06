// Sube/descarga archivos de evidencia directo contra S3, usando URLs
// firmadas que emite presign-service/ (ver ese README para el porqué de un
// servicio aparte). El archivo nunca pasa por nuestros propios servidores.

import { ApiError, getAuthToken } from "./client";

const PRESIGN_URL = import.meta.env.VITE_PRESIGN_URL;

async function presignPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${PRESIGN_URL}${path}`, {
    method: "POST",
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

/** Sube un archivo a S3 y devuelve la key que hay que guardar en `evidencias.archivo_evidencia`. */
export async function subirArchivoEvidencia(file: File): Promise<string> {
  const { uploadUrl, key } = await presignPost<{ uploadUrl: string; key: string }>("/presign-upload", {
    filename: file.name,
    contentType: file.type || "application/octet-stream",
  });

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!putRes.ok) throw new Error("No se pudo subir el archivo a S3");

  return key;
}

/** Pide una URL de descarga temporal para una key ya guardada y la abre en una pestaña nueva. */
export async function verArchivoEvidencia(key: string): Promise<void> {
  const { url } = await presignPost<{ url: string }>("/presign-download", { key });
  window.open(url, "_blank", "noopener,noreferrer");
}
