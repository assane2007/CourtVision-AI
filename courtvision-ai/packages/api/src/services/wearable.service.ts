/**
 * Wearable Service — Apple Watch HRV Integration (V6.0)
 *
 * Gère la synchronisation des données wearable (Apple Watch, Garmin, etc.),
 * l'analyse HRV, le calcul de readiness enrichi et la charge d'entraînement.
 */
import { SupabaseClient } from '@supabase/supabase-js'
import pino from 'pino'
import type {
    WearableDevice, WearableSyncPayload, WearableReading,
    HRVReading, WearableDashboard, ReadinessEnhanced,
    TrainingLoadPayload, WearablePlatform,
} from '@courtvision/shared'

const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

/** Optimal HRV baseline values by age group (rough reference) */
const HRV_BASELINE_DEFAULT = 50 // ms RMSSD, generic baseline
const RESTING_HR_BASELINE_DEFAULT = 65 // bpm

export class WearableService {
    constructor(private supabase: SupabaseClient) {}

    /**
     * Connect a new wearable device
     */
    async connectDevice(
        userId: string,
        platform: WearablePlatform,
        deviceName: string,
        model?: string
    ): Promise<WearableDevice> {
        // Deactivate any existing device of same platform
        await this.supabase
            .from('wearable_devices')
            .update({ is_active: false })
            .eq('user_id', userId)
            .eq('platform', platform)

        const { data, error } = await this.supabase
            .from('wearable_devices')
            .insert({
                user_id: userId,
                platform,
                device_name: deviceName,
                model,
                is_active: true,
            })
            .select()
            .single()

        if (error || !data) throw new Error(`Failed to connect device: ${error?.message || 'No data returned'}`)

        logger.info({ userId, platform, deviceName }, '[Wearable] Device connected')

        return {
            id: data.id,
            userId: data.user_id,
            platform: data.platform,
            deviceName: data.device_name,
            model: data.model,
            lastSyncAt: data.last_sync_at,
            isActive: data.is_active,
            connectedAt: data.connected_at,
        }
    }

    /**
     * List all devices for a user
     */
    async getDevices(userId: string): Promise<WearableDevice[]> {
        const { data, error } = await this.supabase
            .from('wearable_devices')
            .select('*')
            .eq('user_id', userId)
            .order('connected_at', { ascending: false })

        if (error) throw new Error(`Failed to fetch devices: ${error.message}`)

        return (data || []).map((d: any) => ({
            id: d.id,
            userId: d.user_id,
            platform: d.platform,
            deviceName: d.device_name,
            model: d.model,
            lastSyncAt: d.last_sync_at,
            isActive: d.is_active,
            connectedAt: d.connected_at,
        }))
    }

    /**
     * Disconnect a wearable device
     */
    async disconnectDevice(userId: string, deviceId: string): Promise<void> {
        const { error } = await this.supabase
            .from('wearable_devices')
            .update({ is_active: false })
            .eq('id', deviceId)
            .eq('user_id', userId)

        if (error) throw new Error(`Failed to disconnect device: ${error.message}`)
        logger.info({ userId, deviceId }, '[Wearable] Device disconnected')
    }

    /**
     * Sync batch data from a wearable device
     */
    async syncData(userId: string, payload: WearableSyncPayload): Promise<{
        synced: number
        hrvReadings: number
        lastSync: string
    }> {
        const { deviceId, readings, syncedAt } = payload

        // Verify device belongs to user
        const { data: device, error: devErr } = await this.supabase
            .from('wearable_devices')
            .select('id')
            .eq('id', deviceId)
            .eq('user_id', userId)
            .eq('is_active', true)
            .single()

        if (devErr || !device) throw new Error('Device not found or inactive')

        // Insert wearable data batch
        const dataRows = readings.map((r: WearableReading) => ({
            user_id: userId,
            device_id: deviceId,
            type: r.type,
            value: r.value,
            unit: r.unit,
            recorded_at: r.recordedAt,
            metadata: r.metadata || {},
        }))

        if (dataRows.length > 0) {
            const { error: insertErr } = await this.supabase.from('wearable_data').insert(dataRows)
            if (insertErr) throw new Error(`Failed to sync data: ${insertErr.message}`)
        }

        // Extract and store HRV readings separately
        const hrvData = readings.filter(r => r.type === 'hrv')
        const restingHrData = readings.filter(r => r.type === 'resting_hr')
        let hrvCount = 0

        for (const hrv of hrvData) {
            const matchingHR = restingHrData.find(r =>
                Math.abs(new Date(r.recordedAt).getTime() - new Date(hrv.recordedAt).getTime()) < 3600000 // within 1h
            )

            const rmssd = hrv.value
            const sdnn = hrv.metadata?.sdnn || rmssd * 1.2 // approximate if not provided
            const lnRmssd = Math.log(Math.max(1, rmssd))
            const restingHr = matchingHR?.value || RESTING_HR_BASELINE_DEFAULT

            await this.supabase.from('hrv_readings').insert({
                user_id: userId,
                rmssd,
                sdnn,
                ln_rmssd: lnRmssd,
                resting_hr: restingHr,
                recorded_at: hrv.recordedAt,
            })
            hrvCount++
        }

        // Update device last sync timestamp
        await this.supabase
            .from('wearable_devices')
            .update({ last_sync_at: syncedAt })
            .eq('id', deviceId)

        // Recalculate training load
        await this.calculateTrainingLoad(userId)

        logger.info({ userId, synced: dataRows.length, hrvReadings: hrvCount }, '[Wearable] Data synced')

        return {
            synced: dataRows.length,
            hrvReadings: hrvCount,
            lastSync: syncedAt,
        }
    }

    /**
     * Get latest wearable data
     */
    async getLatest(userId: string): Promise<Record<string, any>> {
        const types = ['heart_rate', 'hrv', 'resting_hr', 'vo2max', 'calories', 'steps', 'sleep']
        const latest: Record<string, any> = {}

        for (const type of types) {
            const { data } = await this.supabase
                .from('wearable_data')
                .select('value, unit, recorded_at')
                .eq('user_id', userId)
                .eq('type', type)
                .order('recorded_at', { ascending: false })
                .limit(1)
                .single()

            latest[type] = data || null
        }

        return latest
    }

    /**
     * Get HRV trend over N days
     */
    async getHRVTrend(userId: string, days = 30): Promise<{ date: string; value: number }[]> {
        const fromDate = new Date()
        fromDate.setDate(fromDate.getDate() - days)

        const { data, error } = await this.supabase
            .from('hrv_readings')
            .select('rmssd, recorded_at')
            .eq('user_id', userId)
            .gte('recorded_at', fromDate.toISOString())
            .order('recorded_at', { ascending: true })

        if (error) throw error

        // Aggregate by day
        const daily: Record<string, number[]> = {}
        for (const reading of (data || [])) {
            const day = reading.recorded_at.split('T')[0]
            if (!daily[day]) daily[day] = []
            daily[day].push(reading.rmssd)
        }

        return Object.entries(daily).map(([date, values]) => ({
            date,
            value: Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10,
        }))
    }

    /**
     * Calculate enhanced readiness score from HRV data
     */
    async getReadiness(userId: string): Promise<ReadinessEnhanced> {
        // Get latest HRV reading
        const { data: latestHrv } = await this.supabase
            .from('hrv_readings')
            .select('*')
            .eq('user_id', userId)
            .order('recorded_at', { ascending: false })
            .limit(1)
            .single()

        // Get HRV baseline (30-day average)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { data: baselineData } = await this.supabase
            .from('hrv_readings')
            .select('rmssd, resting_hr')
            .eq('user_id', userId)
            .gte('recorded_at', thirtyDaysAgo.toISOString())

        const hrvBaseline = baselineData && baselineData.length > 0
            ? baselineData.reduce((sum: number, r: any) => sum + r.rmssd, 0) / baselineData.length
            : HRV_BASELINE_DEFAULT

        const restingHRBaseline = baselineData && baselineData.length > 0
            ? baselineData.reduce((sum: number, r: any) => sum + r.resting_hr, 0) / baselineData.length
            : RESTING_HR_BASELINE_DEFAULT

        const hrvCurrent = latestHrv?.rmssd || hrvBaseline
        const restingHRCurrent = latestHrv?.resting_hr || restingHRBaseline
        const hrvDeviationPct = hrvBaseline > 0 ? ((hrvCurrent - hrvBaseline) / hrvBaseline) * 100 : 0

        // Get latest sleep data
        const { data: sleepData } = await this.supabase
            .from('wearable_data')
            .select('value')
            .eq('user_id', userId)
            .eq('type', 'sleep')
            .order('recorded_at', { ascending: false })
            .limit(1)
            .single()

        const sleepHours = sleepData?.value || 7
        const sleepScore = Math.min(100, Math.round((sleepHours / 8) * 100))

        // Get latest recovery log
        const { data: recoveryLog } = await this.supabase
            .from('recovery_logs')
            .select('overall_score')
            .eq('user_id', userId)
            .order('logged_at', { ascending: false })
            .limit(1)
            .single()

        const recoveryScore = recoveryLog?.overall_score || 50

        // Calculate composite readiness score
        const hrvScore = Math.min(100, Math.max(0, 50 + hrvDeviationPct * 2))
        const hrScore = restingHRCurrent <= restingHRBaseline ? 80 : Math.max(30, 80 - (restingHRCurrent - restingHRBaseline) * 3)

        const score = Math.round(
            hrvScore * 0.35 +
            hrScore * 0.2 +
            sleepScore * 0.25 +
            recoveryScore * 0.2
        )

        const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+'
            : score >= 60 ? 'B' : score >= 50 ? 'C' : 'D'

        const trainingIntensity: ReadinessEnhanced['trainingIntensity'] =
            score >= 80 ? 'push' : score >= 65 ? 'normal' : score >= 50 ? 'moderate' : score >= 35 ? 'light' : 'rest'

        // Risk factors
        const riskFactors: string[] = []
        if (hrvDeviationPct < -15) riskFactors.push('HRV significantly below baseline')
        if (restingHRCurrent > restingHRBaseline + 5) riskFactors.push('Elevated resting heart rate')
        if (sleepHours < 6) riskFactors.push('Insufficient sleep')
        if (recoveryScore < 40) riskFactors.push('Low recovery score')

        // Tips
        const tips: string[] = []
        if (score >= 80) tips.push('You are in peak condition. Great day for high-intensity training!')
        else if (score >= 60) tips.push('Good readiness. Normal training intensity recommended.')
        else tips.push('Recovery is important today. Consider light activity or rest.')

        if (sleepHours < 7) tips.push('Aim for 7-9 hours of sleep tonight.')
        if (hrvDeviationPct < -10) tips.push('HRV is below your baseline — monitor recovery closely.')

        return {
            score,
            grade,
            hrvBaseline: Math.round(hrvBaseline * 10) / 10,
            hrvCurrent: Math.round(hrvCurrent * 10) / 10,
            hrvDeviationPct: Math.round(hrvDeviationPct * 10) / 10,
            restingHRBaseline: Math.round(restingHRBaseline * 10) / 10,
            restingHRCurrent: Math.round(restingHRCurrent * 10) / 10,
            sleepScore,
            recoveryScore,
            recommendation: tips[0] || 'Stay active and hydrated.',
            trainingIntensity,
            riskFactors,
            tips,
        }
    }

    /**
     * Get full wearable dashboard
     */
    async getDashboard(userId: string): Promise<WearableDashboard> {
        // Get active device
        const { data: deviceData } = await this.supabase
            .from('wearable_devices')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('connected_at', { ascending: false })
            .limit(1)
            .single()

        const device: WearableDevice | null = deviceData ? {
            id: deviceData.id,
            userId: deviceData.user_id,
            platform: deviceData.platform,
            deviceName: deviceData.device_name,
            model: deviceData.model,
            lastSyncAt: deviceData.last_sync_at,
            isActive: deviceData.is_active,
            connectedAt: deviceData.connected_at,
        } : null

        const latest = await this.getLatest(userId)
        const readiness = await this.getReadiness(userId)
        const hrvTrend = await this.getHRVTrend(userId, 7)

        // Get resting HR 7-day trend
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const { data: hrTrend } = await this.supabase
            .from('hrv_readings')
            .select('resting_hr, recorded_at')
            .eq('user_id', userId)
            .gte('recorded_at', sevenDaysAgo.toISOString())
            .order('recorded_at', { ascending: true })

        const dailyHR: Record<string, number[]> = {}
        for (const r of (hrTrend || [])) {
            const day = r.recorded_at.split('T')[0]
            if (!dailyHR[day]) dailyHR[day] = []
            dailyHR[day].push(r.resting_hr)
        }

        return {
            device,
            lastSync: device?.lastSyncAt || null,
            today: {
                restingHR: latest.resting_hr?.value || null,
                hrv: latest.hrv?.value || null,
                vo2max: latest.vo2max?.value || null,
                caloriesBurned: latest.calories?.value || null,
                steps: latest.steps?.value || null,
                sleepHours: latest.sleep?.value || null,
                sleepQuality: null,
            },
            readiness,
            trends: {
                hrv7Day: hrvTrend,
                restingHR7Day: Object.entries(dailyHR).map(([date, values]) => ({
                    date,
                    value: Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10,
                })),
                sleepQuality7Day: [], // Requires sleep tracking integration
            },
        }
    }

    /**
     * Calculate training load (Acute:Chronic Workload Ratio)
     */
    async calculateTrainingLoad(userId: string): Promise<TrainingLoadPayload | null> {
        const today = new Date().toISOString().split('T')[0]

        // Get sessions in last 28 days
        const twentyEightDaysAgo = new Date()
        twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28)

        const { data: sessions } = await this.supabase
            .from('sessions')
            .select('duration_seconds, created_at')
            .eq('user_id', userId)
            .eq('status', 'complete')
            .gte('created_at', twentyEightDaysAgo.toISOString())

        if (!sessions || sessions.length === 0) return null

        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const acuteSessions = sessions.filter(s => new Date(s.created_at) >= sevenDaysAgo)
        const acuteLoad = acuteSessions.reduce((sum, s) => sum + (s.duration_seconds || 0) / 60, 0) / 7
        const chronicLoad = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0) / 60, 0) / 28

        const acwr = chronicLoad > 0 ? Math.round((acuteLoad / chronicLoad) * 100) / 100 : 0

        const risk: TrainingLoadPayload['risk'] =
            acwr > 1.5 ? 'very_high' :
            acwr > 1.3 ? 'high' :
            acwr > 0.8 ? 'low' :
            'moderate'

        const recommendation =
            risk === 'very_high' ? 'Significantly elevated workload. Reduce training volume immediately.'
            : risk === 'high' ? 'High workload ratio. Consider a deload day.'
            : risk === 'moderate' ? 'Workload is below optimal. Consider increasing training.'
            : 'Workload is in the sweet spot. Keep going!'

        const trend: TrainingLoadPayload['trend'] =
            acuteLoad > chronicLoad * 1.1 ? 'increasing' :
            acuteLoad < chronicLoad * 0.9 ? 'decreasing' :
            'stable'

        // Upsert training load for today
        await this.supabase
            .from('training_load')
            .upsert({
                user_id: userId,
                date: today,
                acute_load: Math.round(acuteLoad * 10) / 10,
                chronic_load: Math.round(chronicLoad * 10) / 10,
                acwr,
                risk,
                recommendation,
            }, { onConflict: 'user_id,date' })

        return {
            userId,
            date: today,
            acuteLoad: Math.round(acuteLoad * 10) / 10,
            chronicLoad: Math.round(chronicLoad * 10) / 10,
            acwr,
            risk,
            recommendation,
            trend,
        }
    }

    /**
     * Get training load
     */
    async getTrainingLoad(userId: string): Promise<TrainingLoadPayload | null> {
        return this.calculateTrainingLoad(userId)
    }

    /**
     * Get training load history over N days
     */
    async getTrainingLoadHistory(userId: string, days = 30): Promise<{
        date: string
        acuteLoad: number
        chronicLoad: number
        acwr: number
        risk: string
    }[]> {
        const fromDate = new Date()
        fromDate.setDate(fromDate.getDate() - days)

        const { data, error } = await this.supabase
            .from('training_load')
            .select('date, acute_load, chronic_load, acwr, risk')
            .eq('user_id', userId)
            .gte('date', fromDate.toISOString().split('T')[0])
            .order('date', { ascending: true })

        if (error) throw error

        return (data || []).map((d: any) => ({
            date: d.date,
            acuteLoad: d.acute_load,
            chronicLoad: d.chronic_load,
            acwr: d.acwr,
            risk: d.risk,
        }))
    }

    /**
     * Deep HRV analysis — coefficient of variation, baseline deviation, ANS balance
     */
    async getHRVAnalysis(userId: string, days = 30): Promise<{
        trend: { date: string; value: number }[]
        baseline: number
        current: number
        deviationPct: number
        coefficientOfVariation: number
        ansBalance: 'parasympathetic_dominant' | 'sympathetic_dominant' | 'balanced'
        weeklyComparison: { thisWeek: number; lastWeek: number; changePct: number }
        recommendation: string
    }> {
        const trend = await this.getHRVTrend(userId, days)
        const values = trend.map(t => t.value)

        const mean = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : HRV_BASELINE_DEFAULT
        const variance = values.length > 1
            ? values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1)
            : 0
        const stdDev = Math.sqrt(variance)
        const cv = mean > 0 ? (stdDev / mean) * 100 : 0

        const latest = values.length > 0 ? values[values.length - 1] : mean
        const deviationPct = mean > 0 ? ((latest - mean) / mean) * 100 : 0

        // ANS balance heuristic
        const ansBalance = deviationPct > 10
            ? 'parasympathetic_dominant' as const
            : deviationPct < -10
                ? 'sympathetic_dominant' as const
                : 'balanced' as const

        // Weekly comparison
        const thisWeekValues = values.slice(-7)
        const lastWeekValues = values.slice(-14, -7)
        const thisWeekAvg = thisWeekValues.length > 0 ? thisWeekValues.reduce((a, b) => a + b, 0) / thisWeekValues.length : 0
        const lastWeekAvg = lastWeekValues.length > 0 ? lastWeekValues.reduce((a, b) => a + b, 0) / lastWeekValues.length : 0
        const changePct = lastWeekAvg > 0 ? ((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100 : 0

        const recommendation =
            deviationPct < -15 ? 'HRV significantly below baseline. Prioritize rest and recovery.'
            : deviationPct < -5 ? 'HRV slightly below baseline. Consider light training.'
            : deviationPct > 15 ? 'HRV above baseline — excellent recovery! Push harder today.'
            : 'HRV in normal range. Proceed with planned training.'

        return {
            trend,
            baseline: Math.round(mean * 10) / 10,
            current: Math.round(latest * 10) / 10,
            deviationPct: Math.round(deviationPct * 10) / 10,
            coefficientOfVariation: Math.round(cv * 10) / 10,
            ansBalance,
            weeklyComparison: {
                thisWeek: Math.round(thisWeekAvg * 10) / 10,
                lastWeek: Math.round(lastWeekAvg * 10) / 10,
                changePct: Math.round(changePct * 10) / 10,
            },
            recommendation,
        }
    }

    /**
     * Export wearable data for a user
     */
    async exportData(
        userId: string,
        from?: string,
        to?: string,
        types?: string[]
    ): Promise<{ readings: any[]; exported: number; range: { from: string; to: string } }> {
        let query = this.supabase
            .from('wearable_data')
            .select('type, value, unit, recorded_at, metadata')
            .eq('user_id', userId)
            .order('recorded_at', { ascending: true })

        if (from) query = query.gte('recorded_at', from)
        if (to) query = query.lte('recorded_at', to)
        if (types && types.length > 0) query = query.in('type', types)

        const { data, error } = await query.limit(5000)
        if (error) throw error

        const readings = (data || []).map((r: any) => ({
            type: r.type,
            value: r.value,
            unit: r.unit,
            recordedAt: r.recorded_at,
            metadata: r.metadata,
        }))

        return {
            readings,
            exported: readings.length,
            range: {
                from: from || readings[0]?.recordedAt || '',
                to: to || readings[readings.length - 1]?.recordedAt || '',
            },
        }
    }

    /**
     * Get fatigue / overtraining alerts
     */
    async getAlerts(userId: string): Promise<{
        level: 'info' | 'warning' | 'critical'
        type: string
        message: string
        timestamp: string
    }[]> {
        const alerts: { level: 'info' | 'warning' | 'critical'; type: string; message: string; timestamp: string }[] = []
        const now = new Date().toISOString()

        // Check HRV deviation
        try {
            const readiness = await this.getReadiness(userId)

            if (readiness.hrvDeviationPct < -20) {
                alerts.push({
                    level: 'critical',
                    type: 'hrv_drop',
                    message: `⚠️ HRV est ${Math.abs(readiness.hrvDeviationPct).toFixed(0)}% en dessous de votre baseline. Repos fortement recommandé.`,
                    timestamp: now,
                })
            } else if (readiness.hrvDeviationPct < -10) {
                alerts.push({
                    level: 'warning',
                    type: 'hrv_low',
                    message: `HRV légèrement sous la baseline (${readiness.hrvDeviationPct.toFixed(0)}%). Entraînement modéré recommandé.`,
                    timestamp: now,
                })
            }

            if (readiness.restingHRCurrent > readiness.restingHRBaseline + 8) {
                alerts.push({
                    level: 'critical',
                    type: 'elevated_hr',
                    message: `⚠️ Fréquence cardiaque au repos élevée (${readiness.restingHRCurrent} bpm, baseline: ${readiness.restingHRBaseline} bpm). Possible surcharge ou maladie.`,
                    timestamp: now,
                })
            } else if (readiness.restingHRCurrent > readiness.restingHRBaseline + 4) {
                alerts.push({
                    level: 'warning',
                    type: 'hr_above_baseline',
                    message: `FC au repos au-dessus de la baseline (+${(readiness.restingHRCurrent - readiness.restingHRBaseline).toFixed(0)} bpm). Surveillez votre récupération.`,
                    timestamp: now,
                })
            }

            if (readiness.sleepScore < 50) {
                alerts.push({
                    level: 'warning',
                    type: 'poor_sleep',
                    message: `Qualité de sommeil insuffisante (score: ${readiness.sleepScore}/100). Visez 7-9h de sommeil.`,
                    timestamp: now,
                })
            }

            if (readiness.score >= 85) {
                alerts.push({
                    level: 'info',
                    type: 'peak_readiness',
                    message: `🔥 Readiness excellente (${readiness.score}/100) ! C'est le moment pour un entraînement intensif.`,
                    timestamp: now,
                })
            }
        } catch {
            // No readiness data yet — not an error
        }

        // Check training load
        try {
            const load = await this.calculateTrainingLoad(userId)
            if (load) {
                if (load.risk === 'very_high') {
                    alerts.push({
                        level: 'critical',
                        type: 'overtraining',
                        message: `🛑 Risque de surcharge très élevé (ACWR: ${load.acwr}). Réduisez votre volume d'entraînement immédiatement.`,
                        timestamp: now,
                    })
                } else if (load.risk === 'high') {
                    alerts.push({
                        level: 'warning',
                        type: 'high_load',
                        message: `Charge d'entraînement élevée (ACWR: ${load.acwr}). Considérez un jour de repos actif.`,
                        timestamp: now,
                    })
                }
            }
        } catch {
            // No training data yet
        }

        return alerts.sort((a, b) => {
            const priority = { critical: 0, warning: 1, info: 2 }
            return priority[a.level] - priority[b.level]
        })
    }
}
