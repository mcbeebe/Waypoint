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
 * Derivation is mechanical, trilingual and cited — it can project a stage's own
 * already-verified prose into a readable page. It cannot decide where in a
 * parent's journey that page belongs, what five questions they ask next, or
 * whether it says the same thing as an article already shipped. Those are
 * editorial judgments, so they enter here, attached to a human's name and date.
 *
 * The ledger starts EMPTY. That is not an oversight — it is the same discipline
 * `contentSources.verifiedOn` and `statuteAudit`'s `KNOWN_GAPS` already run on:
 * a seal that no human placed is worse than no seal, because the reader trusts
 * it more. Until an entry exists, a derived article does not reach a family,
 * and `composeLearnLibrary()` returns exactly what shipped before.
 */
import type { FunnelLocale } from '@/lib/eligibility';
import type { LearnArticle, LearnLibrary, LearnStage } from '@/lib/learnLibrary';
import { getGlossary, getLearnArticles, getLearnPaths } from '@/lib/learnLibrary';
import { deriveArticles } from '@/lib/learnDerive';

/** Trilingual editorial copy the reviewer supplies. Peers, not an afterthought. */
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
  /** The derived article's key, e.g. `rc_stage_ipp`. */
  key: string;
  /** ISO date a HUMAN checked the body against the law it cites. */
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
 * person's name and it means that person read it.
 */
export const REVIEW_LEDGER: readonly ReviewEntry[] = [];

/** Why a derived article is not yet ready to surface. */
export type ReadinessGap =
  | 'not-reviewed'
  | 'no-stage'
  | 'no-related-questions'
  | 'shares-citation-with-shipped'
  | 'thin-body';

/** A derived article still waiting on the reviewer, and what it is waiting for. */
export interface PendingArticle {
  key: string;
  title: string;
  citation?: string;
  source: string;
  /** Everything standing between this projection and a family. */
  gaps: ReadinessGap[];
  /** The shipped article it shares a citation with, when it does. */
  sharesCitationWith?: string;
}

/** A body this short is a card blurb wearing an article's clothes. */
const THIN_BODY_BLOCKS = 2;

function pick(q: ReviewedQuestions, locale: FunnelLocale): string[] {
  return locale === 'es' ? q.es : locale === 'vi' ? q.vi : q.en;
}

/**
 * Every derived article that has NOT been reviewed, with the reasons.
 *
 * This is the reviewer's worklist: it names what derivation left undone, so a
 * review sitting is a series of concrete decisions rather than a reading task.
 */
export function pendingReview(
  locale: FunnelLocale = 'en',
  ledger: readonly ReviewEntry[] = REVIEW_LEDGER
): PendingArticle[] {
  const reviewed = new Set(ledger.map((e) => e.key));
  const shippedByCitation = new Map<string, string>();
  for (const a of getLearnArticles(locale)) {
    if (a.citation) shippedByCitation.set(a.citation, a.key);
  }

  return deriveArticles(locale)
    .filter((a) => !reviewed.has(a.key))
    .map((a) => {
      const gaps: ReadinessGap[] = ['not-reviewed'];
      if (!a.stage) gaps.push('no-stage');
      if (!a.relatedQuestions || a.relatedQuestions.length === 0) gaps.push('no-related-questions');
      if (a.body.length < THIN_BODY_BLOCKS) gaps.push('thin-body');
      const shared = a.citation ? shippedByCitation.get(a.citation) : undefined;
      if (shared) gaps.push('shares-citation-with-shipped');
      return {
        key: a.key,
        title: a.title,
        citation: a.citation,
        source: a.derivedFrom.source,
        gaps,
        ...(shared ? { sharesCitationWith: shared } : {}),
      };
    });
}

/**
 * The hand-authored library plus every derived article a human has reviewed.
 *
 * A reviewed article is enriched with exactly what the reviewer supplied — the
 * journey stage, the next questions, and the `reviewedOn` date that lets the
 * reader show its "Reviewed" seal. Nothing else about the projection changes:
 * the body, the citation and the end-action stay the module's own.
 */
export function composeLearnArticles(
  locale: FunnelLocale = 'en',
  ledger: readonly ReviewEntry[] = REVIEW_LEDGER
): LearnArticle[] {
  const byKey = new Map(ledger.map((e) => [e.key, e]));
  const superseded = new Set(ledger.map((e) => e.supersedes).filter(Boolean) as string[]);

  const authored = getLearnArticles(locale).filter((a) => !superseded.has(a.key));

  const reviewed = deriveArticles(locale)
    .filter((a) => byKey.has(a.key))
    .map((a) => {
      const entry = byKey.get(a.key)!;
      const { derivedFrom: _derivedFrom, ...article } = a;
      return {
        ...article,
        stage: entry.stage,
        relatedQuestions: pick(entry.relatedQuestions, locale),
        reviewedOn: entry.reviewedOn,
      } satisfies LearnArticle;
    });

  return [...authored, ...reviewed];
}

/** The full library with reviewed derived articles composed in. */
export function composeLearnLibrary(
  locale: FunnelLocale = 'en',
  ledger: readonly ReviewEntry[] = REVIEW_LEDGER
): LearnLibrary {
  return {
    paths: getLearnPaths(locale),
    articles: composeLearnArticles(locale, ledger),
    glossary: getGlossary(locale),
  };
}

/** One line for a commit message or a review sitting. */
export function reviewSummary(
  locale: FunnelLocale = 'en',
  ledger: readonly ReviewEntry[] = REVIEW_LEDGER
): string {
  const pending = pendingReview(locale, ledger);
  const overlaps = pending.filter((p) => p.sharesCitationWith).length;
  return `${composeLearnArticles(locale, ledger).length} articles live · ${ledger.length} derived reviewed · ${pending.length} pending${overlaps ? ` (${overlaps} share a citation with a shipped article)` : ''}`;
}
