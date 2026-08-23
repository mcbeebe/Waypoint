/**
 * Path decision aid (PRD W-G: G2) — traditional POS vs Self-Determination,
 * answered honestly from three questions. The catches are stated, never
 * hidden: SDP budgets anchor to authorization history + documented needs,
 * it is all-in, and it carries admin. Pure logic, no I/O.
 */

export interface PathAnswers {
  /** Is the child already receiving RC-purchased services regularly? */
  hasAuthorizationHistory: boolean | null;
  /** Are the family's unmet needs written into the IPP? */
  unmetNeedsDocumented: boolean | null;
  /** Does the family want to direct services (and take on the admin)? */
  wantsControl: boolean | null;
}

export type PathRecommendation =
  | 'incomplete'
  | 'stay_traditional'
  | 'document_first'
  | 'sdp_ready';

export interface PathResult {
  recommendation: PathRecommendation;
  headline: string;
  body: string;
  /** Letter template that pulls the next lever, when one applies. */
  leverTemplate: string | null;
  leverLabel: string | null;
}

export function decidePath(answers: PathAnswers): PathResult {
  const { hasAuthorizationHistory, unmetNeedsDocumented, wantsControl } = answers;

  if (
    hasAuthorizationHistory === null ||
    unmetNeedsDocumented === null ||
    wantsControl === null
  ) {
    return {
      recommendation: 'incomplete',
      headline: 'Answer the three questions',
      body: 'Your answers stay on this screen — they just shape the recommendation.',
      leverTemplate: null,
      leverLabel: null,
    };
  }

  if (!wantsControl) {
    return {
      recommendation: 'stay_traditional',
      headline: 'The traditional path may serve you better — with the levers',
      body: 'Self-Determination hands your family the admin along with the control. If that trade isn’t right now, staying on the traditional path and working the levers — written requests, the 30-day IPP meeting, written Notices of Action — is a legitimate strategy, and you can revisit SDP any time.',
      leverTemplate: 'ipp_review_request',
      leverLabel: 'Work the levers: request an IPP meeting',
    };
  }

  if (!unmetNeedsDocumented) {
    return {
      recommendation: 'document_first',
      headline: 'Document first — then convert',
      body: 'Your starting SDP budget is built from the last 12 months of authorized services PLUS unmet needs documented in the IPP. Converting before the needs are in writing locks in a smaller budget. Get them into the IPP first — the meeting must happen within 30 days of your written request.',
      leverTemplate: 'ipp_review_request',
      leverLabel: 'Request the IPP meeting (30-day clock)',
    };
  }

  return {
    recommendation: 'sdp_ready',
    headline: 'Self-Determination looks like a fit',
    body: hasAuthorizationHistory
      ? 'You have authorization history to seed a real budget and documented needs to grow it. Next step: the SDP orientation and a written request for your child’s authorization records — the budget basis.'
      : 'With little authorization history, your budget will lean on the unmet needs documented in your IPP — make sure they are thorough. Next step: the SDP orientation and a written information request.',
    leverTemplate: 'sdp_info_request',
    leverLabel: 'Ask about Self-Determination in writing',
  };
}
