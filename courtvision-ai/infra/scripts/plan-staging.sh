#!/bin/bash
# ============================================================
# Plan staging — Preview changes before apply
# ============================================================
set -euo pipefail

echo "🏀 CourtVision AI — Terraform Plan (STAGING)"
echo "=============================================="

cd "infra/terraform/environments/staging"

terraform plan \
  -var-file="terraform.tfvars" \
  -out="staging.tfplan"

echo ""
echo "✅ Plan saved to staging.tfplan"
echo "   To apply: bash infra/scripts/apply-staging.sh"
