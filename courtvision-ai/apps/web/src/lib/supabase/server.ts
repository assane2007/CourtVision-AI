import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseEnv } from './env'

export async function createServerSupabaseClient() {
    const cookieStore = await cookies()
    const env = getSupabaseEnv()

    return createServerClient(
        env.url,
        env.anonKey,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options })
                    } catch {
                        // The `set` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing user sessions.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options })
                    } catch {
                        // Same as above
                    }
                },
            },
        }
    )
}
