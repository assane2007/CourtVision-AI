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
    // Add other fields as needed
}

export const dashboardService = {
    async getDashboardData(): Promise<DashboardData> {
        const response = await apiRequest('/dashboard');
        return response.data;
    },

    async getApexScore(): Promise<ApexScore> {
        const response = await apiRequest('/dashboard/apex');
        return response.data;
    }
};
