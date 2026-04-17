import React, { Component, type ReactNode, type JSX } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { T } from '../lib/theme';

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
        backgroundColor: T.color.bg.primary,
        justifyContent: 'center',
        alignItems: 'center',
        padding: T.spacing[6],
    },
    title: {
        fontFamily: T.type.h2.fontFamily,
        fontSize: T.type.h2.fontSize,
        color: T.color.text.primary,
        marginBottom: T.spacing[3],
    },
    message: {
        fontFamily: T.type.body.fontFamily,
        fontSize: 14,
        color: T.color.text.secondary,
        textAlign: 'center',
        marginBottom: T.spacing[6],
    },
    button: {
        backgroundColor: T.color.brand.primary,
        paddingHorizontal: T.spacing[6],
        paddingVertical: T.spacing[3],
        borderRadius: T.radius.md,
    },
    buttonText: {
        fontFamily: T.type.h3.fontFamily,
        fontSize: 16,
        color: T.color.text.primary,
    },
});
