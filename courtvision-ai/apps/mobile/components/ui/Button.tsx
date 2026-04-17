import React from 'react';
import type { PressableProps, ViewStyle, TextStyle } from 'react-native';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { T } from '../../lib/theme';

interface ButtonProps extends PressableProps {
    title: string;
    variant?: 'primary' | 'secondary';
    style?: ViewStyle;
    textStyle?: TextStyle;
    leftIcon?: React.ReactNode;
    fullWidth?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
    title,
    variant = 'primary',
    style,
    textStyle,
    leftIcon,
    fullWidth = true,
    ...props
}: ButtonProps) {
    const pressed = useSharedValue(0);

    const animatedStyles = useAnimatedStyle(() => {
        return {
            transform: [{ scale: withSpring(pressed.value ? 0.96 : 1, T.spring.snappy) }],
            opacity: pressed.value ? 0.85 : 1,
        };
    });

    const isPrimary = variant === 'primary';

    const defaultContainerStyle: ViewStyle = {
        height: 56,
        borderRadius: T.radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        paddingHorizontal: T.spacing[6],
        width: fullWidth ? '100%' : 'auto',
        ...(isPrimary
            ? {
                backgroundColor: T.color.brand.primary,
                ...T.glow.soft(T.color.brand.primary),
            }
            : {
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: T.color.border.accent,
            }),
    };

    const defaultTextStyle: TextStyle = {
        fontFamily: T.fonts.body.bold,
        fontSize: T.fontSize.base,
        letterSpacing: 0.3,
        color: isPrimary ? T.color.text.primary : T.color.brand.primary,
        textTransform: 'uppercase',
    };

    return (
        <AnimatedPressable
            onPressIn={(e) => {
                pressed.value = 1;
                if (props.onPressIn) props.onPressIn(e);
            }}
            onPressOut={(e) => {
                pressed.value = 0;
                if (props.onPressOut) props.onPressOut(e);
            }}
            style={[defaultContainerStyle, style, animatedStyles]}
            accessibilityRole="button"
            {...props}
        >
            {leftIcon && <Animated.View style={{ marginRight: T.spacing[2] }}>{leftIcon}</Animated.View>}
            <Text style={[defaultTextStyle, textStyle]}>{title}</Text>
        </AnimatedPressable>
    );
}
