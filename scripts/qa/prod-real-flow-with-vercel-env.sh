#!/usr/bin/env bash
set -euo pipefail

PULLED_ENV_FILE="${TMPDIR:-/tmp}/autoqrent-prod-real-flow-env.$$"

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

echo "[prod-real-flow] production env geçici dosyaya alınıyor..."
vercel env pull "${PULLED_ENV_FILE}" --environment=production --yes >/dev/null
load_env_file "${PULLED_ENV_FILE}"

export BASE_URL="${PRODUCTION_BASE_URL:-https://cebindegaleri.com}"
export REAL_FLOW_ALLOW_TEST_DATA=YES
export REAL_FLOW_USE_EXISTING_ACCOUNT=1
export REAL_FLOW_CLEANUP_QA_DATA=0
export REAL_FLOW_CLEANUP_VEHICLE=1

node scripts/qa/mark-persistent-qa-account.mjs
node scripts/qa/real-user-flow-smoke.mjs
