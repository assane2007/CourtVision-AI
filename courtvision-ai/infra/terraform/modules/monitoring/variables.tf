variable "environment" {
  description = "staging or production"
  type        = string
}

variable "sentry_org" {
  description = "Sentry organization slug"
  type        = string
}

variable "sentry_team" {
  description = "Sentry team slug"
  type        = string
}

variable "slack_channel_id" {
  description = "Slack channel ID for alert notifications"
  type        = string
}
