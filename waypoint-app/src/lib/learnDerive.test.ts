import { describe, it, expect } from 'vitest';
import { deriveArticles } from './learnDerive';
import { getLearnArticles } from './learnLibrary';
import { getEscalationRungs } from './escalationLadder';
import { getRcStages } from './processMap';
import { deriveResourceStack } from './resourceStack';
import { resolvesFrom } from '@/navigation/routeGraph';
import { sourceForCitation } from '@/data/contentSources';

const NEUTRAL = { ageYears: null, rcStatus: null, iepStatus: null } as const;

describe('the derivation harness projects real modules into real articles', () => {
  it('derives a meaningful batch, stably ordered', () => {
    const a = deriveArticles('en');
    // ladder(4) + rc stages + school stages + stack layers — a real corpus.
    expect(a.length).toBeGreaterThan(15);
    // Stable: same run, same order.
    expect(deriveArticles('en').map((x) => x.key)).toEqual(a.map((x) => x.key));
  });

  it('gives every derived article the shape a reader needs', () => {
    for (const a of deriveArticles('en')) {
      expect(a.body.length, `${a.key} body`).toBeGreaterThan(0);
      expect(a.summary.length, `${a.key} summary`).toBeGreaterThan(0);
      expect(a.actionLabel.length, `${a.key} action`).toBeGreaterThan(0);
      expect(a.target.screen.length, `${a.key} target`).toBeGreaterThan(0);
      expect(a.minutes, `${a.key} minutes`).toBeGreaterThan(0);
    }
  });

  it('every derived target actually resolves — no dead taps', () => {
    // The reader (8-0) opens in the Learn stack; the CTA names tab:'Home'. Every
    // projected target must be a registered Home-stack screen or it is a dead
    // tap the moment 8-2 surfaces it. This is the guard that matters most.
    for (const a of deriveArticles('en')) {
      expect(a.target.tab, `${a.key} names Home`).toBe('Home');
      expect(resolvesFrom('Navigator', a.target), `${a.key} → ${a.target.screen}`).toBe(true);
    }
  });

  it('keys are unique and never collide with the hand-authored articles', () => {
    const derived = deriveArticles('en').map((a) => a.key);
    expect(new Set(derived).size, 'derived keys unique').toBe(derived.length);
    const authored = new Set(getLearnArticles('en').map((a) => a.key));
    for (const k of derived) expect(authored.has(k), `collision on ${k}`).toBe(false);
  });
});

describe('a derived article faithfully re-presents its source (no new claims)', () => {
  it('copies the rung body and citation verbatim', () => {
    const rung = getEscalationRungs('en')[0];
    const art = deriveArticles('en').find((a) => a.key === `ladder_${rung.key}`)!;
    expect(art.body.find((b) => b.kind === 'para')).toMatchObject({ text: rung.body });
    expect(art.citation).toBe(rung.citation);
    expect(art.derivedFrom).toEqual({ source: 'ladder', sourceKey: rung.key });
  });

  it('copies a process-map stage body and citation verbatim', () => {
    const stage = getRcStages('en')[1];
    const art = deriveArticles('en').find((a) => a.key === `rc_stage_${stage.key}`)!;
    expect(art.body.find((b) => b.kind === 'para')).toMatchObject({ text: stage.body });
    expect(art.citation).toBe(stage.citation);
  });

  it('copies a stack layer gets-text and citation verbatim', () => {
    const layer = deriveResourceStack(NEUTRAL, 'en').layers[0];
    const art = deriveArticles('en').find((a) => a.key === `stack_${layer.key}`)!;
    expect(art.body.find((b) => b.kind === 'para')).toMatchObject({ text: layer.gets });
    expect(art.citation).toBe(layer.citation);
  });

  it('carries a citation from its source, and NO reviewed seal (unreviewed drafts)', () => {
    for (const a of deriveArticles('en')) {
      expect(a.citation, `${a.key} inherits a citation`).toBeTruthy();
      // Provenance is inherited, but a human has not reviewed the derived PAGE —
      // it must not claim a review until 8-2 does. Same rule as 8-0.
      expect(a.reviewedOn, `${a.key} must not claim a review`).toBeUndefined();
    }
  });
});

describe('derived content is trilingual, structurally parallel', () => {
  it('same keys, targets and order in every language', () => {
    const en = deriveArticles('en');
    for (const loc of ['es', 'vi'] as const) {
      const other = deriveArticles(loc);
      expect(other.map((a) => a.key)).toEqual(en.map((a) => a.key));
      expect(other.map((a) => a.target.screen)).toEqual(en.map((a) => a.target.screen));
      expect(other.map((a) => a.body.map((b) => b.kind))).toEqual(
        en.map((a) => a.body.map((b) => b.kind))
      );
    }
  });

  it('translates the prose rather than repeating English', () => {
    const en = deriveArticles('en');
    for (const loc of ['es', 'vi'] as const) {
      deriveArticles(loc).forEach((a, i) => {
        const p = a.body.find((b) => b.kind === 'para');
        const enP = en[i].body.find((b) => b.kind === 'para');
        if (p?.kind === 'para' && enP?.kind === 'para') {
          expect(p.text, `${a.key} ${loc}`).not.toBe(enP.text);
        }
      });
    }
    // Citations never translate.
    expect(deriveArticles('es').map((a) => a.citation)).toEqual(en.map((a) => a.citation));
  });
});

describe('the summary is a real blurb, never a telegraphic fragment', () => {
  it('the RC-intake summary keeps the point, not just "Early Start"', () => {
    // Regression on F1: the intake body opens with a 4-word sentence; a naive
    // first-sentence blurb dropped the eligibility + cost message that IS the
    // point. summarize() accumulates whole sentences until the blurb says
    // something.
    const art = deriveArticles('en').find((a) => a.key === 'rc_stage_intake')!;
    expect(art.summary.length).toBeGreaterThan(40);
    expect(art.summary.toLowerCase()).toContain('lanterman');
  });

  it('no derived summary is a single sub-40-character fragment', () => {
    for (const a of deriveArticles('en')) {
      // Either it reached the length threshold, or the whole source was short.
      expect(a.summary.length, `${a.key} summary too short`).toBeGreaterThan(20);
    }
  });
});

describe('provenance coverage the 8-2 review must close', () => {
  it('every derived article inherits a citation string from its source', () => {
    for (const a of deriveArticles('en')) expect(a.citation, a.key).toBeTruthy();
  });

  it('EVERY derived citation already resolves in the registry — no backlog', () => {
    // The strong invariant: because derived articles inherit citations from
    // modules that already ship them on their own screens, and those are all in
    // contentSources, every derived citation resolves to a tappable source.
    // Derived content can compose (8-2) with NO plain-text citations and NO
    // registry work. If a source module ever adds an unregistered citation,
    // this fails — pointing at the registry gap before it reaches a family.
    const uncovered = [
      ...new Set(
        deriveArticles('en')
          .map((a) => a.citation)
          .filter((c): c is string => !!c)
          .filter((c) => !sourceForCitation(c))
      ),
    ];
    expect(uncovered, 'unregistered derived citations').toEqual([]);
  });
});
