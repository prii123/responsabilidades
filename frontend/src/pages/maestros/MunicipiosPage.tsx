import { useState, type FormEvent } from "react";
import { useApiGet } from "../../api/hooks";
import { apiPost, ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import type { Municipio } from "../../api/types";

export default function MunicipiosPage() {
  const { data, loading, error, recargar } = useApiGet<Municipio[]>("municipios", { order: "nombre" });
  const [modalAbierto, setModalAbierto] = useState(false);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Municipios</h1>
          <p className="page-subtitle">Base geográfica: se usa en Responsabilidades y Clientes.</p>
        </div>
        <button onClick={() => setModalAbierto(true)}>+ Nuevo municipio</button>
      </div>

      {loading && <p>Cargando…</p>}
      {error && <p className="form-error">{error}</p>}
      {data && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m) => (
                <tr key={m.cod_municipio}>
                  <td>{m.cod_municipio}</td>
                  <td>{m.nombre}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={2} className="empty-cell">
                    Todavía no hay municipios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalAbierto && (
        <NuevoMunicipioModal
          onClose={() => setModalAbierto(false)}
          onCreado={() => {
            setModalAbierto(false);
            recargar();
          }}
        />
      )}
    </div>
  );
}

function NuevoMunicipioModal({ onClose, onCreado }: { onClose: () => void; onCreado: () => void }) {
  const [cod, setCod] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await apiPost("municipios", { cod_municipio: cod, nombre });
      onCreado();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el municipio");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal title="Nuevo municipio" onClose={onClose}>
      <form onSubmit={crear} className="flex flex-col gap-4">
        <label>
          Código DANE
          <input placeholder="Ej. 11001" value={cod} onChange={(e) => setCod(e.target.value)} maxLength={5} required autoFocus />
        </label>
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando}>
            {guardando ? "Guardando…" : "Crear"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
