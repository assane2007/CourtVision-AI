#!/bin/bash
# ============================================================
# Plan production — Preview changes before apply
# ============================================================
set -euo pipefail

echo "🏀 CourtVision AI — Terraform Plan (PRODUCTION)"
echo "================================================="

cd "infra/terraform/environments/production"

terraform plan \
  -var-file="terraform.tfvars" \
  -out="production.tfplan"

echo ""
echo "✅ Plan saved to production.tfplan"
echo "   Review carefully, then: bash infra/scripts/apply-prod.sh"
