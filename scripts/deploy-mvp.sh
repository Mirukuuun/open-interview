#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_SERVICE="${OPEN_INTERVIEW_APP_SERVICE:-open-interview-mvp.service}"
PROXY_SERVICE="${OPEN_INTERVIEW_PROXY_SERVICE:-caddy.service}"
APP_PORT="${OPEN_INTERVIEW_APP_PORT:-3106}"
PUBLIC_ORIGIN="${OPEN_INTERVIEW_PUBLIC_ORIGIN:-https://career.mimiruku.cn}"
RUNTIME_DIST_DIR="${OPEN_INTERVIEW_RUNTIME_DIST_DIR:-.next-runtime}"
RUNTIME_DIST_STAGE_DIR="${RUNTIME_DIST_DIR}.stage"
RUNTIME_DIST_BACKUP_DIR="${RUNTIME_DIST_DIR}.backup"
SYSTEMD_DROPIN_DIR="/etc/systemd/system/${APP_SERVICE}.d"
RUNTIME_DIST_DROPIN_FILE="${SYSTEMD_DROPIN_DIR}/runtime-dist.conf"
RUNTIME_SWAPPED="0"
NEXT_ENV_SNAPSHOT_FILE=""
TSCONFIG_SNAPSHOT_FILE=""

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

snapshot_typegen_files() {
  NEXT_ENV_SNAPSHOT_FILE="$(mktemp)"
  TSCONFIG_SNAPSHOT_FILE="$(mktemp)"

  cp "next-env.d.ts" "${NEXT_ENV_SNAPSHOT_FILE}"
  cp "tsconfig.json" "${TSCONFIG_SNAPSHOT_FILE}"
}

restore_typegen_files() {
  if [ -n "${NEXT_ENV_SNAPSHOT_FILE}" ] && [ -f "${NEXT_ENV_SNAPSHOT_FILE}" ]; then
    cp "${NEXT_ENV_SNAPSHOT_FILE}" "next-env.d.ts"
    rm -f "${NEXT_ENV_SNAPSHOT_FILE}"
    NEXT_ENV_SNAPSHOT_FILE=""
  fi

  if [ -n "${TSCONFIG_SNAPSHOT_FILE}" ] && [ -f "${TSCONFIG_SNAPSHOT_FILE}" ]; then
    cp "${TSCONFIG_SNAPSHOT_FILE}" "tsconfig.json"
    rm -f "${TSCONFIG_SNAPSHOT_FILE}"
    TSCONFIG_SNAPSHOT_FILE=""
  fi
}

ensure_runtime_dist_dropin() {
  local tmp_file

  mkdir -p "${SYSTEMD_DROPIN_DIR}"
  tmp_file="$(mktemp)"
  printf "[Service]\nEnvironment=NEXT_DIST_DIR=%s\n" "${RUNTIME_DIST_DIR}" > "${tmp_file}"

  if ! cmp -s "${tmp_file}" "${RUNTIME_DIST_DROPIN_FILE}" 2>/dev/null; then
    mv "${tmp_file}" "${RUNTIME_DIST_DROPIN_FILE}"
    echo "[deploy] reload systemd units"
    systemctl daemon-reload
  else
    rm -f "${tmp_file}"
  fi
}

rollback_runtime_dist() {
  if [ "${RUNTIME_SWAPPED}" != "1" ]; then
    return 0
  fi

  echo "[deploy] deploy failed, restore previous runtime dist" >&2

  rm -rf "${RUNTIME_DIST_DIR}"

  if [ -d "${RUNTIME_DIST_BACKUP_DIR}" ]; then
    mv "${RUNTIME_DIST_BACKUP_DIR}" "${RUNTIME_DIST_DIR}"
    systemctl start "${APP_SERVICE}" || true
  fi
}

handle_deploy_error() {
  local exit_code="$?"

  restore_typegen_files
  rollback_runtime_dist
  exit "${exit_code}"
}

trap 'handle_deploy_error' ERR

cd "${ROOT_DIR}"

ensure_runtime_dist_dropin

echo "[deploy] apply database migrations"
corepack pnpm db:init

echo "[deploy] build app into ${RUNTIME_DIST_STAGE_DIR}"
rm -rf "${RUNTIME_DIST_STAGE_DIR}"
snapshot_typegen_files
NEXT_DIST_DIR="${RUNTIME_DIST_STAGE_DIR}" corepack pnpm build
restore_typegen_files

echo "[deploy] stop ${APP_SERVICE}"
systemctl stop "${APP_SERVICE}"

echo "[deploy] swap runtime dist"
rm -rf "${RUNTIME_DIST_BACKUP_DIR}"
if [ -d "${RUNTIME_DIST_DIR}" ]; then
  mv "${RUNTIME_DIST_DIR}" "${RUNTIME_DIST_BACKUP_DIR}"
fi
mv "${RUNTIME_DIST_STAGE_DIR}" "${RUNTIME_DIST_DIR}"
RUNTIME_SWAPPED="1"

echo "[deploy] start ${APP_SERVICE}"
systemctl start "${APP_SERVICE}"

echo "[deploy] reload ${PROXY_SERVICE}"
systemctl reload "${PROXY_SERVICE}"

echo "[deploy] verify local health on 127.0.0.1:${APP_PORT}"
wait_for_url "local health" "http://127.0.0.1:${APP_PORT}/api/health"

echo "[deploy] verify public questions page"
wait_for_url "public questions page" "${PUBLIC_ORIGIN}/questions"

echo "[deploy] verify public import page"
wait_for_url "public import page" "${PUBLIC_ORIGIN}/import"

echo "[deploy] verify public qa page"
wait_for_url "public qa page" "${PUBLIC_ORIGIN}/qa"

rm -rf "${RUNTIME_DIST_BACKUP_DIR}"
trap - ERR

echo "[deploy] success"
