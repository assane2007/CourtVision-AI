import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { T } from '../../../lib/theme';
import { CVText } from '../../../components/ui';
import type { CoachMessage } from '../../../lib/coach';
import { coachApi } from '../../../lib/coach';

export default function CoachChatScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [messages, setMessages] = useState<CoachMessage[]>([]);
    const [title, setTitle] = useState('Coach V');
    const [context, setContext] = useState('general');
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (!id || typeof id !== 'string') return;

        const loadChat = async () => {
            try {
                const res = await coachApi.getConversation(id);
                setTitle(res.title);
                setContext(res.context);
                setMessages(res.messages.reverse());
            } catch (error) {
                console.error('Failed to load chat', error);
            } finally {
                setLoading(false);
            }
        };

        loadChat();
    }, [id]);

    const sendMessage = async () => {
        if (!input.trim() || sending || typeof id !== 'string') return;

        const userMsg = input.trim();
        setInput('');

        const newUserMsg: CoachMessage = { role: 'user', content: userMsg };
        setMessages(prev => [newUserMsg, ...prev]);
        setSending(true);

        try {
            const res = await coachApi.sendMessage(id, userMsg, context);
            const assistantMsg: CoachMessage = {
                role: 'assistant',
                content: res.message,
                attachments: res.attachments,
                suggestedActions: res.suggestedActions
            };
            setMessages(prev => [assistantMsg, ...prev]);
        } catch (error) {
            console.error('Failed to send message', error);
        } finally {
            setSending(false);
        }
    };

    const renderMessage = ({ item }: { item: CoachMessage }) => {
        const isUser = item.role === 'user';

        return (
            <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.coachBubble]}>
                {!isUser && (
                    <View style={styles.coachAvatar}>
                        <Feather name="cpu" size={16} color={T.color.bg.primary} />
                    </View>
                )}
                <View style={[styles.messageContent, isUser ? styles.userContent : styles.coachContent]}>
                    <CVText
                        preset="body"
                        style={{ color: isUser ? '#FFFFFF' : T.color.text.primary }}
                    >
                        {item.content}
                    </CVText>

                    {!isUser && item.suggestedActions && item.suggestedActions.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                            {item.suggestedActions.map((action, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    onPress={() => { setInput(action); }}
                                    style={styles.suggestionChip}
                                >
                                    <CVText preset="caption" color="brand">{action}</CVText>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                    <Feather name="chevron-left" size={28} color={T.color.text.primary} />
                </TouchableOpacity>
                <View style={{ alignItems: 'center', flex: 1, paddingHorizontal: 16 }}>
                    <CVText preset="bodyBold" color="primary" numberOfLines={1}>{title}</CVText>
                    <CVText preset="caption" color="brand">AI Coach V</CVText>
                </View>
                <View style={{ width: 28 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={T.color.brand.primary} />
                </View>
            ) : (
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(_, index) => index.toString()}
                        renderItem={renderMessage}
                        inverted
                        contentContainerStyle={{ paddingHorizontal: T.spacing[4], paddingVertical: T.spacing[5] }}
                        showsVerticalScrollIndicator={false}
                        ListHeaderComponent={sending ? (
                            <View style={styles.typingIndicator}>
                                <ActivityIndicator size="small" color={T.color.brand.primary} />
                                <CVText preset="caption" color="tertiary" style={{ marginLeft: 8 }}>Coach is thinking...</CVText>
                            </View>
                        ) : null}
                    />

                    {/* Input Area */}
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={input}
                            onChangeText={setInput}
                            placeholder="Ask Coach V anything..."
                            placeholderTextColor={T.color.text.tertiary}
                            multiline
                            maxLength={1000}
                        />
                        <TouchableOpacity
                            onPress={sendMessage}
                            disabled={!input.trim() || sending}
                            style={[
                                styles.sendButton,
                                { opacity: !input.trim() || sending ? 0.5 : 1 }
                            ]}
                        >
                            <Feather name="arrow-up" size={22} color={T.color.bg.primary} />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
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
        paddingHorizontal: T.spacing[4],
        paddingVertical: T.spacing[3],
        borderBottomWidth: 1,
        borderBottomColor: T.color.border.soft,
    },
    messageBubble: {
        flexDirection: 'row',
        marginBottom: T.spacing[4],
        maxWidth: '88%',
    },
    userBubble: { alignSelf: 'flex-end' },
    coachBubble: { alignSelf: 'flex-start' },
    coachAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: T.color.brand.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        marginTop: 4,
    },
    messageContent: {
        paddingHorizontal: T.spacing[4],
        paddingVertical: T.spacing[3],
        borderRadius: T.radius.lg,
    },
    userContent: {
        backgroundColor: T.color.brand.primary,
        borderTopRightRadius: 4,
    },
    coachContent: {
        backgroundColor: T.color.bg.secondary,
        borderTopLeftRadius: 4,
        borderWidth: 1,
        borderColor: T.color.border.base,
    },
    suggestionChip: {
        backgroundColor: T.color.brand.muted,
        borderWidth: 1,
        borderColor: T.color.border.accent,
        borderRadius: T.radius.md,
        paddingHorizontal: T.spacing[3],
        paddingVertical: T.spacing[2],
        marginRight: 8,
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: T.spacing[4],
        paddingVertical: T.spacing[3],
        paddingBottom: Platform.OS === 'ios' ? T.spacing[6] : T.spacing[3],
        borderTopWidth: 1,
        borderTopColor: T.color.border.soft,
        backgroundColor: T.color.bg.primary,
    },
    input: {
        flex: 1,
        backgroundColor: T.color.bg.secondary,
        color: T.color.text.primary,
        fontFamily: T.fonts.body.medium,
        fontSize: 15,
        minHeight: 44,
        maxHeight: 120,
        borderRadius: 22,
        paddingHorizontal: T.spacing[4],
        paddingTop: 12,
        paddingBottom: 12,
        borderWidth: 1,
        borderColor: T.color.border.strong,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: T.color.brand.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: T.spacing[3],
    },
    typingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginBottom: 16,
        alignSelf: 'flex-start',
    }
});
