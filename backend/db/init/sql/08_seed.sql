-- ============================================================
-- Datos de ejemplo: reproducen el recorrido completo del documento fuente
-- (Fases A, B y C) más los calendarios tributarios 2026 necesarios para que
-- la generación automática de eventos funcione de punta a punta.
--
-- Las fechas del calendario se dividieron en dos grupos por terminación de
-- NIT (0-4 / 5-9) para demostrar que el mecanismo por dígitos del NIT
-- realmente cambia la fecha límite; el cliente de ejemplo (NIT terminado en
-- 6) recibe exactamente las fechas del documento original.
-- ============================================================

-- ---------- Fase A: maestros ----------

INSERT INTO app.municipios (cod_municipio, nombre) VALUES
  ('05001', 'Medellín'),
  ('11001', 'Bogotá D.C.'),
  ('76001', 'Cali');

INSERT INTO app.grupo_responsabilidad (nombre, tipo) VALUES
  ('Tributario', 'Nacional'), ('Comercial', 'Departamental'), ('Legal', 'Municipal');

INSERT INTO app.subgrupo_responsabilidad (id_grupo, nombre) VALUES
  ((SELECT id_grupo FROM app.grupo_responsabilidad WHERE tipo = 'Nacional'), 'Renta y Patrimonio'),
  ((SELECT id_grupo FROM app.grupo_responsabilidad WHERE tipo = 'Nacional'), 'IVA'),
  ((SELECT id_grupo FROM app.grupo_responsabilidad WHERE tipo = 'Nacional'), 'Retención en la Fuente'),
  ((SELECT id_grupo FROM app.grupo_responsabilidad WHERE tipo = 'Nacional'), 'Facturación Electrónica'),
  ((SELECT id_grupo FROM app.grupo_responsabilidad WHERE tipo = 'Municipal'), 'ICA');

INSERT INTO app.responsabilidad
  (auto_numero, codigo_dian, codigo_formulario, nombre, id_subgrupo, cod_municipio, tipo, sancion)
VALUES
  ('0001', '48', '300', 'IVA Responsable',
    (SELECT id_subgrupo FROM app.subgrupo_responsabilidad WHERE nombre = 'IVA'), '11001', 'Obligatoria', true),
  ('0002', '07', '350', 'Retención en la Fuente',
    (SELECT id_subgrupo FROM app.subgrupo_responsabilidad WHERE nombre = 'Retención en la Fuente'), '11001', 'Obligatoria', true),
  ('0003', '05', '110', 'Renta Régimen Ordinario',
    (SELECT id_subgrupo FROM app.subgrupo_responsabilidad WHERE nombre = 'Renta y Patrimonio'), '11001', 'Obligatoria', true),
  ('0004', '52', '010', 'Facturador Electrónico',
    (SELECT id_subgrupo FROM app.subgrupo_responsabilidad WHERE nombre = 'Facturación Electrónica'), '11001', 'Obligatoria', false);

INSERT INTO app.profesionales (nombre, email, telefono) VALUES
  ('Laura Gómez', 'laura.gomez@example.com', '3001112233'),
  ('Andrés Ruiz', 'andres.ruiz@example.com', '3002223344');

INSERT INTO app.clientes (nombre, nit, digito_verificacion, direccion, telefono, cod_municipio) VALUES
  ('Empresa ABC S.A.S.', 900123456, 7, 'Cra 7 # 10-20', '6015551212', '11001'),
  -- Segundo cliente, mismo perfil, NIT con terminación distinta (2 en vez de 6):
  -- sirve para probar que el calendario le asigna OTRA fecha (grupo 0-4).
  ('Comercial XYZ Ltda.', 900654322, 1, 'Cl 50 # 20-30', '6015553434', '11001');

-- ---------- Calendarios tributarios 2026 (nacionales, 1 dígito del NIT) ----------

INSERT INTO app.calendario_tributario (nombre, anio, ambito, digitos_nit) VALUES
  ('DIAN - IVA Bimestral 2026', 2026, 'Nacional', 1),
  ('DIAN - Retención en la Fuente Mensual 2026', 2026, 'Nacional', 1),
  ('DIAN - Renta Personas Jurídicas 2026', 2026, 'Nacional', 1),
  ('DIAN - Facturación Electrónica 2026', 2026, 'Nacional', 1);

-- IVA Bimestral: grupo 0-4 y grupo 5-9 por bimestre.
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, v.nit_desde, v.nit_hasta, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Bimestre 1 (Ene-Feb)', 0, 4, DATE '2026-03-11'),
  ('Bimestre 1 (Ene-Feb)', 5, 9, DATE '2026-03-12'),
  ('Bimestre 2 (Mar-Abr)', 0, 4, DATE '2026-05-12'),
  ('Bimestre 2 (Mar-Abr)', 5, 9, DATE '2026-05-13'),
  ('Bimestre 3 (May-Jun)', 0, 4, DATE '2026-07-12'),
  ('Bimestre 3 (May-Jun)', 5, 9, DATE '2026-07-13')
) AS v(periodo, nit_desde, nit_hasta, fecha_limite)
WHERE nombre = 'DIAN - IVA Bimestral 2026';

-- Retención en la fuente mensual.
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, v.nit_desde, v.nit_hasta, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Enero', 0, 4, DATE '2026-02-10'),
  ('Enero', 5, 9, DATE '2026-02-11'),
  ('Febrero', 0, 4, DATE '2026-03-10'),
  ('Febrero', 5, 9, DATE '2026-03-11')
) AS v(periodo, nit_desde, nit_hasta, fecha_limite)
WHERE nombre = 'DIAN - Retención en la Fuente Mensual 2026';

-- Renta personas jurídicas (por cuotas).
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, v.nit_desde, v.nit_hasta, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Primera cuota', 0, 4, DATE '2026-04-13'),
  ('Primera cuota', 5, 9, DATE '2026-04-14')
) AS v(periodo, nit_desde, nit_hasta, fecha_limite)
WHERE nombre = 'DIAN - Renta Personas Jurídicas 2026';

-- Reporte de facturación electrónica.
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, v.nit_desde, v.nit_hasta, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Mayo', 0, 4, DATE '2026-06-09'),
  ('Mayo', 5, 9, DATE '2026-06-10')
) AS v(periodo, nit_desde, nit_hasta, fecha_limite)
WHERE nombre = 'DIAN - Facturación Electrónica 2026';

-- Asociar cada responsabilidad con su calendario 2026.
INSERT INTO app.responsabilidad_calendario (id_responsabilidad, anio, id_calendario)
SELECT r.id_responsabilidad, 2026, c.id_calendario
FROM app.responsabilidad r
JOIN app.calendario_tributario c ON c.anio = 2026
WHERE (r.codigo_dian = '48' AND c.nombre = 'DIAN - IVA Bimestral 2026')
   OR (r.codigo_dian = '07' AND c.nombre = 'DIAN - Retención en la Fuente Mensual 2026')
   OR (r.codigo_dian = '05' AND c.nombre = 'DIAN - Renta Personas Jurídicas 2026')
   OR (r.codigo_dian = '52' AND c.nombre = 'DIAN - Facturación Electrónica 2026');

-- ---------- Fase B: responsabilidades del cliente + asignación (Pasos 7-8) ----------

INSERT INTO app.responsabilidades_cliente (id_cliente, id_responsabilidad, anio)
SELECT c.id_cliente, r.id_responsabilidad, 2026
FROM app.clientes c
CROSS JOIN app.responsabilidad r
WHERE c.nombre = 'Empresa ABC S.A.S.';

INSERT INTO app.responsabilidades_cliente (id_cliente, id_responsabilidad, anio)
SELECT c.id_cliente, r.id_responsabilidad, 2026
FROM app.clientes c
CROSS JOIN app.responsabilidad r
WHERE c.nombre = 'Comercial XYZ Ltda.';

-- Asignar cliente a profesional dispara automáticamente la generación de
-- eventos (Paso 8 -> Paso 9, Reglas 1, 2, 3 y 7).
SELECT app.f_asignar_cliente_profesional(
  (SELECT id_cliente FROM app.clientes WHERE nombre = 'Empresa ABC S.A.S.'),
  (SELECT id_profesional FROM app.profesionales WHERE nombre = 'Laura Gómez'),
  2026
);

SELECT app.f_asignar_cliente_profesional(
  (SELECT id_cliente FROM app.clientes WHERE nombre = 'Comercial XYZ Ltda.'),
  (SELECT id_profesional FROM app.profesionales WHERE nombre = 'Andrés Ruiz'),
  2026
);

-- ---------- Fase C: trazabilidad del evento "IVA Bimestre 1" (Paso 10) ----------

SELECT app.f_registrar_evidencia(
  (SELECT ec.id_evento
     FROM app.eventos_calendario ec
     JOIN app.responsabilidades_cliente rc ON rc.id_responsabilidad_cliente = ec.id_responsabilidad_cliente
     JOIN app.clientes c ON c.id_cliente = rc.id_cliente
     WHERE c.nombre = 'Empresa ABC S.A.S.' AND ec.periodo = 'Bimestre 1 (Ene-Feb)'),
  'Declaración presentada y pagada en banco BBVA',
  'declaracion_iva_bim1_2026.pdf',
  3.5
);

-- ---------- Usuarios de acceso (ver 03_auth.sql) ----------
-- El "sub" es el identificador del usuario en el User Pool de Cognito
-- (arn:aws:cognito-idp:us-east-1:713881794009:userpool/us-east-1_6wQOXsKSx,
-- ver backend/db/README.md). Si este seed se usa con OTRO User Pool, hay que
-- crear los usuarios ahí primero (AWS CLI: admin-create-user +
-- admin-set-user-password + admin-add-user-to-group) y reemplazar estos
-- valores por los "sub" reales que devuelva Cognito.

INSERT INTO app.usuarios (sub, email, rol, id_profesional) VALUES
  ('c4485468-d0b1-708a-4c18-d0b3a84e6e44', 'admin@responsabilidades.local', 'app_admin', NULL),
  ('741834e8-d0d1-704f-f017-fc5c08d69f1c', 'laura.gomez@example.com', 'app_profesional',
    (SELECT id_profesional FROM app.profesionales WHERE nombre = 'Laura Gómez')),
  ('e4782458-0091-7029-2f53-85704c1379cd', 'andres.ruiz@example.com', 'app_profesional',
    (SELECT id_profesional FROM app.profesionales WHERE nombre = 'Andrés Ruiz'));
