import { useApiGet } from "../api/hooks";
import type { DashboardResumen, DashboardResumenCliente } from "../api/types";
import { useAuth } from "../auth/AuthContext";

export default function DashboardPage() {
  const { sesion } = useAuth();
  const resumen = useApiGet<DashboardResumen[]>("dashboard_resumen", { order: "profesional_nombre" });
  const resumenCliente = useApiGet<DashboardResumenCliente[]>("dashboard_resumen_cliente", { order: "cliente_nombre" });

  const totales = resumen.data?.reduce(
    (acc, r) => ({
      pendientes: acc.pendientes + r.pendientes,
      vencidos: acc.vencidos + r.vencidos,
      realizados: acc.realizados + r.realizados,
      cancelados: acc.cancelados + r.cancelados,
    }),
    { pendientes: 0, vencidos: 0, realizados: 0, cancelados: 0 }
  );

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p className="page-subtitle">
        {sesion?.rol === "app_admin" ? "Resumen de todos los profesionales." : "Resumen de tus eventos asignados."}
      </p>

      {totales && (
        <div className="stat-cards">
          <div className="stat-card stat-pendiente">
            <span className="stat-value">{totales.pendientes}</span>
            <span className="stat-label">Pendientes</span>
          </div>
          <div className="stat-card stat-vencido">
            <span className="stat-value">{totales.vencidos}</span>
            <span className="stat-label">Vencidos</span>
          </div>
          <div className="stat-card stat-realizado">
            <span className="stat-value">{totales.realizados}</span>
            <span className="stat-label">Realizados</span>
          </div>
          <div className="stat-card stat-cancelado">
            <span className="stat-value">{totales.cancelados}</span>
            <span className="stat-label">Cancelados</span>
          </div>
        </div>
      )}

      {resumen.loading && <p>Cargando…</p>}
      {resumen.error && <p className="form-error">{resumen.error}</p>}

      {resumen.data && resumen.data.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Profesional</th>
                <th>Pendientes</th>
                <th>Vencidos</th>
                <th>Realizados</th>
                <th>Cancelados</th>
                <th>Total eventos</th>
                <th>Horas estimadas</th>
                <th>Horas registradas</th>
              </tr>
            </thead>
            <tbody>
              {resumen.data.map((r) => (
                <tr key={r.id_profesional}>
                  <td>{r.profesional_nombre}</td>
                  <td>{r.pendientes}</td>
                  <td>{r.vencidos}</td>
                  <td>{r.realizados}</td>
                  <td>{r.cancelados}</td>
                  <td>{r.total_eventos}</td>
                  <td>{r.horas_estimadas}</td>
                  <td>{r.horas_registradas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ marginTop: "2rem" }}>Resumen por cliente</h2>

      {resumenCliente.loading && <p>Cargando…</p>}
      {resumenCliente.error && <p className="form-error">{resumenCliente.error}</p>}

      {resumenCliente.data && resumenCliente.data.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Pendientes</th>
                <th>Vencidos</th>
                <th>Realizados</th>
                <th>Cancelados</th>
                <th>Total eventos</th>
                <th>Horas estimadas</th>
                <th>Horas registradas</th>
              </tr>
            </thead>
            <tbody>
              {resumenCliente.data.map((r) => (
                <tr key={r.id_cliente}>
                  <td>{r.cliente_nombre}</td>
                  <td>{r.pendientes}</td>
                  <td>{r.vencidos}</td>
                  <td>{r.realizados}</td>
                  <td>{r.cancelados}</td>
                  <td>{r.total_eventos}</td>
                  <td>{r.horas_estimadas}</td>
                  <td>{r.horas_registradas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
