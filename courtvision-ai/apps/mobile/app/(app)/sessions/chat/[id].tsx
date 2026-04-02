import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Dimensions, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { colors, typography, space, radius } from '../../../../constants/tokens';
import { coachApi } from '../../../../lib/coach';

interface Message {
    id: string;
    role: 'user' | 'ai';
    text: string;
    timestamp: number;
}

export default function CoachChatScreen() {
    const { id } = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const scrollViewRef = useRef<ScrollView>(null);
    const [input, setInput] = useState('');
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);

    // Initialize conversation with session context
    useEffect(() => {
        initConversation();
    }, [id]);

    const initConversation = async () => {
        try {
            setIsTyping(true);
            const res = await coachApi.createConversation(
                'session_analysis',
                `Analyze my session ${id} and give me key insights.`,
                id as string
            );
            setConversationId(res.conversationId);
            setMessages([{
                id: '1',
                role: 'ai',
                text: res.response?.message ?? res.response?.content ?? "I've analyzed your session. What would you like to focus on?",
                timestamp: Date.now(),
            }]);
        } catch (err) {
            console.warn('[CoachChat] Init failed:', err);
            setMessages([{
                id: '1',
                role: 'ai',
                text: "I'm ready to discuss your session. Ask me about your shooting mechanics, speed, or anything else you'd like to improve.",
                timestamp: Date.now(),
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: input.trim(),
            timestamp: Date.now(),
        };

        setMessages(prev => [...prev, userMsg]);
        const userText = input.trim();
        setInput('');
        setIsTyping(true);

        try {
            const cId = conversationId ?? 'default';
            const res = await coachApi.sendMessage(cId, userText, 'session_analysis', id as string);
            if (!conversationId && (res as any).conversationId) {
                setConversationId((res as any).conversationId);
            }
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                text: res.message ?? (res as any).content ?? "Let me think about that...",
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (err) {
            console.warn('[CoachChat] Send failed:', err);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                text: "Sorry, I couldn't process that request. Please try again.",
                timestamp: Date.now(),
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages, isTyping]);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + space[2] }]}>
                <Pressable onPress={() => router.back()} style={styles.iconButton}>
                        <Feather name="chevron-left" color={colors.snow} size={24} />
                </Pressable>
                <View style={styles.headerTitles}>
                    <View style={styles.aiBadgeRow}>
                            <Feather name="cpu" color={colors.fire} size={14} />
                        <Text style={styles.headerSubtitle}>COURTVISION AI</Text>
                    </View>
                    <Text style={styles.headerTitle}>Live Coach</Text>
                </View>
                <View style={{ width: 44 }} /> {/* Spacer */}
            </View>

            {/* Chat List */}
            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={styles.chatScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {messages.map((msg, index) => {
                    const isAi = msg.role === 'ai';
                    return (
                        <Animated.View
                            entering={FadeInDown.springify().damping(12)}
                            key={msg.id}
                            style={[
                                styles.messageWrapper,
                                isAi ? styles.messageWrapperAi : styles.messageWrapperUser
                            ]}
                        >
                            <View style={[
                                styles.messageBubble,
                                isAi ? styles.messageBubbleAi : styles.messageBubbleUser
                            ]}>
                                <Text style={[
                                    styles.messageText,
                                    isAi ? styles.messageTextAi : styles.messageTextUser
                                ]}>
                                    {msg.text}
                                </Text>
                            </View>
                        </Animated.View>
                    );
                })}
                {isTyping && (
                    <Animated.View entering={FadeIn} style={[styles.messageWrapper, styles.messageWrapperAi]}>
                        <View style={[styles.messageBubble, styles.messageBubbleAi, styles.typingBubble]}>
                            <Text style={styles.typingText}>AI is analyzing...</Text>
                        </View>
                    </Animated.View>
                )}
            </ScrollView>

            {/* Input Area */}
            <View style={[styles.inputContainer, { paddingBottom: insets.bottom || space[4] }]}>
                <View style={styles.inputFieldWrapper}>
                    <TextInput
                        style={styles.input}
                        placeholder="Ask your coach..."
                        placeholderTextColor={colors.fog}
                        value={input}
                        onChangeText={setInput}
                        multiline
                        maxLength={150}
                        onSubmitEditing={handleSend}
                    />
                    <Pressable
                        style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
                        onPress={handleSend}
                        disabled={!input.trim()}
                    >
                        <Feather name="send" color={input.trim() ? colors.snow : colors.cloud} size={18} />
                    </Pressable>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.base,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: space[2],
        paddingBottom: space[4],
        borderBottomWidth: 1,
        borderBottomColor: colors.surface,
        backgroundColor: colors.base,
        zIndex: 10,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitles: {
        flex: 1,
        alignItems: 'center',
    },
    aiBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    headerSubtitle: {
        ...typography.label,
        color: colors.fire,
    },
    headerTitle: {
        fontFamily: 'BarlowCondensed_700Bold',
        fontSize: 20,
        color: colors.snow,
    },
    chatScroll: {
        padding: space[4],
        paddingBottom: space[8],
        gap: space[4],
    },
    messageWrapper: {
        flexDirection: 'row',
        width: '100%',
    },
    messageWrapperAi: {
        justifyContent: 'flex-start',
    },
    messageWrapperUser: {
        justifyContent: 'flex-end',
    },
    messageBubble: {
        maxWidth: '85%',
        padding: space[4],
        borderRadius: radius.lg,
    },
    messageBubbleAi: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.surface3,
        borderBottomLeftRadius: 4,
    },
    messageBubbleUser: {
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.fire,
        borderBottomRightRadius: 4,
    },
    messageText: {
        ...typography.body,
    },
    messageTextAi: {
        color: colors.snow,
    },
    messageTextUser: {
        color: colors.snow,
    },
    typingBubble: {
        paddingVertical: space[3],
    },
    typingText: {
        ...typography.bodySm,
        color: colors.fog,
        fontStyle: 'italic',
    },
    inputContainer: {
        paddingHorizontal: space[4],
        paddingTop: space[3],
        backgroundColor: colors.base,
        borderTopWidth: 1,
        borderTopColor: colors.surface,
    },
    inputFieldWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.surface3,
        paddingLeft: space[4],
        paddingRight: space[1],
        minHeight: 50,
    },
    input: {
        flex: 1,
        ...typography.body,
        color: colors.snow,
        paddingTop: space[3],
        paddingBottom: space[3],
        maxHeight: 100,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.fire,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: colors.surface3,
    },
});
