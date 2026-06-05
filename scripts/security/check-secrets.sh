#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "Running lightweight secret scan..."

PATTERN='(AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z\-_]{35}|sk_live_[0-9a-zA-Z]{20,}|xox[baprs]-[0-9a-zA-Z-]{10,}|-----BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY-----|[A-Za-z0-9_]*(SECRET|TOKEN|PASSWORD|API_KEY)[A-Za-z0-9_]*\s*[:=]\s*["'\''][^"'\'']{8,}["'\''])'

set +e
raw="$(rg -n --hidden -S -g '!node_modules/**' -g '!.next/**' -g '!security/vault/**' -g '!pnpm-lock.yaml' -g '!.git/**' "$PATTERN" .)"
status=$?
set -e

# Drop lines explicitly marked safe (label/description constants, fixtures, etc.).
# Each allowlisted occurrence stays auditable in code review.
matches="$(printf '%s' "$raw" | grep -v -F 'pragma: allowlist secret' || true)"

if [[ $status -eq 0 && -n "$matches" ]]; then
  echo "Potential secrets found:"
  echo "$matches"
  exit 1
fi

if [[ $status -eq 1 || -z "$matches" ]]; then
  echo "No obvious secrets found."
  exit 0
fi

echo "Scanner failed with status: $status"
exit $status
