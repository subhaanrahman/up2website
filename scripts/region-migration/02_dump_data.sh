#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_common.sh"

load_env
require_command pg_dump
require_env OLD_DB_URL
require_env DUMP_DIR
guard_project_refs

SCHEMAS="${DUMP_SCHEMAS:-public}"
OUT_FILE="$DUMP_DIR/data.dump"

ensure_dump_dir "$DUMP_DIR"

echo "Dumping data ($SCHEMAS) from OLD_DB_URL → $OUT_FILE"
pg_dump \
  --format=custom \
  --data-only \
  --no-owner \
  --no-privileges \
  --schema="$SCHEMAS" \
  --file="$OUT_FILE" \
  "$OLD_DB_URL"

echo "Data dump complete: $OUT_FILE"
