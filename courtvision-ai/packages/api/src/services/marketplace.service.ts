/**
 * Marketplace Service — Marketplace de Drills (V6.0)
 *
 * Gère la publication, l'achat et la gestion des drill packs.
 * Revenue share 70/30 via Stripe Connect.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import pino from 'pino'
import type {
    DrillPack, DrillPackItem, DrillReview, CreatorProfile,
    PurchaseRecord, MarketplaceStats, DrillPackCreatePayload,
    DrillCategory, DrillDifficulty,
} from '@courtvision/shared'

const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

const COMMISSION_PCT = parseInt(process.env.MARKETPLACE_COMMISSION_PCT || '30', 10)

export class MarketplaceService {
    constructor(private supabase: SupabaseClient) {}

    // ══════════════════════════════
    // Catalogue / Browsing
    // ══════════════════════════════

    /**
     * Get published drill packs with optional filters
     */
    async getDrills(options: {
        category?: DrillCategory
        difficulty?: DrillDifficulty
        search?: string
        sort?: 'popular' | 'newest' | 'rating' | 'price_asc' | 'price_desc'
        page?: number
        limit?: number
        userId?: string
    } = {}): Promise<{ packs: DrillPack[]; total: number }> {
        const { category, difficulty, search, sort = 'popular', page = 1, limit = 20, userId } = options

        let query = this.supabase
            .from('drill_packs')
            .select(`
                *, 
                creator_profiles!inner ( user_id, display_name, avatar_url, verified )
            `, { count: 'exact' })
            .eq('status', 'published')

        if (category) query = query.eq('category', category)
        if (difficulty) query = query.eq('difficulty', difficulty)
        if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,tags.cs.{${search}}`)

        switch (sort) {
            case 'popular': query = query.order('sales_count', { ascending: false }); break
            case 'newest': query = query.order('created_at', { ascending: false }); break
            case 'rating': query = query.order('rating', { ascending: false }); break
            case 'price_asc': query = query.order('price_cents', { ascending: true }); break
            case 'price_desc': query = query.order('price_cents', { ascending: false }); break
        }

        query = query.range((page - 1) * limit, page * limit - 1)

        const { data, error, count } = await query

        if (error) throw new Error(`Failed to fetch drills: ${error.message}`)

        // Check purchases for current user
        let purchasedIds = new Set<string>()
        if (userId) {
            const { data: purchases } = await this.supabase
                .from('drill_purchases')
                .select('pack_id')
                .eq('user_id', userId)

            purchasedIds = new Set((purchases || []).map((p: any) => p.pack_id))
        }

        const packs: DrillPack[] = (data || []).map((d: any) => this.mapPack(d, purchasedIds.has(d.id)))

        return { packs, total: count || 0 }
    }

    /**
     * Get a single drill pack with items
     */
    async getDrillPack(packId: string, userId?: string): Promise<DrillPack & { items: DrillPackItem[] }> {
        const { data, error } = await this.supabase
            .from('drill_packs')
            .select(`
                *, 
                creator_profiles!inner ( user_id, display_name, avatar_url, verified ),
                drill_pack_items ( * )
            `)
            .eq('id', packId)
            .single()

        if (error || !data) throw new Error('Drill pack not found')

        let isPurchased = false
        if (userId) {
            const { data: purchase } = await this.supabase
                .from('drill_purchases')
                .select('id')
                .eq('user_id', userId)
                .eq('pack_id', packId)
                .single()
            isPurchased = !!purchase
        }

        const pack = this.mapPack(data, isPurchased)
        const items: DrillPackItem[] = (data.drill_pack_items || [])
            .sort((a: any, b: any) => a.position - b.position)
            .map((item: any) => ({
                id: item.id,
                packId: item.pack_id,
                title: item.title,
                description: item.description,
                instructions: item.instructions || [],
                durationMin: item.duration_min,
                videoUrl: isPurchased || pack.priceCents === 0 ? item.video_url : undefined,
                thumbnailUrl: item.thumbnail_url,
                difficulty: item.difficulty,
                reps: item.reps,
                sets: item.sets,
                restSec: item.rest_sec,
                position: item.position,
                tips: item.tips || [],
            }))

        return { ...pack, items }
    }

    /**
     * Get featured drills
     */
    async getFeatured(): Promise<DrillPack[]> {
        const { data, error } = await this.supabase
            .from('drill_packs')
            .select('*, creator_profiles!inner ( user_id, display_name, avatar_url, verified )')
            .eq('status', 'published')
            .eq('is_featured', true)
            .order('sales_count', { ascending: false })
            .limit(10)

        if (error) throw error
        return (data || []).map((d: any) => this.mapPack(d))
    }

    /**
     * Get trending drills (most sales in last 7 days)
     */
    async getTrending(): Promise<DrillPack[]> {
        // Simplified: just get top by sales
        const { data, error } = await this.supabase
            .from('drill_packs')
            .select('*, creator_profiles!inner ( user_id, display_name, avatar_url, verified )')
            .eq('status', 'published')
            .order('sales_count', { ascending: false })
            .limit(10)

        if (error) throw error
        return (data || []).map((d: any) => this.mapPack(d))
    }

    /**
     * Get categories with counts
     */
    async getCategories(): Promise<{ name: DrillCategory; count: number }[]> {
        const { data, error } = await this.supabase
            .from('drill_packs')
            .select('category')
            .eq('status', 'published')

        if (error) throw error

        const counts: Record<string, number> = {}
        for (const d of (data || [])) {
            counts[d.category] = (counts[d.category] || 0) + 1
        }

        return Object.entries(counts)
            .map(([name, count]) => ({ name: name as DrillCategory, count }))
            .sort((a, b) => b.count - a.count)
    }

    // ══════════════════════════════
    // Purchase
    // ══════════════════════════════

    /**
     * Purchase a drill pack
     */
    async purchasePack(userId: string, packId: string, stripePaymentId?: string): Promise<PurchaseRecord> {
        // Check not already purchased
        const { data: existing } = await this.supabase
            .from('drill_purchases')
            .select('id')
            .eq('user_id', userId)
            .eq('pack_id', packId)
            .single()

        if (existing) throw new Error('Already purchased this drill pack')

        // Get pack info
        const { data: pack, error: packErr } = await this.supabase
            .from('drill_packs')
            .select('id, title, price_cents, currency, creator_id, sales_count')
            .eq('id', packId)
            .eq('status', 'published')
            .single()

        if (packErr || !pack) throw new Error('Drill pack not found')

        // Insert purchase record
        const { data: purchase, error: purchaseErr } = await this.supabase
            .from('drill_purchases')
            .insert({
                user_id: userId,
                pack_id: packId,
                price_paid: pack.price_cents,
                currency: pack.currency,
                stripe_payment_id: stripePaymentId || null,
            })
            .select()
            .single()

        if (purchaseErr || !purchase) throw new Error(`Purchase failed: ${purchaseErr?.message || 'No data returned'}`)

        // Update sales count
        await this.supabase
            .from('drill_packs')
            .update({ sales_count: (pack.sales_count || 0) + 1 })
            .eq('id', packId)

        // Update creator earnings
        const creatorEarnings = Math.round(pack.price_cents * (100 - COMMISSION_PCT) / 100)
        // Update creator earnings
        try {
            await this.supabase.rpc('increment_creator_earnings', {
                p_creator_id: pack.creator_id,
                p_amount: creatorEarnings,
            })
        } catch {
            // Fallback: manual update
            const { data: creator } = await this.supabase
                .from('creator_profiles')
                .select('total_earnings, total_sales')
                .eq('id', pack.creator_id)
                .single()

            if (creator) {
                await this.supabase.from('creator_profiles').update({
                    total_earnings: (creator.total_earnings || 0) + creatorEarnings,
                    total_sales: (creator.total_sales || 0) + 1,
                }).eq('id', pack.creator_id)
            }
        }

        logger.info({ userId, packId, price: pack.price_cents }, '[Marketplace] Pack purchased')

        return {
            id: purchase.id,
            userId: purchase.user_id,
            packId: purchase.pack_id,
            packTitle: pack.title,
            pricePaid: purchase.price_paid,
            currency: purchase.currency,
            stripePaymentId: purchase.stripe_payment_id || '',
            purchasedAt: purchase.purchased_at,
        }
    }

    /**
     * Get user's purchases
     */
    async getMyPurchases(userId: string): Promise<PurchaseRecord[]> {
        const { data, error } = await this.supabase
            .from('drill_purchases')
            .select('*, drill_packs ( title )')
            .eq('user_id', userId)
            .order('purchased_at', { ascending: false })

        if (error) throw error

        return (data || []).map((p: any) => ({
            id: p.id,
            userId: p.user_id,
            packId: p.pack_id,
            packTitle: p.drill_packs?.title || 'Unknown',
            pricePaid: p.price_paid,
            currency: p.currency,
            stripePaymentId: p.stripe_payment_id || '',
            purchasedAt: p.purchased_at,
        }))
    }

    // ══════════════════════════════
    // Creator Tools
    // ══════════════════════════════

    /**
     * Publish a new drill pack (creator)
     */
    async publishDrillPack(userId: string, payload: DrillPackCreatePayload): Promise<DrillPack> {
        // Get or create creator profile
        let { data: creator } = await this.supabase
            .from('creator_profiles')
            .select('id')
            .eq('user_id', userId)
            .single()

        if (!creator) {
            const { data: user } = await this.supabase
                .from('users')
                .select('username, full_name, avatar_url')
                .eq('id', userId)
                .single()

            const { data: newCreator, error: createErr } = await this.supabase
                .from('creator_profiles')
                .insert({
                    user_id: userId,
                    display_name: user?.full_name || user?.username || 'Creator',
                    avatar_url: user?.avatar_url,
                })
                .select()
                .single()

            if (createErr) throw new Error(`Failed to create creator profile: ${createErr.message}`)
            creator = newCreator
        }

        // Calculate totals
        const totalDuration = payload.items.reduce((sum, i) => sum + i.durationMin, 0)
        const drillCount = payload.items.length

        // Insert pack
        const { data: pack, error: packErr } = await this.supabase
            .from('drill_packs')
            .insert({
                creator_id: creator!.id,
                title: payload.title,
                description: payload.description,
                category: payload.category,
                difficulty: payload.difficulty,
                equipment: payload.equipment,
                price_cents: payload.priceCents,
                tags: payload.tags,
                total_duration: totalDuration,
                drill_count: drillCount,
                status: 'review', // Pending review
            })
            .select('*, creator_profiles!inner ( user_id, display_name, avatar_url, verified )')
            .single()

        if (packErr || !pack) throw new Error(`Failed to publish drill pack: ${packErr?.message}`)

        // Insert items
        const itemRows = payload.items.map((item, index) => ({
            pack_id: pack.id,
            title: item.title,
            description: item.description,
            instructions: item.instructions,
            duration_min: item.durationMin,
            video_url: item.videoUrl,
            difficulty: item.difficulty,
            reps: item.reps,
            sets: item.sets,
            rest_sec: item.restSec,
            position: index,
            tips: item.tips,
        }))

        await this.supabase.from('drill_pack_items').insert(itemRows)

        logger.info({ packId: pack.id, creator: userId, drills: drillCount }, '[Marketplace] Pack published')

        return this.mapPack(pack)
    }

    /**
     * Update a drill pack (creator)
     */
    async updateDrillPack(userId: string, packId: string, updates: Partial<DrillPackCreatePayload>): Promise<DrillPack> {
        // Verify ownership
        const { data: pack } = await this.supabase
            .from('drill_packs')
            .select('id, creator_id, creator_profiles!inner ( user_id )')
            .eq('id', packId)
            .single()

        if (!pack || (pack as any).creator_profiles.user_id !== userId) {
            throw new Error('Not authorized to update this pack')
        }

        const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
        if (updates.title) updateData.title = updates.title
        if (updates.description) updateData.description = updates.description
        if (updates.category) updateData.category = updates.category
        if (updates.difficulty) updateData.difficulty = updates.difficulty
        if (updates.equipment) updateData.equipment = updates.equipment
        if (updates.priceCents !== undefined) updateData.price_cents = updates.priceCents
        if (updates.tags) updateData.tags = updates.tags

        const { data: updated, error } = await this.supabase
            .from('drill_packs')
            .update(updateData)
            .eq('id', packId)
            .select('*, creator_profiles!inner ( user_id, display_name, avatar_url, verified )')
            .single()

        if (error || !updated) throw new Error(`Failed to update: ${error?.message || 'No data returned'}`)
        return this.mapPack(updated)
    }

    /**
     * Get creator's published packs
     */
    async getMyPublished(userId: string): Promise<DrillPack[]> {
        const { data: creator } = await this.supabase
            .from('creator_profiles')
            .select('id')
            .eq('user_id', userId)
            .single()

        if (!creator) return []

        const { data, error } = await this.supabase
            .from('drill_packs')
            .select('*, creator_profiles!inner ( user_id, display_name, avatar_url, verified )')
            .eq('creator_id', creator.id)
            .order('created_at', { ascending: false })

        if (error) throw error
        return (data || []).map((d: any) => this.mapPack(d))
    }

    /**
     * Get creator earnings
     */
    async getEarnings(userId: string): Promise<{
        totalEarnings: number
        totalSales: number
        commissionPct: number
        packs: { packId: string; title: string; sales: number; revenue: number }[]
    }> {
        const { data: creator } = await this.supabase
            .from('creator_profiles')
            .select('total_earnings, total_sales')
            .eq('user_id', userId)
            .single()

        const myPacks = await this.getMyPublished(userId)
        const packs = myPacks.map(p => ({
            packId: p.id,
            title: p.title,
            sales: p.salesCount,
            revenue: Math.round(p.priceCents * p.salesCount * (100 - COMMISSION_PCT) / 100),
        }))

        return {
            totalEarnings: creator?.total_earnings || 0,
            totalSales: creator?.total_sales || 0,
            commissionPct: COMMISSION_PCT,
            packs,
        }
    }

    // ══════════════════════════════
    // Reviews
    // ══════════════════════════════

    /**
     * Add a review
     */
    async addReview(userId: string, packId: string, rating: number, comment: string): Promise<DrillReview> {
        // Verify user has purchased the pack
        const { data: purchase } = await this.supabase
            .from('drill_purchases')
            .select('id')
            .eq('user_id', userId)
            .eq('pack_id', packId)
            .single()

        if (!purchase) throw new Error('You must purchase this pack before reviewing')

        const { data: user } = await this.supabase
            .from('users')
            .select('username, avatar_url')
            .eq('id', userId)
            .single()

        const { data: review, error } = await this.supabase
            .from('drill_reviews')
            .insert({
                user_id: userId,
                pack_id: packId,
                rating,
                comment,
            })
            .select()
            .single()

        if (error || !review) {
            if (error?.code === '23505') throw new Error('You already reviewed this pack')
            throw new Error(`Failed to add review: ${error?.message || 'No data returned'}`)
        }

        // Update pack average rating
        const { data: allReviews } = await this.supabase
            .from('drill_reviews')
            .select('rating')
            .eq('pack_id', packId)

        if (allReviews && allReviews.length > 0) {
            const avgRating = allReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / allReviews.length
            await this.supabase.from('drill_packs').update({
                rating: Math.round(avgRating * 10) / 10,
                review_count: allReviews.length,
            }).eq('id', packId)
        }

        return {
            id: review.id,
            userId: review.user_id,
            username: user?.username || 'Unknown',
            avatarUrl: user?.avatar_url,
            packId: review.pack_id,
            rating: review.rating,
            comment: review.comment,
            helpfulCount: 0,
            createdAt: review.created_at,
        }
    }

    /**
     * Get reviews for a pack
     */
    async getReviews(packId: string): Promise<DrillReview[]> {
        const { data, error } = await this.supabase
            .from('drill_reviews')
            .select('*, users!inner ( username, avatar_url )')
            .eq('pack_id', packId)
            .order('created_at', { ascending: false })

        if (error) throw error

        return (data || []).map((r: any) => ({
            id: r.id,
            userId: r.user_id,
            username: r.users.username,
            avatarUrl: r.users.avatar_url,
            packId: r.pack_id,
            rating: r.rating,
            comment: r.comment,
            helpfulCount: r.helpful_count || 0,
            createdAt: r.created_at,
        }))
    }

    /**
     * Get a creator profile
     */
    async getCreatorProfile(creatorUserId: string): Promise<CreatorProfile | null> {
        const { data, error } = await this.supabase
            .from('creator_profiles')
            .select('*')
            .eq('user_id', creatorUserId)
            .single()

        if (error || !data) return null

        // Get published packs count & avg rating
        const { data: packs } = await this.supabase
            .from('drill_packs')
            .select('rating')
            .eq('creator_id', data.id)
            .eq('status', 'published')

        const avgRating = packs && packs.length > 0
            ? packs.reduce((sum: number, p: any) => sum + p.rating, 0) / packs.length
            : 0

        const { count: followersCount } = await this.supabase
            .from('user_follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', data.user_id)

        return {
            id: data.id,
            userId: data.user_id,
            displayName: data.display_name,
            bio: data.bio || '',
            avatarUrl: data.avatar_url,
            verified: data.verified,
            totalEarnings: data.total_earnings,
            totalSales: data.total_sales,
            publishedPacks: packs?.length || 0,
            avgRating: Math.round(avgRating * 10) / 10,
            followers: followersCount || 0,
            specialties: data.specialties || [],
            credentials: data.credentials || [],
            createdAt: data.created_at,
        }
    }

    /**
     * Get marketplace stats
     */
    async getStats(): Promise<MarketplaceStats> {
        const featured = await this.getFeatured()
        const trending = await this.getTrending()
        const categories = await this.getCategories()

        const { count: totalPacks } = await this.supabase
            .from('drill_packs')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'published')

        const { count: totalCreators } = await this.supabase
            .from('creator_profiles')
            .select('id', { count: 'exact', head: true })

        // Top creators
        const { data: topCreatorData } = await this.supabase
            .from('creator_profiles')
            .select('*')
            .order('total_sales', { ascending: false })
            .limit(5)

        const followerCounts = await this.getFollowerCountsByUserIds(
            (topCreatorData || []).map((creator: any) => creator.user_id),
        )

        const topCreators: CreatorProfile[] = (topCreatorData || []).map((c: any) => ({
            id: c.id,
            userId: c.user_id,
            displayName: c.display_name,
            bio: c.bio || '',
            avatarUrl: c.avatar_url,
            verified: c.verified,
            totalEarnings: c.total_earnings,
            totalSales: c.total_sales,
            publishedPacks: 0,
            avgRating: 0,
            followers: followerCounts[c.user_id] || 0,
            specialties: c.specialties || [],
            credentials: c.credentials || [],
            createdAt: c.created_at,
        }))

        return {
            totalPacks: totalPacks || 0,
            totalCreators: totalCreators || 0,
            featuredPacks: featured,
            trendingPacks: trending,
            topCreators,
            categories,
        }
    }

    // ── Private ──

    /**
     * Toggle wishlist for a drill pack
     */
    async toggleWishlist(userId: string, packId: string): Promise<{ wishlisted: boolean }> {
        // Check pack exists
        const { data: pack } = await this.supabase
            .from('drill_packs')
            .select('id')
            .eq('id', packId)
            .eq('status', 'published')
            .single()

        if (!pack) throw new Error('Drill pack not found')

        const { data: existing } = await this.supabase
            .from('drill_wishlist')
            .select('id')
            .eq('user_id', userId)
            .eq('pack_id', packId)
            .single()

        if (existing) {
            await this.supabase.from('drill_wishlist').delete().eq('id', existing.id)
            return { wishlisted: false }
        }

        await this.supabase.from('drill_wishlist').insert({ user_id: userId, pack_id: packId })
        return { wishlisted: true }
    }

    /**
     * Get user's wishlist
     */
    async getWishlist(userId: string): Promise<DrillPack[]> {
        const { data, error } = await this.supabase
            .from('drill_wishlist')
            .select('pack_id, drill_packs (*, creator_profiles!inner ( user_id, display_name, avatar_url, verified ))')
            .eq('user_id', userId)
            .order('added_at', { ascending: false })

        if (error) throw error
        return (data || [])
            .filter((d: any) => d.drill_packs)
            .map((d: any) => this.mapPack(d.drill_packs))
    }

    /**
     * Mark a review as helpful (increment counter)
     */
    async markReviewHelpful(reviewId: string): Promise<void> {
        const { data: review } = await this.supabase
            .from('drill_reviews')
            .select('helpful_count')
            .eq('id', reviewId)
            .single()

        if (!review) throw new Error('Review not found')

        await this.supabase
            .from('drill_reviews')
            .update({ helpful_count: (review.helpful_count || 0) + 1 })
            .eq('id', reviewId)
    }

    private async getFollowerCountsByUserIds(userIds: string[]): Promise<Record<string, number>> {
        const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)))
        const counts: Record<string, number> = {}

        await Promise.all(uniqueUserIds.map(async (userId) => {
            const { count } = await this.supabase
                .from('user_follows')
                .select('*', { count: 'exact', head: true })
                .eq('following_id', userId)

            counts[userId] = count || 0
        }))

        return counts
    }

    private mapPack(data: any, isPurchased = false): DrillPack {
        const creator = data.creator_profiles || {}
        return {
            id: data.id,
            creatorId: data.creator_id,
            creatorName: creator.display_name || 'Unknown',
            creatorAvatarUrl: creator.avatar_url,
            creatorVerified: creator.verified || false,
            title: data.title,
            description: data.description,
            coverImageUrl: data.cover_image_url,
            category: data.category,
            difficulty: data.difficulty,
            equipment: data.equipment || [],
            priceCents: data.price_cents,
            currency: data.currency || 'usd',
            rating: data.rating || 0,
            reviewCount: data.review_count || 0,
            salesCount: data.sales_count || 0,
            totalDuration: data.total_duration || 0,
            drillCount: data.drill_count || 0,
            tags: data.tags || [],
            status: data.status,
            isPurchased,
            isFeatured: data.is_featured || false,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        }
    }
}
