# Base de datos

Todo el modelo y la lógica de negocio viven en PostgreSQL; PostgREST solo expone
el esquema `api`. Los scripts en `init/sql/` se ejecutan una sola vez, en orden,
la primera vez que se crea el volumen de datos (`db_data`).

| Archivo | Contenido |
|---|---|
| `01_roles.sql` | Roles de conexión: `authenticator`, `web_anon`, `app_profesional`, `app_admin`, `app_maintenance` |
| `02_schema.sql` | Tablas del esquema `app` (maestros, calendarios tributarios, movimiento, usuarios) |
| `03_auth.sql` | Login local con JWT firmado en la BD (placeholder de Cognito, ver más abajo) |
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

## Migrar el login local a AWS Cognito

El login actual (`api.login`, en `03_auth.sql`) es un reemplazo temporal de
Cognito para poder desplegar y probar el sistema completo ya mismo. Cuando el
User Pool esté disponible:

1. En `../postgrest.conf`, cambiar `jwt-secret` por la URL del JWKS del User
   Pool (PostgREST valida JWKS/RS256 de forma nativa).
2. Mapear el grupo de Cognito (`cognito:groups`) a los roles `app_admin` /
   `app_profesional` con `jwt-role-claim-key`.
3. Enlazar el `sub` (o email) del token de Cognito con `app.profesionales`
   para que las políticas RLS de `07_rls.sql` sigan funcionando igual: solo
   cambia de dónde sale el claim `id_profesional`, no la lógica de RLS.
4. `app.usuarios` y `api.login` dejan de usarse (se pueden dejar inertes o
   eliminar en una migración posterior).
