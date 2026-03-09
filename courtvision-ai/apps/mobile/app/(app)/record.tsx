import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Square, Activity, Users, Zap } from 'lucide-react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, typography, space, shadows, radius } from '../../constants/tokens';
import { Badge } from '../../components/ui/Badge';
import { useLiveCoach } from '../../hooks/useLiveCoach';
import { Check } from 'lucide-react-native';

function BoundingBox({ x, y, width, height, playerNumber, delay = 0, speed = 20 }: any) {
    const pulse = useSharedValue(0.2);

    useEffect(() => {
        pulse.value = withSequence(
            withTiming(0.2, { duration: delay }),
            withRepeat(
                withSequence(
                    withTiming(0.6, { duration: 1000 }),
                    withTiming(0.2, { duration: 1000 })
                ),
                -1,
                true
            )
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        backgroundColor: `rgba(255, 92, 0, ${pulse.value})`,
        borderColor: `rgba(255, 92, 0, ${(pulse.value + 0.4)})`,
    }));

    return (
        <Animated.View style={[styles.boundingBox, { left: x, top: y, width, height }, animatedStyle]}>
            <View style={styles.boxLabel}>
                <Text style={styles.boxLabelText}>P{playerNumber}</Text>
            </View>
            <View style={styles.boxSpeed}>
                <Text style={styles.boxSpeedText}>{speed}kmh</Text>
            </View>
        </Animated.View>
    );
}

export default function RecordScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const live = useLiveCoach('session-test-id');

    const [permission, requestPermission] = useCameraPermissions();

    useEffect(() => {
        if (!permission?.granted && permission?.canAskAgain) {
            requestPermission();
        }
        live.start({ mode: 'record_only' });
        return () => {
            live.end();
        };
    }, [permission]);

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return [h, m > 9 ? m : h ? '0' + m : m || '0', s > 9 ? s : '0' + s]
            .filter(a => a)
            .join(':');
    };

    const handleStop = () => {
        live.end();
        router.replace('/(app)/sessions/live-01');
    };

    return (
        <View style={styles.container}>
            {/* Real Camera Feed */}
            {permission?.granted ? (
                <CameraView style={StyleSheet.absoluteFillObject} facing="back" />
            ) : (
                <View style={styles.cameraBackground}>
                    <Text style={{ color: colors.snow, textAlign: 'center', padding: 20 }}>
                        {permission?.status === 'denied' ? 'Camera access denied' : 'Requesting camera...'}
                    </Text>
                </View>
            )}

            {/* Grid overlay to give it a tech vibe */}
            <View style={styles.gridOverlay}>
                {Array.from({ length: 40 }).map((_, i) => (
                    <View key={`v-${i}`} style={[styles.gridVLine, { left: i * 40 }]} />
                ))}
                {Array.from({ length: 40 }).map((_, i) => (
                    <View key={`h-${i}`} style={[styles.gridHLine, { top: i * 40 }]} />
                ))}
            </View>

            {/* Player Tracking Boxes — rendered from live detection data */}
            {live.phase === 'active' && (live as any).detections?.map((det: any, i: number) => (
                <BoundingBox
                    key={i}
                    x={`${det.x}%`}
                    y={`${det.y}%`}
                    width={det.width ?? 70}
                    height={det.height ?? 150}
                    playerNumber={det.player ?? i + 1}
                    delay={0}
                    speed={det.speed ?? 0}
                />
            ))}

            {/* Top HUD */}
            <View style={[styles.topHud, { paddingTop: insets.top + space[2] }]}>
                <Animated.View entering={FadeIn}>
                    <Badge label={live.phase === 'active' ? "REC" : live.phase === 'connecting' ? 'CONNECTING...' : 'STOPPED'} variant={live.phase === 'active' ? 'danger' : 'neutral'} />
                    {live.sseConnected && (
                        <View style={{ marginTop: 4 }}>
                            <Badge label="WS OK" variant="live" />
                        </View>
                    )}
                </Animated.View>

                <Animated.View entering={FadeIn} style={styles.timerBadge}>
                    <Text style={styles.timerText}>{formatTime(live.elapsedTime)}</Text>
                </Animated.View>
            </View>

            {/* Live Stats HUD & Alerts */}
            <Animated.View entering={FadeIn.delay(500)} style={[styles.statsHud, { top: insets.top + 70 }]}>
                <View style={styles.statCard}>
                    <Activity color={colors.cloud} size={14} />
                    <Text style={styles.statLineText}>FPS: <Text style={{ color: colors.snow, fontFamily: 'JetBrainsMono_400Regular' }}>{(live as any).fps ?? 30}</Text></Text>
                </View>
                <View style={styles.statCard}>
                    <Zap color={colors.cloud} size={14} />
                    <Text style={styles.statLineText}>Mental: <Text style={{ color: colors.live, fontFamily: 'JetBrainsMono_400Regular' }}>{live.mentalScore}</Text></Text>
                </View>
                <View style={styles.statCard}>
                    <Users color={colors.cloud} size={14} />
                    <Text style={styles.statLineText}>Players Tracked: <Text style={{ color: colors.snow, fontFamily: 'JetBrainsMono_400Regular' }}>{(live as any).detections?.length ?? 0}</Text></Text>
                </View>
                {live.alerts.slice(0, 1).map((alert, i) => (
                    <View key={i} style={[styles.statCard, { borderColor: alert.severity === 'critical' || alert.severity === 'warning' ? colors.fire : colors.live }]}>
                        <Text style={styles.statLineText}>{alert.emoji} {alert.message}</Text>
                    </View>
                ))}
            </Animated.View>

            {/* In-game Active Playbook  */}
            {live.phase === 'active' && (
                <Animated.View entering={FadeIn.delay(800)} style={[styles.activePlaybook, { top: insets.top + 70 }]}>
                    <Text style={styles.playbookTitle}>AI OBJECTIVES</Text>

                    {/* Goal 1: Active */}
                    <View style={styles.playbookActiveRow}>
                        <View style={styles.playbookBox} />
                        <Text style={styles.playbookText}>Hit 5 catch-and-shoot 3s</Text>
                    </View>
                    <View style={styles.playbookSubRow}>
                        <View style={styles.playbookProgress}>
                            <View style={[styles.playbookProgressFill, { width: '40%' }]} />
                        </View>
                        <Text style={styles.playbookProgressText}>2/5</Text>
                    </View>

                    {/* Goal 2: Completed */}
                    <View style={[styles.playbookActiveRow, { opacity: 0.5 }]}>
                        <View style={[styles.playbookBox, { backgroundColor: colors.live, borderColor: colors.live }]}>
                            <Check color={colors.base} size={10} strokeWidth={4} />
                        </View>
                        <Text style={[styles.playbookText, { textDecorationLine: 'line-through' }]}>Keep elbow &lt; 5°</Text>
                    </View>

                    {/* Goal 3: Pending */}
                    <View style={styles.playbookActiveRow}>
                        <View style={styles.playbookBox} />
                        <Text style={styles.playbookText}>10 intense sprints</Text>
                    </View>
                    <View style={styles.playbookSubRow}>
                        <View style={styles.playbookProgress}>
                            <View style={[styles.playbookProgressFill, { width: '10%' }]} />
                        </View>
                        <Text style={styles.playbookProgressText}>1/10</Text>
                    </View>

                </Animated.View>
            )}

            {/* Bottom Controls */}
            <View style={[styles.bottomControls, { paddingBottom: Math.max(insets.bottom + space[4], space[10]) }]}>
                {/* Stop Button */}
                <Pressable onPress={handleStop} style={styles.stopButtonOuter}>
                    <View style={styles.stopButtonInner}>
                        <Square color={colors.base} fill={colors.base} size={20} />
                    </View>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.void,
    },
    cameraBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#121212', // Slightly lighter than void to simulate a lens cap/dark room
    },
    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.1,
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
    topHud: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: space.screenH,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    timerBadge: {
        backgroundColor: 'rgba(5, 5, 5, 0.65)',
        paddingHorizontal: space[3],
        paddingVertical: space[1],
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.line,
    },
    timerText: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 14,
        color: colors.snow,
    },
    statsHud: {
        position: 'absolute',
        left: space.screenH,
        zIndex: 10,
        gap: space[2],
    },
    statCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(5, 5, 5, 0.65)',
        paddingHorizontal: space[3],
        paddingVertical: space[2],
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.line,
        gap: space[2],
    },
    statLineText: {
        fontFamily: 'DMSans_500Medium',
        fontSize: 12,
        color: colors.cloud,
    },
    boundingBox: {
        position: 'absolute',
        borderWidth: 2,
        borderRadius: 4,
    },
    boxLabel: {
        position: 'absolute',
        top: -24,
        left: -2,
        backgroundColor: colors.fire,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    boxLabelText: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 10,
        color: colors.snow,
    },
    boxSpeed: {
        position: 'absolute',
        bottom: -24,
        right: -2,
        backgroundColor: 'rgba(5, 5, 5, 0.8)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.fire,
    },
    boxSpeedText: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 10,
        color: colors.fire,
    },
    activePlaybook: {
        position: 'absolute',
        right: space.screenH,
        zIndex: 10,
        width: 140,
        backgroundColor: 'rgba(5, 5, 5, 0.65)',
        borderWidth: 1,
        borderColor: colors.surface3,
        borderRadius: radius.md,
        padding: space[3],
    },
    playbookTitle: {
        fontFamily: 'JetBrainsMono_700Bold',
        fontSize: 10,
        color: colors.fire,
        marginBottom: space[2],
        letterSpacing: 1,
    },
    playbookActiveRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: space[2],
    },
    playbookBox: {
        width: 12,
        height: 12,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: colors.cloud,
        marginRight: space[2],
        alignItems: 'center',
        justifyContent: 'center',
    },
    playbookText: {
        fontFamily: 'DMSans_400Regular',
        fontSize: 11,
        color: colors.snow,
        flex: 1,
    },
    playbookSubRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 20, // offset past box
        marginTop: 4,
        marginBottom: space[2],
    },
    playbookProgress: {
        flex: 1,
        height: 2,
        backgroundColor: colors.surface3,
        borderRadius: 1,
        marginRight: space[2],
    },
    playbookProgressFill: {
        height: '100%',
        backgroundColor: colors.live,
        borderRadius: 1,
    },
    playbookProgressText: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 9,
        color: colors.cloud,
    },
    bottomControls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 10,
    },
    stopButtonOuter: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(239, 68, 68, 0.2)', // dangerDim
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: colors.danger,
    },
    stopButtonInner: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.danger,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
