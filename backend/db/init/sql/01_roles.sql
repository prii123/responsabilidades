-- Roles de base de datos usados por PostgREST.
--
-- authenticator      : único rol con el que PostgREST abre la conexión. NOINHERIT
--                       y sin privilegios propios: solo puede "SET ROLE" a los
--                       roles de negocio que se le otorgan más abajo. PostgREST
--                       hace ese SET ROLE automáticamente según el claim "role"
--                       del JWT (o usa db-anon-role si no hay token).
-- web_anon           : sin sesión ni token (el login ahora lo resuelve
--                       Cognito directamente, no pasa por PostgREST).
-- app_profesional    : usuario "profesional" autenticado (ve/opera lo suyo, RLS).
-- app_admin          : usuario "admin" autenticado (acceso completo).
-- app_maintenance    : rol de conexión directa (no via PostgREST) para el
--                       contenedor "scheduler" que marca eventos vencidos.
-- app_user_sync      : rol de conexión directa (no vía PostgREST) para
--                       presign-service, que mantiene app.usuarios en
--                       sincronía con lo que crea/edita en el User Pool
--                       de Cognito (ver 03_auth.sql).

SELECT format('CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD %L', :'authenticator_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator');
\gexec

ALTER ROLE authenticator WITH PASSWORD :'authenticator_password';

SELECT format('CREATE ROLE %I NOLOGIN', r)
FROM unnest(ARRAY['web_anon', 'app_profesional', 'app_admin']) AS r
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r);
\gexec

SELECT format('CREATE ROLE app_maintenance LOGIN PASSWORD %L', :'maintenance_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_maintenance');
\gexec

ALTER ROLE app_maintenance WITH PASSWORD :'maintenance_password';

SELECT format('CREATE ROLE app_user_sync LOGIN PASSWORD %L', :'user_sync_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user_sync');
\gexec

ALTER ROLE app_user_sync WITH PASSWORD :'user_sync_password';

GRANT web_anon TO authenticator;
GRANT app_profesional TO authenticator;
GRANT app_admin TO authenticator;
