#!/usr/bin/env bash
set -euo pipefail

RELEASE_DIR="${1:-$PWD}"

cd "$RELEASE_DIR"

docker compose --env-file .env -f deploy/compose.prod.yaml ps
docker logs --tail 50 aandi-app

for attempt in $(seq 1 30); do
  if curl --fail --silent http://localhost:8080/ >/dev/null; then
    echo "Application health check passed."
    exit 0
  fi

  echo "Waiting for application health check (${attempt}/30)..."
  sleep 2
done

docker logs --tail 100 aandi-app
echo "Application health check failed after 60 seconds." >&2
exit 1
