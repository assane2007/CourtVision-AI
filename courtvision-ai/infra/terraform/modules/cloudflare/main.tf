# ============================================================
# MODULE CLOUDFLARE — DNS, R2 Storage, KV Store
# ============================================================

# Zone DNS principale
data "cloudflare_zone" "main" {
  name = var.domain_name # "courtvision.ai"
}

# ── DNS Records ───────────────────────────────────────────────

# API (points to Railway)
resource "cloudflare_record" "api" {
  zone_id = data.cloudflare_zone.main.id
  name    = var.environment == "production" ? "api" : "api-staging"
  type    = "CNAME"
  value   = var.railway_api_domain
  proxied = true # Cloudflare proxy enabled (DDoS protection + cache)
  ttl     = 1    # Auto when proxied = true
}

# Web (Vercel manages its own CNAME)
resource "cloudflare_record" "web" {
  zone_id = data.cloudflare_zone.main.id
  name    = var.environment == "production" ? "@" : "staging"
  type    = "CNAME"
  value   = "cname.vercel-dns.com"
  proxied = false # Vercel must handle SSL certificates
  ttl     = 300
}

# ── R2 Storage — Public highlights ────────────────────────────
resource "cloudflare_r2_bucket" "highlights" {
  account_id = var.cloudflare_account_id
  name       = "courtvision-highlights-${var.environment}"
  location   = "WEUR" # Western Europe
}

# Custom domain for highlights bucket (CDN)
resource "cloudflare_r2_bucket_custom_domain" "highlights" {
  account_id  = var.cloudflare_account_id
  bucket_name = cloudflare_r2_bucket.highlights.name
  domain      = var.environment == "production" ? "cdn.courtvision.ai" : "cdn-staging.courtvision.ai"
  zone_id     = data.cloudflare_zone.main.id
}

# ── R2 Storage — Private videos (processing) ─────────────────
resource "cloudflare_r2_bucket" "videos" {
  account_id = var.cloudflare_account_id
  name       = "courtvision-videos-${var.environment}"
  location   = "WEUR"
}

# ── KV Store — Session cache + feature flags ─────────────────
resource "cloudflare_workers_kv_namespace" "sessions" {
  account_id = var.cloudflare_account_id
  title      = "courtvision-sessions-${var.environment}"
}

resource "cloudflare_workers_kv_namespace" "feature_flags" {
  account_id = var.cloudflare_account_id
  title      = "courtvision-features-${var.environment}"
}

# ── Page Rules — Cache & security ─────────────────────────────

# Aggressive caching on highlights assets
resource "cloudflare_ruleset" "cache_highlights" {
  zone_id     = data.cloudflare_zone.main.id
  name        = "Cache highlights CDN"
  description = "Aggressive caching for public video highlights"
  kind        = "zone"
  phase       = "http_request_cache_settings"

  rules {
    action = "set_cache_settings"
    action_parameters {
      cache = true
      edge_ttl {
        mode    = "override_origin"
        default = 86400 # 24h
      }
      browser_ttl {
        mode    = "override_origin"
        default = 3600 # 1h
      }
    }
    expression  = "(http.host eq \"cdn.courtvision.ai\")"
    description = "Cache CDN highlights 24h"
    enabled     = true
  }
}

# Rate limiting on the API (complements Fastify rate limiter)
resource "cloudflare_rate_limit" "api" {
  zone_id   = data.cloudflare_zone.main.id
  threshold = 200 # 200 requests
  period    = 60  # per minute
  match {
    request {
      url_pattern = "${var.environment == "production" ? "api" : "api-staging"}.courtvision.ai/api/*"
      schemes     = ["HTTPS"]
    }
  }
  action {
    mode    = "simulate" # "simulate" in staging, switch to "ban" in prod
    timeout = 60
    response {
      content_type = "application/json"
      body         = "{\"error\":\"Too many requests\",\"code\":\"RATE_LIMIT\",\"statusCode\":429}"
    }
  }
  disabled    = var.environment == "staging"
  description = "API rate limit ${var.environment}"
}
