import { useState, type FormEvent } from "react";
import { useApiGet } from "../../api/hooks";
import { ApiError } from "../../api/client";
import { cambiarActivoUsuario, crearUsuario } from "../../api/usuariosAdmin";
import Modal from "../../components/Modal";
import type { Profesional, Rol, Usuario } from "../../api/types";

export default function UsuariosPage() {
  const usuarios = useApiGet<Usuario[]>("usuarios", { order: "email" });
  const profesionales = useApiGet<Profesional[]>("profesionales", { order: "nombre" });
  const [modalAbierto, setModalAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function alternarActivo(u: Usuario) {
    setError(null);
    try {
      await cambiarActivoUsuario(u.sub, u.email, !u.activo);
      usuarios.recargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar el usuario");
    }
  }

  function nombreProfesional(id: number | null) {
    if (!id) return "—";
    return profesionales.data?.find((p) => p.id_profesional === id)?.nombre ?? String(id);
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Usuarios</h1>
          <p className="page-subtitle">
            Cuentas de acceso al sistema (AWS Cognito). Un profesional necesita un usuario aquí, enlazado a su
            registro en Profesionales, para poder iniciar sesión.
          </p>
        </div>
        <button onClick={() => setModalAbierto(true)}>+ Nuevo usuario</button>
      </div>

      {error && <p className="form-error">{error}</p>}
      {ok && <p className="form-ok">{ok}</p>}

      {usuarios.data && (
        <div className="table-scroll">
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
              {usuarios.data.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-cell">
                    Todavía no hay usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalAbierto && (
        <NuevoUsuarioModal
          profesionales={profesionales.data ?? []}
          onClose={() => setModalAbierto(false)}
          onCreado={() => {
            setModalAbierto(false);
            setOk("Usuario creado. Ya puede iniciar sesión con esa contraseña.");
            usuarios.recargar();
          }}
        />
      )}
    </div>
  );
}

function NuevoUsuarioModal({
  profesionales,
  onClose,
  onCreado,
}: {
  profesionales: Profesional[];
  onClose: () => void;
  onCreado: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<Rol>("app_profesional");
  const [idProfesional, setIdProfesional] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await crearUsuario({
        email,
        password,
        rol,
        id_profesional: rol === "app_profesional" ? Number(idProfesional) : null,
      });
      onCreado();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el usuario");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal title="Nuevo usuario" onClose={onClose}>
      <form onSubmit={crear} className="flex flex-col gap-4">
        <label>
          Correo
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label>
          Contraseña
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </label>
        <label>
          Rol
          <select value={rol} onChange={(e) => { setRol(e.target.value as Rol); setIdProfesional(""); }}>
            <option value="app_profesional">Profesional</option>
            <option value="app_admin">Administrador</option>
          </select>
        </label>
        {rol === "app_profesional" && (
          <label>
            Profesional
            <select value={idProfesional} onChange={(e) => setIdProfesional(e.target.value)} required>
              <option value="">Seleccione…</option>
              {profesionales.map((p) => (
                <option key={p.id_profesional} value={p.id_profesional}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
        )}

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando}>
            {guardando ? "Creando…" : "Crear usuario"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
