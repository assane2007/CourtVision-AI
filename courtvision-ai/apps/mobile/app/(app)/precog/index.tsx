import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../../lib/api';
import { useStore, selectIsDemoMode } from '../../../lib/store';

interface PrecogData {
    currentSpeedMph: number;
    baselineSpeedMph: number;
    milestone: string;
    weeklyProgress: number[];
}

export default function PrecogDashboard() {
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<PrecogData | null>(null);
    const isDemoMode = useStore(selectIsDemoMode);

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                const res = await api.get<{ data: PrecogData }>('/api/precog/dashboard');
                setData(res.data ?? res as any);
            } catch (err) {
                console.warn('[Precog] Load failed:', err);
                setData({
                    currentSpeedMph: 0,
                    baselineSpeedMph: 0,
                    milestone: 'Unable to load precog data. Start a session to begin tracking.',
                    weeklyProgress: [],
                });
            } finally {
                setLoading(false);
            }
        };

        loadDashboard();
    }, [isDemoMode]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF4D00" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backText}>← BACK</Text>
                </Pressable>
                <Text style={styles.title}>PRE-COG</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.content}>
                <View style={styles.radarContainer}>
                    <Text style={styles.radarLabel}>VITESSE DE LECTURE ACTUELLE</Text>
                    <View style={styles.speedRow}>
                        <Text style={styles.speedValue}>{data?.currentSpeedMph || 0}</Text>
                        <Text style={styles.speedUnit}>MPH</Text>
                    </View>
                    <Text style={styles.milestoneText}>{data?.milestone}</Text>
                </View>

                <View style={styles.graphContainer}>
                    <Text style={styles.graphTitle}>PROGRESSION (8 WEEKS)</Text>
                    <View style={styles.mockGraph}>
                        <View style={styles.barContainer}>
                            {(data?.weeklyProgress ?? []).map((pct, i, arr) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.bar,
                                        { height: `${pct}%` },
                                        i === arr.length - 1 && { backgroundColor: '#FF4D00' },
                                    ]}
                                />
                            ))}
                            {(data?.weeklyProgress ?? []).length === 0 && (
                                <Text style={{ color: '#F8F5EF', opacity: 0.4, fontSize: 13 }}>No data yet</Text>
                            )}
                        </View>
                    </View>
                </View>
            </View>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                <Pressable
                    style={styles.startButton}
                    onPress={() => router.push('/(app)/precog/session')}
                >
                    <Text style={styles.startText}>START TODAY'S SESSION</Text>
                    <Feather name="arrow-right" size={24} color="#050505" />
                </Pressable>
                <Text style={styles.limitText}>MAXIMUM 1 SESSION PER DAY</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050505',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#050505',
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 40,
    },
    backButton: {
        padding: 5,
    },
    backText: {
        color: '#F8F5EF',
        fontFamily: 'JetBrainsMono-Regular', // Fallback font if Bebas/Space not loaded
        fontSize: 14,
        opacity: 0.7,
    },
    title: {
        color: '#FF4D00',
        fontSize: 24,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    placeholder: {
        width: 60,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    radarContainer: {
        alignItems: 'center',
        marginBottom: 60,
    },
    radarLabel: {
        color: '#F8F5EF',
        opacity: 0.5,
        fontSize: 12,
        letterSpacing: 2,
        marginBottom: 10,
    },
    speedRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    speedValue: {
        color: '#F8F5EF',
        fontSize: 120,
        fontWeight: 'bold',
        lineHeight: 120,
    },
    speedUnit: {
        color: '#FF4D00',
        fontSize: 32,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    milestoneText: {
        color: '#F8F5EF',
        opacity: 0.8,
        fontSize: 14,
        textAlign: 'center',
        marginTop: 20,
        maxWidth: 300,
        lineHeight: 20,
    },
    graphContainer: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        padding: 20,
    },
    graphTitle: {
        color: '#F8F5EF',
        opacity: 0.5,
        fontSize: 12,
        letterSpacing: 1.5,
        marginBottom: 20,
    },
    mockGraph: {
        height: 150,
        justifyContent: 'flex-end',
    },
    barContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        height: '100%',
    },
    bar: {
        width: 30,
        backgroundColor: '#F8F5EF',
        opacity: 0.8,
        borderRadius: 4,
    },
    footer: {
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    startButton: {
        backgroundColor: '#FF4D00',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingVertical: 20,
        borderRadius: 12,
        gap: 12,
    },
    startText: {
        color: '#050505',
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    limitText: {
        color: '#F8F5EF',
        opacity: 0.4,
        fontSize: 11,
        marginTop: 16,
        letterSpacing: 1,
    },
});
