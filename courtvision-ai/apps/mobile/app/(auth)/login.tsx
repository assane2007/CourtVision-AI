import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { ChevronLeft, Mail } from 'lucide-react-native';
import { colors, typography, space } from '../../constants/tokens';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Button } from '../../components/ui/Button';
import Animated, { FadeInDown, FadeInLeft } from 'react-native-reanimated';

// SVG Icons
const AppleIcon = () => (
    <Svg viewBox="0 0 24 24" width="22" height="22" fill={colors.snow}>
        <Path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.62-1.48 3.605-2.925 1.156-1.684 1.631-3.322 1.652-3.411-.035-.015-3.197-1.22-3.232-4.821-.03-3.011 2.457-4.469 2.571-4.529-1.425-2.073-3.626-2.359-4.417-2.404-1.921-.104-3.791 1.22-4.464 1.22-.685 0-2.22-1.194-4.001-1.194zM15.424 4.542c.811-.976 1.341-2.33 1.194-3.664-1.157.046-2.585.766-3.418 1.745-.75.811-1.353 2.193-1.183 3.504 1.295.1 2.593-.615 3.407-1.585z" />
    </Svg>
);

const GoogleIcon = () => (
    <Svg viewBox="0 0 24 24" width="22" height="22">
        <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </Svg>
);

export default function LoginScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const handleNext = () => {
        router.push('/(auth)/ai-setup');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, space[4]) }]}>
            <ProgressBar currentStep={1} totalSteps={4} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={styles.backButton}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <ChevronLeft color={colors.snow} size={20} />
                </Pressable>

                <Text style={styles.headerTitle}>CourtVision</Text>

                <View style={styles.headerRight} />
            </View>

            <View style={styles.content}>
                <Animated.Text
                    entering={FadeInLeft.delay(100).duration(400)}
                    style={styles.headline}
                >
                    Welcome.
                </Animated.Text>
                <Animated.Text
                    entering={FadeInLeft.delay(200).duration(400)}
                    style={styles.subtitle}
                >
                    Sign in to access your{'\n'}coaching dashboard.
                </Animated.Text>

                <View style={styles.buttonsContainer}>
                    <Animated.View entering={FadeInDown.delay(300).duration(400)}>
                        <Button
                            title="Continue with Apple"
                            variant="secondary"
                            leftIcon={<AppleIcon />}
                            onPress={handleNext}
                            style={styles.authButton}
                            textStyle={styles.authButtonText}
                        />
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(400).duration(400)}>
                        <Button
                            title="Continue with Google"
                            variant="secondary"
                            leftIcon={<GoogleIcon />}
                            onPress={handleNext}
                            style={styles.authButton}
                            textStyle={styles.authButtonText}
                        />
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(500).duration(400)}>
                        <Button
                            title="Continue with Email"
                            variant="secondary"
                            leftIcon={<Mail color={colors.fire} size={20} />}
                            onPress={handleNext}
                            style={styles.emailButton}
                            textStyle={styles.emailButtonText}
                        />
                    </Animated.View>
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    By continuing, you agree to our <Text style={styles.footerLink}>Terms</Text> and{' '}
                    <Text style={styles.footerLink}>Privacy Policy</Text>
                </Text>
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
        marginTop: space[2],
    },
    backButton: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        paddingLeft: 0,
        marginLeft: -8, // optical alignment
    },
    headerTitle: {
        fontFamily: 'BarlowCondensed_700Bold',
        fontSize: 18,
        color: colors.snow,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    headerRight: {
        width: 48, // to balance the back button
    },
    content: {
        flex: 1,
        paddingHorizontal: space.screenH,
        paddingTop: space[12],
    },
    headline: {
        ...typography.hero,
        fontSize: 52,
        color: colors.snow,
        marginBottom: space[2],
    },
    subtitle: {
        ...typography.body,
        color: colors.cloud,
        fontSize: 15,
        lineHeight: 22,
    },
    buttonsContainer: {
        marginTop: space[10],
        gap: 12,
    },
    authButton: {
        backgroundColor: colors.surface,
        borderColor: colors.line,
        justifyContent: 'flex-start',
    },
    authButtonText: {
        fontFamily: 'DMSans_500Medium',
        fontSize: 15,
        color: colors.snow,
        textTransform: 'none',
        marginLeft: space[4],
    },
    emailButton: {
        backgroundColor: colors.surface,
        borderColor: colors.lineStrong,
        justifyContent: 'flex-start',
    },
    emailButtonText: {
        fontFamily: 'DMSans_500Medium',
        fontSize: 15,
        color: colors.fire,
        textTransform: 'none',
        marginLeft: space[4],
    },
    footer: {
        paddingHorizontal: space.screenH,
        paddingTop: space[6],
    },
    footerText: {
        fontFamily: 'DMSans_400Regular',
        fontSize: 11,
        color: colors.fog,
        textAlign: 'center',
        lineHeight: 16,
    },
    footerLink: {
        color: colors.fire,
    }
});
