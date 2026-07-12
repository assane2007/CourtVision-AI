/// <reference types="expo/types" />

// Declare native module types
declare module 'expo-router' {
  export * from 'expo-router';
}

declare module 'nativewind' {
  export const colors: Record<string, string>;
}

declare module '@react-native-async-storage/async-storage' {
  const AsyncStorage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
    multiGet(keys: string[]): Promise<[string, string | null][]>;
    multiSet(kvp: [string, string][]): Promise<void>;
    multiRemove(keys: string[]): Promise<void>;
  };
  export default AsyncStorage;
}

declare module 'expo-local-authentication' {
  export const AuthenticationType: {
    FINGERPRINT: number;
    FACIAL_RECOGNITION: number;
    IRIS: number;
  };
  export function hasHardwareAsync(): Promise<boolean>;
  export function supportedAuthenticationTypesAsync(): Promise<number[]>;
  export function isEnrolledAsync(): Promise<boolean>;
  export function authenticateAsync(options?: {
    promptMessage?: string;
    fallbackLabel?: string;
    cancelLabel?: string;
    disableDeviceFallback?: boolean;
  }): Promise<{ success: boolean; error?: string }>;
}