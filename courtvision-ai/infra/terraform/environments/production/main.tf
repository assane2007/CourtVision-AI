# ============================================================
# PRODUCTION — Orchestration of all modules
# ============================================================

module "railway" {
  source = "../../modules/railway"

  environment   = "production"
  github_repo   = var.github_repo
  deploy_branch = "main"
  api_domain    = "api.courtvision.ai"
  railway_token = var.railway_token

  supabase_url              = var.supabase_url
  supabase_service_role_key = var.supabase_service_role_key
  jwt_secret                = var.jwt_secret
  stripe_secret_key         = var.stripe_secret_key
  stripe_webhook_secret     = var.stripe_webhook_secret
  cloudflare_account_id     = var.cloudflare_account_id
  cloudflare_ai_token       = var.cloudflare_ai_token
  groq_api_key              = var.groq_api_key
  sentry_dsn                = module.monitoring.api_dsn
  cv_engine_secret          = var.cv_engine_secret
  allowed_origins           = "https://courtvision.ai,https://www.courtvision.ai"
}

module "cloudflare" {
  source = "../../modules/cloudflare"

  environment           = "production"
  cloudflare_account_id = var.cloudflare_account_id
  cloudflare_api_token  = var.cloudflare_api_token
  domain_name           = "courtvision.ai"
  railway_api_domain    = module.railway.api_railway_domain
}

module "monitoring" {
  source = "../../modules/monitoring"

  environment      = "production"
  sentry_org       = var.sentry_org
  sentry_team      = var.sentry_team
  slack_channel_id = var.slack_channel_id
}

# ── Global outputs ────────────────────────────────────────────
output "api_url" {
  value = module.railway.api_url
}

output "cdn_url" {
  value = module.cloudflare.cdn_url
}
