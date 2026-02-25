import { View, Text, ScrollView, TouchableOpacity, Animated, Dimensions, ActivityIndicator, Modal, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { FontAwesome5, Foundation, Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons'
import { useDigitalTwin } from '../../hooks/useDigitalTwin'
import { useViralShare } from '../../hooks/useViralShare'
import { ShareButton, ShareModal, TwinCard } from '../../components/ShareCard'
import type { TwinCardData } from '../../hooks/useViralShare'
import type { TwinTab, TwinAttributeCategory, TwinTrait, NBAComparison, ComfortZone, TwinEvolutionPoint, MatchupSimulation } from '../../hooks/useDigitalTwin'
import { T } from '../../lib/theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// ==========================================
// Labels & Emojis de style
// ==========================================
const STYLE_EMOJIS: Record<string, string> = {
    sharpshooter: '🎯', shot_creator: '🪄', slasher: '⚡', playmaker: '🧠',
    two_way: '🛡️', stretch_big: '🏗️', paint_beast: '💥', balanced: '♾️',
}
const STYLE_LABELS: Record<string, string> = {
    sharpshooter: 'Sharpshooter', shot_creator: 'Shot Creator', slasher: 'Slasher',
    playmaker: 'Playmaker', two_way: 'Two-Way', stretch_big: 'Stretch Big',
    paint_beast: 'Paint Beast', balanced: 'Balanced',
}
const NBA_PLAYERS_FOR_SIMULATION = [
    'Stephen Curry', 'LeBron James', 'Kevin Durant', 'Giannis Antetokounmpo',
    'Luka Dončić', 'Kawhi Leonard', 'Ja Morant', 'Klay Thompson',
    'Kyrie Irving', 'Karl-Anthony Towns',
]

// ==========================================
// Composant Principal
// ==========================================
export default function DigitalTwin() {
    const twin = useDigitalTwin()
    const viralShare = useViralShare()
    const pulseAnim = useRef(new Animated.Value(1)).current
    const fadeAnim = useRef(new Animated.Value(0)).current
    const ringAnim = useRef(new Animated.Value(0)).current
    const [showSimModal, setShowSimModal] = useState(false)
    const [selectedNBA, setSelectedNBA] = useState<string | null>(null)
    const [showShareModal, setShowShareModal] = useState(false)

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
            ])
        ).start()
        Animated.loop(
            Animated.timing(ringAnim, { toValue: 1, duration: 6000, useNativeDriver: true })
        ).start()
    }, [])

    useEffect(() => {
        if (!twin.loading) {
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start()
        }
    }, [twin.loading])

    // ======= Loading =======
    if (twin.loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.bg, justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, ...T.glass.accent, justifyContent: 'center', alignItems: 'center', ...T.glow(T.colors.accent, 0.3) }}>
                    <ActivityIndicator size="large" color={T.colors.accent} />
                </View>
                <Text style={{ color: T.colors.textSecondary, marginTop: T.space.xl, fontSize: T.font.md, fontWeight: '500' }}>
                    Construction du Digital Twin...
                </Text>
                <Text style={{ color: T.colors.muted, marginTop: T.space.sm, fontSize: T.font.sm }}>
                    Analyse IA en cours
                </Text>
            </SafeAreaView>
        )
    }

    // ======= Error / No profile =======
    if (twin.error || !twin.profile) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.bg, justifyContent: 'center', alignItems: 'center', padding: 30 }}>
                <View style={{
                    width: 120, height: 120, borderRadius: 60,
                    ...T.glass.accent, justifyContent: 'center', alignItems: 'center',
                    ...T.glow(T.colors.accent, 0.15),
                }}>
                    <FontAwesome5 name="user-astronaut" size={48} color={T.colors.accent} style={{ opacity: 0.6 }} />
                </View>
                <Text style={{ color: T.colors.white, fontSize: T.font.xl, fontWeight: '800', marginTop: T.space.xxl, textAlign: 'center', letterSpacing: -0.5 }}>
                    Ton Digital Twin est en{'\n'}construction
                </Text>
                <Text style={{ color: T.colors.textSecondary, fontSize: T.font.md, textAlign: 'center', marginTop: T.space.md, lineHeight: 22 }}>
                    {twin.error ?? 'Analyse au moins une session vidéo pour créer ton avatar IA.'}
                </Text>
                <TouchableOpacity
                    onPress={twin.rebuild}
                    activeOpacity={0.8}
                    style={{
                        marginTop: T.space.xxl, borderRadius: T.radius.xl,
                        paddingHorizontal: 36, paddingVertical: 16,
                        ...T.glass.accent, ...T.glow(T.colors.accent, 0.25),
                    }}
                >
                    <Text style={{ color: T.colors.accent, fontWeight: '700', fontSize: T.font.base }}>
                        {twin.rebuilding ? 'Construction...' : '🔄 Construire mon Twin'}
                    </Text>
                </TouchableOpacity>
            </SafeAreaView>
        )
    }

    const p = twin.profile

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.bg }}>
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <ScrollView contentContainerStyle={{ paddingBottom: 50 }} showsVerticalScrollIndicator={false}>

                    {/* ======= Header ======= */}
                    <View style={{ paddingHorizontal: T.space.xl, paddingTop: T.space.lg, paddingBottom: 0 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View>
                                <Text style={{ color: T.colors.white, fontSize: T.font.xxl, fontWeight: '800', letterSpacing: -1 }}>
                                    Digital Twin
                                </Text>
                                <Text style={{ color: T.colors.muted, fontSize: T.font.sm, marginTop: 2 }}>
                                    Modèle {p.modelVersion} • {p.sessionCount} sessions
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <TouchableOpacity
                                    onPress={twin.rebuild}
                                    disabled={twin.rebuilding}
                                    style={{ width: 40, height: 40, borderRadius: 20, ...T.glass.light, justifyContent: 'center', alignItems: 'center' }}
                                >
                                    {twin.rebuilding
                                        ? <ActivityIndicator size="small" color={T.colors.accent} />
                                        : <Ionicons name="refresh" size={18} color={T.colors.accent} />
                                    }
                                </TouchableOpacity>
                                <ShareButton onPress={() => setShowShareModal(true)} compact />
                            </View>
                        </View>
                    </View>

                    {/* ======= Overall Rating Hero ======= */}
                    <View style={{ alignItems: 'center', marginTop: 28, marginBottom: 8, position: 'relative' }}>
                        {/* Orbital ring */}
                        <Animated.View style={{
                            position: 'absolute', width: 150, height: 150, borderRadius: 75,
                            borderWidth: 1.5, borderColor: 'rgba(0,229,255,0.12)',
                            borderTopColor: T.colors.accent,
                            transform: [{ rotate: ringAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
                        }} />
                        {/* Outer glow ring */}
                        <View style={{
                            position: 'absolute', width: 140, height: 140, borderRadius: 70,
                            backgroundColor: 'transparent',
                            borderWidth: 1, borderColor: 'rgba(0,229,255,0.06)',
                        }} />
                        <Animated.View style={{
                            transform: [{ scale: pulseAnim }],
                            width: 120, height: 120, borderRadius: 60,
                            backgroundColor: T.colors.card,
                            justifyContent: 'center', alignItems: 'center',
                            ...T.glow(T.ratingColor(p.overallRating), 0.4),
                            borderWidth: 2, borderColor: `${T.ratingColor(p.overallRating)}40`,
                        }}>
                            <Text style={{ color: T.ratingColor(p.overallRating), fontSize: 42, fontWeight: '900', letterSpacing: -2 }}>
                                {p.overallRating}
                            </Text>
                            <Text style={{ color: T.colors.muted, fontSize: T.font.xs, fontWeight: '700', letterSpacing: 2 }}>
                                OVERALL
                            </Text>
                        </Animated.View>
                    </View>

                    {/* ======= Play Style Badge ======= */}
                    <View style={{ alignItems: 'center', marginTop: T.space.lg, marginBottom: T.space.lg }}>
                        <View style={{
                            borderRadius: T.radius.pill, paddingHorizontal: 20, paddingVertical: 10,
                            flexDirection: 'row', alignItems: 'center',
                            ...T.glass.accent,
                        }}>
                            <Text style={{ fontSize: 20, marginRight: 8 }}>{STYLE_EMOJIS[p.playStyle.primary] ?? '🏀'}</Text>
                            <Text style={{ color: T.colors.accent, fontSize: T.font.base, fontWeight: '700' }}>
                                {STYLE_LABELS[p.playStyle.primary] ?? p.playStyle.primary}
                            </Text>
                            {p.playStyle.secondary && (
                                <Text style={{ color: T.colors.muted, fontSize: T.font.sm, marginLeft: 8 }}>
                                    / {STYLE_LABELS[p.playStyle.secondary] ?? p.playStyle.secondary}
                                </Text>
                            )}
                        </View>
                        <Text style={{ color: T.colors.textSecondary, fontSize: T.font.sm, marginTop: T.space.sm, textAlign: 'center', paddingHorizontal: 40, lineHeight: 18 }}>
                            {p.playStyle.description}
                        </Text>
                        <View style={{
                            marginTop: T.space.sm, flexDirection: 'row', alignItems: 'center',
                            backgroundColor: T.colors.primaryDim, borderRadius: T.radius.pill,
                            paddingHorizontal: 12, paddingVertical: 4,
                        }}>
                            <Text style={{ color: T.colors.primary, fontSize: T.font.sm, fontWeight: '600' }}>
                                Archétype NBA : {p.playStyle.nbaArchetype}
                            </Text>
                        </View>
                    </View>

                    {/* ======= Tab Bar (Premium Glassmorphism) ======= */}
                    <View style={{
                        flexDirection: 'row', marginHorizontal: T.space.xl, marginBottom: T.space.lg,
                        borderRadius: T.radius.md, padding: 3,
                        ...T.glass.light,
                    }}>
                        {(['overview', 'attributes', 'matchup', 'evolution'] as TwinTab[]).map(tab => {
                            const isActive = twin.activeTab === tab
                            return (
                                <TouchableOpacity
                                    key={tab}
                                    onPress={() => twin.setActiveTab(tab)}
                                    activeOpacity={0.7}
                                    style={{
                                        flex: 1, paddingVertical: 10, borderRadius: T.radius.sm, alignItems: 'center',
                                        backgroundColor: isActive ? T.colors.accent : 'transparent',
                                        ...(isActive ? T.shadow(T.colors.accent, 0.3, 8) : {}),
                                    }}
                                >
                                    <Text style={{
                                        color: isActive ? T.colors.bg : T.colors.muted,
                                        fontSize: T.font.xs, fontWeight: isActive ? '800' : '500',
                                    }}>
                                        {tab === 'overview' ? '🏀 ADN' : tab === 'attributes' ? '📊 Stats' : tab === 'matchup' ? '⚔️ Match' : '📈 Évol.'}
                                    </Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>

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
                    <View style={{
                        marginHorizontal: T.space.xl, marginTop: T.space.md, marginBottom: T.space.md,
                        borderRadius: T.radius.lg, padding: T.space.lg,
                        flexDirection: 'row', alignItems: 'center',
                        ...T.glass.accent, ...T.glow(T.colors.accent, 0.06),
                    }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: T.colors.white, fontSize: T.font.md, fontWeight: '700' }}>
                                🔥 Partage ta Twin Card
                            </Text>
                            <Text style={{ color: T.colors.textSecondary, fontSize: T.font.sm, marginTop: 3 }}>
                                Montre ton profil sur TikTok ou Instagram • +10 XP
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
                            <Text style={{ color: T.colors.bg, fontSize: T.font.sm, fontWeight: '800' }}>Partager</Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>

                {/* ======= Share Modal ======= */}
                <ShareModal
                    visible={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    onShare={async (platform) => {
                        await viralShare.shareTwinCard(platform)
                        setShowShareModal(false)
                    }}
                    sharing={viralShare.sharing}
                    cardData={buildTwinCardForShare(p)}
                    shareType="twin_card"
                />
            </Animated.View>
        </SafeAreaView>
    )
}

// ==========================================
// Tab: Overview (ADN du joueur)
// ==========================================
function OverviewTab({ profile, insights }: { profile: any; insights: string | null }) {
    return (
        <View style={{ paddingHorizontal: T.space.xl }}>
            {/* Category Summary Cards */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: T.space.lg }}>
                {profile.attributeCategories.map((cat: TwinAttributeCategory) => (
                    <View key={cat.category} style={{
                        width: (SCREEN_WIDTH - 50) / 2,
                        borderRadius: T.radius.lg, padding: T.space.lg, marginBottom: T.space.md,
                        ...T.glass.medium,
                    }}>
                        <Text style={{ fontSize: T.font.md, marginBottom: T.space.xs }}>
                            {cat.emoji} <Text style={{ color: T.colors.white, fontWeight: '600' }}>{cat.category}</Text>
                        </Text>
                        <Text style={{ color: T.ratingColor(cat.overallScore), fontSize: 30, fontWeight: '900', letterSpacing: -1 }}>
                            {cat.overallScore}
                        </Text>
                        <View style={{ height: 4, backgroundColor: T.colors.dim, borderRadius: 2, marginTop: T.space.sm }}>
                            <View style={{
                                height: 4, borderRadius: 2,
                                backgroundColor: T.ratingColor(cat.overallScore),
                                width: `${cat.overallScore}%`,
                                ...T.shadow(T.ratingColor(cat.overallScore), 0.4, 6),
                            }} />
                        </View>
                    </View>
                ))}
            </View>

            {/* NBA Comparisons */}
            {profile.nbaComparisons.length > 0 && (
                <View style={{ marginBottom: T.space.lg }}>
                    <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '800', marginBottom: T.space.md, letterSpacing: -0.5 }}>
                        🏀 Comparaisons NBA
                    </Text>
                    {profile.nbaComparisons.map((comp: NBAComparison, i: number) => {
                        const accentColor = i === 0 ? T.colors.gold : i === 1 ? T.colors.accent : T.colors.muted
                        return (
                            <View key={i} style={{
                                borderRadius: T.radius.md, padding: T.space.lg, marginBottom: T.space.sm,
                                flexDirection: 'row', alignItems: 'center',
                                ...T.glass.light,
                                borderLeftWidth: 3, borderLeftColor: accentColor,
                            }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: T.colors.white, fontSize: T.font.base, fontWeight: '700' }}>{comp.playerName}</Text>
                                    <Text style={{ color: T.colors.muted, fontSize: T.font.sm, marginTop: 2 }}>
                                        {comp.matchingTraits.join(' • ')}
                                    </Text>
                                </View>
                                <View style={{
                                    backgroundColor: `${T.ratingColor(comp.similarity)}20`,
                                    borderRadius: T.radius.sm, paddingHorizontal: 12, paddingVertical: 5,
                                    borderWidth: 1, borderColor: `${T.ratingColor(comp.similarity)}30`,
                                }}>
                                    <Text style={{ color: T.ratingColor(comp.similarity), fontSize: T.font.md, fontWeight: '800' }}>
                                        {comp.similarity}%
                                    </Text>
                                </View>
                            </View>
                        )
                    })}
                </View>
            )}

            {/* Strengths & Weaknesses */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: T.space.lg }}>
                <View style={{ flex: 1, marginRight: 6, borderRadius: T.radius.md, padding: T.space.lg, ...T.glass.light, borderLeftWidth: 3, borderLeftColor: T.colors.green }}>
                    <Text style={{ color: T.colors.green, fontSize: T.font.md, fontWeight: '700', marginBottom: T.space.sm }}>💪 Forces</Text>
                    {profile.strengths.map((t: TwinTrait) => (
                        <View key={t.id} style={{ marginBottom: T.space.sm }}>
                            <Text style={{ color: T.colors.white, fontSize: T.font.sm, fontWeight: '600' }}>• {t.label}</Text>
                            <Text style={{ color: T.colors.muted, fontSize: T.font.xs, marginLeft: 10 }}>{t.description}</Text>
                        </View>
                    ))}
                    {profile.strengths.length === 0 && (
                        <Text style={{ color: T.colors.muted, fontSize: T.font.sm }}>Continue à jouer pour découvrir tes forces</Text>
                    )}
                </View>
                <View style={{ flex: 1, marginLeft: 6, borderRadius: T.radius.md, padding: T.space.lg, ...T.glass.light, borderLeftWidth: 3, borderLeftColor: T.colors.red }}>
                    <Text style={{ color: T.colors.red, fontSize: T.font.md, fontWeight: '700', marginBottom: T.space.sm }}>⚠️ À Travailler</Text>
                    {profile.weaknesses.map((t: TwinTrait) => (
                        <View key={t.id} style={{ marginBottom: T.space.sm }}>
                            <Text style={{ color: T.colors.white, fontSize: T.font.sm, fontWeight: '600' }}>• {t.label}</Text>
                            {t.drillRecommendation && (
                                <Text style={{ color: T.colors.orange, fontSize: T.font.xs, marginLeft: 10 }}>💡 {t.drillRecommendation}</Text>
                            )}
                        </View>
                    ))}
                    {profile.weaknesses.length === 0 && (
                        <Text style={{ color: T.colors.muted, fontSize: T.font.sm }}>Pas de faiblesse majeure 🔥</Text>
                    )}
                </View>
            </View>

            {/* Comfort Zones */}
            {profile.comfortZones.length > 0 && (
                <View style={{ marginBottom: T.space.lg }}>
                    <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '800', marginBottom: T.space.md, letterSpacing: -0.5 }}>
                        🗺️ Zones de Confort
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {profile.comfortZones.filter((z: ComfortZone) => z.attempts > 0).map((z: ComfortZone, i: number) => (
                            <View key={i} style={{
                                borderRadius: T.radius.sm, padding: T.space.md, margin: 3,
                                ...(z.isComfort ? T.glass.accent : T.glass.light),
                                ...(z.isComfort ? { borderColor: T.colors.green, borderWidth: 1 } : {}),
                            }}>
                                <Text style={{ color: T.colors.white, fontSize: T.font.sm, fontWeight: '600' }}>{z.zone}</Text>
                                <Text style={{ color: z.isComfort ? T.colors.green : T.colors.muted, fontSize: T.font.md, fontWeight: '800' }}>
                                    {Math.round(z.efficiency)}%
                                </Text>
                                <Text style={{ color: T.colors.dim, fontSize: T.font.xs }}>{z.attempts} tirs</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Mental Profile */}
            <View style={{ borderRadius: T.radius.lg, padding: T.space.lg, marginBottom: T.space.lg, ...T.glass.medium }}>
                <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '800', marginBottom: T.space.md, letterSpacing: -0.5 }}>
                    🧠 Profil Mental
                </Text>
                <MentalBar label="Résilience" value={profile.mentalProfile.resilience} />
                <MentalBar label="Clutch" value={profile.mentalProfile.clutchFactor} />
                <MentalBar label="Régularité" value={profile.mentalProfile.consistency} />
                <MentalBar label="Résist. fatigue" value={profile.mentalProfile.fatigueResistance} />
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: T.space.md, paddingTop: T.space.sm, borderTopWidth: 1, borderTopColor: T.colors.border }}>
                    <Text style={{ color: T.colors.muted, fontSize: T.font.sm }}>Sous pression : </Text>
                    <Text style={{
                        color: profile.mentalProfile.pressureResponse === 'thrives' ? T.colors.green
                            : profile.mentalProfile.pressureResponse === 'struggles' ? T.colors.red : T.colors.orange,
                        fontSize: T.font.sm, fontWeight: '700'
                    }}>
                        {profile.mentalProfile.pressureResponse === 'thrives' ? '🔥 S\'épanouit'
                            : profile.mentalProfile.pressureResponse === 'struggles' ? '😰 En difficulté' : '😐 Neutre'}
                    </Text>
                </View>
            </View>

            {/* IA Insights */}
            {insights && (
                <View style={{
                    borderRadius: T.radius.lg, padding: T.space.lg, marginBottom: T.space.lg,
                    ...T.glass.primary, borderLeftWidth: 3, borderLeftColor: T.colors.purple,
                }}>
                    <Text style={{ color: T.colors.purple, fontSize: T.font.md, fontWeight: '700', marginBottom: T.space.sm }}>
                        🤖 Analyse IA
                    </Text>
                    <Text style={{ color: T.colors.white, fontSize: T.font.md, lineHeight: 22 }}>{insights}</Text>
                </View>
            )}

            {/* Pose Signature */}
            <View style={{ borderRadius: T.radius.lg, padding: T.space.lg, marginBottom: T.space.lg, ...T.glass.medium }}>
                <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '800', marginBottom: T.space.md, letterSpacing: -0.5 }}>
                    📐 Signature de Tir
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                    <PoseStatItem label="Angle coude" value={`${profile.poseSignature.avgElbowAngle}°`} ideal="90-95°" />
                    <PoseStatItem label="Release height" value={`${profile.poseSignature.avgReleaseHeight}`} ideal=">0.88" />
                    <PoseStatItem label="Main" value={profile.poseSignature.dominantHand === 'right' ? '🤚 Droite' : '✋ Gauche'} />
                </View>
            </View>
        </View>
    )
}

// ==========================================
// Tab: Attributes (stats détaillées)
// ==========================================
function AttributesTab({ categories }: { categories: TwinAttributeCategory[] }) {
    return (
        <View style={{ paddingHorizontal: T.space.xl }}>
            {categories.map(cat => (
                <View key={cat.category} style={{
                    borderRadius: T.radius.lg, padding: T.space.lg, marginBottom: T.space.md,
                    ...T.glass.medium,
                }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: T.space.md }}>
                        <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '800' }}>
                            {cat.emoji} {cat.category}
                        </Text>
                        <View style={{
                            backgroundColor: `${T.ratingColor(cat.overallScore)}15`,
                            borderRadius: T.radius.sm, paddingHorizontal: 10, paddingVertical: 3,
                            borderWidth: 1, borderColor: `${T.ratingColor(cat.overallScore)}25`,
                        }}>
                            <Text style={{ color: T.ratingColor(cat.overallScore), fontSize: T.font.xl, fontWeight: '900' }}>{cat.overallScore}</Text>
                        </View>
                    </View>
                    {cat.attributes.map((attr, i) => (
                        <View key={i} style={{ marginBottom: T.space.md }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text style={{ color: T.colors.textSecondary, fontSize: T.font.md }}>{attr.name}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ color: T.ratingColor(attr.value), fontSize: T.font.md, fontWeight: '800' }}>{attr.value}</Text>
                                    {attr.delta !== 0 && (
                                        <Text style={{
                                            color: attr.trend === 'up' ? T.colors.green : attr.trend === 'down' ? T.colors.red : T.colors.muted,
                                            fontSize: T.font.xs, marginLeft: 4, fontWeight: '600',
                                        }}>
                                            {attr.trend === 'up' ? '▲' : attr.trend === 'down' ? '▼' : '—'}{Math.abs(attr.delta)}
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
                </View>
            ))}
        </View>
    )
}

// ==========================================
// Tab: Matchup (simulateur)
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
            <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '800', marginBottom: T.space.xs, letterSpacing: -0.5 }}>
                ⚔️ Simulateur de Match-Up
            </Text>
            <Text style={{ color: T.colors.textSecondary, fontSize: T.font.sm, marginBottom: T.space.lg }}>
                Ton Twin vs un joueur NBA. Qui gagne ?
            </Text>

            {/* NBA Player Grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: T.space.lg }}>
                {NBA_PLAYERS_FOR_SIMULATION.map(name => (
                    <TouchableOpacity
                        key={name}
                        onPress={() => onSimulateNBA(name)}
                        disabled={simulating}
                        activeOpacity={0.7}
                        style={{
                            borderRadius: T.radius.sm, paddingHorizontal: 13, paddingVertical: 9, margin: 3,
                            ...T.glass.light,
                        }}
                    >
                        <Text style={{ color: T.colors.white, fontSize: T.font.sm, fontWeight: '500' }}>{name}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {simulating && (
                <View style={{ alignItems: 'center', padding: 30 }}>
                    <View style={{ width: 60, height: 60, borderRadius: 30, ...T.glass.accent, justifyContent: 'center', alignItems: 'center', ...T.glow(T.colors.accent, 0.2) }}>
                        <ActivityIndicator size="large" color={T.colors.accent} />
                    </View>
                    <Text style={{ color: T.colors.textSecondary, marginTop: T.space.md, fontSize: T.font.md }}>Simulation en cours...</Text>
                </View>
            )}

            {/* Simulation Result */}
            {simulation && !simulating && (
                <View>
                    {/* Win Probability */}
                    <View style={{
                        borderRadius: T.radius.xl, padding: T.space.xxl, alignItems: 'center', marginBottom: T.space.lg,
                        ...T.glass.medium,
                        borderWidth: 1.5,
                        borderColor: simulation.winProbability >= 50 ? `${T.colors.green}30` : `${T.colors.red}30`,
                        ...T.glow(simulation.winProbability >= 50 ? T.colors.green : T.colors.red, 0.12),
                    }}>
                        <Text style={{ color: T.colors.textSecondary, fontSize: T.font.sm, marginBottom: T.space.xs, fontWeight: '500' }}>
                            vs {simulation.opponent}
                        </Text>
                        <Text style={{
                            color: simulation.winProbability >= 50 ? T.colors.green : T.colors.red,
                            fontSize: 52, fontWeight: '900', letterSpacing: -2,
                        }}>
                            {simulation.winProbability}%
                        </Text>
                        <Text style={{ color: T.colors.muted, fontSize: T.font.sm, fontWeight: '500' }}>Probabilité de victoire</Text>

                        <View style={{
                            flexDirection: 'row', marginTop: T.space.lg, alignItems: 'center',
                            backgroundColor: T.colors.dimmer, borderRadius: T.radius.pill, paddingHorizontal: 16, paddingVertical: 8,
                        }}>
                            <Text style={{ color: T.colors.accent, fontSize: T.font.xl, fontWeight: '800' }}>{simulation.predictedScore.player}</Text>
                            <Text style={{ color: T.colors.dim, fontSize: T.font.md, marginHorizontal: 10, fontWeight: '600' }}>—</Text>
                            <Text style={{ color: T.colors.red, fontSize: T.font.xl, fontWeight: '800' }}>{simulation.predictedScore.opponent}</Text>
                        </View>
                    </View>

                    {/* Key Matchups */}
                    <View style={{ borderRadius: T.radius.lg, padding: T.space.lg, marginBottom: T.space.md, ...T.glass.medium }}>
                        <Text style={{ color: T.colors.white, fontSize: T.font.md, fontWeight: '700', marginBottom: T.space.md }}>Matchups clés</Text>
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
                                    backgroundColor: km.edge === 'player' ? T.colors.greenDim : km.edge === 'opponent' ? T.colors.redDim : T.colors.orangeDim,
                                }}>
                                    <Text style={{
                                        color: km.edge === 'player' ? T.colors.green : km.edge === 'opponent' ? T.colors.red : T.colors.orange,
                                        fontSize: T.font.sm, fontWeight: '700',
                                    }}>
                                        {km.edge === 'player' ? '✅ Avantage' : km.edge === 'opponent' ? '❌ Désavantage' : '🟰 Égal'}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Gameplan */}
                    {simulation.gameplan.length > 0 && (
                        <View style={{ borderRadius: T.radius.lg, padding: T.space.lg, marginBottom: T.space.md, ...T.glass.accent }}>
                            <Text style={{ color: T.colors.accent, fontSize: T.font.md, fontWeight: '700', marginBottom: T.space.sm }}>📋 Plan de Jeu</Text>
                            {simulation.gameplan.map((tip, i) => (
                                <Text key={i} style={{ color: T.colors.white, fontSize: T.font.sm, marginBottom: 4, lineHeight: 18 }}>• {tip}</Text>
                            ))}
                        </View>
                    )}

                    {/* Advantages & Vulnerabilities */}
                    <View style={{ flexDirection: 'row', marginBottom: T.space.lg }}>
                        <View style={{
                            flex: 1, marginRight: 5, borderRadius: T.radius.md, padding: T.space.md,
                            ...T.glass.light, borderLeftWidth: 3, borderLeftColor: T.colors.green,
                        }}>
                            <Text style={{ color: T.colors.green, fontSize: T.font.sm, fontWeight: '700', marginBottom: T.space.xs }}>Avantages</Text>
                            {simulation.advantages.map((a, i) => (
                                <Text key={i} style={{ color: T.colors.white, fontSize: T.font.sm, marginBottom: 2 }}>✅ {a}</Text>
                            ))}
                            {simulation.advantages.length === 0 && (
                                <Text style={{ color: T.colors.muted, fontSize: T.font.sm }}>Aucun avantage clair</Text>
                            )}
                        </View>
                        <View style={{
                            flex: 1, marginLeft: 5, borderRadius: T.radius.md, padding: T.space.md,
                            ...T.glass.light, borderLeftWidth: 3, borderLeftColor: T.colors.red,
                        }}>
                            <Text style={{ color: T.colors.red, fontSize: T.font.sm, fontWeight: '700', marginBottom: T.space.xs }}>Vulnérabilités</Text>
                            {simulation.vulnerabilities.map((v, i) => (
                                <Text key={i} style={{ color: T.colors.white, fontSize: T.font.sm, marginBottom: 2 }}>⚠️ {v}</Text>
                            ))}
                            {simulation.vulnerabilities.length === 0 && (
                                <Text style={{ color: T.colors.muted, fontSize: T.font.sm }}>Aucune vulnérabilité majeure</Text>
                            )}
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={onClear}
                        activeOpacity={0.7}
                        style={{
                            borderRadius: T.radius.md, padding: T.space.md, alignItems: 'center',
                            ...T.glass.light,
                        }}
                    >
                        <Text style={{ color: T.colors.accent, fontSize: T.font.md, fontWeight: '600' }}>🔄 Nouvelle simulation</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    )
}

// ==========================================
// Tab: Evolution (graphique d'évolution)
// ==========================================
function EvolutionTab({ evolution }: { evolution: TwinEvolutionPoint[] }) {
    if (evolution.length === 0) {
        return (
            <View style={{ padding: 40, alignItems: 'center' }}>
                <View style={{ width: 70, height: 70, borderRadius: 35, ...T.glass.light, justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="trending-up" size={32} color={T.colors.muted} />
                </View>
                <Text style={{ color: T.colors.textSecondary, fontSize: T.font.md, marginTop: T.space.lg, textAlign: 'center', lineHeight: 22 }}>
                    Pas encore assez de données.{'\n'}Continue à jouer pour voir ton évolution !
                </Text>
            </View>
        )
    }

    const maxRating = Math.max(...evolution.map(e => e.overallRating), 100)
    const chartHeight = 160
    const barWidth = Math.min((SCREEN_WIDTH - 80) / evolution.length, 28)

    return (
        <View style={{ paddingHorizontal: T.space.xl }}>
            <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '800', marginBottom: T.space.lg, letterSpacing: -0.5 }}>
                📈 Évolution
            </Text>

            {/* Mini bar chart */}
            <View style={{ borderRadius: T.radius.lg, padding: T.space.lg, marginBottom: T.space.lg, ...T.glass.medium }}>
                <Text style={{ color: T.colors.textSecondary, fontSize: T.font.sm, marginBottom: T.space.md }}>Note globale par session</Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: chartHeight, justifyContent: 'center' }}>
                    {evolution.map((point, i) => {
                        const h = (point.overallRating / maxRating) * chartHeight
                        return (
                            <View key={i} style={{ alignItems: 'center', marginHorizontal: 2 }}>
                                <Text style={{ color: T.colors.muted, fontSize: 8, marginBottom: 3, fontWeight: '600' }}>{point.overallRating}</Text>
                                <View style={{
                                    width: barWidth, height: h, borderRadius: 4,
                                    backgroundColor: T.ratingColor(point.overallRating),
                                    ...T.shadow(T.ratingColor(point.overallRating), 0.2, 4),
                                }} />
                                <Text style={{ color: T.colors.dim, fontSize: 7, marginTop: 4, transform: [{ rotate: '-45deg' }], fontWeight: '500' }}>
                                    {point.date.slice(5)}
                                </Text>
                            </View>
                        )
                    })}
                </View>
            </View>

            {/* Breakdown over time */}
            <View style={{ borderRadius: T.radius.lg, padding: T.space.lg, marginBottom: T.space.lg, ...T.glass.medium }}>
                <Text style={{ color: T.colors.white, fontSize: T.font.md, fontWeight: '700', marginBottom: T.space.md }}>Dernières sessions</Text>
                {evolution.slice(-5).reverse().map((point, i) => (
                    <View key={i} style={{
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        paddingVertical: T.space.sm, borderBottomWidth: i < 4 ? 1 : 0, borderBottomColor: T.colors.border,
                    }}>
                        <Text style={{ color: T.colors.muted, fontSize: T.font.sm }}>{point.date}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MiniStat emoji="🎯" value={point.shootingRating} />
                            <MiniStat emoji="🧠" value={point.mentalRating} />
                            <MiniStat emoji="💪" value={point.physicalRating} />
                            <View style={{
                                backgroundColor: `${T.ratingColor(point.overallRating)}20`,
                                borderRadius: T.radius.sm, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 6,
                                borderWidth: 1, borderColor: `${T.ratingColor(point.overallRating)}30`,
                            }}>
                                <Text style={{ color: T.ratingColor(point.overallRating), fontSize: T.font.sm, fontWeight: '800' }}>
                                    {point.overallRating}
                                </Text>
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    )
}

// ==========================================
// Sous-composants
// ==========================================

function MentalBar({ label, value }: { label: string; value: number }) {
    return (
        <View style={{ marginBottom: T.space.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                <Text style={{ color: T.colors.textSecondary, fontSize: T.font.sm }}>{label}</Text>
                <Text style={{ color: T.ratingColor(value), fontSize: T.font.sm, fontWeight: '800' }}>{value}</Text>
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
            <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '800', marginVertical: 3 }}>{value}</Text>
            {ideal && (
                <View style={{ backgroundColor: T.colors.accentDim, borderRadius: T.radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ color: T.colors.accent, fontSize: T.font.xs }}>Idéal : {ideal}</Text>
                </View>
            )}
        </View>
    )
}

function MiniStat({ emoji, value }: { emoji: string; value: number }) {
    return (
        <Text style={{ color: T.colors.muted, fontSize: T.font.sm, marginHorizontal: 4, fontWeight: '500' }}>
            {emoji}{value}
        </Text>
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
        topCategoryEmoji: topCategory?.emoji ?? '🏀',
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
