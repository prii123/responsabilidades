# Backend — PostgreSQL + PostgREST

API REST autogenerada desde el esquema SQL. No hay ningún servidor de
aplicación intermedio: la lógica de negocio (las 7 reglas, la generación de
eventos, los calendarios tributarios) vive en PostgreSQL; PostgREST solo la
expone como HTTP.

> **AWS Cognito:** la autenticación es 100% Cognito (no hay login local). Ver
> [`db/README.md`](db/README.md#autenticación-aws-cognito) para el detalle de
> cómo PostgREST valida el JWT y cómo se relaciona `sub` con `id_profesional`.

## Requisitos

- Docker y Docker Compose.
- Un User Pool de Cognito ya creado (ver `db/README.md`), con al menos un
  usuario en el grupo `app_admin`.

## Puesta en marcha

```bash
cp .env.example .env
```

Edita `.env` y define contraseñas/secretos reales
(`POSTGRES_SUPERUSER_PASSWORD`, `AUTHENTICATOR_PASSWORD`,
`MAINTENANCE_PASSWORD`, `USER_SYNC_PASSWORD`) y los datos de tu User Pool
(`COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_REGION`). Descarga el
JWKS del User Pool a `jwks.json` (PostgREST no lo hace solo):

```bash
curl -s https://cognito-idp.<region>.amazonaws.com/<userPoolId>/.well-known/jwks.json -o jwks.json
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

No hay un endpoint de login propio — el token lo emite Cognito directamente
(SRP, por ejemplo con `amazon-cognito-identity-js` desde un script, o
simplemente iniciando sesión en el frontend). Con un ID token de Cognito:

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
