# ============================================================
# PROVIDERS — Production Environment
# ============================================================

# Cloudflare — DNS, R2 Storage, Workers KV
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Railway — API + CV Engine + Redis services
provider "railway" {
  token = var.railway_token
}

# Sentry — configured via SENTRY_AUTH_TOKEN env var
provider "sentry" {}
