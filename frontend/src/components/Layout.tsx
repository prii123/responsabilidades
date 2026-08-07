import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const NAV_ADMIN = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/calendario", label: "Calendario" },
  { to: "/evidencias", label: "Evidencias" },
  { to: "/maestros/clientes", label: "Clientes" },
  { to: "/maestros/profesionales", label: "Profesionales" },
  { to: "/maestros/responsabilidades", label: "Responsabilidades" },
  { to: "/maestros/subgrupos", label: "Grupos / Subgrupos" },
  { to: "/maestros/municipios", label: "Municipios" },
  { to: "/maestros/calendarios-tributarios", label: "Calendarios tributarios" },
  { to: "/asignaciones/responsabilidades-cliente", label: "Responsabilidades del cliente" },
  { to: "/asignaciones/asignar", label: "Asignar cliente a profesional" },
  { to: "/maestros/usuarios", label: "Usuarios" },
];

const NAV_PROFESIONAL = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/calendario", label: "Mi calendario" },
  { to: "/evidencias", label: "Mis evidencias" },
];

export default function Layout() {
  const { sesion, logout } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const items = sesion?.rol === "app_admin" ? NAV_ADMIN : NAV_PROFESIONAL;

  return (
    <div className="app-shell">
      {menuAbierto && <div className="sidebar-backdrop" onClick={() => setMenuAbierto(false)} />}

      {/* El estado abierto/cerrado se fuerza por estilo en línea (gana sobre
          cualquier regla CSS, evita depender de especificidad de clases) —
          en desktop (md:) la propia hoja de estilos ya mantiene el sidebar
          visible sin importar este valor. */}
      <aside className="sidebar" style={menuAbierto ? { transform: "translateX(0)" } : undefined}>
        <div className="sidebar-title">Gestión de Obligaciones</div>
        <nav>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMenuAbierto(false)}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <strong>{sesion?.email}</strong>
            <span>{sesion?.rol === "app_admin" ? "Administrador" : "Profesional"}</span>
          </div>
          <button className="btn-secondary" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="content-wrapper">
        <header className="mobile-topbar">
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
          >
            <span />
            <span />
            <span />
          </button>
          <span className="mobile-topbar-title">Gestión de Obligaciones</span>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
