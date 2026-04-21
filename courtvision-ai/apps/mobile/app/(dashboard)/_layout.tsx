/**
 * Dashboard TabBar Layout  V3
 *
 * Unified 4-tab bottom navigation.
 */

import { Tabs } from 'expo-router'
import CustomTabBar from '../../components/TabBar'

export default function DashboardLayout() {
    return (
        <Tabs
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tabs.Screen name="index" />
            <Tabs.Screen name="sessions" />
            <Tabs.Screen name="community" />
            <Tabs.Screen name="profile" />
            <Tabs.Screen name="upload" options={{ href: null }} />
            <Tabs.Screen name="twin" options={{ href: null }} />
            <Tabs.Screen
                name="v6"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="v6-arena"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="v6-horse"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="v6-marketplace"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="v6-reports"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    )
}
