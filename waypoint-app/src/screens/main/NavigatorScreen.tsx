/**
 * AI Navigator screen — the core chat interface
 * Ported from GAS MVP renderNavigator() with native enhancements:
 * - Streaming responses with typing indicator
 * - Tone calibration toggle (collaborative → assertive → adversarial)
 * - RAG-powered context from pgvector KB
 * - Message persistence via Supabase
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFamily, useChildren } from '@/hooks/useFamily';
import { useChat, type UIMessage } from '@/hooks/useChat';
import { useActions } from '@/hooks/useActions';
import { useDiagnoses } from '@/hooks/useFamily';
import { useToast } from '@/components/Toast';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NavigatorStackParamList } from '@/types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { RC_DATABASE } from '@/data/regionalCenters';
import { logCommunication } from '@/hooks/useCommunications';
import AIConsentModal from '@/components/AIConsentModal';
import ChatMetaCards from '@/components/ChatMetaCards';
import RichText, { stripInlineMarkdown } from '@/components/RichText';
import { hideStreamingTrailer, hasRichMeta, type ChatStep } from '@/lib/followups';
import { useI18n } from '@/i18n';
import type { ChatContext, ToneLevel, ActionCategory, Action } from '@/types/database';
import { colors, fonts, spacing, radii } from '@/lib/theme';

/** Tone display labels */
const TONE_LABELS: Record<ToneLevel, { label: string; emoji: string; color: string }> = {
  collaborative: { label: 'Collaborative', emoji: '🤝', color: '#2E9E8F' },
  assertive: { label: 'Assertive', emoji: '💪', color: '#E8913A' },
  adversarial: { label: 'Advocacy', emoji: '⚖️', color: '#D94B4B' },
};

/** Map a response META category to an action plan category */
const META_CATEGORY_TO_ACTION: Record<string, ActionCategory> = {
  'regional-center': 'regional_center',
  iep: 'iep',
  insurance: 'insurance',
  benefits: 'benefits',
  rights: 'legal',
  navigation: 'general',
  transitions: 'general',
};

/**
 * actions.source_message_id is a uuid column; streaming messages have
 * client-generated string ids ("assistant-173…") that would fail the insert.
 * Only persisted messages (loaded from history) carry real uuids.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asMessageUuid = (id: string): string | undefined => (UUID_RE.test(id) ? id : undefined);

/** Quick-start suggestions shown before first message */
const SUGGESTIONS = [
  'How do I get my child evaluated for services?',
  'My Regional Center denied our request. What can I do?',
  "What should I know before my child's IEP meeting?",
  'How does the IPP process work?',
  'What is the Lanterman Act and how does it help us?',
];

export default function NavigatorScreen() {
  const { family, updateFamily } = useFamily();
  const { children } = useChildren(family?.id);
  const primaryChild = children.find((c) => c.is_primary) || children[0];
  const { diagnoses: childDiagnoses } = useDiagnoses(primaryChild?.id);

  // AI consent gate (Wave 1.4): affirmative consent before anything is sent
  const hasAIConsent = !!family?.ai_consent_at;
  const [showConsent, setShowConsent] = useState(false);
  const [pendingText, setPendingText] = useState<string | null>(null);

  const acceptConsent = async () => {
    setShowConsent(false);
    const saved = await updateFamily({ ai_consent_at: new Date().toISOString() });
    if (!saved) {
      setPendingText(null);
      showToast("Couldn't save your consent — please try again in a moment.", 'error');
      return;
    }
    if (pendingText) {
      const text = pendingText;
      setPendingText(null);
      sendMessage(text);
    }
  };

  // Build context for AI
  const chatContext: ChatContext = {
    familyId: family?.id ?? '',
    childAge: primaryChild?.date_of_birth ? getAgeString(primaryChild.date_of_birth) : null,
    diagnoses: childDiagnoses.map(d => d.name),
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
    sessionId,
    toneLevel,
    sendMessage,
    setToneLevel,
    startNewSession,
    loadSession,
  } = useChat({
    familyId: family?.id ?? '',
    context: chatContext,
  });

  const { createAction, actions } = useActions({ familyId: family?.id ?? '' });
  const { showToast } = useToast();
  const { t } = useI18n();

  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<NavigatorStackParamList, 'NavigatorMain'>>();
  const [inputText, setInputText] = useState('');

  // Proactive prompt handoff (P3): a "Waypoint noticed" card passes its
  // question here; send it once, gated by consent like any other message.
  useEffect(() => {
    const ask = route.params?.ask;
    if (!ask || isLoading) return;
    navigation.setParams({ ask: undefined });
    if (!hasAIConsent) {
      setPendingText(ask);
      setShowConsent(true);
      return;
    }
    sendMessage(ask);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.ask]);
  const [showTonePicker, setShowTonePicker] = useState(false);
  const [savingMessageId, setSavingMessageId] = useState<string | null>(null);
  // Step-save tracking, keyed "messageId|action" so the same step text in
  // two answers doesn't collide
  const [savingStepKeys, setSavingStepKeys] = useState<Set<string>>(new Set());
  const [savedStepKeys, setSavedStepKeys] = useState<Set<string>>(new Set());
  // Thumbs feedback already given, keyed by message id
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'up' | 'down'>>({});
  const [emailComposeMessage, setEmailComposeMessage] = useState<UIMessage | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  // Chat history (wave 3 retention): list past sessions, tap to resume
  const [showHistory, setShowHistory] = useState(false);
  const [historySessions, setHistorySessions] = useState<
    Array<{ id: string; title: string | null; created_at: string }>
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  /** Open the history sheet and fetch past sessions */
  const handleOpenHistory = useCallback(async () => {
    setShowHistory(true);
    setHistoryLoading(true);
    try {
      const { data } = await supabase
        .from('chat_sessions')
        .select('id, title, created_at')
        .eq('family_id', family?.id ?? '')
        .order('created_at', { ascending: false })
        .limit(30);
      setHistorySessions(data ?? []);
    } catch {
      setHistorySessions([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [family?.id]);

  const handleResumeSession = useCallback((sid: string) => {
    setShowHistory(false);
    loadSession(sid);
  }, [loadSession]);

  /** Save an AI response as an action plan item */
  const handleSaveAsAction = useCallback(async (message: UIMessage) => {
    if (savingMessageId) return;
    setSavingMessageId(message.id);

    try {
      // Extract a title from the first line/sentence of the message (max 100 chars)
      const plainContent = stripInlineMarkdown(message.content);
      const firstLine = plainContent.split('\n')[0].trim();
      const title = firstLine.length > 100
        ? firstLine.slice(0, 97) + '...'
        : firstLine;

      const action = await createAction({
        title,
        description: plainContent.slice(0, 500),
        source: 'ai_navigator',
        source_message_id: asMessageUuid(message.id),
        chat_session_id: sessionId ?? undefined,
        category: 'general',
        priority: 'medium',
      });

      if (action) {
        showToast('Saved to your Action Plan!', 'success');
      } else {
        showToast("Couldn't save — please try again.", 'error');
      }
    } catch (err) {
      showToast('Failed to save action', 'error');
    } finally {
      setSavingMessageId(null);
    }
  }, [savingMessageId, createAction, sessionId, showToast]);

  /** Save one structured step from a steps card to the action plan */
  const handleSaveStep = useCallback(async (message: UIMessage, step: ChatStep) => {
    const key = `${message.id}|${step.action}`;
    if (savingStepKeys.has(key) || savedStepKeys.has(key)) return;
    setSavingStepKeys((prev) => new Set(prev).add(key));

    try {
      const descParts = [
        step.who && `Who: ${step.who}`,
        step.timeline && `When: ${step.timeline}`,
      ].filter(Boolean);
      const action = await createAction({
        title: step.action.length > 100 ? step.action.slice(0, 97) + '...' : step.action,
        description: descParts.join('\n') || undefined,
        script: step.script,
        source: 'ai_navigator',
        source_message_id: asMessageUuid(message.id),
        chat_session_id: sessionId ?? undefined,
        category: META_CATEGORY_TO_ACTION[message.meta?.category ?? ''] ?? 'general',
        priority: message.meta?.urgency === 'high' ? 'high' : 'medium',
      });
      if (action) {
        setSavedStepKeys((prev) => new Set(prev).add(key));
        showToast('Step added to your Action Plan', 'success');
      } else {
        showToast("Couldn't save this step — please try again.", 'error');
      }
    } catch {
      showToast('Failed to save step', 'error');
    } finally {
      setSavingStepKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [savingStepKeys, savedStepKeys, createAction, sessionId, showToast]);

  /** Save every step from a steps card */
  const handleSaveAllSteps = useCallback(async (message: UIMessage, steps: ChatStep[]) => {
    for (const step of steps) {
      // sequential to keep toasts sane and avoid hammering the API
      // eslint-disable-next-line no-await-in-loop
      await handleSaveStep(message, step);
    }
  }, [handleSaveStep]);

  /** Record a thumbs up/down on an AI answer */
  const handleFeedback = useCallback(async (message: UIMessage, rating: 'up' | 'down') => {
    if (feedbackGiven[message.id]) return;
    // Optimistic — a rating tap should feel instant
    setFeedbackGiven((prev) => ({ ...prev, [message.id]: rating }));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('ai_feedback').insert({
        user_id: user.id,
        session_id: sessionId,
        message_id: message.id,
        rating,
        content_preview: message.content.slice(0, 300),
      });
      if (rating === 'down') {
        showToast("Thanks — we'll use this to improve answers.", 'info');
      }
    } catch {
      // Feedback is best-effort; never surface an error for it
    }
  }, [feedbackGiven, sessionId, showToast]);

  /**
   * Chat → Letters handoff: open the letter generator with the template
   * preselected AND the specific ask prefilled, so the parent lands one tap
   * from generating (e.g. "Want me to draft the email to your RCEB
   * coordinator requesting waiver enrollment?" → question box prefilled
   * with "the email to my RCEB coordinator requesting waiver enrollment").
   */
  const handleOpenDraft = useCallback((draftKey: string, offerText?: string) => {
    let question: string | undefined;
    if (offerText) {
      question = offerText
        .replace(/^\s*(want me to|should i|shall i|would you like (me )?to)\s+(help\s+)?(draft|write|prepare)\s*/i, '')
        .replace(/\?+\s*$/, '')
        .replace(/\byour\b/gi, 'my')
        .replace(/\byou\b/gi, 'me')
        .trim();
      if (question) question = question[0].toUpperCase() + question.slice(1);
    }
    navigation.navigate('Home', {
      screen: 'Letters',
      params: { template: draftKey, question },
    });
  }, [navigation]);

  /** Open email compose modal with AI response pre-filled */
  const handleEmailThis = useCallback((message: UIMessage) => {
    setEmailComposeMessage(message);
    setEmailSubject('Waypoint: Disability Services Guidance');
    setEmailTo('');
  }, []);

  /**
   * Hand the drafted email to the user's own mail app: Gmail compose URL on
   * web, mailto elsewhere. No Gmail API scope needed — the user reviews and
   * hits send themselves.
   */
  const handleSendEmail = useCallback(async () => {
    if (!emailComposeMessage) return;
    setIsSendingEmail(true);
    try {
      const to = encodeURIComponent(emailTo.trim());
      const subject = encodeURIComponent(emailSubject);
      const bodyText = stripInlineMarkdown(emailComposeMessage.content);
      const body = encodeURIComponent(bodyText);
      const url =
        Platform.OS === 'web'
          ? `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`
          : `mailto:${to}?subject=${subject}&body=${body}`;
      await Linking.openURL(url);
      // Paper trail: record that this guidance went out by email
      if (family?.id) {
        logCommunication(family.id, {
          kind: 'email',
          subject: emailSubject || 'Waypoint guidance email',
          contact: emailTo.trim() || undefined,
          body: bodyText.slice(0, 4000),
        });
      }
      setEmailComposeMessage(null);
      setEmailTo('');
      setEmailSubject('');
    } catch {
      showToast("Couldn't open your email app.", 'error');
    } finally {
      setIsSendingEmail(false);
    }
  }, [emailTo, emailSubject, emailComposeMessage, showToast]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, messages[messages.length - 1]?.content]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    if (!hasAIConsent) {
      setPendingText(inputText.trim());
      setShowConsent(true);
      setInputText('');
      return;
    }
    sendMessage(inputText.trim());
    setInputText('');
  };

  const handleSuggestion = (text: string) => {
    if (!hasAIConsent) {
      setPendingText(text);
      setShowConsent(true);
      return;
    }
    sendMessage(text);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AIConsentModal
        visible={showConsent}
        onAccept={acceptConsent}
        onDecline={() => {
          setShowConsent(false);
          setPendingText(null);
        }}
      />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>AI Navigator</Text>
          <Text style={styles.headerSubtitle}>Your disability services guide</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={handleOpenHistory}
            accessibilityRole="button"
            accessibilityLabel="Chat history"
          >
            <Ionicons name="time-outline" size={18} color={colors.teal} />
          </TouchableOpacity>
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
            renderItem={({ item, index }) => {
              const isLast = index === messages.length - 1;
              const showChips = isLast && item.role === 'assistant' && !isLoading;
              const quickReplies = item.meta?.quickReplies ?? [];
              return (
                <>
                  <MessageBubble
                    message={item}
                    onSaveAction={handleSaveAsAction}
                    onEmailThis={handleEmailThis}
                    isSaving={savingMessageId === item.id}
                    onSaveStep={handleSaveStep}
                    onSaveAllSteps={handleSaveAllSteps}
                    onOpenDraft={handleOpenDraft}
                    savingStepKeys={savingStepKeys}
                    savedStepKeys={savedStepKeys}
                    onFeedback={handleFeedback}
                    feedback={feedbackGiven[item.id]}
                  />
                  {showChips && quickReplies.length > 0 && (
                    <FollowUpChips
                      followUps={quickReplies}
                      hint="Quick answer"
                      onPress={handleSuggestion}
                    />
                  )}
                  {showChips && (item.followUps?.length ?? 0) > 0 && (
                    <FollowUpChips
                      followUps={item.followUps!}
                      hint={t.navigator.followUpsHint}
                      onPress={handleSuggestion}
                    />
                  )}
                </>
              );
            }}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Error banner + offline fallback (ported from GAS chatHandleError) */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {error && (
          <AIDownFallback
            actions={actions}
            regionalCenter={family?.regional_center ?? null}
          />
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
            accessibilityLabel="Message input"
            accessibilityHint="Type your question about disability services"
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

        {/* Static legal disclaimer (replaces per-message AI-written footer) */}
        <Text style={styles.disclaimer}>{t.navigator.disclaimer}</Text>
      </KeyboardAvoidingView>

      {/* Chat History Modal */}
      <Modal visible={showHistory} animationType="slide" transparent onRequestClose={() => setShowHistory(false)}>
        <View style={styles.emailModalOverlay}>
          <View style={styles.historySheet}>
            <View style={styles.historyHeader}>
              <Text style={styles.emailModalTitle}>Past conversations</Text>
              <TouchableOpacity
                onPress={() => setShowHistory(false)}
                accessibilityRole="button"
                accessibilityLabel="Close history"
              >
                <Ionicons name="close" size={22} color={colors.mid} />
              </TouchableOpacity>
            </View>
            {historyLoading ? (
              <ActivityIndicator size="small" color={colors.teal} style={styles.historySpinner} />
            ) : historySessions.length === 0 ? (
              <Text style={styles.historyEmpty}>
                No past conversations yet — your chats will appear here.
              </Text>
            ) : (
              <ScrollView style={styles.historyList}>
                {historySessions.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.historyItem, s.id === sessionId && styles.historyItemActive]}
                    onPress={() => handleResumeSession(s.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Resume conversation: ${s.title ?? 'Untitled'}`}
                  >
                    <Text style={styles.historyItemTitle} numberOfLines={1}>
                      {s.title ?? 'Untitled conversation'}
                    </Text>
                    <Text style={styles.historyItemDate}>
                      {new Date(s.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Email Compose Modal */}
      <Modal visible={!!emailComposeMessage} animationType="slide" transparent>
        <View style={styles.emailModalOverlay}>
          <View style={styles.emailModalContent}>
            <Text style={styles.emailModalTitle}>Email This Response</Text>
            <TextInput
              style={styles.emailInput}
              placeholder="Recipient email"
              placeholderTextColor={colors.mid}
              value={emailTo}
              onChangeText={setEmailTo}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.emailInput}
              placeholder="Subject"
              placeholderTextColor={colors.mid}
              value={emailSubject}
              onChangeText={setEmailSubject}
            />
            <View style={styles.emailPreview}>
              <Text style={styles.emailPreviewText} numberOfLines={6}>
                {emailComposeMessage?.content.slice(0, 300)}
                {(emailComposeMessage?.content.length ?? 0) > 300 ? '...' : ''}
              </Text>
            </View>
            <View style={styles.emailModalActions}>
              <TouchableOpacity
                style={styles.emailCancelButton}
                onPress={() => setEmailComposeMessage(null)}
              >
                <Text style={styles.emailCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.emailSendButton, isSendingEmail && styles.sendButtonDisabled]}
                onPress={handleSendEmail}
                disabled={isSendingEmail}
              >
                {isSendingEmail ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.emailSendText}>
                    {Platform.OS === 'web' ? 'Open in Gmail' : 'Open in Email'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

/** Individual message bubble with optional save-to-action button */
/** Tappable follow-up suggestions under the latest assistant message */
function FollowUpChips({
  followUps,
  hint,
  onPress,
}: {
  followUps: string[];
  hint: string;
  onPress: (text: string) => void;
}) {
  return (
    <View style={styles.followUpRow}>
      {followUps.map((text, i) => (
        <TouchableOpacity
          key={`fu-${i}`}
          style={styles.followUpChip}
          onPress={() => onPress(text)}
          accessibilityRole="button"
          accessibilityLabel={`${hint}: ${text}`}
        >
          <Text style={styles.followUpChipText}>{text}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/**
 * Shown when the AI request fails: the parent still gets something useful —
 * their top pending plan items and a direct line to their Regional Center.
 */
function AIDownFallback({
  actions,
  regionalCenter,
}: {
  actions: Action[];
  regionalCenter: string | null;
}) {
  const pending = actions
    .filter((a) => a.status === 'not_started' || a.status === 'in_progress')
    .slice(0, 3);

  const rc = regionalCenter
    ? RC_DATABASE.find(
        (r) =>
          r.name.toLowerCase() === regionalCenter.toLowerCase() ||
          r.code.toLowerCase() === regionalCenter.toLowerCase()
      ) ?? null
    : null;

  if (pending.length === 0 && !rc) return null;

  return (
    <View style={styles.fallbackCard}>
      <Text style={styles.fallbackTitle}>While I reconnect, you can still make progress:</Text>
      {pending.map((a) => (
        <View key={a.id} style={styles.fallbackItem}>
          <Ionicons name="ellipse-outline" size={12} color={colors.teal} />
          <Text style={styles.fallbackItemText} numberOfLines={2}>{a.title}</Text>
        </View>
      ))}
      {rc && (
        <TouchableOpacity
          style={styles.fallbackCall}
          onPress={() => Linking.openURL(`tel:${rc.phone.replace(/[^\d+]/g, '')}`)}
          accessibilityRole="button"
          accessibilityLabel={`Call ${rc.name} at ${rc.phone}`}
        >
          <Ionicons name="call-outline" size={14} color={colors.teal} />
          <Text style={styles.fallbackCallText}>
            Call {rc.name}: {rc.phone}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function MessageBubble({
  message,
  onSaveAction,
  onEmailThis,
  isSaving,
  onSaveStep,
  onSaveAllSteps,
  onOpenDraft,
  savingStepKeys,
  savedStepKeys,
  onFeedback,
  feedback,
}: {
  message: UIMessage;
  onSaveAction?: (msg: UIMessage) => void;
  onEmailThis?: (msg: UIMessage) => void;
  isSaving?: boolean;
  onSaveStep?: (msg: UIMessage, step: ChatStep) => void;
  onSaveAllSteps?: (msg: UIMessage, steps: ChatStep[]) => void;
  onOpenDraft?: (draftKey: string) => void;
  savingStepKeys?: Set<string>;
  savedStepKeys?: Set<string>;
  onFeedback?: (msg: UIMessage, rating: 'up' | 'down') => void;
  feedback?: 'up' | 'down';
}) {
  const isUser = message.role === 'user';
  const showSaveButton = !isUser && !message.isStreaming && message.content.length > 0;
  const showSources = !isUser && !message.isStreaming && message.content.length > 0;
  const showCards = !isUser && !message.isStreaming && hasRichMeta(message.meta);

  // Scope the global "messageId|action" step-save keys to this message
  const scopeKeys = (keys?: Set<string>): Set<string> => {
    const prefix = `${message.id}|`;
    const scoped = new Set<string>();
    keys?.forEach((k) => {
      if (k.startsWith(prefix)) scoped.add(k.slice(prefix.length));
    });
    return scoped;
  };

  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      {!isUser && (
        <View style={styles.avatarSmall}>
          <Text style={styles.avatarSmallText}>🧭</Text>
        </View>
      )}
      <View style={styles.bubbleWrapper}>
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAssistant,
          ]}
        >
          {isUser ? (
            <Text style={[styles.bubbleText, styles.bubbleTextUser]}>
              {message.content}
            </Text>
          ) : (
            <>
              <RichText
                text={
                  message.isStreaming
                    ? hideStreamingTrailer(message.content)
                    : message.content
                }
                style={[styles.bubbleText, styles.bubbleTextAssistant]}
              />
              {message.isStreaming && (
                <Text style={[styles.bubbleText, styles.cursor]}>▊</Text>
              )}
            </>
          )}
        </View>
        {showCards && message.meta && (
          <ChatMetaCards
            meta={message.meta}
            onSaveStep={onSaveStep ? (step) => onSaveStep(message, step) : undefined}
            onSaveAllSteps={onSaveAllSteps ? (steps) => onSaveAllSteps(message, steps) : undefined}
            onOpenDraft={onOpenDraft}
            savingSteps={scopeKeys(savingStepKeys)}
            savedSteps={scopeKeys(savedStepKeys)}
          />
        )}
        {showSources && <SourceAttribution sources={message.sources} />}
        {showSaveButton && onSaveAction && (
          <TouchableOpacity
            style={styles.saveActionButton}
            onPress={() => onSaveAction(message)}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel="Save this response as an action plan item"
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.teal} />
            ) : (
              <Text style={styles.saveActionText}>Save as Action</Text>
            )}
          </TouchableOpacity>
        )}
        {showSaveButton && onEmailThis && (
          <TouchableOpacity
            style={styles.emailThisButton}
            onPress={() => onEmailThis(message)}
            accessibilityRole="button"
            accessibilityLabel="Email this response"
          >
            <Text style={styles.emailThisText}>Email This</Text>
          </TouchableOpacity>
        )}
        {showSaveButton && onFeedback && (
          <View style={styles.feedbackRow}>
            <Text style={styles.feedbackLabel}>
              {feedback ? 'Thanks for the feedback' : 'Was this helpful?'}
            </Text>
            <TouchableOpacity
              style={[styles.feedbackBtn, feedback === 'up' && styles.feedbackBtnActive]}
              onPress={() => onFeedback(message, 'up')}
              disabled={!!feedback}
              accessibilityRole="button"
              accessibilityLabel="This answer was helpful"
            >
              <Ionicons
                name={feedback === 'up' ? 'thumbs-up' : 'thumbs-up-outline'}
                size={14}
                color={feedback === 'up' ? colors.teal : colors.mid}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.feedbackBtn, feedback === 'down' && styles.feedbackBtnActive]}
              onPress={() => onFeedback(message, 'down')}
              disabled={!!feedback}
              accessibilityRole="button"
              accessibilityLabel="This answer was not helpful"
            >
              <Ionicons
                name={feedback === 'down' ? 'thumbs-down' : 'thumbs-down-outline'}
                size={14}
                color={feedback === 'down' ? '#DC2626' : colors.mid}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

/** Friendly display names for KB source keys (raw keys read as "Journey Id") */
const SOURCE_LABELS: Record<string, string> = {
  regional_center: 'Regional Center',
  iep: 'IEP / School',
  benefits: 'Benefits',
  insurance: 'Insurance',
  rights: 'Your Rights',
  navigation: 'Navigation',
  transitions: 'Transitions',
  journey_autism: 'Autism Journey',
  journey_pda: 'PDA Journey',
  journey_adhd: 'ADHD Journey',
  journey_sli: 'Speech & Language Journey',
  journey_sld: 'Learning Disability Journey',
  journey_id: 'Intellectual Disability Journey',
  cross_reference: 'Cross-System Guide',
  age_timeline: 'Age Timeline',
  equity: 'Equity & Access',
  resources: 'Help Directory',
};

function sourceLabel(source: string): string {
  return (
    SOURCE_LABELS[source] ??
    source.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/** Source attribution pills below AI responses */
function SourceAttribution({
  sources,
}: {
  sources?: UIMessage['sources'];
}) {
  const [expandedSource, setExpandedSource] = useState<string | null>(null);

  // Dedupe by source key — multiple retrieved chunks from the same KB
  // source were rendering as repeated pills ("Journey Id" twice)
  const uniqueSources = React.useMemo(() => {
    const seen = new Set<string>();
    return (sources ?? []).filter((s) => {
      if (seen.has(s.source)) return false;
      seen.add(s.source);
      return true;
    });
  }, [sources]);

  const hasSources = uniqueSources.length > 0;

  return (
    <View style={styles.sourceContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sourceRow}
      >
        {hasSources ? (
          uniqueSources.map((s) => {
            const label = sourceLabel(s.source);
            return (
              <TouchableOpacity
                key={s.source}
                style={styles.sourcePill}
                onPress={() => setExpandedSource(expandedSource === s.source ? null : s.source)}
                accessibilityRole="button"
                accessibilityLabel={`Source: ${label}`}
              >
                <Text style={styles.sourcePillText}>{label}</Text>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.generalKnowledgePill}>
            <Text style={styles.generalKnowledgeText}>General knowledge</Text>
          </View>
        )}
      </ScrollView>
      {expandedSource && hasSources && (() => {
        const s = uniqueSources.find((u) => u.source === expandedSource);
        if (!s) return null;
        return (
          <View style={styles.sourceExpanded}>
            <Text style={styles.sourceExpandedText}>Source: {sourceLabel(s.source)}</Text>
            {s.section && <Text style={styles.sourceExpandedText}>Section: {s.section}</Text>}
          </View>
        );
      })()}
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
  historyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F7F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historySheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '70%',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historySpinner: {
    paddingVertical: spacing.lg,
  },
  historyEmpty: {
    fontSize: fonts.sizes.sm,
    color: colors.mid,
    paddingVertical: spacing.lg,
    textAlign: 'center',
  },
  historyList: {
    marginTop: spacing.sm,
  },
  historyItem: {
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
    minHeight: 44,
    justifyContent: 'center',
  },
  historyItemActive: {
    backgroundColor: '#E6F7F5',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
  },
  historyItemTitle: {
    fontSize: fonts.sizes.sm,
    color: colors.dark,
    fontWeight: fonts.weights.medium as '500',
  },
  historyItemDate: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    marginTop: 1,
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
  bubbleWrapper: {
    maxWidth: '78%',
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
  followUpRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginLeft: 44,
    marginTop: 2,
    marginBottom: spacing.md,
    paddingRight: spacing.lg,
  },
  followUpChip: {
    backgroundColor: colors.white,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.teal,
  },
  followUpChipText: {
    fontSize: fonts.sizes.sm,
    color: colors.teal,
    fontWeight: fonts.weights.medium,
  },
  disclaimer: {
    fontSize: 10,
    color: colors.mid,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    paddingTop: 2,
  },
  suggestionText: {
    fontSize: fonts.sizes.sm,
    color: colors.teal,
    lineHeight: 18,
  },
  saveActionButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginTop: 4,
    borderRadius: radii.sm,
    backgroundColor: '#E6F7F5',
    borderWidth: 1,
    borderColor: colors.teal,
    minHeight: 24,
    justifyContent: 'center',
  },
  saveActionText: {
    fontSize: 10,
    color: colors.teal,
    fontWeight: fonts.weights.medium as '500',
  },
  sourceContainer: {
    marginTop: 4,
  },
  sourceRow: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 2,
  },
  sourcePill: {
    backgroundColor: colors.light,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  sourcePillText: {
    fontSize: fonts.sizes.xs,
    color: colors.teal,
    fontWeight: fonts.weights.medium as '500',
  },
  generalKnowledgePill: {
    backgroundColor: colors.light,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  generalKnowledgeText: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    fontStyle: 'italic',
  },
  sourceExpanded: {
    backgroundColor: colors.light,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginTop: 4,
  },
  sourceExpandedText: {
    fontSize: fonts.sizes.xs,
    color: colors.dark,
    lineHeight: 16,
  },
  emailThisButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginTop: 4,
    marginLeft: 4,
    borderRadius: radii.sm,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#6366F1',
    minHeight: 24,
    justifyContent: 'center',
  },
  emailThisText: {
    fontSize: 10,
    color: '#6366F1',
    fontWeight: fonts.weights.medium as '500',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  feedbackLabel: {
    fontSize: 10,
    color: colors.mid,
  },
  feedbackBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.light,
  },
  feedbackBtnActive: {
    backgroundColor: '#E6F7F5',
  },
  fallbackCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  fallbackTitle: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.navy,
    marginBottom: 6,
  },
  fallbackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
  },
  fallbackItemText: {
    flex: 1,
    fontSize: fonts.sizes.xs,
    color: colors.dark,
  },
  fallbackCall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  fallbackCallText: {
    fontSize: fonts.sizes.xs,
    color: colors.teal,
    fontWeight: fonts.weights.medium as '500',
  },
  emailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  emailModalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  emailModalTitle: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
    marginBottom: spacing.md,
  },
  emailInput: {
    backgroundColor: colors.light,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
    fontSize: fonts.sizes.sm,
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  emailPreview: {
    backgroundColor: colors.light,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    maxHeight: 120,
  },
  emailPreviewText: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    lineHeight: 16,
  },
  emailModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  emailCancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emailCancelText: {
    fontSize: fonts.sizes.sm,
    color: colors.mid,
  },
  emailSendButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderRadius: radii.md,
    backgroundColor: '#6366F1',
  },
  emailSendText: {
    fontSize: fonts.sizes.sm,
    color: colors.white,
    fontWeight: fonts.weights.medium as '500',
  },
});
