/**
 * ShareCardModal — Captures the ShareCard as an image and shares it.
 *
 * Uses react-native-view-shot to capture the visual card,
 * then expo-sharing to open the native share sheet with the image file.
 */

import React, { useRef, useState, useCallback } from 'react'
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Platform } from 'react-native'
import ViewShot from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'
import { Feather } from '@expo/vector-icons'
import { ShareCard } from './ShareCard'
import type { SessionRealtimeStats } from '../../lib/realtimeAIService'

interface ShareCardModalProps {
    visible: boolean
    onClose: () => void
    stats: SessionRealtimeStats
    zoneStats?: Record<string, { pct: number; attempts: number }>
    playerName?: string
}

export function ShareCardModal({
    visible,
    onClose,
    stats,
    zoneStats,
    playerName,
}: ShareCardModalProps) {
    const shotRef = useRef<ViewShot>(null)
    const [sharing, setSharing] = useState(false)

    const handleShare = useCallback(async () => {
        if (!shotRef.current?.capture) return
        setSharing(true)
        try {
            const uri = await shotRef.current.capture()
            const canShare = await Sharing.isAvailableAsync()
            if (canShare) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'image/png',
                    dialogTitle: 'Share your session',
                    UTI: 'public.png',
                })
            } else {
                console.warn('[ShareCard] Sharing not available on this device')
            }
        } catch (err) {
            console.warn('[ShareCard] Capture/share failed:', err)
        } finally {
            setSharing(false)
        }
    }, [])

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={s.overlay}>
                <View style={s.container}>
                    {/* Header */}
                    <View style={s.header}>
                        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                            <Feather name="x" size={22} color="#94A3B8" />
                        </TouchableOpacity>
                        <Text style={s.title}>Share Your Session</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Card preview (scrollable if needed) */}
                    <View style={s.previewContainer}>
                        <ViewShot
                            ref={shotRef}
                            options={{ format: 'png', quality: 1, result: 'tmpfile' }}
                            style={s.viewShot}
                        >
                            <ShareCard
                                stats={stats}
                                zoneStats={zoneStats}
                                playerName={playerName}
                            />
                        </ViewShot>
                    </View>

                    {/* Share button */}
                    <TouchableOpacity
                        style={s.shareBtn}
                        onPress={handleShare}
                        disabled={sharing}
                        activeOpacity={0.8}
                    >
                        {sharing ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <>
                                <Feather name="share" size={18} color="#FFF" />
                                <Text style={s.shareBtnText}>Share to Story</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Platform hints */}
                    <View style={s.platformRow}>
                        <Text style={s.platformHint}>Works with Instagram, TikTok, Snapchat & more</Text>
                    </View>
                </View>
            </View>
        </Modal>
    )
}

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#0A1018',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 40,
        maxHeight: '95%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    closeBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: '#F8FAFC',
        letterSpacing: -0.3,
    },
    previewContainer: {
        alignItems: 'center',
        paddingHorizontal: 16,
        // Scale down the 9:16 card to fit the modal
        transform: [{ scale: 0.52 }],
        marginTop: -80,
        marginBottom: -80,
    },
    viewShot: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FF6B00',
        marginHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 14,
        gap: 10,
    },
    shareBtnText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFF',
        letterSpacing: -0.2,
    },
    platformRow: {
        alignItems: 'center',
        paddingTop: 12,
    },
    platformHint: {
        fontSize: 12,
        color: '#475569',
        fontWeight: '500',
    },
})
