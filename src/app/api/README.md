# CourtVision AI — API Reference

## Base URL
`/api`

## Authentication
All authenticated endpoints require a valid Supabase JWT via `Authorization: Bearer <token>`.

## Rate Limiting
Redis-backed sliding window (60s). Limits vary by endpoint and subscription tier.

## Core Endpoints
- Auth: `/api/auth/*` — Supabase authentication
- Player: `/api/player/*` — Profile, onboarding, stats
- Training: `/api/training/*`, `/api/drills/*` — Drills, sessions
- AI: `/api/ai/*`, `/api/ai-coach/*` — LLM coaching, VLM form analysis
- Videos: `/api/videos/*` — Upload, analyze, export
- Social: `/api/feed/*`, `/api/friends/*`, `/api/messages/*` — Social features
- Payments: `/api/stripe/*` — Stripe checkout, portal, webhooks
- Admin: `/api/admin/*` — Admin dashboard (admin only)

## Versioning
API version: v1 (implicit). All routes are stable.