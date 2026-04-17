import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { Feather } from '@expo/vector-icons'
import { T, typePresets } from '../../lib/theme'

export type AnalysisTransportMode = 'connecting' | 'sse' | 'polling'

export type AnalysisPipelineStep = {
    label: string
    icon: string
    xp: number
}

type AnalysisProgressProps = {
    progress: number
    funFact: string
    steps: readonly AnalysisPipelineStep[]
    transportMode: AnalysisTransportMode
}

function transportLabel(mode: AnalysisTransportMode): string {
    if (mode === 'sse') return 'Live stream'
    if (mode === 'polling') return 'Fallback polling'
    return 'Connecting stream'
}

const StepRow = memo(function StepRow({ step, index, progress, completed, totalSteps }: {
    step: AnalysisPipelineStep
    index: number
    progress: number
    completed: boolean
    totalSteps: number
}) {
    const threshold = ((index + 1) / totalSteps) * 100
    const isDone = progress >= threshold
    const isCurrent = !completed &&
        progress >= (index / totalSteps) * 100 &&
        progress < threshold

    const dotColor = isDone
        ? T.color.semantic.success
        : isCurrent
            ? T.color.brand.primary
            : T.color.bg.tertiary

    return (
        <Animated.View entering={FadeInDown.delay(index * 60).duration(280)} style={styles.stepRow}>
            <View style={[styles.stepDot, { backgroundColor: dotColor }]}>
                {isDone ? <Feather name="check" size={12} color="#fff" /> : null}
                {isCurrent ? <View style={styles.stepDotActive} /> : null}
            </View>

            <View style={styles.stepFlex}>
                <Text style={[
                    styles.stepLabel,
                    (isDone || isCurrent) ? styles.stepLabelActive : null,
                    isCurrent ? styles.stepLabelCurrent : null,
                ]}>
                    {step.icon}  {step.label}
                </Text>
            </View>

            <Text style={[styles.stepXP, isDone ? styles.stepXPDone : null]}>
                +{step.xp} XP
            </Text>
        </Animated.View>
    )
})

export const AnalysisProgress = memo(function AnalysisProgress({
    progress,
    funFact,
    steps,
    transportMode,
}: AnalysisProgressProps) {
    const safeProgress = Math.max(0, Math.min(100, progress))

    return (
        <View style={styles.container}>
            <View style={styles.progressTrack}>
                <Animated.View
                    style={[styles.progressFill, { width: `${Math.round(safeProgress)}%` }]}
                    entering={FadeIn.duration(180)}
                />
            </View>

            <Text style={styles.progressPct}>{Math.round(safeProgress)}%</Text>

            <View style={styles.transportPill}>
                <View style={[
                    styles.transportDot,
                    transportMode === 'sse'
                        ? styles.transportDotLive
                        : transportMode === 'polling'
                            ? styles.transportDotFallback
                            : styles.transportDotConnecting,
                ]} />
                <Text style={styles.transportText}>{transportLabel(transportMode)}</Text>
            </View>

            <Animated.Text key={funFact} entering={FadeIn.duration(350)} style={styles.funFact}>
                {funFact}
            </Animated.Text>

            <View style={styles.stepsCard}>
                {steps.map((step, index) => (
                    <StepRow
                        key={step.label}
                        step={step}
                        index={index}
                        progress={safeProgress}
                        completed={safeProgress >= 100}
                        totalSteps={steps.length}
                    />
                ))}
            </View>
        </View>
    )
})

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    progressTrack: {
        height: 6,
        backgroundColor: T.color.bg.tertiary,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: T.spacing[6],
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
        backgroundColor: T.color.brand.primary,
    },
    progressPct: {
        ...typePresets.statLarge,
        color: T.color.brand.primary,
        textAlign: 'center',
        marginBottom: T.spacing[2],
        fontVariant: ['tabular-nums'],
    },
    transportPill: {
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: T.spacing[2],
        borderRadius: T.radius.full,
        paddingHorizontal: T.spacing[3],
        paddingVertical: T.spacing[2],
        borderWidth: 1,
        borderColor: T.color.border.base,
        backgroundColor: 'rgba(255,255,255,0.04)',
        marginBottom: T.spacing[6],
    },
    transportDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    transportDotLive: {
        backgroundColor: T.color.semantic.success,
    },
    transportDotFallback: {
        backgroundColor: T.color.semantic.warning,
    },
    transportDotConnecting: {
        backgroundColor: T.color.semantic.info,
    },
    transportText: {
        ...typePresets.overline,
        fontSize: 10,
        color: T.color.text.secondary,
    },
    funFact: {
        ...typePresets.caption,
        color: T.color.text.secondary,
        textAlign: 'center',
        marginBottom: T.spacing[8],
        fontStyle: 'italic',
        paddingHorizontal: T.spacing[5],
    },
    stepsCard: {
        ...T.glass.base,
        borderRadius: T.radius.xl,
        padding: T.spacing[4],
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: T.spacing[3],
        paddingVertical: T.spacing[2],
        paddingHorizontal: T.spacing[1],
    },
    stepDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepDotActive: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#fff',
    },
    stepFlex: {
        flex: 1,
    },
    stepLabel: {
        ...typePresets.caption,
        color: T.color.text.tertiary,
        fontFamily: T.fonts.body.medium,
    },
    stepLabelActive: {
        color: T.color.text.primary,
    },
    stepLabelCurrent: {
        fontFamily: T.fonts.body.bold,
    },
    stepXP: {
        ...typePresets.overline,
        color: T.color.brand.primary,
        opacity: 0.4,
        fontSize: 10,
    },
    stepXPDone: {
        color: T.color.semantic.success,
        opacity: 1,
    },
})
