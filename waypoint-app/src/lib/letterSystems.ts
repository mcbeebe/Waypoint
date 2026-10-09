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
 * mismatch is ASKED about, and the clock starts only on "yes".
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

export interface ClockCheckCopy {
  question: string;
  explain: string;
  yes: string;
  no: string;
  /** Toast after "no". */
  noClock: string;
}

/**
 * The question asked after a send that did not visibly reach its template's
 * system. Neutral about everyone involved (CLAUDE.md's escalation tone rule):
 * it states what the letter is and where it went, nothing about who erred.
 */
export function clockCheckCopy(
  templateKey: string,
  recipientName: string,
  recipientOrg: CommunicationOrg,
  locale: FunnelLocale = 'en'
): ClockCheckCopy {
  const L = (en: string, es: string, vi: string) =>
    locale === 'es' ? es : locale === 'vi' ? vi : en;
  const kind = EITHER_SYSTEM.has(templateKey)
    ? 'either'
    : ORG_BY_TEMPLATE[templateKey] === 'school'
      ? 'school'
      : 'rc';
  // Spanish contracts "a" + "el" to "al", so it carries the preposition.
  const system = {
    either: L('the Regional Center or the school district', 'al Centro Regional o al distrito escolar', 'Trung tâm Khu vực hoặc học khu'),
    school: L('the school district', 'al distrito escolar', 'học khu'),
    rc: L('the Regional Center', 'al Centro Regional', 'Trung tâm Khu vực'),
  }[kind];
  const saved = orgOptions(locale).find((o) => o.value === recipientOrg)?.label ?? recipientOrg;
  return {
    question: L(`Did this go to ${system}?`, `¿Esto fue ${system}?`, `Thư này có gửi đến ${system} không?`),
    explain: L(
      `This letter is written as a request to ${system}, but it went to ${recipientName}, saved in your contacts under ${saved}. Waypoint tracks the deadline only when the request reaches ${system}.`,
      `Esta carta está escrita como una solicitud ${system}, pero fue a ${recipientName}, guardado/a en sus contactos como ${saved}. Waypoint sigue el plazo solo cuando la solicitud llega ${system}.`,
      `Thư này được viết như một yêu cầu gửi ${system}, nhưng đã gửi đến ${recipientName}, được lưu trong danh bạ dưới mục ${saved}. Waypoint chỉ theo dõi thời hạn khi yêu cầu đến ${system}.`
    ),
    yes: L('Yes — track the deadline', 'Sí — seguir el plazo', 'Có — theo dõi thời hạn'),
    no: L('No — just keep the record', 'No — solo guardar el registro', 'Không — chỉ lưu hồ sơ'),
    noClock: L(
      'Saved to your paper trail. No deadline is being tracked for it.',
      'Guardado en su expediente. No se está siguiendo ningún plazo.',
      'Đã lưu vào hồ sơ. Không theo dõi thời hạn nào cho thư này.'
    ),
  };
}
