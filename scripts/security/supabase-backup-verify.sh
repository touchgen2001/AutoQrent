#!/usr/bin/env bash
set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-security/backups/supabase}"
MIN_BYTES="${BACKUP_MIN_BYTES:-1024}"

BACKUP_FILE="${1:-}"
if [[ -z "$BACKUP_FILE" ]]; then
  BACKUP_FILE="$(ls -1t "${BACKUP_ROOT}"/supabase_*.dump 2>/dev/null | head -n 1 || true)"
fi

if [[ -z "$BACKUP_FILE" || ! -f "$BACKUP_FILE" ]]; then
  echo "ERROR: backup file not found. Provide file path or create backup first." >&2
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "ERROR: pg_restore not found. Install PostgreSQL client tools." >&2
  exit 1
fi

HASH_CMD=(shasum -a 256)
if command -v sha256sum >/dev/null 2>&1; then
  HASH_CMD=(sha256sum)
fi

FILE_SIZE="$(wc -c < "$BACKUP_FILE" | tr -d ' ')"
if [[ "$FILE_SIZE" -lt "$MIN_BYTES" ]]; then
  echo "ERROR: backup file is too small (${FILE_SIZE} bytes)." >&2
  exit 1
fi

CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [[ -f "$CHECKSUM_FILE" ]]; then
  ACTUAL_SUM="$("${HASH_CMD[@]}" "$BACKUP_FILE" | awk '{print $1}')"
  EXPECTED_SUM="$(head -n 1 "$CHECKSUM_FILE" | tr -d '[:space:]')"
  if [[ "$ACTUAL_SUM" != "$EXPECTED_SUM" ]]; then
    echo "ERROR: checksum mismatch for ${BACKUP_FILE}." >&2
    exit 1
  fi
fi

pg_restore --list "$BACKUP_FILE" >/dev/null

echo "[verify] ok"
echo "file=${BACKUP_FILE}"
echo "size_bytes=${FILE_SIZE}"
