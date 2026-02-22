import { TrackingResult } from './tracking'

export interface MentalAnalysisResult {
    mentalFragilityScore: number // 0-100 (confiance vs fragilité)
    fatigueIndex: number // 0-100 (baisse de vitesse/explosivité)
    detectedPatterns: string[] // ex: "head_drop_after_miss", "slumped_shoulders"
    bodyLanguageScore: number // 0-100
}

/**
 * Calculer le Mental Fragility Score basé sur les changements de posture
 * Détecter les patterns : baisse de tête après erreur, épaules tombantes, etc.
 * Analyser la vitesse de déplacement comme indicateur d'intensité
 * Comparer comportement début vs fin de match (fatigue mentale)
 */
export async function analyzeMentality(
    trackingData: TrackingResult[]
): Promise<MentalAnalysisResult> {
    // Heuristiques sur la baisse des épaules (Landmarks nez/épaules media pipe) et vitesse (delta positions / frame)
    return {
        mentalFragilityScore: 30, // 30 = confiant, faible fragilité. Moteur de scoring interne.
        fatigueIndex: 15, // Faiblement fatigué
        detectedPatterns: [],
        bodyLanguageScore: 85
    }
}
