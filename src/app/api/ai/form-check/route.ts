import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import ZAI from 'z-ai-web-dev-sdk'
import { formCheckSchema, getZodErrorMessage } from '@/lib/validations'

// POST /api/ai/form-check — AI form verification during camera workout
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Check content-length before parsing body (10MB max for image uploads)
    const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
    if (contentLength > 10_000_000) {
      return NextResponse.json({ error: 'Requête trop volumineuse' }, { status: 413 })
    }

    const body = await req.json()
    const parsed = formCheckSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(parsed.error) },
        { status: 400 }
      )
    }

    const { imageBase64, drillName, category, drillInstructions } = parsed.data

    // Validate image is reasonable size (< 5MB base64)
    if (imageBase64.length > 7_000_000) {
      return NextResponse.json(
        { error: 'Image trop volumineuse (max 5 MB)' },
        { status: 413 }
      )
    }

    const zai = await ZAI.create()

    const prompt = `Tu es un coach de basketball expert en analyse de mouvement. Analyse cette image d'une caméra.

EXERCICE DEMANDÉ: ${drillName}
Catégorie: ${category}
${drillInstructions ? `Instructions: ${drillInstructions}` : ''}

RÈGLES D'ÉVALUATION IMPORTANTES:
1. Vérifie d'ABORD si une balle de basketball est visible dans l'image.
2. Si AUCUNE balle n'est visible ET que l'exercice nécessite une balle (ball_handling, pocket_ball, shooting, finishing), le score MAXIMUM est 20 et tu DOIS le mentionner dans "issues".
3. Si AUCUNE balle n'est visible ET que l'exercice ne nécessite PAS de balle (defense, shifty, speed_change, agility), évalue normalement la posture et le mouvement.
4. Si le joueur est immobile, assis, ou ne fait pas l'exercice, le score doit être 0-15.
5. Ne SUPPOSE JAMAIS qu'il y a une balle si tu ne la vois pas clairement.
6. N'invente pas de détails que tu ne vois pas dans l'image.

Réponds UNIQUEMENT en JSON valide (pas de markdown, pas de backticks):
{
  "score": <nombre 0-100>,
  "feedback": "<retour en français, 1-2 phrases max>",
  "issues": ["<problème 1>", "<problème 2>"],
  "goodPoints": ["<point positif 1>"]
}`

    const response = await zai.chat.completions.createVision({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64.startsWith('data:')
                  ? imageBase64
                  : `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    })

    const content = response.choices?.[0]?.message?.content ?? ''

    // Try to parse JSON from the response
    let result: { score: number; feedback: string; issues: string[]; goodPoints: string[] }
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      result = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : { score: 10, feedback: 'Analyse incomplète — réessayez', issues: [], goodPoints: [] }
    } catch {
      result = { score: 10, feedback: 'Erreur d\'analyse — réessayez', issues: [], goodPoints: [] }
    }

    // Clamp score
    result.score = Math.max(0, Math.min(100, Math.round(Number(result.score) || 10)))

    // Ensure arrays
    result.issues = Array.isArray(result.issues) ? result.issues : []
    result.goodPoints = Array.isArray(result.goodPoints) ? result.goodPoints : []

    // Truncate feedback
    if (!result.feedback || result.feedback.length > 200) {
      result.feedback = result.feedback?.slice(0, 200) || 'Analyse en cours...'
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[POST /api/ai/form-check]', error)
    return NextResponse.json(
      { error: 'Erreur d\'analyse IA', score: 0, feedback: 'Vérification IA indisponible', issues: [], goodPoints: [] },
      { status: 500 },
    )
  }
}