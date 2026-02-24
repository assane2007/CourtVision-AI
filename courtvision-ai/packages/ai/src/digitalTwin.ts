import { generateReport } from './llm'
import { ShotResult, ShotStats, computeShotStats, ShotZone } from './shotAnalysis'
import { MentalAnalysisResult } from './mentalAnalysis'
import { Reconstruction3DResult, CourtZone } from './reconstruction3d'
import { TrackingResult } from './tracking'

/**
 * Digital Twin — Moteur de construction de l'avatar IA évolutif.
 *
 * Le Digital Twin est un profil IA du joueur qui évolue à chaque session analysée.
 * Il agrège les données de toutes les sessions pour construire :
 * - Un profil de style de jeu (playstyle DNA)
 * - Des forces et faiblesses pondérées
 * - Une comparaison avec des joueurs NBA
 * - Des tendances d'évolution dans le temps
 * - Un simulateur de match-ups hypothétiques
 *
 * Architecture :
 *   Analyses historiques → TwinBuilder.aggregate() → TwinProfile
 *   TwinProfile + Opponent → TwinSimulator.simulate() → MatchupResult
 */

// ==========================================
// Types
// ==========================================

/** Attribut individuel du joueur (0-100) */
export interface TwinAttribute {
    name: string
    value: number
    trend: 'up' | 'stable' | 'down'
    /** Variation depuis la dernière mise à jour */
    delta: number
    /** Confiance dans la mesure (basée sur le nombre de sessions) */
    confidence: number
}

/** Catégorie d'attributs */
export interface TwinAttributeCategory {
    category: string
    emoji: string
    attributes: TwinAttribute[]
    overallScore: number
}

/** Style de jeu détecté */
export type PlayStyle =
    | 'sharpshooter'    // Tireur pur (Klay Thompson)
    | 'shot_creator'    // Créateur de tir (Kyrie Irving)
    | 'slasher'         // Pénétrateur (Ja Morant)
    | 'playmaker'       // Meneur créateur (Chris Paul)
    | 'two_way'         // Défenseur-attaquant (Kawhi Leonard)
    | 'stretch_big'     // Intérieur shooteur (KAT)
    | 'paint_beast'     // Intérieur dominant (Giannis)
    | 'balanced'        // Équilibré (LeBron James)

/** Profil de style de jeu */
export interface PlayStyleProfile {
    primary: PlayStyle
    secondary: PlayStyle | null
    confidence: number
    description: string
    nbaArchetype: string
    traits: string[]
}

/** Comparaison avec un joueur NBA */
export interface NBAComparison {
    playerName: string
    similarity: number // 0-100
    matchingTraits: string[]
    differenceAreas: string[]
}

/** Force ou faiblesse identifiée */
export interface TwinTrait {
    id: string
    label: string
    description: string
    type: 'strength' | 'weakness'
    severity: number // 1-5 (1 = léger, 5 = dominant)
    category: 'shooting' | 'mental' | 'physical' | 'tactical' | 'consistency'
    evidenceCount: number // nb de sessions où c'est apparu
    trend: 'improving' | 'stable' | 'declining'
    drillRecommendation?: string
}

/** Point d'évolution dans le temps */
export interface TwinEvolutionPoint {
    date: string
    overallRating: number
    shootingRating: number
    mentalRating: number
    physicalRating: number
    sessionCount: number
}

/** Résultat de simulation de match-up */
export interface MatchupSimulation {
    opponent: string // Nom ou profil de l'adversaire
    winProbability: number // 0-100
    advantages: string[]
    vulnerabilities: string[]
    gameplan: string[]
    predictedScore: { player: number; opponent: number }
    keyMatchups: { area: string; edge: 'player' | 'opponent' | 'even' }[]
}

/** Zone de confort du joueur */
export interface ComfortZone {
    zone: ShotZone
    attempts: number
    efficiency: number // FG%
    frequency: number // % du total
    isComfort: boolean
}

/** Profil complet du Digital Twin */
export interface TwinProfile {
    /** Version du modèle */
    modelVersion: string
    /** Date de dernière mise à jour */
    updatedAt: string
    /** Nombre de sessions analysées */
    sessionCount: number
    /** Note globale (0-100) */
    overallRating: number
    /** Catégories d'attributs */
    attributeCategories: TwinAttributeCategory[]
    /** Style de jeu */
    playStyle: PlayStyleProfile
    /** Forces identifiées */
    strengths: TwinTrait[]
    /** Faiblesses identifiées */
    weaknesses: TwinTrait[]
    /** Comparaisons NBA */
    nbaComparisons: NBAComparison[]
    /** Zones de confort */
    comfortZones: ComfortZone[]
    /** Historique d'évolution */
    evolution: TwinEvolutionPoint[]
    /** Heatmap préférentielle */
    preferredZones: Record<string, number>
    /** Données de pose moyennes */
    poseSignature: {
        avgElbowAngle: number
        avgReleaseHeight: number
        avgShoulderPosture: number
        dominantHand: 'right' | 'left'
    }
    /** Profil mental */
    mentalProfile: {
        resilience: number
        clutchFactor: number
        consistency: number
        pressureResponse: 'thrives' | 'neutral' | 'struggles'
        fatigueResistance: number
    }
}

/** Données d'une session pour construire le twin */
export interface SessionAnalysisData {
    sessionId: string
    date: string
    type: 'match' | 'training' | 'shootaround'
    shots: ShotResult[]
    mental: MentalAnalysisResult
    reconstruction: Reconstruction3DResult
    tracking?: TrackingResult[]
}

// ==========================================
// Constantes
// ==========================================

const MODEL_VERSION = 'v2.0'

/** Profils NBA pour comparaison */
const NBA_ARCHETYPES: {
    name: string
    style: PlayStyle
    shooting: number
    mental: number
    physical: number
    bestZone: ShotZone
    traits: string[]
}[] = [
    { name: 'Stephen Curry', style: 'sharpshooter', shooting: 98, mental: 95, physical: 78, bestZone: 'top3', traits: ['quick_release', 'deep_range', 'off_dribble', 'gravity'] },
    { name: 'Klay Thompson', style: 'sharpshooter', shooting: 95, mental: 88, physical: 75, bestZone: 'wing3', traits: ['catch_and_shoot', 'off_screen', 'streaky_hot', 'defense'] },
    { name: 'Kevin Durant', style: 'shot_creator', shooting: 93, mental: 92, physical: 90, bestZone: 'midrange', traits: ['high_release', 'pull_up', 'unguardable', 'length'] },
    { name: 'Kyrie Irving', style: 'shot_creator', shooting: 90, mental: 80, physical: 82, bestZone: 'midrange', traits: ['handles', 'finishing', 'isolation', 'creativity'] },
    { name: 'Ja Morant', style: 'slasher', shooting: 72, mental: 85, physical: 96, bestZone: 'paint', traits: ['explosiveness', 'athleticism', 'drive_and_kick', 'fearless'] },
    { name: 'LeBron James', style: 'balanced', shooting: 80, mental: 97, physical: 95, bestZone: 'paint', traits: ['court_vision', 'versatility', 'iq', 'durability'] },
    { name: 'Kawhi Leonard', style: 'two_way', shooting: 85, mental: 90, physical: 88, bestZone: 'midrange', traits: ['defense', 'clutch', 'efficient', 'quiet_killer'] },
    { name: 'Luka Dončić', style: 'playmaker', shooting: 82, mental: 88, physical: 80, bestZone: 'top3', traits: ['step_back', 'playmaking', 'deceleration', 'bbiq'] },
    { name: 'Giannis Antetokounmpo', style: 'paint_beast', shooting: 60, mental: 90, physical: 99, bestZone: 'restricted', traits: ['transition', 'length', 'power', 'relentless'] },
    { name: 'Karl-Anthony Towns', style: 'stretch_big', shooting: 85, mental: 75, physical: 82, bestZone: 'top3', traits: ['stretch', 'versatile_scoring', 'rebounding', 'soft_touch'] },
]

// ==========================================
// TwinBuilder — Construit et met à jour le profil
// ==========================================

export class TwinBuilder {
    private sessions: SessionAnalysisData[] = []
    private previousProfile: TwinProfile | null = null

    /**
     * Charge un profil existant pour mise à jour incrémentale.
     */
    loadExistingProfile(profile: TwinProfile): void {
        this.previousProfile = profile
    }

    /**
     * Ajoute des sessions d'analyse pour le calcul.
     */
    addSessions(sessions: SessionAnalysisData[]): void {
        this.sessions.push(...sessions)
    }

    /**
     * Construit le profil complet du Digital Twin.
     */
    buildProfile(): TwinProfile {
        if (this.sessions.length === 0 && !this.previousProfile) {
            return this.createEmptyProfile()
        }

        // 1. Agréger les stats de toutes les sessions
        const aggregated = this.aggregateStats()

        // 2. Calculer les attributs
        const attributeCategories = this.computeAttributes(aggregated)

        // 3. Détecter le style de jeu
        const playStyle = this.detectPlayStyle(aggregated)

        // 4. Identifier forces et faiblesses
        const { strengths, weaknesses } = this.identifyTraits(aggregated, attributeCategories)

        // 5. Comparer avec les joueurs NBA
        const nbaComparisons = this.compareWithNBA(aggregated, playStyle)

        // 6. Calculer les zones de confort
        const comfortZones = this.computeComfortZones(aggregated)

        // 7. Construire l'historique d'évolution
        const evolution = this.buildEvolution()

        // 8. Note globale
        const overallRating = this.computeOverallRating(attributeCategories)

        // 9. Profil mental
        const mentalProfile = this.computeMentalProfile(aggregated)

        // 10. Signature de pose
        const poseSignature = this.computePoseSignature(aggregated)

        return {
            modelVersion: MODEL_VERSION,
            updatedAt: new Date().toISOString(),
            sessionCount: this.sessions.length + (this.previousProfile?.sessionCount ?? 0),
            overallRating,
            attributeCategories,
            playStyle,
            strengths,
            weaknesses,
            nbaComparisons,
            comfortZones,
            evolution,
            preferredZones: aggregated.zoneFrequency,
            poseSignature,
            mentalProfile,
        }
    }

    // ==========================================
    // Agrégation
    // ==========================================

    private aggregateStats() {
        const allShots: ShotResult[] = []
        const mentalScores: number[] = []
        const fatigueIndices: number[] = []
        const bodyLanguageScores: number[] = []
        const distancesCovered: number[] = []
        const zoneOccupancy: Record<string, number> = {}
        const quarterMentals: Record<string, number[]> = { q1: [], q2: [], q3: [], q4: [] }

        for (const session of this.sessions) {
            allShots.push(...session.shots)
            mentalScores.push(session.mental.mentalFragilityScore)
            fatigueIndices.push(session.mental.fatigueIndex)
            bodyLanguageScores.push(session.mental.bodyLanguageScore)

            // Distance
            const distValues = Object.values(session.reconstruction.totalDistanceCovered)
            if (distValues.length > 0) {
                distancesCovered.push(Math.max(...distValues))
            }

            // Zone occupancy
            for (const [zone, time] of Object.entries(session.reconstruction.zoneOccupancy)) {
                zoneOccupancy[zone] = (zoneOccupancy[zone] ?? 0) + time
            }

            // Quarter mentals
            const qc = session.mental.quarterComparison
            if (qc.q1 > 0) quarterMentals.q1.push(qc.q1)
            if (qc.q2 > 0) quarterMentals.q2.push(qc.q2)
            if (qc.q3 > 0) quarterMentals.q3.push(qc.q3)
            if (qc.q4 > 0) quarterMentals.q4.push(qc.q4)
        }

        const shotStats = allShots.length > 0 ? computeShotStats(allShots) : null

        // Zone frequency (% of shots from each zone)
        const zoneFrequency: Record<string, number> = {}
        if (allShots.length > 0) {
            for (const shot of allShots) {
                zoneFrequency[shot.zone] = (zoneFrequency[shot.zone] ?? 0) + 1
            }
            for (const zone of Object.keys(zoneFrequency)) {
                zoneFrequency[zone] = Math.round((zoneFrequency[zone] / allShots.length) * 100)
            }
        }

        return {
            allShots,
            shotStats,
            mentalScores,
            fatigueIndices,
            bodyLanguageScores,
            distancesCovered,
            zoneOccupancy,
            zoneFrequency,
            quarterMentals,
            sessionCount: this.sessions.length,
        }
    }

    // ==========================================
    // Attributs
    // ==========================================

    private computeAttributes(agg: ReturnType<TwinBuilder['aggregateStats']>): TwinAttributeCategory[] {
        const prev = this.previousProfile?.attributeCategories

        const getAttrPrev = (category: string, name: string): TwinAttribute | undefined => {
            return prev?.find(c => c.category === category)?.attributes.find(a => a.name === name)
        }

        const makeAttr = (category: string, name: string, value: number, conf: number): TwinAttribute => {
            const prevAttr = getAttrPrev(category, name)
            const delta = prevAttr ? value - prevAttr.value : 0
            const trend: 'up' | 'stable' | 'down' = delta > 2 ? 'up' : delta < -2 ? 'down' : 'stable'
            return { name, value: clamp(Math.round(value), 0, 100), trend, delta: Math.round(delta), confidence: Math.min(conf, 1) }
        }

        const confidence = Math.min(agg.sessionCount / 10, 1) // 10 sessions = 100% confiance
        const ss = agg.shotStats

        // -- Catégorie Tir --
        const shooting: TwinAttribute[] = [
            makeAttr('Tir', 'Efficacité globale', ss ? ss.fieldGoalPct : 50, confidence),
            makeAttr('Tir', 'Mi-distance', ss ? (ss.zoneBreakdown.midrange?.pct ?? 50) : 50, confidence),
            makeAttr('Tir', '3 points', ss ? avg([
                ss.zoneBreakdown.corner3?.pct ?? 0,
                ss.zoneBreakdown.wing3?.pct ?? 0,
                ss.zoneBreakdown.top3?.pct ?? 0,
            ].filter(v => v > 0)) : 40, confidence),
            makeAttr('Tir', 'Peinture', ss ? avg([
                ss.zoneBreakdown.paint?.pct ?? 0,
                ss.zoneBreakdown.restricted?.pct ?? 0,
            ].filter(v => v > 0)) : 50, confidence),
            makeAttr('Tir', 'Mécanique', ss ? clamp(ss.consistencyScore, 0, 100) : 50, confidence),
        ]

        // -- Catégorie Mental --
        const mentalAvg = agg.mentalScores.length > 0 ? avg(agg.mentalScores) : 50
        const mentalResil = this.computeResilience(agg)
        const mental: TwinAttribute[] = [
            makeAttr('Mental', 'Résilience', mentalResil, confidence),
            makeAttr('Mental', 'Confiance', 100 - mentalAvg, confidence), // fragilité inversée
            makeAttr('Mental', 'Régularité', this.computeMentalConsistency(agg), confidence),
            makeAttr('Mental', 'Clutch', this.computeClutchFactor(agg), confidence),
            makeAttr('Mental', 'Body Language', agg.bodyLanguageScores.length > 0 ? avg(agg.bodyLanguageScores) : 50, confidence),
        ]

        // -- Catégorie Physique --
        const avgDist = agg.distancesCovered.length > 0 ? avg(agg.distancesCovered) : 0
        const fatigueAvg = agg.fatigueIndices.length > 0 ? avg(agg.fatigueIndices) : 30
        const physical: TwinAttribute[] = [
            makeAttr('Physique', 'Endurance', clamp(100 - fatigueAvg, 0, 100), confidence),
            makeAttr('Physique', 'Distance/match', clamp(avgDist / 50 * 100, 0, 100), confidence), // 5km = 100
            makeAttr('Physique', 'Résist. fatigue', clamp(100 - fatigueAvg * 1.2, 0, 100), confidence),
            makeAttr('Physique', 'Intensité', clamp(avgDist > 0 ? Math.min(avgDist / 30 * 100, 100) : 50, 0, 100), confidence),
        ]

        // -- Catégorie Tactique --
        const zoneVariety = Object.keys(agg.zoneFrequency).length
        const tactical: TwinAttribute[] = [
            makeAttr('Tactique', 'Variété de zones', clamp(zoneVariety / 6 * 100, 0, 100), confidence),
            makeAttr('Tactique', 'Sélection de tirs', ss && ss.fieldGoalPct > 40 ? clamp(ss.fieldGoalPct * 1.3, 0, 100) : 50, confidence),
            makeAttr('Tactique', 'Adaptabilité', this.computeAdaptability(agg), confidence),
            makeAttr('Tactique', 'QI basket', this.computeBasketballIQ(agg), confidence),
        ]

        const categories: TwinAttributeCategory[] = [
            { category: 'Tir', emoji: '🎯', attributes: shooting, overallScore: Math.round(avg(shooting.map(a => a.value))) },
            { category: 'Mental', emoji: '🧠', attributes: mental, overallScore: Math.round(avg(mental.map(a => a.value))) },
            { category: 'Physique', emoji: '💪', attributes: physical, overallScore: Math.round(avg(physical.map(a => a.value))) },
            { category: 'Tactique', emoji: '📐', attributes: tactical, overallScore: Math.round(avg(tactical.map(a => a.value))) },
        ]

        return categories
    }

    // ==========================================
    // Style de jeu
    // ==========================================

    private detectPlayStyle(agg: ReturnType<TwinBuilder['aggregateStats']>): PlayStyleProfile {
        const ss = agg.shotStats
        const mentalAvg = agg.mentalScores.length > 0 ? avg(agg.mentalScores) : 50

        // Scoring par style
        const styleScores: Record<PlayStyle, number> = {
            sharpshooter: 0,
            shot_creator: 0,
            slasher: 0,
            playmaker: 0,
            two_way: 0,
            stretch_big: 0,
            paint_beast: 0,
            balanced: 0,
        }

        if (ss) {
            const three = avg([
                ss.zoneBreakdown.corner3?.pct ?? 0,
                ss.zoneBreakdown.wing3?.pct ?? 0,
                ss.zoneBreakdown.top3?.pct ?? 0
            ].filter(v => v > 0))
            const threeFreq = (agg.zoneFrequency['corner3'] ?? 0) + (agg.zoneFrequency['wing3'] ?? 0) + (agg.zoneFrequency['top3'] ?? 0)
            const midFreq = agg.zoneFrequency['midrange'] ?? 0
            const paintFreq = (agg.zoneFrequency['paint'] ?? 0) + (agg.zoneFrequency['restricted'] ?? 0)

            // Sharpshooter : excellent au 3pts, fréquence élevée
            styleScores.sharpshooter = (three > 35 ? three * 0.8 : 0) + (threeFreq > 40 ? 25 : 0)

            // Shot creator : bon partout, surtout mi-distance
            styleScores.shot_creator = (ss.fieldGoalPct > 40 ? 30 : 0) + (midFreq > 25 ? 20 : 0) + (ss.consistencyScore > 60 ? 15 : 0)

            // Slasher : dominance dans la peinture
            styleScores.slasher = (paintFreq > 50 ? 40 : paintFreq > 30 ? 20 : 0) + (ss.zoneBreakdown.restricted?.pct ?? 0) * 0.3

            // Paint beast : presque tout en peinture
            styleScores.paint_beast = paintFreq > 60 ? 50 : paintFreq > 40 ? 25 : 0

            // Stretch big : tir à 3pts + intérieur
            styleScores.stretch_big = (three > 30 && paintFreq > 20) ? 35 : 0

            // Two way : mental élevé + efficacité
            styleScores.two_way = (100 - mentalAvg > 70 && ss.fieldGoalPct > 42) ? 40 : 0

            // Playmaker : variété de zones + mental
            styleScores.playmaker = (Object.keys(agg.zoneFrequency).length >= 5 ? 25 : 0) + (100 - mentalAvg > 65 ? 15 : 0)

            // Balanced : pas de dominance extrême
            const maxFreq = Math.max(threeFreq, midFreq, paintFreq)
            if (maxFreq < 45 && ss.fieldGoalPct > 38) {
                styleScores.balanced = 40
            }
        }

        // Trouver le style primaire et secondaire
        const sorted = Object.entries(styleScores).sort((a, b) => b[1] - a[1])
        const primary = sorted[0][0] as PlayStyle
        const secondary = sorted[1][1] > 20 ? sorted[1][0] as PlayStyle : null

        const styleDescriptions: Record<PlayStyle, { desc: string; archetype: string }> = {
            sharpshooter: { desc: 'Tireur d\'élite — tu terrorises les défenses derrière l\'arc', archetype: 'Stephen Curry / Klay Thompson' },
            shot_creator: { desc: 'Créateur de tir — tu peux scorer de n\'importe où, n\'importe comment', archetype: 'Kevin Durant / Kyrie Irving' },
            slasher: { desc: 'Pénétrateur explosive — tu attaques le cercle sans peur', archetype: 'Ja Morant / Derrick Rose' },
            playmaker: { desc: 'Meneur créateur — tu lis le jeu et crées pour les autres', archetype: 'Chris Paul / Luka Dončić' },
            two_way: { desc: 'Two-way player — dominance des deux côtés du terrain', archetype: 'Kawhi Leonard / Jimmy Butler' },
            stretch_big: { desc: 'Intérieur moderne — tu combines taille et tir extérieur', archetype: 'Karl-Anthony Towns / Kristaps Porziņģis' },
            paint_beast: { desc: 'Dominant en peinture — tu écrases tout au cercle', archetype: 'Giannis Antetokounmpo / Zion Williamson' },
            balanced: { desc: 'Joueur complet — polyvalent et dangereux partout', archetype: 'LeBron James / Jayson Tatum' },
        }

        const info = styleDescriptions[primary]

        return {
            primary,
            secondary,
            confidence: Math.min(agg.sessionCount / 5, 1),
            description: info.desc,
            nbaArchetype: info.archetype,
            traits: this.getStyleTraits(primary, agg),
        }
    }

    private getStyleTraits(style: PlayStyle, agg: ReturnType<TwinBuilder['aggregateStats']>): string[] {
        const ss = agg.shotStats
        const traits: string[] = []

        if (ss) {
            if (ss.fieldGoalPct > 50) traits.push('Efficacité d\'élite')
            if (ss.consistencyScore > 70) traits.push('Mécanique consistante')
            if (ss.averageElbowAngle >= 88 && ss.averageElbowAngle <= 95) traits.push('Angle de coude optimal')

            const three = avg([
                ss.zoneBreakdown.corner3?.pct ?? 0,
                ss.zoneBreakdown.wing3?.pct ?? 0,
                ss.zoneBreakdown.top3?.pct ?? 0,
            ].filter(v => v > 0))
            if (three > 40) traits.push('Sniper à 3 points')
        }

        if (agg.mentalScores.length > 0 && avg(agg.mentalScores) < 35) traits.push('Force mentale')
        if (agg.distancesCovered.length > 0 && avg(agg.distancesCovered) > 3000) traits.push('Moteur infatigable')

        if (traits.length === 0) traits.push('Profil en construction')
        return traits.slice(0, 5)
    }

    // ==========================================
    // Forces & Faiblesses
    // ==========================================

    private identifyTraits(
        agg: ReturnType<TwinBuilder['aggregateStats']>,
        categories: TwinAttributeCategory[]
    ): { strengths: TwinTrait[]; weaknesses: TwinTrait[] } {
        const strengths: TwinTrait[] = []
        const weaknesses: TwinTrait[] = []
        const ss = agg.shotStats
        let traitId = 0

        const makeTrait = (
            label: string, desc: string, type: 'strength' | 'weakness',
            severity: number, cat: TwinTrait['category'], trend: TwinTrait['trend'] = 'stable', drill?: string
        ): TwinTrait => ({
            id: `trait_${++traitId}`,
            label, description: desc, type, severity: clamp(severity, 1, 5),
            category: cat, evidenceCount: agg.sessionCount, trend, drillRecommendation: drill,
        })

        if (ss) {
            // Shooting strengths
            if (ss.fieldGoalPct >= 50) {
                strengths.push(makeTrait('Efficacité au tir', `${ss.fieldGoalPct}% au tir — au-dessus des standards`, 'strength', 4, 'shooting'))
            }
            if (ss.consistencyScore >= 70) {
                strengths.push(makeTrait('Mécanique constante', `Score de consistance de ${ss.consistencyScore}/100`, 'strength', 3, 'consistency'))
            }

            // Best zone
            const bestPct = ss.zoneBreakdown[ss.bestZone]?.pct ?? 0
            if (bestPct >= 50) {
                strengths.push(makeTrait(`Spécialiste ${ss.bestZone}`, `${bestPct}% depuis la zone ${ss.bestZone}`, 'strength', 4, 'shooting'))
            }

            // Shooting weaknesses
            if (ss.fieldGoalPct < 35) {
                weaknesses.push(makeTrait('Efficacité limitée', `${ss.fieldGoalPct}% — besoin de travail fondamental`, 'weakness', 4, 'shooting',
                    'stable', 'Form shooting : 100 tirs à 2m du panier, focus angle coude 90°'))
            }
            if (ss.consistencyScore < 40) {
                weaknesses.push(makeTrait('Irrégularité mécanique', 'La mécanique de tir varie trop d\'un tir à l\'autre', 'weakness', 3, 'consistency',
                    'stable', 'Drill One-Motion : tir d\'une main, 50 rep/jour'))
            }

            // Worst zone
            const worstPct = ss.zoneBreakdown[ss.worstZone]?.pct ?? 0
            if (worstPct < 25 && ss.zoneBreakdown[ss.worstZone]?.attempts > 3) {
                weaknesses.push(makeTrait(`Difficulté en ${ss.worstZone}`, `${worstPct}% depuis la zone ${ss.worstZone}`, 'weakness', 3, 'shooting',
                    'stable', `50 tirs/jour depuis la zone ${ss.worstZone}`))
            }
        }

        // Mental traits
        const mentalAvg = agg.mentalScores.length > 0 ? avg(agg.mentalScores) : 50
        if (mentalAvg < 35) {
            strengths.push(makeTrait('Mental d\'acier', 'Excellente résilience mentale sous pression', 'strength', 5, 'mental'))
        } else if (mentalAvg > 60) {
            weaknesses.push(makeTrait('Fragilité mentale', 'Score mental indique une tendance à subir la pression', 'weakness', 4, 'mental',
                'stable', 'Routine pré-tir (3 respirations) + visualisation 10 min/jour'))
        }

        // Physical traits
        const fatigueAvg = agg.fatigueIndices.length > 0 ? avg(agg.fatigueIndices) : 30
        if (fatigueAvg < 25) {
            strengths.push(makeTrait('Endurance élevée', 'Résistance à la fatigue au-dessus de la moyenne', 'strength', 3, 'physical'))
        } else if (fatigueAvg > 55) {
            weaknesses.push(makeTrait('Endurance limitée', 'La fatigue impacte significativement la performance en fin de match', 'weakness', 3, 'physical',
                'stable', 'HIIT 20 min × 3/semaine + suicide sprints'))
        }

        // Sort by severity
        strengths.sort((a, b) => b.severity - a.severity)
        weaknesses.sort((a, b) => b.severity - a.severity)

        return { strengths: strengths.slice(0, 5), weaknesses: weaknesses.slice(0, 5) }
    }

    // ==========================================
    // Comparaison NBA
    // ==========================================

    private compareWithNBA(
        agg: ReturnType<TwinBuilder['aggregateStats']>,
        playStyle: PlayStyleProfile
    ): NBAComparison[] {
        const ss = agg.shotStats
        const mentalAvg = agg.mentalScores.length > 0 ? avg(agg.mentalScores) : 50
        const shootingRating = ss ? ss.fieldGoalPct : 40
        const mentalRating = 100 - mentalAvg
        const physicalRating = agg.distancesCovered.length > 0
            ? clamp(avg(agg.distancesCovered) / 40 * 100, 0, 100)
            : 50

        return NBA_ARCHETYPES
            .map(nba => {
                // Distance euclidienne normalisée sur les dimensions clés
                const shootDiff = Math.abs(shootingRating - nba.shooting) / 100
                const mentalDiff = Math.abs(mentalRating - nba.mental) / 100
                const physDiff = Math.abs(physicalRating - nba.physical) / 100
                const styleMul = nba.style === playStyle.primary ? 0.85 : 1.0
                const distance = Math.sqrt(shootDiff ** 2 + mentalDiff ** 2 + physDiff ** 2) * styleMul
                const similarity = clamp(Math.round((1 - distance / 1.73) * 100), 0, 100)

                const matchingTraits: string[] = []
                const differenceAreas: string[] = []

                if (Math.abs(shootingRating - nba.shooting) < 15) matchingTraits.push('Niveau de tir similaire')
                else differenceAreas.push('Efficacité au tir')

                if (Math.abs(mentalRating - nba.mental) < 15) matchingTraits.push('Force mentale comparable')
                else differenceAreas.push('Résilience mentale')

                if (nba.style === playStyle.primary) matchingTraits.push('Style de jeu identique')

                return { playerName: nba.name, similarity, matchingTraits, differenceAreas }
            })
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 3)
    }

    // ==========================================
    // Zones de confort
    // ==========================================

    private computeComfortZones(agg: ReturnType<TwinBuilder['aggregateStats']>): ComfortZone[] {
        const ss = agg.shotStats
        if (!ss) return []

        const zones: ShotZone[] = ['restricted', 'paint', 'midrange', 'corner3', 'wing3', 'top3']
        return zones.map(zone => {
            const data = ss.zoneBreakdown[zone]
            const frequency = agg.zoneFrequency[zone] ?? 0
            return {
                zone,
                attempts: data?.attempts ?? 0,
                efficiency: data?.pct ?? 0,
                frequency,
                isComfort: frequency > 20 && (data?.pct ?? 0) > 40,
            }
        })
    }

    // ==========================================
    // Évolution
    // ==========================================

    private buildEvolution(): TwinEvolutionPoint[] {
        const points: TwinEvolutionPoint[] = this.previousProfile?.evolution ?? []

        // Ajouter les sessions actuelles regroupées par date
        const byDate = new Map<string, SessionAnalysisData[]>()
        for (const session of this.sessions) {
            const date = session.date.split('T')[0]
            if (!byDate.has(date)) byDate.set(date, [])
            byDate.get(date)!.push(session)
        }

        for (const [date, sessions] of byDate) {
            const shots = sessions.flatMap(s => s.shots)
            const ss = shots.length > 0 ? computeShotStats(shots) : null
            const mentalAvg = avg(sessions.map(s => s.mental.mentalFragilityScore))

            points.push({
                date,
                overallRating: ss ? Math.round((ss.fieldGoalPct + (100 - mentalAvg)) / 2) : 50,
                shootingRating: ss ? ss.fieldGoalPct : 50,
                mentalRating: Math.round(100 - mentalAvg),
                physicalRating: Math.round(100 - avg(sessions.map(s => s.mental.fatigueIndex))),
                sessionCount: sessions.length,
            })
        }

        return points.slice(-30) // Garder les 30 derniers points
    }

    // ==========================================
    // Sous-scores
    // ==========================================

    private computeResilience(agg: ReturnType<TwinBuilder['aggregateStats']>): number {
        // Résilience = capacité à remonter après un mauvais quart
        const q1 = agg.quarterMentals.q1.length > 0 ? avg(agg.quarterMentals.q1) : 50
        const q4 = agg.quarterMentals.q4.length > 0 ? avg(agg.quarterMentals.q4) : 50
        // Si Q4 < Q1 en fragilité → le joueur est plus confiant en fin de match
        const diff = q1 - q4
        return clamp(50 + diff * 1.5, 0, 100)
    }

    private computeMentalConsistency(agg: ReturnType<TwinBuilder['aggregateStats']>): number {
        if (agg.mentalScores.length < 2) return 50
        const std = standardDeviation(agg.mentalScores)
        return clamp(100 - std * 3, 0, 100)
    }

    private computeClutchFactor(agg: ReturnType<TwinBuilder['aggregateStats']>): number {
        // Basé sur la performance en Q4
        const q4 = agg.quarterMentals.q4
        if (q4.length === 0) return 50
        const avgQ4 = avg(q4)
        return clamp(100 - avgQ4, 0, 100)
    }

    private computeAdaptability(agg: ReturnType<TwinBuilder['aggregateStats']>): number {
        // Mesure la variance de performance entre sessions
        if (agg.mentalScores.length < 2) return 50
        const std = standardDeviation(agg.mentalScores)
        // Moins de variance = plus adaptable
        return clamp(100 - std * 2, 0, 100)
    }

    private computeBasketballIQ(agg: ReturnType<TwinBuilder['aggregateStats']>): number {
        const ss = agg.shotStats
        if (!ss) return 50
        // IQ = bonne sélection de tirs + mental + variété
        const shotSelection = ss.fieldGoalPct > 40 ? ss.fieldGoalPct * 0.8 : ss.fieldGoalPct * 0.5
        const variety = Object.keys(agg.zoneFrequency).length / 6 * 30
        const mental = 100 - (agg.mentalScores.length > 0 ? avg(agg.mentalScores) : 50)
        return clamp(Math.round(shotSelection * 0.4 + variety * 0.3 + mental * 0.3), 0, 100)
    }

    private computeOverallRating(categories: TwinAttributeCategory[]): number {
        if (categories.length === 0) return 50
        // Pondération : Tir 35%, Mental 25%, Physique 20%, Tactique 20%
        const weights: Record<string, number> = { 'Tir': 0.35, 'Mental': 0.25, 'Physique': 0.20, 'Tactique': 0.20 }
        let total = 0
        let wSum = 0
        for (const cat of categories) {
            const w = weights[cat.category] ?? 0.25
            total += cat.overallScore * w
            wSum += w
        }
        return Math.round(total / wSum)
    }

    private computeMentalProfile(agg: ReturnType<TwinBuilder['aggregateStats']>): TwinProfile['mentalProfile'] {
        const mentalAvg = agg.mentalScores.length > 0 ? avg(agg.mentalScores) : 50
        const resilience = this.computeResilience(agg)
        const clutch = this.computeClutchFactor(agg)
        const consistency = this.computeMentalConsistency(agg)
        const fatigueResistance = agg.fatigueIndices.length > 0 ? clamp(100 - avg(agg.fatigueIndices), 0, 100) : 50

        let pressureResponse: 'thrives' | 'neutral' | 'struggles'
        if (mentalAvg < 35) pressureResponse = 'thrives'
        else if (mentalAvg > 60) pressureResponse = 'struggles'
        else pressureResponse = 'neutral'

        return { resilience: Math.round(resilience), clutchFactor: Math.round(clutch), consistency: Math.round(consistency), pressureResponse, fatigueResistance: Math.round(fatigueResistance) }
    }

    private computePoseSignature(agg: ReturnType<TwinBuilder['aggregateStats']>): TwinProfile['poseSignature'] {
        const ss = agg.shotStats
        return {
            avgElbowAngle: ss ? Math.round(ss.averageElbowAngle) : 0,
            avgReleaseHeight: ss ? Math.round(ss.averageReleaseHeight * 100) / 100 : 0,
            avgShoulderPosture: agg.bodyLanguageScores.length > 0 ? Math.round(avg(agg.bodyLanguageScores)) : 50,
            dominantHand: 'right', // TODO: détecter à partir des landmarks
        }
    }

    private createEmptyProfile(): TwinProfile {
        return {
            modelVersion: MODEL_VERSION,
            updatedAt: new Date().toISOString(),
            sessionCount: 0,
            overallRating: 50,
            attributeCategories: [],
            playStyle: { primary: 'balanced', secondary: null, confidence: 0, description: 'Pas encore assez de données', nbaArchetype: '—', traits: [] },
            strengths: [],
            weaknesses: [],
            nbaComparisons: [],
            comfortZones: [],
            evolution: [],
            preferredZones: {},
            poseSignature: { avgElbowAngle: 0, avgReleaseHeight: 0, avgShoulderPosture: 50, dominantHand: 'right' },
            mentalProfile: { resilience: 50, clutchFactor: 50, consistency: 50, pressureResponse: 'neutral', fatigueResistance: 50 },
        }
    }
}

// ==========================================
// TwinSimulator — Simulation de match-ups
// ==========================================

export class TwinSimulator {
    /**
     * Simule un match-up entre le joueur et un adversaire (profil NBA ou autre twin).
     */
    static simulate(
        playerProfile: TwinProfile,
        opponentProfile: TwinProfile | null,
        opponentName: string = 'Adversaire'
    ): MatchupSimulation {
        const pCats = playerProfile.attributeCategories
        const oCats = opponentProfile?.attributeCategories

        const pShooting = pCats.find(c => c.category === 'Tir')?.overallScore ?? 50
        const pMental = pCats.find(c => c.category === 'Mental')?.overallScore ?? 50
        const pPhysical = pCats.find(c => c.category === 'Physique')?.overallScore ?? 50
        const pTactical = pCats.find(c => c.category === 'Tactique')?.overallScore ?? 50

        const oShooting = oCats?.find(c => c.category === 'Tir')?.overallScore ?? 50
        const oMental = oCats?.find(c => c.category === 'Mental')?.overallScore ?? 50
        const oPhysical = oCats?.find(c => c.category === 'Physique')?.overallScore ?? 50
        const oTactical = oCats?.find(c => c.category === 'Tactique')?.overallScore ?? 50

        const playerTotal = pShooting * 0.35 + pMental * 0.25 + pPhysical * 0.20 + pTactical * 0.20
        const oppTotal = oShooting * 0.35 + oMental * 0.25 + oPhysical * 0.20 + oTactical * 0.20

        const diff = playerTotal - oppTotal
        const winProb = clamp(Math.round(50 + diff * 0.8), 10, 90)

        const advantages: string[] = []
        const vulnerabilities: string[] = []
        const gameplan: string[] = []

        if (pShooting > oShooting + 5) {
            advantages.push('Avantage au tir')
            gameplan.push('Cherche le tir ouvert, tu es meilleur tireur')
        } else if (pShooting < oShooting - 5) {
            vulnerabilities.push('Désavantage au tir')
            gameplan.push('Défends fort sur le tir adverse, attaque le cercle')
        }

        if (pMental > oMental + 5) {
            advantages.push('Supériorité mentale')
            gameplan.push('Mets la pression early, force les erreurs')
        } else if (pMental < oMental - 5) {
            vulnerabilities.push('Fragilité mentale relative')
            gameplan.push('Reste calme, suis ta routine, ne te précipite pas')
        }

        if (pPhysical > oPhysical + 5) {
            advantages.push('Avantage physique')
            gameplan.push('Impose le rythme physiquement, en transition')
        } else if (pPhysical < oPhysical - 5) {
            vulnerabilities.push('Désavantage physique')
            gameplan.push('Joue intelligent, économise ton énergie')
        }

        if (gameplan.length === 0) {
            gameplan.push('Match serré — la constance fera la différence')
        }

        const keyMatchups: MatchupSimulation['keyMatchups'] = [
            { area: 'Tir', edge: pShooting > oShooting + 3 ? 'player' : pShooting < oShooting - 3 ? 'opponent' : 'even' },
            { area: 'Mental', edge: pMental > oMental + 3 ? 'player' : pMental < oMental - 3 ? 'opponent' : 'even' },
            { area: 'Physique', edge: pPhysical > oPhysical + 3 ? 'player' : pPhysical < oPhysical - 3 ? 'opponent' : 'even' },
            { area: 'Tactique', edge: pTactical > oTactical + 3 ? 'player' : pTactical < oTactical - 3 ? 'opponent' : 'even' },
        ]

        const baseScore = 15 + Math.round(playerTotal * 0.1)
        const oppBaseScore = 15 + Math.round(oppTotal * 0.1)

        return {
            opponent: opponentName,
            winProbability: winProb,
            advantages,
            vulnerabilities,
            gameplan,
            predictedScore: { player: baseScore, opponent: oppBaseScore },
            keyMatchups,
        }
    }

    /**
     * Simule un match-up contre un archétype NBA.
     */
    static simulateVsNBA(
        playerProfile: TwinProfile,
        nbaPlayerName: string
    ): MatchupSimulation {
        const nba = NBA_ARCHETYPES.find(a => a.name.toLowerCase() === nbaPlayerName.toLowerCase())

        if (!nba) {
            return {
                opponent: nbaPlayerName,
                winProbability: 30,
                advantages: [],
                vulnerabilities: ['Joueur NBA inconnu dans la base'],
                gameplan: ['Joue ton jeu naturel'],
                predictedScore: { player: 12, opponent: 21 },
                keyMatchups: [],
            }
        }

        // Construire un profil fictif à partir de l'archétype NBA
        const nbaProfile: TwinProfile = {
            ...new TwinBuilder()['createEmptyProfile'](),
            overallRating: Math.round((nba.shooting + nba.mental + nba.physical) / 3),
            attributeCategories: [
                { category: 'Tir', emoji: '🎯', attributes: [], overallScore: nba.shooting },
                { category: 'Mental', emoji: '🧠', attributes: [], overallScore: nba.mental },
                { category: 'Physique', emoji: '💪', attributes: [], overallScore: nba.physical },
                { category: 'Tactique', emoji: '📐', attributes: [], overallScore: Math.round((nba.shooting + nba.mental) / 2) },
            ],
        }

        return TwinSimulator.simulate(playerProfile, nbaProfile, nba.name)
    }
}

// ==========================================
// LLM-powered Twin Insights
// ==========================================

/**
 * Génère des insights personnalisés pour le Digital Twin via LLM.
 */
export async function generateTwinInsights(profile: TwinProfile): Promise<string> {
    const systemPrompt = `Tu es CourtVision AI, l'IA coach de basketball la plus avancée.
Tu analyses le Digital Twin d'un joueur — son avatar IA qui capture son ADN de jeu.

Ton rôle : donner un briefing court et percutant (150-200 mots) sur le profil du joueur.
Style : direct, motivant, concret. Comme un coach qui parle dans le vestiaire.
Réponds en français.`

    const userPrompt = `Voici le profil Digital Twin du joueur :

- Note globale : ${profile.overallRating}/100
- Style de jeu : ${profile.playStyle.primary} (${profile.playStyle.description})
- Archétype NBA : ${profile.playStyle.nbaArchetype}
- Sessions analysées : ${profile.sessionCount}
- Forces : ${profile.strengths.map(s => s.label).join(', ') || 'En construction'}
- Faiblesses : ${profile.weaknesses.map(w => w.label).join(', ') || 'En construction'}
- Profil mental : résilience ${profile.mentalProfile.resilience}/100, clutch ${profile.mentalProfile.clutchFactor}/100
- Signature de tir : coude ${profile.poseSignature.avgElbowAngle}°, release ${profile.poseSignature.avgReleaseHeight}

Donne ton analyse de ce joueur en 150-200 mots.`

    try {
        return await generateReport({ systemPrompt, userPrompt })
    } catch {
        // Fallback
        return `**Note globale : ${profile.overallRating}/100** — Style ${profile.playStyle.primary}.
${profile.strengths.length > 0 ? `Forces : ${profile.strengths.map(s => s.label).join(', ')}` : 'Continue à jouer pour construire ton profil.'}
${profile.weaknesses.length > 0 ? `À travailler : ${profile.weaknesses.map(w => w.label).join(', ')}` : ''}
Archétype : ${profile.playStyle.nbaArchetype}.`
    }
}

// ==========================================
// Utilitaires
// ==========================================

function avg(arr: number[]): number {
    if (arr.length === 0) return 0
    return arr.reduce((a, b) => a + b, 0) / arr.length
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}

function standardDeviation(arr: number[]): number {
    if (arr.length < 2) return 0
    const mean = avg(arr)
    const sq = arr.map(v => (v - mean) ** 2)
    return Math.sqrt(avg(sq))
}
