import { generateReport } from './llm'

/**
 * AI Coach Chat — Conversation IA Naturelle
 *
 * Un coach virtuel conversationnel qui :
 * - Répond aux questions du joueur en langage naturel
 * - Utilise les données réelles du joueur pour personnaliser les réponses
 * - Propose des drills, analyse des highlights, prépare les matchs
 * - S'inspire du ton d'un vrai coach NBA (direct, motivant, expert)
 *
 * Modes de conversation :
 * - General : questions libres sur le basket
 * - Session Review : revue d'une session spécifique
 * - Training : questions sur l'entraînement
 * - Pre-Game : préparation mentale avant un match
 * - Film Room : l'IA commente un highlight
 * - Technique : correction mécanique détaillée
 *
 * Différenciation vs HomeCourt :
 * - HomeCourt = 0 interaction IA conversationnelle
 * - CourtVision = coach IA personnalisé, contextualisé, en temps réel
 */

// ==========================================
// Types
// ==========================================

export interface CoachChatMessage {
    role: 'user' | 'assistant' | 'system'
    content: string
    attachments?: ChatAttachment[]
    suggestedActions?: SuggestedAction[]
}

export interface ChatAttachment {
    type: 'chart' | 'drill' | 'highlight' | 'shot_data' | 'zone_map' | 'comparison'
    title: string
    data: Record<string, any>
}

export interface SuggestedAction {
    label: string
    emoji: string
    action: 'start_drill' | 'view_session' | 'open_plan' | 'compare_nba' | 'set_goal' | 'share'
    params?: Record<string, any>
}

export type ConversationContext =
    | 'general'
    | 'session_review'
    | 'training'
    | 'pre_game'
    | 'film_room'
    | 'technique'

export interface RecentSessionSummary {
    date: string
    type: string
    fgPct: number
    mentalScore: number
    shotsAttempted: number
}

export interface PlayerContext {
    username: string
    position?: string
    overallRating?: number
    playStyle?: string
    strengths?: string[]
    weaknesses?: string[]
    recentSessions?: RecentSessionSummary[]
    ragMemories?: string[] // Long-term RAG injected memories
    currentPlan?: string
    mentalProfile?: {
        resilience: number
        clutchFactor: number
        pressureResponse: string
    }
    shotDNA?: {
        purityScore: number
        closestNBA: string
        avgShotQuality: number
    }
    recoveryScore?: number
}

export interface CoachChatResponse {
    message: string
    attachments: ChatAttachment[]
    suggestedActions: SuggestedAction[]
    tokensUsed: number
    model: string
}

// ==========================================
// System Prompts par contexte
// ==========================================

const SYSTEM_PROMPTS: Record<ConversationContext, string> = {
    general: `Tu es Coach V, le coach IA de CourtVision AI. Tu es un ancien coach NBA avec 20 ans d'expérience (NCAA D1, EuroLeague, NBA G-League).

TON STYLE :
- Direct et concret — pas de blabla
- Motivant mais exigeant, comme un vrai coach
- Tu utilises des données précises quand disponibles
- Tu compares avec des joueurs NBA pour illustrer
- Tu réponds en français, de manière informelle (tutoiement)
- Tu utilises des emojis de basket : 🏀 🎯 💪 🧠 🔥

RÈGLES :
- Base tes réponses sur les données du joueur fournies dans le contexte
- Si tu n'as pas de données, dis-le et donne des conseils généraux
- Propose toujours une action concrète à la fin de chaque réponse
- Sois concis : 150-300 mots max
- Ne fabrique jamais de statistiques`,

    session_review: `Tu es Coach V, le coach IA de CourtVision AI, en mode REVUE DE SESSION.

Tu analyses une session spécifique du joueur. Tu as accès à :
- Les statistiques de tir (zones, %, mécanique)
- L'analyse mentale (score, patterns, timeline)
- Les highlights générés

TON APPROCHE :
1. Commence par un bilan positif (ce qui a bien marché)
2. Pointe 2-3 choses à améliorer avec des données précises
3. Propose un exercice correctif immédiat
4. Termine avec une motivation

Sois spécifique : cite les zones, les %, les minutes exactes.
Réponds en français, de manière informelle. 150-300 mots.`,

    training: `Tu es Coach V, expert en préparation physique et technique basket.

Tu crées des exercices personnalisés basés sur :
- Les faiblesses détectées par l'IA
- Le plan d'entraînement en cours
- Le niveau de récupération du joueur
- Les objectifs à court et long terme

Pour chaque exercice, donne :
- Nom de l'exercice
- Nombre de séries/répétitions
- Durée estimée
- Conseil technique clé
- La métrique à améliorer

Réponds en français. Sois ultra-concret et actionnable.`,

    pre_game: `Tu es Coach V en mode PRE-GAME PREP — préparation mentale et stratégique avant un match.

Tu prépares le joueur avec :
1. Rappel de ses forces (confiance boost)
2. Points de vigilance basés sur ses dernières sessions
3. Objectifs SMART pour le match
4. Exercice de visualisation guidée (30 secondes)
5. Phrase de motivation ("mantra du match")

Ton énergie est high — tu dois charger le joueur à bloc.
Réponds en français. 200-400 mots.`,

    film_room: `Tu es Coach V en mode FILM ROOM — tu analyses un highlight ou un clip vidéo.

Tu commentes comme un analyste ESPN/beIN Sports :
- Décris l'action (zone, mouvement, mécanique)
- Compare avec un joueur NBA similaire
- Identifie ce qui est bien et ce qui pourrait être mieux
- Propose un drill pour reproduire/améliorer cette action

Sois enthousiaste quand c'est un bon move, technique quand c'est une erreur.
Réponds en français, style commentateur sportif passionné. 150-250 mots.`,

    technique: `Tu es Coach V, spécialiste en biomécanique du tir et analyse technique.

Tu corriges la mécanique du joueur avec :
- Analyse détaillée de la posture (angles, hauteur, timing)
- Comparaison avec la référence NBA la plus proche
- Correction step-by-step (maximum 3 corrections à la fois)
- Drill de correction avec nombre exact de répétitions
- Critère de succès mesurable

Utilise un vocabulaire technique basket mais accessible.
Réponds en français. Sois précis sur les degrés, les ratios, les secondes.`
}

// ==========================================
// Coach Chat Engine
// ==========================================

export class CoachChatEngine {

    /**
     * Génère une réponse du coach IA à un message utilisateur.
     */
    static async generateResponse(
        userMessage: string,
        context: ConversationContext,
        playerContext: PlayerContext,
        conversationHistory: CoachChatMessage[] = [],
    ): Promise<CoachChatResponse> {
        const systemPrompt = this.buildSystemPrompt(context, playerContext)
        const userPrompt = this.buildUserPrompt(userMessage, playerContext, conversationHistory)

        const response = await generateReport({
            systemPrompt,
            userPrompt,
        })

        // Parse suggested actions from the response
        const suggestedActions = this.extractSuggestedActions(response, context, playerContext)
        const attachments = this.generateAttachments(response, context, playerContext)

        return {
            message: response,
            attachments,
            suggestedActions,
            tokensUsed: Math.ceil(response.length / 4),  // rough estimate
            model: 'groq-llama-3.3',
        }
    }

    /**
     * Génère des réponses rapides contextuelles ("quick replies").
     */
    static generateQuickReplies(context: ConversationContext, playerContext: PlayerContext): string[] {
        switch (context) {
            case 'general':
                return [
                    'Comment améliorer mon tir à 3 points ?',
                    'Analyse mon évolution récente',
                    'Quel est mon point le plus faible ?',
                    'Propose-moi un workout de 30 min',
                    `Compare-moi à ${playerContext.shotDNA?.closestNBA ?? 'un joueur NBA'}`,
                ]
            case 'session_review':
                return [
                    'Qu\'est-ce qui s\'est bien passé ?',
                    'Où est-ce que j\'ai été le plus faible ?',
                    'Comment corriger mes tirs ratés ?',
                    'Montre-moi mes moments clutch',
                    'Quel drill faire pour progresser ?',
                ]
            case 'training':
                return [
                    'Workout shooting 20 min',
                    'Exercice pour le mid-range',
                    'Drill de catch & shoot',
                    'Travail spécifique corner 3pts',
                    'Routine pre-game de 10 min',
                ]
            case 'pre_game':
                return [
                    'Je suis stressé, aide-moi',
                    'Quel mindset adopter ?',
                    'Rappelle-moi mes forces',
                    'Objectif réaliste pour ce match ?',
                    'Exercice de respiration rapide',
                ]
            case 'film_room':
                return [
                    'Analyse mon meilleur tir',
                    'Pourquoi j\'ai raté celui-là ?',
                    'Compare cette action à un joueur NBA',
                    'Montre-moi mes patterns de tir',
                ]
            case 'technique':
                return [
                    'Comment corriger mon angle de coude ?',
                    'Ma hauteur de release est bonne ?',
                    'Pourquoi mes tirs partent à droite ?',
                    'Comment accélérer mon release ?',
                    'Tips pour le follow-through ?',
                ]
            default:
                return []
        }
    }

    // ── Private helpers ──────────────────────────────────

    private static buildSystemPrompt(
        context: ConversationContext,
        playerContext: PlayerContext
    ): string {
        let systemPrompt = SYSTEM_PROMPTS[context] ?? SYSTEM_PROMPTS.general

        // Inject player context
        systemPrompt += `\n\n--- PROFIL DU JOUEUR ---\n`
        systemPrompt += `Nom: ${playerContext.username}\n`
        if (playerContext.position) systemPrompt += `Position: ${playerContext.position}\n`
        if (playerContext.overallRating) systemPrompt += `Rating global: ${playerContext.overallRating}/100\n`
        if (playerContext.playStyle) systemPrompt += `Style de jeu: ${playerContext.playStyle}\n`
        if (playerContext.strengths?.length) systemPrompt += `Forces: ${playerContext.strengths.join(', ')}\n`
        if (playerContext.weaknesses?.length) systemPrompt += `Faiblesses: ${playerContext.weaknesses.join(', ')}\n`

        if (playerContext.shotDNA) {
            systemPrompt += `\nShot DNA:\n`
            systemPrompt += `- Pureté mécanique: ${playerContext.shotDNA.purityScore}/100\n`
            systemPrompt += `- Joueur NBA le plus proche: ${playerContext.shotDNA.closestNBA}\n`
            systemPrompt += `- Qualité de tir moyenne: ${playerContext.shotDNA.avgShotQuality}/100\n`
        }

        if (playerContext.mentalProfile) {
            systemPrompt += `\nProfil Mental:\n`
            systemPrompt += `- Résilience: ${playerContext.mentalProfile.resilience}/100\n`
            systemPrompt += `- Clutch Factor: ${playerContext.mentalProfile.clutchFactor}/100\n`
            systemPrompt += `- Réponse pression: ${playerContext.mentalProfile.pressureResponse}\n`
        }

        if (playerContext.recoveryScore !== undefined) {
            systemPrompt += `\nRécupération actuelle: ${playerContext.recoveryScore}/100\n`
        }

        if (playerContext.recentSessions?.length) {
            systemPrompt += `\n--- DERNIÈRES SESSIONS ---\n`
            for (const session of playerContext.recentSessions.slice(0, 5)) {
                systemPrompt += `- ${session.date} (${session.type}): ${session.fgPct}% FG, mental ${session.mentalScore}/100, ${session.shotsAttempted} tirs\n`
            }
        }

        if (playerContext.ragMemories?.length) {
            systemPrompt += `\n--- RAG MEMORY (Souvenirs Historiques Pertinents) ---\n`
            systemPrompt += `Utilise ces faits du passé du joueur pour personnaliser tes conseils:\n`
            for (const memory of playerContext.ragMemories) {
                systemPrompt += `- ${memory}\n`
            }
        }

        return systemPrompt
    }

    private static buildUserPrompt(
        userMessage: string,
        playerContext: PlayerContext,
        history: CoachChatMessage[]
    ): string {
        // Include last 5 messages for context
        let prompt = ''
        const recentHistory = history.slice(-10)

        if (recentHistory.length > 0) {
            prompt += '--- HISTORIQUE ---\n'
            for (const msg of recentHistory) {
                prompt += `${msg.role === 'user' ? 'Joueur' : 'Coach V'}: ${msg.content.slice(0, 200)}\n`
            }
            prompt += '---\n\n'
        }

        prompt += `Message du joueur: ${userMessage}`
        return prompt
    }

    private static extractSuggestedActions(
        response: string,
        context: ConversationContext,
        playerContext: PlayerContext
    ): SuggestedAction[] {
        const actions: SuggestedAction[] = []

        // Auto-detect relevant actions based on response content
        if (response.toLowerCase().includes('exercice') || response.toLowerCase().includes('drill')) {
            actions.push({
                label: 'Ajouter au plan',
                emoji: '📋',
                action: 'open_plan',
            })
        }

        if (response.toLowerCase().includes('session') || response.toLowerCase().includes('match')) {
            actions.push({
                label: 'Voir la session',
                emoji: '📊',
                action: 'view_session',
            })
        }

        if (response.toLowerCase().includes('nba') || response.toLowerCase().includes('curry') ||
            response.toLowerCase().includes('durant') || response.toLowerCase().includes('lebron')) {
            actions.push({
                label: 'Comparer avec NBA',
                emoji: '🏀',
                action: 'compare_nba',
            })
        }

        if (context === 'session_review' || context === 'film_room') {
            actions.push({
                label: 'Partager',
                emoji: '📤',
                action: 'share',
            })
        }

        // Always suggest starting a drill
        if (playerContext.weaknesses?.length) {
            actions.push({
                label: 'Drill correctif',
                emoji: '🎯',
                action: 'start_drill',
                params: { focus: playerContext.weaknesses[0] },
            })
        }

        return actions.slice(0, 3) // max 3 actions
    }

    private static generateAttachments(
        response: string,
        context: ConversationContext,
        playerContext: PlayerContext
    ): ChatAttachment[] {
        const attachments: ChatAttachment[] = []

        // Auto-generate relevant charts based on context
        if (context === 'session_review' && playerContext.recentSessions?.length) {
            const latest = playerContext.recentSessions[0]
            attachments.push({
                type: 'chart',
                title: 'Statistiques de la session',
                data: {
                    fgPct: latest.fgPct,
                    mentalScore: latest.mentalScore,
                    shotsAttempted: latest.shotsAttempted,
                }
            })
        }

        if (context === 'technique' && playerContext.shotDNA) {
            attachments.push({
                type: 'comparison',
                title: `Comparaison avec ${playerContext.shotDNA.closestNBA}`,
                data: {
                    playerPurity: playerContext.shotDNA.purityScore,
                    closestNBA: playerContext.shotDNA.closestNBA,
                    avgQuality: playerContext.shotDNA.avgShotQuality,
                }
            })
        }

        return attachments
    }

    /**
     * Convert and store a session summary into the vector database (pgvector)
     * This acts as the long-term memory for the AI Coach (RAG mechanism).
     */
    static async storeSessionMemory(
        supabase: any,
        userId: string,
        sessionId: string,
        summaryContent: string,
        metadata: object = {}
    ): Promise<boolean> {
        try {
            console.log(`[RAG] Encoding session memory for user ${userId}...`)
            const { generateEmbedding } = await import('./llm')

            // 1. Generate text embedding
            const embeddingVector = await generateEmbedding(summaryContent)

            // 2. Format as Postgres pgvector string: '[0.012, -0.043, ...]'
            const vectorString = `[${embeddingVector.join(',')}]`

            // 3. Store in Supabase via raw insert to `memory_embeddings` table
            const { error } = await supabase.from('memory_embeddings').insert({
                user_id: userId,
                session_id: sessionId,
                content: summaryContent,
                embedding: vectorString,
                metadata: metadata
            })

            if (error) {
                console.error(`[RAG] Failed to store memory in pgvector: ${error.message}`)
                return false
            }

            console.log(`[RAG] Successfully securely stored vectorized memory for session ${sessionId}`)
            return true
        } catch (error) {
            console.error('[RAG] Error during memory encoding:', error)
            return false
        }
    }
}
