-- ============================================================
-- Row Level Security: un profesional solo ve sus propios clientes asignados,
-- eventos y evidencias. app_admin ve y escribe todo (política USING true).
-- Los helpers app.current_profesional_id()/current_rol() leen los claims del
-- JWT (ver 03_auth.sql).
-- ============================================================

ALTER TABLE app.asignacion_cliente_profesional ENABLE ROW LEVEL SECURITY;

CREATE POLICY asignacion_admin_all ON app.asignacion_cliente_profesional
  FOR ALL TO app_admin USING (true) WITH CHECK (true);

CREATE POLICY asignacion_profesional_select ON app.asignacion_cliente_profesional
  FOR SELECT TO app_profesional
  USING (id_profesional = app.current_profesional_id());

ALTER TABLE app.responsabilidades_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY rc_admin_all ON app.responsabilidades_cliente
  FOR ALL TO app_admin USING (true) WITH CHECK (true);

-- Sin filtrar por estado = 'Activa': si no, al reasignar un cliente el
-- profesional anterior perdería visibilidad hasta de su propio historial
-- (v_eventos/v_evidencias hacen JOIN contra esta tabla, y RLS en un JOIN
-- oculta la fila completa si cualquiera de los lados no es visible).
CREATE POLICY rc_profesional_select ON app.responsabilidades_cliente
  FOR SELECT TO app_profesional
  USING (
    id_cliente IN (
      SELECT id_cliente FROM app.asignacion_cliente_profesional
      WHERE id_profesional = app.current_profesional_id()
    )
  );

ALTER TABLE app.eventos_calendario ENABLE ROW LEVEL SECURITY;

CREATE POLICY eventos_admin_all ON app.eventos_calendario
  FOR ALL TO app_admin USING (true) WITH CHECK (true);

CREATE POLICY eventos_profesional_select ON app.eventos_calendario
  FOR SELECT TO app_profesional
  USING (
    id_asignacion_cliente IN (
      SELECT id_asignacion_cliente FROM app.asignacion_cliente_profesional
      WHERE id_profesional = app.current_profesional_id()
    )
  );

ALTER TABLE app.evidencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY evidencias_admin_all ON app.evidencias
  FOR ALL TO app_admin USING (true) WITH CHECK (true);

CREATE POLICY evidencias_profesional_select ON app.evidencias
  FOR SELECT TO app_profesional
  USING (id_profesional = app.current_profesional_id());

-- Nota: los cambios de estado del evento y la creación de evidencia por parte
-- del profesional NO pasan por estas policies de UPDATE/INSERT (no se otorgan
-- a app_profesional) sino por app.f_registrar_evidencia(), que es
-- SECURITY DEFINER y por lo tanto se ejecuta con los privilegios del dueño de
-- la función (bypassa RLS de forma controlada, solo para esa operación
-- puntual y siempre validando primero las reglas 5 y 6).
