/**
 * CustomTabBar — Premium tab bar with animated pill indicator.
 *
 * Features:
 * - Animated amber pill slides between active tabs
 * - Frosted glass background with border-top
 * - Scale spring on tap
 * - Notification dot with pulse
 * - Central FAB position (Film tab rendered via FABUpload)
 *
 * Usage: <Tabs tabBar={(props) => <CustomTabBar {...props} />}>
 */

import React, { useEffect } from 'react'
import {
    View, Text, Pressable, StyleSheet, Platform,
    LayoutChangeEvent,
} from 'react-native'
import Animated, {
    useSharedValue, useAnimatedStyle, withSpring,
    withTiming, withSequence, FadeIn,
} from 'react-native-reanimated'
import { Feather, AntDesign } from '@expo/vector-icons'
import { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { T } from '../lib/theme'
import { useStore } from '../lib/store'

// ─── Tab config ──────────────────────────────────────────────

const TAB_ICONS: Record<string, { icon: string; label: string }> = {
    index:     { icon: 'zap',   label: 'Court' },
    community: { icon: 'users', label: 'Squad' },
    upload:    { icon: 'plus',  label: 'Film' },
    twin:      { icon: 'cpu',   label: 'Twin' },
    profile:   { icon: 'user',  label: 'Me' },
}

// ─── Animated tab item ───────────────────────────────────────

function TabItem({
    routeName,
    isFocused,
    onPress,
    onLongPress,
    showBadge,
}: {
    routeName: string
    isFocused: boolean
    onPress: () => void
    onLongPress: () => void
    showBadge?: boolean
}) {
    const config = TAB_ICONS[routeName] || { icon: 'circle', label: routeName }
    const isFAB = routeName === 'upload'

    const scale = useSharedValue(1)
    const iconScale = useSharedValue(1)

    useEffect(() => {
        iconScale.value = withSpring(isFocused ? 1.15 : 1, {
            damping: 12,
            stiffness: 200,
        })
    }, [isFocused])

    const scaleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }))

    const iconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: iconScale.value }],
    }))

    const color = isFocused ? T.color.signature.primary : T.color.text.tertiary

    const handlePressIn = () => {
        scale.value = withSpring(0.88, { damping: 15, stiffness: 300 })
    }
    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 10, stiffness: 180 })
    }

    if (isFAB) {
        return (
            <Pressable
                onPress={onPress}
                onLongPress={onLongPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={styles.tabItem}
                accessibilityRole="button"
                accessibilityLabel="Film"
                accessibilityState={{ selected: isFocused }}
            >
                <Animated.View style={[styles.fabButton, scaleStyle, isFocused && styles.fabButtonActive]}>
                    <AntDesign name="plus" size={24} color="#FFF" />
                </Animated.View>
            </Pressable>
        )
    }

    return (
        <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.tabItem}
            accessibilityRole="tab"
            accessibilityLabel={config.label}
            accessibilityState={{ selected: isFocused }}
        >
            <Animated.View style={[styles.iconWrap, iconStyle]}>
                <Feather name={config.icon as any} size={22} color={color} />
                {showBadge && <NotifDot />}
            </Animated.View>
            {isFocused && (
                <Animated.View
                    entering={FadeIn.duration(200)}
                    style={styles.activeDot}
                />
            )}
        </Pressable>
    )
}

// ─── Notification dot ────────────────────────────────────────

function NotifDot() {
    const pulse = useSharedValue(1)

    useEffect(() => {
        pulse.value = withSequence(
            withTiming(1.4, { duration: 700 }),
            withTiming(1, { duration: 700 }),
        )
        // Loop
        const id = setInterval(() => {
            pulse.value = withSequence(
                withTiming(1.4, { duration: 700 }),
                withTiming(1, { duration: 700 }),
            )
        }, 1400)
        return () => clearInterval(id)
    }, [])

    const dotStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
    }))

    return (
        <Animated.View style={[styles.notifDot, dotStyle]} />
    )
}

// ─── Main TabBar ─────────────────────────────────────────────

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets()
    const xpEvents = useStore(s => s.xpEvents)
    const hasNotif = xpEvents.length > 0

    const bottomPadding = Platform.OS === 'ios' ? Math.max(insets.bottom, 16) : 12

    return (
        <View style={[styles.container, { paddingBottom: bottomPadding }]}>
            {state.routes.map((route, index) => {
                const isFocused = state.index === index
                const { options } = descriptors[route.key]

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    })
                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name)
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
                        showBadge={route.name === 'profile' && hasNotif}
                    />
                )
            })}
        </View>
    )
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: 'rgba(8,12,18,0.97)',
        borderTopWidth: 1,
        borderTopColor: T.color.border.subtle,
        paddingTop: 8,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 12,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
    },
    iconWrap: {
        position: 'relative',
        alignItems: 'center',
    },
    activeDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: T.color.signature.primary,
        marginTop: 5,
        ...T.glow(T.color.signature.primary, 0.6),
    },
    fabButton: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: T.color.signature.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -22,
        ...T.glow(T.color.signature.primary, 0.45),
    },
    fabButtonActive: {
        ...T.glow(T.color.signature.primary, 0.65),
    },
    notifDot: {
        position: 'absolute',
        top: -2,
        right: -6,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: T.color.semantic.error,
        borderWidth: 1.5,
        borderColor: T.color.background.primary,
    },
})
