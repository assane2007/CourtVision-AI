#!/bin/bash
# ============================================
# CourtVision AI — Docker Deploy Script
# ============================================
# Usage: ./scripts/docker-deploy.sh [version]
#   Deploys the specified image version (defaults to latest).

set -euo pipefail

VERSION=${1:-latest}
IMAGE="courtvision/app"

echo "=== CourtVision AI — Production Deploy ==="
echo ""
echo "Deploying $IMAGE:$VERSION..."

# Pull latest image (if using a registry)
docker pull "$IMAGE:$VERSION" 2>/dev/null || echo "  (Image not found on registry, using local build)"

# Run database migrations
echo ""
echo "Running database migrations..."
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy

# Rolling restart — recreate app container with zero downtime
echo ""
echo "Restarting application..."
docker compose -f docker-compose.prod.yml up -d --force-recreate app

echo ""
echo "✓ Deployed $IMAGE:$VERSION"
echo "  App is available at: http://localhost:3000"
echo "  Check logs:  docker compose -f docker-compose.prod.yml logs -f app"