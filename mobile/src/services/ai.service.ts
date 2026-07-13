import apiClient from './api-client';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiPrediction {
  prediction: string;
  confidence: number;
  factors: string[];
  timestamp: string;
}

export const aiService = {
  async chat(messages: ChatMessage[], stream = false): Promise<Response> {
    const { data } = await apiClient.post('/api/ai/chat', { messages, stream }, {
      responseType: stream ? 'stream' : 'json',
    });
    return data;
  },

  async coachChat(message: string, history: ChatMessage[]): Promise<Response> {
    const { data } = await apiClient.post('/api/ai-coach', { message, history });
    return data;
  },

  async getPredictions(): Promise<AiPrediction[]> {
    const { data } = await apiClient.get('/api/ai/predictions/history');
    return data;
  },

  async generatePrediction(): Promise<AiPrediction> {
    const { data } = await apiClient.post('/api/ai/predictions/generate');
    return data;
  },

  async generateWorkout(params: {
    focus?: string;
    duration?: number;
    difficulty?: string;
  }): Promise<{ workout: Record<string, unknown> }> {
    const { data } = await apiClient.post('/api/ai/workout/generate', params);
    return data;
  },

  async analyzeForm(drillId: string, imageData: string): Promise<{
    feedback: string;
    score: number;
    suggestions: string[];
  }> {
    const { data } = await apiClient.post('/api/ai/form/analyze', {
      drillId,
      imageData,
    });
    return data;
  },

  async getInsights(): Promise<Record<string, unknown>> {
    const { data } = await apiClient.get('/api/ai/insights');
    return data;
  },
};