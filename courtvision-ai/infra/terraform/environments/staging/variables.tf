# ============================================================
# Staging Variables
# ============================================================

variable "github_repo" {
  description = "GitHub repository (org/repo)"
  type        = string
}

variable "railway_token" {
  description = "Railway API token"
  type        = string
  sensitive   = true
}

# ── Supabase (Staging) ───────────────────────────────────────
variable "supabase_staging_url" {
  description = "Supabase staging project URL"
  type        = string
  sensitive   = true
}

variable "supabase_staging_service_role_key" {
  description = "Supabase staging service role key"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

# ── Stripe (TEST keys for staging) ───────────────────────────
variable "stripe_test_secret_key" {
  description = "Stripe TEST secret key (sk_test_...)"
  type        = string
  sensitive   = true
}

variable "stripe_test_webhook_secret" {
  description = "Stripe TEST webhook secret"
  type        = string
  sensitive   = true
}

# ── Cloudflare ───────────────────────────────────────────────
variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
  sensitive   = true
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "cloudflare_ai_token" {
  description = "Cloudflare Workers AI token"
  type        = string
  sensitive   = true
}

# ── AI ───────────────────────────────────────────────────────
variable "gemini_api_key" {
  description = "Gemini API key"
  type        = string
  sensitive   = true
}

# ── CV Engine ────────────────────────────────────────────────
variable "cv_engine_secret" {
  description = "CV Engine internal secret"
  type        = string
  sensitive   = true
}

# ── Monitoring ───────────────────────────────────────────────
variable "sentry_org" {
  description = "Sentry organization slug"
  type        = string
}

variable "sentry_team" {
  description = "Sentry team slug"
  type        = string
}

variable "slack_staging_channel_id" {
  description = "Slack channel ID for staging alerts"
  type        = string
}
