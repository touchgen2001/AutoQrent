#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

SERVER_PID=""
SMOKE_PORT="${SMOKE_PORT:-3010}"
BASE_URL="http://127.0.0.1:${SMOKE_PORT}"
LOCK_DIR="/tmp/autoqrent-smoke-safe.lock"

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "[smoke-safe] another smoke run is already active: $LOCK_DIR"
  exit 1
fi

cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    kill -TERM "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" >/dev/null 2>&1 || true
  fi
  rmdir "$LOCK_DIR" >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=1024"

if [[ "${SMOKE_SKIP_BUILD:-0}" != "1" ]]; then
  echo "[smoke-safe] building app with low-memory profile..."
  CI=1 pnpm build
else
  echo "[smoke-safe] skipping build (SMOKE_SKIP_BUILD=1)"
fi

echo "[smoke-safe] starting production server on ${BASE_URL} ..."
pnpm exec next start -p "${SMOKE_PORT}" -H 127.0.0.1 >/tmp/autoqrent-smoke-server.log 2>&1 &
SERVER_PID="$!"

ready="0"
for _ in $(seq 1 90); do
  if curl -fsS "${BASE_URL}" >/dev/null 2>&1; then
    ready="1"
    break
  fi
  sleep 1
done

if [[ "$ready" != "1" ]]; then
  echo "[smoke-safe] server failed to become ready"
  tail -n 120 /tmp/autoqrent-smoke-server.log || true
  exit 1
fi

echo "[smoke-safe] running panel API smoke..."
BASE_URL="${BASE_URL}" node scripts/qa/panel-api-smoke.mjs

if [[ "${SMOKE_INCLUDE_QR:-0}" == "1" ]]; then
  echo "[smoke-safe] running QR flow smoke..."
  BASE_URL="${BASE_URL}" node scripts/qa/verify-qr-flow.mjs
fi
