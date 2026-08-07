-- Esquema "app": tablas reales del sistema (privado, PostgREST nunca lo expone
-- directamente). El esquema "api" (06_api.sql) expone vistas/RPC sobre este.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS api;

-- ============================================================
-- MAESTROS (orden de dependencia: Municipios -> Grupo -> Subgrupo
-- -> Responsabilidad -> Profesionales -> Clientes)
-- ============================================================

CREATE TABLE app.municipios (
  cod_municipio varchar(5) PRIMARY KEY,
  nombre        text NOT NULL
);

CREATE TABLE app.grupo_responsabilidad (
  id_grupo serial PRIMARY KEY,
  nombre   text NOT NULL UNIQUE,
  -- Nivel territorial del grupo. Coincidía con "nombre" en los 3 grupos
  -- originales del documento fuente, pero se modela aparte para que el
  -- nombre pueda diversificarse (ej. distintas autoridades municipales) sin
  -- perder una clasificación territorial fiable para filtrar/validar.
  tipo     text NOT NULL CHECK (tipo IN ('Nacional', 'Departamental', 'Municipal'))
);

CREATE TABLE app.subgrupo_responsabilidad (
  id_subgrupo serial PRIMARY KEY,
  id_grupo    int NOT NULL REFERENCES app.grupo_responsabilidad (id_grupo),
  nombre      text NOT NULL,
  UNIQUE (id_grupo, nombre)
);

CREATE TABLE app.responsabilidad (
  id_responsabilidad serial PRIMARY KEY,
  auto_numero        varchar(10) NOT NULL,
  codigo_dian         varchar(10) NOT NULL,
  codigo_formulario   varchar(10) NOT NULL,
  -- Código único = AutoNumero + CodigoDIAN + CodMunicipio + CodigoFormulario (ver documento fuente)
  codigo_unico        text GENERATED ALWAYS AS (
                         auto_numero || '-' || codigo_dian || '-' || cod_municipio || '-' || codigo_formulario
                       ) STORED,
  nombre              text NOT NULL,
  id_subgrupo         int NOT NULL REFERENCES app.subgrupo_responsabilidad (id_subgrupo),
  cod_municipio       varchar(5) NOT NULL REFERENCES app.municipios (cod_municipio),
  tipo                text NOT NULL CHECK (tipo IN ('Obligatoria', 'No obligatoria')),
  sancion             boolean NOT NULL DEFAULT false,
  -- Campo de configuración: cómo se resuelve la fecha límite de esta responsabilidad.
  -- CALENDARIO_NIT: la fecha depende del calendario tributario y los últimos
  --   dígitos del NIT del cliente (ver calendario_tributario / calendario_fecha).
  -- FECHA_FIJA: misma fecha para todos los clientes (se modela igual, con una
  --   sola fila de calendario_fecha sin distinción de NIT).
  modo_vencimiento    text NOT NULL DEFAULT 'CALENDARIO_NIT'
                         CHECK (modo_vencimiento IN ('CALENDARIO_NIT', 'FECHA_FIJA')),
  activo              boolean NOT NULL DEFAULT true,
  UNIQUE (auto_numero, codigo_dian, cod_municipio, codigo_formulario)
);

CREATE TABLE app.profesionales (
  id_profesional serial PRIMARY KEY,
  nombre         text NOT NULL,
  direccion      text,
  telefono       text,
  email          text UNIQUE,
  activo         boolean NOT NULL DEFAULT true
);

CREATE TABLE app.clientes (
  id_cliente          serial PRIMARY KEY,
  nombre              text NOT NULL,
  direccion           text,
  telefono            text,
  -- NIT separado del dígito de verificación: los dígitos que determinan el
  -- calendario tributario son los del NIT SIN el DV.
  nit                 bigint NOT NULL,
  digito_verificacion smallint NOT NULL CHECK (digito_verificacion BETWEEN 0 AND 9),
  cod_municipio       varchar(5) REFERENCES app.municipios (cod_municipio),
  activo              boolean NOT NULL DEFAULT true,
  UNIQUE (nit)
);

-- ============================================================
-- CALENDARIOS TRIBUTARIOS (nacional DIAN o de cada municipio; la fecha de
-- cada periodo depende de 1 o 2 dígitos finales del NIT del cliente)
-- ============================================================

CREATE TABLE app.calendario_tributario (
  id_calendario serial PRIMARY KEY,
  nombre        text NOT NULL,
  anio          int NOT NULL,
  ambito        text NOT NULL CHECK (ambito IN ('Nacional', 'Departamental', 'Municipal')),
  cod_municipio varchar(5) REFERENCES app.municipios (cod_municipio),
  digitos_nit   smallint NOT NULL CHECK (digitos_nit IN (1, 2)),
  UNIQUE (nombre, anio)
);

CREATE TABLE app.calendario_fecha (
  id_calendario_fecha serial PRIMARY KEY,
  id_calendario int NOT NULL REFERENCES app.calendario_tributario (id_calendario) ON DELETE CASCADE,
  periodo       text NOT NULL,
  -- Rango de terminación de NIT que aplica a esta fecha (ej. 0-1, 2-3... o 0-99
  -- para FECHA_FIJA / calendarios de un solo dígito con grupos amplios).
  nit_desde     smallint NOT NULL CHECK (nit_desde >= 0),
  nit_hasta     smallint NOT NULL,
  fecha_limite  date NOT NULL,
  CHECK (nit_desde <= nit_hasta)
);

CREATE TABLE app.responsabilidad_calendario (
  id_responsabilidad int NOT NULL REFERENCES app.responsabilidad (id_responsabilidad),
  anio               int NOT NULL,
  id_calendario      int NOT NULL REFERENCES app.calendario_tributario (id_calendario),
  PRIMARY KEY (id_responsabilidad, anio)
);

-- ============================================================
-- MOVIMIENTO
-- ============================================================

CREATE TABLE app.responsabilidades_cliente (
  id_responsabilidad_cliente serial PRIMARY KEY,
  id_cliente          int NOT NULL REFERENCES app.clientes (id_cliente),
  id_responsabilidad  int NOT NULL REFERENCES app.responsabilidad (id_responsabilidad),
  anio                int NOT NULL,
  estado              text NOT NULL DEFAULT 'Activa' CHECK (estado IN ('Activa', 'Inactiva')),
  UNIQUE (id_cliente, id_responsabilidad, anio)
);

-- Asignación PERMANENTE (no por año): un cliente tiene un único profesional
-- responsable hasta que se reasigna explícitamente (app.f_reasignar_profesional).
-- fecha_fin queda NULL mientras está activa; se completa al reasignar, y la
-- fila vieja se conserva (estado Inactiva) como historial de quién fue
-- responsable en cada periodo.
CREATE TABLE app.asignacion_cliente_profesional (
  id_asignacion_cliente serial PRIMARY KEY,
  id_cliente       int NOT NULL REFERENCES app.clientes (id_cliente),
  id_profesional   int NOT NULL REFERENCES app.profesionales (id_profesional),
  fecha_asignacion date NOT NULL DEFAULT current_date,
  fecha_fin        date,
  estado           text NOT NULL DEFAULT 'Activa' CHECK (estado IN ('Activa', 'Inactiva')),
  CHECK (estado = 'Activa' OR fecha_fin IS NOT NULL)
);

-- Un cliente solo puede tener UNA asignación activa a la vez.
CREATE UNIQUE INDEX asignacion_activa_unica
  ON app.asignacion_cliente_profesional (id_cliente)
  WHERE estado = 'Activa';

-- El evento cuelga de la fila cliente-responsabilidad-año (no de la responsabilidad
-- "suelta"): así es estructuralmente imposible generar un evento de una
-- responsabilidad que el cliente no tiene marcada. id_asignacion_cliente se
-- conserva como trazabilidad de qué profesional era responsable al generarse.
CREATE TABLE app.eventos_calendario (
  id_evento                  serial PRIMARY KEY,
  id_responsabilidad_cliente int NOT NULL REFERENCES app.responsabilidades_cliente (id_responsabilidad_cliente),
  id_asignacion_cliente      int NOT NULL REFERENCES app.asignacion_cliente_profesional (id_asignacion_cliente),
  periodo                    text NOT NULL,
  fecha_limite               date NOT NULL,
  estado_evento              text NOT NULL DEFAULT 'Pendiente'
    CHECK (estado_evento IN ('Pendiente', 'Realizado', 'Vencido', 'Cancelado', 'Realizado vencido')),
  UNIQUE (id_responsabilidad_cliente, periodo)
);

CREATE TABLE app.evidencias (
  id_evidencia      serial PRIMARY KEY,
  id_evento         int NOT NULL REFERENCES app.eventos_calendario (id_evento),
  id_profesional    int NOT NULL REFERENCES app.profesionales (id_profesional),
  observaciones     text,
  archivo_evidencia text,
  fecha_realizacion date NOT NULL DEFAULT current_date,
  horas_dedicadas   numeric(5, 2) CHECK (horas_dedicadas >= 0),
  estado            text NOT NULL DEFAULT 'Registrada'
);

-- ============================================================
-- AUTENTICACIÓN — AWS Cognito (ver 03_auth.sql)
-- ============================================================
-- La contraseña vive únicamente en Cognito. Esta tabla solo mapea el "sub"
-- del usuario de Cognito a su id_profesional (para RLS) y guarda una copia
-- de rol/email para mostrar en el panel de administración. La mantiene
-- presign-service (rutas /usuarios) vía el rol app_user_sync.

CREATE TABLE app.usuarios (
  id_usuario     serial PRIMARY KEY,
  sub            text NOT NULL UNIQUE,
  email          text NOT NULL UNIQUE,
  rol            text NOT NULL CHECK (rol IN ('app_admin', 'app_profesional')),
  id_profesional int REFERENCES app.profesionales (id_profesional),
  activo         boolean NOT NULL DEFAULT true
);

-- ============================================================
-- Índices de apoyo
-- ============================================================

CREATE INDEX ON app.responsabilidades_cliente (id_cliente, anio);
CREATE INDEX ON app.eventos_calendario (estado_evento);
CREATE INDEX ON app.eventos_calendario (fecha_limite);
CREATE INDEX ON app.eventos_calendario (id_asignacion_cliente);
CREATE INDEX ON app.asignacion_cliente_profesional (id_profesional);
CREATE INDEX ON app.evidencias (id_evento);
