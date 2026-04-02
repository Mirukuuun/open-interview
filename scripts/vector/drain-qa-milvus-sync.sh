#!/usr/bin/env bash
set -euo pipefail

MAX_ROUNDS="${MILVUS_SYNC_MAX_ROUNDS:-250}"
BATCH_SIZE="${MILVUS_SYNC_BATCH_SIZE:-8}"
SLEEP_SECONDS="${MILVUS_SYNC_SLEEP_SECONDS:-0}"

for ((round = 1; round <= MAX_ROUNDS; round += 1)); do
  echo "[vector:sync:qa:drain] round=${round} batch_size=${BATCH_SIZE}"
  json_output="$(
    MILVUS_SYNC_BATCH_SIZE="${BATCH_SIZE}" \
      corepack pnpm exec tsx src/server/jobs/qa-milvus-sync-job.ts
  )"
  printf '%s\n' "${json_output}"

  IFS=$'\t' read -r enabled status pending processed <<<"$(
    printf '%s' "${json_output}" | node -e '
      const fs = require("node:fs");
      const payload = JSON.parse(fs.readFileSync(0, "utf8"));
      process.stdout.write(
        [
          String(payload.enabled ?? false),
          String(payload.status ?? ""),
          String(payload.pendingSyncCount ?? 0),
          String(payload.processedChunkCount ?? 0),
        ].join("\t"),
      );
    '
  )"

  if [[ "${enabled}" != "true" ]]; then
    echo "[vector:sync:qa:drain] Milvus is disabled under current environment." >&2
    exit 1
  fi

  if [[ "${pending}" == "0" ]]; then
    echo "[vector:sync:qa:drain] backlog drained."
    exit 0
  fi

  if [[ "${status}" == "degraded" || "${processed}" == "0" ]]; then
    echo "[vector:sync:qa:drain] pending backlog remains but no further progress can be made." >&2
    exit 1
  fi

  if (( SLEEP_SECONDS > 0 )); then
    sleep "${SLEEP_SECONDS}"
  fi
done

echo "[vector:sync:qa:drain] max rounds reached before backlog reached zero." >&2
exit 1
