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

const L =
  (locale: FunnelLocale) =>
  (en: string, es: string, vi: string): string =>
    locale === 'es' ? es : locale === 'vi' ? vi : en;

/**
 * The card blurb: enough sentences to actually say something, not a fragment.
 * A single telegraphic first sentence ("Under 3: Early Start.") is useless, so
 * we accumulate whole sentences until the blurb reads as a thought (≥70 chars)
 * or hits 3 sentences, then hard-cap the length. No lookbehind (Hermes-safe).
 */
function summarize(text: string): string {
  const t = text.trim();
  const sentences = t.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [t];
  let out = '';
  let n = 0;
  for (const s of sentences) {
    out += s;
    n += 1;
    if (out.trim().length >= 70 || n >= 3) break;
  }
  out = out.trim();
  return out.length > 220 ? `${out.slice(0, 219).trimEnd()}…` : out;
}

/** Honest read time from the real word count, floored at 2 minutes. */
function readMinutes(...parts: string[]): number {
  const words = parts.join(' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(words / 180));
}

/** Short function words that add search noise, not coverage (en/es/vi). */
const STOPWORDS = new Set([
  'the', 'and', 'you', 'your', 'for', 'with', 'not', 'are', 'was', 'has', 'have',
  'los', 'las', 'una', 'que', 'con', 'por', 'para', 'del', 'sus',
  'quy', 'các', 'khi', 'không', 'này',
]);

/** Plain search terms from the (localized) title + the stable source key. */
function termsFrom(title: string, key: string): string[] {
  const words = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  return [...new Set([...words, key])];
}

/**
 * A real VERB action label for a destination screen — so a derived CTA reads
 * "Find who to contact ›", never a bare noun. Used for stack layers (which
 * carry a lever screen but no label) and for the no-lever fallback below.
 */
function actionForScreen(screen: string, locale: FunnelLocale): string {
  const t = L(locale);
  switch (screen) {
    case 'Letters':
      return t('Draft the request', 'Redactar la solicitud', 'Soạn yêu cầu');
    case 'ProcessMap':
      return t('See how it works', 'Ver cómo funciona', 'Xem cách hoạt động');
    case 'Agencies':
      return t('Find who to contact', 'Ver a quién contactar', 'Tìm người để liên hệ');
    case 'SdpJourney':
      return t('Explore Self-Determination', 'Explorar la Autodeterminación', 'Tìm hiểu Tự Quyết');
    case 'ResourceStack':
      return t('See your benefit stack', 'Ver su pila de beneficios', 'Xem các tầng trợ cấp');
    case 'EscalationLadder':
      return t('See the escalation steps', 'Ver los pasos de escalada', 'Xem các bước leo thang');
    default:
      return t('Open', 'Abrir', 'Mở');
  }
}

/** Where a source with no letter-lever should send the family — a real "do
 *  something" screen (who to contact), never a loop back to the same map. */
const NO_LEVER_TARGET: LearnTarget = { screen: 'Agencies', tab: 'Home' };

// ─── projectors ──────────────────────────────────────────────────────────────

/** An escalation-ladder rung → an article that ends in its lever letter, or in
 *  "find who to contact" when the rung has no letter (never a loop back to the
 *  ladder). */
function fromRung(
  rung: ReturnType<typeof getEscalationRungs>[number],
  locale: FunnelLocale
): DerivedArticle {
  const body: ArticleBlock[] = [{ kind: 'para', text: rung.body }];
  if (rung.clock) body.push({ kind: 'callout', text: rung.clock });
  const hasLetter = !!rung.leverTemplate;
  return {
    key: `ladder_${rung.key}`,
    title: rung.title,
    summary: summarize(rung.body),
    body,
    minutes: readMinutes(rung.body, rung.clock),
    citation: rung.citation || undefined,
    actionLabel: hasLetter
      ? rung.leverLabel ?? rung.title
      : actionForScreen(NO_LEVER_TARGET.screen, locale),
    target: hasLetter
      ? { screen: 'Letters', params: { template: rung.leverTemplate! }, tab: 'Home' }
      : NO_LEVER_TARGET,
    terms: termsFrom(rung.title, rung.key),
    derivedFrom: { source: 'ladder', sourceKey: rung.key },
  };
}

/** A process-map stage → an article that ends in the stage's lever letter, or in
 *  "find who to contact" when it has none. `system` distinguishes RC vs school. */
function fromStage(
  stage: ReturnType<typeof getRcStages>[number],
  system: 'rc' | 'school',
  locale: FunnelLocale
): DerivedArticle {
  const body: ArticleBlock[] = [{ kind: 'para', text: stage.body }];
  if (stage.clock) body.push({ kind: 'callout', text: stage.clock });
  const hasLetter = !!stage.leverTemplate;
  return {
    key: `${system === 'rc' ? 'rc_stage' : 'school_stage'}_${stage.key}`,
    title: stage.title,
    summary: summarize(stage.body),
    body,
    minutes: readMinutes(stage.body, stage.clock),
    citation: stage.citation || undefined,
    actionLabel: hasLetter
      ? stage.leverLabel ?? stage.title
      : actionForScreen(NO_LEVER_TARGET.screen, locale),
    target: hasLetter
      ? { screen: 'Letters', params: { template: stage.leverTemplate! }, tab: 'Home' }
      : NO_LEVER_TARGET,
    terms: termsFrom(stage.title, stage.key),
    derivedFrom: { source: system === 'rc' ? 'rc_stage' : 'school_stage', sourceKey: stage.key },
  };
}

/** A resource-stack layer → an article that ends at the layer's lever, with a
 *  real VERB label (the layer carries a screen but no label of its own). */
function fromLayer(
  layer: ReturnType<typeof deriveResourceStack>['layers'][number],
  locale: FunnelLocale
): DerivedArticle {
  const target: LearnTarget = layer.lever
    ? { screen: layer.lever.screen, params: layer.lever.params, tab: 'Home' }
    : NO_LEVER_TARGET;
  return {
    key: `stack_${layer.key}`,
    title: layer.title,
    summary: summarize(layer.gets),
    body: [{ kind: 'para', text: layer.gets }],
    minutes: readMinutes(layer.gets),
    citation: layer.citation || undefined,
    actionLabel: actionForScreen(target.screen, locale),
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
    ...getEscalationRungs(locale).map((r) => fromRung(r, locale)),
    ...getRcStages(locale).map((s) => fromStage(s, 'rc', locale)),
    ...getSchoolStages(locale).map((s) => fromStage(s, 'school', locale)),
    ...deriveResourceStack(NEUTRAL_STACK, locale).layers.map((l) => fromLayer(l, locale)),
  ];
}
