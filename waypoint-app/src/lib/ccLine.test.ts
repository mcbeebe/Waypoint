import { describe, it, expect } from 'vitest';
import { ccLine } from './ccLine';

const contacts = [
  { name: 'Sam Rivera', email: 'Sam@Example.org' },
  { name: 'No Email', email: null },
];

describe('ccLine', () => {
  it('names a Key Contact and falls back to the address', () => {
    expect(ccLine({ direction: 'outgoing', cc: ['sam@example.org', 'advocate@example.org'] }, contacts)).toBe(
      'Cc: Sam Rivera, advocate@example.org'
    );
  });

  it('calls a synced reply’s list what it is — not a Cc', () => {
    expect(ccLine({ direction: 'incoming', cc: ['sam@example.org'] }, contacts)).toBe(
      'Also on this email: Sam Rivera'
    );
  });

  it('says nothing when nobody is recorded — including before migration 064', () => {
    expect(ccLine({ direction: 'outgoing', cc: null }, contacts)).toBeNull();
    expect(ccLine({ direction: 'outgoing', cc: [] }, contacts)).toBeNull();
    expect(ccLine({ direction: 'incoming' }, contacts)).toBeNull();
  });
});
