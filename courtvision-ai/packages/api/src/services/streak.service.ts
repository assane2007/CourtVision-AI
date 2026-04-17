import type { SupabaseClient } from '@supabase/supabase-js'

const DAY_MS = 24 * 60 * 60 * 1000
const STREAK_SESSION_LOOKBACK_DAYS = 730

type SessionRow = {
    created_at: string
}

function toUtcDayStart(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function dayDiff(later: Date, earlier: Date): number {
    return Math.round((later.getTime() - earlier.getTime()) / DAY_MS)
}

function normalizeSessionDays(rows: SessionRow[]): Date[] {
    const seen = new Set<string>()
    const days: Date[] = []

    for (const row of rows) {
        if (!row?.created_at) continue
        const parsed = new Date(row.created_at)
        if (Number.isNaN(parsed.getTime())) continue

        const day = toUtcDayStart(parsed)
        const key = day.toISOString().slice(0, 10)
        if (seen.has(key)) continue

        seen.add(key)
        days.push(day)
    }

    return days.sort((a, b) => b.getTime() - a.getTime())
}

function computeLongestStreak(days: Date[]): number {
    if (days.length === 0) return 0

    let longest = 1
    let running = 1

    for (let i = 1; i < days.length; i += 1) {
        const delta = dayDiff(days[i - 1], days[i])
        if (delta === 1) {
            running += 1
        } else {
            running = 1
        }
        longest = Math.max(longest, running)
    }

    return longest
}

function computeCurrentStreak(days: Date[], referenceDate: Date): number {
    if (days.length === 0) return 0

    const referenceDay = toUtcDayStart(referenceDate)
    const latestSessionDay = days[0]
    const gap = dayDiff(referenceDay, latestSessionDay)

    // If the user missed more than one day, streak is considered broken.
    if (gap > 1) return 0

    let current = 1
    for (let i = 1; i < days.length; i += 1) {
        const delta = dayDiff(days[i - 1], days[i])
        if (delta === 1) {
            current += 1
        } else {
            break
        }
    }

    return current
}

export type UserStreakSnapshot = {
    currentStreak: number
    longestStreak: number
    lastSessionAt: string | null
}

export async function recomputeUserStreak(
    supabase: SupabaseClient,
    userId: string,
    referenceDate: Date = new Date(),
): Promise<UserStreakSnapshot> {
    const since = new Date(referenceDate.getTime() - STREAK_SESSION_LOOKBACK_DAYS * DAY_MS).toISOString()

    const { data, error } = await supabase
        .from('sessions')
        .select('created_at')
        .eq('user_id', userId)
        .eq('status', 'complete')
        .gte('created_at', since)
        .order('created_at', { ascending: false })

    if (error) {
        throw error
    }

    const rows = (data ?? []) as SessionRow[]
    const days = normalizeSessionDays(rows)
    const currentStreak = computeCurrentStreak(days, referenceDate)
    const longestStreak = computeLongestStreak(days)
    const lastSessionAt = rows[0]?.created_at ?? null

    const { error: updateError } = await supabase
        .from('users')
        .update({
            streak: currentStreak,
            longest_streak: longestStreak,
            last_session_at: lastSessionAt,
        })
        .eq('id', userId)

    if (updateError) {
        throw updateError
    }

    return {
        currentStreak,
        longestStreak,
        lastSessionAt,
    }
}
