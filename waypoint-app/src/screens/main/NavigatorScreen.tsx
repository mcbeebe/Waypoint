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
  Image,
} from 'react-native';
import { pickChatImages, thumbUri, MAX_CHAT_IMAGES } from '@/lib/chatImages';
import type { ChatImage } from '@/lib/chatImages';
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
import { useContacts } from '@/hooks/useContacts';
import AIConsentModal from '@/components/AIConsentModal';
import ChatMetaCards from '@/components/ChatMetaCards';
import RichText, { stripInlineMarkdown } from '@/components/RichText';
import { hideStreamingTrailer, hasRichMeta, type ChatStep } from '@/lib/followups';
import { composeTarget } from '@/lib/emailCompose';
import { deriveActionTitle } from '@/lib/actionContent';
import { useI18n } from '@/i18n';
import LearnPanel from '@/components/LearnPanel';
import { toFunnelLocale } from '@/lib/eligibility';
import type { FunnelLocale } from '@/lib/eligibility';
import type { ChatContext, ToneLevel, ActionCategory, Action } from '@/types/database';
import { colors, brand, fonts, spacing, radii } from '@/lib/theme';

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

export default function NavigatorScreen() {
  const { family, updateFamily } = useFamily();
  const { children } = useChildren(family?.id);
  const primaryChild = children.find((c) => c.is_primary) || children[0];
  const { diagnoses: childDiagnoses } = useDiagnoses(primaryChild?.id);

  // AI consent gate (Wave 1.4): affirmative consent before anything is sent
  const hasAIConsent = !!family?.ai_consent_at;
  const [showConsent, setShowConsent] = useState(false);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<ChatImage[]>([]);
  const [attachments, setAttachments] = useState<ChatImage[]>([]);
  const [picking, setPicking] = useState(false);

  const acceptConsent = async () => {
    setShowConsent(false);
    const saved = await updateFamily({ ai_consent_at: new Date().toISOString() });
    if (!saved) {
      setPendingText(null);
      showToast("Couldn't save your consent — please try again in a moment.", 'error');
      return;
    }
    if (pendingText || pendingImages.length > 0) {
      const text = pendingText ?? '';
      const imgs = pendingImages;
      setPendingText(null);
      setPendingImages([]);
      sendMessage(text, imgs.length > 0 ? imgs : undefined);
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
  const { contacts } = useContacts(family?.id);
  const emailableContacts = contacts.filter((c) => c.email);
  const { showToast } = useToast();
  const { t, locale } = useI18n();
  const funnelLocale: FunnelLocale = toFunnelLocale(locale);

  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<NavigatorStackParamList, 'NavigatorMain'>>();
  const [inputText, setInputText] = useState('');

  // Proactive prompt handoff (P3): a "Waypoint noticed" card passes its
  // question here; send it once, gated by consent like any other message.
  useEffect(() => {
    const ask = route.params?.ask;
    // While a message is streaming, HOLD the seed rather than dropping it —
    // isLoading is a dep, so this re-fires and sends once the stream finishes.
    // (Without it, a seed arriving mid-stream was lost with no error.)
    if (!ask || isLoading) return;
    navigation.setParams({ ask: undefined });
    if (!hasAIConsent) {
      setPendingText(ask);
      setShowConsent(true);
      return;
    }
    sendMessage(ask);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.ask, isLoading]);
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
      // A title has to read as a TASK weeks later in a list — taking the
      // reply's first line produced items like "Yes — for most Regional
      // Center families, this is one of the highest-value moves…"
      const plainContent = stripInlineMarkdown(message.content);
      const title = deriveActionTitle({
        content: plainContent,
        steps: message.meta?.steps,
      });

      const action = await createAction({
        title,
        // Full answer — the old 500-char cap cut advice off mid-sentence
        description: plainContent,
        source: 'ai_navigator',
        source_message_id: asMessageUuid(message.id),
        chat_session_id: sessionId ?? undefined,
        // Honour what the answer itself said it was about, like step saves do
        category: META_CATEGORY_TO_ACTION[message.meta?.category ?? ''] ?? 'general',
        priority: message.meta?.urgency === 'high' ? 'high' : 'medium',
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
  const handleOpenDraft = useCallback((draftKey: string, offerText?: string, message?: UIMessage) => {
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

    // Carry the conversation's substance into the draft: the answer's prose
    // plus its key cards, so the letter reflects what was actually discussed
    // (attendees by role, deadlines, the specific situation) instead of a
    // generic template fill.
    let guidance: string | undefined;
    if (message) {
      const parts: string[] = [message.content.slice(0, 2200)];
      const meta = message.meta;
      if (meta?.context) parts.push(`Key context: ${meta.context}`);
      if (meta?.rights) parts.push(`Relevant right: ${meta.rights}`);
      if (meta?.watchOut) parts.push(`Watch out: ${meta.watchOut}`);
      if (meta?.steps?.length) {
        parts.push(
          'Recommended steps:\n' +
            meta.steps.map((s, i) => `${i + 1}. ${s.action}${s.who ? ` (${s.who})` : ''}`).join('\n')
        );
      }
      guidance = parts.join('\n\n').slice(0, 3500);
    }

    navigation.navigate('Home', {
      screen: 'Letters',
      params: { template: draftKey, question, guidance },
    });
  }, [navigation]);

  /** Open email compose modal with AI response pre-filled */
  const handleEmailThis = useCallback((message: UIMessage) => {
    setEmailComposeMessage(message);
    setEmailSubject('Waypoint: Disability Services Guidance');
    setEmailTo('');
  }, []);

  /**
   * Hand the drafted email to the user's own mail app. Desktop browsers get
   * Gmail's compose window; phones get mailto: — Gmail's web compose URL is
   * intercepted on mobile by an app-install interstitial that discards the
   * draft. No Gmail API scope needed either way: the user hits send.
   */
  const handleSendEmail = useCallback(async () => {
    if (!emailComposeMessage) return;
    setIsSendingEmail(true);
    try {
      const bodyText = stripInlineMarkdown(emailComposeMessage.content);
      const { url } = composeTarget(
        { to: emailTo.trim() || undefined, subject: emailSubject, body: bodyText },
        {
          platformOS: Platform.OS,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          maxTouchPoints: typeof navigator !== 'undefined' ? navigator.maxTouchPoints : undefined,
        }
      );
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
    if (!inputText.trim() && attachments.length === 0) return;
    if (!hasAIConsent) {
      setPendingText(inputText.trim());
      setPendingImages(attachments);
      setShowConsent(true);
      setInputText('');
      setAttachments([]);
      return;
    }
    sendMessage(inputText.trim(), attachments.length > 0 ? attachments : undefined);
    setInputText('');
    setAttachments([]);
  };

  const handleAttach = async () => {
    if (picking || isLoading) return;
    setPicking(true);
    try {
      const { images, skipped } = await pickChatImages(attachments.length);
      if (images.length > 0) setAttachments((prev) => [...prev, ...images]);
      if (skipped > 0) {
        showToast(
          `${skipped} image${skipped === 1 ? '' : 's'} skipped — up to ${MAX_CHAT_IMAGES} photos, ~4 MB each.`,
          'error'
        );
      }
    } catch {
      showToast("Couldn't open your photos — please try again.", 'error');
    } finally {
      setPicking(false);
    }
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
            <Ionicons name="time-outline" size={18} color={brand.pine} />
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
          <WelcomeView
            onFill={setInputText}
            onSend={handleSuggestion}
            locale={funnelLocale}
            query={inputText}
          />
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

        {/* Attached photos (pending send) */}
        {attachments.length > 0 && (
          <ScrollView
            horizontal
            style={styles.attachStrip}
            contentContainerStyle={styles.attachStripContent}
            showsHorizontalScrollIndicator={false}
          >
            {attachments.map((img, i) => (
              <View key={`${img.name}-${i}`} style={styles.attachThumbWrap}>
                <Image source={{ uri: thumbUri(img) }} style={styles.attachThumb} />
                <TouchableOpacity
                  style={styles.attachRemove}
                  onPress={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${img.name}`}
                >
                  <Text style={styles.attachRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={handleAttach}
            disabled={picking || isLoading}
            accessibilityRole="button"
            accessibilityLabel="Attach photos"
            accessibilityHint="Add photos of documents to ask about"
          >
            {picking ? (
              <ActivityIndicator size="small" color={brand.inkFaint} />
            ) : (
              <Ionicons name="camera-outline" size={22} color={brand.inkFaint} />
            )}
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={
              attachments.length > 0
                ? 'Ask about these photos...'
                : "Ask about your child's services..."
            }
            placeholderTextColor={brand.inkFaint}
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
            style={[
              styles.sendButton,
              ((!inputText.trim() && attachments.length === 0) || isLoading) &&
                styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={(!inputText.trim() && attachments.length === 0) || isLoading}
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
                <Ionicons name="close" size={22} color={brand.inkFaint} />
              </TouchableOpacity>
            </View>
            {historyLoading ? (
              <ActivityIndicator size="small" color={brand.pine} style={styles.historySpinner} />
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
              placeholderTextColor={brand.inkFaint}
              value={emailTo}
              onChangeText={setEmailTo}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {emailableContacts.length > 0 && (
              <View style={styles.contactChipRow}>
                {emailableContacts.slice(0, 4).map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.contactChip, emailTo === c.email && styles.contactChipActive]}
                    onPress={() => setEmailTo(c.email!)}
                    accessibilityRole="button"
                    accessibilityLabel={`Send to ${c.name}`}
                  >
                    <Text
                      style={[
                        styles.contactChipText,
                        emailTo === c.email && styles.contactChipTextActive,
                      ]}
                    >
                      {c.name}{c.role ? ` · ${c.role}` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TextInput
              style={styles.emailInput}
              placeholder="Subject"
              placeholderTextColor={brand.inkFaint}
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
/**
 * Ask, before anything has been asked: the greeting, then the Learn library
 * (Home rebuild phase 5). A parent who is looking rather than typing gets the
 * guides, the articles and the glossary here — and once they start typing,
 * the library answers first if it already knows.
 */
function WelcomeView({
  onFill,
  onSend,
  locale,
  query,
}: {
  /** Puts a question in the composer so the library can answer it first. */
  onFill: (text: string) => void;
  /** Sends it to the AI. */
  onSend: (text: string) => void;
  locale: FunnelLocale;
  query: string;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.welcomeScroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeEmoji}>🧭</Text>
        <Text style={styles.welcomeTitle}>Hi! I'm your AI Navigator.</Text>
        <Text style={styles.welcomeSubtitle}>
          I can help you understand your rights, navigate Regional Centers, prepare for IEP
          meetings, and take concrete next steps for your child.
        </Text>
      </View>
      <LearnPanel locale={locale} query={query} onAsk={onFill} onAskAI={onSend} />
    </ScrollView>
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
          <Ionicons name="ellipse-outline" size={12} color={brand.pine} />
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
          <Ionicons name="call-outline" size={14} color={brand.pine} />
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
  onOpenDraft?: (draftKey: string, offerText?: string, msg?: UIMessage) => void;
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
            <>
              {message.images && message.images.length > 0 && (
                <View style={styles.bubbleImageRow}>
                  {message.images.map((uri, i) => (
                    <Image key={i} source={{ uri }} style={styles.bubbleImage} />
                  ))}
                </View>
              )}
              <Text style={[styles.bubbleText, styles.bubbleTextUser]}>
                {message.content}
              </Text>
            </>
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
            onOpenDraft={
              onOpenDraft ? (key, offer) => onOpenDraft(key, offer, message) : undefined
            }
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
              <ActivityIndicator size="small" color={brand.pine} />
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
                color={feedback === 'up' ? brand.pine : brand.inkFaint}
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
                color={feedback === 'down' ? '#DC2626' : brand.inkFaint}
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
    backgroundColor: brand.paper,
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
    backgroundColor: brand.panel,
    borderBottomWidth: 1,
    borderBottomColor: brand.border,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fonts.sizes.xl,
    fontWeight: fonts.weights.bold as '700',
    color: brand.ink,
  },
  headerSubtitle: {
    fontSize: fonts.sizes.xs,
    color: brand.inkFaint,
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
    backgroundColor: brand.pine,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: brand.pineTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historySheet: {
    backgroundColor: brand.panel,
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
    color: brand.inkFaint,
    paddingVertical: spacing.lg,
    textAlign: 'center',
  },
  historyList: {
    marginTop: spacing.sm,
  },
  historyItem: {
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: brand.paper,
    minHeight: 44,
    justifyContent: 'center',
  },
  historyItemActive: {
    backgroundColor: brand.pineTint,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
  },
  historyItemTitle: {
    fontSize: fonts.sizes.sm,
    color: brand.inkSoft,
    fontWeight: fonts.weights.medium as '500',
  },
  historyItemDate: {
    fontSize: fonts.sizes.xs,
    color: brand.inkFaint,
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
    backgroundColor: brand.panel,
    borderBottomWidth: 1,
    borderBottomColor: brand.border,
    gap: 6,
  },
  toneLabel: {
    fontSize: fonts.sizes.xs,
    color: brand.inkFaint,
    fontWeight: fonts.weights.medium as '500',
    marginRight: 4,
  },
  tonePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: brand.paper,
  },
  tonePillText: {
    fontSize: 11,
    color: brand.inkSoft,
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
    backgroundColor: brand.pineTint,
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
    backgroundColor: brand.pine,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: brand.panel,
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
    color: brand.inkSoft,
  },
  cursor: {
    color: brand.pine,
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
    backgroundColor: brand.panel,
    borderTopWidth: 1,
    borderTopColor: brand.border,
    gap: 8,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.paper,
    borderWidth: 1,
    borderColor: brand.border,
  },
  attachStrip: {
    backgroundColor: brand.panel,
    borderTopWidth: 1,
    borderTopColor: brand.border,
    maxHeight: 76,
  },
  attachStripContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  attachThumbWrap: { position: 'relative' },
  attachThumb: {
    width: 56,
    height: 56,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: brand.border,
  },
  attachRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: radii.full,
    backgroundColor: brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachRemoveText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  bubbleImageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  bubbleImage: {
    width: 96,
    height: 96,
    borderRadius: radii.sm,
    backgroundColor: brand.paper,
  },
  input: {
    flex: 1,
    backgroundColor: brand.paper,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
    fontSize: fonts.sizes.sm,
    color: brand.inkSoft,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: brand.pine,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: brand.border,
  },
  sendIcon: {
    fontSize: 20,
    color: colors.white,
    fontWeight: '700',
  },
  welcomeScroll: { paddingBottom: spacing.lg },
  welcomeContainer: {
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
    color: brand.ink,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  welcomeSubtitle: {
    fontSize: fonts.sizes.sm,
    color: brand.inkFaint,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
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
    backgroundColor: brand.panel,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: brand.pine,
  },
  followUpChipText: {
    fontSize: fonts.sizes.sm,
    color: brand.pine,
    fontWeight: fonts.weights.medium,
  },
  disclaimer: {
    fontSize: 10,
    color: brand.inkFaint,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    paddingTop: 2,
  },
  saveActionButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginTop: 4,
    borderRadius: radii.sm,
    backgroundColor: brand.pineTint,
    borderWidth: 1,
    borderColor: brand.pine,
    minHeight: 24,
    justifyContent: 'center',
  },
  saveActionText: {
    fontSize: 10,
    color: brand.pine,
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
    backgroundColor: brand.paper,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  sourcePillText: {
    fontSize: fonts.sizes.xs,
    color: brand.pine,
    fontWeight: fonts.weights.medium as '500',
  },
  generalKnowledgePill: {
    backgroundColor: brand.paper,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  generalKnowledgeText: {
    fontSize: fonts.sizes.xs,
    color: brand.inkFaint,
    fontStyle: 'italic',
  },
  sourceExpanded: {
    backgroundColor: brand.paper,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginTop: 4,
  },
  sourceExpandedText: {
    fontSize: fonts.sizes.xs,
    color: brand.inkSoft,
    lineHeight: 16,
  },
  emailThisButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginTop: 4,
    marginLeft: 4,
    borderRadius: radii.sm,
    backgroundColor: brand.pineTint,
    borderWidth: 1,
    borderColor: brand.pine,
    minHeight: 24,
    justifyContent: 'center',
  },
  emailThisText: {
    fontSize: 10,
    color: brand.pine,
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
    color: brand.inkFaint,
  },
  feedbackBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: brand.paper,
  },
  feedbackBtnActive: {
    backgroundColor: brand.pineTint,
  },
  fallbackCard: {
    backgroundColor: brand.panel,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  fallbackTitle: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.semibold as '600',
    color: brand.ink,
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
    color: brand.inkSoft,
  },
  fallbackCall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: brand.paper,
  },
  fallbackCallText: {
    fontSize: fonts.sizes.xs,
    color: brand.pine,
    fontWeight: fonts.weights.medium as '500',
  },
  emailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  emailModalContent: {
    backgroundColor: brand.panel,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  emailModalTitle: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold as '700',
    color: brand.ink,
    marginBottom: spacing.md,
  },
  emailInput: {
    backgroundColor: brand.paper,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
    fontSize: fonts.sizes.sm,
    color: brand.inkSoft,
    marginBottom: spacing.sm,
  },
  contactChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.sm,
  },
  contactChip: {
    backgroundColor: brand.paper,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minHeight: 28,
    justifyContent: 'center',
  },
  contactChipActive: {
    backgroundColor: brand.pine,
  },
  contactChipText: {
    fontSize: fonts.sizes.xs,
    color: brand.inkSoft,
  },
  contactChipTextActive: {
    color: colors.white,
  },
  emailPreview: {
    backgroundColor: brand.paper,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    maxHeight: 120,
  },
  emailPreviewText: {
    fontSize: fonts.sizes.xs,
    color: brand.inkFaint,
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
    borderColor: brand.border,
  },
  emailCancelText: {
    fontSize: fonts.sizes.sm,
    color: brand.inkFaint,
  },
  emailSendButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderRadius: radii.md,
    backgroundColor: brand.pine,
  },
  emailSendText: {
    fontSize: fonts.sizes.sm,
    color: colors.white,
    fontWeight: fonts.weights.medium as '500',
  },
});
