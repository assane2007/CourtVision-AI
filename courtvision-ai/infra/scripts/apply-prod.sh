#!/bin/bash
# ============================================================
# Apply production — With mandatory confirmation
# ============================================================
set -euo pipefail

echo "🚨 PRODUCTION DEPLOYMENT — COURTVISION AI"
echo "=========================================="
echo ""
echo "⚠️  You are about to modify PRODUCTION infrastructure."
echo "   Make sure you have:"
echo "   ✓ Reviewed the plan (bash infra/scripts/plan-prod.sh)"
echo "   ✓ Made a recent Supabase backup"
echo "   ✓ Notified the team on Slack #deployments"
echo ""
read -p "Type 'deploy-production' to confirm: " confirmation

if [ "$confirmation" != "deploy-production" ]; then
  echo "❌ Cancelled."
  exit 1
fi

cd "infra/terraform/environments/production"

# Use saved plan if available
if [ -f "production.tfplan" ]; then
  echo "Using saved plan: production.tfplan"
  terraform apply "production.tfplan"
  rm -f "production.tfplan"
else
  echo "No saved plan found. Running plan + apply..."
  terraform apply \
    -var-file="terraform.tfvars" \
    -auto-approve=false
fi

echo ""
echo "✅ Production infrastructure updated"
echo "   Verify: https://api.courtvision.ai/health"
