import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { MessageCircle, Bot, User, Send } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/stores/app';

// Mock conversations for display
const MOCK_CONVERSATIONS = [
  { id: '1', name: 'AI Coach', lastMessage: 'Your shooting form looks great! Try focusing on...', isAI: true, time: '2m', unread: 2, avatar: '🤖' },
  { id: '2', name: 'Team Alpha', lastMessage: 'Great workout today! 🏀', isAI: false, time: '1h', unread: 0, avatar: '👥' },
  { id: '3', name: 'Training Tips', lastMessage: 'Daily tip: Focus on your follow-through...', isAI: true, time: '3h', unread: 1, avatar: '💡' },
];

export default function MessagesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isDark = useAppStore((s) => s.isDark);

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <View className="px-5 pt-14 pb-4">
        <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{t('nav.messages') || 'Messages'}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 100 }}>
        {MOCK_CONVERSATIONS.map((conv) => (
          <TouchableOpacity
            key={conv.id}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (conv.isAI) {
                router.push('/(tabs)/ai-coach');
              } else {
                router.push(`/(tabs)/messages/${conv.id}`);
              }
            }}
            activeOpacity={0.7}
            className="flex-row items-center gap-3 py-4 border-b border-neutral-100 dark:border-neutral-800"
          >
            <View className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-900 items-center justify-center">
              <Text className="text-xl">{conv.avatar}</Text>
            </View>
            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="font-semibold text-neutral-900 dark:text-white">{conv.name}</Text>
                <Text className="text-xs text-neutral-400">{conv.time}</Text>
              </View>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5" numberOfLines={1}>
                {conv.lastMessage}
              </Text>
            </View>
            {conv.unread > 0 && (
              <View className="w-5 h-5 rounded-full bg-orange-500 items-center justify-center">
                <Text className="text-white text-xs font-bold">{conv.unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        {/* New Chat Button */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/(tabs)/ai-coach');
          }}
          activeOpacity={0.8}
          className="mt-6 flex-row items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed border-orange-300 dark:border-orange-700"
        >
          <MessageCircle size={18} color="#f97316" />
          <Text className="text-orange-500 font-semibold">Chat with AI Coach</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}