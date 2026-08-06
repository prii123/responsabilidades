import { useState, type FormEvent } from "react";
import { useApiGet } from "../../api/hooks";
import { apiRpc, ApiError } from "../../api/client";
import type { Asignacion, Cliente, Profesional } from "../../api/types";

export default function AsignarPage() {
  const clientes = useApiGet<Cliente[]>("clientes", { order: "nombre" });
  const profesionales = useApiGet<Profesional[]>("profesionales", { order: "nombre" });
  const asignaciones = useApiGet<Asignacion[]>("asignaciones", { order: "anio.desc" });

  const [idCliente, setIdCliente] = useState("");
  const [idProfesional, setIdProfesional] = useState("");
  const [anio, setAnio] = useState(String(new Date().getFullYear()));
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function asignar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setGuardando(true);
    try {
      await apiRpc("asignar_cliente_profesional", {
        cliente: Number(idCliente),
        profesional: Number(idProfesional),
        anio: Number(anio),
      });
      setOk("Cliente asignado. Los eventos del calendario se generaron automáticamente.");
      setIdCliente("");
      setIdProfesional("");
      asignaciones.recargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo asignar");
    } finally {
      setGuardando(false);
    }
  }

  function nombreCliente(id: number) {
    return clientes.data?.find((c) => c.id_cliente === id)?.nombre ?? id;
  }
  function nombreProfesional(id: number) {
    return profesionales.data?.find((p) => p.id_profesional === id)?.nombre ?? id;
  }

  return (
    <div className="page">
      <h1>Asignar cliente a profesional</h1>
      <p className="page-subtitle">
        Paso 8: si el cliente no tiene responsabilidades activas para el año, esto falla (Regla 1). Al asignar se generan
        automáticamente los eventos del calendario (Regla 3) usando el calendario tributario y el NIT del cliente.
      </p>

      <form className="grid-form card" onSubmit={asignar}>
        <label>
          Cliente
          <select value={idCliente} onChange={(e) => setIdCliente(e.target.value)} required>
            <option value="">Seleccione…</option>
            {clientes.data?.map((c) => (
              <option key={c.id_cliente} value={c.id_cliente}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Profesional
          <select value={idProfesional} onChange={(e) => setIdProfesional(e.target.value)} required>
            <option value="">Seleccione…</option>
            {profesionales.data?.map((p) => (
              <option key={p.id_profesional} value={p.id_profesional}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Año
          <input type="number" value={anio} onChange={(e) => setAnio(e.target.value)} required />
        </label>
        <div className="span-2">
          <button type="submit" disabled={guardando}>
            {guardando ? "Asignando…" : "Asignar y generar eventos"}
          </button>
        </div>
      </form>
      {error && <p className="form-error">{error}</p>}
      {ok && <p className="form-ok">{ok}</p>}

      {asignaciones.data && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Profesional</th>
              <th>Año</th>
              <th>Fecha asignación</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {asignaciones.data.map((a) => (
              <tr key={a.id_asignacion_cliente}>
                <td>{nombreCliente(a.id_cliente)}</td>
                <td>{nombreProfesional(a.id_profesional)}</td>
                <td>{a.anio}</td>
                <td>{a.fecha_asignacion}</td>
                <td>{a.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
