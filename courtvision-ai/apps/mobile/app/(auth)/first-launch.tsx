import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Feather } from '@expo/vector-icons'
import LottieView from 'lottie-react-native'
import { colors, space } from '../../constants/tokens'
import { useStore } from '../../lib/store'

type IntroStep = {
    kicker: string
    title: string
    subtitle: string
    points: string[]
    accent: string
    icon: keyof typeof Feather.glyphMap
}

const INTRO_STEPS: IntroStep[] = [
    {
        kicker: 'STEP 1 OF 4',
        title: 'Track Every Rep',
        subtitle: 'Your phone becomes a live shooting sensor in under 60 seconds.',
        points: [
            'Auto-detect mechanics on each clip',
            'Sync sessions across all your devices',
            'No manual stat entry needed',
        ],
        accent: '#F97316',
        icon: 'video',
    },
    {
        kicker: 'STEP 2 OF 4',
        title: 'Build Your Player DNA',
        subtitle: 'Create a baseline profile that evolves with every workout.',
        points: [
            'Role and experience-based setup',
            'Camera calibration for better precision',
            'Custom profile that grows over time',
        ],
        accent: '#2A7BFF',
        icon: 'cpu',
    },
    {
        kicker: 'STEP 3 OF 4',
        title: 'Read The Mental Game',
        subtitle: 'CourtVision scores both your mechanics and composure under pressure.',
        points: [
            'Shooting and confidence blended score',
            'Session report with clear next actions',
            'Data-first coaching after each upload',
        ],
        accent: '#16C784',
        icon: 'activity',
    },
    {
        kicker: 'STEP 4 OF 4',
        title: 'Stay Locked In',
        subtitle: 'Streaks and milestones keep your progression moving every day.',
        points: [
            'Daily streak momentum and reminders',
            'XP gain for every completed pipeline',
            'Personal evolution visible in one dashboard',
        ],
        accent: '#FBBF24',
        icon: 'zap',
    },
]

const BALL_PULSE_ANIMATION = {
    v: '5.7.4',
    fr: 30,
    ip: 0,
    op: 90,
    w: 200,
    h: 200,
    nm: 'courtvision-ball-pulse',
    ddd: 0,
    assets: [],
    layers: [
        {
            ddd: 0,
            ind: 1,
            ty: 4,
            nm: 'Ball',
            sr: 1,
            ks: {
                o: { a: 0, k: 100 },
                r: { a: 0, k: 0 },
                p: { a: 0, k: [100, 100, 0] },
                a: { a: 0, k: [0, 0, 0] },
                s: {
                    a: 1,
                    k: [
                        { t: 0, s: [100, 100, 100] },
                        { t: 45, s: [118, 118, 100] },
                        { t: 90, s: [100, 100, 100] },
                    ],
                },
            },
            ao: 0,
            shapes: [
                {
                    ty: 'gr',
                    it: [
                        { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [92, 92] }, nm: 'Ellipse Path 1' },
                        { ty: 'fl', c: { a: 0, k: [0.976, 0.451, 0.086, 1] }, o: { a: 0, k: 100 }, r: 1, nm: 'Fill 1' },
                        {
                            ty: 'tr',
                            p: { a: 0, k: [0, 0] },
                            a: { a: 0, k: [0, 0] },
                            s: { a: 0, k: [100, 100] },
                            r: { a: 0, k: 0 },
                            o: { a: 0, k: 100 },
                            sk: { a: 0, k: 0 },
                            sa: { a: 0, k: 0 },
                            nm: 'Transform',
                        },
                    ],
                    nm: 'Ellipse 1',
                },
            ],
            ip: 0,
            op: 90,
            st: 0,
            bm: 0,
        },
    ],
} as const

export default function FirstLaunchScreen() {
    const router = useRouter()
    const markOnboardingFirstLaunchSeen = useStore(s => s.markOnboardingFirstLaunchSeen)
    const [stepIndex, setStepIndex] = useState(0)

    const activeStep = INTRO_STEPS[stepIndex]
    const isLastStep = stepIndex === INTRO_STEPS.length - 1

    const progress = useMemo(
        () => INTRO_STEPS.map((_, index) => index <= stepIndex),
        [stepIndex],
    )

    const markSeenAndNavigate = (path: '/onboarding2' | '/onboarding3') => {
        markOnboardingFirstLaunchSeen()
        router.replace(path)
    }

    const handleNext = () => {
        if (!isLastStep) {
            setStepIndex(previous => previous + 1)
            return
        }

        markSeenAndNavigate('/onboarding2')
    }

    return (
        <SafeAreaView style={styles.screen}>
            <LinearGradient
                colors={['#06101F', '#101A2A', '#120916']}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.headerRow}>
                <Text style={styles.headerKicker}>FIRST LAUNCH</Text>
                <Pressable onPress={() => markSeenAndNavigate('/onboarding2')}>
                    <Text style={styles.skipLabel}>Skip intro</Text>
                </Pressable>
            </View>

            <View style={styles.progressRow}>
                {progress.map((isActive, index) => (
                    <View
                        key={`progress-${index}`}
                        style={[
                            styles.progressBar,
                            isActive ? styles.progressBarActive : null,
                            isActive ? { backgroundColor: activeStep.accent } : null,
                        ]}
                    />
                ))}
            </View>

            <View style={styles.heroCard}>
                <View style={styles.iconRow}>
                    <View style={[styles.iconBadge, { borderColor: `${activeStep.accent}66`, backgroundColor: `${activeStep.accent}1F` }]}>
                        <Feather name={activeStep.icon} size={20} color={activeStep.accent} />
                    </View>
                    {stepIndex === 0 ? (
                        <View style={styles.lottieWrap}>
                            <LottieView
                                source={BALL_PULSE_ANIMATION as any}
                                autoPlay
                                loop
                                style={styles.lottie}
                            />
                        </View>
                    ) : null}
                </View>

                <Text style={styles.kicker}>{activeStep.kicker}</Text>
                <Text style={styles.title}>{activeStep.title}</Text>
                <Text style={styles.subtitle}>{activeStep.subtitle}</Text>

                <View style={styles.pointsWrap}>
                    {activeStep.points.map(point => (
                        <View key={point} style={styles.pointRow}>
                            <View style={[styles.pointDot, { backgroundColor: activeStep.accent }]} />
                            <Text style={styles.pointText}>{point}</Text>
                        </View>
                    ))}
                </View>
            </View>

            <View style={styles.footer}>
                <Pressable style={styles.primaryButton} onPress={handleNext}>
                    <Text style={styles.primaryText}>{isLastStep ? 'Start Setup' : 'Continue'}</Text>
                    <Feather name="arrow-right" size={18} color="#050505" />
                </Pressable>

                <Pressable style={styles.secondaryButton} onPress={() => markSeenAndNavigate('/onboarding3')}>
                    <Text style={styles.secondaryText}>I already have an account</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#05080E',
        paddingHorizontal: space[6],
    },
    headerRow: {
        marginTop: space[3],
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerKicker: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 11,
        letterSpacing: 1.4,
        color: '#96A8C4',
    },
    skipLabel: {
        fontFamily: 'DMSans_600SemiBold',
        color: '#AAB7CD',
        fontSize: 13,
    },
    progressRow: {
        marginTop: space[4],
        flexDirection: 'row',
        gap: 8,
    },
    progressBar: {
        flex: 1,
        height: 6,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.18)',
    },
    progressBarActive: {
        backgroundColor: colors.fire,
    },
    heroCard: {
        marginTop: space[6],
        borderRadius: 26,
        padding: 22,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        backgroundColor: 'rgba(8,14,24,0.78)',
    },
    iconRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    iconBadge: {
        width: 46,
        height: 46,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    lottieWrap: {
        width: 62,
        height: 62,
        borderRadius: 16,
        backgroundColor: 'rgba(249,115,22,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    lottie: {
        width: 58,
        height: 58,
    },
    kicker: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 11,
        letterSpacing: 1.2,
        color: '#8EA1BE',
        marginBottom: 8,
    },
    title: {
        fontFamily: 'Sora_700Bold',
        fontSize: 30,
        lineHeight: 36,
        color: colors.snow,
        marginBottom: 10,
    },
    subtitle: {
        fontFamily: 'DMSans_500Medium',
        color: '#B3C0D3',
        fontSize: 15,
        lineHeight: 23,
        marginBottom: 16,
    },
    pointsWrap: {
        gap: 10,
    },
    pointRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    pointDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    pointText: {
        flex: 1,
        color: '#DBE3F1',
        fontFamily: 'DMSans_600SemiBold',
        fontSize: 14,
    },
    footer: {
        marginTop: 'auto',
        paddingBottom: 20,
        gap: 12,
    },
    primaryButton: {
        height: 58,
        borderRadius: 16,
        backgroundColor: '#F4F7FC',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 10,
    },
    primaryText: {
        color: '#050505',
        fontFamily: 'Sora_700Bold',
        fontSize: 15,
    },
    secondaryButton: {
        height: 54,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(8,14,24,0.68)',
    },
    secondaryText: {
        color: '#D0D8E6',
        fontFamily: 'DMSans_600SemiBold',
        fontSize: 14,
    },
})
