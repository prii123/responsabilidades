/** Controles de paginación para tablas. No se renderiza si todo cabe en una página. */
export default function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  const desde = (page - 1) * pageSize + 1;
  const hasta = Math.min(page * pageSize, total);

  return (
    <div className="pagination">
      <span className="hint-text">
        {desde}–{hasta} de {total}
      </span>
      <div className="pagination-buttons">
        <button className="btn-secondary" onClick={() => onChange(page - 1)} disabled={page <= 1}>
          Anterior
        </button>
        <span className="hint-text">
          Página {page} de {pageCount}
        </span>
        <button className="btn-secondary" onClick={() => onChange(page + 1)} disabled={page >= pageCount}>
          Siguiente
        </button>
      </div>
    </div>
  );
}
