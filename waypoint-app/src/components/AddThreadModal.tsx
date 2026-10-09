/**
 * "Add an email thread" (initiative 014, PR D): bring a thread the family
 * already has in Gmail — sent from Gmail directly, or started by the agency —
 * into the paper trail, so its replies reach Home.
 *
 * Find → pick → confirm. A pasted Gmail link opens the thread when it is the
 * older kind; today's links cannot be read by any app, so the sheet says so
 * and offers search instead of failing quietly (Roadmap/mockups/reply-followups).
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import type { CommunicationOrg } from '@/hooks/useCommunications';
import { ORG_OPTIONS, ORG_LABELS } from '@/components/AddEntryModal';
import {
  gmailFindThreads,
  gmailImportThread,
  type GmailThreadCandidate,
} from '@/lib/gmail';
import { addThreadSteps } from '@/lib/addThreadSteps';
import { colors, semantic, fonts, spacing, radii } from '@/lib/theme';

interface AddThreadModalProps {
  visible: boolean;
  onClose: () => void;
  /** Gmail is connected with the scopes reading needs. */
  gmailConnected: boolean;
  onConnectGmail: () => void;
  /** Requests the thread can be filed under (live ones). */
  requests: { id: string; title: string }[];
  /** Opened from a case: the thread is filed under that request. */
  presetRequestId?: string | null;
  /** After a thread was added; `imported` rows were written. */
  onAdded: (imported: number) => void;
}

const OPAQUE_COPY = {
  gmail_token:
    'Gmail doesn’t let other apps open this kind of link, so Waypoint can’t read it. Type a few words from the email instead — who it’s from or the subject — and pick it from the list.',
  not_gmail:
    'That isn’t a Gmail link, so Waypoint can’t open it. Type a few words from the email instead — who it’s from or the subject.',
} as const;

function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** The add-a-thread sheet. */
export default function AddThreadModal({
  visible,
  onClose,
  gmailConnected,
  onConnectGmail,
  requests,
  presetRequestId,
  onAdded,
}: AddThreadModalProps) {
  const [input, setInput] = useState('');
  const [finding, setFinding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<GmailThreadCandidate[] | null>(null);
  const [picked, setPicked] = useState<GmailThreadCandidate | null>(null);
  const [org, setOrg] = useState<CommunicationOrg | null>(null);
  const [requestId, setRequestId] = useState<string | null>(presetRequestId ?? null);
  const [adding, setAdding] = useState(false);

  // Each opening starts clean; a case's request is preselected.
  useEffect(() => {
    if (!visible) return;
    setInput('');
    setError(null);
    setCandidates(null);
    setPicked(null);
    setOrg(null);
    setRequestId(presetRequestId ?? null);
  }, [visible, presetRequestId]);

  const find = async () => {
    if (!input.trim() || finding) return;
    setFinding(true);
    setError(null);
    setCandidates(null);
    const result = await gmailFindThreads(input);
    setFinding(false);
    if (result.ok) {
      setCandidates(result.candidates);
      // A link that named exactly one thread goes straight to confirm.
      if (result.candidates.length === 1 && !result.candidates[0].alreadyTracked && /^https?:|^mail\./i.test(input.trim())) {
        setPicked(result.candidates[0]);
      }
      return;
    }
    setError(result.error === 'opaque_link' && 'reason' in result ? OPAQUE_COPY[result.reason] : result.error);
  };

  const add = async () => {
    if (!picked || !org || adding) return;
    setAdding(true);
    const result = await gmailImportThread({ threadId: picked.threadId, organization: org, requestId });
    setAdding(false);
    if (result.ok) {
      onAdded(result.imported);
      onClose();
    } else {
      setError(result.error);
    }
  };

  const steps =
    picked && org
      ? addThreadSteps({
          messageCount: picked.messageCount,
          orgLabel: ORG_LABELS[org],
          lastFrom: picked.lastFrom,
          lastFromFamily: picked.lastFromFamily,
          lastAt: picked.lastAt,
          now: new Date(),
        })
      : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            {!gmailConnected ? (
              <>
                <Text style={styles.title}>Add an email thread</Text>
                <Text style={styles.body}>
                  Connect Gmail to add threads. Waypoint only reads the threads you add, and the replies to them.
                </Text>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={onConnectGmail}
                  accessibilityRole="button"
                  accessibilityLabel="Connect Gmail"
                >
                  <Text style={styles.primaryBtnText}>Connect Gmail</Text>
                </TouchableOpacity>
              </>
            ) : picked ? (
              <>
                <Text style={styles.title}>Add this thread?</Text>
                <Text style={styles.threadSubject}>{picked.subject}</Text>
                <Text style={styles.meta}>
                  {picked.messageCount} message{picked.messageCount === 1 ? '' : 's'} · last {shortDate(picked.lastAt)}
                </Text>

                <Text style={styles.fieldLabel}>Who is this with?</Text>
                <View style={styles.pillRow}>
                  {ORG_OPTIONS.map((o) => (
                    <TouchableOpacity
                      key={o.value}
                      style={[styles.pill, org === o.value && styles.pillActive]}
                      onPress={() => setOrg(o.value)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: org === o.value }}
                      accessibilityLabel={`This thread is with ${o.label}`}
                    >
                      <Text style={[styles.pillText, org === o.value && styles.pillTextActive]}>{o.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {requests.length > 0 && (
                  <>
                    <Text style={styles.fieldLabel}>Part of a request? (optional)</Text>
                    <View style={styles.pillRow}>
                      {[{ id: '', title: 'No' }, ...requests].map((r) => {
                        const active = (requestId ?? '') === r.id;
                        return (
                          <TouchableOpacity
                            key={r.id || 'none'}
                            style={[styles.pill, active && styles.pillActive]}
                            onPress={() => setRequestId(r.id || null)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                            accessibilityLabel={r.id ? `File under ${r.title}` : 'Not part of a request'}
                          >
                            <Text style={[styles.pillText, active && styles.pillTextActive]}>{r.title}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                {steps ? (
                  <View style={styles.stepsBox} testID="add-thread-steps">
                    <Text style={styles.stepsKicker}>WHEN YOU PRESS ADD</Text>
                    {steps.map((s, i) => (
                      <Text key={i} style={styles.step}>{`${i + 1}. ${s}`}</Text>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.hint}>Pick who it’s with to see exactly what Add does.</Text>
                )}

                {error ? <Text style={styles.error}>{error}</Text> : null}
                <TouchableOpacity
                  style={[styles.primaryBtn, (!org || adding) && styles.disabled]}
                  onPress={add}
                  disabled={!org || adding}
                  accessibilityRole="button"
                  accessibilityLabel="Add this thread to your paper trail"
                >
                  <Text style={styles.primaryBtnText}>{adding ? 'Adding…' : 'Add to Paper Trail'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.linkBtn}
                  onPress={() => {
                    setPicked(null);
                    setError(null);
                  }}
                  accessibilityRole="button"
                >
                  <Text style={styles.linkText}>← Pick a different email</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.title}>Add an email thread</Text>
                <Text style={styles.body}>
                  Paste a Gmail link, or type words from the email — who it’s from or the subject.
                </Text>
                <View style={styles.findRow}>
                  <TextInput
                    style={styles.input}
                    value={input}
                    onChangeText={setInput}
                    onSubmitEditing={find}
                    placeholder="e.g. Ana Rivera, or IPP meeting"
                    placeholderTextColor={colors.mid}
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel="Gmail link or words from the email"
                  />
                  <TouchableOpacity
                    style={[styles.findBtn, (!input.trim() || finding) && styles.disabled]}
                    onPress={find}
                    disabled={!input.trim() || finding}
                    accessibilityRole="button"
                    accessibilityLabel="Find in Gmail"
                  >
                    <Text style={styles.primaryBtnText}>Find</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.meta}>Searches your connected Gmail only. Nothing is added until you pick one.</Text>

                {finding && <ActivityIndicator style={{ marginTop: spacing.md }} color={colors.teal} />}
                {error ? <Text style={styles.notice}>{error}</Text> : null}

                {candidates && candidates.length === 0 && (
                  <Text style={styles.notice}>No matching emails in your Gmail. Try other words — a name, or a word from the subject.</Text>
                )}
                {candidates && candidates.length > 0 && (
                  <>
                    <Text style={styles.fieldLabel}>
                      {candidates.length} match{candidates.length === 1 ? '' : 'es'} in your Gmail
                    </Text>
                    {candidates.map((c) => (
                      <TouchableOpacity
                        key={c.threadId}
                        style={[styles.candidate, c.alreadyTracked && styles.candidateTracked]}
                        onPress={() => {
                          setPicked(c);
                          setError(null);
                        }}
                        disabled={c.alreadyTracked}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: c.alreadyTracked }}
                        accessibilityLabel={
                          c.alreadyTracked
                            ? `${c.subject} — already in your Paper Trail`
                            : `Add ${c.subject}, ${c.messageCount} messages`
                        }
                      >
                        <Text style={styles.threadSubject}>{c.subject}</Text>
                        <Text style={styles.meta}>
                          {c.alreadyTracked
                            ? 'Already in your Paper Trail'
                            : `${c.participants.join(', ')} · ${c.messageCount} message${c.messageCount === 1 ? '' : 's'} · last ${shortDate(c.lastAt)}`}
                        </Text>
                        {!c.alreadyTracked && c.snippet ? (
                          <Text style={styles.snippet} numberOfLines={2}>{`“${c.snippet}”`}</Text>
                        ) : null}
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </>
            )}
            <TouchableOpacity style={styles.linkBtn} onPress={onClose} accessibilityRole="button">
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '88%',
  },
  title: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold as '700', color: colors.navy, marginBottom: spacing.sm },
  body: { fontSize: fonts.sizes.sm, color: colors.dark, lineHeight: 20 },
  meta: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 4 },
  hint: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: spacing.md },
  notice: {
    fontSize: fonts.sizes.sm,
    color: colors.dark,
    backgroundColor: semantic.warningBg,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.md,
    lineHeight: 20,
  },
  error: { fontSize: fonts.sizes.sm, color: semantic.danger, marginTop: spacing.md },
  fieldLabel: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.mid,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: 4,
  },
  findRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.light,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
    fontSize: fonts.sizes.sm,
    color: colors.dark,
  },
  findBtn: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  candidate: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  candidateTracked: { opacity: 0.6 },
  threadSubject: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  snippet: { fontSize: fonts.sizes.xs, color: colors.dark, marginTop: 4 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    backgroundColor: colors.light,
    minHeight: 30,
    justifyContent: 'center',
  },
  pillActive: { backgroundColor: colors.teal },
  pillText: { fontSize: fonts.sizes.xs, color: colors.dark, fontWeight: fonts.weights.medium as '500' },
  pillTextActive: { color: colors.white },
  stepsBox: {
    borderWidth: 1.5,
    borderColor: colors.teal,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  stepsKicker: { fontSize: 11, fontWeight: fonts.weights.bold as '700', color: colors.teal, letterSpacing: 0.8 },
  step: { fontSize: fonts.sizes.sm, color: colors.dark, lineHeight: 20, marginTop: 6 },
  primaryBtn: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.base,
    alignItems: 'center',
    marginTop: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  primaryBtnText: { fontSize: fonts.sizes.sm, color: colors.white, fontWeight: fonts.weights.semibold as '600' },
  disabled: { opacity: 0.5 },
  linkBtn: { alignSelf: 'center', marginTop: spacing.sm, paddingVertical: 6, minHeight: 24 },
  linkText: { fontSize: fonts.sizes.sm, color: colors.teal, fontWeight: fonts.weights.semibold as '600' },
  cancelText: { fontSize: fonts.sizes.sm, color: colors.mid },
});
