import React from 'react';
import type { ViewStyle } from 'react-native';
import { View, Text, StyleSheet } from 'react-native';
import { T } from '../../lib/theme';

interface BadgeProps {
    label: string;
    variant?: 'live' | 'caution' | 'danger' | 'neutral';
    style?: ViewStyle;
}

export function Badge({ label, variant = 'neutral', style }: BadgeProps) {
    let backgroundColor: string = T.color.bg.tertiary;
    let textColor: string = T.color.text.secondary;

    switch (variant) {
        case 'live':
            backgroundColor = `${T.color.semantic.success}26`;
            textColor = T.color.semantic.success;
            break;
        case 'caution':
            backgroundColor = `${T.color.semantic.warning}26`;
            textColor = T.color.semantic.warning;
            break;
        case 'danger':
            backgroundColor = `${T.color.semantic.error}26`;
            textColor = T.color.semantic.error;
            break;
    }

    return (
        <View
            style={[
                styles.container,
                { backgroundColor },
                style,
            ]}
        >
            <Text style={[styles.text, { color: textColor }]}>
                {label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: T.spacing[2],
        paddingVertical: 2,
        borderRadius: T.radius.full,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: 'transparent', // Can be overridden
    },
    text: {
        fontFamily: T.fonts.mono.regular,
        fontSize: 10,
        letterSpacing: 1,
    },
});
