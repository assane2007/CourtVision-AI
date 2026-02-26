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
import { T } from '../lib/theme'

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
        <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.bg }}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                {/* Header */}
                <View style={{ paddingHorizontal: T.space.xl, paddingTop: 10 }}>
                    <TouchableOpacity onPress={() => mode === 'email' ? setMode('choice') : router.back()}>
                        <View style={{
                            width: 40, height: 40, borderRadius: T.radius.md,
                            ...T.glass.light,
                            justifyContent: 'center', alignItems: 'center',
                        }}>
                            <Feather name="arrow-left" size={20} color={T.colors.textSecondary} />
                        </View>
                    </TouchableOpacity>

                    {/* Progress  all steps filled */}
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: T.space.md, marginBottom: 4 }}>
                        {[0, 1, 2, 3].map(i => (
                            <View key={i} style={{
                                flex: 1, height: 3, borderRadius: 2,
                                backgroundColor: T.colors.accent,
                                ...T.glow(T.colors.accent, 0.15),
                            }} />
                        ))}
                    </View>
                </View>

                {mode === 'choice' ? (
                    /*  Provider Choice  */
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 }}>
                        {/* Logo */}
                        <Animated.View style={[{
                            width: 120, height: 120, borderRadius: T.radius.xxl,
                            ...T.glass.accent,
                            marginBottom: 28, justifyContent: 'center', alignItems: 'center',
                            ...T.glow(T.colors.accent, 0.35),
                        }, logoStyle]}>
                            <Text style={{ fontSize: 56 }}></Text>
                        </Animated.View>

                        <Animated.View style={[{ alignItems: 'center', marginBottom: 40 }, fadeStyle]}>
                            <Text style={{
                                color: T.colors.white, fontSize: T.font.xxxl + 4,
                                fontWeight: '900', letterSpacing: -0.8,
                            }}>
                                CourtVision AI
                            </Text>
                            <Text style={{
                                color: T.colors.textSecondary, fontSize: T.font.base,
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
                                    backgroundColor: T.colors.white, padding: T.space.lg + 1,
                                    borderRadius: T.radius.lg, marginBottom: 12,
                                    ...T.shadow('#000', 0.15, 8),
                                }}
                                onPress={() => handleOAuth('apple')}
                                disabled={isLoading}
                                activeOpacity={0.85}
                            >
                                {isLoading
                                    ? <ActivityIndicator size="small" color={T.colors.bg} style={{ marginRight: 15 }} />
                                    : <AntDesign name="apple1" size={22} color={T.colors.bg} style={{ marginRight: 15 }} />}
                                <Text style={{
                                    color: T.colors.bg, fontSize: T.font.lg - 1,
                                    fontWeight: '700', flex: 1, textAlign: 'center', marginRight: 37,
                                }}>
                                    Continue with Apple
                                </Text>
                            </TouchableOpacity>

                            {/* Google Sign In */}
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row', alignItems: 'center',
                                    ...T.glass.medium,
                                    padding: T.space.lg + 1, borderRadius: T.radius.lg, marginBottom: 12,
                                }}
                                onPress={() => handleOAuth('google')}
                                disabled={isLoading}
                                activeOpacity={0.85}
                            >
                                {isLoading
                                    ? <ActivityIndicator size="small" color={T.colors.white} style={{ marginRight: 15 }} />
                                    : <AntDesign name="google" size={22} color={T.colors.white} style={{ marginRight: 15 }} />}
                                <Text style={{
                                    color: T.colors.white, fontSize: T.font.lg - 1,
                                    fontWeight: '700', flex: 1, textAlign: 'center', marginRight: 37,
                                }}>
                                    Continue with Google
                                </Text>
                            </TouchableOpacity>

                            {/* Email */}
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row', alignItems: 'center',
                                    ...T.glass.light,
                                    padding: T.space.lg + 1, borderRadius: T.radius.lg,
                                }}
                                onPress={() => setMode('email')}
                                activeOpacity={0.85}
                            >
                                <Feather name="mail" size={22} color={T.colors.muted} style={{ marginRight: 15 }} />
                                <Text style={{
                                    color: T.colors.muted, fontSize: T.font.lg - 1,
                                    fontWeight: '600', flex: 1, textAlign: 'center', marginRight: 37,
                                }}>
                                    Continue with Email
                                </Text>
                            </TouchableOpacity>

                            <Text style={{
                                color: T.colors.dim, textAlign: 'center',
                                marginTop: 22, fontSize: T.font.sm + 1, lineHeight: 18,
                            }}>
                                By continuing, you agree to our{' '}
                                <Text style={{ color: T.colors.muted, textDecorationLine: 'underline' }}>Terms</Text>
                                {' '}and{' '}
                                <Text style={{ color: T.colors.muted, textDecorationLine: 'underline' }}>Privacy Policy</Text>.
                            </Text>
                        </Animated.View>
                    </View>
                ) : (
                    /*  Email Form  */
                    <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 30 }}>
                        <Text style={{
                            color: T.colors.white, fontSize: T.font.xxl,
                            fontWeight: '900', marginBottom: 6, letterSpacing: -0.3,
                        }}>
                            {isLogin ? 'Welcome back' : 'Create account'}
                        </Text>
                        <Text style={{
                            color: T.colors.textSecondary, fontSize: T.font.md + 1,
                            marginBottom: T.space.xxl, lineHeight: 20,
                        }}>
                            {isLogin
                                ? 'Good to see you again! Enter your credentials.'
                                : 'Join thousands of players improving every day.'}
                        </Text>

                        {/* Username (sign up only) */}
                        {!isLogin && (
                            <>
                                <Text style={{
                                    color: T.colors.muted, fontSize: T.font.sm,
                                    marginBottom: 6, fontWeight: '600', letterSpacing: 1,
                                }}>USERNAME</Text>
                                <TextInput
                                    value={username}
                                    onChangeText={setUsername}
                                    style={{
                                        ...T.glass.light,
                                        color: T.colors.white, borderRadius: T.radius.md,
                                        paddingHorizontal: 18, paddingVertical: 14,
                                        fontSize: T.font.base, marginBottom: 14,
                                    }}
                                    placeholder="your_username"
                                    placeholderTextColor={T.colors.dim}
                                    autoCapitalize="none"
                                    autoComplete="username"
                                />
                            </>
                        )}

                        <Text style={{
                            color: T.colors.muted, fontSize: T.font.sm,
                            marginBottom: 6, fontWeight: '600', letterSpacing: 1,
                        }}>EMAIL</Text>
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            style={{
                                ...T.glass.light,
                                color: T.colors.white, borderRadius: T.radius.md,
                                paddingHorizontal: 18, paddingVertical: 14,
                                fontSize: T.font.base, marginBottom: 14,
                            }}
                            placeholder="you@email.com"
                            placeholderTextColor={T.colors.dim}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                        />

                        <Text style={{
                            color: T.colors.muted, fontSize: T.font.sm,
                            marginBottom: 6, fontWeight: '600', letterSpacing: 1,
                        }}>PASSWORD</Text>
                        <View style={{ position: 'relative', marginBottom: 24 }}>
                            <TextInput
                                value={password}
                                onChangeText={setPassword}
                                style={{
                                    ...T.glass.light,
                                    color: T.colors.white, borderRadius: T.radius.md,
                                    paddingHorizontal: 18, paddingVertical: 14,
                                    fontSize: T.font.base, paddingRight: 50,
                                }}
                                placeholder=""
                                placeholderTextColor={T.colors.dim}
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
                                    color={T.colors.muted}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Submit */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: T.colors.accent, borderRadius: T.radius.pill,
                                paddingVertical: 18, alignItems: 'center',
                                opacity: isLoading ? 0.7 : 1,
                                ...T.glow(T.colors.accent, 0.3),
                            }}
                            onPress={handleEmailAuth}
                            disabled={isLoading}
                            activeOpacity={0.85}
                        >
                            {isLoading
                                ? <ActivityIndicator color={T.colors.bg} />
                                : <Text style={{ color: T.colors.bg, fontWeight: '800', fontSize: T.font.lg }}>
                                    {isLogin ? ' Sign In' : ' Create Account'}
                                </Text>
                            }
                        </TouchableOpacity>

                        {/* Toggle login / sign up */}
                        <TouchableOpacity
                            onPress={() => setIsLogin(p => !p)}
                            style={{ marginTop: 20, alignItems: 'center' }}
                        >
                            <Text style={{ color: T.colors.muted, fontSize: T.font.md + 1 }}>
                                {isLogin ? "Don't have an account? " : 'Already registered? '}
                                <Text style={{ color: T.colors.accent, fontWeight: '700' }}>
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
