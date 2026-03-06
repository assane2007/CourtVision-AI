import { Tabs } from 'expo-router';
import { TabBar } from '../../components/ui/TabBar';
import { colors } from '../../constants/tokens';

export default function AppLayout() {
    return (
        <Tabs
            tabBar={(props) => <TabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarAccessibilityLabel: 'Dashboard'
                }}
            />

            <Tabs.Screen
                name="record"
                options={{
                    title: 'Record',
                    tabBarAccessibilityLabel: 'Start AI Session'
                }}
            />

            {/* Hidden routes from TabBar but accessible via router.push */}
            <Tabs.Screen
                name="coach"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="precog"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="sessions"
                options={{
                    href: null,
                }}
            />

            {/* If players route doesn't exist yet, we can hide it or point it to index for now */}
            <Tabs.Screen
                name="players"
                options={{
                    href: null, // Hide for now until we have a dedicated players/profile screen
                }}
            />
        </Tabs>
    );
}
