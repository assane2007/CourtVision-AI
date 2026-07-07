import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import ZAI from 'z-ai-web-dev-sdk'
import { trackError } from '@/lib/monitoring'

const CATEGORY_LABELS: Record<string, string> = {
  pocket_ball: 'Poche de balle',
  shifty: 'Démarquage',
  ball_handling: 'Dribble & Maniement',
  speed_change: 'Changement de vitesse',
  defense: 'Défense',
  shooting: 'Tir',
  footwork: 'Placement pieds',
  finishing: 'Finition',
  conditioning: 'Condition physique',
}

// GET /api/ai-coach — Fetch chat history
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const rateResult = rateLimit(`ai-coach:get:${session.user.email}`, 60, 15 * 60 * 1000)
    if (!rateResult.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
    }

    const messages = await db.aIChatMessage.findMany({
      where: { playerId: session.user.id },
      select: {
        role: true,
        content: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    })

    return NextResponse.json({
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    trackError('GET /api/ai-coach', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/ai-coach — Send message and get AI reply
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const rateResult = rateLimit(`ai-coach:post:${session.user.email}`, 20, 15 * 60 * 1000)
    if (!rateResult.success) {
      return NextResponse.json(
        { error: "Trop de messages. Attends un moment avant de continuer." },
        { status: 429 },
      )
    }

    const body = await req.json()
    const userMessage = typeof body.message === 'string' ? body.message.trim() : ''

    if (!userMessage || userMessage.length > 1000) {
      return NextResponse.json({ error: 'Message invalide (1-1000 caractères)' }, { status: 400 })
    }

    const playerId = session.user.id

    // 1. Save user message
    await db.aIChatMessage.create({
      data: {
        playerId,
        role: 'user',
        content: userMessage,
      },
    })

    // 2. Fetch player data in parallel
    const [player, recentSessions, categoryScores, recentChat] = await Promise.all([
      db.player.findUnique({
        where: { id: playerId },
        select: {
          name: true,
          level: true,
          xpLevel: true,
          position: true,
          goals: true,
        },
      }),
      db.workoutSession.findMany({
        where: { playerId },
        select: {
          startedAt: true,
          totalScore: true,
          totalReps: true,
          totalDrills: true,
        },
        orderBy: { startedAt: 'desc' },
        take: 5,
      }),
      db.workoutSessionDrill
        .findMany({
          where: { session: { playerId } },
          include: { drill: { select: { category: true, nameFr: true } } },
        })
        .then((drills) => {
          const map: Record<string, { count: number; totalScore: number }> = {}
          for (const d of drills) {
            const cat = d.drill.category
            if (!map[cat]) map[cat] = { count: 0, totalScore: 0 }
            map[cat].count++
            map[cat].totalScore += d.score
          }
          return Object.entries(map)
            .map(([cat, data]) => ({
              category: CATEGORY_LABELS[cat] || cat,
              avgScore: data.count > 0 ? Math.round((data.totalScore / data.count) * 10) / 10 : 0,
              drills: data.count,
            }))
            .sort((a, b) => b.drills - a.drills)
        }),
      db.aIChatMessage.findMany({
        where: { playerId },
        select: { role: true, content: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }).then((msgs) => msgs.reverse()),
    ])

    // 3. Build system prompt with player context
    const playerName = player?.name || 'Joueur'
    const playerLevel = player?.level || 'beginner'
    const xpLevel = player?.xpLevel || 1
    const position = player?.position || 'guard'
    const goals = player?.goals || 'general'

    const sessionsSummary = recentSessions
      .map(
        (s, i) =>
          `Séance ${i + 1} (${new Date(s.startedAt).toLocaleDateString('fr-FR')}): Score ${s.totalScore}, ${s.totalReps} reps, ${s.totalDrills} exercices`,
      )
      .join('\n') || 'Aucune séance récente'

    const categoryStr = categoryScores
      .map((c) => `${c.category}: score moyen ${c.avgScore}/100 (${c.drills} exercices)`)
      .join('\n') || 'Aucune donnée de catégorie'

    const systemPrompt = `Tu es un coach de basket professionnel francophone. Tu connais bien ce joueur:
- Nom: ${playerName}
- Niveau: ${playerLevel} (XP Level ${xpLevel})
- Position: ${position}
- Objectif: ${goals}
- Dernières séances:
${sessionsSummary}
- Stats par catégorie:
${categoryStr}

Réponds de manière concise, encourageante et en français.
Utilise des émojis pertinents. Si le joueur te demande conseil,
base tes réponses sur ses données. Si tu n'as pas assez de données,
dis-le honnêtement. Maximum 3-4 phrases par réponse.`

    // 4. Build conversation history (last 10 messages)
    const chatHistory = recentChat.map((m) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: m.content,
    }))

    // 5. Call LLM
    const zai = await ZAI.create()
    const response = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        ...chatHistory,
        { role: 'user', content: userMessage },
      ],
      thinking: { type: 'disabled' },
    })

    const reply = response.choices?.[0]?.message?.content?.trim()

    if (!reply) {
      return NextResponse.json({ error: 'Pas de réponse du coach IA' }, { status: 500 })
    }

    // 6. Save AI reply
    await db.aIChatMessage.create({
      data: {
        playerId,
        role: 'assistant',
        content: reply,
      },
    })

    // 7. Return reply
    return NextResponse.json({ reply })
  } catch (error) {
    trackError('POST /api/ai-coach', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/ai-coach — Clear all chat messages
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const rateResult = rateLimit(`ai-coach:delete:${session.user.email}`, 10, 15 * 60 * 1000)
    if (!rateResult.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
    }

    await db.aIChatMessage.deleteMany({
      where: { playerId: session.user.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    trackError('DELETE /api/ai-coach', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}