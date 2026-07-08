import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from './db'
import { rateLimit } from './rate-limit'

if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
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
      }
      return token
    },
    async session({ session, token }) {
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