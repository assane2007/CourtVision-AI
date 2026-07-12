import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Globe } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/stores/app';
import { authService } from '@/services';
import { useAuthStore } from '@/stores/auth-store';

export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const setAuthenticated = useAppStore((s) => s.setAuthenticated);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const { isLoading, error, setLoading, setError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError(t('auth.invalidCredentials'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await authService.login(email, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAuthenticated(result.user, result.session.access_token);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  }

  function toggleLanguage() {
    const newLang = i18n.language === 'fr' ? 'en' : 'fr';
    i18n.changeLanguage(newLang);
    setLanguage(newLang as 'fr' | 'en');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white dark:bg-neutral-950"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Language Toggle */}
        <View className="flex-row justify-end px-5 pt-14">
          <TouchableOpacity
            onPress={toggleLanguage}
            className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900"
          >
            <Globe size={14} color="#737373" />
            <Text className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase">
              {i18n.language === 'fr' ? 'EN' : 'FR'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Logo */}
        <View className="items-center mt-8 mb-8">
          <View className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 items-center justify-center shadow-lg shadow-orange-500/30">
            <Text className="text-4xl">🏀</Text>
          </View>
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white mt-4">
            CourtVision AI
          </Text>
          <Text className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
            {t('onboarding.subtitle')}
          </Text>
        </View>

        {/* Form */}
        <View className="px-6">
          {/* Email */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              {t('auth.email')}
            </Text>
            <View className="flex-row items-center gap-3 px-4 py-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
              <Mail size={18} color="#737373" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                placeholderTextColor="#a3a3a3"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                className="flex-1 text-neutral-900 dark:text-white text-base"
              />
            </View>
          </View>

          {/* Password */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              {t('auth.password')}
            </Text>
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

          {/* Forgot Password */}
          <TouchableOpacity className="self-end mb-6">
            <Text className="text-sm text-orange-500 font-medium">{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>

          {/* Error */}
          {error && (
            <View className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text>
            </View>
          )}

          {/* Login Button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 items-center justify-center shadow-lg shadow-orange-500/25 disabled:opacity-50"
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <View className="flex-row items-center gap-2">
                <Text className="text-white font-semibold text-base">{t('auth.login')}</Text>
                <ArrowRight size={18} color="white" />
              </View>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
            <Text className="mx-4 text-sm text-neutral-400">{t('auth.orContinueWith')}</Text>
            <View className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
          </View>

          {/* OAuth Buttons */}
          <View className="flex-row gap-3">
            <TouchableOpacity className="flex-1 py-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 items-center justify-center bg-neutral-50 dark:bg-neutral-900">
              <Text className="text-lg">🍎</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 py-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 items-center justify-center bg-neutral-50 dark:bg-neutral-900">
              <Text className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">G</Text>
            </TouchableOpacity>
          </View>

          {/* Signup Link */}
          <View className="flex-row justify-center mt-8 mb-4">
            <Text className="text-neutral-500 dark:text-neutral-400 text-sm">{t('auth.noAccount')} </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text className="text-orange-500 font-semibold text-sm">{t('auth.signup')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}