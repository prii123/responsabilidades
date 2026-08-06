// Autenticación LOCAL — placeholder temporal de AWS Cognito (ver backend/db/README.md).
//
// MIGRACIÓN A COGNITO: cuando el User Pool exista, este archivo es el único
// punto que cambia en el frontend: reemplazar login()/logout() por el flujo
// Authorization Code + PKCE contra el Hosted UI de Cognito (con
// "oidc-client-ts" o "aws-amplify"), guardando igualmente el token en
// AuthContext para que api/client.ts y el resto de la app sigan iguales.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiRpc, setAuthToken } from "../api/client";
import type { LoginResponse, Rol } from "../api/types";

interface Sesion {
  token: string;
  rol: Rol;
  email: string;
  id_profesional: number | null;
}

interface AuthContextValue {
  sesion: Sesion | null;
  cargando: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const STORAGE_KEY = "responsabilidades.sesion";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: Sesion = JSON.parse(raw);
      setSesion(parsed);
      setAuthToken(parsed.token);
    }
  }, []);

  async function login(email: string, password: string) {
    setCargando(true);
    setError(null);
    try {
      const resp = await apiRpc<LoginResponse>("login", { email, password });
      const nueva: Sesion = {
        token: resp.token,
        rol: resp.rol,
        email: resp.email,
        id_profesional: resp.id_profesional,
      };
      setSesion(nueva);
      setAuthToken(nueva.token);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nueva));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar sesión");
      throw e;
    } finally {
      setCargando(false);
    }
  }

  function logout() {
    setSesion(null);
    setAuthToken(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  const value = useMemo(() => ({ sesion, cargando, error, login, logout }), [sesion, cargando, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
