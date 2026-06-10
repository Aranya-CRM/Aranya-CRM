#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/aranya-crm}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.backend.prod.yaml}"
ENV_FILE="${ENV_FILE:-.env}"
IMAGE="${1:-${BACKEND_IMAGE:-}}"

if [ -z "$IMAGE" ]; then
  echo "Usage: BACKEND_IMAGE=<image> $0"
  echo "   or: $0 <image>"
  exit 64
fi

cd "$APP_DIR"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Missing compose file: $APP_DIR/$COMPOSE_FILE"
  exit 66
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing environment file: $APP_DIR/$ENV_FILE"
  exit 66
fi

if [ ! -f "secrets/firebase-service-account.json" ]; then
  echo "Missing Firebase service account: $APP_DIR/secrets/firebase-service-account.json"
  exit 66
fi

export BACKEND_IMAGE="$IMAGE"

echo "Deploying backend image: $BACKEND_IMAGE"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull backend
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d backend

echo "Waiting for backend health check..."
for attempt in $(seq 1 30); do
  if curl -fsS "http://localhost:${BACKEND_PORT:-8080}/actuator/health" >/dev/null; then
    echo "Backend is healthy."
    docker image prune -f
    exit 0
  fi

  echo "Health check attempt $attempt failed; retrying..."
  sleep 5
done

echo "Backend did not become healthy in time."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=120 backend
exit 1
