/**
 * Entitlement resolution (PRD W-E: E2/E3) — pure logic over entitlement
 * rows. One rule: a live grant makes the family Premium; no rows is the
 * free tier. Sponsored grants label themselves honestly ("Included with
 * your facilitation — you pay $0").
 *
 * Gates render as value explanations, never dead ends (E3) — the copy for
 * both tiers lives here so the pricing page and every gate agree.
 */
import type { Entitlement, SponsorType } from '@/types/database';

export interface ResolvedEntitlement {
  isPremium: boolean;
  /** The sponsor paying, when not the family. */
  sponsorType: SponsorType | null;
  /** Banner copy when sponsored; null for self-paid or free. */
  sponsorLabel: string | null;
}

const SPONSOR_LABELS: Record<Exclude<SponsorType, 'self'>, string> = {
  facilitation: 'Included with your facilitation — you pay $0.',
  district: 'Covered by your school district — you pay $0.',
  employer: 'Covered by your employer benefit — you pay $0.',
  licensee: 'Covered by your program — you pay $0.',
};

type Row = Pick<Entitlement, 'sponsor_type' | 'status' | 'period_start' | 'period_end'>;

export function resolveEntitlement(rows: Row[], now = new Date()): ResolvedEntitlement {
  const today = now.toISOString().slice(0, 10);
  const live = rows.filter(
    (r) =>
      r.status === 'active' &&
      r.period_start <= today &&
      (r.period_end === null || r.period_end >= today)
  );
  if (live.length === 0) return { isPremium: false, sponsorType: null, sponsorLabel: null };
  // A sponsored grant labels the experience even when a self-sub also exists.
  const sponsored = live.find((r) => r.sponsor_type !== 'self');
  if (sponsored) {
    const st = sponsored.sponsor_type as Exclude<SponsorType, 'self'>;
    return { isPremium: true, sponsorType: st, sponsorLabel: SPONSOR_LABELS[st] };
  }
  return { isPremium: true, sponsorType: 'self', sponsorLabel: null };
}

// ── Tier definition (single source for pricing page + gates) ────────────────

/** Free-tier Navigator messages per calendar month (E3/E4). */
export const FREE_NAVIGATOR_MONTHLY_LIMIT = 30;

/** Free forever — stated plainly on the pricing page (E1). */
export const FREE_FEATURES = [
  'Eligibility results with sources',
  'How-the-system-works map & path decider',
  'Request tracker with statutory clocks',
  'Starter action plan & deadlines',
  'Knowledge base & journey map',
  'Letter generator (core letters)',
  `Waypoint Navigator* — ${FREE_NAVIGATOR_MONTHLY_LIMIT} messages/month`,
] as const;

export const PREMIUM_FEATURES = [
  'Unlimited Waypoint Navigator*',
  'IEP document analysis + goal tracking',
  'Letter generation with sending history',
  'Document binder + export',
  'Expense tracking + tax reports',
  'Multi-child support',
] as const;

/** Launch pricing (E1): annual is the lead offer; monthly is secondary. */
export const PRICE_ANNUAL_CENTS = 9900;
export const PRICE_MONTHLY_CENTS = 1499;
export const MONEY_BACK_DAYS = 30;

/** Value explanation shown at a gate — never a dead end (E3). */
export function gateCopy(feature: string): { title: string; body: string } {
  return {
    title: `${feature} is a Premium feature`,
    body:
      `Your free plan keeps everything you already use — eligibility results, the process map, your action plan, and the request tracker, free forever. Premium adds ${feature.toLowerCase()} and more for $${(PRICE_ANNUAL_CENTS / 100).toFixed(0)}/year, with a ${MONEY_BACK_DAYS}-day money-back guarantee.`,
  };
}
