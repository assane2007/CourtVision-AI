/**
 * LiveCamera — Composant de capture de frames pour le Coach Live.
 *
 * Utilise expo-camera pour capturer des frames à intervalle régulier
 * et les envoyer au hook useLiveCoach via sendFrame().
 *
 * En attendant un vrai modèle ML on-device (MediaPipe / TFLite),
 * ce composant envoie les frames brutes au serveur qui fait l'inférence.
 *
 * Usage :
 *   <LiveCamera active={live.phase === 'active'} onFrame={live.sendFrame} quarter={live.quarter} />
 */

import React, { useRef, useEffect, useCallback, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera'
import { Ionicons } from '@expo/vector-icons'
import type { LiveFramePayload } from '@courtvision/shared'
import { T } from '../lib/theme'

const FRAME_CAPTURE_INTERVAL_MS = 3000 // Capture toutes les 3 secondes

interface LiveCameraProps {
    /** Capture active ? */
    active: boolean
    /** Quarter courant */
    quarter: number
    /** Callback pour envoyer une frame au hook */
    onFrame: (payload: LiveFramePayload) => Promise<void>
    /** Compact mode (petite preview) vs fullscreen */
    compact?: boolean
}

export function LiveCamera({ active, quarter, onFrame, compact = true }: LiveCameraProps) {
    const [permission, requestPermission] = useCameraPermissions()
    const [facing, setFacing] = useState<CameraType>('front')
    const [capturing, setCapturing] = useState(false)
    const cameraRef = useRef<CameraView>(null)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const startTimeRef = useRef<number>(Date.now())

    // Reset start time when active changes
    useEffect(() => {
        if (active) {
            startTimeRef.current = Date.now()
        }
    }, [active])

    // Capture frames à intervalle régulier
    useEffect(() => {
        if (active && permission?.granted) {
            intervalRef.current = setInterval(async () => {
                await captureFrame()
            }, FRAME_CAPTURE_INTERVAL_MS)

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current)
                    intervalRef.current = null
                }
            }
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }
    }, [active, permission?.granted])

    const captureFrame = useCallback(async () => {
        if (!cameraRef.current || !active || capturing) return

        try {
            setCapturing(true)
            const elapsed = (Date.now() - startTimeRef.current) / 1000

            // Capturer la photo en basse qualité pour minimiser la taille
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.3,
                base64: false,
                skipProcessing: true,
            })

            // Construire le payload.
            // Note : Sans modèle ML on-device, on n'envoie pas de landmarks ici.
            // Le serveur pourrait à terme accepter l'image brute pour faire
            // l'inférence MediaPipe côté serveur.
            // Pour l'instant, on envoie un heartbeat avec timestamp + quarter.
            const payload: LiveFramePayload = {
                timestamp: elapsed,
                quarter,
                // TODO: Quand MediaPipe sera intégré côté client :
                // landmarks: extractLandmarksFromFrame(photo),
                // ballDetected: detectBall(photo),
            }

            await onFrame(payload)
        } catch (error) {
            // Ignorer les erreurs de capture individuelles
            console.warn('[LiveCamera] Capture error:', error)
        } finally {
            setCapturing(false)
        }
    }, [active, capturing, quarter, onFrame])

    const toggleFacing = () => {
        setFacing(prev => prev === 'front' ? 'back' : 'front')
    }

    // Permission non encore demandée
    if (!permission) {
        return null
    }

    // Permission refusée
    if (!permission.granted) {
        return (
            <View style={[styles.container, compact && styles.compact]}>
                <View style={styles.permissionBox}>
                    <Ionicons name="camera-outline" size={24} color={T.colors.muted} />
                    <Text style={styles.permissionText}>
                        La caméra permet au Coach Live d'analyser ta posture en temps réel.
                    </Text>
                    <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                        <Text style={styles.permissionBtnText}>Autoriser la caméra</Text>
                    </TouchableOpacity>
                </View>
            </View>
        )
    }

    if (!active) {
        return null
    }

    return (
        <View style={[styles.container, compact && styles.compact]}>
            <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing={facing}
            >
                {/* Overlay */}
                <View style={styles.overlay}>
                    {/* Status indicator */}
                    <View style={styles.statusRow}>
                        <View style={[styles.statusDot, { backgroundColor: capturing ? T.colors.orange : T.colors.green }]} />
                        <Text style={styles.statusText}>
                            {capturing ? 'Capture...' : 'En veille'}
                        </Text>
                    </View>

                    {/* Flip camera button */}
                    <TouchableOpacity style={styles.flipBtn} onPress={toggleFacing}>
                        <Ionicons name="camera-reverse-outline" size={compact ? 16 : 22} color={T.colors.white} />
                    </TouchableOpacity>
                </View>
            </CameraView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 200,
        borderRadius: T.radius.md,
        overflow: 'hidden',
        backgroundColor: T.colors.bg,
    },
    compact: {
        height: 100,
        borderRadius: T.radius.sm,
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        padding: T.space.sm,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(5,10,18,0.65)',
        paddingHorizontal: T.space.sm,
        paddingVertical: T.space.xs,
        borderRadius: T.radius.sm,
        borderWidth: 1,
        borderColor: T.colors.border,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 4,
    },
    statusText: {
        color: T.colors.white,
        fontSize: T.font.xs,
        fontWeight: '600',
    },
    flipBtn: {
        backgroundColor: 'rgba(5,10,18,0.65)',
        padding: T.space.sm,
        borderRadius: T.radius.sm,
        borderWidth: 1,
        borderColor: T.colors.border,
    },
    permissionBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: T.space.lg,
        backgroundColor: T.colors.card,
    },
    permissionText: {
        color: T.colors.textSecondary,
        fontSize: T.font.sm,
        textAlign: 'center',
        marginVertical: T.space.sm,
    },
    permissionBtn: {
        backgroundColor: T.colors.primary,
        paddingHorizontal: T.space.lg,
        paddingVertical: T.space.sm,
        borderRadius: T.radius.sm,
    },
    permissionBtnText: {
        color: T.colors.white,
        fontWeight: '700',
        fontSize: T.font.sm,
    },
})
