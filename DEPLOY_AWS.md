# Despliegue manual en AWS

Guía paso a paso para desplegar este proyecto (`backend/` + `frontend/`) en una
cuenta de AWS distinta, desde cero, usando la consola web. Al final hay un
apéndice con los comandos equivalentes de AWS CLI (es lo que se usó para
desplegar la instancia de referencia).

## Arquitectura

```
Usuario
  │  HTTP (o HTTPS si agregas CloudFront, ver paso 6)
  ▼
┌───────────────────────────────────────────────────────────┐
│  Instancia Lightsail (Ubuntu, Docker)                      │
│                                                              │
│  ┌───────────────┐  ┌─────────────────────┐ ┌─────────────┐│
│  │ frontend:80   │  │ api:3000 (PostgREST)│ │ presign:3001││
│  │ (nginx + SPA) │  │        │            │ │ (firma URLs ││
│  └───────────────┘  │        ▼            │ │  de S3)     ││
│                      │  db:5432 (Postgres) │ └──────┬──────┘│
│                      │        +             │        │       │
│                      │  scheduler (cron)    │        │       │
│                      └─────────────────────┘        │       │
└────────────────────────────────────────────────────┼───────┘
                                                        ▼
                                              S3 (bucket privado,
                                              archivos de evidencia)
```

Todo corre en **una sola instancia** con Docker: el frontend (nginx sirviendo
el build de React), el backend (Postgres + PostgREST + el job que marca
eventos vencidos) y `presign-service` (firma URLs de S3 para que el navegador
suba/descargue archivos de evidencia directo, sin pasar por nuestro
servidor) — cinco contenedores. No hay servidor de aplicación con lógica de
negocio: PostgREST expone la base de datos como API REST directamente;
`presign-service` es pura infraestructura de firma, no decide nada.

---

## Paso 0 — Requisitos

- Una cuenta de AWS (con método de pago verificado).
- Este repositorio (`backend/` y `frontend/`) en tu máquina.
- Un cliente SSH (Terminal en Mac/Linux, o Git Bash / WSL en Windows).

## Paso 1 — Crear un usuario IAM (no uses la cuenta root)

1. Consola de AWS → **IAM** → **Users** → **Create user**.
2. Nombre: `responsabilidades-admin` (o el que prefieras).
3. Marca **Provide user access to the AWS Management Console** solo si vas a
   entrar por consola con ese usuario (opcional).
4. En permisos, elige **Attach policies directly** → busca y marca
   **AdministratorAccess**.
5. Crea el usuario. Si necesitas usarlo por línea de comandos: entra al
   usuario → pestaña **Security credentials** → **Create access key** → caso
   de uso "Command Line Interface (CLI)" → guarda el Access Key ID y el
   Secret Access Key (el secreto solo se muestra una vez).
6. En tu máquina: `aws configure --profile responsabilidades` y pega esas
   credenciales, región `us-east-1` (o la que prefieras).

A partir de aquí, todo se hace con este usuario, nunca con root.

## Paso 2 — Crear el servidor (Lightsail)

Se usa **Lightsail** (no EC2 "puro") porque tiene precio fijo mensual, IP
estática incluida y una consola mucho más simple para alguien que despliega
por primera vez.

1. Consola de AWS → **Lightsail** → **Create instance**.
2. Plataforma: **Linux/Unix**. Blueprint: **OS Only → Ubuntu 22.04 LTS**.
3. **Launch script** (opcional pero recomendado — instala Docker automático):
   pega el contenido de [`deploy/lightsail-userdata.sh`](deploy/lightsail-userdata.sh)
   en el cuadro "Launch script".
4. Tamaño del plan: el de **1 GB RAM** (categoría "Linux" con IP dual-stack,
   no la variante "IPv6 only" — CloudFront y cualquier proxy externo
   necesitan poder llegar por IPv4). Con 1 GB alcanza de sobra para los 4
   contenedores (uso real medido: ~330 MB de 913 MB disponibles).
5. Nombre de la instancia: `responsabilidades-backend`. Crear.
6. Cuando esté "Running": pestaña **Networking** → **Create static IP** →
   asígnala a esta instancia. Anota esa IP, la llamaremos `<IP>` en el resto
   de la guía.
7. En la misma pestaña **Networking** → **IPv4 Firewall** → agrega reglas:
   - `SSH` puerto 22 (ya viene por defecto)
   - `Custom TCP` puerto **3000** (PostgREST) — origen "Any IPv4"
   - `Custom TCP` puerto **80** (frontend) — origen "Any IPv4"

Si **no** usaste el launch script del paso 3, conéctate por SSH (botón
"Connect using SSH" en la consola, o con tu cliente y la llave que descargues
en **Account → SSH keys → Download default key**) e instala Docker a mano:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
```

## Paso 3 — Desplegar el backend

Desde tu máquina, copia la carpeta `backend/` al servidor (reemplaza `<IP>` y
la ruta de tu llave `.pem`):

```bash
scp -i tu-llave.pem -r backend ubuntu@<IP>:~/backend
```

Conéctate por SSH y crea el archivo de secretos de producción (**nunca**
reutilices los del `.env` de desarrollo local):

```bash
ssh -i tu-llave.pem ubuntu@<IP>
cd ~/backend
cat > .env <<'EOF'
POSTGRES_DB=responsabilidades
POSTGRES_SUPERUSER=postgres
POSTGRES_SUPERUSER_PASSWORD=<genera con: openssl rand -base64 24>
POSTGRES_PORT=5432
AUTHENTICATOR_PASSWORD=<genera con: openssl rand -base64 24>
MAINTENANCE_PASSWORD=<genera con: openssl rand -base64 24>
USER_SYNC_PASSWORD=<genera con: openssl rand -base64 24>
COGNITO_USER_POOL_ID=<userPoolId de tu User Pool de Cognito>
COGNITO_CLIENT_ID=<clientId del app client>
COGNITO_REGION=us-east-1
POSTGREST_PORT=3000
SWAGGER_PORT=8080
EOF
```

Antes de levantar los contenedores, descarga el JWKS del User Pool (PostgREST
no lo hace solo, ver `backend/db/README.md#autenticación-aws-cognito`) y
asegúrate de tener al menos un usuario admin creado en Cognito (ver esa misma
sección para el bootstrap del primer usuario):

```bash
curl -s https://cognito-idp.<region>.amazonaws.com/<userPoolId>/.well-known/jwks.json -o jwks.json
```

Levanta los contenedores (se omite `swagger` a propósito para no gastar
memoria en el servidor — solo es útil en desarrollo):

```bash
sudo docker compose up -d db api scheduler
```

La primera vez tarda unos minutos (descarga imágenes + corre el seed).
Verifica con un ID token real de Cognito (obtenido por SRP, no hay endpoint
de login propio):

```bash
curl http://localhost:3000/clientes -H "Authorization: Bearer <ID token de Cognito>"
```

## Paso 4 — Desplegar el frontend

Desde tu máquina:

```bash
scp -i tu-llave.pem -r frontend ubuntu@<IP>:~/frontend
```

Por SSH, en el servidor:

```bash
cd ~/frontend
cat > .env <<EOF
VITE_API_URL=http://<IP>:3000
FRONTEND_PORT=80
EOF
sudo docker compose up -d --build
```

`VITE_API_URL` queda **incrustado en el build** (Vite compila las variables
`VITE_*`, no las lee en tiempo de ejecución) — si más adelante cambias la URL
del backend (por ejemplo al agregar HTTPS en el paso 6), hay que reconstruir:
`sudo docker compose up -d --build` de nuevo.

Prueba en el navegador: `http://<IP>/` — deberías ver la pantalla de login.

## Paso 5 — Probar de punta a punta

1. Entra con el usuario admin que creaste en Cognito (ver
   `backend/db/README.md#autenticación-aws-cognito` para el bootstrap del
   primero).
2. Deberías ver el dashboard con datos del seed de ejemplo (Empresa ABC
   S.A.S., Comercial XYZ Ltda.).
3. Prueba también con un usuario del grupo `app_profesional` para confirmar
   ese rol.

En este punto el sistema **funciona pero todo va por HTTP sin cifrar**. El
login en sí no manda la contraseña en claro (Cognito usa SRP), pero el resto
del tráfico —incluidos los tokens— sí viaja sin cifrar. Es aceptable para
probar, no para uso real con datos de clientes reales — sigue con el paso 6.

## Paso 6 — Agregar HTTPS con CloudFront (recomendado antes de uso real)

No hace falta comprar un dominio: CloudFront da una URL `https://xxxx.cloudfront.net`
gratis con certificado incluido.

> **Nota:** las cuentas de AWS nuevas a veces requieren verificación antes de
> poder crear distribuciones de CloudFront (mensaje de error
> "Your account must be verified..."). Si te pasa, abre un caso en
> **AWS Support → Create case → Account and billing** pidiendo habilitar
> CloudFront; normalmente lo resuelven en minutos u horas.

### 6.1 — Distribución para el backend (proxy HTTPS → puerto 3000)

1. **CloudFront** → **Create distribution**.
2. Origin domain: pega la **IP estática** de tu instancia Lightsail
   (`<IP>`, escrita tal cual, sin `http://`).
3. Protocol: **HTTP only**, HTTP port: **3000**.
4. Viewer protocol policy: **Redirect HTTP to HTTPS**.
5. Allowed HTTP methods: **GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE**
   (PostgREST necesita todos, no solo lectura).
6. Cache policy: **CachingDisabled** (las respuestas de la API no deben
   cachearse).
7. Origin request policy: **AllViewer** (reenvía todos los headers —
   necesario para el header `Authorization` — y todos los query strings que
   usa PostgREST para filtros).
8. Crea la distribución y espera a que el estado pase de "Deploying" a
   "Enabled" (5–15 minutos). Anota su dominio: `https://dXXXXXXXXXXXXX.cloudfront.net`.

### 6.2 — Distribución para el frontend (proxy HTTPS → puerto 80)

Repite el mismo procedimiento del 6.1 pero con **HTTP port: 80** en el
origen. Este es el dominio que vas a compartir con los usuarios finales.

### 6.3 — Reapuntar el frontend al backend HTTPS

En el servidor:

```bash
cd ~/frontend
sed -i 's|VITE_API_URL=.*|VITE_API_URL=https://dXXXXXXXXXXXXX.cloudfront.net|' .env
sudo docker compose up -d --build
```

(Sustituye por el dominio real de la distribución del **backend** del 6.1.)

También conviene cerrar los puertos 80 y 3000 a "Any IPv4" en el firewall de
Lightsail y dejarlos accesibles solo para CloudFront, pero como CloudFront no
tiene rangos de IP fijos sencillos de mantener a mano, la forma simple de
igual robustez es dejar los puertos abiertos (la API ya está protegida por
JWT) y confiar en que nadie va a usar la URL sin HTTPS a propósito.

## Paso 6.5 — Evidencias con archivo real (S3)

El registro de evidencia (Paso 10 del flujo de negocio) permite adjuntar un
archivo real, que se sube directo a S3 desde el navegador (nunca pasa por
nuestro servidor). Como PostgREST no sabe firmar peticiones AWS, hace falta
un tercer componente — `presign-service/` — solo para eso; no tiene lógica de
negocio.

### 6.5.1 — Bucket S3 privado

1. **S3** → **Create bucket**. Nombre único, por ejemplo
   `responsabilidades-evidencias-<tu-account-id>`. Región: la misma del resto
   (`us-east-1` en esta guía).
2. Deja **Block all public access** activado (por defecto) — el bucket nunca
   debe ser público, todo pasa por URLs firmadas de corta duración.
3. Pestaña **Permissions** → **Cross-origin resource sharing (CORS)** → pega
   el contenido de [`deploy/s3-cors.json`](deploy/s3-cors.json) (ajusta los
   orígenes a tu IP/dominio real).

### 6.5.2 — Dos usuarios IAM con permisos mínimos

**No reutilices** el usuario admin del Paso 1 para esto — `presign-service`
necesita dos identidades separadas, cada una acotada a lo suyo:

1. `responsabilidades-s3-presign` (solo `PutObject`/`GetObject` sobre el
   bucket de evidencias): **IAM** → **Users** → **Create user**, sin acceso a
   consola → **Add permissions** → **Create inline policy** → JSON → pega
   [`deploy/s3-presign-iam-policy.json`](deploy/s3-presign-iam-policy.json)
   (reemplaza el nombre del bucket) → **Security credentials** → **Create
   access key** ("Application running outside AWS").
2. `responsabilidades-cognito-admin` (solo `Admin*` sobre el User Pool, para
   que el panel de administración pueda crear/activar/desactivar usuarios):
   mismo procedimiento, con
   [`deploy/cognito-admin-iam-policy.json`](deploy/cognito-admin-iam-policy.json)
   (reemplaza el ARN del User Pool).

### 6.5.3 — Desplegar `presign-service`

Necesita llegar a Postgres con el rol `app_user_sync` (ver
`backend/db/README.md#autenticación-aws-cognito`) — en Docker se une a la red
`backend_default` que ya crea `backend/docker-compose.yml` (mismo host, así
que el `backend/` de este mismo servidor ya debe estar levantado antes).

```bash
scp -i tu-llave.pem -r presign-service ubuntu@<IP>:~/presign-service
ssh -i tu-llave.pem ubuntu@<IP>
cd ~/presign-service
cat > .env <<EOF
PORT=3001

COGNITO_USER_POOL_ID=<el mismo userPoolId de backend/.env>
COGNITO_CLIENT_ID=<el mismo clientId de backend/.env>
COGNITO_REGION=us-east-1
COGNITO_ACCESS_KEY_ID=<access key de responsabilidades-cognito-admin>
COGNITO_SECRET_ACCESS_KEY=<secret key de responsabilidades-cognito-admin>

S3_ACCESS_KEY_ID=<access key de responsabilidades-s3-presign>
S3_SECRET_ACCESS_KEY=<secret key de responsabilidades-s3-presign>
AWS_REGION=us-east-1
S3_BUCKET=<tu bucket de evidencias>

DB_HOST=db
DB_PORT=5432
DB_NAME=responsabilidades
USER_SYNC_PASSWORD=<el mismo valor que USER_SYNC_PASSWORD en backend/.env>

ALLOWED_ORIGINS=http://<IP>
EOF
sudo docker compose up -d --build
```

Abre el puerto **3001** en el firewall de Lightsail (igual que hiciste con
80 y 3000 en el Paso 2.7).

### 6.5.4 — Apuntar el frontend al nuevo servicio

```bash
cd ~/frontend
cat >> .env <<EOF
VITE_PRESIGN_URL=http://<IP>:3001
EOF
sudo docker compose up -d --build
```

(`VITE_PRESIGN_URL`, igual que `VITE_API_URL`, queda incrustado en el build —
si luego cambias esta URL, hay que reconstruir la imagen.)

## Paso 7 — Actualizar el despliegue tras un cambio de código

```bash
# Backend (cambios de esquema/reglas de negocio)
scp -i tu-llave.pem -r backend/db ubuntu@<IP>:~/backend/
ssh -i tu-llave.pem ubuntu@<IP> "cd ~/backend && sudo docker compose down && sudo docker compose up -d db api scheduler"
# ⚠ "down" sin -v conserva los datos; el esquema solo se re-aplica si el
#   volumen db_data no existe. Para cambios de esquema en una BD con datos
#   reales hace falta una migración, no solo re-crear el contenedor.

# Frontend (cambios de UI)
scp -i tu-llave.pem -r frontend/src frontend/*.json frontend/*.ts frontend/*.html ubuntu@<IP>:~/frontend/
ssh -i tu-llave.pem ubuntu@<IP> "cd ~/frontend && sudo docker compose up -d --build"
```

## Paso 8 — Costos aproximados

| Recurso | Costo |
|---|---|
| Lightsail 1 GB RAM | ~$7/mes |
| IP estática Lightsail | Gratis mientras esté asignada a una instancia activa |
| CloudFront (2 distribuciones, tráfico bajo) | Prácticamente $0 dentro del free tier (1 TB/mes el primer año en cuentas nuevas) |
| S3 (evidencias, uso bajo) | Centavos — $0.023/GB/mes de almacenamiento + solicitudes |
| **Total estimado** | **~$7-8/mes** |

## Paso 9 — Apagar todo (evitar cargos)

Consola → **Lightsail** → instancia → menú (⋮) → **Delete**. Esto también
libera la IP estática automáticamente si estaba asociada. Si creaste
distribuciones de CloudFront, primero **Disable** y, una vez deshabilitadas
(toma unos minutos), **Delete**. Si creaste el bucket S3 de evidencias,
vacíalo primero (**S3** → bucket → **Empty**) y luego **Delete bucket**. Los
usuarios IAM creados (`responsabilidades-admin`, `responsabilidades-s3-presign`)
se eliminan desde **IAM → Users** — primero desactiva/borra sus access keys.

## Paso 10 — Autenticación (AWS Cognito)

Este despliegue ya usa AWS Cognito para el login (no login local ni Hosted
UI/PKCE — el frontend usa el SDK directo con SRP, ver la nota en
`frontend/src/auth/AuthContext.tsx` sobre por qué no Hosted UI mientras el
sitio esté en HTTP plano). Guía completa: `backend/db/README.md#autenticación-aws-cognito`.

---

## Apéndice A — Script de arranque (Docker)

Contenido para el cuadro "Launch script" del paso 2.3:

```bash
#!/bin/bash
set -e
apt-get update -y
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
usermod -aG docker ubuntu
systemctl enable docker
```

## Apéndice B — Equivalente con AWS CLI

Para quien prefiera automatizar en vez de usar la consola (esto es, en
esencia, lo que se ejecutó para el despliegue de referencia):

```bash
# 1. Usuario IAM
aws iam create-user --user-name responsabilidades-admin
aws iam attach-user-policy --user-name responsabilidades-admin \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
aws iam create-access-key --user-name responsabilidades-admin
aws configure set aws_access_key_id <AccessKeyId> --profile responsabilidades
aws configure set aws_secret_access_key <SecretAccessKey> --profile responsabilidades
aws configure set region us-east-1 --profile responsabilidades

# 2. Instancia Lightsail (bundle 1GB dual-stack = micro_3_0)
aws lightsail create-instances --profile responsabilidades \
  --instance-names responsabilidades-backend \
  --availability-zone us-east-1a \
  --blueprint-id ubuntu_22_04 \
  --bundle-id micro_3_0 \
  --user-data file://lightsail-userdata.sh

aws lightsail allocate-static-ip --profile responsabilidades \
  --static-ip-name responsabilidades-backend-ip
aws lightsail attach-static-ip --profile responsabilidades \
  --static-ip-name responsabilidades-backend-ip \
  --instance-name responsabilidades-backend

aws lightsail put-instance-public-ports --profile responsabilidades \
  --instance-name responsabilidades-backend \
  --port-infos fromPort=22,toPort=22,protocol=TCP,cidrs=0.0.0.0/0 \
               fromPort=3000,toPort=3000,protocol=TCP,cidrs=0.0.0.0/0 \
               fromPort=80,toPort=80,protocol=TCP,cidrs=0.0.0.0/0

aws lightsail download-default-key-pair --profile responsabilidades

# 3. Copiar código y desplegar (ver pasos 3-4 de la guía manual)
scp -i lightsail-key.pem -r backend frontend ubuntu@<IP>:~/

# 4. CloudFront (backend) — requiere cuenta verificada, ver nota del paso 6
aws cloudfront create-distribution --profile responsabilidades \
  --distribution-config file://cf-backend-config.json
```

Un `cf-backend-config.json` de referencia (ajusta la IP):

```json
{
  "CallerReference": "responsabilidades-backend-2026",
  "Comment": "Proxy HTTPS hacia PostgREST",
  "Enabled": true,
  "PriceClass": "PriceClass_100",
  "Origins": {
    "Quantity": 1,
    "Items": [{
      "Id": "lightsail-backend",
      "DomainName": "<IP>",
      "CustomOriginConfig": {
        "HTTPPort": 3000,
        "HTTPSPort": 443,
        "OriginProtocolPolicy": "http-only",
        "OriginSslProtocols": { "Quantity": 1, "Items": ["TLSv1.2"] },
        "OriginReadTimeout": 30,
        "OriginKeepaliveTimeout": 5
      }
    }]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "lightsail-backend",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 7,
      "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
      "CachedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"] }
    },
    "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
    "OriginRequestPolicyId": "216adef6-5c7f-47e4-b989-5492eafa07d3",
    "Compress": true
  }
}
```

Para el frontend, la misma plantilla cambiando `HTTPPort` a `80`.
