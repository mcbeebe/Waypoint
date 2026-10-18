/**
 * The dependency lock, said.
 *
 * It is the ONLY feedback a locked tap gives — the status does not move — so
 * a parent who cannot read it is left with a control that looks broken. It
 * was English-only on both screens that say it.
 */
import { describe, it, expect } from 'vitest';
import type { ActionLocale } from '@/lib/actionMeta';
import { actionLockedBy, actionLockedByUnknown } from '@/lib/actionLock';

const LOCALES: ActionLocale[] = ['en', 'es', 'vi'];
const DEP = 'Request an IEP assessment';

describe('the lock is said in all three languages', () => {
  it('in three actually different languages, not English three times', () => {
    const named = LOCALES.map((l) => actionLockedBy(DEP, l));
    const unnamed = LOCALES.map((l) => actionLockedByUnknown(l));
    for (const s of [...named, ...unnamed]) expect(s.length).toBeGreaterThan(0);
    expect(new Set(named).size).toBe(3);
    expect(new Set(unnamed).size).toBe(3);
  });

  it('defaults to English when no locale is given', () => {
    expect(actionLockedBy(DEP)).toBe(actionLockedBy(DEP, 'en'));
    expect(actionLockedByUnknown()).toBe(actionLockedByUnknown('en'));
  });

  it('names the step it waits on, in every language', () => {
    for (const locale of LOCALES) {
      const said = actionLockedBy(DEP, locale);
      expect(said, locale).toContain(DEP);
      // Quoted, so a dependency title that is itself a sentence cannot be
      // read as part of this one.
      expect(said, locale).toContain(`"${DEP}"`);
    }
  });

  it('says only that an order exists when there is no step to name', () => {
    // A dependency on another child's plan, or one deleted since: naming
    // nothing is right, inventing a name is not.
    for (const locale of LOCALES) {
      expect(actionLockedByUnknown(locale), locale).not.toContain('""');
      expect(actionLockedByUnknown(locale), locale).not.toBe(actionLockedBy(DEP, locale));
    }
  });
});

describe('it states the order, and blames nobody', () => {
  /**
   * Same rule as `homeTriage` and the seeded sentence in `actionAsk`: the
   * copy states a status, never an actor who fell short. A parent meeting
   * this toast has just tapped a control that did nothing, which is already
   * the moment they are most likely to read a rebuke into plain words — and
   * an English-only guard cannot see a Spanish or Vietnamese one.
   */
  const banned: Record<ActionLocale, RegExp> = {
    en: /you (forgot|failed|didn't|haven't|should have|need to)|not allowed|you can'?t|error|invalid/i,
    es: /usted (olvidó|no |debería|tiene que)|no (puede|permitido)|error|inválido/i,
    vi: /quý vị (đã quên|chưa|phải|không thể)|không được phép|lỗi/i,
  };

  it('in every language', () => {
    for (const locale of LOCALES) {
      const said = `${actionLockedBy(DEP, locale)} ${actionLockedByUnknown(locale)}`;
      expect(said, locale).not.toMatch(banned[locale]);
    }
  });

  it('and gives the reason, so the lock reads as the process and not a refusal', () => {
    // Without the second clause this is just "no".
    expect(actionLockedBy(DEP, 'en')).toMatch(/builds on/i);
    expect(actionLockedBy(DEP, 'es')).toMatch(/se basa en/i);
    expect(actionLockedBy(DEP, 'vi')).toMatch(/dựa vào/i);
  });
});
