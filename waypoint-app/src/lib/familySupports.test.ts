/**
 * Family supports you have to ask for (initiative 005, PR A).
 *
 * This tier is family-facing, legal-framing content, so it carries the same
 * discipline the Learn library does: every support carries the catch (the whole
 * point), a citation that resolves, collaborative-first tone, and full
 * trilingual parity — a translated header over English steps is the failure the
 * Learn suite already caught once, guarded here too.
 */
import { describe, it, expect } from 'vitest';
import { getFamilySupports, getFamilySupport, fillScript, type FamilySupport } from './familySupports';
import { sourceForCitation } from '@/data/contentSources';

const LOCALES = ['en', 'es', 'vi'] as const;

/** Everything a support says, flattened — for tone checks. */
function allProse(s: FamilySupport): string {
  return [s.name, s.tagline, s.whatItIs, s.theCatch, ...s.howToAsk, s.script, s.ippNeedHook].join(' ');
}

describe('the tier exists and leads with sibling support', () => {
  it('includes sibling support, and it comes first', () => {
    const keys = getFamilySupports('en').map((s) => s.key);
    expect(keys[0]).toBe('sibling_support');
    expect(keys).toEqual(expect.arrayContaining(['respite', 'camp_recreation', 'parent_training']));
  });

  it('getFamilySupport returns one by key, or null', () => {
    expect(getFamilySupport('sibling_support', 'en')?.key).toBe('sibling_support');
    expect(getFamilySupport('does_not_exist', 'en')).toBeNull();
  });
});

describe('every support carries the catch — the whole point', () => {
  it('states that it is not automatic and ties to an identified need in the IPP', () => {
    for (const loc of LOCALES) {
      for (const s of getFamilySupports(loc)) {
        expect(s.theCatch.length, `${s.key} ${loc} catch`).toBeGreaterThan(0);
        // The EN copy says it in words; the point is the field is real, not empty.
        if (loc === 'en') {
          expect(s.theCatch.toLowerCase(), `${s.key} catch`).toMatch(/not automatic/);
          expect(`${s.theCatch} ${s.whatItIs} ${s.howToAsk.join(' ')}`.toLowerCase()).toMatch(/ipp/);
        }
      }
    }
  });

  it('gives every support a how-to-ask with real steps and a script and an IPP-need hook', () => {
    for (const s of getFamilySupports('en')) {
      expect(s.howToAsk.length, `${s.key} steps`).toBeGreaterThanOrEqual(3);
      for (const step of s.howToAsk) expect(step.length).toBeGreaterThan(0);
      expect(s.script.length, `${s.key} script`).toBeGreaterThan(0);
      expect(s.ippNeedHook.length, `${s.key} ippNeedHook`).toBeGreaterThan(0);
    }
  });
});

describe('a legal claim carries a source that has been verified', () => {
  it('resolves every citation against the registry', () => {
    for (const s of getFamilySupports('en')) {
      expect(sourceForCitation(s.citation), `orphan citation: ${s.citation}`).not.toBeNull();
    }
  });

  it('never translates a citation', () => {
    const en = getFamilySupports('en').map((s) => s.citation);
    for (const loc of ['es', 'vi'] as const) {
      expect(getFamilySupports(loc).map((s) => s.citation)).toEqual(en);
    }
  });
});

describe('collaborative-first tone (owner rule) — an ask, never a demand or blame', () => {
  it('never phrases the support as a demand', () => {
    for (const loc of LOCALES) {
      for (const s of getFamilySupports(loc)) {
        expect(allProse(s).toLowerCase(), `${s.key} ${loc}`).not.toMatch(/\bdemand\b|exigir|yêu sách/);
      }
    }
  });

  it('states the situation, never blames the coordinator for hiding it', () => {
    // "it's not automatic" / "rarely offered" is the situation; "they hid it" /
    // "they don't want you to know" is blame. The framing a parent reads first
    // is the one they carry into the room — it starts neutral.
    for (const loc of LOCALES) {
      for (const s of getFamilySupports(loc)) {
        expect(allProse(s).toLowerCase(), `${s.key} ${loc}`).not.toMatch(
          /hid(e|ing|den)? it|don'?t want you|keep(ing)? you from|withhold|ocultan|esconden|giấu/
        );
      }
    }
  });
});

describe('full trilingual parity — a translated header over English steps is the failure', () => {
  it('gives every locale the same keys and structure', () => {
    const en = getFamilySupports('en');
    for (const loc of ['es', 'vi'] as const) {
      const other = getFamilySupports(loc);
      expect(other.map((s) => s.key)).toEqual(en.map((s) => s.key));
      expect(other.map((s) => s.icon)).toEqual(en.map((s) => s.icon));
      other.forEach((s, i) => {
        expect(s.howToAsk.length, `${s.key} ${loc} step count`).toBe(en[i].howToAsk.length);
        expect(s.terms.length, `${s.key} ${loc} terms`).toBeGreaterThan(0);
      });
    }
  });

  it('translates the copy rather than repeating English — name, catch, and every step', () => {
    const en = getFamilySupports('en');
    for (const loc of ['es', 'vi'] as const) {
      getFamilySupports(loc).forEach((s, i) => {
        expect(s.whatItIs, `${s.key} ${loc} whatItIs`).not.toBe(en[i].whatItIs);
        expect(s.theCatch, `${s.key} ${loc} catch`).not.toBe(en[i].theCatch);
        expect(s.script, `${s.key} ${loc} script`).not.toBe(en[i].script);
        s.howToAsk.forEach((step, k) => {
          expect(step, `${s.key} ${loc} step ${k}`).not.toBe(en[i].howToAsk[k]);
        });
      });
    }
  });
});

describe('the script reads as the parent’s own', () => {
  it('fills the child’s name into the placeholder', () => {
    const s = getFamilySupport('sibling_support', 'en')!;
    const filled = fillScript(s.script, 'Teddy');
    expect(filled).toContain('Teddy');
    expect(filled).not.toContain('{child}');
  });

  it('falls back to a neutral word in the script’s own language when no name', () => {
    expect(fillScript(getFamilySupport('sibling_support', 'en')!.script, null)).toContain('your child');
    expect(fillScript(getFamilySupport('sibling_support', 'es')!.script, '')).toContain('su hijo/a');
    expect(fillScript(getFamilySupport('sibling_support', 'vi')!.script, null)).toContain('con quý vị');
    // And never leaves the raw placeholder behind.
    for (const loc of LOCALES) {
      expect(fillScript(getFamilySupport('sibling_support', loc)!.script, null)).not.toContain('{child}');
    }
  });
});
