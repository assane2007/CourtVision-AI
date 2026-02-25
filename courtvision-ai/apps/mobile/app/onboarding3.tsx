import { View, Text, TouchableOpacity, Animated, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AntDesign, Ionicons } from '@expo/vector-icons'
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { apiFetch } from '../lib/api'
import { toast } from '../lib/toast'
import { T } from '../lib/theme'

export default function Onboarding3() {
    const router     = useRouter()
    const login      = useStore(s => s.login)
    const fadeAnim   = useRef(new Animated.Value(0)).current
    const slideAnim  = useRef(new Animated.Value(30)).current
    const logoScale  = useRef(new Animated.Value(0.8)).current
    const glowAnim   = useRef(new Animated.Value(0)).current
    const [mode, setMode]       = useState<'choice' | 'email'>('choice')
    const [email, setEmail]     = useState('')
    const [password, setPassword] = useState('')
    const [isLogin, setIsLogin]  = useState(true)
    const [loading, setLoading]  = useState(false)
    const [showPass, setShowPass] = useState(false)

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
            Animated.spring(logoScale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
        ]).start()
        // Logo glow pulse
        Animated.loop(Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])).start()
    }, [])

    const handleMockLogin = async (provider: 'apple' | 'google') => {
        setLoading(true)
        try {
            await new Promise(r => setTimeout(r, 800))
            await login('mock-token-' + provider, 'mock-refresh-' + provider)
            router.replace('/(dashboard)')
        } catch {
            toast.error('Connexion échouée', 'Réessaie dans un instant')
        } finally {
            setLoading(false)
        }
    }

    const handleEmailAuth = async () => {
        if (!email.includes('@')) { toast.error('Email invalide', 'Vérifie ton adresse'); return }
        if (password.length < 6)  { toast.error('Mot de passe trop court', 'Min. 6 caractères'); return }
        setLoading(true)
        try {
            const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
            const res = await apiFetch<{ token: string; refreshToken?: string }>(endpoint, {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            })
            await login(res.token, res.refreshToken)
            router.replace('/(dashboard)')
        } catch (err: any) {
            toast.error(isLogin ? 'Connexion échouée' : 'Inscription échouée', err?.message ?? 'Vérifie tes identifiants')
        } finally {
            setLoading(false)
        }
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.bg }}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                {/* Header */}
                <View style={{ paddingHorizontal: T.space.xl, paddingTop: 10 }}>
                    <TouchableOpacity onPress={() => mode === 'email' ? setMode('choice') : router.back()}>
                        <View style={{
                            width: 40, height: 40, borderRadius: T.radius.md,
                            ...T.glass.light, justifyContent: 'center', alignItems: 'center',
                        }}>
                            <Ionicons name="arrow-back" size={20} color={T.colors.textSecondary} />
                        </View>
                    </TouchableOpacity>

                    {/* Progress — all steps done */}
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
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 }}>
                        {/* Logo */}
                        <Animated.View style={{
                            width: 120, height: 120, borderRadius: T.radius.xxl,
                            ...T.glass.accent,
                            marginBottom: 28, justifyContent: 'center', alignItems: 'center',
                            transform: [{ scale: logoScale }], opacity: fadeAnim,
                            ...T.glow(T.colors.accent, 0.35),
                        }}>
                            <Text style={{ fontSize: 56 }}>🏀</Text>
                        </Animated.View>

                        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center', marginBottom: 40 }}>
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
                                Ton coach IA basketball.{'\n'}Rejoins des milliers de joueurs.
                            </Text>
                        </Animated.View>

                        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], width: '100%' }}>
                            {/* Apple */}
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row', alignItems: 'center',
                                    backgroundColor: T.colors.white, padding: T.space.lg + 1,
                                    borderRadius: T.radius.lg, marginBottom: 12,
                                    ...T.shadow('#000', 0.15, 8),
                                }}
                                onPress={() => handleMockLogin('apple')}
                                disabled={loading}
                                activeOpacity={0.85}
                            >
                                {loading ? <ActivityIndicator size="small" color={T.colors.bg} style={{ marginRight: 15 }} />
                                    : <AntDesign name="apple1" size={22} color={T.colors.bg} style={{ marginRight: 15 }} />}
                                <Text style={{
                                    color: T.colors.bg, fontSize: T.font.lg - 1,
                                    fontWeight: '700', flex: 1, textAlign: 'center', marginRight: 37,
                                }}>
                                    Continuer avec Apple
                                </Text>
                            </TouchableOpacity>

                            {/* Google */}
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row', alignItems: 'center',
                                    ...T.glass.medium,
                                    padding: T.space.lg + 1, borderRadius: T.radius.lg, marginBottom: 12,
                                }}
                                onPress={() => handleMockLogin('google')}
                                disabled={loading}
                                activeOpacity={0.85}
                            >
                                {loading ? <ActivityIndicator size="small" color={T.colors.white} style={{ marginRight: 15 }} />
                                    : <AntDesign name="google" size={22} color={T.colors.white} style={{ marginRight: 15 }} />}
                                <Text style={{
                                    color: T.colors.white, fontSize: T.font.lg - 1,
                                    fontWeight: '700', flex: 1, textAlign: 'center', marginRight: 37,
                                }}>
                                    Continuer avec Google
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
                                <Ionicons name="mail-outline" size={22} color={T.colors.muted} style={{ marginRight: 15 }} />
                                <Text style={{
                                    color: T.colors.muted, fontSize: T.font.lg - 1,
                                    fontWeight: '600', flex: 1, textAlign: 'center', marginRight: 37,
                                }}>
                                    Continuer avec l'email
                                </Text>
                            </TouchableOpacity>

                            <Text style={{
                                color: T.colors.dim, textAlign: 'center',
                                marginTop: 22, fontSize: T.font.sm + 1, lineHeight: 18,
                            }}>
                                En continuant, tu acceptes nos{' '}
                                <Text style={{ color: T.colors.muted, textDecorationLine: 'underline' }}>CGV</Text>
                                {' '}et notre{' '}
                                <Text style={{ color: T.colors.muted, textDecorationLine: 'underline' }}>Politique de confidentialité</Text>.
                            </Text>
                        </Animated.View>
                    </View>
                ) : (
                    /* ── Formulaire email ── */
                    <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 30 }}>
                        <Text style={{
                            color: T.colors.white, fontSize: T.font.xxl,
                            fontWeight: '900', marginBottom: 6, letterSpacing: -0.3,
                        }}>
                            {isLogin ? 'Connexion' : 'Créer un compte'}
                        </Text>
                        <Text style={{
                            color: T.colors.textSecondary, fontSize: T.font.md + 1,
                            marginBottom: T.space.xxl, lineHeight: 20,
                        }}>
                            {isLogin
                                ? 'Ravi de te revoir ! Entre tes identifiants.'
                                : 'Rejoins des milliers de joueurs qui s\'améliorent chaque jour.'}
                        </Text>

                        <Text style={{ color: T.colors.muted, fontSize: T.font.sm, marginBottom: 6, fontWeight: '600', letterSpacing: 1 }}>EMAIL</Text>
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            style={{
                                ...T.glass.light,
                                color: T.colors.white, borderRadius: T.radius.md,
                                paddingHorizontal: 18, paddingVertical: 14, fontSize: T.font.base,
                                marginBottom: 14,
                            }}
                            placeholder="ton@email.com"
                            placeholderTextColor={T.colors.dim}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                        />

                        <Text style={{ color: T.colors.muted, fontSize: T.font.sm, marginBottom: 6, fontWeight: '600', letterSpacing: 1 }}>MOT DE PASSE</Text>
                        <View style={{ position: 'relative', marginBottom: 24 }}>
                            <TextInput
                                value={password}
                                onChangeText={setPassword}
                                style={{
                                    ...T.glass.light,
                                    color: T.colors.white, borderRadius: T.radius.md,
                                    paddingHorizontal: 18, paddingVertical: 14, fontSize: T.font.base,
                                    paddingRight: 50,
                                }}
                                placeholder="••••••••"
                                placeholderTextColor={T.colors.dim}
                                secureTextEntry={!showPass}
                                autoComplete={isLogin ? 'password' : 'new-password'}
                            />
                            <TouchableOpacity
                                style={{ position: 'absolute', right: 16, top: 14 }}
                                onPress={() => setShowPass(p => !p)}
                            >
                                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={22} color={T.colors.muted} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={{
                                backgroundColor: T.colors.accent, borderRadius: T.radius.pill,
                                paddingVertical: 18, alignItems: 'center',
                                opacity: loading ? 0.7 : 1,
                                ...T.glow(T.colors.accent, 0.3),
                            }}
                            onPress={handleEmailAuth}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading
                                ? <ActivityIndicator color={T.colors.bg} />
                                : <Text style={{ color: T.colors.bg, fontWeight: '800', fontSize: T.font.lg }}>
                                    {isLogin ? '🔑 Se connecter' : '🚀 Créer mon compte'}
                                </Text>
                            }
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setIsLogin(p => !p)} style={{ marginTop: 20, alignItems: 'center' }}>
                            <Text style={{ color: T.colors.muted, fontSize: T.font.md + 1 }}>
                                {isLogin ? "Pas encore de compte ? " : "Déjà inscrit ? "}
                                <Text style={{ color: T.colors.accent, fontWeight: '700' }}>
                                    {isLogin ? 'S\'inscrire' : 'Se connecter'}
                                </Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}
