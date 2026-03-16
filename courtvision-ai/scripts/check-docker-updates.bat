@echo off
REM Docker Image Update Checker (Batch)
REM Simple version for Windows

setlocal enabledelayedexpansion

echo 🔍 Checking for Docker image updates...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REM Check if docker-compose.yml exists
if not exist "docker-compose.yml" (
    echo ❌ Error: docker-compose.yml not found
    exit /b 1
)

echo.
echo 📦 redis:7-alpine
echo   Use 'docker compose pull' to check for new versions
echo.
echo 📦 postgres:15-alpine
echo   Use 'docker compose pull' to check for new versions
echo.
echo 📦 Other images from Dockerfile builds
echo   Will be checked based on package.json updates
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ✨ Quick check complete!
echo.
echo 💡 To check actual latest versions:
echo    1. Run: docker compose pull --dry-run
echo    2. Run: docker compose pull
echo    3. Run: docker compose up -d
echo.
echo 💡 For detailed checks, use GitHub Dependabot:
echo    - Check your GitHub repo for automated Dependabot PRs
echo    - Dependabot runs weekly on Mondays at 03:00 UTC
echo.
