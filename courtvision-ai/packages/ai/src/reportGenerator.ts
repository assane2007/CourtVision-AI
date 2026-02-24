import { generateReport } from './llm'
import { TrackingResult } from './tracking'
import { Reconstruction3DResult } from './reconstruction3d'
import { ShotResult, ShotStats, computeShotStats } from './shotAnalysis'
import { MentalAnalysisResult } from './mentalAnalysis'

export interface FullAnalysisData {
    tracking: TrackingResult[]
    reconstruction: Reconstruction3DResult
    shots: ShotResult[]
    mental: MentalAnalysisResult
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
 * On envoie un JSON réduit (pas les données brutes de tracking)
 * pour respecter les limites de tokens et obtenir un rapport ciblé.
 */
function preparePayload(analysisData: FullAnalysisData): object {
    const shotStats: ShotStats = computeShotStats(analysisData.shots)

    // Top 3 meilleurs tirs et top 3 pires pour le contexte narratif
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

/**
 * Construit le prompt système professionnel pour le LLM.
 */
function buildSystemPrompt(): string {
    return `Tu es CourtVision AI, un coach de basketball professionnel avec 20 ans d'expérience au plus haut niveau (NCAA Division I, EuroLeague, NBA G-League).

TON STYLE :
- Direct, concret, motivant — pas de blabla
- Tu parles comme un vrai coach : exigeant mais bienveillant
- Tu donnes des exercices PRÉCIS et MESURABLES
- Tu compares avec des références NBA quand c'est pertinent
- Tu n'hésites pas à pointer les faiblesses tout en valorisant les forces

STRUCTURE DE TON RAPPORT (500-800 mots) :

## 📊 Résumé de la Performance
Un paragraphe percutant avec les stats clés et l'impression générale.

## 💪 Points Forts (2-3 points)
Ce que le joueur fait bien, avec des exemples précis tirés des données.

## ⚠️ Points à Améliorer (2-3 points)
Les faiblesses identifiées avec des données concrètes.

## 🧠 Analyse Mentale
État mental pendant le match, patterns détectés, impact sur la performance.

## 🎯 Exercices Recommandés
3-5 exercices spécifiques pour corriger les faiblesses identifiées.
Chaque exercice doit inclure : nom, durée, description courte, et la métrique visée.

## 📈 Objectif de la Semaine
Un objectif SMART (spécifique, mesurable, atteignable, pertinent, temporel).

IMPORTANT : Base ton analyse UNIQUEMENT sur les données fournies. Ne fabrique pas de données.
Réponds en français.`
}

/**
 * Construit le prompt utilisateur avec les données d'analyse.
 */
function buildUserPrompt(payload: object): string {
    return `Voici les données d'analyse du match de ce joueur :

\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\`

Génère ton rapport de coach complet en suivant la structure demandée.
Sois précis, utilise les chiffres des données, et donne des conseils actionnables.`
}

/**
 * Génère un programme d'entraînement de 7 jours basé sur les faiblesses.
 */
function generateTrainingProgram(analysisData: FullAnalysisData): TrainingDay[] {
    const shotStats = computeShotStats(analysisData.shots)
    const mental = analysisData.mental
    const program: TrainingDay[] = []

    // Identifier les priorités
    const priorities: { focus: string; severity: number }[] = []

    // Pire zone de tir
    if (shotStats.worstZone && shotStats.zoneBreakdown[shotStats.worstZone].pct < 30) {
        priorities.push({ focus: `Tir ${shotStats.worstZone}`, severity: 3 })
    }

    // Consistance
    if (shotStats.consistencyScore < 60) {
        priorities.push({ focus: 'Mécanique de tir (consistance)', severity: 3 })
    }

    // Mental
    if (mental.mentalFragilityScore > 50) {
        priorities.push({ focus: 'Résilience mentale', severity: 2 })
    }

    // Fatigue
    if (mental.fatigueIndex > 40) {
        priorities.push({ focus: 'Cardio / Endurance', severity: 2 })
    }

    // Angle du coude
    if (shotStats.averageElbowAngle < 85 || shotStats.averageElbowAngle > 100) {
        priorities.push({ focus: 'Correction mécanique coude', severity: 3 })
    }

    // Générer 7 jours
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
                    name: `100 tirs depuis la zone ${shotStats.worstZone}`,
                    duration: '20 min',
                    description: `Enchaîne 10 séries de 10 tirs depuis la zone ${shotStats.worstZone}. Note ton % à chaque série.`
                })
                drills.push({
                    name: 'Catch & Shoot (5 spots)',
                    duration: '15 min',
                    description: 'Passe → tir depuis les 5 spots à 3 points. Objectif : 7/10 par spot.'
                })
                drills.push({
                    name: 'Free throws sous fatigue',
                    duration: '10 min',
                    description: 'Sprint aller-retour, puis 2 lancers-francs. Répète 10 fois. Simule la fin de match.'
                })
                break

            case 'conditioning':
                drills.push({
                    name: 'Suicide sprints (17s)',
                    duration: '15 min',
                    description: '10 suicides avec objectif < 17 secondes chacun. 45s de repos entre chaque.'
                })
                drills.push({
                    name: 'Defensive slides',
                    duration: '10 min',
                    description: 'Glissements défensifs d\'un bout à l\'autre du terrain. 3 séries de 2 minutes.'
                })
                break

            case 'technique':
                drills.push({
                    name: `Form shooting (angle coude ${Math.round(shotStats.averageElbowAngle)}° → 90-95°)`,
                    duration: '20 min',
                    description: 'Tirs à 1m du panier, focus sur le placement du coude à 90°. Utilise un élastique si nécessaire.'
                })
                drills.push({
                    name: 'Follow-through drill',
                    duration: '10 min',
                    description: 'Tir et maintiens la main en "col de cygne" 2 secondes après chaque release.'
                })
                break

            case 'mental':
                drills.push({
                    name: 'Visualisation pré-match',
                    duration: '10 min',
                    description: 'Ferme les yeux et visualise 5 situations de match. Vois-toi réussir chaque action.'
                })
                drills.push({
                    name: 'Pressure free throws',
                    duration: '15 min',
                    description: 'Dois mettre 10 LF consécutifs avant de partir. Si tu rates, tu recommences à 0.'
                })
                drills.push({
                    name: 'Respiration 4-7-8',
                    duration: '5 min',
                    description: 'Inspire 4s, retiens 7s, expire 8s. À faire avant chaque séance et pendant les temps morts.'
                })
                break

            case 'game':
                drills.push({
                    name: 'Scrimmage 5v5 (ou 3v3)',
                    duration: '30 min',
                    description: 'Match réel. Concentre-toi sur les points faibles identifiés cette semaine.'
                })
                drills.push({
                    name: 'Étirements + foam roller',
                    duration: '15 min',
                    description: 'Récupération active : étirements dynamiques + foam roller sur quadriceps et ischio-jambiers.'
                })
                break
        }

        const focus = priorities[day % priorities.length]?.focus ?? template.title
        const targetMetric = priorities[day % priorities.length]
            ? `Améliorer ${priorities[day % priorities.length].focus}`
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

/**
 * Pipeline principal de génération du rapport IA.
 * Compile toutes les données, envoie au LLM (Groq → Ollama fallback),
 * et génère le programme d'entraînement de 7 jours.
 *
 * @param analysisData - Toutes les données des étapes 1-5 du pipeline.
 */
export async function createAiReport(analysisData: FullAnalysisData): Promise<AIReport> {
    // 1. Préparer le payload réduit pour le LLM
    const payload = preparePayload(analysisData)

    // 2. Construire les prompts
    const systemPrompt = buildSystemPrompt()
    const userPrompt = buildUserPrompt(payload)

    // 3. Appeler le LLM (Groq avec fallback Ollama)
    const reportText = await generateReport({
        systemPrompt,
        userPrompt,
        payload
    })

    // 4. Générer le programme d'entraînement (algorithmique, pas besoin du LLM)
    const trainingProgram = generateTrainingProgram(analysisData)

    return {
        reportText,
        trainingProgram
    }
}
