-- ============================================================
-- Datos de ejemplo: reproducen el recorrido completo del documento fuente
-- (Fases A, B y C) más los calendarios tributarios 2026 necesarios para que
-- la generación automática de eventos funcione de punta a punta.
--
-- Los calendarios de IVA Bimestral, Retención en la Fuente y Renta Personas
-- Jurídicas usan las fechas reales y completas (una por cada dígito 0-9 del
-- NIT) del calendario tributario oficial de la DIAN para 2026
-- ("Calendario_Tributario_2026.pdf"). Los dos clientes de ejemplo (NIT
-- terminados en 6 y en 2) reciben cada uno la fecha que le corresponde según
-- ese calendario real.
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
  ((SELECT id_grupo FROM app.grupo_responsabilidad WHERE tipo = 'Nacional'), 'Régimen Simple (RST)'),
  ((SELECT id_grupo FROM app.grupo_responsabilidad WHERE tipo = 'Nacional'), 'Precios de Transferencia'),
  ((SELECT id_grupo FROM app.grupo_responsabilidad WHERE tipo = 'Nacional'), 'Presencia Económica Significativa'),
  ((SELECT id_grupo FROM app.grupo_responsabilidad WHERE tipo = 'Nacional'), 'Impuesto Nacional al Consumo'),
  ((SELECT id_grupo FROM app.grupo_responsabilidad WHERE tipo = 'Nacional'), 'Impuestos Verdes y Saludables'),
  ((SELECT id_grupo FROM app.grupo_responsabilidad WHERE tipo = 'Nacional'), 'Cumplimiento Formal'),
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

-- Resto de obligaciones del calendario DIAN 2026 (Calendario_Tributario_2026.pdf).
-- codigo_dian aquí es solo una categorización interna de este sistema (no se
-- valida contra el RUT real): para las responsabilidades más conocidas se usó
-- el código real de responsabilidad del RUT (02, 05, 07, 08, 48, 52...); para
-- las más nuevas o menos documentadas (PES, impuestos verdes/saludables,
-- informe país por país, RUB) se usó un código de texto como marcador —
-- conviene que el contador los verifique/ajuste antes de usarlos para algo
-- más que categorizar internamente. Las FECHAS sí están verificadas contra
-- el PDF oficial.
INSERT INTO app.responsabilidad
  (auto_numero, codigo_dian, codigo_formulario, nombre, id_subgrupo, cod_municipio, tipo, sancion)
VALUES
  ('0005', '02', '110', 'Renta Grandes Contribuyentes',
    (SELECT id_subgrupo FROM app.subgrupo_responsabilidad WHERE nombre = 'Renta y Patrimonio'), '11001', 'Obligatoria', true),
  ('0006', '05', '210', 'Renta Personas Naturales',
    (SELECT id_subgrupo FROM app.subgrupo_responsabilidad WHERE nombre = 'Renta y Patrimonio'), '11001', 'Obligatoria', true),
  ('0007', '48', '300', 'IVA Cuatrimestral',
    (SELECT id_subgrupo FROM app.subgrupo_responsabilidad WHERE nombre = 'IVA'), '11001', 'Obligatoria', true),
  ('0008', '50', '420', 'Impuesto al Patrimonio',
    (SELECT id_subgrupo FROM app.subgrupo_responsabilidad WHERE nombre = 'Renta y Patrimonio'), '11001', 'Obligatoria', true),
  ('0009', '47', '260', 'RST - Declaración Anual Consolidada',
    (SELECT id_subgrupo FROM app.subgrupo_responsabilidad WHERE nombre = 'Régimen Simple (RST)'), '11001', 'Obligatoria', true),
  ('0010', '47', '260-IVA', 'RST - Consolidada de IVA',
    (SELECT id_subgrupo FROM app.subgrupo_responsabilidad WHERE nombre = 'Régimen Simple (RST)'), '11001', 'Obligatoria', true),
  ('0011', '47', '2593', 'RST - Anticipo Bimestral',
    (SELECT id_subgrupo FROM app.subgrupo_responsabilidad WHERE nombre = 'Régimen Simple (RST)'), '11001', 'Obligatoria', true),
  ('0012', '14', '120', 'Precios de Transferencia - Declaración Informativa',
    (SELECT id_subgrupo FROM app.subgrupo_responsabilidad WHERE nombre = 'Precios de Transferencia'), '11001', 'Obligatoria', true),
  ('0013', '14', '130', 'Precios de Transferencia - Documentación Comprobatoria',
    (SELECT id_subgrupo FROM app.subgrupo_responsabilidad WHERE nombre = 'Precios de Transferencia'), '11001', 'Obligatoria', true),
  ('0014', 'CBC', 'CbC', 'Informe País por País',
    (SELECT id_subgrupo FROM app.subgrupo_responsabilidad WHERE nombre = 'Precios de Transferencia'), '11001', 'Obligatoria', true),
  ('0015', 'PES', '490', 'PES - Pagos Anticipados Bimestrales',
    (SELECT id_subgrupo FROM app.subgrupo_responsabilidad WHERE nombre = 'Presencia Económica Significativa'), '11001', 'Obligatoria', true),
  ('0016', 'PES', '160', 'PES - Declaración Anual',
    (SELECT id_subgrupo FROM app.subgrupo_responsabilidad WHERE nombre = 'Presencia Económica Significativa'), '11001', 'Obligatoria', true),
  ('0017', '35', '310', 'Impuesto Nacional al Consumo',
    (SELECT id_subgrupo FROM app.subgrupo_responsabilidad WHERE nombre = 'Impuesto Nacional al Consumo'), '11001', 'Obligatoria', true),
  ('0018', '06', '160', 'Activos en el Exterior',
    (SELECT id_subgrupo FROM app.subgrupo_responsabilidad WHERE nombre = 'Renta y Patrimonio'), '11001', 'Obligatoria', true),
  ('0019', '33', '350-GAS', 'Impuesto Nacional a la Gasolina y ACPM',
    (SELECT id_subgrupo FROM app.subgrupo_responsabilidad WHERE nombre = 'Impuestos Verdes y Saludables'), '11001', 'Obligatoria', true),
  ('0020', '55', '490-CO2', 'Impuesto Nacional al Carbono',
    (SELECT id_subgrupo FROM app.subgrupo_responsabilidad WHERE nombre = 'Impuestos Verdes y Saludables'), '11001', 'Obligatoria', true),
  ('0021', '37', '325', 'IVA Servicios desde el Exterior',
    (SELECT id_subgrupo FROM app.subgrupo_responsabilidad WHERE nombre = 'IVA'), '11001', 'Obligatoria', true),
  ('0022', 'PLAST', '490-PLA', 'Productos Plásticos de un Solo Uso',
    (SELECT id_subgrupo FROM app.subgrupo_responsabilidad WHERE nombre = 'Impuestos Verdes y Saludables'), '11001', 'Obligatoria', true),
  ('0023', 'SALUD', '490-BEB', 'Bebidas y Alimentos Ultraprocesados',
    (SELECT id_subgrupo FROM app.subgrupo_responsabilidad WHERE nombre = 'Impuestos Verdes y Saludables'), '11001', 'Obligatoria', true),
  ('0024', 'RUB', 'RUB', 'RUB - Actualización de Beneficiarios Finales',
    (SELECT id_subgrupo FROM app.subgrupo_responsabilidad WHERE nombre = 'Cumplimiento Formal'), '11001', 'Obligatoria', true);

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
  ('DIAN - Facturación Electrónica 2026', 2026, 'Nacional', 1),
  ('DIAN - Renta Grandes Contribuyentes 2026', 2026, 'Nacional', 1),
  -- Único calendario con 2 dígitos: la tabla oficial agrupa el NIT en pares
  -- de terminación (00-99), no en un solo dígito.
  ('DIAN - Renta Personas Naturales 2026', 2026, 'Nacional', 2),
  ('DIAN - IVA Cuatrimestral 2026', 2026, 'Nacional', 1),
  ('DIAN - Patrimonio 2026', 2026, 'Nacional', 1),
  ('DIAN - RST Declaracion Anual 2026', 2026, 'Nacional', 1),
  ('DIAN - RST Consolidada IVA 2026', 2026, 'Nacional', 1),
  ('DIAN - RST Anticipo Bimestral 2026', 2026, 'Nacional', 1),
  ('DIAN - Precios de Transferencia 2026', 2026, 'Nacional', 1),
  ('DIAN - Informe Pais por Pais 2026', 2026, 'Nacional', 1),
  ('DIAN - PES Pagos Anticipados 2026', 2026, 'Nacional', 1),
  ('DIAN - PES Declaracion Anual 2026', 2026, 'Nacional', 1),
  ('DIAN - Gasolina y ACPM 2026', 2026, 'Nacional', 1),
  ('DIAN - Carbono 2026', 2026, 'Nacional', 1),
  ('DIAN - IVA Servicios Exterior 2026', 2026, 'Nacional', 1),
  ('DIAN - Productos Plasticos 2026', 2026, 'Nacional', 1),
  ('DIAN - Bebidas Ultraprocesadas 2026', 2026, 'Nacional', 1),
  ('DIAN - RUB 2026', 2026, 'Nacional', 1);

-- IVA Bimestral: un dígito exacto del NIT por fila (calendario oficial DIAN
-- 2026, "Calendario_Tributario_2026.pdf" — resolución 000230 de 2025).
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, v.nit, v.nit, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Bimestre 1 (Ene-Feb)', 0, DATE '2026-03-24'), ('Bimestre 1 (Ene-Feb)', 1, DATE '2026-03-10'),
  ('Bimestre 1 (Ene-Feb)', 2, DATE '2026-03-11'), ('Bimestre 1 (Ene-Feb)', 3, DATE '2026-03-12'),
  ('Bimestre 1 (Ene-Feb)', 4, DATE '2026-03-13'), ('Bimestre 1 (Ene-Feb)', 5, DATE '2026-03-16'),
  ('Bimestre 1 (Ene-Feb)', 6, DATE '2026-03-17'), ('Bimestre 1 (Ene-Feb)', 7, DATE '2026-03-18'),
  ('Bimestre 1 (Ene-Feb)', 8, DATE '2026-03-19'), ('Bimestre 1 (Ene-Feb)', 9, DATE '2026-03-20'),

  ('Bimestre 2 (Mar-Abr)', 0, DATE '2026-05-26'), ('Bimestre 2 (Mar-Abr)', 1, DATE '2026-05-12'),
  ('Bimestre 2 (Mar-Abr)', 2, DATE '2026-05-13'), ('Bimestre 2 (Mar-Abr)', 3, DATE '2026-05-14'),
  ('Bimestre 2 (Mar-Abr)', 4, DATE '2026-05-15'), ('Bimestre 2 (Mar-Abr)', 5, DATE '2026-05-19'),
  ('Bimestre 2 (Mar-Abr)', 6, DATE '2026-05-20'), ('Bimestre 2 (Mar-Abr)', 7, DATE '2026-05-21'),
  ('Bimestre 2 (Mar-Abr)', 8, DATE '2026-05-22'), ('Bimestre 2 (Mar-Abr)', 9, DATE '2026-05-25'),

  ('Bimestre 3 (May-Jun)', 0, DATE '2026-07-24'), ('Bimestre 3 (May-Jun)', 1, DATE '2026-07-09'),
  ('Bimestre 3 (May-Jun)', 2, DATE '2026-07-10'), ('Bimestre 3 (May-Jun)', 3, DATE '2026-07-14'),
  ('Bimestre 3 (May-Jun)', 4, DATE '2026-07-15'), ('Bimestre 3 (May-Jun)', 5, DATE '2026-07-16'),
  ('Bimestre 3 (May-Jun)', 6, DATE '2026-07-17'), ('Bimestre 3 (May-Jun)', 7, DATE '2026-07-21'),
  ('Bimestre 3 (May-Jun)', 8, DATE '2026-07-22'), ('Bimestre 3 (May-Jun)', 9, DATE '2026-07-23'),

  ('Bimestre 4 (Jul-Ago)', 0, DATE '2026-09-22'), ('Bimestre 4 (Jul-Ago)', 1, DATE '2026-09-09'),
  ('Bimestre 4 (Jul-Ago)', 2, DATE '2026-09-10'), ('Bimestre 4 (Jul-Ago)', 3, DATE '2026-09-11'),
  ('Bimestre 4 (Jul-Ago)', 4, DATE '2026-09-14'), ('Bimestre 4 (Jul-Ago)', 5, DATE '2026-09-15'),
  ('Bimestre 4 (Jul-Ago)', 6, DATE '2026-09-16'), ('Bimestre 4 (Jul-Ago)', 7, DATE '2026-09-17'),
  ('Bimestre 4 (Jul-Ago)', 8, DATE '2026-09-18'), ('Bimestre 4 (Jul-Ago)', 9, DATE '2026-09-21'),

  ('Bimestre 5 (Sep-Oct)', 0, DATE '2026-11-25'), ('Bimestre 5 (Sep-Oct)', 1, DATE '2026-11-11'),
  ('Bimestre 5 (Sep-Oct)', 2, DATE '2026-11-12'), ('Bimestre 5 (Sep-Oct)', 3, DATE '2026-11-13'),
  ('Bimestre 5 (Sep-Oct)', 4, DATE '2026-11-17'), ('Bimestre 5 (Sep-Oct)', 5, DATE '2026-11-18'),
  ('Bimestre 5 (Sep-Oct)', 6, DATE '2026-11-19'), ('Bimestre 5 (Sep-Oct)', 7, DATE '2026-11-20'),
  ('Bimestre 5 (Sep-Oct)', 8, DATE '2026-11-23'), ('Bimestre 5 (Sep-Oct)', 9, DATE '2026-11-24'),

  ('Bimestre 6 (Nov-Dic)', 0, DATE '2027-01-26'), ('Bimestre 6 (Nov-Dic)', 1, DATE '2027-01-13'),
  ('Bimestre 6 (Nov-Dic)', 2, DATE '2027-01-14'), ('Bimestre 6 (Nov-Dic)', 3, DATE '2027-01-15'),
  ('Bimestre 6 (Nov-Dic)', 4, DATE '2027-01-18'), ('Bimestre 6 (Nov-Dic)', 5, DATE '2027-01-19'),
  ('Bimestre 6 (Nov-Dic)', 6, DATE '2027-01-20'), ('Bimestre 6 (Nov-Dic)', 7, DATE '2027-01-21'),
  ('Bimestre 6 (Nov-Dic)', 8, DATE '2027-01-22'), ('Bimestre 6 (Nov-Dic)', 9, DATE '2027-01-25')
) AS v(periodo, nit, fecha_limite)
WHERE nombre = 'DIAN - IVA Bimestral 2026';

-- Retención en la fuente mensual: un dígito exacto del NIT por fila.
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, v.nit, v.nit, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Enero', 0, DATE '2026-02-23'), ('Enero', 1, DATE '2026-02-10'), ('Enero', 2, DATE '2026-02-11'),
  ('Enero', 3, DATE '2026-02-12'), ('Enero', 4, DATE '2026-02-13'), ('Enero', 5, DATE '2026-02-16'),
  ('Enero', 6, DATE '2026-02-17'), ('Enero', 7, DATE '2026-02-18'), ('Enero', 8, DATE '2026-02-19'),
  ('Enero', 9, DATE '2026-02-20'),

  ('Febrero', 0, DATE '2026-03-24'), ('Febrero', 1, DATE '2026-03-10'), ('Febrero', 2, DATE '2026-03-11'),
  ('Febrero', 3, DATE '2026-03-12'), ('Febrero', 4, DATE '2026-03-13'), ('Febrero', 5, DATE '2026-03-16'),
  ('Febrero', 6, DATE '2026-03-17'), ('Febrero', 7, DATE '2026-03-18'), ('Febrero', 8, DATE '2026-03-19'),
  ('Febrero', 9, DATE '2026-03-20'),

  ('Marzo', 0, DATE '2026-04-27'), ('Marzo', 1, DATE '2026-04-13'), ('Marzo', 2, DATE '2026-04-14'),
  ('Marzo', 3, DATE '2026-04-15'), ('Marzo', 4, DATE '2026-04-16'), ('Marzo', 5, DATE '2026-04-20'),
  ('Marzo', 6, DATE '2026-04-21'), ('Marzo', 7, DATE '2026-04-22'), ('Marzo', 8, DATE '2026-04-23'),
  ('Marzo', 9, DATE '2026-04-24'),

  ('Abril', 0, DATE '2026-05-26'), ('Abril', 1, DATE '2026-05-12'), ('Abril', 2, DATE '2026-05-13'),
  ('Abril', 3, DATE '2026-05-14'), ('Abril', 4, DATE '2026-05-15'), ('Abril', 5, DATE '2026-05-19'),
  ('Abril', 6, DATE '2026-05-20'), ('Abril', 7, DATE '2026-05-21'), ('Abril', 8, DATE '2026-05-22'),
  ('Abril', 9, DATE '2026-05-25'),

  ('Mayo', 0, DATE '2026-06-24'), ('Mayo', 1, DATE '2026-06-10'), ('Mayo', 2, DATE '2026-06-11'),
  ('Mayo', 3, DATE '2026-06-12'), ('Mayo', 4, DATE '2026-06-16'), ('Mayo', 5, DATE '2026-06-17'),
  ('Mayo', 6, DATE '2026-06-18'), ('Mayo', 7, DATE '2026-06-19'), ('Mayo', 8, DATE '2026-06-22'),
  ('Mayo', 9, DATE '2026-06-23'),

  ('Junio', 0, DATE '2026-07-24'), ('Junio', 1, DATE '2026-07-09'), ('Junio', 2, DATE '2026-07-10'),
  ('Junio', 3, DATE '2026-07-14'), ('Junio', 4, DATE '2026-07-15'), ('Junio', 5, DATE '2026-07-16'),
  ('Junio', 6, DATE '2026-07-17'), ('Junio', 7, DATE '2026-07-21'), ('Junio', 8, DATE '2026-07-22'),
  ('Junio', 9, DATE '2026-07-23'),

  ('Julio', 0, DATE '2026-08-26'), ('Julio', 1, DATE '2026-08-12'), ('Julio', 2, DATE '2026-08-13'),
  ('Julio', 3, DATE '2026-08-14'), ('Julio', 4, DATE '2026-08-18'), ('Julio', 5, DATE '2026-08-19'),
  ('Julio', 6, DATE '2026-08-20'), ('Julio', 7, DATE '2026-08-21'), ('Julio', 8, DATE '2026-08-24'),
  ('Julio', 9, DATE '2026-08-25'),

  ('Agosto', 0, DATE '2026-09-22'), ('Agosto', 1, DATE '2026-09-09'), ('Agosto', 2, DATE '2026-09-10'),
  ('Agosto', 3, DATE '2026-09-11'), ('Agosto', 4, DATE '2026-09-14'), ('Agosto', 5, DATE '2026-09-15'),
  ('Agosto', 6, DATE '2026-09-16'), ('Agosto', 7, DATE '2026-09-17'), ('Agosto', 8, DATE '2026-09-18'),
  ('Agosto', 9, DATE '2026-09-21'),

  -- Sep 10-12 caen en fin de semana + Día de la Raza (festivo): el próximo
  -- hábil para el dígito 1 es el 13, saltando directo del dígito 0 (día 9).
  ('Septiembre', 0, DATE '2026-10-23'), ('Septiembre', 1, DATE '2026-10-09'), ('Septiembre', 2, DATE '2026-10-13'),
  ('Septiembre', 3, DATE '2026-10-14'), ('Septiembre', 4, DATE '2026-10-15'), ('Septiembre', 5, DATE '2026-10-16'),
  ('Septiembre', 6, DATE '2026-10-19'), ('Septiembre', 7, DATE '2026-10-20'), ('Septiembre', 8, DATE '2026-10-21'),
  ('Septiembre', 9, DATE '2026-10-22'),

  ('Octubre', 0, DATE '2026-11-25'), ('Octubre', 1, DATE '2026-11-11'), ('Octubre', 2, DATE '2026-11-12'),
  ('Octubre', 3, DATE '2026-11-13'), ('Octubre', 4, DATE '2026-11-17'), ('Octubre', 5, DATE '2026-11-18'),
  ('Octubre', 6, DATE '2026-11-19'), ('Octubre', 7, DATE '2026-11-20'), ('Octubre', 8, DATE '2026-11-23'),
  ('Octubre', 9, DATE '2026-11-24'),

  ('Noviembre', 0, DATE '2026-12-23'), ('Noviembre', 1, DATE '2026-12-10'), ('Noviembre', 2, DATE '2026-12-11'),
  ('Noviembre', 3, DATE '2026-12-14'), ('Noviembre', 4, DATE '2026-12-15'), ('Noviembre', 5, DATE '2026-12-16'),
  ('Noviembre', 6, DATE '2026-12-17'), ('Noviembre', 7, DATE '2026-12-18'), ('Noviembre', 8, DATE '2026-12-21'),
  ('Noviembre', 9, DATE '2026-12-22'),

  ('Diciembre', 0, DATE '2027-01-26'), ('Diciembre', 1, DATE '2027-01-13'), ('Diciembre', 2, DATE '2027-01-14'),
  ('Diciembre', 3, DATE '2027-01-15'), ('Diciembre', 4, DATE '2027-01-18'), ('Diciembre', 5, DATE '2027-01-19'),
  ('Diciembre', 6, DATE '2027-01-20'), ('Diciembre', 7, DATE '2027-01-21'), ('Diciembre', 8, DATE '2027-01-22'),
  ('Diciembre', 9, DATE '2027-01-25')
) AS v(periodo, nit, fecha_limite)
WHERE nombre = 'DIAN - Retención en la Fuente Mensual 2026';

-- Renta personas jurídicas (por cuotas), un dígito exacto del NIT por fila.
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, v.nit, v.nit, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Primera cuota', 0, DATE '2026-05-26'), ('Primera cuota', 1, DATE '2026-05-12'),
  ('Primera cuota', 2, DATE '2026-05-13'), ('Primera cuota', 3, DATE '2026-05-14'),
  ('Primera cuota', 4, DATE '2026-05-15'), ('Primera cuota', 5, DATE '2026-05-19'),
  ('Primera cuota', 6, DATE '2026-05-20'), ('Primera cuota', 7, DATE '2026-05-21'),
  ('Primera cuota', 8, DATE '2026-05-22'), ('Primera cuota', 9, DATE '2026-05-25'),

  ('Segunda cuota', 0, DATE '2026-07-24'), ('Segunda cuota', 1, DATE '2026-07-09'),
  ('Segunda cuota', 2, DATE '2026-07-10'), ('Segunda cuota', 3, DATE '2026-07-14'),
  ('Segunda cuota', 4, DATE '2026-07-15'), ('Segunda cuota', 5, DATE '2026-07-16'),
  ('Segunda cuota', 6, DATE '2026-07-17'), ('Segunda cuota', 7, DATE '2026-07-21'),
  ('Segunda cuota', 8, DATE '2026-07-22'), ('Segunda cuota', 9, DATE '2026-07-23')
) AS v(periodo, nit, fecha_limite)
WHERE nombre = 'DIAN - Renta Personas Jurídicas 2026';

-- Renta Grandes Contribuyentes: 3 cuotas, un digito exacto del NIT por fila.
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, v.nit, v.nit, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Primera cuota', 1, DATE '2026-02-10'),
  ('Primera cuota', 2, DATE '2026-02-11'),
  ('Primera cuota', 3, DATE '2026-02-12'),
  ('Primera cuota', 4, DATE '2026-02-13'),
  ('Primera cuota', 5, DATE '2026-02-16'),
  ('Primera cuota', 6, DATE '2026-02-17'),
  ('Primera cuota', 7, DATE '2026-02-18'),
  ('Primera cuota', 8, DATE '2026-02-19'),
  ('Primera cuota', 9, DATE '2026-02-20'),
  ('Primera cuota', 0, DATE '2026-02-23'),
  ('Segunda cuota', 1, DATE '2026-04-13'),
  ('Segunda cuota', 2, DATE '2026-04-14'),
  ('Segunda cuota', 3, DATE '2026-04-15'),
  ('Segunda cuota', 4, DATE '2026-04-16'),
  ('Segunda cuota', 5, DATE '2026-04-20'),
  ('Segunda cuota', 6, DATE '2026-04-21'),
  ('Segunda cuota', 7, DATE '2026-04-22'),
  ('Segunda cuota', 8, DATE '2026-04-23'),
  ('Segunda cuota', 9, DATE '2026-04-24'),
  ('Segunda cuota', 0, DATE '2026-04-27'),
  ('Tercera cuota', 1, DATE '2026-06-10'),
  ('Tercera cuota', 2, DATE '2026-06-11'),
  ('Tercera cuota', 3, DATE '2026-06-12'),
  ('Tercera cuota', 4, DATE '2026-06-16'),
  ('Tercera cuota', 5, DATE '2026-06-17'),
  ('Tercera cuota', 6, DATE '2026-06-18'),
  ('Tercera cuota', 7, DATE '2026-06-19'),
  ('Tercera cuota', 8, DATE '2026-06-22'),
  ('Tercera cuota', 9, DATE '2026-06-23'),
  ('Tercera cuota', 0, DATE '2026-06-24')
) AS v(periodo, nit, fecha_limite)
WHERE nombre = 'DIAN - Renta Grandes Contribuyentes 2026';

-- IVA Cuatrimestral (periodicidad alterna a la bimestral): un digito exacto del NIT por fila.
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, v.nit, v.nit, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Cuatrimestre 1 (Ene-Abr)', 1, DATE '2026-05-12'),
  ('Cuatrimestre 1 (Ene-Abr)', 2, DATE '2026-05-13'),
  ('Cuatrimestre 1 (Ene-Abr)', 3, DATE '2026-05-14'),
  ('Cuatrimestre 1 (Ene-Abr)', 4, DATE '2026-05-15'),
  ('Cuatrimestre 1 (Ene-Abr)', 5, DATE '2026-05-19'),
  ('Cuatrimestre 1 (Ene-Abr)', 6, DATE '2026-05-20'),
  ('Cuatrimestre 1 (Ene-Abr)', 7, DATE '2026-05-21'),
  ('Cuatrimestre 1 (Ene-Abr)', 8, DATE '2026-05-22'),
  ('Cuatrimestre 1 (Ene-Abr)', 9, DATE '2026-05-25'),
  ('Cuatrimestre 1 (Ene-Abr)', 0, DATE '2026-05-26'),
  ('Cuatrimestre 2 (May-Ago)', 1, DATE '2026-09-09'),
  ('Cuatrimestre 2 (May-Ago)', 2, DATE '2026-09-10'),
  ('Cuatrimestre 2 (May-Ago)', 3, DATE '2026-09-11'),
  ('Cuatrimestre 2 (May-Ago)', 4, DATE '2026-09-14'),
  ('Cuatrimestre 2 (May-Ago)', 5, DATE '2026-09-15'),
  ('Cuatrimestre 2 (May-Ago)', 6, DATE '2026-09-16'),
  ('Cuatrimestre 2 (May-Ago)', 7, DATE '2026-09-17'),
  ('Cuatrimestre 2 (May-Ago)', 8, DATE '2026-09-18'),
  ('Cuatrimestre 2 (May-Ago)', 9, DATE '2026-09-21'),
  ('Cuatrimestre 2 (May-Ago)', 0, DATE '2026-09-22'),
  ('Cuatrimestre 3 (Sep-Dic)', 1, DATE '2027-01-13'),
  ('Cuatrimestre 3 (Sep-Dic)', 2, DATE '2027-01-14'),
  ('Cuatrimestre 3 (Sep-Dic)', 3, DATE '2027-01-15'),
  ('Cuatrimestre 3 (Sep-Dic)', 4, DATE '2027-01-18'),
  ('Cuatrimestre 3 (Sep-Dic)', 5, DATE '2027-01-19'),
  ('Cuatrimestre 3 (Sep-Dic)', 6, DATE '2027-01-20'),
  ('Cuatrimestre 3 (Sep-Dic)', 7, DATE '2027-01-21'),
  ('Cuatrimestre 3 (Sep-Dic)', 8, DATE '2027-01-22'),
  ('Cuatrimestre 3 (Sep-Dic)', 9, DATE '2027-01-25'),
  ('Cuatrimestre 3 (Sep-Dic)', 0, DATE '2027-01-26')
) AS v(periodo, nit, fecha_limite)
WHERE nombre = 'DIAN - IVA Cuatrimestral 2026';

-- RST - Anticipo bimestral: un digito exacto del NIT por fila.
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, v.nit, v.nit, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Bimestre 1 (Ene-Feb)', 1, DATE '2026-05-12'),
  ('Bimestre 1 (Ene-Feb)', 2, DATE '2026-05-13'),
  ('Bimestre 1 (Ene-Feb)', 3, DATE '2026-05-14'),
  ('Bimestre 1 (Ene-Feb)', 4, DATE '2026-05-15'),
  ('Bimestre 1 (Ene-Feb)', 5, DATE '2026-05-19'),
  ('Bimestre 1 (Ene-Feb)', 6, DATE '2026-05-20'),
  ('Bimestre 1 (Ene-Feb)', 7, DATE '2026-05-21'),
  ('Bimestre 1 (Ene-Feb)', 8, DATE '2026-05-22'),
  ('Bimestre 1 (Ene-Feb)', 9, DATE '2026-05-25'),
  ('Bimestre 1 (Ene-Feb)', 0, DATE '2026-05-26'),
  ('Bimestre 2 (Mar-Abr)', 1, DATE '2026-06-10'),
  ('Bimestre 2 (Mar-Abr)', 2, DATE '2026-06-11'),
  ('Bimestre 2 (Mar-Abr)', 3, DATE '2026-06-12'),
  ('Bimestre 2 (Mar-Abr)', 4, DATE '2026-06-16'),
  ('Bimestre 2 (Mar-Abr)', 5, DATE '2026-06-17'),
  ('Bimestre 2 (Mar-Abr)', 6, DATE '2026-06-18'),
  ('Bimestre 2 (Mar-Abr)', 7, DATE '2026-06-19'),
  ('Bimestre 2 (Mar-Abr)', 8, DATE '2026-06-22'),
  ('Bimestre 2 (Mar-Abr)', 9, DATE '2026-06-23'),
  ('Bimestre 2 (Mar-Abr)', 0, DATE '2026-06-24'),
  ('Bimestre 3 (May-Jun)', 1, DATE '2026-07-09'),
  ('Bimestre 3 (May-Jun)', 2, DATE '2026-07-10'),
  ('Bimestre 3 (May-Jun)', 3, DATE '2026-07-14'),
  ('Bimestre 3 (May-Jun)', 4, DATE '2026-07-15'),
  ('Bimestre 3 (May-Jun)', 5, DATE '2026-07-16'),
  ('Bimestre 3 (May-Jun)', 6, DATE '2026-07-17'),
  ('Bimestre 3 (May-Jun)', 7, DATE '2026-07-21'),
  ('Bimestre 3 (May-Jun)', 8, DATE '2026-07-22'),
  ('Bimestre 3 (May-Jun)', 9, DATE '2026-07-23'),
  ('Bimestre 3 (May-Jun)', 0, DATE '2026-07-24'),
  ('Bimestre 4 (Jul-Ago)', 1, DATE '2026-09-09'),
  ('Bimestre 4 (Jul-Ago)', 2, DATE '2026-09-10'),
  ('Bimestre 4 (Jul-Ago)', 3, DATE '2026-09-11'),
  ('Bimestre 4 (Jul-Ago)', 4, DATE '2026-09-14'),
  ('Bimestre 4 (Jul-Ago)', 5, DATE '2026-09-15'),
  ('Bimestre 4 (Jul-Ago)', 6, DATE '2026-09-16'),
  ('Bimestre 4 (Jul-Ago)', 7, DATE '2026-09-17'),
  ('Bimestre 4 (Jul-Ago)', 8, DATE '2026-09-18'),
  ('Bimestre 4 (Jul-Ago)', 9, DATE '2026-09-21'),
  ('Bimestre 4 (Jul-Ago)', 0, DATE '2026-09-22'),
  ('Bimestre 5 (Sep-Oct)', 1, DATE '2026-11-11'),
  ('Bimestre 5 (Sep-Oct)', 2, DATE '2026-11-12'),
  ('Bimestre 5 (Sep-Oct)', 3, DATE '2026-11-13'),
  ('Bimestre 5 (Sep-Oct)', 4, DATE '2026-11-17'),
  ('Bimestre 5 (Sep-Oct)', 5, DATE '2026-11-18'),
  ('Bimestre 5 (Sep-Oct)', 6, DATE '2026-11-19'),
  ('Bimestre 5 (Sep-Oct)', 7, DATE '2026-11-20'),
  ('Bimestre 5 (Sep-Oct)', 8, DATE '2026-11-23'),
  ('Bimestre 5 (Sep-Oct)', 9, DATE '2026-11-24'),
  ('Bimestre 5 (Sep-Oct)', 0, DATE '2026-11-25'),
  ('Bimestre 6 (Nov-Dic)', 1, DATE '2027-01-13'),
  ('Bimestre 6 (Nov-Dic)', 2, DATE '2027-01-14'),
  ('Bimestre 6 (Nov-Dic)', 3, DATE '2027-01-15'),
  ('Bimestre 6 (Nov-Dic)', 4, DATE '2027-01-18'),
  ('Bimestre 6 (Nov-Dic)', 5, DATE '2027-01-19'),
  ('Bimestre 6 (Nov-Dic)', 6, DATE '2027-01-20'),
  ('Bimestre 6 (Nov-Dic)', 7, DATE '2027-01-21'),
  ('Bimestre 6 (Nov-Dic)', 8, DATE '2027-01-22'),
  ('Bimestre 6 (Nov-Dic)', 9, DATE '2027-01-25'),
  ('Bimestre 6 (Nov-Dic)', 0, DATE '2027-01-26')
) AS v(periodo, nit, fecha_limite)
WHERE nombre = 'DIAN - RST Anticipo Bimestral 2026';

-- Precios de transferencia (declaracion informativa y documentacion comprobatoria: misma fecha).
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, v.nit, v.nit, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Declaracion informativa y documentacion', 1, DATE '2026-09-09'),
  ('Declaracion informativa y documentacion', 2, DATE '2026-09-10'),
  ('Declaracion informativa y documentacion', 3, DATE '2026-09-11'),
  ('Declaracion informativa y documentacion', 4, DATE '2026-09-14'),
  ('Declaracion informativa y documentacion', 5, DATE '2026-09-15'),
  ('Declaracion informativa y documentacion', 6, DATE '2026-09-16'),
  ('Declaracion informativa y documentacion', 7, DATE '2026-09-17'),
  ('Declaracion informativa y documentacion', 8, DATE '2026-09-18'),
  ('Declaracion informativa y documentacion', 9, DATE '2026-09-21'),
  ('Declaracion informativa y documentacion', 0, DATE '2026-09-22')
) AS v(periodo, nit, fecha_limite)
WHERE nombre = 'DIAN - Precios de Transferencia 2026';

-- Patrimonio: 1a cuota por digito del NIT.
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, v.nit, v.nit, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Primera cuota', 1, DATE '2026-05-12'),
  ('Primera cuota', 2, DATE '2026-05-13'),
  ('Primera cuota', 3, DATE '2026-05-14'),
  ('Primera cuota', 4, DATE '2026-05-15'),
  ('Primera cuota', 5, DATE '2026-05-19'),
  ('Primera cuota', 6, DATE '2026-05-20'),
  ('Primera cuota', 7, DATE '2026-05-21'),
  ('Primera cuota', 8, DATE '2026-05-22'),
  ('Primera cuota', 9, DATE '2026-05-25'),
  ('Primera cuota', 0, DATE '2026-05-26')
) AS v(periodo, nit, fecha_limite)
WHERE nombre = 'DIAN - Patrimonio 2026';
-- Patrimonio: 2a cuota, fecha unica para todos.
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, 0, 9, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Segunda cuota', DATE '2026-09-14')
) AS v(periodo, fecha_limite)
WHERE nombre = 'DIAN - Patrimonio 2026';

-- PES (no residentes) - pagos anticipados bimestrales, fecha unica.
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, 0, 9, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Bimestre 1 (Ene-Feb)', DATE '2026-03-13'),
  ('Bimestre 2 (Mar-Abr)', DATE '2026-05-15'),
  ('Bimestre 3 (May-Jun)', DATE '2026-07-15'),
  ('Bimestre 4 (Jul-Ago)', DATE '2026-09-14'),
  ('Bimestre 5 (Sep-Oct)', DATE '2026-11-17'),
  ('Bimestre 6 (Nov-Dic)', DATE '2027-01-18')
) AS v(periodo, fecha_limite)
WHERE nombre = 'DIAN - PES Pagos Anticipados 2026';

-- Impuesto al carbono - declaracion y pago bimestral, fecha unica.
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, 0, 9, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Bimestre 1 (Ene-Feb)', DATE '2026-03-13'),
  ('Bimestre 2 (Mar-Abr)', DATE '2026-05-15'),
  ('Bimestre 3 (May-Jun)', DATE '2026-07-15'),
  ('Bimestre 4 (Jul-Ago)', DATE '2026-09-14'),
  ('Bimestre 5 (Sep-Oct)', DATE '2026-11-17'),
  ('Bimestre 6 (Nov-Dic)', DATE '2027-01-18')
) AS v(periodo, fecha_limite)
WHERE nombre = 'DIAN - Carbono 2026';

-- Bebidas/alimentos ultraprocesados - bimestral, fecha unica.
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, 0, 9, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Bimestre 1 (Ene-Feb)', DATE '2026-03-13'),
  ('Bimestre 2 (Mar-Abr)', DATE '2026-05-15'),
  ('Bimestre 3 (May-Jun)', DATE '2026-07-15'),
  ('Bimestre 4 (Jul-Ago)', DATE '2026-09-14'),
  ('Bimestre 5 (Sep-Oct)', DATE '2026-11-17'),
  ('Bimestre 6 (Nov-Dic)', DATE '2027-01-18')
) AS v(periodo, fecha_limite)
WHERE nombre = 'DIAN - Bebidas Ultraprocesadas 2026';

-- IVA prestadores de servicios desde el exterior - bimestral, fecha unica.
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, 0, 9, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Bimestre 1 (Ene-Feb)', DATE '2026-03-13'),
  ('Bimestre 2 (Mar-Abr)', DATE '2026-05-15'),
  ('Bimestre 3 (May-Jun)', DATE '2026-07-15'),
  ('Bimestre 4 (Jul-Ago)', DATE '2026-09-14'),
  ('Bimestre 5 (Sep-Oct)', DATE '2026-11-17'),
  ('Bimestre 6 (Nov-Dic)', DATE '2027-01-18')
) AS v(periodo, fecha_limite)
WHERE nombre = 'DIAN - IVA Servicios Exterior 2026';

-- Gasolina y ACPM: declaracion mensual, fecha unica para todos.
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, 0, 9, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Enero', DATE '2026-02-13'),
  ('Febrero', DATE '2026-03-13'),
  ('Marzo', DATE '2026-04-16'),
  ('Abril', DATE '2026-05-15'),
  ('Mayo', DATE '2026-06-16'),
  ('Junio', DATE '2026-07-15'),
  ('Julio', DATE '2026-08-18'),
  ('Agosto', DATE '2026-09-14'),
  ('Septiembre', DATE '2026-10-15'),
  ('Octubre', DATE '2026-11-17'),
  ('Noviembre', DATE '2026-12-15'),
  ('Diciembre', DATE '2027-01-18')
) AS v(periodo, fecha_limite)
WHERE nombre = 'DIAN - Gasolina y ACPM 2026';

-- Obligaciones con una sola fecha fija al anio (no dependen del NIT).
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, 0, 9, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Declaracion anual', DATE '2026-04-23')
) AS v(periodo, fecha_limite)
WHERE nombre = 'DIAN - PES Declaracion Anual 2026';
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, 0, 9, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Informe pais por pais', DATE '2026-12-15')
) AS v(periodo, fecha_limite)
WHERE nombre = 'DIAN - Informe Pais por Pais 2026';
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, 0, 9, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Presentacion y pago', DATE '2026-02-13')
) AS v(periodo, fecha_limite)
WHERE nombre = 'DIAN - Productos Plasticos 2026';

-- RUB: actualizacion trimestral, fecha unica.
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, 0, 9, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Corte Ene-Abr', DATE '2026-02-02'),
  ('Corte May-Jun', DATE '2026-05-04'),
  ('Corte Jul-Ago', DATE '2026-08-03'),
  ('Corte Sep-Dic', DATE '2026-11-03')
) AS v(periodo, fecha_limite)
WHERE nombre = 'DIAN - RUB 2026';

-- RST - Declaracion anual consolidada: rangos de 2 digitos del NIT.
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, v.nit_desde, v.nit_hasta, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Declaracion anual y pago', 1, 2, DATE '2026-04-20'),
  ('Declaracion anual y pago', 3, 4, DATE '2026-04-21'),
  ('Declaracion anual y pago', 5, 6, DATE '2026-04-22'),
  ('Declaracion anual y pago', 7, 8, DATE '2026-04-23'),
  ('Declaracion anual y pago', 9, 9, DATE '2026-04-24'),
  ('Declaracion anual y pago', 0, 0, DATE '2026-04-24')
) AS v(periodo, nit_desde, nit_hasta, fecha_limite)
WHERE nombre = 'DIAN - RST Declaracion Anual 2026';
-- RST - Consolidada de IVA: rangos de 2 digitos del NIT.
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, v.nit_desde, v.nit_hasta, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Consolidada de IVA', 1, 2, DATE '2026-02-16'),
  ('Consolidada de IVA', 3, 4, DATE '2026-02-17'),
  ('Consolidada de IVA', 5, 6, DATE '2026-02-18'),
  ('Consolidada de IVA', 7, 8, DATE '2026-02-19'),
  ('Consolidada de IVA', 9, 9, DATE '2026-02-20'),
  ('Consolidada de IVA', 0, 0, DATE '2026-02-20')
) AS v(periodo, nit_desde, nit_hasta, fecha_limite)
WHERE nombre = 'DIAN - RST Consolidada IVA 2026';

-- Renta Personas Naturales: rangos de 2 digitos del NIT (00-99), calendario oficial completo.
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, v.nit_desde, v.nit_hasta, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Declaracion y pago (Ago)', 1, 2, DATE '2026-08-12'),
  ('Declaracion y pago (Ago)', 3, 4, DATE '2026-08-13'),
  ('Declaracion y pago (Ago)', 5, 6, DATE '2026-08-14'),
  ('Declaracion y pago (Ago)', 7, 8, DATE '2026-08-18'),
  ('Declaracion y pago (Ago)', 9, 10, DATE '2026-08-19'),
  ('Declaracion y pago (Ago)', 11, 12, DATE '2026-08-20'),
  ('Declaracion y pago (Ago)', 13, 14, DATE '2026-08-21'),
  ('Declaracion y pago (Ago)', 15, 16, DATE '2026-08-24'),
  ('Declaracion y pago (Ago)', 17, 18, DATE '2026-08-25'),
  ('Declaracion y pago (Ago)', 19, 20, DATE '2026-08-26'),
  ('Declaracion y pago (Ago)', 21, 22, DATE '2026-08-27'),
  ('Declaracion y pago (Ago)', 23, 24, DATE '2026-08-28'),
  ('Declaracion y pago (Ago)', 25, 26, DATE '2026-08-31')
) AS v(periodo, nit_desde, nit_hasta, fecha_limite)
WHERE nombre = 'DIAN - Renta Personas Naturales 2026';
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, v.nit_desde, v.nit_hasta, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Declaracion y pago (Sep)', 27, 28, DATE '2026-09-01'),
  ('Declaracion y pago (Sep)', 29, 30, DATE '2026-09-02'),
  ('Declaracion y pago (Sep)', 31, 32, DATE '2026-09-03'),
  ('Declaracion y pago (Sep)', 33, 34, DATE '2026-09-04'),
  ('Declaracion y pago (Sep)', 35, 36, DATE '2026-09-07'),
  ('Declaracion y pago (Sep)', 37, 38, DATE '2026-09-08'),
  ('Declaracion y pago (Sep)', 39, 40, DATE '2026-09-09'),
  ('Declaracion y pago (Sep)', 41, 42, DATE '2026-09-10'),
  ('Declaracion y pago (Sep)', 43, 44, DATE '2026-09-11'),
  ('Declaracion y pago (Sep)', 45, 46, DATE '2026-09-14'),
  ('Declaracion y pago (Sep)', 47, 48, DATE '2026-09-15'),
  ('Declaracion y pago (Sep)', 49, 50, DATE '2026-09-16'),
  ('Declaracion y pago (Sep)', 51, 52, DATE '2026-09-17'),
  ('Declaracion y pago (Sep)', 53, 54, DATE '2026-09-18'),
  ('Declaracion y pago (Sep)', 55, 56, DATE '2026-09-21'),
  ('Declaracion y pago (Sep)', 57, 58, DATE '2026-09-22'),
  ('Declaracion y pago (Sep)', 59, 60, DATE '2026-09-23'),
  ('Declaracion y pago (Sep)', 61, 62, DATE '2026-09-24'),
  ('Declaracion y pago (Sep)', 63, 64, DATE '2026-09-25'),
  ('Declaracion y pago (Sep)', 65, 66, DATE '2026-09-28')
) AS v(periodo, nit_desde, nit_hasta, fecha_limite)
WHERE nombre = 'DIAN - Renta Personas Naturales 2026';
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, v.nit_desde, v.nit_hasta, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Declaracion y pago (Oct)', 67, 68, DATE '2026-10-01'),
  ('Declaracion y pago (Oct)', 69, 70, DATE '2026-10-02'),
  ('Declaracion y pago (Oct)', 71, 72, DATE '2026-10-05'),
  ('Declaracion y pago (Oct)', 73, 74, DATE '2026-10-06'),
  ('Declaracion y pago (Oct)', 75, 76, DATE '2026-10-07'),
  ('Declaracion y pago (Oct)', 77, 78, DATE '2026-10-08'),
  ('Declaracion y pago (Oct)', 79, 80, DATE '2026-10-09'),
  ('Declaracion y pago (Oct)', 81, 82, DATE '2026-10-13'),
  ('Declaracion y pago (Oct)', 83, 84, DATE '2026-10-14'),
  ('Declaracion y pago (Oct)', 85, 86, DATE '2026-10-15'),
  ('Declaracion y pago (Oct)', 87, 88, DATE '2026-10-16'),
  ('Declaracion y pago (Oct)', 89, 90, DATE '2026-10-19'),
  ('Declaracion y pago (Oct)', 91, 92, DATE '2026-10-20'),
  ('Declaracion y pago (Oct)', 93, 94, DATE '2026-10-21'),
  ('Declaracion y pago (Oct)', 95, 96, DATE '2026-10-22'),
  ('Declaracion y pago (Oct)', 97, 98, DATE '2026-10-23'),
  ('Declaracion y pago (Oct)', 99, 99, DATE '2026-10-26'),
  ('Declaracion y pago (Oct)', 0, 0, DATE '2026-10-26')
) AS v(periodo, nit_desde, nit_hasta, fecha_limite)
WHERE nombre = 'DIAN - Renta Personas Naturales 2026';

-- Reporte de facturación electrónica.
INSERT INTO app.calendario_fecha (id_calendario, periodo, nit_desde, nit_hasta, fecha_limite)
SELECT id_calendario, v.periodo, v.nit_desde, v.nit_hasta, v.fecha_limite
FROM app.calendario_tributario, (VALUES
  ('Mayo', 0, 4, DATE '2026-06-09'),
  ('Mayo', 5, 9, DATE '2026-06-10')
) AS v(periodo, nit_desde, nit_hasta, fecha_limite)
WHERE nombre = 'DIAN - Facturación Electrónica 2026';

-- Asociar cada responsabilidad con su calendario 2026.
-- Se enlaza por auto_numero (único) y no por codigo_dian: varias de las
-- responsabilidades nuevas comparten el mismo codigo_dian (categorización
-- interna, ver comentario más arriba), así que codigo_dian ya no alcanza
-- para identificar una sola fila.
INSERT INTO app.responsabilidad_calendario (id_responsabilidad, anio, id_calendario)
SELECT r.id_responsabilidad, 2026, c.id_calendario
FROM app.responsabilidad r
JOIN app.calendario_tributario c ON c.anio = 2026
WHERE (r.auto_numero = '0001' AND c.nombre = 'DIAN - IVA Bimestral 2026')
   OR (r.auto_numero = '0002' AND c.nombre = 'DIAN - Retención en la Fuente Mensual 2026')
   OR (r.auto_numero = '0003' AND c.nombre = 'DIAN - Renta Personas Jurídicas 2026')
   OR (r.auto_numero = '0004' AND c.nombre = 'DIAN - Facturación Electrónica 2026')
   OR (r.auto_numero = '0005' AND c.nombre = 'DIAN - Renta Grandes Contribuyentes 2026')
   OR (r.auto_numero = '0006' AND c.nombre = 'DIAN - Renta Personas Naturales 2026')
   OR (r.auto_numero = '0007' AND c.nombre = 'DIAN - IVA Cuatrimestral 2026')
   OR (r.auto_numero = '0008' AND c.nombre = 'DIAN - Patrimonio 2026')
   OR (r.auto_numero = '0009' AND c.nombre = 'DIAN - RST Declaracion Anual 2026')
   OR (r.auto_numero = '0010' AND c.nombre = 'DIAN - RST Consolidada IVA 2026')
   OR (r.auto_numero = '0011' AND c.nombre = 'DIAN - RST Anticipo Bimestral 2026')
   OR (r.auto_numero = '0012' AND c.nombre = 'DIAN - Precios de Transferencia 2026')
   OR (r.auto_numero = '0013' AND c.nombre = 'DIAN - Precios de Transferencia 2026')
   OR (r.auto_numero = '0014' AND c.nombre = 'DIAN - Informe Pais por Pais 2026')
   OR (r.auto_numero = '0015' AND c.nombre = 'DIAN - PES Pagos Anticipados 2026')
   OR (r.auto_numero = '0016' AND c.nombre = 'DIAN - PES Declaracion Anual 2026')
   -- Consumo se declara en las mismas fechas que el IVA bimestral; Activos en
   -- el Exterior en las mismas fechas que Renta Personas Jurídicas (así lo
   -- indica el PDF fuente) — reutilizan esos calendarios en vez de tener uno propio.
   OR (r.auto_numero = '0017' AND c.nombre = 'DIAN - IVA Bimestral 2026')
   OR (r.auto_numero = '0018' AND c.nombre = 'DIAN - Renta Personas Jurídicas 2026')
   OR (r.auto_numero = '0019' AND c.nombre = 'DIAN - Gasolina y ACPM 2026')
   OR (r.auto_numero = '0020' AND c.nombre = 'DIAN - Carbono 2026')
   OR (r.auto_numero = '0021' AND c.nombre = 'DIAN - IVA Servicios Exterior 2026')
   OR (r.auto_numero = '0022' AND c.nombre = 'DIAN - Productos Plasticos 2026')
   OR (r.auto_numero = '0023' AND c.nombre = 'DIAN - Bebidas Ultraprocesadas 2026')
   OR (r.auto_numero = '0024' AND c.nombre = 'DIAN - RUB 2026');

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
     JOIN app.responsabilidad r ON r.id_responsabilidad = rc.id_responsabilidad
     -- "Bimestre 1 (Ene-Feb)" ya no identifica un solo evento: varias
     -- responsabilidades nuevas (RST, Carbono, PES...) reusan ese mismo
     -- nombre de periodo, así que hay que filtrar también por la
     -- responsabilidad (0001 = IVA Responsable, la del ejemplo original).
     WHERE c.nombre = 'Empresa ABC S.A.S.' AND ec.periodo = 'Bimestre 1 (Ene-Feb)' AND r.auto_numero = '0001'),
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
