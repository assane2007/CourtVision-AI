#!/bin/bash
set -euo pipefail

# ============================================
# CourtVision AI — Production Startup Script
# ============================================
# Runs migrations, generates Prisma client, and starts the server.
# Designed to be the Docker CMD or entrypoint for production containers.

echo "=== CourtVision Production Startup ==="

echo "[1/4] Running database migrations..."
npx prisma migrate deploy

echo "[2/4] Generating Prisma client..."
npx prisma generate

echo "[3/4] Checking database health..."
# Simple health check — verify we can reach the database
npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1 && echo "  ✓ Database OK" || echo "  ✗ Database issue!"

echo "[4/4] Starting server..."
exec node .next/standalone/server.js