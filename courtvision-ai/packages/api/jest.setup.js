/**
 * Jest Setup — Set required env vars before envalid runs.
 * These are test-only dummy values so cleanEnv() doesn't crash.
 */
process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = 'https://test-project.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key-placeholder'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-placeholder'

// Stripe — required so env.STRIPE_WEBHOOK_SECRET / env.STRIPE_SECRET_KEY
// are not frozen as empty strings by envalid's cleanEnv().
process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder_for_jest'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_for_testing_only'
process.env.STRIPE_PRICE_PLAYER = 'price_player_test'
process.env.STRIPE_PRICE_COACH = 'price_coach_test'
process.env.STRIPE_PRICE_ACADEMY = 'price_academy_test'
