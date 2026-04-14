import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useState, type ReactNode } from 'react'
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { T, typePresets } from '../../lib/theme'
import { useV6ControlCenter, type V6ArenaMode } from '../../hooks/useV6ControlCenter'
import { AppBackground } from '../../components/ui'

const type = typePresets
const ARENA_MODES: V6ArenaMode[] = ['shootout', 'accuracy', 'speed', 'clutch', 'knockout']

function clampNumber(value: string, min: number, max: number, fallback: number): number {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) {
        return fallback
    }
    return Math.min(max, Math.max(min, Math.round(parsed)))
}

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

export default function V6ArenaScreen() {
    const router = useRouter()
    const {
        arenaMatches,
        arenaLoading,
        arenaActionLoading,
        arenaError,
        activeArenaMatchId,
        arenaScoreboard,
        createArenaMatch,
        joinArenaMatch,
        readyArenaMatch,
        submitArenaShot,
        refreshAll,
    } = useV6ControlCenter({
        arena: true,
        horse: false,
        marketplace: false,
    })

    const [arenaMode, setArenaMode] = useState<V6ArenaMode>('shootout')
    const [arenaMaxPlayersInput, setArenaMaxPlayersInput] = useState('4')
    const [arenaTotalRoundsInput, setArenaTotalRoundsInput] = useState('3')
    const [arenaShotsPerRoundInput, setArenaShotsPerRoundInput] = useState('10')
    const [arenaZone, setArenaZone] = useState('midrange')

    const handleCreateArena = async () => {
        try {
            await createArenaMatch({
                mode: arenaMode,
                maxPlayers: clampNumber(arenaMaxPlayersInput, 2, 8, 4),
                totalRounds: clampNumber(arenaTotalRoundsInput, 1, 10, 3),
                shotsPerRound: clampNumber(arenaShotsPerRoundInput, 5, 50, 10),
            })
            Alert.alert('Arena', 'Match created successfully.')
        } catch (error) {
            Alert.alert('Arena', error instanceof Error ? error.message : 'Unable to create match.')
        }
    }

    const handleJoinArena = async (matchId: string) => {
        try {
            await joinArenaMatch(matchId)
            Alert.alert('Arena', 'Joined match successfully.')
        } catch (error) {
            Alert.alert('Arena', error instanceof Error ? error.message : 'Unable to join match.')
        }
    }

    const handleReadyArena = async () => {
        try {
            await readyArenaMatch()
            Alert.alert('Arena', 'Ready status submitted.')
        } catch (error) {
            Alert.alert('Arena', error instanceof Error ? error.message : 'Unable to set ready state.')
        }
    }

    const handleArenaShot = async (result: 'made' | 'missed') => {
        try {
            await submitArenaShot(result, arenaZone.trim() || 'midrange')
        } catch (error) {
            Alert.alert('Arena', error instanceof Error ? error.message : 'Unable to submit shot.')
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
                        <Text style={styles.title}>Arena Multiplayer</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.refreshButton}
                        activeOpacity={0.85}
                        onPress={() => {
                            void refreshAll()
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Refresh Arena module"
                    >
                        <Feather name="refresh-cw" size={14} color={T.color.brand.primary} />
                    </TouchableOpacity>
                </View>

                <SectionCard title="Create Match">
                    {arenaError ? <Text style={styles.errorText}>{arenaError}</Text> : null}

                    <Text style={styles.label}>Mode</Text>
                    <SelectionRow values={ARENA_MODES} active={arenaMode} onChange={setArenaMode} />

                    <View style={styles.rowInputs}>
                        <TextInput
                            value={arenaMaxPlayersInput}
                            onChangeText={setArenaMaxPlayersInput}
                            keyboardType="number-pad"
                            placeholder="Max players"
                            placeholderTextColor={T.color.text.tertiary}
                            style={styles.input}
                        />
                        <TextInput
                            value={arenaTotalRoundsInput}
                            onChangeText={setArenaTotalRoundsInput}
                            keyboardType="number-pad"
                            placeholder="Rounds"
                            placeholderTextColor={T.color.text.tertiary}
                            style={styles.input}
                        />
                        <TextInput
                            value={arenaShotsPerRoundInput}
                            onChangeText={setArenaShotsPerRoundInput}
                            keyboardType="number-pad"
                            placeholder="Shots/round"
                            placeholderTextColor={T.color.text.tertiary}
                            style={styles.input}
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => {
                            void handleCreateArena()
                        }}
                        disabled={arenaActionLoading}
                        activeOpacity={0.85}
                    >
                        {arenaActionLoading ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <Text style={styles.primaryButtonText}>Create Arena Match</Text>
                        )}
                    </TouchableOpacity>
                </SectionCard>

                <SectionCard title="Public Matches">
                    {arenaLoading ? (
                        <ActivityIndicator color={T.color.brand.primary} size="small" style={styles.loader} />
                    ) : arenaMatches.length === 0 ? (
                        <Text style={styles.mutedText}>No public matches available right now.</Text>
                    ) : (
                        arenaMatches.map((match) => (
                            <View key={match.id} style={[styles.listItem, T.glass.thin]}>
                                <View style={styles.listItemTextWrap}>
                                    <Text style={styles.listItemTitle}>{match.mode.toUpperCase()}</Text>
                                    <Text style={styles.listItemMeta}>
                                        {match.players.length}/{match.config.maxPlayers} players • {match.status}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.secondaryButton}
                                    onPress={() => {
                                        void handleJoinArena(match.id)
                                    }}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.secondaryButtonText}>Join</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </SectionCard>

                {activeArenaMatchId ? (
                    <SectionCard title="Active Match">
                        <View style={styles.activeRow}>
                            <Text style={styles.mutedText}>{activeArenaMatchId}</Text>
                            <TouchableOpacity onPress={() => { void handleReadyArena() }} activeOpacity={0.85}>
                                <Text style={styles.inlineAction}>Ready</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.shotControls}>
                            <TextInput
                                value={arenaZone}
                                onChangeText={setArenaZone}
                                placeholder="Shot zone"
                                placeholderTextColor={T.color.text.tertiary}
                                style={[styles.input, styles.zoneInput]}
                            />
                            <TouchableOpacity
                                style={styles.madeButton}
                                onPress={() => {
                                    void handleArenaShot('made')
                                }}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.madeButtonText}>Made</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.missedButton}
                                onPress={() => {
                                    void handleArenaShot('missed')
                                }}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.missedButtonText}>Missed</Text>
                            </TouchableOpacity>
                        </View>

                        {arenaScoreboard ? (
                            <View style={styles.scoreboardWrap}>
                                <Text style={styles.listItemMeta}>
                                    Round {arenaScoreboard.round}/{arenaScoreboard.totalRounds} • {arenaScoreboard.status}
                                </Text>
                                {arenaScoreboard.players.map((player) => (
                                    <View key={player.userId} style={styles.scoreRow}>
                                        <Text style={styles.scorePlayer}>{player.username}</Text>
                                        <Text style={styles.scoreValue}>{player.score} pts • {player.accuracy}%</Text>
                                    </View>
                                ))}
                            </View>
                        ) : null}
                    </SectionCard>
                ) : null}
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
    rowInputs: {
        flexDirection: 'row',
        gap: T.spacing[2],
    },
    input: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: T.color.border.base,
        borderRadius: T.radius.md,
        color: T.color.text.primary,
        paddingHorizontal: T.spacing[3],
        paddingVertical: T.spacing[3],
        fontFamily: T.fonts.body.medium,
        fontSize: 13,
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
    loader: {
        marginVertical: T.spacing[2],
    },
    mutedText: {
        ...type.caption,
        color: T.color.text.secondary,
    },
    errorText: {
        ...type.caption,
        color: T.color.semantic.error,
    },
    listItem: {
        borderRadius: T.radius.md,
        borderWidth: 1,
        borderColor: T.color.border.soft,
        padding: T.spacing[3],
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: T.spacing[3],
    },
    listItemTextWrap: {
        flex: 1,
    },
    listItemTitle: {
        ...type.cardTitle,
        color: T.color.text.primary,
    },
    listItemMeta: {
        ...type.caption,
        color: T.color.text.secondary,
        marginTop: 2,
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
    activeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    inlineAction: {
        ...type.overline,
        color: T.color.brand.primary,
        fontSize: 10,
    },
    shotControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: T.spacing[2],
    },
    zoneInput: {
        flex: 1,
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
    scoreboardWrap: {
        marginTop: T.spacing[1],
        gap: T.spacing[1],
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
})
