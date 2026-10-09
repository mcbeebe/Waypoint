/**
 * Which system each letter template is written to — and whether a letter
 * actually reached it.
 *
 * WHY: a template's legal clock runs against the agency the template
 * addresses. On 2026-10-07 the Navigator handed a note to a PROVIDER (asking
 * her to put a 1:1 recommendation in writing) to Letters as an IPP meeting
 * request. Sending it opened an "IPP review meeting request" in the Request
 * Tracker, a 30-day Regional Center clock, and a sent moment telling the
 * family the Regional Center now owed them a meeting. None of that was true.
 *
 * The app does not guess which way the mismatch goes. A contact saved under
 * the wrong organization (the contact form starts on "School") would make a
 * real request to a Service Coordinator look like a mismatch, and silently
 * dropping a real statutory clock is worse than tracking a false one. So a
 * mismatch is ASKED about — BEFORE the letter is marked sent, so an
 * unanswered question can never quietly cost a family its deadline (an
 * adversarial review found the first, after-the-send version did exactly
 * that when the parent navigated away).
 *
 * Pure — no react-native imports — so it is unit-tested.
 */
import type { CommunicationOrg } from '@/hooks/useCommunications';
import type { FunnelLocale } from '@/lib/eligibility';
import { orgOptions } from '@/lib/contactsCopy';

/** Which system this letter targets — the paper trail's default label and recipient lookup. */
export const ORG_BY_TEMPLATE: Partial<Record<string, CommunicationOrg>> = {
  appeal_letter: 'insurance', ihss_appeal: 'other',
  rc_request: 'regional_center', dds_4731_complaint: 'regional_center',
  ipp_review_request: 'regional_center', noa_request: 'regional_center',
  rc_timeline_followup: 'regional_center', sdp_info_request: 'regional_center',
  medi_cal_deeming: 'regional_center', delivery_plan_request: 'regional_center',
  ipp_need_request: 'regional_center',
  iep_email: 'school', iep_prep: 'school', assessment_request: 'school',
  progress_data_request: 'school',
  // records_request can go to either system — the actual recipient's
  // organization wins over this default
  records_request: 'school', pwn_request: 'school', cde_complaint: 'school',
  complaint: 'other', general: 'other',
};

/** Written to either system: a records request is as valid to the RC as to the school. */
const EITHER_SYSTEM = new Set(['records_request']);

/**
 * Whether a letter went to the system its template is written to — the only
 * case in which that template's clock, and the sent moment's claims about
 * it, are true.
 *
 * An unknown recipient organization (a typed address, no saved contact)
 * counts as reaching it: nothing contradicts the letter's own wording, and
 * this is how every send behaved before the check existed.
 */
export function reachesTemplateSystem(
  templateKey: string,
  recipientOrg: CommunicationOrg | null | undefined
): boolean {
  const system = ORG_BY_TEMPLATE[templateKey];
  if (!recipientOrg || !system || system === 'other') return true;
  if (EITHER_SYSTEM.has(templateKey)) {
    return recipientOrg === 'school' || recipientOrg === 'regional_center';
  }
  return recipientOrg === system;
}

/**
 * Whether the letter reaches its template's system through anyone on it: the
 * addressee, or a copied person saved under that system (a provider in To with
 * the Service Coordinator in Cc still puts the request in the RC's hands).
 */
export function anyReachesTemplateSystem(
  templateKey: string,
  addresseeOrg: CommunicationOrg | null | undefined,
  ccOrgs: readonly (CommunicationOrg | null | undefined)[] = []
): boolean {
  if (reachesTemplateSystem(templateKey, addresseeOrg)) return true;
  return ccOrgs.some((org) => !!org && reachesTemplateSystem(templateKey, org));
}

export interface ClockCheckCopy {
  question: string;
  explain: string;
  yes: string;
  no: string;
  /** Toast after "no". */
  noClock: string;
}

/**
 * The question asked — before the letter is marked sent — when it is not
 * visibly going to its template's system. Neutral about everyone involved
 * (CLAUDE.md's escalation tone rule): it states what the letter is and where
 * it is going, nothing about who erred. Promises a deadline only when the
 * request has one (`days`); most tracked requests have no statutory clock.
 *
 * Null for a template whose system has no copy here (insurance, other) — the
 * caller asks nothing rather than naming the wrong agency.
 *
 * Spanish and Vietnamese are careful drafts, flagged for native-speaker review
 * like the rest of the funnel copy (see sentNext.ts).
 */
export function clockCheckCopy(
  templateKey: string,
  recipientName: string,
  recipientOrg: CommunicationOrg,
  days: number | null,
  locale: FunnelLocale = 'en'
): ClockCheckCopy | null {
  const L = (en: string, es: string, vi: string) =>
    locale === 'es' ? es : locale === 'vi' ? vi : en;
  const home = ORG_BY_TEMPLATE[templateKey];
  const kind = EITHER_SYSTEM.has(templateKey)
    ? 'either'
    : home === 'school'
      ? 'school'
      : home === 'regional_center'
        ? 'rc'
        : null;
  if (!kind) return null;
  // Spanish contracts "a" + "el" to "al", so it carries the preposition.
  const system = {
    either: L('the Regional Center or the school district', 'al Centro Regional o al distrito escolar', 'Trung tâm Khu vực hoặc học khu'),
    school: L('the school district', 'al distrito escolar', 'học khu'),
    rc: L('the Regional Center', 'al Centro Regional', 'Trung tâm Khu vực'),
  }[kind];
  const saved = orgOptions(locale).find((o) => o.value === recipientOrg)?.label ?? recipientOrg;
  return {
    question: L(
      `Is this a request to ${system}?`,
      `¿Es esta una solicitud ${system}?`,
      `Đây có phải là yêu cầu gửi ${system} không?`
    ),
    explain: L(
      `It's written as a request to ${system}, but it's addressed to ${recipientName}, saved in your contacts under “${saved}”. Waypoint tracks a request only when it reaches ${system}.`,
      `Está escrita como una solicitud ${system}, pero va dirigida a ${recipientName} (contacto en la categoría «${saved}»). Waypoint sigue una solicitud solo cuando llega ${system}.`,
      `Thư được viết như một yêu cầu gửi ${system}, nhưng được gửi đến ${recipientName} (liên hệ thuộc mục “${saved}”). Waypoint chỉ theo dõi yêu cầu khi nó được gửi đến ${system}.`
    ),
    yes: days
      ? L(`Yes — track the ${days}-day deadline`, `Sí — seguir el plazo de ${days} días`, `Có — theo dõi thời hạn ${days} ngày`)
      : L('Yes — track it', 'Sí — darle seguimiento', 'Có — theo dõi'),
    no: L('No — just keep the record', 'No — solo guardar el registro', 'Không — chỉ lưu hồ sơ'),
    noClock: L(
      'Saved to your paper trail. Waypoint isn’t tracking it as a request.',
      'Guardada en su expediente. Waypoint no le da seguimiento como solicitud.',
      'Đã lưu vào hồ sơ. Waypoint không theo dõi thư này như một yêu cầu.'
    ),
  };
}
