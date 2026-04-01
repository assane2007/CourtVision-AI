import { apiRequest } from './api';

export interface ApexScore {
    overall: number;
    shooting: number;
    mental: number;
    consistency: number;
    clutch: number;
    improvement: number;
    grade: string;
    trend: 'rising' | 'stable' | 'declining';
}

export interface DashboardData {
    apexScore: ApexScore;
    streaks: {
        currentStreak: number;
        longestStreak: number;
        sessionThisWeek: number;
        shotsThisWeek: number;
    };
}

export interface WeeklyDigest {
    period?: string;
    sessions?: number;
    totalShots?: number;
    avgFGPct?: number;
    avgMentalScore?: number;
    highlights?: string[];
    nextWeekFocus?: string[];
}

export interface SessionSummary {
    id: string;
    created_at: string;
    type: string;
    status: string;
    duration_minutes: number | null;
    shooting_fg_pct: number;
    mental_score: number | null;
    shots_attempted: number;
    shots_made: number;
    highlight_count: number;
}

export const dashboardService = {
    async getDashboardData(): Promise<DashboardData> {
        const response = await apiRequest('/dashboard/v6');
        return response.data;
    },

    async getApexScore(): Promise<ApexScore> {
        const response = await apiRequest('/dashboard/apex');
        return response.data;
    },

    async getWeeklyDigest(): Promise<WeeklyDigest> {
        const response = await apiRequest('/dashboard/digest');
        return response.data;
    },

    async getRecentSessions(limit = 1): Promise<SessionSummary[]> {
        const sessions = await apiRequest<SessionSummary[]>('/sessions');
        if (!Array.isArray(sessions)) {
            return [];
        }
        return sessions.slice(0, Math.max(0, limit));
    }
};
