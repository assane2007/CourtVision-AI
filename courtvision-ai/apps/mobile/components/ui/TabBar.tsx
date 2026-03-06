import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, Video, BarChart2, User, Camera } from 'lucide-react-native';
import { colors, shadows } from '../../constants/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const isFocused = state.index === index;

                // Respect the "href: null" option to hide sub-routes
                if (options.href === null) return null;

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name);
                    }
                };

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
                        </Pressable>
                    );
                }

                // Standard tabs mapping based on name
                let IconComponent = Home;
                if (route.name === 'index') IconComponent = Home;
                if (route.name === 'sessions') IconComponent = BarChart2;
                if (route.name === 'players') IconComponent = User;

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
                        <IconComponent color={color} size={24} />
                        <View style={[styles.dot, { backgroundColor: isFocused ? colors.fire : 'transparent' }]} />
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.void,
        borderTopWidth: 1,
        borderTopColor: colors.line,
        paddingTop: 12,
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 20,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
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
        marginTop: -32, // pop out of the tab bar
    },
});
