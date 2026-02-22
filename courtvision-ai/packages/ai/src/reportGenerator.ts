import { generateReport } from './llm'
import { TrackingResult } from './tracking'
import { Reconstruction3DResult } from './reconstruction3d'
import { ShotResult } from './shotAnalysis'
import { MentalAnalysisResult } from './mentalAnalysis'

export interface FullAnalysisData {
    tracking: TrackingResult[]
    reconstruction: Reconstruction3DResult
    shots: ShotResult[]
    mental: MentalAnalysisResult
}

/**
 * Compiler toutes les données des étapes 1-5 en JSON structuré
 * Envoyer à Groq (Llama 3.3 70B) avec un prompt spécialisé coaching basket
 * Fallback automatique vers Ollama local si Groq est indisponible
 * Générer un rapport de 500-800 mots comme un vrai coach
 * Inclure : points forts, points faibles, exercices recommandés, objectifs
 */
export async function createAiReport(
    analysisData: FullAnalysisData
): Promise<string> {
    // Préparation du payload réduit/structuré JSON 
    // car "tracking" est trop lourd de base
    const payloadForLlm = {
        totalShots: analysisData.shots.length,
        madeShots: analysisData.shots.filter((s) => s.outcome === 'made').length,
        mentalScore: analysisData.mental.mentalFragilityScore,
        fatigue: analysisData.mental.fatigueIndex,
        patterns: analysisData.mental.detectedPatterns
    }

    return await generateReport(payloadForLlm)
}
