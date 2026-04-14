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

export default function V6ReportsScreen() {
    const router = useRouter()
    const {
        reportsLoading,
        reportsError,
        downloadSessionReportPdf,
        downloadScoutReportPdf,
    } = useV6ControlCenter({
        arena: false,
        horse: false,
        marketplace: false,
    })

    const [sessionReportId, setSessionReportId] = useState('')
    const [scoutUserId, setScoutUserId] = useState('')

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
                        <Text style={styles.title}>PDF Reports</Text>
                    </View>
                </View>

                <SectionCard title="Session Report">
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
                        onPress={() => {
                            void handleDownloadSessionPdf()
                        }}
                        disabled={reportsLoading}
                        activeOpacity={0.85}
                    >
                        {reportsLoading ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <Text style={styles.primaryButtonText}>Download Session PDF</Text>
                        )}
                    </TouchableOpacity>
                </SectionCard>

                <SectionCard title="Scout Report">
                    <TextInput
                        value={scoutUserId}
                        onChangeText={setScoutUserId}
                        placeholder="Player UUID"
                        placeholderTextColor={T.color.text.tertiary}
                        style={styles.input}
                    />
                    <TouchableOpacity
                        style={styles.secondaryPrimaryButton}
                        onPress={() => {
                            void handleDownloadScoutPdf()
                        }}
                        disabled={reportsLoading}
                        activeOpacity={0.85}
                    >
                        {reportsLoading ? (
                            <ActivityIndicator color={T.color.brand.primary} size="small" />
                        ) : (
                            <Text style={styles.secondaryPrimaryButtonText}>Download Scout PDF</Text>
                        )}
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
    errorText: {
        ...type.caption,
        color: T.color.semantic.error,
    },
})
