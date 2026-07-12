import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Eye, EyeOff, ArrowRight, User } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/stores/app';
import { authService } from '@/services';
import { useAuthStore } from '@/stores/auth-store';

export default function SignupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setAuthenticated = useAppStore((s) => s.setAuthenticated);
  const { isLoading, error, setLoading, setError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSignup() {
    setError(null);
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required');
      return;
    }
    if (password.length < 8) {
      setError(t('auth.weakPassword'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordsDontMatch'));
      return;
    }

    setLoading(true);
    try {
      const result = await authService.signup(email, password, name);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAuthenticated(result.user, result.session.access_token);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white dark:bg-neutral-950"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="px-6 pt-16">
          <TouchableOpacity onPress={() => router.back()} className="mb-8">
            <Text className="text-orange-500 font-medium">{t('common.back')}</Text>
          </TouchableOpacity>

          <Text className="text-3xl font-bold text-neutral-900 dark:text-white">
            {t('auth.signup')}
          </Text>
          <Text className="text-neutral-500 dark:text-neutral-400 mt-2 mb-8">
            {t('onboarding.subtitle')}
          </Text>

          <View className="mb-4">
            <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Name</Text>
            <View className="flex-row items-center gap-3 px-4 py-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
              <User size={18} color="#737373" />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor="#a3a3a3"
                autoCapitalize="words"
                className="flex-1 text-neutral-900 dark:text-white text-base"
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">{t('auth.email')}</Text>
            <View className="flex-row items-center gap-3 px-4 py-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
              <Mail size={18} color="#737373" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                placeholderTextColor="#a3a3a3"
                keyboardType="email-address"
                autoCapitalize="none"
                className="flex-1 text-neutral-900 dark:text-white text-base"
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">{t('auth.password')}</Text>
            <View className="flex-row items-center gap-3 px-4 py-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
              <Lock size={18} color="#737373" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#a3a3a3"
                secureTextEntry={!showPassword}
                className="flex-1 text-neutral-900 dark:text-white text-base"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} color="#737373" /> : <Eye size={18} color="#737373" />}
              </TouchableOpacity>
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">{t('auth.confirmPassword')}</Text>
            <View className="flex-row items-center gap-3 px-4 py-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
              <Lock size={18} color="#737373" />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor="#a3a3a3"
                secureTextEntry={!showPassword}
                className="flex-1 text-neutral-900 dark:text-white text-base"
              />
            </View>
          </View>

          {error && (
            <View className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleSignup}
            disabled={isLoading}
            activeOpacity={0.8}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 items-center justify-center shadow-lg shadow-orange-500/25 disabled:opacity-50"
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <View className="flex-row items-center gap-2">
                <Text className="text-white font-semibold text-base">{t('auth.createAccount')}</Text>
                <ArrowRight size={18} color="white" />
              </View>
            )}
          </TouchableOpacity>

          <View className="flex-row justify-center mt-8 mb-4">
            <Text className="text-neutral-500 dark:text-neutral-400 text-sm">{t('auth.hasAccount')} </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text className="text-orange-500 font-semibold text-sm">{t('auth.login')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}