import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ChevronLeft, Moon, Globe, Bell, Shield, Info, CreditCard, HelpCircle, LogOut, ChevronRight, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/stores/app';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isDark = useAppStore((s) => s.isDark);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const logout = useAppStore((s) => s.logout);

  const sections = [
    {
      title: 'Appearance',
      items: [
        {
          icon: Moon,
          label: t('common.darkMode'),
          toggle: true,
          value: isDark,
          onToggle: () => { toggleTheme(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); },
        },
        {
          icon: Globe,
          label: t('common.language'),
          detail: language === 'fr' ? 'Français' : 'English',
          onPress: () => {
            const newLang = language === 'fr' ? 'en' : 'fr';
            setLanguage(newLang);
            i18n.changeLanguage(newLang);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        { icon: Bell, label: 'Push Notifications', toggle: true, value: true, onToggle: () => {} },
        { icon: Bell, label: 'Workout Reminders', toggle: true, value: true, onToggle: () => {} },
        { icon: Bell, label: 'AI Insights', toggle: true, value: false, onToggle: () => {} },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: Shield, label: 'Privacy & Security', route: '/(auth)/login' as any },
        { icon: CreditCard, label: t('profile.subscription'), route: '/(auth)/login' as any },
        { icon: Trash2, label: 'Delete Account', danger: true, route: '/(auth)/login' as any },
      ],
    },
    {
      title: 'About',
      items: [
        { icon: Info, label: t('common.about'), detail: 'v1.0.0' },
        { icon: HelpCircle, label: 'Help & Support' },
      ],
    },
  ];

  return (
    <ScrollView className="flex-1 bg-white dark:bg-neutral-950" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <View className="px-5 pt-14 pb-4 flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-900 items-center justify-center">
          <ChevronLeft size={22} color={isDark ? '#fafafa' : '#171717'} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-neutral-900 dark:text-white">{t('profile.settings')}</Text>
      </View>

      {sections.map((section) => (
        <View key={section.title} className="px-5 mt-4">
          <Text className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 px-1">{section.title}</Text>
          <View className="rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 overflow-hidden">
            {section.items.map((item, idx) => (
              <TouchableOpacity
                key={item.label}
                onPress={() => {
                  if (item.toggle || item.onPress) return;
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (item.route) router.push(item.route);
                }}
                disabled={item.toggle}
                activeOpacity={0.7}
                className={`flex-row items-center justify-between px-4 py-3.5 ${
                  idx < section.items.length - 1 ? 'border-b border-neutral-100 dark:border-neutral-800' : ''
                }`}
              >
                <View className="flex-row items-center gap-3">
                  <item.icon size={18} color={(item as any).danger ? '#ef4444' : '#737373'} />
                  <Text className={`text-base ${(item as any).danger ? 'text-red-500' : 'text-neutral-900 dark:text-white'}`}>
                    {item.label}
                  </Text>
                </View>
                {item.toggle ? (
                  <Switch
                    value={item.value}
                    onValueChange={item.onToggle}
                    trackColor={{ false: '#e5e5e5', true: '#f97316' }}
                    thumbColor="white"
                  />
                ) : item.detail ? (
                  <Text className="text-neutral-500 text-sm">{item.detail}</Text>
                ) : (
                  <ChevronRight size={16} color="#a3a3a3" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <View className="px-5 mt-8">
        <TouchableOpacity
          onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); logout(); router.replace('/(auth)/login'); }}
          activeOpacity={0.7}
          className="flex-row items-center justify-center gap-2 py-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
        >
          <LogOut size={18} color="#ef4444" />
          <Text className="text-red-500 font-semibold">{t('profile.logout')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}