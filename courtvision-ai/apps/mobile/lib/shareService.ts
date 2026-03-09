/**
 * ShareService — Service de partage de sessions et de performances.
 *
 * Génère des "Share Cards" (images/textes) partageables sur les réseaux sociaux.
 *
 * Fonctionnalités :
 * - Génération de texte formaté pour la session
 * - Partage natif (iOS/Android share sheet)
 * - Deep links vers le profil utilisateur
 * - Export CSV/JSON des données de session
 *
 * Usage :
 *   const share = new ShareService()
 *   await share.shareSessionSummary(stats)
 */

import { Share, Platform } from 'react-native'
import type { SessionRealtimeStats } from './realtimeAIService'

// ==========================================
// Types
// ==========================================

export interface ShareContent {
    title: string
    message: string
    url?: string
}

// ==========================================
// Helpers
// ==========================================

function getGradeEmoji(score: number): string {
    if (score >= 90) return '🏆'
    if (score >= 80) return '🔥'
    if (score >= 70) return '💪'
    if (score >= 60) return '👍'
    if (score >= 50) return '📈'
    return '🏀'
}

function getGradeLetter(score: number): string {
    if (score >= 90) return 'A+'
    if (score >= 80) return 'A'
    if (score >= 70) return 'B+'
    if (score >= 60) return 'B'
    if (score >= 50) return 'C'
    return 'D'
}

function formatDuration(sec: number): string {
    const m = Math.floor(sec / 60)
    return m > 0 ? `${m}min` : `${sec}s`
}

// ==========================================
// Service
// ==========================================

export class ShareService {
    /**
     * Partage un résumé de session via la feuille de partage native.
     */
    async shareSessionSummary(stats: SessionRealtimeStats): Promise<void> {
        const score = Math.round(
            stats.avgPostureQuality * 0.35 +
            stats.mechanicConsistency * 0.25 +
            stats.shootingPct * 0.25 +
            stats.followThroughPct * 0.15
        )
        const grade = getGradeLetter(score)
        const emoji = getGradeEmoji(score)

        const message = this.buildSessionMessage(stats, score, grade, emoji)

        try {
            await Share.share({
                title: `CourtVision AI — Session ${grade} ${emoji}`,
                message,
            })
        } catch (err) {
            console.warn('[ShareService] Share failed:', err)
        }
    }

    /**
     * Construit le message de partage de session.
     */
    private buildSessionMessage(
        stats: SessionRealtimeStats,
        score: number,
        grade: string,
        emoji: string,
    ): string {
        const lines = [
            `${emoji} Session CourtVision AI — Grade ${grade} (${score}/100)`,
            '',
            `🎯 ${stats.totalShots} shots · ${stats.madeShots}/${stats.totalShots} (${stats.shootingPct}%)`,
            `⏱️ ${formatDuration(stats.sessionDurationSec)}`,
            '',
            '📐 Biomechanics:',
            `   • Elbow: ${stats.avgElbowAngle.toFixed(1)}°`,
            `   • Release Height: ${stats.avgReleaseHeight.toFixed(3)}x`,
            `   • Release Time: ${(stats.avgReleaseTime * 1000).toFixed(0)}ms`,
            `   • Posture: ${stats.avgPostureQuality.toFixed(0)}/100`,
            `   • Consistency: ${stats.mechanicConsistency}/100`,
            '',
        ]

        if (stats.trends && stats.trends.length > 0) {
            lines.push('📈 Trends:')
            stats.trends.forEach(t => {
                const icon = t.direction === 'improving' ? '↗️' : t.direction === 'declining' ? '↘️' : '→'
                lines.push(`   ${icon} ${t.description}`)
            })
            lines.push('')
        }

        lines.push('🏀 #CourtVisionAI #Basketball #AI')
        lines.push('📲 Download CourtVision AI → courtvision.ai')

        return lines.join('\n')
    }

    /**
     * Partage les stats de performance globales.
     */
    async shareProfileStats(data: {
        totalSessions: number
        totalShots: number
        overallFgPct: number
        avgScore: number
        streak: number
        bestGrade: string
    }): Promise<void> {
        const message = [
            '🏀 My CourtVision AI Profile',
            '',
            `📊 ${data.totalSessions} sessions · ${data.totalShots} shots`,
            `🎯 Overall FG%: ${data.overallFgPct}%`,
            `💯 Avg Score: ${data.avgScore}/100`,
            `🔥 Streak: ${data.streak} days`,
            `🏆 Best Grade: ${data.bestGrade}`,
            '',
            '📲 #CourtVisionAI #Basketball',
        ].join('\n')

        try {
            await Share.share({
                title: 'My CourtVision AI Profile',
                message,
            })
        } catch (err) {
            console.warn('[ShareService] Share failed:', err)
        }
    }

    /**
     * Exporte les données de session en JSON (pour le clipboard).
     */
    exportSessionJSON(stats: SessionRealtimeStats): string {
        return JSON.stringify({
            sessionId: stats.sessionId,
            date: new Date().toISOString(),
            totalShots: stats.totalShots,
            madeShots: stats.madeShots,
            shootingPct: stats.shootingPct,
            avgElbowAngle: stats.avgElbowAngle,
            avgReleaseHeight: stats.avgReleaseHeight,
            avgReleaseTime: stats.avgReleaseTime,
            avgPostureQuality: stats.avgPostureQuality,
            mechanicConsistency: stats.mechanicConsistency,
            followThroughPct: stats.followThroughPct,
            sessionDurationSec: stats.sessionDurationSec,
            trends: stats.trends,
        }, null, 2)
    }

    /**
     * Exporte les données de session en CSV.
     */
    exportSessionCSV(stats: SessionRealtimeStats): string {
        const headers = [
            'Session ID', 'Date', 'Total Shots', 'Made', 'FG%',
            'Elbow Angle', 'Release Height', 'Release Time',
            'Posture Quality', 'Consistency', 'Follow Through %', 'Duration (s)',
        ]
        const values = [
            stats.sessionId,
            new Date().toISOString(),
            stats.totalShots,
            stats.madeShots,
            stats.shootingPct,
            stats.avgElbowAngle.toFixed(1),
            stats.avgReleaseHeight.toFixed(3),
            stats.avgReleaseTime.toFixed(3),
            stats.avgPostureQuality.toFixed(0),
            stats.mechanicConsistency,
            stats.followThroughPct.toFixed(0),
            stats.sessionDurationSec,
        ]

        return headers.join(',') + '\n' + values.join(',')
    }
}
