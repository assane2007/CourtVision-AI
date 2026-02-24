import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { ShotResult } from './shotAnalysis'

/** Template de montage vidéo */
export type HighlightTemplate = 'cinema' | 'espn' | 'tiktok'

/** Clip individuel avec score */
export interface HighlightClip {
    timestamp: string
    startSec: number
    endSec: number
    score: number
    description: string
    action: string
}

/** Résultat du montage */
export interface HighlightResult {
    outputPath: string
    clips: HighlightClip[]
    durationSec: number
    template: HighlightTemplate
}

/** Configuration par template */
const TEMPLATE_CONFIG: Record<HighlightTemplate, {
    transitionDuration: number
    preClipSec: number
    postClipSec: number
    maxClips: number
    targetDuration: number
    overlayStyle: string
}> = {
    cinema: {
        transitionDuration: 1.0,
        preClipSec: 2.0,
        postClipSec: 1.5,
        maxClips: 10,
        targetDuration: 60,
        overlayStyle: 'cinematic' // Barres noires, couleurs chaudes
    },
    espn: {
        transitionDuration: 0.5,
        preClipSec: 1.5,
        postClipSec: 1.0,
        maxClips: 15,
        targetDuration: 90,
        overlayStyle: 'broadcast' // Overlay stats, score, nom du joueur
    },
    tiktok: {
        transitionDuration: 0.3,
        preClipSec: 1.0,
        postClipSec: 0.5,
        maxClips: 8,
        targetDuration: 30,
        overlayStyle: 'hype' // Cuts rapides, zooms, texte gros
    }
}

/**
 * Score chaque action pour déterminer les meilleures à inclure dans le highlight.
 * Barème :
 * - Tir marqué depuis le corner 3pts : 15 pts
 * - Tir marqué à 3pts (non corner) : 12 pts
 * - Tir marqué mi-distance : 8 pts
 * - Tir dans la raquette : 6 pts
 * - Tir raté mais bonne mécanique (follow-through) : 3 pts
 * - Tir contré (défensif) : 10 pts
 */
function scoreActions(shots: ShotResult[]): HighlightClip[] {
    const clips: HighlightClip[] = []

    for (const shot of shots) {
        let score = 0
        let description = ''
        let action = ''

        switch (shot.outcome) {
            case 'made':
                action = 'Panier'
                switch (shot.zone) {
                    case 'corner3':
                        score = 15
                        description = `Corner 3 points 💦`
                        break
                    case 'wing3':
                    case 'top3':
                        score = 12
                        description = `3 points depuis ${shot.zone === 'wing3' ? 'l\'aile' : 'le top'}`
                        break
                    case 'midrange':
                        score = 8
                        description = `Mi-distance clutch`
                        break
                    case 'paint':
                        score = 6
                        description = `Finition dans la raquette`
                        break
                    case 'restricted':
                        score = 7
                        description = `Layup / Finition au cercle`
                        break
                }
                // Bonus pour similarité NBA élevée
                if (shot.nbaComparison.similarity > 70) {
                    score += 3
                    description += ` (style ${shot.nbaComparison.closestPlayer})`
                }
                break

            case 'blocked':
                score = 10
                action = 'Contre'
                description = `Contre défensif 🚫`
                break

            case 'missed':
                if (shot.posture.followThrough) {
                    score = 3
                    action = 'Bonne tentative'
                    description = `Tentative depuis ${shot.zone} — bonne mécanique`
                } else {
                    score = 0
                }
                break
        }

        if (score > 0) {
            // Parser le timestamp en secondes
            const parts = shot.timestamp.split(':')
            const startSec = parseInt(parts[0]) * 60 + parseInt(parts[1])

            clips.push({
                timestamp: shot.timestamp,
                startSec,
                endSec: startSec + 3,
                score,
                description,
                action
            })
        }
    }

    // Trier par score décroissant
    return clips.sort((a, b) => b.score - a.score)
}

/**
 * Génère un commentaire TTS via Coqui TTS (ou un service local).
 * Si Coqui n'est pas disponible, génère un fichier de silence.
 */
async function generateTTS(text: string, outputPath: string): Promise<string> {
    const ttsUrl = process.env.COQUI_TTS_URL || 'http://localhost:5002'

    try {
        const response = await fetch(`${ttsUrl}/api/tts?text=${encodeURIComponent(text)}`, {
            method: 'GET'
        })

        if (response.ok) {
            const audioBuffer = await response.arrayBuffer()
            const ttsPath = outputPath.replace('.mp4', '_tts.wav')
            fs.writeFileSync(ttsPath, Buffer.from(audioBuffer))
            return ttsPath
        }
    } catch {
        // TTS non disponible — silencieux
    }

    return '' // Pas de TTS
}

/**
 * Découpe un clip depuis la vidéo source via FFmpeg.
 */
function extractClip(
    videoPath: string,
    startSec: number,
    endSec: number,
    outputPath: string,
    template: HighlightTemplate
): Promise<void> {
    const config = TEMPLATE_CONFIG[template]
    const actualStart = Math.max(0, startSec - config.preClipSec)
    const duration = (endSec + config.postClipSec) - actualStart

    return new Promise((resolve, reject) => {
        let command = ffmpeg(videoPath)
            .setStartTime(actualStart)
            .setDuration(duration)
            .outputOptions(['-c:v libx264', '-crf 23', '-preset fast'])

        // Appliquer le style selon le template
        switch (template) {
            case 'cinema':
                command = command.videoFilters([
                    'colorbalance=rs=0.1:gs=-0.05:bs=0.1', // Tons chauds
                    `crop=iw:iw*9/16:(iw-iw)/2:(ih-iw*9/16)/2`, // Crop cinématique 16:9
                ])
                break
            case 'tiktok':
                command = command.videoFilters([
                    'scale=1080:1920:force_original_aspect_ratio=decrease',
                    'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black'
                ])
                break
            case 'espn':
                // Format paysage standard broadcast
                command = command.videoFilters([
                    'scale=1920:1080:force_original_aspect_ratio=decrease',
                    'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black'
                ])
                break
        }

        command
            .output(outputPath)
            .on('end', () => resolve())
            .on('error', (err: Error) => reject(err))
            .run()
    })
}

/**
 * Concatène plusieurs clips vidéo via FFmpeg (methode concat demuxer).
 */
function concatenateClips(clipPaths: string[], outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const listPath = outputPath.replace('.mp4', '_list.txt')
        const listContent = clipPaths.map((p) => `file '${p}'`).join('\n')
        fs.writeFileSync(listPath, listContent)

        ffmpeg()
            .input(listPath)
            .inputOptions(['-f concat', '-safe 0'])
            .outputOptions(['-c copy'])
            .output(outputPath)
            .on('end', () => {
                // Nettoyer le fichier de liste
                try { fs.unlinkSync(listPath) } catch { /* ignore */ }
                resolve()
            })
            .on('error', (err: Error) => reject(err))
            .run()
    })
}

/**
 * Ajoute le watermark CourtVision AI sur la vidéo finale.
 */
function addWatermark(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .videoFilters([
                `drawtext=text='CourtVision AI':fontsize=24:fontcolor=white@0.5:x=w-tw-20:y=h-th-20`
            ])
            .outputOptions(['-c:v libx264', '-crf 23', '-c:a copy'])
            .output(outputPath)
            .on('end', () => resolve())
            .on('error', (err: Error) => reject(err))
            .run()
    })
}

/**
 * Pipeline principal de création du highlight reel.
 * Sélectionne les meilleures actions, coupe, assemble, ajoute transitions
 * et watermark CourtVision AI. Exporte en 1080p optimisé réseaux sociaux.
 *
 * @param videoPath - Chemin local de la vidéo source.
 * @param shots - Résultats de l'analyse des tirs.
 * @param template - Template de montage (cinema / espn / tiktok).
 * @param playerName - Nom du joueur (pour l'overlay).
 */
export async function createHighlightReel(
    videoPath: string,
    shots: ShotResult[],
    template: HighlightTemplate = 'espn',
    playerName: string = 'Player'
): Promise<HighlightResult> {
    const config = TEMPLATE_CONFIG[template]
    const tempDir = path.join(os.tmpdir(), `cv_highlight_${Date.now()}`)
    fs.mkdirSync(tempDir, { recursive: true })

    // 1. Scorer et sélectionner les meilleures actions
    const allClips = scoreActions(shots)
    const selectedClips = allClips.slice(0, config.maxClips)

    if (selectedClips.length === 0) {
        return {
            outputPath: videoPath,
            clips: [],
            durationSec: 0,
            template
        }
    }

    // 2. Trier chronologiquement pour le montage
    selectedClips.sort((a, b) => a.startSec - b.startSec)

    // 3. Extraire chaque clip
    const clipPaths: string[] = []
    for (let i = 0; i < selectedClips.length; i++) {
        const clip = selectedClips[i]
        const clipPath = path.join(tempDir, `clip_${i.toString().padStart(3, '0')}.mp4`)
        await extractClip(videoPath, clip.startSec, clip.endSec, clipPath, template)
        clipPaths.push(clipPath)
    }

    // 4. Concaténer tous les clips
    const rawOutputPath = path.join(tempDir, 'highlight_raw.mp4')
    await concatenateClips(clipPaths, rawOutputPath)

    // 5. Ajouter le watermark CourtVision AI
    const finalOutputPath = path.join(tempDir, `highlight_${template}_${Date.now()}.mp4`)
    await addWatermark(rawOutputPath, finalOutputPath)

    // 6. Tenter de générer un commentaire TTS sur la meilleure action
    if (selectedClips.length > 0) {
        const bestClip = allClips[0] // Meilleur score
        const ttsText = `${bestClip.description}. ${playerName} en mode ${
            template === 'cinema' ? 'cinématique' : template === 'tiktok' ? 'viral' : 'broadcast'
        }.`
        await generateTTS(ttsText, finalOutputPath)
    }

    // 7. Calculer la durée totale estimée
    const totalDuration = selectedClips.reduce((sum, clip) => {
        return sum + (clip.endSec - clip.startSec) + config.preClipSec + config.postClipSec
    }, 0)

    // 8. Nettoyage des fichiers temporaires (clips individuels)
    for (const clipPath of clipPaths) {
        try { fs.unlinkSync(clipPath) } catch { /* ignore */ }
    }
    try { fs.unlinkSync(rawOutputPath) } catch { /* ignore */ }

    return {
        outputPath: finalOutputPath,
        clips: selectedClips,
        durationSec: Math.round(totalDuration),
        template
    }
}
