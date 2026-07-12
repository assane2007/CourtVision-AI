import apiClient from './api-client';

export interface LoginResponse {
  user: { id: string; email: string; name: string; avatar?: string };
  session: { access_token: string; refresh_token: string };
}

export interface SignupResponse {
  user: { id: string; email: string; name: string };
  session: { access_token: string };
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await apiClient.post('/api/auth/signup', { email, password, isLogin: true });
    return data;
  },

  async signup(email: string, password: string, name: string): Promise<SignupResponse> {
    const { data } = await apiClient.post('/api/auth/signup', { email, password, name });
    return data;
  },

  async sendMagicLink(email: string): Promise<{ message: string }> {
    const { data } = await apiClient.post('/api/auth/supabase/magic-link', { email });
    return data;
  },

  async getSession(token: string): Promise<LoginResponse> {
    const { data } = await apiClient.get('/api/auth/supabase/session', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  },

  async resetPassword(email: string): Promise<{ message: string }> {
    const { data } = await apiClient.post('/api/auth/reset-password', { email });
    return data;
  },

  async onboard(payload: {
    position: string;
    goals: string[];
    experience: string;
  }): Promise<{ success: boolean }> {
    const { data } = await apiClient.post('/api/player/onboard', payload);
    return data;
  },
};