/**
 * Single source of truth for dollar figures and rate-bearing facts
 * (REQ-1003). The 2024 SSI figure survived in four files precisely because
 * each carried its own literal — a figure changes here, in ONE line, and a
 * test (contentFacts.test.ts) proves no literal duplicates remain.
 *
 * Every entry carries its source and the date it was last verified.
 */

/** SSI federal benefit rate for an individual, monthly. */
export const SSI_FBR_MONTHLY = 994;
export const SSI_YEAR = 2026;
/** Source: SSA 2026 COLA fact sheet (2.8% COLA; $967 → $994) · verified 2026-08-23 */
export const SSI_MONTHLY_LABEL = `$${SSI_FBR_MONTHLY}/month (${SSI_YEAR} federal rate, adjusted annually; CA adds a state supplement)`;
export const SSI_MONTHLY_SHORT = `~$${SSI_FBR_MONTHLY}/mo (${SSI_YEAR})`;

/** CalABLE annual contribution limit. Source: gift-tax exclusion tracking · verified 2026-08-23 */
export const CALABLE_ANNUAL_LIMIT = 20000;
/** ABLE age-of-onset ceiling. Source: ABLE Age Adjustment Act, eff. 2026-01-01 · verified 2026-08-23 */
export const ABLE_ONSET_AGE = 46;

/** SDP initial person-centered plan reimbursement cap. Source: DDS PCP funding guidance (code 024) · verified 2026-08-23 */
export const SDP_PCP_CAP = 1000;
/** SDP pre-enrollment transition-support hour cap. Source: DDS July 2024 guidance (code 099) · verified 2026-08-23 */
export const SDP_TRANSITION_HOURS_CAP = 40;

/** Statutory clocks (days). Sources: W&I §4643, §4646, §4646.5(b); Ed Code §56321, §56344 · verified 2026-08-23 */
export const RC_ASSESSMENT_DAYS = 120;
export const RC_ASSESSMENT_URGENT_DAYS = 60;
export const IPP_AFTER_ASSESSMENT_DAYS = 60;
export const IPP_REVIEW_MEETING_DAYS = 30;
export const IEP_ASSESSMENT_PLAN_DAYS = 15;
export const IEP_COMPLETE_DAYS = 60;
