import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useState, type ReactNode } from 'react'
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { T, typePresets } from '../../lib/theme'
import {
    useV6ControlCenter,
    type V6HorseDifficulty,
    type V6HorsePersonality,
} from '../../hooks/useV6ControlCenter'
import { AppBackground } from '../../components/ui'

const type = typePresets

const HORSE_DIFFICULTIES: V6HorseDifficulty[] = ['rookie', 'pro', 'allstar', 'legend']
const HORSE_PERSONALITIES: V6HorsePersonality[] = ['classic', 'aggressive', 'creative', 'defensive']

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
    return (
        <View style={[styles.card, T.glass.base]}>
            <Text style={styles.cardTitle}>{title}</Text>
            {children}
        </View>
    )
}

function SelectionRow<T extends string>({
    values,
    active,
    onChange,
}: {
    values: readonly T[]
    active: T
    onChange: (value: T) => void
}) {
    return (
        <View style={styles.selectionRow}>
            {values.map((value) => {
                const selected = value === active
                return (
                    <TouchableOpacity
                        key={value}
                        style={[styles.selectionChip, selected && styles.selectionChipActive]}
                        onPress={() => onChange(value)}
                        activeOpacity={0.85}
                    >
                        <Text style={[styles.selectionChipText, selected && styles.selectionChipTextActive]}>
                            {value.toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                )
            })}
        </View>
    )
}

export default function V6HorseScreen() {
    const router = useRouter()
    const {
        horseState,
        horseLoading,
        horseActionLoading,
        horseError,
        startHorseGame,
        generateHorseChallenge,
        submitHorseAttempt,
        refreshAll,
    } = useV6ControlCenter({
        arena: false,
        horse: true,
        marketplace: false,
    })

    const [horseDifficulty, setHorseDifficulty] = useState<V6HorseDifficulty>('pro')
    const [horsePersonality, setHorsePersonality] = useState<V6HorsePersonality>('classic')

    const handleStartHorse = async () => {
        try {
            await startHorseGame(horseDifficulty, horsePersonality)
            Alert.alert('HORSE', 'HORSE game started.')
        } catch (error) {
            Alert.alert('HORSE', error instanceof Error ? error.message : 'Unable to start HORSE game.')
        }
    }

    const handleGenerateHorseChallenge = async () => {
        try {
            await generateHorseChallenge()
        } catch (error) {
            Alert.alert('HORSE', error instanceof Error ? error.message : 'Unable to generate challenge.')
        }
    }

    const handleHorseAttempt = async (success: boolean) => {
        const challengeId = horseState?.currentChallenge?.id
        if (!challengeId) {
            Alert.alert('HORSE', 'Generate a challenge first.')
            return
        }

        try {
            await submitHorseAttempt(challengeId, success)
        } catch (error) {
            Alert.alert('HORSE', error instanceof Error ? error.message : 'Unable to submit attempt.')
        }
    }

    return (
        <SafeAreaView style={styles.screen}>
            <AppBackground variant="focus" />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.replace('/(dashboard)/v6')}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel="Back to V6 modules"
                    >
                        <Feather name="arrow-left" size={16} color={T.color.text.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerTextWrap}>
                        <Text style={styles.overline}>V6 MODULE</Text>
                        <Text style={styles.title}>HORSE AI</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.refreshButton}
                        activeOpacity={0.85}
                        onPress={() => {
                            void refreshAll()
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Refresh HORSE module"
                    >
                        <Feather name="refresh-cw" size={14} color={T.color.brand.primary} />
                    </TouchableOpacity>
                </View>

                <SectionCard title="Game Setup">
                    {horseError ? <Text style={styles.errorText}>{horseError}</Text> : null}

                    <Text style={styles.label}>Difficulty</Text>
                    <SelectionRow values={HORSE_DIFFICULTIES} active={horseDifficulty} onChange={setHorseDifficulty} />

                    <Text style={styles.label}>AI Personality</Text>
                    <SelectionRow values={HORSE_PERSONALITIES} active={horsePersonality} onChange={setHorsePersonality} />

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => {
                            void handleStartHorse()
                        }}
                        disabled={horseActionLoading}
                        activeOpacity={0.85}
                    >
                        {horseActionLoading ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <Text style={styles.primaryButtonText}>Start HORSE Game</Text>
                        )}
                    </TouchableOpacity>
                </SectionCard>

                <SectionCard title="Active State">
                    {horseLoading ? (
                        <ActivityIndicator color={T.color.brand.primary} size="small" style={styles.loader} />
                    ) : horseState ? (
                        <View style={styles.stateWrap}>
                            <View style={styles.scoreRow}>
                                <Text style={styles.scorePlayer}>Status: {horseState.game.status.toUpperCase()}</Text>
                                <Text style={styles.scoreValue}>Score: {horseState.game.score}</Text>
                            </View>

                            <Text style={styles.metaText}>
                                Round {horseState.round} • You: {horseState.playerLetters || '-'} • AI: {horseState.aiLetters || '-'}
                            </Text>

                            {horseState.currentChallenge ? (
                                <View style={styles.challengeBox}>
                                    <Text style={styles.challengeTitle}>Current Challenge</Text>
                                    <Text style={styles.challengeText}>{horseState.currentChallenge.description}</Text>
                                    <Text style={styles.metaText}>
                                        Zone: {horseState.currentChallenge.targetZone} • Technique: {horseState.currentChallenge.targetTechnique}
                                    </Text>
                                </View>
                            ) : (
                                <Text style={styles.metaText}>No active challenge yet.</Text>
                            )}

                            <View style={styles.rowButtons}>
                                <TouchableOpacity
                                    style={styles.secondaryButton}
                                    onPress={() => {
                                        void handleGenerateHorseChallenge()
                                    }}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.secondaryButtonText}>Generate</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.madeButton}
                                    onPress={() => {
                                        void handleHorseAttempt(true)
                                    }}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.madeButtonText}>Success</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.missedButton}
                                    onPress={() => {
                                        void handleHorseAttempt(false)
                                    }}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.missedButtonText}>Miss</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.metaText}>{horseState.message}</Text>
                        </View>
                    ) : (
                        <Text style={styles.metaText}>No active HORSE game.</Text>
                    )}
                </SectionCard>
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: T.color.bg.primary,
    },
    content: {
        paddingHorizontal: T.spacing[4],
        paddingBottom: T.spacing[16],
        gap: T.spacing[3],
    },
    headerRow: {
        marginTop: T.spacing[2],
        flexDirection: 'row',
        alignItems: 'center',
        gap: T.spacing[2],
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: T.radius.md,
        borderWidth: 1,
        borderColor: T.color.border.base,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    headerTextWrap: {
        flex: 1,
    },
    overline: {
        ...type.overline,
        color: T.color.text.tertiary,
        letterSpacing: 1.6,
    },
    title: {
        ...type.h2,
        color: T.color.text.primary,
        marginTop: 2,
    },
    refreshButton: {
        width: 44,
        height: 44,
        borderRadius: T.radius.md,
        borderWidth: 1,
        borderColor: `${T.color.brand.primary}55`,
        backgroundColor: `${T.color.brand.primary}14`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    card: {
        borderRadius: T.radius.lg,
        borderWidth: 1,
        borderColor: T.color.border.base,
        padding: T.spacing[4],
        gap: T.spacing[3],
    },
    cardTitle: {
        ...type.sectionTitle,
        color: T.color.text.primary,
    },
    label: {
        ...type.overline,
        color: T.color.text.secondary,
    },
    selectionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: T.spacing[2],
    },
    selectionChip: {
        borderRadius: T.radius.full,
        borderWidth: 1,
        borderColor: T.color.border.base,
        paddingHorizontal: T.spacing[3],
        paddingVertical: T.spacing[2],
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    selectionChipActive: {
        backgroundColor: `${T.color.brand.primary}20`,
        borderColor: `${T.color.brand.primary}70`,
    },
    selectionChipText: {
        ...type.overline,
        color: T.color.text.secondary,
        fontSize: 10,
    },
    selectionChipTextActive: {
        color: T.color.brand.primary,
    },
    primaryButton: {
        borderRadius: T.radius.md,
        backgroundColor: T.color.brand.primary,
        paddingVertical: T.spacing[3],
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
    },
    primaryButtonText: {
        ...type.overline,
        color: '#FFF',
    },
    loader: {
        marginVertical: T.spacing[2],
    },
    stateWrap: {
        gap: T.spacing[2],
    },
    scoreRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    scorePlayer: {
        ...type.caption,
        color: T.color.text.primary,
    },
    scoreValue: {
        ...type.caption,
        color: T.color.text.secondary,
    },
    metaText: {
        ...type.caption,
        color: T.color.text.secondary,
    },
    challengeBox: {
        borderRadius: T.radius.md,
        borderWidth: 1,
        borderColor: `${T.color.brand.primary}40`,
        backgroundColor: `${T.color.brand.primary}10`,
        padding: T.spacing[3],
        gap: T.spacing[1],
    },
    challengeTitle: {
        ...type.overline,
        color: T.color.brand.primary,
        fontSize: 10,
    },
    challengeText: {
        ...type.body,
        color: T.color.text.primary,
    },
    rowButtons: {
        flexDirection: 'row',
        gap: T.spacing[2],
    },
    secondaryButton: {
        borderRadius: T.radius.md,
        borderWidth: 1,
        borderColor: `${T.color.brand.primary}60`,
        paddingHorizontal: T.spacing[3],
        paddingVertical: T.spacing[2],
    },
    secondaryButtonText: {
        ...type.overline,
        color: T.color.brand.primary,
        fontSize: 10,
    },
    madeButton: {
        borderRadius: T.radius.md,
        borderWidth: 1,
        borderColor: 'rgba(0, 217, 126, 0.65)',
        backgroundColor: 'rgba(0, 217, 126, 0.18)',
        paddingHorizontal: T.spacing[3],
        paddingVertical: T.spacing[2],
    },
    madeButtonText: {
        ...type.overline,
        color: T.color.semantic.success,
        fontSize: 10,
    },
    missedButton: {
        borderRadius: T.radius.md,
        borderWidth: 1,
        borderColor: 'rgba(255, 54, 89, 0.65)',
        backgroundColor: 'rgba(255, 54, 89, 0.18)',
        paddingHorizontal: T.spacing[3],
        paddingVertical: T.spacing[2],
    },
    missedButtonText: {
        ...type.overline,
        color: T.color.semantic.error,
        fontSize: 10,
    },
    errorText: {
        ...type.caption,
        color: T.color.semantic.error,
    },
})
