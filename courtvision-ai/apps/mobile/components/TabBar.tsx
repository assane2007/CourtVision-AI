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

import React, { useEffect } from 'react'
import {
    View, Text, Pressable, StyleSheet, Platform,
} from 'react-native'
import Animated, {
    useSharedValue, useAnimatedStyle, withSpring,
    withTiming, withSequence, FadeIn,
    withRepeat,
} from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { Feather, AntDesign } from '@expo/vector-icons'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { CommonActions } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { HapticFeedback } from '../lib/haptics'
import { T } from '../lib/theme'
import { useStore } from '../lib/store'

// ─── Tab config ──────────────────────────────────────────────

type TabVisual = {
    icon: string
    label: string
    accessibilityLabel: string
}

const TAB_VISUALS: Record<string, TabVisual> = {
    index: { icon: 'zap', label: 'Court', accessibilityLabel: 'Court dashboard' },
    community: { icon: 'users', label: 'Squad', accessibilityLabel: 'Community' },
    upload: { icon: 'plus', label: 'Film', accessibilityLabel: 'Record session' },
    twin: { icon: 'cpu', label: 'Twin', accessibilityLabel: 'Digital twin' },
    profile: { icon: 'user', label: 'Profile', accessibilityLabel: 'Profile' },
}

// ─── Animated tab item ───────────────────────────────────────

function BadgeBubble({ count }: { count: number }) {
    const pulse = useSharedValue(1)

    useEffect(() => {
        pulse.value = withRepeat(
            withSequence(
                withTiming(1.16, { duration: 650 }),
                withTiming(1, { duration: 650 }),
            ),
            -1,
            true
        )
    }, [])

    const badgeStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
    }))

    const text = count > 9 ? '9+' : String(count)

    return (
        <Animated.View style={[styles.badgeBubble, badgeStyle]}>
            <Text style={styles.badgeText}>{text}</Text>
        </Animated.View>
    )
}

function TabItem({
    routeName,
    isFocused,
    onPress,
    onLongPress,
    badgeCount,
}: {
    routeName: string
    isFocused: boolean
    onPress: () => void
    onLongPress: () => void
    badgeCount?: number
}) {
    const visual = TAB_VISUALS[routeName] || {
        icon: 'circle',
        label: routeName,
        accessibilityLabel: routeName,
    }
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

    const iconColor = isFocused ? T.color.text.primary : T.color.text.tertiary

    const handlePressIn = () => {
        scale.value = withSpring(0.94, { damping: 15, stiffness: 300 })
    }
    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 12, stiffness: 220 })
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
                accessibilityLabel={visual.accessibilityLabel}
                accessibilityState={{ selected: isFocused }}
            >
                <Animated.View style={[styles.fabOuter, scaleStyle, isFocused && styles.fabOuterActive]}>
                    <View style={[styles.fabButton, isFocused && styles.fabButtonActive]}>
                        <AntDesign name="plus" size={23} color="#FFF" />
                    </View>
                </Animated.View>
                <Text style={[styles.fabLabel, isFocused && styles.fabLabelActive]}>{visual.label}</Text>
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
            accessibilityLabel={visual.accessibilityLabel}
            accessibilityState={{ selected: isFocused }}
        >
            <Animated.View style={[styles.tabChip, isFocused && styles.tabChipActive, scaleStyle]}>
                <Animated.View style={iconStyle}>
                    <Feather name={visual.icon as any} size={20} color={iconColor} />
                </Animated.View>
                <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>{visual.label}</Text>
                {!!badgeCount && badgeCount > 0 ? <BadgeBubble count={badgeCount} /> : null}
            </Animated.View>
            {isFocused && (
                <Animated.View
                    entering={FadeIn.duration(180)}
                    style={styles.activeRail}
                />
            )}
        </Pressable>
    )
}

// ─── Main TabBar ─────────────────────────────────────────────

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets()
    const xpEvents = useStore(s => s.xpEvents)
    const badgeCount = Math.min(xpEvents.length, 99)

    const bottomOffset = Platform.OS === 'ios' ? Math.max(insets.bottom, 14) : 16

    return (
        <View style={[styles.wrapper, { bottom: bottomOffset }]}>
            <BlurView intensity={62} tint="dark" style={StyleSheet.absoluteFill} />
            <LinearGradient
                pointerEvents="none"
                colors={[
                    'rgba(255,255,255,0.10)',
                    'rgba(255,255,255,0)',
                    'rgba(45,212,191,0.18)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.container}>
                {state.routes.map((route, index) => {
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
                            badgeCount={route.name === 'profile' ? badgeCount : 0}
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
        height: 86,
        borderRadius: 30,
        overflow: 'hidden',
        borderWidth: 1.2,
        borderColor: T.color.border.base,
        backgroundColor: 'rgba(12,20,33,0.84)',
        ...T.glow.soft(T.color.brand.primary),
    },
    container: {
        flexDirection: 'row',
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: T.spacing[2],
        paddingTop: 10,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 3,
    },
    tabChip: {
        minWidth: 66,
        height: 42,
        borderRadius: 21,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,255,255,0.02)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
        gap: 1,
    },
    tabChipActive: {
        borderColor: `${T.color.brand.primary}75`,
        backgroundColor: `${T.color.brand.primary}28`,
        ...T.glow.soft(T.color.brand.primary),
    },
    tabLabel: {
        marginTop: 1,
        color: T.color.text.tertiary,
        fontSize: 10,
        fontFamily: 'DMSans_600SemiBold',
        letterSpacing: 0.2,
    },
    tabLabelActive: {
        color: T.color.text.primary,
    },
    activeRail: {
        width: 22,
        height: 3,
        borderRadius: 999,
        backgroundColor: T.color.brand.primary,
        marginTop: 6,
        ...T.glow.soft(T.color.brand.primary),
    },
    badgeBubble: {
        position: 'absolute',
        top: -6,
        right: -8,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        paddingHorizontal: 5,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: T.color.semantic.error,
        borderWidth: 1.5,
        borderColor: T.color.bg.primary,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontFamily: 'DMSans_700Bold',
        lineHeight: 11,
    },
    fabOuter: {
        width: 66,
        height: 66,
        borderRadius: 33,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -18,
        backgroundColor: `${T.color.brand.primary}24`,
        borderWidth: 1,
        borderColor: `${T.color.brand.primary}80`,
    },
    fabOuterActive: {
        backgroundColor: `${T.color.brand.primary}33`,
        borderColor: `${T.color.brand.secondary}95`,
    },
    fabButton: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: T.color.brand.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...T.glow.soft(T.color.brand.primary),
    },
    fabButtonActive: {
        ...T.glow.hero(T.color.brand.primary),
    },
    fabLabel: {
        marginTop: 2,
        color: T.color.text.tertiary,
        fontSize: 10,
        fontFamily: 'DMSans_600SemiBold',
        letterSpacing: 0.2,
    },
    fabLabelActive: {
        color: T.color.text.primary,
    },
})
