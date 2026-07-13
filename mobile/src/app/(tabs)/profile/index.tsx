import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Settings, Award, Trophy, Users, Bell, Moon, Globe, ChevronRight, LogOut, Crown,  } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/stores/app';


export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const isDark = useAppStore((s) => s.isDark);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const logout = useAppStore((s) => s.logout);

  const menuItems = [
    { icon: Award, label: t('profile.achievements'), route: '/(tabs)/profile/achievements', color: '#f97316' },
    { icon: Trophy, label: t('profile.leaderboard'), route: '/(tabs)/profile/leaderboard', color: '#eab308' },
    { icon: Users, label: t('profile.friends'), route: '/(tabs)/messages', color: '#22c55e' },
    { icon: Bell, label: t('common.notifications'), route: '/(tabs)/profile/notifications', color: '#06b6d4' },
    { icon: Crown, label: t('profile.subscription'), route: '/(tabs)/profile/settings', color: '#a855f7' },
    { icon: Settings, label: t('profile.settings'), route: '/(tabs)/profile/settings', color: '#737373' },
  ];

  function handleLogout() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    logout();
  }

  function toggleLang() {
    const newLang = language === 'fr' ? 'en' : 'fr';
    setLanguage(newLang);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-neutral-950" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View className="px-5 pt-14 pb-2">
        <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{t('nav.profile')}</Text>
      </View>

      {/* Profile Card */}
      <View className="mx-5 mt-4 p-5 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-500/20">
        <View className="flex-row items-center gap-4">
          <View className="w-16 h-16 rounded-full bg-white/20 items-center justify-center">
            <Text className="text-2xl">🏀</Text>
          </View>
          <View className="flex-1">
            <Text className="text-white text-lg font-bold">{user?.name || 'Player'}</Text>
            <Text className="text-orange-100 text-sm">{user?.email || ''}</Text>
            <View className="flex-row items-center gap-1 mt-1">
              <Crown size={12} color="#fde68a" />
              <Text className="text-yellow-200 text-xs font-medium">{t('profile.pro')}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View className="flex-row gap-3 mx-5 mt-4">
        <TouchableOpacity
          onPress={() => toggleTheme()}
          activeOpacity={0.7}
          className="flex-1 flex-row items-center gap-2 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800"
        >
          <Moon size={16} color={isDark ? '#f97316' : '#737373'} />
          <Text className="text-sm font-medium text-neutral-900 dark:text-white">{t('common.darkMode')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={toggleLang}
          activeOpacity={0.7}
          className="flex-1 flex-row items-center gap-2 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800"
        >
          <Globe size={16} color="#737373" />
          <Text className="text-sm font-medium text-neutral-900 dark:text-white">{language === 'fr' ? 'Français' : 'English'}</Text>
        </TouchableOpacity>
      </View>

      {/* Menu Items */}
      <View className="mx-5 mt-6">
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(item.route as any); }}
            activeOpacity={0.7}
            className="flex-row items-center justify-between py-4 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                <item.icon size={18} color={item.color} />
              </View>
              <Text className="text-base font-medium text-neutral-900 dark:text-white">{item.label}</Text>
            </View>
            <ChevronRight size={18} color="#a3a3a3" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <View className="mx-5 mt-8">
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.7}
          className="flex-row items-center justify-center gap-2 py-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
        >
          <LogOut size={18} color="#ef4444" />
          <Text className="text-red-500 font-semibold">{t('profile.logout')}</Text>
        </TouchableOpacity>
      </View>

      {/* Version */}
      <Text className="text-center text-neutral-400 text-xs mt-6 mb-4">
        CourtVision AI v1.0.0
      </Text>
    </ScrollView>
  );
}