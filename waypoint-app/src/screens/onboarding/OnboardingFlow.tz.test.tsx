/**
 * The birthday onboarding saves, rendered in BOTH hemispheres.
 *
 * WHY THIS FILE IS SEPARATE FROM `OnboardingFlow.test.tsx`.
 * The same assertion lived in the plain `ui` project first, and it was
 * DECORATIVE. CI runs at `TZ=UTC`, where `toISOString().split('T')[0]` and the
 * local calendar day are the same string — so the test passed with the bug
 * still in the file. Putting the UTC bug back and running it proved the point:
 * green under UTC, red only at UTC+7.
 *
 * So this file is `.tz.test.tsx` and runs twice — `ui-tz`
 * (`Asia/Ho_Chi_Minh`) and `ui-tz-west` (`America/Los_Angeles`) — exactly as
 * the `tz`/`tz-west` logic projects already do for pure modules.
 *
 * THE BUG IT PINS. `OnboardingFlow` saved `date_of_birth` with
 * `data.birthday?.toISOString().split('T')[0]` while the picker beside it used
 * a local-day helper defined in the same file. `new Date(y, m-1, d)` is local
 * midnight, which east of Greenwich is still YESTERDAY in UTC — so every
 * family in a UTC+ zone had their child's birthday stored a day early. That
 * column drives the age band, the Early Start exit at 3, and transition
 * planning at 16.
 *
 * Nothing here may assume the sign of the offset: the assertion is simply that
 * the day saved is the day picked, which must hold everywhere.
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({ inserts: [] as { table: string; rows: unknown }[] }));

vi.mock('@/lib/supabase', () => {
  const write = (table: string) => (rows: unknown) => {
    h.inserts.push({ table, rows });
    const result = { data: { id: `${table}-id`, ...(rows as object) }, error: null };
    const thenable = {
      select: () => thenable,
      single: async () => result,
      then: (r: (v: unknown) => unknown) => Promise.resolve(result).then(r),
    };
    return thenable;
  };
  return {
    supabase: {
      from: (table: string) => ({ insert: write(table), upsert: write(table) }),
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) },
    },
  };
});

vi.mock('@/lib/dialogs', () => ({ showAlert: () => {} }));
vi.mock('@/lib/planGenerator', () => ({ generateStarterPlan: () => [] }));
vi.mock('@/lib/analytics', () => ({ trackFunnelStep: async () => {} }));
vi.mock('@react-native-community/datetimepicker', () => ({ default: () => null }));

import OnboardingFlow from './OnboardingFlow';

const cta = () =>
  screen.queryByRole('button', { name: 'Next' }) ??
  screen.getByRole('button', { name: "Let's go!" });

const choices = () =>
  screen
    .getAllByRole('button')
    .filter((b) => !/^(Next|Back|Let's go!|Don't know your ZIP)/.test((b.textContent ?? '').trim()));

/** Walk the six questions, picking `picked` as the birthday. */
async function completeWith(picked: string) {
  render(<OnboardingFlow onComplete={vi.fn()} />);
  fireEvent.change(screen.getByPlaceholderText('e.g., Sarah'), { target: { value: 'Sarah' } });
  fireEvent.change(screen.getByPlaceholderText('e.g., Maya'), { target: { value: 'Maya' } });
  fireEvent.click(cta());

  fireEvent.click(screen.getAllByRole('button').find((b) => /autism/i.test(b.textContent ?? ''))!);
  fireEvent.click(cta());

  fireEvent.change(screen.getByLabelText("Child's birthday"), { target: { value: picked } });
  fireEvent.click(cta());

  for (let i = 0; i < 3; i++) {
    const first = choices()[0];
    if (first) fireEvent.click(first);
    fireEvent.click(cta());
  }

  await waitFor(() => expect(h.inserts.some((i) => i.table === 'children')).toBe(true));
  const child = h.inserts.find((i) => i.table === 'children')!.rows as Record<string, unknown>;
  return child;
}

beforeEach(() => {
  h.inserts.length = 0;
});

describe('the birthday saved is the birthday picked, in any timezone', () => {
  it("saves New Year's Day as New Year's Day", async () => {
    // The canonical failure: local midnight Jan 1 is Dec 31 in UTC at any
    // positive offset, so this saved 2019-12-31 for a family in Vietnam.
    const child = await completeWith('2020-01-01');
    expect(child.date_of_birth).toBe('2020-01-01');
  });

  it('saves a mid-month date unchanged', async () => {
    const child = await completeWith('2021-06-15');
    expect(child.date_of_birth).toBe('2021-06-15');
  });

  it('saves a leap day unchanged', async () => {
    const child = await completeWith('2024-02-29');
    expect(child.date_of_birth).toBe('2024-02-29');
  });

  it('saves the last day of a year unchanged', async () => {
    // The mirror case, for the western run: local Dec 31 is already Jan 1 in
    // UTC once the offset is negative enough late in the day.
    const child = await completeWith('2022-12-31');
    expect(child.date_of_birth).toBe('2022-12-31');
  });
});
