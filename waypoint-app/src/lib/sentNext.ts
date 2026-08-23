/**
 * The sent moment (owner feedback, Aug 2026): hitting send on a lever
 * letter is the bravest thing a parent does in this app — it deserves a
 * congratulation, a crisp "what happens now," and expectations set
 * honestly. Per-template because the truth differs: some sends start a
 * legal clock, some don't, and pretending otherwise burns trust.
 *
 * Every entry also says how Waypoint keeps watch: which request row to
 * open (the Request Tracker computes the statutory deadline from it) and
 * when to nudge if silence. Pure data + derivation, no I/O.
 */
import type { RequestType } from '@/lib/requestClocks';

export interface SentNext {
  /** The headline — earned, specific, never generic confetti. */
  celebration: string;
  /** What this send actually did, in one sentence. */
  did: string;
  /** What happens now — 2–4 honest bullets in time order. */
  expectations: string[];
  /**
   * Request-tracker row to open so the clock (when the law gives one) is
   * watched automatically. Null when tracking would duplicate an existing
   * row (e.g. a follow-up letter).
   */
  track: { requestType: RequestType; title: string } | null;
  /** Days of silence before the app suggests the follow-up lever. */
  followUpDays: number;
}

export function sentNextFor(templateKey: string, childName?: string | null): SentNext | null {
  const name = childName || 'your child';
  switch (templateKey) {
    case 'sdp_info_request':
      return {
        celebration: 'You just asked the question most families never do.',
        did: `Only about 1.5% of Regional Center families are enrolled in Self-Determination — asking in writing puts ${name} on the path.`,
        expectations: [
          'Your Service Coordinator should reply with an orientation referral — sessions run regularly, often monthly.',
          `The copies of ${name}'s authorizations are the budget basis — file them when they arrive.`,
          'There is no legal clock on SDP itself (honestly: enrollment typically takes 3–12 months) — but every step along the way can be pushed with the 30-day IPP-meeting rule.',
          'Next milestone: attend the orientation, then get unmet needs written into the IPP BEFORE converting — that protects the budget.',
        ],
        track: { requestType: 'other', title: 'SDP orientation & records request' },
        followUpDays: 14,
      };
    case 'ipp_review_request':
      return {
        celebration: 'You just started a 30-day legal clock.',
        did: 'The Regional Center must hold the IPP meeting within 30 days of your written request — W&I §4646.5(b).',
        expectations: [
          'Expect scheduling contact from your Service Coordinator — days, not weeks.',
          'Waypoint is tracking the 30-day deadline in your Requests.',
          'Before the meeting: write the unmet-needs list — everything you want in the plan, in writing.',
          'No response in 2 weeks? The follow-up letter cites the statute and the date.',
        ],
        track: { requestType: 'ipp_meeting', title: 'IPP review meeting request' },
        followUpDays: 14,
      };
    case 'assessment_request':
      return {
        celebration: 'You just started a 15-day legal clock.',
        did: 'The district must respond with an assessment plan within 15 calendar days — Ed Code §56321.',
        expectations: [
          'An assessment plan arrives for your signature — read it and sign promptly.',
          'After you consent, the district has 60 days to complete the evaluation and hold the IEP meeting.',
          'Waypoint is tracking the 15-day deadline in your Requests.',
          'Silence past the deadline is a violation, not a delay — the follow-up letter says so politely.',
        ],
        track: { requestType: 'iep_evaluation', title: 'Special education evaluation request' },
        followUpDays: 10,
      };
    case 'noa_request':
      return {
        celebration: 'You just turned a hallway "no" into a real decision.',
        did: 'A denial must come as a written Notice of Action with your appeal rights — W&I §4710. Verbal is not a decision.',
        expectations: [
          'The written NOA should arrive promptly — when it does, your appeal clocks start (and Waypoint can draft the appeal).',
          'If it never comes, that silence itself is your evidence — Waypoint is tracking this request.',
          'Keep providing services records in the meantime; nothing about your request pauses.',
        ],
        track: { requestType: 'authorization', title: 'Written Notice of Action demanded' },
        followUpDays: 10,
      };
    case 'records_request':
      return {
        celebration: `You just claimed ${name}'s paper trail.`,
        did: 'Records are the evidence for everything that comes next — IPP reviews, appeals, and the SDP budget basis.',
        expectations: [
          'School records: the district must provide them within 5 business days — Ed Code §56504.',
          'Regional Center records: no fixed statute, but "promptly" is the standard — 2 weeks of silence earns a follow-up.',
          `When they arrive, add the IPP to Waypoint's Documents so everything lives in one place.`,
        ],
        track: { requestType: 'other', title: 'Records request (IPP, assessments, authorizations)' },
        followUpDays: 10,
      };
    case 'rc_timeline_followup':
      return {
        celebration: 'Paper trail reinforced.',
        did: 'A written follow-up citing the statute and the date is exactly what moves stalled requests — and exactly what a hearing officer wants to see if it comes to that.',
        expectations: [
          'Agencies usually move within days of a statute-citing follow-up.',
          'If this one goes unanswered too, the next step is a §4731 complaint — Waypoint can draft it.',
        ],
        track: null, // it follows up an existing tracked request
        followUpDays: 7,
      };
    default:
      return null;
  }
}
