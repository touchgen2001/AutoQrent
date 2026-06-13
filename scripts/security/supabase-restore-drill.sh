#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup-file.dump>" >&2
  exit 1
fi

BACKUP_FILE="$1"
SOURCE_DB_URL="${SUPABASE_DB_URL:-${DATABASE_URL:-}}"
TARGET_DB_URL="${SUPABASE_RESTORE_TEST_DB_URL:-}"

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "ERROR: backup file not found: ${BACKUP_FILE}" >&2
  exit 1
fi

if [[ -z "${TARGET_DB_URL}" ]]; then
  echo "ERROR: SUPABASE_RESTORE_TEST_DB_URL must point to a disposable test database." >&2
  exit 1
fi

if [[ -n "${SOURCE_DB_URL}" && "${TARGET_DB_URL}" == "${SOURCE_DB_URL}" ]]; then
  echo "ERROR: restore drill target must never equal the production/source database." >&2
  exit 1
fi

for command_name in pg_restore psql; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "ERROR: ${command_name} not found. Install PostgreSQL client tools." >&2
    exit 1
  fi
done

echo "[restore-drill] verifying archive..."
pg_restore --list "${BACKUP_FILE}" >/dev/null

echo "[restore-drill] restoring into disposable target..."
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  --dbname "${TARGET_DB_URL}" \
  "${BACKUP_FILE}"

echo "[restore-drill] verifying core schema and readable rows..."
psql "${TARGET_DB_URL}" \
  --set ON_ERROR_STOP=1 \
  --tuples-only \
  --command "
    select to_regclass('public.galleries') is not null as galleries_exists;
    select to_regclass('public.vehicles') is not null as vehicles_exists;
    select to_regclass('public.leads') is not null as leads_exists;
    select count(*) >= 0 from public.galleries;
    select count(*) >= 0 from public.vehicles;
    select count(*) >= 0 from public.leads;
  " >/dev/null

echo "[restore-drill] ok"
