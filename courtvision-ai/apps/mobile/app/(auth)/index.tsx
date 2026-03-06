import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    Easing,
    interpolate,
    FadeInDown,
    withRepeat,
    withSequence,
    withSpring
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, space } from '../../constants/tokens';

const { width, height } = Dimensions.get('window');

// Floating Ambient Orb Component
function AmbientOrb({
    color, size, initialX, initialY, delay, duration
}: {
    color: string, size: number, initialX: number, initialY: number, delay: number, duration: number
}) {
    const x = useSharedValue(initialX);
    const y = useSharedValue(initialY);

    useEffect(() => {
        x.value = withDelay(delay, withRepeat(
            withSequence(
                withTiming(initialX + 100, { duration, easing: Easing.inOut(Easing.ease) }),
                withTiming(initialX - 50, { duration: duration * 1.2, easing: Easing.inOut(Easing.ease) }),
                withTiming(initialX, { duration: duration * 0.8, easing: Easing.inOut(Easing.ease) })
            ), -1, true
        ));

        y.value = withDelay(delay, withRepeat(
            withSequence(
                withTiming(initialY - 150, { duration: duration * 1.1, easing: Easing.inOut(Easing.ease) }),
                withTiming(initialY + 80, { duration: duration * 0.9, easing: Easing.inOut(Easing.ease) }),
                withTiming(initialY, { duration, easing: Easing.inOut(Easing.ease) })
            ), -1, true
        ));
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: x.value }, { translateY: y.value }],
    }));

    return (
        <Animated.View style={[
            {
                position: 'absolute',
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity: 0.4,
                shadowColor: color,
                shadowRadius: size / 2,
                shadowOpacity: 1,
            },
            animatedStyle
        ]} />
    );
}

export default function BootScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const btnScale = useSharedValue(1);

    const handlePressIn = () => {
        btnScale.value = withSpring(0.95);
    };

    const handlePressOut = () => {
        btnScale.value = withSpring(1);
    };

    const handleNavigate = () => {
        router.push('/onboarding2');
    };

    const btnAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: btnScale.value }]
    }));

    return (
        <View style={styles.container}>
            {/* Dynamic, Addictive Background */}
            <View style={StyleSheet.absoluteFill}>
                <AmbientOrb color={colors.fire} size={300} initialX={-100} initialY={height * 0.2} delay={0} duration={6000} />
                <AmbientOrb color="#A020F0" size={400} initialX={width * 0.5} initialY={height * 0.6} delay={1000} duration={8000} />
                <AmbientOrb color={colors.live} size={250} initialX={width * 0.2} initialY={-50} delay={500} duration={7000} />

                {/* Heavy blur overlay to create a massive glass gradient effect */}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
            </View>

            {/* Main Content */}
            <View style={[styles.content, { paddingTop: insets.top + space[12] }]}>
                <Animated.View entering={FadeInDown.delay(300).duration(800).springify()}>
                    <View style={styles.badge}>
                        <View style={styles.badgeDot} />
                        <Text style={styles.badgeText}>AI ENGINE ACTIVE</Text>
                    </View>

                    <Text style={styles.title}>
                        Unlock Your
                    </Text>
                    <Text style={[styles.title, { color: colors.snow }]}>
                        True Potential
                    </Text>

                    <Text style={styles.subtitle}>
                        The most advanced AI biomechanics tracker in your pocket. Get ready to dominate the court.
                    </Text>
                </Animated.View>
            </View>

            {/* Addictive Action Footer */}
            <Animated.View
                entering={FadeInDown.delay(700).duration(800).springify()}
                style={[styles.footer, { paddingBottom: Math.max(insets.bottom + space[6], space[10]) }]}
            >
                <Pressable
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    onPress={handleNavigate}
                >
                    <Animated.View style={[styles.primaryBtn, btnAnimatedStyle]}>
                        <Text style={styles.primaryBtnText}>Begin Evolution</Text>
                        <View style={styles.iconCircle}>
                            <Feather name="arrow-right" size={20} color="#000" />
                        </View>
                    </Animated.View>
                </Pressable>

                <Pressable style={styles.secondaryLink} onPress={() => router.push('/onboarding3')}>
                    <Text style={styles.secondaryText}>
                        Already a member? <Text style={{ color: colors.snow, fontWeight: '700' }}>Login</Text>
                    </Text>
                </Pressable>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    content: {
        flex: 1,
        paddingHorizontal: space[6] + 8,
        justifyContent: 'center',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 68, 0, 0.15)',
        alignSelf: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 30,
        marginBottom: space[6],
        borderWidth: 1,
        borderColor: 'rgba(255, 68, 0, 0.3)',
    },
    badgeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.live,
        marginRight: 8,
        shadowColor: colors.live,
        shadowRadius: 5,
        shadowOpacity: 1,
    },
    badgeText: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        fontSize: 12,
        fontWeight: '800',
        color: colors.fire,
        letterSpacing: 1,
    },
    title: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        fontSize: 56,
        fontWeight: '900',
        color: colors.fire,
        letterSpacing: -2,
        lineHeight: 60,
    },
    subtitle: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        fontSize: 18,
        color: '#a0a0a0',
        lineHeight: 28,
        marginTop: space[6],
        fontWeight: '500',
        maxWidth: '90%',
    },
    footer: {
        paddingHorizontal: space[6],
        width: '100%',
    },
    primaryBtn: {
        backgroundColor: colors.snow,
        width: '100%',
        height: 68,
        borderRadius: 34,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: 32,
        paddingRight: 8,
        marginBottom: space[6],
        shadowColor: colors.snow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    primaryBtnText: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        color: '#000',
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(0,0,0,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    secondaryLink: {
        alignItems: 'center',
        padding: space[4],
    },
    secondaryText: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        fontSize: 15,
        color: '#666',
        fontWeight: '600',
    }
});
