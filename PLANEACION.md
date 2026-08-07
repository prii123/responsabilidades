# Planeación — Sistema de Gestión de Obligaciones y Responsabilidades

> Fuente del análisis: https://project-color-splash.lovable.app/
> Fecha: 2026-08-03

---

## 1. Análisis del documento fuente

El sitio describe la estructura de un software para gestionar **obligaciones tributarias de clientes** (impuestos nacionales, departamentales y municipales de Colombia: Renta, IVA, 4x1000, Predial, ICA, etc.), asignarlas a **profesionales** responsables, generar **eventos de calendario** con fechas límite y registrar **evidencias** de cumplimiento.

### 1.1 Tablas maestras

| Tabla | Campos clave |
|---|---|
| **Municipios** | CodMunicipio (código DANE, ej. `11001` Bogotá), Nombre |
| **Grupo de Responsabilidad** | id_grupo_responsabilidad, Nombre (Nacional / Departamental / Municipal) |
| **Subgrupo Responsabilidad** | id_subgrupo_responsabilidad, id_grupo_responsabilidad (FK), Nombre (IVA, ICA, Renta y Patrimonio, Retención en la Fuente…) |
| **Responsabilidad** | Id_Responsabilidad (código único compuesto = Id_AutoNumero + CodigoDIAN + CodMunicipio + CodigoFormulario, ej. `0001-48-11001-300`), Id_AutoNumero, CodigoDIAN, Nombre, id_subgrupo_responsabilidad (FK), CodMunicipio (FK), CodigoFormulario, Tipo (Obligatoria / No obligatoria), Sancion (Sí / No) |
| **Profesionales** | id_profesional, Nombre, Direccion, Telefono |
| **Clientes** | id_cliente, Nombre (razón social), Direccion, Telefono, NIT, Municipio |

### 1.2 Tablas de movimiento

| Tabla | Propósito | Campos |
|---|---|---|
| **ResponsabilidadesCliente** | Relaciona cada cliente con los códigos RUT que tiene registrados por año | id_responsabilidad_cliente, id_cliente, id_responsabilidad, año, estado |
| **AsignacionClienteProfesional** | Asigna un cliente (con todas sus responsabilidades) a un profesional por año | id_asignacion_cliente, id_cliente, id_profesional, año, fecha_asignacion, estado |
| **EventosCalendario** | Eventos generados automáticamente por periodo con fecha límite | id_evento, id_asignacion_cliente, id_responsabilidad, año, periodo, fecha_limite, estado_evento |
| **Evidencias** | Registro de la ejecución del evento (archivo, observaciones, horas) | id_evidencia, id_evento, id_profesional, observaciones, archivo_evidencia, fecha_realizacion, horas_dedicadas, estado |

**Estados de evento:** `Pendiente`, `Realizado`, `Vencido`, `Cancelado`, `Realizado vencido`.

### 1.3 Reglas del negocio (7)

1. Un cliente **no puede asignarse** a un profesional si no tiene al menos una responsabilidad asignada.
2. Toda responsabilidad de un cliente **debe quedar asignada** a un profesional (ninguna sin responsable).
3. Cada responsabilidad asignada **genera automáticamente eventos** en el calendario con su fecha límite por periodo.
4. Cada evento avanza por **estados controlados**: Pendiente → Realizado, o pasa a Vencido al cumplirse la fecha límite.
5. Un evento solo puede marcarse **Realizado si el profesional adjunta evidencia** (archivo, observaciones, horas).
6. Los estados **Realizado y Cancelado son irreversibles** (no vuelven a Pendiente).
7. Solo se generan eventos para **responsabilidades activas del año vigente** de la asignación cliente–profesional.

### 1.4 Flujo operativo (ejemplo del documento)

### 1.5 Requisito adicional: calendarios tributarios por dígitos del NIT

Cuando la responsabilidad es tributaria (nacional, departamental o municipal), la fecha límite de cada periodo **no es fija**: la define el **calendario tributario** correspondiente (nacional DIAN o el de cada municipio), y la fecha que le aplica a cada cliente depende del **último dígito o los dos últimos dígitos de su NIT** (sin contar el dígito de verificación). El sistema debe modelar estos calendarios y usarlos al generar los eventos. Ver diseño en la sección 2.2.

- **Fase A — Maestros (orden obligatorio):** Municipios → Grupos → Subgrupos → Responsabilidades → Profesionales → Clientes.
- **Fase B — Configuración:** marcar responsabilidades RUT del cliente para el año (Paso 7) → asignar cliente a profesional validando reglas 1 y 2 (Paso 8).
- **Fase C — Operación:** generación automática de eventos por periodo (IVA bimestral, Retefuente mensual, Renta por cuotas…) (Paso 9) → el profesional adjunta evidencia y el evento pasa a Realizado con trazabilidad completa (Paso 10).

---

## 2. Arquitectura de la solución

**Stack elegido:**

- **Backend:** PostgreSQL + **PostgREST** (API REST autogenerada desde el esquema SQL). Toda la lógica de negocio vive en la base de datos (constraints, triggers, funciones RPC, vistas, RLS).
- **Autenticación:** **AWS Cognito** (User Pool). Cognito emite JWT (RS256); PostgREST los valida contra el **JWKS** del User Pool y mapea el claim de grupo (`cognito:groups`) a roles de base de datos.
- **Frontend:** **React** (Vite + TypeScript), consumiendo la API de PostgREST con el token de Cognito en el header `Authorization: Bearer`.

```
┌──────────────┐   login    ┌─────────────┐
│  React (SPA) │──────────▶│ AWS Cognito  │
│  Vite + TS   │◀──────────│  User Pool   │
└──────┬───────┘  JWT (RS256)└────────────┘
       │ Authorization: Bearer <jwt>
       ▼
┌──────────────┐  valida JWT con JWKS de Cognito
│  PostgREST   │  mapea cognito:groups → rol de BD
└──────┬───────┘
       ▼
┌──────────────┐  esquema api (vistas + RPC)
│  PostgreSQL  │  esquema app (tablas + triggers + RLS)
└──────────────┘
```

**Roles de la aplicación (grupos en Cognito → roles en PostgreSQL):**

| Grupo Cognito | Rol BD | Permisos |
|---|---|---|
| `admin` | `app_admin` | CRUD total: maestros, asignaciones, todo |
| `profesional` | `app_profesional` | Ver sus clientes/eventos asignados, registrar evidencias, marcar Realizado |
| (sin token) | `web_anon` | Nada (o solo health-check) |

### 2.2 Diseño de los calendarios tributarios (fechas por dígitos del NIT)

El vencimiento se resuelve con **un campo de configuración en `Responsabilidad` + tres tablas de calendario**. El campo en el maestro define *cómo* vence la obligación (eso es estable); las fechas concretas —que cambian cada año y varían por dígitos del NIT— viven en tablas propias:

```
responsabilidad
  + modo_vencimiento  CHECK IN ('CALENDARIO_NIT', 'FECHA_FIJA')   ← campo de configuración

calendario_tributario            -- cabecera: un calendario por obligación/ámbito/año
  id_calendario        PK
  nombre               -- "DIAN – IVA Bimestral 2026", "ICA Bogotá 2026"
  año
  ambito               -- Nacional / Departamental / Municipal
  cod_municipio        -- FK a municipios, NULL si es nacional
  digitos_nit          CHECK IN (1, 2)   -- cuántos dígitos finales del NIT usa

calendario_fecha                 -- detalle: la grilla de fechas del calendario
  id_calendario_fecha  PK
  id_calendario        FK
  periodo              -- "Bimestre 1 (Ene–Feb)", "Enero", "Cuota 1"…
  nit_desde            -- 0–9 (1 dígito) o 0–99 (2 dígitos)
  nit_hasta            -- permite rangos tipo DIAN: "terminados en 0 y 1"
  fecha_limite         DATE

responsabilidad_calendario       -- asocia cada responsabilidad a su calendario vigente
  id_responsabilidad   FK
  año
  id_calendario        FK
  UNIQUE (id_responsabilidad, año)
```

**Por qué así y no un solo campo con las fechas en `Responsabilidad`:**

1. Los calendarios **cambian cada año** — con la tabla puente se carga el calendario del año nuevo sin tocar el maestro y se conserva la historia.
2. Una misma obligación tiene **una fecha distinta por cada terminación de NIT y periodo** (hasta 100 combinaciones con 2 dígitos) — eso es una grilla, no un campo.
3. Un mismo calendario es **reutilizable** por varias responsabilidades del mismo ámbito/municipio.

**Cómo lo usa `generar_eventos` (Regla 3):** para cada responsabilidad activa del cliente en el año → busca su calendario en `responsabilidad_calendario` → toma los últimos `digitos_nit` dígitos del NIT del cliente (sin dígito de verificación) → por cada `periodo` busca en `calendario_fecha` la fila cuyo rango `nit_desde–nit_hasta` contiene esa terminación → crea el evento `Pendiente` con esa `fecha_limite`. Si `modo_vencimiento = 'FECHA_FIJA'`, las fechas salen de una grilla sin dígitos (mismas tablas, con `digitos_nit` NULL y una sola fila por periodo).

**Implicación en `Clientes`:** el NIT debe almacenarse en dos columnas — `nit` (numérico, sin puntos) y `digito_verificacion` — porque los dígitos que determinan la fecha son los del NIT **sin** el DV.

**Validación nueva:** no se pueden generar eventos si la responsabilidad no tiene calendario asociado para ese año → error claro "falta cargar el calendario tributario AAAA".

### 2.3 Ajuste al modelo: los eventos se ligan a `ResponsabilidadesCliente`

En el documento fuente, `EventosCalendario` apunta a `id_asignacion_cliente` + `id_responsabilidad` como referencias sueltas. Eso permite inconsistencias: la BD aceptaría un evento de una responsabilidad que el cliente **no tiene** marcada ese año, o de una inactiva, y la Regla 7 dependería solo de la disciplina del código. **Decisión: el evento apunta a la fila cliente–responsabilidad–año.**

```
eventos_calendario
  id_evento                   PK
  id_responsabilidad_cliente  FK → responsabilidades_cliente   ← FK PRINCIPAL: qué obligación es
  id_asignacion_cliente       FK → asignacion_cliente_profesional  ← trazabilidad: bajo qué
                                   asignación (profesional) se generó el evento
  periodo
  fecha_limite
  estado_evento
```

**Consecuencias:**

1. Es **imposible** crear un evento de una responsabilidad que el cliente no tiene: la FK lo impide. La Regla 7 pasa a ser casi estructural (solo se valida que la fila esté activa).
2. Se eliminan las columnas redundantes `año` e `id_responsabilidad` del evento: se derivan de la fila padre y no pueden divergir (se exponen vía la vista `v_eventos`).
3. `id_asignacion_cliente` se conserva porque responde otra pregunta: *quién era el profesional responsable cuando se generó el evento* — clave si el cliente se reasigna a mitad de año. Un **trigger de coherencia** valida que ambas FKs apunten al mismo cliente y año.
4. Si una responsabilidad del cliente se desactiva a mitad de año, sus eventos pendientes se localizan con un join directo para cancelarlos.

### 2.4 Estructura final de carpetas (listas para desplegar)

Estructura **tal como quedó implementada** (ver sección 3 para el detalle de qué se ejecutó y qué se difirió, principalmente Cognito):

```
responsabilidades/
├── PLANEACION.md                  ← este archivo
├── backend/                       ← desplegable con docker compose up
│   ├── docker-compose.yml         # db (postgres) + api (postgrest) + swagger + scheduler
│   ├── .env.example                # secretos: superuser, authenticator, maintenance, JWT
│   ├── postgrest.conf              # de referencia/documentación (ver nota en el archivo)
│   ├── .gitignore                  # ignora .env real
│   └── db/
│       ├── README.md               # qué hace cada script + guía de migración a Cognito
│       └── init/
│           ├── 00_bootstrap.sh     # único script que Postgres autoejecuta; aplica los .sql
│           └── sql/
│               ├── 01_roles.sql        # authenticator, web_anon, app_profesional, app_admin, app_maintenance
│               ├── 02_schema.sql       # maestros + calendario tributario + movimiento + usuarios
│               ├── 03_auth.sql         # autenticación vía AWS Cognito (JWKS + sub→id_profesional)
│               ├── 04_functions.sql    # RPC: asignar_cliente, generar_eventos, registrar_evidencia, marcar_vencidos
│               ├── 05_triggers.sql     # reglas 1–7 (validaciones y máquina de estados)
│               ├── 06_api.sql          # esquema api: vistas + RPC + grants por rol
│               ├── 07_rls.sql          # Row Level Security por profesional
│               └── 08_seed.sql         # datos de ejemplo del documento + calendario 2026
└── frontend/                      ← desplegable con npm run build (S3/CloudFront, Vercel…)
    ├── package.json
    ├── vite.config.ts / tsconfig*.json
    ├── .env.example                # VITE_API_URL
    ├── index.html
    └── src/
        ├── main.tsx / App.tsx
        ├── auth/                   # AuthContext.tsx (login SRP contra Cognito) + LoginPage.tsx
        ├── api/                    # client.ts (fetch + token), hooks.ts, types.ts
        ├── components/             # Layout.tsx, EstadoBadge.tsx, RequireRole.tsx
        └── pages/
            ├── DashboardPage.tsx
            ├── calendario/EventosPage.tsx        # lista de eventos + modal de evidencia
            ├── maestros/                          # Municipios, Subgrupos, Responsabilidades,
            │                                      #   Profesionales, Clientes, CalendariosTributarios
            └── asignaciones/                       # ResponsabilidadesCliente + Asignar
```

---

## 3. Plan de trabajo paso a paso

> **Estado (2026-08-07):** Fases 0–8 ejecutadas y verificadas de punta a punta,
> **incluyendo AWS Cognito** (User Pool `us-east-1_6wQOXsKSx`, ver sección 3.1
> más abajo): el login local con JWT firmado en la propia base de datos que se
> usó como placeholder mientras tanto quedó completamente reemplazado —
> `app.usuarios.password_hash` y `api.login` ya no existen.

### Fase 0 — Preparación del entorno
- [x] 0.1 Instalar/verificar Docker Desktop (para PostgreSQL + PostgREST locales).
- [x] 0.2 Crear las carpetas `backend/` y `frontend/` con la estructura anterior.
- [x] 0.3 Crear el User Pool en AWS Cognito (`responsabilidades-users`, grupos `app_admin`/`app_profesional` — mismos nombres que los roles de Postgres, sin Lambda intermedia), atributo `custom:id_profesional`, app client público con SRP.
- [x] 0.4 region=`us-east-1`, userPoolId=`us-east-1_6wQOXsKSx`, clientId=`663fnfh90ivorsrtvf37i6s6hd`. JWKS descargado a `backend/jwks.json` (PostgREST no soporta URL en vivo, ver nota en `backend/postgrest.conf`).

### Fase 1 — Base de datos: esquema (backend)
- [x] 1.1 `01_roles.sql`: roles `authenticator`, `web_anon`, `app_profesional`, `app_admin` **+ `app_maintenance`** (rol de conexión directa para el job que marca vencidos, ver 2.1).
- [x] 1.2 `02_schema.sql`: creado el esquema `app` con las tablas **en el orden de dependencia** del documento (las tablas de calendario tributario y `usuarios` de 1.4/03_auth.sql se agregaron al mismo archivo):
      1. `municipios` (cod_municipio PK, nombre)
      2. `grupo_responsabilidad`
      3. `subgrupo_responsabilidad` (FK a grupo)
      4. `responsabilidad` (auto_numero, codigo_dian, codigo_formulario, cod_municipio FK, id_subgrupo FK, tipo, sancion; **columna generada** `codigo_unico` = auto‖dian‖municipio‖formulario)
      5. `profesionales`
      6. `clientes` (incluir NIT y municipio como en el ejemplo)
      7. `responsabilidades_cliente` (cliente, responsabilidad, año, estado; UNIQUE(cliente, responsabilidad, año))
      8. `asignacion_cliente_profesional` (cliente, profesional, año, fecha_asignacion, estado; UNIQUE(cliente, año) activa)
      9. `eventos_calendario` (**id_responsabilidad_cliente FK principal** + id_asignacion_cliente como trazabilidad — ver sección 2.3 —, periodo, fecha_limite, estado_evento)
      10. `evidencias` (evento, profesional, observaciones, archivo_evidencia, fecha_realizacion, horas_dedicadas, estado)
- [x] 1.3 CHECK de estados (`Pendiente|Realizado|Vencido|Cancelado|Realizado vencido`), CHECK año/rangos, FKs a maestros. *(Se integró en `02_schema.sql` en vez de un archivo `03_constraints.sql` separado — no había necesidad real de aislarlo.)*
- [x] 1.4 Tablas de **calendario tributario** (sección 2.2): `calendario_tributario`, `calendario_fecha` y `responsabilidad_calendario`; campo `modo_vencimiento` en `responsabilidad`; NIT del cliente en dos columnas (`nit` + `digito_verificacion`). Verificado con dos clientes de NIT distinto: reciben fechas límite distintas del mismo calendario (ver 7.3).

### Fase 2 — Base de datos: reglas de negocio
- [x] 2.1 `04_functions.sql` — funciones RPC (expuestas como `POST /rpc/...`), **todas `SECURITY DEFINER`** (así ni `app_admin`/`app_profesional` ni `app_maintenance` necesitan privilegios directos sobre las tablas para ejecutarlas; solo `EXECUTE` sobre la función):
      - `asignar_cliente_profesional(cliente, profesional, año)` → valida **Regla 1** (tiene ≥1 responsabilidad activa ese año), crea la asignación (**Regla 2**) y llama a `generar_eventos`.
      - `generar_eventos(asignacion)` → **Reglas 3 y 7**: recorre las filas **activas** de `responsabilidades_cliente` del año de la asignación y crea un evento `Pendiente` por periodo, ligado a cada fila (sección 2.3), con fecha límite resuelta desde el calendario tributario según los últimos dígitos del NIT del cliente (sección 2.2). Falla con error claro si falta el calendario del año.
      - `registrar_evidencia(evento, observaciones, archivo, horas)` → inserta evidencia y pasa el evento a `Realizado` (o `Realizado vencido` si ya venció) — **Regla 5**.
      - `marcar_vencidos()` → job/llamada que pasa a `Vencido` los `Pendiente` con fecha límite cumplida — **Regla 4**.
- [x] 2.2 `05_triggers.sql`:
      - Trigger en `eventos_calendario`: máquina de estados — solo transiciones válidas; `Realizado`/`Cancelado` son finales (**Reglas 4 y 6**).
      - Trigger que impide marcar `Realizado` sin evidencia asociada (**Regla 5**).
      - Trigger en `asignacion_cliente_profesional` que refuerza la Regla 1 también en INSERT directo.
      - Trigger de coherencia en `eventos_calendario`: `id_responsabilidad_cliente` e `id_asignacion_cliente` deben apuntar al **mismo cliente y año** (sección 2.3).
      - Trigger en `responsabilidades_cliente`: al desactivar una responsabilidad del cliente, cancelar sus eventos `Pendiente`.
- [x] 2.3 `08_seed.sql`: cargados los datos del ejemplo del documento (Medellín/Bogotá/Cali, grupos Nacional/Departamental/Municipal, subgrupos, las 4 responsabilidades `0001-48-11001-300`…, profesionales Laura Gómez y Andrés Ruiz, cliente Empresa ABC S.A.S. con NIT `900123456` DV `7`) **más un calendario tributario 2026** (IVA bimestral, Retefuente mensual, Renta por cuota y Facturación electrónica, cada uno con fechas distintas para terminación de NIT 0-4 y 5-9) que reproduce exactamente las fechas del documento (Bim.1 → 12/03/2026, etc.) para el cliente terminado en 6. **Se agregó un segundo cliente** (NIT terminado en 2) para poder verificar en 7.3 que el mecanismo por dígitos del NIT realmente diferencia fechas.

### Fase 3 — PostgREST + seguridad
- [x] 3.1 `06_api.sql`: esquema `api` con vistas sobre `app` (incluye `v_eventos` con año, responsabilidad, cliente y profesional resueltos, y `dashboard_resumen`) + `GRANT` por rol. *(Detalle no anticipado en el plan original: al usar vistas `security_invoker = true` para que RLS respete al rol que llama, PostgreSQL exige el `GRANT` también sobre la tabla real en `app`, no solo sobre la vista en `api` — y sobre las secuencias `serial` para poder hacer INSERT. Ambos grants se agregaron.)*
- [x] 3.2 `07_rls.sql`: RLS para que `app_profesional` solo vea eventos, evidencias, responsabilidades y asignaciones de **sus** clientes (vía `app.current_profesional_id()`, que lee `id_profesional` del JWT). Verificado en 7.4.
- [x] 3.3 Configuración de PostgREST — **con login local en vez de Cognito**: `db-schemas = "api"`, `db-anon-role = "web_anon"`, `jwt-secret` = secreto simétrico HS256 (no JWKS de Cognito). El JWT trae el claim `"role"` directamente con el nombre del rol de BD (`app_admin`/`app_profesional`), así que no hizo falta `jwt-role-claim-key`. *(Nota de implementación: PostgREST no interpola `${VAR}` dentro de `postgrest.conf`, así que `docker-compose.yml` pasa la configuración real como variables `PGRST_*`; `postgrest.conf` quedó como referencia legible de qué significa cada opción.)*
- [x] 3.4 `docker-compose.yml`: servicios `db`, `api`, `swagger` **+ `scheduler`** (contenedor que llama `app.f_marcar_vencidos()` cada hora, conectado directo a Postgres con el rol `app_maintenance` — cumple el punto de "cron para marcar_vencidos" de la Fase 8 sin depender de `pg_cron`).
- [x] 3.5 Probado con `curl` end-to-end: login local → token → `GET /clientes`, `POST /rpc/asignar_cliente_profesional`, y confirmado que Reglas 1, 5 y 6 rechazan los casos inválidos con mensajes claros.

### Fase 4 — Frontend: base
- [x] 4.1 Scaffold: Vite + React 18 + TypeScript; `react-router-dom` para rutas. *(Se omitieron `@tanstack/react-query` y una librería de UI para mantener el scaffold ligero y 100% verificable en esta ejecución — ver "Próximos pasos" en `frontend/README.md`. En su lugar, `src/api/hooks.ts` implementa un `useApiGet` propio con loading/error/recargar.)*
- [x] 4.2 `auth/AuthContext.tsx`: login local (reemplaza el flujo PKCE de Cognito, mismo contrato de token) + guarda de rutas por rol (`RequireRole.tsx`) + persistencia de sesión en `localStorage`.
- [x] 4.3 `api/client.ts`: cliente PostgREST tipado (fetch con `Authorization: Bearer`, `Prefer: return=representation`, `apiGet/apiPost/apiPatch/apiDelete/apiRpc`, errores tipados `ApiError`).
- [x] 4.4 `components/Layout.tsx`: navegación por secciones que cambia según el rol (admin ve todo; profesional solo ve Dashboard y su calendario) + `EstadoBadge.tsx` con colores por estado.

### Fase 5 — Frontend: módulos de maestros (Fase A del documento)
- [x] 5.1 CRUD Municipios (`MunicipiosPage.tsx`) y Grupos/Subgrupos (`SubgruposPage.tsx`, respetando la dependencia grupo→subgrupo).
- [x] 5.2 CRUD Responsabilidades (`ResponsabilidadesPage.tsx`): formulario con selects dependientes (subgrupo, municipio), muestra el **código único compuesto** que calcula la base de datos.
- [x] 5.3 CRUD Profesionales y Clientes (`ProfesionalesPage.tsx`, `ClientesPage.tsx`), NIT en dos campos (número + dígito de verificación).
- [x] 5.4 Módulo **Calendarios tributarios** (`CalendariosTributariosPage.tsx`, solo admin): crear calendario por año/ámbito/municipio, cargar la grilla de fechas por periodo y rango de dígitos del NIT, y asociar calendarios a responsabilidades por año. *(La importación por CSV/Excel planteada en 5.4 no se implementó — carga fila por fila desde un formulario. Queda como mejora natural cuando haya que cargar calendarios reales con decenas de filas.)*

### Fase 6 — Frontend: asignaciones y operación (Fases B y C)
- [x] 6.1 `ResponsabilidadesClientePage.tsx` (Paso 7): marcar/desmarcar responsabilidades RUT del cliente por año.
- [x] 6.2 `AsignarPage.tsx` (Paso 8): llama al RPC `asignar_cliente_profesional`; muestra el mensaje exacto de la Regla 1 si el cliente no tiene responsabilidades (verificado en el navegador, ver 7.2).
- [x] 6.3 `EventosPage.tsx` (Paso 9): lista filtrable por año y estado, con nombre de cliente/responsabilidad/profesional resueltos por `v_eventos`. *(Se implementó como tabla filtrable, no como vista de calendario mensual — ver "Próximos pasos" en `frontend/README.md`. No se agregó "Cancelar evento" desde la UI; hoy se cancela vía API o automáticamente al desactivar la responsabilidad del cliente.)*
- [x] 6.4 Modal de **registro de evidencia** (Paso 10) dentro de `EventosPage.tsx`: observaciones, horas y archivo (como referencia de texto, no upload real); al guardar llama a `registrar_evidencia` y el evento pasa a Realizado/Realizado vencido. Probado en el navegador de punta a punta.
- [x] 6.5 `DashboardPage.tsx`: tarjetas de pendientes/vencidos/realizados/cancelados + tabla por profesional (filtrada por RLS para el rol profesional).

### Fase 7 — Verificación de las 7 reglas (pruebas end-to-end)
- [x] 7.1 Reproducido el recorrido completo del documento (Fases A, B, C) vía el seed + verificado en la UI real (login, dashboard, calendario, registro de evidencia).
- [x] 7.2 Casos negativos probados por `curl` y por la UI: asignar cliente sin responsabilidades (R1 ⇒ rechazado con mensaje claro, visible en `AsignarPage`), marcar Realizado sin evidencia vía `PATCH` directo (R5 ⇒ rechazado), revertir un evento `Realizado vencido` a `Pendiente` (R6 ⇒ rechazado). *(No se probó explícitamente "generar eventos sin calendario cargado" ni "evento de responsabilidad inactiva" en esta pasada — la lógica que los cubre sí quedó implementada: ver `app.f_generar_eventos` y `trg_rc_cancela_eventos`.)*
- [x] 7.3 Verificada la resolución por NIT en `v_eventos`: Empresa ABC (NIT …456, terminación 6) y Comercial XYZ (NIT …322, terminación 2) reciben fechas límite distintas del mismo calendario 2026.
- [x] 7.4 Verificado RLS de punta a punta en el navegador: Laura Gómez, autenticada como profesional, solo ve su propio cliente/eventos en el calendario y en el dashboard; no puede ver la asignación de Andrés Ruiz.

### Fase 8 — Despliegue en AWS
- [x] 8.1 **Backend desplegado en AWS real** (2026-08-05): instancia Lightsail (Ubuntu 22.04, 1GB RAM, `micro_3_0`), IP estática, Docker con `db` + `api` + `scheduler` (se omitió `swagger` para no gastar memoria). Guía completa y reproducible en [`DEPLOY_AWS.md`](DEPLOY_AWS.md). El cron de `marcar_vencidos()` ya no es un pendiente: lo resuelve el contenedor `scheduler` de la Fase 3, portable a cualquier servidor.
- [x] 8.2 **Frontend desplegado en la misma instancia** con Docker/nginx (`frontend/Dockerfile` + `frontend/nginx.conf`, multi-stage build), no en S3+CloudFront como se planteó originalmente — se decidió así en la ejecución para reusar la infraestructura Docker ya pagada y evitar un bucket S3 público. `VITE_API_URL` apunta al backend en build-time.
- [ ] 8.3 Backups de PostgreSQL — pendiente de configurar un cron de `pg_dump` en el servidor real.
- [ ] 8.4 **HTTPS vía CloudFront — bloqueado temporalmente**: la cuenta de AWS usada requiere verificación de AWS Support antes de poder crear distribuciones CloudFront. El despliegue actual funciona pero está en HTTP plano (el login en sí no manda la contraseña en claro — Cognito usa SRP — pero el resto del tráfico, tokens incluidos, sí viaja sin cifrar). Configuración de las dos distribuciones (backend proxy + frontend) ya documentada y lista en `DEPLOY_AWS.md` (Paso 6) para aplicar en cuanto la cuenta esté verificada.
- [x] 8.5 **AWS Cognito en producción (2026-08-07)**: User Pool `us-east-1_6wQOXsKSx`, grupos `app_admin`/`app_profesional`, los 4 usuarios existentes migrados con su `sub`. PostgREST valida JWKS + mapea rol directo. `presign-service` se extendió con rutas `/usuarios` (crear/activar/desactivar) usando la API de administración de Cognito — ver `presign-service/src/index.js` y `backend/db/README.md`.

- [x] 8.6 **Calendario tributario DIAN 2026 real (2026-08-07)**: se reemplazaron las fechas aproximadas de ejemplo de `DIAN - IVA Bimestral 2026`, `DIAN - Retención en la Fuente Mensual 2026` y `DIAN - Renta Personas Jurídicas 2026` por las fechas oficiales completas (una por cada dígito 0-9 del NIT, no por rangos), extraídas de `Calendario_Tributario_2026.pdf` con coordenadas de texto (`pdfplumber`) para evitar errores de alineación. Aplicado en `08_seed.sql` y como migración de datos en local/producción — no se tocaron los eventos/evidencias ya generados (son datos de prueba históricos, no obligaciones reales).

**Seguridad de la cuenta AWS:** se creó un usuario IAM dedicado (`responsabilidades-admin`, política `AdministratorAccess`) y todo el despliegue se hizo con ese usuario — la cuenta root no se usó para crear ningún recurso.

---

## 4. Decisiones y puntos abiertos

1. **Fechas límite por periodo:** ~~resuelto~~ — se modelan con los calendarios tributarios por dígitos del NIT (sección 2.2): `calendario_tributario` + `calendario_fecha` + `responsabilidad_calendario`, y el campo de configuración `modo_vencimiento` en `Responsabilidad`.
2. **Eventos ligados a `ResponsabilidadesCliente`:** decidido (sección 2.3) — el documento fuente los ligaba a asignación + responsabilidad como referencias sueltas, lo que permitía eventos de responsabilidades que el cliente no tiene; la FK a la fila cliente–responsabilidad–año lo hace imposible y la asignación queda solo como trazabilidad del profesional responsable.
3. **Archivos de evidencia:** ~~resuelto~~ (2026-08-05) — se implementó con S3 + URLs prefirmadas, tal como se planteaba como mejora futura. `evidencias.archivo_evidencia` guarda la *key* del objeto en S3 (no el archivo ni una URL pública). Como PostgREST no puede firmar peticiones AWS, se agregó un tercer componente, `presign-service/` (Node/Express mínimo, sin lógica de negocio): valida el mismo JWT que PostgREST y expone `POST /presign-upload` y `POST /presign-download`. El navegador sube y descarga directo contra S3, nunca a través de nuestro servidor. El bucket es privado (bloqueo de acceso público activado) y el servicio usa un usuario IAM con permisos únicamente sobre ese bucket (`s3:PutObject`/`s3:GetObject`, ver `deploy/s3-presign-iam-policy.json`). Guía de despliegue en `DEPLOY_AWS.md` (Paso 6.5).
4. **`Realizado vencido`:** se asigna automáticamente cuando la evidencia se registra después de la fecha límite.
5. **Librería UI del frontend:** ~~resuelto~~ (2026-08-06) — se instaló Tailwind v4 y se rediseñó la identidad visual completa (tipografía Source Serif 4/IBM Plex Sans/IBM Plex Mono, paleta propia sin los clichés típicos de diseño generado por IA) manteniendo los mismos nombres de clase en cada página, así que ningún componente `.tsx` cambió — todo el cambio vive en `frontend/src/index.css` vía `@theme`/`@apply`.
6. **`AsignacionClienteProfesional` deja de ser por año** (2026-08-06) — cambio de arquitectura pedido explícitamente: un cliente tiene un único profesional responsable de forma **permanente**, no una fila nueva cada año. La tabla perdió la columna `anio` y ganó `fecha_fin` (NULL mientras está activa); el índice único ahora es solo `(id_cliente) WHERE estado='Activa'`. Se separaron tres operaciones que antes estaban mezcladas en una sola:
   - `asignar_cliente_profesional(cliente, profesional, año)` — solo para la *primera* asignación de un cliente; sigue generando de una vez los eventos del año indicado.
   - `generar_eventos(asignacion, año)` — ahora requiere el año como parámetro explícito (ya no vive en la fila de asignación), para poder generar los eventos de años siguientes sobre la misma asignación permanente.
   - `reasignar_profesional(cliente, nuevo_profesional)` — nuevo RPC: cierra la asignación activa (`estado='Inactiva'`, `fecha_fin=hoy`), crea una nueva, y **transfiere solo los eventos abiertos** (Pendiente/Vencido) a la asignación nueva — los eventos ya cerrados (Realizado/Cancelado/Realizado vencido) se quedan en la asignación vieja como historial de quién hizo qué. Verificado con reasignaciones de ida y vuelta en local antes de aplicar en producción.
   - Efecto secundario encontrado y corregido: la política RLS de `responsabilidades_cliente` filtraba por asignación *activa*, lo que le quitaba a un profesional reasignado la visibilidad de su propio historial en `v_eventos`/`v_evidencias` (por el `JOIN`). Se quitó ese filtro — un profesional ve el historial de cualquier cliente que haya tenido alguna vez, no solo los activos.

## 5. Orden de ejecución recomendado

`Fase 0 → 1 → 2 → 3` (backend funcional y probado con curl) `→ 4 → 5 → 6` (frontend) `→ 7 → 8` (pruebas y despliegue). Las fases 1–3 son el corazón: con PostgREST, un backend bien modelado en SQL **es** la API.
