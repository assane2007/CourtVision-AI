#!/bin/bash

# Docker Image Update Checker
# Compares current images in docker-compose.yml with latest available versions

set -e

COMPOSE_FILE="${1:-.}/docker-compose.yml"
REGISTRY="registry.hub.docker.com"

echo "🔍 Checking for Docker image updates..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Extract images from docker-compose.yml
IMAGES=$(grep -E '^\s+image:' "$COMPOSE_FILE" | sed 's/.*image: //' | sort -u)

for IMAGE in $IMAGES; do
  # Skip build context entries
  if [[ $IMAGE == "build:" ]] || [[ $IMAGE == "" ]]; then
    continue
  fi

  # Parse image name and tag
  if [[ $IMAGE == *":"* ]]; then
    IMG_NAME="${IMAGE%:*}"
    CURRENT_TAG="${IMAGE#*:}"
  else
    IMG_NAME="$IMAGE"
    CURRENT_TAG="latest"
  fi

  # Get latest tag from Docker Hub
  echo ""
  echo "📦 $IMAGE"
  
  # Attempt to get latest tag
  if command -v curl &> /dev/null; then
    LATEST_TAG=$(curl -s "https://registry.hub.docker.com/v2/repositories/$IMG_NAME/tags/?page_size=100" | \
                  jq -r '.results[0].name' 2>/dev/null || echo "N/A")
    
    if [[ "$LATEST_TAG" != "N/A" ]] && [[ "$CURRENT_TAG" != "$LATEST_TAG" ]]; then
      echo "  Current:  $CURRENT_TAG"
      echo "  Latest:   $LATEST_TAG ⬆️"
    else
      echo "  Current:  $CURRENT_TAG ✅ (up to date)"
    fi
  else
    echo "  ⚠️  curl not available for checking"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Check complete!"
echo ""
echo "💡 To apply updates manually:"
echo "   1. Update docker-compose.yml with new image tags"
echo "   2. Run: docker compose pull"
echo "   3. Run: docker compose up -d"
