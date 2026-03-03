import { apiRequest } from './api';

export interface PlayerProfile {
    id: string;
    name: string;
    position?: string;
    number?: number;
    team_id?: string;
    user_id: string;
}

export const playerService = {
    async getProfile(): Promise<PlayerProfile | null> {
        const response = await apiRequest('/players');
        // The endpoint returns a list of players for the user, handle if empty
        if (response.data && response.data.length > 0) {
            return response.data[0];
        }
        return null;
    },

    async updateProfile(id: string, updates: Partial<PlayerProfile>): Promise<PlayerProfile> {
        const response = await apiRequest(`/players/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
        return response.data;
    }
};
