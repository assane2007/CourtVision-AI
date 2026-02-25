import { Tabs } from 'expo-router'
import { AntDesign, Feather, FontAwesome5, Ionicons } from '@expo/vector-icons'
import { View, Animated, Platform } from 'react-native'
import { useRef, useEffect } from 'react'
import { useStore } from '../../lib/store'
import { T } from '../../lib/theme'

// Bouton central "+" flottant avec glow
function PlusIcon({ color, focused }: { color: string; focused: boolean }) {
    const scaleAnim = useRef(new Animated.Value(1)).current
    const glowAnim = useRef(new Animated.Value(0.3)).current

    useEffect(() => {
        if (focused) {
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1.1, useNativeDriver: true, tension: 200, friction: 8 }),
                Animated.timing(glowAnim, { toValue: 0.6, duration: 300, useNativeDriver: false }),
            ]).start()
        } else {
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
                Animated.timing(glowAnim, { toValue: 0.3, duration: 300, useNativeDriver: false }),
            ]).start()
        }
    }, [focused])

    return (
        <Animated.View style={{
            backgroundColor: T.colors.primary,
            width: 52, height: 52,
            borderRadius: 26, justifyContent: 'center', alignItems: 'center',
            marginTop: -20,
            transform: [{ scale: scaleAnim }],
            ...T.glow(T.colors.primary, 0.5),
        }}>
            <AntDesign name="plus" size={24} color="#FFF" />
        </Animated.View>
    )
}

// Dot indicator pour les notifications
function NotifDot() {
    const pulseAnim = useRef(new Animated.Value(1)).current
    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])).start()
    }, [])
    return (
        <Animated.View style={{
            position: 'absolute', top: -2, right: -6,
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: T.colors.red,
            borderWidth: 1.5, borderColor: T.colors.bg,
            transform: [{ scale: pulseAnim }],
        }} />
    )
}

// Icône de tab avec indicator actif
function TabIcon({ name, icon, color, focused, IconComponent = Feather as any, size = 22 }: any) {
    const scaleAnim = useRef(new Animated.Value(1)).current

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: focused ? 1.15 : 1,
            useNativeDriver: true,
            tension: 200, friction: 10,
        }).start()
    }, [focused])

    return (
        <Animated.View style={{
            alignItems: 'center',
            transform: [{ scale: scaleAnim }],
        }}>
            <IconComponent name={icon} size={size} color={color} />
            {focused && (
                <View style={{
                    width: 4, height: 4, borderRadius: 2,
                    backgroundColor: T.colors.accent,
                    marginTop: 4,
                    ...T.glow(T.colors.accent, 0.6),
                }} />
            )}
        </Animated.View>
    )
}

export default function DashboardLayout() {
    const xpEvents = useStore(s => s.xpEvents)
    const hasNewXP = xpEvents.length > 0

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: 'rgba(10,15,26,0.95)',
                    borderTopWidth: 0,
                    height: Platform.OS === 'ios' ? 88 : 68,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
                    paddingTop: 8,
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    elevation: 0,
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -8 },
                    shadowOpacity: 0.3,
                    shadowRadius: 16,
                },
                tabBarActiveTintColor: T.colors.accent,
                tabBarInactiveTintColor: T.colors.dim,
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '700',
                    letterSpacing: 0.3,
                    marginTop: 2,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    tabBarLabel: 'Accueil',
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon icon="home" color={color} focused={focused} IconComponent={Feather} />
                    ),
                }}
            />
            <Tabs.Screen
                name="community"
                options={{
                    tabBarLabel: 'Social',
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon icon="people" color={color} focused={focused} IconComponent={Ionicons} />
                    ),
                }}
            />
            <Tabs.Screen
                name="upload"
                options={{
                    tabBarLabel: '',
                    tabBarIcon: ({ color, focused }) => <PlusIcon color={color} focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="twin"
                options={{
                    tabBarLabel: 'Twin IA',
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon icon="user-astronaut" color={color} focused={focused} IconComponent={FontAwesome5} size={20} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    tabBarLabel: 'Profil',
                    tabBarIcon: ({ color, focused }) => (
                        <View>
                            <TabIcon icon="user" color={color} focused={focused} IconComponent={Feather} />
                            {hasNewXP && <NotifDot />}
                        </View>
                    ),
                }}
            />
        </Tabs>
    )
}
