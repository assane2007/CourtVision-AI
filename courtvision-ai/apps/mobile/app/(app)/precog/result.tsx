import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

export default function PrecogResult() {
    const { accuracy } = useLocalSearchParams();

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {/* As per spec: extreme minimalism */}
                <Text style={styles.resultText}>Today: {accuracy || 0}%</Text>
                <Text style={styles.resultText}>Last week: 58%</Text>
            </View>

            <Pressable
                style={styles.closeButton}
                onPress={() => router.replace('/(app)')}
            >
                <Text style={styles.closeText}>FINISH</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050505',
        justifyContent: 'space-between',
        padding: 40,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    resultText: {
        color: '#F8F5EF',
        fontSize: 24,
        fontFamily: 'JetBrainsMono_400Regular',
        marginBottom: 16,
        letterSpacing: 1,
    },
    closeButton: {
        backgroundColor: '#FF4D00',
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    closeText: {
        color: '#050505',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 2,
    }
});
