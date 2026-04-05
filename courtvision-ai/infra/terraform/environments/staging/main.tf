# ============================================================
# STAGING — Mirror of production with staging domains
# ============================================================

module "railway" {
  source = "../../modules/railway"

  environment   = "staging"
  github_repo   = var.github_repo
  deploy_branch = "develop"
  api_domain    = "api-staging.courtvision.ai"
  railway_token = var.railway_token

  # Staging uses Stripe TEST keys
  stripe_secret_key     = var.stripe_test_secret_key
  stripe_webhook_secret = var.stripe_test_webhook_secret

  supabase_url              = var.supabase_staging_url
  supabase_service_role_key = var.supabase_staging_service_role_key
  jwt_secret                = var.jwt_secret
  cloudflare_account_id     = var.cloudflare_account_id
  cloudflare_ai_token       = var.cloudflare_ai_token
  gemini_api_key            = var.gemini_api_key
  sentry_dsn                = module.monitoring.api_dsn
  cv_engine_secret          = var.cv_engine_secret
  allowed_origins           = "https://staging.courtvision.ai,http://localhost:3000"
}

module "cloudflare" {
  source = "../../modules/cloudflare"

  environment           = "staging"
  cloudflare_account_id = var.cloudflare_account_id
  cloudflare_api_token  = var.cloudflare_api_token
  domain_name           = "courtvision.ai"
  railway_api_domain    = module.railway.api_railway_domain
  api_rate_limit_enforcement = false
}

module "monitoring" {
  source = "../../modules/monitoring"

  environment      = "staging"
  sentry_org       = var.sentry_org
  sentry_team      = var.sentry_team
  slack_channel_id = var.slack_staging_channel_id
}

# ── Outputs ───────────────────────────────────────────────────
output "api_url" {
  value = module.railway.api_url
}

output "cdn_url" {
  value = module.cloudflare.cdn_url
}
