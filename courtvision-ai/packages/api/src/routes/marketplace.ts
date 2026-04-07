import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { MarketplaceService } from '../services/marketplace.service'

/**
 * Marketplace Routes — Marketplace de Drills (V6.0)
 *
 * Endpoints :
 * - GET  /drills              → Catalogue de drills
 * - GET  /drills/:id          → Détail d'un drill pack
 * - GET  /featured            → Drills en vedette
 * - GET  /trending            → Tendances
 * - GET  /categories          → Catégories
 * - POST /drills/:id/purchase → Acheter un drill pack
 * - GET  /my-purchases        → Mes achats
 * - POST /publish             → Publier un drill pack (coach)
 * - PUT  /drills/:id          → Modifier un drill publié
 * - GET  /my-published        → Mes drills publiés
 * - GET  /earnings            → Revenus créateur
 * - POST /drills/:id/review   → Laisser un avis
 * - GET  /drills/:id/reviews  → Avis d'un drill
 * - GET  /creators/:id        → Profil créateur
 * - GET  /creators/:id/follow → Etat d'abonnement au créateur
 * - POST /creators/:id/follow → S'abonner au créateur
 * - DELETE /creators/:id/follow → Se désabonner du créateur
 * - GET  /stats               → Stats marketplace
 */

const drillsQuerySchema = z.object({
    category: z.enum([
        'shooting', 'ball_handling', 'defense', 'conditioning',
        'footwork', 'mental', 'team', 'post_moves', 'passing', 'agility'
    ]).optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'elite']).optional(),
    search: z.string().max(100).optional(),
    sort: z.enum(['popular', 'newest', 'rating', 'price_asc', 'price_desc']).default('popular'),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
})

const publishSchema = z.object({
    title: z.string().min(3).max(200),
    description: z.string().min(10).max(2000),
    category: z.enum([
        'shooting', 'ball_handling', 'defense', 'conditioning',
        'footwork', 'mental', 'team', 'post_moves', 'passing', 'agility'
    ]),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'elite']),
    equipment: z.array(z.enum([
        'basketball', 'cones', 'resistance_band', 'ladder',
        'weighted_ball', 'shooting_machine', 'none'
    ])),
    priceCents: z.number().min(0).max(9999),
    tags: z.array(z.string().max(30)).max(10),
    items: z.array(z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(1000),
        instructions: z.array(z.string()),
        durationMin: z.number().min(1).max(120),
        videoUrl: z.string().url().optional(),
        difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'elite']),
        reps: z.number().min(1).optional(),
        sets: z.number().min(1).optional(),
        restSec: z.number().min(0).optional(),
        tips: z.array(z.string()),
    })).min(1).max(50),
})

const reviewSchema = z.object({
    rating: z.number().min(1).max(5),
    comment: z.string().max(1000).default(''),
})

const packIdSchema = z.object({
    id: z.string().uuid(),
})

const creatorIdSchema = z.object({
    id: z.string().uuid(),
})

export default async function marketplaceRoutes(fastify: FastifyInstance) {
    fastify.addHook('preValidation', fastify.authenticate)

    const marketplaceService = new MarketplaceService(fastify.supabase)

    // ==========================================
    // GET /drills — Catalogue de drills
    // ==========================================
    fastify.get('/drills', async (request, reply) => {
        try {
            const user = request.user!
            const query = drillsQuerySchema.parse(request.query)

            const result = await marketplaceService.getDrills({ ...query, userId: user.id })
            return { success: true, data: result.packs, total: result.total }
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Invalid query', details: error.errors })
            }
            request.log.error({ err: error }, 'Marketplace drills failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /drills/:id — Détail d'un drill pack
    // ==========================================
    fastify.get('/drills/:id', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = packIdSchema.parse(request.params)

            const pack = await marketplaceService.getDrillPack(id, user.id)
            return { success: true, data: pack }
        } catch (error: any) {
            if (error.message.includes('not found')) return reply.code(404).send({ error: error.message })
            request.log.error({ err: error }, 'Marketplace drill detail failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /featured — Drills en vedette
    // ==========================================
    fastify.get('/featured', async (_request, reply) => {
        try {
            const featured = await marketplaceService.getFeatured()
            return { success: true, data: featured }
        } catch (error: any) {
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /trending — Tendances
    // ==========================================
    fastify.get('/trending', async (_request, reply) => {
        try {
            const trending = await marketplaceService.getTrending()
            return { success: true, data: trending }
        } catch (error: any) {
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /categories — Catégories
    // ==========================================
    fastify.get('/categories', async (_request, reply) => {
        try {
            const categories = await marketplaceService.getCategories()
            return { success: true, data: categories }
        } catch (error: any) {
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /drills/:id/purchase — Acheter un drill pack
    // ==========================================
    fastify.post('/drills/:id/purchase', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = packIdSchema.parse(request.params)

            const purchase = await marketplaceService.purchasePack(user.id, id)
            return { success: true, data: purchase }
        } catch (error: any) {
            if (error.message.includes('Already purchased')) {
                return reply.code(409).send({ error: error.message })
            }
            if (error.message.includes('not found')) return reply.code(404).send({ error: error.message })
            request.log.error({ err: error }, 'Marketplace purchase failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /my-purchases — Mes achats
    // ==========================================
    fastify.get('/my-purchases', async (request, reply) => {
        try {
            const user = request.user!
            const purchases = await marketplaceService.getMyPurchases(user.id)
            return { success: true, data: purchases }
        } catch (error: any) {
            request.log.error({ err: error }, 'Marketplace purchases failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /publish — Publier un drill pack
    // ==========================================
    fastify.post('/publish', async (request, reply) => {
        try {
            const user = request.user!
            const payload = publishSchema.parse(request.body)

            const pack = await marketplaceService.publishDrillPack(user.id, payload)
            return { success: true, data: pack }
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Invalid drill pack data', details: error.errors })
            }
            request.log.error({ err: error }, 'Marketplace publish failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // PUT /drills/:id — Modifier un drill publié
    // ==========================================
    fastify.put('/drills/:id', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = packIdSchema.parse(request.params)
            const updates = publishSchema.partial().parse(request.body)

            const pack = await marketplaceService.updateDrillPack(user.id, id, updates as any)
            return { success: true, data: pack }
        } catch (error: any) {
            if (error.message.includes('Not authorized')) return reply.code(403).send({ error: error.message })
            request.log.error({ err: error }, 'Marketplace update failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /my-published — Mes drills publiés
    // ==========================================
    fastify.get('/my-published', async (request, reply) => {
        try {
            const user = request.user!
            const packs = await marketplaceService.getMyPublished(user.id)
            return { success: true, data: packs }
        } catch (error: any) {
            request.log.error({ err: error }, 'Marketplace my-published failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /earnings — Revenus créateur
    // ==========================================
    fastify.get('/earnings', async (request, reply) => {
        try {
            const user = request.user!
            const earnings = await marketplaceService.getEarnings(user.id)
            return { success: true, data: earnings }
        } catch (error: any) {
            request.log.error({ err: error }, 'Marketplace earnings failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /drills/:id/review — Laisser un avis
    // ==========================================
    fastify.post('/drills/:id/review', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = packIdSchema.parse(request.params)
            const { rating, comment } = reviewSchema.parse(request.body)

            const review = await marketplaceService.addReview(user.id, id, rating, comment)
            return { success: true, data: review }
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Invalid review', details: error.errors })
            }
            if (error.message.includes('must purchase')) return reply.code(403).send({ error: error.message })
            if (error.message.includes('already reviewed')) return reply.code(409).send({ error: error.message })
            request.log.error({ err: error }, 'Marketplace review failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /drills/:id/reviews — Avis d'un drill
    // ==========================================
    fastify.get('/drills/:id/reviews', async (request, reply) => {
        try {
            const { id } = packIdSchema.parse(request.params)
            const reviews = await marketplaceService.getReviews(id)
            return { success: true, data: reviews }
        } catch (error: any) {
            request.log.error({ err: error }, 'Marketplace reviews failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /creators/:id — Profil créateur
    // ==========================================
    fastify.get('/creators/:id', async (request, reply) => {
        try {
            const { id } = creatorIdSchema.parse(request.params)
            const profile = await marketplaceService.getCreatorProfile(id)
            if (!profile) return reply.code(404).send({ error: 'Creator not found' })
            return { success: true, data: profile }
        } catch (error: any) {
            request.log.error({ err: error }, 'Marketplace creator profile failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /creators/:id/follow — Etat follow
    // ==========================================
    fastify.get('/creators/:id/follow', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = creatorIdSchema.parse(request.params)

            const state = await marketplaceService.getCreatorFollowState(user.id, id)
            return { success: true, data: state }
        } catch (error: any) {
            if (error.message.includes('not found')) return reply.code(404).send({ error: error.message })
            request.log.error({ err: error }, 'Marketplace creator follow state failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /creators/:id/follow — Follow créateur
    // ==========================================
    fastify.post('/creators/:id/follow', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = creatorIdSchema.parse(request.params)

            const state = await marketplaceService.followCreator(user.id, id)
            return { success: true, data: state }
        } catch (error: any) {
            if (error.message.includes('Cannot follow yourself')) return reply.code(400).send({ error: error.message })
            if (error.message.includes('not found')) return reply.code(404).send({ error: error.message })
            request.log.error({ err: error }, 'Marketplace creator follow failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // DELETE /creators/:id/follow — Unfollow créateur
    // ==========================================
    fastify.delete('/creators/:id/follow', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = creatorIdSchema.parse(request.params)

            const state = await marketplaceService.unfollowCreator(user.id, id)
            return { success: true, data: state }
        } catch (error: any) {
            if (error.message.includes('not found')) return reply.code(404).send({ error: error.message })
            request.log.error({ err: error }, 'Marketplace creator unfollow failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /stats — Stats marketplace
    // ==========================================
    fastify.get('/stats', async (_request, reply) => {
        try {
            const stats = await marketplaceService.getStats()
            return { success: true, data: stats }
        } catch (error: any) {
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /drills/:id/wishlist — Ajouter / retirer de la wishlist
    // ==========================================
    fastify.post('/drills/:id/wishlist', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = packIdSchema.parse(request.params)

            const result = await marketplaceService.toggleWishlist(user.id, id)
            return { success: true, data: result }
        } catch (error: any) {
            if (error.message.includes('not found')) return reply.code(404).send({ error: error.message })
            request.log.error({ err: error }, 'Marketplace wishlist failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /wishlist — Ma wishlist
    // ==========================================
    fastify.get('/wishlist', async (request, reply) => {
        try {
            const user = request.user!
            const wishlist = await marketplaceService.getWishlist(user.id)
            return { success: true, data: wishlist }
        } catch (error: any) {
            request.log.error({ err: error }, 'Marketplace wishlist failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /drills/:id/reviews/:reviewId/helpful — Voter utile
    // ==========================================
    fastify.post('/drills/:id/reviews/:reviewId/helpful', async (request, reply) => {
        try {
            const { reviewId } = z.object({ reviewId: z.string().uuid() }).parse(request.params)

            await marketplaceService.markReviewHelpful(reviewId)
            return { success: true, message: 'Review marked as helpful' }
        } catch (error: any) {
            request.log.error({ err: error }, 'Marketplace helpful vote failed')
            return reply.code(500).send({ error: error.message })
        }
    })
}
