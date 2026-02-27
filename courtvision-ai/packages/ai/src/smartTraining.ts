import { generateReport } from './llm'
import { ShotResult, ShotStats, computeShotStats, ShotZone } from './shotAnalysis'
import { MentalAnalysisResult } from './mentalAnalysis'

/**
 * Smart Training AI — Plans d'entraînement adaptatifs
 *
 * Génère des plans d'entraînement qui s'adaptent automatiquement en fonction de :
 * - La performance des dernières sessions
 * - Le niveau de récupération (sleep, HRV, soreness)
 * - Les faiblesses détectées par le Shot DNA
 * - Les objectifs du joueur
 * - La périodisation (macro/méso/micro cycles)
 *
 * Inspiré par :
 * - Apple Fitness+ (adaptive workouts)
 * - Whoop Strain Coach
 * - NBA team training periodization
 *
 * Différenciation vs HomeCourt :
 * - HomeCourt = 0 training plan
 * - CourtVision = AI-generated, auto-adaptatif, récupération-aware
 */

// ==========================================
// Types
// ==========================================

export interface TrainingPlanRequest {
    userId: string
    // Player data
    position?: string
    overallRating?: number
    // Weaknesses detected by AI
    weaknesses: string[]
    // Goals
    goals: string[]
    // Recovery
    recoveryScore?: number
    fatigueLevel?: number
    // Shot data
    worstZones: ShotZone[]
    bestZones: ShotZone[]
    avgShootingPct: number
    avgMentalScore: number
    // Constraints
    availableDays: number  // 3-7
    sessionDurationMin: number  // 20-90
    hasGym: boolean
    hasCourt: boolean
    // Type
    planType: 'weekly' | 'micro_cycle' | 'deload' | 'peaking'
}

export interface SmartTrainingPlan {
    name: string
    objective: string
    planType: string
    difficultyLevel: number  // 1-10
    totalDurationMin: number
    days: TrainingPlanDay[]
    weeklyObjective: string
    adaptations: PlanAdaptation[]
    generatedBy: 'ai' | 'algorithmic'
}

export interface TrainingPlanDay {
    dayNumber: number
    title: string
    focus: string
    emoji: string
    totalDurationMin: number
    warmup: DrillItem
    drills: DrillItem[]
    cooldown: DrillItem
    mentalExercise?: DrillItem
    targetMetrics: string[]
    difficultyRating: number  // 1-5
    recoveryDay: boolean
}

export interface DrillItem {
    name: string
    description: string
    duration: string
    sets?: number
    reps?: string
    intensity: 'low' | 'moderate' | 'high' | 'max'
    equipment?: string[]
    videoUrl?: string  // Tutorial video
    tips: string[]
    targetMetric: string
}

export interface PlanAdaptation {
    date: string
    change: string
    reason: string
    original: string
    adapted: string
}

// ==========================================
// Drill Library (40+ drills organisés par catégorie)
// ==========================================

interface DrillTemplate {
    name: string
    description: string
    category: 'shooting' | 'mental' | 'conditioning' | 'footwork' | 'defense' | 'warmup' | 'cooldown'
    zone?: ShotZone
    baseDuration: string
    baseSets: number
    baseReps: string
    intensity: 'low' | 'moderate' | 'high' | 'max'
    equipment: string[]
    tips: string[]
    targetMetric: string
}

const DRILL_LIBRARY: DrillTemplate[] = [
    // ── Shooting drills ────────────────────────
    {
        name: 'Form Shooting (1m)',
        description: 'Tirs à 1m du panier, focus sur la mécanique pure. Main guide OFF. Un seul bras.',
        category: 'shooting', zone: 'restricted',
        baseDuration: '5 min', baseSets: 3, baseReps: '10 tirs',
        intensity: 'low', equipment: ['ballon'],
        tips: ['Coude à 90°', 'Follow-through 1 seconde', 'Vise le carré du panneau'],
        targetMetric: 'elbow_angle',
    },
    {
        name: 'Spot-Up Corner 3s',
        description: 'Tirs à 3 points depuis les deux corners. Catch and shoot, sans dribble.',
        category: 'shooting', zone: 'corner3',
        baseDuration: '8 min', baseSets: 5, baseReps: '10 tirs par coin',
        intensity: 'moderate', equipment: ['ballon', 'passeur ou mur'],
        tips: ['Pieds positionnés avant de recevoir', 'Release rapide', 'Follow-through vers le panier'],
        targetMetric: 'corner3_pct',
    },
    {
        name: 'Wing 3-Point Reps',
        description: 'Tirs à 3 points depuis les ailes. Catch & shoot + 1 dribble pull-up.',
        category: 'shooting', zone: 'wing3',
        baseDuration: '10 min', baseSets: 4, baseReps: '8 tirs par aile',
        intensity: 'moderate', equipment: ['ballon'],
        tips: ['Aligne pied dominant vers le panier', 'Monte le ballon haut', 'Rotation du ballon régulière'],
        targetMetric: 'wing3_pct',
    },
    {
        name: 'Top of Key 3s',
        description: 'Tirs à 3 points depuis le haut de la raquette. Step-back + catch & shoot.',
        category: 'shooting', zone: 'top3',
        baseDuration: '8 min', baseSets: 4, baseReps: '10 tirs',
        intensity: 'moderate', equipment: ['ballon'],
        tips: ['Équilibre avant le tir', 'Ne rush pas le release', 'Rythme 1-2 avec les pieds'],
        targetMetric: 'top3_pct',
    },
    {
        name: 'Mid-Range Pull-Up',
        description: 'Tirs mi-distance en sortie de dribble. Crossover + pull-up jumper.',
        category: 'shooting', zone: 'midrange',
        baseDuration: '10 min', baseSets: 5, baseReps: '6 tirs par côté',
        intensity: 'high', equipment: ['ballon', 'cône'],
        tips: ['Stop net sur les appuis', 'Elevation complète avant le tir', 'Regard sur le panier avant le dribble'],
        targetMetric: 'midrange_pct',
    },
    {
        name: 'Paint Finishing Series',
        description: 'Finitions dans la raquette : layup, reverse, floater, eurostep.',
        category: 'shooting', zone: 'paint',
        baseDuration: '12 min', baseSets: 4, baseReps: '8 finitions',
        intensity: 'high', equipment: ['ballon', 'cône'],
        tips: ['Contact épaule sur le drive', 'Utilise le panneau', 'Change de main selon le côté'],
        targetMetric: 'paint_pct',
    },
    {
        name: 'Free Throw Routine',
        description: 'Routine de lancers francs avec pression mentale simulée.',
        category: 'shooting',
        baseDuration: '8 min', baseSets: 1, baseReps: '50 lancers francs',
        intensity: 'low', equipment: ['ballon'],
        tips: ['Même routine à chaque fois', 'Respiration avant le tir', '3 rebonds max'],
        targetMetric: 'ft_pct',
    },
    {
        name: 'Catch & Shoot Circuit',
        description: 'Circuit de 5 spots : coin gauche, aile gauche, top, aile droite, coin droit. 2 tirs par spot, 3 tours.',
        category: 'shooting',
        baseDuration: '15 min', baseSets: 3, baseReps: '10 tirs par tour (5 spots x 2)',
        intensity: 'moderate', equipment: ['ballon', 'passeur ou machine'],
        tips: ['Sprint léger entre les spots', 'Pieds prêts avant la balle', 'Rythme constant'],
        targetMetric: 'catch_shoot_pct',
    },
    // ── Mental drills ──────────────────────────
    {
        name: 'Visualisation Guidée',
        description: 'Ferme les yeux et visualise 10 tirs parfaits depuis ta zone préférée. Ressens chaque détail.',
        category: 'mental',
        baseDuration: '5 min', baseSets: 1, baseReps: '10 tirs mentaux',
        intensity: 'low', equipment: [],
        tips: ['Environnement calme', 'Ressens le ballon dans tes mains', 'Vois le ballon entrer dans le filet'],
        targetMetric: 'mental_score',
    },
    {
        name: 'Breathing Reset (Box Breathing)',
        description: 'Respiration 4-4-4-4 : inspire 4s, retiens 4s, expire 4s, pause 4s. 5 cycles.',
        category: 'mental',
        baseDuration: '3 min', baseSets: 5, baseReps: '1 cycle 4-4-4-4',
        intensity: 'low', equipment: [],
        tips: ['Posture droite', 'Yeux fermés ou semi-ouverts', 'Focus sur le ventre qui se gonfle'],
        targetMetric: 'stress_level',
    },
    {
        name: 'Pressure Free Throws',
        description: 'Simule la pression : si tu rates 2 d\'affilée, fais 5 sprints terrain complet.',
        category: 'mental',
        baseDuration: '10 min', baseSets: 1, baseReps: '30 lancers francs',
        intensity: 'moderate', equipment: ['ballon'],
        tips: ['Traite chaque lancer comme le dernier du match', 'Routine identique à chaque fois', 'Contrôle ta respiration'],
        targetMetric: 'clutch_rating',
    },
    // ── Conditioning ───────────────────────────
    {
        name: 'Suicides (Navettes)',
        description: 'Sprints navette : ligne de fond → LF, demi-terrain, 3/4 terrain, terrain complet.',
        category: 'conditioning',
        baseDuration: '8 min', baseSets: 4, baseReps: '1 série complète',
        intensity: 'max', equipment: [],
        tips: ['Touche chaque ligne', 'Récupération 45s entre séries', 'Sprint à 100% effort'],
        targetMetric: 'fatigue_resistance',
    },
    {
        name: 'Defensive Slides',
        description: 'Glissements défensifs latéraux entre les lignes. Focus posture basse et pieds actifs.',
        category: 'defense',
        baseDuration: '6 min', baseSets: 6, baseReps: '30 secondes',
        intensity: 'high', equipment: [],
        tips: ['Hanches basses', 'Ne croise jamais les pieds', 'Mains actives'],
        targetMetric: 'defensive_intensity',
    },
    // ── Warmup/Cooldown ─────────────────────────
    {
        name: 'Dynamic Warmup',
        description: 'Échauffement dynamique : jogging, high knees, butt kicks, carioca, lunges, arm circles.',
        category: 'warmup',
        baseDuration: '5 min', baseSets: 1, baseReps: 'Circuit complet',
        intensity: 'low', equipment: [],
        tips: ['Commence doucement', 'Augmente l\'amplitude progressivement', 'Pas d\'étirements statiques'],
        targetMetric: 'readiness',
    },
    {
        name: 'Cool Down & Stretch',
        description: 'Retour au calme : jogging léger 2 min + étirements statiques (quadriceps, ischio, épaules, poignets).',
        category: 'cooldown',
        baseDuration: '5 min', baseSets: 1, baseReps: '30s par étirement',
        intensity: 'low', equipment: ['tapis optionnel'],
        tips: ['Respiration profonde', 'Ne force pas l\'étirement', 'Tiens chaque position 30 secondes'],
        targetMetric: 'recovery',
    },
]

// ==========================================
// Engine
// ==========================================

export class SmartTrainingEngine {

    /**
     * Génère un plan d'entraînement intelligent et adaptatif.
     */
    static generatePlan(request: TrainingPlanRequest): SmartTrainingPlan {
        const difficulty = this.computeDifficulty(request)
        const days = this.buildDays(request, difficulty)
        const objective = this.computeObjective(request)

        return {
            name: this.generatePlanName(request),
            objective,
            planType: request.planType,
            difficultyLevel: difficulty,
            totalDurationMin: days.reduce((sum, d) => sum + d.totalDurationMin, 0),
            days,
            weeklyObjective: objective,
            adaptations: [],
            generatedBy: 'algorithmic',
        }
    }

    /**
     * Adapte un plan existant en fonction de nouvelles données (récupération, performance).
     */
    static adaptPlan(
        plan: SmartTrainingPlan,
        recoveryScore: number,
        recentPerformance: { fgPct: number; mentalScore: number },
    ): SmartTrainingPlan {
        const adaptations: PlanAdaptation[] = [...plan.adaptations]
        const adaptedDays = [...plan.days]

        // If recovery is low, reduce intensity
        if (recoveryScore < 40) {
            for (let i = 0; i < adaptedDays.length; i++) {
                if (adaptedDays[i].difficultyRating >= 4) {
                    const original = `Jour ${adaptedDays[i].dayNumber}: ${adaptedDays[i].title} (difficulté ${adaptedDays[i].difficultyRating})`
                    adaptedDays[i] = {
                        ...adaptedDays[i],
                        difficultyRating: Math.max(1, adaptedDays[i].difficultyRating - 2),
                        drills: adaptedDays[i].drills.map(d => ({
                            ...d,
                            intensity: d.intensity === 'max' ? 'high' : d.intensity === 'high' ? 'moderate' : d.intensity,
                            sets: d.sets ? Math.max(1, d.sets - 1) : d.sets,
                        })),
                    }
                    adaptations.push({
                        date: new Date().toISOString(),
                        change: 'intensity_reduced',
                        reason: `Récupération faible (${recoveryScore}/100) — intensité réduite`,
                        original,
                        adapted: `Jour ${adaptedDays[i].dayNumber}: ${adaptedDays[i].title} (difficulté ${adaptedDays[i].difficultyRating})`,
                    })
                }
            }
        }

        // If performance is declining, add technique drills
        if (recentPerformance.fgPct < 35) {
            const techDrill = DRILL_LIBRARY.find(d => d.name === 'Form Shooting (1m)')
            if (techDrill) {
                for (const day of adaptedDays) {
                    if (!day.recoveryDay && !day.drills.some(d => d.name === techDrill.name)) {
                        day.drills.unshift(this.templateToDrill(techDrill, 1))
                        adaptations.push({
                            date: new Date().toISOString(),
                            change: 'drill_added',
                            reason: `% de tir en baisse (${recentPerformance.fgPct}%) — ajout d'un drill mécanique`,
                            original: 'Pas de form shooting',
                            adapted: 'Form Shooting ajouté en début de séance',
                        })
                        break // Only add to one day
                    }
                }
            }
        }

        return {
            ...plan,
            days: adaptedDays,
            adaptations,
        }
    }

    /**
     * Génère un plan avancé via LLM pour des plans ultra-personnalisés.
     */
    static async generateAIPlan(request: TrainingPlanRequest): Promise<SmartTrainingPlan> {
        const prompt = this.buildAIPrompt(request)

        try {
            const response = await generateReport({
                systemPrompt: `Tu es un préparateur physique et technique de basketball de niveau NBA.
Tu crées des plans d'entraînement ultra-personnalisés en JSON.
Réponds UNIQUEMENT en JSON valide, sans texte autour.`,
                userPrompt: prompt,
            })

            // Try to parse AI response as JSON
            const parsed = JSON.parse(response)
            return {
                ...parsed,
                generatedBy: 'ai',
            }
        } catch {
            // Fallback to algorithmic generation
            return this.generatePlan(request)
        }
    }

    // ── Private helpers ──────────────────────────

    private static computeDifficulty(request: TrainingPlanRequest): number {
        let difficulty = 5 // baseline

        if (request.planType === 'deload') difficulty = 3
        if (request.planType === 'peaking') difficulty = 8

        if (request.recoveryScore !== undefined) {
            if (request.recoveryScore < 40) difficulty = Math.max(1, difficulty - 2)
            if (request.recoveryScore > 80) difficulty = Math.min(10, difficulty + 1)
        }

        if (request.overallRating !== undefined) {
            if (request.overallRating > 80) difficulty = Math.min(10, difficulty + 1)
            if (request.overallRating < 40) difficulty = Math.max(1, difficulty - 1)
        }

        return difficulty
    }

    private static computeObjective(request: TrainingPlanRequest): string {
        const priorities: string[] = []

        if (request.worstZones.length > 0) {
            priorities.push(`Améliorer le tir en ${request.worstZones.join(' et ')}`)
        }
        if (request.avgMentalScore < 60) {
            priorities.push('Renforcer la résilience mentale')
        }
        if (request.avgShootingPct < 40) {
            priorities.push('Corriger la mécanique de tir')
        }
        if (request.fatigueLevel && request.fatigueLevel > 60) {
            priorities.push('Améliorer l\'endurance')
        }

        if (priorities.length === 0) {
            priorities.push('Maintenir et affiner le niveau actuel')
        }

        return priorities.slice(0, 2).join(' + ')
    }

    private static generatePlanName(request: TrainingPlanRequest): string {
        const names: Record<string, string> = {
            weekly: 'Plan Hebdomadaire',
            micro_cycle: 'Micro-Cycle Intensif',
            deload: 'Semaine de Décharge',
            peaking: 'Pic de Performance',
        }
        const planName = names[request.planType] ?? 'Plan d\'Entraînement'
        const focus = request.weaknesses.length > 0 ? ` — Focus ${request.weaknesses[0]}` : ''
        return `${planName}${focus}`
    }

    private static buildDays(request: TrainingPlanRequest, difficulty: number): TrainingPlanDay[] {
        const days: TrainingPlanDay[] = []
        const numDays = Math.min(7, request.availableDays)

        // Day templates based on periodization
        const dayFocuses = this.getDayFocuses(numDays, request)

        for (let i = 0; i < numDays; i++) {
            const focus = dayFocuses[i]
            const isRecovery = focus === 'recovery'
            const dayDuration = isRecovery
                ? Math.min(request.sessionDurationMin, 30)
                : request.sessionDurationMin

            const warmup = this.templateToDrill(
                DRILL_LIBRARY.find(d => d.category === 'warmup')!,
                difficulty
            )
            const cooldown = this.templateToDrill(
                DRILL_LIBRARY.find(d => d.category === 'cooldown')!,
                difficulty
            )

            const drills = this.selectDrills(focus, request, difficulty)
            const mentalExercise = this.shouldIncludeMental(focus, request)
                ? this.templateToDrill(DRILL_LIBRARY.find(d => d.category === 'mental')!, difficulty)
                : undefined

            days.push({
                dayNumber: i + 1,
                title: this.getDayTitle(focus),
                focus,
                emoji: this.getDayEmoji(focus),
                totalDurationMin: dayDuration,
                warmup,
                drills,
                cooldown,
                mentalExercise,
                targetMetrics: drills.map(d => d.targetMetric).filter((v, i, a) => a.indexOf(v) === i),
                difficultyRating: isRecovery ? 1 : Math.min(5, Math.ceil(difficulty / 2)),
                recoveryDay: isRecovery,
            })
        }

        return days
    }

    private static getDayFocuses(numDays: number, request: TrainingPlanRequest): string[] {
        if (request.planType === 'deload') {
            return Array(numDays).fill('recovery').map((_, i) =>
                i % 2 === 0 ? 'technique' : 'recovery'
            )
        }

        const focuses = [
            'shooting_weakness',  // Focus sur les zones faibles
            'conditioning',       // Cardio
            'technique',          // Mécanique pure
            'mental',            // Mental game
            'shooting_strength', // Renforcer les zones fortes
            'game_simulation',   // Simulation match
            'recovery',          // Récupération
        ]

        return focuses.slice(0, numDays)
    }

    private static selectDrills(focus: string, request: TrainingPlanRequest, difficulty: number): DrillItem[] {
        const drills: DrillItem[] = []

        switch (focus) {
            case 'shooting_weakness': {
                const worstZone = request.worstZones[0]
                const zoneDrills = DRILL_LIBRARY.filter(d =>
                    d.category === 'shooting' && d.zone === worstZone
                )
                if (zoneDrills.length > 0) {
                    drills.push(this.templateToDrill(zoneDrills[0], difficulty))
                }
                drills.push(this.templateToDrill(
                    DRILL_LIBRARY.find(d => d.name === 'Form Shooting (1m)')!,
                    difficulty
                ))
                drills.push(this.templateToDrill(
                    DRILL_LIBRARY.find(d => d.name === 'Catch & Shoot Circuit')!,
                    difficulty
                ))
                break
            }
            case 'conditioning': {
                const condDrills = DRILL_LIBRARY.filter(d =>
                    d.category === 'conditioning' || d.category === 'defense'
                )
                for (const d of condDrills.slice(0, 3)) {
                    drills.push(this.templateToDrill(d, difficulty))
                }
                break
            }
            case 'technique': {
                drills.push(this.templateToDrill(
                    DRILL_LIBRARY.find(d => d.name === 'Form Shooting (1m)')!,
                    difficulty
                ))
                drills.push(this.templateToDrill(
                    DRILL_LIBRARY.find(d => d.name === 'Free Throw Routine')!,
                    difficulty
                ))
                break
            }
            case 'mental': {
                const mentalDrills = DRILL_LIBRARY.filter(d => d.category === 'mental')
                for (const d of mentalDrills) {
                    drills.push(this.templateToDrill(d, difficulty))
                }
                break
            }
            case 'shooting_strength': {
                const bestZone = request.bestZones[0]
                const zoneDrills = DRILL_LIBRARY.filter(d =>
                    d.category === 'shooting' && d.zone === bestZone
                )
                for (const d of zoneDrills.slice(0, 2)) {
                    drills.push(this.templateToDrill(d, difficulty))
                }
                drills.push(this.templateToDrill(
                    DRILL_LIBRARY.find(d => d.name === 'Catch & Shoot Circuit')!,
                    difficulty
                ))
                break
            }
            case 'game_simulation': {
                drills.push(this.templateToDrill(
                    DRILL_LIBRARY.find(d => d.name === 'Pressure Free Throws')!,
                    difficulty
                ))
                drills.push(this.templateToDrill(
                    DRILL_LIBRARY.find(d => d.name === 'Mid-Range Pull-Up')!,
                    difficulty
                ))
                drills.push(this.templateToDrill(
                    DRILL_LIBRARY.find(d => d.name === 'Paint Finishing Series')!,
                    difficulty
                ))
                break
            }
            case 'recovery': {
                drills.push(this.templateToDrill(
                    DRILL_LIBRARY.find(d => d.name === 'Free Throw Routine')!,
                    Math.max(1, difficulty - 3)
                ))
                drills.push(this.templateToDrill(
                    DRILL_LIBRARY.find(d => d.category === 'mental' && d.name.includes('Visualisation'))!,
                    1
                ))
                break
            }
            default: {
                // Generic: mix of shooting + mental
                drills.push(this.templateToDrill(DRILL_LIBRARY[0], difficulty))
                drills.push(this.templateToDrill(DRILL_LIBRARY[1], difficulty))
            }
        }

        return drills
    }

    private static templateToDrill(template: DrillTemplate, difficulty: number): DrillItem {
        const diffMultiplier = 1 + (difficulty - 5) * 0.15 // -0.6 to +0.75

        return {
            name: template.name,
            description: template.description,
            duration: template.baseDuration,
            sets: template.baseSets ? Math.max(1, Math.round(template.baseSets * diffMultiplier)) : undefined,
            reps: template.baseReps,
            intensity: template.intensity,
            equipment: template.equipment,
            tips: template.tips,
            targetMetric: template.targetMetric,
        }
    }

    private static shouldIncludeMental(focus: string, request: TrainingPlanRequest): boolean {
        return focus === 'mental' || (request.avgMentalScore < 60) || focus === 'recovery'
    }

    private static getDayTitle(focus: string): string {
        const titles: Record<string, string> = {
            shooting_weakness: 'Correction de zone',
            conditioning: 'Cardio & Agilité',
            technique: 'Mécanique pure',
            mental: 'Mental Game',
            shooting_strength: 'Zone de confort +',
            game_simulation: 'Simulation match',
            recovery: 'Récupération active',
        }
        return titles[focus] ?? 'Entraînement'
    }

    private static getDayEmoji(focus: string): string {
        const emojis: Record<string, string> = {
            shooting_weakness: '🎯',
            conditioning: '🏃',
            technique: '🔧',
            mental: '🧠',
            shooting_strength: '💪',
            game_simulation: '🏀',
            recovery: '🧘',
        }
        return emojis[focus] ?? '🏀'
    }

    private static buildAIPrompt(request: TrainingPlanRequest): string {
        return `Crée un plan d'entraînement basket pour un joueur avec ces caractéristiques :
- Position : ${request.position ?? 'non spécifiée'}
- Rating global : ${request.overallRating ?? 'inconnu'}/100
- Faiblesses : ${request.weaknesses.join(', ') || 'aucune spécifiée'}
- Objectifs : ${request.goals.join(', ') || 'progression générale'}
- Zones faibles : ${request.worstZones.join(', ') || 'à déterminer'}
- Zones fortes : ${request.bestZones.join(', ') || 'à déterminer'}
- % tir moyen : ${request.avgShootingPct}%
- Score mental moyen : ${request.avgMentalScore}/100
- Récupération : ${request.recoveryScore ?? 'inconnue'}/100
- Jours disponibles : ${request.availableDays}
- Durée par session : ${request.sessionDurationMin} min
- Type de plan : ${request.planType}
- Accès gym : ${request.hasGym ? 'Oui' : 'Non'}
- Accès terrain : ${request.hasCourt ? 'Oui' : 'Non'}

Génère un JSON avec la structure SmartTrainingPlan.`
    }
}
