/**
 * Eligibility derivation (PRD W-B: B1) — turns onboarding data into an
 * answer: what this child likely qualifies for, with the statute and a
 * review date on every card. Pure logic, no I/O.
 *
 * Honesty rules (from the mockup review): no dollar value we can't derive,
 * "likely eligible" vs "needs review" is never a false binary, and every
 * card carries its citation + last-reviewed date (content provenance).
 */
import type { RcStatus, IepStatus } from '@/types/database';

export type EligibilityStatus = 'enrolled' | 'likely' | 'review' | 'later';

export interface EligibilityCard {
  key: string;
  title: string;
  body: string;
  status: EligibilityStatus;
  statusLabel: string;
  /** A fact line, e.g. "2026 federal rate · $994/mo + CA supplement". */
  factLabel: string | null;
  factValue: string | null;
  citation: string;
  reviewedOn: string; // ISO date the content was last verified
}

export interface EligibilityInput {
  ageYears: number | null;
  rcStatus: RcStatus | null | undefined;
  iepStatus: IepStatus | null | undefined;
  hasDiagnosis: boolean;
}

export interface EligibilityResult {
  cards: EligibilityCard[];
  /** Programs shown as likely/enrolled — the hero number. */
  likelyCount: number;
}

const REVIEWED = '2026-08-23'; // bump when card content is re-verified

export function deriveEligibility(input: EligibilityInput): EligibilityResult {
  const { ageYears, rcStatus, iepStatus, hasDiagnosis } = input;
  const cards: EligibilityCard[] = [];

  // Early Start — under 3
  if (ageYears !== null && ageYears < 3) {
    cards.push({
      key: 'early_start',
      title: 'Early Start (ages 0–3)',
      body: 'Early intervention through your Regional Center — evaluations and services for infants and toddlers, at no cost.',
      status: 'likely',
      statusLabel: 'Likely eligible',
      factLabel: 'Who runs it',
      factValue: 'Your Regional Center (IDEA Part C)',
      citation: 'IDEA Part C · Early Start',
      reviewedOn: REVIEWED,
    });
  }

  // Regional Center (Lanterman) — the anchor card
  if (rcStatus === 'active') {
    cards.push({
      key: 'regional_center',
      title: 'Regional Center services',
      body: 'Your child is a Regional Center consumer. Services flow from the IPP — and you can request an IPP review meeting at any time (they must hold it within 30 days).',
      status: 'enrolled',
      statusLabel: 'Enrolled ✓',
      factLabel: 'Your lever',
      factValue: 'IPP review meeting · 30 days',
      citation: 'W&I §4646.5(b)',
      reviewedOn: REVIEWED,
    });
  } else {
    cards.push({
      key: 'regional_center',
      title: 'Regional Center services',
      body: 'Respite, behavior support, and family services under the Lanterman Act — no income test, no waiting list, no cost to families.',
      status: hasDiagnosis ? 'likely' : 'review',
      statusLabel: hasDiagnosis ? 'Likely eligible' : 'Needs review',
      factLabel: 'Decision clock',
      factValue: 'Assessment ≤120 days from intake',
      citation: 'Lanterman Act, W&I §4512 · §4643',
      reviewedOn: REVIEWED,
    });
  }

  // SDP — only real once a consumer
  cards.push(
    rcStatus === 'active'
      ? {
          key: 'sdp',
          title: 'Self-Determination Program',
          body: 'Turn Regional Center services into an annual budget your family directs. Open to nearly every consumer — about 1.5% are enrolled, because families are rarely told.',
          status: 'likely',
          statusLabel: 'Likely eligible',
          factLabel: 'Budget basis',
          factValue: 'Last 12 months of authorized services + documented unmet needs',
          citation: 'W&I §4685.8',
          reviewedOn: REVIEWED,
        }
      : {
          key: 'sdp',
          title: 'Self-Determination Program',
          body: 'Once your child is a Regional Center consumer, services can become a budget your family directs. One step at a time — Regional Center first.',
          status: 'later',
          statusLabel: 'After enrollment',
          factLabel: null,
          factValue: null,
          citation: 'W&I §4685.8',
          reviewedOn: REVIEWED,
        }
  );

  // Special education — 3 to 22, no active IEP yet
  if (
    ageYears !== null &&
    ageYears >= 3 &&
    ageYears < 22 &&
    (iepStatus === 'no' || iepStatus === 'unknown' || iepStatus === 'eval_done')
  ) {
    cards.push({
      key: 'iep',
      title: 'Special education evaluation (IEP)',
      body: 'A written request starts a legal clock: the district must give you an assessment plan within 15 calendar days.',
      status: 'likely',
      statusLabel: 'Your right',
      factLabel: 'Clock',
      factValue: '15 days to assessment plan · 60 days to complete',
      citation: 'Ed Code §56321 · §56344',
      reviewedOn: REVIEWED,
    });
  }

  // SSI — always income-dependent, never a false promise
  cards.push({
    key: 'ssi',
    title: 'Supplemental Security Income',
    body: "Monthly payments for a disabled child — depends on household income and it's not automatic, so we'd check with you.",
    status: 'review',
    statusLabel: 'Needs review',
    factLabel: '2026 federal rate',
    factValue: '$994/mo + CA supplement',
    citation: 'SSA 2026 COLA',
    reviewedOn: REVIEWED,
  });

  // IHSS — income-independent for the child, but assessment-dependent
  cards.push({
    key: 'ihss',
    title: 'In-Home Supportive Services',
    body: 'Paid hours for in-home care — a parent can be the paid provider. Depends on Medi-Cal and an assessed need.',
    status: 'review',
    statusLabel: 'Needs review',
    factLabel: 'Who can be paid',
    factValue: 'A parent caregiver, in many cases',
    citation: 'W&I §12300',
    reviewedOn: REVIEWED,
  });

  const likelyCount = cards.filter(
    (c) => c.status === 'likely' || c.status === 'enrolled'
  ).length;

  return { cards, likelyCount };
}

/** Age in whole years from an ISO date of birth; null when unknown. */
export function ageFromDob(dob: string | null | undefined, now = new Date()): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  let years = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) years--;
  return years;
}
