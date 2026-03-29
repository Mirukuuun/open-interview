#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_SERVICE="${OPEN_INTERVIEW_APP_SERVICE:-open-interview-mvp.service}"
PROXY_SERVICE="${OPEN_INTERVIEW_PROXY_SERVICE:-caddy.service}"
APP_PORT="${OPEN_INTERVIEW_APP_PORT:-3106}"
PUBLIC_ORIGIN="${OPEN_INTERVIEW_PUBLIC_ORIGIN:-https://career.mimiruku.cn}"

wait_for_url() {
  local label="$1"
  local url="$2"
  local attempts="${3:-20}"
  local delay_seconds="${4:-1}"
  local attempt

  for attempt in $(seq 1 "${attempts}"); do
    if curl -x '' -fsS "${url}" >/dev/null 2>&1; then
      echo "[deploy] ${label} is ready"
      return 0
    fi
    sleep "${delay_seconds}"
  done

  echo "[deploy] ${label} failed: ${url}" >&2
  return 1
}

cd "${ROOT_DIR}"

echo "[deploy] apply database migrations"
corepack pnpm db:init

echo "[deploy] build app"
corepack pnpm build

echo "[deploy] restart ${APP_SERVICE}"
systemctl restart "${APP_SERVICE}"

echo "[deploy] reload ${PROXY_SERVICE}"
systemctl reload "${PROXY_SERVICE}"

echo "[deploy] verify local health on 127.0.0.1:${APP_PORT}"
wait_for_url "local health" "http://127.0.0.1:${APP_PORT}/api/health"

echo "[deploy] verify public import page"
wait_for_url "public import page" "${PUBLIC_ORIGIN}/import"

echo "[deploy] verify public qa page"
wait_for_url "public qa page" "${PUBLIC_ORIGIN}/qa"

echo "[deploy] success"
