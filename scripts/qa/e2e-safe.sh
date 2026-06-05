#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

SERVER_PID=""
LOCK_DIR="/tmp/autoqrent-e2e-safe.lock"

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "[e2e-safe] another e2e-safe run is already active: $LOCK_DIR"
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

if [[ "${E2E_SKIP_BUILD:-0}" != "1" ]]; then
  echo "[e2e-safe] building app with low-concurrency profile..."
  CI=1 pnpm build
else
  echo "[e2e-safe] skipping build (E2E_SKIP_BUILD=1)"
fi

echo "[e2e-safe] starting production server on 127.0.0.1:3000..."
pnpm exec next start -p 3000 -H 127.0.0.1 >/tmp/autoqrent-e2e-server.log 2>&1 &
SERVER_PID="$!"

ready="0"
for _ in $(seq 1 90); do
  if curl -fsS http://127.0.0.1:3000 >/dev/null 2>&1; then
    ready="1"
    break
  fi
  sleep 1
done

if [[ "$ready" != "1" ]]; then
  echo "[e2e-safe] server failed to become ready"
  tail -n 120 /tmp/autoqrent-e2e-server.log || true
  exit 1
fi

echo "[e2e-safe] running playwright with single worker..."
PLAYWRIGHT_SKIP_WEBSERVER=1 \
PLAYWRIGHT_MAX_WORKERS=1 \
PLAYWRIGHT_RETRIES=0 \
pnpm exec playwright test --workers=1 --retries=0
