import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { T } from '../../../lib/theme';
import { CVText, GlassCard } from '../../../components/ui';
import type { CoachConversation, CoachSuggestion} from '../../../lib/coach';
import { coachApi } from '../../../lib/coach';

export default function CoachIndexScreen() {
    const router = useRouter();
    const [conversations, setConversations] = useState<CoachConversation[]>([]);
    const [suggestions, setSuggestions] = useState<CoachSuggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [convs, suggs] = await Promise.all([
                coachApi.getConversations(),
                coachApi.getSuggestions()
            ]);
            setConversations(convs);
            setSuggestions(suggs);
        } catch (error) {
            console.error('Failed to load coach data', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const startNewChat = async (context: string = 'general', initialMessage?: string) => {
        setLoading(true);
        try {
            const res = await coachApi.createConversation(context, initialMessage);
            router.push(`/(app)/coach/${res.conversationId}`);
        } catch (error) {
            console.error('Failed to start chat', error);
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                    <Feather name="chevron-left" size={28} color={T.color.text.primary} />
                </TouchableOpacity>
                <CVText preset="h3" color="primary">COACH V</CVText>
                <View style={{ width: 28 }} />
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={T.color.brand.primary} />
                </View>
            ) : (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: T.spacing[6], paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.color.brand.primary} />}
                >
                    {/* Welcome Banner */}
                    <GlassCard variant="accent" style={styles.banner}>
                        <Feather name="message-square" size={32} color={T.color.brand.primary} style={{ marginBottom: 12 }} />
                        <CVText preset="h2" color="primary" style={{ marginBottom: 8 }}>Ask Coach Anything</CVText>
                        <CVText preset="body" color="secondary">
                            I analyze your sessions, build training plans, and dissect your technique. What do you want to work on?
                        </CVText>
                    </GlassCard>

                    {/* Suggestions */}
                    {suggestions.length > 0 && (
                        <View style={{ marginBottom: T.spacing[8] }}>
                            <CVText preset="sectionTitle" color="secondary" style={{ marginBottom: T.spacing[4] }}>SUGGESTED EXERCISES</CVText>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -T.spacing[6] }} contentContainerStyle={{ paddingHorizontal: T.spacing[6] }}>
                                {suggestions.map((sug, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        onPress={() => startNewChat(sug.context, sug.text)}
                                        style={[styles.suggestionCard, T.glass.base]}
                                        activeOpacity={0.8}
                                    >
                                        <CVText preset="h2" style={{ marginBottom: 8 }}>{sug.emoji}</CVText>
                                        <CVText preset="body" color="primary" numberOfLines={3}>{sug.text}</CVText>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Previous Conversations */}
                    <View>
                        <CVText preset="sectionTitle" color="secondary" style={{ marginBottom: T.spacing[4] }}>HISTORY</CVText>

                        <TouchableOpacity
                            onPress={() => startNewChat()}
                            style={styles.newChatBtn}
                            activeOpacity={0.8}
                        >
                            <Feather name="plus-circle" size={20} color={T.color.brand.primary} style={{ marginRight: 12 }} />
                            <CVText preset="bodyBold" color="brand">New Conversation</CVText>
                        </TouchableOpacity>

                        {conversations.map(conv => (
                            <TouchableOpacity
                                key={conv.id}
                                onPress={() => router.push(`/(app)/coach/${conv.id}`)}
                                style={[styles.historyRow, T.glass.thin]}
                                activeOpacity={0.8}
                            >
                                <View style={{ flex: 1 }}>
                                    <CVText preset="bodyBold" color="primary" numberOfLines={1} style={{ marginBottom: 4 }}>{conv.title}</CVText>
                                    <CVText preset="caption" color="tertiary">
                                        {new Date(conv.last_message_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} • {conv.message_count} messages
                                    </CVText>
                                </View>
                                <Feather name="chevron-right" size={20} color={T.color.text.tertiary} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: T.color.bg.primary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: T.spacing[6],
        paddingVertical: T.spacing[4],
    },
    banner: {
        padding: T.spacing[6],
        borderRadius: T.radius.xl,
        marginBottom: T.spacing[8],
    },
    suggestionCard: {
        padding: T.spacing[4],
        borderRadius: T.radius.lg,
        marginRight: T.spacing[3],
        width: 200,
    },
    newChatBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: T.color.brand.muted,
        padding: T.spacing[4],
        borderRadius: T.radius.lg,
        marginBottom: T.spacing[4],
        borderWidth: 1,
        borderColor: T.color.border.accent,
    },
    historyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: T.spacing[4],
        borderRadius: T.radius.lg,
        marginBottom: T.spacing[3],
    }
});
