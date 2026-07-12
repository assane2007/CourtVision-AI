import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Send, Bot, User, Mic, MicOff, Sparkles, Dumbbell, BarChart3, Brain } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/stores/app';
import { aiService, type ChatMessage } from '@/services/ai.service';
import { cn } from '@/utils/cn';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AiCoachScreen() {
  const { t } = useTranslation();
  const isDark = useAppStore((s) => s.isDark);
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content: "Bonjour ! Je suis votre coach IA basket. Comment puis-je vous aider aujourd'hui ? 🏀\n\nJe peux vous aider avec :\n• Conseils d'entraînement personnalisés\n• Analyse de votre forme\n• Plans d'entraînement sur mesure\n• Prédictions de performance",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const quickActions = [
    { icon: Dumbbell, label: 'Créer un entraînement', prompt: 'Crée-moi un entraînement de tir personnalisé pour 30 minutes' },
    { icon: BarChart3, label: 'Analyser mes stats', prompt: 'Analyse mes statistiques récentes et donne-moi des conseils' },
    { icon: Brain, label: 'Prédiction', prompt: 'Quelles sont mes prédictions de progression pour ce mois ?' },
  ];

  async function sendMessage(text?: string) {
    const messageText = text || input.trim();
    if (!messageText || isTyping) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput('');

    const userMsg: DisplayMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const history: ChatMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const result = await aiService.coachChat(messageText, history);

      const aiMsg: DisplayMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: typeof result === 'string' ? result : JSON.stringify(result),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errorMsg: DisplayMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  }

  function toggleRecording() {
    setIsRecording(!isRecording);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, isTyping]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white dark:bg-neutral-950"
    >
      {/* Header */}
      <View className="px-5 pt-14 pb-3 border-b border-neutral-100 dark:border-neutral-800">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 items-center justify-center">
            <Sparkles size={18} color="white" />
          </View>
          <View>
            <Text className="font-semibold text-neutral-900 dark:text-white">{t('aiCoach.title')}</Text>
            <Text className="text-xs text-emerald-500 font-medium">● En ligne</Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-5 py-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        {/* Quick Actions (show only if few messages) */}
        {messages.length <= 1 && (
          <View className="gap-2 mb-4">
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                onPress={() => sendMessage(action.prompt)}
                activeOpacity={0.7}
                className="flex-row items-center gap-3 p-3.5 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20"
              >
                <action.icon size={18} color="#f97316" />
                <Text className="text-sm font-medium text-orange-700 dark:text-orange-300">{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {messages.map((msg) => (
          <View
            key={msg.id}
            className={cn(
              'max-w-[85%] mb-3',
              msg.role === 'user' ? 'self-end' : 'self-start'
            )}
          >
            <View
              className={cn(
                'px-4 py-3 rounded-2xl',
                msg.role === 'user'
                  ? 'bg-orange-500 rounded-br-md'
                  : 'bg-neutral-100 dark:bg-neutral-900 rounded-bl-md border border-neutral-200 dark:border-neutral-800'
              )}
            >
              {msg.role === 'assistant' && (
                <View className="flex-row items-center gap-1.5 mb-1.5">
                  <Bot size={12} color="#f97316" />
                  <Text className="text-xs font-medium text-orange-500">AI Coach</Text>
                </View>
              )}
              <Text
                className={cn(
                  'text-sm leading-5',
                  msg.role === 'user' ? 'text-white' : 'text-neutral-900 dark:text-white'
                )}
              >
                {msg.content}
              </Text>
            </View>
          </View>
        ))}

        {isTyping && (
          <View className="self-start mb-3">
            <View className="px-4 py-3 rounded-2xl rounded-bl-md bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <View className="flex-row items-center gap-1">
                <View className="w-2 h-2 rounded-full bg-neutral-400 animate-pulse" />
                <View className="w-2 h-2 rounded-full bg-neutral-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                <View className="w-2 h-2 rounded-full bg-neutral-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View className="px-5 pb-6 pt-2 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={toggleRecording}
            className={cn(
              'w-10 h-10 rounded-full items-center justify-center',
              isRecording ? 'bg-red-500' : 'bg-neutral-100 dark:bg-neutral-900'
            )}
          >
            {isRecording ? <MicOff size={18} color="white" /> : <Mic size={18} color="#737373" />}
          </TouchableOpacity>
          <View className="flex-1 flex-row items-center px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={t('aiCoach.placeholder')}
              placeholderTextColor="#a3a3a3"
              multiline
              maxLength={1000}
              className="flex-1 text-neutral-900 dark:text-white text-sm max-h-20"
            />
          </View>
          <TouchableOpacity
            onPress={() => sendMessage()}
            disabled={!input.trim() || isTyping}
            className={cn(
              'w-10 h-10 rounded-full items-center justify-center',
              input.trim() ? 'bg-orange-500' : 'bg-neutral-200 dark:bg-neutral-800'
            )}
          >
            <Send size={16} color={input.trim() ? 'white' : '#a3a3a3'} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}