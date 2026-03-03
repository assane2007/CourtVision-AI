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
        // Zero friction: go straight to dashboard
        router.push('/(dashboard)')
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
                    <View style={{ width: 200, height: 120, borderWidth: 1, borderColor: '#333', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                        {/* Corner markers */}
                        <View style={{ position: 'absolute', top: -1, left: -1, width: 10, height: 10, borderTopWidth: 2, borderLeftWidth: 2, borderColor: T.color.brand.primary }} />
                        <View style={{ position: 'absolute', top: -1, right: -1, width: 10, height: 10, borderTopWidth: 2, borderRightWidth: 2, borderColor: T.color.brand.primary }} />
                        <View style={{ position: 'absolute', bottom: -1, left: -1, width: 10, height: 10, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: T.color.brand.primary }} />
                        <View style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderBottomWidth: 2, borderRightWidth: 2, borderColor: T.color.brand.primary }} />

                        <Feather name="video" size={32} color="#555" />
                        <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: T.color.brand.primary, fontSize: 10, position: 'absolute', bottom: 8 }}>PLAYER_LOCK_READY</Text>
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
