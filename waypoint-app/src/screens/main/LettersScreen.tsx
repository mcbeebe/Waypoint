/**
 * Letters screen — Phase 3 Communication Suite.
 * 12-template letter/email generator ported from the GAS MVP:
 * pick a template → pick a tone → say what you need → get an editable,
 * copy-paste-sendable draft with the family's real details filled in.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useFamily, useChildren } from '@/hooks/useFamily';
import { gmailStatus, gmailSend } from '@/lib/gmail';
import { useToast } from '@/components/Toast';
import AIConsentModal from '@/components/AIConsentModal';
import GmailSendConfirmModal from '@/components/GmailSendConfirmModal';
import Button from '@/components/Button';
import {
  LETTER_TEMPLATES,
  TONE_OPTIONS,
  generateLetter,
  type DraftTone,
  type LetterTemplate,
} from '@/lib/letters';
import { fillKnownBlanks, analyzeBlanks, sendReadiness, type LetterProfile } from '@/lib/draftBlanks';
import { composeTarget, LONG_BODY_CHARS } from '@/lib/emailCompose';
import { extractSubject, buildSubject, pickRecipient } from '@/lib/letterAddress';
import type { AddressContact, RecipientMatch } from '@/lib/letterAddress';
import { useContacts } from '@/hooks/useContacts';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useI18n } from '@/i18n';
import Citation from '@/components/Citation';
import { trackDraftUsed } from '@/lib/analytics';
import {
  logCommunication,
  markCommunicationSent,
  recordCommunicationCc,
  attachCommunicationToRequest,
  updateCommunicationDraft,
} from '@/hooks/useCommunications';
import type { CommunicationOrg } from '@/hooks/useCommunications';
import { useRequests } from '@/hooks/useRequests';
import { ORG_BY_TEMPLATE, anyReachesTemplateSystem, clockCheckCopy, type ClockCheckCopy } from '@/lib/letterSystems';
import { sentNextFor, clockAnchorFor, planTracking } from '@/lib/sentNext';
import { toFunnelLocale } from '@/lib/eligibility';
import type { FunnelLocale } from '@/lib/eligibility';
import type { SentNext } from '@/lib/sentNext';
import { deadlineFor, statutoryDays } from '@/lib/requestClocks';
import { sendSteps, type SendStepsInput } from '@/lib/sendSteps';
import { addCc, MAX_CC } from '@/lib/letterAddress';
import { useTextScale } from '@/lib/textSize';
import { localDayISO } from '@/lib/dateOnly';
import type { RequestDeadline } from '@/lib/requestClocks';
import { useRoute, type RouteProp } from '@react-navigation/native';
import type { HomeStackParamList } from '@/types/navigation';
import { brand, colors, fonts, spacing, radii, semantic } from '@/lib/theme';

/**
 * "Filled from your records" note (draft flow 9c), trilingual. Deliberately
 * generic — the specific field labels live only in English in BLANK_FIELDS, so
 * interpolating them here would splice English into a Spanish/Vietnamese
 * sentence. This mirrors the mockup ("we filled these in from your records")
 * and stays honest without a mixed-language list.
 */
/**
 * Written next to the draft itself, not in the footer: a parent who scrolls
 * straight to Send must still pass it.
 */
const AI_PROVENANCE: Record<FunnelLocale, string> = {
  en: 'Written by Waypoint\u2019s AI from what you told us. Read it before you send \u2014 it goes out under your name.',
  es: 'Escrito por la IA de Waypoint con lo que usted nos cont\u00f3. L\u00e9alo antes de enviarlo \u2014 sale a su nombre.',
  vi: 'Do AI c\u1ee7a Waypoint vi\u1ebft d\u1ef1a tr\u00ean nh\u1eefng g\u00ec qu\u00fd v\u1ecb cho bi\u1ebft. H\u00e3y \u0111\u1ecdc tr\u01b0\u1edbc khi g\u1eedi \u2014 th\u01b0 \u0111i d\u01b0\u1edbi t\u00ean c\u1ee7a qu\u00fd v\u1ecb.',
};

const RECORDS_NOTE: Record<'en' | 'es' | 'vi', string> = {
  en: 'We filled in the details we had from your records. Tap to change any of them in your profile.',
  es: 'Completamos los datos que teníamos de su perfil. Toque para cambiar cualquiera en su perfil.',
  vi: 'Chúng tôi đã điền các chi tiết có trong hồ sơ của quý vị. Chạm để thay đổi bất kỳ mục nào trong hồ sơ.',
};

/** Send-gate copy (draft flow 9c-2), trilingual like the rest of this flow. */
/**
 * After a Gmail send that went out but wasn't fully recorded. The email is
 * gone either way, so the message says so — and names the recovery: the
 * paper-trail row is already sent (the function marks it), so 'not_saved'
 * means the follow-up steps (the tracked request, the sent moment) didn't
 * run, and "Mark as sent" runs them.
 */
const SEND_RECORD_FAILED: Record<FunnelLocale, Record<'not_saved' | 'untracked', string>> = {
  en: {
    not_saved: 'Sent through Gmail — but Waypoint couldn’t finish recording it. Tap “Mark as sent” below to start tracking.',
    untracked: 'Sent through Gmail — but Waypoint couldn’t start tracking it. Add it in Request Tracker.',
  },
  es: {
    not_saved: 'Enviado por Gmail — pero Waypoint no pudo terminar de registrarlo. Toque “Mark as sent” abajo para empezar el seguimiento.',
    untracked: 'Enviado por Gmail — pero Waypoint no pudo empezar a seguirlo. Agréguelo en Request Tracker.',
  },
  vi: {
    not_saved: 'Đã gửi qua Gmail — nhưng Waypoint chưa ghi nhận xong. Bấm “Mark as sent” bên dưới để bắt đầu theo dõi.',
    untracked: 'Đã gửi qua Gmail — nhưng Waypoint chưa thể bắt đầu theo dõi. Hãy thêm trong Request Tracker.',
  },
};

/** The Cc line's own words (owner ask, 2026-10-09). */
const CC_COPY: Record<
  FunnelLocale,
  { none: string; placeholder: string; invalid: string; duplicate: string; full: (n: number) => string; pending: string; replies: string }
> = {
  en: {
    none: 'No one',
    placeholder: 'Copy someone — type an email',
    invalid: 'That doesn’t look like one email address.',
    duplicate: 'They’re already on this email.',
    full: (n) => `You can copy up to ${n} people.`,
    pending: 'Tap Add to copy that address, or clear it — it isn’t on the email yet.',
    replies:
      'A reply from anyone you copy counts as a reply: Waypoint treats it like an answer and holds off on follow-up nudges for this request.',
  },
  es: {
    none: 'Nadie',
    placeholder: 'Copie a alguien — escriba un correo',
    invalid: 'Eso no parece una sola dirección de correo.',
    duplicate: 'Esa persona ya está en este correo.',
    full: (n) => `Puede copiar a hasta ${n} personas.`,
    pending: 'Toque Agregar para copiar esa dirección, o bórrela — todavía no está en el correo.',
    replies:
      'Una respuesta de cualquier persona en copia cuenta como respuesta: Waypoint la trata como contestación y no sugerirá seguimiento para esta solicitud por ahora.',
  },
  vi: {
    none: 'Không ai',
    placeholder: 'Đồng gửi cho ai đó — nhập email',
    invalid: 'Đó không giống một địa chỉ email.',
    duplicate: 'Người này đã có trong email.',
    full: (n) => `Quý vị có thể đồng gửi tối đa ${n} người.`,
    pending: 'Bấm Thêm để đồng gửi địa chỉ đó, hoặc xóa đi — địa chỉ đó chưa có trong email.',
    replies:
      'Thư trả lời từ bất kỳ người được đồng gửi nào cũng được tính là thư trả lời: Waypoint xem đó như câu trả lời và tạm không nhắc theo dõi yêu cầu này.',
  },
};

const SEND_GATE: Record<
  'en' | 'es' | 'vi',
  { toast: string; a11y: (n: number) => string; hint: (n: number) => string }
> = {
  en: {
    toast: 'Fill the blanks in the draft first — then send.',
    a11y: (n) => `Fill the ${n} blank${n === 1 ? '' : 's'} above, then send through Gmail`,
    hint: (n) =>
      `Fill the ${n} blank${n === 1 ? '' : 's'} above — then Send turns on. You can still Copy or open it in your mail app to finish there.`,
  },
  es: {
    toast: 'Complete los espacios del borrador primero — luego envíe.',
    a11y: (n) => `Complete ${n} espacio${n === 1 ? '' : 's'} arriba, luego envíe por Gmail`,
    hint: (n) =>
      `Complete ${n} espacio${n === 1 ? '' : 's'} arriba — luego se activa Enviar. Aún puede Copiar o abrirlo en su correo para terminar ahí.`,
  },
  vi: {
    toast: 'Hãy điền các chỗ trống trong bản nháp trước — rồi gửi.',
    a11y: (n) => `Điền ${n} chỗ trống ở trên, rồi gửi qua Gmail`,
    hint: (n) =>
      `Điền ${n} chỗ trống ở trên — rồi nút Gửi sẽ bật. Quý vị vẫn có thể Sao chép hoặc mở trong ứng dụng email để hoàn tất.`,
  },
};

/**
 * A subject is one header line. Any line break in one — from the model, or a
 * saved row — would start a second header in the message Gmail sends.
 */
function oneLine(value: string | null | undefined): string | null {
  const line = value?.replace(/\s+/g, ' ').trim();
  return line ? line : null;
}

export default function LettersScreen() {
  const { family, updateFamily } = useFamily();
  const { children, updateChild } = useChildren(family?.id);
  const { contacts } = useContacts(family?.id);
  const { showToast } = useToast();
  const { locale } = useI18n();
  const funnelLocale = toFunnelLocale(locale);
  const sendGate = SEND_GATE[funnelLocale];
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
      // New template → the previous draft's records note is no longer true.
      setFilledFromRecords([]);
      setManualRecipient(null);
      setChoosingRecipient(false);
      setCc([]);
      setCcInput('');
      setCcError(null);
      setManualEmailInput('');
      setSubjectEdit(null);
      setAiSubject(null);
      // A new letter is a new paper-trail row. (A draftBody hand-off, below,
      // runs after this and points these back at the row it reopens.)
      loggedDraftRef.current = null;
      loggedMetaRef.current = null;
      savedIdRef.current = null;
      savedSentRef.current = false;
      setSavedId(null);
      setMarkedSent(false);
      setSentMoment(null);
      setClockAnswer(null);
      setAskingClock(false);
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
    // The draft flow pre-sets the tone the parent chose in the questions.
    const t = route.params?.tone;
    if (t === 'warm' || t === 'professional' || t === 'strong') setTone(t);
  }, [route.params?.template, route.params?.question, route.params?.guidance, route.params?.tone]);

  // Reopened from the paper trail: drop the saved text straight into the
  // editor so an unsent draft can be picked back up
  useEffect(() => {
    const saved = route.params?.draftBody;
    if (!saved) return;
    // A leading "Subject:" line belongs in the subject field, not the body —
    // the Navigator's "Email This" hands over exactly that shape, and leaving
    // it in the box put it in Copy, in the paper trail, and in the blank
    // check after the parent had already fixed the subject.
    const { subject: leading, body } = extractSubject(saved);
    setDraft(body);
    // A reopened draft never went through fillKnownBlanks, so no records were
    // filled for THIS text — clear any note left from a prior generated draft,
    // or it would assert a false provenance over someone else's letter.
    setFilledFromRecords([]);
    setManualRecipient(null);
    setChoosingRecipient(false);
    setCc([]);
    setCcInput('');
    setCcError(null);
    setManualEmailInput('');
    // A reopened letter keeps the subject it was saved with — not the
    // template-title fallback the subject field exists to get away from.
    setSubjectEdit(oneLine(route.params?.draftSubject) ?? leading ?? null);
    setAiSubject(null);
    // Already in the log — don't duplicate it — UNLESS the caller says this
    // text was never logged in the first place (see draftBodyUnlogged on the
    // param type): a Navigator chat answer routed here has no prior row, and
    // marking it "already logged" made the first Save/Send a silent no-op —
    // saveDraftOnce short-circuits whenever this ref already equals `draft`.
    const unlogged = !!route.params?.draftBodyUnlogged;
    loggedDraftRef.current = unlogged ? null : body;
    loggedMetaRef.current = null;
    // The row it came from, so an edit revises it and a send marks it. With
    // no id, a reopened, unedited draft could never be sent through Gmail.
    savedIdRef.current = unlogged ? null : route.params?.draftId ?? null;
    savedSentRef.current = false;
    setSavedId(savedIdRef.current);
  }, [route.params?.draftBody, route.params?.draftBodyUnlogged, route.params?.draftId, route.params?.draftSubject]);
  const [tone, setTone] = useState<DraftTone>('professional');
  const [question, setQuestion] = useState('');
  const [draft, setDraft] = useState<string | null>(null);
  // What the profile fill supplied (draft flow 9c): shown as a persistent,
  // honest note above the draft — "these came from your records, tap to change"
  // — instead of a toast that vanishes before the parent reads the letter.
  const [filledFromRecords, setFilledFromRecords] = useState<string[]>([]);
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
    // A "Subject:" line the model wrote goes to the subject field, not the body.
    const { subject: leading, body } = extractSubject(text);
    setDraft(body);
    // A regenerated draft is not the one that was sent — drop any prior
    // send confirmation so it can't linger over new, unsent text.
    setMarkedSent(false);
    setSentMoment(null);
    setClockAnswer(null);
    setAskingClock(false);
    setManualRecipient(null);
    setChoosingRecipient(false);
    setCc([]);
    setCcInput('');
    setCcError(null);
    setManualEmailInput('');
    setSubjectEdit(null);
    setAiSubject(oneLine(result.subject) ?? leading ?? null);
    // Persistent note above the draft instead of a vanishing toast — a parent
    // reviewing the letter later can still see what came from their records.
    setFilledFromRecords(filled);
    if (family?.id) {
      // Anonymous usage analytics (fire-and-forget)
      trackDraftUsed(family.id, template.key, family.regional_center ?? undefined);
    }
  }, [template, tone, question, chatGuidance, hasAIConsent, locale, showToast, family, letterProfile]);

  // Each letter is ONE paper-trail row, saved as a DRAFT — writing a letter
  // isn't the same as sending it, and the log shouldn't pretend otherwise
  // until the parent says so. A revision updates that row while it is still
  // a draft; once it has gone out, a changed letter is a new one.
  const loggedDraftRef = React.useRef<string | null>(null);
  /** Subject, addressee and organization as last logged — a change is a revision. */
  const loggedMetaRef = React.useRef<string | null>(null);
  const savedIdRef = React.useRef<string | null>(null);
  /** The row at savedIdRef has gone out, so it is never rewritten. */
  const savedSentRef = React.useRef(false);
  // Filled from `outgoing` below so the log shows the real subject line
  const outgoingSubjectRef = React.useRef<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [markedSent, setMarkedSent] = useState(false);

  // A lever letter launched from a case file carries its request along, so
  // the new letter lands on the same thread instead of starting a stray one.
  const routeRequestId = route.params?.requestId ?? null;

  /**
   * The row for the letter on screen, written or revised as needed.
   * `fresh` is a second send of a letter that already went out: it gets its
   * own row, so the first send keeps its Gmail thread (and its replies).
   */
  const saveDraftOnce = useCallback(async (opts?: { fresh?: boolean }): Promise<string | null> => {
    if (!draft || !template || !family?.id) return null;
    const subject = outgoingSubjectRef.current ?? template.title;
    // Who it actually went to beats the template's default — a records
    // request to the RC should log as Regional Center, not School
    const organization = outgoingOrgRef.current ?? ORG_BY_TEMPLATE[template.key] ?? 'other';
    const contact = outgoingContactRef.current ?? undefined;
    const meta = [subject, contact ?? '', organization].join('\u0000');
    const id = savedIdRef.current;
    const sameText = loggedDraftRef.current === draft;

    if (id && savedSentRef.current) {
      // It went out. Picking who it went to, or tidying the subject, after
      // the fact is not a new letter — only new text, or a deliberate second
      // send, is. (Treating those as revisions logged a duplicate DRAFT of a
      // sent letter, which Home then asked the parent to finish.)
      if (sameText && !opts?.fresh) return id;
    } else if (id) {
      if (sameText && loggedMetaRef.current === meta) return id;
      loggedDraftRef.current = draft;
      loggedMetaRef.current = meta;
      const revised = await updateCommunicationDraft(id, { subject, body: draft, contact, organization });
      if (revised === 'updated') return id;
      if (revised === 'error') {
        // A failed save, not a reason to log a second row beside this one.
        loggedDraftRef.current = null;
        loggedMetaRef.current = null;
        return null;
      }
      // 'not_draft': sent from somewhere else, or gone — it needs its own row.
    } else if (sameText) {
      // Handed over as already logged but with no row to revise: never
      // duplicate it (the reopen rule this screen has always kept).
      return null;
    }

    loggedDraftRef.current = draft;
    loggedMetaRef.current = meta;
    const newId = await logCommunication(family.id, {
      kind: 'letter',
      subject,
      body: draft,
      template_key: template.key,
      organization,
      contact,
      status: 'draft',
      request_id: routeRequestId ?? undefined,
    });
    if (!newId) {
      // Let the next tap try again instead of believing this was saved.
      loggedDraftRef.current = null;
      loggedMetaRef.current = null;
    }
    savedIdRef.current = newId;
    savedSentRef.current = false;
    setSavedId(newId);
    setMarkedSent(false);
    return newId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, template, family?.id, routeRequestId]);

  // The sent moment (owner feedback): a send deserves a congratulation,
  // the next step, and honest expectations — plus automatic clock tracking.
  const { requests, loading: requestsLoading, createRequest } = useRequests(family?.id);
  const [sentMoment, setSentMoment] = useState<{
    next: SentNext;
    deadline: RequestDeadline | null;
    tracked: boolean;
  } | null>(null);
  /**
   * A letter addressed outside the system its template is written to (a
   * provider note routed as an IPP request — letterSystems.ts) asks, BEFORE
   * it is marked sent, whether it really is that request. The answer decides
   * whether a request is tracked. Asked first so that leaving the screen can
   * never quietly cost a family a real deadline: unanswered, nothing is
   * marked sent and the letter stays an unsent draft Home brings back.
   */
  const [clockAnswer, setClockAnswer] = useState<'yes' | 'no' | null>(null);
  /** The question is open inline because "Mark as sent" was tapped. */
  const [askingClock, setAskingClock] = useState(false);
  /**
   * The decision, as of the latest render — read by handleMarkSent, which is
   * declared before the recipient and Cc data it depends on.
   */
  const clockRef = React.useRef<{ ask: boolean; mismatch: boolean; copy: ClockCheckCopy | null }>({
    ask: false,
    mismatch: false,
    copy: null,
  });

  // ── Send directly through the connected Gmail account (Aug 27) —
  // marks the draft sent, stores the thread id so replies sync back.
  const [gmailReady, setGmailReady] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [gmailSending, setGmailSending] = useState(false);
  // The button opens a last-look sheet; only its "Send now" sends (2026-10-07).
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sendProblem, setSendProblem] = useState<string | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    gmailStatus().then((s) => {
      setGmailReady(s.gmail);
      setGmailEmail(s.email ?? null);
    });
  }, []);

  /**
   * Start (or join) what a sent letter tracks, and show the sent moment.
   * Runs straight after a send — or after the parent confirms the letter
   * really went to the system its template addresses.
   */
  const trackSend = useCallback(async (
    id: string,
    next: SentNext
  ): Promise<'ok' | 'untracked'> => {
    // Open the tracked request (once): the Request Tracker owns the clock
    // from here. An existing live row of the same title is not duplicated,
    // and a letter sent FROM a case never opens a second clock row.
    let tracked = false;
    // The request this send belongs to — the live row it joined, or the one
    // it founded. Its requested_on, not today, is what the statutory clock
    // runs from (see clockAnchorFor). One clock reading for the whole
    // handler, so the row written and the deadline shown cannot straddle
    // local midnight and disagree by a day.
    let joined: { requested_on: string } | null = null;
    const sentAt = new Date();
    const sentOn = localDayISO(sentAt);
    const plan = planTracking(next, routeRequestId, route.params?.trackTitle, requests);
    // The celebration's deadline: the founded or joined request's clock (a
    // case-launched letter shows none, exactly as before).
    const track = plan.mode === 'found' ? plan.track : plan.mode === 'join' ? next.track : null;
    if (plan.mode === 'case') {
      tracked = true; // the case that launched this letter already owns the clock
    } else if (plan.mode === 'join') {
      tracked = true;
      // Re-sending from the catalog: the letter joins the live request's
      // case thread — and its clock, which keeps running from the original
      // ask. Best-effort, like the founding stamp.
      joined = plan.request;
      attachCommunicationToRequest(id, plan.request.id);
    } else if (plan.mode === 'found') {
      const created = await createRequest({
        request_type: plan.track.requestType,
        title: plan.title,
        // The family's local day, not the UTC one: after 5pm Pacific the
        // UTC slice is tomorrow, which would start the statutory clock a
        // day late and show a request dated a day the family hasn't lived.
        requested_on: sentOn,
        child_id: primaryChild?.id ?? null,
        channel: 'email',
        notes: 'Sent via Waypoint Letters',
        // Connect the clock to the letter that started it — the tracker
        // and paper trail describe one event, not two.
        communication_id: id,
      });
      tracked = !!created;
      // The founding letter joins its own case thread (047) — the 045
      // communication_id link above stays as the pre-047 fallback.
      if (created) {
        joined = created;
        attachCommunicationToRequest(id, created.id);
      }
    }
    // Sending the deeming letter IS applying — reflect it on the Resource
    // Stack without asking the family to also flip a status. Best effort;
    // the tracked request above is the derivation fallback either way.
    if (
      template?.key === 'medi_cal_deeming' &&
      primaryChild &&
      primaryChild.medi_cal_status !== 'active'
    ) {
      updateChild(primaryChild.id, { medi_cal_status: 'applied' }).catch(() => undefined);
    }
    // The deadline this celebration shows must be the SAME statutory date the
    // Request Tracker shows for the same request: re-sending an open ask does
    // not restart its clock, and a founding send anchors on the family's local
    // day (the UTC slice is tomorrow every evening in California).
    // No statutory date for a request that was never opened.
    const deadline = track && tracked
      ? deadlineFor(track.requestType, clockAnchorFor(joined, sentAt), sentAt)
      : null;
    setSentMoment({ next, deadline, tracked });
    return plan.mode === 'found' && !tracked ? 'untracked' : 'ok';
  }, [template, primaryChild, requests, createRequest, updateChild, routeRequestId, route.params?.trackTitle]);

  /**
   * The parent confirms it actually went out. Resolves to what it managed:
   * 'ok', 'not_saved' (the paper-trail row couldn't be saved or marked), or
   * 'untracked' (sent and logged, but the tracked request couldn't be opened)
   * — so the Gmail send never reports a success it didn't have.
   */
  // The Cc that was actually in the mail-app hand-off (064), set only when
  // the email app opened with it. "Mark as sent" also confirms a letter that
  // was copied, printed or faxed — none of which carried a Cc — so it records
  // only what a hand-off carried, never the chips on screen.
  const handedOffCcRef = React.useRef<string[] | null>(null);

  // `recordHandOff`: the "Mark as sent" button. The Gmail path leaves it off —
  // the gmail function stores the Cc it sent.
  const handleMarkSent = useCallback(async (
    opts: { recordHandOff?: boolean; clock?: 'yes' | 'no' } = {}
  ): Promise<'ok' | 'not_saved' | 'untracked'> => {
    // Not `savedIdRef.current ?? …`: once any version of this letter was
    // saved, that short-circuit marked THAT row sent with the text from before
    // the parent's last edits. saveDraftOnce revises the row first.
    const id = await saveDraftOnce();
    if (!id) {
      showToast("Couldn't update the paper trail — please try again.", 'error');
      return 'not_saved';
    }
    const ok = await markCommunicationSent(id);
    if (ok) savedSentRef.current = true;
    const copied = opts.recordHandOff ? handedOffCcRef.current : null;
    if (ok && copied && copied.length > 0) void recordCommunicationCc(id, copied);
    setMarkedSent(ok);
    if (!ok) {
      showToast("Couldn't mark it sent.", 'error');
      return 'not_saved';
    }
    const next = template
      ? sentNextFor(template.key, primaryChild?.first_name, toFunnelLocale(locale))
      : null;
    if (!next) {
      showToast('Marked as sent — saved to your paper trail', 'success');
      return 'ok';
    }
    // Addressed outside the system this letter is written to (see
    // letterSystems.ts). The parent answered before it was marked sent.
    const clock = clockRef.current;
    const answer = opts.clock ?? clockAnswer;
    if (clock.ask && answer !== 'yes') {
      showToast(clock.copy?.noClock ?? 'Marked as sent — saved to your paper trail', 'success');
      return 'ok';
    }
    // Nothing to track (a follow-up letter), but the sent moment would still
    // speak about an agency the letter never reached — say only that it's saved.
    if (clock.mismatch && !clock.ask && !routeRequestId) {
      showToast('Marked as sent — saved to your paper trail', 'success');
      return 'ok';
    }
    return trackSend(id, next);
  }, [saveDraftOnce, showToast, template, primaryChild?.first_name, locale, trackSend, clockAnswer, routeRequestId]);

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
  // The matched recipient's organization — the truthful paper-trail label
  const outgoingOrgRef = React.useRef<CommunicationOrg | null>(null);
  const composeEnv = {
    platformOS: Platform.OS,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    maxTouchPoints: typeof navigator !== 'undefined' ? navigator.maxTouchPoints : undefined,
  };
  const emailableContacts = useMemo(() => contacts.filter((c) => !!c.email), [contacts]);
  /**
   * `pickRecipient` only finds someone when the draft greets them by name or
   * a saved contact matches the template's organization — neither holds for
   * a chat answer handed here with no template of its own ("Email This"
   * routes any Navigator answer through this same screen, draft flow 2026-09).
   * Without this, that answer would land with no in-app way to say who it's
   * for at all.
   *
   * Reset on a fresh template/draftBody hand-off and on a freshly generated
   * draft (a new letter, a new context) — but deliberately NOT on every
   * keystroke in the draft text box itself, or fixing a typo would silently
   * un-pick the recipient mid-edit. The "Change →" link next to the address
   * (below) is the actual safety net: the pick stays visible next to
   * whatever text is currently in the box, the same way an auto-matched
   * greeting is, for the parent to catch and correct before sending either
   * way (an adversarial review, 2026-09-12, flagged a stale pick surviving
   * a rewritten draft as silent; this makes it visible and correctable
   * instead of trying to guess when an edit is "different enough" to clear).
   */
  const [manualRecipient, setManualRecipient] = useState<AddressContact | null>(null);
  // "Change" on a recipient Waypoint matched (from the greeting or the
  // letter's agency) — the parent wants someone else, so show the chooser
  // instead of the match until they pick (owner ask, 2026-10-09).
  const [choosingRecipient, setChoosingRecipient] = useState(false);
  // Cc (owner ask, 2026-10-09): people copied on a Gmail send or the mail-app
  // hand-off. Every reply on the thread counts as a reply, theirs included
  // (owner decision) — the Cc line and the send steps say so.
  const [cc, setCc] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState('');
  const [ccError, setCcError] = useState<string | null>(null);
  // The "When you press Send" steps follow the family's text size.
  const { scale: textScale } = useTextScale();
  /** Typed-address fallback (below): a saved-contact chip is not the only
   *  way to address this — anyone not yet in Key Contacts still needs a
   *  path that doesn't dead-end at "go save them first". */
  const [manualEmailInput, setManualEmailInput] = useState('');
  /**
   * The subject is the parent's to set (owner feedback, 2026-10-07). It was
   * only ever displayed, so a template-title fallback — "IPP Meeting
   * Request — Teddy Beebe" on a note to a provider asking for a written
   * recommendation — went out with no way to see it coming or fix it.
   * `null` follows the computed subject; any edit, even clearing it, is
   * the parent's own and is kept until the next letter.
   */
  const [subjectEdit, setSubjectEdit] = useState<string | null>(null);
  /** The subject the model wrote for this draft, when ai-proxy sends one. */
  const [aiSubject, setAiSubject] = useState<string | null>(null);
  /**
   * Address the draft before handing it to the mail app: the letter names
   * its own subject and greets its recipient by name, and Key Contacts
   * knows the address — no reason to make the parent supply any of it.
   */
  const outgoing = React.useMemo(() => {
    if (!draft || !template) return null;
    const { subject: draftSubject, body } = extractSubject(draft);
    const computedSubject = buildSubject({
      // A "Subject:" line the parent typed at the top of the draft is the
      // most deliberate signal there is; the model's comes next.
      draftSubject: draftSubject ?? aiSubject,
      templateTitle: template.title,
      childFirstName: primaryChild?.first_name,
      familyLastName: family?.parent_last_name,
    });
    // What the subject field shows. A Gmail send uses exactly this, so the
    // send sheet refuses to go while it is blank; the mail-app hand-off and
    // the paper trail fall back to the computed subject instead.
    const subjectField = subjectEdit ?? computedSubject;
    // The same normalization the Gmail send applies, so the paper trail and
    // the send never disagree about whether the subject changed.
    const subject = oneLine(subjectField) ?? computedSubject;
    const autoRecipient = pickRecipient(draft, contacts, ORG_BY_TEMPLATE[template.key]);
    // The parent's own pick always wins; a "Change" with no pick yet shows
    // the chooser; otherwise Waypoint's match stands.
    const recipient: RecipientMatch = manualRecipient
      ? { to: [manualRecipient.email!], contact: manualRecipient, reason: 'manual' }
      : choosingRecipient
        ? { to: [], contact: null, reason: 'none' }
        : autoRecipient;
    outgoingSubjectRef.current = subject;
    outgoingContactRef.current = recipient.contact?.name ?? null;
    outgoingOrgRef.current = (recipient.contact?.organization as CommunicationOrg | null) ?? null;
    return { subject, subjectField, body, recipient, autoRecipient };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, template, contacts, manualRecipient, choosingRecipient, subjectEdit, aiSubject, primaryChild?.first_name, family?.parent_last_name]);

  // Never copy the addressee — they may have been picked after being copied.
  const toEmail = outgoing?.recipient.contact?.email?.toLowerCase() ?? null;
  const ccList = useMemo(() => cc.filter((e) => e.toLowerCase() !== toEmail), [cc, toEmail]);
  const ccName = useCallback(
    (email: string) =>
      emailableContacts.find((c) => c.email?.toLowerCase() === email.toLowerCase())?.name ?? email,
    [emailableContacts]
  );
  const ccCopy = CC_COPY[funnelLocale];
  const addToCc = useCallback(
    (value: string) => {
      const result = addCc(ccList, value, toEmail);
      if (!result.added) {
        setCcError(
          result.reason === 'invalid'
            ? ccCopy.invalid
            : result.reason === 'duplicate'
              ? ccCopy.duplicate
              : ccCopy.full(MAX_CC)
        );
        return;
      }
      setCc(result.list);
      setCcInput('');
      setCcError(null);
    },
    [ccList, toEmail, ccCopy]
  );
  // Picking a copied person as the addressee takes them off the Cc line for
  // good — so switching the addressee back doesn't quietly re-copy them.
  useEffect(() => {
    if (toEmail && cc.some((e) => e.toLowerCase() === toEmail)) {
      setCc((prev) => prev.filter((e) => e.toLowerCase() !== toEmail));
    }
  }, [toEmail, cc]);
  // An address typed but never added must not be silently left off: both
  // the Gmail sheet and the mail-app hand-off stop and say so.
  const ccPending = ccInput.trim().length > 0;

  const target = outgoing
    ? composeTarget(
        {
          to: outgoing.recipient.to[0],
          cc: ccList,
          subject: outgoing.subject,
          body: outgoing.body,
        },
        composeEnv
      )
    : null;

  // A letter with unfilled [BRACKET] blanks must not fire a direct send to an
  // agency (draft flow phase 9c). Copy and Open-in-mail stay available so the
  // parent can still finish elsewhere. The subject counts: it is the first
  // line the agency reads, and "[DATE]" there is no better than in the body.
  const blankScanText = draft ? `${outgoing?.subjectField ?? ''}\n${outgoing?.body ?? draft}` : '';
  const blanksLeft = useMemo(
    () => (blankScanText ? analyzeBlanks(blankScanText, letterProfile).remaining.length : 0),
    [blankScanText, letterProfile]
  );

  /**
   * Whether this letter is addressed outside the system its template writes
   * to (nobody on it — addressee or Cc — is saved under that system), and
   * whether that leaves a request to found or join, which the parent must
   * confirm first. ONE decision, read by the step list, the send sheet, the
   * "Mark as sent" button and handleMarkSent alike, so they cannot drift.
   */
  const clockDecision = useMemo(() => {
    if (!template) return { ask: false, mismatch: false, copy: null as ClockCheckCopy | null, plan: null };
    const plan = planTracking(
      sentNextFor(template.key, primaryChild?.first_name, toFunnelLocale(locale)),
      routeRequestId,
      route.params?.trackTitle,
      requests
    );
    const contact = outgoing?.recipient.contact ?? null;
    const addresseeOrg = (contact?.organization as CommunicationOrg | null | undefined) ?? null;
    const ccOrgs = ccList.map(
      (e) =>
        (emailableContacts.find((c) => c.email?.toLowerCase() === e.toLowerCase())
          ?.organization as CommunicationOrg | null | undefined) ?? null
    );
    const mismatch = !anyReachesTemplateSystem(template.key, addresseeOrg, ccOrgs);
    const days = plan.mode === 'found' ? statutoryDays(plan.track.requestType) : null;
    const copy =
      mismatch && contact && addresseeOrg
        ? clockCheckCopy(template.key, contact.name, addresseeOrg, days, funnelLocale)
        : null;
    // A case-launched letter is filed in its case whoever it went to; only a
    // request this send would found or join is worth asking about.
    const ask = mismatch && !!copy && (plan.mode === 'found' || plan.mode === 'join');
    return { ask, mismatch, copy, plan };
  }, [template, primaryChild?.first_name, locale, routeRequestId, route.params?.trackTitle, requests, outgoing?.recipient.contact, ccList, emailableContacts, funnelLocale]);
  clockRef.current = clockDecision;

  // A different addressee, Cc or letter is a different question.
  const clockKey = `${template?.key ?? ''}|${outgoing?.recipient.contact?.email ?? ''}|${ccList.join(',')}`;
  useEffect(() => {
    setClockAnswer(null);
    setAskingClock(false);
  }, [clockKey]);

  // What a send of THIS letter will start — from the same decision
  // handleMarkSent acts on, so "When you press Send" never promises a
  // deadline the send won't open (a re-send joins the live request instead).
  const sendTracking = useMemo((): Pick<SendStepsInput, 'tracking' | 'clockDays'> => {
    const { plan, mismatch, ask } = clockDecision;
    if (!plan) return { tracking: 'none' };
    // A letter launched from a case is filed in that case whoever it went to.
    if (plan.mode === 'case') return { tracking: 'case' };
    // Outside the template's system: nothing is tracked unless the parent
    // has said it IS that request.
    if (mismatch && !(ask && clockAnswer === 'yes')) return { tracking: 'none' };
    if (plan.mode === 'join') return { tracking: 'case' };
    // Until the family's requests load, "found" may really be a join — so
    // claim only what is certain.
    if (requestsLoading) return { tracking: 'none' };
    if (plan.mode === 'none') return { tracking: 'none' };
    const days = statutoryDays(plan.track.requestType);
    return days ? { tracking: 'clock', clockDays: days } : { tracking: 'tracked' };
  }, [clockDecision, clockAnswer, requestsLoading]);

  const openSendSheet = useCallback(() => {
    if (ccPending) {
      setCcError(ccCopy.pending);
      return;
    }
    setSendProblem(null);
    setConfirmOpen(true);
  }, [ccPending, ccCopy]);

  /** "Send now" in the sheet — the only path that sends through Gmail. */
  const handleSendWithGmail = useCallback(async () => {
    const to = outgoing?.recipient.contact?.email;
    if (!draft || !outgoing || !to || gmailSending) return;
    // The sheet holds Send now until the question is answered; never send
    // with a legal deadline still undecided even if that guard is bypassed.
    if (clockRef.current.ask && !clockAnswer) return;
    // The sheet shows this field and sends exactly it — never a fallback the
    // parent did not see.
    const subject = oneLine(outgoing.subjectField);
    if (!subject) return;
    // Defense in depth — the button is disabled while blanks remain, but never
    // send "[DATE]" straight to an agency even if that guard is bypassed.
    if (!sendReadiness(`${subject}\n${outgoing.body}`, letterProfile, true).canSend) {
      showToast(sendGate.toast, 'error');
      return;
    }
    setGmailSending(true);
    setSendProblem(null);
    try {
      // Revises the row first if the letter or its subject changed since it
      // was saved, so the paper trail records what actually goes out.
      outgoingSubjectRef.current = subject;
      const id = await saveDraftOnce({ fresh: true });
      if (!id) {
        const msg = "Couldn't save the draft — please try again.";
        setSendProblem(msg);
        showToast(msg, 'error');
        return;
      }
      const result = await gmailSend({
        to,
        cc: ccList,
        subject,
        // The body without a leading "Subject:" line — Gmail has its own.
        body: outgoing.body,
        communicationId: id,
      });
      if (!result.ok) {
        const msg = result.error ?? 'Gmail send failed — try Open in Gmail instead.';
        setSendProblem(msg);
        showToast(msg, 'error');
        return;
      }
      // The function already marked the row sent. Remember that even if the
      // client-side mark below fails, or a second send would reuse this row
      // and overwrite its thread — losing the first email's replies.
      savedSentRef.current = true;
      setConfirmOpen(false);
      // The function marked the row sent + stored thread ids; run the
      // sent moment + clock tracking exactly as a manual send would.
      const recorded = await handleMarkSent({ clock: clockAnswer ?? undefined });
      if (recorded === 'ok') {
        showToast('Sent through Gmail — replies will sync to your paper trail.', 'success');
      } else {
        // The email is gone either way — say so, and what didn't follow.
        showToast(SEND_RECORD_FAILED[funnelLocale][recorded], 'error');
      }
    } finally {
      setGmailSending(false);
    }
  }, [draft, outgoing, gmailSending, saveDraftOnce, showToast, handleMarkSent, letterProfile, sendGate, funnelLocale, ccList, clockAnswer]);

  const handleSend = useCallback(async () => {
    if (!draft || !target) return;
    if (ccPending) {
      setCcError(ccCopy.pending);
      showToast(ccCopy.pending, 'error');
      return;
    }
    await saveDraftOnce();
    // Long drafts can get truncated by a mail app's URL handling — put the
    // full text on the clipboard first so nothing is ever lost.
    const long = draft.length > LONG_BODY_CHARS;
    if (long) await Clipboard.setStringAsync(draft);
    try {
      await Linking.openURL(target.url);
      handedOffCcRef.current = ccList;
      if (long) {
        showToast('Draft copied too — paste it if your email app cut it short.', 'info');
      }
    } catch {
      await Clipboard.setStringAsync(draft);
      showToast('Could not open your email app — the draft is copied, paste it there.', 'error');
    }
  }, [draft, target, showToast, saveDraftOnce, ccPending, ccCopy, ccList]);

  const reset = () => {
    handedOffCcRef.current = null;
    loggedDraftRef.current = null;
    loggedMetaRef.current = null;
    savedIdRef.current = null;
    savedSentRef.current = false;
    setSavedId(null);
    setMarkedSent(false);
    setSentMoment(null);
    setClockAnswer(null);
    setAskingClock(false);
    setDraft(null);
    setFilledFromRecords([]);
    setManualRecipient(null);
    setChoosingRecipient(false);
    setCc([]);
    setCcInput('');
    setCcError(null);
    setManualEmailInput('');
    setSubjectEdit(null);
    setAiSubject(null);
    setTemplate(null);
    setQuestion('');
    setChatGuidance(null);
    // The case link belongs to the letter that was launched from the case —
    // a NEW letter started here must not inherit it.
    if (route.params?.requestId) {
      navigation.setParams({ requestId: undefined });
    }
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
      {outgoing?.recipient.contact?.email ? (
        <GmailSendConfirmModal
          visible={confirmOpen}
          locale={funnelLocale}
          fromEmail={gmailEmail}
          primary={{
            name: outgoing.recipient.contact.name,
            email: outgoing.recipient.contact.email,
          }}
          cc={ccList.map((e) => ({ name: ccName(e), email: e }))}
          subject={outgoing.subjectField}
          onChangeSubject={setSubjectEdit}
          body={outgoing.body}
          alreadySent={savedSentRef.current && loggedDraftRef.current === draft}
          sending={gmailSending}
          blockedReason={blanksLeft > 0 ? sendGate.toast : null}
          clockQuestion={clockDecision.ask ? clockDecision.copy : null}
          clockAnswer={clockAnswer}
          onClockAnswer={setClockAnswer}
          problem={sendProblem}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleSendWithGmail}
        />
      ) : null}

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
                  ✓ Using the context from your Waypoint Navigator chat — the draft will reflect what you discussed.
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
            {/* The screen where machine-written text leaves the app under the
                parent's own name, into a legal record with an agency. An
                adversary pass (Sep 2026) found this was the one screen on the
                draft path with no AI attribution anywhere — and the one route
                that bypasses the questions sheet reaches it directly. */}
            <Text style={styles.aiProvenance}>{AI_PROVENANCE[funnelLocale]}</Text>
            {filledFromRecords.length > 0 && (
              <TouchableOpacity
                style={styles.recordsNote}
                onPress={() => (navigation as any).navigate('Home', { screen: 'Profile' })}
                accessibilityRole="button"
                accessibilityLabel={RECORDS_NOTE[funnelLocale]}
              >
                <Text style={styles.recordsNoteText}>{RECORDS_NOTE[funnelLocale]}</Text>
              </TouchableOpacity>
            )}
            {(() => {
              // Blanks left after the profile fill: show what's still needed,
              // and separate "we could remember this for you" from the ones
              // only the parent can answer (dates, times, specifics).
              const { remaining, fixableInProfile } = analyzeBlanks(blankScanText, letterProfile);
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
                      onPress={() => (navigation as any).navigate('Home', { screen: 'Profile' })}
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
                <View style={styles.addressToRow}>
                  <Text style={[styles.addressLine, styles.addressToText]} numberOfLines={2}>
                    <Text style={styles.addressLabel}>To: </Text>
                    {outgoing.recipient.contact
                      ? outgoing.recipient.contact.name === outgoing.recipient.contact.email
                        ? outgoing.recipient.contact.email
                        : `${outgoing.recipient.contact.name} (${outgoing.recipient.contact.email})`
                      : 'Choose who this goes to, or add the address in your email app'}
                  </Text>
                  {outgoing.recipient.contact && (
                    <TouchableOpacity
                      onPress={() => {
                        setManualRecipient(null);
                        setChoosingRecipient(true);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Change who this goes to"
                    >
                      <Text style={styles.addressHint}>Change →</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {choosingRecipient && !manualRecipient && outgoing.autoRecipient.contact && (
                  <TouchableOpacity
                    onPress={() => setChoosingRecipient(false)}
                    accessibilityRole="button"
                    accessibilityLabel={`Keep ${outgoing.autoRecipient.contact.name}`}
                  >
                    <Text style={styles.addressHint}>← Keep {outgoing.autoRecipient.contact.name}</Text>
                  </TouchableOpacity>
                )}
                {/* Waypoint matched the recipient from the greeting; a new
                    recipient still reads "Hi <the old name>". */}
                {manualRecipient &&
                  outgoing.autoRecipient.reason === 'greeting' &&
                  outgoing.autoRecipient.contact &&
                  outgoing.autoRecipient.contact.email?.toLowerCase() !== manualRecipient.email?.toLowerCase() && (
                    <Text style={styles.greetingWarning} accessibilityRole="alert">
                      The letter still greets {outgoing.autoRecipient.contact.name} — update the greeting above if it’s going to someone else.
                    </Text>
                  )}
                <View style={styles.ccBlock}>
                  <View style={styles.ccRow}>
                    <Text style={[styles.addressLine, styles.addressLabel]}>Cc: </Text>
                    {ccList.length === 0 && <Text style={styles.ccNone}>{ccCopy.none}</Text>}
                    {ccList.map((email) => (
                      <View key={email} style={styles.ccChip}>
                        <Text style={styles.ccChipText}>{ccName(email)}</Text>
                        <TouchableOpacity
                          onPress={() => setCc(ccList.filter((e) => e !== email))}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${ccName(email)} from Cc`}
                        >
                          <Text style={styles.ccChipRemove}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                  {ccList.length < MAX_CC && (
                    <>
                      {(() => {
                        const offer = emailableContacts
                          .filter(
                            (c) =>
                              c.email!.toLowerCase() !== toEmail &&
                              !ccList.some((e) => e.toLowerCase() === c.email!.toLowerCase())
                          )
                          .slice(0, 4);
                        return offer.length > 0 ? (
                          <View style={styles.ccOffer}>
                            {offer.map((c) => (
                              <TouchableOpacity
                                key={c.id}
                                style={styles.ccOfferChip}
                                onPress={() => addToCc(c.email!)}
                                accessibilityRole="button"
                                accessibilityLabel={`Copy ${c.name}`}
                              >
                                <Text style={styles.ccOfferText}>+ {c.name}{c.role ? ` · ${c.role}` : ''}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        ) : null;
                      })()}
                      <View style={styles.manualEmailRow}>
                        <TextInput
                          style={styles.manualEmailInput}
                          value={ccInput}
                          onChangeText={(v) => {
                            setCcInput(v);
                            setCcError(null);
                          }}
                          onSubmitEditing={() => addToCc(ccInput)}
                          placeholder={ccCopy.placeholder}
                          placeholderTextColor={colors.mid}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          accessibilityLabel="Cc email address"
                        />
                        <TouchableOpacity
                          style={[styles.manualEmailButton, !ccInput.trim() && styles.manualEmailButtonDisabled]}
                          disabled={!ccInput.trim()}
                          onPress={() => addToCc(ccInput)}
                          accessibilityRole="button"
                          accessibilityState={{ disabled: !ccInput.trim() }}
                          accessibilityLabel="Add to Cc"
                        >
                          <Text style={styles.manualEmailButtonText}>Add</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                  {ccError ? (
                    <Text style={styles.greetingWarning} accessibilityRole="alert">{ccError}</Text>
                  ) : null}
                  {ccList.length > 0 && (
                    <Text style={styles.addressHint}>{ccCopy.replies}</Text>
                  )}
                </View>
                <View style={styles.subjectRow}>
                  <Text style={[styles.addressLine, styles.addressLabel]}>Subject: </Text>
                  <TextInput
                    style={styles.subjectInput}
                    value={outgoing.subjectField}
                    onChangeText={setSubjectEdit}
                    placeholder="Add a subject"
                    placeholderTextColor={colors.mid}
                    accessibilityLabel="Email subject"
                  />
                </View>
                {!outgoing.recipient.contact && (
                  <>
                    {emailableContacts.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.recipientChipRow}
                      >
                        {emailableContacts.slice(0, 6).map((c) => (
                          <TouchableOpacity
                            key={c.id}
                            style={styles.recipientChip}
                            onPress={() =>
                              setManualRecipient({
                                name: c.name,
                                email: c.email,
                                organization: c.organization,
                                role: c.role,
                              })
                            }
                            accessibilityRole="button"
                            accessibilityLabel={`Send to ${c.name}`}
                          >
                            <Text style={styles.recipientChipText}>
                              {c.name}{c.role ? ` · ${c.role}` : ''}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                    <View style={styles.manualEmailRow}>
                      <TextInput
                        style={styles.manualEmailInput}
                        value={manualEmailInput}
                        onChangeText={setManualEmailInput}
                        placeholder="or type an email address"
                        placeholderTextColor={colors.mid}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        accessibilityLabel="Recipient email address"
                      />
                      <TouchableOpacity
                        style={[
                          styles.manualEmailButton,
                          !manualEmailInput.trim().includes('@') && styles.manualEmailButtonDisabled,
                        ]}
                        disabled={!manualEmailInput.trim().includes('@')}
                        onPress={() => {
                          const email = manualEmailInput.trim();
                          setManualRecipient({ name: email, email, organization: null, role: null });
                          setManualEmailInput('');
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: !manualEmailInput.trim().includes('@') }}
                        accessibilityLabel="Use this email address"
                      >
                        <Text style={styles.manualEmailButtonText}>Use</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      onPress={() => (navigation as any).navigate('Home', { screen: 'Profile' })}
                      accessibilityRole="button"
                      accessibilityLabel="Save this recipient in Key Contacts"
                    >
                      <Text style={styles.addressHint}>
                        {emailableContacts.length > 0
                          ? 'Save a new contact in Profile → Key Contacts and it shows up here next time →'
                          : 'Save them in Profile → Key Contacts and Waypoint will address the next one →'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {gmailReady && outgoing?.recipient.contact?.email && (
              <>
                {(() => {
                  const contact = outgoing.recipient.contact;
                  const { title, steps } = sendSteps({
                    locale: funnelLocale,
                    from: gmailEmail,
                    toName: contact.name || contact.email!,
                    cc: ccList.map(ccName),
                    ...sendTracking,
                  });
                  return (
                    <View style={styles.sendSteps} testID="send-steps">
                      <Text
                        style={[styles.sendStepsTitle, { fontSize: Math.round(12.5 * textScale) }]}
                        accessibilityRole="header"
                      >
                        {title}
                      </Text>
                      {steps.map((step, i) => (
                        <View key={i} style={styles.sendStepRow}>
                          <Text style={[styles.sendStepNum, { fontSize: Math.round(14 * textScale), lineHeight: Math.round(20 * textScale) }]}>
                            {i + 1}.
                          </Text>
                          <Text style={[styles.sendStepText, { fontSize: Math.round(14 * textScale), lineHeight: Math.round(20 * textScale) }]}>
                            {step}
                          </Text>
                        </View>
                      ))}
                    </View>
                  );
                })()}
                <TouchableOpacity
                  style={[styles.gmailSendBtn, blanksLeft > 0 && styles.gmailSendBtnDisabled]}
                  onPress={openSendSheet}
                  disabled={gmailSending || blanksLeft > 0}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: gmailSending || blanksLeft > 0 }}
                  accessibilityLabel={
                    blanksLeft > 0
                      ? sendGate.a11y(blanksLeft)
                      : 'Review and send this letter through your connected Gmail'
                  }
                >
                  <Text style={styles.gmailSendText}>
                    📨 Send now with Gmail — replies tracked
                  </Text>
                </TouchableOpacity>
                {blanksLeft > 0 && (
                  <Text style={styles.sendGateHint}>{sendGate.hint(blanksLeft)}</Text>
                )}
              </>
            )}
            <View style={styles.actionRow}>
              <Button title="Copy" onPress={handleCopy} variant="primary" />
              <Button title={target?.label ?? 'Open in Mail app'} onPress={handleSend} variant="outline" />
            </View>
            {/* Saving a draft and confirming it went out are different acts —
                the paper trail should reflect which one happened */}
            <View style={styles.trackBox}>
              {/* The confirmation — and its "logged in your paper trail" claim
                  — only holds while the draft on screen is still the sent one.
                  Edit or regenerate after sending and this correctly hides,
                  rather than asserting a record for text that was never saved. */}
              {markedSent && sentMoment && loggedDraftRef.current === draft ? (
                <View style={styles.sentMoment}>
                  <Text style={styles.sentCelebration}>🎉 {sentMoment.next.celebration}</Text>
                  <Text style={styles.sentDid}>{sentMoment.next.did}</Text>
                  {sentMoment.deadline && (
                    <View style={styles.sentClockChip}>
                      <Text style={styles.sentClockText}>
                        ⏱ {locale === 'es' ? 'Su plazo' : locale === 'vi' ? 'Hạn của họ' : 'Their deadline'}: {sentMoment.deadline.dueOn} ({sentMoment.deadline.daysRemaining} {locale === 'es' ? 'días' : locale === 'vi' ? 'ngày' : 'days'})
                      </Text>
                      <View style={styles.sentClockCitationRow}>
                        <Citation
                          citation={sentMoment.deadline.citation}
                          locale={funnelLocale}
                        />
                      </View>
                    </View>
                  )}
                  {/* The third artifact of a send: it's on the record. The clock
                      (above) and the case (the tracker link below) are the other
                      two — all three visible in one glance (draft flow 9d). */}
                  <View style={styles.sentTrailChip}>
                    <Text style={styles.sentTrailText}>
                      📁 {locale === 'es'
                        ? 'Guardada en su expediente — con fecha y hora'
                        : locale === 'vi'
                          ? 'Đã lưu vào hồ sơ của quý vị — có ngày giờ'
                          : "Logged in your paper trail — dated and time-stamped"}
                    </Text>
                  </View>
                  <Text style={styles.sentSection}>
                    {locale === 'es' ? 'QUÉ SIGUE AHORA' : locale === 'vi' ? 'ĐIỀU GÌ DIỄN RA TIẾP THEO' : 'WHAT HAPPENS NOW'}
                  </Text>
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
                        {locale === 'es'
                          ? '✓ Waypoint lo está siguiendo — véalo en Solicitudes →'
                          : locale === 'vi'
                            ? '✓ Waypoint đang theo dõi — xem trong mục Yêu cầu →'
                            : '✓ Waypoint is tracking this — see it in Requests →'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <Text style={styles.sentFollowUp}>
                    {locale === 'es'
                      ? `¿Nada en ${sentMoment.next.followUpDays} días? Vuelva — la carta de seguimiento está a un toque.`
                      : locale === 'vi'
                        ? `Không có hồi âm sau ${sentMoment.next.followUpDays} ngày? Hãy quay lại — thư nhắc chỉ cần một chạm.`
                        : `Hear nothing in ${sentMoment.next.followUpDays} days? Come back — the follow-up letter is one tap.`}
                  </Text>
                  {/* Close the loop the card opened: one tap back to Home. */}
                  <TouchableOpacity
                    style={styles.sentDoneButton}
                    onPress={() => {
                      // Reset explicitly, don't rely on the pop to unmount —
                      // so returning to Letters never resurfaces a stale letter.
                      reset();
                      (navigation as any).navigate('HomeMain');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      locale === 'es'
                        ? 'Listo — volver al inicio'
                        : locale === 'vi'
                          ? 'Xong — quay lại Trang chính'
                          : 'Done — back to Home'
                    }
                  >
                    <Text style={styles.sentDoneButtonText}>
                      {locale === 'es' ? 'Listo' : locale === 'vi' ? 'Xong' : 'Done'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : markedSent && loggedDraftRef.current === draft ? (
                <Text style={styles.trackSent}>
                  ✅ {locale === 'es'
                    ? 'Marcada como enviada — está en su expediente'
                    : locale === 'vi'
                      ? 'Đã đánh dấu là đã gửi — có trong hồ sơ của quý vị'
                      : "Marked as sent — it's in your paper trail"}
                </Text>
              ) : askingClock && clockDecision.copy ? (
                // Asked BEFORE marking it sent: leave without answering and the
                // letter is still an unsent draft, not a request silently untracked.
                <View style={styles.clockCheck} accessibilityLiveRegion="polite">
                  <Text style={styles.clockCheckQuestion} accessibilityRole="header">
                    {clockDecision.copy.question}
                  </Text>
                  <Text style={styles.trackText}>{clockDecision.copy.explain}</Text>
                  <View style={styles.trackButtons}>
                    {(['yes', 'no'] as const).map((answer) => (
                      <TouchableOpacity
                        key={answer}
                        style={answer === 'yes' ? styles.trackSentButton : styles.trackSaveButton}
                        onPress={() => {
                          setClockAnswer(answer);
                          setAskingClock(false);
                          handleMarkSent({ recordHandOff: true, clock: answer });
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={clockDecision.copy![answer]}
                      >
                        <Text style={answer === 'yes' ? styles.trackSentButtonText : styles.trackSaveText}>
                          {clockDecision.copy![answer]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
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
                      onPress={() =>
                        clockDecision.ask && !clockAnswer
                          ? setAskingClock(true)
                          : handleMarkSent({ recordHandOff: true })
                      }
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
              names. Waypoint drafts these with AI — a starting point, not legal advice.
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
  addressToRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addressToText: { flex: 1 },
  addressLabel: { color: colors.mid, fontWeight: fonts.weights.semibold as '600' },
  recipientChipRow: { flexDirection: 'row', gap: 6, paddingVertical: 6 },
  recipientChip: {
    backgroundColor: colors.light,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 30,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  recipientChipText: { fontSize: fonts.sizes.xs, color: colors.dark },
  manualEmailRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 4 },
  manualEmailInput: {
    flex: 1,
    backgroundColor: colors.light,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    minHeight: 36,
    fontSize: fonts.sizes.xs,
    color: colors.dark,
  },
  manualEmailButton: {
    backgroundColor: colors.teal,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    minHeight: 36,
    justifyContent: 'center',
  },
  manualEmailButtonDisabled: { backgroundColor: colors.mid, opacity: 0.5 },
  manualEmailButtonText: {
    color: colors.white,
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.semibold as '600',
  },
  addressHint: {
    fontSize: fonts.sizes.xs,
    color: colors.teal,
    fontWeight: fonts.weights.medium as '500',
    marginTop: 4,
  },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  gmailSendBtn: {
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  gmailSendText: { color: colors.white, fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold },
  gmailSendBtnDisabled: { backgroundColor: colors.mid, opacity: 0.6 },
  // "When you press Send" (lib/sendSteps.ts) — read before the tap, so it
  // sits above the button and in the brand's pine, not a warning colour.
  sendSteps: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: brand.pine,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 4,
  },
  sendStepsTitle: {
    fontWeight: fonts.weights.extrabold,
    letterSpacing: 0.8,
    color: brand.pine,
    marginBottom: 2,
  },
  sendStepRow: { flexDirection: 'row', gap: 6 },
  sendStepNum: { color: brand.ink, fontWeight: fonts.weights.bold, minWidth: 16 },
  sendStepText: { flex: 1, color: brand.ink },
  ccBlock: { gap: 6, paddingVertical: 4 },
  ccRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  ccNone: { fontSize: fonts.sizes.sm, color: colors.mid },
  ccChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: brand.pineTint,
    borderRadius: radii.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  ccChipText: { fontSize: fonts.sizes.sm, color: brand.pineDeep, fontWeight: fonts.weights.semibold },
  ccChipRemove: { fontSize: fonts.sizes.md, color: brand.inkSoft, fontWeight: fonts.weights.bold },
  ccOffer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ccOfferChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: colors.white,
  },
  ccOfferText: { fontSize: fonts.sizes.sm, color: colors.dark },
  greetingWarning: { fontSize: fonts.sizes.sm, color: semantic.warning, lineHeight: 18, marginTop: 2 },
  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  subjectInput: {
    flex: 1,
    backgroundColor: colors.light,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    minHeight: 32,
    fontSize: fonts.sizes.sm,
    color: colors.dark,
  },
  aiProvenance: {
    fontSize: fonts.sizes.sm,
    color: colors.mid,
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  recordsNote: {
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#A5F3FC',
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  recordsNoteText: { fontSize: fonts.sizes.sm, color: '#155E75', lineHeight: 18 },
  sendGateHint: {
    fontSize: fonts.sizes.sm,
    color: '#B45309',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.xs,
  },
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
  sentClockCitationRow: { marginTop: spacing.xs },
  sentTrailChip: {
    backgroundColor: '#E6F7F1',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  sentTrailText: { color: '#0E7A56', fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold },
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
  sentDoneButton: {
    marginTop: spacing.sm,
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // White on navy (#FFFFFF on #1B2A4A ≈ 12:1) — clears WCAG AA, unlike the
  // teal-on-white it replaced (3.68:1).
  sentDoneButtonText: { color: colors.white, fontWeight: fonts.weights.bold, fontSize: fonts.sizes.base },
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
  clockCheck: { gap: spacing.sm },
  clockCheckQuestion: {
    fontSize: fonts.sizes.base,
    color: colors.navy,
    fontWeight: fonts.weights.bold as '700',
  },
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
