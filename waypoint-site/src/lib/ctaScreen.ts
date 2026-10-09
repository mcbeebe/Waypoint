/**
 * Which sample app screen sits beside a call-to-action box, and what it says
 * (initiative 013, PR 6; mockup approved by the owner 2026-10-09).
 *
 * Every card is one the app can produce, worded exactly as the app renders
 * it: Home cards from waypoint-app/src/lib/homeTriage.ts (with the request
 * titles sentNext.ts gives a sent letter), letter buttons from LettersScreen,
 * the Navigator's save button from NavigatorScreen. The family is fictional;
 * "today" is Monday, Oct 12, 2026 and the dates follow from it.
 * ctaScreen.test.ts pins the wording to those files.
 */
import type { CtaId, Pillar } from './appLinks';

export type CtaScreenKind = 'iep' | 'rc' | 'rc-navigator' | 'benefits' | 'insurance' | 'letter';

export interface CtaScreenCard {
  /** What a screen reader announces for the whole screen. */
  label: string;
  /** Small line above the title (a letter's recipient). */
  to?: string;
  /** A parent's question, shown as a chat bubble (Navigator cards). */
  ask?: string;
  /** Home kicker, uppercase, as the app renders it. */
  pill?: string;
  title: string;
  body?: string;
  /** Render the body as a white letter box rather than a muted line. */
  boxed?: boolean;
  /** Statute a Home clock card runs on; must be one the app's clocks cite. */
  cite?: string;
  button: string;
}

/** The Letters screen's send button, verbatim (LettersScreen.tsx). */
const GMAIL_SEND = '📨 Send now with Gmail — replies tracked';

const CARDS: Record<CtaScreenKind, CtaScreenCard> = {
  iep: {
    label: "Sample Home card: the answer on Maya's evaluation request is due in 4 days, with a follow-up one tap away.",
    pill: 'CLOCK RUNNING — 4 DAYS LEFT',
    title: 'An answer on Special education evaluation request is due Oct 16',
    body: 'Because you asked on Oct 1 and the law gives them a fixed window.',
    cite: 'Ed Code §56321',
    button: 'Draft the follow-up',
  },
  rc: {
    label: "Sample Home card: the answer on Leo's IPP review meeting request is due in 6 days, with a follow-up one tap away.",
    pill: 'CLOCK RUNNING — 6 DAYS LEFT',
    title: 'An answer on IPP review meeting request is due Oct 18',
    body: 'Because you asked on Sep 18 and the law gives them a fixed window.',
    cite: 'W&I §4646.5(b)',
    button: 'Draft the follow-up',
  },
  // The 21 Regional Center pages sell "Ask Waypoint's AI", and are about
  // intake, where the app runs no clock of its own: a Navigator answer fits.
  'rc-navigator': {
    label: 'Sample Navigator answer about what happens after Regional Center intake, with a button to save it as a step.',
    ask: 'My son is 4. What happens after Regional Center intake?',
    title: 'The center assesses whether he is eligible (W&I §4643).',
    body: 'If it says no, you have 60 days from the notice to appeal (W&I §4710.5).',
    button: 'Save as Action',
  },
  benefits: {
    label: 'Sample Home card: a step on the family’s plan, asking about Medi-Cal deeming, is due today.',
    pill: 'DUE TODAY',
    title: 'Ask the Service Coordinator about Medi-Cal deeming',
    body: "Because it's due today and it's on your plan.",
    button: 'Open this action',
  },
  insurance: {
    label: 'Sample drafted insurance appeal letter, ready to review and send.',
    title: 'Insurance Appeal · draft',
    body: "I'm writing to ask you to reconsider the denial of ABA therapy for my son, Sam…",
    boxed: true,
    button: GMAIL_SEND,
  },
  letter: {
    label: 'Sample drafted evaluation request for Maya, ready to send with Gmail.',
    to: 'To: special-ed@district.example',
    title: 'Assessment Request · draft',
    body: 'I am requesting a special education evaluation for Maya. Please send me the assessment plan within 15 calendar days…',
    boxed: true,
    button: GMAIL_SEND,
  },
};

/**
 * The screen for a call-to-action box, or null when the box should stay
 * text-only. Only content pages get one — guides, Regional Center pages and
 * the IEP letter page — chosen by the box's CTA id and the page's pillar.
 * Marketing pages, answers and the checklist keep the plain box. A page whose
 * topic the pillar's screen would not match passes `screen="none"` to
 * HandoffCTA instead.
 */
export function ctaScreenFor(cta: CtaId, pillar?: Pillar): CtaScreenKind | null {
  // The only letter screen is the evaluation request; another letter page
  // would show the wrong one, so it gets no screen until it has its own.
  if (cta === 'letter-footer') return pillar === 'iep' ? 'letter' : null;
  if (cta === 'rc-footer') return 'rc-navigator';
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
