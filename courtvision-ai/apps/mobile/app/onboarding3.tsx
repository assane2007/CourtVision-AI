import { View, Text, TouchableOpacity, Animated, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AntDesign, Ionicons } from '@expo/vector-icons'
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { apiFetch } from '../lib/api'
import { toast } from '../lib/toast'

const C = {
    bg: '#0D1117', card: '#161B22', border: '#21262D',
    blue: '#1A73E8', accent: '#00D4FF',
    white: '#E6EDF3', muted: '#8B949E', dim: '#484F58',
    red: '#FF3D57', green: '#00C853',
}

export default function Onboarding3() {
    const router     = useRouter()
    const login      = useStore(s => s.login)
    const fadeAnim   = useRef(new Animated.Value(0)).current
    const slideAnim  = useRef(new Animated.Value(30)).current
    const logoScale  = useRef(new Animated.Value(0.8)).current
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
    }, [])

    // Mock login pour le dev — remplace par OAuth réel en prod
    const handleMockLogin = async (provider: 'apple' | 'google') => {
        setLoading(true)
        try {
            // En production : appel OAuth Apple/Google
            // Pour le dev : on simule directement
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
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Header retour */}
                <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
                    <TouchableOpacity onPress={() => mode === 'email' ? setMode('choice') : router.back()}>
                        <Ionicons name="arrow-back" size={24} color={C.muted} />
                    </TouchableOpacity>

                    {/* Progress */}
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 12, marginBottom: 4 }}>
                        {[0, 1, 2, 3].map(i => (
                            <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: C.blue }} />
                        ))}
                    </View>
                </View>

                {mode === 'choice' ? (
                    /* ── Choix du provider ── */
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 }}>
                        {/* Logo */}
                        <Animated.View style={{
                            width: 110, height: 110, backgroundColor: C.card, borderRadius: 28,
                            marginBottom: 24, justifyContent: 'center', alignItems: 'center',
                            borderWidth: 1.5, borderColor: `${C.blue}40`,
                            transform: [{ scale: logoScale }], opacity: fadeAnim,
                            shadowColor: C.blue, shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.3, shadowRadius: 20,
                        }}>
                            <Text style={{ fontSize: 50 }}>🏀</Text>
                        </Animated.View>

                        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center', marginBottom: 40 }}>
                            <Text style={{ color: C.white, fontSize: 30, fontWeight: '900', letterSpacing: -0.5 }}>
                                CourtVision AI
                            </Text>
                            <Text style={{ color: C.muted, fontSize: 15, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
                                Ton coach IA basketball.{'\n'}Rejoins des milliers de joueurs.
                            </Text>
                        </Animated.View>

                        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], width: '100%' }}>
                            {/* Apple */}
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row', alignItems: 'center',
                                    backgroundColor: C.white, padding: 17, borderRadius: 16, marginBottom: 12,
                                    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
                                    shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
                                }}
                                onPress={() => handleMockLogin('apple')}
                                disabled={loading}
                                activeOpacity={0.85}
                            >
                                {loading ? <ActivityIndicator size="small" color={C.bg} style={{ marginRight: 15 }} />
                                    : <AntDesign name="apple1" size={22} color={C.bg} style={{ marginRight: 15 }} />}
                                <Text style={{ color: C.bg, fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center', marginRight: 37 }}>
                                    Continuer avec Apple
                                </Text>
                            </TouchableOpacity>

                            {/* Google */}
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row', alignItems: 'center',
                                    backgroundColor: C.card, padding: 17, borderRadius: 16,
                                    borderWidth: 1, borderColor: C.border, marginBottom: 12,
                                }}
                                onPress={() => handleMockLogin('google')}
                                disabled={loading}
                                activeOpacity={0.85}
                            >
                                {loading ? <ActivityIndicator size="small" color={C.white} style={{ marginRight: 15 }} />
                                    : <AntDesign name="google" size={22} color={C.white} style={{ marginRight: 15 }} />}
                                <Text style={{ color: C.white, fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center', marginRight: 37 }}>
                                    Continuer avec Google
                                </Text>
                            </TouchableOpacity>

                            {/* Email */}
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row', alignItems: 'center',
                                    backgroundColor: C.card, padding: 17, borderRadius: 16,
                                    borderWidth: 1, borderColor: C.border,
                                }}
                                onPress={() => setMode('email')}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="mail-outline" size={22} color={C.muted} style={{ marginRight: 15 }} />
                                <Text style={{ color: C.muted, fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center', marginRight: 37 }}>
                                    Continuer avec l'email
                                </Text>
                            </TouchableOpacity>

                            <Text style={{ color: C.dim, textAlign: 'center', marginTop: 22, fontSize: 12, lineHeight: 18 }}>
                                En continuant, tu acceptes nos{' '}
                                <Text style={{ color: C.muted, textDecorationLine: 'underline' }}>CGV</Text>
                                {' '}et notre{' '}
                                <Text style={{ color: C.muted, textDecorationLine: 'underline' }}>Politique de confidentialité</Text>.
                            </Text>
                        </Animated.View>
                    </View>
                ) : (
                    /* ── Formulaire email ── */
                    <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 30 }}>
                        <Text style={{ color: C.white, fontSize: 26, fontWeight: '900', marginBottom: 6 }}>
                            {isLogin ? 'Connexion' : 'Créer un compte'}
                        </Text>
                        <Text style={{ color: C.muted, fontSize: 14, marginBottom: 28, lineHeight: 20 }}>
                            {isLogin
                                ? 'Ravi de te revoir ! Entre tes identifiants.'
                                : 'Rejoins des milliers de joueurs qui s\'améliorent chaque jour.'}
                        </Text>

                        <Text style={{ color: C.muted, fontSize: 12, marginBottom: 6, fontWeight: '600' }}>EMAIL</Text>
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            style={{
                                backgroundColor: C.card, color: C.white, borderRadius: 14,
                                paddingHorizontal: 18, paddingVertical: 14, fontSize: 15,
                                borderWidth: 1, borderColor: C.border, marginBottom: 14,
                            }}
                            placeholder="ton@email.com"
                            placeholderTextColor={C.dim}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                        />

                        <Text style={{ color: C.muted, fontSize: 12, marginBottom: 6, fontWeight: '600' }}>MOT DE PASSE</Text>
                        <View style={{ position: 'relative', marginBottom: 24 }}>
                            <TextInput
                                value={password}
                                onChangeText={setPassword}
                                style={{
                                    backgroundColor: C.card, color: C.white, borderRadius: 14,
                                    paddingHorizontal: 18, paddingVertical: 14, fontSize: 15,
                                    borderWidth: 1, borderColor: C.border, paddingRight: 50,
                                }}
                                placeholder="••••••••"
                                placeholderTextColor={C.dim}
                                secureTextEntry={!showPass}
                                autoComplete={isLogin ? 'password' : 'new-password'}
                            />
                            <TouchableOpacity
                                style={{ position: 'absolute', right: 16, top: 14 }}
                                onPress={() => setShowPass(p => !p)}
                            >
                                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={22} color={C.muted} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={{
                                backgroundColor: C.blue, borderRadius: 30, paddingVertical: 18,
                                alignItems: 'center', opacity: loading ? 0.7 : 1,
                                shadowColor: C.blue, shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.35, shadowRadius: 12,
                            }}
                            onPress={handleEmailAuth}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading
                                ? <ActivityIndicator color={C.white} />
                                : <Text style={{ color: C.white, fontWeight: '800', fontSize: 17 }}>
                                    {isLogin ? '🔑 Se connecter' : '🚀 Créer mon compte'}
                                </Text>
                            }
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setIsLogin(p => !p)} style={{ marginTop: 20, alignItems: 'center' }}>
                            <Text style={{ color: C.muted, fontSize: 14 }}>
                                {isLogin ? "Pas encore de compte ? " : "Déjà inscrit ? "}
                                <Text style={{ color: C.blue, fontWeight: '700' }}>
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
