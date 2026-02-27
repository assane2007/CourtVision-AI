/**
 * LiveCamera Ã¢â‚¬â€ Frame capture component for Live Coach.
 *
 * Uses expo-camera to capture frames at regular intervals
 * and send them to the useLiveCoach hook via sendFrame().
 *
 * Usage:
 *   <LiveCamera active={live.phase === 'active'} onFrame={live.sendFrame} quarter={live.quarter} />
 */

import React, { useRef, useEffect, useCallback, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera'
import { Feather } from '@expo/vector-icons'
import type { LiveFramePayload } from '@courtvision/shared'
import { T } from '../lib/theme'

const FRAME_CAPTURE_INTERVAL_MS = 3000

interface LiveCameraProps {
    active: boolean
    quarter: number
    onFrame: (payload: LiveFramePayload) => Promise<void>
    compact?: boolean
}

export function LiveCamera({ active, quarter, onFrame, compact = true }: LiveCameraProps) {
    const [permission, requestPermission] = useCameraPermissions()
    const [facing, setFacing] = useState<CameraType>('front')
    const [capturing, setCapturing] = useState(false)
    const cameraRef = useRef<CameraView>(null)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const startTimeRef = useRef<number>(Date.now())

    useEffect(() => {
        if (active) {
            startTimeRef.current = Date.now()
        }
    }, [active])

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

            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.3,
                base64: false,
                skipProcessing: true,
            })

            const payload: LiveFramePayload = {
                timestamp: elapsed,
                quarter,
            }

            await onFrame(payload)
        } catch (error) {
            console.warn('[LiveCamera] Capture error:', error)
        } finally {
            setCapturing(false)
        }
    }, [active, capturing, quarter, onFrame])

    const toggleFacing = () => {
        setFacing(prev => prev === 'front' ? 'back' : 'front')
    }

    if (!permission) return null

    if (!permission.granted) {
        return (
            <View style={[styles.container, compact && styles.compact]}>
                <View style={styles.permissionBox}>
                    <Feather name="camera" size={24} color={T.color.text.secondary} />
                    <Text style={styles.permissionText}>
                        Camera lets Live Coach analyze your posture and form in real-time.
                    </Text>
                    <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                        <Text style={styles.permissionBtnText}>Allow Camera</Text>
                    </TouchableOpacity>
                </View>
            </View>
        )
    }

    if (!active) return null

    return (
        <View style={[styles.container, compact && styles.compact]}>
            <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing={facing}
            >
                <View style={styles.overlay}>
                    <View style={styles.statusRow}>
                        <View style={[styles.statusDot, { backgroundColor: capturing ? T.color.semantic.warning : T.color.semantic.success }]} />
                        <Text style={styles.statusText}>
                            {capturing ? 'Capturing...' : 'Standby'}
                        </Text>
                    </View>

                    <TouchableOpacity style={styles.flipBtn} onPress={toggleFacing}>
                        <Feather name="refresh-cw" size={compact ? 16 : 22} color={T.color.text.primary} />
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
        borderRadius: T.borderRadius.md,
        overflow: 'hidden',
        backgroundColor: T.color.background.primary,
    },
    compact: {
        height: 100,
        borderRadius: T.borderRadius.sm,
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        padding: T.spacing[2],
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(5,10,18,0.65)',
        paddingHorizontal: T.spacing[2],
        paddingVertical: T.spacing[1],
        borderRadius: T.borderRadius.sm,
        borderWidth: 1,
        borderColor: T.color.border.default,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 4,
    },
    statusText: {
        color: T.color.text.primary,
        fontSize: T.fontSize.xs,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
    },
    flipBtn: {
        backgroundColor: 'rgba(5,10,18,0.65)',
        padding: T.spacing[2],
        borderRadius: T.borderRadius.sm,
        borderWidth: 1,
        borderColor: T.color.border.default,
    },
    permissionBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: T.spacing[4],
        backgroundColor: T.color.background.tertiary,
    },
    permissionText: {
        color: T.color.text.secondary,
        fontSize: T.fontSize.sm,
        textAlign: 'center',
        marginVertical: T.spacing[2],
        fontFamily: T.fonts.body.regular,
    },
    permissionBtn: {
        backgroundColor: T.color.semantic.info,
        paddingHorizontal: T.spacing[4],
        paddingVertical: T.spacing[2],
        borderRadius: T.borderRadius.sm,
    },
    permissionBtnText: {
        color: T.color.text.primary,
        fontWeight: '700',
        fontSize: T.fontSize.sm,
        fontFamily: T.fonts.display.bold,
    },
})
