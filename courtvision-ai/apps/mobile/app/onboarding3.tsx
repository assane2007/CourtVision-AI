import {
    View, Text, TouchableOpacity, TextInput,
    KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEffect, useState } from 'react'
import Animated, {
    useSharedValue, useAnimatedStyle, withTiming, withSpring,
    withRepeat, withSequence, Easing,
} from 'react-native-reanimated'
import { AntDesign, Feather } from '@expo/vector-icons'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'
import { T, typePresets } from '../lib/theme'

const type = typePresets

//  Screen 

export default function Onboarding3() {
    const router = useRouter()
    const { loginWithEmail, signUpWithEmail, loginWithOAuth, authLoading } = useStore()

    const [mode, setMode]       = useState<'choice' | 'email'>('choice')
    const [email, setEmail]     = useState('')
    const [password, setPassword] = useState('')
    const [username, setUsername] = useState('')
    const [isLogin, setIsLogin]  = useState(true)
    const [loading, setLoading]  = useState(false)
    const [showPass, setShowPass] = useState(false)

    // Animations
    const fadeOpacity = useSharedValue(0)
    const slideY = useSharedValue(30)
    const logoScale = useSharedValue(0.8)
    const glowPulse = useSharedValue(0)

    useEffect(() => {
        fadeOpacity.value = withTiming(1, { duration: 600 })
        slideY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.quad) })
        logoScale.value = withSpring(1, { damping: 12, stiffness: 100 })
        glowPulse.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 2000 }),
                withTiming(0, { duration: 2000 }),
            ),
            -1, true,
        )
    }, [])

    const fadeStyle = useAnimatedStyle(() => ({
        opacity: fadeOpacity.value,
        transform: [{ translateY: slideY.value }],
    }))

    const logoStyle = useAnimatedStyle(() => ({
        transform: [{ scale: logoScale.value }],
        opacity: fadeOpacity.value,
    }))

    //  Auth Handlers 

    const handleOAuth = async (provider: 'apple' | 'google') => {
        setLoading(true)
        try {
            await loginWithOAuth(provider)
            router.replace('/(dashboard)')
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Please try again'
            toast.error('Sign in failed', message)
        } finally {
            setLoading(false)
        }
    }

    const handleEmailAuth = async () => {
        if (!email.includes('@')) {
            toast.error('Invalid email', 'Please check your address')
            return
        }
        if (password.length < 6) {
            toast.error('Password too short', 'Minimum 6 characters')
            return
        }
        if (!isLogin && username.length < 3) {
            toast.error('Username too short', 'Minimum 3 characters')
            return
        }

        setLoading(true)
        try {
            if (isLogin) {
                await loginWithEmail(email, password)
            } else {
                await signUpWithEmail(email, password, username)
            }
            router.replace('/(dashboard)')
        } catch (err: unknown) {
            const title = isLogin ? 'Login failed' : 'Sign up failed'
            const message = err instanceof Error ? err.message : 'Check your credentials'
            toast.error(title, message)
        } finally {
            setLoading(false)
        }
    }

    const isLoading = loading || authLoading

    //  Render 

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.color.background.primary }}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                {/* Header */}
                <View style={{ paddingHorizontal: T.spacing[5], paddingTop: 10 }}>
                    <TouchableOpacity onPress={() => mode === 'email' ? setMode('choice') : router.back()}>
                        <View style={{
                            width: 40, height: 40, borderRadius: T.borderRadius.md,
                            ...T.glass.light,
                            justifyContent: 'center', alignItems: 'center',
                        }}>
                            <Feather name="arrow-left" size={20} color={T.color.text.secondary} />
                        </View>
                    </TouchableOpacity>

                    {/* Progress — all steps filled */}
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: T.spacing[3], marginBottom: 4 }}>
                        {[0, 1, 2, 3].map(i => (
                            <View key={i} style={{
                                flex: 1, height: 3, borderRadius: 2,
                                backgroundColor: T.color.signature.primary,
                                ...T.glow(T.color.signature.primary, 0.15),
                            }} />
                        ))}
                    </View>
                </View>

                {mode === 'choice' ? (
                    /*  Provider Choice  */
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 }}>
                        {/* Logo */}
                        <Animated.View style={[{
                            width: 120, height: 120, borderRadius: T.borderRadius['2xl'],
                            ...T.glass.accent,
                            marginBottom: 28, justifyContent: 'center', alignItems: 'center',
                            ...T.glow(T.color.signature.primary, 0.35),
                        }, logoStyle]}>
                            <Text style={{ fontSize: 56 }}>🏀</Text>
                        </Animated.View>

                        <Animated.View style={[{ alignItems: 'center', marginBottom: 40 }, fadeStyle]}>
                            <Text style={{
                                ...type.screenTitle,
                                color: T.color.text.primary,
                                fontSize: 36, letterSpacing: -0.8,
                            }}>
                                CourtVision AI
                            </Text>
                            <Text style={{
                                ...type.body,
                                color: T.color.text.secondary,
                                marginTop: 8, textAlign: 'center', lineHeight: 22,
                            }}>
                                Your AI basketball coach.{'\n'}Join thousands of players.
                            </Text>
                        </Animated.View>

                        <Animated.View style={[{ width: '100%' }, fadeStyle]}>
                            {/* Apple Sign In */}
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row', alignItems: 'center',
                                    backgroundColor: T.color.text.primary, padding: T.spacing[4] + 1,
                                    borderRadius: T.borderRadius.lg, marginBottom: 12,
                                    ...T.shadow('#000', 0.15, 8),
                                }}
                                onPress={() => handleOAuth('apple')}
                                disabled={isLoading}
                                activeOpacity={0.85}
                            >
                                {isLoading
                                    ? <ActivityIndicator size="small" color={T.color.background.primary} style={{ marginRight: 15 }} />
                                    : <AntDesign name="apple1" size={22} color={T.color.background.primary} style={{ marginRight: 15 }} />}
                                <Text style={{
                                    color: T.color.background.primary, fontSize: 16,
                                    fontFamily: T.fonts.body.bold, flex: 1, textAlign: 'center', marginRight: 37,
                                }}>
                                    Continue with Apple
                                </Text>
                            </TouchableOpacity>

                            {/* Google Sign In */}
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row', alignItems: 'center',
                                    ...T.glass.medium,
                                    padding: T.spacing[4] + 1, borderRadius: T.borderRadius.lg, marginBottom: 12,
                                }}
                                onPress={() => handleOAuth('google')}
                                disabled={isLoading}
                                activeOpacity={0.85}
                            >
                                {isLoading
                                    ? <ActivityIndicator size="small" color={T.color.text.primary} style={{ marginRight: 15 }} />
                                    : <AntDesign name="google" size={22} color={T.color.text.primary} style={{ marginRight: 15 }} />}
                                <Text style={{
                                    color: T.color.text.primary, fontSize: 16,
                                    fontFamily: T.fonts.body.bold, flex: 1, textAlign: 'center', marginRight: 37,
                                }}>
                                    Continue with Google
                                </Text>
                            </TouchableOpacity>

                            {/* Email */}
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row', alignItems: 'center',
                                    ...T.glass.light,
                                    padding: T.spacing[4] + 1, borderRadius: T.borderRadius.lg,
                                }}
                                onPress={() => setMode('email')}
                                activeOpacity={0.85}
                            >
                                <Feather name="mail" size={22} color={T.color.text.secondary} style={{ marginRight: 15 }} />
                                <Text style={{
                                    color: T.color.text.secondary, fontSize: 16,
                                    fontFamily: T.fonts.body.semibold, flex: 1, textAlign: 'center', marginRight: 37,
                                }}>
                                    Continue with Email
                                </Text>
                            </TouchableOpacity>

                            <Text style={{
                                ...type.caption,
                                color: T.color.text.tertiary, textAlign: 'center',
                                marginTop: 22, lineHeight: 18,
                            }}>
                                By continuing, you agree to our{' '}
                                <Text style={{ color: T.color.text.secondary, textDecorationLine: 'underline' }}>Terms</Text>
                                {' '}and{' '}
                                <Text style={{ color: T.color.text.secondary, textDecorationLine: 'underline' }}>Privacy Policy</Text>.
                            </Text>
                        </Animated.View>
                    </View>
                ) : (
                    /*  Email Form  */
                    <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 30 }}>
                        <Text style={{
                            ...type.sectionTitle,
                            color: T.color.text.primary,
                            fontSize: 24, marginBottom: 6, letterSpacing: -0.3,
                        }}>
                            {isLogin ? 'Welcome back' : 'Create account'}
                        </Text>
                        <Text style={{
                            ...type.body,
                            color: T.color.text.secondary,
                            marginBottom: T.spacing[6], lineHeight: 20,
                        }}>
                            {isLogin
                                ? 'Good to see you again! Enter your credentials.'
                                : 'Join thousands of players improving every day.'}
                        </Text>

                        {/* Username (sign up only) */}
                        {!isLogin && (
                            <>
                                <Text style={{
                                    ...type.overline,
                                    color: T.color.text.secondary,
                                    marginBottom: 6,
                                }}>USERNAME</Text>
                                <TextInput
                                    value={username}
                                    onChangeText={setUsername}
                                    style={{
                                        ...T.glass.light,
                                        color: T.color.text.primary, borderRadius: T.borderRadius.md,
                                        paddingHorizontal: 18, paddingVertical: 14,
                                        fontSize: 15, fontFamily: T.fonts.body.regular, marginBottom: 14,
                                    }}
                                    placeholder="your_username"
                                    placeholderTextColor={T.color.text.tertiary}
                                    autoCapitalize="none"
                                    autoComplete="username"
                                />
                            </>
                        )}

                        <Text style={{
                            ...type.overline,
                            color: T.color.text.secondary,
                            marginBottom: 6,
                        }}>EMAIL</Text>
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            style={{
                                ...T.glass.light,
                                color: T.color.text.primary, borderRadius: T.borderRadius.md,
                                paddingHorizontal: 18, paddingVertical: 14,
                                fontSize: 15, fontFamily: T.fonts.body.regular, marginBottom: 14,
                            }}
                            placeholder="you@email.com"
                            placeholderTextColor={T.color.text.tertiary}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                        />

                        <Text style={{
                            ...type.overline,
                            color: T.color.text.secondary,
                            marginBottom: 6,
                        }}>PASSWORD</Text>
                        <View style={{ position: 'relative', marginBottom: 24 }}>
                            <TextInput
                                value={password}
                                onChangeText={setPassword}
                                style={{
                                    ...T.glass.light,
                                    color: T.color.text.primary, borderRadius: T.borderRadius.md,
                                    paddingHorizontal: 18, paddingVertical: 14,
                                    fontSize: 15, fontFamily: T.fonts.body.regular, paddingRight: 50,
                                }}
                                placeholder="••••••••"
                                placeholderTextColor={T.color.text.tertiary}
                                secureTextEntry={!showPass}
                                autoComplete={isLogin ? 'password' : 'new-password'}
                            />
                            <TouchableOpacity
                                style={{ position: 'absolute', right: 16, top: 14 }}
                                onPress={() => setShowPass(p => !p)}
                            >
                                <Feather
                                    name={showPass ? 'eye-off' : 'eye'}
                                    size={22}
                                    color={T.color.text.secondary}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Submit */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: T.color.signature.primary, borderRadius: T.borderRadius.full,
                                paddingVertical: 18, alignItems: 'center',
                                opacity: isLoading ? 0.7 : 1,
                                ...T.glow(T.color.signature.primary, 0.3),
                            }}
                            onPress={handleEmailAuth}
                            disabled={isLoading}
                            activeOpacity={0.85}
                        >
                            {isLoading
                                ? <ActivityIndicator color={T.color.background.primary} />
                                : <Text style={{ color: T.color.background.primary, fontFamily: T.fonts.display.black, fontSize: 17 }}>
                                    {isLogin ? '🔑 Sign In' : '🚀 Create Account'}
                                </Text>
                            }
                        </TouchableOpacity>

                        {/* Toggle login / sign up */}
                        <TouchableOpacity
                            onPress={() => setIsLogin(p => !p)}
                            style={{ marginTop: 20, alignItems: 'center' }}
                        >
                            <Text style={{ ...type.body, color: T.color.text.secondary }}>
                                {isLogin ? "Don't have an account? " : 'Already registered? '}
                                <Text style={{ color: T.color.signature.primary, fontFamily: T.fonts.body.bold }}>
                                    {isLogin ? 'Sign Up' : 'Sign In'}
                                </Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}
