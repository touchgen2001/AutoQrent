#!/usr/bin/env bash
set -euo pipefail

PULLED_ENV_FILE="${TMPDIR:-/tmp}/autoqrent-prod-smoke-env.$$"

cleanup() {
  rm -f "${PULLED_ENV_FILE}"
}

trap cleanup EXIT

load_env_file() {
  local file_path="$1"
  [[ -f "${file_path}" ]] || return 0

  while IFS= read -r line || [[ -n "${line}" ]]; do
    [[ -z "${line}" || "${line}" =~ ^[[:space:]]*# ]] && continue
    [[ "${line}" == *"="* ]] || continue

    local key="${line%%=*}"
    local value="${line#*=}"
    key="$(printf '%s' "${key}" | xargs)"
    value="$(printf '%s' "${value}" | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')"

    if [[ "${value}" =~ ^\".*\"$ || "${value}" =~ ^\'.*\'$ ]]; then
      value="${value:1:${#value}-2}"
    fi

    [[ -z "${key}" || -z "${value}" ]] && continue
    export "${key}=${value}"
  done < "${file_path}"
}

load_env_file ".env.local"

echo "[prod-smoke-auth] pulling readable production env into a temporary file..."
vercel env pull "${PULLED_ENV_FILE}" --environment=production --yes >/dev/null
load_env_file "${PULLED_ENV_FILE}"

export PRODUCTION_BASE_URL="${PRODUCTION_BASE_URL:-https://cebindegaleri.com}"
export PRODUCTION_WWW_BASE_URL="${PRODUCTION_WWW_BASE_URL:-https://www.cebindegaleri.com}"
export PROD_SMOKE_REQUIRE_AUTH=1

if [[ -z "${SMOKE_TEST_EMAIL:-}" || -z "${SMOKE_TEST_PASSWORD:-}" ]]; then
  echo "[prod-smoke-auth] missing SMOKE_TEST_EMAIL/SMOKE_TEST_PASSWORD."
  echo "[prod-smoke-auth] Vercel sensitive values are write-only for local pulls; set them in shell env or .env.local for local authenticated smoke."
fi

echo "[prod-smoke-auth] running authenticated production smoke..."
pnpm smoke:prod
