/// <reference types="expo/types" />

// Declare native module types
declare module 'expo-router' {
  export * from 'expo-router';
}

declare module 'nativewind' {
  export const colors: Record<string, string>;
}

declare module '@react-native-async-storage/async-storage' {
  export default class AsyncStorage {
    static getItem(key: string): Promise<string | null>;
    static setItem(key: string, value: string): Promise<void>;
    static removeItem(key: string): Promise<void>;
    static clear(): Promise<void>;
    static multiGet(keys: string[]): Promise<[string, string | null][]>;
    static multiSet(kvp: [string, string][]): Promise<void>;
    static multiRemove(keys: string[]): Promise<void>;
  }
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