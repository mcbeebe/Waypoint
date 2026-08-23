/**
 * Letters screen — Phase 3 Communication Suite.
 * 12-template letter/email generator ported from the GAS MVP:
 * pick a template → pick a tone → say what you need → get an editable,
 * copy-paste-sendable draft with the family's real details filled in.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useFamily, useChildren } from '@/hooks/useFamily';
import { useToast } from '@/components/Toast';
import AIConsentModal from '@/components/AIConsentModal';
import Button from '@/components/Button';
import {
  LETTER_TEMPLATES,
  TONE_OPTIONS,
  generateLetter,
  type DraftTone,
  type LetterTemplate,
} from '@/lib/letters';
import { fillKnownBlanks, analyzeBlanks, type LetterProfile } from '@/lib/draftBlanks';
import { composeTarget, LONG_BODY_CHARS } from '@/lib/emailCompose';
import { extractSubject, buildSubject, pickRecipient } from '@/lib/letterAddress';
import { useContacts } from '@/hooks/useContacts';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useI18n } from '@/i18n';
import { trackDraftUsed } from '@/lib/analytics';
import { logCommunication, markCommunicationSent } from '@/hooks/useCommunications';
import type { CommunicationOrg } from '@/hooks/useCommunications';
import { useRequests } from '@/hooks/useRequests';
import { sentNextFor } from '@/lib/sentNext';
import type { SentNext } from '@/lib/sentNext';
import { deadlineFor } from '@/lib/requestClocks';
import type { RequestDeadline } from '@/lib/requestClocks';
import { useRoute, type RouteProp } from '@react-navigation/native';
import type { HomeStackParamList } from '@/types/navigation';
import { colors, fonts, spacing, radii } from '@/lib/theme';

export default function LettersScreen() {
  const { family, updateFamily } = useFamily();
  const { children } = useChildren(family?.id);
  const { contacts } = useContacts(family?.id);
  const { showToast } = useToast();
  const { locale } = useI18n();
  const route = useRoute<RouteProp<HomeStackParamList, 'Letters'>>();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const hasAIConsent = !!family?.ai_consent_at;

  /** Everything the app already knows that letters routinely ask for */
  const primaryChild = children.find((c) => c.is_primary) ?? children[0];
  const letterProfile: LetterProfile = React.useMemo(() => ({
    parentFirstName: family?.parent_first_name,
    parentLastName: family?.parent_last_name,
    email: family?.email,
    phone: family?.phone,
    childFirstName: primaryChild?.first_name,
    childGrade: primaryChild?.grade,
    schoolName: primaryChild?.school_name,
    schoolDistrict: family?.school_district,
    regionalCenter: family?.regional_center,
    insurance: family?.insurance_carrier,
  }), [family, primaryChild]);

  const [template, setTemplate] = useState<LetterTemplate | null>(null);
  const [chatGuidance, setChatGuidance] = useState<string | null>(null);

  // Chat → Letters handoff: the Navigator's "draft this letter" card passes
  // the template key (and the specific ask) so the parent lands one tap from
  // generating. Unknown keys fall back to the General template rather than
  // silently doing nothing.
  useEffect(() => {
    const key = route.params?.template;
    if (!key) return;
    const match =
      LETTER_TEMPLATES.find((t) => t.key === key) ??
      LETTER_TEMPLATES.find((t) => t.key === 'general');
    if (match) {
      setTemplate(match);
      setDraft(null);
    }
    if (route.params?.question) {
      setQuestion(route.params.question);
    } else if (match?.defaultRequest) {
      // A lever tap shouldn't land on a blank box: seed the template's
      // standard ask so the parent edits instead of composing from scratch.
      setQuestion(match.defaultRequest);
    }
    // The Navigator conversation's substance rides along so the draft
    // reflects what was actually discussed
    setChatGuidance(route.params?.guidance ?? null);
  }, [route.params?.template, route.params?.question, route.params?.guidance]);

  // Reopened from the paper trail: drop the saved text straight into the
  // editor so an unsent draft can be picked back up
  useEffect(() => {
    const saved = route.params?.draftBody;
    if (!saved) return;
    setDraft(saved);
    loggedDraftRef.current = saved; // already in the log — don't duplicate it
  }, [route.params?.draftBody]);
  const [tone, setTone] = useState<DraftTone>('professional');
  const [question, setQuestion] = useState('');
  const [draft, setDraft] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showConsent, setShowConsent] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!template) return;
    if (!hasAIConsent) {
      setShowConsent(true);
      return;
    }
    if (!question.trim() && template.key !== 'iep_prep') {
      showToast('Tell us what you need first — a sentence or two is plenty.', 'error');
      return;
    }
    setGenerating(true);
    const result = await generateLetter({
      draftType: template.key,
      tone,
      question: question.trim(),
      guidance: chatGuidance ?? undefined,
      language: locale !== 'en' ? locale : undefined,
    });
    setGenerating(false);
    if (result.error === 'consent_required') {
      setShowConsent(true);
      return;
    }
    if (!result.draft) {
      showToast(result.error ?? 'Could not generate the draft — please try again.', 'error');
      return;
    }
    // Safety net: if the model bracketed something the profile already
    // knows, fill it in rather than making the parent type it again.
    const { text, filled } = fillKnownBlanks(result.draft, letterProfile);
    setDraft(text);
    if (filled.length > 0) {
      showToast(`Filled in from your profile: ${filled.join(', ').toLowerCase()}`, 'success');
    }
    if (family?.id) {
      // Anonymous usage analytics (fire-and-forget)
      trackDraftUsed(family.id, template.key, family.regional_center ?? undefined);
    }
  }, [template, tone, question, chatGuidance, hasAIConsent, locale, showToast, family, letterProfile]);

  /** Which system this letter targets — paper trail + recipient lookup */
  const ORG_BY_TEMPLATE: Partial<Record<string, CommunicationOrg>> = {
    appeal_letter: 'insurance', ihss_appeal: 'other',
    rc_request: 'regional_center', dds_4731_complaint: 'regional_center',
    iep_email: 'school', iep_prep: 'school', assessment_request: 'school',
    records_request: 'school', pwn_request: 'school', cde_complaint: 'school',
    complaint: 'other', general: 'other',
  };

  // Each draft is saved to the paper trail once, as a DRAFT — writing a
  // letter isn't the same as sending it, and the log shouldn't pretend
  // otherwise until the parent says so.
  const loggedDraftRef = React.useRef<string | null>(null);
  const savedIdRef = React.useRef<string | null>(null);
  // Filled from `outgoing` below so the log shows the real subject line
  const outgoingSubjectRef = React.useRef<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [markedSent, setMarkedSent] = useState(false);

  const saveDraftOnce = useCallback(async (): Promise<string | null> => {
    if (!draft || !template || !family?.id) return null;
    if (loggedDraftRef.current === draft) return savedIdRef.current;
    loggedDraftRef.current = draft;
    const id = await logCommunication(family.id, {
      kind: 'letter',
      subject: outgoingSubjectRef.current ?? template.title,
      body: draft,
      template_key: template.key,
      organization: ORG_BY_TEMPLATE[template.key] ?? 'other',
      contact: outgoingContactRef.current ?? undefined,
      status: 'draft',
    });
    savedIdRef.current = id;
    setSavedId(id);
    setMarkedSent(false);
    return id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, template, family?.id]);

  // The sent moment (owner feedback): a send deserves a congratulation,
  // the next step, and honest expectations — plus automatic clock tracking.
  const { requests, createRequest } = useRequests(family?.id);
  const [sentMoment, setSentMoment] = useState<{
    next: SentNext;
    deadline: RequestDeadline | null;
    tracked: boolean;
  } | null>(null);

  /** The parent confirms it actually went out. */
  const handleMarkSent = useCallback(async () => {
    const id = savedIdRef.current ?? (await saveDraftOnce());
    if (!id) {
      showToast("Couldn't update the paper trail — please try again.", 'error');
      return;
    }
    const ok = await markCommunicationSent(id);
    setMarkedSent(ok);
    if (!ok) {
      showToast("Couldn't mark it sent.", 'error');
      return;
    }
    const next = template ? sentNextFor(template.key, primaryChild?.first_name) : null;
    if (!next) {
      showToast('Marked as sent — saved to your paper trail', 'success');
      return;
    }
    // Open the tracked request (once): the Request Tracker owns the clock
    // from here. An existing live row of the same title is not duplicated.
    let tracked = false;
    if (next.track) {
      const already = requests.some(
        (r) =>
          r.title === next.track!.title &&
          (r.status === 'requested' || r.status === 'in_progress')
      );
      if (already) {
        tracked = true;
      } else {
        const created = await createRequest({
          request_type: next.track.requestType,
          title: next.track.title,
          requested_on: new Date().toISOString().slice(0, 10),
          child_id: primaryChild?.id ?? null,
          channel: 'email',
          notes: 'Sent via Waypoint Letters',
        });
        tracked = !!created;
      }
    }
    const deadline = next.track
      ? deadlineFor(next.track.requestType, new Date().toISOString().slice(0, 10))
      : null;
    setSentMoment({ next, deadline, tracked });
  }, [saveDraftOnce, showToast, template, primaryChild?.first_name, primaryChild?.id, requests, createRequest]);

  const handleCopy = useCallback(async () => {
    if (!draft) return;
    await Clipboard.setStringAsync(draft);
    await saveDraftOnce();
    showToast('Draft copied — saved to your paper trail.', 'success');
  }, [draft, showToast, saveDraftOnce]);

  /**
   * Where "send this" goes depends on the device: desktop browsers get
   * Gmail's compose window, but phones get a mailto: link — Gmail's web
   * compose URL is hijacked on mobile by a "Gmail is better on the app"
   * interstitial that throws the draft away.
   */
  const outgoingContactRef = React.useRef<string | null>(null);
  const composeEnv = {
    platformOS: Platform.OS,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    maxTouchPoints: typeof navigator !== 'undefined' ? navigator.maxTouchPoints : undefined,
  };
  /**
   * Address the draft before handing it to the mail app: the letter names
   * its own subject and greets its recipient by name, and Key Contacts
   * knows the address — no reason to make the parent supply any of it.
   */
  const outgoing = React.useMemo(() => {
    if (!draft || !template) return null;
    const { subject: draftSubject, body } = extractSubject(draft);
    const subject = buildSubject({
      draftSubject,
      templateTitle: template.title,
      childFirstName: primaryChild?.first_name,
      familyLastName: family?.parent_last_name,
    });
    const recipient = pickRecipient(draft, contacts, ORG_BY_TEMPLATE[template.key]);
    outgoingSubjectRef.current = subject;
    outgoingContactRef.current = recipient.contact?.name ?? null;
    return { subject, body, recipient };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, template, contacts, primaryChild?.first_name, family?.parent_last_name]);

  const target = outgoing
    ? composeTarget(
        {
          to: outgoing.recipient.to[0],
          subject: outgoing.subject,
          body: outgoing.body,
        },
        composeEnv
      )
    : null;

  const handleSend = useCallback(async () => {
    if (!draft || !target) return;
    await saveDraftOnce();
    // Long drafts can get truncated by a mail app's URL handling — put the
    // full text on the clipboard first so nothing is ever lost.
    const long = draft.length > LONG_BODY_CHARS;
    if (long) await Clipboard.setStringAsync(draft);
    try {
      await Linking.openURL(target.url);
      if (long) {
        showToast('Draft copied too — paste it if your email app cut it short.', 'info');
      }
    } catch {
      await Clipboard.setStringAsync(draft);
      showToast('Could not open your email app — the draft is copied, paste it there.', 'error');
    }
  }, [draft, target, showToast, saveDraftOnce]);

  const reset = () => {
    loggedDraftRef.current = null;
    savedIdRef.current = null;
    setSavedId(null);
    setMarkedSent(false);
    setSentMoment(null);
    setDraft(null);
    setTemplate(null);
    setQuestion('');
    setChatGuidance(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <AIConsentModal
        visible={showConsent}
        onAccept={async () => {
          setShowConsent(false);
          await updateFamily({ ai_consent_at: new Date().toISOString() });
        }}
        onDecline={() => setShowConsent(false)}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {!template ? (
          <>
            <Text style={styles.intro}>
              Pick what you need to send. Waypoint drafts it with your family's details and the
              right legal backing — you review, edit, and send.
            </Text>
            {LETTER_TEMPLATES.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={styles.templateCard}
                onPress={() => {
                  setTemplate(t);
                  if (t.defaultRequest) setQuestion((q) => q.trim() ? q : t.defaultRequest!);
                }}
                accessibilityRole="button"
                accessibilityLabel={t.title}
              >
                <Text style={styles.templateEmoji}>{t.emoji}</Text>
                <View style={styles.templateBody}>
                  <Text style={styles.templateTitle}>{t.title}</Text>
                  <Text style={styles.templateDesc}>{t.description}</Text>
                  <Text style={styles.templateAudience}>To: {t.audience}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        ) : !draft ? (
          <>
            <TouchableOpacity onPress={reset} accessibilityRole="button">
              <Text style={styles.backLink}>‹ All letter types</Text>
            </TouchableOpacity>
            <Text style={styles.stepTitle}>
              {template.emoji} {template.title}
            </Text>
            <Text style={styles.templateDesc}>{template.description}</Text>
            {chatGuidance && (
              <View style={styles.guidanceChip}>
                <Text style={styles.guidanceChipText}>
                  ✓ Using the context from your AI chat — the draft will reflect what you discussed.
                </Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>How should it sound?</Text>
            {TONE_OPTIONS.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[styles.toneRow, tone === t.key && styles.toneRowActive]}
                onPress={() => setTone(t.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: tone === t.key }}
              >
                <Text style={[styles.toneLabel, tone === t.key && styles.toneLabelActive]}>
                  {t.label}
                </Text>
                <Text style={styles.toneHint}>{t.hint}</Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.fieldLabel}>
              {template.key === 'iep_prep'
                ? 'Anything specific to prepare for? (optional)'
                : 'What do you need? A sentence or two is plenty.'}
            </Text>
            <TextInput
              style={styles.questionInput}
              value={question}
              onChangeText={setQuestion}
              placeholder={
                template.key === 'appeal_letter'
                  ? 'e.g., Blue Shield denied 20 hrs/week of ABA, says not medically necessary'
                  : 'e.g., The school has ignored my two emails asking for a speech assessment'
              }
              placeholderTextColor={colors.mid}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Button
              title={generating ? 'Drafting…' : 'Generate Draft'}
              onPress={handleGenerate}
              variant="primary"
              loading={generating}
              disabled={generating}
            />
            {generating && (
              <Text style={styles.generatingHint}>
                Writing your {template.title.toLowerCase()} — usually 10–20 seconds…
              </Text>
            )}
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => setDraft(null)} accessibilityRole="button">
              <Text style={styles.backLink}>‹ Change tone or details</Text>
            </TouchableOpacity>
            <Text style={styles.stepTitle}>Your draft — edit anything, then send</Text>
            {(() => {
              // Blanks left after the profile fill: show what's still needed,
              // and separate "we could remember this for you" from the ones
              // only the parent can answer (dates, times, specifics).
              const { remaining, fixableInProfile } = analyzeBlanks(draft, letterProfile);
              if (remaining.length === 0) {
                return (
                  <View style={styles.blanksDone}>
                    <Text style={styles.blanksDoneText}>✅ No blanks left — ready to send</Text>
                  </View>
                );
              }
              return (
                <View style={styles.blanksCard}>
                  <Text style={styles.blanksTitle}>
                    Fill in {remaining.length} blank{remaining.length === 1 ? '' : 's'} before sending:
                  </Text>
                  <View style={styles.blanksRow}>
                    {remaining.slice(0, 8).map((b) => (
                      <View key={b} style={styles.blankChip}>
                        <Text style={styles.blankChipText}>{b}</Text>
                      </View>
                    ))}
                    {remaining.length > 8 && (
                      <Text style={styles.blanksMore}>+{remaining.length - 8} more</Text>
                    )}
                  </View>
                  <Text style={styles.blanksHint}>
                    Edit them right here in the draft, or in your email app before you send.
                    {fixableInProfile.length > 0
                      ? ` ${fixableInProfile.length} of these (${fixableInProfile
                          .map((f) => f.label.toLowerCase())
                          .join(', ')}) can live in your profile — save them once and every future
                          draft fills itself in.`
                      : ''}
                  </Text>
                  {fixableInProfile.length > 0 && (
                    <TouchableOpacity
                      style={styles.blanksProfileButton}
                      onPress={() => (navigation as never as { navigate: (n: string) => void }).navigate('Profile')}
                      accessibilityRole="button"
                      accessibilityLabel="Save these details in your profile"
                    >
                      <Text style={styles.blanksProfileButtonText}>
                        Save these in my profile →
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })()}
            <TextInput
              style={styles.draftBox}
              value={draft}
              onChangeText={setDraft}
              multiline
              textAlignVertical="top"
            />
            {outgoing && (
              <View style={styles.addressBox}>
                <Text style={styles.addressLine} numberOfLines={2}>
                  <Text style={styles.addressLabel}>To: </Text>
                  {outgoing.recipient.contact
                    ? `${outgoing.recipient.contact.name} (${outgoing.recipient.contact.email})`
                    : 'no saved contact matched — add the address in your email app'}
                </Text>
                <Text style={styles.addressLine} numberOfLines={2}>
                  <Text style={styles.addressLabel}>Subject: </Text>
                  {outgoing.subject}
                </Text>
                {!outgoing.recipient.contact && (
                  <TouchableOpacity
                    onPress={() => (navigation as never as { navigate: (n: string) => void }).navigate('Profile')}
                    accessibilityRole="button"
                    accessibilityLabel="Save this recipient in Key Contacts"
                  >
                    <Text style={styles.addressHint}>
                      Save them in Profile → Key Contacts and Waypoint will address the next one →
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={styles.actionRow}>
              <Button title="Copy" onPress={handleCopy} variant="primary" />
              <Button title={target?.label ?? 'Open in Mail app'} onPress={handleSend} variant="outline" />
            </View>
            {/* Saving a draft and confirming it went out are different acts —
                the paper trail should reflect which one happened */}
            <View style={styles.trackBox}>
              {markedSent && sentMoment ? (
                <View style={styles.sentMoment}>
                  <Text style={styles.sentCelebration}>🎉 {sentMoment.next.celebration}</Text>
                  <Text style={styles.sentDid}>{sentMoment.next.did}</Text>
                  {sentMoment.deadline && (
                    <View style={styles.sentClockChip}>
                      <Text style={styles.sentClockText}>
                        ⏱ Their deadline: {sentMoment.deadline.dueOn} ({sentMoment.deadline.daysRemaining} days) · {sentMoment.deadline.citation}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.sentSection}>WHAT HAPPENS NOW</Text>
                  {sentMoment.next.expectations.map((e, i) => (
                    <View key={i} style={styles.sentBulletRow}>
                      <Text style={styles.sentBulletNum}>{i + 1}.</Text>
                      <Text style={styles.sentBulletText}>{e}</Text>
                    </View>
                  ))}
                  {sentMoment.tracked && (
                    <TouchableOpacity
                      style={styles.sentTrackButton}
                      onPress={() =>
                        (navigation as never as { navigate: (n: string) => void }).navigate('RequestTracker')
                      }
                      accessibilityRole="button"
                      accessibilityLabel="See this request in your tracker"
                    >
                      <Text style={styles.sentTrackButtonText}>
                        ✓ Waypoint is tracking this — see it in Requests →
                      </Text>
                    </TouchableOpacity>
                  )}
                  <Text style={styles.sentFollowUp}>
                    Hear nothing in {sentMoment.next.followUpDays} days? Come back — the follow-up letter is one tap.
                  </Text>
                </View>
              ) : markedSent ? (
                <Text style={styles.trackSent}>
                  ✅ Marked as sent — it's in your paper trail
                </Text>
              ) : (
                <>
                  <Text style={styles.trackText}>
                    {savedId
                      ? 'Saved as a draft in your paper trail. Did it go out?'
                      : 'Save this draft to come back to it later.'}
                  </Text>
                  <View style={styles.trackButtons}>
                    {!savedId && (
                      <TouchableOpacity
                        style={styles.trackSaveButton}
                        onPress={async () => {
                          const id = await saveDraftOnce();
                          showToast(
                            id ? 'Draft saved to your paper trail' : "Couldn't save — please try again.",
                            id ? 'success' : 'error'
                          );
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Save this draft"
                      >
                        <Text style={styles.trackSaveText}>💾 Save draft</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.trackSentButton}
                      onPress={handleMarkSent}
                      accessibilityRole="button"
                      accessibilityLabel="Mark this letter as sent"
                    >
                      <Text style={styles.trackSentButtonText}>✓ Mark as sent</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              <TouchableOpacity
                onPress={() => (navigation as never as { navigate: (n: string) => void }).navigate('CommunicationLog')}
                accessibilityRole="button"
                accessibilityLabel="Open your paper trail"
              >
                <Text style={styles.trackLink}>View paper trail →</Text>
              </TouchableOpacity>
            </View>

            <Button title="Start a new letter" onPress={reset} variant="outline" />
            <Text style={styles.disclaimer}>
              Review before sending: fill in any [BRACKETED] blanks and double-check dates and
              names. Waypoint drafts are a starting point, not legal advice.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  intro: {
    fontSize: fonts.sizes.base,
    color: colors.mid,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  templateCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    alignItems: 'center',
  },
  templateEmoji: { fontSize: 28 },
  templateBody: { flex: 1, gap: 2 },
  templateTitle: {
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
  },
  templateDesc: { fontSize: fonts.sizes.sm, color: colors.mid, lineHeight: 18 },
  templateAudience: { fontSize: fonts.sizes.xs, color: colors.teal, fontWeight: '600' },
  backLink: {
    fontSize: fonts.sizes.base,
    color: colors.teal,
    fontWeight: '600',
    paddingVertical: spacing.xs,
  },
  stepTitle: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
  },
  fieldLabel: {
    fontSize: fonts.sizes.sm,
    fontWeight: '600',
    color: colors.dark,
    marginTop: spacing.sm,
  },
  toneRow: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  toneRowActive: { borderColor: colors.teal, backgroundColor: '#E0F2FE' },
  toneLabel: { fontSize: fonts.sizes.base, fontWeight: '600', color: colors.dark },
  toneLabelActive: { color: colors.teal },
  toneHint: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 2 },
  questionInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: fonts.sizes.base,
    color: colors.dark,
    minHeight: 96,
  },
  generatingHint: {
    fontSize: fonts.sizes.sm,
    color: colors.mid,
    textAlign: 'center',
  },
  guidanceChip: {
    backgroundColor: '#DCFCE7',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  guidanceChipText: {
    fontSize: fonts.sizes.xs,
    color: '#15803D',
    fontWeight: fonts.weights.medium as '500',
  },
  blanksCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  blanksTitle: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.semibold as '600',
    color: '#B45309',
    marginBottom: 4,
  },
  blanksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },
  blankChip: {
    backgroundColor: colors.white,
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  blankChipText: {
    fontSize: fonts.sizes.xs,
    color: '#B45309',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  blanksMore: {
    fontSize: fonts.sizes.xs,
    color: '#B45309',
  },
  blanksHint: {
    fontSize: fonts.sizes.xs,
    color: '#92400E',
    lineHeight: 16,
    marginTop: 6,
  },
  blanksProfileButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#B45309',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    minHeight: 36,
    justifyContent: 'center',
  },
  blanksProfileButtonText: {
    fontSize: fonts.sizes.xs,
    color: '#B45309',
    fontWeight: fonts.weights.semibold as '600',
  },
  blanksDone: {
    backgroundColor: '#DCFCE7',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  blanksDoneText: {
    fontSize: fonts.sizes.xs,
    color: '#15803D',
    fontWeight: fonts.weights.medium as '500',
  },
  draftBox: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: fonts.sizes.base,
    color: colors.dark,
    minHeight: 320,
    lineHeight: 21,
  },
  addressBox: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: 2,
  },
  addressLine: { fontSize: fonts.sizes.xs, color: colors.dark, lineHeight: 17 },
  addressLabel: { color: colors.mid, fontWeight: fonts.weights.semibold as '600' },
  addressHint: {
    fontSize: fonts.sizes.xs,
    color: colors.teal,
    fontWeight: fonts.weights.medium as '500',
    marginTop: 4,
  },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  sentMoment: { gap: spacing.sm },
  sentCelebration: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.extrabold,
    color: colors.navy,
    lineHeight: 24,
  },
  sentDid: { fontSize: fonts.sizes.md, color: colors.dark, lineHeight: 20 },
  sentClockChip: {
    backgroundColor: '#FDF3E3',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  sentClockText: { color: '#92600A', fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold },
  sentSection: {
    marginTop: spacing.xs,
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.bold,
    letterSpacing: 1,
    color: colors.mid,
  },
  sentBulletRow: { flexDirection: 'row', gap: spacing.sm },
  sentBulletNum: { fontWeight: fonts.weights.extrabold, color: colors.teal, fontSize: fonts.sizes.sm },
  sentBulletText: { flex: 1, fontSize: fonts.sizes.sm, color: colors.dark, lineHeight: 19 },
  sentTrackButton: {
    marginTop: spacing.xs,
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  sentTrackButtonText: { color: colors.white, fontWeight: fonts.weights.bold, fontSize: fonts.sizes.sm },
  sentFollowUp: { fontSize: fonts.sizes.sm, color: colors.mid, lineHeight: 18 },
  trackBox: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  trackText: { fontSize: fonts.sizes.sm, color: colors.dark, lineHeight: 19 },
  trackSent: {
    fontSize: fonts.sizes.sm,
    color: '#047857',
    fontWeight: fonts.weights.semibold as '600',
  },
  trackButtons: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  trackSaveButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    minHeight: 38,
    justifyContent: 'center',
  },
  trackSaveText: { fontSize: fonts.sizes.sm, color: colors.dark },
  trackSentButton: {
    backgroundColor: '#D1FAE5',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    minHeight: 38,
    justifyContent: 'center',
  },
  trackSentButtonText: {
    fontSize: fonts.sizes.sm,
    color: '#047857',
    fontWeight: fonts.weights.semibold as '600',
  },
  trackLink: { fontSize: fonts.sizes.xs, color: colors.teal, fontWeight: fonts.weights.medium as '500' },
  disclaimer: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
