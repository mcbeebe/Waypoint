/**
 * Onboarding, rendered.
 *
 * This is the whole acquisition funnel — six required questions between a
 * signed-up account and a usable app — and it had **zero tests**. Everything
 * downstream is built out of what it writes: `families` and `children` are
 * created here, the diagnoses drive eligibility reasoning and KB routing, and
 * the birthday drives the age band, the Early Start exit at 3 and transition
 * planning at 16.
 *
 * What is asserted here is the two things a logic test structurally cannot
 * see: that the GATE actually holds (a parent cannot advance past a question
 * they have not answered, so no half-built family reaches the app), and that
 * the SAVE writes what the rest of the product reads.
 *
 * The date-of-birth defect found while writing this is pinned NEXT DOOR, in
 * `OnboardingFlow.tz.test.tsx`, not here — CI runs at TZ=UTC, where the buggy
 * and correct values are the same string, so an assertion in this project
 * would be decorative. That file runs east and west.
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ─── Supabase: record every insert so the save contract can be asserted ─────
const h = vi.hoisted(() => ({
  inserts: [] as { table: string; rows: unknown }[],
  failOn: null as string | null,
}));

vi.mock('@/lib/supabase', () => {
  // `families` is written with upsert(onConflict: user_id), the others with
  // insert — both are recorded, because the ORDER of the three writes is part
  // of what this file pins.
  const write = (table: string) => (rows: unknown) => {
    h.inserts.push({ table, rows });
    const failing = h.failOn === table;
    const result = {
      data: failing ? null : { id: `${table}-id`, ...(rows as object) },
      error: failing ? { message: `${table} exploded` } : null,
    };
    const thenable = {
      select: () => thenable,
      single: async () => result,
      then: (r: (v: unknown) => unknown) => Promise.resolve(result).then(r),
    };
    return thenable;
  };
  const build = (table: string) => ({
    insert: write(table),
    upsert: write(table),
  });
  return {
    supabase: {
      from: (table: string) => build(table),
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) },
    },
  };
});

const alerts = vi.hoisted(() => ({ shown: [] as { title: string }[] }));
vi.mock('@/lib/dialogs', () => ({
  showAlert: (title: string) => void alerts.shown.push({ title }),
}));

vi.mock('@/lib/planGenerator', () => ({
  generateStarterPlan: () => [{ title: 'Call your Regional Center', category: 'regional_center' }],
}));

vi.mock('@/lib/analytics', () => ({ trackFunnelStep: async () => {} }));

vi.mock('@react-native-community/datetimepicker', () => ({ default: () => null }));

import OnboardingFlow from './OnboardingFlow';

/** The rows a table received, flattened. */
function rowsFor(table: string): Record<string, unknown>[] {
  return h.inserts
    .filter((i) => i.table === table)
    .flatMap((i) => (Array.isArray(i.rows) ? i.rows : [i.rows])) as Record<string, unknown>[];
}

/** The primary CTA — 'Next' on questions 1-5, "Let's go!" on the last. */
const cta = () =>
  screen.queryByRole('button', { name: 'Next' }) ??
  screen.getByRole('button', { name: "Let's go!" });

const ctaDisabled = () => cta().getAttribute('aria-disabled') === 'true';

/** The chips on a single-choice question, excluding chrome. */
const choices = () =>
  screen
    .getAllByRole('button')
    .filter((b) => !/^(Next|Back|Let's go!|Don't know your ZIP)/.test((b.textContent ?? '').trim()));

/** Answer whatever single-choice question is showing, then advance. */
function answerAndAdvance() {
  const first = choices()[0];
  if (first) fireEvent.click(first);
  fireEvent.click(cta());
}

/** Fill step 0 (parent + child name) — the gate every later step sits behind. */
function fillNames() {
  fireEvent.change(screen.getByPlaceholderText('e.g., Sarah'), { target: { value: 'Sarah' } });
  fireEvent.change(screen.getByPlaceholderText('e.g., Maya'), { target: { value: 'Maya' } });
}

beforeEach(() => {
  h.inserts.length = 0;
  h.failOn = null;
  alerts.shown.length = 0;
});

// ─── The gate ───────────────────────────────────────────────────────────────

describe('the gate — a half-answered family never reaches the app', () => {
  it('opens on the first question with no way back', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    expect(screen.getByText('Welcome to Waypoint')).toBeInTheDocument();
    // There is nothing behind step 0, so offering "Back" would be a dead control.
    expect(screen.queryByLabelText('Go back')).toBeNull();
  });

  it('will not advance while either name is blank', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);

    expect(ctaDisabled()).toBe(true);
    fireEvent.click(cta());
    expect(screen.getByText('Welcome to Waypoint')).toBeInTheDocument();

    // One name is not enough — the child's name is what every later screen says.
    fireEvent.change(screen.getByPlaceholderText('e.g., Sarah'), { target: { value: 'Sarah' } });
    expect(ctaDisabled()).toBe(true);
    fireEvent.click(cta());
    expect(screen.getByText('Welcome to Waypoint')).toBeInTheDocument();
  });

  it('advances once both names are given, and offers Back from there', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    fillNames();
    fireEvent.click(cta());

    expect(screen.queryByText('Welcome to Waypoint')).toBeNull();
    expect(screen.getByLabelText('Go back')).toBeInTheDocument();
  });

  it('Back returns to the previous question with the answers still there', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    fillNames();
    fireEvent.click(cta());
    fireEvent.click(screen.getByLabelText('Go back'));

    expect(screen.getByText('Welcome to Waypoint')).toBeInTheDocument();
    // Retyping a name because you stepped back is how funnels lose people.
    expect(screen.getByPlaceholderText('e.g., Sarah')).toHaveValue('Sarah');
    expect(screen.getByPlaceholderText('e.g., Maya')).toHaveValue('Maya');
  });

  it('will not advance past the diagnosis question with nothing selected', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    fillNames();
    fireEvent.click(cta());

    // Diagnoses drive eligibility and KB routing, so an empty set would
    // produce advice built on nothing.
    expect(screen.getByText('Select all that apply')).toBeInTheDocument();
    expect(ctaDisabled()).toBe(true);
    fireEvent.click(cta());
    expect(screen.getByText('Select all that apply')).toBeInTheDocument();

    // Picking one opens the gate.
    fireEvent.click(screen.getAllByRole('button').find((b) => /autism/i.test(b.textContent ?? ''))!);
    expect(ctaDisabled()).toBe(false);
  });

  it('never writes anything to the database before the last question', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    fillNames();
    fireEvent.click(cta());
    fireEvent.click(cta());
    expect(h.inserts).toHaveLength(0);
  });
});

// ─── The save contract ──────────────────────────────────────────────────────

describe('what onboarding writes', () => {
  /** Walk all six questions using the real controls, then submit. */
  async function completeFlow(): Promise<() => void> {
    const onComplete = vi.fn();
    render(<OnboardingFlow onComplete={onComplete} />);
    fillNames();
    fireEvent.click(cta());

    // Diagnoses.
    fireEvent.click(screen.getAllByRole('button').find((b) => /autism/i.test(b.textContent ?? ''))!);
    fireEvent.click(cta());

    // Birthday — the web build renders a native date input.
    fireEvent.change(screen.getByLabelText("Child's birthday"), {
      target: { value: '2020-01-01' },
    });
    fireEvent.click(cta());

    // RC status, IEP status, insurance.
    answerAndAdvance();
    answerAndAdvance();
    answerAndAdvance();
    return onComplete;
  }

  it('reaches a finish CTA and saves — the questions do end', async () => {
    await completeFlow();
    await waitFor(() => expect(rowsFor('families').length).toBeGreaterThan(0));
  });

  it('creates the family, then the child, then the diagnoses — in that order', async () => {
    await completeFlow();
    await waitFor(() => expect(rowsFor('children').length).toBeGreaterThan(0));

    const order = h.inserts.map((i) => i.table);
    expect(order.indexOf('families')).toBeLessThan(order.indexOf('children'));
    expect(order.indexOf('children')).toBeLessThan(order.indexOf('diagnoses'));
  });

  it('marks the first child primary — every screen reads the primary child', async () => {
    await completeFlow();
    await waitFor(() => expect(rowsFor('children')[0]).toBeDefined());
    expect(rowsFor('children')[0].is_primary).toBe(true);
    expect(rowsFor('children')[0].first_name).toBe('Maya');
  });

  it('seeds the starter plan against the new family and child', async () => {
    await completeFlow();
    await waitFor(() => expect(rowsFor('actions').length).toBeGreaterThan(0));
    expect(rowsFor('actions')[0].source).toBe('system');
    expect(rowsFor('actions')[0].family_id).toBeDefined();
  });
});

// ─── Failure behaviour ──────────────────────────────────────────────────────

describe('when the save goes wrong', () => {
  it('still finishes when only the starter plan fails — it is explicitly non-critical', async () => {
    h.failOn = 'actions';
    const onComplete = vi.fn();
    render(<OnboardingFlow onComplete={onComplete} />);
    fillNames();
    fireEvent.click(cta());
    fireEvent.click(screen.getAllByRole('button').find((b) => /autism/i.test(b.textContent ?? ''))!);
    fireEvent.click(cta());
    fireEvent.change(screen.getByLabelText("Child's birthday"), {
      target: { value: '2020-01-01' },
    });
    fireEvent.click(cta());
    answerAndAdvance();
    answerAndAdvance();
    answerAndAdvance();

    // A family whose plan failed to seed still has an account and can add
    // steps by hand — losing the whole signup over it would be far worse.
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
  });
});
