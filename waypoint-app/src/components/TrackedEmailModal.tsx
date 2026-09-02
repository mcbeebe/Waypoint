/**
 * The one place an email leaves Waypoint and lands in the paper trail.
 *
 * WHY IT IS SHARED. Two screens send email that is not a Letters template —
 * the Waypoint Navigator ("Email this response") and a plan item ("Email
 * this"). Before this component, the Navigator had its own compose sheet that
 * opened a mail window and, in the same tick, wrote a `communications` row
 * marked `sent`, with no recipient and no Gmail thread id. That row is a
 * fiction: nothing was sent yet, `poll-replies` can never attach a reply to it
 * (it keys off the thread id), and no clock starts. Rather than fix that once
 * and let the action-item send repeat it, both screens now run the same
 * process here — the one LettersScreen has always used:
 *
 *   save the draft  →  send through the connected Gmail account, which marks
 *                      the row sent and stores the thread id
 *                  →  or hand off to the parent's own mail app and mark the
 *                     row sent only when the parent says it went
 *
 * The routing and the copy are in `lib/emailTracking.ts` (pure, tested); this
 * component is the shell around them.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Linking,
  StyleSheet,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '@/components/Toast';
import {
  logCommunication,
  markCommunicationSent,
  type CommunicationOrg,
} from '@/hooks/useCommunications';
import { gmailSend, gmailStatus } from '@/lib/gmail';
import { composeTarget, LONG_BODY_CHARS } from '@/lib/emailCompose';
import {
  planEmailRoute,
  handoffCopy,
  GMAIL_SENT_MESSAGE,
  GMAIL_SENT_NO_THREAD,
  HANDOFF_SENT_MESSAGE,
  TRAIL_FAILED_MESSAGE,
  TRAIL_FAILED_AFTER_SEND,
} from '@/lib/emailTracking';
import { brand, colors, fonts, spacing, radii } from '@/lib/theme';

export interface TrackedEmailContact {
  id: string;
  name: string;
  email: string | null;
  role?: string | null;
  organization?: CommunicationOrg | null;
}

export interface TrackedEmailModalProps {
  visible: boolean;
  /** Null while the family record is still loading — sending is blocked. */
  familyId: string | null | undefined;
  title: string;
  defaultSubject: string;
  body: string;
  contacts?: TrackedEmailContact[];
  childId?: string | null;
  /** Stamped on the paper-trail row so the log can group by source. */
  templateKey?: string;
  /** Optional audience switcher rendered above the preview. */
  audienceControl?: React.ReactNode;
  onClose: () => void;
  /** Fired once the send is real (Gmail send, or a confirmed hand-off). */
  onSent?: (communicationId: string | null) => void;
}

type Phase = 'compose' | 'working' | 'handoff' | 'done';

export default function TrackedEmailModal({
  visible,
  familyId,
  title,
  defaultSubject,
  body,
  contacts = [],
  childId = null,
  templateKey,
  audienceControl,
  onClose,
  onSent,
}: TrackedEmailModalProps) {
  const { showToast } = useToast();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [phase, setPhase] = useState<Phase>('compose');
  const [commId, setCommId] = useState<string | null>(null);
  const [gmailReady, setGmailReady] = useState(false);
  const [openedVia, setOpenedVia] = useState<'gmail' | 'mail'>('mail');
  const [problem, setProblem] = useState<string>('');

  const emailable = useMemo(() => contacts.filter((c) => !!c.email), [contacts]);

  // Reopening the sheet must not inherit the last send's recipient or its
  // "already sent" state — that is how a second email silently attaches
  // itself to the first one's paper-trail row.
  useEffect(() => {
    if (!visible) return;
    setTo('');
    setPhase('compose');
    setCommId(null);
    setProblem('');
  }, [visible]);

  // The subject is generated from whatever the caller is emailing, so it has
  // to follow when the caller switches audience or picks a different action.
  useEffect(() => {
    if (visible) setSubject(defaultSubject);
  }, [visible, defaultSubject]);

  // Direct Gmail send is a web-only path today (the OAuth flow is the web
  // one); everywhere else this stays a hand-off, which is still tracked.
  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    let alive = true;
    gmailStatus()
      .then((s) => { if (alive) setGmailReady(!!s.gmail); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [visible]);

  const matchedContact = useMemo(
    () => emailable.find((c) => c.email?.toLowerCase() === to.trim().toLowerCase()) ?? null,
    [emailable, to]
  );

  /** Save the draft row FIRST, so a send always has something to attach to. */
  const saveDraft = async (): Promise<string | null> => {
    if (!familyId) return null;
    return logCommunication(familyId, {
      kind: 'email',
      subject: subject.trim() || defaultSubject,
      body: body.slice(0, 8000),
      contact: matchedContact?.name ?? to.trim(),
      organization: matchedContact?.organization ?? undefined,
      child_id: childId,
      template_key: templateKey,
      // The honest state: written, not yet out the door.
      status: 'draft',
    });
  };

  const handleSend = async () => {
    // Only ever fires from a fresh compose state. `phase === 'working'` alone
    // was not enough: after a successful Gmail send the sheet stayed on
    // `done`, which fell through to the compose branch with the recipient
    // still filled and Send still live — two taps, two emails, two paper-trail
    // rows for one intended send (adversary finding, Sep 2 2026).
    if (phase !== 'compose') return;
    const plan = planEmailRoute({ gmailReady, to });
    if (!plan.canSend) {
      showToast(plan.blockedReason, 'error');
      return;
    }
    if (!familyId) {
      showToast("We couldn't find your family record — please reload and try again.", 'error');
      return;
    }
    setPhase('working');
    setProblem('');
    try {
      const id = await saveDraft();
      setCommId(id);

      if (plan.route === 'gmail' && id) {
        const result = await gmailSend({
          to: to.trim(),
          subject: subject.trim() || defaultSubject,
          body,
          communicationId: id,
        });
        if (result.ok) {
          // The mail is GONE now. The row flip lives in the edge function,
          // which discards its own update result and returns ok either way —
          // so on a database where 046 was never applied by hand, the parent
          // would be told "saved to your paper trail" about a row still
          // marked draft, and Home would nag them to finish a letter the
          // Regional Center already has. Re-assert it from here (idempotent)
          // and tell the truth when it does not stick.
          const stuck = await markCommunicationSent(id);
          setPhase('done');
          // Reply syncing is a promise only the thread id can keep.
          showToast(
            !stuck ? TRAIL_FAILED_AFTER_SEND : result.threadId ? GMAIL_SENT_MESSAGE : GMAIL_SENT_NO_THREAD,
            stuck ? 'success' : 'error'
          );
          onSent?.(id);
          onClose();
          return;
        }
        // Gmail refused (revoked grant, quota, offline). Do NOT leave the row
        // claiming anything — it stays a draft — and fall through to the
        // hand-off so the parent can still send it themselves.
        setProblem(result.error ?? 'Gmail could not send that — opening your email app instead.');
      }

      const target = composeTarget(
        { to: to.trim(), subject: subject.trim() || defaultSubject, body },
        {
          platformOS: Platform.OS,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          maxTouchPoints: typeof navigator !== 'undefined' ? navigator.maxTouchPoints : undefined,
        }
      );
      // A long body can be truncated by a mail app's URL handling, so put the
      // full text on the clipboard before handing over — nothing is lost.
      const long = body.length > LONG_BODY_CHARS;
      if (long) await Clipboard.setStringAsync(body);
      try {
        await Linking.openURL(target.url);
      } catch {
        await Clipboard.setStringAsync(body);
        showToast("Couldn't open your email app — the draft is copied, paste it there.", 'error');
      }
      setOpenedVia(target.kind);
      setPhase('handoff');
      if (!id) showToast(TRAIL_FAILED_MESSAGE, 'error');
      else if (long) showToast('Draft copied too — paste it if your email app cut it short.', 'info');
    } catch {
      setPhase('compose');
      showToast('Something went wrong opening that email — please try again.', 'error');
    }
  };

  /** The parent confirms the hand-off email actually went out. */
  const handleConfirmSent = async () => {
    if (!commId) {
      showToast(TRAIL_FAILED_MESSAGE, 'error');
      setPhase('done');
      onSent?.(null);
      onClose();
      return;
    }
    const ok = await markCommunicationSent(commId);
    if (!ok) {
      showToast("Couldn't update your paper trail — please try again.", 'error');
      return;
    }
    showToast(HANDOFF_SENT_MESSAGE, 'success');
    setPhase('done');
    onSent?.(commId);
    onClose();
  };

  const copy = handoffCopy(openedVia);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>

          {phase === 'done' ? (
            /* Terminal. The sheet is closing; this only shows if a caller
               keeps it mounted, and it must never be the compose form. */
            <View style={styles.handoffBanner}>
              <Ionicons name="checkmark-circle-outline" size={18} color={brand.pine} />
              <View style={styles.handoffTextCol}>
                <Text style={styles.handoffHeadline}>Sent</Text>
                <Text style={styles.handoffBody}>It is in your paper trail.</Text>
              </View>
            </View>
          ) : phase === 'handoff' ? (
            <View>
              <View style={styles.handoffBanner}>
                <Ionicons name="mail-open-outline" size={18} color={brand.pine} />
                <View style={styles.handoffTextCol}>
                  <Text style={styles.handoffHeadline}>{copy.headline}</Text>
                  <Text style={styles.handoffBody}>{copy.body}</Text>
                </View>
              </View>
              {problem ? <Text style={styles.problem}>{problem}</Text> : null}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel={copy.laterLabel}
                >
                  <Text style={styles.cancelText}>{copy.laterLabel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={handleConfirmSent}
                  accessibilityRole="button"
                  accessibilityLabel={copy.confirmLabel}
                >
                  <Text style={styles.sendText}>{copy.confirmLabel}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Who is this going to? (email address)"
                placeholderTextColor={brand.inkFaint}
                value={to}
                onChangeText={setTo}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Recipient email address"
              />
              {emailable.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  {emailable.slice(0, 6).map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.chip, to === c.email && styles.chipOn]}
                      onPress={() => setTo(c.email!)}
                      accessibilityRole="button"
                      accessibilityLabel={`Send to ${c.name}`}
                    >
                      <Text style={[styles.chipText, to === c.email && styles.chipTextOn]}>
                        {c.name}{c.role ? ` · ${c.role}` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              <TextInput
                style={styles.input}
                placeholder="Subject"
                placeholderTextColor={brand.inkFaint}
                value={subject}
                onChangeText={setSubject}
                accessibilityLabel="Email subject"
              />

              {audienceControl}

              <ScrollView style={styles.preview} contentContainerStyle={styles.previewInner}>
                <Text style={styles.previewText}>{body}</Text>
              </ScrollView>

              <Text style={styles.trailNote}>
                {gmailReady
                  ? 'Sends from your connected Gmail and saves to your paper trail — replies sync back here.'
                  : 'Opens in your email app and saves to your paper trail once you confirm it went.'}
              </Text>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.cancelButton, phase === 'working' && styles.cancelButtonBusy]}
                  onPress={onClose}
                  disabled={phase === 'working'}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: phase === 'working' }}
                  accessibilityLabel="Cancel"
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sendButton, phase === 'working' && styles.sendButtonBusy]}
                  onPress={handleSend}
                  disabled={phase === 'working'}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: phase === 'working' }}
                  accessibilityLabel={gmailReady ? 'Send through Gmail' : 'Open in your email app'}
                >
                  {phase === 'working' ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.sendText}>
                      {gmailReady ? 'Send with Gmail' : 'Open in email'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: brand.panel,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '88%',
  },
  title: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold as '700',
    color: brand.ink,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: brand.paper,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
    fontSize: fonts.sizes.sm,
    color: brand.ink,
    marginBottom: spacing.sm,
  },
  chipRow: { flexDirection: 'row', gap: 6, paddingBottom: spacing.sm },
  chip: {
    backgroundColor: brand.paper,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 30,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: brand.pine },
  chipText: { fontSize: fonts.sizes.xs, color: brand.inkSoft },
  chipTextOn: { color: colors.white },
  preview: {
    backgroundColor: brand.paper,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    maxHeight: 200,
  },
  previewInner: { padding: spacing.md },
  previewText: { fontSize: fonts.sizes.xs, color: brand.inkSoft, lineHeight: 18 },
  trailNote: {
    fontSize: fonts.sizes.xs,
    color: brand.inkFaint,
    lineHeight: 16,
    marginBottom: spacing.md,
  },
  handoffBanner: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: brand.pineTint,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  handoffTextCol: { flex: 1 },
  handoffHeadline: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.bold as '700',
    color: brand.ink,
    marginBottom: 2,
  },
  handoffBody: { fontSize: fonts.sizes.xs, color: brand.inkSoft, lineHeight: 17 },
  problem: {
    fontSize: fonts.sizes.xs,
    color: brand.urgent,
    lineHeight: 16,
    marginBottom: spacing.md,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  cancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelButtonBusy: { opacity: 0.5 },
  cancelText: { fontSize: fonts.sizes.sm, color: brand.inkFaint },
  sendButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderRadius: radii.md,
    backgroundColor: brand.pine,
    minHeight: 44,
    justifyContent: 'center',
  },
  sendButtonBusy: { opacity: 0.7 },
  sendText: {
    fontSize: fonts.sizes.sm,
    color: colors.white,
    fontWeight: fonts.weights.medium as '500',
  },
});
