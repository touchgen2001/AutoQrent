#!/usr/bin/env bash
set -euo pipefail

DRILL_DIR="${TMPDIR:-/tmp}/autoqrent-linked-restore-drill.$$"
CONTAINER="autoqrent-restore-drill-$$"

cleanup() {
  docker rm -f "${CONTAINER}" >/dev/null 2>&1 || true
  rm -rf "${DRILL_DIR}"
}

trap cleanup EXIT

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker is required for the isolated restore drill." >&2
  exit 1
fi

mkdir -p "${DRILL_DIR}"

echo "[linked-restore-drill] dumping linked public schema..."
pnpm exec supabase db dump --linked --schema public --file "${DRILL_DIR}/schema.sql"

echo "[linked-restore-drill] dumping linked public data..."
pnpm exec supabase db dump --linked --schema public --data-only --use-copy --file "${DRILL_DIR}/data.sql"

echo "[linked-restore-drill] starting disposable PostgreSQL 17..."
docker run -d \
  --name "${CONTAINER}" \
  -e POSTGRES_PASSWORD=restore-drill-password \
  -e POSTGRES_DB=restore_drill \
  postgres:17 >/dev/null

for _ in $(seq 1 30); do
  if docker exec "${CONTAINER}" pg_isready -U postgres -d restore_drill >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

docker exec "${CONTAINER}" pg_isready -U postgres -d restore_drill >/dev/null
docker cp "${DRILL_DIR}/schema.sql" "${CONTAINER}:/tmp/schema.sql" >/dev/null
docker cp "${DRILL_DIR}/data.sql" "${CONTAINER}:/tmp/data.sql" >/dev/null

docker exec "${CONTAINER}" psql -U postgres -d restore_drill --set ON_ERROR_STOP=1 --command "
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema if not exists auth;
  create schema if not exists storage;
  create table if not exists auth.users (
    id uuid primary key,
    email text
  );
  create or replace function auth.uid() returns uuid language sql stable as 'select null::uuid';
  create or replace function auth.jwt() returns jsonb language sql stable as 'select ''{}''::jsonb';
  create or replace function auth.role() returns text language sql stable as 'select null::text';
  create or replace function auth.email() returns text language sql stable as 'select null::text';
" >/dev/null

docker exec "${CONTAINER}" psql -U postgres -d restore_drill --set ON_ERROR_STOP=1 --file /tmp/schema.sql >/dev/null
docker exec "${CONTAINER}" psql -U postgres -d restore_drill --set ON_ERROR_STOP=1 --command "set session_replication_role = replica;" --file /tmp/data.sql >/dev/null

docker exec "${CONTAINER}" psql -U postgres -d restore_drill --set ON_ERROR_STOP=1 --tuples-only --command "
  select json_build_object(
    'galleries', (select count(*) from public.galleries),
    'vehicles', (select count(*) from public.vehicles),
    'leads', (select count(*) from public.leads)
  );
"

echo "[linked-restore-drill] ok"
