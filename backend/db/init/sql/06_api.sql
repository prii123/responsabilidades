-- ============================================================
-- Esquema "api": lo único que PostgREST expone (db-schemas = "api").
-- Vistas con security_invoker = true para que las políticas RLS de 07_rls.sql
-- se evalúen con el rol de quien llama (no con el dueño de la vista).
-- ============================================================

GRANT USAGE ON SCHEMA api TO web_anon, app_profesional, app_admin;
GRANT USAGE ON SCHEMA app TO app_admin, app_profesional, app_maintenance;

-- ---------- Maestros ----------

CREATE VIEW api.municipios WITH (security_invoker = true) AS
  SELECT * FROM app.municipios;

CREATE VIEW api.grupos_responsabilidad WITH (security_invoker = true) AS
  SELECT * FROM app.grupo_responsabilidad;

CREATE VIEW api.subgrupos_responsabilidad WITH (security_invoker = true) AS
  SELECT * FROM app.subgrupo_responsabilidad;

CREATE VIEW api.responsabilidades WITH (security_invoker = true) AS
  SELECT * FROM app.responsabilidad;

CREATE VIEW api.profesionales WITH (security_invoker = true) AS
  SELECT * FROM app.profesionales;

CREATE VIEW api.clientes WITH (security_invoker = true) AS
  SELECT * FROM app.clientes;

-- ---------- Calendarios tributarios ----------

CREATE VIEW api.calendarios_tributarios WITH (security_invoker = true) AS
  SELECT * FROM app.calendario_tributario;

CREATE VIEW api.calendario_fechas WITH (security_invoker = true) AS
  SELECT * FROM app.calendario_fecha;

CREATE VIEW api.responsabilidad_calendario WITH (security_invoker = true) AS
  SELECT * FROM app.responsabilidad_calendario;

-- ---------- Movimiento ----------

CREATE VIEW api.responsabilidades_cliente WITH (security_invoker = true) AS
  SELECT * FROM app.responsabilidades_cliente;

CREATE VIEW api.asignaciones WITH (security_invoker = true) AS
  SELECT * FROM app.asignacion_cliente_profesional;

CREATE VIEW api.eventos WITH (security_invoker = true) AS
  SELECT * FROM app.eventos_calendario;

CREATE VIEW api.evidencias WITH (security_invoker = true) AS
  SELECT * FROM app.evidencias;

-- Vista enriquecida de solo lectura para el calendario y el dashboard: evita
-- que el frontend tenga que resolver los joins (cliente, responsabilidad,
-- profesional, año -derivado de responsabilidades_cliente-).
CREATE VIEW api.v_eventos WITH (security_invoker = true) AS
  SELECT
    ec.id_evento,
    ec.id_responsabilidad_cliente,
    ec.id_asignacion_cliente,
    rc.id_cliente,
    c.nombre        AS cliente_nombre,
    c.nit,
    rc.id_responsabilidad,
    r.nombre        AS responsabilidad_nombre,
    r.codigo_unico,
    r.tipo,
    r.sancion,
    rc.anio,
    ap.id_profesional,
    p.nombre        AS profesional_nombre,
    ec.periodo,
    ec.fecha_limite,
    ec.estado_evento
  FROM app.eventos_calendario ec
  JOIN app.responsabilidades_cliente rc ON rc.id_responsabilidad_cliente = ec.id_responsabilidad_cliente
  JOIN app.responsabilidad r ON r.id_responsabilidad = rc.id_responsabilidad
  JOIN app.clientes c ON c.id_cliente = rc.id_cliente
  JOIN app.asignacion_cliente_profesional ap ON ap.id_asignacion_cliente = ec.id_asignacion_cliente
  JOIN app.profesionales p ON p.id_profesional = ap.id_profesional;

-- Vista enriquecida de evidencias: cliente, responsabilidad y periodo
-- resueltos, para poder listarlas sin que el frontend arme los joins.
CREATE VIEW api.v_evidencias WITH (security_invoker = true) AS
  SELECT
    ev.id_evidencia,
    ev.id_evento,
    ev.id_profesional,
    p.nombre        AS profesional_nombre,
    ev.observaciones,
    ev.archivo_evidencia,
    ev.fecha_realizacion,
    ev.horas_dedicadas,
    ev.estado,
    ec.periodo,
    ec.fecha_limite,
    ec.estado_evento,
    rc.id_cliente,
    c.nombre        AS cliente_nombre,
    rc.id_responsabilidad,
    r.nombre        AS responsabilidad_nombre,
    rc.anio
  FROM app.evidencias ev
  JOIN app.profesionales p ON p.id_profesional = ev.id_profesional
  JOIN app.eventos_calendario ec ON ec.id_evento = ev.id_evento
  JOIN app.responsabilidades_cliente rc ON rc.id_responsabilidad_cliente = ec.id_responsabilidad_cliente
  JOIN app.responsabilidad r ON r.id_responsabilidad = rc.id_responsabilidad
  JOIN app.clientes c ON c.id_cliente = rc.id_cliente;

-- Resumen para el dashboard.
CREATE VIEW api.dashboard_resumen WITH (security_invoker = true) AS
  SELECT
    ap.id_profesional,
    p.nombre AS profesional_nombre,
    count(*) FILTER (WHERE ec.estado_evento = 'Pendiente')        AS pendientes,
    count(*) FILTER (WHERE ec.estado_evento = 'Vencido')          AS vencidos,
    count(*) FILTER (WHERE ec.estado_evento IN ('Realizado', 'Realizado vencido')) AS realizados,
    count(*) FILTER (WHERE ec.estado_evento = 'Cancelado')        AS cancelados
  FROM app.eventos_calendario ec
  JOIN app.asignacion_cliente_profesional ap ON ap.id_asignacion_cliente = ec.id_asignacion_cliente
  JOIN app.profesionales p ON p.id_profesional = ap.id_profesional
  GROUP BY ap.id_profesional, p.nombre;

-- ---------- Usuarios (cuentas de acceso, ver 03_auth.sql) ----------
-- Solo lectura desde PostgREST: crear/activar/desactivar usuarios se hace en
-- Cognito (presign-service, rutas /usuarios), que además refleja el cambio
-- aquí a través del rol app_user_sync (conexión directa, no vía PostgREST).
CREATE VIEW api.usuarios WITH (security_invoker = true) AS
  SELECT id_usuario, email, rol, id_profesional, activo, sub FROM app.usuarios;

-- ---------- RPC (envoltorios delgados sobre app.f_*) ----------

CREATE OR REPLACE FUNCTION api.asignar_cliente_profesional(cliente int, profesional int, anio int)
RETURNS app.asignacion_cliente_profesional AS $$
  SELECT * FROM app.f_asignar_cliente_profesional(cliente, profesional, anio);
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION api.generar_eventos(asignacion int, anio int) RETURNS int AS $$
  SELECT app.f_generar_eventos(asignacion, anio);
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION api.reasignar_profesional(cliente int, nuevo_profesional int)
RETURNS app.asignacion_cliente_profesional AS $$
  SELECT * FROM app.f_reasignar_profesional(cliente, nuevo_profesional);
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION api.registrar_evidencia(evento int, observaciones text, archivo text, horas numeric)
RETURNS app.evidencias AS $$
  SELECT * FROM app.f_registrar_evidencia(evento, observaciones, archivo, horas);
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION api.marcar_vencidos() RETURNS int AS $$
  SELECT app.f_marcar_vencidos();
$$ LANGUAGE sql;

-- ---------- Privilegios por rol ----------
--
-- IMPORTANTE: las vistas de "api" se crearon con security_invoker = true, por
-- lo que Postgres evalúa los privilegios (y las políticas RLS) del rol que
-- llama, no del dueño de la vista. Eso significa que además del GRANT sobre
-- la vista en "api" hace falta el GRANT equivalente sobre la tabla real en
-- "app". Las funciones de negocio (app.f_*) que son SECURITY DEFINER quedan
-- exceptuadas: se ejecutan con los privilegios de su dueño y no requieren
-- GRANT de tabla para quien las invoca, solo EXECUTE sobre la función.

-- app_admin: control total sobre maestros, calendarios y movimiento.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  app.municipios, app.grupo_responsabilidad, app.subgrupo_responsabilidad,
  app.responsabilidad, app.profesionales, app.clientes,
  app.calendario_tributario, app.calendario_fecha, app.responsabilidad_calendario,
  app.responsabilidades_cliente, app.evidencias
TO app_admin;

GRANT SELECT, UPDATE ON app.eventos_calendario TO app_admin;
GRANT SELECT, INSERT, UPDATE ON app.asignacion_cliente_profesional TO app_admin;

-- Usuarios: solo lectura desde PostgREST. Crear/activar/desactivar se hace
-- vía presign-service (rol app_user_sync), ver 03_auth.sql.
GRANT SELECT ON app.usuarios TO app_admin;

-- Las columnas "serial" necesitan además USAGE sobre su secuencia (si no, el
-- INSERT falla con "permission denied for sequence ..." al calcular el default).
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO app_admin;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  api.municipios, api.grupos_responsabilidad, api.subgrupos_responsabilidad,
  api.responsabilidades, api.profesionales, api.clientes,
  api.calendarios_tributarios, api.calendario_fechas, api.responsabilidad_calendario,
  api.responsabilidades_cliente, api.asignaciones, api.evidencias
TO app_admin;

GRANT SELECT, UPDATE ON api.eventos TO app_admin;
GRANT SELECT ON api.v_eventos, api.v_evidencias, api.dashboard_resumen TO app_admin;
GRANT SELECT ON api.usuarios TO app_admin;

GRANT EXECUTE ON FUNCTION api.asignar_cliente_profesional(int, int, int) TO app_admin;
GRANT EXECUTE ON FUNCTION api.generar_eventos(int, int) TO app_admin;
GRANT EXECUTE ON FUNCTION api.reasignar_profesional(int, int) TO app_admin;
GRANT EXECUTE ON FUNCTION api.marcar_vencidos() TO app_admin;
GRANT EXECUTE ON FUNCTION api.registrar_evidencia(int, text, text, numeric) TO app_admin;

GRANT EXECUTE ON FUNCTION app.f_asignar_cliente_profesional(int, int, int) TO app_admin;
GRANT EXECUTE ON FUNCTION app.f_generar_eventos(int, int) TO app_admin;
GRANT EXECUTE ON FUNCTION app.f_reasignar_profesional(int, int) TO app_admin;
GRANT EXECUTE ON FUNCTION app.f_marcar_vencidos() TO app_admin;
GRANT EXECUTE ON FUNCTION app.f_registrar_evidencia(int, text, text, numeric) TO app_admin, app_profesional;

-- app_profesional: solo lectura de maestros/calendarios (para armar formularios),
-- lectura de sus propios eventos/evidencias (filtrado por RLS en 07_rls.sql), y
-- la única acción de escritura permitida es registrar evidencia (vía RPC
-- SECURITY DEFINER, por eso no necesita INSERT directo sobre esas tablas).
GRANT SELECT ON
  app.municipios, app.grupo_responsabilidad, app.subgrupo_responsabilidad,
  app.responsabilidad, app.profesionales, app.clientes,
  app.calendario_tributario, app.calendario_fecha, app.responsabilidad_calendario,
  app.responsabilidades_cliente, app.asignacion_cliente_profesional,
  app.eventos_calendario, app.evidencias
TO app_profesional;

GRANT SELECT ON
  api.municipios, api.grupos_responsabilidad, api.subgrupos_responsabilidad,
  api.responsabilidades, api.profesionales, api.clientes,
  api.calendarios_tributarios, api.calendario_fechas, api.responsabilidad_calendario,
  api.responsabilidades_cliente, api.asignaciones, api.eventos, api.v_eventos,
  api.evidencias, api.v_evidencias, api.dashboard_resumen
TO app_profesional;

GRANT EXECUTE ON FUNCTION api.registrar_evidencia(int, text, text, numeric) TO app_profesional;
