/**
 * Jest Setup — Set required env vars before envalid runs.
 * These are test-only dummy values so cleanEnv() doesn't crash.
 */
process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = 'https://test-project.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key-placeholder'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-placeholder'
