import apiClient from './api-client';

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  avatar?: string;
  score: number;
  level: number;
}

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

export interface Friend {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  level: number;
}

export const socialService = {
  async getLeaderboard(period: 'weekly' | 'monthly' | 'allTime' = 'weekly'): Promise<LeaderboardEntry[]> {
    const { data } = await apiClient.get(`/api/leaderboard?period=${period}`);
    return data;
  },

  async getAchievements(): Promise<Achievement[]> {
    const { data } = await apiClient.get('/api/achievements');
    return data;
  },

  async getFriends(): Promise<Friend[]> {
    const { data } = await apiClient.get('/api/friends');
    return data;
  },

  async addFriend(userId: string): Promise<{ success: boolean }> {
    const { data } = await apiClient.post(`/api/friends/${userId}`);
    return data;
  },

  async getFeed(page = 1): Promise<Record<string, unknown>[]> {
    const { data } = await apiClient.get(`/api/feed?page=${page}`);
    return data;
  },

  async getNotifications(): Promise<Record<string, unknown>[]> {
    const { data } = await apiClient.get('/api/notifications');
    return data;
  },

  async markNotificationsRead(): Promise<{ success: boolean }> {
    const { data } = await apiClient.post('/api/notifications/read-all');
    return data;
  },
};