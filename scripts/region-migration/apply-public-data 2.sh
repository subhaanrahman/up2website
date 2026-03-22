#!/usr/bin/env bash
# Apply a public-schema data-only SQL dump to the target project (e.g. tmp/region-migration/data.sql).
# The Supabase CLI "login" role cannot run bulk INSERT/DDL; use the postgres connection URI from the Dashboard.
#
#   export NEW_DB_URL='postgresql://postgres.[ref]:[PASSWORD]@aws-0-....pooler.supabase.com:6543/postgres?sslmode=require'
#   # or direct: postgresql://postgres:[PASSWORD]@db.[ref].supabase.co:5432/postgres
#   ./scripts/region-migration/apply-public-data.sh
#
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
require_command() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1" >&2; exit 1; }; }
require_command psql

: "${NEW_DB_URL:?Set NEW_DB_URL to the target Postgres URI (Dashboard → Settings → Database)}"
DATA_FILE="${DATA_FILE:-$ROOT_DIR/tmp/region-migration/data.sql}"
if [ ! -f "$DATA_FILE" ]; then
  echo "Error: $DATA_FILE not found. Generate with supabase db dump (linked to old project) or pg_dump." >&2
  exit 1
fi

echo "Applying $DATA_FILE to target database..."
psql "$NEW_DB_URL" -v ON_ERROR_STOP=1 -f "$DATA_FILE"
echo "Done."
