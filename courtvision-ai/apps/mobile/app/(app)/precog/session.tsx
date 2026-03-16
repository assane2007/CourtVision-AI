import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAnalytics } from '../../../lib/analytics';
import { api } from '../../../lib/api';
import { usePreCog } from '../../../hooks/usePreCog';


type SessionState = 'LOADING' | 'PLAYING' | 'WAITING_INPUT' | 'FEEDBACK' | 'REST';

type Clip = {
    id: string;
    url: string;
    correct_answer: string;
    duration_ms: number;
};

export default function PrecogSession() {
    const insets = useSafeAreaInsets();
    const videoRef = useRef<Video>(null);
    const timerRef = useRef<any>(null);
    const blinkRef = useRef<any>(null);
    const restTimerRef = useRef<any>(null);
    const playbackTimerRef = useRef<any>(null);
    const [currentClipIdx, setCurrentClipIdx] = useState(0);
    const [state, setState] = useState<SessionState>('LOADING');
    const [feedbackColor, setFeedbackColor] = useState<string>('transparent');
    const { trackEvent } = useAnalytics();
    const { clips: clipsData, fetchClips, finishSession } = usePreCog();
    const [sessionClips, setSessionClips] = useState<any[]>([]);

    // Results
    const [results, setResults] = useState<{ correct: boolean, time: number }[]>([]);
    const [inputStartTime, setInputStartTime] = useState(0);

    useEffect(() => {
        // Init Audio
        Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
        });

        fetchClips();
    }, [fetchClips]);

    useEffect(() => {
        if (clipsData) {
            const all = [...clipsData.calibration, ...clipsData.training];
            setSessionClips(all);
            setTimeout(() => setState('PLAYING'), 500);
        }
    }, [clipsData]);

    const clips = sessionClips;

    const playErrorBip = async () => {
        // Real app would load a local sound file, maybe 'require("../../assets/sounds/error.mp3")'
        // Just mock the execution here.
        try {
            // const { sound } = await Audio.Sound.createAsync(require('../../assets/sounds/error.mp3'));
            // await sound.playAsync();
        } catch (e) {
            console.error('Audio error:', e);
        }
    };

    useEffect(() => {
        let timeout: any;

        if (state === 'PLAYING') {
            // Clip stops playing after precise duration based on speed
            const duration = clips[currentClipIdx]?.duration_ms || 1200;
            timeout = setTimeout(() => {
                setState('WAITING_INPUT');
                setInputStartTime(Date.now());
            }, duration);
        } else if (state === 'WAITING_INPUT') {
            // 0.8s max to answer
            timeout = setTimeout(() => {
                handleChoice('TIMEOUT');
            }, 800);
        } else if (state === 'FEEDBACK') {
            timeout = setTimeout(() => {
                setState('REST');
            }, 300); // 300ms flash
        } else if (state === 'REST') {
            // 50ms absolute black screen before next clip
            timeout = setTimeout(() => {
                nextClip();
            }, 50);
        }

        return () => clearTimeout(timeout);
    }, [state, currentClipIdx]);

    const handleChoice = (choice: string) => {
        if (state !== 'WAITING_INPUT') return;

        const timeTaken = Date.now() - inputStartTime;
        const isCorrect = choice === clips[currentClipIdx].correct_answer;

        setResults(prev => [...prev, { correct: isCorrect, time: timeTaken }]);

        if (isCorrect) {
            setFeedbackColor('#00C67A'); // Vert: Succès (silence)
        } else {
            setFeedbackColor('#FF3A5E'); // Rouge: Echec + Bip
            playErrorBip();
        }

        setState('FEEDBACK');
    };

    const nextClip = () => {
        if (currentClipIdx + 1 < clips.length) {
            setCurrentClipIdx(prev => prev + 1);
            setState('PLAYING');
        } else {
            // Finish
            const accuracy = (results.filter(r => r.correct).length / clips.length) * 100;

            // Save session to backend
            const saveSession = async () => {
                try {
                    await finishSession({
                        date: new Date().toISOString(),
                        durationSeconds: (results.reduce((acc, r) => acc + r.time, 0)) / 1000,
                        avgResponseMs: results.reduce((acc, r) => acc + r.time, 0) / results.length,
                        accuracyPercentage: accuracy,
                        responses: results.map((r, i) => ({
                            clipId: clips[i].id,
                            choice: r.correct ? clips[i].correct_answer : 'WRONG',
                            correct: r.correct,
                            responseTimeMs: r.time,
                            speedMultiplier: 1.0 // Placeholder
                        }))
                    });
                } catch (e) {
                    console.error('Failed to save session:', e);
                }
            };

            saveSession();

            // Push event to PostHog
            trackEvent('precog_session_completed', {
                accuracy: accuracy,
                clips_count: clips.length
            });

            router.replace({
                pathname: '/(app)/precog/result',
                params: { accuracy: accuracy.toFixed(0) }
            });
        }

    };

    const isVisible = state === 'PLAYING' || state === 'WAITING_INPUT';

    return (
        <View style={styles.container}>
            {/* Minimalist UI: No status bar/headers. Just black void and video */}

            {/* Feedback overlay */}
            {state === 'FEEDBACK' && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: feedbackColor, zIndex: 10 }]} />
            )}

            {/* Video container */}
            <View style={styles.videoContainer}>
                {isVisible && clips.length > 0 && clips[currentClipIdx] && (
                    <Video
                        key={clips[currentClipIdx].id}
                        ref={videoRef}
                        source={{ uri: clips[currentClipIdx].url }}
                        style={StyleSheet.absoluteFill}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay={state === 'PLAYING'}
                        isMuted={true}
                    />
                )}
            </View>

            {/* Controls (Only visible/active during input window, but we map them absolutely to muscle memory) */}
            {state === 'WAITING_INPUT' && (
                <View style={[styles.controls, { paddingBottom: insets.bottom + 40 }]}>
                    <Pressable
                        style={styles.actionButton}
                        onPress={() => handleChoice('PASS')}
                    >
                        <Text style={styles.actionText}>PASSE</Text>
                    </Pressable>

                    <Pressable
                        style={styles.actionButton}
                        onPress={() => handleChoice('TIR')}
                    >
                        <Text style={styles.actionText}>TIR</Text>
                    </Pressable>

                    <Pressable
                        style={styles.actionButton}
                        onPress={() => handleChoice('DRIVE')}
                    >
                        <Text style={styles.actionText}>DRIVE</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

// Absolute strict rules applied
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050505',
    },
    videoContainer: {
        flex: 1,
        width: '100%',
    },
    controls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 20,
        zIndex: 5,
    },
    actionButton: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingVertical: 18,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        minWidth: 100,
        alignItems: 'center',
    },
    actionText: {
        color: '#F8F5EF',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
});
