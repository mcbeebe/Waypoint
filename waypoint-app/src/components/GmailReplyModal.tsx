/**
 * Reply composer for a synced Gmail thread (owner feedback, Aug 27):
 * Waypoint reads the thread, proposes the response, the parent edits and
 * sends — in-thread, no copy-paste. The draft is always editable before
 * anything is sent; nothing goes out without an explicit tap.
 */
import React, { useMemo, useState } from 'react';
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
import { draftGmailReply, gmailSend } from '@/lib/gmail';
import { colors, fonts, spacing, radii } from '@/lib/theme';

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
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const threadText = useMemo(
    () =>
      thread
        .map(
          (c) =>
            `--- ${c.direction === 'incoming' ? `FROM ${c.contact ?? 'the agency'}` : 'FROM the parent'} · ${(c.sent_at ?? c.occurred_at).slice(0, 10)} ---\n${c.subject}\n\n${c.body ?? ''}`
        )
        .join('\n\n'),
    [thread]
  );
  const lastIncoming = [...thread].reverse().find((c) => c.direction === 'incoming');
  const anchor = thread.find((c) => c.gmail_thread_id) ?? null;
  const parsedTo = emailOf(lastIncoming?.contact ?? null);
  const to = (toOverride.trim() || parsedTo).trim();

  const generate = async () => {
    setDrafting(true);
    setError(null);
    const result = await draftGmailReply({
      thread: threadText,
      instructions: guidance.trim() || undefined,
      childName: childName ?? undefined,
      senderName: parentName ?? undefined,
    });
    setDrafting(false);
    if (result.ok && result.reply) setDraft(result.reply);
    else setError(result.error ?? "Couldn't draft the reply — please try again.");
  };

  const send = async () => {
    if (!draft.trim() || !anchor || sending) return;
    setSending(true);
    setError(null);
    const result = await gmailSend({
      to,
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

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
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
              accessibilityLabel="Draft the reply with Waypoint"
            >
              {drafting ? (
                <ActivityIndicator size="small" color={colors.teal} />
              ) : (
                <Text style={styles.draftBtnText}>
                  ✨ {draft ? 'Redraft with Waypoint' : 'Draft the reply with Waypoint'}
                </Text>
              )}
            </Pressable>
            <TextInput
              style={[styles.input, styles.draftInput]}
              placeholder="Your reply — draft with Waypoint above, or write it yourself"
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
});
