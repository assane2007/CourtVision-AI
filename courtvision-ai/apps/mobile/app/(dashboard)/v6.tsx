import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { T, typePresets } from '../../lib/theme'
import { AppBackground } from '../../components/ui'

const type = typePresets

type V6Module = {
    title: string
    subtitle: string
    icon: keyof typeof Feather.glyphMap
    route: '/(dashboard)/v6-arena' | '/(dashboard)/v6-horse' | '/(dashboard)/v6-marketplace' | '/(dashboard)/v6-reports'
}

const MODULES: V6Module[] = [
    {
        title: 'Arena Multiplayer',
        subtitle: 'Create matches, join public lobbies, submit shots, and monitor live scoreboard.',
        icon: 'crosshair',
        route: '/(dashboard)/v6-arena',
    },
    {
        title: 'HORSE AI',
        subtitle: 'Start adaptive AI duels, generate challenges, and score each attempt precisely.',
        icon: 'cpu',
        route: '/(dashboard)/v6-horse',
    },
    {
        title: 'Drills Marketplace',
        subtitle: 'Search premium packs, inspect ratings, and purchase drills with one tap.',
        icon: 'shopping-bag',
        route: '/(dashboard)/v6-marketplace',
    },
    {
        title: 'PDF Reports',
        subtitle: 'Export session and scout PDFs without loading unrelated feature services.',
        icon: 'file-text',
        route: '/(dashboard)/v6-reports',
    },
]

export default function V6ControlCenterHubScreen() {
    const router = useRouter()

    return (
        <SafeAreaView style={styles.screen}>
            <AppBackground variant="focus" />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.overline}>V6 CONTROL CENTER</Text>
                    <Text style={styles.title}>Choose one module at a time</Text>
                    <Text style={styles.subtitle}>
                        The V6 cockpit is now split into dedicated screens to reduce payload, isolate failures, and improve mobile
                        performance.
                    </Text>
                </View>

                {MODULES.map((module) => (
                    <TouchableOpacity
                        key={module.route}
                        style={[styles.card, T.glass.base]}
                        activeOpacity={0.9}
                        onPress={() => {
                            router.push(module.route)
                        }}
                    >
                        <View style={styles.cardIconWrap}>
                            <Feather name={module.icon} size={18} color={T.color.brand.primary} />
                        </View>
                        <View style={styles.cardBody}>
                            <Text style={styles.cardTitle}>{module.title}</Text>
                            <Text style={styles.cardSubtitle}>{module.subtitle}</Text>
                        </View>
                        <Feather name="chevron-right" size={18} color={T.color.text.secondary} />
                    </TouchableOpacity>
                ))}
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
        paddingTop: T.spacing[2],
        paddingBottom: T.spacing[16],
        gap: T.spacing[3],
    },
    header: {
        gap: T.spacing[1],
        marginBottom: T.spacing[2],
    },
    overline: {
        ...type.overline,
        color: T.color.text.tertiary,
        letterSpacing: 1.7,
    },
    title: {
        ...type.h2,
        color: T.color.text.primary,
    },
    subtitle: {
        ...type.caption,
        color: T.color.text.secondary,
        marginTop: T.spacing[1],
        lineHeight: 20,
    },
    card: {
        borderRadius: T.radius.lg,
        borderWidth: 1,
        borderColor: T.color.border.base,
        padding: T.spacing[4],
        flexDirection: 'row',
        alignItems: 'center',
        gap: T.spacing[3],
    },
    cardIconWrap: {
        width: 34,
        height: 34,
        borderRadius: T.radius.md,
        borderWidth: 1,
        borderColor: `${T.color.brand.primary}50`,
        backgroundColor: `${T.color.brand.primary}14`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardBody: {
        flex: 1,
        gap: 3,
    },
    cardTitle: {
        ...type.sectionTitle,
        color: T.color.text.primary,
    },
    cardSubtitle: {
        ...type.caption,
        color: T.color.text.secondary,
        lineHeight: 18,
    },
})
