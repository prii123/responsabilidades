# Base de datos

Todo el modelo y la lógica de negocio viven en PostgreSQL; PostgREST solo expone
el esquema `api`. Los scripts en `init/sql/` se ejecutan una sola vez, en orden,
la primera vez que se crea el volumen de datos (`db_data`).

| Archivo | Contenido |
|---|---|
| `01_roles.sql` | Roles de conexión: `authenticator`, `web_anon`, `app_profesional`, `app_admin`, `app_maintenance` |
| `02_schema.sql` | Tablas del esquema `app` (maestros, calendarios tributarios, movimiento, usuarios) |
| `03_auth.sql` | Autenticación vía AWS Cognito: helpers de RLS + funciones que usa `presign-service` para mantener `app.usuarios` en sincronía |
| `04_functions.sql` | Funciones de negocio: `f_generar_eventos`, `f_asignar_cliente_profesional`, `f_registrar_evidencia`, `f_marcar_vencidos` |
| `05_triggers.sql` | Las 7 reglas del negocio aplicadas a nivel de estructura |
| `06_api.sql` | Esquema `api`: vistas + RPC + `GRANT` por rol |
| `07_rls.sql` | Row Level Security: un profesional solo ve lo suyo |
| `08_seed.sql` | Datos de ejemplo (reproduce el recorrido completo del documento fuente) |

## Si necesitas reiniciar la base de datos desde cero

```bash
docker compose down -v   # -v borra el volumen db_data (¡destruye los datos!)
docker compose up -d
```

## Autenticación (AWS Cognito)

User Pool: `responsabilidades-users` (`us-east-1_6wQOXsKSx`, región `us-east-1`).
PostgREST valida el JWT (ID token, RS256) contra el JWKS del User Pool — ver
`../jwks.json` y `../postgrest.conf` — y usa `cognito:groups[0]` directo como
rol de Postgres (`PGRST_JWT_ROLE_CLAIM_KEY`), así que los grupos del User
Pool se llaman exactamente igual que los roles: `app_admin` / `app_profesional`.

`app.usuarios` solo guarda la relación `sub` (Cognito) → `id_profesional`,
para que `app.current_profesional_id()` (usada por las políticas RLS de
`07_rls.sql`) siga funcionando igual. La mantiene `presign-service` (rutas
`POST /usuarios` y `PATCH /usuarios/:sub`) a través del rol de conexión
directa `app_user_sync` — ver `presign-service/src/index.js`.

**Rotar el JWKS** (las claves de Cognito casi nunca rotan, pero si Cognito
alguna vez las cambia, PostgREST no las recoge solo — no hace fetch de una
URL en vivo):

```bash
curl -s https://cognito-idp.us-east-1.amazonaws.com/us-east-1_6wQOXsKSx/.well-known/jwks.json \
  -o backend/jwks.json
# y redeploy del contenedor "api" (docker compose up -d --build api)
```

**Crear el primer usuario admin en un User Pool nuevo** (por ejemplo, para
levantar este proyecto contra un Cognito propio): usar la AWS CLI
(`aws cognito-idp admin-create-user` + `admin-set-user-password --permanent`
+ `admin-add-user-to-group`) y luego `SELECT app.f_sync_usuario_cognito(sub, email, rol, id_profesional)`
con el `sub` que devuelve Cognito — después de eso, la página "Usuarios" del
panel admin ya puede crear el resto.
