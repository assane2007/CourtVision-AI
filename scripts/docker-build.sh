#!/bin/bash
# ============================================
# CourtVision AI — Docker Build Script
# ============================================
# Usage: ./scripts/docker-build.sh [version]
#   With no argument, uses the current git short hash as the version tag.

set -euo pipefail

VERSION=${1:-$(git rev-parse --short HEAD 2>/dev/null || echo "latest")}
IMAGE="courtvision/app"

echo "=== CourtVision AI — Docker Build ==="
echo ""
echo "Building $IMAGE:$VERSION..."
docker build -t "$IMAGE:$VERSION" -t "$IMAGE:latest" .

echo ""
echo "✓ Built: $IMAGE:$VERSION"
echo "✓ Tagged: $IMAGE:latest"
echo ""
echo "To run locally:    docker compose up -d"
echo "To run in prod:    docker compose -f docker-compose.prod.yml up -d"