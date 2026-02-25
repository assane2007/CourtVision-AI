import { View, Text, ScrollView, TouchableOpacity, Animated, DimensionValue, Share } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../lib/store'
import { toast } from '../../lib/toast'
import { T } from '../../lib/theme'

// ── Stat bars ─────────────────────────────────────────────────
const RADAR_STATS = [
    { label: 'Vitesse de tir', value: 78, color: T.colors.accent },
    { label: 'Précision (FG%)', value: 85, color: T.colors.primary },
    { label: 'Lecture du jeu',  value: 72, color: T.colors.green },
    { label: 'Score Mental',    value: 85, color: T.colors.orange },
    { label: 'Défense',         value: 60, color: T.colors.red },
    { label: 'Clutch Factor',   value: 90, color: T.colors.purple },
]

// ── Heatmap ───────────────────────────────────────────────────
const HEATMAP_ZONES: Array<{ left: DimensionValue; top: DimensionValue; intensity: number; made: number; att: number }> = [
    { left: '15%', top: '20%', intensity: 0.9, made: 5, att: 6 },
    { left: '75%', top: '20%', intensity: 0.7, made: 3, att: 5 },
    { left: '45%', top: '10%', intensity: 0.5, made: 2, att: 5 },
    { left: '25%', top: '45%', intensity: 0.8, made: 4, att: 5 },
    { left: '65%', top: '45%', intensity: 0.4, made: 1, att: 4 },
    { left: '45%', top: '62%', intensity: 1.0, made: 6, att: 7 },
    { left: '45%', top: '35%', intensity: 0.6, made: 3, att: 6 },
]

// ── Animated stat bar ─────────────────────────────────────────
function RadarBar({ label, value, color, delay }: { label: string; value: number; color: string; delay: number }) {
    const anim = useRef(new Animated.Value(0)).current
    useEffect(() => {
        Animated.timing(anim, { toValue: value / 100, duration: 800, delay, useNativeDriver: false }).start()
    }, [])
    const grade = value >= 85 ? 'A+' : value >= 75 ? 'A' : value >= 65 ? 'B+' : value >= 55 ? 'B' : 'C'
    return (
        <View style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: T.colors.textSecondary, fontSize: T.font.md }}>{label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{
                        backgroundColor: `${color}15`,
                        paddingHorizontal: 6, paddingVertical: 2,
                        borderRadius: T.radius.sm,
                    }}>
                        <Text style={{ color, fontSize: T.font.xs, fontWeight: '700' }}>{grade}</Text>
                    </View>
                    <Text style={{ color, fontSize: T.font.md, fontWeight: '900' }}>{value}</Text>
                </View>
            </View>
            <View style={{ height: 6, backgroundColor: T.colors.dimmer, borderRadius: T.radius.sm, overflow: 'hidden' }}>
                <Animated.View style={{
                    height: 6, borderRadius: T.radius.sm, backgroundColor: color,
                    width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                    ...T.glow(color, 0.3),
                }} />
            </View>
        </View>
    )
}

// ── Insight row ───────────────────────────────────────────────
function InsightRow({ text, type }: { text: string; type: 'good' | 'tip' | 'warn' }) {
    const icon = type === 'good' ? 'checkmark-circle' : type === 'tip' ? 'bulb-outline' : 'trending-up-outline'
    const color = type === 'good' ? T.colors.green : type === 'tip' ? T.colors.accent : T.colors.orange
    return (
        <View style={{
            flexDirection: 'row', alignItems: 'flex-start',
            ...T.glass.light,
            backgroundColor: `${color}08`,
            borderRadius: T.radius.md,
            padding: T.space.lg, marginBottom: T.space.sm,
            borderLeftWidth: 3, borderLeftColor: color,
        }}>
            <Ionicons name={icon as any} size={18} color={color} style={{ marginRight: 10, marginTop: 1 }} />
            <Text style={{ color: T.colors.white, fontSize: T.font.md, flex: 1, lineHeight: 20 }}>{text}</Text>
        </View>
    )
}

// ── Main ──────────────────────────────────────────────────────
export default function AnalysisReport() {
    const { id } = useLocalSearchParams<{ id: string }>()

    const router  = useRouter()
    const fadeAnim = useRef(new Animated.Value(0)).current
    const sessions = useStore(s => s.sessions)
    const session  = sessions.find(s => s.id === id)
    const [activeTab, setActiveTab] = useState<'stats' | 'heatmap' | 'report'>('stats')

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start()
    }, [])

    const mentalLabel = (score: number) =>
        score >= 90 ? 'Ice in veins 🥶' : score >= 80 ? 'En zone 🔥' : score >= 70 ? 'Concentration 🧠' : 'Travail mental ⚡'

    const handleShare = async () => {
        try {
            await Share.share({
                title: 'Mon rapport CourtVision AI',
                message: `🏀 Rapport IA Session #${id}\nMental: ${session?.mental_score ?? 85}/100 — FG: ${session?.shooting_grade ?? 'A'}\nAnalysé par CourtVision AI`,
            })
        } catch {}
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.bg }}>
            {/* Header */}
            <View style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: T.space.xl, paddingVertical: T.space.md,
                borderBottomWidth: 1, borderBottomColor: T.colors.border,
            }}>
                <TouchableOpacity onPress={() => router.back()} style={{
                    marginRight: T.space.md,
                    width: 38, height: 38, borderRadius: T.radius.sm,
                    ...T.glass.light,
                    justifyContent: 'center', alignItems: 'center',
                }}>
                    <Ionicons name="arrow-back" size={22} color={T.colors.white} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: T.colors.white, fontSize: T.font.xl, fontWeight: '800', letterSpacing: -0.3 }}>
                        Rapport d'Analyse
                    </Text>
                    <Text style={{ color: T.colors.muted, fontSize: T.font.sm, marginTop: 2 }}>Session #{id}</Text>
                </View>
                <TouchableOpacity
                    onPress={handleShare}
                    style={{
                        ...T.glass.primary,
                        borderRadius: T.radius.sm,
                        paddingHorizontal: 12, paddingVertical: 8,
                        flexDirection: 'row', alignItems: 'center', gap: 5,
                    }}
                >
                    <Ionicons name="share-outline" size={16} color={T.colors.primaryLight} />
                    <Text style={{ color: T.colors.primaryLight, fontSize: T.font.sm, fontWeight: '700' }}>Partager</Text>
                </TouchableOpacity>
            </View>

            {/* Score Hero */}
            <View style={{
                flexDirection: 'row', paddingHorizontal: T.space.xl, paddingVertical: T.space.lg, gap: 10,
                borderBottomWidth: 1, borderBottomColor: T.colors.border,
            }}>
                <View style={{
                    flex: 1.5, backgroundColor: T.colors.primary, borderRadius: T.radius.lg,
                    padding: T.space.lg, alignItems: 'center',
                    ...T.glow(T.colors.primary, 0.45),
                }}>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: T.font.sm }}>Tirs (Made/Att)</Text>
                    <Text style={{ color: '#FFF', fontSize: T.font.hero, fontWeight: '900', marginVertical: 4, letterSpacing: -1 }}>
                        14/22
                    </Text>
                    <View style={{
                        backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: T.radius.sm,
                        paddingHorizontal: 10, paddingVertical: 4,
                    }}>
                        <Text style={{ color: '#FFF', fontSize: T.font.sm, fontWeight: '700' }}>63.6% · +12% vs Moy.</Text>
                    </View>
                </View>
                <View style={{ flex: 1, gap: 10 }}>
                    <View style={{
                        ...T.glass.light,
                        borderColor: `${T.colors.green}25`,
                        borderRadius: T.radius.md, padding: T.space.md, alignItems: 'center', flex: 1,
                    }}>
                        <Text style={{ color: T.colors.muted, fontSize: T.font.sm }}>Mental</Text>
                        <Text style={{ color: T.colors.green, fontSize: T.font.xxl, fontWeight: '900' }}>
                            {session?.mental_score ?? 85}
                        </Text>
                        <Text style={{ color: T.colors.greenLight, fontSize: T.font.xs, fontWeight: '600', textAlign: 'center' }}>
                            {mentalLabel(session?.mental_score ?? 85)}
                        </Text>
                    </View>
                    <View style={{
                        ...T.glass.light,
                        borderRadius: T.radius.md, padding: T.space.md, alignItems: 'center', flex: 1,
                    }}>
                        <Text style={{ color: T.colors.muted, fontSize: T.font.sm }}>Grade</Text>
                        <Text style={{ color: T.colors.orange, fontSize: T.font.xxl, fontWeight: '900' }}>
                            {session?.shooting_grade ?? 'A'}
                        </Text>
                        <Text style={{ color: T.colors.muted, fontSize: T.font.xs }}>FG Grade</Text>
                    </View>
                </View>
            </View>

            {/* Tabs — Premium Glassmorphism Pill */}
            <View style={{
                flexDirection: 'row', marginHorizontal: T.space.xl, marginVertical: T.space.md,
                ...T.glass.light,
                borderRadius: T.radius.md, padding: 3, gap: 3,
            }}>
                {(['stats', 'heatmap', 'report'] as const).map(tab => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        style={{
                            flex: 1, paddingVertical: 10, borderRadius: T.radius.sm, alignItems: 'center',
                            backgroundColor: activeTab === tab ? T.colors.primary : 'transparent',
                            ...(activeTab === tab ? T.glow(T.colors.primary, 0.25) : {}),
                        }}
                    >
                        <Text style={{
                            color: activeTab === tab ? T.colors.white : T.colors.muted,
                            fontWeight: '700', fontSize: T.font.sm,
                        }}>
                            {tab === 'stats' ? '📊 Stats' : tab === 'heatmap' ? '🗺 Terrain' : '🤖 Coach IA'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Animated.ScrollView
                style={{ opacity: fadeAnim }}
                contentContainerStyle={{ padding: T.space.xl, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {activeTab === 'stats' && (
                    <>
                        <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '800', marginBottom: T.space.md, letterSpacing: -0.3 }}>
                            📊 Radar des Compétences
                        </Text>
                        <View style={{
                            ...T.glass.medium,
                            borderRadius: T.radius.lg, padding: T.space.lg,
                            marginBottom: T.space.xl,
                        }}>
                            {RADAR_STATS.map((s, i) => (
                                <RadarBar key={s.label} {...s} delay={i * 80} />
                            ))}
                        </View>

                        {/* Comparaison */}
                        <View style={{
                            ...T.glass.accent,
                            borderRadius: T.radius.lg, padding: T.space.lg,
                        }}>
                            <Text style={{ color: T.colors.accent, fontSize: T.font.md, fontWeight: '800', marginBottom: T.space.md }}>
                                ⚡ Évolution depuis la dernière session
                            </Text>
                            {/*
                                { label: 'FG%', prev: '58%', now: '64%', up: true },
                                { label: 'Mental', prev: '80', now: '85', up: true },
                                { label: 'Vitesse', prev: '80', now: '78', up: false },
                            ].map(row => (
                                <View key={row.label} style={{
                                    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
                                    ...T.glass.light,
                                    borderRadius: T.radius.sm, paddingHorizontal: T.space.md, paddingVertical: T.space.sm,
                                }}>
                                    <Text style={{ color: T.colors.textSecondary, width: 70, fontSize: T.font.md, fontWeight: '600' }}>{row.label}</Text>
                                    <Text style={{ color: T.colors.dim, fontSize: T.font.md }}>{row.prev}</Text>
                                    <Ionicons
                                        name="arrow-forward"
                                        size={14} color={T.colors.muted} style={{ marginHorizontal: 8 }}
                                    />
                                    <Text style={{ color: row.up ? T.colors.green : T.colors.red, fontSize: T.font.md, fontWeight: '700' }}>
                                        {row.now} {row.up ? '↑' : '↓'}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </>
                )}

                {activeTab === 'heatmap' && (
                    <>
                        <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '800', marginBottom: T.space.md, letterSpacing: -0.3 }}>
                            🗺 Heatmap Terrain
                        </Text>
                        <View style={{
                            height: 260, ...T.glass.medium,
                            borderRadius: T.radius.lg,
                            marginBottom: T.space.lg,
                            overflow: 'hidden', position: 'relative',
                        }}>
                            {/* Court lines */}
                            <View style={{ position: 'absolute', top: 20, left: 20, right: 20, bottom: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 8 }} />
                            <View style={{ position: 'absolute', bottom: 20, left: '30%', right: '30%', height: '40%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 0 }} />
                            <View style={{ position: 'absolute', bottom: '35%', left: '25%', right: '25%', height: 50, borderTopLeftRadius: 60, borderTopRightRadius: 60, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 0 }} />
                            <View style={{ position: 'absolute', bottom: 20, left: '5%', right: '5%', height: '70%', borderTopLeftRadius: 200, borderTopRightRadius: 200, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)', borderBottomWidth: 0 }} />

                            {HEATMAP_ZONES.map((z, i) => {
                                const pct = z.made / z.att
                                const color = pct >= 0.7 ? T.colors.green : pct >= 0.5 ? T.colors.orange : T.colors.red
                                return (
                                    <View key={i} style={{ position: 'absolute', left: z.left, top: z.top, transform: [{ translateX: -14 }, { translateY: -14 }] }}>
                                        <View style={{
                                            position: 'absolute', width: 28, height: 28, borderRadius: 14,
                                            backgroundColor: color, opacity: z.intensity * 0.25,
                                            transform: [{ scale: 2.4 }],
                                        }} />
                                        <View style={{
                                            width: 26, height: 26, borderRadius: 13,
                                            backgroundColor: color, opacity: z.intensity,
                                            borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
                                            justifyContent: 'center', alignItems: 'center',
                                            ...T.glow(color, 0.3),
                                        }}>
                                            <Text style={{ color: '#FFF', fontSize: 7, fontWeight: '900' }}>{z.made}/{z.att}</Text>
                                        </View>
                                    </View>
                                )
                            })}

                            <View style={{ position: 'absolute', top: 10, right: 12, flexDirection: 'row', gap: 10 }}>
                                {[{ c: T.colors.green, l: '≥70%' }, { c: T.colors.orange, l: '≥50%' }, { c: T.colors.red, l: '<50%' }].map(({ c, l }) => (
                                    <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: c, ...T.glow(c, 0.4) }} />
                                        <Text style={{ color: T.colors.muted, fontSize: T.font.xs }}>{l}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={{
                            ...T.glass.accent,
                            borderRadius: T.radius.md, padding: T.space.lg,
                        }}>
                            <Text style={{ color: T.colors.accent, fontWeight: '700', fontSize: T.font.md, marginBottom: T.space.sm }}>
                                Zone chaude du match
                            </Text>
                            <Text style={{ color: T.colors.white, fontSize: T.font.md, lineHeight: 20 }}>
                                5/6 dans le corner gauche (83% FG) — Ta zone de prédilection. Continue à créer dans cet espace.
                            </Text>
                        </View>
                    </>
                )}

                {activeTab === 'report' && (
                    <>
                        <View style={{
                            ...T.glass.accent,
                            borderRadius: T.radius.lg, padding: T.space.lg,
                            marginBottom: T.space.xl,
                            borderLeftWidth: 4, borderLeftColor: T.colors.accent,
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: T.space.md }}>
                                <Text style={{ fontSize: 18, marginRight: 8 }}>🤖</Text>
                                <Text style={{ color: T.colors.accent, fontSize: T.font.base, fontWeight: '800' }}>Analyse Coach IA (Groq)</Text>
                            </View>
                            <Text style={{ color: T.colors.white, fontSize: T.font.md, lineHeight: 24, marginBottom: T.space.md }}>
                                Excellente lecture de jeu aujourd'hui. Ton temps de prise de décision sur pick-and-roll a baissé de <Text style={{ color: T.colors.green, fontWeight: '700' }}>15%</Text> — c'est significatif.
                            </Text>
                            <Text style={{ color: T.colors.white, fontSize: T.font.md, lineHeight: 24, marginBottom: T.space.md }}>
                                Mécanique de tir très fluide — angle du coude constant à <Text style={{ color: T.colors.primaryLight, fontWeight: '700' }}>92°</Text>. Ton body language est resté positif même après tes deux ratés consécutifs au Q3.
                            </Text>
                            <Text style={{ color: T.colors.white, fontSize: T.font.md, lineHeight: 24 }}>
                                Conseil : Travaille ta reprise d'appuis sur les tirs en sortie de dribble côté faible. 3 exercices ajoutés dans ton programme.
                            </Text>
                        </View>

                        <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '800', marginBottom: T.space.sm, letterSpacing: -0.3 }}>
                            💡 Points Clés
                        </Text>
                        <InsightRow type="good" text="Mécanique de tir : coude à 92° constant — au-dessus de ta moyenne sur 30 dernières sessions." />
                        <InsightRow type="good" text="Body language positif tout au long du match, même après 2 ratés consécutifs (résilience mentale ✅)." />
                        <InsightRow type="tip"  text="Améliore ta reprise d'appuis côté gauche — différentiel de 18% vs côté droit." />
                        <InsightRow type="tip"  text="Temps de décision en sortie de pick-and-roll encore perfectible (-15% → vise -25% d'ici 2 semaines)." />

                        <View style={{
                            ...T.glass.light,
                            backgroundColor: T.colors.purpleDim,
                            borderColor: `${T.colors.purple}30`,
                            borderRadius: T.radius.md, padding: T.space.lg, marginTop: T.space.sm,
                        }}>
                            <Text style={{ color: T.colors.purple, fontWeight: '700', fontSize: T.font.md, marginBottom: T.space.sm }}>
                                🎯 Objectif pour la prochaine session
                            </Text>
                            <Text style={{ color: T.colors.white, fontSize: T.font.md, lineHeight: 20 }}>
                                Atteindre 70% FG depuis le corner gauche et réduire le temps de décision pick-and-roll à moins de 1.2s.
                            </Text>
                        </View>
                    </>
                )}
            </Animated.ScrollView>

            {/* ── Sticky CTA ── */}
            <View style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                paddingHorizontal: T.space.xl, paddingBottom: 30, paddingTop: T.space.md,
                backgroundColor: T.colors.bg, borderTopWidth: 1, borderTopColor: T.colors.border,
            }}>
                <TouchableOpacity
                    style={{
                        backgroundColor: T.colors.primary, paddingVertical: 16, borderRadius: T.radius.pill,
                        alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
                        ...T.glow(T.colors.primary, 0.45),
                    }}
                    onPress={() => router.push(`/highlight/${id}`)}
                    activeOpacity={0.85}
                >
                    <Ionicons name="play" size={20} color="#FFF" style={{ marginRight: 10 }} />
                    <Text style={{ color: '#FFF', fontWeight: '800', fontSize: T.font.lg, letterSpacing: 0.3 }}>
                        🎬 Regarder le Highlight Reel
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}
