/**
 * CourtVision AI — Settings/Profile Screen
 *
 * Allows the user to:
 * - View and edit profile (name, position, height)
 * - Configure AI preferences (haptics, audio, demo mode)
 * - Manage notifications
 * - View app info and export data
 * - Sign out
 *
 * Design V4 : dark premium, amber accent, glass cards.
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
    View, Text, TouchableOpacity, ScrollView, Switch,
    StyleSheet, Alert, StatusBar, TextInput, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import { T } from '../lib/theme'
import { useStore, selectUser } from '../lib/store'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'

// ==========================================
// Types
// ==========================================

interface SettingsSection {
    title: string
    items: SettingsItem[]
}

interface SettingsItem {
    id: string
    icon: string
    label: string
    type: 'toggle' | 'select' | 'action' | 'input' | 'info'
    value?: string | boolean | number
    options?: string[]
    onPress?: () => void
    onToggle?: (val: boolean) => void
    onChange?: (val: string) => void
    color?: string
    destructive?: boolean
}

// ==========================================
// Player Positions
// ==========================================

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C']
const POSITION_LABELS: Record<string, string> = {
    PG: 'Point Guard',
    SG: 'Shooting Guard',
    SF: 'Small Forward',
    PF: 'Power Forward',
    C: 'Center',
}

// ==========================================
// Component
// ==========================================

const SETTINGS_KEY = '@courtvision_settings'

interface PersistedSettings {
    playerHeight: string
    playerPosition: string
    haptics: boolean
    audioFeedback: boolean
    demoMode: boolean
    notifications: boolean
    dailyReminder: boolean
    autoSave: boolean
    cloudSync: boolean
    showDebug: boolean
}

const DEFAULT_SETTINGS: PersistedSettings = {
    playerHeight: '185',
    playerPosition: 'SG',
    haptics: true,
    audioFeedback: false,
    demoMode: false,
    notifications: true,
    dailyReminder: true,
    autoSave: true,
    cloudSync: true,
    showDebug: false,
}

export default function SettingsScreen() {
    const router = useRouter()
    const user = useStore(selectUser)
    const logout = useStore(s => s.logout)

    const [playerName, setPlayerName] = useState(user?.full_name ?? 'Player')
    const [playerHeight, setPlayerHeight] = useState(DEFAULT_SETTINGS.playerHeight)
    const [playerPosition, setPlayerPosition] = useState(DEFAULT_SETTINGS.playerPosition)
    const [haptics, setHaptics] = useState(DEFAULT_SETTINGS.haptics)
    const [audioFeedback, setAudioFeedback] = useState(DEFAULT_SETTINGS.audioFeedback)
    const [demoMode, setDemoMode] = useState(DEFAULT_SETTINGS.demoMode)
    const [notifications, setNotifications] = useState(DEFAULT_SETTINGS.notifications)
    const [dailyReminder, setDailyReminder] = useState(DEFAULT_SETTINGS.dailyReminder)
    const [autoSave, setAutoSave] = useState(DEFAULT_SETTINGS.autoSave)
    const [cloudSync, setCloudSync] = useState(DEFAULT_SETTINGS.cloudSync)
    const [showDebug, setShowDebug] = useState(DEFAULT_SETTINGS.showDebug)

    // Load persisted settings on mount
    useEffect(() => {
        AsyncStorage.getItem(SETTINGS_KEY).then(raw => {
            if (!raw) return
            try {
                const saved: Partial<PersistedSettings> = JSON.parse(raw)
                if (saved.playerHeight) setPlayerHeight(saved.playerHeight)
                if (saved.playerPosition) setPlayerPosition(saved.playerPosition)
                if (saved.haptics !== undefined) setHaptics(saved.haptics)
                if (saved.audioFeedback !== undefined) setAudioFeedback(saved.audioFeedback)
                if (saved.demoMode !== undefined) setDemoMode(saved.demoMode)
                if (saved.notifications !== undefined) setNotifications(saved.notifications)
                if (saved.dailyReminder !== undefined) setDailyReminder(saved.dailyReminder)
                if (saved.autoSave !== undefined) setAutoSave(saved.autoSave)
                if (saved.cloudSync !== undefined) setCloudSync(saved.cloudSync)
                if (saved.showDebug !== undefined) setShowDebug(saved.showDebug)
            } catch {}
        })
    }, [])

    // Save settings whenever they change
    const persistSettings = useCallback((patch: Partial<PersistedSettings>) => {
        AsyncStorage.getItem(SETTINGS_KEY).then(raw => {
            const current = raw ? JSON.parse(raw) : {}
            AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...patch }))
        })
    }, [])

    const updateSetting = <K extends keyof PersistedSettings>(
        key: K,
        setter: React.Dispatch<React.SetStateAction<PersistedSettings[K]>>,
    ) => (val: PersistedSettings[K]) => {
        setter(val)
        persistSettings({ [key]: val })
    }

    const handleExportData = useCallback(async () => {
        Alert.alert(
            'Export My Data',
            'Choose export format',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'CSV',
                    onPress: async () => {
                        try {
                            const res = await api.get<{ url: string }>('/api/export?format=csv')
                            Alert.alert('CSV Export', `File ready: ${res.url ?? 'Download started'}`)
                        } catch {
                            Alert.alert('Error', 'CSV export failed. Check your connection.')
                        }
                    },
                },
                {
                    text: 'JSON',
                    onPress: async () => {
                        try {
                            const res = await api.get<{ url: string }>('/api/export?format=json')
                            Alert.alert('JSON Export', `File ready: ${res.url ?? 'Download started'}`)
                        } catch {
                            Alert.alert('Error', 'JSON export failed. Check your connection.')
                        }
                    },
                },
            ],
        )
    }, [])

    const handleSignOut = useCallback(() => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: () => {
                        logout()
                        router.replace('/')
                    },
                },
            ],
        )
    }, [logout, router])

    const handleDeleteAccount = useCallback(() => {
        Alert.alert(
            '⚠️ Delete My Account',
            'All your data will be permanently deleted. This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.post('/api/account/delete', {})
                            await supabase.auth.signOut()
                            logout()
                            router.replace('/')
                        } catch {
                            Alert.alert('Error', 'Unable to delete account. Contact support.')
                        }
                    },
                },
            ],
        )
    }, [logout, router])

    const handleResetCalibration = useCallback(() => {
        Alert.alert(
            'Recalibrate AI',
            'This will reset your phone\'s calibration settings.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Recalibrate',
                    onPress: () => router.push('/calibration'),
                },
            ],
        )
    }, [router])

    // ---- Section definitions ----
    const sections: SettingsSection[] = [
        {
            title: 'Player Profile',
            items: [
                {
                    id: 'name', icon: 'user', label: 'Name', type: 'input',
                    value: playerName,
                    onChange: setPlayerName,
                },
                {
                    id: 'height', icon: 'maximize-2', label: 'Height (cm)', type: 'input',
                    value: playerHeight,
                    onChange: (val: string) => {
                        setPlayerHeight(val)
                        persistSettings({ playerHeight: val })
                    },
                },
                {
                    id: 'position', icon: 'target', label: 'Position', type: 'select',
                    value: POSITION_LABELS[playerPosition] || playerPosition,
                    options: POSITIONS,
                    onPress: () => {
                        const idx = POSITIONS.indexOf(playerPosition)
                        const next = POSITIONS[(idx + 1) % POSITIONS.length]
                        setPlayerPosition(next)
                        persistSettings({ playerPosition: next })
                    },
                },
            ],
        },
        {
            title: 'AI & Analysis',
            items: [
                {
                    id: 'haptics', icon: 'smartphone', label: 'Haptic Feedback', type: 'toggle',
                    value: haptics,
                    onToggle: updateSetting('haptics', setHaptics),
                },
                {
                    id: 'audio', icon: 'volume-2', label: 'Feedback audio', type: 'toggle',
                    value: audioFeedback,
                    onToggle: updateSetting('audioFeedback', setAudioFeedback),
                },
                {
                    id: 'demo', icon: 'zap', label: 'Demo Mode', type: 'toggle',
                    value: demoMode,
                    onToggle: updateSetting('demoMode', setDemoMode),
                },
                {
                    id: 'calibrate', icon: 'crosshair', label: 'Recalibrate AI',
                    type: 'action',
                    onPress: handleResetCalibration,
                    color: T.color.brand.primary,
                },
            ],
        },
        {
            title: 'Notifications',
            items: [
                {
                    id: 'notifications', icon: 'bell', label: 'Notifications push', type: 'toggle',
                    value: notifications,
                    onToggle: updateSetting('notifications', setNotifications),
                },
                {
                    id: 'reminder', icon: 'clock', label: 'Daily Reminder', type: 'toggle',
                    value: dailyReminder,
                    onToggle: updateSetting('dailyReminder', setDailyReminder),
                },
            ],
        },
        {
            title: 'Data',
            items: [
                {
                    id: 'autosave', icon: 'save', label: 'Auto Save', type: 'toggle',
                    value: autoSave,
                    onToggle: updateSetting('autoSave', setAutoSave),
                },
                {
                    id: 'cloud', icon: 'cloud', label: 'Sync cloud', type: 'toggle',
                    value: cloudSync,
                    onToggle: updateSetting('cloudSync', setCloudSync),
                },
                {
                    id: 'export', icon: 'download', label: 'Export My Data', type: 'action',
                    onPress: handleExportData,
                },
            ],
        },
        {
            title: 'App',
            items: [
                {
                    id: 'debug', icon: 'terminal', label: 'Mode debug', type: 'toggle',
                    value: showDebug,
                    onToggle: updateSetting('showDebug', setShowDebug),
                },
                {
                    id: 'version', icon: 'info', label: 'Version', type: 'info',
                    value: Constants.expoConfig?.version ?? '1.0.0',
                },
                {
                    id: 'signout', icon: 'log-out', label: 'Sign Out', type: 'action',
                    onPress: handleSignOut,
                    destructive: true,
                },
                {
                    id: 'delete', icon: 'trash-2', label: 'Delete My Account', type: 'action',
                    onPress: handleDeleteAccount,
                    destructive: true,
                },
            ],
        },
    ]

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={22} color={T.color.text.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, T.type.h3]}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Player avatar card */}
                <Animated.View entering={FadeInDown.duration(400)} style={[styles.profileCard, T.glass.vivid]}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>
                            {playerName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{playerName}</Text>
                        <Text style={styles.profileSub}>
                            {POSITION_LABELS[playerPosition]} · {playerHeight} cm
                        </Text>
                    </View>
                    <View style={styles.profileBadge}>
                        <Text style={styles.profileBadgeText}>PRO</Text>
                    </View>
                </Animated.View>

                {/* Settings sections */}
                {sections.map((section, sIdx) => (
                    <Animated.View
                        key={section.title}
                        entering={FadeInDown.delay(100 + sIdx * 60).duration(400)}
                        style={styles.section}
                    >
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        <View style={[styles.sectionCard, T.glass.thin]}>
                            {section.items.map((item, iIdx) => (
                                <SettingsRow
                                    key={item.id}
                                    item={item}
                                    isLast={iIdx === section.items.length - 1}
                                />
                            ))}
                        </View>
                    </Animated.View>
                ))}

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        CourtVision AI v{Constants.expoConfig?.version ?? '1.0.0'}
                    </Text>
                    <Text style={styles.footerText}>
                        Made with 🏀 for hoopers everywhere
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

// ==========================================
// Settings Row Component
// ==========================================

function SettingsRow({ item, isLast }: { item: SettingsItem; isLast: boolean }) {
    const textColor = item.destructive ? T.color.semantic.error : T.color.text.primary
    const iconColor = item.color ?? (item.destructive ? T.color.semantic.error : T.color.text.secondary)

    const renderRight = () => {
        switch (item.type) {
            case 'toggle':
                return (
                    <Switch
                        value={item.value as boolean}
                        onValueChange={item.onToggle}
                        trackColor={{
                            false: T.color.bg.tertiary,
                            true: `${T.color.brand.primary}60`,
                        }}
                        thumbColor={item.value ? T.color.brand.primary : T.color.text.tertiary}
                    />
                )
            case 'select':
                return (
                    <TouchableOpacity
                        style={styles.selectBtn}
                        onPress={item.onPress}
                    >
                        <Text style={styles.selectText}>{item.value as string}</Text>
                        <Feather name="chevron-right" size={16} color={T.color.text.tertiary} />
                    </TouchableOpacity>
                )
            case 'input':
                return (
                    <TextInput
                        style={styles.inputField}
                        value={item.value as string}
                        onChangeText={item.onChange}
                        placeholderTextColor={T.color.text.tertiary}
                        keyboardAppearance="dark"
                    />
                )
            case 'info':
                return (
                    <Text style={styles.infoValue}>{item.value as string}</Text>
                )
            case 'action':
                return (
                    <Feather name="chevron-right" size={16} color={T.color.text.tertiary} />
                )
            default:
                return null
        }
    }

    const isAction = item.type === 'action'

    const content = (
        <View style={[styles.row, !isLast && styles.rowBorder]}>
            <View style={[styles.rowIconCircle, { backgroundColor: `${iconColor}15` }]}>
                <Feather name={item.icon as any} size={16} color={iconColor} />
            </View>
            <Text style={[styles.rowLabel, { color: textColor }]}>{item.label}</Text>
            {renderRight()}
        </View>
    )

    if (isAction) {
        return (
            <TouchableOpacity onPress={item.onPress} activeOpacity={0.7}>
                {content}
            </TouchableOpacity>
        )
    }

    return content
}

// ==========================================
// Styles
// ==========================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: T.color.bg.primary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        color: T.color.text.primary,
        fontSize: 17,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        gap: 20,
    },

    // Profile card
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: T.color.bg.secondary,
        borderRadius: T.radius.xl,
        padding: 16,
        borderWidth: 1,
        borderColor: T.color.border.base,
    },
    avatarCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: `${T.color.brand.primary}20`,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: T.color.brand.primary,
    },
    avatarText: {
        color: T.color.brand.primary,
        fontSize: 18,
        fontWeight: '800',
        fontFamily: T.fonts.display.bold,
    },
    profileInfo: {
        flex: 1,
        marginLeft: 12,
    },
    profileName: {
        color: T.color.text.primary,
        fontSize: 17,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    profileSub: {
        color: T.color.text.secondary,
        fontSize: 13,
        marginTop: 2,
        fontFamily: T.fonts.body.regular,
    },
    profileBadge: {
        backgroundColor: `${T.color.brand.primary}30`,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: `${T.color.brand.primary}40`,
    },
    profileBadgeText: {
        color: T.color.brand.primary,
        fontSize: 11,
        fontWeight: '800',
        fontFamily: T.fonts.display.bold,
    },

    // Sections
    section: {
        gap: 8,
    },
    sectionTitle: {
        color: T.color.text.tertiary,
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginLeft: 4,
        fontFamily: T.fonts.body.semibold,
    },
    sectionCard: {
        backgroundColor: T.color.bg.secondary,
        borderRadius: T.radius.lg,
        borderWidth: 1,
        borderColor: T.color.border.base,
        overflow: 'hidden',
    },

    // Row
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        minHeight: 48,
    },
    rowBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: T.color.border.base,
    },
    rowIconCircle: {
        width: 30,
        height: 30,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    rowLabel: {
        flex: 1,
        fontSize: 15,
        fontFamily: T.fonts.body.regular,
    },

    // Select
    selectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    selectText: {
        color: T.color.text.secondary,
        fontSize: 14,
        fontFamily: T.fonts.body.regular,
    },

    // Input
    inputField: {
        color: T.color.text.primary,
        fontSize: 14,
        fontFamily: T.fonts.body.regular,
        textAlign: 'right',
        minWidth: 100,
        paddingVertical: 4,
        paddingHorizontal: 8,
        backgroundColor: T.color.bg.tertiary,
        borderRadius: 8,
    },

    // Info
    infoValue: {
        color: T.color.text.tertiary,
        fontSize: 14,
        fontFamily: T.fonts.body.regular,
    },

    // Footer
    footer: {
        alignItems: 'center',
        paddingVertical: 24,
        gap: 4,
    },
    footerText: {
        color: T.color.text.tertiary,
        fontSize: 12,
        fontFamily: T.fonts.body.regular,
    },
})
