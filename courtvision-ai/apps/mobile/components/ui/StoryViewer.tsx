import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Modal, Pressable, Dimensions } from 'react-native';
import { Video, ResizeMode, InterruptionModeAndroid, InterruptionModeIOS, Audio } from 'expo-av';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withSequence,
    withDelay,
    withSpring,
    Easing,
    interpolate,
    Extrapolation,
    runOnJS
} from 'react-native-reanimated';
import { X, Share2, Download, Hexagon } from 'lucide-react-native';
import { colors, typography, space, radius } from '../../constants/tokens';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface StoryViewerProps {
    visible: boolean;
    onClose: () => void;
    videoUri?: string;
}

export function StoryViewer({ visible, onClose, videoUri }: StoryViewerProps) {
    const [videoLoaded, setVideoLoaded] = useState(false);

    // Animation Values
    const progress = useSharedValue(0); // 0 to 1 for the top progress bar
    const hudOpacity = useSharedValue(0);
    const badgeScale = useSharedValue(0);
    const glitchTranslateX = useSharedValue(0);

    useEffect(() => {
        // Setup audio for silent playback
        Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            interruptionModeIOS: InterruptionModeIOS.DoNotMix,
            interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
            shouldDuckAndroid: false,
            playThroughEarpieceAndroid: false,
        });
    }, []);

    useEffect(() => {
        if (visible && videoLoaded) {
            // A typical reel/story is about 10-15s
            const DURATION = 12000;

            progress.value = withTiming(1, { duration: DURATION, easing: Easing.linear }, (finished) => {
                if (finished) {
                    runOnJS(onClose)();
                }
            });

            hudOpacity.value = withDelay(800, withTiming(1, { duration: 500 }));
            badgeScale.value = withDelay(1500, withSpring(1, { damping: 12, stiffness: 100 }));

            // Constant glitch overlay effect
            glitchTranslateX.value = withRepeat(
                withSequence(
                    withTiming(-2, { duration: 50 }),
                    withTiming(3, { duration: 50 }),
                    withTiming(-1, { duration: 50 }),
                    withTiming(0, { duration: 2000 })
                ),
                -1
            );
        } else {
            progress.value = 0;
            hudOpacity.value = 0;
            badgeScale.value = 0;
        }
    }, [visible, videoLoaded]);

    const progressBarStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`
    }));

    const hudStyle = useAnimatedStyle(() => ({
        opacity: hudOpacity.value,
        transform: [{ translateY: interpolate(hudOpacity.value, [0, 1], [20, 0]) }]
    }));

    const badgeStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: badgeScale.value },
            { translateX: glitchTranslateX.value }
        ]
    }));

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {videoUri ? (
                <Video
                    source={{ uri: videoUri }}
                    style={StyleSheet.absoluteFill}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={visible}
                    isMuted={true}
                    isLooping={false}
                    onLoad={() => setVideoLoaded(true)}
                />
                ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.base }]}>
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: colors.fog, fontSize: 14, fontFamily: 'DMSans_400Regular' }}>
                            No highlight reel available yet
                        </Text>
                    </View>
                </View>
                )}

                {/* Dark Vignette Overlay for readability */}
                <View style={styles.vignetteTop} />
                <View style={styles.vignetteBottom} />

                {/* Top Progress Bar & Header */}
                <View style={styles.topContainer}>
                    <View style={styles.progressTrack}>
                        <Animated.View style={[styles.progressFill, progressBarStyle]} />
                    </View>

                    <View style={styles.header}>
                        <View style={styles.aiBadgeRow}>
                            <Hexagon color={colors.live} size={16} fill="rgba(80, 227, 194, 0.2)" />
                            <Text style={styles.aiText}>AI GENERATED HIGHLIGHT</Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <X color={colors.snow} size={24} />
                        </Pressable>
                    </View>
                </View>

                {/* Cybernetic HUD Overlays */}
                <Animated.View style={[styles.hudOverlay, hudStyle]}>
                    <View style={styles.hudMetric}>
                        <Text style={styles.hudLabel}>RELEASE ANGLE</Text>
                        <Text style={styles.hudValue}>48.2°</Text>
                    </View>
                    <View style={styles.hudMetric}>
                        <Text style={styles.hudLabel}>SWISH ACCURACY</Text>
                        <Text style={[styles.hudValue, { color: colors.live }]}>PERFECT</Text>
                    </View>
                    <View style={styles.hudMetric}>
                        <Text style={styles.hudLabel}>RELEASE TIME</Text>
                        <Text style={styles.hudValue}>0.65s</Text>
                    </View>
                </Animated.View>

                {/* Centered Dynamic Badge */}
                <Animated.View style={[styles.centerBadge, badgeStyle]}>
                    <View style={styles.badgeInner}>
                        <Text style={styles.badgeText}>ELITE FORM</Text>
                    </View>
                </Animated.View>

                <Animated.View style={[styles.centerBadgeGlitch, badgeStyle]} pointerEvents="none">
                    <Text style={[styles.badgeText, { color: 'rgba(255,107,0, 0.5)' }]}>ELITE FORM</Text>
                </Animated.View>

                {/* Bottom Actions */}
                <View style={styles.bottomContainer}>
                    <View style={styles.playerInfo}>
                        <Text style={styles.playerName}>MOHAMED A.</Text>
                        <Text style={styles.sessionDate}>Feb 14, 2026 • COURT 4</Text>
                    </View>
                    <View style={styles.actionButtons}>
                        <Pressable style={styles.actionBtn}>
                            <Download color={colors.snow} size={24} />
                        </Pressable>
                        <Pressable style={[styles.actionBtn, styles.actionBtnPrimary]}>
                            <Share2 color={colors.base} size={20} />
                            <Text style={styles.actionBtnText}>Share Reel</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Loading State if video is slow */}
                {!videoLoaded && (
                    <View style={[StyleSheet.absoluteFill, styles.loaderContainer]}>
                        <Text style={styles.loaderText}>GENERATING AI HIGHLIGHT...</Text>
                    </View>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.void,
    },
    vignetteTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 150,
        backgroundColor: 'rgba(0,0,0,0.5)',
        // A linear gradient would be better here, but requires expo-linear-gradient.
    },
    vignetteBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 250,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    topContainer: {
        position: 'absolute',
        top: 45,
        left: space[4],
        right: space[4],
        zIndex: 10,
    },
    progressTrack: {
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: space[4],
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.snow,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    aiBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(80, 227, 194, 0.15)',
        paddingHorizontal: space[3],
        paddingVertical: space[2],
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: 'rgba(80, 227, 194, 0.3)',
        gap: space[2],
    },
    aiText: {
        fontFamily: 'JetBrainsMono_700Bold',
        fontSize: 10,
        color: colors.live,
        letterSpacing: 1,
    },
    closeBtn: {
        padding: space[2],
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 20,
    },
    hudOverlay: {
        position: 'absolute',
        left: space[4],
        top: '25%',
        gap: space[4],
    },
    hudMetric: {
        backgroundColor: 'rgba(10,10,10,0.6)',
        padding: space[3],
        borderRadius: radius.md,
        borderLeftWidth: 2,
        borderLeftColor: colors.fire,
        width: 140,
    },
    hudLabel: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 10,
        color: colors.cloud,
        marginBottom: 2,
    },
    hudValue: {
        fontFamily: 'BarlowCondensed_700Bold',
        fontSize: 24,
        color: colors.snow,
    },
    centerBadge: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -100, // Roughly Center of 200px width
        marginTop: -30,
        width: 200,
        alignItems: 'center',
        zIndex: 5,
    },
    centerBadgeGlitch: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -98, // Offset
        marginTop: -30,
        width: 200,
        alignItems: 'center',
        zIndex: 4,
    },
    badgeInner: {
        borderWidth: 2,
        borderColor: colors.snow,
        paddingHorizontal: space[5],
        paddingVertical: space[2],
        transform: [{ skewX: '-10deg' }],
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    badgeText: {
        fontFamily: 'BarlowCondensed_700Bold',
        fontSize: 32,
        color: colors.snow,
        letterSpacing: 2,
        textShadowColor: colors.fire,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 40,
        left: space[4],
        right: space[4],
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    playerInfo: {
        flex: 1,
    },
    playerName: {
        fontFamily: 'BarlowCondensed_700Bold',
        fontSize: 28,
        color: colors.snow,
        marginBottom: 4,
    },
    sessionDate: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 12,
        color: colors.cloud,
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
    },
    actionBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnPrimary: {
        width: 'auto',
        paddingHorizontal: space[5],
        backgroundColor: colors.snow,
        flexDirection: 'row',
        gap: space[2],
    },
    actionBtnText: {
        fontFamily: 'DMSans_700Bold',
        fontSize: 15,
        color: colors.base,
    },
    loaderContainer: {
        backgroundColor: colors.base,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
    loaderText: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 14,
        color: colors.fire,
        letterSpacing: 2,
    }
});
