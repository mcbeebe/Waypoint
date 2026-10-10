/**
 * Reply composer for a synced Gmail thread (owner feedback, Aug 27):
 * Waypoint reads the thread, proposes the response, the parent edits and
 * sends — in-thread, no copy-paste. The draft is always editable before
 * anything is sent; nothing goes out without an explicit tap.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import type { Communication } from '@/hooks/useCommunications';
import { formatThreadForDraft } from '@/lib/replyInbox';
import { draftGmailReply, gmailSend } from '@/lib/gmail';
import { analyzeEmail, type EmailAnalysis } from '@/lib/letters';
import { TONE_OPTIONS, type DraftTone } from '@/lib/lettersCatalog';
import { addCc, MAX_CC } from '@/lib/letterAddress';
import { replyAllCc } from '@/lib/replyCc';
import { colors, semantic, fonts, spacing, radii } from '@/lib/theme';

const SEVERITY_COLOR: Record<'high' | 'medium' | 'low', string> = {
  high: semantic.danger,
  medium: semantic.warning,
  low: colors.mid,
};

/** "Lilia Talavera <lilia@rceb.org>" → "lilia@rceb.org" */
function emailOf(contact: string | null): string {
  if (!contact) return '';
  const m = contact.match(/<([^>]+@[^>]+)>/);
  return (m ? m[1] : contact.includes('@') ? contact : '').trim();
}

interface GmailReplyModalProps {
  visible: boolean;
  /** The thread's paper-trail entries, oldest first. */
  thread: Communication[];
  childName?: string | null;
  parentName?: string | null;
  onClose: () => void;
  /** Called after a successful send so the caller can refetch. */
  onSent: () => void;
}

export default function GmailReplyModal({
  visible,
  thread,
  childName,
  parentName,
  onClose,
  onSent,
}: GmailReplyModalProps) {
  const [guidance, setGuidance] = useState('');
  const [draft, setDraft] = useState('');
  const [toOverride, setToOverride] = useState('');
  const [tone, setTone] = useState<DraftTone>('professional');
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Waypoint's read of the incoming message — runs once per reply.
  const [analysis, setAnalysis] = useState<EmailAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzedId, setAnalyzedId] = useState<string | null>(null);

  const threadText = useMemo(() => formatThreadForDraft(thread), [thread]);
  const lastIncoming = [...thread].reverse().find((c) => c.direction === 'incoming');
  const anchor = thread.find((c) => c.gmail_thread_id) ?? null;
  const parsedTo = emailOf(lastIncoming?.contact ?? null);
  const to = (toOverride.trim() || parsedTo).trim();

  // Reply all (014 PR B): start with everyone else who was on the email
  // being answered. Set once per opening — the parent's edits are theirs.
  const [cc, setCc] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState('');
  const [ccError, setCcError] = useState<string | null>(null);
  const [ccSeed, setCcSeed] = useState<{ fromThread: boolean; leftOff: number }>({ fromThread: false, leftOff: 0 });
  const seedKey = visible ? `${anchor?.id ?? ''}|${lastIncoming?.id ?? ''}` : '';
  useEffect(() => {
    if (!seedKey) return;
    const seed = replyAllCc(thread, parsedTo);
    setCc(seed.cc);
    setCcSeed({ fromThread: seed.fromThread, leftOff: seed.leftOff });
    setCcInput('');
    setCcError(null);
    // Seeded from the thread as it was when the sheet opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);
  // Never copy the addressee, even after the To line was typed over.
  const ccList = cc.filter((e) => e.toLowerCase() !== to.toLowerCase());
  const ccPending = ccInput.trim().length > 0;
  const addToCc = () => {
    const result = addCc(ccList, ccInput, to || null);
    if (!result.added) {
      setCcError(
        result.reason === 'invalid'
          ? 'That doesn’t look like one email address.'
          : result.reason === 'duplicate'
            ? 'They’re already on this email.'
            : `You can copy up to ${MAX_CC} people.`
      );
      return;
    }
    setCc(result.list);
    setCcInput('');
    setCcError(null);
  };

  // Auto-run the Email Analyzer on the incoming message (owner decision #4):
  // red flags and deadlines surface before the parent even reads it.
  useEffect(() => {
    if (!visible || !lastIncoming?.body || lastIncoming.id === analyzedId) return;
    setAnalyzedId(lastIncoming.id);
    setAnalysis(null);
    setAnalyzing(true);
    analyzeEmail(lastIncoming.body).then((result) => {
      setAnalyzing(false);
      if (result.analysis) setAnalysis(result.analysis);
    });
  }, [visible, lastIncoming, analyzedId]);

  const generate = async () => {
    setDrafting(true);
    setError(null);
    const result = await draftGmailReply({
      thread: threadText,
      instructions: guidance.trim() || undefined,
      childName: childName ?? undefined,
      senderName: parentName ?? undefined,
      tone,
    });
    setDrafting(false);
    if (result.ok && result.reply) setDraft(result.reply);
    else setError(result.error ?? "Couldn't draft the reply — please try again.");
  };

  const send = async () => {
    if (!draft.trim() || !anchor || sending) return;
    // A typed address the parent never added must not be silently dropped.
    if (ccPending) {
      setCcError('Tap Add to copy that address, or clear it — it isn’t on the email yet.');
      return;
    }
    setSending(true);
    setError(null);
    const result = await gmailSend({
      to,
      cc: ccList,
      subject: '',
      body: draft.trim(),
      replyToCommunicationId: anchor.id,
    });
    setSending(false);
    if (result.ok) {
      setDraft('');
      setGuidance('');
      onSent();
      onClose();
    } else {
      setError(result.error ?? "Couldn't send — please try again.");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.title}>Reply in this thread</Text>
          <Text style={styles.meta}>
            To: {to || '(no reply address found — add one below)'}
          </Text>
          <View style={styles.ccRow} testID="reply-cc">
            <Text style={styles.meta}>Cc:</Text>
            {ccList.length === 0 && <Text style={styles.meta}>No one</Text>}
            {ccList.map((email) => (
              <View key={email} style={styles.ccChip}>
                <Text style={styles.ccChipText}>{email}</Text>
                <Pressable
                  onPress={() => setCc(cc.filter((e) => e !== email))}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${email} from Cc`}
                  hitSlop={8}
                >
                  <Text style={styles.ccChipX}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
          {ccSeed.fromThread && (
            <Text style={styles.ccNote}>
              Kept from the thread, like Reply all. Tap ✕ to leave someone off.
              {ccSeed.leftOff > 0
                ? ` ${ccSeed.leftOff} more ${ccSeed.leftOff === 1 ? 'person was' : 'people were'} on the thread — a reply can copy up to ${MAX_CC}.`
                : ''}
            </Text>
          )}
          <View style={styles.ccAddRow}>
            <TextInput
              style={[styles.input, styles.ccInput]}
              placeholder="Copy someone — type an email"
              placeholderTextColor={colors.mid}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={ccInput}
              onChangeText={(v) => {
                setCcInput(v);
                setCcError(null);
              }}
              onSubmitEditing={addToCc}
              accessibilityLabel="Cc email address"
            />
            <Pressable
              style={[styles.ccAddBtn, !ccPending && styles.dim]}
              disabled={!ccPending}
              onPress={addToCc}
              accessibilityRole="button"
              accessibilityLabel="Add to Cc"
            >
              <Text style={styles.ccAddText}>Add</Text>
            </Pressable>
          </View>
          {ccError && <Text style={styles.error}>{ccError}</Text>}

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            {analyzing && (
              <View style={styles.readBox}>
                <ActivityIndicator size="small" color={colors.teal} />
                <Text style={styles.readLoading}>Waypoint's AI is reading their reply…</Text>
              </View>
            )}
            {analysis && (
              <View style={styles.readBox}>
                <Text style={styles.readLabel}>HOW WAYPOINT'S AI READ IT</Text>
                <Text style={styles.readSummary}>{analysis.summary}</Text>
                {analysis.red_flags.map((f, i) => (
                  <Text key={`f${i}`} style={styles.readItem}>
                    <Text style={{ color: SEVERITY_COLOR[f.severity], fontWeight: fonts.weights.bold }}>
                      ⚑ {f.severity.toUpperCase()}
                    </Text>{' '}
                    {f.flag}
                    {f.law_cited ? ` (${f.law_cited})` : ''}
                  </Text>
                ))}
                {analysis.action_items.map((a, i) => (
                  <Text key={`a${i}`} style={styles.readItem}>
                    ▸ {a.action}
                    {a.deadline ? ` — ${a.deadline}` : ''}
                  </Text>
                ))}
              </View>
            )}

            <View style={styles.toneRow}>
              {TONE_OPTIONS.map((t) => (
                <Pressable
                  key={t.key}
                  style={[styles.tonePill, tone === t.key && styles.tonePillActive]}
                  onPress={() => setTone(t.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`Reply tone: ${t.label}`}
                  accessibilityState={{ selected: tone === t.key }}
                >
                  <Text style={[styles.tonePillText, tone === t.key && styles.tonePillTextActive]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {!parsedTo && (
              <TextInput
                style={styles.input}
                placeholder="Recipient email"
                placeholderTextColor={colors.mid}
                autoCapitalize="none"
                keyboardType="email-address"
                value={toOverride}
                onChangeText={setToOverride}
              />
            )}
            <TextInput
              style={styles.input}
              placeholder="Anything Waypoint should know for this reply? (optional)"
              placeholderTextColor={colors.mid}
              value={guidance}
              onChangeText={setGuidance}
              multiline
            />
            <Pressable
              style={({ pressed }) => [styles.draftBtn, (pressed || drafting) && styles.dim]}
              disabled={drafting}
              onPress={generate}
              accessibilityRole="button"
              accessibilityLabel="Draft the reply with AI"
            >
              {drafting ? (
                <ActivityIndicator size="small" color={colors.teal} />
              ) : (
                <Text style={styles.draftBtnText}>
                  ✨ {draft ? 'Redraft with AI' : 'Draft the reply with AI'}
                </Text>
              )}
            </Pressable>
            <TextInput
              style={[styles.input, styles.draftInput]}
              placeholder="Your reply — draft it with AI above, or write it yourself"
              placeholderTextColor={colors.mid}
              value={draft}
              onChangeText={setDraft}
              multiline
            />
            {error && <Text style={styles.error}>{error}</Text>}
          </ScrollView>

          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              (!draft.trim() || !to || sending) && styles.sendBtnDisabled,
              pressed && styles.dim,
            ]}
            disabled={!draft.trim() || !to || sending}
            onPress={send}
            accessibilityRole="button"
            accessibilityLabel="Send the reply with Gmail"
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.sendBtnText}>Send with Gmail →</Text>
            )}
          </Pressable>
          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.base,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  title: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.extrabold, color: colors.navy },
  meta: { fontSize: fonts.sizes.sm, color: colors.mid },
  scroll: { flexGrow: 0 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.light,
    padding: spacing.md,
    fontSize: fonts.sizes.md,
    color: colors.dark,
    marginTop: spacing.sm,
  },
  draftInput: { minHeight: 180, textAlignVertical: 'top' },
  draftBtn: {
    marginTop: spacing.sm,
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftBtnText: { color: colors.teal, fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold },
  sendBtn: {
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.border },
  sendBtnText: { color: colors.white, fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold },
  cancel: { minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.mid, fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold },
  error: { color: '#DC2626', fontSize: fonts.sizes.sm, marginTop: spacing.sm },
  dim: { opacity: 0.6 },
  ccRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  ccChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.light,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    minHeight: 28,
  },
  ccChipText: { fontSize: fonts.sizes.sm, color: colors.dark },
  ccChipX: { fontSize: fonts.sizes.sm, color: colors.mid, fontWeight: fonts.weights.bold },
  ccNote: { fontSize: fonts.sizes.xs, color: colors.mid },
  ccAddRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ccInput: { flex: 1, marginTop: 0, paddingVertical: spacing.sm },
  ccAddBtn: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    justifyContent: 'center',
  },
  ccAddText: { color: colors.white, fontWeight: fonts.weights.bold, fontSize: fonts.sizes.sm },
  readBox: {
    marginTop: spacing.sm,
    backgroundColor: semantic.infoBg,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  readLabel: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.extrabold,
    letterSpacing: 1,
    color: semantic.info,
  },
  readLoading: { fontSize: fonts.sizes.sm, color: colors.mid },
  readSummary: { fontSize: fonts.sizes.md, color: colors.dark, lineHeight: 20 },
  readItem: { fontSize: fonts.sizes.sm, color: colors.dark, lineHeight: 19 },
  toneRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  tonePill: {
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    minHeight: 34,
    justifyContent: 'center',
  },
  tonePillActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  tonePillText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold, color: colors.dark },
  tonePillTextActive: { color: colors.white },
});
