# presign-service

Microservicio mínimo (Node + Express) que firma URLs de S3 para que el
navegador suba y descargue los archivos de evidencia **directamente contra
S3**, sin que el archivo pase por ningún servidor nuestro.

No contiene lógica de negocio — eso sigue viviendo en Postgres (`backend/`).
Solo existe porque PostgREST no puede firmar peticiones AWS; alguien tiene que
hacerlo, y este es el mínimo posible para eso.

## Cómo funciona

1. El frontend pide `POST /presign-upload` con `{ filename, contentType }` y
   su JWT de sesión (el mismo que emite `api.login`).
2. Este servicio valida el JWT (misma firma HS256 y secreto que PostgREST) y
   exige que el rol sea `app_admin` o `app_profesional`.
3. Genera una clave única (`evidencias/<uuid>-<nombre_sanitizado>`) y una URL
   PUT presignada de S3 (expira en 5 minutos) → el navegador sube el archivo
   directo a esa URL.
4. Ese `key` es lo que se guarda en `evidencias.archivo_evidencia` (vía el
   RPC `registrar_evidencia`, sin cambios de esquema).
5. Para ver el archivo luego, el frontend pide `POST /presign-download` con
   el `key`, y abre la URL GET presignada que devuelve.

## Seguridad

- El bucket es **privado** (bloqueo de acceso público activado); nada es
  descargable sin pasar por este servicio.
- Las credenciales de AWS que usa este servicio son de un usuario IAM
  **con permisos únicamente sobre ese bucket** (`s3:PutObject`,
  `s3:GetObject`) — no son las credenciales de administración del resto del
  despliegue.
- Las URLs firmadas expiran en 5 minutos.
- Limitación conocida: cualquier usuario autenticado (admin o profesional)
  puede pedir la descarga de cualquier `key` si la conoce — no se valida
  contra Postgres que esa evidencia le pertenezca. Las claves incluyen un
  UUID (no son adivinables) y RLS ya impide que un profesional *liste* la
  evidencia de otro en la UI, así que el riesgo práctico es bajo, pero un
  endurecimiento futuro sería consultar la BD antes de firmar la descarga.

## Desarrollo local

```bash
npm install
cp .env.example .env   # completar con el mismo APP_JWT_SECRET del backend
npm start
```

## Despliegue

```bash
cp .env.example .env   # completar con credenciales reales
docker compose up -d --build
```

Ver [`../DEPLOY_AWS.md`](../DEPLOY_AWS.md) para el paso a paso completo,
incluida la creación del bucket S3 y del usuario IAM con permisos mínimos.
