/**
 * The human-review pass (phase 8, slice 8-2 — initiative 004).
 *
 * `learnDerive.ts` (slice 8-1) projects 22 articles out of modules the app
 * already ships. Its header is explicit that it stops short of families on
 * purpose: *"this slice builds and validates the engine; it does NOT surface
 * derived articles to families yet… the reviewer verifies the projection is
 * faithful before any of it reaches a parent."* This module is that gate.
 *
 * **Derivation and review do different jobs, and neither can do the other's.**
 * Derivation is mechanical, trilingual and cited — it projects a stage's own
 * already-verified prose into a readable page. It cannot decide where in a
 * parent's journey that page belongs, what five questions they ask next, or
 * whether it says the same thing as an article already shipped. Those are
 * editorial judgments, so they enter here, attached to a human's name and date.
 *
 * The ledger starts EMPTY. That is not an oversight — it is the same discipline
 * `contentSources.verifiedOn` and `statuteAudit`'s `KNOWN_GAPS` already run on:
 * a seal that no human placed is worse than no seal, because the reader trusts
 * it more. Unlike those two, this one is checked by `validateLedger()` over the
 * ledger's ACTUAL contents, so the first real entry is verified rather than
 * merely type-checked.
 *
 * **Where composition happens, and why not here.** `getLearnArticles()` in
 * `learnLibrary.ts` composes authored + reviewed, so the reader, search, Home
 * and Tools all read one source of truth. An earlier draft of this slice
 * composed in a parallel function that only `LearnPanel` called; the result was
 * a reviewed article that appeared in the browse list, 404'd when tapped, and
 * could not be found by typing its own title. One library, one answer.
 *
 * This module imports nothing from `learnLibrary` at runtime (types only), so
 * `learnLibrary` can import it without a cycle.
 */
import type { FunnelLocale } from '@/lib/eligibility';
import type { LearnArticle, LearnStage } from '@/lib/learnLibrary';
import { deriveArticles } from '@/lib/learnDerive';

/**
 * Trilingual editorial copy the reviewer supplies. Peers, not an afterthought —
 * `validateLedger` rejects an entry whose locales disagree in count.
 */
export interface ReviewedQuestions {
  en: string[];
  es: string[];
  vi: string[];
}

/**
 * One derived article, reviewed by a person.
 *
 * Creating an entry is an editorial act with a name on it. It says: I read this
 * projection against the module it came from and the law it cites, it is
 * faithful, and here is the judgment derivation could not make.
 */
export interface ReviewEntry {
  /** The derived article's key, e.g. `rc_stage_ipp`. Must exist in `deriveArticles()`. */
  key: string;
  /** ISO date (YYYY-MM-DD) a HUMAN checked the body against the law it cites. */
  reviewedOn: string;
  /** Who. A name, so the record is answerable. */
  reviewedBy: string;
  /** Where in the journey this belongs — derivation cannot infer it. */
  stage: LearnStage;
  /** The 5–10 questions a parent asks next (editorial-spec.md, lines 87–106). */
  relatedQuestions: ReviewedQuestions;
  /**
   * A hand-authored article this projection replaces. Four derived articles
   * rest on the same citation as a shipped one, so the reviewer must decide
   * whether they are the same article — and if so, which survives.
   */
  supersedes?: string;
  /** Why this passed, or what the reviewer changed upstream to make it pass. */
  note?: string;
}

/**
 * Derived articles a human has reviewed. **Empty by design.**
 *
 * Adding a line here surfaces an article to families. Do not add one to make a
 * test pass, to fill the library, or on an agent's say-so — `reviewedBy` is a
 * person's name and it means that person read it. `validateLedger` runs over
 * this array in CI, so a malformed entry fails the build rather than shipping.
 */
export const REVIEW_LEDGER: readonly ReviewEntry[] = [];

/** The editorial spec's range for "the questions a parent asks next". */
export const MIN_RELATED_QUESTIONS = 5;
export const MAX_RELATED_QUESTIONS = 10;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const LOCALES: FunnelLocale[] = ['en', 'es', 'vi'];

/** A reason one ledger entry is not fit to surface an article. */
export interface LedgerProblem {
  key: string;
  problem: string;
}

/**
 * Check the ledger against everything a review entry has to get right.
 *
 * This exists because the earlier draft had none: `ReviewEntry` was free
 * strings, no test read the real ledger, and every shape assertion ran against
 * a fixture. The first genuine entry would have shipped with no check on its
 * date, its question count, its locales, or whether its key names an article
 * that exists.
 *
 * @param authoredKeys keys of the hand-authored articles, for `supersedes`.
 */
export function validateLedger(
  ledger: readonly ReviewEntry[] = REVIEW_LEDGER,
  authoredKeys: readonly string[] = []
): LedgerProblem[] {
  const problems: LedgerProblem[] = [];
  const derivedKeys = new Set(deriveArticles('en').map((a) => a.key));
  const seen = new Set<string>();

  for (const e of ledger) {
    const add = (problem: string) => problems.push({ key: e.key, problem });

    if (!derivedKeys.has(e.key)) {
      // The failure this prevents: a typo'd key paired with `supersedes` used
      // to DELETE the shipped article and add nothing in its place.
      add(`key is not a derived article — deriveArticles() emits no "${e.key}"`);
    }
    if (seen.has(e.key)) add('duplicate entry — two reviewers would silently overwrite each other');
    seen.add(e.key);

    if (!ISO_DATE.test(e.reviewedOn)) add(`reviewedOn "${e.reviewedOn}" is not YYYY-MM-DD`);
    if (!e.reviewedBy.trim()) add('reviewedBy is empty — a review needs a name on it');

    for (const locale of LOCALES) {
      const qs = e.relatedQuestions[locale as 'en' | 'es' | 'vi'];
      if (!Array.isArray(qs) || qs.length < MIN_RELATED_QUESTIONS) {
        add(`relatedQuestions.${locale} has ${qs?.length ?? 0}, needs at least ${MIN_RELATED_QUESTIONS}`);
      } else if (qs.length > MAX_RELATED_QUESTIONS) {
        add(`relatedQuestions.${locale} has ${qs.length}, more than ${MAX_RELATED_QUESTIONS}`);
      }
    }
    const counts = LOCALES.map((l) => e.relatedQuestions[l as 'en' | 'es' | 'vi']?.length ?? 0);
    if (new Set(counts).size > 1) {
      add(`relatedQuestions differ across locales (${counts.join('/')}) — es and vi are peers, not extras`);
    }
    const { en, es, vi } = e.relatedQuestions;
    if (en?.length && es?.length && en.join('|') === es.join('|')) {
      add('relatedQuestions.es is identical to en — untranslated');
    }
    if (en?.length && vi?.length && en.join('|') === vi.join('|')) {
      add('relatedQuestions.vi is identical to en — untranslated');
    }

    if (e.supersedes && !authoredKeys.includes(e.supersedes)) {
      add(`supersedes "${e.supersedes}", which is not a hand-authored article`);
    }
  }
  return problems;
}

/** Entries safe to compose: a real derived article, first occurrence wins. */
function usableEntries(ledger: readonly ReviewEntry[]): ReviewEntry[] {
  const derivedKeys = new Set(deriveArticles('en').map((a) => a.key));
  const seen = new Set<string>();
  return ledger.filter((e) => {
    if (!derivedKeys.has(e.key) || seen.has(e.key)) return false;
    seen.add(e.key);
    return true;
  });
}

/**
 * Hand-authored keys this ledger retires.
 *
 * Only entries that will actually compose can supersede. An entry whose key
 * names no derived article is inert in BOTH directions — it cannot add an
 * article, so it must not be able to remove one either.
 */
export function supersededKeys(ledger: readonly ReviewEntry[] = REVIEW_LEDGER): Set<string> {
  return new Set(
    usableEntries(ledger)
      .map((e) => e.supersedes)
      .filter((k): k is string => Boolean(k))
  );
}

/**
 * The derived articles a human has reviewed, enriched with that reviewer's
 * judgment and ready to compose into the library.
 *
 * The projection itself is untouched — body, citation, title and end-action
 * stay the module's own. Only what derivation could not supply is added.
 */
export function reviewedArticles(
  locale: FunnelLocale = 'en',
  ledger: readonly ReviewEntry[] = REVIEW_LEDGER
): LearnArticle[] {
  const byKey = new Map(usableEntries(ledger).map((e) => [e.key, e]));
  return deriveArticles(locale)
    .filter((a) => byKey.has(a.key))
    .map((a): LearnArticle => {
      const entry = byKey.get(a.key)!;
      const qs = entry.relatedQuestions;
      // Explicit return annotation, not `satisfies` on a spread: excess-property
      // checking does not apply to spread-in properties, so `satisfies` would
      // let a future second field on DerivedArticle reach a family unnoticed.
      return {
        key: a.key,
        title: a.title,
        summary: a.summary,
        primaryQuestion: a.primaryQuestion,
        relatedQuestions: locale === 'es' ? qs.es : locale === 'vi' ? qs.vi : qs.en,
        bridge: a.bridge,
        body: a.body,
        minutes: a.minutes,
        citation: a.citation,
        reviewedOn: entry.reviewedOn,
        stage: entry.stage,
        actionLabel: a.actionLabel,
        target: a.target,
        terms: a.terms,
      };
    });
}

// ─── The reviewer's worklist ─────────────────────────────────────────────────

/** Why a derived article is not yet ready to surface. */
export type ReadinessGap =
  | 'not-reviewed'
  | 'no-stage'
  | 'no-related-questions'
  | 'shares-citation-with-shipped';

/** A derived article still waiting on the reviewer, and what it is waiting for. */
export interface PendingArticle {
  key: string;
  title: string;
  citation?: string;
  source: string;
  gaps: ReadinessGap[];
  /** EVERY shipped article sharing this citation — two shipped articles can. */
  sharesCitationWith: string[];
}

/**
 * Every derived article that has NOT been reviewed, with the reasons.
 *
 * Takes the authored set as an argument rather than importing it, so this
 * module stays free of a runtime dependency on `learnLibrary`.
 */
export function pendingReview(
  authored: readonly LearnArticle[],
  locale: FunnelLocale = 'en',
  ledger: readonly ReviewEntry[] = REVIEW_LEDGER
): PendingArticle[] {
  const reviewed = new Set(usableEntries(ledger).map((e) => e.key));
  const shippedByCitation = new Map<string, string[]>();
  for (const a of authored) {
    if (!a.citation) continue;
    shippedByCitation.set(a.citation, [...(shippedByCitation.get(a.citation) ?? []), a.key]);
  }

  return deriveArticles(locale)
    .filter((a) => !reviewed.has(a.key))
    .map((a) => {
      const shared = (a.citation && shippedByCitation.get(a.citation)) || [];
      const gaps: ReadinessGap[] = ['not-reviewed'];
      if (!a.stage) gaps.push('no-stage');
      if (!a.relatedQuestions || a.relatedQuestions.length === 0) gaps.push('no-related-questions');
      if (shared.length) gaps.push('shares-citation-with-shipped');
      return {
        key: a.key,
        title: a.title,
        citation: a.citation,
        source: a.derivedFrom.source,
        gaps,
        sharesCitationWith: shared,
      };
    });
}

/** Counts for a review sitting. A struct, so a formatter change is not a test change. */
export interface ReviewStatus {
  reviewed: number;
  pending: number;
  /** Pending articles that duplicate a shipped article's citation. */
  overlapping: number;
}

export function reviewStatus(
  authored: readonly LearnArticle[],
  locale: FunnelLocale = 'en',
  ledger: readonly ReviewEntry[] = REVIEW_LEDGER
): ReviewStatus {
  const pending = pendingReview(authored, locale, ledger);
  return {
    reviewed: usableEntries(ledger).length,
    pending: pending.length,
    overlapping: pending.filter((p) => p.sharesCitationWith.length > 0).length,
  };
}
