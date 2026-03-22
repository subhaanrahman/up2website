#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_common.sh"

EXPECTED="${SUPABASE_EXPECTED_PROJECT_ID:-}"
if [ -z "$EXPECTED" ]; then
  echo "SUPABASE_EXPECTED_PROJECT_ID is not set; skipping project ref guard."
  exit 0
fi

ACTUAL=$(read_config_project_id)
if [ -z "$ACTUAL" ]; then
  echo "Error: Could not read project_id from supabase/config.toml" >&2
  exit 1
fi

if [ "$ACTUAL" != "$EXPECTED" ]; then
  echo "Error: supabase/config.toml project_id mismatch." >&2
  echo "Expected: $EXPECTED" >&2
  echo "Actual:   $ACTUAL" >&2
  exit 1
fi

echo "Project ref guard passed: $ACTUAL"
