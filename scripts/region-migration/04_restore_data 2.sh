#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_common.sh"

load_env
require_command pg_restore
require_env NEW_DB_URL
require_env DUMP_DIR
guard_project_refs

IN_FILE="$DUMP_DIR/data.dump"
JOBS="${PG_RESTORE_JOBS:-1}"

if [ ! -f "$IN_FILE" ]; then
  echo "Error: Data dump not found at $IN_FILE" >&2
  exit 1
fi

echo "Restoring data from $IN_FILE → NEW_DB_URL (jobs=$JOBS)"
pg_restore \
  --data-only \
  --no-owner \
  --no-privileges \
  --jobs="$JOBS" \
  --dbname="$NEW_DB_URL" \
  "$IN_FILE"

echo "Data restore complete"
