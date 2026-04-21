import { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { ApiError, NetworkError, api } from '../lib/api'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'
import { colors, space } from '../constants/tokens'

type Step = 'position' | 'experience'
type PositionId = 'PG' | 'SG' | 'SF' | 'PF' | 'C'
type ExperienceId = 'beginner' | 'intermediate' | 'advanced' | 'elite'

interface PositionOption {
    id: PositionId
    label: string
    summary: string
}

interface ExperienceOption {
    id: ExperienceId
    label: string
    years: string
    profileLevel: number
}

interface OnboardingOptionsResponse {
    success?: boolean
    data?: {
        positions?: PositionOption[]
        experienceLevels?: ExperienceOption[]
    }
    positions?: PositionOption[]
    experienceLevels?: ExperienceOption[]
}

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504])

const FALLBACK_POSITIONS: PositionOption[] = [
    { id: 'PG', label: 'Point Guard', summary: 'Primary ball-handler, tempo control and playmaking.' },
    { id: 'SG', label: 'Shooting Guard', summary: 'Perimeter scoring threat and off-ball movement.' },
    { id: 'SF', label: 'Small Forward', summary: 'Versatile wing impact on both offense and defense.' },
    { id: 'PF', label: 'Power Forward', summary: 'Physical interior presence with rebounding focus.' },
    { id: 'C', label: 'Center', summary: 'Paint anchor for rim protection and interior finishing.' },
]

const FALLBACK_EXPERIENCE_LEVELS: ExperienceOption[] = [
    { id: 'beginner', label: 'Beginner', years: '0-1 years', profileLevel: 10 },
    { id: 'intermediate', label: 'Intermediate', years: '2-4 years', profileLevel: 30 },
    { id: 'advanced', label: 'Advanced', years: '5-8 years', profileLevel: 55 },
    { id: 'elite', label: 'Elite', years: '9+ years', profileLevel: 80 },
]

const POSITION_ACCENT: Record<PositionId, string> = {
    PG: '#44D6FF',
    SG: '#60DFFF',
    SF: '#2AC7F2',
    PF: '#78E5FF',
    C: '#90EEFF',
}

export default function Onboarding2() {
    const router = useRouter()
    const setOnboardingDraft = useStore(s => s.setOnboardingDraft)

    const [step, setStep] = useState<Step>('position')
    const [positions, setPositions] = useState<PositionOption[]>([])
    const [experienceLevels, setExperienceLevels] = useState<ExperienceOption[]>([])
    const [selectedPosition, setSelectedPosition] = useState<PositionId | null>(null)
    const [selectedExperience, setSelectedExperience] = useState<ExperienceId | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const loadOptions = async () => {
        setLoading(true)
        setError(null)
        try {
            let res: OnboardingOptionsResponse | null = null

            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    res = await api.get<OnboardingOptionsResponse>('/api/auth/onboarding/options', {
                        timeoutMs: 45_000,
                    })
                    break
                } catch (requestError) {
                    const isRetryableHttpError = requestError instanceof ApiError
                        && RETRYABLE_STATUS_CODES.has(requestError.statusCode)
                    const isRetryableNetworkError = requestError instanceof NetworkError
                    const isRetryable = isRetryableHttpError || isRetryableNetworkError

                    const isLastAttempt = attempt === 2
                    if (!isRetryable || isLastAttempt) {
                        throw requestError
                    }

                    await new Promise(resolve => setTimeout(resolve, 900 * (attempt + 1)))
                }
            }

            if (!res) {
                throw new Error('Onboarding options unavailable from API')
            }

            const payload = res.data ?? res
            const remotePositions = payload.positions ?? []
            const remoteExperience = payload.experienceLevels ?? []

            if (remotePositions.length === 0 || remoteExperience.length === 0) {
                setPositions(FALLBACK_POSITIONS)
                setExperienceLevels(FALLBACK_EXPERIENCE_LEVELS)
                toast.error('Onboarding API', 'Remote options unavailable, fallback options loaded.')
                return
            }

            setPositions(remotePositions)
            setExperienceLevels(remoteExperience)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load onboarding data'
            setPositions(FALLBACK_POSITIONS)
            setExperienceLevels(FALLBACK_EXPERIENCE_LEVELS)
            setError(null)
            toast.error('Onboarding API', `${message}. Fallback options loaded.`)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadOptions()
    }, [])

    const onPositionPress = (id: PositionId) => {
        if (Platform.OS !== 'web') Haptics.selectionAsync()
        setSelectedPosition(id)
        setOnboardingDraft({ position: id })
    }

    const onExperiencePress = (id: ExperienceId) => {
        if (Platform.OS !== 'web') Haptics.selectionAsync()
        setSelectedExperience(id)
        setOnboardingDraft({ experienceLevel: id })
    }

    const onContinue = () => {
        if (step === 'position') {
            if (!selectedPosition) {
                toast.error('Missing selection', 'Pick your primary position first.')
                return
            }
            setStep('experience')
            return
        }

        if (!selectedExperience) {
            toast.error('Missing selection', 'Select your current experience level.')
            return
        }

        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        router.push('/onboarding-camera')
    }

    return (
        <SafeAreaView style={styles.screen}>
            <LinearGradient
                colors={['#04070D', '#080D16', '#0A0A0A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.header}>
                <Pressable
                    style={styles.iconBtn}
                    onPress={() => {
                        if (step === 'experience') {
                            setStep('position')
                            return
                        }
                        router.back()
                    }}
                >
                    <Feather name="arrow-left" size={20} color={colors.cloud} />
                </Pressable>

                <View style={styles.progressWrap}>
                    <View style={[styles.progressBar, step === 'position' ? styles.progressActive : null]} />
                    <View style={[styles.progressBar, step === 'experience' ? styles.progressActive : null]} />
                </View>
            </View>

            <View style={styles.heroCard}>
                <Text style={styles.kicker}>ONBOARDING</Text>
                <Text style={styles.title}>{step === 'position' ? 'Choose Your Position' : 'Choose Your Experience'}</Text>
                <Text style={styles.subtitle}>
                    {step === 'position'
                        ? 'These options are loaded live from CourtVision API.'
                        : 'This helps tune your first coaching profile from day one.'}
                </Text>
            </View>

            {loading ? (
                <View style={styles.centerState}>
                    <ActivityIndicator color={colors.ice} />
                    <Text style={styles.stateText}>Loading onboarding data from API...</Text>
                </View>
            ) : error ? (
                <View style={styles.centerState}>
                    <Feather name="wifi-off" size={22} color={colors.fire} />
                    <Text style={styles.stateText}>Unable to load onboarding options.</Text>
                    <Pressable style={styles.retryBtn} onPress={loadOptions}>
                        <Text style={styles.retryText}>Retry</Text>
                    </Pressable>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
                    {step === 'position' && positions.map((position) => {
                        const active = selectedPosition === position.id
                        return (
                            <Pressable
                                key={position.id}
                                onPress={() => onPositionPress(position.id)}
                                style={[styles.card, active ? styles.cardActive : null]}
                            >
                                <View style={[styles.badge, { backgroundColor: `${POSITION_ACCENT[position.id]}33` }]}>
                                    <Text style={[styles.badgeText, { color: POSITION_ACCENT[position.id] }]}>{position.id}</Text>
                                </View>
                                <View style={styles.cardTextWrap}>
                                    <Text style={styles.cardTitle}>{position.label}</Text>
                                    <Text style={styles.cardSubtitle}>{position.summary}</Text>
                                </View>
                                <Feather name={active ? 'check-circle' : 'circle'} size={20} color={active ? colors.ice : '#5D6675'} />
                            </Pressable>
                        )
                    })}

                    {step === 'experience' && experienceLevels.map((level) => {
                        const active = selectedExperience === level.id
                        return (
                            <Pressable
                                key={level.id}
                                onPress={() => onExperiencePress(level.id)}
                                style={[styles.card, active ? styles.cardActive : null]}
                            >
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{`L${level.profileLevel}`}</Text>
                                </View>
                                <View style={styles.cardTextWrap}>
                                    <Text style={styles.cardTitle}>{level.label}</Text>
                                    <Text style={styles.cardSubtitle}>{level.years}</Text>
                                </View>
                                <Feather name={active ? 'check-circle' : 'circle'} size={20} color={active ? colors.ice : '#5D6675'} />
                            </Pressable>
                        )
                    })}
                </ScrollView>
            )}

            <View style={styles.footer}>
                <Pressable
                    style={[styles.primaryBtn, (loading || !!error) ? styles.primaryBtnDisabled : null]}
                    onPress={onContinue}
                    disabled={loading || !!error}
                >
                    <Text style={styles.primaryBtnText}>{step === 'position' ? 'Continue' : 'Start Camera Calibration'}</Text>
                    <Feather name="arrow-right" size={18} color="#FFFFFF" />
                </Pressable>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#070707',
    },
    header: {
        paddingHorizontal: space[6],
        paddingTop: space[2],
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.10)',
        backgroundColor: 'rgba(10,16,28,0.56)',
    },
    progressWrap: {
        flexDirection: 'row',
        gap: 8,
    },
    progressBar: {
        width: 40,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    progressActive: {
        backgroundColor: colors.ice,
    },
    heroCard: {
        marginTop: space[5],
        marginHorizontal: space[6],
        padding: space[6],
        borderRadius: 24,
        backgroundColor: 'rgba(8,14,28,0.9)',
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.10)',
    },
    kicker: {
        fontFamily: 'JetBrainsMono_400Regular',
        color: '#8FA9C4',
        fontSize: 11,
        letterSpacing: 1.3,
        marginBottom: 8,
    },
    title: {
        fontFamily: 'Sora_700Bold',
        color: colors.snow,
        fontSize: 29,
        lineHeight: 35,
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: 'DMSans_500Medium',
        color: '#B4C0D1',
        fontSize: 15,
        lineHeight: 22,
    },
    scrollBody: {
        paddingHorizontal: space[6],
        paddingTop: space[5],
        paddingBottom: 130,
        gap: 12,
    },
    card: {
        borderRadius: 18,
        padding: 16,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.10)',
        backgroundColor: 'rgba(8,13,22,0.88)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    cardActive: {
        borderColor: 'rgba(68,214,255,0.55)',
        backgroundColor: 'rgba(68,214,255,0.12)',
    },
    badge: {
        minWidth: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(68,214,255,0.14)',
    },
    badgeText: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 12,
        color: colors.ice,
    },
    cardTextWrap: {
        flex: 1,
    },
    cardTitle: {
        fontFamily: 'Sora_600SemiBold',
        color: colors.snow,
        fontSize: 15,
        marginBottom: 2,
    },
    cardSubtitle: {
        fontFamily: 'DMSans_500Medium',
        color: '#9AA6B7',
        fontSize: 13,
    },
    footer: {
        position: 'absolute',
        left: space[6],
        right: space[6],
        bottom: Platform.OS === 'ios' ? 34 : 20,
    },
    primaryBtn: {
        height: 60,
        borderRadius: 18,
        backgroundColor: colors.fire,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 10,
    },
    primaryBtnDisabled: {
        opacity: 0.55,
    },
    primaryBtnText: {
        fontFamily: 'Sora_700Bold',
        color: '#FFFFFF',
        fontSize: 15,
    },
    centerState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        gap: 12,
    },
    stateText: {
        fontFamily: 'DMSans_500Medium',
        color: '#B8C0CD',
        textAlign: 'center',
    },
    retryBtn: {
        marginTop: 6,
        borderRadius: 12,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.20)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: 'rgba(8,14,28,0.88)',
    },
    retryText: {
        fontFamily: 'Sora_600SemiBold',
        color: colors.snow,
    },
})
