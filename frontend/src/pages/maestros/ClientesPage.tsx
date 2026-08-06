import { useState, type FormEvent } from "react";
import { useApiGet } from "../../api/hooks";
import { apiPost, ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import type { Cliente, Municipio } from "../../api/types";

const initialForm = { nombre: "", nit: "", digito_verificacion: "", direccion: "", telefono: "", cod_municipio: "" };

export default function ClientesPage() {
  const clientes = useApiGet<Cliente[]>("clientes", { order: "nombre" });
  const municipios = useApiGet<Municipio[]>("municipios", { order: "nombre" });
  const [modalAbierto, setModalAbierto] = useState(false);

  function nombreMunicipio(cod: string | null) {
    if (!cod) return "—";
    return municipios.data?.find((m) => m.cod_municipio === cod)?.nombre ?? cod;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Clientes</h1>
          <p className="page-subtitle">
            El NIT se guarda separado del dígito de verificación: son esos dígitos (sin el DV) los que determinan la
            fecha límite en el calendario tributario.
          </p>
        </div>
        <button onClick={() => setModalAbierto(true)}>+ Nuevo cliente</button>
      </div>

      {clientes.data && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Razón social</th>
              <th>NIT</th>
              <th>Municipio</th>
            </tr>
          </thead>
          <tbody>
            {clientes.data.map((c) => (
              <tr key={c.id_cliente}>
                <td>{c.nombre}</td>
                <td>
                  {c.nit}-{c.digito_verificacion}
                </td>
                <td>{nombreMunicipio(c.cod_municipio)}</td>
              </tr>
            ))}
            {clientes.data.length === 0 && (
              <tr>
                <td colSpan={3} className="empty-cell">
                  Todavía no hay clientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {modalAbierto && (
        <NuevoClienteModal
          municipios={municipios.data ?? []}
          onClose={() => setModalAbierto(false)}
          onCreado={() => {
            setModalAbierto(false);
            clientes.recargar();
          }}
        />
      )}
    </div>
  );
}

function NuevoClienteModal({
  municipios,
  onClose,
  onCreado,
}: {
  municipios: Municipio[];
  onClose: () => void;
  onCreado: () => void;
}) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await apiPost("clientes", {
        nombre: form.nombre,
        nit: Number(form.nit),
        digito_verificacion: Number(form.digito_verificacion),
        direccion: form.direccion || null,
        telefono: form.telefono || null,
        cod_municipio: form.cod_municipio || null,
      });
      onCreado();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el cliente");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal title="Nuevo cliente" onClose={onClose} wide>
      <form className="grid-form" onSubmit={crear} style={{ marginBottom: 0 }}>
        <label className="span-2">
          Razón social
          <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required autoFocus />
        </label>
        <label>
          NIT (sin DV)
          <input value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} required inputMode="numeric" pattern="[0-9]+" />
        </label>
        <label>
          Dígito de verificación
          <input
            value={form.digito_verificacion}
            onChange={(e) => setForm({ ...form, digito_verificacion: e.target.value })}
            required
            inputMode="numeric"
            pattern="[0-9]"
            maxLength={1}
          />
        </label>
        <label>
          Municipio
          <select value={form.cod_municipio} onChange={(e) => setForm({ ...form, cod_municipio: e.target.value })}>
            <option value="">Seleccione…</option>
            {municipios.map((m) => (
              <option key={m.cod_municipio} value={m.cod_municipio}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Teléfono
          <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
        </label>
        <label className="span-2">
          Dirección
          <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
        </label>

        {error && (
          <p className="form-error span-2" style={{ gridColumn: "span 2" }}>
            {error}
          </p>
        )}

        <div className="modal-actions span-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando}>
            {guardando ? "Guardando…" : "Crear cliente"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
