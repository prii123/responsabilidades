import { useCallback, useEffect, useState } from "react";
import { apiGet, apiGetPaginated, ApiError } from "./client";

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

/**
 * Como useApiGet pero paginado en el servidor (limit/offset de PostgREST).
 * Vuelve a la página 1 automáticamente cuando cambian los filtros (deps).
 */
export function usePaginatedApiGet<T>(
  path: string,
  query: Record<string, string> = {},
  pageSize: number,
  deps: unknown[] = []
) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<T[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setPage(1), deps);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setError(null);
    apiGetPaginated<T>(path, query, page, pageSize)
      .then((res) => {
        if (!cancelado) {
          setData(res.data);
          setTotal(res.total);
        }
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
  }, [path, page, pageSize, version, ...deps]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return { data, total, page, pageCount, pageSize, setPage, loading, error, recargar };
}
