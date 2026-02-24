import { Tabs } from 'expo-router'
import { AntDesign, Feather, FontAwesome5, Ionicons } from '@expo/vector-icons'
import { View } from 'react-native'
import { useStore } from '../../lib/store'

// Badge XP animé pour la tab Upload
function PlusIcon({ color }: { color: string }) {
    return (
        <View style={{
            backgroundColor: '#1A73E8', width: 44, height: 44,
            borderRadius: 22, justifyContent: 'center', alignItems: 'center',
            marginTop: -8,
            shadowColor: '#1A73E8', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5, shadowRadius: 8,
        }}>
            <AntDesign name="plus" size={22} color="#FFF" />
        </View>
    )
}

// Dot rouge pour les notifications non lues
function NotifDot() {
    return (
        <View style={{
            position: 'absolute', top: -2, right: -6,
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: '#FF3D57',
            borderWidth: 1.5, borderColor: '#0D1117',
        }} />
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
                    backgroundColor: '#161B22',
                    borderTopColor: '#0D1117',
                    borderTopWidth: 1,
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 4,
                },
                tabBarActiveTintColor: '#00D4FF',
                tabBarInactiveTintColor: '#8B949E',
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    tabBarLabel: 'Accueil',
                    tabBarIcon: ({ color }) => <Feather name="home" size={22} color={color} />,
                }}
            />
            <Tabs.Screen
                name="community"
                options={{
                    tabBarLabel: 'Communauté',
                    tabBarIcon: ({ color }) => (
                        <View>
                            <Ionicons name="people" size={22} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="upload"
                options={{
                    tabBarLabel: '',
                    tabBarIcon: ({ color }) => <PlusIcon color={color} />,
                }}
            />
            <Tabs.Screen
                name="twin"
                options={{
                    tabBarLabel: 'Twin IA',
                    tabBarIcon: ({ color }) => <FontAwesome5 name="user-astronaut" size={20} color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    tabBarLabel: 'Profil',
                    tabBarIcon: ({ color }) => (
                        <View>
                            <Feather name="user" size={22} color={color} />
                            {hasNewXP && <NotifDot />}
                        </View>
                    ),
                }}
            />
        </Tabs>
    )
}
