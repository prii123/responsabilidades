import { useState, type FormEvent } from "react";
import { useApiGet } from "../../api/hooks";
import { apiPost, ApiError } from "../../api/client";
import type { Profesional } from "../../api/types";

const initialForm = { nombre: "", email: "", telefono: "", direccion: "" };

export default function ProfesionalesPage() {
  const { data, loading, error, recargar } = useApiGet<Profesional[]>("profesionales", { order: "nombre" });
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState<string | null>(null);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      await apiPost("profesionales", form);
      setForm(initialForm);
      recargar();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "No se pudo crear el profesional");
    }
  }

  return (
    <div className="page">
      <h1>Profesionales</h1>
      <p className="page-subtitle">Quienes ejecutan las obligaciones de los clientes.</p>

      <form className="inline-form" onSubmit={crear}>
        <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
        <input placeholder="Email (para iniciar sesión)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
        <button type="submit">Agregar</button>
      </form>
      {formError && <p className="form-error">{formError}</p>}
      <p className="hint-text">
        Nota: crear aquí el profesional no crea su usuario de acceso. Ve a <strong>Usuarios</strong> para darle correo y
        contraseña — con Cognito, ese paso lo reemplaza la creación del usuario en el User Pool.
      </p>

      {loading && <p>Cargando…</p>}
      {error && <p className="form-error">{error}</p>}
      {data && (
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
          </tbody>
        </table>
      )}
    </div>
  );
}
