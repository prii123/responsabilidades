-- ============================================================
-- Autenticación — AWS Cognito
-- ============================================================
-- PostgREST valida el ID token de Cognito (RS256) contra el JWKS del User
-- Pool (ver ../postgrest.conf / docker-compose.yml, PGRST_JWT_SECRET) y hace
-- SET ROLE directo al grupo de Cognito del usuario ("cognito:groups"[0], vía
-- PGRST_JWT_ROLE_CLAIM_KEY) — los grupos se llaman igual que los roles de
-- Postgres (app_admin / app_profesional), así que no hace falta ninguna
-- función ni Lambda intermedia para resolver el rol.
--
-- Lo único que sigue viviendo en la base de datos es la relación
-- sub (Cognito) -> id_profesional, para que las políticas RLS de 07_rls.sql
-- sigan funcionando igual que con el login local. Esa tabla (app.usuarios)
-- la mantiene presign-service (rutas /usuarios) a través del rol
-- app_user_sync, que se conecta directo a Postgres (no vía PostgREST, igual
-- que el "scheduler" con app_maintenance).

-- SECURITY DEFINER porque app_profesional no tiene (ni debe tener) SELECT
-- directo sobre app.usuarios — solo necesita este único valor derivado.
CREATE OR REPLACE FUNCTION app.current_profesional_id() RETURNS int AS $$
  SELECT id_profesional FROM app.usuarios
  WHERE sub = current_setting('request.jwt.claims', true)::json ->> 'sub'
    AND activo;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Ya no hace falta para RLS (el rol de Postgres ya lo fija PostgREST vía
-- jwt-role-claim-key); se deja como helper de diagnóstico.
CREATE OR REPLACE FUNCTION app.current_rol() RETURNS text AS $$
  SELECT current_setting('request.jwt.claims', true)::json -> 'cognito:groups' ->> 0;
$$ LANGUAGE sql STABLE;

-- Usados exclusivamente por presign-service (rol app_user_sync) al
-- crear/activar/desactivar usuarios en Cognito, para reflejar lo mismo aquí.
CREATE OR REPLACE FUNCTION app.f_sync_usuario_cognito(
  p_sub text, p_email text, p_rol text, p_id_profesional int
) RETURNS app.usuarios AS $$
  INSERT INTO app.usuarios (sub, email, rol, id_profesional, activo)
  VALUES (p_sub, p_email, p_rol, p_id_profesional, true)
  ON CONFLICT (sub) DO UPDATE
    SET email = EXCLUDED.email, rol = EXCLUDED.rol, id_profesional = EXCLUDED.id_profesional
  RETURNING *;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION app.f_set_usuario_activo(p_sub text, p_activo boolean) RETURNS void AS $$
  UPDATE app.usuarios SET activo = p_activo WHERE sub = p_sub;
$$ LANGUAGE sql;

GRANT USAGE ON SCHEMA app TO app_user_sync;
GRANT SELECT, INSERT, UPDATE ON app.usuarios TO app_user_sync;
GRANT USAGE, SELECT ON app.usuarios_id_usuario_seq TO app_user_sync;
GRANT EXECUTE ON FUNCTION app.f_sync_usuario_cognito(text, text, text, int) TO app_user_sync;
GRANT EXECUTE ON FUNCTION app.f_set_usuario_activo(text, boolean) TO app_user_sync;
