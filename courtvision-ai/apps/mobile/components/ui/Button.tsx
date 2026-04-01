import React from 'react';
import type { PressableProps, ViewStyle, TextStyle } from 'react-native';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    interpolateColor,
} from 'react-native-reanimated';
import { colors, radius, shadows, space, SPRING_SNAPPY, typography } from '../../constants/tokens';

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
            transform: [{ scale: withSpring(pressed.value ? 0.96 : 1, SPRING_SNAPPY) }],
            opacity: pressed.value ? 0.85 : 1,
        };
    });

    const isPrimary = variant === 'primary';

    const defaultContainerStyle: ViewStyle = {
        height: 56,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        paddingHorizontal: space[6],
        width: fullWidth ? '100%' : 'auto',
        ...(isPrimary
            ? {
                backgroundColor: colors.fire,
                ...shadows.orangeGlow,
            }
            : {
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: colors.lineStrong,
            }),
    };

    const defaultTextStyle: TextStyle = {
        ...typography.cta,
        color: isPrimary ? colors.snow : colors.fire,
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
            {leftIcon && <Animated.View style={{ marginRight: space[2] }}>{leftIcon}</Animated.View>}
            <Text style={[defaultTextStyle, textStyle]}>{title}</Text>
        </AnimatedPressable>
    );
}
