#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LIST_FILE="${LIST_FILE:-$ROOT_DIR/security/important-files.txt}"
VAULT_DIR="${VAULT_DIR:-$ROOT_DIR/security/vault/encrypted}"
REMOVE_SOURCE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --remove-source)
      REMOVE_SOURCE=1
      shift
      ;;
    --list)
      LIST_FILE="$2"
      shift 2
      ;;
    --vault)
      VAULT_DIR="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1"
      echo "Usage: $0 [--remove-source] [--list <file>] [--vault <dir>]"
      exit 1
      ;;
  esac
done

if [[ -z "${SECURITY_VAULT_PASSPHRASE:-}" ]]; then
  echo "SECURITY_VAULT_PASSPHRASE is not set."
  echo "Example:"
  echo "  export SECURITY_VAULT_PASSPHRASE='strong-passphrase'"
  exit 1
fi

if [[ ! -f "$LIST_FILE" ]]; then
  echo "List file not found: $LIST_FILE"
  exit 1
fi

mkdir -p "$VAULT_DIR"

processed=0
skipped=0

while IFS= read -r path || [[ -n "$path" ]]; do
  path="${path#"${path%%[![:space:]]*}"}"
  path="${path%"${path##*[![:space:]]}"}"
  [[ -z "$path" || "${path:0:1}" == "#" ]] && continue

  src="$ROOT_DIR/$path"
  if [[ ! -f "$src" ]]; then
    skipped=$((skipped + 1))
    continue
  fi

  dst="$VAULT_DIR/$path.enc"
  mkdir -p "$(dirname "$dst")"

  openssl enc -aes-256-cbc -pbkdf2 -iter 250000 -salt -md sha256 \
    -in "$src" \
    -out "$dst" \
    -pass env:SECURITY_VAULT_PASSPHRASE

  chmod 600 "$dst"
  processed=$((processed + 1))

  if [[ "$REMOVE_SOURCE" -eq 1 ]]; then
    rm -f "$src"
  fi
done < "$LIST_FILE"

manifest="$VAULT_DIR/manifest.sha256"
timestamp="$VAULT_DIR/metadata.txt"

if find "$VAULT_DIR" -type f -name '*.enc' -print -quit | grep -q .; then
  find "$VAULT_DIR" -type f -name '*.enc' -print0 \
    | LC_ALL=C sort -z \
    | xargs -0 shasum -a 256 > "$manifest"
else
  : > "$manifest"
fi

{
  echo "generated_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "list_file=${LIST_FILE#$ROOT_DIR/}"
  echo "processed=$processed"
  echo "skipped_missing=$skipped"
  echo "removed_source=$REMOVE_SOURCE"
} > "$timestamp"

echo "Encryption completed."
echo "  processed: $processed"
echo "  missing/skipped: $skipped"
echo "  vault: $VAULT_DIR"
echo "  manifest: $manifest"
