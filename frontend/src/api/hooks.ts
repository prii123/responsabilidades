import { useCallback, useEffect, useState } from "react";
import { apiGet, ApiError } from "./client";

/** Trae una vista/tabla de la API y expone recargar() para refrescar tras un cambio. */
export function useApiGet<T>(path: string, query: Record<string, string> = {}, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setError(null);
    apiGet<T>(path, query)
      .then((res) => {
        if (!cancelado) setData(res);
      })
      .catch((e) => {
        if (!cancelado) setError(e instanceof ApiError ? e.message : "Error al cargar datos");
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, version, ...deps]);

  return { data, loading, error, recargar };
}
