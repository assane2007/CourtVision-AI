# ============================================================
# MODULE RAILWAY — Services principaux CourtVision
# ============================================================

# Projet Railway principal
resource "railway_project" "courtvision" {
  name        = "courtvision-${var.environment}"
  description = "CourtVision AI — ${var.environment}"
}

# ── Service API (Fastify) ────────────────────────────────────
resource "railway_service" "api" {
  project_id = railway_project.courtvision.id
  name       = "api"

  source = {
    repo   = var.github_repo
    branch = var.deploy_branch
  }
}

resource "railway_variable" "api_vars" {
  for_each = {
    NODE_ENV                  = var.environment
    PORT                      = "8080"
    SUPABASE_URL              = var.supabase_url
    SUPABASE_SERVICE_ROLE_KEY = var.supabase_service_role_key
    JWT_SECRET                = var.jwt_secret
    REDIS_URL                 = "redis://${railway_service.redis.private_domain}:6379"
    STRIPE_SECRET_KEY         = var.stripe_secret_key
    STRIPE_WEBHOOK_SECRET     = var.stripe_webhook_secret
    CLOUDFLARE_ACCOUNT_ID     = var.cloudflare_account_id
    CLOUDFLARE_AI_TOKEN       = var.cloudflare_ai_token
    GEMINI_API_KEY            = var.gemini_api_key
    SENTRY_DSN                = var.sentry_dsn
    ENABLE_SPATIAL_3D         = "false"
    ENABLE_TIKTOK             = var.environment == "production" ? "false" : "false"
    LOG_LEVEL                 = var.environment == "production" ? "info" : "debug"
    ALLOWED_ORIGINS           = var.allowed_origins
  }

  project_id = railway_project.courtvision.id
  service_id = railway_service.api.id
  name       = each.key
  value      = each.value
}

# ── Service Redis ─────────────────────────────────────────────
resource "railway_service" "redis" {
  project_id = railway_project.courtvision.id
  name       = "redis"

  source = {
    image = "redis:7-alpine"
  }
}

# ── Service CV Engine (FastAPI GPU) ──────────────────────────
# Note: GPU on Railway requires a Pro plan
resource "railway_service" "cv_engine" {
  project_id = railway_project.courtvision.id
  name       = "cv-engine"

  source = {
    repo   = var.github_repo
    branch = var.deploy_branch
  }
}

resource "railway_variable" "cv_engine_vars" {
  for_each = {
    PYTHON_ENV     = var.environment
    API_SECRET_KEY = var.cv_engine_secret
    REDIS_URL      = "redis://${railway_service.redis.private_domain}:6379"
  }

  project_id = railway_project.courtvision.id
  service_id = railway_service.cv_engine.id
  name       = each.key
  value      = each.value
}

# ── Custom Domain for API ─────────────────────────────────────
resource "railway_custom_domain" "api" {
  project_id = railway_project.courtvision.id
  service_id = railway_service.api.id
  domain     = var.api_domain
  # Example: api.courtvision.ai (prod) or api-staging.courtvision.ai (staging)
}
