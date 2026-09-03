/**
 * The one status/priority table.
 *
 * This module exists because the same two tables lived in five places and had
 * already drifted apart in ways a parent could see: the list card said `Med`
 * and `To Do` and `Done`, the detail screen said `Medium` and `Not Started`
 * and `Completed`, the edit sheet said `Medium` again with a third colour set,
 * and `theme.ts` carried a fourth "urgent" hex none of them used. Nothing
 * pinned any of them to each other.
 *
 * So what this file guards is mostly not arithmetic — it is that the vocabulary
 * stays single, complete in three languages, and ordered the way every caller
 * assumes.
 */
import { describe, it, expect } from 'vitest';
import {
  PRIORITY_META,
  PRIORITY_ORDER,
  PRIORITY_RANK,
  STATUS_META,
  STATUS_ORDER,
  STATUS_PRIMARY,
  metaHeading,
  priorityActionLabel,
  priorityLabel,
  statusActionLabel,
  statusLabel,
  type ActionLocale,
} from './actionMeta';
import type { ActionPriority, ActionStatus } from '@/types/database';

const LOCALES: ActionLocale[] = ['en', 'es', 'vi'];

/** Every status the database allows — the check constraint in migration 004. */
const ALL_STATUSES: ActionStatus[] = [
  'not_started',
  'in_progress',
  'completed',
  'dismissed',
];
const ALL_PRIORITIES: ActionPriority[] = ['urgent', 'high', 'medium', 'low'];

// ─── Completeness ───────────────────────────────────────────────────────────

describe('every status and priority the database allows is covered', () => {
  it('STATUS_ORDER is exactly the four allowed statuses, no more and no fewer', () => {
    expect([...STATUS_ORDER].sort()).toEqual([...ALL_STATUSES].sort());
  });

  it('PRIORITY_ORDER is exactly the four allowed priorities', () => {
    expect([...PRIORITY_ORDER].sort()).toEqual([...ALL_PRIORITIES].sort());
  });

  it('has a glyph and colours for every status', () => {
    for (const s of ALL_STATUSES) {
      expect(STATUS_META[s].glyph).toBeTruthy();
      expect(STATUS_META[s].color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(STATUS_META[s].tint).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('has colours for every priority', () => {
    for (const p of ALL_PRIORITIES) {
      expect(PRIORITY_META[p].color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(PRIORITY_META[p].bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('names every status and priority in all three languages', () => {
    for (const locale of LOCALES) {
      for (const s of ALL_STATUSES) expect(statusLabel(s, locale)).toBeTruthy();
      for (const p of ALL_PRIORITIES) {
        expect(priorityLabel(p, locale)).toBeTruthy();
        expect(priorityLabel(p, locale, true)).toBeTruthy();
      }
      expect(metaHeading('status', locale)).toBeTruthy();
      expect(metaHeading('priority', locale)).toBeTruthy();
    }
  });

  it('is genuinely translated, not English copied into three tables', () => {
    expect(statusLabel('in_progress', 'es')).not.toBe(statusLabel('in_progress', 'en'));
    expect(statusLabel('in_progress', 'vi')).not.toBe(statusLabel('in_progress', 'en'));
    expect(priorityLabel('urgent', 'es')).not.toBe(priorityLabel('urgent', 'en'));
    expect(priorityLabel('urgent', 'vi')).not.toBe(priorityLabel('urgent', 'en'));
  });

  it('falls back to English rather than rendering undefined', () => {
    expect(statusLabel('completed', 'fr' as never)).toBe(statusLabel('completed', 'en'));
    expect(priorityLabel('high', 'fr' as never)).toBe(priorityLabel('high', 'en'));
    expect(metaHeading('status', 'fr' as never)).toBe(metaHeading('status', 'en'));
  });
});

// ─── Order and rank ─────────────────────────────────────────────────────────

describe('order', () => {
  it('ranks priorities most urgent first, with no ties', () => {
    const ranks = PRIORITY_ORDER.map((p) => PRIORITY_RANK[p]);
    expect(ranks).toEqual([0, 1, 2, 3]);
    expect(new Set(ranks).size).toBe(4);
  });

  it('matches the rank table agenda.ts used to keep separately', () => {
    // `agenda.ts` now imports this one; the literal is repeated here so a
    // change to either is caught rather than silently agreed to.
    expect(PRIORITY_RANK).toEqual({ urgent: 0, high: 1, medium: 2, low: 3 });
  });

  it('puts dismissed last — it is an escape hatch, not a step on the path', () => {
    expect(STATUS_ORDER[STATUS_ORDER.length - 1]).toBe('dismissed');
  });
});

describe('the compact status set', () => {
  it('is the three states a parent moves through, in order', () => {
    expect(STATUS_PRIMARY).toEqual(['not_started', 'in_progress', 'completed']);
  });

  it('never offers Dismiss as a segment', () => {
    // Dismissing is the one status change a parent cannot undo by tapping the
    // next option along, so it must not sit one mis-tap from "Done".
    expect(STATUS_PRIMARY).not.toContain('dismissed');
  });

  it('is a subset of the full order', () => {
    for (const s of STATUS_PRIMARY) expect(STATUS_ORDER).toContain(s);
  });
});

// ─── Spoken labels ──────────────────────────────────────────────────────────

describe('what a screen reader hears', () => {
  it('describes the ACTION, not just the state name', () => {
    // A bare "Done" reads as a description of the step rather than a button
    // that changes it.
    expect(statusActionLabel('completed', 'en')).toBe('Mark as Done');
    expect(priorityActionLabel('urgent', 'en')).toBe('Set priority to Urgent');
  });

  it('contains the state name it is about, in every language', () => {
    for (const locale of LOCALES) {
      for (const s of ALL_STATUSES) {
        expect(statusActionLabel(s, locale)).toContain(statusLabel(s, locale));
      }
      for (const p of ALL_PRIORITIES) {
        expect(priorityActionLabel(p, locale)).toContain(priorityLabel(p, locale));
      }
    }
  });

  it('is longer than the visible label — it is a sentence, not a repeat', () => {
    for (const locale of LOCALES) {
      expect(statusActionLabel('in_progress', locale).length).toBeGreaterThan(
        statusLabel('in_progress', locale).length
      );
    }
  });
});

// ─── The short form ─────────────────────────────────────────────────────────

describe('the card-badge short form', () => {
  it('only shortens Medium — the one that crowds a narrow meta row', () => {
    expect(priorityLabel('medium', 'en', true)).toBe('Med');
    for (const p of ['urgent', 'high', 'low'] as const) {
      expect(priorityLabel(p, 'en', true)).toBe(priorityLabel(p, 'en'));
    }
  });

  it('is never longer than the full form', () => {
    for (const locale of LOCALES) {
      for (const p of ALL_PRIORITIES) {
        expect(priorityLabel(p, locale, true).length).toBeLessThanOrEqual(
          priorityLabel(p, locale).length
        );
      }
    }
  });
});

// ─── The vocabulary the two screens now share ───────────────────────────────

describe('the two screens say the same words', () => {
  it('has one name per status — the drift this module was built to end', () => {
    // Before consolidation: the list card said "To Do"/"Done" while the detail
    // screen said "Not Started"/"Completed", for the same action.
    expect(statusLabel('not_started', 'en')).toBe('To Do');
    expect(statusLabel('completed', 'en')).toBe('Done');
  });

  it('has one name per priority', () => {
    // Before consolidation: "Med" on the card, "Medium" on the other two.
    expect(priorityLabel('medium', 'en')).toBe('Medium');
  });
});
