/**
 * Request Case File (Roadmap/Request-Case-File-Plan.md) — one request,
 * one thread, one honest clock. Pure assembly and derivation over
 * family_requests + communications; no I/O, trilingual via L(en,es,vi).
 *
 * The two honesty rules everything here rests on:
 * - eventAt(): logCommunication stamps sent_at = now() even on backdated
 *   entries, so only Gmail-carried rows may order by sent_at — everything
 *   else orders by occurred_at. Governs thread order, silence-days, and
 *   export chronology.
 * - Ambiguity guard: a Gmail thread whose members resolve to more than
 *   one request contributes nothing by thread-closure — mis-attribution
 *   is worse evidence than omission.
 *
 * Escalation is collaborative-first by construction: an unanswered
 * incoming reply nulls the next lever — silence, not conversation,
 * climbs the ladder.
 */
import type { FamilyRequest } from '@/hooks/useRequests';
import type { Communication } from '@/hooks/useCommunications';
import { deadlineFor } from '@/lib/requestClocks';
import type { RequestDeadline, RequestType } from '@/lib/requestClocks';
import { sentNextFor } from '@/lib/sentNext';
import type { FunnelLocale } from '@/lib/eligibility';
import type { ToolBadge } from '@/lib/toolsCatalog';

function picker(locale: FunnelLocale) {
  return (en: string, es: string, vi: string) =>
    locale === 'es' ? es : locale === 'vi' ? vi : en;
}

export type CaseStage = 'ask' | 'follow_up' | 'formal';
export type ProvenanceTier = 'gmail' | 'contemporaneous' | 'recalled';
export type CaseLinkage = 'request_id' | 'origin_letter' | 'gmail_thread';
export type CaseRole = 'ask' | 'follow_up' | 'formal' | 'reply' | 'call' | 'meeting' | 'note';

export interface CaseEvent {
  communication: Communication;
  /** The honest event time — see eventAt(). */
  when: string;
  role: CaseRole;
  linkage: CaseLinkage;
  provenance: ProvenanceTier;
}

export interface NextLever {
  template: string;
  label: string;
  /** Which rung this lever occupies (1 ask · 2 follow-up · 3 formal). */
  rung: 1 | 2 | 3;
  /** Why this is the next move, in the parent's language. */
  reason: string;
  /** True when the honest advice is a fresh written ask, not escalation. */
  reAskInstead: boolean;
}

export interface RequestCase {
  request: FamilyRequest;
  events: CaseEvent[];
  deadline: RequestDeadline | null;
  stage: CaseStage;
  /** Newest incoming event with nothing outgoing after it, else null. */
  unansweredReply: Communication | null;
  /** Null while a reply is unanswered, the case is closed, or nothing applies. */
  nextLever: NextLever | null;
  /** Whole days since the last outgoing item went unanswered; null if answered. */
  daysSilent: number | null;
  backdated: boolean;
  /** e.g. "Asked by phone May 2 · logged in Waypoint Aug 29" */
  provenanceLine: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const OPEN_STATUSES = new Set(['requested', 'in_progress']);
/** Statuses whose case still has live work: open clocks, or a denial being contested. */
const ACTIVE_STATUSES = new Set(['requested', 'in_progress', 'denied']);

/** The LOCAL calendar date of a timestamp, matching how date-only fields are entered. */
function localDateOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Templates that occupy each rung when they appear as sent outgoing items. */
const RUNG_BY_TEMPLATE: Record<string, CaseStage> = {
  ipp_review_request: 'ask',
  assessment_request: 'ask',
  rc_request: 'ask',
  records_request: 'ask',
  sdp_info_request: 'ask',
  medi_cal_deeming: 'ask',
  delivery_plan_request: 'ask',
  progress_data_request: 'ask',
  iep_email: 'ask',
  general: 'ask',
  rc_timeline_followup: 'follow_up',
  noa_request: 'follow_up',
  pwn_request: 'follow_up',
  dds_4731_complaint: 'formal',
  cde_complaint: 'formal',
  complaint: 'formal',
  appeal_letter: 'formal',
  ihss_appeal: 'formal',
};

const STAGE_ORDER: Record<CaseStage, number> = { ask: 1, follow_up: 2, formal: 3 };

/**
 * The friendly FIRST written ask per type (rung 1). Deliberately never a
 * denial-premised letter: REQUEST_LEVERS points service requests at
 * noa_request ("I was told no — put it in writing"), which is the right
 * tracker lever for an overdue clock but the wrong first words for a family
 * that simply hasn't asked in writing yet.
 */
const FIRST_ASK_TEMPLATE: Record<RequestType, string> = {
  rc_intake: 'rc_request',
  rc_assessment: 'rc_request',
  ipp_meeting: 'ipp_review_request',
  service_request: 'rc_request',
  authorization: 'rc_request',
  reimbursement: 'rc_request',
  iep_evaluation: 'assessment_request',
  other: 'general',
};

/**
 * The rung-2 follow-up per type — always a template deriveStage classifies
 * as follow_up (or, for 'other', an ask that the repeated-ask rule
 * advances), so sending the lever the case offers actually moves the rung.
 */
const FOLLOW_UP_TEMPLATE: Record<RequestType, string> = {
  rc_intake: 'rc_timeline_followup',
  rc_assessment: 'rc_timeline_followup',
  ipp_meeting: 'rc_timeline_followup',
  service_request: 'rc_timeline_followup',
  authorization: 'rc_timeline_followup',
  reimbursement: 'rc_timeline_followup',
  iep_evaluation: 'pwn_request',
  other: 'general',
};

/** Formal-rung venue is system-correct: school disputes go to CDE, RC to §4731. */
function formalTemplateFor(type: RequestType): string {
  if (type === 'iep_evaluation') return 'cde_complaint';
  if (type === 'other') return 'complaint';
  return 'dds_4731_complaint';
}

/**
 * The honest event time. Hand-logged rows get sent_at stamped "now" by
 * logCommunication even when backdated, so only Gmail-carried rows may
 * trust sent_at; everything else uses occurred_at.
 */
export function eventAt(c: Communication): string {
  if (c.gmail_message_id) return c.sent_at ?? c.occurred_at;
  return c.occurred_at;
}

/** How trustworthy this item's date is — shown, never hidden. */
export function provenanceOf(c: Communication): ProvenanceTier {
  if (c.gmail_message_id) return 'gmail';
  const recorded = new Date(c.created_at).getTime();
  const happened = new Date(c.occurred_at).getTime();
  if (Number.isFinite(recorded) && Number.isFinite(happened) &&
      recorded - happened <= 48 * 60 * 60 * 1000) {
    return 'contemporaneous';
  }
  return 'recalled';
}

function roleOf(c: Communication): CaseRole {
  if (c.direction === 'incoming') return 'reply';
  if (c.kind === 'call') return 'call';
  if (c.kind === 'meeting') return 'meeting';
  if (c.kind === 'note') return 'note';
  const stage = c.template_key ? RUNG_BY_TEMPLATE[c.template_key] : undefined;
  return stage ?? 'ask';
}

/**
 * All communications belonging to a request: explicit request_id, the 045
 * origin letter, then Gmail-thread closure over the ids collected so far —
 * with the ambiguity guard. Works pre-047 via the legacy paths.
 */
export function threadFor(
  request: FamilyRequest,
  communications: Communication[]
): CaseEvent[] {
  const byId = new Map<string, { c: Communication; linkage: CaseLinkage }>();
  for (const c of communications) {
    if (c.request_id === request.id) byId.set(c.id, { c, linkage: 'request_id' });
  }
  if (request.communication_id) {
    const origin = communications.find((c) => c.id === request.communication_id);
    if (origin && !byId.has(origin.id)) byId.set(origin.id, { c: origin, linkage: 'origin_letter' });
  }
  // Thread closure — only over threads that resolve to exactly this request.
  const threads = new Set<string>();
  for (const { c } of byId.values()) {
    if (c.gmail_thread_id) threads.add(c.gmail_thread_id);
  }
  for (const threadId of threads) {
    const owners = new Set<string>();
    for (const c of communications) {
      if (c.gmail_thread_id === threadId && c.request_id) owners.add(c.request_id);
    }
    if (owners.size > 1) continue; // ambiguous thread: contributes nothing
    for (const c of communications) {
      if (c.gmail_thread_id === threadId && !byId.has(c.id)) {
        byId.set(c.id, { c, linkage: 'gmail_thread' });
      }
    }
  }
  return [...byId.values()]
    .map(({ c, linkage }) => ({
      communication: c,
      when: eventAt(c),
      role: roleOf(c),
      linkage,
      provenance: provenanceOf(c),
    }))
    .sort((a, b) => a.when.localeCompare(b.when));
}

/**
 * Highest rung with a SENT outgoing event on record. A second sent ask
 * counts as the follow-up rung — asking twice IS following up, which also
 * lets 'other'-type cases (whose follow-up letter is another general ask)
 * climb the ladder.
 */
export function deriveStage(events: CaseEvent[]): CaseStage {
  let stage: CaseStage = 'ask';
  let sentAsks = 0;
  for (const e of events) {
    const c = e.communication;
    if (c.direction !== 'outgoing' || c.status !== 'sent' || !c.template_key) continue;
    const s = RUNG_BY_TEMPLATE[c.template_key];
    if (!s) continue;
    if (s === 'ask') sentAsks += 1;
    if (STAGE_ORDER[s] > STAGE_ORDER[stage]) stage = s;
  }
  if (stage === 'ask' && sentAsks >= 2) stage = 'follow_up';
  return stage;
}

function lastOutgoingSent(events: CaseEvent[]): CaseEvent | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.communication.direction === 'outgoing' && e.communication.status === 'sent') return e;
  }
  return null;
}

/**
 * The newest incoming item with no SENT outgoing response after it. A
 * private note or an unsent draft never "answers" the agency — only
 * something that actually went to them (letter, email, call, meeting) does.
 */
function unansweredReplyOf(events: CaseEvent[]): Communication | null {
  let reply: Communication | null = null;
  for (const e of events) {
    const c = e.communication;
    if (c.direction === 'incoming') {
      reply = c;
    } else if (reply && c.status === 'sent' && c.kind !== 'note') {
      reply = null;
    }
  }
  return reply;
}

/** Days a request has been asked with no written record at all. */
const STALE_ASK_DAYS = 90;

function nextLeverFor(
  request: FamilyRequest,
  events: CaseEvent[],
  stage: CaseStage,
  deadline: RequestDeadline | null,
  daysSilent: number | null,
  locale: FunnelLocale,
  now: Date
): NextLever | null {
  const L = picker(locale);
  if (!OPEN_STATUSES.has(request.status) && request.status !== 'denied') return null;
  // Conversation never climbs the ladder.
  if (unansweredReplyOf(events)) return null;

  const outgoing = lastOutgoingSent(events);

  // Denied → the written Notice of Action is the next rung, whatever the
  // stage — unless it has already been requested, in which case the ball is
  // in their court and re-offering the same letter invites duplicate sends.
  if (request.status === 'denied') {
    const noaSent = events.some(
      (e) =>
        e.communication.direction === 'outgoing' &&
        e.communication.status === 'sent' &&
        e.communication.template_key === 'noa_request'
    );
    if (noaSent) return null;
    return {
      template: 'noa_request',
      label: L('Request the written decision', 'Solicitar la decisión por escrito', 'Yêu cầu quyết định bằng văn bản'),
      rung: 2,
      reason: L(
        'A verbal no is not a decision — the written Notice of Action starts your appeal rights.',
        'Un "no" verbal no es una decisión — la Notificación de Acción escrita inicia sus derechos de apelación.',
        'Từ chối miệng không phải là quyết định — Thông báo Hành động bằng văn bản khởi động quyền kháng cáo của quý vị.'
      ),
      reAskInstead: false,
    };
  }

  // Nothing on record in writing yet (phone-tracked ask). The first written
  // move is always the friendly ask — never a denial-premised letter.
  if (!outgoing) {
    const daysSinceAsk = Math.floor(
      (now.getTime() - new Date(`${request.requested_on}T00:00:00`).getTime()) / MS_PER_DAY
    );
    const stale = daysSinceAsk > STALE_ASK_DAYS;
    return {
      template: FIRST_ASK_TEMPLATE[request.request_type],
      label: stale
        ? L('Ask again, fresh and in writing', 'Pida de nuevo, por escrito', 'Đề nghị lại, bằng văn bản')
        : L('Put the ask in writing — warmly', 'Ponga la petición por escrito — con calidez', 'Viết lời đề nghị ra văn bản — thân thiện'),
      rung: 1,
      reason: stale
        ? L(
            'That ask is months old — a fresh written request restarts an enforceable clock today.',
            'Esa petición tiene meses — una solicitud escrita nueva reinicia un plazo exigible hoy.',
            'Lời đề nghị đó đã nhiều tháng — một yêu cầu văn bản mới khởi động lại thời hạn có hiệu lực từ hôm nay.'
          )
        : L(
            'A written ask is what makes their deadline real. We write it with you, friendly first.',
            'Una petición escrita hace real su plazo. La escribimos con usted, amistosa primero.',
            'Đề nghị bằng văn bản làm thời hạn của họ có hiệu lực. Chúng tôi soạn cùng quý vị, thân thiện trước.'
          ),
      reAskInstead: stale,
    };
  }

  // Something is in writing. Silence gates every further rung.
  const followUpDays =
    (outgoing.communication.template_key
      ? sentNextFor(outgoing.communication.template_key)?.followUpDays
      : undefined) ?? 14;
  const deadlinePassed = deadline?.overdue === true;
  const quietLongEnough = daysSilent !== null && daysSilent >= followUpDays;
  if (!quietLongEnough && !deadlinePassed) return null;

  if (stage === 'ask') {
    return {
      template: FOLLOW_UP_TEMPLATE[request.request_type],
      label: L('Send the friendly follow-up', 'Enviar el seguimiento amistoso', 'Gửi thư nhắc thân thiện'),
      rung: 2,
      reason: deadlinePassed
        ? L(
            'Their legal deadline has passed — a follow-up citing the date usually moves things in days.',
            'Su plazo legal ya pasó — un seguimiento citando la fecha suele mover las cosas en días.',
            'Thời hạn pháp lý của họ đã qua — thư nhắc nêu ngày thường làm mọi việc chuyển động trong vài ngày.'
          )
        : L(
            `It's been ${daysSilent} days of silence. Silence, not conversation, climbs the ladder.`,
            `Han pasado ${daysSilent} días de silencio. El silencio, no la conversación, sube la escalera.`,
            `Đã ${daysSilent} ngày im lặng. Im lặng, chứ không phải trò chuyện, mới leo nấc thang.`
          ),
      reAskInstead: false,
    };
  }

  // Follow-up already sent and still silent → the formal rung, system-correct.
  if (stage === 'follow_up') {
    return {
      template: formalTemplateFor(request.request_type),
      label: L('Start the formal complaint', 'Iniciar la queja formal', 'Bắt đầu khiếu nại chính thức'),
      rung: 3,
      reason: L(
        'You asked nicely, you followed up, and they stayed silent — the formal complaint has its own legal response clock.',
        'Pidió con cortesía, dio seguimiento, y siguieron en silencio — la queja formal tiene su propio plazo legal de respuesta.',
        'Quý vị đã đề nghị lịch sự, đã nhắc, và họ vẫn im lặng — khiếu nại chính thức có thời hạn trả lời pháp lý riêng.'
      ),
      reAskInstead: false,
    };
  }

  // The formal complaint is filed — its own response clock runs now, and
  // re-offering the same complaint is not a next move. The ladder ends here.
  return null;
}

/** Assemble the full case. */
export function buildRequestCase(
  request: FamilyRequest,
  communications: Communication[],
  locale: FunnelLocale = 'en',
  now = new Date()
): RequestCase {
  const L = picker(locale);
  const events = threadFor(request, communications);
  const deadline = deadlineFor(request.request_type, request.requested_on, now);
  const stage = deriveStage(events);
  const unanswered = unansweredReplyOf(events);

  const outgoing = lastOutgoingSent(events);
  let daysSilent: number | null = null;
  if (outgoing && !unanswered) {
    daysSilent = Math.max(
      0,
      Math.floor((now.getTime() - new Date(outgoing.when).getTime()) / MS_PER_DAY)
    );
  }

  const recorded = new Date(request.created_at);
  const asked = new Date(`${request.requested_on}T00:00:00`);
  // requested_on is a local calendar date; compare against created_at's
  // LOCAL date too, or an evening save gets falsely flagged as backdated.
  const backdated = request.requested_on < localDateOf(request.created_at);
  const fmt = (d: Date) =>
    d.toLocaleDateString(locale === 'es' ? 'es-US' : locale === 'vi' ? 'vi-VN' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  const channelWord =
    request.channel === 'phone'
      ? L('by phone', 'por teléfono', 'qua điện thoại')
      : request.channel === 'in_person' || request.channel === 'in person'
        ? L('in person', 'en persona', 'trực tiếp')
        : L('', '', '');
  const provenanceLine = backdated
    ? L(
        `Asked ${channelWord} ${fmt(asked)} · logged in Waypoint ${fmt(recorded)}`,
        `Pedido ${channelWord} ${fmt(asked)} · registrado en Waypoint ${fmt(recorded)}`,
        `Đã đề nghị ${channelWord} ${fmt(asked)} · ghi vào Waypoint ${fmt(recorded)}`
      ).replace(/\s+/g, ' ').trim()
    : L(`Asked ${fmt(asked)}`, `Pedido ${fmt(asked)}`, `Đã đề nghị ${fmt(asked)}`);

  return {
    request,
    events,
    deadline,
    stage,
    unansweredReply: unanswered,
    daysSilent,
    nextLever: nextLeverFor(request, events, stage, deadline, daysSilent, locale, now),
    backdated,
    provenanceLine,
  };
}

// ─── Badge the job, not the channel ─────────────────────────────────────────

/**
 * The request a communication belongs to, via request_id, the 045 origin
 * letter, or thread linkage — the same three paths threadFor walks, so a
 * founding-thread reply on a pre-047 database still finds its case.
 */
export function requestForCommunication(
  c: Communication,
  requests: FamilyRequest[],
  communications: Communication[]
): FamilyRequest | null {
  if (c.request_id) return requests.find((r) => r.id === c.request_id) ?? null;
  const byOrigin = requests.find((r) => r.communication_id === c.id);
  if (byOrigin) return byOrigin;
  if (!c.gmail_thread_id) return null;
  const owners = new Set<string>();
  for (const other of communications) {
    if (other.gmail_thread_id !== c.gmail_thread_id) continue;
    if (other.request_id) {
      owners.add(other.request_id);
    } else {
      const origin = requests.find((r) => r.communication_id === other.id);
      if (origin) owners.add(origin.id);
    }
  }
  if (owners.size !== 1) return null; // ambiguity guard, again
  const [ownerId] = owners;
  return requests.find((r) => r.id === ownerId) ?? null;
}

/**
 * The ACTIVE request a reply belongs to — the one whose case file should
 * own it. A reply on a granted/withdrawn request has no live case work, so
 * it stays with the generic Sent & Received surfaces instead of vanishing
 * behind a closed case.
 */
export function activeRequestForReply(
  c: Communication,
  requests: FamilyRequest[],
  communications: Communication[]
): FamilyRequest | null {
  const r = requestForCommunication(c, requests, communications);
  return r && ACTIVE_STATUSES.has(r.status) ? r : null;
}

/**
 * Home badge for Requests & Deadlines, case-aware: a reply on a tracked
 * request beats everything (it's the moment to act), then overdue, then
 * near deadlines, then a waiting count. Null when nothing is open.
 */
export function caseBadge(
  requests: FamilyRequest[],
  communications: Communication[],
  locale: FunnelLocale = 'en',
  now = new Date()
): ToolBadge | null {
  const L = picker(locale);
  // Replies surface for every ACTIVE case (a denial's thread is still live
  // work); clocks and waiting counts only for open ones.
  const active = requests.filter((r) => ACTIVE_STATUSES.has(r.status));
  const open = requests.filter((r) => OPEN_STATUSES.has(r.status));
  if (active.length === 0) return null;
  const cases = active.map((r) => buildRequestCase(r, communications, locale, now));
  const withReply = cases.filter((c) => c.unansweredReply);
  if (withReply.length > 0) {
    return {
      text:
        withReply.length === 1
          ? L('1 new reply', '1 respuesta nueva', '1 trả lời mới')
          : L(`${withReply.length} new replies`, `${withReply.length} respuestas nuevas`, `${withReply.length} trả lời mới`),
      tone: 'info',
    };
  }
  const openCases = cases.filter((c) => OPEN_STATUSES.has(c.request.status));
  if (openCases.length === 0) return null;
  const overdue = openCases.filter((c) => c.deadline?.overdue).length;
  if (overdue > 0) {
    return {
      text: overdue === 1 ? L('1 overdue', '1 vencida', '1 quá hạn') : L(`${overdue} overdue`, `${overdue} vencidas`, `${overdue} quá hạn`),
      tone: 'danger',
    };
  }
  const soonest = openCases
    .map((c) => c.deadline)
    .filter((d): d is RequestDeadline => d != null)
    .sort((a, b) => a.daysRemaining - b.daysRemaining)[0];
  if (soonest && soonest.daysRemaining <= 7) {
    const day = new Date(`${soonest.dueOn}T00:00:00`).toLocaleDateString(
      locale === 'es' ? 'es-US' : locale === 'vi' ? 'vi-VN' : 'en-US',
      { weekday: 'short' }
    );
    return { text: L(`due ${day}`, `vence ${day}`, `hạn ${day}`), tone: 'warning' };
  }
  return {
    text:
      open.length === 1
        ? L('1 waiting', '1 en espera', '1 đang chờ')
        : L(`${open.length} waiting`, `${open.length} en espera`, `${open.length} đang chờ`),
    tone: 'warning',
  };
}

/**
 * The unanswered reply that does NOT belong to any ACTIVE tracked request —
 * the generic Sent & Received badge and Home reply card use this, so
 * replies about live cases surface on the case instead (badge the job),
 * while a reply on a granted/withdrawn request still surfaces somewhere.
 */
export function isReplyOutsideRequests(
  reply: Communication,
  requests: FamilyRequest[],
  communications: Communication[]
): boolean {
  return activeRequestForReply(reply, requests, communications) == null;
}
