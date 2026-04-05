import { generateReportGemini } from './gemini'
import { generateReportLocal } from './ollama'
import { generateReportCloudflare, generateEmbeddingCloudflare, CLOUDFLARE_TEXT_MODEL } from './cloudflare'

export type LlmProvider = 'gemini' | 'cloudflare' | 'ollama' | 'fallback'

export interface LlmReportResult {
    text: string
    provider: LlmProvider
    model: string
}

/**
 * Génère un rapport de coaching via LLM.
 * Stratégie : Gemini (cloud principal) -> Cloudflare (fallback cloud) -> Ollama (local).
 * Garantit une réponse dans tous les cas.
 *
 * @param data - Objet contenant systemPrompt, userPrompt, et payload.
 */
export async function generateReportWithMetadata(data: {
    systemPrompt?: string
    userPrompt?: string
    payload?: object
    responseFormat?: 'json' | 'text'
}): Promise<LlmReportResult> {
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
    const freeOnlyRaw = (process.env.LLM_FREE_ONLY || process.env.FREE_ONLY_MODE || '').trim().toLowerCase()
    const freeOnly = freeOnlyRaw === '1' || freeOnlyRaw === 'true' || freeOnlyRaw === 'yes'
    const hasGeminiKey = !!(process.env.GEMINI_API_KEY || '').trim()

    if (!freeOnly && hasGeminiKey) {
        try {
            const text = await generateReportGemini(data)
            return { text, provider: 'gemini', model: geminiModel }
        } catch (geminiErr: unknown) {
            const geminiMessage = geminiErr instanceof Error ? geminiErr.message : String(geminiErr)
            console.warn(`[CourtVision AI] Gemini failed (${geminiMessage}), falling back to Cloudflare`)
        }
    } else if (freeOnly) {
        console.info('[CourtVision AI] LLM_FREE_ONLY enabled, skipping Gemini')
    }

    try {
        const text = await generateReportCloudflare(data)
        return { text, provider: 'cloudflare', model: CLOUDFLARE_TEXT_MODEL }
    } catch (cfErr: unknown) {
        const cfMessage = cfErr instanceof Error ? cfErr.message : String(cfErr)
        console.warn(`[CourtVision AI] Cloudflare failed (${cfMessage}), falling back to Ollama local`)

        try {
            const text = await generateReportLocal(data)
            return { text, provider: 'ollama', model: process.env.OLLAMA_MODEL || 'llama3.2' }
        } catch (fallbackErr: unknown) {
            const fbMessage = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
            console.error(`[CourtVision AI] Ollama fallback also failed: ${fbMessage}`)

            // Dernier recours : rapport générique basé sur les données brutes
            return {
                text: generateFallbackReport(data.payload),
                provider: 'fallback',
                model: 'deterministic-fallback-v1',
            }
        }
    }
}

export async function generateReport(data: {
    systemPrompt?: string
    userPrompt?: string
    payload?: object
    responseFormat?: 'json' | 'text'
}): Promise<string> {
    const result = await generateReportWithMetadata(data)
    return result.text
}

/**
 * Rapport de secours généré algorithmiquement si les deux LLMs échouent.
 * Mieux que rien — fournit les données clés sous forme structurée.
 */
function generateFallbackReport(payload?: object): string {
    if (!payload) return 'Analyse indisponible temporairement. Réessaie dans quelques minutes.'

    const data = payload as Record<string, any>
    const stats = data.shotStats
    const mental = data.mental

    let report = `## 📊 Résumé de la Performance\n\n`

    if (stats) {
        report += `**Tirs :** ${stats.totalMade ?? 0}/${stats.totalAttempts ?? 0} (${stats.fieldGoalPct ?? 0}%)\n`
        report += `**Meilleure zone :** ${stats.bestZone ?? 'N/A'}\n`
        report += `**Zone à travailler :** ${stats.worstZone ?? 'N/A'}\n`
        report += `**Angle coude moyen :** ${stats.averageElbowAngle ?? 0}°\n`
        report += `**Consistance :** ${stats.consistencyScore ?? 0}/100\n\n`
    }

    if (mental) {
        report += `## 🧠 Analyse Mentale\n\n`
        report += `**Score Mental :** ${mental.fragilityScore ?? 50}/100\n`
        report += `**Fatigue :** ${mental.fatigueIndex ?? 0}%\n`
        report += `**Langage corporel :** ${mental.bodyLanguageScore ?? 50}/100\n\n`

        if (mental.insights && Array.isArray(mental.insights)) {
            for (const insight of mental.insights) {
                report += `- ${insight}\n`
            }
        }
    }

    report += `\n*Ce rapport a été généré automatiquement. Un rapport IA complet sera disponible prochainement.*`

    return report
}

/**
 * Target embedding dimension — must match pgvector schema.
 * Default: 1536 (matches pgvector_schema.sql vector(1536)).
 * If using bge-small (384d), the vector is L2-normalized and
 * then repeated (tiled) to fill 1536d, preserving cosine similarity.
 */
const TARGET_EMBEDDING_DIM = 1536

/**
 * Génère un vecteur d'embedding pour le RAG (Retrieval-Augmented Generation).
 * Tente d'utiliser Cloudflare AI (`@cf/baai/bge-small-en-v1.5`) pour des embeddings gratuits.
 * Si échoue, génère un vecteur mock (1536d) pour préserver l'architecture.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const cfVector = await generateEmbeddingCloudflare(text)

        // If source dimension < target dimension, tile the vector (repeat)
        // rather than zero-padding. Tiling preserves cosine similarity:
        //   cos(tile(a), tile(b)) == cos(a, b)
        // whereas zero-padding destroys it when the padding dominates.
        if (cfVector.length < TARGET_EMBEDDING_DIM) {
            const tiled = new Array(TARGET_EMBEDDING_DIM)
            for (let i = 0; i < TARGET_EMBEDDING_DIM; i++) {
                tiled[i] = cfVector[i % cfVector.length]
            }
            // L2-normalize the tiled vector
            const mag = Math.sqrt(tiled.reduce((s, v) => s + v * v, 0))
            return mag > 0 ? tiled.map(v => v / mag) : tiled
        }
        return cfVector
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e)

        // Return a deterministic-ish fallback based on text content hash
        // so that identical texts produce identical embeddings (useful for dedup)
        let hash = 0
        for (let i = 0; i < text.length; i++) {
            hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0
        }
        const seededRNG = (seed: number) => {
            const x = Math.sin(seed) * 10000
            return x - Math.floor(x)
        }
        const vector = new Array(TARGET_EMBEDDING_DIM).fill(0).map((_, i) => seededRNG(hash + i) * 2 - 1)
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
        return magnitude > 0 ? vector.map(val => val / magnitude) : vector
    }
}
