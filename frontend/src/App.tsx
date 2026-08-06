import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import LoginPage from "./auth/LoginPage";
import Layout from "./components/Layout";
import RequireRole from "./components/RequireRole";
import DashboardPage from "./pages/DashboardPage";
import EventosPage from "./pages/calendario/EventosPage";
import EvidenciasPage from "./pages/calendario/EvidenciasPage";
import MunicipiosPage from "./pages/maestros/MunicipiosPage";
import SubgruposPage from "./pages/maestros/SubgruposPage";
import ResponsabilidadesPage from "./pages/maestros/ResponsabilidadesPage";
import ProfesionalesPage from "./pages/maestros/ProfesionalesPage";
import ClientesPage from "./pages/maestros/ClientesPage";
import CalendariosTributariosPage from "./pages/maestros/CalendariosTributariosPage";
import UsuariosPage from "./pages/maestros/UsuariosPage";
import ResponsabilidadesClientePage from "./pages/asignaciones/ResponsabilidadesClientePage";
import AsignarPage from "./pages/asignaciones/AsignarPage";

export default function App() {
  const { sesion } = useAuth();

  if (!sesion) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/calendario" element={<EventosPage />} />
        <Route path="/evidencias" element={<EvidenciasPage />} />

        <Route path="/maestros/municipios" element={<RequireRole role="app_admin"><MunicipiosPage /></RequireRole>} />
        <Route path="/maestros/subgrupos" element={<RequireRole role="app_admin"><SubgruposPage /></RequireRole>} />
        <Route path="/maestros/responsabilidades" element={<RequireRole role="app_admin"><ResponsabilidadesPage /></RequireRole>} />
        <Route path="/maestros/profesionales" element={<RequireRole role="app_admin"><ProfesionalesPage /></RequireRole>} />
        <Route path="/maestros/clientes" element={<RequireRole role="app_admin"><ClientesPage /></RequireRole>} />
        <Route path="/maestros/calendarios-tributarios" element={<RequireRole role="app_admin"><CalendariosTributariosPage /></RequireRole>} />
        <Route path="/maestros/usuarios" element={<RequireRole role="app_admin"><UsuariosPage /></RequireRole>} />

        <Route
          path="/asignaciones/responsabilidades-cliente"
          element={<RequireRole role="app_admin"><ResponsabilidadesClientePage /></RequireRole>}
        />
        <Route path="/asignaciones/asignar" element={<RequireRole role="app_admin"><AsignarPage /></RequireRole>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
