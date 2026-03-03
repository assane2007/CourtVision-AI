import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Settings, Maximize2, Aperture, Sun, Video } from 'lucide-react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { colors, typography, space, radius } from '../../constants/tokens';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export default function CameraSetupScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const frameOpacity = useSharedValue(0.3);

    useEffect(() => {
        // Continuous pulse animation for the video frame border
        frameOpacity.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1000 }),
                withTiming(0.3, { duration: 1000 })
            ),
            -1,
            true
        );
    }, []);

    const animatedFrameBorder = useAnimatedStyle(() => ({
        borderColor: `rgba(255, 92, 0, ${frameOpacity.value})`, // colors.fire with dynamic opacity
    }));

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, space[4]) }]}>
            {/* Grid bg */}
            <View style={styles.gridOverlay}>
                {Array.from({ length: 40 }).map((_, i) => (
                    <View key={`v-${i}`} style={[styles.gridVLine, { left: i * 40 }]} />
                ))}
                {Array.from({ length: 40 }).map((_, i) => (
                    <View key={`h-${i}`} style={[styles.gridHLine, { top: i * 40 }]} />
                ))}
            </View>

            <ProgressBar currentStep={4} totalSteps={4} />

            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color={colors.snow} size={20} />
                </Pressable>

                <Text style={styles.headerTitle}>Camera Setup</Text>

                <Pressable style={styles.headerRight}>
                    <Settings color={colors.snow} size={20} />
                    <View style={styles.settingsBadge} />
                </Pressable>
            </View>

            <View style={styles.content}>
                <Animated.Text entering={FadeInDown.delay(100).duration(400)} style={styles.headline}>
                    Position your phone{'\n'}for best tracking.
                </Animated.Text>

                <View style={styles.cardsContainer}>
                    <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                        <Card variant="status" statusType="critical" style={styles.card}>
                            <View style={[styles.iconWrapper, { backgroundColor: colors.dangerDim }]}>
                                <Maximize2 color={colors.danger} size={20} />
                            </View>
                            <View style={styles.cardContent}>
                                <View style={styles.cardTitleRow}>
                                    <Text style={styles.cardTitle}>Distance</Text>
                                    <Badge label="CRITICAL" variant="danger" />
                                </View>
                                <Text style={styles.cardBody}>3–5 meters. Landscape mode required.</Text>
                            </View>
                        </Card>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(300).duration(400)}>
                        <Card variant="status" statusType="required" style={styles.card}>
                            <View style={[styles.iconWrapper, { backgroundColor: colors.cautionDim }]}>
                                <Aperture color={colors.caution} size={20} />
                            </View>
                            <View style={styles.cardContent}>
                                <View style={styles.cardTitleRow}>
                                    <Text style={styles.cardTitle}>Stability</Text>
                                    <Badge label="REQUIRED" variant="caution" />
                                </View>
                                <Text style={styles.cardBody}>Tripod mounting adds 40% tracking accuracy.</Text>
                            </View>
                        </Card>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(400).duration(400)}>
                        <Card variant="status" statusType="monitoring" style={styles.card}>
                            <View style={[styles.iconWrapper, { backgroundColor: colors.surface2 }]}>
                                <Sun color={colors.live} size={20} />
                            </View>
                            <View style={styles.cardContent}>
                                <View style={styles.cardTitleRow}>
                                    <Text style={styles.cardTitle}>Lighting</Text>
                                    <Badge label="OPTIMAL" variant="live" />
                                </View>
                                <Text style={styles.cardBody}>Avoid backlight. Keep contrast between players.</Text>
                            </View>
                        </Card>
                    </Animated.View>
                </View>

                {/* Video Preview Simulation */}
                <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.previewContainer}>
                    <Animated.View style={[styles.previewFrame, animatedFrameBorder]}>
                        <View style={[styles.bracket, styles.bracketTL]} />
                        <View style={[styles.bracket, styles.bracketTR]} />
                        <View style={[styles.bracket, styles.bracketBL]} />
                        <View style={[styles.bracket, styles.bracketBR]} />

                        <Video color={colors.fog} size={28} />
                        <Text style={styles.previewText}>READY TO RECORD</Text>
                    </Animated.View>
                </Animated.View>
            </View>

            <View style={styles.footer}>
                <Button
                    title="Start Session →"
                    onPress={() => router.push('/(app)')}
                />
            </View>
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
        opacity: 0.15, // darker grid here as it "works perfectly" according to spec
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
        justifyContent: 'space-between',
        paddingHorizontal: space.screenH,
        height: 48,
    },
    backButton: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        marginLeft: -8,
    },
    headerTitle: {
        fontFamily: 'BarlowCondensed_700Bold',
        fontSize: 18,
        color: colors.snow,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    headerRight: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'flex-end',
        marginRight: -8,
        position: 'relative',
    },
    settingsBadge: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.fire,
        top: 10,
        right: 10,
        borderWidth: 1,
        borderColor: colors.base,
    },
    content: {
        flex: 1,
        paddingHorizontal: space.screenH,
        paddingTop: space[6],
    },
    headline: {
        ...typography.h2,
        fontSize: 32,
        color: colors.snow,
        marginBottom: space[6],
    },
    cardsContainer: {
        gap: space[3],
        marginBottom: space[6],
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: space[4],
        gap: space[4],
    },
    iconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardContent: {
        flex: 1,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
        marginBottom: space[1],
    },
    cardTitle: {
        fontFamily: 'DMSans_700Bold',
        fontSize: 15,
        color: colors.snow,
    },
    cardBody: {
        fontFamily: 'DMSans_400Regular',
        fontSize: 13,
        color: colors.cloud,
        lineHeight: 18,
    },
    previewContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingBottom: space[4],
    },
    previewFrame: {
        aspectRatio: 16 / 9,
        width: '100%',
        backgroundColor: colors.void,
        borderRadius: radius.md,
        borderWidth: 2,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewText: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 12,
        color: colors.fog,
        marginTop: space[3],
        letterSpacing: 2,
    },
    bracket: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderColor: colors.fire,
    },
    bracketTL: { top: -2, left: -2, borderTopWidth: 2, borderLeftWidth: 2 },
    bracketTR: { top: -2, right: -2, borderTopWidth: 2, borderRightWidth: 2 },
    bracketBL: { bottom: -2, left: -2, borderBottomWidth: 2, borderLeftWidth: 2 },
    bracketBR: { bottom: -2, right: -2, borderBottomWidth: 2, borderRightWidth: 2 },
    footer: {
        paddingHorizontal: space.screenH,
    },
});
