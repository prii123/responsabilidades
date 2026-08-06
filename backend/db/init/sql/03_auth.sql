-- ============================================================
-- Autenticación LOCAL — placeholder temporal de AWS Cognito
-- ============================================================
-- Mientras no exista el User Pool de Cognito, el login se resuelve aquí mismo:
-- api.login(email, password) valida contra app.usuarios (password con pgcrypto)
-- y firma un JWT HS256 con los claims que espera PostgREST ("role") y RLS
-- ("id_profesional"). El frontend solo necesita POST /rpc/login.
--
-- MIGRACIÓN A COGNITO (cuando esté disponible):
--   1) Backend: en postgrest.conf, cambiar "jwt-secret" al JWKS de Cognito (RS256).
--   2) Backend: mapear el grupo de Cognito ("cognito:groups") a los mismos roles
--      app_admin / app_profesional (vía jwt-role-claim-key), y el claim "sub"/
--      "email" a app.usuarios.id_profesional para que RLS siga funcionando igual.
--   3) Frontend: reemplazar src/auth/AuthContext.tsx (login local) por el flujo
--      Authorization Code + PKCE contra el Hosted UI de Cognito.
--   4) El resto del sistema (esquema, RPC, RLS, frontend salvo el login) NO cambia.

SELECT format('ALTER DATABASE %I SET app.jwt_secret = %L', current_database(), :'jwt_secret')
\gexec

-- Codificación base64url sin padding (para construir el JWT a mano).
CREATE OR REPLACE FUNCTION app.url_encode(data bytea) RETURNS text AS $$
  SELECT translate(encode(data, 'base64'), E'+/=\n', '-_');
$$ LANGUAGE sql IMMUTABLE;

-- Firma un JWT HS256 con pgcrypto (hmac), sin depender de la extensión pgjwt.
CREATE OR REPLACE FUNCTION app.jwt_sign(payload json) RETURNS text AS $$
DECLARE
  header    text := app.url_encode(convert_to('{"alg":"HS256","typ":"JWT"}', 'utf8'));
  body      text := app.url_encode(convert_to(payload::text, 'utf8'));
  signature text := app.url_encode(hmac(header || '.' || body, current_setting('app.jwt_secret'), 'sha256'));
BEGIN
  RETURN header || '.' || body || '.' || signature;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helpers para leer los claims del JWT actual (usados por RLS y por las RPC).
CREATE OR REPLACE FUNCTION app.current_profesional_id() RETURNS int AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json ->> 'id_profesional', '')::int;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app.current_rol() RETURNS text AS $$
  SELECT current_setting('request.jwt.claims', true)::json ->> 'role';
$$ LANGUAGE sql STABLE;

-- Única función que puede ejecutar web_anon. SECURITY DEFINER porque web_anon
-- no tiene (ni debe tener) SELECT directo sobre app.usuarios.
CREATE OR REPLACE FUNCTION api.login(email text, password text) RETURNS json AS $$
DECLARE
  v_usuario app.usuarios;
  v_token   text;
BEGIN
  SELECT u.* INTO v_usuario FROM app.usuarios u WHERE u.email = login.email AND u.activo;

  IF v_usuario IS NULL OR v_usuario.password_hash <> crypt(login.password, v_usuario.password_hash) THEN
    RAISE EXCEPTION 'Credenciales inválidas' USING ERRCODE = '28P01';
  END IF;

  v_token := app.jwt_sign(json_build_object(
    'role', v_usuario.rol,
    'email', v_usuario.email,
    'id_usuario', v_usuario.id_usuario,
    'id_profesional', v_usuario.id_profesional,
    'exp', extract(epoch FROM now() + interval '8 hours')::int
  ));

  RETURN json_build_object(
    'token', v_token,
    'rol', v_usuario.rol,
    'email', v_usuario.email,
    'id_profesional', v_usuario.id_profesional
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION api.login(text, text) TO web_anon;
