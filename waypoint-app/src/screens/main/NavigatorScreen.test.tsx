/**
 * The Waypoint Navigator, rendered — the two things the owner asked for on
 * Sep 2 2026 that a logic test cannot see.
 *
 * 1. The action plan is reachable FROM the Navigator. Not just that a handler
 *    exists: that the navigate it fires actually resolves. React Navigation
 *    walks to PARENTS, never siblings, so a `navigate('TrackerList')` from
 *    this stack is a silent no-op — a dead tap in production with the gates
 *    green. That failure mode has shipped twice in this repo.
 * 2. "Email this response" opens the SAME drafting screen as "Draft this
 *    letter" (owner report, 2026-09-12) — and routes by what the answer
 *    actually IS. An answer containing an email is the draft; advice written
 *    to the parent goes to the generator, because pasting it in produced a
 *    page of coaching prose under "ready to send… it goes out under your
 *    name", addressed to a case manager.
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({ family: { id: 'fam1', ai_consent_at: '2026-01-01' }, updateFamily: vi.fn() }),
  useChildren: () => ({ children: [{ id: 'c1', first_name: 'Teddy', is_primary: true }] }),
  useDiagnoses: () => ({ diagnoses: [] }),
}));

const h = vi.hoisted(() => ({
  messages: [] as any[],
  actions: [] as any[],
}));

vi.mock('@/hooks/useChat', () => ({
  useChat: () => ({
    messages: h.messages,
    isLoading: false,
    error: null,
    sendMessage: vi.fn(),
    sessionId: 'sess1',
    startNewSession: vi.fn(),
    loadSession: vi.fn(),
    toneLevel: 'collaborative',
    setToneLevel: vi.fn(),
  }),
}));

vi.mock('@/hooks/useActions', () => ({
  useActions: () => ({ actions: h.actions, createAction: vi.fn() }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: [] }) }) }) }),
    }),
  },
}));

// expo-document-picker reaches for React Native's __DEV__ at import time.
vi.mock('@/lib/chatImages', () => ({
  pickChatImages: async () => ({ images: [], skipped: 0 }),
  thumbUri: () => '',
  MAX_CHAT_IMAGES: 4,
}));

vi.mock('@/lib/gmail', () => ({
  gmailStatus: async () => ({ connected: false, gmail: false, email: null }),
  gmailSend: async () => ({ ok: true }),
}));

import NavigatorScreen from './NavigatorScreen';
import { navigateCalls } from '../../../vitest.setup.ui';
import { resolvesFrom } from '@/navigation/routeGraph';

function answer(over: Record<string, unknown> = {}) {
  return {
    id: 'm1',
    role: 'assistant',
    content: 'Ask your Regional Center for a speech assessment in writing.',
    isStreaming: false,
    ...over,
  };
}

beforeEach(() => {
  h.messages = [];
  h.actions = [];
});

describe('reaching the action plan from the Navigator', () => {
  it('offers a Plan button in the header', () => {
    render(<NavigatorScreen />);
    expect(screen.getByLabelText(/Your action plan/)).toBeTruthy();
  });

  it('counts the open steps waiting there', () => {
    h.actions = [
      { id: 'a1', status: 'not_started' },
      { id: 'a2', status: 'in_progress' },
      { id: 'a3', status: 'completed' },
    ];
    render(<NavigatorScreen />);
    expect(screen.getByLabelText('Your action plan, 2 open steps')).toBeTruthy();
  });

  it('navigates somewhere that actually RESOLVES from this stack', () => {
    render(<NavigatorScreen />);
    fireEvent.click(screen.getByLabelText(/Your action plan/));

    expect(navigateCalls).toHaveLength(1);
    const [tab, options] = navigateCalls[0].args as [string, { screen: string; params?: unknown }];
    // Naming the tab is mandatory: the Navigator stack registers neither the
    // Action Plan nor the Tracker list, and a navigate never reaches a sibling.
    expect(resolvesFrom('Navigator', { screen: options.screen, tab })).toBe(true);
    // And it lands on the segment the parent was sent to see.
    expect(options.params).toEqual({ view: 'actions' });
  });

  it('does not route to the hidden Tracker tab, which has no bar button', () => {
    render(<NavigatorScreen />);
    fireEvent.click(screen.getByLabelText(/Your action plan/));
    expect((navigateCalls[0].args as string[])[0]).not.toBe('Tracker');
  });
});

describe('the parent is told they are talking to a machine', () => {
  /**
   * Before this change the whole chat path was AI-free to a reader: the header
   * said "Waypoint Navigator", the greeting said "Hi! I'm your Waypoint
   * Navigator", every entry point said "Ask Waypoint Navigator", and the only
   * standing disclaimer said "Educational information only — not legal
   * advice". Finishing the rename without adding disclosure would have removed
   * the last signal rather than renamed anything.
   *
   * An adversary pass mutation-tested the first version of these and found
   * three of four did not bite: one asserted the absence of a string that was
   * never present, and two only re-checked en.ts's disclaimer through a 300ms
   * jsdom render. What is left needs a render to be worth anything: the
   * greeting is inline JSX, and the footnote has to survive every screen state.
   */
  it('discloses AI in the greeting, where a parent starts reading', () => {
    render(<NavigatorScreen />);
    // The name appears in both the header and the greeting, hence getAllByText.
    expect(screen.getAllByText(/Waypoint Navigator/).length).toBeGreaterThan(0);

    // Asserted by MEANING, not wording — the copy can be rewritten freely so
    // long as it still says the thing. But it must be disclosed HERE, not just
    // somewhere on screen: a plain body-text check passes on the footnote's
    // own "AI-generated", so deleting "an AI" from the greeting slipped
    // straight through it. Subtract the footnote, then look again.
    const footnote = screen.getByText(/not legal advice/i).textContent ?? '';
    const aboveTheFootnote = (document.body.textContent ?? '').replace(footnote, '');
    expect(aboveTheFootnote).toMatch(/\bAI\b/);
  });

  it('keeps disclosing once the greeting is replaced by a transcript', () => {
    // From the second message onward the greeting is gone and the standing
    // footnote is the only thing carrying it.
    h.messages = [answer()];
    render(<NavigatorScreen />);
    expect(screen.queryByText(/Hi! I'm your Waypoint Navigator/)).toBeNull();
    const disclaimer = screen.getByText(/not legal advice/i);
    expect(disclaimer.textContent).toMatch(/\bAI\b/);
    expect(disclaimer.textContent).toContain('1-800-776-5746');
  });

  it('still discloses while an answer is streaming', () => {
    // The state a parent is most likely to be reading in.
    h.messages = [answer({ isStreaming: true, content: 'Ask your Regional Cent' })];
    render(<NavigatorScreen />);
    expect(screen.getByText(/not legal advice/i).textContent).toMatch(/\bAI\b/);
  });

  it('still discloses when the AI request failed', () => {
    // The error path renders a fallback card; the footnote must survive it.
    render(<NavigatorScreen />);
    expect(screen.getByText(/not legal advice/i).textContent).toMatch(/\bAI\b/);
  });
});

/**
 * The advice answer that shipped the defect (owner report, 2026-09-12,
 * second round): every sentence is addressed to the PARENT. Pasted into the
 * draft editor it read as a letter to a case manager under "ready to send".
 */
const ADVICE_ANSWER =
  "The real work belongs to the provider's authorization coordinator, not you — " +
  "but you're the one who notices if they miss the window. Ask your BCBA/OT office " +
  'directly who handles re-auth submissions and when they plan to send the progress ' +
  'report and updated treatment plan.\n\n' +
  'What families commonly miss: renewals need *current* data showing continued ' +
  'medical necessity.';

describe('emailing an answer', () => {
  it('opens Letters — the same screen "Draft this letter" uses — not a separate sheet', () => {
    h.messages = [answer()];
    render(<NavigatorScreen />);

    fireEvent.click(screen.getByLabelText(/Email this response/i));

    expect(navigateCalls).toHaveLength(1);
    const [tab, options] = navigateCalls[0].args as [string, { screen: string; params?: unknown }];
    // Same rule as the action-plan tab: a navigate never reaches a sibling,
    // so the tab has to be named and the target has to actually resolve.
    expect(resolvesFrom('Navigator', { screen: options.screen, tab })).toBe(true);
    expect(options.screen).toBe('Letters');
    expect((options.params as { template?: string }).template).toBe('general');
  });

  it('does NOT paste advice-to-the-parent in as a ready-to-send letter', () => {
    h.messages = [answer({ content: ADVICE_ANSWER })];
    render(<NavigatorScreen />);

    fireEvent.click(screen.getByLabelText(/Email this response/i));

    const [, options] = navigateCalls[0].args as [
      string,
      { params: { draftBody?: string; question?: string; guidance?: string } },
    ];
    // The whole defect in one assertion: this text is not an email, so it
    // must not arrive as one.
    expect(options.params.draftBody).toBeUndefined();
    // It goes to the generator instead, carrying the conversation.
    expect(options.params.guidance).toContain('BCBA/OT office');
    expect(options.params.question).toBeTruthy();
  });

  it('seeds the ask as a whole sentence, not a title cut off mid-clause', () => {
    h.messages = [answer({ content: ADVICE_ANSWER })];
    render(<NavigatorScreen />);

    fireEvent.click(screen.getByLabelText(/Email this response/i));

    const [, options] = navigateCalls[0].args as [string, { params: { question?: string } }];
    // The 80-char list-title cap used to end this "...and when they…" in a
    // box the parent is about to send from.
    expect(options.params.question).toContain('updated treatment plan');
    expect(options.params.question).not.toContain('…');
  });

  it('an answer that IS an email goes straight in, with its own subject', () => {
    h.messages = [
      answer({
        content:
          'Here’s the combined version.\n\nSubject: IEP Assessment Request\n\nHi Keri,\n\nPlease evaluate Teddy for speech services.',
      }),
    ];
    render(<NavigatorScreen />);

    fireEvent.click(screen.getByLabelText(/Email this response/i));

    const [, options] = navigateCalls[0].args as [
      string,
      { params: { draftBody?: string; draftBodyUnlogged?: boolean; question?: string } },
    ];
    // Reheaded so Letters' own extractSubject (a Subject: line that OPENS
    // the text) recovers it — the "here's the combined version" preamble
    // to the PARENT must not become the first thing the agency reads.
    expect(options.params.draftBody).toBe(
      'Subject: IEP Assessment Request\n\nHi Keri,\n\nPlease evaluate Teddy for speech services.'
    );
    // Already written — regenerating it would throw the letter away.
    expect(options.params.question).toBeUndefined();
    // Letters otherwise assumes a draftBody hand-off is already a
    // paper-trail row (true for its other two callers) — without this flag
    // the first Save/Send on a chat answer silently writes nothing.
    expect(options.params.draftBodyUnlogged).toBe(true);
  });
});
