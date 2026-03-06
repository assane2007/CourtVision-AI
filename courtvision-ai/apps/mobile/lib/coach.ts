import { api } from './api';

export interface CoachConversation {
    id: string;
    title: string;
    context: string;
    message_count: number;
    last_message_at: string;
    created_at: string;
}

export interface CoachMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    attachments?: any;
    suggestedActions?: string[];
}

export interface CoachSuggestion {
    emoji: string;
    text: string;
    context: string;
}

export const coachApi = {
    getConversations: async (limit = 20) => {
        const res = await api.get<{ data: CoachConversation[] }>(`/api/coach/conversations?limit=${limit}`);
        return res.data;
    },

    getConversation: async (id: string) => {
        const res = await api.get<{ data: { id: string, title: string, context: string, messages: CoachMessage[], messageCount: number } }>(`/api/coach/conversations/${id}`);
        return res.data;
    },

    createConversation: async (context: string, initialMessage?: string, sessionId?: string) => {
        const body: any = { context };
        if (initialMessage) body.initialMessage = initialMessage;
        if (sessionId) body.sessionId = sessionId;

        const res = await api.post<{ data: { conversationId: string, title: string, response: any } }>(`/api/coach/conversations`, body);
        return res.data;
    },

    sendMessage: async (conversationId: string, message: string, context: string, sessionId?: string) => {
        const body: any = { conversationId, message, context };
        if (sessionId) body.sessionId = sessionId;

        const res = await api.post<{ data: { message: string, attachments?: any, suggestedActions?: string[] } }>(`/api/coach/message`, body);
        return res.data;
    },

    getSuggestions: async () => {
        const res = await api.get<{ data: CoachSuggestion[] }>(`/api/coach/suggestions`);
        return res.data;
    },

    preGamePrep: async (opponentName?: string, matchType = 'pickup', nervousLevel = 5, goals: string[] = []) => {
        const res = await api.post<{ data: { message: string, suggestedActions?: string[] } }>(`/api/coach/pre-game`, { opponentName, matchType, nervousLevel, goals });
        return res.data;
    },

    filmRoom: async (sessionId: string, question?: string) => {
        const res = await api.post<{ data: { message: string, suggestedActions?: string[] } }>(`/api/coach/film-room`, { sessionId, question });
        return res.data;
    }
};
