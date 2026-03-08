# ============================================================
# BACKEND — Remote State Configuration
# ============================================================

# Option A : Terraform Cloud (recommended for team collaboration)
terraform {
  backend "remote" {
    organization = "courtvision"

    workspaces {
      prefix = "courtvision-"
      # Creates courtvision-staging and courtvision-production
    }
  }
}

# Option B : S3-compatible backend (if Terraform Cloud unavailable)
# Uncomment below and comment out the block above.
#
# terraform {
#   backend "s3" {
#     bucket         = "courtvision-tfstate"
#     key            = "terraform.tfstate"
#     region         = "auto"
#     endpoint       = "https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"
#     access_key     = var.r2_access_key
#     secret_key     = var.r2_secret_key
#     skip_region_validation      = true
#     skip_credentials_validation = true
#     skip_metadata_api_check     = true
#     force_path_style            = true
#   }
# }
