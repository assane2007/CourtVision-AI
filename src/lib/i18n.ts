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
  | 'action.edit'
  | 'action.launch'
  | 'action.next'
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
  | 'stats.title'
  | 'stats.viewRecords'
  | 'stats.recordsDesc'
  | 'stats.sessionsLabel'
  | 'stats.exercisesLabel'
  | 'stats.repsLabel'
  | 'stats.dateLabel'
  | 'stats.noStatsDesc'
  | 'stats.startTraining'
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
  | 'empty.noAchievements'
  | 'empty.noAchievementsDesc'
  | 'empty.noLeaderboard'
  | 'empty.noRecords'
  | 'empty.noRecordsDesc'
  | 'empty.noMatchingDrills'
  // Common
  | 'common.loadFailed'
  | 'common.retry'
  | 'common.sessions'
  | 'common.exercises'
  | 'common.reps'
  | 'common.player'
  | 'common.players'
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
  | 'settings.weeklyGoals'
  | 'settings.sessionsPerWeek'
  | 'settings.repsPerWeek'
  | 'settings.restDuration'
  | 'settings.preferences'
  | 'settings.streakReminders'
  | 'settings.challengeUpdates'
  | 'settings.achievementsNotif'
  | 'settings.experimentalFeatures'
  | 'settings.experimentalDesc'
  | 'settings.billing'
  | 'settings.currentPlan'
  | 'settings.viewOffers'
  | 'settings.dataPrivacy'
  | 'settings.saved'
  | 'settings.saveError'
  | 'settings.loadError'
  | 'settings.activated'
  | 'settings.disabled'
  | 'settings.developedWith'
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
  // Landing page
  | 'landing.badge'
  | 'landing.heroTitle1'
  | 'landing.heroTitleHighlight'
  | 'landing.heroTitle2'
  | 'landing.heroSubtitle'
  | 'landing.ctaPrimary'
  | 'landing.ctaSecondary'
  | 'landing.featuresTitle1'
  | 'landing.featuresTitleHighlight'
  | 'landing.featuresSubtitle'
  | 'landing.stepsTitle1'
  | 'landing.stepsTitleHighlight'
  | 'landing.stepsSubtitle'
  | 'landing.ctaTitle1'
  | 'landing.ctaTitleHighlight'
  | 'landing.ctaSubtitle'
  | 'landing.copyright'
  | 'landing.privacy'
  | 'landing.contact'
  | 'landing.feature1.title'
  | 'landing.feature1.description'
  | 'landing.feature2.title'
  | 'landing.feature2.description'
  | 'landing.feature3.title'
  | 'landing.feature3.description'
  | 'landing.feature4.title'
  | 'landing.feature4.description'
  | 'landing.feature5.title'
  | 'landing.feature5.description'
  | 'landing.feature6.title'
  | 'landing.feature6.description'
  | 'landing.step1.title'
  | 'landing.step1.description'
  | 'landing.step2.title'
  | 'landing.step2.description'
  | 'landing.step3.title'
  | 'landing.step3.description'
  | 'landing.stat1'
  | 'landing.stat2'
  | 'landing.stat3'
  | 'landing.stat4'
  // Difficulty
  | 'difficulty.beginner'
  | 'difficulty.intermediate'
  | 'difficulty.advanced'
  | 'difficulty.elite'
  // Positions
  | 'position.guard'
  | 'position.forward'
  | 'position.center'
  | 'position.all_around'
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
  | 'reaction.directionDesc'
  | 'reaction.colorDesc'
  | 'reaction.shotClockDesc'
  | 'reaction.reflexDesc'
  | 'reaction.ratingLightning'
  | 'reaction.ratingFast'
  | 'reaction.ratingAverage'
  | 'reaction.ratingSlow'
  | 'reaction.history'
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
  | 'coach.motivation'
  | 'coach.clearChat'
  | 'coach.clearChatDesc'
  | 'coach.errorGeneric'
  | 'coach.available247'
  | 'coach.welcomeMessage'
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
  | 'pricing.perMonth'
  | 'pricing.alreadySubscribed'
  | 'pricing.manageSubscription'
  | 'pricing.subscriptionSoon'
  | 'pricing.redirecting'
  | 'pricing.networkError'
  | 'pricing.sessionError'
  | 'pricing.paymentError'
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
  // Achievements
  | 'achievements.progression'
  | 'achievements.allUnlocked'
  | 'achievements.remaining'
  | 'achievements.newUnlocks'
  | 'achievements.newUnlocksDesc'
  | 'achievements.locked'
  // Train Hub
  | 'train.title'
  | 'train.subtitle'
  | 'train.createExercise'
  | 'train.createDesc'
  | 'train.drillName'
  | 'train.category'
  | 'train.difficulty'
  | 'train.description'
  | 'train.instructions'
  | 'train.choose'
  | 'train.drillNamePlaceholder'
  | 'train.descriptionPlaceholder'
  | 'train.searchPlaceholder'
  | 'train.favorites'
  | 'train.allDrills'
  // Plans
  | 'plans.myPlans'
  | 'plans.noPlans'
  | 'plans.noPlansDesc'
  | 'plans.createPlan'
  | 'plans.launch'
  | 'plans.editPlan'
  | 'plans.deletePlan'
  | 'plans.deleteTitle'
  | 'plans.deleteDesc'
  | 'plans.planDeleted'
  | 'plans.planDeletedDesc'
  | 'plans.emptyPlan'
  | 'plans.emptyPlanDesc'
  | 'plans.exercises'
  | 'plans.deleting'
  | 'plans.error'
  // Leaderboard
  | 'leaderboard.global'
  | 'leaderboard.thisMonth'
  | 'leaderboard.thisWeek'
  | 'leaderboard.you'
  | 'leaderboard.yourPosition'
  | 'leaderboard.keepTraining'
  | 'leaderboard.noRanking'
  | 'leaderboard.level'
  | 'leaderboard.periodLabel'
  // Profile
  | 'profile.edit'
  | 'profile.profileUpdated'
  | 'profile.profileUpdatedDesc'
  | 'profile.updateError'
  | 'profile.playerDNA'
  | 'profile.scoutingReport'
  | 'profile.levelMax'
  | 'profile.levelMaxReached'
  | 'profile.xpRemaining'
  | 'profile.totalXp'
  | 'profile.goal'
  | 'profile.memberSince'
  | 'profile.editProfile'
  | 'profile.fullName'
  | 'profile.position'
  | 'profile.level'
  | 'profile.trainingGoal'
  | 'profile.choosePosition'
  | 'profile.chooseLevel'
  | 'profile.chooseGoal'
  | 'profile.xpHistory'
  | 'profile.accountSection'
  | 'profile.signOut'
  | 'profile.deleteAccount'
  | 'profile.deleteTitle'
  | 'profile.deleteDesc'
  | 'profile.accountDeleted'
  | 'profile.accountDeletedDesc'
  | 'profile.positionGuard'
  | 'profile.positionForward'
  | 'profile.positionCenter'
  | 'profile.positionAllAround'
  | 'profile.levelBeginner'
  | 'profile.levelIntermediate'
  | 'profile.levelAdvanced'
  | 'profile.levelElite'
  | 'profile.goalShooting'
  | 'profile.goalBallHandling'
  | 'profile.goalDefense'
  | 'profile.goalConditioning'
  | 'profile.goalGeneral'
  // Records
  | 'records.noRecords'
  | 'records.noRecordsDesc'
  | 'records.searchPlaceholder'
  | 'records.drillsTried'
  | 'records.avgRecords'
  | 'records.mostImproved'
  | 'records.trainingTime'
  | 'records.newRecord'
  | 'records.maxReps'
  | 'records.avgTime'
  | 'records.lastTime'
  | 'records.improvement'
  | 'records.decline'
  | 'records.noSearchResults'
  | 'records.noCategoryRecords'
  | 'records.startTraining'
  // Onboarding
  | 'onboarding.step'
  | 'onboarding.stepOf'
  | 'onboarding.positionQuestion'
  | 'onboarding.positionDesc'
  | 'onboarding.levelQuestion'
  | 'onboarding.levelDesc'
  | 'onboarding.goalQuestion'
  | 'onboarding.goalDesc'
  | 'onboarding.next'
  | 'onboarding.saveError'
  | 'onboarding.posGuardDesc'
  | 'onboarding.posForwardDesc'
  | 'onboarding.posCenterDesc'
  | 'onboarding.posAllAroundDesc'
  | 'onboarding.lvlBeginnerDesc'
  | 'onboarding.lvlIntermediateDesc'
  | 'onboarding.lvlAdvancedDesc'
  | 'onboarding.lvlEliteDesc'
  | 'onboarding.goalShootingDesc'
  | 'onboarding.goalBallHandlingDesc'
  | 'onboarding.goalDefenseDesc'
  | 'onboarding.goalConditioningDesc'
  | 'onboarding.goalGeneralDesc'
  | 'onboarding.posAllAround'
  | 'onboarding.lvlElite'
  | 'onboarding.goalConditioning'
  | 'onboarding.goalGeneral'
  // Drill Detail
  | 'drill.errorLoading'
  | 'drill.notFound'
  | 'drill.addFavorite'
  | 'drill.removeFavorite'
  | 'drill.addedFavorite'
  | 'drill.removedFavorite'
  | 'drill.favoriteDrill'
  | 'drill.favoriteError'
  | 'drill.duration'
  | 'drill.repetitions'
  | 'drill.level'
  | 'drill.instructions'
  | 'drill.startWithCamera'
  // Scouting
  | 'scouting.estimated'
  // Auth
  | 'auth.subtitle'
  | 'auth.password'
  | 'auth.showPassword'
  | 'auth.hidePassword'
  | 'auth.forgotPassword'
  | 'auth.loginError'
  | 'auth.networkError'
  | 'auth.signupCreatedError'
  | 'auth.genericError'
  | 'auth.passwordMinLength'
  | 'auth.passwordMismatch'
  | 'auth.tokenCopied'
  // Errors
  | 'error.loadFailed'
  | 'error.serverError'
  // Day names
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
  // Auth - extended
  | 'auth.fullName'
  | 'auth.email'
  | 'auth.emailPlaceholder'
  | 'auth.loginLoading'
  | 'auth.signupLoading'
  | 'auth.passwordPlaceholder'
  | 'auth.signupPasswordPlaceholder'
  | 'auth.termsText'
  | 'auth.resetTitle'
  | 'auth.resetDesc'
  | 'auth.sendToken'
  | 'auth.resetTokenTitle'
  | 'auth.resetTokenDesc'
  | 'auth.resetTokenLabel'
  | 'auth.hideToken'
  | 'auth.showToken'
  | 'auth.copyToken'
  | 'auth.newPassword'
  | 'auth.confirmPassword'
  | 'auth.confirmPlaceholder'
  | 'auth.minCharsPlaceholder'
  | 'auth.resetButton'
  | 'auth.resetSuccess'
  | 'auth.resetSuccessDesc'
  | 'auth.backToLogin'
  // Home - extended
  | 'home.today'
  | 'home.noSessionsWeek'
  | 'home.viewProfile'
  | 'home.calendarSection'
  | 'home.weeklyChallengeSection'
  // Train Hub - extended
  | 'train.filterFavorites'
  | 'train.resetFilters'
  | 'train.filterByDifficulty'
  | 'train.addFavorite'
  | 'train.removeFavorite'
  // Profile - extended
  | 'profile.namePlaceholder'
  // Settings - extended
  | 'settings.selectPlaceholder'
  | 'settings.exportSuccess'
  | 'settings.exportError'
  | 'settings.exportNetworkError'
  | 'settings.privacyLoadError'
  | 'settings.deleteAccountSuccess'
  | 'settings.deleteAccountError'
  | 'settings.deleteAccountButton'
  | 'settings.deleteConfirm1'
  | 'settings.deleteConfirm2'
  | 'settings.deleteConfirm3'
  | 'settings.deleteFinalButton'
  | 'settings.deleteFinalDesc'
  // Camera Workout - extended
  | 'camera.saveSuccess'
  | 'camera.saveError'
  | 'camera.saveErrorDesc'
  | 'camera.back'
  | 'camera.muteSound'
  | 'camera.unmuteSound'
  | 'camera.cameraStream'
  // Workout Summary - extended
  | 'summary.copySuccess'
  | 'summary.bestExercise'
  | 'summary.estimatedCalories'
  | 'summary.shareTitle'
  // Scouting - extended
  | 'scouting.insufficientData'
  | 'scouting.startTrainingForAnalysis'
  | 'scouting.recommendationMinSessions'
  | 'scouting.goodLevel'
  | 'scouting.maintainTraining'
  | 'scouting.radarLabel'
  | 'scouting.back'
  | 'scouting.improvements'
  | 'scouting.strengths'
  // Onboarding - extended
  | 'onboarding.ariaPosition'
  | 'onboarding.ariaLevel'
  | 'onboarding.ariaGoal'
  // Plans - extended
  | 'plans.launchPlan'
  | 'plans.editPlanAria'
  | 'plans.deletePlanAria'
  | 'plans.createPlanAria'
  | 'plans.repsShort'
  | 'plans.publicBadge'
  // Reaction Trainer - extended
  | 'reaction.directionShort'
  | 'reaction.colorShort'
  | 'reaction.shotClockShort'
  | 'reaction.reflexShort'
  | 'reaction.tap'
  | 'reaction.dontTap'
  // Pricing - extended
  | 'pricing.freeTierName'
  | 'pricing.freeTierDesc'
  | 'pricing.proTierDesc'
  | 'pricing.eliteTierDesc'
  | 'pricing.redirectingToast'
  // Pricing features
  | 'pricing.feature.basicExercises'
  | 'pricing.feature.simpleStats'
  | 'pricing.feature.limitedCoach'
  | 'pricing.feature.fullScouting'
  | 'pricing.feature.reactionTraining'
  | 'pricing.feature.dataExport'
  | 'pricing.feature.unlimitedSessions'
  | 'pricing.feature.allExercises'
  | 'pricing.feature.unlimitedCoach'
  | 'pricing.feature.customPlans'
  | 'pricing.feature.advancedVideo'
  | 'pricing.feature.prioritySupport'
  | 'pricing.feature.eliteBadge'
  | 'pricing.feature.allInPro'
  // Auth - name placeholder
  | 'auth.namePlaceholder'
  // Train Hub - extended
  | 'train.instructionsPlaceholder'
  | 'train.targetReps'
  | 'train.icon'
  // Profile - extended
  | 'profile.viewAll'
  | 'profile.quickSummary'
  | 'profile.noXpYet'
  | 'profile.completeDrillsForXp'
  | 'profile.deleteDataDesc'
  | 'profile.deleteDataItem1'
  | 'profile.deleteDataItem2'
  | 'profile.deleteDataItem3'
  | 'profile.deleteDataItem4'
  | 'profile.deleteDataItem5'
  | 'profile.deleteDataItem6'
  | 'profile.deleteDataItem7'
  | 'profile.deleteAutoLogout'
  // Settings - extended
  | 'settings.exportData'
  | 'settings.exportDataDesc'
  | 'settings.privacyPolicy'
  | 'settings.privacyPolicyDesc'
  // Workout Summary - extended
  | 'summary.scorePerExercise'
  // Camera Workout - extended
  | 'camera.loadingDrill'
  | 'camera.errorTitle'
  | 'camera.loadingModel'
  | 'camera.initCamera'
  // Reaction Trainer - extended
  | 'reaction.round'
  | 'reaction.situation'
  | 'reaction.up'
  | 'reaction.down'
  | 'reaction.left'
  | 'reaction.right'
  | 'reaction.target'
  | 'reaction.accuracy'
  | 'reaction.streak'
  | 'reaction.bestStreak'
  | 'reaction.targetsHit'
  | 'reaction.shotClockInfo'
  // Scouting - extended
  | 'scouting.title'
  | 'scouting.scoreOutOf100'
  | 'scouting.averageLevel'
  | 'scouting.yourScore'
  // Home - extended
  | 'home.loadSessionsError'

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
    'action.edit': 'Modifier',
    'action.launch': 'Lancer',
    'action.next': 'Suivant',

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
    'stats.title': 'Statistiques & Progression',
    'stats.viewRecords': 'Voir mes records personnels',
    'stats.recordsDesc': 'Meilleurs scores, tendances et progrès',
    'stats.sessionsLabel': 'Séances',
    'stats.exercisesLabel': 'Exercices',
    'stats.repsLabel': 'Rép.',
    'stats.dateLabel': 'Date',
    'stats.noStatsDesc': 'Commencez votre premier entraînement pour suivre votre progression et voir vos statistiques.',
    'stats.startTraining': "Commencer l'entraînement",

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
    'empty.startFirstDesc': "Commencez votre premier entraînement et l'IA vous recommandera les meilleurs exercices.",
    'empty.startTraining': "Démarrer l'entraînement",
    'empty.noRecentActivity': 'Aucune activité récente',
    'empty.noRecentDesc': 'Vos séances apparaîtront ici une fois que vous aurez commencé à vous entraîner.',
    'empty.noAchievements': 'Aucun succès débloqué',
    'empty.noAchievementsDesc': 'Commence à t\'entraîner pour débloquer tes premiers succès !',
    'empty.noLeaderboard': 'Aucun joueur sur le classement pour le moment.',
    'empty.noRecords': 'Aucun record personnel',
    'empty.noRecordsDesc': 'Complète des exercices pour établir tes premiers records.',
    'empty.noMatchingDrills': 'Aucun exercice trouvé',

    // Common
    'common.loadFailed': 'Impossible de charger les données',
    'common.retry': 'Réessayer',
    'common.sessions': 'séance',
    'common.exercises': 'exercice',
    'common.reps': 'rép.',
    'common.player': 'joueur',
    'common.players': 'joueurs',

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
    'settings.weeklyGoals': 'Objectifs Hebdomadaires',
    'settings.sessionsPerWeek': 'Séances par semaine',
    'settings.repsPerWeek': 'Répétitions par semaine',
    'settings.restDuration': 'Durée de repos entre les séries',
    'settings.preferences': 'Préférences',
    'settings.streakReminders': 'Rappels de série',
    'settings.challengeUpdates': 'Mises à jour des défis',
    'settings.achievementsNotif': 'Succès',
    'settings.experimentalFeatures': 'Fonctionnalités expérimentales',
    'settings.experimentalDesc': 'Activez ou désactivez les fonctionnalités en cours de développement. Ces paramètres sont sauvegardés localement.',
    'settings.billing': 'Abonnement & Facturation',
    'settings.currentPlan': 'Plan actuel',
    'settings.viewOffers': 'Voir les offres',
    'settings.dataPrivacy': 'Données & Confidentialité',
    'settings.saved': 'Paramètres sauvegardés',
    'settings.saveError': 'Erreur lors de la sauvegarde',
    'settings.loadError': 'Erreur de chargement des paramètres',
    'settings.activated': 'activé',
    'settings.disabled': 'désactivé',
    'settings.developedWith': 'Développé avec ❤️ pour les passionnés de basket',

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

    // Landing page
    'landing.badge': 'Nouveau — Entraînement IA révolutionnaire',
    'landing.heroTitle1': 'Ton Coach',
    'landing.heroTitleHighlight': 'IA de Basketball',
    'landing.heroTitle2': 'Personnel',
    'landing.heroSubtitle': "Analyse ta posture en temps réel, suit tes progrès et reçois des conseils personnalisés — le tout gratuitement depuis ton téléphone.",
    'landing.ctaPrimary': 'Commencer gratuitement',
    'landing.ctaSecondary': 'Voir les fonctionnalités',
    'landing.featuresTitle1': 'Tout ce dont tu as',
    'landing.featuresTitleHighlight': 'besoin',
    'landing.featuresSubtitle': "Une suite complète d'outils pour améliorer ton jeu, guidée par l'intelligence artificielle.",
    'landing.stepsTitle1': 'Comment ça',
    'landing.stepsTitleHighlight': 'marche',
    'landing.stepsSubtitle': 'Trois étapes simples pour commencer à t\'améliorer.',
    'landing.ctaTitle1': 'Prêt à monter',
    'landing.ctaTitleHighlight': 'ton niveau',
    'landing.ctaSubtitle': 'Rejoins des milliers de joueurs qui s\'entraînent plus intelligemment avec CourtVision AI.',
    'landing.copyright': 'Tous droits réservés.',
    'landing.privacy': 'Politique de confidentialité',
    'landing.contact': 'Contact',
    'landing.feature1.title': 'Détection de Posture IA',
    'landing.feature1.description': 'Ta caméra analyse tes mouvements en temps réel grâce à MediaPipe pour corriger ta forme.',
    'landing.feature2.title': 'Coach IA Personnalisé',
    'landing.feature2.description': 'Un assistant intelligent qui adapte les conseils et les exercices à ton niveau.',
    'landing.feature3.title': 'Rapport de Scouting',
    'landing.feature3.description': 'Analyse détaillée de tes performances avec des rapports visuels complets.',
    'landing.feature4.title': 'Entraînement de Réaction',
    'landing.feature4.description': 'Améliore tes temps de réaction avec des exercices stimulants et progressifs.',
    'landing.feature5.title': 'Statistiques Avancées',
    'landing.feature5.description': 'Suivi détaillé de ta progression avec graphiques et métriques claires.',
    'landing.feature6.title': 'Classement & Communauté',
    'landing.feature6.description': 'Compare-toi aux autres joueurs et défie la communauté.',
    'landing.step1.title': 'Enregistre-toi en 30 secondes',
    'landing.step1.description': 'Crée ton compte gratuitement et configure ton profil de joueur.',
    'landing.step2.title': 'Choisis ton entraînement',
    'landing.step2.description': 'Parcours les exercices par catégorie ou suis un plan personnalisé.',
    'landing.step3.title': 'Suit tes progrès en temps réel',
    'landing.step3.description': "L'IA analyse ta forme et te donne des retours instantanés pour t'améliorer.",
    'landing.stat1': 'Exercices',
    'landing.stat2': 'Catégories',
    'landing.stat3': 'Analyse ta forme',
    'landing.stat4': 'Gratuit',

    // Difficulty
    'difficulty.beginner': 'Débutant',
    'difficulty.intermediate': 'Intermédiaire',
    'difficulty.advanced': 'Avancé',
    'difficulty.elite': 'Élite',

    // Positions
    'position.guard': 'Meneur',
    'position.forward': 'Ailier',
    'position.center': 'Pivot',
    'position.all_around': 'Polyvalent',

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
    'reaction.bestTime': "Meilleur temps",
    'reaction.personalBest': 'Record personnel',
    'reaction.newRecord': 'Nouveau record !',
    'reaction.playAgain': 'Rejouer',
    'reaction.directionDesc': 'Suis la flèche le plus vite possible',
    'reaction.colorDesc': 'Vert = tape, Rouge = arrête !',
    'reaction.shotClockDesc': 'Prends la bonne décision sous pression',
    'reaction.reflexDesc': "Attrape les cibles avant qu'elles disparaissent",
    'reaction.ratingLightning': 'Éclair',
    'reaction.ratingFast': 'Rapide',
    'reaction.ratingAverage': 'Moyen',
    'reaction.ratingSlow': 'Lent',
    'reaction.history': 'Historique',

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
    'coach.motivation': 'Motivation',
    'coach.clearChat': 'Effacer la conversation?',
    'coach.clearChatDesc': 'Toutes tes messages seront supprimés. Cette action est irréversible.',
    'coach.errorGeneric': "Oups, une erreur est survenue 😕 Réessaie dans un instant.",
    'coach.available247': "Disponible 24h/24 pour t'aider à progresser sur le terrain.",
    'coach.welcomeMessage': "Salut {name} ! 👋 Je suis ton coach IA. Je connais tes stats et je peux t'aider à t'améliorer. Pose-moi n'importe quelle question sur le basket!",

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
    'pricing.perMonth': '/mois',
    'pricing.alreadySubscribed': 'Déjà abonné ?',
    'pricing.manageSubscription': 'Annuler ou gérer mon abonnement',
    'pricing.subscriptionSoon': "La gestion de l'abonnement sera bientôt disponible.",
    'pricing.redirecting': 'Redirection vers le paiement {plan}…',
    'pricing.networkError': 'Erreur réseau',
    'pricing.sessionError': 'Erreur lors de la création de la session',
    'pricing.paymentError': 'Erreur lors du paiement',

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

    // Achievements
    'achievements.progression': 'Progression',
    'achievements.allUnlocked': '🎉 Tous les succès déverrouillés !',
    'achievements.remaining': '{count} succès restants',
    'achievements.newUnlocks': 'Nouveau(x) succès !',
    'achievements.newUnlocksDesc': '{count} succès viennent d\'être déverrouillés',
    'achievements.locked': 'Verrouillé',

    // Train Hub
    'train.title': "Centre d'Entraînement",
    'train.subtitle': 'Explorez et maîtrisez chaque exercice',
    'train.createExercise': 'Créer un exercice',
    'train.createDesc': "Ajoutez un exercice personnalisé à votre bibliothèque d'entraînement.",
    'train.drillName': "Nom de l'exercice *",
    'train.category': 'Catégorie *',
    'train.difficulty': 'Difficulté *',
    'train.description': 'Description',
    'train.instructions': 'Instructions',
    'train.choose': 'Choisir...',
    'train.drillNamePlaceholder': 'Ex: Crossover latéral rapide',
    'train.descriptionPlaceholder': "Brève description de l'exercice",
    'train.searchPlaceholder': 'Rechercher un exercice...',
    'train.favorites': 'Favoris',
    'train.allDrills': 'Tous les exercices',

    // Plans
    'plans.myPlans': 'Mes Plans',
    'plans.noPlans': 'Aucun plan',
    'plans.noPlansDesc': "Créez votre premier plan d'entraînement pour combiner plusieurs exercices en une seule session.",
    'plans.createPlan': 'Créer un plan',
    'plans.launch': 'Lancer',
    'plans.editPlan': 'Modifier le plan',
    'plans.deletePlan': 'Supprimer le plan',
    'plans.deleteTitle': 'Supprimer ce plan ?',
    'plans.deleteDesc': 'Le plan "{name}" sera définitivement supprimé. Cette action est irréversible.',
    'plans.planDeleted': 'Plan supprimé',
    'plans.planDeletedDesc': 'Le plan a été supprimé avec succès.',
    'plans.emptyPlan': 'Plan vide',
    'plans.emptyPlanDesc': 'Ce plan ne contient aucun exercice.',
    'plans.exercises': 'exercice',
    'plans.deleting': 'Suppression...',
    'plans.error': 'Erreur',

    // Leaderboard
    'leaderboard.global': 'Global',
    'leaderboard.thisMonth': 'Ce mois',
    'leaderboard.thisWeek': 'Cette semaine',
    'leaderboard.you': 'VOUS',
    'leaderboard.yourPosition': 'Votre position',
    'leaderboard.keepTraining': 'Continuez à vous entraîner pour monter !',
    'leaderboard.noRanking': 'Aucun classement disponible pour cette période',
    'leaderboard.level': 'Niv.',
    'leaderboard.periodLabel': 'Période du classement',

    // Profile
    'profile.edit': 'Modifier',
    'profile.profileUpdated': 'Profil mis à jour',
    'profile.profileUpdatedDesc': 'Vos informations ont été enregistrées.',
    'profile.updateError': 'Impossible de mettre à jour le profil.',
    'profile.playerDNA': 'Mon ADN de Joueur',
    'profile.scoutingReport': 'Rapport de scout IA',
    'profile.levelMax': 'NIVEAU MAX',
    'profile.levelMaxReached': 'NIVEAU MAX ATTEINT',
    'profile.xpRemaining': '{xp} XP restant avant le niveau {level}',
    'profile.totalXp': 'Total : {xp} XP',
    'profile.goal': 'Objectif :',
    'profile.memberSince': 'Membre depuis',
    'profile.editProfile': 'Modifier le Profil',
    'profile.fullName': 'Nom complet',
    'profile.position': 'Position',
    'profile.level': 'Niveau',
    'profile.trainingGoal': "Objectif d'entraînement",
    'profile.choosePosition': 'Choisir une position',
    'profile.chooseLevel': 'Choisir un niveau',
    'profile.chooseGoal': 'Choisir un objectif',
    'profile.xpHistory': 'Historique XP',
    'profile.accountSection': 'Compte',
    'profile.signOut': 'Se déconnecter',
    'profile.deleteAccount': 'Supprimer le compte',
    'profile.deleteTitle': 'Supprimer le compte ?',
    'profile.deleteDesc': 'Toutes vos données seront supprimées de façon permanente. Cette action est irréversible.',
    'profile.accountDeleted': 'Compte supprimé',
    'profile.accountDeletedDesc': 'Toutes vos données ont été supprimées.',
    'profile.positionGuard': 'Meneur / Arrière',
    'profile.positionForward': 'Ailier',
    'profile.positionCenter': 'Pivot',
    'profile.positionAllAround': 'Polyvalent',
    'profile.levelBeginner': 'Débutant',
    'profile.levelIntermediate': 'Intermédiaire',
    'profile.levelAdvanced': 'Avancé',
    'profile.levelElite': 'Élite',
    'profile.goalShooting': 'Tir',
    'profile.goalBallHandling': 'Maniement de Balle',
    'profile.goalDefense': 'Défense',
    'profile.goalConditioning': 'Condition Physique',
    'profile.goalGeneral': 'Général',

    // Records
    'records.noRecords': 'Aucun record',
    'records.noRecordsDesc': 'Commencez votre premier entraînement pour voir vos records !',
    'records.searchPlaceholder': 'Rechercher un exercice...',
    'records.drillsTried': 'Exercices tentés',
    'records.avgRecords': 'Moy. des records',
    'records.mostImproved': 'Plus grand progrès',
    'records.trainingTime': "Temps d'entraînement",
    'records.newRecord': '👑 Nouveau record !',
    'records.maxReps': 'Max {reps} rép.',
    'records.avgTime': 'Moy. {time}',
    'records.lastTime': 'Dernière fois :',
    'records.improvement': 'Amélioration',
    'records.decline': 'Baisse',
    'records.noSearchResults': 'Aucun exercice trouvé pour cette recherche.',
    'records.noCategoryRecords': 'Aucun record dans cette catégorie.',
    'records.startTraining': "Commencer l'entraînement",

    // Onboarding
    'onboarding.step': 'Étape',
    'onboarding.stepOf': 'Étape {current} sur 3',
    'onboarding.positionQuestion': 'Quel est ton poste ?',
    'onboarding.positionDesc': 'Sélectionne le poste qui correspond le mieux à ton style de jeu',
    'onboarding.levelQuestion': 'Quel est ton niveau ?',
    'onboarding.levelDesc': "Sois honnête pour qu'on puisse adapter ton programme",
    'onboarding.goalQuestion': 'Quel est ton objectif principal ?',
    'onboarding.goalDesc': 'Choisis la compétence sur laquelle tu veux progresser',
    'onboarding.next': 'Suivant',
    'onboarding.saveError': 'Erreur de sauvegarde. Vos préférences seront sauvegardées plus tard.',
    'onboarding.posGuardDesc': 'Meneur de jeu, passes et vision du terrain',
    'onboarding.posForwardDesc': "Polyvalent, scoring et création depuis l'aile",
    'onboarding.posCenterDesc': 'Poste bas, rebonds et protection du cercle',
    'onboarding.posAllAroundDesc': 'Capable de jouer à tous les postes',
    'onboarding.lvlBeginnerDesc': 'Je découvre le basketball',
    'onboarding.lvlIntermediateDesc': "J'ai quelques années d'expérience",
    'onboarding.lvlAdvancedDesc': 'Compétitif avec de solides fondamentaux',
    'onboarding.lvlEliteDesc': 'Niveau académique ou professionnel',
    'onboarding.goalShootingDesc': 'Précision et routine de tir',
    'onboarding.goalBallHandlingDesc': 'Contrôle de balle et déplacements',
    'onboarding.goalDefenseDesc': 'Placement, anticipation et intensité',
    'onboarding.goalConditioningDesc': 'Endurance, explosivité et agilité',
    'onboarding.goalGeneralDesc': 'Développement complet de toutes les compétences',
    'onboarding.posAllAround': 'Polyvalent',
    'onboarding.lvlElite': 'Élite',
    'onboarding.goalConditioning': 'Condition Physique',
    'onboarding.goalGeneral': 'Global',

    // Drill Detail
    'drill.errorLoading': "Erreur lors du chargement de l'exercice",
    'drill.notFound': 'Exercice introuvable',
    'drill.addFavorite': 'Ajouter aux favoris',
    'drill.removeFavorite': 'Retirer des favoris',
    'drill.addedFavorite': 'Ajouté aux favoris',
    'drill.removedFavorite': 'Retiré des favoris',
    'drill.favoriteDrill': 'Exercice favori',
    'drill.favoriteError': 'Impossible de modifier le favori',
    'drill.duration': 'Durée',
    'drill.repetitions': 'Répétitions',
    'drill.level': 'Niveau',
    'drill.instructions': 'Instructions',
    'drill.startWithCamera': 'Démarrer avec Caméra',

    // Scouting
    'scouting.estimated': '(estimé)',

    // Auth
    'auth.subtitle': 'Entraînement Basketball Intelligent',
    'auth.password': 'Mot de passe',
    'auth.showPassword': 'Afficher le mot de passe',
    'auth.hidePassword': 'Masquer le mot de passe',
    'auth.forgotPassword': 'Mot de passe oublié ?',
    'auth.loginError': 'Email ou mot de passe incorrect.',
    'auth.networkError': 'Une erreur réseau est survenue. Veuillez réessayer.',
    'auth.signupCreatedError': 'Compte créé mais la connexion a échoué. Veuillez vous connecter manuellement.',
    'auth.genericError': 'Une erreur est survenue.',
    'auth.passwordMinLength': 'Le mot de passe doit contenir au moins 8 caractères.',
    'auth.passwordMismatch': 'Les mots de passe ne correspondent pas.',
    'auth.tokenCopied': 'Token copié !',

    // Errors
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

    // Auth - extended
    'auth.fullName': 'Nom complet',
    'auth.email': 'Email',
    'auth.emailPlaceholder': 'vous@exemple.com',
    'auth.loginLoading': 'Connexion en cours…',
    'auth.signupLoading': 'Création du compte…',
    'auth.passwordPlaceholder': 'Votre mot de passe',
    'auth.signupPasswordPlaceholder': 'Choisir un mot de passe',
    'auth.termsText': "En continuant, vous acceptez nos conditions d\u2019utilisation et notre politique de confidentialité.",
    'auth.resetTitle': 'Réinitialiser le mot de passe',
    'auth.resetDesc': 'Entre ton email pour recevoir un token de réinitialisation.',
    'auth.sendToken': 'Envoyer le token',
    'auth.resetTokenTitle': 'Token de réinitialisation',
    'auth.resetTokenDesc': 'En production, ce token serait envoyé par email.',
    'auth.resetTokenLabel': 'Token de réinitialisation',
    'auth.hideToken': 'Masquer le token',
    'auth.showToken': 'Afficher le token',
    'auth.copyToken': 'Copier le token',
    'auth.newPassword': 'Nouveau mot de passe',
    'auth.confirmPassword': 'Confirmer le mot de passe',
    'auth.confirmPlaceholder': 'Confirmer',
    'auth.minCharsPlaceholder': 'Min. 8 caractères',
    'auth.resetButton': 'Réinitialiser',
    'auth.resetSuccess': 'Mot de passe mis à jour !',
    'auth.resetSuccessDesc': 'Tu peux maintenant te connecter avec ton nouveau mot de passe.',
    'auth.backToLogin': 'Retour à la connexion',

    // Home - extended
    'home.today': "Aujourd\u2019hui",
    'home.noSessionsWeek': 'Aucune séance cette semaine — commencez maintenant !',
    'home.viewProfile': 'Voir le profil',
    'home.calendarSection': 'Calendrier',
    'home.weeklyChallengeSection': 'Défi de la semaine',

    // Train Hub - extended
    'train.filterFavorites': 'Filtrer les favoris',
    'train.resetFilters': 'Réinitialiser les filtres',
    'train.filterByDifficulty': 'Filtrer par difficulté',
    'train.addFavorite': 'Ajouter aux favoris',
    'train.removeFavorite': 'Retirer des favoris',

    // Profile - extended
    'profile.namePlaceholder': 'Votre nom',

    // Settings - extended
    'settings.selectPlaceholder': 'Sélectionner…',
    'settings.exportSuccess': 'Données exportées avec succès',
    'settings.exportError': "Erreur lors de l\u2019export",
    'settings.exportNetworkError': 'Erreur réseau',
    'settings.privacyLoadError': 'Impossible de charger la politique de confidentialité',
    'settings.deleteAccountSuccess': 'Compte supprimé. Vous allez être déconnecté.',
    'settings.deleteAccountError': "Erreur lors de la suppression",
    'settings.deleteAccountButton': 'Supprimer mon compte',
    'settings.deleteConfirm1': 'Cette action est irréversible',
    'settings.deleteConfirm2': 'Êtes-vous sûr ?',
    'settings.deleteConfirm3': 'Toutes vos données seront perdues',
    'settings.deleteFinalButton': 'Confirmer la suppression',
    'settings.deleteFinalDesc': 'Dernière chance — cliquez pour supprimer',

    // Camera Workout - extended
    'camera.saveSuccess': 'Session sauvegardée ! 🎉',
    'camera.saveError': 'Erreur de sauvegarde',
    'camera.saveErrorDesc': 'Impossible de sauvegarder la session',
    'camera.back': 'Retour',
    'camera.muteSound': 'Couper le son',
    'camera.unmuteSound': 'Activer le son',
    'camera.cameraStream': 'Flux de la caméra',

    // Workout Summary - extended
    'summary.copySuccess': 'Copié dans le presse-papiers !',
    'summary.bestExercise': 'Meilleur exercice',
    'summary.estimatedCalories': 'Calories estimées',
    'summary.shareTitle': "CourtVision AI — Résultat d\u2019entraînement",

    // Scouting - extended
    'scouting.insufficientData': 'Aucune donnée suffisante pour évaluer les points forts.',
    'scouting.startTrainingForAnalysis': 'Commencez vos premiers entraînements pour recevoir une analyse complète.',
    'scouting.recommendationMinSessions': "Recommandé : complétez au moins 3 sessions d\u2019entraînement dans différentes catégories pour activer votre premier rapport de scout IA complet.",
    'scouting.goodLevel': 'Toutes les catégories montrent un bon niveau.',
    'scouting.maintainTraining': "Maintenez votre régime d\u2019entraînement actuel et poussez vers des drills de difficulté supérieure pour continuer à progresser.",
    'scouting.radarLabel': 'Graphique radar ADN Basketteur',
    'scouting.back': 'Retour',
    'scouting.improvements': "Axes d\u2019Amélioration",
    'scouting.strengths': 'Points Forts',

    // Onboarding - extended
    'onboarding.ariaPosition': 'Poste',
    'onboarding.ariaLevel': 'Niveau',
    'onboarding.ariaGoal': 'Objectif principal',

    // Plans - extended
    'plans.launchPlan': 'Lancer',
    'plans.editPlanAria': 'Modifier le plan',
    'plans.deletePlanAria': 'Supprimer le plan',
    'plans.createPlanAria': 'Créer un plan',
    'plans.repsShort': 'rép.',
    'plans.publicBadge': 'Public',

    // Reaction Trainer - extended
    'reaction.directionShort': 'Direction',
    'reaction.colorShort': 'Couleur',
    'reaction.shotClockShort': 'Shot Clock',
    'reaction.reflexShort': 'Reflexe',
    'reaction.tap': 'Tape !',
    'reaction.dontTap': "N\u2019APPUIE PAS !",

    // Pricing - extended
    'pricing.freeTierName': 'Gratuit',
    'pricing.freeTierDesc': 'Pour découvrir CourtVision AI',
    'pricing.proTierDesc': 'Pour les joueurs sérieux',
    'pricing.eliteTierDesc': "L\u2019expérience ultime",
    'pricing.redirectingToast': 'Redirection vers le paiement {plan}…',
  // Pricing features
  'pricing.feature.basicExercises': 'Exercices de base',
  'pricing.feature.simpleStats': 'Statistiques simples',
  'pricing.feature.limitedCoach': 'Coach IA (limité)',
  'pricing.feature.fullScouting': 'Scouting complet',
  'pricing.feature.reactionTraining': 'Entraînement de réaction',
  'pricing.feature.dataExport': 'Export de données',
  'pricing.feature.unlimitedSessions': 'Séances illimitées',
  'pricing.feature.allExercises': 'Tous les exercices',
  'pricing.feature.unlimitedCoach': 'Coach IA illimité',
  'pricing.feature.customPlans': 'Plans personnalisés IA',
  'pricing.feature.advancedVideo': 'Analyse vidéo avancée',
  'pricing.feature.prioritySupport': 'Support prioritaire',
  'pricing.feature.eliteBadge': 'Badge "Élite" sur le classement',
  'pricing.feature.allInPro': 'Tout dans Pro',

  // Auth - name placeholder
  'auth.namePlaceholder': 'Jean Dupont',
  // Train Hub - extended
  'train.instructionsPlaceholder': "Étape par étape, décrivez comment réaliser l'exercice...",
  'train.targetReps': 'Répétitions cible',
  'train.icon': 'Icône (emoji)',
  // Profile - extended
  'profile.viewAll': 'Voir tout',
  'profile.quickSummary': 'Résumé Rapide',
  'profile.noXpYet': "Aucun gain d'XP pour le moment",
  'profile.completeDrillsForXp': "Complétez des exercices pour gagner de l'XP !",
  'profile.deleteDataDesc': "Cette action est irréversible. Toutes vos données seront définitivement supprimées conformément au RGPD (Article 17) :",
  'profile.deleteDataItem1': 'Profil et préférences',
  'profile.deleteDataItem2': 'Historique complet des séances',
  'profile.deleteDataItem3': 'Messages du coach IA',
  'profile.deleteDataItem4': 'Exercices personnalisés',
  'profile.deleteDataItem5': "Plans d'entraînement",
  'profile.deleteDataItem6': 'Succès et progression XP',
  'profile.deleteDataItem7': 'Scores de réaction',
  'profile.deleteAutoLogout': 'Vous serez automatiquement déconnecté après la suppression.',
  // Settings - extended
  'settings.exportData': 'Exporter mes données (RGPD)',
  'settings.exportDataDesc': 'Télécharger toutes vos données au format JSON',
  'settings.privacyPolicy': 'Politique de confidentialité',
  'settings.privacyPolicyDesc': 'Consultez notre politique RGPD',
  // Workout Summary - extended
  'summary.scorePerExercise': 'Score par exercice',
  // Camera Workout - extended
  'camera.loadingDrill': "Chargement de l'exercice...",
  'camera.errorTitle': 'Erreur',
  'camera.loadingModel': 'Modèle IA en cours...',
  'camera.initCamera': 'Initialisation de la caméra...',
  // Reaction Trainer - extended
  'reaction.round': 'Round {current}/{total}',
  'reaction.situation': 'Situation {current}/{total}',
  'reaction.up': 'Haut',
  'reaction.down': 'Bas',
  'reaction.left': 'Gauche',
  'reaction.right': 'Droite',
  'reaction.target': 'Cible',
  'reaction.accuracy': 'Précision',
  'reaction.streak': 'Série',
  'reaction.bestStreak': 'Meilleure série',
  'reaction.targetsHit': 'Cibles touchées',
  'reaction.shotClockInfo': '8 situations — Décide en 3 secondes',
  // Scouting - extended
  'scouting.title': 'Rapport de Scout IA',
  'scouting.scoreOutOf100': 'Score global / 100',
  'scouting.averageLevel': 'Moyenne niveau',
  'scouting.yourScore': 'Votre score',
  // Home - extended
  'home.loadSessionsError': 'Impossible de charger les sessions',
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
    'action.edit': 'Edit',
    'action.launch': 'Start',
    'action.next': 'Next',

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
    'stats.title': 'Statistics & Progression',
    'stats.viewRecords': 'View my personal records',
    'stats.recordsDesc': 'Best scores, trends and progress',
    'stats.sessionsLabel': 'Sessions',
    'stats.exercisesLabel': 'Exercises',
    'stats.repsLabel': 'Reps',
    'stats.dateLabel': 'Date',
    'stats.noStatsDesc': 'Start your first workout to track your progress and see your statistics.',
    'stats.startTraining': 'Start Training',

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
    'empty.noAchievements': 'No achievements unlocked',
    'empty.noAchievementsDesc': 'Start training to unlock your first achievements!',
    'empty.noLeaderboard': 'No players on the leaderboard yet.',
    'empty.noRecords': 'No personal records',
    'empty.noRecordsDesc': 'Complete drills to set your first records.',
    'empty.noMatchingDrills': 'No matching drills found',

    // Common
    'common.loadFailed': 'Unable to load data',
    'common.retry': 'Retry',
    'common.sessions': 'session',
    'common.exercises': 'exercise',
    'common.reps': 'rep',
    'common.player': 'player',
    'common.players': 'players',

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
    'settings.weeklyGoals': 'Weekly Goals',
    'settings.sessionsPerWeek': 'Sessions per week',
    'settings.repsPerWeek': 'Reps per week',
    'settings.restDuration': 'Rest duration between sets',
    'settings.preferences': 'Preferences',
    'settings.streakReminders': 'Streak reminders',
    'settings.challengeUpdates': 'Challenge updates',
    'settings.achievementsNotif': 'Achievements',
    'settings.experimentalFeatures': 'Experimental features',
    'settings.experimentalDesc': 'Enable or disable features under development. These settings are saved locally.',
    'settings.billing': 'Subscription & Billing',
    'settings.currentPlan': 'Current plan',
    'settings.viewOffers': 'View plans',
    'settings.dataPrivacy': 'Data & Privacy',
    'settings.saved': 'Settings saved',
    'settings.saveError': 'Error saving settings',
    'settings.loadError': 'Error loading settings',
    'settings.activated': 'enabled',
    'settings.disabled': 'disabled',
    'settings.developedWith': 'Developed with ❤️ for basketball lovers',

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

    // Landing page
    'landing.badge': 'New — Revolutionary AI Training',
    'landing.heroTitle1': 'Your Personal',
    'landing.heroTitleHighlight': 'Basketball AI',
    'landing.heroTitle2': 'Coach',
    'landing.heroSubtitle': 'Analyze your posture in real-time, track your progress, and receive personalized advice — all for free from your phone.',
    'landing.ctaPrimary': 'Start for free',
    'landing.ctaSecondary': 'See features',
    'landing.featuresTitle1': 'Everything you',
    'landing.featuresTitleHighlight': 'need',
    'landing.featuresSubtitle': 'A complete suite of tools to improve your game, guided by artificial intelligence.',
    'landing.stepsTitle1': 'How does it',
    'landing.stepsTitleHighlight': 'work',
    'landing.stepsSubtitle': 'Three simple steps to start improving.',
    'landing.ctaTitle1': 'Ready to level up',
    'landing.ctaTitleHighlight': 'your game',
    'landing.ctaSubtitle': 'Join thousands of players who train smarter with CourtVision AI.',
    'landing.copyright': 'All rights reserved.',
    'landing.privacy': 'Privacy Policy',
    'landing.contact': 'Contact',
    'landing.feature1.title': 'AI Posture Detection',
    'landing.feature1.description': 'Your camera analyzes your movements in real-time using MediaPipe to correct your form.',
    'landing.feature2.title': 'Personalized AI Coach',
    'landing.feature2.description': 'An intelligent assistant that adapts advice and exercises to your level.',
    'landing.feature3.title': 'Scouting Reports',
    'landing.feature3.description': 'Detailed performance analysis with complete visual reports.',
    'landing.feature4.title': 'Reaction Training',
    'landing.feature4.description': 'Improve your reaction times with stimulating and progressive exercises.',
    'landing.feature5.title': 'Advanced Statistics',
    'landing.feature5.description': 'Detailed progress tracking with clear graphs and metrics.',
    'landing.feature6.title': 'Leaderboard & Community',
    'landing.feature6.description': 'Compare yourself with other players and challenge the community.',
    'landing.step1.title': 'Sign up in 30 seconds',
    'landing.step1.description': 'Create your free account and set up your player profile.',
    'landing.step2.title': 'Choose your training',
    'landing.step2.description': 'Browse exercises by category or follow a personalized plan.',
    'landing.step3.title': 'Track your progress in real-time',
    'landing.step3.description': 'AI analyzes your form and gives instant feedback to help you improve.',
    'landing.stat1': 'Exercises',
    'landing.stat2': 'Categories',
    'landing.stat3': 'Analyzes your form',
    'landing.stat4': 'Free',

    // Difficulty
    'difficulty.beginner': 'Beginner',
    'difficulty.intermediate': 'Intermediate',
    'difficulty.advanced': 'Advanced',
    'difficulty.elite': 'Elite',

    // Positions
    'position.guard': 'Guard',
    'position.forward': 'Forward',
    'position.center': 'Center',
    'position.all_around': 'All-Around',

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
    'reaction.directionDesc': 'Follow the arrow as fast as possible',
    'reaction.colorDesc': 'Green = tap, Red = stop!',
    'reaction.shotClockDesc': 'Make the right decision under pressure',
    'reaction.reflexDesc': 'Catch targets before they disappear',
    'reaction.ratingLightning': 'Lightning',
    'reaction.ratingFast': 'Fast',
    'reaction.ratingAverage': 'Average',
    'reaction.ratingSlow': 'Slow',
    'reaction.history': 'History',

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
    'coach.motivation': 'Motivation',
    'coach.clearChat': 'Clear conversation?',
    'coach.clearChatDesc': 'All your messages will be deleted. This action is irreversible.',
    'coach.errorGeneric': 'Oops, an error occurred 😕 Try again in a moment.',
    'coach.available247': 'Available 24/7 to help you improve on the court.',
    'coach.welcomeMessage': "Hey {name}! 👋 I'm your AI coach. I know your stats and I can help you improve. Ask me anything about basketball!",

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
    'pricing.perMonth': '/month',
    'pricing.alreadySubscribed': 'Already subscribed?',
    'pricing.manageSubscription': 'Cancel or manage subscription',
    'pricing.subscriptionSoon': 'Subscription management will be available soon.',
    'pricing.redirecting': 'Redirecting to {plan} payment…',
    'pricing.networkError': 'Network error',
    'pricing.sessionError': 'Error creating checkout session',
    'pricing.paymentError': 'Payment error',

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

    // Achievements
    'achievements.progression': 'Progress',
    'achievements.allUnlocked': '🎉 All achievements unlocked!',
    'achievements.remaining': '{count} achievements remaining',
    'achievements.newUnlocks': 'New achievement(s)!',
    'achievements.newUnlocksDesc': '{count} achievement(s) just unlocked',
    'achievements.locked': 'Locked',

    // Train Hub
    'train.title': 'Training Center',
    'train.subtitle': 'Explore and master every exercise',
    'train.createExercise': 'Create exercise',
    'train.createDesc': 'Add a custom exercise to your training library.',
    'train.drillName': 'Exercise name *',
    'train.category': 'Category *',
    'train.difficulty': 'Difficulty *',
    'train.description': 'Description',
    'train.instructions': 'Instructions',
    'train.choose': 'Choose...',
    'train.drillNamePlaceholder': 'Ex: Quick lateral crossover',
    'train.descriptionPlaceholder': 'Brief exercise description',
    'train.searchPlaceholder': 'Search for an exercise...',
    'train.favorites': 'Favorites',
    'train.allDrills': 'All exercises',

    // Plans
    'plans.myPlans': 'My Plans',
    'plans.noPlans': 'No plans',
    'plans.noPlansDesc': 'Create your first training plan to combine multiple exercises into a single session.',
    'plans.createPlan': 'Create plan',
    'plans.launch': 'Start',
    'plans.editPlan': 'Edit plan',
    'plans.deletePlan': 'Delete plan',
    'plans.deleteTitle': 'Delete this plan?',
    'plans.deleteDesc': 'The plan "{name}" will be permanently deleted. This action is irreversible.',
    'plans.planDeleted': 'Plan deleted',
    'plans.planDeletedDesc': 'The plan has been successfully deleted.',
    'plans.emptyPlan': 'Empty plan',
    'plans.emptyPlanDesc': 'This plan contains no exercises.',
    'plans.exercises': 'exercise',
    'plans.deleting': 'Deleting...',
    'plans.error': 'Error',

    // Leaderboard
    'leaderboard.global': 'Global',
    'leaderboard.thisMonth': 'This month',
    'leaderboard.thisWeek': 'This week',
    'leaderboard.you': 'YOU',
    'leaderboard.yourPosition': 'Your position',
    'leaderboard.keepTraining': 'Keep training to climb the ranks!',
    'leaderboard.noRanking': 'No ranking available for this period',
    'leaderboard.level': 'Lv.',
    'leaderboard.periodLabel': 'Leaderboard period',

    // Profile
    'profile.edit': 'Edit',
    'profile.profileUpdated': 'Profile updated',
    'profile.profileUpdatedDesc': 'Your information has been saved.',
    'profile.updateError': 'Unable to update profile.',
    'profile.playerDNA': 'My Player DNA',
    'profile.scoutingReport': 'AI Scouting Report',
    'profile.levelMax': 'MAX LEVEL',
    'profile.levelMaxReached': 'MAX LEVEL REACHED',
    'profile.xpRemaining': '{xp} XP remaining before level {level}',
    'profile.totalXp': 'Total: {xp} XP',
    'profile.goal': 'Goal:',
    'profile.memberSince': 'Member since',
    'profile.editProfile': 'Edit Profile',
    'profile.fullName': 'Full name',
    'profile.position': 'Position',
    'profile.level': 'Level',
    'profile.trainingGoal': 'Training goal',
    'profile.choosePosition': 'Choose a position',
    'profile.chooseLevel': 'Choose a level',
    'profile.chooseGoal': 'Choose a goal',
    'profile.xpHistory': 'XP History',
    'profile.accountSection': 'Account',
    'profile.signOut': 'Sign out',
    'profile.deleteAccount': 'Delete account',
    'profile.deleteTitle': 'Delete account?',
    'profile.deleteDesc': 'All your data will be permanently deleted. This action is irreversible.',
    'profile.accountDeleted': 'Account deleted',
    'profile.accountDeletedDesc': 'All your data has been deleted.',
    'profile.positionGuard': 'Guard',
    'profile.positionForward': 'Forward',
    'profile.positionCenter': 'Center',
    'profile.positionAllAround': 'All-Around',
    'profile.levelBeginner': 'Beginner',
    'profile.levelIntermediate': 'Intermediate',
    'profile.levelAdvanced': 'Advanced',
    'profile.levelElite': 'Elite',
    'profile.goalShooting': 'Shooting',
    'profile.goalBallHandling': 'Ball Handling',
    'profile.goalDefense': 'Defense',
    'profile.goalConditioning': 'Conditioning',
    'profile.goalGeneral': 'General',

    // Records
    'records.noRecords': 'No records',
    'records.noRecordsDesc': 'Start your first workout to see your records!',
    'records.searchPlaceholder': 'Search for an exercise...',
    'records.drillsTried': 'Drills tried',
    'records.avgRecords': 'Avg. records',
    'records.mostImproved': 'Most improved',
    'records.trainingTime': 'Training time',
    'records.newRecord': '👑 New record!',
    'records.maxReps': 'Max {reps} reps',
    'records.avgTime': 'Avg. {time}',
    'records.lastTime': 'Last time:',
    'records.improvement': 'Improvement',
    'records.decline': 'Decline',
    'records.noSearchResults': 'No exercise found for this search.',
    'records.noCategoryRecords': 'No records in this category.',
    'records.startTraining': 'Start Training',

    // Onboarding
    'onboarding.step': 'Step',
    'onboarding.stepOf': 'Step {current} of 3',
    'onboarding.positionQuestion': 'What is your position?',
    'onboarding.positionDesc': 'Select the position that best matches your playing style',
    'onboarding.levelQuestion': 'What is your level?',
    'onboarding.levelDesc': 'Be honest so we can adapt your program',
    'onboarding.goalQuestion': 'What is your main goal?',
    'onboarding.goalDesc': 'Choose the skill you want to improve',
    'onboarding.next': 'Next',
    'onboarding.saveError': 'Save error. Your preferences will be saved later.',
    'onboarding.posGuardDesc': 'Playmaker, passing and court vision',
    'onboarding.posForwardDesc': 'Versatile, scoring and creating from the wing',
    'onboarding.posCenterDesc': 'Low post, rebounds and rim protection',
    'onboarding.posAllAroundDesc': 'Capable of playing all positions',
    'onboarding.lvlBeginnerDesc': 'I\'m discovering basketball',
    'onboarding.lvlIntermediateDesc': 'I have a few years of experience',
    'onboarding.lvlAdvancedDesc': 'Competitive with solid fundamentals',
    'onboarding.lvlEliteDesc': 'Academic or professional level',
    'onboarding.goalShootingDesc': 'Shooting accuracy and routine',
    'onboarding.goalBallHandlingDesc': 'Ball control and moves',
    'onboarding.goalDefenseDesc': 'Positioning, anticipation and intensity',
    'onboarding.goalConditioningDesc': 'Endurance, explosiveness and agility',
    'onboarding.goalGeneralDesc': 'Complete development of all skills',
    'onboarding.posAllAround': 'All-Around',
    'onboarding.lvlElite': 'Elite',
    'onboarding.goalConditioning': 'Conditioning',
    'onboarding.goalGeneral': 'General',

    // Drill Detail
    'drill.errorLoading': 'Error loading exercise',
    'drill.notFound': 'Exercise not found',
    'drill.addFavorite': 'Add to favorites',
    'drill.removeFavorite': 'Remove from favorites',
    'drill.addedFavorite': 'Added to favorites',
    'drill.removedFavorite': 'Removed from favorites',
    'drill.favoriteDrill': 'Favorite exercise',
    'drill.favoriteError': 'Unable to modify favorite',
    'drill.duration': 'Duration',
    'drill.repetitions': 'Repetitions',
    'drill.level': 'Level',
    'drill.instructions': 'Instructions',
    'drill.startWithCamera': 'Start with Camera',

    // Scouting
    'scouting.estimated': '(estimated)',

    // Auth
    'auth.subtitle': 'Smart Basketball Training',
    'auth.password': 'Password',
    'auth.showPassword': 'Show password',
    'auth.hidePassword': 'Hide password',
    'auth.forgotPassword': 'Forgot password?',
    'auth.loginError': 'Incorrect email or password.',
    'auth.networkError': 'A network error occurred. Please try again.',
    'auth.signupCreatedError': 'Account created but login failed. Please sign in manually.',
    'auth.genericError': 'An error occurred.',
    'auth.passwordMinLength': 'Password must be at least 8 characters.',
    'auth.passwordMismatch': 'Passwords do not match.',
    'auth.tokenCopied': 'Token copied!',

    // Errors
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

    // Auth - extended
    'auth.fullName': 'Full name',
    'auth.email': 'Email',
    'auth.emailPlaceholder': 'you@example.com',
    'auth.loginLoading': 'Signing in…',
    'auth.signupLoading': 'Creating account…',
    'auth.passwordPlaceholder': 'Your password',
    'auth.signupPasswordPlaceholder': 'Choose a password',
    'auth.termsText': "By continuing, you agree to our terms of use and privacy policy.",
    'auth.resetTitle': 'Reset password',
    'auth.resetDesc': 'Enter your email to receive a reset token.',
    'auth.sendToken': 'Send token',
    'auth.resetTokenTitle': 'Reset token',
    'auth.resetTokenDesc': 'In production, this token would be sent by email.',
    'auth.resetTokenLabel': 'Reset token',
    'auth.hideToken': 'Hide token',
    'auth.showToken': 'Show token',
    'auth.copyToken': 'Copy token',
    'auth.newPassword': 'New password',
    'auth.confirmPassword': 'Confirm password',
    'auth.confirmPlaceholder': 'Confirm',
    'auth.minCharsPlaceholder': 'Min. 8 characters',
    'auth.resetButton': 'Reset',
    'auth.resetSuccess': 'Password updated!',
    'auth.resetSuccessDesc': 'You can now sign in with your new password.',
    'auth.backToLogin': 'Back to login',

    // Home - extended
    'home.today': 'Today',
    'home.noSessionsWeek': 'No sessions this week — start now!',
    'home.viewProfile': 'View profile',
    'home.calendarSection': 'Calendar',
    'home.weeklyChallengeSection': 'Weekly challenge',

    // Train Hub - extended
    'train.filterFavorites': 'Filter favorites',
    'train.resetFilters': 'Reset filters',
    'train.filterByDifficulty': 'Filter by difficulty',
    'train.addFavorite': 'Add to favorites',
    'train.removeFavorite': 'Remove from favorites',

    // Profile - extended
    'profile.namePlaceholder': 'Your name',

    // Settings - extended
    'settings.selectPlaceholder': 'Select…',
    'settings.exportSuccess': 'Data exported successfully',
    'settings.exportError': 'Export error',
    'settings.exportNetworkError': 'Network error',
    'settings.privacyLoadError': 'Unable to load privacy policy',
    'settings.deleteAccountSuccess': 'Account deleted. You will be logged out.',
    'settings.deleteAccountError': 'Error deleting account',
    'settings.deleteAccountButton': 'Delete my account',
    'settings.deleteConfirm1': 'This action is irreversible',
    'settings.deleteConfirm2': 'Are you sure?',
    'settings.deleteConfirm3': 'All your data will be lost',
    'settings.deleteFinalButton': 'Confirm deletion',
    'settings.deleteFinalDesc': 'Last chance — click to delete',

    // Camera Workout - extended
    'camera.saveSuccess': 'Session saved! 🎉',
    'camera.saveError': 'Save error',
    'camera.saveErrorDesc': 'Unable to save session',
    'camera.back': 'Back',
    'camera.muteSound': 'Mute sound',
    'camera.unmuteSound': 'Unmute sound',
    'camera.cameraStream': 'Camera stream',

    // Workout Summary - extended
    'summary.copySuccess': 'Copied to clipboard!',
    'summary.bestExercise': 'Best exercise',
    'summary.estimatedCalories': 'Estimated calories',
    'summary.shareTitle': 'CourtVision AI — Training Result',

    // Scouting - extended
    'scouting.insufficientData': 'Not enough data to evaluate strengths.',
    'scouting.startTrainingForAnalysis': 'Start your first workouts to receive a full analysis.',
    'scouting.recommendationMinSessions': 'Recommended: complete at least 3 training sessions in different categories to activate your first full AI scouting report.',
    'scouting.goodLevel': 'All categories show a good level.',
    'scouting.maintainTraining': 'Maintain your current training regimen and push towards higher difficulty drills to continue progressing.',
    'scouting.radarLabel': 'Basketball DNA Radar Chart',
    'scouting.back': 'Back',
    'scouting.improvements': 'Areas of Improvement',
    'scouting.strengths': 'Strengths',

    // Onboarding - extended
    'onboarding.ariaPosition': 'Position',
    'onboarding.ariaLevel': 'Level',
    'onboarding.ariaGoal': 'Main goal',

    // Plans - extended
    'plans.launchPlan': 'Start',
    'plans.editPlanAria': 'Edit plan',
    'plans.deletePlanAria': 'Delete plan',
    'plans.createPlanAria': 'Create plan',
    'plans.repsShort': 'reps',
    'plans.publicBadge': 'Public',

    // Reaction Trainer - extended
    'reaction.directionShort': 'Direction',
    'reaction.colorShort': 'Color',
    'reaction.shotClockShort': 'Shot Clock',
    'reaction.reflexShort': 'Reflex',
    'reaction.tap': 'Tap!',
    'reaction.dontTap': "DON\u2019T TAP!",

    // Pricing - extended
    'pricing.freeTierName': 'Free',
    'pricing.freeTierDesc': 'Discover CourtVision AI',
    'pricing.proTierDesc': 'For serious players',
    'pricing.eliteTierDesc': 'The ultimate experience',
    'pricing.redirectingToast': 'Redirecting to {plan} payment…',
  // Pricing features
  'pricing.feature.basicExercises': 'Basic exercises',
  'pricing.feature.simpleStats': 'Basic statistics',
  'pricing.feature.limitedCoach': 'AI Coach (limited)',
  'pricing.feature.fullScouting': 'Full scouting',
  'pricing.feature.reactionTraining': 'Reaction training',
  'pricing.feature.dataExport': 'Data export',
  'pricing.feature.unlimitedSessions': 'Unlimited sessions',
  'pricing.feature.allExercises': 'All exercises',
  'pricing.feature.unlimitedCoach': 'Unlimited AI Coach',
  'pricing.feature.customPlans': 'AI custom plans',
  'pricing.feature.advancedVideo': 'Advanced video analysis',
  'pricing.feature.prioritySupport': 'Priority support',
  'pricing.feature.eliteBadge': '"Elite" badge on leaderboard',
  'pricing.feature.allInPro': 'Everything in Pro',

  // Auth - name placeholder
  'auth.namePlaceholder': 'John Doe',
  // Train Hub - extended
  'train.instructionsPlaceholder': 'Step by step, describe how to perform the exercise...',
  'train.targetReps': 'Target reps',
  'train.icon': 'Icon (emoji)',
  // Profile - extended
  'profile.viewAll': 'View all',
  'profile.quickSummary': 'Quick Summary',
  'profile.noXpYet': 'No XP earned yet',
  'profile.completeDrillsForXp': 'Complete drills to earn XP!',
  'profile.deleteDataDesc': 'This action is irreversible. All your data will be permanently deleted in accordance with GDPR (Article 17):',
  'profile.deleteDataItem1': 'Profile and preferences',
  'profile.deleteDataItem2': 'Complete session history',
  'profile.deleteDataItem3': 'AI coach messages',
  'profile.deleteDataItem4': 'Custom exercises',
  'profile.deleteDataItem5': 'Training plans',
  'profile.deleteDataItem6': 'Achievements and XP progression',
  'profile.deleteDataItem7': 'Reaction scores',
  'profile.deleteAutoLogout': 'You will be automatically signed out after deletion.',
  // Settings - extended
  'settings.exportData': 'Export my data (GDPR)',
  'settings.exportDataDesc': 'Download all your data in JSON format',
  'settings.privacyPolicy': 'Privacy Policy',
  'settings.privacyPolicyDesc': 'View our GDPR policy',
  // Workout Summary - extended
  'summary.scorePerExercise': 'Score per exercise',
  // Camera Workout - extended
  'camera.loadingDrill': 'Loading exercise...',
  'camera.errorTitle': 'Error',
  'camera.loadingModel': 'Loading AI model...',
  'camera.initCamera': 'Initializing camera...',
  // Reaction Trainer - extended
  'reaction.round': 'Round {current}/{total}',
  'reaction.situation': 'Situation {current}/{total}',
  'reaction.up': 'Up',
  'reaction.down': 'Down',
  'reaction.left': 'Left',
  'reaction.right': 'Right',
  'reaction.target': 'Target',
  'reaction.accuracy': 'Accuracy',
  'reaction.streak': 'Streak',
  'reaction.bestStreak': 'Best streak',
  'reaction.targetsHit': 'Targets hit',
  'reaction.shotClockInfo': '8 situations — Decide in 3 seconds',
  // Scouting - extended
  'scouting.title': 'AI Scouting Report',
  'scouting.scoreOutOf100': 'Overall score / 100',
  'scouting.averageLevel': 'Average level',
  'scouting.yourScore': 'Your score',
  // Home - extended
  'home.loadSessionsError': 'Unable to load sessions',
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