import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { config } from '@/lib/config'
import { db } from './db'
import { rateLimit } from './rate-limit'

if (config.env.isProd && !config.auth.secret) {
  throw new Error('FATAL: NEXTAUTH_SECRET is not set. Refusing to start in production.')
}

export const authOptions: NextAuthOptions = {
  providers: [
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
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: '/',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!
        token.email = user.email!
        token.name = user.name!
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
    }
  },
  secret: process.env.NEXTAUTH_SECRET!,
}