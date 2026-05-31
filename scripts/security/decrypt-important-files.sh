#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LIST_FILE="${LIST_FILE:-$ROOT_DIR/security/important-files.txt}"
VAULT_DIR="${VAULT_DIR:-$ROOT_DIR/security/vault/encrypted}"
TARGET_ROOT="${TARGET_ROOT:-$ROOT_DIR/security/vault/decrypted}"
RESTORE_TO_ORIGINAL=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --restore)
      RESTORE_TO_ORIGINAL=1
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
    --target)
      TARGET_ROOT="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1"
      echo "Usage: $0 [--restore] [--list <file>] [--vault <dir>] [--target <dir>]"
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

if [[ "$RESTORE_TO_ORIGINAL" -eq 0 ]]; then
  mkdir -p "$TARGET_ROOT"
fi

restored=0
skipped=0

while IFS= read -r path || [[ -n "$path" ]]; do
  path="${path#"${path%%[![:space:]]*}"}"
  path="${path%"${path##*[![:space:]]}"}"
  [[ -z "$path" || "${path:0:1}" == "#" ]] && continue

  src="$VAULT_DIR/$path.enc"
  if [[ ! -f "$src" ]]; then
    skipped=$((skipped + 1))
    continue
  fi

  if [[ "$RESTORE_TO_ORIGINAL" -eq 1 ]]; then
    dst="$ROOT_DIR/$path"
  else
    dst="$TARGET_ROOT/$path"
  fi

  mkdir -p "$(dirname "$dst")"

  openssl enc -d -aes-256-cbc -pbkdf2 -iter 250000 -md sha256 \
    -in "$src" \
    -out "$dst" \
    -pass env:SECURITY_VAULT_PASSPHRASE

  chmod 600 "$dst"
  restored=$((restored + 1))
done < "$LIST_FILE"

echo "Decryption completed."
echo "  restored: $restored"
echo "  missing/skipped: $skipped"
if [[ "$RESTORE_TO_ORIGINAL" -eq 1 ]]; then
  echo "  destination: original paths"
else
  echo "  destination root: $TARGET_ROOT"
fi
