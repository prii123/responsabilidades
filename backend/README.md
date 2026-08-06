# Backend — PostgreSQL + PostgREST

API REST autogenerada desde el esquema SQL. No hay ningún servidor de
aplicación intermedio: la lógica de negocio (las 7 reglas, la generación de
eventos, los calendarios tributarios) vive en PostgreSQL; PostgREST solo la
expone como HTTP.

> **AWS Cognito:** todavía no está configurado. Mientras tanto, la
> autenticación se resuelve con un login local (usuarios + JWT firmados en la
> propia base de datos) que cumple exactamente el mismo contrato que tendrá
> Cognito (`role` para el rol de BD, `id_profesional` para RLS). Ver
> [`db/README.md`](db/README.md#migrar-el-login-local-a-aws-cognito) para el
> paso a paso de la migración cuando el User Pool exista.

## Requisitos

- Docker y Docker Compose.

## Puesta en marcha

```bash
cp .env.example .env
```

Edita `.env` y define contraseñas/secretos reales (`POSTGRES_SUPERUSER_PASSWORD`,
`AUTHENTICATOR_PASSWORD`, `MAINTENANCE_PASSWORD`, `APP_JWT_SECRET`). Para
generar un secreto JWT fuerte:

```bash
openssl rand -base64 48
```

Levanta todo:

```bash
docker compose up -d
```

Esto arranca:

| Servicio | Puerto | Qué es |
|---|---|---|
| `db` | 5432 | PostgreSQL 16, con todo el esquema y el seed cargados automáticamente la primera vez |
| `api` | 3000 | PostgREST — la API REST |
| `swagger` | 8080 | Documentación interactiva (OpenAPI) de la API |
| `scheduler` | — | Contenedor sin puerto expuesto: marca eventos vencidos cada hora |

## Probar que funciona

Login con uno de los usuarios del seed (contraseña definida en
`SEED_ADMIN_PASSWORD` / `SEED_PROFESIONAL_PASSWORD` del `.env`, por defecto
`admin12345` / `profesional12345`):

```bash
curl -s -X POST http://localhost:3000/rpc/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@responsabilidades.local","password":"admin12345"}'
```

Devuelve `{"token": "...", "rol": "app_admin", ...}`. Con ese token:

```bash
TOKEN="pega-aqui-el-token"

curl -s http://localhost:3000/clientes -H "Authorization: Bearer $TOKEN"

curl -s http://localhost:3000/v_eventos -H "Authorization: Bearer $TOKEN"
```

También puedes explorar y probar todos los endpoints desde
`http://localhost:8080` (Swagger UI apuntando a `http://localhost:3000/`).

## Estructura

```
backend/
├── docker-compose.yml   # db + api (PostgREST) + swagger + scheduler
├── postgrest.conf       # config de PostgREST (interpola variables del .env)
├── .env.example
└── db/
    ├── init/
    │   ├── 00_bootstrap.sh   # único script que Postgres ejecuta al crear el contenedor
    │   └── sql/              # 01..08, aplicados en orden por 00_bootstrap.sh
    └── README.md              # detalle de cada script SQL y guía de migración a Cognito
```

## Despliegue en AWS

Ver [`../DEPLOY_AWS.md`](../DEPLOY_AWS.md) para el paso a paso completo
(Lightsail + Docker, con o sin CloudFront para HTTPS).

## Notas de despliegue en un servidor real

- Poner un reverse proxy con HTTPS (Caddy/Nginx) delante del puerto 3000; no
  exponer PostgREST directamente a Internet sin TLS.
- No exponer el puerto 5432 de `db` públicamente (quitar el mapeo de puertos
  o restringirlo a la red interna).
- Configurar backups de PostgreSQL (`pg_dump` programado o snapshots del
  volumen `db_data`).
- El contenedor `swagger` es solo para desarrollo; en producción puede
  quitarse del `docker-compose.yml`.
