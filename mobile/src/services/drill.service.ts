import apiClient from './api-client';

export interface Drill {
  id: string;
  name: string;
  nameFr: string;
  category: string;
  difficulty: 'facile' | 'moyen' | 'difficile';
  duration: number;
  targetReps: number;
  instructionsFr: string[];
  isCustom?: boolean;
}

export interface Session {
  id: string;
  userId: string;
  date: string;
  totalScore: number;
  totalReps: number;
  totalTimeSeconds: number;
  drillResults: {
    drillId: string;
    score: number;
    reps: number;
    timeSeconds: number;
    isPersonalBest?: boolean;
  }[];
}

export const drillService = {
  async getDrills(category?: string, difficulty?: string): Promise<Drill[]> {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.set('category', category);
    if (difficulty) params.set('difficulty', difficulty);
    const { data } = await apiClient.get(`/api/drills?${params.toString()}`);
    return data;
  },

  async getDrill(id: string): Promise<Drill> {
    const { data } = await apiClient.get(`/api/drills/${id}`);
    return data;
  },

  async favoriteDrill(id: string): Promise<{ favorited: boolean }> {
    const { data } = await apiClient.post('/api/drills/favorite', { drillId: id });
    return data;
  },

  async createCustomDrill(drill: Partial<Drill>): Promise<Drill> {
    const { data } = await apiClient.post('/api/drills/create', drill);
    return data;
  },

  async getSessions(limit = 20): Promise<Session[]> {
    const { data } = await apiClient.get(`/api/sessions?limit=${limit}`);
    return data;
  },

  async saveSession(session: Omit<Session, 'id'>): Promise<Session> {
    const { data } = await apiClient.post('/api/sessions', session);
    return data;
  },
};