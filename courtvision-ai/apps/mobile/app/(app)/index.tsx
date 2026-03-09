import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Play, BarChart2, Zap, Users } from 'lucide-react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { colors, typography, space, shadows, radius } from '../../constants/tokens';
import { Badge } from '../../components/ui/Badge';
import { useRouter } from 'expo-router';
import { useStore, selectUser, selectIsDemoMode } from '../../lib/store';
import { api } from '../../lib/api';

interface DashboardData {
    lastGameAccuracy: number | null;
    rosterCount: number;
    shadowLeague: {
        matchupTitle: string;
        rivalName: string;
        simResult: string;
        winRate: string;
        releaseGap: string;
        coachInsight: string;
    } | null;
    objectives: string[];
    recentSessions: Array<{
        id: string;
        name: string;
        details: string;
        accuracy: number;
    }>;
}

function getGreetingTime(): string {
    const h = new Date().getHours();
    if (h < 6) return 'Good night,';
    if (h < 12) return 'Good morning,';
    if (h < 18) return 'Good afternoon,';
    return 'Good evening,';
}

export default function DashboardScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const user = useStore(selectUser);
    const isDemoMode = useStore(selectIsDemoMode);
    const [data, setData] = useState<DashboardData | null>(null);

    // Pulse animation for the "Online" dot
    const dotOpacity = useSharedValue(1);
    React.useEffect(() => {
        dotOpacity.value = withRepeat(
            withSequence(
                withTiming(0.4, { duration: 800 }),
                withTiming(1, { duration: 800 })
            ),
            -1,
            true
        );
    }, []);

    const animatedDot = useAnimatedStyle(() => ({
        opacity: dotOpacity.value
    }));

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = useCallback(async () => {
        if (isDemoMode) {
            setData({
                lastGameAccuracy: 94.2,
                rosterCount: 12,
                shadowLeague: {
                    matchupTitle: 'Morning Simulation: Matchup #842',
                    rivalName: 'Rival Marc',
                    simResult: 'L 2:3',
                    winRate: '32%',
                    releaseGap: '-0.2s',
                    coachInsight: 'Marc has a faster vertical leap (+4cm) than your contest ability. You lose 68% of matchups in "Switch Defense".',
                },
                objectives: [
                    'Hit 5 catch-and-shoot 3s (>20km/h prep)',
                    'Keep elbow flare < 5° under fatigue',
                    'At least 10 high-intensity sprints',
                ],
                recentSessions: [
                    { id: 'demo-01', name: 'Mar 01 · vs City Lakers', details: '1h 24min  ·  Full Court', accuracy: 94.2 },
                    { id: 'demo-02', name: 'Feb 28 · Training', details: '45min  ·  Half Court', accuracy: 88.7 },
                ],
            });
            return;
        }
        try {
            const res = await api.get<{ data: DashboardData }>('/api/dashboard');
            setData(res.data ?? res as any);
        } catch {
            setData({
                lastGameAccuracy: null,
                rosterCount: 0,
                shadowLeague: null,
                objectives: [],
                recentSessions: [],
            });
        }
    }, [isDemoMode]);

    const displayName = user?.full_name ?? user?.email?.split('@')[0] ?? 'Player';
    const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <View style={styles.container}>
            <View style={styles.gridOverlay}>
                {Array.from({ length: 40 }).map((_, i) => (
                    <View key={`v-${i}`} style={[styles.gridVLine, { left: i * 40 }]} />
                ))}
                {Array.from({ length: 40 }).map((_, i) => (
                    <View key={`h-${i}`} style={[styles.gridHLine, { top: i * 40 }]} />
                ))}
            </View>

            <ScrollView
                contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Top Bar */}
                <View style={styles.topBar}>
                    <Text style={styles.logoText}>COURTVISION <Text style={{ color: colors.fire }}>AI</Text></Text>
                    <View style={styles.headerRight}>
                        <View style={styles.bellContainer}>
                            <Bell color={colors.cloud} size={22} />
                            <View style={styles.bellBadge} />
                        </View>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{initials}</Text>
                        </View>
                    </View>
                </View>

                {/* Header Greeting */}
                <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.greetingSection}>
                    <Text style={styles.greetingTime}>{getGreetingTime()}</Text>
                    <Text style={styles.greetingName}>{displayName}. 🏀</Text>

                    <View style={styles.statusRow}>
                        <Animated.View style={[styles.statusDot, animatedDot]} />
                        <Text style={styles.statusText}>Twin Online</Text>
                    </View>
                </Animated.View>

                {/* Quick Actions Grid */}
                <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.actionsGrid}>
                    {/* Hero Card */}
                    <Pressable style={[styles.actionCard, styles.actionCardHero]} onPress={() => router.push('/(app)/record')}>
                        <View style={styles.cardHeader}>
                            <Play fill={colors.snow} color={colors.snow} size={20} />
                        </View>
                        <Text style={styles.heroCardText}>NEW{"\n"}SESSION</Text>
                        <View style={styles.heroDecoLine} />
                    </Pressable>

                    <View style={styles.rightCol}>
                        <Pressable style={styles.actionCardSecondary} onPress={() => router.push('/(app)/sessions/recent')}>
                            <View style={[styles.cardHeader, { justifyContent: 'space-between', flexDirection: 'row', width: '100%' }]}>
                                <BarChart2 color={colors.fire} size={20} />
                                <Text style={styles.miniStatText}>{data?.lastGameAccuracy != null ? `${data.lastGameAccuracy}%` : '—'}</Text>
                            </View>
                            <Text style={styles.secondaryCardText}>LAST GAME</Text>
                        </Pressable>
                        <Pressable style={styles.actionCardSecondary}>
                            <View style={styles.cardHeader}>
                                <Users color={colors.fire} size={20} />
                            </View>
                            <Text style={styles.secondaryCardText}>ROSTER ({data?.rosterCount ?? 0})</Text>
                        </Pressable>
                    </View>
                </Animated.View>

                {/* Stats row below grid */}
                <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.statsBanner}>
                    <Pressable style={[styles.actionCardSecondary, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', padding: space[4] }]}>
                        <Zap color={colors.fire} size={20} style={{ marginRight: space[3] }} />
                        <Text style={styles.secondaryCardText}>LIVE STATS</Text>
                        <View style={{ flex: 1 }} />
                        <Text style={{ ...typography.label, color: colors.live }}>● ACTIVE</Text>
                    </Pressable>
                </Animated.View>

                {/* THE SHADOW LEAGUE — MORNING REPORT */}
                {data?.shadowLeague && (
                <Animated.View entering={FadeInDown.delay(320).duration(400)} style={styles.shadowLeagueSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: '#B088FF' }]}>THE SHADOW LEAGUE</Text>
                        <View style={[styles.sectionLine, { backgroundColor: 'rgba(176, 136, 255, 0.2)' }]} />
                        <Badge label="NEW REPORT" variant="live" />
                    </View>

                    <Pressable style={styles.shadowCard}>
                        <View style={styles.shadowCardHeader}>
                            <View style={styles.shadowIconContainer}>
                                <Users color="#B088FF" size={20} />
                            </View>
                            <View style={styles.shadowHeaderText}>
                                <Text style={styles.shadowTitle}>{data.shadowLeague.matchupTitle}</Text>
                                <Text style={styles.shadowSubtitle}>Against Digital Twin: <Text style={{ color: colors.fire }}>'{data.shadowLeague.rivalName}'</Text></Text>
                            </View>
                        </View>

                        <View style={styles.shadowResultRow}>
                            <View style={styles.shadowMetric}>
                                <Text style={styles.shadowMetricValue}>{data.shadowLeague.simResult}</Text>
                                <Text style={styles.shadowMetricLabel}>SIM RESULT</Text>
                            </View>
                            <View style={styles.shadowMetric}>
                                <Text style={styles.shadowMetricValue}>{data.shadowLeague.winRate}</Text>
                                <Text style={styles.shadowMetricLabel}>WIN RATE</Text>
                            </View>
                            <View style={styles.shadowMetric}>
                                <Text style={styles.shadowMetricValue}>{data.shadowLeague.releaseGap}</Text>
                                <Text style={styles.shadowMetricLabel}>RELEASE GAP</Text>
                            </View>
                        </View>

                        <View style={styles.shadowReportBox}>
                            <Text style={styles.shadowReportText}>
                                <Text style={{ fontWeight: '700', color: '#B088FF' }}>COACH AI:</Text> {data.shadowLeague.coachInsight}
                            </Text>
                        </View>

                        <View style={styles.shadowCardFooter}>
                            <Text style={styles.shadowFooterText}>View full game logs</Text>
                            <Play color="#B088FF" size={12} />
                        </View>
                    </Pressable>
                </Animated.View>
                )}

                {/* LIVE PLAYBOOK */}
                {(data?.objectives?.length ?? 0) > 0 && (
                <Animated.View entering={FadeInDown.delay(350).duration(400)} style={styles.playbookSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.fire }]}>LIVE PLAYBOOK</Text>
                        <View style={[styles.sectionLine, { backgroundColor: colors.fireTrace }]} />
                    </View>
                    <View style={styles.playbookCard}>
                        <Text style={styles.playbookTitle}>TODAY'S AI OBJECTIVES</Text>
                        {data!.objectives.map((goal, i) => (
                            <View key={i} style={styles.goalRow}>
                                <View style={styles.goalCheckbox} />
                                <Text style={styles.goalText}>{goal}</Text>
                            </View>
                        ))}
                    </View>
                </Animated.View>
                )}

                {/* Recent Sessions */}
                <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.recentSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>RECENT</Text>
                        <View style={styles.sectionLine} />
                    </View>

                    {(data?.recentSessions ?? []).length === 0 && (
                        <Text style={{ color: colors.fog, fontFamily: 'DMSans_400Regular', fontSize: 14, textAlign: 'center', marginTop: space[4] }}>
                            No sessions yet. Record your first session!
                        </Text>
                    )}

                    {(data?.recentSessions ?? []).map((session) => (
                    <Pressable key={session.id} style={styles.sessionCard} onPress={() => router.push(`/(app)/sessions/${session.id}`)}>
                        <View style={styles.sessionInfo}>
                            <Text style={styles.sessionName}>{session.name}</Text>
                            <Text style={styles.sessionDetails}>{session.details}</Text>
                            <View style={styles.sessionTags}>
                                <View style={styles.tag}>
                                    <Text style={styles.tagText}>🏀 Basketball</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.accuracyBadge}>
                            <Text style={styles.accuracyValue}>{session.accuracy}%</Text>
                            <Text style={styles.accuracyLabel}>accuracy</Text>
                        </View>
                    </Pressable>
                    ))}
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.base,
    },
    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.03, // 3% opacity as requested
        overflow: 'hidden',
    },
    gridVLine: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 1,
        backgroundColor: colors.snow,
    },
    gridHLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: colors.snow,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: space.screenH,
        paddingBottom: space[4],
        paddingTop: space[3],
    },
    logoText: {
        fontFamily: 'BarlowCondensed_700Bold',
        fontSize: 18,
        color: colors.snow,
        letterSpacing: 0.5,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[4],
    },
    bellContainer: {
        position: 'relative',
    },
    bellBadge: {
        position: 'absolute',
        top: 0,
        right: 2,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.fire,
        borderWidth: 1,
        borderColor: colors.base,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.fireGlow,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.fireTrace,
    },
    avatarText: {
        fontFamily: 'BarlowCondensed_700Bold',
        fontSize: 16,
        color: colors.fire,
    },
    greetingSection: {
        paddingHorizontal: space.screenH,
        marginTop: space[2],
        marginBottom: space[6],
    },
    greetingTime: {
        fontFamily: 'DMSans_400Regular',
        fontSize: 14,
        color: colors.cloud,
        marginBottom: 2,
    },
    greetingName: {
        ...typography.h1,
        fontSize: 42,
        color: colors.snow,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: space[2],
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.live,
        marginRight: 6,
    },
    statusText: {
        fontFamily: 'DMSans_400Regular',
        fontSize: 13,
        color: colors.live,
    },
    actionsGrid: {
        flexDirection: 'row',
        paddingHorizontal: space.screenH,
        gap: 10,
        height: 190,
    },
    actionCard: {
        borderRadius: 18,
        padding: 16,
        justifyContent: 'space-between',
    },
    actionCardHero: {
        flex: 1,
        backgroundColor: colors.fire,
        ...shadows.orangeGlow,
    },
    cardHeader: {
        alignItems: 'flex-start',
    },
    heroCardText: {
        fontFamily: 'BarlowCondensed_800ExtraBold_Italic',
        fontSize: 24,
        color: colors.snow,
        lineHeight: 24,
        marginTop: 'auto',
    },
    heroDecoLine: {
        width: 24,
        height: 2,
        backgroundColor: colors.snow,
        opacity: 0.4,
        marginTop: 12,
    },
    rightCol: {
        flex: 1,
        gap: 10,
    },
    actionCardSecondary: {
        flex: 1,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: 18,
        padding: space[3],
        justifyContent: 'space-between',
    },
    miniStatText: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 14,
        color: colors.fire,
    },
    secondaryCardText: {
        fontFamily: 'BarlowCondensed_700Bold',
        fontSize: 16,
        color: colors.snow,
        marginTop: 'auto',
    },
    statsBanner: {
        paddingHorizontal: space.screenH,
        marginTop: 10,
        height: 70,
    },
    shadowLeagueSection: {
        paddingHorizontal: space.screenH,
        marginTop: space[6],
    },
    shadowCard: {
        backgroundColor: 'rgba(25, 10, 50, 0.4)',
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(176, 136, 255, 0.3)',
        padding: space[4],
        shadowColor: '#B088FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    shadowCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: space[4],
    },
    shadowIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(176, 136, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: space[3],
        borderWidth: 1,
        borderColor: 'rgba(176, 136, 255, 0.2)',
    },
    shadowHeaderText: {
        flex: 1,
    },
    shadowTitle: {
        fontFamily: 'BarlowCondensed_700Bold',
        fontSize: 14,
        color: colors.snow,
        letterSpacing: 0.5,
    },
    shadowSubtitle: {
        fontFamily: 'DMSans_400Regular',
        fontSize: 12,
        color: colors.fog,
        marginTop: 2,
    },
    shadowResultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(5, 5, 5, 0.3)',
        borderRadius: radius.md,
        padding: space[3],
        marginBottom: space[4],
    },
    shadowMetric: {
        alignItems: 'center',
        flex: 1,
    },
    shadowMetricValue: {
        fontFamily: 'JetBrainsMono_700Bold',
        fontSize: 16,
        color: '#B088FF',
    },
    shadowMetricLabel: {
        fontFamily: 'DMSans_700Bold',
        fontSize: 8,
        color: colors.cloud,
        marginTop: 4,
        letterSpacing: 1,
    },
    shadowReportBox: {
        padding: space[3],
        backgroundColor: 'rgba(176, 136, 255, 0.05)',
        borderRadius: radius.sm,
        borderLeftWidth: 2,
        borderLeftColor: '#B088FF',
        marginBottom: space[3],
    },
    shadowReportText: {
        fontFamily: 'DMSans_400Regular',
        fontSize: 12,
        color: colors.snow,
        lineHeight: 18,
    },
    shadowCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    shadowFooterText: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 10,
        color: '#B088FF',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    playbookSection: {
        paddingHorizontal: space.screenH,
        marginTop: space[6],
    },
    playbookCard: {
        backgroundColor: colors.surface2,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.fire,
        padding: space[4],
        ...shadows.orangeGlow,
        shadowOpacity: 0.15, // dim it down slightly so it's not overwhelming
    },
    playbookTitle: {
        fontFamily: 'JetBrainsMono_700Bold',
        fontSize: 12,
        color: colors.fire,
        marginBottom: space[3],
        letterSpacing: 1,
    },
    goalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: space[2],
        borderBottomWidth: 1,
        borderBottomColor: colors.surface3,
    },
    goalCheckbox: {
        width: 16,
        height: 16,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.cloud,
        marginRight: space[3],
    },
    goalText: {
        ...typography.body,
        color: colors.snow,
        flex: 1,
    },
    recentSection: {
        paddingHorizontal: space.screenH,
        marginTop: space[7],
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: space[4],
    },
    sectionTitle: {
        ...typography.label,
        color: colors.fog,
        letterSpacing: 2,
    },
    sectionLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.line,
        marginLeft: space[3],
    },
    sessionCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.line,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sessionInfo: {
        flex: 1,
    },
    sessionName: {
        fontFamily: 'DMSans_700Bold',
        fontSize: 14,
        color: colors.snow,
    },
    sessionDetails: {
        fontFamily: 'DMSans_400Regular',
        fontSize: 12,
        color: colors.fog,
        marginTop: 4,
    },
    sessionTags: {
        flexDirection: 'row',
        marginTop: 12,
    },
    tag: {
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface2,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    tagText: {
        fontFamily: 'DMSans_500Medium',
        fontSize: 11,
        color: colors.cloud,
    },
    accuracyBadge: {
        backgroundColor: colors.liveDim,
        padding: 10,
        borderRadius: 12,
        alignItems: 'center',
        minWidth: 64,
    },
    accuracyValue: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 16, // lowered from 18px to fit perfectly on small screens
        color: colors.live,
        fontWeight: '700',
    },
    accuracyLabel: {
        fontFamily: 'DMSans_500Medium',
        fontSize: 9,
        color: colors.live,
        marginTop: 2,
        textTransform: 'uppercase',
    }
});
