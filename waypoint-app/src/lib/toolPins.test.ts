import { describe, it, expect } from 'vitest';
import {
  MAX_PINS,
  SUGGEST_AFTER,
  addPin,
  defaultPins,
  normalizePins,
  pinStrings,
  removePin,
  suggestPin,
} from './toolPins';
import { getAllTools } from './toolsCatalog';

const VALID = getAllTools('en').map((t) => t.key);

describe('what comes back from the database is never trusted blindly', () => {
  it('keeps the pins it recognises, in order', () => {
    expect(normalizePins(['letters', 'requests'], VALID)).toEqual(['letters', 'requests']);
  });

  it('drops a tool that no longer exists rather than crashing on it', () => {
    expect(normalizePins(['letters', 'a_tool_we_renamed'], VALID)).toEqual(['letters']);
  });

  it('survives anything that is not a list of strings', () => {
    expect(normalizePins(null, VALID)).toEqual([]);
    expect(normalizePins('letters', VALID)).toEqual([]);
    expect(normalizePins([1, {}, null, 'letters'], VALID)).toEqual(['letters']);
  });

  it('de-duplicates and holds the cap even if the row is over it', () => {
    expect(normalizePins(['letters', 'letters'], VALID)).toEqual(['letters']);
    const tooMany = VALID.slice(0, MAX_PINS + 3);
    expect(normalizePins(tooMany, VALID)).toHaveLength(MAX_PINS);
  });

  it('starts a family off with the three action tools', () => {
    expect(defaultPins(VALID)).toEqual(['letters', 'requests', 'sent_received']);
  });
});

describe('the cap is honest, not silent', () => {
  const full = VALID.slice(0, MAX_PINS);

  it('refuses the seventh pin and says why', () => {
    const result = addPin(full, VALID[MAX_PINS]);
    expect(result.ok).toBe(false);
    expect(result.pins).toEqual(full);
    expect(result.message).toContain('Remove one first');
  });

  it('never evicts another parent’s tile to make room', () => {
    const result = addPin(full, VALID[MAX_PINS]);
    // A shared list where one pin silently pushes out another is the
    // quiet-overwrite problem in a different costume.
    expect(result.pins).toEqual(full);
  });

  it('treats pinning something already pinned as a no-op that succeeded', () => {
    const result = addPin(['letters'], 'letters');
    expect(result).toEqual({ pins: ['letters'], ok: true });
  });

  it('removes without disturbing the rest', () => {
    expect(removePin(['letters', 'requests', 'documents'], 'requests')).toEqual([
      'letters', 'documents',
    ]);
  });

  it('says the cap in every language', () => {
    for (const loc of ['en', 'es', 'vi'] as const) {
      expect(addPin(VALID.slice(0, MAX_PINS), 'documents', loc).message).toBeTruthy();
    }
  });
});

describe('Waypoint offers one pin, once', () => {
  const base = { pins: ['letters'], declined: [], validKeys: VALID };

  it('offers a tool opened enough times', () => {
    expect(suggestPin({ ...base, opens: { documents: SUGGEST_AFTER } })).toBe('documents');
  });

  it('stays quiet below the threshold', () => {
    expect(suggestPin({ ...base, opens: { documents: SUGGEST_AFTER - 1 } })).toBeNull();
  });

  it('never offers something already pinned', () => {
    expect(suggestPin({ ...base, opens: { letters: 99 } })).toBeNull();
  });

  it('never comes back after a no', () => {
    const declined = { ...base, declined: ['documents'], opens: { documents: 99 } };
    expect(suggestPin(declined)).toBeNull();
  });

  it('stays quiet when there is no room for another tile', () => {
    expect(
      suggestPin({
        pins: VALID.slice(0, MAX_PINS),
        declined: [],
        validKeys: VALID,
        opens: { documents: 99 },
      })
    ).toBeNull();
  });

  it('offers the most-used one, and picks the same one every render', () => {
    const opens = { documents: 4, insurance: 9, health: 9 };
    expect(suggestPin({ ...base, opens })).toBe('health');
    expect(suggestPin({ ...base, opens })).toBe('health');
  });

  it('ignores a tool key that no longer exists', () => {
    expect(suggestPin({ ...base, opens: { a_tool_we_renamed: 99 } })).toBeNull();
  });
});

describe('locale parity', () => {
  it('gives every locale the same keys, translated', () => {
    const en = pinStrings('en');
    for (const loc of ['es', 'vi'] as const) {
      const other = pinStrings(loc);
      expect(Object.keys(other)).toEqual(Object.keys(en));
      expect(other.heading).not.toBe(en.heading);
      expect(other.suggestTitle('Documents')).not.toBe(en.suggestTitle('Documents'));
      expect(other.suggestBody('Documents', 3)).toContain('3');
    }
  });
});
