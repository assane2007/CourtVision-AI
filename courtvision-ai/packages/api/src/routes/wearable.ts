import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { WearableService } from '../services/wearable.service'

/**
 * Wearable Routes — Apple Watch HRV Integration (V6.0)
 *
 * Endpoints :
 * - POST   /connect            → Connecter un device
 * - DELETE /disconnect          → Déconnecter un device
 * - GET    /devices             → Lister les devices connectés
 * - POST   /sync               → Sync batch des données wearable
 * - GET    /latest              → Dernières données
 * - GET    /hrv/trend           → Tendance HRV
 * - GET    /hrv/analysis        → Analyse HRV approfondie
 * - GET    /readiness           → Score de readiness enrichi
 * - GET    /training-load       → Charge d'entraînement
 * - GET    /training-load/history → Historique de charge
 * - GET    /dashboard           → Dashboard complet
 * - GET    /export              → Export données (JSON)
 * - GET    /alerts              → Alertes de fatigue / surcharge
 */

const connectSchema = z.object({
    platform: z.enum(['apple_watch', 'garmin', 'fitbit', 'whoop', 'samsung', 'other']),
    deviceName: z.string().min(1).max(100),
    model: z.string().max(100).optional(),
    firmwareVersion: z.string().max(50).optional(),
})

const disconnectSchema = z.object({
    deviceId: z.string().uuid(),
})

const syncSchema = z.object({
    deviceId: z.string().uuid(),
    platform: z.enum(['apple_watch', 'garmin', 'fitbit', 'whoop', 'samsung', 'other']),
    readings: z.array(z.object({
        type: z.enum([
            'heart_rate', 'hrv', 'resting_hr', 'vo2max', 'calories',
            'steps', 'sleep', 'blood_oxygen', 'respiratory_rate', 'body_temperature'
        ]),
        value: z.number(),
        unit: z.string(),
        recordedAt: z.string(),
        metadata: z.record(z.any()).optional(),
    })).min(1).max(1000),
    syncedAt: z.string(),
})

const trendQuerySchema = z.object({
    days: z.coerce.number().min(1).max(365).default(30),
})

const exportQuerySchema = z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    types: z.string().optional(), // comma-separated list of types
})

export default async function wearableRoutes(fastify: FastifyInstance) {
    fastify.addHook('preValidation', fastify.authenticate)

    const wearableService = new WearableService(fastify.supabase)

    // ==========================================
    // POST /connect — Connecter un device
    // ==========================================
    fastify.post('/connect', async (request, reply) => {
        try {
            const user = request.user!
            const { platform, deviceName, model } = connectSchema.parse(request.body)

            const device = await wearableService.connectDevice(user.id, platform, deviceName, model)
            return { success: true, data: device }
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Invalid input', details: error.errors })
            }
            request.log.error({ err: error }, 'Wearable connect failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // DELETE /disconnect — Déconnecter un device
    // ==========================================
    fastify.delete('/disconnect', async (request, reply) => {
        try {
            const user = request.user!
            const { deviceId } = disconnectSchema.parse(request.body)

            await wearableService.disconnectDevice(user.id, deviceId)
            return { success: true, message: 'Device disconnected' }
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Invalid input', details: error.errors })
            }
            request.log.error({ err: error }, 'Wearable disconnect failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /devices — Lister les devices
    // ==========================================
    fastify.get('/devices', async (request, reply) => {
        try {
            const user = request.user!
            const devices = await wearableService.getDevices(user.id)
            return { success: true, data: devices }
        } catch (error: any) {
            request.log.error({ err: error }, 'Wearable devices list failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /sync — Sync batch des données
    // ==========================================
    fastify.post('/sync', async (request, reply) => {
        try {
            const user = request.user!
            const payload = syncSchema.parse(request.body)

            const result = await wearableService.syncData(user.id, payload)
            return { success: true, data: result }
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Invalid sync payload', details: error.errors })
            }
            if (error.message.includes('not found')) return reply.code(404).send({ error: error.message })
            request.log.error({ err: error }, 'Wearable sync failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /latest — Dernières données
    // ==========================================
    fastify.get('/latest', async (request, reply) => {
        try {
            const user = request.user!
            const latest = await wearableService.getLatest(user.id)
            return { success: true, data: latest }
        } catch (error: any) {
            request.log.error({ err: error }, 'Wearable latest failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /hrv/trend — Tendance HRV
    // ==========================================
    fastify.get('/hrv/trend', async (request, reply) => {
        try {
            const user = request.user!
            const { days } = trendQuerySchema.parse(request.query)

            const trend = await wearableService.getHRVTrend(user.id, days)
            return { success: true, data: trend }
        } catch (error: any) {
            request.log.error({ err: error }, 'HRV trend failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /hrv/analysis — Analyse HRV approfondie
    // ==========================================
    fastify.get('/hrv/analysis', async (request, reply) => {
        try {
            const user = request.user!
            const { days } = trendQuerySchema.parse(request.query)

            const analysis = await wearableService.getHRVAnalysis(user.id, days)
            return { success: true, data: analysis }
        } catch (error: any) {
            request.log.error({ err: error }, 'HRV analysis failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /readiness — Score de readiness enrichi
    // ==========================================
    fastify.get('/readiness', async (request, reply) => {
        try {
            const user = request.user!
            const readiness = await wearableService.getReadiness(user.id)
            return { success: true, data: readiness }
        } catch (error: any) {
            request.log.error({ err: error }, 'Readiness failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /training-load — Charge d'entraînement
    // ==========================================
    fastify.get('/training-load', async (request, reply) => {
        try {
            const user = request.user!
            const load = await wearableService.getTrainingLoad(user.id)
            return { success: true, data: load }
        } catch (error: any) {
            request.log.error({ err: error }, 'Training load failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /training-load/history — Historique charge
    // ==========================================
    fastify.get('/training-load/history', async (request, reply) => {
        try {
            const user = request.user!
            const { days } = trendQuerySchema.parse(request.query)

            const history = await wearableService.getTrainingLoadHistory(user.id, days)
            return { success: true, data: history }
        } catch (error: any) {
            request.log.error({ err: error }, 'Training load history failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /dashboard — Dashboard complet
    // ==========================================
    fastify.get('/dashboard', async (request, reply) => {
        try {
            const user = request.user!
            const dashboard = await wearableService.getDashboard(user.id)
            return { success: true, data: dashboard }
        } catch (error: any) {
            request.log.error({ err: error }, 'Wearable dashboard failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /export — Export données wearable (JSON)
    // ==========================================
    fastify.get('/export', async (request, reply) => {
        try {
            const user = request.user!
            const query = exportQuerySchema.parse(request.query)
            const types = query.types?.split(',').map(t => t.trim()) || undefined

            const data = await wearableService.exportData(user.id, query.from, query.to, types)

            reply.header('Content-Type', 'application/json')
            reply.header('Content-Disposition', `attachment; filename=wearable_export_${Date.now()}.json`)
            return { success: true, data }
        } catch (error: any) {
            request.log.error({ err: error }, 'Wearable export failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /alerts — Alertes de fatigue / surcharge
    // ==========================================
    fastify.get('/alerts', async (request, reply) => {
        try {
            const user = request.user!
            const alerts = await wearableService.getAlerts(user.id)
            return { success: true, data: alerts }
        } catch (error: any) {
            request.log.error({ err: error }, 'Wearable alerts failed')
            return reply.code(500).send({ error: error.message })
        }
    })
}
