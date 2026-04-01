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
    interpolate, withRepeat,
} from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import { Feather, AntDesign } from '@expo/vector-icons'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { HapticFeedback } from '../lib/haptics'
import { T } from '../lib/theme'
import { useStore } from '../lib/store'

// ─── Tab config ──────────────────────────────────────────────

const TAB_ICONS: Record<string, { icon: string; label: string }> = {
    index: { icon: 'zap', label: 'Court' },
    community: { icon: 'users', label: 'Squad' },
    upload: { icon: 'plus', label: 'Film' },
    twin: { icon: 'cpu', label: 'Twin' },
    profile: { icon: 'user', label: 'Me' },
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

    const color = isFocused ? T.color.brand.primary : T.color.text.tertiary

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
        pulse.value = withRepeat(
            withSequence(
                withTiming(1.3, { duration: 800 }),
                withTiming(1, { duration: 800 }),
            ),
            -1,
            true
        )
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

    const bottomOffset = Platform.OS === 'ios' ? Math.max(insets.bottom, 20) : 24

    return (
        <View style={[styles.wrapper, { bottom: bottomOffset }]}>
            <BlurView intensity={65} tint="systemThinMaterialDark" style={StyleSheet.absoluteFill} />
            <View style={styles.container}>
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
                            HapticFeedback.selection()
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
        </View>
    )
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        left: T.spacing[6],
        right: T.spacing[6],
        height: 72,
        borderRadius: 36,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: T.color.border.base,
        backgroundColor: 'rgba(10,16,24,0.7)',
        ...T.glow.soft(T.color.brand.primary),
    },
    container: {
        flexDirection: 'row',
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: T.spacing[2],
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
        backgroundColor: T.color.brand.primary,
        marginTop: 5,
        ...T.glow.soft(T.color.brand.primary),
    },
    fabButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: T.color.brand.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...T.glow.soft(T.color.brand.primary),
    },
    fabButtonActive: {
        ...T.glow.hero(T.color.brand.primary),
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
        borderColor: T.color.bg.primary,
    },
})
