#!/usr/bin/env bash
set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-security/backups/supabase}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
DB_URL="${SUPABASE_DB_URL:-${DATABASE_URL:-}}"

if [[ -z "$DB_URL" ]]; then
  echo "ERROR: SUPABASE_DB_URL or DATABASE_URL must be set." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "ERROR: pg_dump not found. Install PostgreSQL client tools." >&2
  exit 1
fi

HASH_CMD=(shasum -a 256)
if command -v sha256sum >/dev/null 2>&1; then
  HASH_CMD=(sha256sum)
fi

mkdir -p "$BACKUP_ROOT"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_FILE="$BACKUP_ROOT/supabase_${TIMESTAMP}.dump"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
META_FILE="${BACKUP_FILE}.meta"

echo "[backup] starting: ${BACKUP_FILE}"
pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file "$BACKUP_FILE" \
  "$DB_URL"

FILE_SIZE="$(wc -c < "$BACKUP_FILE" | tr -d ' ')"
if [[ "$FILE_SIZE" -lt 1024 ]]; then
  echo "ERROR: backup file is unexpectedly small (${FILE_SIZE} bytes)." >&2
  exit 1
fi

"${HASH_CMD[@]}" "$BACKUP_FILE" | awk '{print $1}' > "$CHECKSUM_FILE"

{
  echo "created_at_utc=${TIMESTAMP}"
  echo "backup_file=${BACKUP_FILE}"
  echo "size_bytes=${FILE_SIZE}"
  echo "retention_days=${RETENTION_DAYS}"
  echo "pg_dump_version=$(pg_dump --version | tr -d '\n')"
} > "$META_FILE"

find "$BACKUP_ROOT" -type f -name '*.dump' -mtime +"${RETENTION_DAYS}" -delete || true
find "$BACKUP_ROOT" -type f -name '*.sha256' -mtime +"${RETENTION_DAYS}" -delete || true
find "$BACKUP_ROOT" -type f -name '*.meta' -mtime +"${RETENTION_DAYS}" -delete || true

echo "[backup] ok"
echo "file=${BACKUP_FILE}"
echo "checksum=${CHECKSUM_FILE}"
