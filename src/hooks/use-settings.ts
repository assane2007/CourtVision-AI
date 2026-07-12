"use client";

import { useState, useEffect, useCallback } from "react";

export interface AppSettings {
  weeklyGoal: number;
  defaultDuration: number;
  soundEnabled: boolean;
  streakReminder: string;
}

const DEFAULTS: AppSettings = {
  weeklyGoal: 5,
  defaultDuration: 30,
  soundEnabled: true,
  streakReminder: "20:00",
};

const STORAGE_KEY = "courtvision-settings";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        queueMicrotask(() => setSettings({ ...DEFAULTS, ...JSON.parse(stored) }));
      }
    } catch { /* ignore */ }
    queueMicrotask(() => setHydrated(true));
  }, []);

  const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  return { settings, updateSetting, hydrated };
}