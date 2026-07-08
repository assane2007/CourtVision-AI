import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { trackError } from '@/lib/monitoring'
import ZAI from 'z-ai-web-dev-sdk'

function sanitize(str: string): string {
  return str.replace(/[\x00-\x1F\x7F]/g, '').slice(0, 2000)
}

// POST /api/ai/workout/generate — Generate personalized workout plan
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const playerId = session.user.id

    const rl = rateLimit(`ai-workout-gen:${playerId}`, 5, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
    }

    const body = await req.json()
    const {
      durationMin = 30,
      focusAreas = [],
      equipment = [],
      intensity = 'medium',
    } = body

    const validDurations = [15, 20, 30, 45, 60, 75, 90]
    const duration = validDurations.includes(durationMin) ? durationMin : 30

    const validFocusAreas = ['shooting', 'ball_handling', 'defense', 'footwork', 'finishing', 'conditioning', 'agility', 'speed_change']
    const areas = Array.isArray(focusAreas)
      ? focusAreas.filter((f: string) => validFocusAreas.includes(f)).slice(0, 3)
      : []

    const equipStr = Array.isArray(equipment) ? equipment.map(String).slice(0, 5).join(', ') : ''

    // Fetch player data and available drills
    const [player, recentSessions, formAnalyses, allDrills] = await Promise.all([
      db.player.findUnique({
        where: { id: playerId },
        select: { name: true, position: true, level: true, goals: true, xpLevel: true },
      }),
      db.workoutSession.findMany({
        where: { playerId },
        include: { drills: { include: { drill: { select: { nameFr: true, category: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      db.formAnalysis.findMany({
        where: { playerId },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
      db.drill.findMany({
        where: {
          isActive: true,
          OR: [{ playerId: null }, { playerId }],
        },
      }),
    ])

    if (!player) return NextResponse.json({ error: 'Joueur non trouvé' }, { status: 404 })

    const recentScores = recentSessions.map(s => {
      const avg = s.drills.length > 0 ? Math.round(s.drills.reduce((a, d) => a + d.score, 0) / s.drills.length) : 0
      return avg
    })
    const avgRecentScore = recentScores.length > 0 ? Math.round(recentScores.reduce((a, b) => a + b, 0) / recentScores.length) : 0

    const weakFormCats = formAnalyses.flatMap(f => {
      try {
        const cats = JSON.parse(f.categories)
        return Object.entries(cats)
          .filter(([, v]) => (v as number) < 60)
          .map(([k]) => k)
      } catch { return [] }
    })

    const drillList = allDrills
      .filter(d => areas.length === 0 || areas.includes(d.category))
      .map(d => `${d.nameFr} (cat=${d.category}, diff=${d.difficulty}, dur=${d.durationSec}s, reps=${d.targetReps})`)
      .join('\n')

    const zai = await ZAI.create()

    const prompt = `Tu es un planificateur d'entraînement basketball IA. Crée un plan personnalisé.

PROFIL: ${player.name}, ${player.position}, niveau ${player.level}, objectif: ${player.goals}
NIVEAU XP: ${player.xpLevel}, score moyen récent: ${avgRecentScore}/100
${weakFormCats.length > 0 ? `FORME FAIBLE: ${weakFormCats.join(', ')}` : ''}
DURÉE DEMANDÉE: ${duration} minutes
${areas.length > 0 ? `FOCUS: ${areas.join(', ')}` : 'AUCUN FOCUS SPÉCIFIQUE'}
${equipStr ? `ÉQUIPEMENT: ${equipStr}` : 'PAS D\'ÉQUIPEMENT SPÉCIFIÉ'}
INTENSITÉ: ${intensity}

EXERCICES DISPONIBLES:
${drillList || 'Aucun exercice disponible'}

Réponds UNIQUEMENT en JSON:
{
  "title": "titre du plan en français",
  "description": "description en français (2-3 phrases)",
  "difficulty": "beginner/intermediate/advanced",
  "durationMin": ${duration},
  "focusAreas": ["catégorie1", "catégorie2"],
  "drills": [
    {
      "drillName": "nom exact de l'exercice disponible ci-dessus",
      "sets": 1-5,
      "repsPerSet": 5-30,
      "restSec": 15-60,
      "reasoning": "pourquoi cet exercice a été choisi (1-2 phrases en français)",
      "coachingTip": "conseil de coaching en français"
    }
  ],
  "warmup": "échauffement recommandé en français",
  "cooldown": "retour au calme en français",
  "expectedOutcome": "résultat attendu en français"
}

Règles:
- Choisis UNIQUEMENT des exercices de la liste disponible
- Adapte le nombre d'exercices et les sets à la durée demandée
- Inclus un échauffement et un retour au calme
- Varie les catégories si possible
- Le plan doit être réaliste et exécutable` 

    const response = await zai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: sanitize(prompt) }],
      thinking: { type: 'disabled' },
    })

    const content = response.choices?.[0]?.message?.content ?? ''

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null

      if (parsed) {
        // Validate and sanitize
        parsed.title = String(parsed.title || 'Plan IA').slice(0, 100)
        parsed.description = String(parsed.description || '').slice(0, 500)
        parsed.difficulty = ['beginner', 'intermediate', 'advanced'].includes(parsed.difficulty) ? parsed.difficulty : player.level
        parsed.durationMin = duration
        parsed.focusAreas = Array.isArray(parsed.focusAreas) ? parsed.focusAreas.slice(0, 5) : []
        parsed.warmup = String(parsed.warmup || '').slice(0, 300)
        parsed.cooldown = String(parsed.cooldown || '').slice(0, 300)
        parsed.expectedOutcome = String(parsed.expectedOutcome || '').slice(0, 300)

        parsed.drills = Array.isArray(parsed.drills)
          ? parsed.drills.slice(0, 10).map((d: Record<string, unknown>) => ({
              drillName: String(d.drillName || '').slice(0, 100),
              sets: Math.max(1, Math.min(5, Math.round(Number(d.sets) || 1))),
              repsPerSet: Math.max(1, Math.min(50, Math.round(Number(d.repsPerSet) || 10))),
              restSec: Math.max(10, Math.min(120, Math.round(Number(d.restSec) || 30))),
              reasoning: String(d.reasoning || '').slice(0, 300),
              coachingTip: String(d.coachingTip || '').slice(0, 300),
            }))
          : []

        // Find matching drill IDs from our DB
        const matchedDrillIds = parsed.drills.map((d: { drillName: string }) => {
          const match = allDrills.find(ad =>
            ad.nameFr.toLowerCase().includes(d.drillName.toLowerCase()) ||
            d.drillName.toLowerCase().includes(ad.nameFr.toLowerCase())
          )
          return match?.id || null
        }).filter(Boolean)

        // Save to DB
        const workout = await db.generatedWorkout.create({
          data: {
            playerId,
            title: parsed.title,
            description: parsed.description,
            difficulty: parsed.difficulty,
            durationMin: parsed.durationMin,
            focusAreas: JSON.stringify(parsed.focusAreas),
            drillIds: JSON.stringify(matchedDrillIds),
            aiReasoning: JSON.stringify({
              drills: parsed.drills,
              warmup: parsed.warmup,
              cooldown: parsed.cooldown,
              expectedOutcome: parsed.expectedOutcome,
            }),
          },
        })

        return NextResponse.json({
          id: workout.id,
          ...parsed,
          drillIds: matchedDrillIds,
          createdAt: workout.createdAt,
        })
      }
    } catch {
      /* parse error */
    }

    return NextResponse.json({ error: 'Erreur de génération' }, { status: 500 })
  } catch (error) {
    trackError('POST /api/ai/workout/generate', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}