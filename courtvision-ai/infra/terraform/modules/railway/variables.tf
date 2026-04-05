variable "environment" {
  description = "Deployment environment (staging or production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be 'staging' or 'production'."
  }
}

variable "github_repo" {
  description = "GitHub repository in 'org/repo' format"
  type        = string
}

variable "deploy_branch" {
  description = "Git branch to deploy"
  type        = string
  default     = "main"
}

variable "api_domain" {
  description = "Custom domain for the API (e.g. api.courtvision.ai)"
  type        = string
}

variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
  sensitive   = true
}

variable "supabase_service_role_key" {
  description = "Supabase service role key (admin)"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret (min 256 bits)"
  type        = string
  sensitive   = true
}

variable "stripe_secret_key" {
  description = "Stripe secret key"
  type        = string
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook validation secret"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
  sensitive   = true
}

variable "cloudflare_ai_token" {
  description = "Cloudflare Workers AI token"
  type        = string
  sensitive   = true
}

variable "gemini_api_key" {
  description = "Gemini API key (primary cloud LLM)"
  type        = string
  sensitive   = true
}

variable "sentry_dsn" {
  description = "Sentry DSN for error monitoring"
  type        = string
  sensitive   = true
}

variable "cv_engine_secret" {
  description = "Internal secret key for CV Engine service"
  type        = string
  sensitive   = true
}

variable "allowed_origins" {
  description = "Allowed CORS origins (comma-separated)"
  type        = string
}

variable "railway_token" {
  description = "Railway API token"
  type        = string
  sensitive   = true
}
