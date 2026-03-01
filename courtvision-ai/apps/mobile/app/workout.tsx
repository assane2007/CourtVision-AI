/**
 * CourtVision AI — Workout Screen
 * Écran principal d'entraînement avec IA en temps réel.
 *
 * Combine :
 * - SmartCamera (caméra + AR overlays)
 * - BiomechanicsPanel (métriques en temps réel)
 * - Statistiques de tir
 * - SessionSummary (fin de session)
 *
 * Flux utilisateur :
 * 1. L'utilisateur arrive sur l'écran → AI s'initialise
 * 2. Tap "Start" → Session démarre, caméra s'active
 * 3. L'IA analyse chaque frame → affiche feedback AR
 * 4. L'utilisateur peut aussi taper make/miss manuellement
 * 5. Tap "End" → Résumé de session apparaît
 *
 * Design V4 : amber accent, glass cards, Sora display.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
    View, Text, TouchableOpacity, ScrollView, StatusBar,
    StyleSheet, Alert, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import Animated, {
    FadeIn,
    FadeInDown,
    FadeOut,
    SlideInDown,
} from 'react-native-reanimated'
import { useRealtimeAI, type AIPhase } from '../hooks/useRealtimeAI'
import { SmartCamera } from '../components/workout/SmartCamera'
import { BiomechanicsPanel } from '../components/workout/BiomechanicsPanel'
import { SessionSummary } from '../components/workout/SessionSummary'
import { ShareService } from '../lib/shareService'
import { CoachingEngine, type CoachingReport } from '../lib/coachingEngine'
import { SessionStorageService } from '../lib/sessionStorage'
import { T, typePresets, impact } from '../lib/theme'
import { CVHUDStat, CVHUDTimer } from '../components/ui'
import type { CapturedFrame } from '../lib/frameCapture'

const type = typePresets

// ==========================================
// Helpers
// ==========================================

function formatTime(sec: number): string {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ==========================================
// Composant principal
// ==========================================

export default function WorkoutScreen() {
    const router = useRouter()
    const params = useLocalSearchParams<{ mode?: string }>()
    const ai = useRealtimeAI()

    // Déterminer le mode depuis les params de navigation ou le state local
    const initialMode = params.mode === 'camera' ? false : params.mode === 'demo' ? true : true
    const [demoMode, setDemoMode] = useState(initialMode)
    const [coachingReport, setCoachingReport] = useState<CoachingReport | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [showCoaching, setShowCoaching] = useState(false)

    // ---- Lifecycle ----
    useEffect(() => {
        // Initialiser le service IA au montage
        ai.init({
            enableHaptics: true,
            enableDemoMode: demoMode,
            demoProfile: 'good',
        })

        return () => {
            // Cleanup à la destruction
        }
    }, [demoMode])

    // Generate coaching report quand la session se termine
    useEffect(() => {
        if (ai.phase === 'ended' && ai.stats && !coachingReport) {
            const engine = new CoachingEngine()
            const report = engine.generateReport(ai.stats, ai.shots)
            setCoachingReport(report)
        }
    }, [ai.phase, ai.stats, coachingReport])

    // ---- Actions ----
    const handleStart = useCallback(() => {
        impact.medium()
        setCoachingReport(null)
        setSaveSuccess(false)
        setShowCoaching(false)
        ai.startSession({
            enableHaptics: true,
            enableDemoMode: demoMode,
            demoProfile: 'good',
        })
    }, [ai, demoMode])

    const handleEnd = useCallback(() => {
        impact.light()
        Alert.alert(
            'Terminer la session ?',
            'Tu verras un résumé complet de ta performance.',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Terminer',
                    style: 'destructive',
                    onPress: () => ai.endSession(),
                },
            ],
        )
    }, [ai])

    const handleSaveSession = useCallback(async () => {
        if (!ai.stats || isSaving) return
        impact.light()
        setIsSaving(true)
        try {
            const storage = SessionStorageService.getInstance()
            await storage.saveSession(ai.stats, ai.shots, {
                courtType: 'indoor',
                appVersion: '1.0.0',
            })
            setSaveSuccess(true)
            impact.success()
            Alert.alert('✅ Sauvegardé', 'Ta session a été enregistrée et sera synchronisée.')
        } catch (err) {
            impact.error()
            Alert.alert('Erreur', 'Impossible de sauvegarder la session.')
        } finally {
            setIsSaving(false)
        }
    }, [ai.stats, ai.shots, isSaving])

    const handleRestart = useCallback(() => {
        impact.medium()
        ai.reset()
        ai.startSession({ enableHaptics: true })
    }, [ai])

    const handleManualShot = useCallback((outcome: 'made' | 'missed') => {
        if (outcome === 'made') impact.success()
        else impact.heavy()
        ai.recordShot(outcome)
    }, [ai])

    /** Handler for real camera frame capture → pipeline IA */
    const handleFrameCaptured = useCallback(async (frame: CapturedFrame) => {
        if (ai.phase !== 'active') return
        try {
            await ai.processFrame(
                frame.base64 ?? frame.uri,
                frame.frameIndex,
                frame.timestamp,
                frame.width,
                frame.height,
            )
        } catch (err) {
            if (__DEV__) console.debug('[Workout] Frame processing error:', err)
        }
    }, [ai])

    const handleBack = useCallback(() => {
        if (ai.phase === 'active') {
            Alert.alert(
                'Session en cours',
                'Tu veux vraiment quitter ? La session sera terminée.',
                [
                    { text: 'Continuer', style: 'cancel' },
                    {
                        text: 'Quitter',
                        style: 'destructive',
                        onPress: () => {
                            ai.endSession()
                            router.back()
                        },
                    },
                ],
            )
        } else {
            router.back()
        }
    }, [ai, router])

    // ---- Session Summary ----
    if (ai.phase === 'ended' && ai.stats) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" />

                {/* Coaching Report Header (if available) */}
                {coachingReport && showCoaching ? (
                    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                        {/* Back to summary */}
                        <TouchableOpacity
                            style={styles.backToSummary}
                            onPress={() => setShowCoaching(false)}
                        >
                            <Feather name="arrow-left" size={18} color={T.color.text.secondary} />
                            <Text style={styles.backToSummaryText}>Retour au résumé</Text>
                        </TouchableOpacity>

                        {/* Coaching Grade */}
                        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.coachingGradeCard}>
                            <Text style={styles.coachingGradeValue}>{coachingReport.grade}</Text>
                            <Text style={styles.coachingGradeLabel}>Note de session</Text>
                            <Text style={styles.coachingHeadline}>{coachingReport.headline}</Text>
                        </Animated.View>

                        {/* NBA Comparison */}
                        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.nbaCompCard}>
                            <View style={styles.nbaCompHeader}>
                                <Feather name="star" size={16} color={T.color.signature.primary} />
                                <Text style={styles.nbaCompTitle}>Comparaison NBA</Text>
                            </View>
                            <Text style={styles.nbaCompPlayer}>{coachingReport.nbaComparison.closestPlayer}</Text>
                            <Text style={styles.nbaCompSimilarity}>
                                {Math.round(coachingReport.nbaComparison.similarity * 100)}% de similarité
                            </Text>
                            <Text style={styles.nbaCompDiff}>{coachingReport.nbaComparison.keyDifference}</Text>
                        </Animated.View>

                        {/* Insights */}
                        <Text style={styles.coachingSectionTitle}>💡 Diagnostics</Text>
                        {coachingReport.insights.slice(0, 5).map((insight, i) => (
                            <Animated.View
                                key={insight.id}
                                entering={FadeInDown.delay(300 + i * 80).duration(300)}
                                style={[
                                    styles.insightCard,
                                    insight.category === 'strength' && styles.insightStrength,
                                    insight.category === 'weakness' && styles.insightWeakness,
                                ]}
                            >
                                <Text style={styles.insightIcon}>{insight.icon}</Text>
                                <View style={styles.insightInfo}>
                                    <Text style={styles.insightTitle}>{insight.title}</Text>
                                    <Text style={styles.insightDesc}>{insight.description}</Text>
                                </View>
                            </Animated.View>
                        ))}

                        {/* Drills */}
                        <Text style={styles.coachingSectionTitle}>🎯 Exercices recommandés</Text>
                        {coachingReport.drills.slice(0, 3).map((drill, i) => (
                            <Animated.View
                                key={drill.id}
                                entering={FadeInDown.delay(600 + i * 80).duration(300)}
                                style={styles.drillCard}
                            >
                                <View style={styles.drillHeader}>
                                    <Text style={styles.drillIcon}>{drill.icon}</Text>
                                    <View style={styles.drillInfo}>
                                        <Text style={styles.drillName}>{drill.name}</Text>
                                        <Text style={styles.drillMeta}>
                                            {drill.duration} · {drill.difficulty}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.drillDesc}>{drill.description}</Text>
                            </Animated.View>
                        ))}

                        {/* Motivation */}
                        <Animated.View entering={FadeInDown.delay(800).duration(400)} style={styles.motivationCard}>
                            <Text style={styles.motivationText}>{coachingReport.motivationMessage}</Text>
                        </Animated.View>

                        {/* Focus for next session */}
                        <Animated.View entering={FadeInDown.delay(900).duration(400)} style={styles.nextFocusCard}>
                            <Feather name="target" size={18} color={T.color.signature.primary} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.nextFocusLabel}>Focus prochaine session</Text>
                                <Text style={styles.nextFocusText}>{coachingReport.nextSessionFocus}</Text>
                            </View>
                        </Animated.View>
                    </ScrollView>
                ) : (
                    <SessionSummary
                        stats={ai.stats}
                        onRestart={handleRestart}
                        onClose={() => router.back()}
                        onSave={handleSaveSession}
                        onShare={async () => {
                            if (ai.stats) {
                                const shareService = new ShareService()
                                await shareService.shareSessionSummary(ai.stats)
                            }
                        }}
                        extraActions={
                            <View style={styles.extraActions}>
                                {coachingReport ? (
                                    <TouchableOpacity
                                        style={styles.coachingBtn}
                                        onPress={() => setShowCoaching(true)}
                                        activeOpacity={0.7}
                                    >
                                        <Feather name="book-open" size={16} color={T.color.signature.primary} />
                                        <Text style={styles.coachingBtnText}>Rapport de coaching</Text>
                                    </TouchableOpacity>
                                ) : null}
                                {saveSuccess ? (
                                    <View style={styles.savedBadge}>
                                        <Feather name="check" size={14} color={T.color.semantic.success} />
                                        <Text style={styles.savedText}>Sauvegardé</Text>
                                    </View>
                                ) : null}
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        )
    }

    // ---- Main workout screen ----
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                    <Feather name="arrow-left" size={22} color={T.color.text.primary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>
                        {ai.phase === 'active' ? 'Session Active' : 'Workout AI'}
                    </Text>
                    {ai.phase === 'active' ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: T.spacing[3], marginTop: T.spacing[1] }}>
                            <CVHUDTimer seconds={ai.sessionDuration} active />
                            <CVHUDStat label="Total" value={ai.shotCount} color={T.color.text.secondary} />
                        </View>
                    ) : null}
                </View>
                {ai.phase === 'active' ? (
                    <TouchableOpacity onPress={handleEnd} style={styles.endBtn}>
                        <Feather name="square" size={16} color={T.color.semantic.error} />
                        <Text style={styles.endBtnText}>Fin</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 60 }} />
                )}
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Camera */}
                <SmartCamera
                    active={ai.phase === 'active'}
                    showDebug={__DEV__}
                    showManualButtons={true}
                    onManualShot={handleManualShot}
                    fps={ai.currentFps}
                    shotPhase={ai.shotPhase}
                    postureQuality={ai.lastBiomechanics?.postureQuality ?? 0}
                    arFrame={ai.lastARFrame}
                    feedback={ai.lastFeedback}
                    onFrameCaptured={handleFrameCaptured}
                    isDemoMode={demoMode}
                    captureTargetFps={10}
                />

                {/* Start button (quand pas encore actif) */}
                {ai.phase === 'ready' ? (
                    <Animated.View entering={FadeInDown.duration(400)} style={styles.startContainer}>
                        <Text style={styles.readyTitle}>Prêt à t'entraîner ?</Text>
                        <Text style={styles.readyText}>
                            Place ton téléphone pour capturer ta mécanique de tir.
                            L'IA analyse chaque tir en temps réel.
                        </Text>

                        {/* Demo mode toggle */}
                        <TouchableOpacity
                            style={[styles.demoToggle, demoMode && styles.demoToggleActive]}
                            onPress={() => {
                                setDemoMode(prev => !prev)
                                // Re-init pour appliquer le changement
                                ai.reset()
                            }}
                            activeOpacity={0.7}
                        >
                            <Feather
                                name={demoMode ? 'zap' : 'camera'}
                                size={16}
                                color={demoMode ? T.color.signature.primary : T.color.text.secondary}
                            />
                            <Text style={[
                                styles.demoToggleText,
                                demoMode && { color: T.color.signature.primary }
                            ]}>
                                {demoMode ? 'Mode Démo (IA simulée)' : 'Mode Caméra (IA réelle)'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.8}>
                            <Feather name="play" size={22} color="#FFF" />
                            <Text style={styles.startBtnText}>Démarrer la session</Text>
                        </TouchableOpacity>
                    </Animated.View>
                ) : null}

                {/* Loading state */}
                {ai.phase === 'uninitialized' ? (
                    <Animated.View entering={FadeIn.duration(300)} style={styles.loadingContainer}>
                        <Text style={styles.loadingText}>Initialisation de l'IA...</Text>
                    </Animated.View>
                ) : null}

                {/* Error state */}
                {ai.error ? (
                    <Animated.View entering={FadeIn.duration(300)} style={styles.errorContainer}>
                        <Feather name="alert-circle" size={20} color={T.color.semantic.error} />
                        <Text style={styles.errorText}>{ai.error}</Text>
                    </Animated.View>
                ) : null}

                {/* Live stats (quand actif) */}
                {ai.phase === 'active' ? (
                    <>
                        {/* Shooting quick stats */}
                        <Animated.View entering={FadeInDown.delay(100).duration(300)} style={{ flexDirection: 'row', gap: T.spacing[3], marginBottom: T.spacing[3] }}>
                            <CVHUDStat
                                label="Made"
                                value={ai.madeCount}
                                color={T.color.semantic.success}
                            />
                            <CVHUDStat
                                label="FG%"
                                value={`${ai.shootingPct}%`}
                                color={ai.shootingPct >= 50 ? T.color.semantic.success : ai.shootingPct >= 35 ? T.color.semantic.warning : T.color.semantic.error}
                                large
                            />
                            <CVHUDStat
                                label="Miss"
                                value={ai.missCount}
                                color={T.color.semantic.error}
                            />
                        </Animated.View>

                        {/* Biomechanics panel */}
                        {ai.lastBiomechanics ? (
                            <View style={styles.bioPanel}>
                                <BiomechanicsPanel
                                    elbowAngle={ai.lastBiomechanics.elbowAngle}
                                    releaseHeight={ai.lastBiomechanics.releaseHeight}
                                    releaseTime={ai.lastBiomechanics.releaseTime}
                                    postureQuality={ai.lastBiomechanics.postureQuality}
                                    followThroughPct={
                                        ai.shotCount > 0
                                            ? (ai.shots.filter(s => s.hasFollowThrough).length / ai.shotCount) * 100
                                            : 0
                                    }
                                    mechanicConsistency={ai.mechanicConsistency}
                                    trends={ai.trends}
                                    fps={ai.currentFps}
                                    shotPhase={ai.shotPhase}
                                />
                            </View>
                        ) : (
                            <Animated.View entering={FadeIn.duration(300)} style={styles.waitingBio}>
                                <Feather name="target" size={24} color={T.color.text.tertiary} />
                                <Text style={styles.waitingText}>
                                    En attente du premier tir...
                                </Text>
                                <Text style={styles.waitingSubtext}>
                                    Tire un panier et l'IA analysera ta mécanique
                                </Text>
                            </Animated.View>
                        )}
                    </>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    )
}

// ==========================================
// Styles
// ==========================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: T.color.background.primary,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        color: T.color.text.primary,
        fontSize: 17,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    headerSub: {
        color: T.color.text.secondary,
        fontSize: 12,
        marginTop: 1,
        fontFamily: T.fonts.body.regular,
    },
    endBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: 'rgba(255,58,94,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,58,94,0.25)',
    },
    endBtnText: {
        color: T.color.semantic.error,
        fontSize: 13,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },

    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 12,
        gap: 12,
    },

    // Start state
    startContainer: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 20,
        backgroundColor: T.color.background.secondary,
        borderRadius: T.borderRadius.xl,
        borderWidth: 1,
        borderColor: T.color.border.base,
    },
    readyTitle: {
        color: T.color.text.primary,
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 8,
        fontFamily: T.fonts.display.bold,
    },
    readyText: {
        color: T.color.text.secondary,
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
        fontFamily: T.fonts.body.regular,
    },
    startBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: T.color.signature.primary,
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 16,
    },
    startBtnText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },

    // Demo toggle
    demoToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: T.color.background.tertiary,
        borderWidth: 1,
        borderColor: T.color.border.base,
        marginBottom: 16,
    },
    demoToggleActive: {
        borderColor: T.color.signature.primary,
        backgroundColor: `${T.color.signature.primary}12`,
    },
    demoToggleText: {
        color: T.color.text.secondary,
        fontSize: 13,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
    },

    // Loading state
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        color: T.color.text.secondary,
        fontSize: 14,
        fontFamily: T.fonts.body.regular,
    },

    // Error state
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: `${T.color.semantic.error}20`,
        padding: 12,
        borderRadius: T.borderRadius.md,
        borderWidth: 1,
        borderColor: `${T.color.semantic.error}40`,
    },
    errorText: {
        color: T.color.semantic.error,
        fontSize: 13,
        flex: 1,
        fontFamily: T.fonts.body.regular,
    },

    // Quick stats
    quickStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: T.color.background.secondary,
        borderRadius: T.borderRadius.lg,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: T.color.border.base,
    },
    quickStat: {
        alignItems: 'center',
        flex: 1,
    },
    quickStatCenter: {
        alignItems: 'center',
        flex: 1,
    },
    quickStatValue: {
        fontSize: 24,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    quickStatPct: {
        fontSize: 32,
        fontWeight: '800',
        fontFamily: T.fonts.display.bold,
    },
    quickStatLabel: {
        color: T.color.text.secondary,
        fontSize: 11,
        marginTop: 2,
        fontFamily: T.fonts.body.regular,
    },

    // Bio panel
    bioPanel: {
        marginTop: 4,
    },

    // Waiting for first shot
    waitingBio: {
        alignItems: 'center',
        paddingVertical: 28,
        paddingHorizontal: 20,
        backgroundColor: T.color.background.secondary,
        borderRadius: T.borderRadius.lg,
        borderWidth: 1,
        borderColor: T.color.border.base,
    },
    waitingText: {
        color: T.color.text.secondary,
        fontSize: 15,
        fontWeight: '600',
        marginTop: 12,
        fontFamily: T.fonts.body.semibold,
    },
    waitingSubtext: {
        color: T.color.text.tertiary,
        fontSize: 13,
        marginTop: 4,
        textAlign: 'center',
        fontFamily: T.fonts.body.regular,
    },

    // Coaching report styles
    backToSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        marginBottom: 8,
    },
    backToSummaryText: {
        color: T.color.text.secondary,
        fontSize: 14,
        fontFamily: T.fonts.body.semibold,
    },
    coachingGradeCard: {
        alignItems: 'center',
        backgroundColor: T.color.background.secondary,
        borderRadius: T.borderRadius.xl,
        padding: 24,
        borderWidth: 1,
        borderColor: T.color.border.base,
        marginBottom: 12,
    },
    coachingGradeValue: {
        fontSize: 48,
        fontWeight: '800',
        color: T.color.signature.primary,
        fontFamily: T.fonts.display.black,
    },
    coachingGradeLabel: {
        color: T.color.text.tertiary,
        fontSize: 12,
        marginTop: 2,
        fontFamily: T.fonts.body.regular,
    },
    coachingHeadline: {
        color: T.color.text.primary,
        fontSize: 15,
        fontWeight: '600',
        marginTop: 12,
        textAlign: 'center',
        fontFamily: T.fonts.body.semibold,
    },
    nbaCompCard: {
        backgroundColor: T.color.background.secondary,
        borderRadius: T.borderRadius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: T.color.border.base,
        marginBottom: 16,
    },
    nbaCompHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    nbaCompTitle: {
        color: T.color.text.secondary,
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontFamily: T.fonts.body.semibold,
    },
    nbaCompPlayer: {
        color: T.color.text.primary,
        fontSize: 20,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    nbaCompSimilarity: {
        color: T.color.signature.primary,
        fontSize: 13,
        fontWeight: '600',
        marginTop: 2,
        fontFamily: T.fonts.body.semibold,
    },
    nbaCompDiff: {
        color: T.color.text.tertiary,
        fontSize: 12,
        marginTop: 6,
        lineHeight: 18,
        fontFamily: T.fonts.body.regular,
    },
    coachingSectionTitle: {
        color: T.color.text.primary,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
        fontFamily: T.fonts.display.bold,
    },
    insightCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: T.color.background.secondary,
        borderRadius: T.borderRadius.md,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: T.color.border.base,
    },
    insightStrength: {
        borderColor: `${T.color.semantic.success}30`,
        backgroundColor: `${T.color.semantic.success}08`,
    },
    insightWeakness: {
        borderColor: `${T.color.semantic.warning}30`,
        backgroundColor: `${T.color.semantic.warning}08`,
    },
    insightIcon: {
        fontSize: 20,
        marginTop: 2,
    },
    insightInfo: {
        flex: 1,
    },
    insightTitle: {
        color: T.color.text.primary,
        fontSize: 14,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
    },
    insightDesc: {
        color: T.color.text.secondary,
        fontSize: 12,
        marginTop: 3,
        lineHeight: 18,
        fontFamily: T.fonts.body.regular,
    },
    drillCard: {
        backgroundColor: T.color.background.secondary,
        borderRadius: T.borderRadius.md,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: T.color.border.base,
    },
    drillHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    drillIcon: {
        fontSize: 20,
    },
    drillInfo: {
        flex: 1,
    },
    drillName: {
        color: T.color.text.primary,
        fontSize: 14,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
    },
    drillMeta: {
        color: T.color.text.tertiary,
        fontSize: 11,
        marginTop: 1,
        fontFamily: T.fonts.body.regular,
    },
    drillDesc: {
        color: T.color.text.secondary,
        fontSize: 12,
        lineHeight: 18,
        fontFamily: T.fonts.body.regular,
    },
    motivationCard: {
        backgroundColor: `${T.color.signature.primary}10`,
        borderRadius: T.borderRadius.lg,
        padding: 16,
        marginVertical: 12,
        borderWidth: 1,
        borderColor: `${T.color.signature.primary}25`,
    },
    motivationText: {
        color: T.color.text.primary,
        fontSize: 14,
        fontStyle: 'italic',
        textAlign: 'center',
        lineHeight: 22,
        fontFamily: T.fonts.body.regular,
    },
    nextFocusCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: T.color.background.secondary,
        borderRadius: T.borderRadius.lg,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: T.color.border.base,
    },
    nextFocusLabel: {
        color: T.color.text.tertiary,
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontFamily: T.fonts.body.semibold,
    },
    nextFocusText: {
        color: T.color.text.primary,
        fontSize: 14,
        fontWeight: '600',
        marginTop: 4,
        lineHeight: 20,
        fontFamily: T.fonts.body.semibold,
    },

    // Extra actions (session summary footer)
    extraActions: {
        gap: 8,
        marginTop: 8,
    },
    coachingBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: `${T.color.signature.primary}12`,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${T.color.signature.primary}30`,
    },
    coachingBtnText: {
        color: T.color.signature.primary,
        fontSize: 14,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
    },
    savedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
    },
    savedText: {
        color: T.color.semantic.success,
        fontSize: 13,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
    },
})
