#!/bin/bash
# Este es el ÚNICO script que Postgres ejecuta automáticamente al crear el
# contenedor (docker-entrypoint-initdb.d solo escanea el nivel raíz). Aplica,
# en orden, los .sql que viven en ./sql pasándoles como variables psql los
# secretos que vienen del entorno del contenedor (ver docker-compose.yml).
set -euo pipefail

SQL_DIR="/docker-entrypoint-initdb.d/sql"

run_sql() {
  echo ">> Ejecutando $1"
  psql -v ON_ERROR_STOP=1 \
       -v authenticator_password="${AUTHENTICATOR_PASSWORD:?falta AUTHENTICATOR_PASSWORD}" \
       -v maintenance_password="${MAINTENANCE_PASSWORD:?falta MAINTENANCE_PASSWORD}" \
       -v user_sync_password="${USER_SYNC_PASSWORD:?falta USER_SYNC_PASSWORD}" \
       --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
       -f "$SQL_DIR/$1"
}

for f in 01_roles.sql 02_schema.sql 03_auth.sql 04_functions.sql 05_triggers.sql 06_api.sql 07_rls.sql 08_seed.sql; do
  run_sql "$f"
done

echo ">> Base de datos inicializada correctamente."
