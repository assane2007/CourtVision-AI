import { useMemo, useState, type ReactNode } from 'react'
import {
    View,
    Text,
    ScrollView,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { T, typePresets } from '../../lib/theme'
import {
    useV6ControlCenter,
    type V6ArenaMode,
    type V6HorseDifficulty,
    type V6HorsePersonality,
} from '../../hooks/useV6ControlCenter'

const type = typePresets

const ARENA_MODES: V6ArenaMode[] = ['shootout', 'accuracy', 'speed', 'clutch', 'knockout']
const HORSE_DIFFICULTIES: V6HorseDifficulty[] = ['rookie', 'pro', 'allstar', 'legend']
const HORSE_PERSONALITIES: V6HorsePersonality[] = ['classic', 'aggressive', 'creative', 'defensive']

function clampNumber(value: string, min: number, max: number, fallback: number): number {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) {
        return fallback
    }
    return Math.min(max, Math.max(min, Math.round(parsed)))
}

function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format((Number(cents) || 0) / 100)
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
                        <Text style={[styles.selectionChipText, selected && styles.selectionChipTextActive]}>{value.toUpperCase()}</Text>
                    </TouchableOpacity>
                )
            })}
        </View>
    )
}

function SectionCard({ title, icon, children }: { title: string; icon: keyof typeof Feather.glyphMap; children: ReactNode }) {
    return (
        <View style={[styles.card, T.glass.base]}>
            <View style={styles.cardHeader}>
                <Feather name={icon} size={18} color={T.color.brand.primary} />
                <Text style={styles.cardTitle}>{title}</Text>
            </View>
            {children}
        </View>
    )
}

export default function V6ControlCenterScreen() {
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

        horseState,
        horseLoading,
        horseActionLoading,
        horseError,
        startHorseGame,
        generateHorseChallenge,
        submitHorseAttempt,

        drills,
        drillsLoading,
        drillsActionLoading,
        drillsError,
        loadMarketplace,
        purchaseDrill,

        reportsLoading,
        reportsError,
        downloadSessionReportPdf,
        downloadScoutReportPdf,

        refreshAll,
    } = useV6ControlCenter()

    const [arenaMode, setArenaMode] = useState<V6ArenaMode>('shootout')
    const [arenaMaxPlayersInput, setArenaMaxPlayersInput] = useState('4')
    const [arenaTotalRoundsInput, setArenaTotalRoundsInput] = useState('3')
    const [arenaShotsPerRoundInput, setArenaShotsPerRoundInput] = useState('10')
    const [arenaZone, setArenaZone] = useState('midrange')

    const [horseDifficulty, setHorseDifficulty] = useState<V6HorseDifficulty>('pro')
    const [horsePersonality, setHorsePersonality] = useState<V6HorsePersonality>('classic')

    const [drillSearch, setDrillSearch] = useState('')
    const [sessionReportId, setSessionReportId] = useState('')
    const [scoutUserId, setScoutUserId] = useState('')

    const visibleDrills = useMemo(() => {
        const query = drillSearch.trim().toLowerCase()
        if (!query) {
            return drills
        }
        return drills.filter((pack) => (
            pack.title.toLowerCase().includes(query)
            || pack.description.toLowerCase().includes(query)
            || pack.category.toLowerCase().includes(query)
        ))
    }, [drills, drillSearch])

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

    const handleSearchDrills = async () => {
        await loadMarketplace(drillSearch)
    }

    const handlePurchaseDrill = async (packId: string) => {
        try {
            await purchaseDrill(packId)
            Alert.alert('Marketplace', 'Drill purchased successfully.')
        } catch (error) {
            Alert.alert('Marketplace', error instanceof Error ? error.message : 'Unable to purchase drill.')
        }
    }

    const handleDownloadSessionPdf = async () => {
        const sessionId = sessionReportId.trim()
        if (!sessionId) {
            Alert.alert('Reports', 'Enter a session UUID first.')
            return
        }

        try {
            await downloadSessionReportPdf(sessionId)
        } catch (error) {
            Alert.alert('Reports', error instanceof Error ? error.message : 'Unable to download session report.')
        }
    }

    const handleDownloadScoutPdf = async () => {
        const userId = scoutUserId.trim()
        if (!userId) {
            Alert.alert('Reports', 'Enter a player UUID first.')
            return
        }

        try {
            await downloadScoutReportPdf(userId)
        } catch (error) {
            Alert.alert('Reports', error instanceof Error ? error.message : 'Unable to download scout report.')
        }
    }

    return (
        <SafeAreaView style={styles.screen}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerOverline}>MOBILE V6 CONTROL CENTER</Text>
                        <Text style={styles.headerTitle}>Arena, HORSE, Marketplace, Reports</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.refreshButton, T.glass.vivid]}
                        onPress={() => {
                            void refreshAll(drillSearch)
                        }}
                        activeOpacity={0.9}
                    >
                        <Feather name="refresh-cw" size={14} color={T.color.brand.primary} />
                        <Text style={styles.refreshButtonText}>Refresh</Text>
                    </TouchableOpacity>
                </View>

                <SectionCard title="Arena Multiplayer" icon="crosshair">
                    {arenaError ? <Text style={styles.errorText}>{arenaError}</Text> : null}

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

                    <Text style={styles.subTitle}>Available matches</Text>
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

                    {activeArenaMatchId ? (
                        <View style={[styles.activeBlock, T.glass.vivid]}>
                            <View style={styles.activeRow}>
                                <Text style={styles.activeLabel}>Active Match</Text>
                                <TouchableOpacity onPress={() => { void handleReadyArena() }}>
                                    <Text style={styles.inlineAction}>Ready</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.matchId}>{activeArenaMatchId}</Text>

                            <View style={styles.shotControls}>
                                <TextInput
                                    value={arenaZone}
                                    onChangeText={setArenaZone}
                                    placeholder="Shot zone (midrange, wing3, paint...)"
                                    placeholderTextColor={T.color.text.tertiary}
                                    style={[styles.input, styles.zoneInput]}
                                />
                                <TouchableOpacity style={styles.madeButton} onPress={() => { void handleArenaShot('made') }}>
                                    <Text style={styles.madeButtonText}>Made</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.missedButton} onPress={() => { void handleArenaShot('missed') }}>
                                    <Text style={styles.missedButtonText}>Missed</Text>
                                </TouchableOpacity>
                            </View>

                            {arenaScoreboard ? (
                                <View>
                                    <Text style={styles.scoreboardMeta}>
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
                        </View>
                    ) : null}
                </SectionCard>

                <SectionCard title="HORSE IA" icon="cpu">
                    {horseError ? <Text style={styles.errorText}>{horseError}</Text> : null}

                    <Text style={styles.subTitle}>Difficulty</Text>
                    <SelectionRow values={HORSE_DIFFICULTIES} active={horseDifficulty} onChange={setHorseDifficulty} />

                    <Text style={styles.subTitle}>AI Personality</Text>
                    <SelectionRow values={HORSE_PERSONALITIES} active={horsePersonality} onChange={setHorsePersonality} />

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => { void handleStartHorse() }}
                        disabled={horseActionLoading}
                        activeOpacity={0.85}
                    >
                        {horseActionLoading ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <Text style={styles.primaryButtonText}>Start HORSE Game</Text>
                        )}
                    </TouchableOpacity>

                    {horseLoading ? (
                        <ActivityIndicator color={T.color.brand.primary} size="small" style={styles.loader} />
                    ) : horseState ? (
                        <View style={[styles.activeBlock, T.glass.thin]}>
                            <View style={styles.scoreRow}>
                                <Text style={styles.scorePlayer}>Status: {horseState.game.status.toUpperCase()}</Text>
                                <Text style={styles.scoreValue}>Score: {horseState.game.score}</Text>
                            </View>
                            <Text style={styles.listItemMeta}>
                                Round {horseState.round} • You: {horseState.playerLetters || '-'} • AI: {horseState.aiLetters || '-'}
                            </Text>

                            {horseState.currentChallenge ? (
                                <View style={styles.challengeBox}>
                                    <Text style={styles.challengeTitle}>Current Challenge</Text>
                                    <Text style={styles.challengeText}>{horseState.currentChallenge.description}</Text>
                                    <Text style={styles.listItemMeta}>
                                        Zone: {horseState.currentChallenge.targetZone} • Technique: {horseState.currentChallenge.targetTechnique}
                                    </Text>
                                </View>
                            ) : (
                                <Text style={styles.mutedText}>No active challenge yet.</Text>
                            )}

                            <View style={styles.rowButtons}>
                                <TouchableOpacity style={styles.secondaryButton} onPress={() => { void handleGenerateHorseChallenge() }}>
                                    <Text style={styles.secondaryButtonText}>Generate</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.madeButton} onPress={() => { void handleHorseAttempt(true) }}>
                                    <Text style={styles.madeButtonText}>Success</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.missedButton} onPress={() => { void handleHorseAttempt(false) }}>
                                    <Text style={styles.missedButtonText}>Miss</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.mutedText}>{horseState.message}</Text>
                        </View>
                    ) : (
                        <Text style={styles.mutedText}>No active HORSE game.</Text>
                    )}
                </SectionCard>

                <SectionCard title="Drills Marketplace" icon="shopping-bag">
                    {drillsError ? <Text style={styles.errorText}>{drillsError}</Text> : null}

                    <View style={styles.searchRow}>
                        <TextInput
                            value={drillSearch}
                            onChangeText={setDrillSearch}
                            placeholder="Search drills"
                            placeholderTextColor={T.color.text.tertiary}
                            style={[styles.input, styles.searchInput]}
                        />
                        <TouchableOpacity style={styles.secondaryButton} onPress={() => { void handleSearchDrills() }}>
                            <Text style={styles.secondaryButtonText}>Search</Text>
                        </TouchableOpacity>
                    </View>

                    {drillsLoading ? (
                        <ActivityIndicator color={T.color.brand.primary} size="small" style={styles.loader} />
                    ) : visibleDrills.length === 0 ? (
                        <Text style={styles.mutedText}>No drill packs found.</Text>
                    ) : (
                        visibleDrills.slice(0, 8).map((pack) => (
                            <View key={pack.id} style={[styles.listItem, T.glass.thin]}>
                                <View style={styles.listItemTextWrap}>
                                    <Text style={styles.listItemTitle}>{pack.title}</Text>
                                    <Text style={styles.listItemMeta}>
                                        {pack.category} • {pack.difficulty} • Rating {Number(pack.rating || 0).toFixed(1)}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.secondaryButton}
                                    onPress={() => { void handlePurchaseDrill(pack.id) }}
                                    disabled={Boolean(pack.isPurchased) || drillsActionLoading}
                                >
                                    <Text style={styles.secondaryButtonText}>{pack.isPurchased ? 'Owned' : formatCurrency(pack.priceCents)}</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </SectionCard>

                <SectionCard title="PDF Reports" icon="file-text">
                    {reportsError ? <Text style={styles.errorText}>{reportsError}</Text> : null}

                    <TextInput
                        value={sessionReportId}
                        onChangeText={setSessionReportId}
                        placeholder="Session UUID"
                        placeholderTextColor={T.color.text.tertiary}
                        style={styles.input}
                    />
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => { void handleDownloadSessionPdf() }}
                        disabled={reportsLoading}
                    >
                        {reportsLoading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.primaryButtonText}>Download Session PDF</Text>}
                    </TouchableOpacity>

                    <TextInput
                        value={scoutUserId}
                        onChangeText={setScoutUserId}
                        placeholder="Player UUID for Scout Report"
                        placeholderTextColor={T.color.text.tertiary}
                        style={styles.input}
                    />
                    <TouchableOpacity
                        style={styles.secondaryPrimaryButton}
                        onPress={() => { void handleDownloadScoutPdf() }}
                        disabled={reportsLoading}
                    >
                        {reportsLoading ? <ActivityIndicator color={T.color.brand.primary} size="small" /> : <Text style={styles.secondaryPrimaryButtonText}>Download Scout PDF</Text>}
                    </TouchableOpacity>
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
        gap: T.spacing[4],
    },
    header: {
        marginTop: T.spacing[2],
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: T.spacing[3],
    },
    headerOverline: {
        ...type.overline,
        color: T.color.text.tertiary,
        letterSpacing: 1.8,
    },
    headerTitle: {
        marginTop: T.spacing[1],
        ...type.h2,
        color: T.color.text.primary,
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: T.spacing[2],
        borderRadius: T.radius.md,
        paddingHorizontal: T.spacing[3],
        paddingVertical: T.spacing[2],
    },
    refreshButtonText: {
        ...type.overline,
        color: T.color.brand.primary,
        fontSize: 10,
    },
    card: {
        borderRadius: T.radius.lg,
        borderWidth: 1,
        borderColor: T.color.border.base,
        padding: T.spacing[4],
        gap: T.spacing[3],
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: T.spacing[2],
    },
    cardTitle: {
        ...type.sectionTitle,
        color: T.color.text.primary,
    },
    subTitle: {
        ...type.overline,
        color: T.color.text.secondary,
        marginTop: T.spacing[1],
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
    secondaryPrimaryButton: {
        borderRadius: T.radius.md,
        borderWidth: 1,
        borderColor: `${T.color.brand.primary}80`,
        backgroundColor: `${T.color.brand.primary}10`,
        paddingVertical: T.spacing[3],
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
    },
    secondaryPrimaryButtonText: {
        ...type.overline,
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
    activeBlock: {
        borderRadius: T.radius.md,
        borderWidth: 1,
        borderColor: `${T.color.brand.primary}45`,
        padding: T.spacing[3],
        gap: T.spacing[2],
    },
    activeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    activeLabel: {
        ...type.overline,
        color: T.color.brand.primary,
    },
    inlineAction: {
        ...type.overline,
        color: T.color.brand.primary,
        fontSize: 10,
    },
    matchId: {
        ...type.caption,
        color: T.color.text.secondary,
    },
    shotControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: T.spacing[2],
        marginTop: T.spacing[1],
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
    scoreboardMeta: {
        ...type.overline,
        color: T.color.text.secondary,
        fontSize: 10,
        marginTop: T.spacing[1],
    },
    scoreRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: T.spacing[1],
    },
    scorePlayer: {
        ...type.caption,
        color: T.color.text.primary,
    },
    scoreValue: {
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
        marginTop: T.spacing[2],
    },
    searchRow: {
        flexDirection: 'row',
        gap: T.spacing[2],
        alignItems: 'center',
    },
    searchInput: {
        flex: 1,
    },
})
