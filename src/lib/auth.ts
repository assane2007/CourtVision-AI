import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { config } from '@/lib/config'
import { db } from './db'
import { rateLimit } from './rate-limit'

if (!config.auth.secret) {
  console.warn('[AUTH] ⚠  NEXTAUTH_SECRET is not set — sessions will be unstable.')
}

// ── Supabase Auth Provider (Google OAuth via Supabase) ─────────────────────────

function getSupabaseProviders() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return []
  }

  // If Google OAuth is configured via Supabase, add a custom provider
  // that validates tokens against Supabase and links to local Player records.
  const providers: NextAuthOptions['providers'] = []

  // Google OAuth via Supabase
  // The redirect goes through Supabase Auth, which handles the Google flow
  // and returns an access token. We validate that token server-side.
  if (process.env.GOOGLE_CLIENT_ID) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const GoogleProvider = require('next-auth/providers/google').default
      providers.push(
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
          authorization: {
            params: {
              // Request minimal scopes
              scope: 'openid email profile',
            },
          },
        }),
      )
    } catch {
      console.warn('[AUTH] ⚠  Google provider failed to load. OAuth login unavailable.')
    }
  }

  return providers
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Email + Password (local credentials)
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const rateResult = rateLimit(credentials.email)
        if (!rateResult.success) {
          return null
        }

        const player = await db.player.findUnique({
          where: { email: credentials.email }
        })

        if (!player) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, player.password)

        if (!isPasswordValid) {
          return null
        }

        // If user has 2FA enabled, return a partial user with twoFactorRequired flag.
        // The client must then call /api/auth/2fa/verify to get a full session.
        if (player.twoFactorEnabled && player.twoFactorSecret) {
          return {
            id: player.id,
            email: player.email,
            name: player.name,
            twoFactorRequired: true as const,
          }
        }

        return {
          id: player.id,
          email: player.email,
          name: player.name,
        }
      }
    }),

    // Dynamic Supabase-linked providers (Google OAuth)
    ...getSupabaseProviders(),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: '/',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id!
        token.email = user.email!
        token.name = user.name!
        token.provider = account?.provider ?? 'credentials'
        // If 2FA is required, set a short-lived partial token
        if ('twoFactorRequired' in user && user.twoFactorRequired) {
          token.twoFactorRequired = true
          // Override expiry to 5 minutes for this partial token
          token.exp = Math.floor(Date.now() / 1000) + 5 * 60
        }
      }
      return token
    },
    async session({ session, token }) {
      // If the token still has twoFactorRequired, don't expose user data
      if (token?.twoFactorRequired) {
        session.user = { id: '', email: '', name: '' } as typeof session.user
        return session
      }
      if (session.user && token) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
      }
      return session
    },
    // Link OAuth sign-in/up to local Player record
    async signIn({ account, profile }) {
      if (account?.provider === 'google' && profile?.email) {
        const existing = await db.player.findUnique({
          where: { email: profile.email },
        })

        if (!existing) {
          // Auto-create a Player record for first-time OAuth users
          await db.player.create({
            data: {
              email: profile.email,
              password: await bcrypt.hash(crypto.randomUUID(), 10),
              name: profile.name || profile.email.split('@')[0],
              avatar: profile.picture || null,
              emailVerified: profile.email_verified ? true : false,
              onboarding: false,
            },
          })
        } else {
          // Update avatar from OAuth if we have one
          if (profile.picture && !existing.avatar) {
            await db.player.update({
              where: { id: existing.id },
              data: { avatar: profile.picture },
            })
          }
        }
      }
      return true
    },
  },
  secret: process.env.NEXTAUTH_SECRET!,
}