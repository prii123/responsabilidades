import { useState, type FormEvent } from "react";
import { useAuth } from "./AuthContext";

export default function LoginPage() {
  const { login, cargando, error, sesionExpirada } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
    } catch {
      // el error ya queda expuesto por useAuth().error
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>Gestión de Obligaciones</h1>
        <p className="login-subtitle">y Responsabilidades</p>

        <label>
          Correo
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {sesionExpirada && !error && <p className="form-error">Tu sesión expiró. Inicia sesión de nuevo.</p>}
        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={cargando}>
          {cargando ? "Ingresando…" : "Ingresar"}
        </button>

        <p className="login-hint">
          Usuarios de ejemplo (seed): <code>admin@responsabilidades.local</code> /{" "}
          <code>laura.gomez@example.com</code>
        </p>
      </form>
    </div>
  );
}
