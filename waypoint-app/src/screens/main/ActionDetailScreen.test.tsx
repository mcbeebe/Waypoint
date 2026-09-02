/**
 * Action detail, rendered — the "Email about this" section added Sep 2 2026.
 *
 * Two things an adversary pass caught here, both invisible to a logic test:
 *
 * 1. The generated draft goes to your TEAM. The first build also offered an
 *    agency draft assembled from this action's own fields, which meant one tap
 *    could send a Regional Center "This may be a Lanterman Act violation" and
 *    "Agency: RC → DDS" under a friendly opener. Writing to an agency now
 *    hands off to the letter writer, which carries the tone ladder — and that
 *    hand-off is a cross-stack navigate, the exact shape that has shipped a
 *    dead tap twice in this repo.
 * 2. The email must name the child it is actually about. Falling back to the
 *    primary child produced an email saying "Ana's plan" about Ben.
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const h = vi.hoisted(() => ({
  children: [] as any[],
}));

vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({ family: { id: 'fam1' } }),
  useChildren: () => ({ children: h.children }),
  useDiagnoses: () => ({ diagnoses: [] }),
}));
vi.mock('@/hooks/useContacts', () => ({
  useContacts: () => ({ contacts: [] }),
}));
vi.mock('@/hooks/useActionNotes', () => ({
  useActionNotes: () => ({ notes: [], supported: true, error: null, addNote: vi.fn(), deleteNote: vi.fn() }),
}));
vi.mock('@/lib/googleCalendar', () => ({
  getCalendarEvent: async () => null,
  updateCalendarEvent: async () => ({ ok: true }),
}));
vi.mock('@/lib/gmail', () => ({
  gmailStatus: async () => ({ connected: false, gmail: false, email: null }),
  gmailSend: async () => ({ ok: true }),
}));

import ActionDetailScreen from './ActionDetailScreen';
import { navigateCalls } from '../../../vitest.setup.ui';
import { resolvesFrom } from '@/navigation/routeGraph';

const ACTION = {
  id: 'a1',
  family_id: 'fam1',
  child_id: null as string | null,
  title: 'Ask the Regional Center for a speech assessment',
  description: 'RC must schedule intake within 15 working days (Lanterman Act §4642).',
  category: 'regional_center',
  priority: 'high',
  status: 'not_started',
  script: null,
  steps: null,
  due_date: null,
  depends_on: null,
  google_event_id: null,
  local_id: null,
  synced_at: null,
  deadline_warning_days: 7,
  follow_up_key: null,
  source: 'ai_navigator',
  created_at: new Date().toISOString(),
};

function detail(action: Record<string, unknown> = {}) {
  return render(
    <ActionDetailScreen
      action={{ ...ACTION, ...action } as any}
      onUpdateStatus={() => {}}
      onToggleStep={() => {}}
      onUpdate={() => {}}
      onBack={() => {}}
    />
  );
}

beforeEach(() => {
  h.children = [{ id: 'c1', first_name: 'Ana', is_primary: true }];
});

describe('the two email doors', () => {
  it('offers a team draft and, separately, the letter writer for an agency', () => {
    detail();
    expect(screen.getByLabelText('Email this step to someone on your team')).toBeTruthy();
    expect(screen.getByLabelText('Write to an agency in the letter writer')).toBeTruthy();
  });

  it('the agency door lands somewhere that actually RESOLVES from the Tracker stack', () => {
    detail();
    fireEvent.click(screen.getByLabelText('Write to an agency in the letter writer'));

    expect(navigateCalls).toHaveLength(1);
    const [tab, options] = navigateCalls[0].args as [string, { screen: string; params: any }];
    expect(resolvesFrom('Tracker', { screen: options.screen, tab })).toBe(true);
    // LettersScreen's handoff effect early-returns without a template, so the
    // question alone would land the parent on an empty picker.
    expect(options.params.template).toBe('general');
    expect(options.params.question).toBe(ACTION.title);
  });

  it('the generated draft is a share with your team, never an ask to the agency', async () => {
    detail();
    fireEvent.click(screen.getByLabelText('Email this step to someone on your team'));
    expect(await screen.findByLabelText('Recipient email address')).toBeTruthy();
    expect(screen.getByText(/Sharing it so we're both looking at the same thing/)).toBeTruthy();
    expect(screen.queryByText(/writing to ask for your help/i)).toBeNull();
  });
});

describe('which child the email says it is about', () => {
  it('names the child the action is attached to', async () => {
    h.children = [
      { id: 'c1', first_name: 'Ana', is_primary: true },
      { id: 'c2', first_name: 'Ben', is_primary: false },
    ];
    detail({ child_id: 'c2' });
    fireEvent.click(screen.getByLabelText('Email this step to someone on your team'));
    expect(await screen.findByText(/next step on Ben's plan/)).toBeTruthy();
  });

  it('names nobody rather than the wrong child when the action has none', async () => {
    h.children = [
      { id: 'c1', first_name: 'Ana', is_primary: true },
      { id: 'c2', first_name: 'Ben', is_primary: false },
    ];
    detail({ child_id: null });
    fireEvent.click(screen.getByLabelText('Email this step to someone on your team'));
    // Borrowing the primary child produced "Ana's plan" for an email that was
    // just as likely about Ben, while the paper-trail row recorded no child.
    expect(await screen.findByText(/next step on our plan/)).toBeTruthy();
    expect(screen.queryByText(/Ana's plan/)).toBeNull();
  });

  it('still names the only child in a one-child family', async () => {
    detail({ child_id: null });
    fireEvent.click(screen.getByLabelText('Email this step to someone on your team'));
    expect(await screen.findByText(/next step on Ana's plan/)).toBeTruthy();
  });
});
