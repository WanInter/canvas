#!/usr/bin/env bash
set -eu

image_ref="$1"
deploy_path="$2"
health_url="$3"
dry_run="$4"
state_file="$deploy_path/.last-image-ref"

cd "$deploy_path"
IMAGE_REF="$image_ref" docker compose config >/dev/null
if ! IMAGE_REF="$image_ref" docker compose config --images | grep -Fxq "$image_ref"; then
  echo "Compose app image does not match the selected digest" >&2
  exit 1
fi
if [ "$dry_run" = "true" ]; then
  echo "dry-run: SSH, Compose, and selected image verified"
  exit 0
fi

previous_ref=""
if [ -s "$state_file" ]; then
  previous_ref=$(sed -n '1p' "$state_file")
fi
if [ -z "$previous_ref" ]; then
  container_id=$(docker compose ps -q app 2>/dev/null || true)
  if [ -n "$container_id" ]; then
    previous_ref=$(docker inspect --format '{{.Config.Image}}' "$container_id" 2>/dev/null || true)
  fi
fi

IMAGE_REF="$image_ref" docker compose pull app
IMAGE_REF="$image_ref" docker compose up -d --no-build app

ready=0
attempt=1
while [ "$attempt" -le 30 ]; do
  if curl -fsS --max-time 5 "$health_url" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 2
  attempt=$((attempt + 1))
done

if [ "$ready" -eq 1 ]; then
  printf '%s\n' "$image_ref" > "$state_file"
  exit 0
fi

if [ -n "$previous_ref" ] && [ "$previous_ref" != "$image_ref" ]; then
  echo "new image failed health check; rolling back" >&2
  IMAGE_REF="$previous_ref" docker compose up -d --no-build app
fi
exit 1
