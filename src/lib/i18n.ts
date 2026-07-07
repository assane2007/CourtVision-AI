// ── CourtVision AI — Lightweight i18n System ─────────────────────────────────
// No external dependencies. Uses a flat key → string dictionary per locale.

export type AppLanguage = 'fr' | 'en'

// ── Translation keys ─────────────────────────────────────────────────────────
export type TranslationKey =
  // Navigation & Screens
  | 'nav.home'
  | 'nav.plans'
  | 'nav.training'
  | 'nav.stats'
  | 'nav.profile'
  | 'screen.achievements'
  | 'screen.leaderboard'
  | 'screen.aiCoach'
  | 'screen.reactionTrainer'
  | 'screen.scouting'
  | 'screen.settings'
  | 'screen.records'
  // Common actions
  | 'action.signIn'
  | 'action.signUp'
  | 'action.logIn'
  | 'action.createAccount'
  | 'action.save'
  | 'action.cancel'
  | 'action.delete'
  | 'action.confirm'
  | 'action.back'
  | 'action.loadMore'
  | 'action.retry'
  | 'action.start'
  | 'action.pause'
  | 'action.finish'
  | 'action.nextExercise'
  // Stats
  | 'stats.totalSessions'
  | 'stats.repetitions'
  | 'stats.averageScore'
  | 'stats.sessionsPerWeek'
  | 'stats.weeklyActivity'
  | 'stats.categoryPerformance'
  | 'stats.recentSessions'
  | 'stats.streakDays'
  | 'stats.weekGoalLabel'
  // Workout
  | 'workout.score'
  | 'workout.rep'
  | 'workout.time'
  | 'workout.sessionSummary'
  // Empty states
  | 'empty.noData'
  | 'empty.startFirstWorkout'
  | 'empty.noDataAvailable'
  | 'empty.readyToStart'
  | 'empty.startFirstDesc'
  | 'empty.startTraining'
  | 'empty.noRecentActivity'
  | 'empty.noRecentDesc'
  // Settings labels
  | 'settings.weeklySessionGoal'
  | 'settings.weeklyRepGoal'
  | 'settings.preferredRest'
  | 'settings.sound'
  | 'settings.haptics'
  | 'settings.language'
  | 'settings.notifications'
  | 'settings.training'
  | 'settings.general'
  | 'settings.account'
  // Home screen
  | 'home.recommendationsAI'
  | 'home.recentActivity'
  | 'home.leaderboard'
  | 'home.leaderboardDesc'
  | 'home.cognitiveTraining'
  | 'home.cognitiveTrainingDesc'
  | 'home.exercises'
  | 'home.reps'
  | 'home.points'
  | 'home.new'
  | 'home.bestScore'
  // Difficulty
  | 'difficulty.beginner'
  | 'difficulty.intermediate'
  | 'difficulty.advanced'
  // Positions
  | 'position.guard'
  | 'position.forward'
  | 'position.center'
  // Categories (CRITICAL)
  | 'category.pocket_ball'
  | 'category.shifty'
  | 'category.ball_handling'
  | 'category.speed_change'
  | 'category.defense'
  | 'category.shooting'
  | 'category.footwork'
  | 'category.finishing'
  | 'category.conditioning'
  | 'category.all'
  // Grade labels (same in both)
  | 'grade.S'
  | 'grade.A'
  | 'grade.B'
  | 'grade.C'
  | 'grade.D'
  | 'grade.F'
  // Reaction Trainer
  | 'reaction.title'
  | 'reaction.direction'
  | 'reaction.color'
  | 'reaction.shotClock'
  | 'reaction.reflexPure'
  | 'reaction.rounds'
  | 'reaction.reactionTime'
  | 'reaction.correct'
  | 'reaction.incorrect'
  | 'reaction.startTraining'
  | 'reaction.results'
  | 'reaction.averageTime'
  | 'reaction.bestTime'
  | 'reaction.personalBest'
  | 'reaction.newRecord'
  | 'reaction.playAgain'
  // AI Coach
  | 'coach.title'
  | 'coach.online'
  | 'coach.offline'
  | 'coach.personalCoach'
  | 'coach.typeMessage'
  | 'coach.send'
  | 'coach.suggestedActions'
  | 'coach.createPlan'
  | 'coach.shootingAdvice'
  | 'coach.ballHandlingAdvice'
  | 'coach.defenseAdvice'
  | 'coach.conditioningAdvice'
  // Pricing
  | 'pricing.title'
  | 'pricing.subtitle'
  | 'pricing.free'
  | 'pricing.freeDesc'
  | 'pricing.pro'
  | 'pricing.proDesc'
  | 'pricing.elite'
  | 'pricing.eliteDesc'
  | 'pricing.popular'
  | 'pricing.subscribe'
  | 'pricing.currentPlan'
  | 'pricing.securePayment'
  | 'pricing.noCommitment'
  // Workout Summary
  | 'summary.sessionComplete'
  | 'summary.overallGrade'
  | 'summary.excellent'
  | 'summary.veryGood'
  | 'summary.good'
  | 'summary.average'
  | 'summary.belowAverage'
  | 'summary.needsWork'
  | 'summary.failed'
  | 'summary.drillResults'
  | 'summary.totalReps'
  | 'summary.totalTime'
  | 'summary.saveAndExit'
  | 'summary.backToHome'
  // Camera Workout
  | 'camera.aiFormCheck'
  | 'camera.analyzing'
  | 'camera.goodPoints'
  | 'camera.issues'
  | 'camera.score'
  // Common
  | 'error.loadFailed'
  | 'error.serverError'
  | 'dayNames.mon'
  | 'dayNames.tue'
  | 'dayNames.wed'
  | 'dayNames.thu'
  | 'dayNames.fri'
  | 'dayNames.sat'
  | 'dayNames.sun'
  // Misc
  | 'common.on'
  | 'common.off'
  | 'common.weekly'
  | 'language.fr'
  | 'language.en'

// ── Translation dictionaries ────────────────────────────────────────────────
const translations: Record<AppLanguage, Record<TranslationKey, string>> = {
  fr: {
    // Navigation & Screens
    'nav.home': 'Accueil',
    'nav.plans': 'Plans',
    'nav.training': 'Entraînement',
    'nav.stats': 'Stats',
    'nav.profile': 'Profil',
    'screen.achievements': 'Succès & Badges',
    'screen.leaderboard': 'Classement',
    'screen.aiCoach': 'Coach IA',
    'screen.reactionTrainer': 'Entraîneur de Réaction',
    'screen.scouting': 'Scouting',
    'screen.settings': 'Réglages',
    'screen.records': 'Records',

    // Common actions
    'action.signIn': 'Connexion',
    'action.signUp': 'Inscription',
    'action.logIn': 'Se connecter',
    'action.createAccount': 'Créer un compte',
    'action.save': 'Enregistrer',
    'action.cancel': 'Annuler',
    'action.delete': 'Supprimer',
    'action.confirm': 'Confirmer',
    'action.back': 'Retour',
    'action.loadMore': 'Charger plus',
    'action.retry': 'Réessayer',
    'action.start': 'Commencer',
    'action.pause': 'Pause',
    'action.finish': 'Terminer',
    'action.nextExercise': 'Exercice suivant',

    // Stats
    'stats.totalSessions': 'Séances Totales',
    'stats.repetitions': 'Répétitions',
    'stats.averageScore': 'Score Moyen',
    'stats.sessionsPerWeek': 'Séances / Semaine',
    'stats.weeklyActivity': 'Activité Hebdomadaire',
    'stats.categoryPerformance': 'Performance par Catégorie',
    'stats.recentSessions': 'Séances Récentes',
    'stats.streakDays': 'Série (jours)',
    'stats.weekGoalLabel': 'Objectif Hebdo',

    // Workout
    'workout.score': 'Score',
    'workout.rep': 'Répétition',
    'workout.time': 'Temps',
    'workout.sessionSummary': 'Résumé de la séance',

    // Empty states
    'empty.noData': 'Aucune donnée',
    'empty.startFirstWorkout': 'Commencez votre premier entraînement',
    'empty.noDataAvailable': 'Aucune donnée disponible',
    'empty.readyToStart': 'Prêt à commencer ?',
    'empty.startFirstDesc': 'Commencez votre premier entraînement et l\'IA vous recommandera les meilleurs exercices.',
    'empty.startTraining': 'Démarrer l\'entraînement',
    'empty.noRecentActivity': 'Aucune activité récente',
    'empty.noRecentDesc': 'Vos séances apparaîtront ici une fois que vous aurez commencé à vous entraîner.',

    // Settings labels
    'settings.weeklySessionGoal': 'Objectif hebdomadaire de séances',
    'settings.weeklyRepGoal': 'Objectif hebdomadaire de répétitions',
    'settings.preferredRest': 'Temps de repos préféré',
    'settings.sound': 'Son',
    'settings.haptics': 'Vibrations',
    'settings.language': 'Langue',
    'settings.notifications': 'Notifications',
    'settings.training': 'Entraînement',
    'settings.general': 'Général',
    'settings.account': 'Compte',

    // Home screen
    'home.recommendationsAI': 'Recommandations IA',
    'home.recentActivity': 'Activité Récente',
    'home.leaderboard': 'Classement',
    'home.leaderboardDesc': 'Compare ton niveau aux autres joueurs',
    'home.cognitiveTraining': 'Entraînement Cognitif',
    'home.cognitiveTrainingDesc': 'Teste tes réflexes de basketteur',
    'home.exercises': 'exercice',
    'home.reps': 'rép.',
    'home.points': 'pts',
    'home.new': 'Nouveau',
    'home.bestScore': 'Meilleur score',

    // Difficulty
    'difficulty.beginner': 'Débutant',
    'difficulty.intermediate': 'Intermédiaire',
    'difficulty.advanced': 'Avancé',

    // Positions
    'position.guard': 'Meneur',
    'position.forward': 'Ailier',
    'position.center': 'Pivot',

    // Categories
    'category.pocket_ball': 'Poche de balle',
    'category.shifty': 'Démarquage',
    'category.ball_handling': 'Dribble & Maniement',
    'category.speed_change': 'Changement de vitesse',
    'category.defense': 'Défense',
    'category.shooting': 'Tir',
    'category.footwork': 'Placement pieds',
    'category.finishing': 'Finition',
    'category.conditioning': 'Condition physique',
    'category.all': 'Tous',

    // Grade labels
    'grade.S': 'S',
    'grade.A': 'A',
    'grade.B': 'B',
    'grade.C': 'C',
    'grade.D': 'D',
    'grade.F': 'F',

    // Reaction Trainer
    'reaction.title': 'Entraînement Cognitif',
    'reaction.direction': 'Direction Rapide',
    'reaction.color': 'Couleur & Action',
    'reaction.shotClock': 'Shot Clock',
    'reaction.reflexPure': 'Reflexe Joueur',
    'reaction.rounds': 'tours',
    'reaction.reactionTime': 'Temps de réaction',
    'reaction.correct': 'Correct',
    'reaction.incorrect': 'Incorrect',
    'reaction.startTraining': 'Commencer',
    'reaction.results': 'Résultats',
    'reaction.averageTime': 'Temps moyen',
    'reaction.bestTime': 'Meilleur temps',
    'reaction.personalBest': 'Record personnel',
    'reaction.newRecord': 'Nouveau record !',
    'reaction.playAgain': 'Rejouer',

    // AI Coach
    'coach.title': 'Coach IA',
    'coach.online': 'En ligne',
    'coach.offline': 'Hors ligne',
    'coach.personalCoach': 'Ton coach personnel 🏀',
    'coach.typeMessage': 'Demande au coach...',
    'coach.send': 'Envoyer',
    'coach.suggestedActions': '💡 Suggestions rapides',
    'coach.createPlan': 'Créer un programme',
    'coach.shootingAdvice': 'Conseil tir',
    'coach.ballHandlingAdvice': 'Améliorer mon dribble',
    'coach.defenseAdvice': 'Comment me défendre?',
    'coach.conditioningAdvice': 'Mon point faible',

    // Pricing
    'pricing.title': 'Choisis ton plan',
    'pricing.subtitle': 'Passe au niveau supérieur avec des outils professionnels pour améliorer ton jeu.',
    'pricing.free': 'Gratuit',
    'pricing.freeDesc': 'Pour découvrir CourtVision AI',
    'pricing.pro': 'Pro',
    'pricing.proDesc': 'Pour les joueurs sérieux',
    'pricing.elite': 'Élite',
    'pricing.eliteDesc': "L'expérience ultime",
    'pricing.popular': 'POPULAIRE',
    'pricing.subscribe': "S'abonner",
    'pricing.currentPlan': "C'est ton plan actuel",
    'pricing.securePayment': 'Paiement sécurisé',
    'pricing.noCommitment': 'Sans engagement',

    // Workout Summary
    'summary.sessionComplete': 'Session terminée',
    'summary.overallGrade': 'Note globale',
    'summary.excellent': 'EXCELLENT',
    'summary.veryGood': 'TRÈS BIEN',
    'summary.good': 'BIEN',
    'summary.average': 'MOYEN',
    'summary.belowAverage': 'À AMÉLIORER',
    'summary.needsWork': 'INSUFFISANT',
    'summary.failed': 'ÉCHOUÉ',
    'summary.drillResults': 'Détail par exercice',
    'summary.totalReps': 'Répétitions totales',
    'summary.totalTime': 'Durée totale',
    'summary.saveAndExit': 'Sauvegarder et quitter',
    'summary.backToHome': "Retour à l'accueil",

    // Camera Workout
    'camera.aiFormCheck': "Vérification de la forme par l'IA",
    'camera.analyzing': 'Analyse en cours...',
    'camera.goodPoints': 'Points positifs',
    'camera.issues': 'Points à améliorer',
    'camera.score': 'Score',

    // Common
    'error.loadFailed': 'Erreur de chargement',
    'error.serverError': 'Erreur serveur',
    'dayNames.mon': 'Lun',
    'dayNames.tue': 'Mar',
    'dayNames.wed': 'Mer',
    'dayNames.thu': 'Jeu',
    'dayNames.fri': 'Ven',
    'dayNames.sat': 'Sam',
    'dayNames.sun': 'Dim',

    // Misc
    'common.on': 'Activé',
    'common.off': 'Désactivé',
    'common.weekly': 'Hebdo',
    'language.fr': 'Français',
    'language.en': 'English',
  },

  en: {
    // Navigation & Screens
    'nav.home': 'Home',
    'nav.plans': 'Plans',
    'nav.training': 'Training',
    'nav.stats': 'Stats',
    'nav.profile': 'Profile',
    'screen.achievements': 'Achievements & Badges',
    'screen.leaderboard': 'Leaderboard',
    'screen.aiCoach': 'AI Coach',
    'screen.reactionTrainer': 'Reaction Trainer',
    'screen.scouting': 'Scouting',
    'screen.settings': 'Settings',
    'screen.records': 'Records',

    // Common actions
    'action.signIn': 'Sign In',
    'action.signUp': 'Sign Up',
    'action.logIn': 'Log In',
    'action.createAccount': 'Create Account',
    'action.save': 'Save',
    'action.cancel': 'Cancel',
    'action.delete': 'Delete',
    'action.confirm': 'Confirm',
    'action.back': 'Back',
    'action.loadMore': 'Load More',
    'action.retry': 'Retry',
    'action.start': 'Start',
    'action.pause': 'Pause',
    'action.finish': 'Finish',
    'action.nextExercise': 'Next Exercise',

    // Stats
    'stats.totalSessions': 'Total Sessions',
    'stats.repetitions': 'Repetitions',
    'stats.averageScore': 'Average Score',
    'stats.sessionsPerWeek': 'Sessions / Week',
    'stats.weeklyActivity': 'Weekly Activity',
    'stats.categoryPerformance': 'Category Performance',
    'stats.recentSessions': 'Recent Sessions',
    'stats.streakDays': 'Streak (days)',
    'stats.weekGoalLabel': 'Weekly Goal',

    // Workout
    'workout.score': 'Score',
    'workout.rep': 'Rep',
    'workout.time': 'Time',
    'workout.sessionSummary': 'Session Summary',

    // Empty states
    'empty.noData': 'No data',
    'empty.startFirstWorkout': 'Start your first workout',
    'empty.noDataAvailable': 'No data available',
    'empty.readyToStart': 'Ready to start?',
    'empty.startFirstDesc': 'Start your first workout and the AI will recommend the best exercises for you.',
    'empty.startTraining': 'Start Training',
    'empty.noRecentActivity': 'No recent activity',
    'empty.noRecentDesc': 'Your sessions will appear here once you start training.',

    // Settings labels
    'settings.weeklySessionGoal': 'Weekly session goal',
    'settings.weeklyRepGoal': 'Weekly repetition goal',
    'settings.preferredRest': 'Preferred rest time',
    'settings.sound': 'Sound',
    'settings.haptics': 'Haptics',
    'settings.language': 'Language',
    'settings.notifications': 'Notifications',
    'settings.training': 'Training',
    'settings.general': 'General',
    'settings.account': 'Account',

    // Home screen
    'home.recommendationsAI': 'AI Recommendations',
    'home.recentActivity': 'Recent Activity',
    'home.leaderboard': 'Leaderboard',
    'home.leaderboardDesc': 'Compare your level with other players',
    'home.cognitiveTraining': 'Cognitive Training',
    'home.cognitiveTrainingDesc': 'Test your basketball reflexes',
    'home.exercises': 'exercise',
    'home.reps': 'reps',
    'home.points': 'pts',
    'home.new': 'New',
    'home.bestScore': 'Best score',

    // Difficulty
    'difficulty.beginner': 'Beginner',
    'difficulty.intermediate': 'Intermediate',
    'difficulty.advanced': 'Advanced',

    // Positions
    'position.guard': 'Guard',
    'position.forward': 'Forward',
    'position.center': 'Center',

    // Categories
    'category.pocket_ball': 'Pocket Ball',
    'category.shifty': 'Shiftiness',
    'category.ball_handling': 'Ball Handling',
    'category.speed_change': 'Speed Change',
    'category.defense': 'Defense',
    'category.shooting': 'Shooting',
    'category.footwork': 'Footwork',
    'category.finishing': 'Finishing',
    'category.conditioning': 'Conditioning',
    'category.all': 'All',

    // Grade labels
    'grade.S': 'S',
    'grade.A': 'A',
    'grade.B': 'B',
    'grade.C': 'C',
    'grade.D': 'D',
    'grade.F': 'F',

    // Reaction Trainer
    'reaction.title': 'Cognitive Training',
    'reaction.direction': 'Quick Direction',
    'reaction.color': 'Color & Action',
    'reaction.shotClock': 'Shot Clock',
    'reaction.reflexPure': 'Pure Reflex',
    'reaction.rounds': 'rounds',
    'reaction.reactionTime': 'Reaction time',
    'reaction.correct': 'Correct',
    'reaction.incorrect': 'Incorrect',
    'reaction.startTraining': 'Start',
    'reaction.results': 'Results',
    'reaction.averageTime': 'Average time',
    'reaction.bestTime': 'Best time',
    'reaction.personalBest': 'Personal best',
    'reaction.newRecord': 'New record!',
    'reaction.playAgain': 'Play Again',

    // AI Coach
    'coach.title': 'AI Coach',
    'coach.online': 'Online',
    'coach.offline': 'Offline',
    'coach.personalCoach': 'Your personal coach 🏀',
    'coach.typeMessage': 'Ask the coach...',
    'coach.send': 'Send',
    'coach.suggestedActions': '💡 Quick suggestions',
    'coach.createPlan': 'Create a plan',
    'coach.shootingAdvice': 'Shooting advice',
    'coach.ballHandlingAdvice': 'Improve my dribble',
    'coach.defenseAdvice': 'How to defend?',
    'coach.conditioningAdvice': 'My weak point',

    // Pricing
    'pricing.title': 'Choose your plan',
    'pricing.subtitle': 'Take your game to the next level with professional tools.',
    'pricing.free': 'Free',
    'pricing.freeDesc': 'Discover CourtVision AI',
    'pricing.pro': 'Pro',
    'pricing.proDesc': 'For serious players',
    'pricing.elite': 'Elite',
    'pricing.eliteDesc': 'The ultimate experience',
    'pricing.popular': 'POPULAR',
    'pricing.subscribe': 'Subscribe',
    'pricing.currentPlan': 'This is your current plan',
    'pricing.securePayment': 'Secure payment',
    'pricing.noCommitment': 'No commitment',

    // Workout Summary
    'summary.sessionComplete': 'Session Complete',
    'summary.overallGrade': 'Overall Grade',
    'summary.excellent': 'EXCELLENT',
    'summary.veryGood': 'VERY GOOD',
    'summary.good': 'GOOD',
    'summary.average': 'AVERAGE',
    'summary.belowAverage': 'NEEDS WORK',
    'summary.needsWork': 'POOR',
    'summary.failed': 'FAILED',
    'summary.drillResults': 'Drill Results',
    'summary.totalReps': 'Total Reps',
    'summary.totalTime': 'Total Time',
    'summary.saveAndExit': 'Save & Exit',
    'summary.backToHome': 'Back to Home',

    // Camera Workout
    'camera.aiFormCheck': 'AI Form Check',
    'camera.analyzing': 'Analyzing...',
    'camera.goodPoints': 'Good points',
    'camera.issues': 'Issues',
    'camera.score': 'Score',

    // Common
    'error.loadFailed': 'Loading failed',
    'error.serverError': 'Server error',
    'dayNames.mon': 'Mon',
    'dayNames.tue': 'Tue',
    'dayNames.wed': 'Wed',
    'dayNames.thu': 'Thu',
    'dayNames.fri': 'Fri',
    'dayNames.sat': 'Sat',
    'dayNames.sun': 'Sun',

    // Misc
    'common.on': 'On',
    'common.off': 'Off',
    'common.weekly': 'Weekly',
    'language.fr': 'Français',
    'language.en': 'English',
  },
} as const

// ── Server-side translation function ─────────────────────────────────────────
// Use this in API routes or server components where React context is unavailable.
export function t(key: TranslationKey, lang: AppLanguage = 'fr'): string {
  return translations[lang]?.[key] ?? translations.fr[key] ?? key
}

// ── Helper: get category label from category key ────────────────────────────
// e.g. getCategoryTranslation('shifty', 'en') → 'Shiftiness'
export function getCategoryTranslation(
  category: string,
  lang: AppLanguage = 'fr',
): string {
  const key = `category.${category}` as TranslationKey
  const val = translations[lang]?.[key]
  if (val && val !== key) return val
  // Fallback to French
  const frVal = translations.fr[key]
  if (frVal && frVal !== key) return frVal
  return category
}

// ── Helper: get difficulty label ─────────────────────────────────────────────
export function getDifficultyTranslation(
  difficulty: string,
  lang: AppLanguage = 'fr',
): string {
  const key = `difficulty.${difficulty}` as TranslationKey
  const val = translations[lang]?.[key]
  if (val && val !== key) return val
  return difficulty
}

// ── Helper: get position label ──────────────────────────────────────────────
export function getPositionTranslation(
  position: string,
  lang: AppLanguage = 'fr',
): string {
  const key = `position.${position}` as TranslationKey
  const val = translations[lang]?.[key]
  if (val && val !== key) return val
  return position
}

// ── Detect browser language ─────────────────────────────────────────────────
export function detectBrowserLanguage(): AppLanguage {
  if (typeof navigator === 'undefined') return 'fr'
  const lang = navigator.language?.slice(0, 2).toLowerCase()
  return lang === 'en' ? 'en' : 'fr'
}

// ── Valid languages list ────────────────────────────────────────────────────
export const SUPPORTED_LANGUAGES: { value: AppLanguage; label: string }[] = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
]

// Export raw translations for the provider to consume
export { translations }