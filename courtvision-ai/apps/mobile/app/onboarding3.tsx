import { useState } from 'react'
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { AntDesign, Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'
import { colors, space } from '../constants/tokens'
import { useAnalytics } from '../lib/analytics'

type Mode = 'choice' | 'email'

function InputField({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry = false,
    keyboardType = 'default',
}: {
    label: string
    value: string
    onChangeText: (value: string) => void
    placeholder: string
    secureTextEntry?: boolean
    keyboardType?: 'default' | 'email-address'
}) {
    return (
        <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>{label}</Text>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#7D8797"
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
            />
        </View>
    )
}

export default function Onboarding3() {
    const router = useRouter()
    const loginWithEmail = useStore(s => s.loginWithEmail)
    const signUpWithEmail = useStore(s => s.signUpWithEmail)
    const loginWithOAuth = useStore(s => s.loginWithOAuth)
    const syncOnboardingDraft = useStore(s => s.syncOnboardingDraft)
    const authLoading = useStore(s => s.authLoading)
    const { trackEvent } = useAnalytics()

    const [mode, setMode] = useState<Mode>('choice')
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [username, setUsername] = useState('')
    const [loading, setLoading] = useState(false)

    const isLoading = loading || authLoading

    const triggerLightHaptic = () => {
        if (Platform.OS !== 'web') Haptics.selectionAsync()
    }

    const handleOAuth = async (provider: 'apple' | 'google') => {
        triggerLightHaptic()
        setLoading(true)
        try {
            await loginWithOAuth(provider)
            trackEvent('onboarding_completed', { method: `oauth_${provider}` })
            toast.success('Continue sign in', 'Finish OAuth in browser, then return to the app.')
        } catch (err: unknown) {
            toast.error('Auth Error', err instanceof Error ? err.message : 'Unexpected error')
        } finally {
            setLoading(false)
        }
    }

    const handleEmailAuth = async () => {
        if (!email || !password || (!isLogin && !username.trim())) {
            toast.error('Missing fields', 'Fill all required fields to continue.')
            return
        }

        setLoading(true)
        try {
            if (isLogin) {
                await loginWithEmail(email.trim(), password)
                trackEvent('onboarding_completed', { method: 'email_login' })
            } else {
                await signUpWithEmail(email.trim(), password, username.trim())
                trackEvent('onboarding_completed', { method: 'email_signup' })
            }

            await syncOnboardingDraft().catch(() => { })

            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            }
            router.replace('/(dashboard)')
        } catch (err: unknown) {
            toast.error('Auth Error', err instanceof Error ? err.message : 'Unexpected error')
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <SafeAreaView style={styles.screen}>
            <LinearGradient
                colors={['#09111B', '#120D1F', '#070707']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Pressable
                            style={styles.backBtn}
                            onPress={() => {
                                if (mode === 'email') {
                                    setMode('choice')
                                    return
                                }
                                router.back()
                            }}
                        >
                            <Feather name="arrow-left" size={18} color={colors.snow} />
                        </Pressable>

                        <View style={styles.lockBadge}>
                            <Feather name="shield" size={14} color="#8EC5FF" />
                            <Text style={styles.lockBadgeText}>SECURE AUTH</Text>
                        </View>
                    </View>

                    <View style={styles.hero}>
                        <Text style={styles.kicker}>FINAL STEP</Text>
                        <Text style={styles.title}>{mode === 'choice' ? 'Create Your Access' : isLogin ? 'Welcome Back' : 'Create Account'}</Text>
                        <Text style={styles.subtitle}>
                            {mode === 'choice'
                                ? 'Sign in to sync your onboarding profile with CourtVision API.'
                                : 'Once connected, your player profile is persisted to the backend.'}
                        </Text>
                    </View>

                    {mode === 'choice' ? (
                        <View style={styles.choiceWrap}>
                            <Pressable style={[styles.optionBtn, styles.optionLight]} onPress={() => handleOAuth('apple')} disabled={isLoading}>
                                <AntDesign name="apple" size={20} color="#060606" />
                                <Text style={[styles.optionText, { color: '#060606' }]}>Continue with Apple</Text>
                                <Feather name="arrow-up-right" size={16} color="#060606" />
                            </Pressable>

                            <Pressable style={styles.optionBtn} onPress={() => handleOAuth('google')} disabled={isLoading}>
                                <AntDesign name="google" size={20} color={colors.snow} />
                                <Text style={styles.optionText}>Continue with Google</Text>
                                <Feather name="arrow-up-right" size={16} color={colors.snow} />
                            </Pressable>

                            <View style={styles.separatorRow}>
                                <View style={styles.separatorLine} />
                                <Text style={styles.separatorText}>OR</Text>
                                <View style={styles.separatorLine} />
                            </View>

                            <Pressable
                                style={styles.optionOutline}
                                onPress={() => {
                                    triggerLightHaptic()
                                    setMode('email')
                                }}
                                disabled={isLoading}
                            >
                                <Feather name="mail" size={18} color={colors.fire} />
                                <Text style={styles.optionOutlineText}>Use Email</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <View style={styles.formWrap}>
                            {!isLogin ? (
                                <InputField
                                    label="Username"
                                    value={username}
                                    onChangeText={setUsername}
                                    placeholder="player_name"
                                />
                            ) : null}

                            <InputField
                                label="Email"
                                value={email}
                                onChangeText={setEmail}
                                placeholder="name@domain.com"
                                keyboardType="email-address"
                            />

                            <InputField
                                label="Password"
                                value={password}
                                onChangeText={setPassword}
                                placeholder="••••••••"
                                secureTextEntry
                            />

                            <Pressable style={[styles.submitBtn, isLoading ? styles.submitBtnDisabled : null]} onPress={handleEmailAuth} disabled={isLoading}>
                                {isLoading ? (
                                    <ActivityIndicator color="#060606" />
                                ) : (
                                    <>
                                        <Text style={styles.submitText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
                                        <Feather name="arrow-right" size={16} color="#060606" />
                                    </>
                                )}
                            </Pressable>

                            <Pressable
                                style={styles.switchModeBtn}
                                onPress={() => {
                                    triggerLightHaptic()
                                    setIsLogin(v => !v)
                                }}
                            >
                                <Text style={styles.switchModeText}>{isLogin ? 'No account yet? Create one' : 'Already have an account? Sign in'}</Text>
                            </Pressable>
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    screen: {
        flex: 1,
        backgroundColor: '#070707',
    },
    container: {
        flex: 1,
        paddingHorizontal: space[6],
        paddingTop: space[2],
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        backgroundColor: 'rgba(10,17,29,0.55)',
    },
    lockBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(142,197,255,0.3)',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: 'rgba(142,197,255,0.12)',
    },
    lockBadgeText: {
        fontFamily: 'JetBrainsMono_400Regular',
        color: '#8EC5FF',
        fontSize: 10,
        letterSpacing: 0.8,
    },
    hero: {
        marginTop: space[6],
        marginBottom: space[8],
    },
    kicker: {
        fontFamily: 'JetBrainsMono_400Regular',
        color: '#98A9C4',
        fontSize: 11,
        letterSpacing: 1.2,
        marginBottom: 10,
    },
    title: {
        fontFamily: 'Sora_700Bold',
        color: colors.snow,
        fontSize: 32,
        lineHeight: 39,
        marginBottom: 10,
    },
    subtitle: {
        fontFamily: 'DMSans_500Medium',
        color: '#B3BECE',
        fontSize: 15,
        lineHeight: 22,
    },
    choiceWrap: {
        gap: 14,
    },
    optionBtn: {
        height: 58,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
        backgroundColor: 'rgba(9,16,27,0.72)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    optionLight: {
        backgroundColor: '#F4F7FC',
        borderColor: '#F4F7FC',
    },
    optionText: {
        fontFamily: 'Sora_600SemiBold',
        color: colors.snow,
        fontSize: 14,
    },
    separatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
        marginBottom: 4,
    },
    separatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.16)',
    },
    separatorText: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 10,
        letterSpacing: 1,
        color: '#AAB4C5',
    },
    optionOutline: {
        height: 54,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,107,0,0.5)',
        backgroundColor: 'rgba(255,107,0,0.09)',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 10,
    },
    optionOutlineText: {
        fontFamily: 'Sora_600SemiBold',
        color: colors.fire,
        fontSize: 14,
    },
    formWrap: {
        gap: 14,
    },
    inputBlock: {
        gap: 8,
    },
    inputLabel: {
        fontFamily: 'DMSans_700Bold',
        color: '#D3DBE8',
        fontSize: 13,
    },
    input: {
        height: 56,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        backgroundColor: 'rgba(8,14,24,0.75)',
        color: colors.snow,
        fontFamily: 'DMSans_500Medium',
        fontSize: 15,
        paddingHorizontal: 14,
    },
    submitBtn: {
        marginTop: 8,
        height: 56,
        borderRadius: 16,
        backgroundColor: '#F4F7FC',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    submitBtnDisabled: {
        opacity: 0.6,
    },
    submitText: {
        fontFamily: 'Sora_700Bold',
        color: '#060606',
        fontSize: 14,
    },
    switchModeBtn: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    switchModeText: {
        fontFamily: 'DMSans_600SemiBold',
        color: '#ADB8CA',
        fontSize: 13,
    },
})
