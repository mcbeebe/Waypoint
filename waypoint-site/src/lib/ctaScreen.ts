/**
 * Which sample app screen sits beside a call-to-action box, and what it says
 * (initiative 013, PR 6; mockup approved by the owner 2026-10-09).
 *
 * Every card is one the app's Home or letters can produce, worded the way the
 * app words it (waypoint-app/src/lib/homeTriage.ts, lettersCatalog.ts). The
 * family is fictional; "today" is Monday, Oct 12, 2026 and the dates follow
 * from it. ctaScreen.test.ts holds the clock citations to the app's
 * requestClocks.ts and the copy to the site's tone and naming rules.
 */
import type { CtaId, Pillar } from './appLinks';

export type CtaScreenKind = 'iep' | 'rc' | 'rc-intake' | 'benefits' | 'insurance' | 'letter';

export interface CtaScreenCard {
  /** What a screen reader announces for the whole screen. */
  label: string;
  /** Small line above the title (a letter's recipient). */
  to?: string;
  /** Home kicker, uppercase, as the app renders it. */
  pill?: string;
  /** Pill colour: amber for a clock, pine for something due today. */
  pillTone?: 'cs-clock' | 'cs-today';
  title: string;
  body?: string;
  /** Render the body as a white letter box rather than a muted line. */
  boxed?: boolean;
  /** Statute the card's clock runs on; must be one the app cites. */
  cite?: string;
  button: string;
}

const CARDS: Record<CtaScreenKind, CtaScreenCard> = {
  iep: {
    label: "Sample Home card: the answer on Maya's evaluation request is due in 4 days, with a follow-up one tap away.",
    pill: 'CLOCK RUNNING · 4 DAYS LEFT',
    pillTone: 'cs-clock',
    title: "An answer on Maya's evaluation request is due Oct 16",
    body: 'Because you asked on Oct 1 and the law gives them a fixed window.',
    cite: 'Ed Code §56321',
    button: 'Draft the follow-up',
  },
  rc: {
    label: "Sample Home card: the answer on Leo's IPP meeting request is due in 6 days, with a follow-up one tap away.",
    pill: 'CLOCK RUNNING · 6 DAYS LEFT',
    pillTone: 'cs-clock',
    title: "An answer on Leo's IPP meeting request is due Oct 18",
    body: 'Because you asked on Sep 18 and the law gives them a fixed window.',
    cite: 'W&I §4646.5(b)',
    button: 'Draft the follow-up',
  },
  // The 21 Regional Center pages are about intake, where a family has no IPP
  // yet: their screen is the intake assessment clock instead.
  'rc-intake': {
    label: "Sample Home card: the answer on Leo's intake assessment request is due in 6 days, with a follow-up one tap away.",
    pill: 'CLOCK RUNNING · 6 DAYS LEFT',
    pillTone: 'cs-clock',
    title: "An answer on Leo's assessment request is due Oct 18",
    body: 'Because you asked on Jun 20 and the law gives them a fixed window.',
    cite: 'W&I §4643',
    button: 'Draft the follow-up',
  },
  benefits: {
    label: 'Sample Home card: a step on the family’s plan, asking about Medi-Cal deeming, is due today.',
    pill: 'DUE TODAY',
    pillTone: 'cs-today',
    title: 'Ask the Service Coordinator about Medi-Cal deeming',
    body: "Because it's due today and it's on your plan.",
    button: 'Open this action',
  },
  insurance: {
    label: 'Sample drafted insurance appeal letter, ready to review.',
    title: 'Insurance appeal · draft',
    body: "I'm writing to ask you to reconsider the denial of ABA therapy for my son, Sam…",
    boxed: true,
    button: 'Review and send',
  },
  letter: {
    label: "Sample drafted evaluation request email for Maya, ready to send with Gmail.",
    to: 'To: special-ed@district.example',
    title: 'Request for a special education evaluation for Maya',
    body: "So we can all work from the same information, I'd like to ask for an evaluation of Maya in all areas of suspected disability…",
    boxed: true,
    button: 'Send with Gmail',
  },
};

/**
 * The screen for a call-to-action box, or null when the box should stay
 * text-only. Only content pages get one — guides, Regional Center pages and
 * letter pages — chosen by the box's CTA id and the page's pillar. A Regional
 * Center page shows the intake clock; a Regional Center guide the IPP one. Marketing
 * pages, answers and the checklist keep the plain box.
 */
export function ctaScreenFor(cta: CtaId, pillar?: Pillar): CtaScreenKind | null {
  if (cta === 'letter-footer') return 'letter';
  if (cta === 'rc-footer') return 'rc-intake';
  if (cta !== 'guide-footer') return null;
  switch (pillar) {
    case 'iep':
      return 'iep';
    case 'regional-centers':
      return 'rc';
    case 'benefits':
      return 'benefits';
    case 'insurance':
      return 'insurance';
    default:
      return null;
  }
}

/** The card content for a screen kind. */
export function ctaScreenCard(kind: CtaScreenKind): CtaScreenCard {
  return CARDS[kind];
}

/** Every card, for the copy guard. */
export const CTA_SCREEN_CARDS: Readonly<Record<CtaScreenKind, CtaScreenCard>> = CARDS;
