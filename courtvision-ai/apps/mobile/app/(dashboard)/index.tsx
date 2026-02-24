import { View, Text, ScrollView, FlatList, TouchableOpacity, Animated, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useEffect, useRef } from 'react'
import { useStore, selectWeekly, selectHighlights, selectStreak } from '../../lib/store'
import type { HighlightClip } from '../../lib/store'

// ── Animated bar ─────────────────────────────────────────────
function WeekBar({ value, color, delay }: { value: number; color: string; delay: number }) {
    const anim = useRef(new Animated.Value(0)).current
    useEffect(() => {
        Animated.timing(anim, {
            toValue: value / 100,
            duration: 600,
            delay,
            useNativeDriver: false,
        }).start()
    }, [])
    return (
        <View style={{ flex: 1, height: 60, justifyContent: 'flex-end' }}>
            <Animated.View style={{
                borderRadius: 4,
                backgroundColor: color,
                height: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                opacity: 0.85,
            }} />
        </View>
    )
}

// ── Highlight card (memoized for FlatList) ───────────────────
function HighlightCard({ clip, onPress }: { clip: HighlightClip; onPress: () => void }) {
    return (
        <TouchableOpacity
            style={{
                width: 120, height: 180,
                backgroundColor: '#161B22',
                borderRadius: 16, marginHorizontal: 4,
                overflow: 'hidden',
                borderWidth: 1, borderColor: '#21262D',
                justifyContent: 'space-between',
                padding: 12,
            }}
            onPress={onPress}
            activeOpacity={0.8}
            accessibilityLabel={`Voir le highlight ${clip.label}`}
        >
            {/* Fake thumbnail gradient */}
            <View style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 120,
                backgroundColor: 'rgba(26,115,232,0.08)',
                justifyContent: 'center', alignItems: 'center',
            }}>
                <Ionicons name="play-circle" size={36} color="rgba(255,255,255,0.5)" />
            </View>

            {/* AI badge */}
            <View style={{
                alignSelf: 'flex-end',
                backgroundColor: 'rgba(0,212,255,0.2)',
                borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
                borderWidth: 1, borderColor: 'rgba(0,212,255,0.35)',
            }}>
                <Text style={{ color: '#00D4FF', fontSize: 9, fontWeight: '700' }}>AI</Text>
            </View>

            <View style={{ marginTop: 'auto' as any }}>
                <Text style={{ color: '#E6EDF3', fontSize: 12, fontWeight: '700' }}>{clip.label}</Text>
                <Text style={{ color: '#00C853', fontSize: 11, fontWeight: '600', marginTop: 2 }}>{clip.pts}</Text>
                <Text style={{ color: '#484F58', fontSize: 10, marginTop: 2 }}>Il y a {clip.daysAgo}j</Text>
            </View>
        </TouchableOpacity>
    )
}

// ── Main ─────────────────────────────────────────────────────
export default function DashboardIndex() {
    const router = useRouter()

    // Store
    const weeklyData       = useStore(selectWeekly)
    const highlights       = useStore(selectHighlights)
    const streak           = useStore(selectStreak)
    const user             = useStore(s => s.user)
    const weeklyLoading    = useStore(s => s.weeklyLoading)
    const highlightsLoading = useStore(s => s.highlightsLoading)
    const loadWeeklyData   = useStore(s => s.loadWeeklyData)
    const loadHighlights   = useStore(s => s.loadHighlights)

    const today    = new Date()
    const greeting = today.getHours() < 12 ? 'Bonjour' : today.getHours() < 18 ? 'Bonne séance' : 'Bonsoir'

    useEffect(() => {
        loadWeeklyData()
        loadHighlights()
    }, [])

    const mentalScore    = user?.mental_score    ?? 85
    const shootingGrade  = user?.shooting_grade  ?? 'B-'
    const shootingFgPct  = user?.shooting_fg_pct ?? 63.6

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1117' }}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

                {/* ── Header ── */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <View>
                        <Text style={{ color: '#8B949E', fontSize: 13 }}>{greeting} 👋</Text>
                        <Text style={{ color: '#E6EDF3', fontSize: 26, fontWeight: '800', letterSpacing: -0.3, marginTop: 2 }}>
                            Dashboard
                        </Text>
                    </View>
                    <View style={{
                        backgroundColor: '#161B22', borderRadius: 14,
                        paddingHorizontal: 12, paddingVertical: 8,
                        borderWidth: 1, borderColor: '#21262D',
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                    }}>
                        <Text style={{ fontSize: 16 }}>🔥</Text>
                        <View>
                            <Text style={{ color: '#FF9800', fontWeight: '800', fontSize: 15 }}>{streak}</Text>
                            <Text style={{ color: '#8B949E', fontSize: 10 }}>jours</Text>
                        </View>
                    </View>
                </View>

                {/* ── CTA Principal ── */}
                <TouchableOpacity
                    style={{
                        backgroundColor: '#1A73E8',
                        borderRadius: 20,
                        padding: 28,
                        alignItems: 'center',
                        marginBottom: 12,
                        shadowColor: '#1A73E8',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.45,
                        shadowRadius: 20,
                        elevation: 8,
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 12,
                    }}
                    onPress={() => router.push('/(dashboard)/upload')}
                    activeOpacity={0.85}
                    accessibilityLabel="Analyser un match — importer une vidéo"
                >
                    <Ionicons name="scan-circle" size={44} color="#FFF" />
                    <View>
                        <Text style={{ color: '#FFF', fontSize: 19, fontWeight: '800' }}>Analyser un match</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 }}>
                            Importer une vidéo ou filmer
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* ── Boutons secondaires ── */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                    <TouchableOpacity
                        style={{
                            flex: 1, backgroundColor: '#161B22', borderRadius: 16,
                            padding: 18, alignItems: 'center',
                            borderWidth: 1, borderColor: 'rgba(255,61,87,0.4)',
                        }}
                        onPress={() => router.push('/live')}
                        activeOpacity={0.85}
                        accessibilityLabel="Lancer le Coach Live en temps réel"
                    >
                        <MaterialCommunityIcons name="radar" size={28} color="#FF3D57" />
                        <Text style={{ color: '#E6EDF3', fontSize: 13, fontWeight: '700', marginTop: 6 }}>Coach Live</Text>
                        <Text style={{ color: '#8B949E', fontSize: 10, marginTop: 2 }}>Temps réel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            flex: 1, backgroundColor: '#161B22', borderRadius: 16,
                            padding: 18, alignItems: 'center',
                            borderWidth: 1, borderColor: 'rgba(0,200,83,0.4)',
                        }}
                        onPress={() => router.push('/program')}
                        activeOpacity={0.85}
                        accessibilityLabel="Voir le programme d'entraînement"
                    >
                        <Ionicons name="fitness" size={28} color="#00C853" />
                        <Text style={{ color: '#E6EDF3', fontSize: 13, fontWeight: '700', marginTop: 6 }}>Programme</Text>
                        <Text style={{ color: '#8B949E', fontSize: 10, marginTop: 2 }}>7 jours</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Progression Hebdo ── */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ color: '#E6EDF3', fontSize: 18, fontWeight: '700' }}>Progression Hebdo</Text>
                    {weeklyLoading && <ActivityIndicator size="small" color="#1A73E8" />}
                </View>
                <View style={{
                    backgroundColor: '#161B22', borderRadius: 18,
                    padding: 16, marginBottom: 24,
                    borderWidth: 1, borderColor: '#21262D',
                }}>
                    {/* Legend */}
                    <View style={{ flexDirection: 'row', gap: 14, marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#00D4FF' }} />
                            <Text style={{ color: '#8B949E', fontSize: 11 }}>Mental</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#1A73E8' }} />
                            <Text style={{ color: '#8B949E', fontSize: 11 }}>Tir</Text>
                        </View>
                    </View>

                    {/* Bars */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 70 }}>
                        {weeklyData.map((d, i) => (
                            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                                {d.hasSession ? (
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 2, width: '100%' }}>
                                        <WeekBar value={d.mental} color="#00D4FF" delay={i * 60} />
                                        <WeekBar value={d.shooting} color="#1A73E8" delay={i * 60 + 80} />
                                    </View>
                                ) : (
                                    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                                        <View style={{ height: 4, backgroundColor: '#21262D', borderRadius: 2 }} />
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>

                    {/* Day labels */}
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                        {weeklyData.map((d, i) => (
                            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                                <Text style={{ color: d.hasSession ? '#8B949E' : '#30363D', fontSize: 10 }}>{d.day}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* ── Quick Stats ── */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                    {/* Mental Score */}
                    <View style={{
                        flex: 1, backgroundColor: '#161B22', borderRadius: 16,
                        padding: 16, borderWidth: 1, borderColor: 'rgba(0,200,83,0.25)',
                    }}>
                        <Text style={{ color: '#8B949E', fontSize: 11, marginBottom: 4 }}>Mental Score</Text>
                        <Text style={{ color: '#00C853', fontSize: 30, fontWeight: '900' }}>{mentalScore}</Text>
                        <Text style={{ color: '#8B949E', fontSize: 11, marginTop: 2 }}>/ 100</Text>
                        <View style={{
                            flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8,
                            backgroundColor: 'rgba(0,200,83,0.1)',
                            borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start',
                        }}>
                            <Text style={{ color: '#00C853', fontSize: 11, fontWeight: '700' }}>+5% ↑</Text>
                        </View>
                    </View>

                    {/* Shooting Form */}
                    <View style={{
                        flex: 1, backgroundColor: '#161B22', borderRadius: 16,
                        padding: 16, borderWidth: 1, borderColor: 'rgba(255,179,0,0.25)',
                    }}>
                        <Text style={{ color: '#8B949E', fontSize: 11, marginBottom: 4 }}>Shooting Form</Text>
                        <Text style={{ color: '#FFB300', fontSize: 30, fontWeight: '900' }}>{shootingGrade}</Text>
                        <Text style={{ color: '#8B949E', fontSize: 11, marginTop: 2 }}>{shootingFgPct.toFixed(1)} FG%</Text>
                        <View style={{
                            flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8,
                            backgroundColor: 'rgba(255,179,0,0.1)',
                            borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start',
                        }}>
                            <Text style={{ color: '#FFB300', fontSize: 11 }}>Release ↓</Text>
                        </View>
                    </View>
                </View>

                {/* ── Highlights ── */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ color: '#E6EDF3', fontSize: 18, fontWeight: '700' }}>Derniers Highlights</Text>
                    {highlightsLoading && <ActivityIndicator size="small" color="#1A73E8" />}
                </View>

                {highlights.length === 0 && !highlightsLoading ? (
                    // Empty state
                    <View style={{
                        backgroundColor: '#161B22', borderRadius: 16,
                        padding: 32, alignItems: 'center',
                        borderWidth: 1, borderColor: '#21262D',
                    }}>
                        <Ionicons name="film-outline" size={40} color="#30363D" />
                        <Text style={{ color: '#484F58', fontSize: 14, marginTop: 12, textAlign: 'center' }}>
                            Aucun highlight pour l'instant.{'\n'}Analyse un match pour commencer !
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        horizontal
                        data={highlights}
                        keyExtractor={item => item.id}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 4 }}
                        renderItem={({ item }) => (
                            <HighlightCard
                                clip={item}
                                onPress={() => router.push(`/highlight/${item.id}`)}
                            />
                        )}
                        ListEmptyComponent={
                            highlightsLoading ? (
                                // Loading placeholders
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    {[1, 2, 3].map(i => (
                                        <View key={i} style={{
                                            width: 120, height: 180,
                                            backgroundColor: '#161B22',
                                            borderRadius: 16,
                                            borderWidth: 1, borderColor: '#21262D',
                                        }} />
                                    ))}
                                </View>
                            ) : null
                        }
                    />
                )}

            </ScrollView>
        </SafeAreaView>
    )
}
