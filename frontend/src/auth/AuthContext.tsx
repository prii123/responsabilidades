// Autenticación vía AWS Cognito (User Pool, ver backend/db/README.md).
//
// Login con SRP (amazon-cognito-identity-js): la contraseña nunca viaja por
// la red, ni siquiera en claro por HTTP — útil porque el sitio hoy corre en
// HTTP plano (CloudFront/HTTPS sigue pendiente, ver PLANEACION.md). Por eso
// se usa el SDK directo y no el Hosted UI de Cognito (que exige callback
// HTTPS salvo en localhost).
//
// El resto de la app no cambia: api/client.ts sigue recibiendo un Bearer
// token cualquiera sea su origen.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CognitoUser, CognitoUserPool, AuthenticationDetails, CognitoRefreshToken } from "amazon-cognito-identity-js";
import { setAuthToken, setUnauthorizedHandler } from "../api/client";
import type { Rol } from "../api/types";

interface Sesion {
  token: string;
  refreshToken: string;
  rol: Rol;
  email: string;
  id_profesional: number | null;
}

interface AuthContextValue {
  sesion: Sesion | null;
  cargando: boolean;
  error: string | null;
  sesionExpirada: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const STORAGE_KEY = "responsabilidades.sesion";

const pool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
});

function decodeIdToken(idToken: string): { rol: Rol; email: string; id_profesional: number | null; exp: number } {
  const payload = JSON.parse(atob(idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  return {
    rol: payload["cognito:groups"]?.[0],
    email: payload.email,
    id_profesional: payload["custom:id_profesional"] != null ? Number(payload["custom:id_profesional"]) : null,
    exp: payload.exp,
  };
}

function estaExpirado(exp: number) {
  return Date.now() / 1000 >= exp - 30; // 30s de margen
}

function refrescarSesion(email: string, refreshToken: string): Promise<Sesion> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({ Username: email, Pool: pool });
    cognitoUser.refreshSession(new CognitoRefreshToken({ RefreshToken: refreshToken }), (err, session) => {
      if (err || !session) return reject(err);
      const token = session.getIdToken().getJwtToken();
      const nuevoRefresh = session.getRefreshToken().getToken();
      const { rol, email: emailToken, id_profesional } = decodeIdToken(token);
      resolve({ token, refreshToken: nuevoRefresh, rol, email: emailToken, id_profesional });
    });
  });
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sesionExpirada, setSesionExpirada] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    let parsed: Sesion;
    let exp: number;
    try {
      parsed = JSON.parse(raw);
      if (!parsed.token || !parsed.refreshToken || !parsed.email) throw new Error("sesión guardada incompleta");
      exp = decodeIdToken(parsed.token).exp;
    } catch {
      // Formato viejo (login local, pre-Cognito) u otro dato corrupto.
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    if (!estaExpirado(exp)) {
      setSesion(parsed);
      setAuthToken(parsed.token);
      return;
    }
    // El token expiró pero el refresh token dura 30 días: renovamos en
    // silencio en vez de mandar al usuario a loguearse de nuevo.
    refrescarSesion(parsed.email, parsed.refreshToken)
      .then((nueva) => {
        setSesion(nueva);
        setAuthToken(nueva.token);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nueva));
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY);
        setSesionExpirada(true);
      });
  }, []);

  // Si el token expira a mitad de sesión (PostgREST responde 401), cerramos
  // sesión solos en vez de dejar que cada página muestre tablas vacías.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSesion((actual) => (actual ? null : actual));
      setAuthToken(null);
      localStorage.removeItem(STORAGE_KEY);
      setSesionExpirada(true);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  async function login(email: string, password: string) {
    setCargando(true);
    setError(null);
    try {
      const nueva = await new Promise<Sesion>((resolve, reject) => {
        const cognitoUser = new CognitoUser({ Username: email, Pool: pool });
        cognitoUser.authenticateUser(new AuthenticationDetails({ Username: email, Password: password }), {
          onSuccess: (session) => {
            const token = session.getIdToken().getJwtToken();
            const refreshToken = session.getRefreshToken().getToken();
            const { rol, email: emailToken, id_profesional } = decodeIdToken(token);
            resolve({ token, refreshToken, rol, email: emailToken, id_profesional });
          },
          onFailure: (err) => reject(err),
          newPasswordRequired: () =>
            reject(new Error("Este usuario debe cambiar su contraseña. Contacta a un administrador.")),
        });
      });
      setSesion(nueva);
      setAuthToken(nueva.token);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nueva));
      setSesionExpirada(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar sesión");
      throw e;
    } finally {
      setCargando(false);
    }
  }

  function logout() {
    pool.getCurrentUser()?.signOut();
    setSesion(null);
    setAuthToken(null);
    localStorage.removeItem(STORAGE_KEY);
    setSesionExpirada(false);
  }

  const value = useMemo(
    () => ({ sesion, cargando, error, sesionExpirada, login, logout }),
    [sesion, cargando, error, sesionExpirada]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
