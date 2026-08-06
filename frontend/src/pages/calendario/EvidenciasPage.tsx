import { useState } from "react";
import { useApiGet } from "../../api/hooks";
import { verArchivoEvidencia } from "../../api/files";
import type { VEvidencia } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";

export default function EvidenciasPage() {
  const { sesion } = useAuth();
  const [anio, setAnio] = useState(String(new Date().getFullYear()));
  const [abriendo, setAbriendo] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const evidencias = useApiGet<VEvidencia[]>(
    "v_evidencias",
    { order: "fecha_realizacion.desc", anio: `eq.${anio}` },
    [anio]
  );

  async function verArchivo(ev: VEvidencia) {
    if (!ev.archivo_evidencia) return;
    setError(null);
    setAbriendo(ev.id_evidencia);
    try {
      await verArchivoEvidencia(ev.archivo_evidencia);
    } catch {
      setError("No se pudo abrir el archivo. Intenta de nuevo.");
    } finally {
      setAbriendo(null);
    }
  }

  return (
    <div className="page">
      <h1>Evidencias</h1>
      <p className="page-subtitle">
        {sesion?.rol === "app_admin"
          ? "Todo lo que los profesionales registraron para dar por Realizado un evento (Regla 5)."
          : "Lo que has registrado como evidencia de tus eventos."}
      </p>

      <div className="inline-form">
        <label>
          Año
          <input type="number" value={anio} onChange={(e) => setAnio(e.target.value)} style={{ width: 100 }} />
        </label>
      </div>

      {evidencias.loading && <p>Cargando…</p>}
      {evidencias.error && <p className="form-error">{evidencias.error}</p>}
      {error && <p className="form-error">{error}</p>}

      {evidencias.data && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Obligación</th>
              <th>Periodo</th>
              <th>Profesional</th>
              <th>Fecha realización</th>
              <th>Horas</th>
              <th>Observaciones</th>
              <th>Archivo</th>
            </tr>
          </thead>
          <tbody>
            {evidencias.data.map((ev) => (
              <tr key={ev.id_evidencia}>
                <td>{ev.cliente_nombre}</td>
                <td>{ev.responsabilidad_nombre}</td>
                <td>{ev.periodo}</td>
                <td>{ev.profesional_nombre}</td>
                <td>{ev.fecha_realizacion}</td>
                <td>{ev.horas_dedicadas ?? "—"}</td>
                <td>{ev.observaciones}</td>
                <td>
                  {ev.archivo_evidencia ? (
                    <button className="btn-secondary" onClick={() => verArchivo(ev)} disabled={abriendo === ev.id_evidencia}>
                      {abriendo === ev.id_evidencia ? "Abriendo…" : "Ver archivo"}
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {evidencias.data.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-cell">
                  No hay evidencias registradas para este año.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
