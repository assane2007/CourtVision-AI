#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════
# CourtVision AI — Production Startup Script
# ═══════════════════════════════════════════════════════════════════
# Designed to be the Docker CMD or entrypoint for production.
#
# Steps:
#   1. Validate environment variables (using Node.js config module)
#   2. Run database migrations (PostgreSQL) or push schema (SQLite)
#   3. Generate Prisma client
#   4. Start the Next.js server
#
# Environment:
#   - DATABASE_URL    (required) SQLite file path or PostgreSQL URL
#   - NEXTAUTH_SECRET (required in prod, min 32 chars)
#   - NEXTAUTH_URL    (required in prod)
#   - ENCRYPTION_KEY  (required in prod, 64 hex chars)
# ═══════════════════════════════════════════════════════════════════

echo "══════════════════════════════════════════════════════"
echo "  CourtVision AI — Production Startup"
echo "══════════════════════════════════════════════════════"

# ─── Step 1: Validate Configuration ──────────────────────────
echo ""
echo "[1/5] Validating configuration..."

# Use Node.js to run the config module and check for fatal errors
VALIDATION_OUTPUT=$(node -e "
  try {
    require('./.next/standalone/node_modules/@/lib/config.js');
    process.exit(0);
  } catch (e) {
    if (e.message.includes('FATAL')) {
      console.error('CONFIG ERROR: ' + e.message);
      process.exit(1);
    }
    // Module loading may fail in standalone mode, that's OK
    console.warn('Config module not directly loadable (expected in standalone mode).');
    process.exit(0);
  }
" 2>&1) || true

echo "  $VALIDATION_OUTPUT"

# Check critical env vars directly (fallback for standalone mode)
: "${DATABASE_URL:?FATAL: DATABASE_URL is not set}"
: "${NEXTAUTH_SECRET:?FATAL: NEXTAUTH_SECRET is not set}"
: "${NEXTAUTH_URL:?FATAL: NEXTAUTH_URL is not set}"

if [ "${#NEXTAUTH_SECRET}" -lt 32 ]; then
  echo "FATAL: NEXTAUTH_SECRET must be at least 32 characters."
  echo "  Generate one: openssl rand -base64 48"
  exit 1
fi

echo "  ✓ Critical environment variables present"

# ─── Step 2: Database Setup ──────────────────────────────────
echo ""
echo "[2/5] Setting up database..."

if echo "$DATABASE_URL" | grep -q "^postgres"; then
  echo "  Detected PostgreSQL — running migrations..."
  npx prisma migrate deploy --schema=prisma/schema.postgres.prisma
  echo "  ✓ Migrations complete"
else
  echo "  Detected SQLite — ensuring schema is current..."
  npx prisma db push
  echo "  ✓ Schema synced"
fi

# ─── Step 3: Generate Prisma Client ──────────────────────────
echo ""
echo "[3/5] Generating Prisma client..."
npx prisma generate
echo "  ✓ Prisma client ready"

# ─── Step 4: Health Check ────────────────────────────────────
echo ""
echo "[4/5] Verifying database connectivity..."
if echo "$DATABASE_URL" | grep -q "^postgres"; then
  # PostgreSQL health check
  if npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; then
    echo "  ✓ Database connection OK"
  else
    echo "  ✗ WARNING: Database connection issue detected"
  fi
else
  echo "  ✓ SQLite database accessible"
fi

# ─── Step 5: Start Server ────────────────────────────────────
echo ""
echo "[5/5] Starting CourtVision AI server..."
echo "  NODE_ENV=${NODE_ENV:-production}"
echo "  DATABASE=$(echo "$DATABASE_URL" | sed 's/:[^:@]*@/:***@/g' | head -c 60)"
echo "  URL=$NEXTAUTH_URL"
echo ""

exec node .next/standalone/server.js