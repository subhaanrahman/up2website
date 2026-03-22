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

IN_FILE="$DUMP_DIR/schema.dump"

if [ ! -f "$IN_FILE" ]; then
  echo "Error: Schema dump not found at $IN_FILE" >&2
  exit 1
fi

echo "Restoring schema from $IN_FILE → NEW_DB_URL"
pg_restore \
  --schema-only \
  --no-owner \
  --no-privileges \
  --jobs=1 \
  --dbname="$NEW_DB_URL" \
  "$IN_FILE"

echo "Schema restore complete"
