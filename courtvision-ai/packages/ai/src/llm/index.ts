import { generateReportGroq } from './groq'
import { generateReportLocal } from './ollama'
import { generateReportCloudflare, generateEmbeddingCloudflare } from './cloudflare'

/**
 * Génère un rapport de coaching via LLM.
 * Stratégie : Cloudflare (Gratuit) -> Groq (Premium) → Ollama (Local).
 * Garantit une réponse dans tous les cas.
 *
 * @param data - Objet contenant systemPrompt, userPrompt, et payload.
 */
export async function generateReport(data: {
    systemPrompt?: string
    userPrompt?: string
    payload?: object
    responseFormat?: 'json' | 'text'
}): Promise<string> {
    try {
        return await generateReportCloudflare(data)
    } catch (cfErr: unknown) {
        const cfMessage = cfErr instanceof Error ? cfErr.message : String(cfErr)
        console.warn(`[CourtVision AI] Cloudflare failed (${cfMessage}), falling back to Groq`)

        try {
            return await generateReportGroq(data)
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err)
            console.warn(`[CourtVision AI] Groq failed (${message}), falling back to Ollama local`)

            try {
                return await generateReportLocal(data)
            } catch (fallbackErr: unknown) {
                const fbMessage = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
                console.error(`[CourtVision AI] Ollama fallback also failed: ${fbMessage}`)

                // Dernier recours : rapport générique basé sur les données brutes
                return generateFallbackReport(data.payload)
            }
        }
    }
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
 * Génère un vecteur d'embedding pour le RAG (Retrieval-Augmented Generation).
 * Tente d'utiliser Cloudflare AI (`@cf/baai/bge-small-en-v1.5`) pour des embeddings gratuits.
 * Si échoue, génère un vecteur mock (1536d) pour préserver l'architecture.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    console.log(`[RAG] Generating embedding for text snippet (${text.length} chars)`)
    try {
        const cfVector = await generateEmbeddingCloudflare(text)

        // pgvector (if setup for 1536) needs padding if we use bge-small (384)
        if (cfVector.length < 1536) {
            const padded = new Array(1536).fill(0)
            for (let i = 0; i < cfVector.length; i++) padded[i] = cfVector[i]
            return padded
        }
        return cfVector
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        console.warn(`[RAG] Cloudflare embeddings failed (${message}). Using fallback mock vector.`)

        // Return a dummy 1536-dimensional vector for architecture validation
        const vector = new Array(1536).fill(0).map(() => Math.random() * 2 - 1)
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
        return vector.map(val => val / magnitude)
    }
}
