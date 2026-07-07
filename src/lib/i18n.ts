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