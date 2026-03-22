#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEFAULT_ENV_FILE="$ROOT_DIR/scripts/region-migration/env.local"

load_env() {
  local env_file="${ENV_FILE:-$DEFAULT_ENV_FILE}"
  if [ -f "$env_file" ]; then
    # shellcheck disable=SC1090
    source "$env_file"
  fi
}

require_command() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "Error: Required command not found: $cmd" >&2
    exit 1
  }
}

require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "Error: Missing required env var: $name" >&2
    exit 1
  fi
}

guard_project_refs() {
  if [ -n "${OLD_PROJECT_REF:-}" ] && [ -n "${NEW_PROJECT_REF:-}" ]; then
    if [ "$OLD_PROJECT_REF" = "$NEW_PROJECT_REF" ]; then
      echo "Error: OLD_PROJECT_REF and NEW_PROJECT_REF must be different." >&2
      exit 1
    fi
  fi
}

ensure_dump_dir() {
  local dir="$1"
  mkdir -p "$dir"
}

warn_link_restore() {
  local original_ref="$1"
  if [ -n "$original_ref" ] && [ "$original_ref" != "${NEW_PROJECT_REF:-}" ]; then
    echo "Note: supabase CLI will be re-linked back to $original_ref at the end." >&2
  fi
}

read_config_project_id() {
  local config_file="$ROOT_DIR/supabase/config.toml"
  if [ ! -f "$config_file" ]; then
    echo ""
    return 0
  fi
  local line
  line=$(grep -E '^project_id\s*=\s*"' "$config_file" | head -n 1 || true)
  if [ -z "$line" ]; then
    echo ""
    return 0
  fi
  echo "$line" | sed -E 's/^project_id[[:space:]]*=[[:space:]]*"([^"]+)"/\1/'
}
