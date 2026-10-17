import { describe, expect, it } from 'vitest';
import { rcListItems, type RcListInput } from './rcList';

const rc = (rcId: string, rcName: string, counties: string[], url: string | null = `/regional-centers/${rcId}/`): RcListInput => ({
  rcId,
  rcName,
  counties,
  url,
});

describe('rcListItems', () => {
  it('sorts by center name and keeps every record', () => {
    const items = rcListItems([rc('b', 'Beta RC', ['Kern']), rc('a', 'Alpha RC', ['Inyo'])]);
    expect(items.map((i) => i.rcId)).toEqual(['a', 'b']);
  });

  it('names whole counties, with the right noun and joiner', () => {
    const [one, two, three] = rcListItems([
      rc('a', 'A', ['Orange']),
      rc('b', 'B', ['Alameda', 'Contra Costa']),
      rc('c', 'C', ['Napa', 'Solano', 'Sonoma']),
    ]);
    expect(one.area).toBe('Orange County');
    expect(two.area).toBe('Alameda and Contra Costa counties');
    expect(three.area).toBe('Napa, Solano and Sonoma counties');
  });

  it('says "part of" for a county more than one center serves', () => {
    const items = rcListItems([rc('h', 'Harbor', ['Los Angeles']), rc('w', 'Westside', ['Los Angeles'])]);
    expect(items.map((i) => i.area)).toEqual(['Part of Los Angeles County', 'Part of Los Angeles County']);
  });

  it('mixes whole and shared counties', () => {
    const [a] = rcListItems([rc('a', 'A', ['Kern', 'Los Angeles']), rc('b', 'B', ['Los Angeles'])]);
    expect(a.area).toBe('Kern County; part of Los Angeles County');
  });

  it('carries a null url through so the page can render it unlinked', () => {
    expect(rcListItems([rc('a', 'A', ['Kern'], null)])[0].url).toBeNull();
  });

  it('does not reorder the caller\'s array', () => {
    const input = [rc('b', 'B', ['Kern']), rc('a', 'A', ['Inyo'])];
    rcListItems(input);
    expect(input.map((r) => r.rcId)).toEqual(['b', 'a']);
  });
});
