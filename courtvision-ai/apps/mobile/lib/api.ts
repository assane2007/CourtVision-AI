/**
 * Client API CourtVision — Configuration de base.
 * Toutes les requêtes passent par ce module.
 */

import Constants from 'expo-constants'

const API_BASE_URL =
    Constants.expoConfig?.extra?.apiUrl
    ?? process.env.EXPO_PUBLIC_API_URL
    ?? 'http://localhost:3001'

let _authToken: string | null = null

export function setAuthToken(token: string | null) {
    _authToken = token
}

export function getAuthToken(): string | null {
    return _authToken
}

export async function apiFetch<T = any>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE_URL}${path}`

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {})
    }

    if (_authToken) {
        headers['Authorization'] = `Bearer ${_authToken}`
    }

    const response = await fetch(url, {
        ...options,
        headers,
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }))
        throw new ApiError(response.status, error.error || error.message || 'Unknown error', error)
    }

    return response.json()
}

export class ApiError extends Error {
    constructor(
        public statusCode: number,
        message: string,
        public data?: any
    ) {
        super(message)
        this.name = 'ApiError'
    }
}

export { API_BASE_URL }
