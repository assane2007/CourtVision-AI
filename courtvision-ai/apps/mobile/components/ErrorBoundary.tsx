import React, { Component, type ReactNode, type JSX } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, typography, space } from '../constants/tokens';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null };
    refs = {};

    // Explicit return type to satisfy React 19 JSX type constraints

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary]', error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <Text style={styles.title}>Something went wrong</Text>
                    <Text style={styles.message}>{this.state.error?.message}</Text>
                    <Pressable style={styles.button} onPress={this.handleReset}>
                        <Text style={styles.buttonText}>Try Again</Text>
                    </Pressable>
                </View>
            );
        }
        return <>{this.props.children}</>;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.void,
        justifyContent: 'center',
        alignItems: 'center',
        padding: space[6],
    },
    title: {
        fontFamily: typography.h2.fontFamily,
        fontSize: 24,
        color: colors.snow,
        marginBottom: space[3],
    },
    message: {
        fontFamily: typography.body.fontFamily,
        fontSize: 14,
        color: colors.cloud,
        textAlign: 'center',
        marginBottom: space[6],
    },
    button: {
        backgroundColor: colors.fire,
        paddingHorizontal: space[6],
        paddingVertical: space[3],
        borderRadius: 12,
    },
    buttonText: {
        fontFamily: typography.h2.fontFamily,
        fontSize: 16,
        color: colors.snow,
    },
});
