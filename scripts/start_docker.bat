@echo off
setlocal ENABLEEXTENSIONS ENABLEDELAYEDEXPANSION

REM Start all services with Docker Compose
REM No Node/npm required; this calls Docker directly.

where docker >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Docker is not installed or not on PATH.
  echo Install Docker Desktop and try again: https://www.docker.com/products/docker-desktop/
  exit /b 1
)

echo Starting containers (this may take several minutes on first run)...

docker compose up --build

endlocal
