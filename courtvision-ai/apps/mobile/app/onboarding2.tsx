import { View, Text, TouchableOpacity, SafeAreaView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import Animated, {
    useSharedValue, useAnimatedStyle, withTiming,
    FadeInDown, withRepeat, withSequence
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { T } from '../lib/theme'
import { useStore } from '../lib/store'

const POSITIONS = [
    { label: 'Point Guard', id: 'PG' },
    { label: 'Shooting Guard', id: 'SG' },
    { label: 'Small Forward', id: 'SF' },
    { label: 'Power Forward', id: 'PF' },
    { label: 'Center', id: 'C' },
]

const LEVELS = [
    { label: 'Beginner [0-1 YR]', id: 'Beginner' },
    { label: 'Intermediate [1-3 YRS]', id: 'Intermediate' },
    { label: 'Advanced [3-5 YRS]', id: 'Advanced' },
    { label: 'Pro [5+ YRS]', id: 'Pro' },
]

// Terminal Typewriter Effect
function TypewriterText({ text, onComplete }: { text: string, onComplete?: () => void }) {
    const [displayedText, setDisplayedText] = useState('')

    useEffect(() => {
        let i = 0
        setDisplayedText('')
        const interval = setInterval(() => {
            setDisplayedText(prev => prev + text.charAt(i))
            i++
            if (i >= text.length) {
                clearInterval(interval)
                if (onComplete) onComplete()
            }
        }, 30) // Typing speed

        return () => clearInterval(interval)
    }, [text, onComplete])

    return (
        <Text style={{
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            color: T.color.brand.primary,
            fontSize: 16,
            lineHeight: 24,
            marginBottom: 20,
        }}>
            {'>'} {displayedText}
            <AnimatedCursor />
        </Text>
    )
}

function AnimatedCursor() {
    const opacity = useSharedValue(1)

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(0, { duration: 400 }),
                withTiming(1, { duration: 400 })
            ),
            -1, true
        )
    }, [])

    return (
        <Animated.View style={[
            { width: 8, height: 16, backgroundColor: T.color.brand.primary, marginLeft: 2, transform: [{ translateY: 2 }] },
            useAnimatedStyle(() => ({ opacity: opacity.value }))
        ]} />
    )
}

export default function Onboarding2() {
    const router = useRouter()
    const [step, setStep] = useState<'position' | 'level' | 'processing'>('position')
    const [selectedPos, setSelectedPos] = useState<string | null>(null)
    const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
    const [showOptions, setShowOptions] = useState(false)

    // Log messages
    const [logs, setLogs] = useState<string[]>([
        '[SYSTEM] Secure connection established.',
        '[AI] Hello. I am your CourtVision Digital Twin.'
    ])

    useEffect(() => {
        // Reset show options when step changes to trigger typewriter
        setShowOptions(false)
        if (step === 'position') {
            setLogs(prev => [...prev.slice(0, 2)]) // keep initial logs
        } else if (step === 'level') {
            setLogs(prev => [...prev, `[USER] Selected: ${selectedPos}`])
        }
    }, [step, selectedPos])

    const handleSelectPos = (val: string) => {
        if (Platform.OS !== 'web') Haptics.selectionAsync()
        setSelectedPos(val)
        setTimeout(() => setStep('level'), 400)
    }

    const handleSelectLevel = (val: string) => {
        if (Platform.OS !== 'web') Haptics.selectionAsync()
        setSelectedLevel(val)
        setStep('processing')

        setLogs(prev => [...prev, `[USER] Selected: ${val}`, '[AI] Processing neural matrix...'])

        // Setup user in store
        useStore.setState((s: any) => ({
            user: s.user
                ? { ...s.user, position: selectedPos ?? 'PG', level: val }
                : {
                    id: '', username: '', full_name: 'Player',
                    position: selectedPos ?? 'PG', level: val,
                    streak: 0, mental_score: 0, shooting_grade: 'B',
                    shooting_fg_pct: 0, xp: 0, xp_level: 1,
                    total_sessions: 0, badges_count: 0,
                },
        }))

        // Fake processing delay before next screen
        setTimeout(() => {
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            router.push('/onboarding-camera')
        }, 1500)
    }

    const aiPrompt = step === 'position'
        ? "To optimize your analysis algorithms, please specify your primary role on the court."
        : step === 'level'
            ? "Thank you. Now, specify your current experience level for baseline calibration."
            : "Calibration complete. Generating optimal tracking parameters..."

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}> {/* True dark for terminal */}
            <View style={{ padding: T.spacing[5], flex: 1 }}>

                {/* Header terminal style */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, borderBottomWidth: 1, borderColor: '#333', paddingBottom: 10 }}>
                    <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#555', fontSize: 12 }}>TERMINAL v2.4.1</Text>
                    <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#555', fontSize: 12 }}>AUTH: PENDING</Text>
                </View>

                {/* Log History */}
                <View style={{ marginBottom: 20 }}>
                    {logs.map((log, i) => (
                        <Text key={i} style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: log.startsWith('[USER]') ? '#fff' : '#666', fontSize: 13, marginBottom: 8 }}>
                            {log}
                        </Text>
                    ))}
                </View>

                {/* Current Prompt */}
                <TypewriterText text={aiPrompt} onComplete={() => setShowOptions(true)} />

                {/* Options */}
                {showOptions && step === 'position' && (
                    <Animated.View entering={FadeInDown.duration(400)} style={{ marginTop: 10 }}>
                        {POSITIONS.map((p, i) => (
                            <TouchableOpacity
                                key={p.id}
                                style={{
                                    borderWidth: 1, borderColor: selectedPos === p.id ? T.color.brand.primary : '#333',
                                    backgroundColor: selectedPos === p.id ? `${T.color.brand.primary}15` : 'transparent',
                                    padding: 16, marginBottom: 12, borderRadius: 4,
                                    flexDirection: 'row', alignItems: 'center'
                                }}
                                onPress={() => handleSelectPos(p.id)}
                            >
                                <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: selectedPos === p.id ? T.color.brand.primary : '#888', marginRight: 16 }}>
                                    {`[0${i + 1}]`}
                                </Text>
                                <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: selectedPos === p.id ? '#fff' : '#ccc', fontSize: 15 }}>
                                    {p.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </Animated.View>
                )}

                {showOptions && step === 'level' && (
                    <Animated.View entering={FadeInDown.duration(400)} style={{ marginTop: 10 }}>
                        {LEVELS.map((l, i) => (
                            <TouchableOpacity
                                key={l.id}
                                style={{
                                    borderWidth: 1, borderColor: selectedLevel === l.id ? T.color.semantic.success : '#333',
                                    backgroundColor: selectedLevel === l.id ? `${T.color.semantic.success}15` : 'transparent',
                                    padding: 16, marginBottom: 12, borderRadius: 4,
                                    flexDirection: 'row', alignItems: 'center'
                                }}
                                onPress={() => handleSelectLevel(l.id)}
                            >
                                <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: selectedLevel === l.id ? T.color.semantic.success : '#888', marginRight: 16 }}>
                                    {`[0${i + 1}]`}
                                </Text>
                                <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: selectedLevel === l.id ? '#fff' : '#ccc', fontSize: 15 }}>
                                    {l.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </Animated.View>
                )}

            </View>
        </SafeAreaView>
    )
}
