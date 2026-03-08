output "api_dsn" {
  description = "Sentry DSN for the API project"
  value       = sentry_project.api.dsn_public
  sensitive   = true
}

output "mobile_dsn" {
  description = "Sentry DSN for the mobile project"
  value       = sentry_project.mobile.dsn_public
  sensitive   = true
}

output "web_dsn" {
  description = "Sentry DSN for the web project"
  value       = sentry_project.web.dsn_public
  sensitive   = true
}
