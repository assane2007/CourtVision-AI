#!/bin/bash
# ============================================================
# Apply staging — Deploy staging infrastructure
# ============================================================
set -euo pipefail

echo "🏀 CourtVision AI — Terraform Apply (STAGING)"
echo "==============================================="

cd "infra/terraform/environments/staging"

# Use saved plan if available, otherwise plan + apply
if [ -f "staging.tfplan" ]; then
  echo "Using saved plan: staging.tfplan"
  terraform apply "staging.tfplan"
  rm -f "staging.tfplan"
else
  echo "No saved plan found. Running plan + apply..."
  terraform apply -var-file="terraform.tfvars"
fi

echo ""
echo "✅ Staging infrastructure updated"
echo "   Verify: https://api-staging.courtvision.ai/health"
