import { FastifyInstance } from 'fastify'

export const XP_PER_LEVEL = 100

export function levelFromXp(xp: number): number {
    return Math.floor(xp / XP_PER_LEVEL) + 1
}

export function xpForAction(action: string): number {
    const XP_MAP: Record<string, number> = {
        session_complete: 15,
        challenge_joined: 5,
        challenge_won: 50,
        follow: 2,
        badge_earned: 0,
        highlight_shared: 10,
    }
    return XP_MAP[action] ?? 5
}

export async function addXpAndActivity(
    fastify: FastifyInstance,
    userId: string,
    type: string,
    title: string,
    metadata: Record<string, any> = {}
) {
    const xp = xpForAction(type)

    await fastify.supabase.from('activity_feed').insert({
        user_id: userId, type, title, description: null, metadata,
    })

    if (xp > 0) {
        const { data: profile } = await fastify.supabase
            .from('public_profiles')
            .select('xp, level')
            .eq('user_id', userId)
            .single()

        const currentXp = (profile?.xp || 0) + xp
        const newLevel = levelFromXp(currentXp)
        const oldLevel = profile?.level || 1

        await fastify.supabase
            .from('public_profiles')
            .upsert({ 
                user_id: userId, 
                xp: currentXp, 
                level: newLevel, 
                updated_at: new Date().toISOString() 
            }, { onConflict: 'user_id' })

        if (newLevel > oldLevel) {
            await fastify.supabase.from('activity_feed').insert({
                user_id: userId, type: 'level_up',
                title: `A atteint le niveau ${newLevel} ! 🎉`,
                metadata: { level: newLevel, xp: currentXp },
            })

            await fastify.supabase.from('notifications').insert({
                user_id: userId, type: 'system',
                title: 'Level Up ! 🎉',
                body: `Tu as atteint le niveau ${newLevel} !`,
                metadata: { level: newLevel },
            })
        }
    }
}
