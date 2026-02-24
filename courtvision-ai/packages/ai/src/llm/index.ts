import { generateReportGroq } from './groq'
import { generateReportLocal } from './ollama'

/**
 * Génère un rapport de coaching via LLM.
 * Stratégie : Groq (cloud, ultra rapide) → Ollama (local, fallback).
 * Garantit une réponse dans tous les cas.
 *
 * @param data - Objet contenant systemPrompt, userPrompt, et payload.
 */
export async function generateReport(data: {
    systemPrompt?: string
    userPrompt?: string
    payload?: object
}): Promise<string> {
    try {
        return await generateReportGroq(data)
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        // En production, utiliser Pino logger ici
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
