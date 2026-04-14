/**
 * CourtVision AI — Digital Twin V4 REDESIGN
 * "My Digital Twin" — 2K MyPlayer × Apple Fitness × Whoop DNA
 *
 * Design rules: T.color.*, T.spacing, T.borderRadius, typePresets, glass V4, 4pt grid, 44px touch
 */

import {
    View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState, useEffect } from 'react'
import { Feather } from '@expo/vector-icons'
import Animated, {
    FadeInDown, FadeInRight,
    useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing,
} from 'react-native-reanimated'
import {
    useDigitalTwin,
    type TwinTab,
    type TwinAttributeCategory,
    type TwinTrait,
    type NBAComparison,
    type ComfortZone,
    type TwinEvolutionPoint,
    type MatchupSimulation,
    type TwinDrillRecommendation,
} from '../../hooks/useDigitalTwin'
import { useViralShare, type SharePlatform, type TwinCardData } from '../../hooks/useViralShare'
import { getSimulationPlayers } from '../../lib/nbaApi'
import { ShareButton, ShareModal } from '../../components/dashboard/ShareCard'
import { AppBackground } from '../../components/ui'
import { T, typePresets } from '../../lib/theme'
import { PrimaryButton } from '../../components/PrimaryButton'

const type = typePresets
const glass = T.glass
const { width: SCREEN_WIDTH } = Dimensions.get('window')

// ==========================================
// Constants
// ==========================================
const STYLE_LABELS: Record<string, string> = {
    sharpshooter: 'Sharpshooter', shot_creator: 'Shot Creator', slasher: 'Slasher',
    playmaker: 'Playmaker', two_way: 'Two-Way', stretch_big: 'Stretch Big',
    paint_beast: 'Paint Beast', balanced: 'Balanced',
}

const STYLE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
    sharpshooter: 'target', shot_creator: 'zap', slasher: 'navigation',
    playmaker: 'cpu', two_way: 'shield', stretch_big: 'maximize',
    paint_beast: 'box', balanced: 'compass',
}

const NBA_PLAYERS_FOR_SIMULATION = getSimulationPlayers()

const TAB_CONFIG: { key: TwinTab; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { key: 'overview',   label: 'DNA',     icon: 'hexagon' },
    { key: 'attributes', label: 'Stats',   icon: 'bar-chart-2' },
    { key: 'matchup',    label: 'Matchup', icon: 'crosshair' },
    { key: 'evolution',  label: 'Growth',  icon: 'trending-up' },
]

// ==========================================
// Main Component
// ==========================================
export default function DigitalTwin() {
    const twin = useDigitalTwin()
    const viralShare = useViralShare()
    const [showShareModal, setShowShareModal] = useState(false)

    const pulseScale = useSharedValue(1)
    const orbitRotation = useSharedValue(0)

    useEffect(() => {
        pulseScale.value = withRepeat(
            withSequence(
                withTiming(1.06, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
                withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
            ), -1,
        )
        orbitRotation.value = withRepeat(
            withTiming(360, { duration: 8000, easing: Easing.linear }), -1,
        )
    }, [])

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }))
    const orbitStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${orbitRotation.value}deg` }],
    }))

    // ======= Loading =======
    if (twin.loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: T.color.background.primary, justifyContent: 'center', alignItems: 'center' }}>
                <AppBackground variant="calm" />
                <View style={{
                    width: 88, height: 88, borderRadius: 44,
                    ...glass.accent, justifyContent: 'center', alignItems: 'center',
                    ...T.glow(T.color.signature.primary, 0.3),
                }}>
                    <ActivityIndicator size="large" color={T.color.signature.primary} />
                </View>
                <Text style={{ ...type.cardTitle, color: T.color.text.secondary, marginTop: T.spacing[5] }}>
                    Building Digital Twin...
                </Text>
                <Text style={{ ...type.caption, color: T.color.text.tertiary, marginTop: T.spacing[2] }}>
                    AI analysis in progress
                </Text>
            </SafeAreaView>
        )
    }

    // ======= Error / No profile =======
    if (twin.error || !twin.profile) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: T.color.background.primary, justifyContent: 'center', alignItems: 'center', padding: T.spacing[8] }}>
                <AppBackground variant="calm" />
                <Animated.View entering={FadeInDown.duration(600)} style={{
                    width: 120, height: 120, borderRadius: 60,
                    ...glass.accent, justifyContent: 'center', alignItems: 'center',
                    ...T.glow(T.color.signature.primary, 0.15),
                }}>
                    <Feather name="user" size={48} color={T.color.signature.primary} style={{ opacity: 0.6 }} />
                </Animated.View>
                <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={{
                    ...type.screenTitle, color: T.color.text.primary,
                    marginTop: T.spacing[6], textAlign: 'center',
                }}>
                    Your Digital Twin is{'\n'}being built
                </Animated.Text>
                <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={{
                    ...type.body, color: T.color.text.secondary,
                    textAlign: 'center', marginTop: T.spacing[4],
                }}>
                    {twin.error ?? 'Analyze at least one video session to create your AI avatar.'}
                </Animated.Text>
                <Animated.View entering={FadeInDown.delay(300).duration(500)} style={{ marginTop: T.spacing[6] }}>
                    <PrimaryButton
                        label={twin.rebuilding ? 'Building...' : 'Build my Twin'}
                        onPress={twin.rebuild}
                        variant="primary"
                        icon="cpu"
                        state={twin.rebuilding ? 'loading' : 'default'}
                    />
                </Animated.View>
            </SafeAreaView>
        )
    }

    const p = twin.profile

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.color.background.primary }}>
            <AppBackground variant="calm" />
            <ScrollView contentContainerStyle={{ paddingBottom: 50 }} showsVerticalScrollIndicator={false}>

                {/* ======= Header ======= */}
                <Animated.View entering={FadeInDown.duration(500)} style={{
                    paddingHorizontal: T.spacing[5], paddingTop: T.spacing[4], paddingBottom: 0,
                }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                            <Text style={{ ...type.screenTitle, color: T.color.text.primary }}>
                                Digital Twin
                            </Text>
                            <Text style={{ ...type.caption, color: T.color.text.tertiary, marginTop: T.spacing[1] }}>
                                v{p.modelVersion}  {p.sessionCount} sessions
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: T.spacing[3] }}>
                            <TouchableOpacity
                                onPress={twin.rebuild}
                                disabled={twin.rebuilding}
                                activeOpacity={0.7}
                                style={{
                                    width: 44, height: 44, borderRadius: 22,
                                    ...(glass.regular ?? T.glass.thin),
                                    justifyContent: 'center', alignItems: 'center',
                                }}
                            >
                                {twin.rebuilding
                                    ? <ActivityIndicator size="small" color={T.color.signature.primary} />
                                    : <Feather name="refresh-cw" size={16} color={T.color.signature.primary} />
                                }
                            </TouchableOpacity>
                            <ShareButton onPress={() => setShowShareModal(true)} compact />
                        </View>
                    </View>
                </Animated.View>

                {/* ======= Overall Rating Hero ======= */}
                <Animated.View entering={FadeInDown.delay(100).duration(600)} style={{
                    alignItems: 'center', marginTop: T.spacing[8], marginBottom: T.spacing[2], position: 'relative',
                }}>
                    <Animated.View style={[{
                        position: 'absolute', width: 156, height: 156, borderRadius: 78,
                        borderWidth: 1.5, borderColor: `${T.color.signature.primary}10`,
                        borderTopColor: T.color.signature.primary,
                    }, orbitStyle]} />
                    <View style={{
                        position: 'absolute', width: 146, height: 146, borderRadius: 73,
                        borderWidth: 1, borderColor: `${T.color.signature.primary}05`,
                    }} />
                    <Animated.View style={[{
                        width: 126, height: 126, borderRadius: 63,
                        backgroundColor: T.color.background.tertiary,
                        justifyContent: 'center', alignItems: 'center',
                        ...T.glow(T.ratingColor(p.overallRating), 0.35),
                        borderWidth: 2, borderColor: `${T.ratingColor(p.overallRating)}40`,
                    }, pulseStyle]}>
                        <Text style={{
                            ...type.hero, color: T.ratingColor(p.overallRating), fontSize: 44,
                        }}>
                            {p.overallRating}
                        </Text>
                        <Text style={{ ...type.overline, color: T.color.text.tertiary, fontSize: 10, letterSpacing: 2 }}>
                            OVERALL
                        </Text>
                    </Animated.View>
                </Animated.View>

                {/* ======= Play Style Badge ======= */}
                <Animated.View entering={FadeInDown.delay(200).duration(500)} style={{
                    alignItems: 'center', marginTop: T.spacing[4], marginBottom: T.spacing[4],
                }}>
                    <View style={{
                        borderRadius: T.borderRadius.full, paddingHorizontal: T.spacing[5], paddingVertical: T.spacing[3],
                        flexDirection: 'row', alignItems: 'center', ...glass.accent,
                    }}>
                        <Feather
                            name={STYLE_ICONS[p.playStyle.primary] ?? 'compass'}
                            size={18} color={T.color.signature.primary}
                            style={{ marginRight: T.spacing[2] }}
                        />
                        <Text style={{ ...type.cardTitle, color: T.color.signature.primary }}>
                            {STYLE_LABELS[p.playStyle.primary] ?? p.playStyle.primary}
                        </Text>
                        {p.playStyle.secondary && (
                            <Text style={{ ...type.caption, color: T.color.text.tertiary, marginLeft: T.spacing[2] }}>
                                / {STYLE_LABELS[p.playStyle.secondary] ?? p.playStyle.secondary}
                            </Text>
                        )}
                    </View>
                    <Text style={{
                        ...type.body, color: T.color.text.secondary,
                        marginTop: T.spacing[2], textAlign: 'center', paddingHorizontal: T.spacing[10],
                    }}>
                        {p.playStyle.description}
                    </Text>
                    <View style={{
                        marginTop: T.spacing[2], flexDirection: 'row', alignItems: 'center',
                        backgroundColor: `${T.color.semantic.info}20`, borderRadius: T.borderRadius.full,
                        paddingHorizontal: T.spacing[3], paddingVertical: T.spacing[1],
                    }}>
                        <Feather name="star" size={12} color={T.color.semantic.info} style={{ marginRight: T.spacing[1] }} />
                        <Text style={{ ...type.cardTitle, color: T.color.semantic.info, fontSize: 13 }}>
                            NBA Archetype: {p.playStyle.nbaArchetype}
                        </Text>
                    </View>
                </Animated.View>

                {/* ======= Tab Bar ======= */}
                <Animated.View entering={FadeInDown.delay(300).duration(500)} style={{
                    flexDirection: 'row', marginHorizontal: T.spacing[5], marginBottom: T.spacing[4],
                    borderRadius: T.borderRadius.lg, padding: 3, ...(glass.regular ?? T.glass.thin),
                }}>
                    {TAB_CONFIG.map(tab => {
                        const isActive = twin.activeTab === tab.key
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                onPress={() => twin.setActiveTab(tab.key)}
                                activeOpacity={0.7}
                                style={{
                                    flex: 1, paddingVertical: T.spacing[3], borderRadius: T.borderRadius.md,
                                    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: T.spacing[1],
                                    backgroundColor: isActive ? T.color.signature.primary : 'transparent',
                                    ...(isActive ? T.glow.soft() : {}),
                                    minHeight: 44,
                                }}
                            >
                                <Feather name={tab.icon} size={12} color={isActive ? T.color.background.primary : T.color.text.tertiary} />
                                <Text style={{
                                    ...type.overline, fontSize: 11,
                                    color: isActive ? T.color.background.primary : T.color.text.tertiary,
                                    fontWeight: isActive ? '800' : '500',
                                }}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        )
                    })}
                </Animated.View>

                {/* ======= Tab Content ======= */}
                {twin.activeTab === 'overview' && (
                    <OverviewTab
                        profile={p}
                        insights={twin.insights}
                        drillRecommendations={twin.drillRecommendations}
                    />
                )}
                {twin.activeTab === 'attributes' && <AttributesTab categories={p.attributeCategories} />}
                {twin.activeTab === 'matchup' && (
                    <MatchupTab
                        profile={p}
                        simulation={twin.simulation}
                        simulating={twin.simulating}
                        onSimulateNBA={(name) => twin.simulateVsNBA(name)}
                        onClear={() => twin.clearSimulation()}
                    />
                )}
                {twin.activeTab === 'evolution' && <EvolutionTab evolution={p.evolution} />}

                {/* ======= Share CTA Banner ======= */}
                <Animated.View entering={FadeInDown.delay(400).duration(500)} style={{
                    marginHorizontal: T.spacing[5], marginTop: T.spacing[4], marginBottom: T.spacing[4],
                    borderRadius: T.borderRadius.xl, padding: T.spacing[4],
                    flexDirection: 'row', alignItems: 'center',
                    ...glass.accent, ...T.glow(T.color.signature.primary, 0.06),
                }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ ...type.cardTitle, color: T.color.text.primary }}>
                            Share your Twin Card
                        </Text>
                        <Text style={{ ...type.caption, color: T.color.text.secondary, marginTop: T.spacing[1] }}>
                            Show off on TikTok or Instagram · +10 XP
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => setShowShareModal(true)}
                        activeOpacity={0.8}
                        style={{
                            backgroundColor: T.color.signature.primary,
                            borderRadius: T.borderRadius.md, paddingHorizontal: T.spacing[4], paddingVertical: T.spacing[3],
                            ...T.glow.soft(),
                            minHeight: 44, justifyContent: 'center',
                        }}
                    >
                        <Text style={{ ...type.cardTitle, color: T.color.background.primary }}>Share</Text>
                    </TouchableOpacity>
                </Animated.View>

            </ScrollView>

            <ShareModal
                visible={showShareModal}
                onClose={() => setShowShareModal(false)}
                onShare={async (platform: SharePlatform) => {
                    await viralShare.shareTwinCard(platform)
                    setShowShareModal(false)
                }}
                sharing={viralShare.sharing}
                cardData={buildTwinCardForShare(p)}
                shareType="twin_card"
            />
        </SafeAreaView>
    )
}

// ==========================================
// Tab: Overview (Player DNA)
// ==========================================
function OverviewTab({ profile, insights, drillRecommendations }: {
    profile: any
    insights: string | null
    drillRecommendations: TwinDrillRecommendation[]
}) {
    return (
        <View style={{ paddingHorizontal: T.spacing[5] }}>
            {/* Category Summary Cards */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: T.spacing[4] }}>
                {profile.attributeCategories.map((cat: TwinAttributeCategory, idx: number) => (
                    <Animated.View
                        key={cat.category}
                        entering={FadeInDown.delay(idx * 80).duration(400)}
                        style={{
                            width: (SCREEN_WIDTH - 50) / 2,
                            borderRadius: T.borderRadius.xl, padding: T.spacing[4], marginBottom: T.spacing[3],
                            ...(glass.regular ?? T.glass.base),
                        }}
                    >
                        <Text style={{ ...type.cardTitle, marginBottom: T.spacing[1] }}>
                            {cat.emoji} <Text style={{ color: T.color.text.primary }}>{cat.category}</Text>
                        </Text>
                        <Text style={{ ...type.mediumStat, color: T.ratingColor(cat.overallScore), fontSize: 30 }}>
                            {cat.overallScore}
                        </Text>
                        <View style={{ height: 4, backgroundColor: T.color.border.soft, borderRadius: 2, marginTop: T.spacing[2] }}>
                            <View style={{
                                height: 4, borderRadius: 2,
                                backgroundColor: T.ratingColor(cat.overallScore),
                                width: `${cat.overallScore}%`,
                                ...T.glow.soft(),
                            }} />
                        </View>
                    </Animated.View>
                ))}
            </View>

            {/* NBA Comparisons */}
            {profile.nbaComparisons.length > 0 && (
                <View style={{ marginBottom: T.spacing[4] }}>
                    <Text style={{ ...type.sectionTitle, color: T.color.text.primary, marginBottom: T.spacing[3] }}>
                        NBA Comparisons
                    </Text>
                    {profile.nbaComparisons.map((comp: NBAComparison, i: number) => {
                        const accentColor = i === 0 ? T.color.gamification.gold : i === 1 ? T.color.signature.primary : T.color.text.tertiary
                        return (
                            <Animated.View
                                key={i}
                                entering={FadeInRight.delay(i * 100).duration(400)}
                                style={{
                                    borderRadius: T.borderRadius.lg, padding: T.spacing[4], marginBottom: T.spacing[2],
                                    flexDirection: 'row', alignItems: 'center',
                                    ...(glass.regular ?? T.glass.thin),
                                    borderLeftWidth: 3, borderLeftColor: accentColor,
                                }}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={{ ...type.cardTitle, color: T.color.text.primary }}>
                                        {comp.playerName}
                                    </Text>
                                    <Text style={{ ...type.caption, color: T.color.text.secondary, marginTop: T.spacing[1] }}>
                                        {comp.matchingTraits.join(' · ')}
                                    </Text>
                                </View>
                                <View style={{
                                    backgroundColor: `${T.ratingColor(comp.similarity)}20`,
                                    borderRadius: T.borderRadius.md, paddingHorizontal: T.spacing[3], paddingVertical: T.spacing[1],
                                    borderWidth: 1, borderColor: `${T.ratingColor(comp.similarity)}30`,
                                }}>
                                    <Text style={{ ...type.cardTitle, color: T.ratingColor(comp.similarity) }}>
                                        {comp.similarity}%
                                    </Text>
                                </View>
                            </Animated.View>
                        )
                    })}
                </View>
            )}

            {/* Strengths & Weaknesses */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: T.spacing[4] }}>
                <Animated.View entering={FadeInDown.delay(100).duration(400)} style={{
                    flex: 1, marginRight: 6, borderRadius: T.borderRadius.lg, padding: T.spacing[4],
                    ...(glass.regular ?? T.glass.thin),
                    borderLeftWidth: 3, borderLeftColor: T.color.semantic.success,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: T.spacing[2] }}>
                        <Feather name="arrow-up-circle" size={16} color={T.color.semantic.success} style={{ marginRight: T.spacing[2] }} />
                        <Text style={{ ...type.cardTitle, color: T.color.semantic.success }}>Strengths</Text>
                    </View>
                    {profile.strengths.map((t: TwinTrait) => (
                        <View key={t.id} style={{ marginBottom: T.spacing[2] }}>
                            <Text style={{ ...type.cardTitle, color: T.color.text.primary, fontSize: 13 }}>
                                ✓ {t.label}
                            </Text>
                            <Text style={{ ...type.caption, color: T.color.text.secondary, marginLeft: T.spacing[3] }}>
                                {t.description}
                            </Text>
                        </View>
                    ))}
                    {profile.strengths.length === 0 && (
                        <Text style={{ ...type.caption, color: T.color.text.secondary }}>Keep playing to discover your strengths</Text>
                    )}
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(180).duration(400)} style={{
                    flex: 1, marginLeft: 6, borderRadius: T.borderRadius.lg, padding: T.spacing[4],
                    ...(glass.regular ?? T.glass.thin),
                    borderLeftWidth: 3, borderLeftColor: T.color.semantic.error,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: T.spacing[2] }}>
                        <Feather name="alert-triangle" size={16} color={T.color.semantic.error} style={{ marginRight: T.spacing[2] }} />
                        <Text style={{ ...type.cardTitle, color: T.color.semantic.error }}>Work On</Text>
                    </View>
                    {profile.weaknesses.map((t: TwinTrait) => (
                        <View key={t.id} style={{ marginBottom: T.spacing[2] }}>
                            <Text style={{ ...type.cardTitle, color: T.color.text.primary, fontSize: 13 }}>
                                ✗ {t.label}
                            </Text>
                            {t.drillRecommendation && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: T.spacing[3], marginTop: T.spacing[1] }}>
                                    <Feather name="zap" size={10} color={T.color.semantic.warning} style={{ marginRight: T.spacing[1] }} />
                                    <Text style={{ ...type.caption, color: T.color.semantic.warning, flex: 1 }}>
                                        {t.drillRecommendation}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ))}
                    {profile.weaknesses.length === 0 && (
                        <Text style={{ ...type.caption, color: T.color.text.secondary }}>No major weakness found</Text>
                    )}
                </Animated.View>
            </View>

            {/* Dynamic Drill Recommendations */}
            {drillRecommendations.length > 0 && (
                <Animated.View entering={FadeInDown.duration(400)} style={{
                    borderRadius: T.borderRadius.xl, padding: T.spacing[4], marginBottom: T.spacing[4],
                    ...glass.accent,
                    borderLeftWidth: 3, borderLeftColor: T.color.signature.primary,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: T.spacing[3] }}>
                        <Feather name="zap" size={16} color={T.color.signature.primary} style={{ marginRight: T.spacing[2] }} />
                        <Text style={{ ...type.sectionTitle, color: T.color.signature.primary, fontSize: 18 }}>
                            Dynamic Drill Plan
                        </Text>
                    </View>

                    {drillRecommendations.slice(0, 3).map((rec, index) => (
                        <View
                            key={rec.id}
                            style={{
                                borderRadius: T.borderRadius.lg,
                                padding: T.spacing[3],
                                marginBottom: index < Math.min(3, drillRecommendations.length) - 1 ? T.spacing[2] : 0,
                                ...(glass.regular ?? T.glass.thin),
                            }}
                        >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ ...type.cardTitle, color: T.color.text.primary, flex: 1, marginRight: T.spacing[2] }}>
                                    #{rec.rank} {rec.title}
                                </Text>
                                <View style={{
                                    borderRadius: T.borderRadius.md,
                                    paddingHorizontal: T.spacing[2],
                                    paddingVertical: T.spacing[1],
                                    backgroundColor: `${T.color.signature.primary}20`,
                                    borderWidth: 1,
                                    borderColor: `${T.color.signature.primary}35`,
                                }}>
                                    <Text style={{ ...type.overline, color: T.color.signature.primary, fontSize: 10 }}>
                                        {rec.priority}
                                    </Text>
                                </View>
                            </View>

                            <Text style={{ ...type.caption, color: T.color.text.secondary, marginTop: T.spacing[1] }}>
                                {rec.objective}
                            </Text>

                            <Text style={{ ...type.overline, color: T.color.text.tertiary, marginTop: T.spacing[2], fontSize: 10 }}>
                                {rec.drill.name} · {rec.sessionsPerWeek}x/week · {rec.minutesPerSession} min · {rec.drill.intensity.toUpperCase()}
                            </Text>

                            {(rec.zoneFocus || rec.linkedWeakness) && (
                                <Text style={{ ...type.overline, color: T.color.semantic.info, marginTop: T.spacing[1], fontSize: 10 }}>
                                    Focus: {rec.zoneFocus ?? 'general'}{rec.linkedWeakness ? ` · Weakness: ${rec.linkedWeakness}` : ''}
                                </Text>
                            )}

                            {rec.drill.tips.length > 0 && (
                                <Text style={{ ...type.caption, color: T.color.text.secondary, marginTop: T.spacing[1] }}>
                                    Tip: {rec.drill.tips[0]}
                                </Text>
                            )}
                        </View>
                    ))}
                </Animated.View>
            )}

            {/* Comfort Zones */}
            {profile.comfortZones.length > 0 && (
                <Animated.View entering={FadeInDown.duration(400)} style={{ marginBottom: T.spacing[4] }}>
                    <Text style={{ ...type.sectionTitle, color: T.color.text.primary, marginBottom: T.spacing[3] }}>
                        Comfort Zones
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {profile.comfortZones.filter((z: ComfortZone) => z.attempts > 0).map((z: ComfortZone, i: number) => (
                            <View key={i} style={{
                                borderRadius: T.borderRadius.md, padding: T.spacing[3], margin: 3,
                                ...(z.isComfort ? glass.accent : (glass.regular ?? T.glass.thin)),
                                ...(z.isComfort ? { borderColor: T.color.semantic.success, borderWidth: 1 } : {}),
                            }}>
                                <Text style={{ ...type.cardTitle, color: T.color.text.primary, fontSize: 13 }}>{z.zone}</Text>
                                <Text style={{
                                    ...type.cardTitle,
                                    color: z.isComfort ? T.color.semantic.success : T.color.text.secondary,
                                }}>
                                    {Math.round(z.efficiency)}%
                                </Text>
                                <Text style={{ ...type.overline, color: T.color.text.tertiary, fontSize: 9 }}>{z.attempts} shots</Text>
                            </View>
                        ))}
                    </View>
                </Animated.View>
            )}

            {/* Mental Profile */}
            <Animated.View entering={FadeInDown.duration(400)} style={{
                borderRadius: T.borderRadius.xl, padding: T.spacing[4], marginBottom: T.spacing[4],
                ...(glass.regular ?? T.glass.base),
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: T.spacing[3] }}>
                    <Feather name="activity" size={18} color={T.color.gamification.purple} style={{ marginRight: T.spacing[2] }} />
                    <Text style={{ ...type.sectionTitle, color: T.color.text.primary, fontSize: 18 }}>
                        Mental Profile
                    </Text>
                </View>
                <MentalBar label="Resilience" value={profile.mentalProfile.resilience} />
                <MentalBar label="Clutch Factor" value={profile.mentalProfile.clutchFactor} />
                <MentalBar label="Consistency" value={profile.mentalProfile.consistency} />
                <MentalBar label="Fatigue Resist." value={profile.mentalProfile.fatigueResistance} />
                <View style={{
                    flexDirection: 'row', alignItems: 'center', marginTop: T.spacing[3],
                    paddingTop: T.spacing[2], borderTopWidth: 1, borderTopColor: T.color.border.soft,
                }}>
                    <Text style={{ ...type.caption, color: T.color.text.secondary }}>Under pressure: </Text>
                    <Text style={{
                        ...type.cardTitle, fontSize: 13,
                        color: profile.mentalProfile.pressureResponse === 'thrives' ? T.color.semantic.success
                            : profile.mentalProfile.pressureResponse === 'struggles' ? T.color.semantic.error
                            : T.color.semantic.warning,
                    }}>
                        {profile.mentalProfile.pressureResponse === 'thrives' ? 'Thrives'
                            : profile.mentalProfile.pressureResponse === 'struggles' ? 'Struggles' : 'Neutral'}
                    </Text>
                </View>
            </Animated.View>

            {/* AI Insights */}
            {insights && (
                <Animated.View entering={FadeInDown.duration(400)} style={{
                    borderRadius: T.borderRadius.xl, padding: T.spacing[4], marginBottom: T.spacing[4],
                    ...T.glass.vivid, borderLeftWidth: 3, borderLeftColor: T.color.gamification.purple,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: T.spacing[2] }}>
                        <Feather name="cpu" size={16} color={T.color.gamification.purple} style={{ marginRight: T.spacing[2] }} />
                        <Text style={{ ...type.cardTitle, color: T.color.gamification.purple }}>AI Analysis</Text>
                    </View>
                    <Text style={{ ...type.body, color: T.color.text.primary }}>{insights}</Text>
                </Animated.View>
            )}

            {/* Shot Signature */}
            <Animated.View entering={FadeInDown.duration(400)} style={{
                borderRadius: T.borderRadius.xl, padding: T.spacing[4], marginBottom: T.spacing[4],
                ...(glass.regular ?? T.glass.base),
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: T.spacing[3] }}>
                    <Feather name="crosshair" size={18} color={T.color.signature.primary} style={{ marginRight: T.spacing[2] }} />
                    <Text style={{ ...type.sectionTitle, color: T.color.text.primary, fontSize: 18 }}>
                        Shot Signature
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                    <PoseStatItem label="Elbow Angle" value={`${profile.poseSignature.avgElbowAngle}°`} ideal="90-100°" />
                    <PoseStatItem label="Release Height" value={`${profile.poseSignature.avgReleaseHeight}x`} ideal=">1.10x" />
                    <PoseStatItem label="Hand" value={profile.poseSignature.dominantHand === 'right' ? 'Right' : 'Left'} />
                </View>
            </Animated.View>
        </View>
    )
}

// ==========================================
// Tab: Attributes (Detailed Stats)
// ==========================================
function AttributesTab({ categories }: { categories: TwinAttributeCategory[] }) {
    return (
        <View style={{ paddingHorizontal: T.spacing[5] }}>
            {categories.map((cat, catIdx) => (
                <Animated.View
                    key={cat.category}
                    entering={FadeInDown.delay(catIdx * 100).duration(400)}
                    style={{
                        borderRadius: T.borderRadius.xl, padding: T.spacing[4], marginBottom: T.spacing[3],
                        ...(glass.regular ?? T.glass.base),
                    }}
                >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: T.spacing[3] }}>
                        <Text style={{ ...type.sectionTitle, color: T.color.text.primary, fontSize: 18 }}>
                            {cat.emoji} {cat.category}
                        </Text>
                        <View style={{
                            backgroundColor: `${T.ratingColor(cat.overallScore)}15`,
                            borderRadius: T.borderRadius.md, paddingHorizontal: T.spacing[3], paddingVertical: T.spacing[1],
                            borderWidth: 1, borderColor: `${T.ratingColor(cat.overallScore)}25`,
                        }}>
                            <Text style={{ ...type.mediumStat, color: T.ratingColor(cat.overallScore), fontSize: 20 }}>
                                {cat.overallScore}
                            </Text>
                        </View>
                    </View>
                    {cat.attributes.map((attr, i) => (
                        <View key={i} style={{ marginBottom: T.spacing[3] }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: T.spacing[1] }}>
                                <Text style={{ ...type.body, color: T.color.text.secondary }}>{attr.name}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ ...type.cardTitle, color: T.ratingColor(attr.value) }}>
                                        {attr.value}
                                    </Text>
                                    {attr.delta !== 0 && (
                                        <Text style={{
                                            ...type.overline, marginLeft: T.spacing[1],
                                            color: attr.trend === 'up' ? T.color.semantic.success
                                                : attr.trend === 'down' ? T.color.semantic.error
                                                : T.color.text.secondary,
                                            fontSize: 10,
                                        }}>
                                            {attr.trend === 'up' ? '↑' : attr.trend === 'down' ? '↓' : '→'}{Math.abs(attr.delta)}
                                        </Text>
                                    )}
                                </View>
                            </View>
                            <View style={{ height: 5, backgroundColor: T.color.border.soft, borderRadius: 3, overflow: 'hidden' }}>
                                <View style={{
                                    height: 5, borderRadius: 3,
                                    backgroundColor: T.ratingColor(attr.value),
                                    width: `${Math.min(attr.value, 100)}%`,
                                }} />
                            </View>
                        </View>
                    ))}
                </Animated.View>
            ))}
        </View>
    )
}

// ==========================================
// Tab: Matchup (Simulator)
// ==========================================
function MatchupTab({ profile, simulation, simulating, onSimulateNBA, onClear }: {
    profile: any
    simulation: MatchupSimulation | null
    simulating: boolean
    onSimulateNBA: (name: string) => void
    onClear: () => void
}) {
    return (
        <View style={{ paddingHorizontal: T.spacing[5] }}>
            <Animated.View entering={FadeInDown.duration(400)}>
                <Text style={{ ...type.sectionTitle, color: T.color.text.primary, marginBottom: T.spacing[1] }}>
                    Matchup Simulator
                </Text>
                <Text style={{ ...type.caption, color: T.color.text.secondary, marginBottom: T.spacing[4] }}>
                    Your Twin vs an NBA player. Who wins?
                </Text>
            </Animated.View>

            {/* NBA Player Grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: T.spacing[4] }}>
                {NBA_PLAYERS_FOR_SIMULATION.map((name, i) => (
                    <Animated.View key={name} entering={FadeInDown.delay(i * 40).duration(300)}>
                        <TouchableOpacity
                            onPress={() => onSimulateNBA(name)}
                            disabled={simulating}
                            activeOpacity={0.7}
                            style={{
                                borderRadius: T.borderRadius.md, paddingHorizontal: T.spacing[3], paddingVertical: T.spacing[2],
                                margin: 3, ...(glass.regular ?? T.glass.thin), minHeight: 44, justifyContent: 'center',
                            }}
                        >
                            <Text style={{ ...type.cardTitle, color: T.color.text.primary, fontSize: 13 }}>{name}</Text>
                        </TouchableOpacity>
                    </Animated.View>
                ))}
            </View>

            {simulating && (
                <View style={{ alignItems: 'center', padding: T.spacing[8] }}>
                    <View style={{
                        width: 60, height: 60, borderRadius: 30,
                        ...glass.accent, justifyContent: 'center', alignItems: 'center',
                        ...T.glow(T.color.signature.primary, 0.2),
                    }}>
                        <ActivityIndicator size="large" color={T.color.signature.primary} />
                    </View>
                    <Text style={{ ...type.cardTitle, color: T.color.text.secondary, marginTop: T.spacing[3] }}>
                        Simulating matchup...
                    </Text>
                </View>
            )}

            {simulation && !simulating && (
                <Animated.View entering={FadeInDown.duration(500)}>
                    {/* Win Probability */}
                    <View style={{
                        borderRadius: T.borderRadius['2xl'], padding: T.spacing[6], alignItems: 'center', marginBottom: T.spacing[4],
                        ...(glass.regular ?? T.glass.base),
                        borderWidth: 1.5,
                        borderColor: simulation.winProbability >= 50 ? `${T.color.semantic.success}30` : `${T.color.semantic.error}30`,
                        ...T.glow(simulation.winProbability >= 50 ? T.color.semantic.success : T.color.semantic.error, 0.12),
                    }}>
                        <Text style={{ ...type.cardTitle, color: T.color.text.secondary, marginBottom: T.spacing[1] }}>
                            vs {simulation.opponent}
                        </Text>
                        <Text style={{
                            ...type.hero,
                            color: simulation.winProbability >= 50 ? T.color.semantic.success : T.color.semantic.error,
                            fontSize: 52,
                        }}>
                            {simulation.winProbability}%
                        </Text>
                        <Text style={{ ...type.cardTitle, color: T.color.text.secondary }}>Win Probability</Text>

                        <View style={{
                            flexDirection: 'row', marginTop: T.spacing[4], alignItems: 'center',
                            backgroundColor: T.color.border.soft, borderRadius: T.borderRadius.full,
                            paddingHorizontal: T.spacing[4], paddingVertical: T.spacing[2],
                        }}>
                            <Text style={{ ...type.mediumStat, color: T.color.signature.primary, fontSize: 20 }}>
                                {simulation.predictedScore.player}
                            </Text>
                            <Text style={{ ...type.cardTitle, color: T.color.text.tertiary, marginHorizontal: T.spacing[3] }}>—</Text>
                            <Text style={{ ...type.mediumStat, color: T.color.semantic.error, fontSize: 20 }}>
                                {simulation.predictedScore.opponent}
                            </Text>
                        </View>
                    </View>

                    {/* Key Matchups */}
                    <View style={{ borderRadius: T.borderRadius.xl, padding: T.spacing[4], marginBottom: T.spacing[3], ...(glass.regular ?? T.glass.base) }}>
                        <Text style={{ ...type.cardTitle, color: T.color.text.primary, marginBottom: T.spacing[3] }}>
                            Key Matchups
                        </Text>
                        {simulation.keyMatchups.map((km, i) => (
                            <View key={i} style={{
                                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                                marginBottom: T.spacing[2], paddingBottom: T.spacing[2],
                                borderBottomWidth: i < simulation.keyMatchups.length - 1 ? 1 : 0,
                                borderBottomColor: T.color.border.soft,
                            }}>
                                <Text style={{ ...type.body, color: T.color.text.secondary }}>{km.area}</Text>
                                <View style={{
                                    borderRadius: T.borderRadius.md, paddingHorizontal: T.spacing[3], paddingVertical: T.spacing[1],
                                    backgroundColor: km.edge === 'player' ? `${T.color.semantic.success}20`
                                        : km.edge === 'opponent' ? `${T.color.semantic.error}20` : `${T.color.semantic.warning}20`,
                                }}>
                                    <Text style={{
                                        ...type.overline, fontSize: 10,
                                        color: km.edge === 'player' ? T.color.semantic.success
                                            : km.edge === 'opponent' ? T.color.semantic.error : T.color.semantic.warning,
                                    }}>
                                        {km.edge === 'player' ? 'ADVANTAGE' : km.edge === 'opponent' ? 'DISADVANTAGE' : 'EVEN'}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Gameplan */}
                    {simulation.gameplan.length > 0 && (
                        <View style={{
                            borderRadius: T.borderRadius.xl, padding: T.spacing[4], marginBottom: T.spacing[3], ...glass.accent,
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: T.spacing[2] }}>
                                <Feather name="clipboard" size={16} color={T.color.signature.primary} style={{ marginRight: T.spacing[2] }} />
                                <Text style={{ ...type.cardTitle, color: T.color.signature.primary }}>Game Plan</Text>
                            </View>
                            {simulation.gameplan.map((tip, i) => (
                                <Text key={i} style={{ ...type.caption, color: T.color.text.primary, marginBottom: T.spacing[1] }}>
                                    • {tip}
                                </Text>
                            ))}
                        </View>
                    )}

                    {/* Advantages & Vulnerabilities */}
                    <View style={{ flexDirection: 'row', marginBottom: T.spacing[4] }}>
                        <View style={{
                            flex: 1, marginRight: 5, borderRadius: T.borderRadius.lg, padding: T.spacing[3],
                            ...(glass.regular ?? T.glass.thin),
                            borderLeftWidth: 3, borderLeftColor: T.color.semantic.success,
                        }}>
                            <Text style={{ ...type.cardTitle, color: T.color.semantic.success, marginBottom: T.spacing[1], fontSize: 13 }}>
                                Advantages
                            </Text>
                            {simulation.advantages.map((a, i) => (
                                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: T.spacing[1] }}>
                                    <Feather name="check" size={12} color={T.color.semantic.success} style={{ marginRight: T.spacing[1], marginTop: 2 }} />
                                    <Text style={{ ...type.caption, color: T.color.text.primary, flex: 1 }}>{a}</Text>
                                </View>
                            ))}
                            {simulation.advantages.length === 0 && (
                                <Text style={{ ...type.caption, color: T.color.text.secondary }}>No clear advantage</Text>
                            )}
                        </View>
                        <View style={{
                            flex: 1, marginLeft: 5, borderRadius: T.borderRadius.lg, padding: T.spacing[3],
                            ...(glass.regular ?? T.glass.thin),
                            borderLeftWidth: 3, borderLeftColor: T.color.semantic.error,
                        }}>
                            <Text style={{ ...type.cardTitle, color: T.color.semantic.error, marginBottom: T.spacing[1], fontSize: 13 }}>
                                Vulnerabilities
                            </Text>
                            {simulation.vulnerabilities.map((v, i) => (
                                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: T.spacing[1] }}>
                                    <Feather name="alert-circle" size={12} color={T.color.semantic.error} style={{ marginRight: T.spacing[1], marginTop: 2 }} />
                                    <Text style={{ ...type.caption, color: T.color.text.primary, flex: 1 }}>{v}</Text>
                                </View>
                            ))}
                            {simulation.vulnerabilities.length === 0 && (
                                <Text style={{ ...type.caption, color: T.color.text.secondary }}>No major vulnerability</Text>
                            )}
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={onClear}
                        activeOpacity={0.7}
                        style={{
                            borderRadius: T.borderRadius.lg, padding: T.spacing[3], alignItems: 'center',
                            ...(glass.regular ?? T.glass.thin), minHeight: 44, justifyContent: 'center',
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Feather name="refresh-cw" size={14} color={T.color.signature.primary} style={{ marginRight: T.spacing[2] }} />
                            <Text style={{ ...type.cardTitle, color: T.color.signature.primary }}>
                                New Simulation
                            </Text>
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            )}
        </View>
    )
}

// ==========================================
// Tab: Evolution (Growth Chart)
// ==========================================
function EvolutionTab({ evolution }: { evolution: TwinEvolutionPoint[] }) {
    if (evolution.length === 0) {
        return (
            <View style={{ padding: T.spacing[10], alignItems: 'center' }}>
                <View style={{
                    width: 70, height: 70, borderRadius: 35,
                    ...(glass.regular ?? T.glass.thin),
                    justifyContent: 'center', alignItems: 'center',
                }}>
                    <Feather name="trending-up" size={32} color={T.color.text.tertiary} />
                </View>
                <Text style={{
                    ...type.body, color: T.color.text.secondary,
                    marginTop: T.spacing[4], textAlign: 'center',
                }}>
                    Not enough data yet.{'\n'}Keep playing to see your growth!
                </Text>
            </View>
        )
    }

    const maxRating = Math.max(...evolution.map(e => e.overallRating), 100)
    const chartHeight = 160
    const barWidth = Math.min((SCREEN_WIDTH - 80) / evolution.length, 28)

    return (
        <View style={{ paddingHorizontal: T.spacing[5] }}>
            <Animated.View entering={FadeInDown.duration(400)}>
                <Text style={{ ...type.sectionTitle, color: T.color.text.primary, marginBottom: T.spacing[4] }}>
                    Growth
                </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(100).duration(500)} style={{
                borderRadius: T.borderRadius.xl, padding: T.spacing[4], marginBottom: T.spacing[4],
                ...(glass.regular ?? T.glass.base),
            }}>
                <Text style={{ ...type.caption, color: T.color.text.secondary, marginBottom: T.spacing[3] }}>
                    Overall rating per session
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: chartHeight, justifyContent: 'center' }}>
                    {evolution.map((point, i) => {
                        const h = (point.overallRating / maxRating) * chartHeight
                        return (
                            <View key={i} style={{ alignItems: 'center', marginHorizontal: 2 }}>
                                <Text style={{ ...type.overline, color: T.color.text.secondary, fontSize: 8, marginBottom: 3 }}>
                                    {point.overallRating}
                                </Text>
                                <View style={{
                                    width: barWidth, height: h, borderRadius: T.borderRadius.sm,
                                    backgroundColor: T.ratingColor(point.overallRating),
                                    ...T.glow.soft(),
                                }} />
                                <Text style={{
                                    ...type.overline, color: T.color.text.tertiary, fontSize: 7, marginTop: T.spacing[1],
                                    transform: [{ rotate: '-45deg' }],
                                }}>
                                    {point.date.slice(5)}
                                </Text>
                            </View>
                        )
                    })}
                </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).duration(500)} style={{
                borderRadius: T.borderRadius.xl, padding: T.spacing[4], marginBottom: T.spacing[4],
                ...(glass.regular ?? T.glass.base),
            }}>
                <Text style={{ ...type.cardTitle, color: T.color.text.primary, marginBottom: T.spacing[3] }}>
                    Recent Sessions
                </Text>
                {evolution.slice(-5).reverse().map((point, i) => (
                    <View key={i} style={{
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        paddingVertical: T.spacing[2],
                        borderBottomWidth: i < 4 ? 1 : 0, borderBottomColor: T.color.border.soft,
                    }}>
                        <Text style={{ ...type.caption, color: T.color.text.secondary }}>{point.date}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MiniStat icon="target" value={point.shootingRating} />
                            <MiniStat icon="activity" value={point.mentalRating} />
                            <MiniStat icon="zap" value={point.physicalRating} />
                            <View style={{
                                backgroundColor: `${T.ratingColor(point.overallRating)}20`,
                                borderRadius: T.borderRadius.md, paddingHorizontal: T.spacing[2], paddingVertical: T.spacing[1],
                                marginLeft: T.spacing[2],
                                borderWidth: 1, borderColor: `${T.ratingColor(point.overallRating)}30`,
                            }}>
                                <Text style={{ ...type.cardTitle, color: T.ratingColor(point.overallRating), fontSize: 13 }}>
                                    {point.overallRating}
                                </Text>
                            </View>
                        </View>
                    </View>
                ))}
            </Animated.View>
        </View>
    )
}

// ==========================================
// Sub-components
// ==========================================

function MentalBar({ label, value }: { label: string; value: number }) {
    return (
        <View style={{ marginBottom: T.spacing[2] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: T.spacing[1] }}>
                <Text style={{ ...type.caption, color: T.color.text.secondary }}>{label}</Text>
                <Text style={{ ...type.cardTitle, color: T.ratingColor(value), fontSize: 13 }}>{value}</Text>
            </View>
            <View style={{ height: 5, backgroundColor: T.color.border.soft, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{
                    height: 5, borderRadius: 3,
                    backgroundColor: T.ratingColor(value),
                    width: `${Math.min(value, 100)}%`,
                }} />
            </View>
        </View>
    )
}

function PoseStatItem({ label, value, ideal }: { label: string; value: string; ideal?: string }) {
    return (
        <View style={{ alignItems: 'center' }}>
            <Text style={{ ...type.overline, color: T.color.text.secondary, fontSize: 9 }}>{label}</Text>
            <Text style={{ ...type.cardTitle, color: T.color.text.primary, marginVertical: T.spacing[1] }}>{value}</Text>
            {ideal && (
                <View style={{
                    backgroundColor: T.color.signature.muted, borderRadius: T.borderRadius.full,
                    paddingHorizontal: T.spacing[2], paddingVertical: T.spacing[1],
                }}>
                    <Text style={{ ...type.overline, color: T.color.signature.primary, fontSize: 9 }}>Ideal: {ideal}</Text>
                </View>
            )}
        </View>
    )
}

function MiniStat({ icon, value }: { icon: keyof typeof Feather.glyphMap; value: number }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: T.spacing[1] }}>
            <Feather name={icon} size={10} color={T.color.text.tertiary} style={{ marginRight: 2 }} />
            <Text style={{ ...type.caption, color: T.color.text.secondary, fontSize: 11 }}>{value}</Text>
        </View>
    )
}

// ==========================================
// Helpers
// ==========================================

function buildTwinCardForShare(profile: any): TwinCardData {
    const topCategory = [...(profile.attributeCategories || [])]
        .sort((a: TwinAttributeCategory, b: TwinAttributeCategory) => b.overallScore - a.overallScore)[0]

    const topNBA = profile.nbaComparisons?.[0] ?? null

    const allAttrs: { name: string; value: number; emoji: string }[] = []
    for (const cat of profile.attributeCategories ?? []) {
        for (const attr of cat.attributes ?? []) {
            allAttrs.push({ name: attr.name, value: attr.value, emoji: cat.emoji })
        }
    }
    const keyAttributes = allAttrs.sort((a, b) => b.value - a.value).slice(0, 4)

    return {
        username: 'Player',
        fullName: 'Player',
        avatarUrl: null,
        position: null,
        overallRating: profile.overallRating,
        playStyle: profile.playStyle.primary,
        playStyleLabel: STYLE_LABELS[profile.playStyle.primary] ?? profile.playStyle.primary,
        playStyleDescription: profile.playStyle.description,
        nbaArchetype: profile.playStyle.nbaArchetype,
        topCategoryName: topCategory?.category ?? 'N/A',
        topCategoryEmoji: topCategory?.emoji ?? '',
        topCategoryScore: topCategory?.overallScore ?? 0,
        nbaCompPlayer: topNBA?.playerName ?? null,
        nbaCompSimilarity: topNBA?.similarity ?? 0,
        nbaCompTraits: topNBA?.matchingTraits ?? [],
        keyAttributes,
        mentalResilience: profile.mentalProfile.resilience,
        clutchFactor: profile.mentalProfile.clutchFactor,
        pressureResponse: profile.mentalProfile.pressureResponse,
        strengths: profile.strengths.slice(0, 3).map((s: TwinTrait) => s.label),
        weaknesses: profile.weaknesses.slice(0, 2).map((w: TwinTrait) => w.label),
        modelVersion: profile.modelVersion,
        sessionCount: profile.sessionCount,
        generatedAt: new Date().toISOString(),
    }
}
