#!/bin/bash
# ============================================================
# Bootstrap Terraform — First-time setup
# ============================================================
set -euo pipefail

ENVIRONMENT=${1:-staging}

echo "🏀 CourtVision AI — Terraform Init ($ENVIRONMENT)"
echo "=================================================="

# Prerequisites check
command -v terraform >/dev/null 2>&1 || { echo "❌ terraform not installed. brew install terraform / choco install terraform"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ git not installed"; exit 1; }

TERRAFORM_VERSION=$(terraform --version | head -1 | cut -d' ' -f2)
echo "✅ Terraform $TERRAFORM_VERSION"

# Verify .tfvars exists
TFVARS="infra/terraform/environments/$ENVIRONMENT/terraform.tfvars"
if [ ! -f "$TFVARS" ]; then
  echo "❌ $TFVARS missing."
  echo "   Copy and fill the file:"
  echo "   cp infra/terraform/environments/$ENVIRONMENT/terraform.tfvars.example $TFVARS"
  exit 1
fi
echo "✅ terraform.tfvars found"

# Verify .tfvars is not tracked by git
if git ls-files --error-unmatch "$TFVARS" &>/dev/null; then
  echo "🚨 WARNING: $TFVARS is tracked by git! Remove it immediately:"
  echo "   git rm --cached $TFVARS"
  exit 1
fi
echo "✅ terraform.tfvars is not tracked by git"

# Init Terraform
cd "infra/terraform/environments/$ENVIRONMENT"
terraform init -upgrade

echo ""
echo "✅ Terraform initialized for environment: $ENVIRONMENT"
echo ""
echo "Next steps:"
echo "  Plan   → bash infra/scripts/plan-$ENVIRONMENT.sh"
echo "  Apply  → bash infra/scripts/apply-$ENVIRONMENT.sh"
