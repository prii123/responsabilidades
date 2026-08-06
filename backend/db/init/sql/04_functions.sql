-- ============================================================
-- Funciones de negocio (esquema app, privadas). 06_api.sql expone envoltorios
-- de estas como RPC de PostgREST (POST /rpc/...).
-- ============================================================

-- Resuelve y crea los eventos Pendiente de una asignación cliente-profesional:
-- para cada responsabilidad ACTIVA del cliente en el año de la asignación,
-- busca su calendario tributario vigente y, según los últimos dígitos del NIT
-- del cliente (sin dígito de verificación), crea un evento por cada periodo
-- con la fecha límite que le corresponde. (Reglas 3 y 7)
CREATE OR REPLACE FUNCTION app.f_generar_eventos(p_id_asignacion int) RETURNS int AS $$
DECLARE
  v_cliente int;
  v_anio    int;
  v_nit     bigint;
  r         RECORD;
  v_id_calendario int;
  v_digitos       smallint;
  v_terminacion   int;
  v_creados       int := 0;
BEGIN
  SELECT id_cliente, anio INTO v_cliente, v_anio
  FROM app.asignacion_cliente_profesional
  WHERE id_asignacion_cliente = p_id_asignacion;

  IF v_cliente IS NULL THEN
    RAISE EXCEPTION 'Asignación % no existe', p_id_asignacion;
  END IF;

  SELECT nit INTO v_nit FROM app.clientes WHERE id_cliente = v_cliente;

  FOR r IN
    SELECT rc.id_responsabilidad_cliente, rc.id_responsabilidad
    FROM app.responsabilidades_cliente rc
    WHERE rc.id_cliente = v_cliente AND rc.anio = v_anio AND rc.estado = 'Activa'
  LOOP
    SELECT rcal.id_calendario, cal.digitos_nit
      INTO v_id_calendario, v_digitos
    FROM app.responsabilidad_calendario rcal
    JOIN app.calendario_tributario cal ON cal.id_calendario = rcal.id_calendario
    WHERE rcal.id_responsabilidad = r.id_responsabilidad AND rcal.anio = v_anio;

    IF v_id_calendario IS NULL THEN
      RAISE EXCEPTION 'Falta cargar el calendario tributario % para la responsabilidad % (id %). Cárguelo en el módulo Calendarios antes de asignar el cliente.',
        v_anio, r.id_responsabilidad, r.id_responsabilidad;
    END IF;

    v_terminacion := v_nit % (10 ^ v_digitos)::int;

    INSERT INTO app.eventos_calendario
      (id_responsabilidad_cliente, id_asignacion_cliente, periodo, fecha_limite, estado_evento)
    SELECT r.id_responsabilidad_cliente, p_id_asignacion, cf.periodo, cf.fecha_limite, 'Pendiente'
    FROM app.calendario_fecha cf
    WHERE cf.id_calendario = v_id_calendario
      AND v_terminacion BETWEEN cf.nit_desde AND cf.nit_hasta
    ON CONFLICT (id_responsabilidad_cliente, periodo) DO NOTHING;

    GET DIAGNOSTICS v_creados = ROW_COUNT;
  END LOOP;

  RETURN v_creados;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Asigna un cliente a un profesional para un año. La Regla 1 (cliente sin
-- responsabilidades no se puede asignar) se valida en el trigger de la tabla
-- (05_triggers.sql) para que aplique también a INSERT directos. Aquí, además,
-- se generan automáticamente los eventos del calendario (Regla 3).
CREATE OR REPLACE FUNCTION app.f_asignar_cliente_profesional(
  p_cliente int, p_profesional int, p_anio int
) RETURNS app.asignacion_cliente_profesional AS $$
DECLARE
  v_row app.asignacion_cliente_profesional;
BEGIN
  INSERT INTO app.asignacion_cliente_profesional (id_cliente, id_profesional, anio)
  VALUES (p_cliente, p_profesional, p_anio)
  RETURNING * INTO v_row;

  PERFORM app.f_generar_eventos(v_row.id_asignacion_cliente);

  RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Registra la evidencia de un evento y lo pasa a Realizado (o "Realizado
-- vencido" si ya se había pasado la fecha límite). Regla 5: solo así un evento
-- puede llegar a Realizado (no hay otra vía: el UPDATE directo del estado a
-- Realizado está bloqueado por el trigger de 05_triggers.sql).
CREATE OR REPLACE FUNCTION app.f_registrar_evidencia(
  p_evento int, p_observaciones text, p_archivo text, p_horas numeric
) RETURNS app.evidencias AS $$
DECLARE
  v_profesional  int;
  v_fecha_limite date;
  v_estado_evento text;
  v_row app.evidencias;
BEGIN
  SELECT fecha_limite, estado_evento INTO v_fecha_limite, v_estado_evento
  FROM app.eventos_calendario WHERE id_evento = p_evento;

  IF v_fecha_limite IS NULL THEN
    RAISE EXCEPTION 'El evento % no existe', p_evento;
  END IF;

  IF v_estado_evento IN ('Realizado', 'Cancelado', 'Realizado vencido') THEN
    RAISE EXCEPTION 'El evento % ya está en estado final (%) y no admite nueva evidencia', p_evento, v_estado_evento;
  END IF;

  v_profesional := app.current_profesional_id();
  IF v_profesional IS NULL THEN
    -- admin registrando en nombre de un profesional: exige que lo indique como
    -- responsable en el propio evento vía la asignación asociada.
    SELECT ap.id_profesional INTO v_profesional
    FROM app.eventos_calendario ec
    JOIN app.asignacion_cliente_profesional ap ON ap.id_asignacion_cliente = ec.id_asignacion_cliente
    WHERE ec.id_evento = p_evento;
  END IF;

  INSERT INTO app.evidencias (id_evento, id_profesional, observaciones, archivo_evidencia, horas_dedicadas)
  VALUES (p_evento, v_profesional, p_observaciones, p_archivo, p_horas)
  RETURNING * INTO v_row;

  UPDATE app.eventos_calendario
  SET estado_evento = CASE WHEN current_date > v_fecha_limite THEN 'Realizado vencido' ELSE 'Realizado' END
  WHERE id_evento = p_evento;

  RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mantenimiento periódico (lo invoca el contenedor "scheduler"): pasa a
-- Vencido los eventos Pendiente cuya fecha límite ya se cumplió. (Regla 4)
CREATE OR REPLACE FUNCTION app.f_marcar_vencidos() RETURNS int AS $$
DECLARE v_afectados int;
BEGIN
  UPDATE app.eventos_calendario
  SET estado_evento = 'Vencido'
  WHERE estado_evento = 'Pendiente' AND fecha_limite < current_date;

  GET DIAGNOSTICS v_afectados = ROW_COUNT;
  RETURN v_afectados;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION app.f_marcar_vencidos() TO app_maintenance;
