import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAnalytics } from '../../../lib/analytics';

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
    const [currentClipIdx, setCurrentClipIdx] = useState(0);
    const [state, setState] = useState<SessionState>('LOADING');
    const [feedbackColor, setFeedbackColor] = useState<string>('transparent');
    const [clips, setClips] = useState<Clip[]>([]);
    const { trackEvent } = useAnalytics();

    // Results
    const [results, setResults] = useState<{ correct: boolean, time: number }[]>([]);
    const [inputStartTime, setInputStartTime] = useState(0);

    useEffect(() => {
        // Init Audio
        Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
        });

        // Fetch clips from API
        const fetchClips = async () => {
            try {
                const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
                const response = await fetch(`${apiUrl}/api/precog/clips`);
                const data = await response.json();

                if (data.training) {
                    const allClips = [...data.calibration, ...data.training].slice(0, 10);
                    setClips(allClips);
                    setTimeout(() => setState('PLAYING'), 500);
                } else {
                    setState('LOADING'); // basic error handler
                }
            } catch (e) {
                console.error(e);
            }
        };

        fetchClips();
    }, []);

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
        let timeout: NodeJS.Timeout;

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
            const accuracy = results.filter(r => r.correct).length / clips.length * 100;

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
