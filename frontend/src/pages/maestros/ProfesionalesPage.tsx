import { useState, type FormEvent } from "react";
import { useApiGet } from "../../api/hooks";
import { apiPost, ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import type { Profesional } from "../../api/types";

const initialForm = { nombre: "", email: "", telefono: "", direccion: "" };

export default function ProfesionalesPage() {
  const { data, loading, error, recargar } = useApiGet<Profesional[]>("profesionales", { order: "nombre" });
  const [modalAbierto, setModalAbierto] = useState(false);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Profesionales</h1>
          <p className="page-subtitle">Quienes ejecutan las obligaciones de los clientes.</p>
        </div>
        <button onClick={() => setModalAbierto(true)}>+ Nuevo profesional</button>
      </div>

      {loading && <p>Cargando…</p>}
      {error && <p className="form-error">{error}</p>}
      {data && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Activo</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id_profesional}>
                  <td>{p.nombre}</td>
                  <td>{p.email}</td>
                  <td>{p.telefono}</td>
                  <td>{p.activo ? "Sí" : "No"}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-cell">
                    Todavía no hay profesionales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalAbierto && (
        <NuevoProfesionalModal
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

function NuevoProfesionalModal({ onClose, onCreado }: { onClose: () => void; onCreado: () => void }) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await apiPost("profesionales", form);
      onCreado();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el profesional");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal title="Nuevo profesional" onClose={onClose}>
      <form onSubmit={crear} className="flex flex-col gap-4">
        <label>
          Nombre
          <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required autoFocus />
        </label>
        <label>
          Email (para iniciar sesión)
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>
          Teléfono
          <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
        </label>

        <p className="hint-text">
          Nota: crear aquí el profesional no crea su usuario de acceso. Ve a <strong>Usuarios</strong> para darle correo
          y contraseña — con Cognito, ese paso lo reemplaza la creación del usuario en el User Pool.
        </p>

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
