# ============================================================
# MODULE MONITORING — Sentry + Uptime
# ============================================================

# ── Sentry Projects ──────────────────────────────────────────

resource "sentry_project" "api" {
  organization = var.sentry_org
  team         = var.sentry_team
  name         = "courtvision-api-${var.environment}"
  platform     = "node-fastify"
  slug         = "courtvision-api-${var.environment}"
}

resource "sentry_project" "mobile" {
  organization = var.sentry_org
  team         = var.sentry_team
  name         = "courtvision-mobile-${var.environment}"
  platform     = "react-native"
  slug         = "courtvision-mobile-${var.environment}"
}

resource "sentry_project" "web" {
  organization = var.sentry_org
  team         = var.sentry_team
  name         = "courtvision-web-${var.environment}"
  platform     = "javascript-nextjs"
  slug         = "courtvision-web-${var.environment}"
}

# ── Sentry Alerts — Error spike ──────────────────────────────

resource "sentry_metric_alert" "api_error_rate" {
  organization      = var.sentry_org
  project           = sentry_project.api.slug
  name              = "API Error Rate Spike"
  query             = "level:error"
  aggregate         = "count()"
  time_window       = 10 # minutes
  threshold_type    = 0  # Above
  resolve_threshold = 5

  triggers {
    label           = "critical"
    threshold_type  = 0
    alert_threshold = 50 # 50 errors in 10min

    actions {
      type              = "slack"
      target_type       = "specific"
      target_identifier = var.slack_channel_id
    }
  }
}

# ── Uptime Monitoring via Sentry Crons ────────────────────────

resource "sentry_monitor" "api_health" {
  organization = var.sentry_org
  project      = sentry_project.api.slug
  name         = "API Health Check"
  slug         = "api-health-${var.environment}"

  config {
    schedule                = "*/5 * * * *" # Every 5 minutes
    schedule_type           = "crontab"
    checkin_margin          = 2 # 2min tolerance
    max_runtime             = 1 # 1min max
    failure_issue_threshold = 2 # 2 failures before alert
  }
}
