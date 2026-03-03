/**
 * Base API Service for CourtVision AI Web
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function apiRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    // Mock handling for demo purposes if no token is available, 
    // but we aim for real data.
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    } as Record<string, string>;

    // Integrate with Supabase auth token here if needed
    // const { data: { session } } = await supabase.auth.getSession();
    // if (session?.access_token) {
    //   headers['Authorization'] = `Bearer ${session.access_token}`;
    // }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API Request failed with status ${response.status}`);
    }

    return response.json();
}
