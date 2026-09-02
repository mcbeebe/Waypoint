import { describe, it, expect } from 'vitest';
import {
  isNewlyAdded,
  formatAddedOn,
  newBadgeLabel,
  NEW_ACTION_WINDOW_MS,
} from './actionFreshness';

/** A fixed local noon, so "today"/"yesterday" never straddle a boundary. */
const NOW = new Date(2026, 8, 2, 12, 0, 0); // Sep 2 2026, local
const iso = (d: Date) => d.toISOString();
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000);

describe('isNewlyAdded', () => {
  it('flags something saved minutes ago', () => {
    expect(isNewlyAdded(iso(hoursAgo(0.1)), NOW)).toBe(true);
  });

  it('flags something saved just inside the window', () => {
    const justInside = new Date(NOW.getTime() - NEW_ACTION_WINDOW_MS + 60_000);
    expect(isNewlyAdded(iso(justInside), NOW)).toBe(true);
  });

  it('does NOT flag something older than the window', () => {
    const justOutside = new Date(NOW.getTime() - NEW_ACTION_WINDOW_MS - 60_000);
    expect(isNewlyAdded(iso(justOutside), NOW)).toBe(false);
  });

  it('treats a future timestamp as new — clock skew is not age', () => {
    expect(isNewlyAdded(iso(new Date(NOW.getTime() + 3600_000)), NOW)).toBe(true);
  });

  it('never flags a missing or unparsable timestamp', () => {
    // A false "New" on a month-old item is worse than no flag at all.
    expect(isNewlyAdded(null, NOW)).toBe(false);
    expect(isNewlyAdded(undefined, NOW)).toBe(false);
    expect(isNewlyAdded('', NOW)).toBe(false);
    expect(isNewlyAdded('not a date', NOW)).toBe(false);
  });

  it('accepts a numeric clock as well as a Date', () => {
    expect(isNewlyAdded(iso(hoursAgo(1)), NOW.getTime())).toBe(true);
  });
});

describe('formatAddedOn', () => {
  it('says "today" for anything on the same local day', () => {
    expect(formatAddedOn(iso(new Date(2026, 8, 2, 0, 30)), NOW)).toBe('Added today');
    expect(formatAddedOn(iso(new Date(2026, 8, 2, 23, 30)), NOW)).toBe('Added today');
  });

  it('says "yesterday" by calendar day, not by 24 hours', () => {
    // 13 hours ago is yesterday evening — a pure 24h rule would say "today".
    expect(formatAddedOn(iso(new Date(2026, 8, 1, 23, 0)), NOW)).toBe('Added yesterday');
  });

  it('falls back to a short date further back', () => {
    expect(formatAddedOn(iso(new Date(2026, 7, 20, 9, 0)), NOW)).toBe('Added Aug 20');
  });

  it('includes the year once it differs, so an old item cannot read as recent', () => {
    expect(formatAddedOn(iso(new Date(2025, 8, 2, 9, 0)), NOW)).toBe('Added Sep 2, 2025');
  });

  it('returns empty for a missing or unparsable timestamp', () => {
    expect(formatAddedOn(null, NOW)).toBe('');
    expect(formatAddedOn('nonsense', NOW)).toBe('');
  });

  it('speaks the three shipped locales', () => {
    const today = iso(new Date(2026, 8, 2, 8, 0));
    expect(formatAddedOn(today, NOW, 'es')).toBe('Añadido hoy');
    expect(formatAddedOn(today, NOW, 'vi')).toBe('Đã thêm hôm nay');
    expect(newBadgeLabel('es')).toBe('Nuevo');
    expect(newBadgeLabel('vi')).toBe('Mới');
    expect(newBadgeLabel()).toBe('New');
  });
});
