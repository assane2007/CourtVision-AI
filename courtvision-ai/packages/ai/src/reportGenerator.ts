import { generateReport } from './llm'
import { TrackingResult } from './tracking'
import { Reconstruction3DResult } from './reconstruction3d'
import { ShotResult, ShotStats, computeShotStats } from './shotAnalysis'
import { MentalAnalysisResult } from './mentalAnalysis'
import {
    type ShotDNAProfile,
    type AdvancedAnalyticsResult
} from '@courtvision/ai'

export interface FullAnalysisData {
    tracking: TrackingResult[]
    reconstruction: Reconstruction3DResult
    shots: ShotResult[]
    mental: MentalAnalysisResult
    shotDna?: ShotDNAProfile
    analytics?: AdvancedAnalyticsResult
}

export interface TrainingDay {
    day: number
    title: string
    focus: string
    drills: { name: string; duration: string; description: string }[]
    targetMetric: string
}

export interface AIReport {
    reportText: string
    trainingProgram: TrainingDay[]
}

/**
 * Prépare un résumé structuré des données d'analyse pour le LLM.
 */
function preparePayload(analysisData: FullAnalysisData): object {
    const shotStats: ShotStats = computeShotStats(analysisData.shots)

    const bestShots = analysisData.shots
        .filter((s) => s.outcome === 'made')
        .slice(0, 3)
        .map((s) => ({
            zone: s.zone,
            posture: s.posture,
            nba: s.nbaComparison.closestPlayer,
            similarity: s.nbaComparison.similarity
        }))

    const worstShots = analysisData.shots
        .filter((s) => s.outcome === 'missed')
        .slice(0, 3)
        .map((s) => ({
            zone: s.zone,
            posture: s.posture,
            tip: s.nbaComparison.tip
        }))

    return {
        // Stats de tir
        shotStats: {
            totalAttempts: shotStats.totalAttempts,
            totalMade: shotStats.totalMade,
            fieldGoalPct: shotStats.fieldGoalPct,
            bestZone: shotStats.bestZone,
            worstZone: shotStats.worstZone,
            averageElbowAngle: shotStats.averageElbowAngle,
            averageReleaseHeight: shotStats.averageReleaseHeight,
            consistencyScore: shotStats.consistencyScore,
            zoneBreakdown: shotStats.zoneBreakdown
        },
        bestShots,
        worstShots,

        // Apex Metrics (V5)
        apex: {
            shotDnaPurity: analysisData.shotDna?.purityScore,
            nbaSimilarity: analysisData.shotDna?.nbaSimilarity,
            closestNba: analysisData.shotDna?.closestNBAPlayer,
            mechanicalDrift: analysisData.shotDna?.mechanicalDrift,
            clutchRating: analysisData.analytics?.clutchRating,
            offensiveRating: analysisData.analytics?.offensiveRating,
            overallGrade: analysisData.analytics?.overallGrade,
        },

        // Mental
        mental: {
            fragilityScore: analysisData.mental.mentalFragilityScore,
            fatigueIndex: analysisData.mental.fatigueIndex,
            bodyLanguageScore: analysisData.mental.bodyLanguageScore,
            patterns: analysisData.mental.detectedPatterns.map((p) => ({
                type: p.type,
                description: p.description,
                severity: p.severity
            })),
            insights: analysisData.mental.insights,
            quarterComparison: analysisData.mental.quarterComparison
        },

        // Mouvement
        movement: {
            totalDistanceCovered: analysisData.reconstruction.totalDistanceCovered,
            zoneOccupancy: analysisData.reconstruction.zoneOccupancy,
            averagePositions: analysisData.reconstruction.averagePositions
        }
    }
}

function buildSystemPrompt(): string {
    return `Tu es CourtVision AI Elite, le système de coaching le plus avancé au monde.
Ton style est celui d'un coach de NBA moderne : ultra-analytique, focalisé sur la biomécanique, la résilience mentale et l'efficacité spaciale.

RÈGLES D'OR :
- Pas de clichés. Utilise les métriques "Apex" (Shot DNA, Drift, Clutch Rating).
- Si le "Mechanical Drift" est élevé, parle de fatigue ou de relâchement technique.
- Compare le "Shot DNA Purity" avec le joueur NBA le plus proche mentionné dans les données.
- Focalise sur les "Hot Zones" et comment les maximiser.

STRUCTURE DU RAPPORT :
## 🎙️ L'avis du Coach
Analyse globale et "Effort Score".
## 🧬 Shot DNA & Biomécanique
Analyse de la pureté du tir et des dérives mécaniques.
## 🧠 Résilience & Mental
Analyse de la gestion de la fatigue et de la fragilité mentale.
## 🎬 Recommandations Stratégiques
Conseils tactiques pour le prochain match.
## 🎯 Plan d'Action (Exercices)
Liste d'exercices issus du programme d'entraînement fourni.

IMPORTANT : Sois direct. Si c'est mauvais, dis-le avec des solutions. Si c'est bon, explique POURQUOI c'est bon.
Réponds en français.`
}

function buildUserPrompt(payload: object): string {
    return `Voici les données d'analyse du match de ce joueur :

\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\`

Génère ton rapport de coach complet en suivant la structure demandée.
Sois précis, utilise les chiffres des données, et donne des conseils actionnables.`
}

function generateTrainingProgram(analysisData: FullAnalysisData): TrainingDay[] {
    const shotStats = computeShotStats(analysisData.shots)
    const mental = analysisData.mental
    const program: TrainingDay[] = []

    const priorities: { focus: string; severity: number }[] = []

    if (shotStats.worstZone && shotStats.zoneBreakdown[shotStats.worstZone].pct < 30) {
        priorities.push({ focus: `Tir ${shotStats.worstZone}`, severity: 3 })
    }

    if (shotStats.consistencyScore < 60) {
        priorities.push({ focus: 'Mécanique de tir (consistance)', severity: 3 })
    }

    if (mental.mentalFragilityScore > 50) {
        priorities.push({ focus: 'Résilience mentale', severity: 2 })
    }

    if (mental.fatigueIndex > 40) {
        priorities.push({ focus: 'Cardio / Endurance', severity: 2 })
    }

    if (shotStats.averageElbowAngle < 85 || shotStats.averageElbowAngle > 100) {
        priorities.push({ focus: 'Correction mécanique coude', severity: 3 })
    }

    const dayTemplates: { title: string; type: string }[] = [
        { title: 'Tir Spot-Up', type: 'shooting' },
        { title: 'Cardio + Agilité', type: 'conditioning' },
        { title: 'Mécanique de Tir', type: 'technique' },
        { title: 'Mental Game', type: 'mental' },
        { title: 'Tir en Mouvement', type: 'shooting' },
        { title: 'Endurance Match', type: 'conditioning' },
        { title: 'Scrimmage + Récup', type: 'game' }
    ]

    for (let day = 0; day < 7; day++) {
        const template = dayTemplates[day]
        const drills: TrainingDay['drills'] = []

        switch (template.type) {
            case 'shooting':
                drills.push({
                    name: `100 tirs depuis la zone ${shotStats.worstZone || 'peinture'}`,
                    duration: '20 min',
                    description: `Enchaîne 10 séries de 10 tirs depuis la zone ${shotStats.worstZone || 'peinture'}. Note ton % à chaque série.`
                })
                drills.push({
                    name: 'Catch & Shoot (5 spots)',
                    duration: '15 min',
                    description: 'Passe → tir depuis les 5 spots à 3 points. Objectif : 7/10 par spot.'
                })
                break
            case 'conditioning':
                drills.push({
                    name: 'Suicide sprints (17s)',
                    duration: '15 min',
                    description: '10 suicides avec objectif < 17 secondes chacun. 45s de repos entre chaque.'
                })
                break
            case 'technique':
                drills.push({
                    name: `Form shooting (angle coude ${Math.round(shotStats.averageElbowAngle)}° → 90-95°)`,
                    duration: '20 min',
                    description: 'Tirs à 1m du panier, focus sur le placement du coude à 90°. Utilise un élastique si nécessaire.'
                })
                break
            case 'mental':
                drills.push({
                    name: 'Visualisation pré-match',
                    duration: '10 min',
                    description: 'Ferme les yeux et visualise 5 situations de match. Vois-toi réussir chaque action.'
                })
                break
            case 'game':
                drills.push({
                    name: 'Scrimmage 5v5 (ou 3v3)',
                    duration: '30 min',
                    description: 'Match réel. Concentre-toi sur les points faibles identifiés cette semaine.'
                })
                break
            default:
                drills.push({ name: 'Repos actif', duration: '30 min', description: 'Étirements profonds.' })
        }

        const focus = priorities[day % (priorities.length || 1)]?.focus ?? template.title
        const targetMetric = priorities[day % (priorities.length || 1)]
            ? `Améliorer ${priorities[day % (priorities.length || 1)].focus}`
            : 'Maintien de la forme'

        program.push({
            day: day + 1,
            title: `Jour ${day + 1} — ${template.title}`,
            focus,
            drills,
            targetMetric
        })
    }

    return program
}

export async function createAiReport(analysisData: FullAnalysisData): Promise<AIReport> {
    const payload = preparePayload(analysisData)
    const systemPrompt = buildSystemPrompt()
    const userPrompt = buildUserPrompt(payload)

    const reportText = await generateReport({
        systemPrompt,
        userPrompt,
        payload
    })

    const trainingProgram = generateTrainingProgram(analysisData)

    return {
        reportText,
        trainingProgram
    }
}
