import { View, Text, TouchableOpacity, Dimensions, ScrollView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEffect } from 'react'
import Animated, {
    useSharedValue, useAnimatedStyle, withTiming, withRepeat,
    Easing, FadeIn,
} from 'react-native-reanimated'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { T } from '../lib/theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const HUD_MODULES = [
    {
        id: 'placement',
        title: 'SPATIAL PLACEMENT',
        desc: 'Distance: 3–5 meters. Landscape orientation required for full court mapping.',
        icon: 'maximize-2' as const,
        status: 'CRITICAL',
    },
    {
        id: 'stability',
        title: 'STABILIZATION',
        desc: 'Tripod mounting optimal. Handheld filming reduces tracking precision.',
        icon: 'aperture' as const,
        status: 'REQUIRED',
    },
    {
        id: 'environment',
        title: 'ENVIRONMENTAL LIGHTING',
        desc: 'Avoid direct backlight. Maintain contrast between player and background.',
        icon: 'sun' as const,
        status: 'MONITORING',
    }
]

export default function OnboardingCamera() {
    const router = useRouter()

    // HUD Scan animation
    const scanLineY = useSharedValue(0)

    useEffect(() => {
        scanLineY.value = withRepeat(
            withTiming(SCREEN_WIDTH * 1.5, { duration: 3000, easing: Easing.linear }),
            -1, false
        )
    }, [])

    const scanStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: scanLineY.value }]
    }))

    const handleLaunch = () => {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        // Simulate a lock-on delay before navigating
        setTimeout(() => {
            router.push('/onboarding3')
        }, 600)
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
            {/* Background Scanner */}
            <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, opacity: 0.1 }}>
                {[...Array(20)].map((_, i) => (
                    <View key={`h-${i}`} style={{ position: 'absolute', top: i * 40, left: 0, right: 0, height: 1, backgroundColor: T.color.brand.primary }} />
                ))}
                {[...Array(10)].map((_, i) => (
                    <View key={`v-${i}`} style={{ position: 'absolute', left: i * 40, top: 0, bottom: 0, width: 1, backgroundColor: T.color.brand.primary }} />
                ))}
            </View>

            {/* HUD Scanning line */}
            <Animated.View style={[{
                position: 'absolute', top: -100, left: 0, right: 0, height: 100,
                backgroundColor: `${T.color.brand.primary}10`,
                borderBottomWidth: 2, borderBottomColor: T.color.brand.primary,
                zIndex: 0
            }, scanStyle]} />

            <ScrollView contentContainerStyle={{ padding: T.spacing[5], flexGrow: 1, zIndex: 10 }} showsVerticalScrollIndicator={false}>

                {/* Header HUD */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, borderBottomWidth: 1, borderColor: `${T.color.brand.primary}40`, paddingBottom: 16 }}>
                    <View>
                        <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: T.color.brand.primary, fontSize: 18, fontWeight: 'bold', letterSpacing: 2 }}>OPTICS_SYS_VER_2.0</Text>
                        <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#888', fontSize: 10, marginTop: 4 }}>CALIBRATION PROTOCOL INITIATED</Text>
                    </View>
                    <View style={{ width: 40, height: 40, borderWidth: 1, borderColor: T.color.brand.primary, justifyContent: 'center', alignItems: 'center' }}>
                        <View style={{ width: 8, height: 8, backgroundColor: T.color.brand.primary }} />
                    </View>
                </View>

                {/* Modules */}
                {HUD_MODULES.map((mod, i) => (
                    <Animated.View
                        key={mod.id}
                        entering={FadeIn.delay(i * 300).duration(500)}
                        style={{
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            borderWidth: 1, borderColor: '#333',
                            borderLeftWidth: 3, borderLeftColor: T.color.brand.primary,
                            padding: 20, marginBottom: 20,
                            flexDirection: 'row', alignItems: 'flex-start'
                        }}
                    >
                        <View style={{ width: 40, height: 40, backgroundColor: `${T.color.brand.primary}20`, justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                            <Feather name={mod.icon} size={20} color={T.color.brand.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#fff', fontSize: 14 }}>{mod.title}</Text>
                                <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: mod.status === 'CRITICAL' ? T.color.semantic.error : T.color.brand.primary, fontSize: 10 }}>[{mod.status}]</Text>
                            </View>
                            <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#888', fontSize: 12, lineHeight: 18 }}>
                                {mod.desc}
                            </Text>
                        </View>
                    </Animated.View>
                ))}

                {/* Target Demo Box */}
                <Animated.View entering={FadeIn.delay(900).duration(500)} style={{ marginTop: 20, alignItems: 'center' }}>
                    <View style={{ width: 280, height: 380, borderWidth: 1, borderColor: '#333', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                        {/* Biometric Corner markers */}
                        <View style={{ position: 'absolute', top: -2, left: -2, width: 20, height: 20, borderTopWidth: 3, borderLeftWidth: 3, borderColor: T.color.brand.primary }} />
                        <View style={{ position: 'absolute', top: -2, right: -2, width: 20, height: 20, borderTopWidth: 3, borderRightWidth: 3, borderColor: T.color.brand.primary }} />
                        <View style={{ position: 'absolute', bottom: -2, left: -2, width: 20, height: 20, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: T.color.brand.primary }} />
                        <View style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderBottomWidth: 3, borderRightWidth: 3, borderColor: T.color.brand.primary }} />

                        {/* Dynamic Grid Overlay */}
                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.2 }}>
                            {[...Array(8)].map((_, i) => (
                                <View key={`g-h-${i}`} style={{ width: '100%', height: 1, backgroundColor: T.color.brand.primary, marginTop: 45 }} />
                            ))}
                            <View style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, backgroundColor: T.color.brand.primary }} />
                        </View>

                        {/* Central Focus Ring */}
                        <View style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 1, borderColor: T.color.brand.primary, justifyContent: 'center', alignItems: 'center', opacity: 0.5 }}>
                            <View style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderColor: T.color.brand.primary, borderStyle: 'dashed' }} />
                        </View>

                        <Feather name="target" size={48} color={T.color.brand.primary} style={{ position: 'absolute', opacity: 0.8 }} />

                        <View style={{ position: 'absolute', bottom: 16, backgroundColor: 'rgba(255, 77, 0, 0.1)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: T.color.brand.primary }}>
                            <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: T.color.brand.primary, fontSize: 12, fontWeight: 'bold' }}>BIOMETRIC_LOCK_READY</Text>
                        </View>

                        {/* Floating Stats */}
                        <Text style={{ position: 'absolute', top: 10, right: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: T.color.brand.primary, fontSize: 8 }}>LAT: 12ms</Text>
                        <Text style={{ position: 'absolute', top: 22, right: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: T.color.brand.primary, fontSize: 8 }}>FPS: 60.0</Text>
                    </View>
                </Animated.View>

            </ScrollView>

            {/* Launch Button */}
            <View style={{ padding: T.spacing[5] }}>
                <TouchableOpacity
                    style={{
                        backgroundColor: T.color.brand.primary,
                        height: 60,
                        justifyContent: 'center', alignItems: 'center',
                        ...T.glow.hero(T.color.brand.primary),
                    }}
                    onPress={handleLaunch}
                    activeOpacity={0.8}
                >
                    <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#000', fontSize: 18, fontWeight: 'bold', letterSpacing: 2 }}>
                        INITIALIZE SESSION
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}
