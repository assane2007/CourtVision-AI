/**
 * Base API Service for CourtVision AI Web
 */

import { createClient } from '@/lib/supabase/client'
import { isSupabaseConfigured } from '@/lib/supabase/env'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export async function apiRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    } as Record<string, string>;

    // Attach Supabase auth token if available
    if (isSupabaseConfigured()) {
        try {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`
            }
        } catch {
            // Auth not available (e.g., during SSR), proceed without token
        }
    }

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
