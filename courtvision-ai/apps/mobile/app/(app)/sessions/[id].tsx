import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Share, Sparkles, BarChart2 } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInRight, FadeOutLeft } from 'react-native-reanimated';

import { colors, typography, space, radius } from '../../../constants/tokens';
import { CourtMinimap, ShotPoint } from '../../../components/basketball/CourtMinimap';
import { StatRing } from '../../../components/basketball/StatRing';
import { GhostMode } from '../../../components/basketball/GhostMode';
import { StoryViewer } from '../../../components/ui/StoryViewer';
import { Card } from '../../../components/ui/Card';

const { width } = Dimensions.get('window');

const TABS = ['Overview', 'Ghost Mode', 'Shot DNA', 'Offense', 'Defense'];

const MOCK_SHOTS: ShotPoint[] = [
    { id: '1', x: 20, y: 70, outcome: 'made' },    // Left wing 3pt
    { id: '2', x: 80, y: 65, outcome: 'missed' },  // Right wing 3pt
    { id: '3', x: 50, y: 45, outcome: 'made' },    // Top of key
    { id: '4', x: 30, y: 30, outcome: 'made' },    // Midrange left
    { id: '5', x: 75, y: 25, outcome: 'missed' },  // Midrange right
    { id: '6', x: 50, y: 15, outcome: 'made' },    // Float range
    { id: '7', x: 45, y: 5, outcome: 'made' },     // Layup
    { id: '8', x: 55, y: 5, outcome: 'missed' },   // Missed Layup
    { id: '9', x: 10, y: 85, outcome: 'made' },    // Deep left 3
];

export default function SessionAnalysisScreen() {
    const { id } = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('Overview');
    const [storyVisible, setStoryVisible] = useState(false);
    const [is3DProcessing, setIs3DProcessing] = useState(false);

    return (
        <View style={styles.container}>
            <View style={styles.gridOverlay}>
                {Array.from({ length: 40 }).map((_, i) => (
                    <View key={`v-${i}`} style={[styles.gridVLine, { left: i * 40 }]} />
                ))}
                {Array.from({ length: 50 }).map((_, i) => (
                    <View key={`h-${i}`} style={[styles.gridHLine, { top: i * 40 }]} />
                ))}
            </View>

            <ScrollView
                contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + space[6] }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.iconButton}>
                        <ChevronLeft color={colors.snow} size={24} />
                    </Pressable>
                    <View style={styles.headerTitles}>
                        <Text style={styles.headerSubtitle}>SESSION DETAILS</Text>
                        <Text style={styles.headerTitle}>Mar 01 · vs City Lakers</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Pressable style={styles.iconButtonSmall}>
                            <Share color={colors.cloud} size={20} />
                        </Pressable>
                        <Pressable
                            style={[styles.iconButtonSmall, { marginLeft: space[2] }]}
                            onPress={() => router.push(`/(app)/sessions/chat/${id}`)}
                        >
                            <Sparkles color={colors.fire} size={20} />
                        </Pressable>
                    </View>
                </View>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                        {TABS.map((tab) => {
                            const isActive = activeTab === tab;
                            return (
                                <Pressable
                                    key={tab}
                                    style={[styles.tab, isActive && styles.tabActive]}
                                    onPress={() => setActiveTab(tab)}
                                >
                                    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                                        {tab}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Visualizations Area */}
                <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.visContainer}>
                    {/* Dark Card surrounding the court */}
                    <View style={styles.courtCard}>
                        <CourtMinimap animate={false} width="100%" height={180} shots={MOCK_SHOTS} />
                    </View>
                </Animated.View>

                {activeTab === 'Overview' && (
                    <>
                        {/* Global Metrics Rings */}
                        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.ringsContainer}>
                            <StatRing
                                percentage={94}
                                label="GLOBAL RATING"
                                valueText="94%"
                                size={100}
                                delay={300}
                            />
                            <StatRing
                                percentage={88}
                                label="EFFORT INDEX"
                                valueText="88%"
                                size={100}
                                delay={500}
                            />
                        </Animated.View>

                        {/* Detailed Stats Cards */}
                        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.statsGrid}>
                            <Card style={styles.statCard}>
                                <Text style={styles.statLabel}>Top Speed</Text>
                                <Text style={styles.statValue}>26.4 <Text style={styles.statUnit}>km/h</Text></Text>
                            </Card>
                            <Card style={styles.statCard}>
                                <Text style={styles.statLabel}>Total Distance</Text>
                                <Text style={styles.statValue}>5.2 <Text style={styles.statUnit}>km</Text></Text>
                            </Card>
                            <Card style={styles.statCard}>
                                <Text style={styles.statLabel}>Sprints</Text>
                                <Text style={styles.statValue}>42</Text>
                            </Card>
                            <Card style={styles.statCard}>
                                <Text style={styles.statLabel}>Accels / Decels</Text>
                                <Text style={styles.statValue}>18 / 15</Text>
                            </Card>
                        </Animated.View>

                        {/* Tracking accuracy summary */}
                        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={{ paddingHorizontal: space.screenH, marginTop: space[4] }}>
                            <Card style={styles.footerCard}>
                                <Text style={styles.footerLabel}>AI Tracking Completeness</Text>
                                <View style={styles.progressTrack}>
                                    <View style={[styles.progressBar, { width: '98%' }]} />
                                </View>
                                <Text style={styles.footerSubText}>98% frames successfully captured and analyzed</Text>
                            </Card>
                        </Animated.View>

                        {/* Cinematic Reel & 3D Reconstruction CTAs */}
                        <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.ctasContainer}>
                            <Pressable
                                style={[styles.highlightCTABtn, { flex: 1.5, marginRight: space[2] }]}
                                onPress={() => setStoryVisible(true)}
                            >
                                <View style={styles.ctaGlowBackground} />
                                <Sparkles color={colors.base} size={20} style={{ marginRight: space[1] }} />
                                <Text style={styles.highlightCTAText}>REEL</Text>
                            </Pressable>

                            <Pressable
                                style={styles.spatialCTABtn}
                                onPress={() => setIs3DProcessing(true)}
                            >
                                <View style={styles.spatialGlow} />
                                <BarChart2 color={colors.live} size={20} style={{ marginRight: space[1] }} />
                                <Text style={styles.spatialCTAText}>3D SCENE</Text>
                            </Pressable>
                        </Animated.View>
                    </>
                )}

                {activeTab === 'Shot DNA' && (
                    <Animated.View entering={FadeInRight.delay(100)} style={styles.visContainer}>
                        <Card style={[styles.dnaCard, { marginTop: space[2] }]}>
                            <Text style={styles.dnaTitle}>AI SHOT MECHANICS ANALYSIS</Text>
                            <View style={styles.dnaMetricRow}>
                                <View style={styles.dnaMetric}>
                                    <Text style={styles.statLabel}>Elbow Angle</Text>
                                    <Text style={[styles.statValue, { color: colors.live }]}>94°</Text>
                                    <Text style={styles.footerSubText}>Optimal: 90-100°</Text>
                                </View>
                                <View style={styles.dnaMetric}>
                                    <Text style={styles.statLabel}>Release Time</Text>
                                    <Text style={[styles.statValue, { color: colors.fire }]}>0.68s</Text>
                                    <Text style={styles.footerSubText}>Optimal: &lt;0.75s</Text>
                                </View>
                            </View>
                            <View style={[styles.dnaMetricRow, { marginTop: space[4], borderTopWidth: 1, borderTopColor: colors.surface3, paddingTop: space[4] }]}>
                                <View style={styles.dnaMetric}>
                                    <Text style={styles.statLabel}>Arc Peak (Max Height)</Text>
                                    <Text style={[styles.statValue, { color: colors.snow }]}>4.2m</Text>
                                </View>
                                <View style={styles.dnaMetric}>
                                    <Text style={styles.statLabel}>Jump Height</Text>
                                    <Text style={[styles.statValue, { color: colors.snow }]}>28cm</Text>
                                </View>
                            </View>

                            <View style={styles.aiInsightBox}>
                                <Text style={styles.aiInsightText}>
                                    <Text style={{ color: colors.fire }}>AI INSIGHT:</Text> Your shooting elbow flares out slightly by ~8° on fatigue shots, causing misses to the right. Maintain form under fatigue.
                                </Text>
                            </View>
                        </Card>
                    </Animated.View>
                )}

                {activeTab === 'Ghost Mode' && (
                    <Animated.View entering={FadeInRight.delay(100)} style={styles.visContainer}>
                        <Card style={[styles.dnaCard, { marginTop: space[2] }]}>
                            <Text style={styles.dnaTitle}>AR KINEMATIC OVERLAY</Text>
                            <GhostMode />
                        </Card>
                    </Animated.View>
                )}

            </ScrollView>

            {/* Story Viewer Overlay */}
            <StoryViewer
                visible={storyVisible}
                onClose={() => setStoryVisible(false)}
            />

            {/* 3D Reconstruction Simulated HUD Overlay */}
            {is3DProcessing && (
                <View style={styles.spatialOverlay}>
                    <Animated.View entering={FadeInDown} style={styles.spatialHud}>
                        <Text style={styles.spatialTitle}>3D GAUSSIAN RECONSTRUCTION</Text>
                        <Text style={styles.spatialStatus}>ALIGNING SPLATS... [42%]</Text>
                        <View style={styles.spatialSfmGrid}>
                            {Array.from({ length: 9 }).map((_, i) => (
                                <View key={i} style={styles.sfmDot} />
                            ))}
                        </View>
                        <Text style={styles.spatialInfo}>SOURCE: 60FPS MP4 | DENSITY: HIGH</Text>
                        <Pressable
                            style={styles.spatialCloseBtn}
                            onPress={() => setIs3DProcessing(false)}
                        >
                            <Text style={styles.spatialCloseText}>MINIMIZE TO BACKEND</Text>
                        </Pressable>
                    </Animated.View>
                </View>
            )}
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
        opacity: 0.05,
        overflow: 'hidden',
    },
    gridVLine: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 1,
        backgroundColor: colors.surface3,
    },
    gridHLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: colors.surface3,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: space[2],
        paddingVertical: space[2],
    },
    iconButton: {
        padding: space[2],
    },
    headerTitles: {
        flex: 1,
        paddingHorizontal: space[2],
    },
    headerSubtitle: {
        ...typography.label,
        color: colors.fire,
        marginBottom: 2,
    },
    headerTitle: {
        fontFamily: 'BarlowCondensed_700Bold',
        fontSize: 20,
        color: colors.snow,
    },
    headerRight: {
        flexDirection: 'row',
    },
    iconButtonSmall: {
        padding: space[2],
    },
    tabsContainer: {
        marginTop: space[4],
        marginBottom: space[6],
    },
    tabsScroll: {
        paddingHorizontal: space.screenH,
        gap: space[2],
    },
    tab: {
        paddingHorizontal: space[4],
        paddingVertical: space[2],
        borderRadius: radius.pill,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
    },
    tabActive: {
        backgroundColor: colors.surface3,
        borderColor: colors.fire,
    },
    tabText: {
        fontFamily: 'DMSans_500Medium',
        fontSize: 13,
        color: colors.cloud,
    },
    tabTextActive: {
        color: colors.snow,
    },
    visContainer: {
        paddingHorizontal: space.screenH,
        marginBottom: space[8],
    },
    courtCard: {
        backgroundColor: colors.base,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.lineStrong,
        padding: space[4],
        alignItems: 'center',
        justifyContent: 'center',
    },
    ringsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: space.screenH,
        marginBottom: space[8],
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: space.screenH,
        gap: space[3],
    },
    statCard: {
        width: (width - space.screenH * 2 - space[3]) / 2,
    },
    statLabel: {
        fontFamily: 'DMSans_500Medium',
        fontSize: 12,
        color: colors.cloud,
        marginBottom: space[2],
    },
    statValue: {
        ...typography.h2,
        color: colors.snow,
    },
    statUnit: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 12,
        color: colors.fog,
    },
    footerCard: {
        backgroundColor: colors.surface2,
    },
    footerLabel: {
        fontFamily: 'DMSans_500Medium',
        fontSize: 12,
        color: colors.snow,
        marginBottom: space[3],
    },
    progressTrack: {
        height: 6,
        backgroundColor: colors.base,
        borderRadius: 3,
        marginBottom: space[3],
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: colors.live,
        borderRadius: 3,
    },
    footerSubText: {
        fontFamily: 'DMSans_400Regular',
        fontSize: 11,
        color: colors.cloud,
    },
    dnaCard: {
        backgroundColor: colors.surface2,
    },
    dnaTitle: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 14,
        color: colors.fire,
        marginBottom: space[4],
        letterSpacing: 0.5,
    },
    dnaMetricRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dnaMetric: {
        flex: 1,
    },
    aiInsightBox: {
        marginTop: space[5],
        padding: space[3],
        backgroundColor: colors.base,
        borderRadius: radius.sm,
        borderLeftWidth: 2,
        borderLeftColor: colors.fire,
    },
    aiInsightText: {
        fontFamily: 'DMSans_400Regular',
        fontSize: 13,
        lineHeight: 20,
        color: 'rgba(245,245,245,0.85)',
    },
    highlightCTAContainer: {
        paddingHorizontal: space.screenH,
        marginTop: space[6],
        marginBottom: space[4],
    },
    highlightCTABtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.live,
        paddingVertical: 18,
        borderRadius: radius.pill,
        position: 'relative',
        overflow: 'hidden',
    },
    ctaGlowBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.2)',
        transform: [{ skewX: '-20deg' }, { translateX: -150 }],
        width: '50%',
        opacity: 0.5,
    },
    highlightCTAText: {
        fontFamily: 'BarlowCondensed_700Bold',
        fontSize: 16,
        color: colors.base,
        letterSpacing: 1,
    },
    ctasContainer: {
        flexDirection: 'row',
        paddingHorizontal: space.screenH,
        marginTop: space[6],
        marginBottom: space[4],
        height: 56,
    },
    spatialCTABtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.base,
        borderWidth: 1,
        borderColor: colors.live,
        borderRadius: radius.pill,
        position: 'relative',
        overflow: 'hidden',
    },
    spatialGlow: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.live,
        opacity: 0.05,
    },
    spatialCTAText: {
        fontFamily: 'BarlowCondensed_700Bold',
        fontSize: 14,
        color: colors.live,
        letterSpacing: 1,
    },
    spatialOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(5, 5, 5, 0.95)',
        zIndex: 1000,
        alignItems: 'center',
        justifyContent: 'center',
    },
    spatialHud: {
        width: '85%',
        padding: space[6],
        borderWidth: 1,
        borderColor: colors.live,
        backgroundColor: 'rgba(80, 227, 194, 0.05)',
        borderRadius: radius.md,
        alignItems: 'center',
    },
    spatialTitle: {
        fontFamily: 'BarlowCondensed_700Bold',
        fontSize: 18,
        color: colors.snow,
        letterSpacing: 2,
        textAlign: 'center',
    },
    spatialStatus: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 14,
        color: colors.live,
        marginTop: space[4],
    },
    spatialSfmGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: 100,
        gap: 6,
        marginVertical: space[6],
        justifyContent: 'center',
    },
    sfmDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.live,
        opacity: 0.6,
    },
    spatialInfo: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 10,
        color: colors.fog,
        textTransform: 'uppercase',
    },
    spatialCloseBtn: {
        marginTop: space[6],
        paddingHorizontal: space[4],
        paddingVertical: space[2],
        borderWidth: 1,
        borderColor: colors.live,
        borderRadius: radius.sm,
    },
    spatialCloseText: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 12,
        color: colors.live,
    }
});
