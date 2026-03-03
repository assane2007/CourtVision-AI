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
                    tabBarAccessibilityLabel: 'Dashboard Home'
                }}
            />
            {/* These routes don't necessarily exist yet but mock the tab bar layout */}
            <Tabs.Screen
                name="sessions"
                options={{
                    title: 'Analyze',
                    tabBarAccessibilityLabel: 'Analyze Sessions'
                }}
            />
            <Tabs.Screen
                name="record"
                options={{
                    title: 'Record',
                    tabBarAccessibilityLabel: 'Start Recording'
                }}
            />
            <Tabs.Screen
                name="players"
                options={{
                    title: 'Stats',
                    tabBarAccessibilityLabel: 'Player Stats'
                }}
            />
        </Tabs>
    );
}
