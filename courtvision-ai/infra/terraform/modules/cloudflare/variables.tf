variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
  sensitive   = true
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token with Zone:Edit, DNS:Edit, R2:Edit permissions"
  type        = string
  sensitive   = true
}

variable "domain_name" {
  description = "Primary domain (e.g. courtvision.ai)"
  type        = string
  default     = "courtvision.ai"
}

variable "environment" {
  description = "staging or production"
  type        = string
}

variable "railway_api_domain" {
  description = "Railway API domain (e.g. api-xxx.up.railway.app)"
  type        = string
}
