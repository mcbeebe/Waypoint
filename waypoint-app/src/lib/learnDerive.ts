/**
 * The derivation harness (phase 8, slice 8-1 — initiative 004).
 *
 * The thesis of Phase 8 is "derive, don't author": an article is a projection
 * of a structured module we ALREADY maintain and ship — an escalation-ladder
 * rung, a process-map stage, a resource-stack layer — not net-new prose. So a
 * derived article's body is that module's own already-shipped, human-authored,
 * trilingual content, and its citation is the module's own. Nothing new is
 * asserted; the content is re-presented as a readable page that ends in the
 * action the module already points at.
 *
 * Pure and node-tested. This slice builds and validates the engine; it does
 * NOT surface derived articles to families yet — `learnLibrary` composes them,
 * with the human-review pass, in slice 8-2. Keeping composition out of here is
 * deliberate: the reviewer verifies the projection is faithful before any of it
 * reaches a parent.
 */
import type { FunnelLocale } from '@/lib/eligibility';
import type { ArticleBlock, LearnArticle, LearnTarget } from '@/lib/learnLibrary';
import { getEscalationRungs } from '@/lib/escalationLadder';
import { getRcStages, getSchoolStages } from '@/lib/processMap';
import { deriveResourceStack } from '@/lib/resourceStack';

/** A derived article is a LearnArticle with its provenance source recorded, so
 *  the reviewer (8-2) can trace every page back to the module it projects. */
export interface DerivedArticle extends LearnArticle {
  derivedFrom: { source: 'ladder' | 'rc_stage' | 'school_stage' | 'stack'; sourceKey: string };
}

// ─── small pure helpers ──────────────────────────────────────────────────────

/** First sentence of a body paragraph — the card blurb. Handles ASCII '.' which
 *  every locale here uses to end a sentence. */
function firstSentence(text: string): string {
  const m = /^(.*?[.!?])(\s|$)/.exec(text.trim());
  return (m ? m[1] : text.trim()).trim();
}

/** Honest read time from the real word count, floored at 2 minutes. */
function readMinutes(...parts: string[]): number {
  const words = parts.join(' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(words / 180));
}

/** Plain search terms from the (localized) title + the stable source key. */
function termsFrom(title: string, key: string): string[] {
  const words = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return [...new Set([...words, key])];
}

// ─── projectors ──────────────────────────────────────────────────────────────

/** An escalation-ladder rung → an article that ends in its lever letter (or the
 *  ladder screen when the rung has no letter). */
function fromRung(rung: ReturnType<typeof getEscalationRungs>[number]): DerivedArticle {
  const body: ArticleBlock[] = [{ kind: 'para', text: rung.body }];
  if (rung.clock) body.push({ kind: 'callout', text: rung.clock });
  const target: LearnTarget = rung.leverTemplate
    ? { screen: 'Letters', params: { template: rung.leverTemplate }, tab: 'Home' }
    : { screen: 'EscalationLadder', tab: 'Home' };
  return {
    key: `ladder_${rung.key}`,
    title: rung.title,
    summary: firstSentence(rung.body),
    body,
    minutes: readMinutes(rung.body, rung.clock),
    citation: rung.citation || undefined,
    actionLabel: rung.leverLabel ?? rung.title,
    target,
    terms: termsFrom(rung.title, rung.key),
    derivedFrom: { source: 'ladder', sourceKey: rung.key },
  };
}

/** A process-map stage → an article that ends in the stage's lever letter (or
 *  the map for that system). `system` distinguishes RC vs school keys. */
function fromStage(
  stage: ReturnType<typeof getRcStages>[number],
  system: 'rc' | 'school'
): DerivedArticle {
  const body: ArticleBlock[] = [{ kind: 'para', text: stage.body }];
  if (stage.clock) body.push({ kind: 'callout', text: stage.clock });
  const target: LearnTarget = stage.leverTemplate
    ? { screen: 'Letters', params: { template: stage.leverTemplate }, tab: 'Home' }
    : { screen: 'ProcessMap', params: { system }, tab: 'Home' };
  return {
    key: `${system === 'rc' ? 'rc_stage' : 'school_stage'}_${stage.key}`,
    title: stage.title,
    summary: firstSentence(stage.body),
    body,
    minutes: readMinutes(stage.body, stage.clock),
    citation: stage.citation || undefined,
    actionLabel: stage.leverLabel ?? stage.title,
    target,
    terms: termsFrom(stage.title, stage.key),
    derivedFrom: { source: system === 'rc' ? 'rc_stage' : 'school_stage', sourceKey: stage.key },
  };
}

/** A resource-stack layer → an article that ends at the layer's lever (or the
 *  stack view when it has none). */
function fromLayer(
  layer: ReturnType<typeof deriveResourceStack>['layers'][number]
): DerivedArticle {
  const target: LearnTarget = layer.lever
    ? { screen: layer.lever.screen, params: layer.lever.params, tab: 'Home' }
    : { screen: 'ResourceStack', tab: 'Home' };
  return {
    key: `stack_${layer.key}`,
    title: layer.title,
    summary: firstSentence(layer.gets),
    body: [{ kind: 'para', text: layer.gets }],
    minutes: readMinutes(layer.gets),
    citation: layer.citation || undefined,
    actionLabel: layer.title,
    target,
    terms: termsFrom(layer.title, layer.key),
    derivedFrom: { source: 'stack', sourceKey: layer.key },
  };
}

/** Neutral stack input — we want the layer DEFINITIONS (title/gets/citation/
 *  lever), not any one family's live statuses. */
const NEUTRAL_STACK = { ageYears: null, rcStatus: null, iepStatus: null } as const;

/**
 * Every article the harness can derive from the current source modules, in a
 * stable order (ladder → RC stages → school stages → stack layers). Trilingual
 * by passing `locale` straight through to each source.
 */
export function deriveArticles(locale: FunnelLocale = 'en'): DerivedArticle[] {
  return [
    ...getEscalationRungs(locale).map(fromRung),
    ...getRcStages(locale).map((s) => fromStage(s, 'rc')),
    ...getSchoolStages(locale).map((s) => fromStage(s, 'school')),
    ...deriveResourceStack(NEUTRAL_STACK, locale).layers.map(fromLayer),
  ];
}
