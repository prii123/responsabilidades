-- ============================================================
-- Triggers: las 7 reglas del negocio, aplicadas a nivel de estructura para que
-- valgan sin importar por dónde entre el dato (RPC, PostgREST directo, admin SQL).
-- ============================================================

-- Regla 1: un cliente no puede asignarse a un profesional si no tiene al menos
-- una responsabilidad ACTIVA para ese mismo año.
CREATE OR REPLACE FUNCTION app.trg_asignacion_regla1() RETURNS trigger AS $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM app.responsabilidades_cliente
  WHERE id_cliente = NEW.id_cliente AND anio = NEW.anio AND estado = 'Activa';

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Regla 1: el cliente % no tiene responsabilidades activas para %, no se puede asignar a un profesional',
      NEW.id_cliente, NEW.anio;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_asignacion_regla1
  BEFORE INSERT ON app.asignacion_cliente_profesional
  FOR EACH ROW EXECUTE FUNCTION app.trg_asignacion_regla1();

-- Nota Regla 2 ("toda responsabilidad del cliente queda con profesional
-- responsable"): se cumple por construcción, ya que la asignación es a nivel
-- de cliente-año (no por responsabilidad individual): al asignar el cliente,
-- f_generar_eventos cubre TODAS sus responsabilidades activas de ese año.

-- Coherencia: un evento debe pertenecer al mismo cliente y año en su FK a
-- responsabilidades_cliente y en su FK a la asignación (evita mezclar datos
-- de asignaciones/clientes distintos aunque alguien inserte a mano).
CREATE OR REPLACE FUNCTION app.trg_evento_coherencia() RETURNS trigger AS $$
DECLARE
  v_cliente_rc int; v_anio_rc int;
  v_cliente_asig int; v_anio_asig int;
BEGIN
  SELECT id_cliente, anio INTO v_cliente_rc, v_anio_rc
  FROM app.responsabilidades_cliente WHERE id_responsabilidad_cliente = NEW.id_responsabilidad_cliente;

  SELECT id_cliente, anio INTO v_cliente_asig, v_anio_asig
  FROM app.asignacion_cliente_profesional WHERE id_asignacion_cliente = NEW.id_asignacion_cliente;

  IF v_cliente_rc IS DISTINCT FROM v_cliente_asig OR v_anio_rc IS DISTINCT FROM v_anio_asig THEN
    RAISE EXCEPTION 'El evento mezcla una responsabilidad de cliente/año (%,%) con una asignación de cliente/año (%,%)',
      v_cliente_rc, v_anio_rc, v_cliente_asig, v_anio_asig;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_evento_coherencia
  BEFORE INSERT OR UPDATE ON app.eventos_calendario
  FOR EACH ROW EXECUTE FUNCTION app.trg_evento_coherencia();

-- Reglas 4, 5 y 6: máquina de estados del evento.
--  - Realizado y Cancelado (y Realizado vencido) son finales: no pueden cambiar.
--  - El estado no puede saltar directo a Realizado/Realizado vencido por un
--    UPDATE normal: solo app.f_registrar_evidencia() (SECURITY DEFINER) puede
--    hacerlo, porque exige evidencia (Regla 5). Se detecta permitiendo el
--    cambio únicamente cuando ya existe una evidencia para ese evento.
CREATE OR REPLACE FUNCTION app.trg_eventos_estado() RETURNS trigger AS $$
DECLARE v_tiene_evidencia boolean;
BEGIN
  IF OLD.estado_evento IN ('Realizado', 'Cancelado', 'Realizado vencido') AND NEW.estado_evento <> OLD.estado_evento THEN
    RAISE EXCEPTION 'Regla 6: el evento % está en estado final (%) y no puede cambiar de estado',
      OLD.id_evento, OLD.estado_evento;
  END IF;

  IF NEW.estado_evento IN ('Realizado', 'Realizado vencido') AND OLD.estado_evento <> NEW.estado_evento THEN
    SELECT EXISTS (SELECT 1 FROM app.evidencias WHERE id_evento = NEW.id_evento) INTO v_tiene_evidencia;
    IF NOT v_tiene_evidencia THEN
      RAISE EXCEPTION 'Regla 5: el evento % solo puede marcarse Realizado registrando evidencia (use /rpc/registrar_evidencia)',
        NEW.id_evento;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_eventos_estado
  BEFORE UPDATE ON app.eventos_calendario
  FOR EACH ROW EXECUTE FUNCTION app.trg_eventos_estado();

-- Si se desactiva una responsabilidad del cliente a mitad de año, sus eventos
-- Pendiente dejan de tener sentido: se cancelan automáticamente.
CREATE OR REPLACE FUNCTION app.trg_rc_cancela_eventos() RETURNS trigger AS $$
BEGIN
  IF NEW.estado = 'Inactiva' AND OLD.estado = 'Activa' THEN
    UPDATE app.eventos_calendario
    SET estado_evento = 'Cancelado'
    WHERE id_responsabilidad_cliente = NEW.id_responsabilidad_cliente AND estado_evento = 'Pendiente';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rc_cancela_eventos
  AFTER UPDATE ON app.responsabilidades_cliente
  FOR EACH ROW EXECUTE FUNCTION app.trg_rc_cancela_eventos();
