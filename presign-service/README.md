# presign-service

Microservicio Node + Express con dos responsabilidades, ninguna de negocio
(eso sigue viviendo en Postgres, `backend/`) — ambas existen porque PostgREST
no puede hacerlas por sí solo:

1. **Firmar URLs de S3** para que el navegador suba/descargue evidencias
   directo contra S3, sin que el archivo pase por ningún servidor nuestro.
2. **Administrar usuarios en Cognito** (crear, activar, desactivar) — la API
   de administración de Cognito (`Admin*`) requiere credenciales de AWS, algo
   que un cliente PostgREST no puede invocar.

Todas las rutas validan el ID token de Cognito del que llama (el mismo que
usa el frontend contra PostgREST) contra el JWKS del User Pool.

## Cómo funciona (evidencias)

1. El frontend pide `POST /presign-upload` con `{ filename, contentType }` y
   su ID token de Cognito.
2. Este servicio valida el token y exige que el rol (`cognito:groups[0]`) sea
   `app_admin` o `app_profesional`.
3. Genera una clave única (`evidencias/<uuid>-<nombre_sanitizado>`) y una URL
   PUT presignada de S3 (expira en 5 minutos) → el navegador sube el archivo
   directo a esa URL.
4. Ese `key` es lo que se guarda en `evidencias.archivo_evidencia` (vía el
   RPC `registrar_evidencia`, sin cambios de esquema).
5. Para ver el archivo luego, el frontend pide `POST /presign-download` con
   el `key`, y abre la URL GET presignada que devuelve.

## Cómo funciona (usuarios)

Solo `app_admin`. `POST /usuarios` crea el usuario en Cognito
(`AdminCreateUser` + `AdminSetUserPassword` con contraseña permanente +
`AdminAddUserToGroup`) y refleja la fila en `app.usuarios` vía
`app.f_sync_usuario_cognito`, usando el rol de Postgres `app_user_sync`
(conexión directa, no pasa por PostgREST — igual que el contenedor
`scheduler` con `app_maintenance`). `PATCH /usuarios/:sub` activa/desactiva
en Cognito (`AdminEnableUser`/`AdminDisableUser`) y en `app.usuarios`.

## Seguridad

- El bucket es **privado** (bloqueo de acceso público activado); nada es
  descargable sin pasar por este servicio.
- Las credenciales de S3 son de un usuario IAM **con permisos únicamente
  sobre ese bucket** (`s3:PutObject`, `s3:GetObject`).
- Las credenciales de Cognito son de un usuario IAM **distinto**, acotado
  solo a `Admin*` sobre este User Pool (`responsabilidades-cognito-admin`,
  ver `../deploy/cognito-admin-iam-policy.json`) — ninguna de las dos es la
  credencial de administración del resto del despliegue.
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
cp .env.example .env   # completar con los mismos COGNITO_* del backend
npm start
```

Necesita llegar a Postgres (`DB_HOST=db`, rol `app_user_sync`) — en Docker,
este contenedor se une a la red `backend_default` (ver `docker-compose.yml`).

## Despliegue

```bash
cp .env.example .env   # completar con credenciales reales
docker compose up -d --build
```

Ver [`../DEPLOY_AWS.md`](../DEPLOY_AWS.md) para el paso a paso completo,
incluida la creación del bucket S3 y del usuario IAM con permisos mínimos.
