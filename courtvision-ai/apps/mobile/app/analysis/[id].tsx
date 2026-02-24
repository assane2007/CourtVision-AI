import { View, Text, ScrollView, TouchableOpacity, Animated, DimensionValue, Share } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../lib/store'
import { toast } from '../../lib/toast'

// ── Colors ────────────────────────────────────────────────────
const C = {
    bg: '#0D1117', card: '#161B22', border: '#21262D',
    accent: '#00D4FF', blue: '#1A73E8',
    green: '#00C853', orange: '#FFB300', red: '#FF3D57', purple: '#B388FF',
    white: '#E6EDF3', muted: '#8B949E', dim: '#484F58',
}

// ── Stat bars ─────────────────────────────────────────────────
const RADAR_STATS = [
    { label: 'Vitesse de tir', value: 78, color: C.accent },
    { label: 'Précision (FG%)', value: 85, color: C.blue },
    { label: 'Lecture du jeu',  value: 72, color: C.green },
    { label: 'Score Mental',    value: 85, color: C.orange },
    { label: 'Défense',         value: 60, color: C.red },
    { label: 'Clutch Factor',   value: 90, color: C.purple },
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
        <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: C.muted, fontSize: 13 }}>{label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: C.dim, fontSize: 11 }}>{grade}</Text>
                    <Text style={{ color, fontSize: 14, fontWeight: '800' }}>{value}</Text>
                </View>
            </View>
            <View style={{ height: 7, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' }}>
                <Animated.View style={{
                    height: 7, borderRadius: 4, backgroundColor: color,
                    width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                }} />
            </View>
        </View>
    )
}

// ── Insight row ───────────────────────────────────────────────
function InsightRow({ text, type }: { text: string; type: 'good' | 'tip' | 'warn' }) {
    const icon = type === 'good' ? 'checkmark-circle' : type === 'tip' ? 'bulb-outline' : 'trending-up-outline'
    const color = type === 'good' ? C.green : type === 'tip' ? C.accent : C.orange
    return (
        <View style={{
            flexDirection: 'row', alignItems: 'flex-start',
            backgroundColor: `${color}10`, borderRadius: 14,
            padding: 13, marginBottom: 9,
            borderLeftWidth: 3, borderLeftColor: color,
        }}>
            <Ionicons name={icon as any} size={18} color={color} style={{ marginRight: 10, marginTop: 1 }} />
            <Text style={{ color: C.white, fontSize: 13, flex: 1, lineHeight: 20 }}>{text}</Text>
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
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
            {/* Header */}
            <View style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 20, paddingVertical: 14,
                borderBottomWidth: 1, borderBottomColor: C.border,
            }}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14 }}>
                    <Ionicons name="arrow-back" size={24} color={C.white} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: C.white, fontSize: 19, fontWeight: '800' }}>Rapport d'Analyse</Text>
                    <Text style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>Session #{id}</Text>
                </View>
                <TouchableOpacity
                    onPress={handleShare}
                    style={{
                        backgroundColor: `${C.blue}20`, borderRadius: 10,
                        paddingHorizontal: 10, paddingVertical: 6,
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                    }}
                >
                    <Ionicons name="share-outline" size={16} color={C.blue} />
                    <Text style={{ color: C.blue, fontSize: 12, fontWeight: '700' }}>Partager</Text>
                </TouchableOpacity>
            </View>

            {/* Score Hero */}
            <View style={{
                flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, gap: 10,
                borderBottomWidth: 1, borderBottomColor: C.border,
            }}>
                <View style={{
                    flex: 1.5, backgroundColor: C.blue, borderRadius: 18,
                    padding: 18, alignItems: 'center',
                    shadowColor: C.blue, shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.4, shadowRadius: 12,
                }}>
                    <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>Tirs (Made/Att)</Text>
                    <Text style={{ color: '#FFF', fontSize: 34, fontWeight: '900', marginVertical: 4 }}>14/22</Text>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>63.6% · +12% vs Moy.</Text>
                    </View>
                </View>
                <View style={{ flex: 1, gap: 10 }}>
                    <View style={{
                        backgroundColor: C.card, borderRadius: 14, padding: 14, alignItems: 'center', flex: 1,
                        borderWidth: 1, borderColor: `${C.green}30`,
                    }}>
                        <Text style={{ color: C.muted, fontSize: 11 }}>Mental</Text>
                        <Text style={{ color: C.green, fontSize: 24, fontWeight: '900' }}>
                            {session?.mental_score ?? 85}
                        </Text>
                        <Text style={{ color: C.green, fontSize: 9, fontWeight: '600', textAlign: 'center' }}>
                            {mentalLabel(session?.mental_score ?? 85)}
                        </Text>
                    </View>
                    <View style={{
                        backgroundColor: C.card, borderRadius: 14, padding: 14, alignItems: 'center', flex: 1,
                        borderWidth: 1, borderColor: C.border,
                    }}>
                        <Text style={{ color: C.muted, fontSize: 11 }}>Grade</Text>
                        <Text style={{ color: C.orange, fontSize: 24, fontWeight: '900' }}>
                            {session?.shooting_grade ?? 'A'}
                        </Text>
                        <Text style={{ color: C.muted, fontSize: 9 }}>FG Grade</Text>
                    </View>
                </View>
            </View>

            {/* Tabs */}
            <View style={{
                flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 10,
                borderBottomWidth: 1, borderBottomColor: C.border, gap: 6,
            }}>
                {(['stats', 'heatmap', 'report'] as const).map(tab => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        style={{
                            flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center',
                            backgroundColor: activeTab === tab ? C.blue : C.card,
                        }}
                    >
                        <Text style={{
                            color: activeTab === tab ? C.white : C.muted,
                            fontWeight: '700', fontSize: 12,
                        }}>
                            {tab === 'stats' ? '📊 Stats' : tab === 'heatmap' ? '🗺 Terrain' : '🤖 Coach IA'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Animated.ScrollView
                style={{ opacity: fadeAnim }}
                contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {activeTab === 'stats' && (
                    <>
                        <Text style={{ color: C.white, fontSize: 16, fontWeight: '800', marginBottom: 14 }}>
                            📊 Radar des Compétences
                        </Text>
                        <View style={{
                            backgroundColor: C.card, borderRadius: 18, padding: 18,
                            marginBottom: 20, borderWidth: 1, borderColor: C.border,
                        }}>
                            {RADAR_STATS.map((s, i) => (
                                <RadarBar key={s.label} {...s} delay={i * 80} />
                            ))}
                        </View>

                        {/* Comparaison */}
                        <View style={{
                            backgroundColor: C.card, borderRadius: 18, padding: 18,
                            borderWidth: 1, borderColor: `${C.accent}25`,
                        }}>
                            <Text style={{ color: C.accent, fontSize: 14, fontWeight: '800', marginBottom: 12 }}>
                                ⚡ Évolution depuis la dernière session
                            </Text>
                            {/*
                                { label: 'FG%', prev: '58%', now: '64%', up: true },
                                { label: 'Mental', prev: '80', now: '85', up: true },
                                { label: 'Vitesse', prev: '80', now: '78', up: false },
                            ].map(row => (
                                <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                    <Text style={{ color: C.muted, width: 80, fontSize: 13 }}>{row.label}</Text>
                                    <Text style={{ color: C.dim, fontSize: 13 }}>{row.prev}</Text>
                                    <Ionicons
                                        name={row.up ? 'arrow-forward' : 'arrow-forward'}
                                        size={14} color={C.muted} style={{ marginHorizontal: 8 }}
                                    />
                                    <Text style={{ color: row.up ? C.green : C.red, fontSize: 13, fontWeight: '700' }}>
                                        {row.now} {row.up ? '↑' : '↓'}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </>
                )}

                {activeTab === 'heatmap' && (
                    <>
                        <Text style={{ color: C.white, fontSize: 16, fontWeight: '800', marginBottom: 12 }}>
                            🗺 Heatmap Terrain
                        </Text>
                        <View style={{
                            height: 260, backgroundColor: C.card, borderRadius: 18,
                            marginBottom: 16, borderWidth: 1, borderColor: C.border,
                            overflow: 'hidden', position: 'relative',
                        }}>
                            {/* Court lines */}
                            <View style={{ position: 'absolute', top: 20, left: 20, right: 20, bottom: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 8 }} />
                            <View style={{ position: 'absolute', bottom: 20, left: '30%', right: '30%', height: '40%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderBottomWidth: 0 }} />
                            <View style={{ position: 'absolute', bottom: '35%', left: '25%', right: '25%', height: 50, borderTopLeftRadius: 60, borderTopRightRadius: 60, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderBottomWidth: 0 }} />
                            <View style={{ position: 'absolute', bottom: 20, left: '5%', right: '5%', height: '70%', borderTopLeftRadius: 200, borderTopRightRadius: 200, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderBottomWidth: 0 }} />

                            {HEATMAP_ZONES.map((z, i) => {
                                const pct = z.made / z.att
                                const color = pct >= 0.7 ? C.green : pct >= 0.5 ? C.orange : C.red
                                return (
                                    <View key={i} style={{ position: 'absolute', left: z.left, top: z.top, transform: [{ translateX: -14 }, { translateY: -14 }] }}>
                                        <View style={{ position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: color, opacity: z.intensity * 0.3, transform: [{ scale: 2.2 }] }} />
                                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: color, opacity: z.intensity, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}>
                                            <Text style={{ color: '#FFF', fontSize: 7, fontWeight: '900' }}>{z.made}/{z.att}</Text>
                                        </View>
                                    </View>
                                )
                            })}

                            <View style={{ position: 'absolute', top: 10, right: 12, flexDirection: 'row', gap: 10 }}>
                                {[{ c: C.green, l: '≥70%' }, { c: C.orange, l: '≥50%' }, { c: C.red, l: '<50%' }].map(({ c, l }) => (
                                    <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                        <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: c }} />
                                        <Text style={{ color: C.muted, fontSize: 9 }}>{l}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border }}>
                            <Text style={{ color: C.accent, fontWeight: '700', fontSize: 13, marginBottom: 8 }}>Zone chaude du match</Text>
                            <Text style={{ color: C.white, fontSize: 13, lineHeight: 20 }}>
                                5/6 dans le corner gauche (83% FG) — Ta zone de prédilection. Continue à créer dans cet espace.
                            </Text>
                        </View>
                    </>
                )}

                {activeTab === 'report' && (
                    <>
                        <View style={{
                            backgroundColor: C.card, borderRadius: 18, padding: 18,
                            marginBottom: 20, borderWidth: 1, borderColor: `${C.accent}30`,
                            borderLeftWidth: 4, borderLeftColor: C.accent,
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                <Text style={{ fontSize: 18, marginRight: 8 }}>🤖</Text>
                                <Text style={{ color: C.accent, fontSize: 15, fontWeight: '800' }}>Analyse Coach IA (Groq)</Text>
                            </View>
                            <Text style={{ color: C.white, fontSize: 14, lineHeight: 24, marginBottom: 12 }}>
                                Excellente lecture de jeu aujourd'hui. Ton temps de prise de décision sur pick-and-roll a baissé de <Text style={{ color: C.green, fontWeight: '700' }}>15%</Text> — c'est significatif.
                            </Text>
                            <Text style={{ color: C.white, fontSize: 14, lineHeight: 24, marginBottom: 12 }}>
                                Mécanique de tir très fluide — angle du coude constant à <Text style={{ color: C.blue, fontWeight: '700' }}>92°</Text>. Ton body language est resté positif même après tes deux ratés consécutifs au Q3.
                            </Text>
                            <Text style={{ color: C.white, fontSize: 14, lineHeight: 24 }}>
                                Conseil : Travaille ta reprise d'appuis sur les tirs en sortie de dribble côté faible. 3 exercices ajoutés dans ton programme.
                            </Text>
                        </View>

                        <Text style={{ color: C.white, fontSize: 16, fontWeight: '800', marginBottom: 10 }}>
                            💡 Points Clés
                        </Text>
                        <InsightRow type="good" text="Mécanique de tir : coude à 92° constant — au-dessus de ta moyenne sur 30 dernières sessions." />
                        <InsightRow type="good" text="Body language positif tout au long du match, même après 2 ratés consécutifs (résilience mentale ✅)." />
                        <InsightRow type="tip"  text="Améliore ta reprise d'appuis côté gauche — différentiel de 18% vs côté droit." />
                        <InsightRow type="tip"  text="Temps de décision en sortie de pick-and-roll encore perfectible (-15% → vise -25% d'ici 2 semaines)." />

                        <View style={{
                            backgroundColor: `${C.purple}10`, borderRadius: 14, padding: 14,
                            borderWidth: 1, borderColor: `${C.purple}30`, marginTop: 6,
                        }}>
                            <Text style={{ color: C.purple, fontWeight: '700', fontSize: 13, marginBottom: 6 }}>
                                🎯 Objectif pour la prochaine session
                            </Text>
                            <Text style={{ color: C.white, fontSize: 13, lineHeight: 20 }}>
                                Atteindre 70% FG depuis le corner gauche et réduire le temps de décision pick-and-roll à moins de 1.2s.
                            </Text>
                        </View>
                    </>
                )}
            </Animated.ScrollView>

            {/* ── Sticky CTA ── */}
            <View style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                paddingHorizontal: 20, paddingBottom: 30, paddingTop: 12,
                backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border,
            }}>
                <TouchableOpacity
                    style={{
                        backgroundColor: C.blue, paddingVertical: 15, borderRadius: 30,
                        alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
                        shadowColor: C.blue, shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.4, shadowRadius: 10,
                    }}
                    onPress={() => router.push(`/highlight/${id}`)}
                    activeOpacity={0.85}
                >
                    <Ionicons name="play" size={20} color="#FFF" style={{ marginRight: 10 }} />
                    <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 17 }}>🎬 Regarder le Highlight Reel</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}
