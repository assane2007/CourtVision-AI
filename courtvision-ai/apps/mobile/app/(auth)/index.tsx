import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Feather } from '@expo/vector-icons'
import { colors, space } from '../../constants/tokens'

const FEATURE_POINTS = [
    'Live biomechanical feedback',
    'Real API sync across sessions',
    'Personalized progression curve',
]

export default function AuthEntryScreen() {
    const router = useRouter()

    return (
        <SafeAreaView style={styles.screen}>
            <LinearGradient
                colors={['#06101F', '#0D1322', '#110B18']}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.heroBlock}>
                <Text style={styles.kicker}>COURTVISION AI</Text>
                <Text style={styles.title}>Train Like The Data Never Lies</Text>
                <Text style={styles.subtitle}>
                    Every shot, angle, and rhythm is tracked and synchronized. Build your player profile from your first rep.
                </Text>
            </View>

            <View style={styles.featureCard}>
                {FEATURE_POINTS.map((point) => (
                    <View key={point} style={styles.featureRow}>
                        <View style={styles.featureDot} />
                        <Text style={styles.featureText}>{point}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.footer}>
                <Pressable style={styles.primaryButton} onPress={() => router.push('/onboarding2')}>
                    <Text style={styles.primaryText}>Start Onboarding</Text>
                    <Feather name="arrow-right" size={18} color="#060606" />
                </Pressable>

                <Pressable style={styles.secondaryButton} onPress={() => router.push('/onboarding3')}>
                    <Text style={styles.secondaryText}>I already have an account</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#050505',
        paddingHorizontal: space[6],
    },
    heroBlock: {
        marginTop: space[10],
    },
    kicker: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 11,
        color: '#9CB1CD',
        letterSpacing: 1.3,
        marginBottom: 10,
    },
    title: {
        fontFamily: 'Sora_800ExtraBold',
        color: colors.snow,
        fontSize: 40,
        lineHeight: 45,
        marginBottom: 12,
    },
    subtitle: {
        fontFamily: 'DMSans_500Medium',
        color: '#B8C4D8',
        fontSize: 16,
        lineHeight: 24,
    },
    featureCard: {
        marginTop: space[8],
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        backgroundColor: 'rgba(9,14,24,0.72)',
        padding: 18,
        gap: 12,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    featureDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.fire,
    },
    featureText: {
        flex: 1,
        color: '#DBE2EF',
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
        color: '#060606',
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