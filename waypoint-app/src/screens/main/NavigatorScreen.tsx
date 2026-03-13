/**
 * AI Navigator screen — the core chat interface
 * Ported from GAS MVP renderNavigator() with native enhancements:
 * - Streaming responses with typing indicator
 * - Tone calibration toggle (collaborative → assertive → adversarial)
 * - RAG-powered context from pgvector KB
 * - Message persistence via Supabase
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFamily, useChildren } from '@/hooks/useFamily';
import { useChat, type UIMessage } from '@/hooks/useChat';
import { useDiagnoses } from '@/hooks/useFamily';
import type { ChatContext, ToneLevel } from '@/types/database';
import { colors, fonts, spacing, radii } from '@/lib/theme';

/** Env keys — in production these come from secure storage / env vars */
const ANTHROPIC_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
const OPENAI_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

/** Tone display labels */
const TONE_LABELS: Record<ToneLevel, { label: string; emoji: string; color: string }> = {
  collaborative: { label: 'Collaborative', emoji: '🤝', color: '#2E9E8F' },
  assertive: { label: 'Assertive', emoji: '💪', color: '#E8913A' },
  adversarial: { label: 'Advocacy', emoji: '⚖️', color: '#D94B4B' },
};

/** Quick-start suggestions shown before first message */
const SUGGESTIONS = [
  'How do I get my child evaluated for services?',
  'My Regional Center denied our request. What can I do?',
  "What should I know before my child's IEP meeting?",
  'How does the IPP process work?',
  'What is the Lanterman Act and how does it help us?',
];

export default function NavigatorScreen() {
  const { family } = useFamily();
  const { children } = useChildren(family?.id);
  const primaryChild = children.find((c) => c.is_primary) || children[0];

  // Build context for AI
  const chatContext: ChatContext = {
    familyId: family?.id ?? '',
    childAge: primaryChild?.date_of_birth ? getAgeString(primaryChild.date_of_birth) : null,
    diagnoses: [], // TODO: Wire up useDiagnoses when child exists
    state: family?.state ?? 'California',
    county: family?.county ?? null,
    regionalCenter: family?.regional_center ?? null,
    schoolDistrict: family?.school_district ?? null,
    insuranceCarrier: family?.insurance_carrier ?? null,
    toneLevel: 'collaborative',
  };

  const {
    messages,
    isLoading,
    error,
    toneLevel,
    sendMessage,
    setToneLevel,
    startNewSession,
  } = useChat({
    familyId: family?.id ?? '',
    context: chatContext,
    anthropicKey: ANTHROPIC_KEY,
    openAiKey: OPENAI_KEY,
  });

  const [inputText, setInputText] = useState('');
  const [showTonePicker, setShowTonePicker] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, messages[messages.length - 1]?.content]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(inputText.trim());
    setInputText('');
  };

  const handleSuggestion = (text: string) => {
    sendMessage(text);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>AI Navigator</Text>
          <Text style={styles.headerSubtitle}>Your disability services guide</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.newChatButton}
            onPress={startNewSession}
            accessibilityRole="button"
            accessibilityLabel="New conversation"
          >
            <Text style={styles.newChatIcon}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tone Selector */}
      <View style={styles.toneBar}>
        <Text style={styles.toneLabel}>Tone:</Text>
        {(Object.keys(TONE_LABELS) as ToneLevel[]).map((tone) => {
          const isActive = tone === toneLevel;
          const config = TONE_LABELS[tone];
          return (
            <TouchableOpacity
              key={tone}
              style={[
                styles.tonePill,
                isActive && { backgroundColor: config.color },
              ]}
              onPress={() => setToneLevel(tone)}
              accessibilityRole="button"
              accessibilityLabel={`Set tone to ${config.label}`}
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[
                  styles.tonePillText,
                  isActive && styles.tonePillTextActive,
                ]}
              >
                {config.emoji} {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        {messages.length === 0 ? (
          <WelcomeView onSuggestion={handleSuggestion} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MessageBubble message={item} />}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Error banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about your child's services..."
            placeholderTextColor={colors.mid}
            multiline
            maxLength={2000}
            editable={!isLoading}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.sendIcon}>↑</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Welcome view with suggestions — shown before first message */
function WelcomeView({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <View style={styles.welcomeContainer}>
      <Text style={styles.welcomeEmoji}>🧭</Text>
      <Text style={styles.welcomeTitle}>Hi! I'm your AI Navigator.</Text>
      <Text style={styles.welcomeSubtitle}>
        I can help you understand your rights, navigate Regional Centers, prepare for IEP
        meetings, and take concrete next steps for your child.
      </Text>
      <Text style={styles.suggestionsLabel}>Try asking:</Text>
      {SUGGESTIONS.map((text) => (
        <TouchableOpacity
          key={text}
          style={styles.suggestionChip}
          onPress={() => onSuggestion(text)}
          accessibilityRole="button"
        >
          <Text style={styles.suggestionText}>{text}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/** Individual message bubble */
function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      {!isUser && (
        <View style={styles.avatarSmall}>
          <Text style={styles.avatarSmallText}>🧭</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant,
          ]}
        >
          {message.content}
          {message.isStreaming && <Text style={styles.cursor}>▊</Text>}
        </Text>
      </View>
    </View>
  );
}

/** Calculate age string from DOB */
function getAgeString(dob: string): string {
  const birth = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years > 0) return `${years} year${years > 1 ? 's' : ''} and ${months} month${months !== 1 ? 's' : ''}`;
  return `${months} month${months !== 1 ? 's' : ''}`;
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFB',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fonts.sizes.xl,
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
  },
  headerSubtitle: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  newChatButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newChatIcon: {
    fontSize: 20,
    color: colors.white,
    fontWeight: '700',
  },
  toneBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 6,
  },
  toneLabel: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    fontWeight: fonts.weights.medium as '500',
    marginRight: 4,
  },
  tonePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.light,
  },
  tonePillText: {
    fontSize: 11,
    color: colors.dark,
    fontWeight: fonts.weights.medium as '500',
  },
  tonePillTextActive: {
    color: colors.white,
  },
  messageList: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-end',
    gap: 8,
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E6F7F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  avatarSmallText: {
    fontSize: 14,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
  },
  bubbleUser: {
    backgroundColor: colors.teal,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleText: {
    fontSize: fonts.sizes.sm,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: colors.white,
  },
  bubbleTextAssistant: {
    color: colors.dark,
  },
  cursor: {
    color: colors.teal,
    opacity: 0.6,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: fonts.sizes.xs,
    color: '#DC2626',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.light,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
    fontSize: fonts.sizes.sm,
    color: colors.dark,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
  sendIcon: {
    fontSize: 20,
    color: colors.white,
    fontWeight: '700',
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  welcomeEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  welcomeTitle: {
    fontSize: fonts.sizes.xl,
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  welcomeSubtitle: {
    fontSize: fonts.sizes.sm,
    color: colors.mid,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  suggestionsLabel: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    fontWeight: fonts.weights.medium as '500',
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  suggestionChip: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionText: {
    fontSize: fonts.sizes.sm,
    color: colors.teal,
    lineHeight: 18,
  },
});
