import { useState, type FormEvent } from "react";
import { useApiGet } from "../../api/hooks";
import { apiPost, ApiError } from "../../api/client";
import type { Cliente, Municipio } from "../../api/types";

const initialForm = { nombre: "", nit: "", digito_verificacion: "", direccion: "", telefono: "", cod_municipio: "" };

export default function ClientesPage() {
  const clientes = useApiGet<Cliente[]>("clientes", { order: "nombre" });
  const municipios = useApiGet<Municipio[]>("municipios", { order: "nombre" });
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiPost("clientes", {
        nombre: form.nombre,
        nit: Number(form.nit),
        digito_verificacion: Number(form.digito_verificacion),
        direccion: form.direccion || null,
        telefono: form.telefono || null,
        cod_municipio: form.cod_municipio || null,
      });
      setForm(initialForm);
      clientes.recargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el cliente");
    }
  }

  function nombreMunicipio(cod: string | null) {
    if (!cod) return "—";
    return municipios.data?.find((m) => m.cod_municipio === cod)?.nombre ?? cod;
  }

  return (
    <div className="page">
      <h1>Clientes</h1>
      <p className="page-subtitle">
        El NIT se guarda separado del dígito de verificación: son esos dígitos (sin el DV) los que determinan la fecha
        límite en el calendario tributario.
      </p>

      <form className="grid-form card" onSubmit={crear}>
        <label className="span-2">
          Razón social
          <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
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
            {municipios.data?.map((m) => (
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
        <div className="span-2">
          <button type="submit">Crear cliente</button>
        </div>
      </form>
      {error && <p className="form-error">{error}</p>}

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
          </tbody>
        </table>
      )}
    </div>
  );
}
