#!/usr/bin/env bash
# Production deploy: sync with origin/main and rebuild/restart the stack.
# Run on the VPS (manually or from GitHub Actions over SSH).
set -euo pipefail

APP_DIR="${APP_DIR:-/home/deploy/LearnAI}"
BRANCH="${BRANCH:-main}"
COMPOSE=(docker compose -f docker-compose.prod.yml)

cd "$APP_DIR"

echo "==> Fetching origin/$BRANCH"
git fetch origin "$BRANCH"
git checkout -q "$BRANCH"
git reset --hard "origin/$BRANCH"
echo "==> Now at $(git log --oneline -1)"

echo "==> Building and starting containers"
"${COMPOSE[@]}" up -d --build --remove-orphans

echo "==> Pruning dangling images"
docker image prune -f

"${COMPOSE[@]}" ps
echo "==> Deploy finished"