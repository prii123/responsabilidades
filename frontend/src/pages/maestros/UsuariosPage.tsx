import { useState, type FormEvent } from "react";
import { useApiGet } from "../../api/hooks";
import { apiPatch, apiRpc, ApiError } from "../../api/client";
import type { Profesional, Rol, Usuario } from "../../api/types";

const initialForm = { email: "", password: "", rol: "app_profesional" as Rol, id_profesional: "" };

export default function UsuariosPage() {
  const usuarios = useApiGet<Usuario[]>("usuarios", { order: "email" });
  const profesionales = useApiGet<Profesional[]>("profesionales", { order: "nombre" });

  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setGuardando(true);
    try {
      await apiRpc("crear_usuario", {
        email: form.email,
        password: form.password,
        rol: form.rol,
        id_profesional: form.rol === "app_profesional" ? Number(form.id_profesional) : null,
      });
      setForm(initialForm);
      setOk("Usuario creado. Ya puede iniciar sesión con esa contraseña.");
      usuarios.recargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el usuario");
    } finally {
      setGuardando(false);
    }
  }

  async function alternarActivo(u: Usuario) {
    setError(null);
    try {
      await apiPatch("usuarios", { id_usuario: `eq.${u.id_usuario}` }, { activo: !u.activo });
      usuarios.recargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar el usuario");
    }
  }

  function nombreProfesional(id: number | null) {
    if (!id) return "—";
    return profesionales.data?.find((p) => p.id_profesional === id)?.nombre ?? id;
  }

  return (
    <div className="page">
      <h1>Usuarios</h1>
      <p className="page-subtitle">
        Cuentas de acceso al sistema (login local, ver nota de Cognito en el backend). Un profesional necesita un
        usuario aquí, enlazado a su registro en Profesionales, para poder iniciar sesión.
      </p>

      <form className="grid-form card" onSubmit={crear}>
        <label>
          Correo
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={8}
          />
        </label>
        <label>
          Rol
          <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as Rol, id_profesional: "" })}>
            <option value="app_profesional">Profesional</option>
            <option value="app_admin">Administrador</option>
          </select>
        </label>
        {form.rol === "app_profesional" && (
          <label>
            Profesional
            <select value={form.id_profesional} onChange={(e) => setForm({ ...form, id_profesional: e.target.value })} required>
              <option value="">Seleccione…</option>
              {profesionales.data?.map((p) => (
                <option key={p.id_profesional} value={p.id_profesional}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="span-2">
          <button type="submit" disabled={guardando}>
            {guardando ? "Creando…" : "Crear usuario"}
          </button>
        </div>
      </form>
      {error && <p className="form-error">{error}</p>}
      {ok && <p className="form-ok">{ok}</p>}

      {usuarios.data && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Correo</th>
              <th>Rol</th>
              <th>Profesional</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.data.map((u) => (
              <tr key={u.id_usuario}>
                <td>{u.email}</td>
                <td>{u.rol === "app_admin" ? "Administrador" : "Profesional"}</td>
                <td>{nombreProfesional(u.id_profesional)}</td>
                <td>{u.activo ? "Activo" : "Inactivo"}</td>
                <td>
                  <button className="btn-secondary" onClick={() => alternarActivo(u)}>
                    {u.activo ? "Desactivar" : "Reactivar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
