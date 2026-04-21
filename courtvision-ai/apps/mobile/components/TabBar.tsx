/**
 * CustomTabBar — Pro-grade floating tab rail.
 *
 * Features:
 * - Frosted glass rail + sheen gradient for depth
 * - Explicit labels for quick scanability
 * - Refined active state (chip + rail)
 * - Central FAB with elevated focus state
 * - Profile badge counter with soft pulse
 *
 * Usage: <Tabs tabBar={(props) => <CustomTabBar {...props} />}>
 */

import React from 'react'
import {
    View, Text, Pressable, StyleSheet, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { CommonActions } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { HapticFeedback } from '../lib/haptics'
import { T } from '../lib/theme'

// ─── Tab config ──────────────────────────────────────────────

type TabVisual = {
    icon: keyof typeof Ionicons.glyphMap
    iconFilled: keyof typeof Ionicons.glyphMap
    label: string
    accessibilityLabel: string
}

const TAB_VISUALS: Record<string, TabVisual> = {
    index: { icon: 'home-outline', iconFilled: 'home', label: 'Home', accessibilityLabel: 'Home' },
    sessions: { icon: 'albums-outline', iconFilled: 'albums', label: 'Sessions', accessibilityLabel: 'Sessions' },
    community: { icon: 'trophy-outline', iconFilled: 'trophy', label: 'League', accessibilityLabel: 'League' },
    profile: { icon: 'person-outline', iconFilled: 'person', label: 'Profile', accessibilityLabel: 'Profile' },
}

function TabItem({
    routeName,
    isFocused,
    onPress,
    onLongPress,
}: {
    routeName: string
    isFocused: boolean
    onPress: () => void
    onLongPress: () => void
}) {
    const visual = TAB_VISUALS[routeName] || {
        icon: 'circle',
        label: routeName,
        accessibilityLabel: routeName,
    }
    const iconColor = isFocused ? T.color.text.primary : T.color.text.dim

    return (
        <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
            accessibilityRole="tab"
            accessibilityLabel={visual.accessibilityLabel}
            accessibilityState={{ selected: isFocused }}
        >
            {isFocused && <View style={styles.activeRail} />}
            <Ionicons name={isFocused ? visual.iconFilled : visual.icon} size={20} color={iconColor} />
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>{visual.label}</Text>
            {isFocused && (
                <View style={{ height: 2 }} />
            )}
        </Pressable>
    )
}

// ─── Main TabBar ─────────────────────────────────────────────

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets()
    const bottomOffset = Platform.OS === 'ios' ? Math.max(insets.bottom, 0) : 0

    return (
        <View style={[styles.wrapper, { paddingBottom: bottomOffset }]}>
            <View style={styles.container}>
                {state.routes.map((route, index) => {
                    if (!TAB_VISUALS[route.name]) return null
                    const isFocused = state.index === index
                    const { options } = descriptors[route.key]

                    const tabHref = (options as { href?: string | null }).href
                    if (tabHref === null) {
                        return null
                    }

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        })
                        if (!isFocused && !event.defaultPrevented) {
                            HapticFeedback.selection()
                            navigation.dispatch({
                                ...CommonActions.navigate({
                                    name: route.name,
                                    params: route.params,
                                }),
                                target: state.key,
                            })
                        }
                    }

                    const onLongPress = () => {
                        navigation.emit({
                            type: 'tabLongPress',
                            target: route.key,
                        })
                    }

                    return (
                        <TabItem
                            key={route.key}
                            routeName={route.name}
                            isFocused={isFocused}
                            onPress={onPress}
                            onLongPress={onLongPress}
                        />
                    )
                })}
            </View>
        </View>
    )
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#000000',
    },
    container: {
        flexDirection: 'row',
        height: 64,
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
        minWidth: 44,
        gap: 2,
    },
    tabLabel: {
        marginTop: 1,
        color: T.color.text.dim,
        fontSize: 11,
        fontFamily: 'DMSans_600SemiBold',
        letterSpacing: 0.2,
    },
    tabLabelActive: {
        color: T.color.text.primary,
    },
    activeRail: {
        width: 20,
        height: 2,
        borderRadius: 0,
        backgroundColor: T.color.brand.primary,
        marginBottom: 4,
    },
})
