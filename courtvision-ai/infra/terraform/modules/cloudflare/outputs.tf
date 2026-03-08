output "cdn_url" {
  description = "CDN URL for public highlights"
  value       = "https://${cloudflare_r2_bucket_custom_domain.highlights.domain}"
}

output "r2_highlights_bucket" {
  description = "R2 highlights bucket name"
  value       = cloudflare_r2_bucket.highlights.name
}

output "r2_videos_bucket" {
  description = "R2 videos bucket name"
  value       = cloudflare_r2_bucket.videos.name
}

output "kv_sessions_id" {
  description = "KV namespace ID for sessions"
  value       = cloudflare_workers_kv_namespace.sessions.id
}
