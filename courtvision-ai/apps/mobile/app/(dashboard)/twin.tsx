import { View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState, useEffect } from 'react'
import { Feather } from '@expo/vector-icons'
import Animated, {
    FadeInDown, FadeInRight,
    useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing,
} from 'react-native-reanimated'
import { useDigitalTwin } from '../../hooks/useDigitalTwin'
import { useViralShare } from '../../hooks/useViralShare'
import type { SharePlatform, TwinCardData } from '../../hooks/useViralShare'
import { ShareButton, ShareModal } from '../../components/ShareCard'
import type {
    TwinTab, TwinAttributeCategory, TwinTrait,
    NBAComparison, ComfortZone, TwinEvolutionPoint, MatchupSimulation,
} from '../../hooks/useDigitalTwin'
import { T } from '../../lib/theme'
import { PrimaryButton } from '../../components/PrimaryButton'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// ==========================================
// Style Labels & Feather Icon Map
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

const NBA_PLAYERS_FOR_SIMULATION = [
    'Stephen Curry', 'LeBron James', 'Kevin Durant', 'Giannis Antetokounmpo',
    'Luka DonÄiÄ‡', 'Kawhi Leonard', 'Ja Morant', 'Klay Thompson',
    'Kyrie Irving', 'Karl-Anthony Towns',
]

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

    // Continuous Reanimated v3 animations
    const pulseScale = useSharedValue(1)
    const orbitRotation = useSharedValue(0)

    useEffect(() => {
        pulseScale.value = withRepeat(
            withSequence(
                withTiming(1.06, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
                withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
            ),
            -1,
        )
        orbitRotation.value = withRepeat(
            withTiming(360, { duration: 8000, easing: Easing.linear }),
            -1,
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
            <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.bg, justifyContent: 'center', alignItems: 'center' }}>
                <View style={{
                    width: 88, height: 88, borderRadius: 44,
                    ...T.glass.accent, justifyContent: 'center', alignItems: 'center',
                    ...T.glow(T.colors.accent, 0.3),
                }}>
                    <ActivityIndicator size="large" color={T.colors.accent} />
                </View>
                <Text style={{ color: T.colors.textSecondary, marginTop: T.space.xl, fontSize: T.font.md, fontWeight: '600', fontFamily: T.fonts.body.semibold }}>
                    Building Digital Twin...
                </Text>
                <Text style={{ color: T.colors.dim, marginTop: T.space.sm, fontSize: T.font.sm }}>
                    AI analysis in progress
                </Text>
            </SafeAreaView>
        )
    }

    // ======= Error / No profile =======
    if (twin.error || !twin.profile) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.bg, justifyContent: 'center', alignItems: 'center', padding: 30 }}>
                <Animated.View entering={FadeInDown.duration(600)} style={{
                    width: 120, height: 120, borderRadius: 60,
                    ...T.glass.accent, justifyContent: 'center', alignItems: 'center',
                    ...T.glow(T.colors.accent, 0.15),
                }}>
                    <Feather name="user" size={48} color={T.colors.accent} style={{ opacity: 0.6 }} />
                </Animated.View>
                <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={{
                    color: T.colors.white, fontSize: T.font.xl, fontWeight: '800',
                    marginTop: T.space.xxl, textAlign: 'center', letterSpacing: -0.5, fontFamily: T.fonts.display.black,
                }}>
                    Your Digital Twin is{'\n'}being built
                </Animated.Text>
                <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={{
                    color: T.colors.textSecondary, fontSize: T.font.md, textAlign: 'center',
                    marginTop: T.space.md, lineHeight: 22,
                }}>
                    {twin.error ?? 'Analyze at least one video session to create your AI avatar.'}
                </Animated.Text>
                <Animated.View entering={FadeInDown.delay(300).duration(500)} style={{ marginTop: T.space.xxl }}>
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
        <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.bg }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 50 }} showsVerticalScrollIndicator={false}>

                {/* ======= Header ======= */}
                <Animated.View entering={FadeInDown.duration(500)} style={{
                    paddingHorizontal: T.space.xl, paddingTop: T.space.lg, paddingBottom: 0,
                }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                            <Text style={{ color: T.colors.white, fontSize: T.font.xxl, fontWeight: '800', fontFamily: T.fonts.display.black, letterSpacing: -1 }}>
                                Digital Twin
                            </Text>
                            <Text style={{ color: T.colors.dim, fontSize: T.font.sm, fontFamily: T.fonts.body.regular, marginTop: 2 }}>
                                v{p.modelVersion}  {p.sessionCount} sessions
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <TouchableOpacity
                                onPress={twin.rebuild}
                                disabled={twin.rebuilding}
                                activeOpacity={0.7}
                                style={{
                                    width: 40, height: 40, borderRadius: 20,
                                    ...T.glass.light, justifyContent: 'center', alignItems: 'center',
                                }}
                            >
                                {twin.rebuilding
                                    ? <ActivityIndicator size="small" color={T.colors.accent} />
                                    : <Feather name="refresh-cw" size={16} color={T.colors.accent} />
                                }
                            </TouchableOpacity>
                            <ShareButton onPress={() => setShowShareModal(true)} compact />
                        </View>
                    </View>
                </Animated.View>

                {/* ======= Overall Rating Hero ======= */}
                <Animated.View entering={FadeInDown.delay(100).duration(600)} style={{
                    alignItems: 'center', marginTop: 28, marginBottom: 8, position: 'relative',
                }}>
                    {/* Orbital ring */}
                    <Animated.View style={[{
                        position: 'absolute', width: 156, height: 156, borderRadius: 78,
                        borderWidth: 1.5, borderColor: 'rgba(255,107,0,0.10)',
                        borderTopColor: T.colors.accent,
                    }, orbitStyle]} />
                    {/* Outer glow ring */}
                    <View style={{
                        position: 'absolute', width: 146, height: 146, borderRadius: 73,
                        borderWidth: 1, borderColor: 'rgba(255,107,0,0.05)',
                    }} />
                    <Animated.View style={[{
                        width: 126, height: 126, borderRadius: 63,
                        backgroundColor: T.colors.card,
                        justifyContent: 'center', alignItems: 'center',
                        ...T.glow(T.ratingColor(p.overallRating), 0.35),
                        borderWidth: 2, borderColor: `${T.ratingColor(p.overallRating)}40`,
                    }, pulseStyle]}>
                        <Text style={{
                            color: T.ratingColor(p.overallRating), fontSize: 44,
                            fontWeight: '900', fontFamily: T.fonts.display.black, letterSpacing: -2,
                        }}>
                            {p.overallRating}
                        </Text>
                        <Text style={{ color: T.colors.dim, fontSize: 10, fontWeight: '700', fontFamily: T.fonts.display.bold, letterSpacing: 2 }}>
                            OVERALL
                        </Text>
                    </Animated.View>
                </Animated.View>

                {/* ======= Play Style Badge ======= */}
                <Animated.View entering={FadeInDown.delay(200).duration(500)} style={{
                    alignItems: 'center', marginTop: T.space.lg, marginBottom: T.space.lg,
                }}>
                    <View style={{
                        borderRadius: T.radius.pill, paddingHorizontal: 20, paddingVertical: 10,
                        flexDirection: 'row', alignItems: 'center', ...T.glass.accent,
                    }}>
                        <Feather
                            name={STYLE_ICONS[p.playStyle.primary] ?? 'compass'}
                            size={18} color={T.colors.accent}
                            style={{ marginRight: 8 }}
                        />
                        <Text style={{ color: T.colors.accent, fontSize: T.font.base, fontWeight: '700', fontFamily: T.fonts.display.bold }}>
                            {STYLE_LABELS[p.playStyle.primary] ?? p.playStyle.primary}
                        </Text>
                        {p.playStyle.secondary && (
                            <Text style={{ color: T.colors.dim, fontSize: T.font.sm, marginLeft: 8 }}>
                                / {STYLE_LABELS[p.playStyle.secondary] ?? p.playStyle.secondary}
                            </Text>
                        )}
                    </View>
                    <Text style={{
                        color: T.colors.textSecondary, fontSize: T.font.sm, marginTop: T.space.sm,
                        textAlign: 'center', paddingHorizontal: 40, lineHeight: 18,
                    }}>
                        {p.playStyle.description}
                    </Text>
                    <View style={{
                        marginTop: T.space.sm, flexDirection: 'row', alignItems: 'center',
                        backgroundColor: T.colors.primaryDim, borderRadius: T.radius.pill,
                        paddingHorizontal: 12, paddingVertical: 4,
                    }}>
                        <Feather name="star" size={12} color={T.colors.primary} style={{ marginRight: 4 }} />
                        <Text style={{ color: T.colors.primary, fontSize: T.font.sm, fontWeight: '600', fontFamily: T.fonts.body.semibold }}>
                            NBA Archetype: {p.playStyle.nbaArchetype}
                        </Text>
                    </View>
                </Animated.View>

                {/* ======= Tab Bar (Premium Glass) ======= */}
                <Animated.View entering={FadeInDown.delay(300).duration(500)} style={{
                    flexDirection: 'row', marginHorizontal: T.space.xl, marginBottom: T.space.lg,
                    borderRadius: T.radius.md, padding: 3, ...T.glass.light,
                }}>
                    {TAB_CONFIG.map(tab => {
                        const isActive = twin.activeTab === tab.key
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                onPress={() => twin.setActiveTab(tab.key)}
                                activeOpacity={0.7}
                                style={{
                                    flex: 1, paddingVertical: 10, borderRadius: T.radius.sm,
                                    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5,
                                    backgroundColor: isActive ? T.colors.accent : 'transparent',
                                    ...(isActive ? T.shadow(T.colors.accent, 0.3, 8) : {}),
                                }}
                            >
                                <Feather name={tab.icon} size={12} color={isActive ? T.colors.bg : T.colors.dim} />
                                <Text style={{
                                    color: isActive ? T.colors.bg : T.colors.dim,
                                    fontSize: T.font.xs, fontWeight: isActive ? '800' : '500',
                                }}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        )
                    })}
                </Animated.View>

                {/* ======= Tab Content ======= */}
                {twin.activeTab === 'overview' && <OverviewTab profile={p} insights={twin.insights} />}
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
                    marginHorizontal: T.space.xl, marginTop: T.space.md, marginBottom: T.space.md,
                    borderRadius: T.radius.lg, padding: T.space.lg,
                    flexDirection: 'row', alignItems: 'center',
                    ...T.glass.accent, ...T.glow(T.colors.accent, 0.06),
                }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: T.colors.white, fontSize: T.font.md, fontWeight: '700', fontFamily: T.fonts.display.bold }}>
                            Share your Twin Card
                        </Text>
                        <Text style={{ color: T.colors.textSecondary, fontSize: T.font.sm, marginTop: 3 }}>
                            Show off on TikTok or Instagram  +10 XP
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => setShowShareModal(true)}
                        activeOpacity={0.8}
                        style={{
                            backgroundColor: T.colors.accent,
                            borderRadius: T.radius.sm, paddingHorizontal: 16, paddingVertical: 10,
                            ...T.shadow(T.colors.accent, 0.35, 10),
                        }}
                    >
                        <Text style={{ color: T.colors.bg, fontSize: T.font.sm, fontWeight: '800', fontFamily: T.fonts.display.bold }}>Share</Text>
                    </TouchableOpacity>
                </Animated.View>

            </ScrollView>

            {/* ======= Share Modal ======= */}
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
function OverviewTab({ profile, insights }: { profile: any; insights: string | null }) {
    return (
        <View style={{ paddingHorizontal: T.space.xl }}>
            {/* Category Summary Cards */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: T.space.lg }}>
                {profile.attributeCategories.map((cat: TwinAttributeCategory, idx: number) => (
                    <Animated.View
                        key={cat.category}
                        entering={FadeInDown.delay(idx * 80).duration(400)}
                        style={{
                            width: (SCREEN_WIDTH - 50) / 2,
                            borderRadius: T.radius.lg, padding: T.space.lg, marginBottom: T.space.md,
                            ...T.glass.medium,
                        }}
                    >
                        <Text style={{ fontSize: T.font.md, marginBottom: T.space.xs }}>
                            {cat.emoji} <Text style={{ color: T.colors.white, fontWeight: '600', fontFamily: T.fonts.body.semibold }}>{cat.category}</Text>
                        </Text>
                        <Text style={{ color: T.ratingColor(cat.overallScore), fontSize: 30, fontWeight: '900', fontFamily: T.fonts.display.black, letterSpacing: -1 }}>
                            {cat.overallScore}
                        </Text>
                        <View style={{ height: 4, backgroundColor: T.colors.dimmer, borderRadius: 2, marginTop: T.space.sm }}>
                            <View style={{
                                height: 4, borderRadius: 2,
                                backgroundColor: T.ratingColor(cat.overallScore),
                                width: `${cat.overallScore}%`,
                                ...T.shadow(T.ratingColor(cat.overallScore), 0.4, 6),
                            }} />
                        </View>
                    </Animated.View>
                ))}
            </View>

            {/* NBA Comparisons */}
            {profile.nbaComparisons.length > 0 && (
                <View style={{ marginBottom: T.space.lg }}>
                    <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '800', fontFamily: T.fonts.display.black, marginBottom: T.space.md, letterSpacing: -0.5 }}>
                        NBA Comparisons
                    </Text>
                    {profile.nbaComparisons.map((comp: NBAComparison, i: number) => {
                        const accentColor = i === 0 ? T.colors.gold : i === 1 ? T.colors.accent : T.colors.dim
                        return (
                            <Animated.View
                                key={i}
                                entering={FadeInRight.delay(i * 100).duration(400)}
                                style={{
                                    borderRadius: T.radius.md, padding: T.space.lg, marginBottom: T.space.sm,
                                    flexDirection: 'row', alignItems: 'center',
                                    ...T.glass.light, borderLeftWidth: 3, borderLeftColor: accentColor,
                                }}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: T.colors.white, fontSize: T.font.base, fontWeight: '700', fontFamily: T.fonts.display.bold }}>
                                        {comp.playerName}
                                    </Text>
                                    <Text style={{ color: T.colors.muted, fontSize: T.font.sm, marginTop: 2 }}>
                                        {comp.matchingTraits.join('  ')}
                                    </Text>
                                </View>
                                <View style={{
                                    backgroundColor: `${T.ratingColor(comp.similarity)}20`,
                                    borderRadius: T.radius.sm, paddingHorizontal: 12, paddingVertical: 5,
                                    borderWidth: 1, borderColor: `${T.ratingColor(comp.similarity)}30`,
                                }}>
                                    <Text style={{ color: T.ratingColor(comp.similarity), fontSize: T.font.md, fontWeight: '800', fontFamily: T.fonts.display.bold }}>
                                        {comp.similarity}%
                                    </Text>
                                </View>
                            </Animated.View>
                        )
                    })}
                </View>
            )}

            {/* Strengths & Weaknesses */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: T.space.lg }}>
                <Animated.View entering={FadeInDown.delay(100).duration(400)} style={{
                    flex: 1, marginRight: 6, borderRadius: T.radius.md, padding: T.space.lg,
                    ...T.glass.light, borderLeftWidth: 3, borderLeftColor: T.colors.green,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: T.space.sm }}>
                        <Feather name="arrow-up-circle" size={16} color={T.colors.green} style={{ marginRight: 6 }} />
                        <Text style={{ color: T.colors.green, fontSize: T.font.md, fontWeight: '700', fontFamily: T.fonts.body.bold }}>Strengths</Text>
                    </View>
                    {profile.strengths.map((t: TwinTrait) => (
                        <View key={t.id} style={{ marginBottom: T.space.sm }}>
                            <Text style={{ color: T.colors.white, fontSize: T.font.sm, fontWeight: '600', fontFamily: T.fonts.body.semibold }}>
                                 {t.label}
                            </Text>
                            <Text style={{ color: T.colors.muted, fontSize: T.font.xs, marginLeft: 10 }}>
                                {t.description}
                            </Text>
                        </View>
                    ))}
                    {profile.strengths.length === 0 && (
                        <Text style={{ color: T.colors.muted, fontSize: T.font.sm }}>Keep playing to discover your strengths</Text>
                    )}
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(180).duration(400)} style={{
                    flex: 1, marginLeft: 6, borderRadius: T.radius.md, padding: T.space.lg,
                    ...T.glass.light, borderLeftWidth: 3, borderLeftColor: T.colors.red,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: T.space.sm }}>
                        <Feather name="alert-triangle" size={16} color={T.colors.red} style={{ marginRight: 6 }} />
                        <Text style={{ color: T.colors.red, fontSize: T.font.md, fontWeight: '700', fontFamily: T.fonts.body.bold }}>Work On</Text>
                    </View>
                    {profile.weaknesses.map((t: TwinTrait) => (
                        <View key={t.id} style={{ marginBottom: T.space.sm }}>
                            <Text style={{ color: T.colors.white, fontSize: T.font.sm, fontWeight: '600', fontFamily: T.fonts.body.semibold }}>
                                 {t.label}
                            </Text>
                            {t.drillRecommendation && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10, marginTop: 2 }}>
                                    <Feather name="zap" size={10} color={T.colors.orange} style={{ marginRight: 3 }} />
                                    <Text style={{ color: T.colors.orange, fontSize: T.font.xs, flex: 1 }}>
                                        {t.drillRecommendation}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ))}
                    {profile.weaknesses.length === 0 && (
                        <Text style={{ color: T.colors.muted, fontSize: T.font.sm }}>No major weakness found</Text>
                    )}
                </Animated.View>
            </View>

            {/* Comfort Zones */}
            {profile.comfortZones.length > 0 && (
                <Animated.View entering={FadeInDown.duration(400)} style={{ marginBottom: T.space.lg }}>
                    <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '800', fontFamily: T.fonts.display.black, marginBottom: T.space.md, letterSpacing: -0.5 }}>
                        Comfort Zones
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {profile.comfortZones.filter((z: ComfortZone) => z.attempts > 0).map((z: ComfortZone, i: number) => (
                            <View key={i} style={{
                                borderRadius: T.radius.sm, padding: T.space.md, margin: 3,
                                ...(z.isComfort ? T.glass.accent : T.glass.light),
                                ...(z.isComfort ? { borderColor: T.colors.green, borderWidth: 1 } : {}),
                            }}>
                                <Text style={{ color: T.colors.white, fontSize: T.font.sm, fontWeight: '600', fontFamily: T.fonts.body.semibold }}>{z.zone}</Text>
                                <Text style={{ color: z.isComfort ? T.colors.green : T.colors.muted, fontSize: T.font.md, fontWeight: '800', fontFamily: T.fonts.display.bold }}>
                                    {Math.round(z.efficiency)}%
                                </Text>
                                <Text style={{ color: T.colors.dim, fontSize: T.font.xs }}>{z.attempts} shots</Text>
                            </View>
                        ))}
                    </View>
                </Animated.View>
            )}

            {/* Mental Profile */}
            <Animated.View entering={FadeInDown.duration(400)} style={{
                borderRadius: T.radius.lg, padding: T.space.lg, marginBottom: T.space.lg, ...T.glass.medium,
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: T.space.md }}>
                    <Feather name="activity" size={18} color={T.colors.purple} style={{ marginRight: 8 }} />
                    <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '800', fontFamily: T.fonts.display.black, letterSpacing: -0.5 }}>
                        Mental Profile
                    </Text>
                </View>
                <MentalBar label="Resilience" value={profile.mentalProfile.resilience} />
                <MentalBar label="Clutch Factor" value={profile.mentalProfile.clutchFactor} />
                <MentalBar label="Consistency" value={profile.mentalProfile.consistency} />
                <MentalBar label="Fatigue Resist." value={profile.mentalProfile.fatigueResistance} />
                <View style={{
                    flexDirection: 'row', alignItems: 'center', marginTop: T.space.md,
                    paddingTop: T.space.sm, borderTopWidth: 1, borderTopColor: T.colors.border,
                }}>
                    <Text style={{ color: T.colors.muted, fontSize: T.font.sm }}>Under pressure: </Text>
                    <Text style={{
                        color: profile.mentalProfile.pressureResponse === 'thrives' ? T.colors.green
                            : profile.mentalProfile.pressureResponse === 'struggles' ? T.colors.red : T.colors.orange,
                        fontSize: T.font.sm, fontWeight: '700', fontFamily: T.fonts.body.bold,
                    }}>
                        {profile.mentalProfile.pressureResponse === 'thrives' ? 'Thrives'
                            : profile.mentalProfile.pressureResponse === 'struggles' ? 'Struggles' : 'Neutral'}
                    </Text>
                </View>
            </Animated.View>

            {/* AI Insights */}
            {insights && (
                <Animated.View entering={FadeInDown.duration(400)} style={{
                    borderRadius: T.radius.lg, padding: T.space.lg, marginBottom: T.space.lg,
                    ...T.glass.primary, borderLeftWidth: 3, borderLeftColor: T.colors.purple,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: T.space.sm }}>
                        <Feather name="cpu" size={16} color={T.colors.purple} style={{ marginRight: 6 }} />
                        <Text style={{ color: T.colors.purple, fontSize: T.font.md, fontWeight: '700', fontFamily: T.fonts.display.bold }}>
                            AI Analysis
                        </Text>
                    </View>
                    <Text style={{ color: T.colors.white, fontSize: T.font.md, lineHeight: 22 }}>{insights}</Text>
                </Animated.View>
            )}

            {/* Shot Signature */}
            <Animated.View entering={FadeInDown.duration(400)} style={{
                borderRadius: T.radius.lg, padding: T.space.lg, marginBottom: T.space.lg, ...T.glass.medium,
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: T.space.md }}>
                    <Feather name="crosshair" size={18} color={T.colors.accent} style={{ marginRight: 8 }} />
                    <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '800', fontFamily: T.fonts.display.black, letterSpacing: -0.5 }}>
                        Shot Signature
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                    <PoseStatItem label="Elbow Angle" value={`${profile.poseSignature.avgElbowAngle}Â°`} ideal="90-95Â°" />
                    <PoseStatItem label="Release Height" value={`${profile.poseSignature.avgReleaseHeight}`} ideal=">0.88" />
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
        <View style={{ paddingHorizontal: T.space.xl }}>
            {categories.map((cat, catIdx) => (
                <Animated.View
                    key={cat.category}
                    entering={FadeInDown.delay(catIdx * 100).duration(400)}
                    style={{
                        borderRadius: T.radius.lg, padding: T.space.lg, marginBottom: T.space.md,
                        ...T.glass.medium,
                    }}
                >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: T.space.md }}>
                        <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '800', fontFamily: T.fonts.display.black }}>
                            {cat.emoji} {cat.category}
                        </Text>
                        <View style={{
                            backgroundColor: `${T.ratingColor(cat.overallScore)}15`,
                            borderRadius: T.radius.sm, paddingHorizontal: 10, paddingVertical: 3,
                            borderWidth: 1, borderColor: `${T.ratingColor(cat.overallScore)}25`,
                        }}>
                            <Text style={{ color: T.ratingColor(cat.overallScore), fontSize: T.font.xl, fontWeight: '900', fontFamily: T.fonts.display.black }}>
                                {cat.overallScore}
                            </Text>
                        </View>
                    </View>
                    {cat.attributes.map((attr, i) => (
                        <View key={i} style={{ marginBottom: T.space.md }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text style={{ color: T.colors.textSecondary, fontSize: T.font.md }}>{attr.name}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ color: T.ratingColor(attr.value), fontSize: T.font.md, fontWeight: '800', fontFamily: T.fonts.display.bold }}>
                                        {attr.value}
                                    </Text>
                                    {attr.delta !== 0 && (
                                        <Text style={{
                                            color: attr.trend === 'up' ? T.colors.green : attr.trend === 'down' ? T.colors.red : T.colors.muted,
                                            fontSize: T.font.xs, marginLeft: 4, fontWeight: '600',
                                        }}>
                                            {attr.trend === 'up' ? '' : attr.trend === 'down' ? '' : ''}{Math.abs(attr.delta)}
                                        </Text>
                                    )}
                                </View>
                            </View>
                            <View style={{ height: 5, backgroundColor: T.colors.dimmer, borderRadius: 3, overflow: 'hidden' }}>
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
        <View style={{ paddingHorizontal: T.space.xl }}>
            <Animated.View entering={FadeInDown.duration(400)}>
                <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '800', fontFamily: T.fonts.display.black, marginBottom: T.space.xs, letterSpacing: -0.5 }}>
                    Matchup Simulator
                </Text>
                <Text style={{ color: T.colors.textSecondary, fontSize: T.font.sm, marginBottom: T.space.lg }}>
                    Your Twin vs an NBA player. Who wins?
                </Text>
            </Animated.View>

            {/* NBA Player Grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: T.space.lg }}>
                {NBA_PLAYERS_FOR_SIMULATION.map((name, i) => (
                    <Animated.View key={name} entering={FadeInDown.delay(i * 40).duration(300)}>
                        <TouchableOpacity
                            onPress={() => onSimulateNBA(name)}
                            disabled={simulating}
                            activeOpacity={0.7}
                            style={{
                                borderRadius: T.radius.sm, paddingHorizontal: 13, paddingVertical: 9, margin: 3,
                                ...T.glass.light,
                            }}
                        >
                            <Text style={{ color: T.colors.white, fontSize: T.font.sm, fontWeight: '500', fontFamily: T.fonts.body.medium }}>{name}</Text>
                        </TouchableOpacity>
                    </Animated.View>
                ))}
            </View>

            {simulating && (
                <View style={{ alignItems: 'center', padding: 30 }}>
                    <View style={{
                        width: 60, height: 60, borderRadius: 30,
                        ...T.glass.accent, justifyContent: 'center', alignItems: 'center',
                        ...T.glow(T.colors.accent, 0.2),
                    }}>
                        <ActivityIndicator size="large" color={T.colors.accent} />
                    </View>
                    <Text style={{ color: T.colors.textSecondary, marginTop: T.space.md, fontSize: T.font.md }}>
                        Simulating matchup...
                    </Text>
                </View>
            )}

            {/* Simulation Result */}
            {simulation && !simulating && (
                <Animated.View entering={FadeInDown.duration(500)}>
                    {/* Win Probability */}
                    <View style={{
                        borderRadius: T.radius.xl, padding: T.space.xxl, alignItems: 'center', marginBottom: T.space.lg,
                        ...T.glass.medium,
                        borderWidth: 1.5,
                        borderColor: simulation.winProbability >= 50 ? `${T.colors.green}30` : `${T.colors.red}30`,
                        ...T.glow(simulation.winProbability >= 50 ? T.colors.green : T.colors.red, 0.12),
                    }}>
                        <Text style={{ color: T.colors.textSecondary, fontSize: T.font.sm, marginBottom: T.space.xs, fontWeight: '500', fontFamily: T.fonts.body.medium }}>
                            vs {simulation.opponent}
                        </Text>
                        <Text style={{
                            color: simulation.winProbability >= 50 ? T.colors.green : T.colors.red,
                            fontSize: 52, fontWeight: '900', fontFamily: T.fonts.display.black, letterSpacing: -2,
                        }}>
                            {simulation.winProbability}%
                        </Text>
                        <Text style={{ color: T.colors.muted, fontSize: T.font.sm, fontWeight: '500', fontFamily: T.fonts.body.medium }}>Win Probability</Text>

                        <View style={{
                            flexDirection: 'row', marginTop: T.space.lg, alignItems: 'center',
                            backgroundColor: T.colors.dimmer, borderRadius: T.radius.pill,
                            paddingHorizontal: 16, paddingVertical: 8,
                        }}>
                            <Text style={{ color: T.colors.accent, fontSize: T.font.xl, fontWeight: '800', fontFamily: T.fonts.display.bold }}>
                                {simulation.predictedScore.player}
                            </Text>
                            <Text style={{ color: T.colors.dim, fontSize: T.font.md, marginHorizontal: 10, fontWeight: '600', fontFamily: T.fonts.body.semibold }}></Text>
                            <Text style={{ color: T.colors.red, fontSize: T.font.xl, fontWeight: '800', fontFamily: T.fonts.display.bold }}>
                                {simulation.predictedScore.opponent}
                            </Text>
                        </View>
                    </View>

                    {/* Key Matchups */}
                    <View style={{ borderRadius: T.radius.lg, padding: T.space.lg, marginBottom: T.space.md, ...T.glass.medium }}>
                        <Text style={{ color: T.colors.white, fontSize: T.font.md, fontWeight: '700', fontFamily: T.fonts.body.bold, marginBottom: T.space.md }}>
                            Key Matchups
                        </Text>
                        {simulation.keyMatchups.map((km, i) => (
                            <View key={i} style={{
                                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                                marginBottom: T.space.sm, paddingBottom: T.space.sm,
                                borderBottomWidth: i < simulation.keyMatchups.length - 1 ? 1 : 0,
                                borderBottomColor: T.colors.border,
                            }}>
                                <Text style={{ color: T.colors.textSecondary, fontSize: T.font.md }}>{km.area}</Text>
                                <View style={{
                                    borderRadius: T.radius.sm, paddingHorizontal: 10, paddingVertical: 3,
                                    backgroundColor: km.edge === 'player' ? T.colors.greenDim
                                        : km.edge === 'opponent' ? T.colors.redDim : T.colors.orangeDim,
                                }}>
                                    <Text style={{
                                        color: km.edge === 'player' ? T.colors.green
                                            : km.edge === 'opponent' ? T.colors.red : T.colors.orange,
                                        fontSize: T.font.sm, fontWeight: '700', fontFamily: T.fonts.body.bold,
                                    }}>
                                        {km.edge === 'player' ? 'Advantage' : km.edge === 'opponent' ? 'Disadvantage' : 'Even'}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Gameplan */}
                    {simulation.gameplan.length > 0 && (
                        <View style={{
                            borderRadius: T.radius.lg, padding: T.space.lg, marginBottom: T.space.md, ...T.glass.accent,
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: T.space.sm }}>
                                <Feather name="clipboard" size={16} color={T.colors.accent} style={{ marginRight: 6 }} />
                                <Text style={{ color: T.colors.accent, fontSize: T.font.md, fontWeight: '700', fontFamily: T.fonts.display.bold }}>Game Plan</Text>
                            </View>
                            {simulation.gameplan.map((tip, i) => (
                                <Text key={i} style={{ color: T.colors.white, fontSize: T.font.sm, marginBottom: 4, lineHeight: 18 }}>
                                     {tip}
                                </Text>
                            ))}
                        </View>
                    )}

                    {/* Advantages & Vulnerabilities */}
                    <View style={{ flexDirection: 'row', marginBottom: T.space.lg }}>
                        <View style={{
                            flex: 1, marginRight: 5, borderRadius: T.radius.md, padding: T.space.md,
                            ...T.glass.light, borderLeftWidth: 3, borderLeftColor: T.colors.green,
                        }}>
                            <Text style={{ color: T.colors.green, fontSize: T.font.sm, fontWeight: '700', fontFamily: T.fonts.body.bold, marginBottom: T.space.xs }}>
                                Advantages
                            </Text>
                            {simulation.advantages.map((a, i) => (
                                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 3 }}>
                                    <Feather name="check" size={12} color={T.colors.green} style={{ marginRight: 4, marginTop: 2 }} />
                                    <Text style={{ color: T.colors.white, fontSize: T.font.sm, flex: 1 }}>{a}</Text>
                                </View>
                            ))}
                            {simulation.advantages.length === 0 && (
                                <Text style={{ color: T.colors.muted, fontSize: T.font.sm }}>No clear advantage</Text>
                            )}
                        </View>
                        <View style={{
                            flex: 1, marginLeft: 5, borderRadius: T.radius.md, padding: T.space.md,
                            ...T.glass.light, borderLeftWidth: 3, borderLeftColor: T.colors.red,
                        }}>
                            <Text style={{ color: T.colors.red, fontSize: T.font.sm, fontWeight: '700', fontFamily: T.fonts.body.bold, marginBottom: T.space.xs }}>
                                Vulnerabilities
                            </Text>
                            {simulation.vulnerabilities.map((v, i) => (
                                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 3 }}>
                                    <Feather name="alert-circle" size={12} color={T.colors.red} style={{ marginRight: 4, marginTop: 2 }} />
                                    <Text style={{ color: T.colors.white, fontSize: T.font.sm, flex: 1 }}>{v}</Text>
                                </View>
                            ))}
                            {simulation.vulnerabilities.length === 0 && (
                                <Text style={{ color: T.colors.muted, fontSize: T.font.sm }}>No major vulnerability</Text>
                            )}
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={onClear}
                        activeOpacity={0.7}
                        style={{
                            borderRadius: T.radius.md, padding: T.space.md, alignItems: 'center', ...T.glass.light,
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Feather name="refresh-cw" size={14} color={T.colors.accent} style={{ marginRight: 6 }} />
                            <Text style={{ color: T.colors.accent, fontSize: T.font.md, fontWeight: '600', fontFamily: T.fonts.body.semibold }}>
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
            <View style={{ padding: 40, alignItems: 'center' }}>
                <View style={{
                    width: 70, height: 70, borderRadius: 35,
                    ...T.glass.light, justifyContent: 'center', alignItems: 'center',
                }}>
                    <Feather name="trending-up" size={32} color={T.colors.dim} />
                </View>
                <Text style={{
                    color: T.colors.textSecondary, fontSize: T.font.md,
                    marginTop: T.space.lg, textAlign: 'center', lineHeight: 22,
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
        <View style={{ paddingHorizontal: T.space.xl }}>
            <Animated.View entering={FadeInDown.duration(400)}>
                <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '800', fontFamily: T.fonts.display.black, marginBottom: T.space.lg, letterSpacing: -0.5 }}>
                    Growth
                </Text>
            </Animated.View>

            {/* Mini bar chart */}
            <Animated.View entering={FadeInDown.delay(100).duration(500)} style={{
                borderRadius: T.radius.lg, padding: T.space.lg, marginBottom: T.space.lg, ...T.glass.medium,
            }}>
                <Text style={{ color: T.colors.textSecondary, fontSize: T.font.sm, marginBottom: T.space.md }}>
                    Overall rating per session
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: chartHeight, justifyContent: 'center' }}>
                    {evolution.map((point, i) => {
                        const h = (point.overallRating / maxRating) * chartHeight
                        return (
                            <View key={i} style={{ alignItems: 'center', marginHorizontal: 2 }}>
                                <Text style={{ color: T.colors.muted, fontSize: 8, marginBottom: 3, fontWeight: '600', fontFamily: T.fonts.display.semibold }}>
                                    {point.overallRating}
                                </Text>
                                <View style={{
                                    width: barWidth, height: h, borderRadius: 4,
                                    backgroundColor: T.ratingColor(point.overallRating),
                                    ...T.shadow(T.ratingColor(point.overallRating), 0.2, 4),
                                }} />
                                <Text style={{
                                    color: T.colors.dim, fontSize: 7, marginTop: 4,
                                    transform: [{ rotate: '-45deg' }], fontWeight: '500',
                                }}>
                                    {point.date.slice(5)}
                                </Text>
                            </View>
                        )
                    })}
                </View>
            </Animated.View>

            {/* Session Breakdown */}
            <Animated.View entering={FadeInDown.delay(200).duration(500)} style={{
                borderRadius: T.radius.lg, padding: T.space.lg, marginBottom: T.space.lg, ...T.glass.medium,
            }}>
                <Text style={{ color: T.colors.white, fontSize: T.font.md, fontWeight: '700', fontFamily: T.fonts.body.bold, marginBottom: T.space.md }}>
                    Recent Sessions
                </Text>
                {evolution.slice(-5).reverse().map((point, i) => (
                    <View key={i} style={{
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        paddingVertical: T.space.sm,
                        borderBottomWidth: i < 4 ? 1 : 0, borderBottomColor: T.colors.border,
                    }}>
                        <Text style={{ color: T.colors.muted, fontSize: T.font.sm }}>{point.date}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MiniStat icon="target" value={point.shootingRating} />
                            <MiniStat icon="activity" value={point.mentalRating} />
                            <MiniStat icon="zap" value={point.physicalRating} />
                            <View style={{
                                backgroundColor: `${T.ratingColor(point.overallRating)}20`,
                                borderRadius: T.radius.sm, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 6,
                                borderWidth: 1, borderColor: `${T.ratingColor(point.overallRating)}30`,
                            }}>
                                <Text style={{ color: T.ratingColor(point.overallRating), fontSize: T.font.sm, fontWeight: '800', fontFamily: T.fonts.display.bold }}>
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
        <View style={{ marginBottom: T.space.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                <Text style={{ color: T.colors.textSecondary, fontSize: T.font.sm }}>{label}</Text>
                <Text style={{ color: T.ratingColor(value), fontSize: T.font.sm, fontWeight: '800', fontFamily: T.fonts.display.bold }}>{value}</Text>
            </View>
            <View style={{ height: 5, backgroundColor: T.colors.dimmer, borderRadius: 3, overflow: 'hidden' }}>
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
            <Text style={{ color: T.colors.muted, fontSize: T.font.xs }}>{label}</Text>
            <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '800', fontFamily: T.fonts.display.bold, marginVertical: 3 }}>{value}</Text>
            {ideal && (
                <View style={{ backgroundColor: T.colors.accentDim, borderRadius: T.radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ color: T.colors.accent, fontSize: T.font.xs }}>Ideal: {ideal}</Text>
                </View>
            )}
        </View>
    )
}

function MiniStat({ icon, value }: { icon: keyof typeof Feather.glyphMap; value: number }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 4 }}>
            <Feather name={icon} size={10} color={T.colors.dim} style={{ marginRight: 2 }} />
            <Text style={{ color: T.colors.muted, fontSize: T.font.sm, fontWeight: '500', fontFamily: T.fonts.body.medium }}>{value}</Text>
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
