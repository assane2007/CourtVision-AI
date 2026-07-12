import { Tabs } from 'expo-router';
import { View, Platform } from 'react-native';
import { Home, Dumbbell, BarChart3, MessageCircle, User } from 'lucide-react-native';
import { useAppStore } from '@/stores/app';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

const TAB_ICON_SIZE = 22;

export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isDark = useAppStore((s) => s.isDark);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'Inter-Medium',
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
          borderTopColor: isDark ? '#262626' : '#e5e5e5',
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 16),
          height: 80 + insets.bottom,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: '#f97316',
        tabBarInactiveTintColor: '#737373',
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('nav.home'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Home} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="train"
        options={{
          title: t('nav.training'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Dumbbell} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: t('nav.stats'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={BarChart3} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t('nav.messages') || 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={MessageCircle} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={User} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({
  icon: Icon,
  color,
  focused,
}: {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  color: string;
  focused: boolean;
}) {
  return (
    <View
      className={`items-center justify-center rounded-xl px-3 py-1.5 transition-all ${
        focused ? 'bg-orange-500/10' : ''
      }`}
    >
      <Icon
        size={TAB_ICON_SIZE}
        color={color}
        strokeWidth={focused ? 2.5 : 1.8}
      />
    </View>
  );
}