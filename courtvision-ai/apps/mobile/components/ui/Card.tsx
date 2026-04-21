import React from 'react';
import type { ViewStyle, ViewProps, StyleProp } from 'react-native';
import { View } from 'react-native';
import { T } from '../../lib/theme';

export interface CardProps extends ViewProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    variant?: 'hero' | 'data' | 'support';
    statusType?: 'critical' | 'required' | 'monitoring';
}

export function Card({ children, style, variant = 'data', ...props }: CardProps) {
    let containerStyle: ViewStyle = {
        backgroundColor: '#0A0A0A',
        borderRadius: T.radius.data,
        padding: T.spacing[4],
        borderWidth: 0.5,
        borderColor: T.color.border.white07,
    };

    if (variant === 'hero') {
        containerStyle = {
            ...containerStyle,
            backgroundColor: '#000000',
            borderColor: T.color.border.white10,
            borderTopRightRadius: 0,
        };
    } else if (variant === 'data') {
        containerStyle = {
            ...containerStyle,
            backgroundColor: '#0A0A0A',
            borderColor: T.color.border.white07,
            borderRadius: T.radius.data,
            borderWidth: 0.5,
        };
    } else if (variant === 'support') {
        containerStyle = {
            ...containerStyle,
            backgroundColor: '#111111',
            borderRadius: T.radius.support,
            borderWidth: 0,
        };
    }

    return (
        <View style={[containerStyle, style]} {...props}>
            {variant === 'hero' ? (
                <View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: 12,
                        height: 12,
                        backgroundColor: '#000',
                        borderLeftWidth: 0.5,
                        borderBottomWidth: 0.5,
                        borderColor: T.color.border.white10,
                    }}
                />
            ) : null}
            {children}
        </View>
    );
}
