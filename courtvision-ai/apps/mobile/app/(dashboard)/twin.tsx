import { View, Text, ScrollView, TouchableOpacity, Animated, Dimensions, ActivityIndicator, Modal, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { FontAwesome5, Foundation, Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons'
import { useDigitalTwin } from '../../hooks/useDigitalTwin'
import { useViralShare } from '../../hooks/useViralShare'
import { ShareButton, ShareModal, TwinCard } from '../../components/ShareCard'
import type { TwinCardData } from '../../hooks/useViralShare'
import type { TwinTab, TwinAttributeCategory, TwinTrait, NBAComparison, ComfortZone, TwinEvolutionPoint, MatchupSimulation } from '../../hooks/useDigitalTwin'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// ==========================================
// Couleurs & Constantes
// ==========================================
const COLORS = {
    bg: '#0D1117',
    card: '#161B22',
    cardLight: '#1C2333',
    border: '#30363D',
    accent: '#00D4FF',
    accentDim: 'rgba(0,212,255,0.15)',
    green: '#00C853',
    greenDim: 'rgba(0,200,83,0.15)',
    red: '#FF3D57',
    redDim: 'rgba(255,61,87,0.15)',
    orange: '#FF9800',
    orangeDim: 'rgba(255,152,0,0.15)',
    purple: '#B388FF',
    purpleDim: 'rgba(179,136,255,0.15)',
    white: '#E6EDF3',
    muted: '#8B949E',
    gold: '#FFD700',
}

const STYLE_EMOJIS: Record<string, string> = {
    sharpshooter: '🎯',
    shot_creator: '🪄',
    slasher: '⚡',
    playmaker: '🧠',
    two_way: '🛡️',
    stretch_big: '🏗️',
    paint_beast: '💥',
    balanced: '♾️',
}

const STYLE_LABELS: Record<string, string> = {
    sharpshooter: 'Sharpshooter',
    shot_creator: 'Shot Creator',
    slasher: 'Slasher',
    playmaker: 'Playmaker',
    two_way: 'Two-Way',
    stretch_big: 'Stretch Big',
    paint_beast: 'Paint Beast',
    balanced: 'Balanced',
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
    const [showSimModal, setShowSimModal] = useState(false)
    const [selectedNBA, setSelectedNBA] = useState<string | null>(null)
    const [showShareModal, setShowShareModal] = useState(false)

    // Pulse animation pour le rating central
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
            ])
        ).start()
    }, [])

    // Fade in
    useEffect(() => {
        if (!twin.loading) {
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start()
        }
    }, [twin.loading])

    // ======= Loading =======
    if (twin.loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.accent} />
                <Text style={{ color: COLORS.muted, marginTop: 15, fontSize: 14 }}>Chargement de ton Digital Twin...</Text>
            </SafeAreaView>
        )
    }

    // ======= Error / No profile =======
    if (twin.error || !twin.profile) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center', padding: 30 }}>
                <FontAwesome5 name="user-astronaut" size={60} color={COLORS.accent} style={{ opacity: 0.4 }} />
                <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: 'bold', marginTop: 20, textAlign: 'center' }}>
                    Ton Digital Twin est en construction
                </Text>
                <Text style={{ color: COLORS.muted, fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 20 }}>
                    {twin.error ?? 'Analyse au moins une session vidéo pour créer ton avatar IA.'}
                </Text>
                <TouchableOpacity
                    onPress={twin.rebuild}
                    style={{ backgroundColor: COLORS.accent, borderRadius: 12, paddingHorizontal: 30, paddingVertical: 14, marginTop: 25 }}
                >
                    <Text style={{ color: COLORS.bg, fontWeight: 'bold', fontSize: 14 }}>
                        {twin.rebuilding ? 'Construction...' : '🔄 Construire mon Twin'}
                    </Text>
                </TouchableOpacity>
            </SafeAreaView>
        )
    }

    const p = twin.profile

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

                    {/* ======= Header ======= */}
                    <View style={{ padding: 20, paddingBottom: 0 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View>
                                <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: 'bold' }}>Ton Digital Twin</Text>
                                <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>
                                    Modèle {p.modelVersion} • {p.sessionCount} sessions analysées
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <TouchableOpacity onPress={twin.rebuild} disabled={twin.rebuilding}>
                                    {twin.rebuilding
                                        ? <ActivityIndicator size="small" color={COLORS.accent} />
                                        : <Ionicons name="refresh" size={22} color={COLORS.accent} />
                                    }
                                </TouchableOpacity>
                                <ShareButton onPress={() => setShowShareModal(true)} compact />
                            </View>
                        </View>
                    </View>

                    {/* ======= Overall Rating Badge ======= */}
                    <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 10 }}>
                        <Animated.View style={{
                            transform: [{ scale: pulseAnim }],
                            width: 110, height: 110, borderRadius: 55,
                            backgroundColor: ratingColor(p.overallRating),
                            justifyContent: 'center', alignItems: 'center',
                            shadowColor: ratingColor(p.overallRating), shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.5, shadowRadius: 20,
                        }}>
                            <Text style={{ color: '#FFF', fontSize: 38, fontWeight: '900' }}>{p.overallRating}</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600' }}>OVERALL</Text>
                        </Animated.View>
                    </View>

                    {/* ======= Play Style Badge ======= */}
                    <View style={{ alignItems: 'center', marginBottom: 15 }}>
                        <View style={{
                            backgroundColor: COLORS.accentDim, borderRadius: 20,
                            paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center'
                        }}>
                            <Text style={{ fontSize: 18, marginRight: 6 }}>{STYLE_EMOJIS[p.playStyle.primary] ?? '🏀'}</Text>
                            <Text style={{ color: COLORS.accent, fontSize: 14, fontWeight: 'bold' }}>
                                {STYLE_LABELS[p.playStyle.primary] ?? p.playStyle.primary}
                            </Text>
                            {p.playStyle.secondary && (
                                <Text style={{ color: COLORS.muted, fontSize: 12, marginLeft: 6 }}>
                                    / {STYLE_LABELS[p.playStyle.secondary] ?? p.playStyle.secondary}
                                </Text>
                            )}
                        </View>
                        <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 }}>
                            {p.playStyle.description}
                        </Text>
                        <Text style={{ color: COLORS.accent, fontSize: 11, marginTop: 3, fontWeight: '600' }}>
                            Archétype NBA : {p.playStyle.nbaArchetype}
                        </Text>
                    </View>

                    {/* ======= Tab Bar ======= */}
                    <View style={{
                        flexDirection: 'row', marginHorizontal: 20, marginBottom: 15,
                        backgroundColor: COLORS.card, borderRadius: 12, padding: 3
                    }}>
                        {(['overview', 'attributes', 'matchup', 'evolution'] as TwinTab[]).map(tab => (
                            <TouchableOpacity
                                key={tab}
                                onPress={() => twin.setActiveTab(tab)}
                                style={{
                                    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
                                    backgroundColor: twin.activeTab === tab ? COLORS.accent : 'transparent',
                                }}
                            >
                                <Text style={{
                                    color: twin.activeTab === tab ? COLORS.bg : COLORS.muted,
                                    fontSize: 11, fontWeight: twin.activeTab === tab ? 'bold' : '500'
                                }}>
                                    {tab === 'overview' ? '🏀 ADN' : tab === 'attributes' ? '📊 Stats' : tab === 'matchup' ? '⚔️ Match' : '📈 Évol.'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ======= Tab Content ======= */}
                    {twin.activeTab === 'overview' && (
                        <OverviewTab
                            profile={p}
                            insights={twin.insights}
                        />
                    )}
                    {twin.activeTab === 'attributes' && (
                        <AttributesTab categories={p.attributeCategories} />
                    )}
                    {twin.activeTab === 'matchup' && (
                        <MatchupTab
                            profile={p}
                            simulation={twin.simulation}
                            simulating={twin.simulating}
                            onSimulateNBA={(name) => twin.simulateVsNBA(name)}
                            onClear={() => twin.clearSimulation()}
                        />
                    )}
                    {twin.activeTab === 'evolution' && (
                        <EvolutionTab evolution={p.evolution} />
                    )}

                    {/* ======= Share CTA Banner ======= */}
                    <View style={{
                        marginHorizontal: 20, marginTop: 10, marginBottom: 10,
                        backgroundColor: 'rgba(0,212,255,0.08)',
                        borderRadius: 16, padding: 18,
                        borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)',
                        flexDirection: 'row', alignItems: 'center',
                    }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: '700' }}>
                                🔥 Partage ta Twin Card
                            </Text>
                            <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>
                                Montre ton profil sur TikTok ou Instagram • +10 XP
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setShowShareModal(true)}
                            style={{
                                backgroundColor: COLORS.accent,
                                borderRadius: 10,
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                            }}
                        >
                            <Text style={{ color: COLORS.bg, fontSize: 12, fontWeight: '700' }}>Partager</Text>
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
        <View style={{ paddingHorizontal: 20 }}>
            {/* Category Summary Cards */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 15 }}>
                {profile.attributeCategories.map((cat: TwinAttributeCategory) => (
                    <View key={cat.category} style={{
                        width: (SCREEN_WIDTH - 50) / 2, backgroundColor: COLORS.card,
                        borderRadius: 14, padding: 14, marginBottom: 10
                    }}>
                        <Text style={{ fontSize: 14, marginBottom: 4 }}>{cat.emoji} <Text style={{ color: COLORS.white, fontWeight: '600' }}>{cat.category}</Text></Text>
                        <Text style={{ color: ratingColor(cat.overallScore), fontSize: 28, fontWeight: '900' }}>{cat.overallScore}</Text>
                        <View style={{ height: 4, backgroundColor: COLORS.border, borderRadius: 2, marginTop: 6 }}>
                            <View style={{ height: 4, backgroundColor: ratingColor(cat.overallScore), borderRadius: 2, width: `${cat.overallScore}%` }} />
                        </View>
                    </View>
                ))}
            </View>

            {/* NBA Comparisons */}
            {profile.nbaComparisons.length > 0 && (
                <View style={{ marginBottom: 15 }}>
                    <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>🏀 Comparaisons NBA</Text>
                    {profile.nbaComparisons.map((comp: NBAComparison, i: number) => (
                        <View key={i} style={{
                            backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 8,
                            flexDirection: 'row', alignItems: 'center',
                            borderLeftWidth: 3, borderLeftColor: i === 0 ? COLORS.gold : i === 1 ? COLORS.accent : COLORS.muted
                        }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: 'bold' }}>{comp.playerName}</Text>
                                <Text style={{ color: COLORS.muted, fontSize: 11, marginTop: 2 }}>
                                    {comp.matchingTraits.join(' • ')}
                                </Text>
                            </View>
                            <View style={{
                                backgroundColor: ratingColor(comp.similarity), borderRadius: 10,
                                paddingHorizontal: 10, paddingVertical: 4,
                            }}>
                                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: 'bold' }}>{comp.similarity}%</Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Strengths & Weaknesses */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                {/* Strengths */}
                <View style={{ flex: 1, marginRight: 6, backgroundColor: COLORS.greenDim, borderRadius: 14, padding: 14 }}>
                    <Text style={{ color: COLORS.green, fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>💪 Forces</Text>
                    {profile.strengths.map((t: TwinTrait) => (
                        <View key={t.id} style={{ marginBottom: 6 }}>
                            <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: '600' }}>• {t.label}</Text>
                            <Text style={{ color: COLORS.muted, fontSize: 10, marginLeft: 10 }}>{t.description}</Text>
                        </View>
                    ))}
                    {profile.strengths.length === 0 && (
                        <Text style={{ color: COLORS.muted, fontSize: 11 }}>Continue à jouer pour découvrir tes forces</Text>
                    )}
                </View>

                {/* Weaknesses */}
                <View style={{ flex: 1, marginLeft: 6, backgroundColor: COLORS.redDim, borderRadius: 14, padding: 14 }}>
                    <Text style={{ color: COLORS.red, fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>⚠️ À Travailler</Text>
                    {profile.weaknesses.map((t: TwinTrait) => (
                        <View key={t.id} style={{ marginBottom: 6 }}>
                            <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: '600' }}>• {t.label}</Text>
                            {t.drillRecommendation && (
                                <Text style={{ color: COLORS.orange, fontSize: 10, marginLeft: 10 }}>💡 {t.drillRecommendation}</Text>
                            )}
                        </View>
                    ))}
                    {profile.weaknesses.length === 0 && (
                        <Text style={{ color: COLORS.muted, fontSize: 11 }}>Pas de faiblesse majeure détectée 🔥</Text>
                    )}
                </View>
            </View>

            {/* Comfort Zones */}
            {profile.comfortZones.length > 0 && (
                <View style={{ marginBottom: 15 }}>
                    <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>🗺️ Zones de Confort</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {profile.comfortZones.filter((z: ComfortZone) => z.attempts > 0).map((z: ComfortZone, i: number) => (
                            <View key={i} style={{
                                backgroundColor: z.isComfort ? COLORS.greenDim : COLORS.card,
                                borderRadius: 10, padding: 10, margin: 3,
                                borderWidth: z.isComfort ? 1 : 0, borderColor: COLORS.green,
                            }}>
                                <Text style={{ color: COLORS.white, fontSize: 11, fontWeight: '600' }}>{z.zone}</Text>
                                <Text style={{ color: z.isComfort ? COLORS.green : COLORS.muted, fontSize: 13, fontWeight: 'bold' }}>
                                    {Math.round(z.efficiency)}%
                                </Text>
                                <Text style={{ color: COLORS.muted, fontSize: 9 }}>{z.attempts} tirs</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Mental Profile */}
            <View style={{ backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginBottom: 15 }}>
                <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>🧠 Profil Mental</Text>
                <MentalBar label="Résilience" value={profile.mentalProfile.resilience} />
                <MentalBar label="Clutch" value={profile.mentalProfile.clutchFactor} />
                <MentalBar label="Régularité" value={profile.mentalProfile.consistency} />
                <MentalBar label="Résist. fatigue" value={profile.mentalProfile.fatigueResistance} />
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                    <Text style={{ color: COLORS.muted, fontSize: 11 }}>Sous pression : </Text>
                    <Text style={{
                        color: profile.mentalProfile.pressureResponse === 'thrives' ? COLORS.green
                            : profile.mentalProfile.pressureResponse === 'struggles' ? COLORS.red : COLORS.orange,
                        fontSize: 12, fontWeight: 'bold'
                    }}>
                        {profile.mentalProfile.pressureResponse === 'thrives' ? '🔥 S\'épanouit'
                            : profile.mentalProfile.pressureResponse === 'struggles' ? '😰 En difficulté' : '😐 Neutre'}
                    </Text>
                </View>
            </View>

            {/* IA Insights */}
            {insights && (
                <View style={{ backgroundColor: COLORS.purpleDim, borderRadius: 14, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: COLORS.purple }}>
                    <Text style={{ color: COLORS.purple, fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>🤖 Analyse IA</Text>
                    <Text style={{ color: COLORS.white, fontSize: 13, lineHeight: 20 }}>{insights}</Text>
                </View>
            )}

            {/* Pose Signature */}
            <View style={{ backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginBottom: 15 }}>
                <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>📐 Signature de Tir</Text>
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
        <View style={{ paddingHorizontal: 20 }}>
            {categories.map(cat => (
                <View key={cat.category} style={{ backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: 'bold' }}>
                            {cat.emoji} {cat.category}
                        </Text>
                        <Text style={{ color: ratingColor(cat.overallScore), fontSize: 20, fontWeight: '900' }}>{cat.overallScore}</Text>
                    </View>
                    {cat.attributes.map((attr, i) => (
                        <View key={i} style={{ marginBottom: 10 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                                <Text style={{ color: COLORS.white, fontSize: 13 }}>{attr.name}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ color: ratingColor(attr.value), fontSize: 14, fontWeight: 'bold' }}>{attr.value}</Text>
                                    {attr.delta !== 0 && (
                                        <Text style={{
                                            color: attr.trend === 'up' ? COLORS.green : attr.trend === 'down' ? COLORS.red : COLORS.muted,
                                            fontSize: 10, marginLeft: 4
                                        }}>
                                            {attr.trend === 'up' ? '▲' : attr.trend === 'down' ? '▼' : '—'}{Math.abs(attr.delta)}
                                        </Text>
                                    )}
                                </View>
                            </View>
                            <View style={{ height: 6, backgroundColor: COLORS.border, borderRadius: 3 }}>
                                <View style={{
                                    height: 6, borderRadius: 3,
                                    backgroundColor: ratingColor(attr.value),
                                    width: `${Math.min(attr.value, 100)}%`
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
        <View style={{ paddingHorizontal: 20 }}>
            <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: 'bold', marginBottom: 5 }}>⚔️ Simulateur de Match-Up</Text>
            <Text style={{ color: COLORS.muted, fontSize: 12, marginBottom: 15 }}>
                Ton Twin vs un joueur NBA. Qui gagne ?
            </Text>

            {/* NBA Player Grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 }}>
                {NBA_PLAYERS_FOR_SIMULATION.map(name => (
                    <TouchableOpacity
                        key={name}
                        onPress={() => onSimulateNBA(name)}
                        disabled={simulating}
                        style={{
                            backgroundColor: COLORS.card, borderRadius: 10,
                            paddingHorizontal: 12, paddingVertical: 8, margin: 3,
                            borderWidth: 1, borderColor: COLORS.border,
                        }}
                    >
                        <Text style={{ color: COLORS.white, fontSize: 12 }}>{name}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {simulating && (
                <View style={{ alignItems: 'center', padding: 30 }}>
                    <ActivityIndicator size="large" color={COLORS.accent} />
                    <Text style={{ color: COLORS.muted, marginTop: 10, fontSize: 13 }}>Simulation en cours...</Text>
                </View>
            )}

            {/* Simulation Result */}
            {simulation && !simulating && (
                <View>
                    {/* Win Probability */}
                    <View style={{
                        backgroundColor: COLORS.card, borderRadius: 16, padding: 20,
                        alignItems: 'center', marginBottom: 15,
                        borderWidth: 1, borderColor: simulation.winProbability >= 50 ? COLORS.green : COLORS.red,
                    }}>
                        <Text style={{ color: COLORS.muted, fontSize: 12, marginBottom: 5 }}>vs {simulation.opponent}</Text>
                        <Text style={{
                            color: simulation.winProbability >= 50 ? COLORS.green : COLORS.red,
                            fontSize: 48, fontWeight: '900'
                        }}>
                            {simulation.winProbability}%
                        </Text>
                        <Text style={{ color: COLORS.muted, fontSize: 12 }}>Probabilité de victoire</Text>

                        {/* Predicted Score */}
                        <View style={{ flexDirection: 'row', marginTop: 12, alignItems: 'center' }}>
                            <Text style={{ color: COLORS.accent, fontSize: 20, fontWeight: 'bold' }}>{simulation.predictedScore.player}</Text>
                            <Text style={{ color: COLORS.muted, fontSize: 14, marginHorizontal: 8 }}>—</Text>
                            <Text style={{ color: COLORS.red, fontSize: 20, fontWeight: 'bold' }}>{simulation.predictedScore.opponent}</Text>
                        </View>
                    </View>

                    {/* Key Matchups */}
                    <View style={{ backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginBottom: 12 }}>
                        <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>Matchups clés</Text>
                        {simulation.keyMatchups.map((km, i) => (
                            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <Text style={{ color: COLORS.muted, fontSize: 13 }}>{km.area}</Text>
                                <Text style={{
                                    color: km.edge === 'player' ? COLORS.green : km.edge === 'opponent' ? COLORS.red : COLORS.orange,
                                    fontSize: 13, fontWeight: 'bold'
                                }}>
                                    {km.edge === 'player' ? '✅ Avantage' : km.edge === 'opponent' ? '❌ Désavantage' : '🟰 Égal'}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Gameplan */}
                    {simulation.gameplan.length > 0 && (
                        <View style={{ backgroundColor: COLORS.accentDim, borderRadius: 14, padding: 16, marginBottom: 12 }}>
                            <Text style={{ color: COLORS.accent, fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>📋 Plan de Jeu</Text>
                            {simulation.gameplan.map((tip, i) => (
                                <Text key={i} style={{ color: COLORS.white, fontSize: 12, marginBottom: 4 }}>• {tip}</Text>
                            ))}
                        </View>
                    )}

                    {/* Advantages & Vulnerabilities */}
                    <View style={{ flexDirection: 'row', marginBottom: 15 }}>
                        <View style={{ flex: 1, marginRight: 5, backgroundColor: COLORS.greenDim, borderRadius: 12, padding: 12 }}>
                            <Text style={{ color: COLORS.green, fontSize: 12, fontWeight: 'bold', marginBottom: 5 }}>Avantages</Text>
                            {simulation.advantages.map((a, i) => (
                                <Text key={i} style={{ color: COLORS.white, fontSize: 11, marginBottom: 2 }}>✅ {a}</Text>
                            ))}
                            {simulation.advantages.length === 0 && (
                                <Text style={{ color: COLORS.muted, fontSize: 11 }}>Aucun avantage clair</Text>
                            )}
                        </View>
                        <View style={{ flex: 1, marginLeft: 5, backgroundColor: COLORS.redDim, borderRadius: 12, padding: 12 }}>
                            <Text style={{ color: COLORS.red, fontSize: 12, fontWeight: 'bold', marginBottom: 5 }}>Vulnérabilités</Text>
                            {simulation.vulnerabilities.map((v, i) => (
                                <Text key={i} style={{ color: COLORS.white, fontSize: 11, marginBottom: 2 }}>⚠️ {v}</Text>
                            ))}
                            {simulation.vulnerabilities.length === 0 && (
                                <Text style={{ color: COLORS.muted, fontSize: 11 }}>Aucune vulnérabilité majeure</Text>
                            )}
                        </View>
                    </View>

                    <TouchableOpacity onPress={onClear} style={{
                        backgroundColor: COLORS.card, borderRadius: 12, padding: 12, alignItems: 'center'
                    }}>
                        <Text style={{ color: COLORS.muted, fontSize: 13 }}>Nouvelle simulation</Text>
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
            <View style={{ padding: 30, alignItems: 'center' }}>
                <Ionicons name="trending-up" size={40} color={COLORS.muted} />
                <Text style={{ color: COLORS.muted, fontSize: 14, marginTop: 10, textAlign: 'center' }}>
                    Pas encore assez de données.{'\n'}Continue à jouer pour voir ton évolution !
                </Text>
            </View>
        )
    }

    const maxRating = Math.max(...evolution.map(e => e.overallRating), 100)
    const chartHeight = 160
    const barWidth = Math.min((SCREEN_WIDTH - 80) / evolution.length, 30)

    return (
        <View style={{ paddingHorizontal: 20 }}>
            <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: 'bold', marginBottom: 15 }}>📈 Évolution</Text>

            {/* Mini bar chart */}
            <View style={{ backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginBottom: 15 }}>
                <Text style={{ color: COLORS.muted, fontSize: 12, marginBottom: 10 }}>Note globale par session</Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: chartHeight, justifyContent: 'center' }}>
                    {evolution.map((point, i) => {
                        const h = (point.overallRating / maxRating) * chartHeight
                        return (
                            <View key={i} style={{ alignItems: 'center', marginHorizontal: 2 }}>
                                <Text style={{ color: COLORS.muted, fontSize: 8, marginBottom: 2 }}>{point.overallRating}</Text>
                                <View style={{
                                    width: barWidth, height: h, borderRadius: 4,
                                    backgroundColor: ratingColor(point.overallRating),
                                }} />
                                <Text style={{ color: COLORS.muted, fontSize: 7, marginTop: 3, transform: [{ rotate: '-45deg' }] }}>
                                    {point.date.slice(5)}
                                </Text>
                            </View>
                        )
                    })}
                </View>
            </View>

            {/* Breakdown over time */}
            <View style={{ backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginBottom: 15 }}>
                <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>Dernières sessions</Text>
                {evolution.slice(-5).reverse().map((point, i) => (
                    <View key={i} style={{
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        paddingVertical: 8, borderBottomWidth: i < 4 ? 1 : 0, borderBottomColor: COLORS.border
                    }}>
                        <Text style={{ color: COLORS.muted, fontSize: 12 }}>{point.date}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MiniStat emoji="🎯" value={point.shootingRating} />
                            <MiniStat emoji="🧠" value={point.mentalRating} />
                            <MiniStat emoji="💪" value={point.physicalRating} />
                            <View style={{
                                backgroundColor: ratingColor(point.overallRating),
                                borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 6
                            }}>
                                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>{point.overallRating}</Text>
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
        <View style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ color: COLORS.muted, fontSize: 12 }}>{label}</Text>
                <Text style={{ color: ratingColor(value), fontSize: 12, fontWeight: 'bold' }}>{value}</Text>
            </View>
            <View style={{ height: 5, backgroundColor: COLORS.border, borderRadius: 3 }}>
                <View style={{ height: 5, borderRadius: 3, backgroundColor: ratingColor(value), width: `${Math.min(value, 100)}%` }} />
            </View>
        </View>
    )
}

function PoseStatItem({ label, value, ideal }: { label: string; value: string; ideal?: string }) {
    return (
        <View style={{ alignItems: 'center' }}>
            <Text style={{ color: COLORS.muted, fontSize: 10 }}>{label}</Text>
            <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: 'bold', marginVertical: 2 }}>{value}</Text>
            {ideal && <Text style={{ color: COLORS.accent, fontSize: 9 }}>Idéal : {ideal}</Text>}
        </View>
    )
}

function MiniStat({ emoji, value }: { emoji: string; value: number }) {
    return (
        <Text style={{ color: COLORS.muted, fontSize: 11, marginHorizontal: 4 }}>
            {emoji}{value}
        </Text>
    )
}

// ==========================================
// Helpers
// ==========================================

function ratingColor(rating: number): string {
    if (rating >= 80) return '#00C853'
    if (rating >= 60) return '#00D4FF'
    if (rating >= 40) return '#FF9800'
    return '#FF3D57'
}

/**
 * Convertit un TwinProfile local en TwinCardData pour le composant de partage.
 */
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
