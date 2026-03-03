import {
    View, Text, TouchableOpacity, TextInput,
    KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEffect, useState } from 'react'
import Animated, {
    useSharedValue, useAnimatedStyle, withTiming, withSequence, withRepeat,
} from 'react-native-reanimated'
import { AntDesign, Feather } from '@expo/vector-icons'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'
import { T } from '../lib/theme'

export default function Onboarding3() {
    const router = useRouter()
    const loginWithEmail = useStore(s => s.loginWithEmail)
    const signUpWithEmail = useStore(s => s.signUpWithEmail)
    const loginWithOAuth = useStore(s => s.loginWithOAuth)
    const authLoading = useStore(s => s.authLoading)

    const [mode, setMode] = useState<'choice' | 'email'>('choice')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [username, setUsername] = useState('')
    const [isLogin, setIsLogin] = useState(true)
    const [loading, setLoading] = useState(false)

    // Cursor animation
    const cursorOpacity = useSharedValue(1)

    useEffect(() => {
        cursorOpacity.value = withRepeat(
            withSequence(
                withTiming(0, { duration: 400 }),
                withTiming(1, { duration: 400 })
            ),
            -1, true
        )
    }, [])

    const handleOAuth = async (provider: 'apple' | 'google') => {
        setLoading(true)
        try {
            await loginWithOAuth(provider)
            router.replace('/(dashboard)')
        } catch (err: unknown) {
            toast.error('Auth Error', err instanceof Error ? err.message : 'Error')
        } finally {
            setLoading(false)
        }
    }

    const handleEmailAuth = async () => {
        setLoading(true)
        try {
            if (isLogin) {
                await loginWithEmail(email, password)
            } else {
                await signUpWithEmail(email, password, username)
            }
            router.replace('/(dashboard)')
        } catch (err: unknown) {
            toast.error('Auth Error', err instanceof Error ? err.message : 'Error')
        } finally {
            setLoading(false)
        }
    }

    const isLoading = loading || authLoading

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={{ padding: T.spacing[5], flex: 1 }}>

                    {/* Header terminal style */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40, borderBottomWidth: 1, borderColor: '#333', paddingBottom: 10 }}>
                        <TouchableOpacity onPress={() => mode === 'email' ? setMode('choice') : router.back()}>
                            <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: T.color.brand.primary, fontSize: 12 }}>{'< BACK'}</Text>
                        </TouchableOpacity>
                        <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#555', fontSize: 12 }}>AUTH_SYS_v1.0</Text>
                    </View>

                    {mode === 'choice' ? (
                        <View style={{ flex: 1, justifyContent: 'center' }}>
                            <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#fff', fontSize: 24, marginBottom: 8 }}>
                                ROOT_ACCESS_REQ
                            </Text>
                            <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#888', fontSize: 12, marginBottom: 40 }}>
                                {'>'} SELECT AUTHENTICATION METHOD
                                <Animated.View style={[{ width: 8, height: 14, backgroundColor: T.color.brand.primary, transform: [{ translateY: 2 }] }, useAnimatedStyle(() => ({ opacity: cursorOpacity.value }))]} />
                            </Text>

                            {/* Providers */}
                            <TouchableOpacity
                                style={{
                                    borderWidth: 1, borderColor: '#fff', padding: 18, marginBottom: 16,
                                    flexDirection: 'row', alignItems: 'center'
                                }}
                                onPress={() => handleOAuth('apple')}
                            >
                                <AntDesign name="apple1" size={20} color="#fff" />
                                <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#fff', fontSize: 16, marginLeft: 16 }}>AUTH_VIA_APPLE</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    borderWidth: 1, borderColor: T.color.brand.primary, backgroundColor: `${T.color.brand.primary}10`, padding: 18, marginBottom: 16,
                                    flexDirection: 'row', alignItems: 'center'
                                }}
                                onPress={() => handleOAuth('google')}
                            >
                                <AntDesign name="google" size={20} color={T.color.brand.primary} />
                                <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: T.color.brand.primary, fontSize: 16, marginLeft: 16 }}>AUTH_VIA_GOOGLE</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    borderWidth: 1, borderColor: '#555', padding: 18,
                                    flexDirection: 'row', alignItems: 'center'
                                }}
                                onPress={() => setMode('email')}
                            >
                                <Feather name="mail" size={20} color="#888" />
                                <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#888', fontSize: 16, marginLeft: 16 }}>MANUAL_CREDENTIALS</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#fff', fontSize: 20, marginBottom: 30 }}>
                                {'>'} {isLogin ? 'INIT_SESSION' : 'CREATE_ENTITY'}
                            </Text>

                            {!isLogin && (
                                <View style={{ marginBottom: 20 }}>
                                    <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#888', fontSize: 10, marginBottom: 8 }}>SET_USERNAME</Text>
                                    <TextInput
                                        value={username}
                                        onChangeText={setUsername}
                                        style={{ backgroundColor: '#111', borderWidth: 1, borderColor: '#333', color: '#fff', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', padding: 16 }}
                                        placeholder="username"
                                        placeholderTextColor="#444"
                                        autoCapitalize="none"
                                    />
                                </View>
                            )}

                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#888', fontSize: 10, marginBottom: 8 }}>SET_EMAIL</Text>
                                <TextInput
                                    value={email}
                                    onChangeText={setEmail}
                                    style={{ backgroundColor: '#111', borderWidth: 1, borderColor: '#333', color: '#fff', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', padding: 16 }}
                                    placeholder="user@host.com"
                                    placeholderTextColor="#444"
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>

                            <View style={{ marginBottom: 40 }}>
                                <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#888', fontSize: 10, marginBottom: 8 }}>SET_PASSPHRASE</Text>
                                <TextInput
                                    value={password}
                                    onChangeText={setPassword}
                                    style={{ backgroundColor: '#111', borderWidth: 1, borderColor: '#333', color: '#fff', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', padding: 16 }}
                                    placeholder="••••••••"
                                    placeholderTextColor="#444"
                                    secureTextEntry
                                />
                            </View>

                            <TouchableOpacity
                                style={{
                                    backgroundColor: T.color.brand.primary, padding: 18, alignItems: 'center', opacity: isLoading ? 0.5 : 1
                                }}
                                onPress={handleEmailAuth}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#000" />
                                ) : (
                                    <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#000', fontSize: 16, fontWeight: 'bold' }}>
                                        EXECUTE
                                    </Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity style={{ marginTop: 24, alignItems: 'center' }} onPress={() => setIsLogin(!isLogin)}>
                                <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#888', borderBottomWidth: 1, borderBottomColor: '#888' }}>
                                    {isLogin ? 'SWITCH_TO_REGISTER' : 'SWITCH_TO_LOGIN'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}
