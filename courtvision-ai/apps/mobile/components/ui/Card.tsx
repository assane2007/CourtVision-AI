import React from 'react';
import { View, ViewStyle, ViewProps, StyleProp } from 'react-native';
import { colors, radius, space, shadows } from '../../constants/tokens';

export interface CardProps extends ViewProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    variant?: 'base' | 'status';
    statusType?: 'critical' | 'required' | 'monitoring';
}

export function Card({ children, style, variant = 'base', statusType, ...props }: CardProps) {
    let containerStyle: ViewStyle = {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: space[4],
    };

    if (variant === 'base') {
        containerStyle = {
            ...containerStyle,
            borderWidth: 1,
            borderColor: colors.line,
        };
    } else if (variant === 'status') {
        containerStyle = {
            ...containerStyle,
            borderRadius: 14,
            borderWidth: 0,
            borderLeftWidth: 3,
        };

        if (statusType === 'critical') {
            containerStyle.borderLeftColor = colors.danger;
        } else if (statusType === 'required') {
            containerStyle.borderLeftColor = colors.caution;
        } else if (statusType === 'monitoring') {
            containerStyle.borderLeftColor = '#888888';
        } else {
            containerStyle.borderLeftColor = colors.live;
        }
    }

    return (
        <View style={[containerStyle, style]} {...props}>
            {children}
        </View>
    );
}
