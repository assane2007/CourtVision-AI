import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
    View, Text, TouchableOpacity, StyleSheet,
    ActivityIndicator, Animated, Easing
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Audio } from 'expo-av'
import { T, impact } from '../../lib/theme'
import { useStore } from '../../lib/store'

interface VocalCoachOverlayProps {
    sessionId: string
    active: boolean
    onCoachMessage?: (message: string) => void
}

export const VocalCoachOverlay: React.FC<VocalCoachOverlayProps> = ({
    sessionId,
    active,
    onCoachMessage
}) => {
    const user = useStore(s => s.user)
    const [isListening, setIsListening] = useState(false)
    const [isConnected, setIsConnected] = useState(false)
    const [lastResponse, setLastResponse] = useState<string | null>(null)

    const ws = useRef<WebSocket | null>(null)
    const recording = useRef<Audio.Recording | null>(null)
    const pulseAnim = useRef(new Animated.Value(1)).current

    // ---- WebSocket ----
    useEffect(() => {
        if (active && user) {
            connectWS()

            // Listen to biomechanical faults from the AI service (Nuclear Integration)
            const RealtimeAIService = require('../../lib/realtimeAIService').RealtimeAIService
            const ai = RealtimeAIService.getInstance()

            const cleanup = ai.config.onPipelineEvent = (event: any) => {
                if (event.type === 'biomechanic_fault') {
                    const message = event.fault === 'low_elbow' ? 'Coude trop bas !' :
                        event.fault === 'stiff_knees' ? 'Fléchis les genoux !' :
                            'Ajuste ta position !'
                    setLastResponse(message)
                    onCoachMessage?.(message)
                    impact.heavy()
                }
            }
        }
        return () => {
            if (ws.current) ws.current.close()
        }
    }, [active, user])

    const connectWS = () => {
        const url = `ws://${process.env.EXPO_PUBLIC_API_URL?.replace('http', 'ws')}/ws/coach`
        ws.current = new WebSocket(url)

        ws.current.onopen = () => {
            setIsConnected(true)
            console.info('[VocalCoach] Connected')
        }

        ws.current.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data)
                if (data.type === 'coach_response') {
                    setLastResponse(data.text)
                    onCoachMessage?.(data.text)
                    impact.medium()
                } else if (data.type === 'ready') {
                    setLastResponse(data.message)
                }
            } catch (err) {
                console.error('[VocalCoach] WS Message Error', err)
            }
        }

        ws.current.onclose = () => {
            setIsConnected(false)
            console.info('[VocalCoach] Disconnected')
        }
    }

    // ---- Audio Recording ----
    const startRecording = async () => {
        try {
            impact.light()
            await Audio.requestPermissionsAsync()
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            })

            const { recording: rec } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            )
            recording.current = rec
            setIsListening(true)
            startPulse()
        } catch (err) {
            console.error('[VocalCoach] Failed to start recording', err)
        }
    }

    const stopRecording = async () => {
        if (!recording.current) return
        setIsListening(false)
        stopPulse()

        try {
            await recording.current.stopAndUnloadAsync()
            const uri = recording.current.getURI()
            console.info('[VocalCoach] Recorded URI:', uri)

            // For now, we simulate sending a text command 
            // In full implementation, we'd send the audio file to an STT endpoint
            if (ws.current && isConnected) {
                ws.current.send(JSON.stringify({
                    type: 'voice_command',
                    text: 'How is my elbow position?',
                    context: 'technique'
                }))
            }
        } catch (err) {
            console.error('[VocalCoach] Failed to stop recording', err)
        }
        recording.current = null
    }

    // ---- UI Animations ----
    const startPulse = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 800,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 800,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true
                })
            ])
        ).start()
    }

    const stopPulse = () => {
        pulseAnim.stopAnimation()
        pulseAnim.setValue(1)
    }

    if (!active) return null

    return (
        <View style={styles.container}>
            {/* Listening Interface */}
            <View style={styles.content}>
                <TouchableOpacity
                    onPressIn={startRecording}
                    onPressOut={stopRecording}
                    activeOpacity={0.8}
                    style={styles.micButton}
                >
                    <Animated.View style={[
                        styles.pulseCircle,
                        { transform: [{ scale: pulseAnim }] },
                        isListening && styles.pulseActive
                    ]} />
                    <View style={[styles.micIcon, isListening && styles.micActive]}>
                        <Feather
                            name={isListening ? "mic" : "mic-off"}
                            size={24}
                            color="#FFF"
                        />
                    </View>
                </TouchableOpacity>

                <View style={styles.info}>
                    <Text style={styles.status}>
                        {isListening ? "I'm listening..." : "Hold to talk to Coach V"}
                    </Text>
                    {lastResponse && (
                        <Text style={styles.response} numberOfLines={2}>
                            "{lastResponse}"
                        </Text>
                    )}
                </View>
            </View>

            {!isConnected && (
                <View style={styles.connecting}>
                    <ActivityIndicator size="small" color={T.color.signature.primary} />
                    <Text style={styles.connectingText}>Connecting AI...</Text>
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 24,
        left: 12,
        right: 12,
        backgroundColor: 'rgba(15, 25, 35, 0.9)',
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 107, 44, 0.2)',
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16
    },
    micButton: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center'
    },
    micIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: T.color.background.tertiary,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2
    },
    micActive: {
        backgroundColor: T.color.signature.primary
    },
    pulseCircle: {
        position: 'absolute',
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 107, 44, 0.4)',
        zIndex: 1
    },
    pulseActive: {
        backgroundColor: 'rgba(255, 107, 44, 0.6)'
    },
    info: {
        flex: 1
    },
    status: {
        color: T.color.text.primary,
        fontSize: 14,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold
    },
    response: {
        color: T.color.text.secondary,
        fontSize: 12,
        marginTop: 2,
        fontFamily: T.fonts.body.regular,
        fontStyle: 'italic'
    },
    connecting: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    connectingText: {
        color: T.color.text.tertiary,
        fontSize: 11,
        fontFamily: T.fonts.body.regular
    }
})
