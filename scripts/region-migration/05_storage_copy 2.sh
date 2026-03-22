#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_common.sh"

load_env
require_command supabase
require_env OLD_PROJECT_REF
require_env NEW_PROJECT_REF
require_env STORAGE_BUCKETS
require_env DUMP_DIR
guard_project_refs

ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# DUMP_DIR in env.local is often relative to repo root (e.g. ./tmp/region-migration)
case "${DUMP_DIR:-}" in
  /*) ;;
  *) DUMP_DIR="$ROOT_DIR/${DUMP_DIR#./}" ;;
esac
STORAGE_DIR="$DUMP_DIR/storage"

ensure_dump_dir "$STORAGE_DIR"

ORIGINAL_REF=$(read_config_project_id)
warn_link_restore "$ORIGINAL_REF"

echo "Linking to OLD_PROJECT_REF=$OLD_PROJECT_REF"
( cd "$ROOT_DIR" && supabase link --project-ref "$OLD_PROJECT_REF" )

IFS=',' read -r -a BUCKETS <<< "$STORAGE_BUCKETS"
for bucket in "${BUCKETS[@]}"; do
  bucket_trimmed="$(echo "$bucket" | xargs)"
  if [ -z "$bucket_trimmed" ]; then
    continue
  fi
  echo "Downloading bucket: $bucket_trimmed"
  ( cd "$ROOT_DIR" && supabase --experimental storage cp -r "ss:///$bucket_trimmed" "$STORAGE_DIR/$bucket_trimmed" )
  echo "Download complete: $STORAGE_DIR/$bucket_trimmed"

  echo "Linking to NEW_PROJECT_REF=$NEW_PROJECT_REF"
  ( cd "$ROOT_DIR" && supabase link --project-ref "$NEW_PROJECT_REF" )

  echo "Uploading bucket: $bucket_trimmed"
  ( cd "$ROOT_DIR" && supabase --experimental storage cp -r "$STORAGE_DIR/$bucket_trimmed" "ss:///$bucket_trimmed" )
  echo "Upload complete: ss:///$bucket_trimmed"

  echo "Linking back to OLD_PROJECT_REF=$OLD_PROJECT_REF"
  ( cd "$ROOT_DIR" && supabase link --project-ref "$OLD_PROJECT_REF" )
  echo "---"
done

if [ -n "$ORIGINAL_REF" ] && [ "$ORIGINAL_REF" != "$OLD_PROJECT_REF" ]; then
  echo "Restoring original link to $ORIGINAL_REF"
  ( cd "$ROOT_DIR" && supabase link --project-ref "$ORIGINAL_REF" )
fi

echo "Storage copy complete"
