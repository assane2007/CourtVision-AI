import { View, Text, ScrollView, TouchableOpacity, Animated, DimensionValue } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useEffect, useRef } from 'react'

// ── Colors ────────────────────────────────────────────────────
const C = {
    bg: '#0D1117', card: '#161B22', border: '#21262D',
    accent: '#00D4FF', blue: '#1A73E8',
    green: '#00C853', orange: '#FFB300', red: '#FF3D57',
    white: '#E6EDF3', muted: '#8B949E', dim: '#484F58',
}

// ── Radar data ────────────────────────────────────────────────
const RADAR_STATS = [
    { label: 'Vitesse',  value: 78, color: C.accent },
    { label: 'Tir',      value: 85, color: C.blue },
    { label: 'Lecture',  value: 72, color: C.green },
    { label: 'Mental',   value: 85, color: C.orange },
    { label: 'Défense',  value: 60, color: C.red },
]

// ── Heatmap shot zones ────────────────────────────────────────
const HEATMAP_ZONES: Array<{ left: DimensionValue; top: DimensionValue; intensity: number; made: number; att: number }> = [
    // [left%, top%, opacity, label]
    { left: '15%', top: '20%', intensity: 0.9, made: 5, att: 6 },   // Left corner 3
    { left: '75%', top: '20%', intensity: 0.7, made: 3, att: 5 },   // Right corner 3
    { left: '45%', top: '10%', intensity: 0.5, made: 2, att: 5 },   // Top 3
    { left: '25%', top: '45%', intensity: 0.8, made: 4, att: 5 },   // Left mid
    { left: '65%', top: '45%', intensity: 0.4, made: 1, att: 4 },   // Right mid
    { left: '45%', top: '60%', intensity: 1.0, made: 6, att: 7 },   // Paint (hot)
    { left: '45%', top: '35%', intensity: 0.6, made: 3, att: 6 },   // Elbow
]

// ── Animated stat bar ─────────────────────────────────────────
function RadarBar({ label, value, color, delay }: { label: string; value: number; color: string; delay: number }) {
    const anim = useRef(new Animated.Value(0)).current
    useEffect(() => {
        Animated.timing(anim, { toValue: value / 100, duration: 700, delay, useNativeDriver: false }).start()
    }, [])
    return (
        <View style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <Text style={{ color: C.muted, fontSize: 13 }}>{label}</Text>
                <Text style={{ color, fontSize: 13, fontWeight: '700' }}>{value}</Text>
            </View>
            <View style={{ height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' }}>
                <Animated.View style={{
                    height: 6, borderRadius: 3, backgroundColor: color,
                    width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                }} />
            </View>
        </View>
    )
}

// ── Insight row ───────────────────────────────────────────────
function InsightRow({ text, type }: { text: string; type: 'good' | 'tip' | 'warn' }) {
    const icon = type === 'good' ? 'checkmark-circle' : type === 'tip' ? 'bulb-outline' : 'arrow-up-circle-outline'
    const color = type === 'good' ? C.green : type === 'tip' ? C.accent : C.orange
    return (
        <View style={{
            flexDirection: 'row', alignItems: 'flex-start',
            backgroundColor: `${color}12`,
            borderRadius: 12, padding: 12, marginBottom: 8,
            borderLeftWidth: 3, borderLeftColor: color,
        }}>
            <Ionicons name={icon as any} size={18} color={color} style={{ marginRight: 10, marginTop: 1 }} />
            <Text style={{ color: C.white, fontSize: 13, flex: 1, lineHeight: 20 }}>{text}</Text>
        </View>
    )
}

// ── Main ──────────────────────────────────────────────────────
export default function AnalysisReport() {
    const { id } = useLocalSearchParams()
    const router = useRouter()
    const fadeAnim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start()
    }, [])

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
                    <Text style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>Session #{id} · Il y a 2h</Text>
                </View>
                <View style={{
                    backgroundColor: 'rgba(0,212,255,0.15)',
                    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
                    borderWidth: 1, borderColor: 'rgba(0,212,255,0.3)',
                }}>
                    <Text style={{ color: C.accent, fontSize: 11, fontWeight: '700' }}>IA Groq</Text>
                </View>
            </View>

            <Animated.ScrollView
                style={{ opacity: fadeAnim }}
                contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >

                {/* ── Top Stats ── */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                    <View style={{
                        flex: 1, backgroundColor: C.blue, borderRadius: 16,
                        padding: 18, alignItems: 'center',
                        shadowColor: C.blue, shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.35, shadowRadius: 12,
                    }}>
                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Tirs (Made/Att)</Text>
                        <Text style={{ color: '#FFF', fontSize: 30, fontWeight: '900', marginVertical: 6 }}>14/22</Text>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>+12% vs Moy.</Text>
                        </View>
                    </View>

                    <View style={{ flex: 1, gap: 10 }}>
                        <View style={{
                            backgroundColor: C.card, borderRadius: 14,
                            padding: 14, alignItems: 'center', flex: 1,
                            borderWidth: 1, borderColor: 'rgba(0,200,83,0.3)',
                        }}>
                            <Text style={{ color: C.muted, fontSize: 11 }}>Mental</Text>
                            <Text style={{ color: C.green, fontSize: 24, fontWeight: '900' }}>85</Text>
                            <Text style={{ color: C.green, fontSize: 10, fontWeight: '600' }}>Ice in veins 🥶</Text>
                        </View>
                        <View style={{
                            backgroundColor: C.card, borderRadius: 14,
                            padding: 14, alignItems: 'center', flex: 1,
                            borderWidth: 1, borderColor: C.border,
                        }}>
                            <Text style={{ color: C.muted, fontSize: 11 }}>Décision</Text>
                            <Text style={{ color: C.orange, fontSize: 24, fontWeight: '900' }}>-15%</Text>
                            <Text style={{ color: C.muted, fontSize: 10 }}>Pick-and-roll ⚡</Text>
                        </View>
                    </View>
                </View>

                {/* ── Heatmap ── */}
                <Text style={{ color: C.white, fontSize: 17, fontWeight: '700', marginBottom: 10 }}>
                    🗺 Heatmap Terrain
                </Text>
                <View style={{
                    height: 220, backgroundColor: C.card, borderRadius: 18,
                    marginBottom: 24, borderWidth: 1, borderColor: C.border,
                    overflow: 'hidden', position: 'relative',
                }}>
                    {/* Court outline */}
                    <View style={{
                        position: 'absolute', top: 20, left: 20, right: 20, bottom: 20,
                        borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
                        borderRadius: 8,
                    }} />
                    {/* Paint */}
                    <View style={{
                        position: 'absolute', bottom: 20, left: '30%', right: '30%', height: '40%',
                        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
                        borderBottomWidth: 0,
                    }} />
                    {/* Free throw arc */}
                    <View style={{
                        position: 'absolute', bottom: '35%', left: '25%', right: '25%', height: 50,
                        borderTopLeftRadius: 60, borderTopRightRadius: 60,
                        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
                        borderBottomWidth: 0,
                    }} />
                    {/* 3pt arc hint */}
                    <View style={{
                        position: 'absolute', bottom: 20, left: '5%', right: '5%', height: '70%',
                        borderTopLeftRadius: 200, borderTopRightRadius: 200,
                        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
                        borderBottomWidth: 0,
                    }} />

                    {/* Shot dots */}
                    {HEATMAP_ZONES.map((z, i) => {
                        const pct = z.made / z.att
                        const color = pct >= 0.7 ? C.green : pct >= 0.5 ? C.orange : C.red
                        return (
                            <View key={i} style={{
                                position: 'absolute',
                                left: z.left, top: z.top,
                                transform: [{ translateX: -14 }, { translateY: -14 }],
                            }}>
                                {/* Glow */}
                                <View style={{
                                    position: 'absolute',
                                    width: 28, height: 28, borderRadius: 14,
                                    backgroundColor: color,
                                    opacity: z.intensity * 0.25,
                                    transform: [{ scale: 1.8 }],
                                }} />
                                {/* Dot */}
                                <View style={{
                                    width: 24, height: 24, borderRadius: 12,
                                    backgroundColor: `${color}${Math.round(z.intensity * 200).toString(16).padStart(2, '0')}`,
                                    borderWidth: 1.5, borderColor: color,
                                    justifyContent: 'center', alignItems: 'center',
                                }}>
                                    <Text style={{ color: '#FFF', fontSize: 8, fontWeight: '800' }}>
                                        {z.made}/{z.att}
                                    </Text>
                                </View>
                            </View>
                        )
                    })}

                    {/* Legend */}
                    <View style={{
                        position: 'absolute', top: 10, right: 12,
                        flexDirection: 'row', gap: 8,
                    }}>
                        {[{ c: C.green, l: 'Chaud' }, { c: C.orange, l: 'Moyen' }, { c: C.red, l: 'Froid' }].map(({ c, l }) => (
                            <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c }} />
                                <Text style={{ color: C.muted, fontSize: 9 }}>{l}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* ── Radar des compétences ── */}
                <Text style={{ color: C.white, fontSize: 17, fontWeight: '700', marginBottom: 14 }}>
                    📊 Radar des Compétences
                </Text>
                <View style={{
                    backgroundColor: C.card, borderRadius: 18,
                    padding: 18, marginBottom: 24,
                    borderWidth: 1, borderColor: C.border,
                }}>
                    {RADAR_STATS.map((s, i) => (
                        <RadarBar key={s.label} label={s.label} value={s.value} color={s.color} delay={i * 80} />
                    ))}
                </View>

                {/* ── Rapport Coach IA ── */}
                <Text style={{ color: C.accent, fontSize: 17, fontWeight: '700', marginBottom: 12 }}>
                    🤖 Rapport Coach IA
                </Text>
                <View style={{
                    backgroundColor: C.card, borderRadius: 18,
                    padding: 18, marginBottom: 20,
                    borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)',
                    borderLeftWidth: 4, borderLeftColor: C.accent,
                }}>
                    <Text style={{ color: C.white, fontSize: 14, lineHeight: 22, marginBottom: 12 }}>
                        Excellente lecture de jeu aujourd'hui. Ton temps de prise de décision sur pick-and-roll a baissé de 15%.
                    </Text>
                    <Text style={{ color: C.white, fontSize: 14, lineHeight: 22, marginBottom: 12 }}>
                        Mécanique de tir très fluide — angle du coude constant à 92°. Ton body language est resté positif même après tes deux ratés consécutifs au Q3.
                    </Text>
                    <Text style={{ color: C.white, fontSize: 14, lineHeight: 22 }}>
                        Conseil : Travaille ta reprise d'appuis sur les tirs en sortie de dribble côté faible. 3 exercices ajoutés dans ton programme.
                    </Text>
                </View>

                {/* ── Points clés ── */}
                <Text style={{ color: C.white, fontSize: 17, fontWeight: '700', marginBottom: 10 }}>
                    💡 Points clés
                </Text>
                <InsightRow type="good" text="Mécanique de tir : coude à 92° constant — au-dessus de ta moyenne." />
                <InsightRow type="good" text="Body language positif tout au long du match, y compris après les ratés." />
                <InsightRow type="tip" text="Améliore ta reprise d'appuis côté gauche — différentiel de 18% vs côté droit." />
                <InsightRow type="tip" text="Temps de décision en sortie de pick-and-roll encore perfectible (-15% c'est bien, vise -25%)." />

            </Animated.ScrollView>

            {/* ── Sticky CTA ── */}
            <View style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                paddingHorizontal: 20, paddingBottom: 30, paddingTop: 12,
                backgroundColor: C.bg,
                borderTopWidth: 1, borderTopColor: C.border,
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
                    <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 17 }}>Regarder le Highlight Reel</Text>
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    )
}
