import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useMemo, useState, type ReactNode } from 'react'
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
import { useV6ControlCenter } from '../../hooks/useV6ControlCenter'
import { AppBackground } from '../../components/ui'

const type = typePresets

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
    return (
        <View style={[styles.card, T.glass.base]}>
            <Text style={styles.cardTitle}>{title}</Text>
            {children}
        </View>
    )
}

function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format((Number(cents) || 0) / 100)
}

export default function V6MarketplaceScreen() {
    const router = useRouter()
    const {
        drills,
        drillsLoading,
        drillsActionLoading,
        drillsError,
        loadMarketplace,
        purchaseDrill,
        refreshAll,
    } = useV6ControlCenter({
        arena: false,
        horse: false,
        marketplace: true,
    })

    const [drillSearch, setDrillSearch] = useState('')

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
                        <Text style={styles.title}>Drills Marketplace</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.refreshButton}
                        activeOpacity={0.85}
                        onPress={() => {
                            void refreshAll(drillSearch)
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Refresh Marketplace module"
                    >
                        <Feather name="refresh-cw" size={14} color={T.color.brand.primary} />
                    </TouchableOpacity>
                </View>

                <SectionCard title="Search Packs">
                    {drillsError ? <Text style={styles.errorText}>{drillsError}</Text> : null}

                    <View style={styles.searchRow}>
                        <TextInput
                            value={drillSearch}
                            onChangeText={setDrillSearch}
                            placeholder="Search drills"
                            placeholderTextColor={T.color.text.tertiary}
                            style={[styles.input, styles.searchInput]}
                        />
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => {
                                void handleSearchDrills()
                            }}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.secondaryButtonText}>Search</Text>
                        </TouchableOpacity>
                    </View>
                </SectionCard>

                <SectionCard title="Top Results">
                    {drillsLoading ? (
                        <ActivityIndicator color={T.color.brand.primary} size="small" style={styles.loader} />
                    ) : visibleDrills.length === 0 ? (
                        <Text style={styles.mutedText}>No drill packs found.</Text>
                    ) : (
                        visibleDrills.slice(0, 10).map((pack) => (
                            <View key={pack.id} style={[styles.listItem, T.glass.thin]}>
                                <View style={styles.listItemTextWrap}>
                                    <Text style={styles.listItemTitle}>{pack.title}</Text>
                                    <Text style={styles.listItemMeta}>
                                        {pack.category} • {pack.difficulty} • Rating {Number(pack.rating || 0).toFixed(1)}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.secondaryButton}
                                    onPress={() => {
                                        void handlePurchaseDrill(pack.id)
                                    }}
                                    disabled={Boolean(pack.isPurchased) || drillsActionLoading}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.secondaryButtonText}>{pack.isPurchased ? 'Owned' : formatCurrency(pack.priceCents)}</Text>
                                </TouchableOpacity>
                            </View>
                        ))
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
    searchRow: {
        flexDirection: 'row',
        gap: T.spacing[2],
        alignItems: 'center',
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
    searchInput: {
        flex: 1,
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
})
