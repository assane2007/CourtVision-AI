import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { Home, Video, BarChart2, User, Camera } from 'lucide-react-native';
import { colors, shadows } from '../../constants/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_VISUALS: Record<string, { label: string; icon: typeof Home }> = {
    index: { label: 'Home', icon: Home },
    record: { label: 'Film', icon: Camera },
    sessions: { label: 'Sessions', icon: BarChart2 },
    players: { label: 'Profile', icon: User },
}

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const bottomInset = Math.max(insets.bottom, 12)

    return (
        <View style={[styles.outer, { paddingBottom: bottomInset }]}> 
            <View style={styles.container}>
            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const isFocused = state.index === index;

                // Respect the "href: null" option to hide sub-routes
                const tabHref = (options as { href?: string | null }).href;
                if (tabHref === null) return null;

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.dispatch({
                            ...CommonActions.navigate({
                                name: route.name,
                                params: route.params,
                            }),
                            target: state.key,
                        });
                    }
                };

                const visual = TAB_VISUALS[route.name] ?? TAB_VISUALS.index

                // The center "Record" button is styled as a large floating action button.
                if (route.name === 'record') {
                    return (
                        <Pressable
                            key={route.key}
                            accessibilityRole="button"
                            accessibilityState={isFocused ? { selected: true } : {}}
                            accessibilityLabel={options.tabBarAccessibilityLabel}
                            onPress={onPress}
                            style={styles.recordButtonContainer}
                        >
                            <View style={styles.recordButton}>
                                <Camera color={colors.snow} size={24} />
                            </View>
                            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>{visual.label}</Text>
                        </Pressable>
                    );
                }

                const IconComponent = visual.icon

                const color = isFocused ? colors.fire : colors.fog;

                return (
                    <Pressable
                        key={route.key}
                        accessibilityRole="button"
                        accessibilityState={isFocused ? { selected: true } : {}}
                        accessibilityLabel={options.tabBarAccessibilityLabel}
                        onPress={onPress}
                        style={styles.tabButton}
                    >
                        <View style={[styles.tabChip, isFocused && styles.tabChipActive]}>
                            <IconComponent color={color} size={20} />
                            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>{visual.label}</Text>
                        </View>
                        <View style={[styles.dot, { backgroundColor: isFocused ? colors.fire : 'transparent' }]} />
                    </Pressable>
                );
            })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    outer: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 0,
        zIndex: 20,
    },
    container: {
        flexDirection: 'row',
        backgroundColor: 'rgba(10,10,10,0.92)',
        borderRadius: 26,
        borderTopWidth: 1,
        borderTopColor: colors.line,
        borderWidth: 1,
        borderColor: colors.line,
        paddingTop: 10,
        paddingBottom: 8,
        paddingHorizontal: 8,
        justifyContent: 'space-around',
        alignItems: 'center',
        ...shadows.cardShadow,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabChip: {
        minWidth: 64,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: 'rgba(255,255,255,0.02)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        paddingHorizontal: 10,
    },
    tabChipActive: {
        borderColor: colors.lineStrong,
        backgroundColor: colors.fireTrace,
    },
    dot: {
        width: 18,
        height: 2,
        borderRadius: 999,
        marginTop: 4,
    },
    recordButtonContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    recordButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.fire,
        ...shadows.orangeGlow,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -26, // pop out of the tab bar
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.26)',
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.fog,
        letterSpacing: 0.2,
    },
    tabLabelActive: {
        color: colors.snow,
    },
});
