#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup-file.dump>" >&2
  exit 1
fi

BACKUP_FILE="$1"
DB_URL="${SUPABASE_DB_URL:-${DATABASE_URL:-}}"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "ERROR: backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

if [[ -z "$DB_URL" ]]; then
  echo "ERROR: SUPABASE_DB_URL or DATABASE_URL must be set." >&2
  exit 1
fi

if [[ "${SUPABASE_RESTORE_CONFIRM:-}" != "YES" ]]; then
  echo "ERROR: restore is blocked." >&2
  echo "Set SUPABASE_RESTORE_CONFIRM=YES to continue." >&2
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "ERROR: pg_restore not found. Install PostgreSQL client tools." >&2
  exit 1
fi

CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [[ -f "$CHECKSUM_FILE" ]]; then
  HASH_CMD=(shasum -a 256)
  if command -v sha256sum >/dev/null 2>&1; then
    HASH_CMD=(sha256sum)
  fi
  ACTUAL_SUM="$("${HASH_CMD[@]}" "$BACKUP_FILE" | awk '{print $1}')"
  EXPECTED_SUM="$(head -n 1 "$CHECKSUM_FILE" | tr -d '[:space:]')"
  if [[ "$ACTUAL_SUM" != "$EXPECTED_SUM" ]]; then
    echo "ERROR: checksum mismatch. Restore aborted." >&2
    exit 1
  fi
fi

echo "[restore] starting: ${BACKUP_FILE}"
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  --dbname "$DB_URL" \
  "$BACKUP_FILE"

echo "[restore] ok"
