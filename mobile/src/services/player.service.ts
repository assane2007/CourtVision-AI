import apiClient from './api-client';

export interface PlayerStats {
  level: number;
  xp: number;
  xpToNext: number;
  streakDays: number;
  totalSessions: number;
  totalReps: number;
  avgScore: number;
}

export interface PlayerProfile {
  id: string;
  name: string;
  email: string;
  position: string;
  level: string;
  avatar?: string;
  isOnboarded: boolean;
  createdAt: string;
}

export const playerService = {
  async getStats(): Promise<PlayerStats> {
    const { data } = await apiClient.get('/api/player/stats');
    return data;
  },

  async getProfile(): Promise<PlayerProfile> {
    const { data } = await apiClient.get('/api/player/profile');
    return data;
  },

  async updateProfile(updates: Partial<PlayerProfile>): Promise<PlayerProfile> {
    const { data } = await apiClient.patch('/api/player/profile', updates);
    return data;
  },

  async getWeeklyReport(): Promise<Record<string, unknown>> {
    const { data } = await apiClient.get('/api/player/weekly-report');
    return data;
  },

  async exportData(format: 'json' | 'csv'): Promise<Blob> {
    const { data } = await apiClient.get(`/api/player/export?format=${format}`, {
      responseType: 'blob',
    });
    return data;
  },
};