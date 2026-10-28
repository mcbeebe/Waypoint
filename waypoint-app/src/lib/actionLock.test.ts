/**
 * The dependency lock, said.
 *
 * It is the ONLY feedback a locked tap gives — the status does not move — so
 * a parent who cannot read it is left with a control that looks broken. It
 * was English-only on both screens that say it.
 */
import { describe, it, expect } from 'vitest';
import type { ActionLocale } from '@/lib/actionMeta';
import { actionLockedBy, actionLockedByUnknown, actionLockMessage } from '@/lib/actionLock';

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

describe('and they are actually Spanish and Vietnamese', () => {
  it('says the Spanish words a Spanish reader expects', () => {
    expect(actionLockedBy(DEP, 'es')).toBe(
      `Primero complete "${DEP}": este paso se basa en ese.`
    );
    expect(actionLockedByUnknown('es')).toMatch(/^Este paso se desbloquea/);
  });

  it('is written in Vietnamese orthography', () => {
    const VIETNAMESE_ONLY = /[ăâđêôơưẠ-ỹ]/;
    expect(actionLockedBy(DEP, 'vi')).toMatch(VIETNAMESE_ONLY);
    expect(actionLockedByUnknown('vi')).toMatch(VIETNAMESE_ONLY);
  });
});

/**
 * The predicate and the sentence together, because the two screens that lock
 * a step disagreed about the predicate: the tracker treats a dependency whose
 * row is not loaded as unfinished, and the detail screen's guard required the
 * row to be found — so a step whose dependency had been deleted was drawn
 * with a padlock in the tracker and could be marked Done from the detail
 * screen one tap later.
 */
describe('whether a step is locked at all', () => {
  const unlocked = { dependsOn: null, dependencyCompleted: false };

  it('is not locked when it builds on nothing', () => {
    expect(actionLockMessage(unlocked)).toBeNull();
  });

  it('is not locked once the step it builds on is done', () => {
    expect(
      actionLockMessage({ dependsOn: 'gate', dependencyTitle: DEP, dependencyCompleted: true })
    ).toBeNull();
  });

  it('is locked, and names the step, while that step is open', () => {
    expect(
      actionLockMessage(
        { dependsOn: 'gate', dependencyTitle: DEP, dependencyCompleted: false },
        'es'
      )
    ).toBe(actionLockedBy(DEP, 'es'));
  });

  it('stays locked when the step it builds on is not in the loaded list', () => {
    // Not loaded is not finished. The app cannot see that the step was done,
    // and saying it was would be a claim about their plan that nothing
    // supports — so the lock holds and the sentence names nothing.
    const said = actionLockMessage(
      { dependsOn: 'deleted', dependencyTitle: undefined, dependencyCompleted: false },
      'vi'
    );
    expect(said).toBe(actionLockedByUnknown('vi'));
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
