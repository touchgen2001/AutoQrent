#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

PHASE_LABEL="${1:-leak-check}"
TMP_FILE="$(mktemp)"

cleanup_tmp() {
  rm -f "$TMP_FILE" >/dev/null 2>&1 || true
}
trap cleanup_tmp EXIT INT TERM

PATTERNS=(
  "playwright test"
  "next dev"
  "/.next/dev/build/postcss.js"
  "next build"
  "next start -H 127.0.0.1 -p 3000"
  "next start -H 127.0.0.1 -p 3010"
)

for pattern in "${PATTERNS[@]}"; do
  pgrep -af "$pattern" >>"$TMP_FILE" || true
done

if [[ ! -s "$TMP_FILE" ]]; then
  echo "[node-leaks][$PHASE_LABEL] ok: no matching node/next/playwright process."
  exit 0
fi

FILTERED="$(sort -u "$TMP_FILE" | awk -v self_pid="$$" -v parent_pid="$PPID" '
{
  pid = $1
  $1 = ""
  sub(/^ +/, "", $0)
  cmd = $0

  if (pid == self_pid || pid == parent_pid) next
  if (index(cmd, "check-node-leaks.sh") > 0) next
  if (index(cmd, "node:status") > 0) next

  print pid " " cmd
}
')"

if [[ -n "$FILTERED" ]]; then
  echo "[node-leaks][$PHASE_LABEL] FAILED: leftover processes detected."
  echo "$FILTERED"
  exit 1
fi

echo "[node-leaks][$PHASE_LABEL] ok: no leftover process after filtering."

