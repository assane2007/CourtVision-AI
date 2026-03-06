/**
 * Client API CourtVision — Configuration de base.
 * Toutes les requêtes passent par ce module.
 * Les tokens d'auth sont stockés dans SecureStore (jamais en mémoire seule).
 * 
 * AMÉLIORATIONS v2:
 * - Auto-refresh du token JWT sur 401 (une seule tentative, sans boucle infinie)
 * - File d'attente des requêtes pendant le refresh
 * - Timeout configurable par requête
 * - Retry automatique sur erreur réseau (max 2 fois)
 */

import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'

const AUTH_TOKEN_KEY = 'courtvision_auth_token'
const REFRESH_TOKEN_KEY = 'courtvision_refresh_token'

export const API_BASE_URL =
    Constants.expoConfig?.extra?.apiUrl
    ?? process.env.EXPO_PUBLIC_API_URL
    ?? 'http://localhost:8080'

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

// ─── Token refresh queue ──────────────────────────────────────
// Évite plusieurs refresh simultanés (tous les appels 401 attendent le même refresh)

let isRefreshing = false
let refreshSubscribers: Array<(token: string | null) => void> = []

function subscribeToRefresh(cb: (token: string | null) => void) {
    refreshSubscribers.push(cb)
}

function onRefreshed(token: string | null) {
    refreshSubscribers.forEach(cb => cb(token))
    refreshSubscribers = []
}

async function attemptTokenRefresh(): Promise<string | null> {
    // Try Supabase session refresh first (primary auth)
    try {
        const { data, error } = await supabase.auth.refreshSession()
        if (!error && data.session) {
            const newToken = data.session.access_token
            await setAuthToken(newToken)
            await setRefreshToken(data.session.refresh_token)
            return newToken
        }
    } catch {
        // Fall through to legacy refresh
    }

    // Fallback: legacy API refresh
    const refreshToken = await getRefreshToken()
    if (!refreshToken) return null

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
        })
        if (!response.ok) return null
        const data = await response.json() as { access_token?: string; token?: string }
        const newToken = data.access_token ?? data.token ?? null
        if (newToken) await setAuthToken(newToken)
        return newToken
    } catch {
        return null
    }
}

// ─── HTTP client ──────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 15_000
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 800

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export async function apiFetch<T = unknown>(
    path: string,
    options: RequestInit & { timeoutMs?: number; _isRetry?: boolean } = {}
): Promise<T> {
    const token = await getAuthToken()
    const url = `${API_BASE_URL}${path}`
    const { timeoutMs = DEFAULT_TIMEOUT_MS, _isRetry = false, ...fetchOptions } = options
    const isGet = (fetchOptions.method || 'GET').toUpperCase() === 'GET'
    const cacheKey = `@api_cache:${path}`

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(fetchOptions.headers as Record<string, string> ?? {}),
    }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(url, { ...fetchOptions, headers, signal: controller.signal })
            clearTimeout(timeoutId)

            // ── 401 : tenter le refresh token ──────────────────
            if (response.status === 401 && !_isRetry) {
                let newToken: string | null

                if (isRefreshing) {
                    // Attendre que le refresh en cours se termine
                    newToken = await new Promise<string | null>(resolve => {
                        subscribeToRefresh(resolve)
                    })
                } else {
                    isRefreshing = true
                    newToken = await attemptTokenRefresh()
                    isRefreshing = false
                    onRefreshed(newToken)
                }

                if (newToken) {
                    // Réessayer avec le nouveau token
                    return apiFetch<T>(path, { ...options, _isRetry: true })
                } else {
                    await clearTokens()
                    throw new ApiError(401, 'Session expirée, veuillez vous reconnecter')
                }
            }

            if (!response.ok) {
                const err = await response.json().catch(() => ({ error: response.statusText }))
                throw new ApiError(
                    response.status,
                    (err as Record<string, string>).error ?? (err as Record<string, string>).message ?? 'Erreur inconnue',
                    err
                )
            }

            // 204 No Content
            if (response.status === 204) return undefined as unknown as T

            const jsonData = await response.json() as T

            // Cache successful GET responses
            if (isGet) {
                AsyncStorage.setItem(cacheKey, JSON.stringify(jsonData)).catch(() => { })
            }

            return jsonData
        } catch (err) {
            clearTimeout(timeoutId)
            if (err instanceof ApiError) throw err

            const isAbort = (err as Error).name === 'AbortError'
            lastError = isAbort ? new NetworkError('La requête a expiré') : (err as Error)

            // Retry uniquement sur erreur réseau, pas sur les dernières tentatives
            if (!isAbort && attempt < MAX_RETRIES) {
                await sleep(RETRY_DELAY_MS * (attempt + 1))
                continue
            }

            // Offline Fallback for GET queries
            if (isGet) {
                try {
                    const cached = await AsyncStorage.getItem(cacheKey)
                    if (cached) {
                        console.warn(`[API] Network failed for ${path}, returning cached data.`)
                        return JSON.parse(cached) as T
                    }
                } catch (cacheErr) {
                    // Ignore cache errors
                }
            }
        }
    }

    throw lastError instanceof NetworkError ? lastError : new NetworkError(lastError?.message)
}

// ─── Shorthand helpers ─────────────────────────────────────────

export const api = {
    get: <T>(path: string) => apiFetch<T>(path, { method: 'GET' }),
    post: <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
    patch: <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
    put: <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
    delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
}
