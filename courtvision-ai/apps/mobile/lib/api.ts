/**
 * Client API CourtVision — Configuration de base.
 * Toutes les requêtes passent par ce module.
 * Les tokens d'auth sont stockés dans SecureStore (jamais en mémoire seule).
 */

import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'

const AUTH_TOKEN_KEY = 'courtvision_auth_token'
const REFRESH_TOKEN_KEY = 'courtvision_refresh_token'

const API_BASE_URL =
    Constants.expoConfig?.extra?.apiUrl
    ?? process.env.EXPO_PUBLIC_API_URL
    ?? 'http://localhost:3001'

// ─── Token management (SecureStore) ──────────────────────────

export async function setAuthToken(token: string | null): Promise<void> {
    if (token) {
        await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token)
    } else {
        await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY).catch(() => null)
    }
}

export async function getAuthToken(): Promise<string | null> {
    return SecureStore.getItemAsync(AUTH_TOKEN_KEY).catch(() => null)
}

export async function setRefreshToken(token: string | null): Promise<void> {
    if (token) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token)
    } else {
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => null)
    }
}

export async function getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY).catch(() => null)
}

export async function clearTokens(): Promise<void> {
    await Promise.all([
        SecureStore.deleteItemAsync(AUTH_TOKEN_KEY).catch(() => null),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => null),
    ])
}

// ─── Errors ───────────────────────────────────────────────────

export class ApiError extends Error {
    constructor(
        public statusCode: number,
        message: string,
        public data?: unknown
    ) {
        super(message)
        this.name = 'ApiError'
    }
}

export class NetworkError extends Error {
    constructor(message = 'Pas de connexion réseau') {
        super(message)
        this.name = 'NetworkError'
    }
}

// ─── HTTP client ──────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 15_000

export async function apiFetch<T = unknown>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const token = await getAuthToken()
    const url = `${API_BASE_URL}${path}`

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> ?? {}),
    }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

    try {
        const response = await fetch(url, { ...options, headers, signal: controller.signal })
        clearTimeout(timeoutId)

        if (response.status === 401) {
            await clearTokens()
            throw new ApiError(401, 'Session expirée, veuillez vous reconnecter')
        }
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: response.statusText }))
            throw new ApiError(
                response.status,
                (err as Record<string, string>).error ?? (err as Record<string, string>).message ?? 'Erreur inconnue',
                err
            )
        }
        return response.json() as Promise<T>
    } catch (err) {
        clearTimeout(timeoutId)
        if (err instanceof ApiError) throw err
        if ((err as Error).name === 'AbortError') throw new NetworkError('La requête a expiré')
        throw new NetworkError()
    }
}

// ─── Shorthand helpers ─────────────────────────────────────────

export const api = {
    get:    <T>(path: string)              => apiFetch<T>(path, { method: 'GET' }),
    post:   <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST',  body: JSON.stringify(body) }),
    patch:  <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: <T>(path: string)              => apiFetch<T>(path, { method: 'DELETE' }),
}

export { API_BASE_URL }
