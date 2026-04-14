/**
 * Dashboard TabBar Layout  V3
 *
 * Uses CustomTabBar with animated indicators, FAB upload button,
 * and notification dots. Reanimated-powered.
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
            <Tabs.Screen name="community" />
            <Tabs.Screen name="upload" />
            <Tabs.Screen name="twin" />
            <Tabs.Screen name="profile" />
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
