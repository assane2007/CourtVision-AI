import {
    View, Text, TouchableOpacity, TextInput,
    KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet,
    Keyboard, TouchableWithoutFeedback, Dimensions
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState, useEffect } from 'react'
import Animated, {
    FadeIn, FadeInDown, FadeOut,
    useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing, withSpring
} from 'react-native-reanimated'
import { AntDesign, Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'
import { colors, space } from '../constants/tokens'
import { useAnalytics } from '../lib/analytics'

const { width, height } = Dimensions.get('window')

// Addictive Glowing Input Component
function GlowingInput({
    label, value, onChangeText, placeholder, secureTextEntry = false, isEmail = false
}: {
    label: string, value: string, onChangeText: (t: string) => void, placeholder: string, secureTextEntry?: boolean, isEmail?: boolean
}) {
    const [isFocused, setIsFocused] = useState(false)

    return (
        <View style={{ marginBottom: 20 }}>
            <Text style={styles.inputLabel}>{label}</Text>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                onFocus={() => {
                    setIsFocused(true)
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                }}
                onBlur={() => setIsFocused(false)}
                style={[
                    styles.input,
                    isFocused && { borderColor: colors.fire, shadowColor: colors.fire, shadowRadius: 10, shadowOpacity: 0.3 }
                ]}
                placeholder={placeholder}
                placeholderTextColor="#555"
                secureTextEntry={secureTextEntry}
                keyboardType={isEmail ? 'email-address' : 'default'}
                autoCapitalize="none"
                autoCorrect={false}
            />
        </View>
    )
}

export default function Onboarding3() {
    const router = useRouter()
    const loginWithEmail = useStore(s => s.loginWithEmail)
    const signUpWithEmail = useStore(s => s.signUpWithEmail)
    const loginWithOAuth = useStore(s => s.loginWithOAuth)
    const authLoading = useStore(s => s.authLoading)
    const { trackEvent } = useAnalytics()

    const [mode, setMode] = useState<'choice' | 'email'>('choice')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [username, setUsername] = useState('')
    const [isLogin, setIsLogin] = useState(true)
    const [loading, setLoading] = useState(false)

    // Background Particle Animation
    const bgRot = useSharedValue(0)
    useEffect(() => {
        bgRot.value = withRepeat(
            withTiming(360, { duration: 40000, easing: Easing.linear }),
            -1, false
        )
    }, [])
    const rBg = useAnimatedStyle(() => ({
        transform: [{ rotate: `${bgRot.value}deg` }, { scale: 1.5 }]
    }))

    const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(style)
    }

    const handleOAuth = async (provider: 'apple' | 'google') => {
        triggerHaptic()
        setLoading(true)
        try {
            await loginWithOAuth(provider)
            trackEvent('onboarding_completed', { method: `oauth_${provider}` })
            router.replace('/(app)')
        } catch (err: unknown) {
            toast.error('Auth Error', err instanceof Error ? err.message : 'Error')
        } finally {
            setLoading(false)
        }
    }

    const handleEmailAuth = async () => {
        triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy)
        if (!email || !password || (!isLogin && !username)) {
            toast.error('Missing Fields', 'Please fill out all required fields.')
            return
        }

        setLoading(true)
        try {
            if (isLogin) {
                await loginWithEmail(email, password)
                trackEvent('onboarding_completed', { method: 'email_login' })
            } else {
                await signUpWithEmail(email, password, username)
                trackEvent('onboarding_completed', { method: 'email_signup' })
            }
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            router.replace('/(app)')
        } catch (err: unknown) {
            toast.error('Auth Error', err instanceof Error ? err.message : 'Error')
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        } finally {
            setLoading(false)
        }
    }

    const isLoading = loading || authLoading

    return (
        <SafeAreaView style={styles.container}>
            {/* Dynamic Ambient Background */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <Animated.View style={[styles.ambientGlow, rBg, { backgroundColor: 'rgba(255, 68, 0, 0.05)', top: -height * 0.2, left: -width * 0.5 }]} />
                <Animated.View style={[styles.ambientGlow, rBg, { backgroundColor: 'rgba(160, 32, 240, 0.05)', bottom: -height * 0.2, right: -width * 0.5 }]} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={styles.content}>

                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => mode === 'email' ? setMode('choice') : router.back()}>
                            <View style={styles.backBtn}>
                                <Text style={styles.backBtnText}>{'<'}</Text>
                            </View>
                        </TouchableOpacity>
                        <View style={styles.statusPill}>
                            <View style={styles.statusDot} />
                            <Text style={styles.statusText}>UPLINK SECURE</Text>
                        </View>
                    </View>

                    {/* Title Section */}
                    <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.titleContainer}>
                        <Text style={styles.title}>
                            {mode === 'choice' ? 'Access Database' : isLogin ? 'Authenticate' : 'Establish Profile'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {mode === 'choice'
                                ? 'Select your secure entry method.'
                                : 'Enter your credentials to link neural data.'}
                        </Text>
                    </Animated.View>

                    {mode === 'choice' ? (
                        <Animated.View entering={FadeIn.delay(200).duration(500)} style={styles.formContainer}>

                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: colors.snow }]}
                                onPress={() => handleOAuth('apple')}
                                activeOpacity={0.8}
                            >
                                <AntDesign name="apple1" size={24} color="#000" />
                                <Text style={[styles.actionBtnText, { color: '#000' }]}>Continue with Apple</Text>
                                <Feather name="arrow-right" size={20} color="#000" style={{ position: 'absolute', right: 24 }} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: '#111', borderColor: '#333', borderWidth: 1 }]}
                                onPress={() => handleOAuth('google')}
                                activeOpacity={0.8}
                            >
                                <AntDesign name="google" size={24} color="#fff" />
                                <Text style={[styles.actionBtnText, { color: '#fff' }]}>Continue with Google</Text>
                                <Feather name="arrow-right" size={20} color="#fff" style={{ position: 'absolute', right: 24 }} />
                            </TouchableOpacity>

                            <View style={styles.dividerContainer}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>OVERRIDE PROTOCOL</Text>
                                <View style={styles.dividerLine} />
                            </View>

                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: 'transparent', borderColor: colors.fire, borderWidth: 1 }]}
                                onPress={() => {
                                    triggerHaptic()
                                    setMode('email')
                                }}
                                activeOpacity={0.8}
                            >
                                <Feather name="mail" size={24} color={colors.fire} />
                                <Text style={[styles.actionBtnText, { color: colors.fire }]}>Manual Email Entry</Text>
                            </TouchableOpacity>

                        </Animated.View>
                    ) : (
                        <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut} style={styles.formContainer}>

                            {!isLogin && (
                                <GlowingInput
                                    label="Callsign (Username)"
                                    value={username}
                                    onChangeText={setUsername}
                                    placeholder="Player_One"
                                />
                            )}

                            <GlowingInput
                                label="Network ID (Email)"
                                value={email}
                                onChangeText={setEmail}
                                placeholder="name@domain.com"
                                isEmail
                            />

                            <GlowingInput
                                label="Security Cipher (Password)"
                                value={password}
                                onChangeText={setPassword}
                                placeholder="••••••••"
                                secureTextEntry
                            />

                            <TouchableOpacity
                                style={[styles.primarySubmitBtn, isLoading && { opacity: 0.7 }]}
                                onPress={handleEmailAuth}
                                disabled={isLoading}
                                activeOpacity={0.9}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#000" />
                                ) : (
                                    <>
                                        <Text style={styles.primarySubmitText}>
                                            {isLogin ? 'TRANSMIT' : 'CREATE PROTOCOL'}
                                        </Text>
                                        <Feather name="zap" size={20} color="#000" />
                                    </>
                                )}
                            </TouchableOpacity>

                            <View style={styles.switchModeContainer}>
                                <TouchableOpacity
                                    onPress={() => {
                                        triggerHaptic()
                                        setIsLogin(!isLogin)
                                    }}
                                    style={styles.switchPill}
                                >
                                    <Text style={styles.switchModePrompt}>
                                        {isLogin ? "No account?" : "Already linked?"}
                                    </Text>
                                    <Text style={styles.switchModeLink}>
                                        {isLogin ? ' REGISTER' : ' SIGN IN'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    )}

                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    ambientGlow: {
        position: 'absolute',
        width: width * 1.5,
        height: width * 1.5,
        borderRadius: width * 0.75,
    },
    content: {
        flex: 1,
        paddingHorizontal: space[6],
        paddingTop: space[4],
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: space[8],
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#111',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#222',
    },
    backBtnText: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        fontSize: 18,
        color: colors.cloud,
        fontWeight: 'bold',
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 255, 204, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 204, 0.3)',
    },
    statusDot: {
        width: 6, height: 6,
        borderRadius: 3,
        backgroundColor: '#00ffcc',
        marginRight: 6,
        shadowColor: '#00ffcc',
        shadowRadius: 5, shadowOpacity: 1,
    },
    statusText: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 10,
        fontWeight: 'bold',
        color: '#00ffcc',
        letterSpacing: 1,
    },
    titleContainer: {
        marginBottom: space[10],
    },
    title: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        fontSize: 40,
        fontWeight: '900',
        color: colors.snow,
        marginBottom: 8,
        letterSpacing: -1,
    },
    subtitle: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        fontSize: 16,
        color: '#888',
        fontWeight: '500',
    },
    formContainer: {
        flex: 1,
    },
    actionBtn: {
        flexDirection: 'row',
        height: 68,
        borderRadius: 34,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    actionBtnText: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        fontSize: 18,
        fontWeight: '800',
        marginLeft: 12,
        letterSpacing: -0.5,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: space[8],
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#222',
    },
    dividerText: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        color: '#666',
        paddingHorizontal: 16,
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    inputGlowBase: {
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.fire,
        backgroundColor: 'transparent',
    },
    inputLabel: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 11,
        fontWeight: 'bold',
        color: '#888',
        marginBottom: 8,
        marginLeft: 4,
        letterSpacing: 1,
    },
    input: {
        backgroundColor: '#111',
        height: 60,
        width: '100%',
        borderRadius: 16,
        paddingHorizontal: 16,
        color: colors.snow,
        fontSize: 18,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        fontWeight: '600',
        borderWidth: 2,
        borderColor: '#222',
        zIndex: 5,
    },
    inputFocused: {
        borderColor: 'transparent',
        backgroundColor: '#0a0a0a'
    },
    primarySubmitBtn: {
        backgroundColor: colors.snow,
        height: 68,
        borderRadius: 34,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: space[4],
        marginBottom: space[8],
        shadowColor: colors.snow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    primarySubmitText: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        color: '#000',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 1,
        marginRight: 8,
    },
    switchModeContainer: {
        alignItems: 'center',
    },
    switchPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#222',
    },
    switchModePrompt: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        fontSize: 14,
        color: '#888',
        fontWeight: '500',
    },
    switchModeLink: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        fontSize: 14,
        fontWeight: '800',
        color: colors.fire,
    }
})
