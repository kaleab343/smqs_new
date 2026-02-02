#!/usr/bin/env sh
set -e

# Start all services with Docker Compose (no Node/npm required)

if ! command -v docker >/dev/null 2>&1; then
  echo "[ERROR] Docker is not installed or not on PATH." >&2
  echo "Install Docker Engine or Docker Desktop and try again." >&2
  exit 1
fi

echo "Starting containers (this may take several minutes on first run)..."

docker compose up --build
