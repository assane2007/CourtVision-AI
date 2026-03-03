import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, withSpring } from 'react-native-reanimated';
import { colors, typography, space, radius, SPRING_SNAPPY } from '../../constants/tokens';
import { ProgressBar } from '../../components/ui/ProgressBar';

/** Typewriter Component */
interface TypewriterLineProps {
    text: string;
    delay?: number;
    onComplete?: () => void;
    isAi?: boolean;
    showCursor?: boolean;
}

function TypewriterLine({ text, delay = 0, onComplete, isAi = false, showCursor = false }: TypewriterLineProps) {
    const [displayed, setDisplayed] = useState('');

    // Cursor blinking
    const cursorOpacity = useSharedValue(1);

    useEffect(() => {
        if (showCursor) {
            cursorOpacity.value = withRepeat(
                withSequence(
                    withTiming(0, { duration: 500 }),
                    withTiming(1, { duration: 500 })
                ),
                -1,
                true
            );
        } else {
            cursorOpacity.value = 0;
        }
    }, [showCursor]);

    const cursorStyle = useAnimatedStyle(() => ({
        opacity: cursorOpacity.value,
    }));

    useEffect(() => {
        let i = 0;
        let timeout: NodeJS.Timeout;

        const startTyping = () => {
            const interval = setInterval(() => {
                setDisplayed(text.substring(0, i + 1));
                i++;
                if (i >= text.length) {
                    clearInterval(interval);
                    if (onComplete) onComplete();
                }
            }, 25);

            return () => clearInterval(interval);
        };

        timeout = setTimeout(startTyping, delay);
        return () => clearTimeout(timeout);
    }, [text, delay]);

    const prefix = isAi ? "[AI] " : "[SYSTEM] ";
    const hasPrefix = text.startsWith(prefix);
    const content = hasPrefix ? text.slice(prefix.length) : text;
    const displayedContent = hasPrefix ? displayed.slice(Math.min(displayed.length, prefix.length)) : displayed;
    const displayedPrefix = hasPrefix ? displayed.slice(0, prefix.length) : '';

    return (
        <View style={styles.messageRow}>
            {hasPrefix && (
                <Text style={[styles.messagePrefix, isAi ? { color: colors.fire } : { color: '#888' }]}>
                    {displayedPrefix}
                </Text>
            )}
            <Text style={styles.messageText}>
                {displayedContent}
                {showCursor && (
                    <Animated.View style={[styles.cursor, cursorStyle]} />
                )}
            </Text>
        </View>
    );
}

/** Animated Tag Choice */
function ChoiceTag({ label, onSelect, selected, disabled }: { label: string, onSelect: () => void, selected: boolean, disabled: boolean }) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    return (
        <Animated.View style={animatedStyle}>
            <Pressable
                onPressIn={() => {
                    if (!disabled && !selected) scale.value = withSpring(0.95, SPRING_SNAPPY);
                }}
                onPressOut={() => {
                    scale.value = withSpring(1, SPRING_SNAPPY);
                }}
                onPress={() => {
                    if (!disabled) onSelect();
                }}
                disabled={disabled}
                style={[
                    styles.tagBase,
                    selected ? styles.tagSelected : (disabled ? styles.tagDisabled : styles.tagIdle)
                ]}
            >
                <Text style={[
                    styles.tagText,
                    selected ? { color: colors.snow } : (disabled ? { color: '#555' } : { color: colors.cloud })
                ]}>
                    [ {label} ]
                </Text>
            </Pressable>
        </Animated.View>
    );
}

export default function AiSetupScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const scrollViewRef = useRef<ScrollView>(null);
    const [stage, setStage] = useState(0);
    const [role, setRole] = useState<string | null>(null);
    const [season, setSeason] = useState<string | null>(null);

    const handleRoleSelect = (selectedRole: string) => {
        setRole(selectedRole);
        setStage(4);
    };

    const handleSeasonSelect = (selectedSeason: string) => {
        setSeason(selectedSeason);
        setStage(6);
    };

    const handleContinue = () => {
        router.push('/(setup)/camera');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, space[4]) }]}>
            <ProgressBar currentStep={2} totalSteps={4} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color={colors.snow} size={20} />
                    <Text style={styles.backText}>Setup</Text>
                </Pressable>

                <View style={{ width: 68 }} /> {/* spacer */}
            </View>

            {/* Terminal Context Bar */}
            <View style={styles.terminalBar}>
                <Text style={styles.terminalVersion}>TERMINAL v2.4</Text>
                <View style={styles.terminalVerified}>
                    <Text style={styles.terminalVerifiedText}>AUTH: VERIFIED</Text>
                    <View style={styles.verifiedDot} />
                </View>
            </View>

            {/* Terminal Area */}
            <View style={styles.terminalContainer}>
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.terminalScroll}
                    contentContainerStyle={{ padding: space[5] }}
                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                >
                    <TypewriterLine
                        text="[AI] Hey. I'm your CourtVision AI."
                        isAi
                        delay={300}
                        onComplete={() => setStage(1)}
                        showCursor={stage === 0}
                    />

                    {stage >= 1 && (
                        <TypewriterLine
                            text="[AI] What's your role on the team?"
                            isAi
                            delay={800}
                            onComplete={() => setStage(2)}
                            showCursor={stage === 1}
                        />
                    )}

                    {stage >= 2 && (
                        <Animated.View entering={FadeInUp.delay(600).duration(400)} style={styles.tagsContainer}>
                            {['Head Coach', 'Assistant', 'Analyst', 'Player'].map(r => (
                                <ChoiceTag
                                    key={r}
                                    label={r}
                                    selected={role === r}
                                    disabled={stage >= 4}
                                    onSelect={() => handleRoleSelect(r)}
                                />
                            ))}
                        </Animated.View>
                    )}

                    {stage >= 4 && (
                        <TypewriterLine
                            text="[AI] Got it. Season in progress?"
                            isAi
                            delay={300}
                            onComplete={() => setStage(5)}
                            showCursor={stage === 4}
                        />
                    )}

                    {stage >= 5 && (
                        <Animated.View entering={FadeInUp.delay(500).duration(400)} style={styles.tagsContainer}>
                            {['Yes, season', 'Just training'].map(s => (
                                <ChoiceTag
                                    key={s}
                                    label={s}
                                    selected={season === s}
                                    disabled={stage >= 6}
                                    onSelect={() => handleSeasonSelect(s)}
                                />
                            ))}
                        </Animated.View>
                    )}

                    {stage >= 6 && (
                        <TypewriterLine
                            text="[AI] Perfect. Calibration complete."
                            isAi
                            delay={300}
                            onComplete={() => setStage(7)}
                            showCursor={stage === 6}
                        />
                    )}

                    {stage >= 7 && (
                        <TypewriterLine
                            text="[AI] Your Digital Twin is ready. ✓"
                            isAi
                            delay={800}
                            onComplete={() => setStage(8)}
                            showCursor={true} // Last one keeps cursor
                        />
                    )}
                </ScrollView>
            </View>

            {/* Bottom Action */}
            <View style={styles.footer}>
                <Pressable
                    onPress={handleContinue}
                    disabled={stage < 8}
                    style={[
                        styles.continueButton,
                        stage >= 8 ? styles.continueActive : styles.continueDisabled
                    ]}
                >
                    <Text style={[
                        styles.continueText,
                        stage >= 8 ? { color: colors.snow } : { color: colors.fog }
                    ]}>
                        CONTINUE →
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.base,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: space.screenH,
        height: 48,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: -8,
        height: 48,
    },
    backText: {
        fontFamily: 'DMSans_500Medium',
        fontSize: 14,
        color: colors.snow,
        marginLeft: 4,
    },
    terminalBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: space.screenH,
        marginTop: space[4],
        marginBottom: space[2],
    },
    terminalVersion: {
        ...typography.label,
        color: colors.fog,
    },
    terminalVerified: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    terminalVerifiedText: {
        ...typography.label,
        color: colors.live,
        marginRight: space[2],
    },
    verifiedDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.live,
    },
    terminalContainer: {
        flex: 1,
        backgroundColor: '#050505',
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.lineStrong,
        marginHorizontal: space.screenH,
        marginBottom: space[6],
        overflow: 'hidden',
    },
    terminalScroll: {
        flex: 1,
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: space[3],
        flexWrap: 'wrap',
    },
    messagePrefix: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 11,
        lineHeight: 20,
        marginRight: 4,
    },
    messageText: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 13,
        lineHeight: 20,
        color: colors.snow,
    },
    cursor: {
        width: 8,
        height: 14,
        backgroundColor: colors.snow,
        marginLeft: 4,
        transform: [{ translateY: 2 }],
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: space[2],
        marginBottom: space[4],
        marginTop: space[1],
    },
    tagBase: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: radius.pill,
        borderWidth: 1,
    },
    tagIdle: {
        backgroundColor: colors.surface2,
        borderColor: colors.line,
    },
    tagSelected: {
        backgroundColor: colors.fire,
        borderColor: colors.fire,
    },
    tagDisabled: {
        backgroundColor: 'transparent',
        borderColor: '#333',
    },
    tagText: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 12,
    },
    footer: {
        paddingHorizontal: space.screenH,
    },
    continueButton: {
        height: 56,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    continueActive: {
        backgroundColor: colors.fire,
        // Assuming shadow is added here in standard react native way or we use the utility later
        shadowColor: '#FF5C00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
        elevation: 12,
    },
    continueDisabled: {
        backgroundColor: colors.surface,
        opacity: 0.5,
    },
    continueText: {
        ...typography.cta,
        textTransform: 'uppercase',
    }
});
