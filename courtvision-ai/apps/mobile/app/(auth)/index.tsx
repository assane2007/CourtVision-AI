import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    withRepeat,
    withSequence,
    Easing
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, DURATION, space } from '../../constants/tokens';
import { CourtMinimap } from '../../components/basketball/CourtMinimap';
import { Button } from '../../components/ui/Button';

const { width } = Dimensions.get('window');

export default function BootScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    // Animations
    const textOpacity = useSharedValue(0);
    const textTranslateY = useSharedValue(20);

    const lineScaleX = useSharedValue(0);
    const ctaOpacity = useSharedValue(0);
    const ctaTranslateY = useSharedValue(10);

    const badgeOpacity = useSharedValue(0);
    const dotOpacity = useSharedValue(1);

    useEffect(() => {
        // Text animation (delay 900ms)
        textOpacity.value = withDelay(900, withTiming(1, { duration: DURATION.slow }));
        textTranslateY.value = withDelay(900, withTiming(0, { duration: DURATION.slow, easing: Easing.out(Easing.cubic) }));

        // Line decoration (delay 1100ms)
        lineScaleX.value = withDelay(1100, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));

        // CTA & Links (delay 1400ms)
        ctaOpacity.value = withDelay(1400, withTiming(1, { duration: DURATION.slow }));
        ctaTranslateY.value = withDelay(1400, withTiming(0, { duration: DURATION.slow, easing: Easing.out(Easing.cubic) }));

        // Top badge
        badgeOpacity.value = withDelay(500, withTiming(1, { duration: DURATION.slow }));
        dotOpacity.value = withRepeat(
            withSequence(
                withTiming(0.4, { duration: 800 }),
                withTiming(1, { duration: 800 })
            ),
            -1,
            true
        );
    }, []);

    const animatedText = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
        transform: [{ translateY: textTranslateY.value }]
    }));

    const animatedLine = useAnimatedStyle(() => ({
        transform: [{ scaleX: lineScaleX.value }]
    }));

    const animatedCta = useAnimatedStyle(() => ({
        opacity: ctaOpacity.value,
        transform: [{ translateY: ctaTranslateY.value }]
    }));

    const animatedBadge = useAnimatedStyle(() => ({
        opacity: badgeOpacity.value
    }));

    const animatedDot = useAnimatedStyle(() => ({
        opacity: dotOpacity.value
    }));

    return (
        <View style={styles.container}>
            {/* Fake grid background for texturing */}
            <View style={styles.gridOverlay}>
                {Array.from({ length: 40 }).map((_, i) => (
                    <View key={`v-${i}`} style={[styles.gridVLine, { left: i * 40 }]} />
                ))}
                {Array.from({ length: 40 }).map((_, i) => (
                    <View key={`h-${i}`} style={[styles.gridHLine, { top: i * 40 }]} />
                ))}
            </View>

            {/* Top Status */}
            <Animated.View style={[styles.statusBadge, { top: insets.top + space[6] }, animatedBadge]}>
                <Text style={styles.statusText}>SYSTEM READY</Text>
                <Animated.View style={[styles.statusDot, animatedDot]} />
            </Animated.View>

            <View style={styles.content}>
                {/* SVG Court */}
                <View style={styles.courtContainer}>
                    <CourtMinimap animate={true} width={width * 0.8} height={width * 0.8 * (150 / 280)} />
                </View>

                {/* Text Block */}
                <Animated.View style={[styles.textBlock, animatedText]}>
                    <View style={styles.titleRow}>
                        <Text style={styles.titleCourt}>COURTVISION</Text>
                        <Text style={styles.titleAi}>AI</Text>
                    </View>

                    <Animated.View style={[styles.decorLine, animatedLine]} />

                    <Text style={styles.subtitle}>See the game differently.</Text>
                </Animated.View>
            </View>

            {/* CTA Block */}
            <Animated.View style={[styles.ctaBlock, { paddingBottom: Math.max(insets.bottom + space[4], space[10]) }, animatedCta]}>
                <Button
                    title="Get Started →"
                    onPress={() => router.push('/(auth)/ai-setup')}
                />

                <Pressable style={styles.loginLink} onPress={() => router.push('/(auth)/login')}>
                    <Text style={styles.loginTextNormal}>
                        Already a member? <Text style={styles.loginTextHighlight}>Sign in</Text>
                    </Text>
                </Pressable>

                <View style={styles.versionRow}>
                    <Text style={styles.versionText}>v2.4.1</Text>
                    <Animated.View style={[styles.versionDot, animatedDot]} />
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.void,
    },
    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.04,
        overflow: 'hidden',
    },
    gridVLine: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 1,
        backgroundColor: colors.fire,
    },
    gridHLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: colors.fire,
    },
    statusBadge: {
        position: 'absolute',
        right: space[6],
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 10,
    },
    statusText: {
        ...typography.label,
        color: colors.fog,
        marginRight: space[2],
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.live,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: space.screenH,
    },
    courtContainer: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: space[12],
        opacity: 0.8,
        // Perspective transforms simulation
        transform: [
            { rotateX: '60deg' },
            { rotateZ: '45deg' },
            { scale: 1.1 }
        ]
    },
    textBlock: {
        alignItems: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    titleCourt: {
        ...typography.h1,
        fontSize: 48,
        color: colors.snow,
    },
    titleAi: {
        ...typography.h1,
        fontSize: 48,
        color: colors.fire,
        marginLeft: space[2]
    },
    decorLine: {
        width: 40,
        height: 2,
        backgroundColor: colors.fire,
        marginVertical: space[2],
    },
    subtitle: {
        ...typography.body,
        color: colors.cloud,
        marginTop: space[2],
    },
    ctaBlock: {
        paddingHorizontal: space.screenH,
        alignItems: 'center',
        width: '100%',
    },
    loginLink: {
        marginTop: space[4],
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginTextNormal: {
        ...typography.bodySm,
        fontSize: 13,
        color: colors.fog,
    },
    loginTextHighlight: {
        color: colors.fire,
    },
    versionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: space[6],
        opacity: 0.5,
    },
    versionText: {
        ...typography.label,
        color: colors.fog,
        marginRight: space[2],
    },
    versionDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.live,
    },
});
