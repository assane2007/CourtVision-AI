output "api_url" {
  description = "Public API URL (full https URL)"
  value       = "https://${railway_custom_domain.api.domain}"
}

output "api_railway_domain" {
  description = "Railway-generated domain (bare hostname for CNAME targets)"
  value       = railway_service.api.default_domain
}

output "api_service_id" {
  description = "Railway API service ID (useful for CI deployments)"
  value       = railway_service.api.id
}

output "redis_private_domain" {
  description = "Redis private domain (for other Railway services)"
  value       = railway_service.redis.private_domain
  sensitive   = true
}

output "railway_project_id" {
  description = "Railway project ID"
  value       = railway_project.courtvision.id
}
