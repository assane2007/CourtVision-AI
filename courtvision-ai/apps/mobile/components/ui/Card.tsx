import React from 'react';
import type { ViewStyle, ViewProps, StyleProp } from 'react-native';
import { View } from 'react-native';
import { T } from '../../lib/theme';

export interface CardProps extends ViewProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    variant?: 'base' | 'status';
    statusType?: 'critical' | 'required' | 'monitoring';
}

export function Card({ children, style, variant = 'base', statusType, ...props }: CardProps) {
    let containerStyle: ViewStyle = {
        backgroundColor: T.color.bg.secondary,
        borderRadius: T.radius.lg,
        padding: T.spacing[4],
        borderWidth: 0.5,
        borderColor: T.color.border.base,
    };

    if (variant === 'base') {
        containerStyle = {
            ...containerStyle,
            borderWidth: 0.5,
            borderColor: T.color.border.base,
        };
    } else if (variant === 'status') {
        containerStyle = {
            ...containerStyle,
            borderRadius: T.radius.md,
            borderWidth: 0.5,
            borderLeftWidth: 2,
        };

        if (statusType === 'critical') {
            containerStyle.borderLeftColor = T.color.semantic.error;
        } else if (statusType === 'required') {
            containerStyle.borderLeftColor = T.color.semantic.warning;
        } else if (statusType === 'monitoring') {
            containerStyle.borderLeftColor = T.color.text.tertiary;
        } else {
            containerStyle.borderLeftColor = T.color.semantic.success;
        }
    }

    return (
        <View style={[containerStyle, style]} {...props}>
            {children}
        </View>
    );
}
