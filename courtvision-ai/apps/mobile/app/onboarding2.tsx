import { View, Text, TouchableOpacity, SafeAreaView, Platform, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring, interpolateColor } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { T } from '../lib/theme'
import { useStore } from '../lib/store'
import { colors, space } from '../constants/tokens'

const POSITIONS = [
    { label: 'Point Guard', icon: '⚡️', id: 'PG' },
    { label: 'Shooting Guard', icon: '🎯', id: 'SG' },
    { label: 'Small Forward', icon: '🦅', id: 'SF' },
    { label: 'Power Forward', icon: '🦍', id: 'PF' },
    { label: 'Center', icon: '🧱', id: 'C' },
]

const LEVELS = [
    { label: 'Beginner', val: '0-1 YR', color: '#3b82f6', id: 'Beginner' },
    { label: 'Intermediate', val: '1-3 YRS', color: '#10b981', id: 'Intermediate' },
    { label: 'Advanced', val: '3-5 YRS', color: '#f59e0b', id: 'Advanced' },
    { label: 'Elite', val: '5+ YRS', color: '#ef4444', id: 'Pro' },
]

// Addictive Bouncy Card
function BouncyCard({ label, icon, isSelected, onPress }: { label: string, icon: string, isSelected: boolean, onPress: () => void }) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        borderColor: isSelected ? colors.fire : '#222',
        backgroundColor: isSelected ? 'rgba(255,68,0,0.15)' : '#111',
    }));

    return (
        <Pressable
            onPressIn={() => {
                scale.value = withSpring(0.95);
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            onPressOut={() => {
                scale.value = withSpring(1);
            }}
            onPress={onPress}
            style={{ width: '48%', marginBottom: 16 }}
        >
            <Animated.View style={[styles.tile, animatedStyle, isSelected && styles.tileSelected]}>
                <Text style={styles.tileIcon}>{icon}</Text>
                <Text style={[styles.tileLabel, { color: isSelected ? colors.snow : '#888' }]}>{label}</Text>
            </Animated.View>
        </Pressable>
    )
}

function BouncyRow({ title, desc, tagText, tagColor, isSelected, onPress }: { title: string, desc: string, tagText: string, tagColor: string, isSelected: boolean, onPress: () => void }) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        borderColor: isSelected ? tagColor : '#222',
        backgroundColor: isSelected ? `${tagColor}20` : '#111',
    }));

    return (
        <Pressable
            onPressIn={() => {
                scale.value = withSpring(0.96);
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            onPressOut={() => {
                scale.value = withSpring(1);
            }}
            onPress={onPress}
        >
            <Animated.View style={[styles.rowCard, animatedStyle, isSelected && { shadowColor: tagColor, shadowOffset: { width: 0, height: 0 }, shadowRadius: 15, shadowOpacity: 0.4 }]}>
                <View>
                    <Text style={[styles.rowTitle, { color: isSelected ? colors.snow : '#888' }]}>{title}</Text>
                    <Text style={styles.rowDesc}>{desc}</Text>
                </View>
                <View style={[styles.rowTag, { backgroundColor: tagColor }]}>
                    <Text style={styles.rowTagText}>{tagText}</Text>
                </View>
            </Animated.View>
        </Pressable>
    )
}

export default function Onboarding2() {
    const router = useRouter()
    const [step, setStep] = useState<'position' | 'level'>('position')
    const [selectedPos, setSelectedPos] = useState<string | null>(null)
    const [selectedLevel, setSelectedLevel] = useState<string | null>(null)

    const handleSelectPos = (val: string) => {
        if (Platform.OS !== 'web') Haptics.selectionAsync()
        setSelectedPos(val)
        // Auto-advance after small delay
        setTimeout(() => setStep('level'), 300)
    }

    const handleSelectLevel = (val: string) => {
        if (Platform.OS !== 'web') Haptics.selectionAsync()
        setSelectedLevel(val)
    }

    const handleNext = () => {
        if (step === 'position') {
            if (!selectedPos) return;
            setStep('level');
        } else {
            if (!selectedLevel) return;
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

            // Setup user in store
            useStore.setState((s) => ({
                user: s.user
                    ? { ...s.user, position: selectedPos ?? 'PG', level: selectedLevel ?? 'Beginner' }
                    : {
                        id: '', username: '', full_name: 'Player',
                        position: selectedPos ?? 'PG', level: selectedLevel ?? 'Beginner',
                        streak: 0, mental_score: 0, shooting_grade: 'B',
                        shooting_fg_pct: 0, xp: 0, xp_level: 1,
                        total_sessions: 0, badges_count: 0,
                    },
            }))
            router.push('/onboarding-camera')
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>

                {/* Header Back button & Progress */}
                <View style={styles.header}>
                    <Pressable onPress={() => step === 'level' ? setStep('position') : router.back()}>
                        <View style={styles.backBtn}>
                            <Text style={styles.backBtnText}>{'<'}</Text>
                        </View>
                    </Pressable>
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressDot, step === 'position' ? styles.progressActive : null]} />
                        <View style={[styles.progressDot, step === 'level' ? styles.progressActive : null]} />
                    </View>
                </View>

                {/* Animated Titles */}
                <Animated.View entering={FadeInDown.duration(500)} style={styles.titleContainer}>
                    <Text style={styles.title}>
                        {step === 'position' ? 'Select Archetype' : 'Select Experience'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {step === 'position'
                            ? 'Define your playstyle.'
                            : 'Set the AI evaluation strictness.'}
                    </Text>
                </Animated.View>

                {/* Grid vs List layout based on step */}
                <View style={styles.listContainer}>
                    {step === 'position' && (
                        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.gridBox}>
                            {POSITIONS.map((p, i) => (
                                <BouncyCard
                                    key={p.id}
                                    label={p.label}
                                    icon={p.icon}
                                    isSelected={selectedPos === p.id}
                                    onPress={() => handleSelectPos(p.id)}
                                />
                            ))}
                        </Animated.View>
                    )}

                    {step === 'level' && (
                        <View>
                            {LEVELS.map((l, i) => (
                                <Animated.View key={l.id} entering={FadeInDown.delay(i * 100).duration(400)}>
                                    <BouncyRow
                                        title={l.label}
                                        desc='Calibrate feedback algorithms.'
                                        tagText={l.val}
                                        tagColor={l.color}
                                        isSelected={selectedLevel === l.id}
                                        onPress={() => handleSelectLevel(l.id)}
                                    />
                                </Animated.View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Bouncy Next Button */}
                {(selectedPos && step === 'position') || (selectedLevel && step === 'level') ? (
                    <Animated.View entering={FadeInDown.duration(300).springify()} style={styles.footer}>
                        <Pressable
                            style={styles.nextBtn}
                            onPress={handleNext}
                        >
                            <Text style={styles.nextBtnText}>Continue</Text>
                        </Pressable>
                    </Animated.View>
                ) : null}

            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    content: {
        flex: 1,
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: space[6],
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#111',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#222',
    },
    backBtnText: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        fontSize: 18,
        color: colors.cloud,
        fontWeight: 'bold',
    },
    progressContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    progressDot: {
        width: 32,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#222',
    },
    progressActive: {
        backgroundColor: colors.snow,
    },
    titleContainer: {
        marginBottom: space[10],
    },
    title: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        fontSize: 40,
        fontWeight: '900',
        color: colors.snow,
        marginBottom: 8,
        letterSpacing: -1,
    },
    subtitle: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        fontSize: 18,
        color: colors.fog,
        fontWeight: '500',
    },
    listContainer: {
        flex: 1,
    },
    gridBox: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    tile: {
        backgroundColor: '#111',
        borderRadius: 24,
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        aspectRatio: 1, // Make them squares
    },
    tileSelected: {
        shadowColor: colors.fire,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 20,
        shadowOpacity: 0.4,
        zIndex: 10,
    },
    tileIcon: {
        fontSize: 40,
        marginBottom: 12,
    },
    tileLabel: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        fontSize: 14,
        fontWeight: '800',
        textAlign: 'center',
    },
    rowCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderRadius: 24,
        marginBottom: 16,
        borderWidth: 2,
    },
    rowTitle: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 4,
    },
    rowDesc: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    rowTag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    rowTagText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 12,
    },
    footer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 40 : 20,
        left: 24,
        right: 24,
    },
    nextBtn: {
        backgroundColor: colors.snow,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.snow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
    },
    nextBtnText: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        fontSize: 18,
        fontWeight: '800',
        color: '#000',
    }
})
