import { Tabs } from 'expo-router'
import { AntDesign, Feather, FontAwesome5, Ionicons } from '@expo/vector-icons'

export default function DashboardLayout() {
    return (
        <Tabs screenOptions={{
            headerShown: false,
            tabBarStyle: { backgroundColor: '#161B22', borderTopColor: '#0D1117' },
            tabBarActiveTintColor: '#00D4FF',
            tabBarInactiveTintColor: '#8B949E',
        }}>
            <Tabs.Screen
                name="index"
                options={{
                    tabBarLabel: 'Accueil',
                    tabBarIcon: ({ color }) => <Feather name="home" size={24} color={color} />
                }}
            />
            <Tabs.Screen
                name="upload"
                options={{
                    tabBarLabel: 'Analyser',
                    tabBarIcon: ({ color }) => <AntDesign name="pluscircle" size={28} color="#1A73E8" style={{ marginTop: -5 }} />
                }}
            />
            <Tabs.Screen
                name="community"
                options={{
                    tabBarLabel: 'Communauté',
                    tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} />
                }}
            />
            <Tabs.Screen
                name="twin"
                options={{
                    tabBarLabel: 'Mon Twin',
                    tabBarIcon: ({ color }) => <FontAwesome5 name="user-astronaut" size={24} color={color} />
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    tabBarLabel: 'Profil',
                    tabBarIcon: ({ color }) => <Feather name="user" size={24} color={color} />
                }}
            />
        </Tabs>
    )
}
