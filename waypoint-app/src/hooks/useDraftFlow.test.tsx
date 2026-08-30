/**
 * useDraftFlow — the draft-flow orchestration lifted out of HomeScreen (phase 6).
 * These pin the load-bearing paths the extraction claims to preserve: the
 * ai_consent gate, the AI-reads-the-reply summary path (9e), the daily-cap
 * notice, and — the one that guards against a wrong legal notice popping after
 * the parent moved on — the stale-token guard.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDraftFlow } from './useDraftFlow';
import type { TriageItem, TriageClass } from '@/lib/homeTriage';
import type { Family, Child } from '@/types/database';
import type { FamilyRequest } from '@/hooks/useRequests';
import type { Communication } from '@/hooks/useCommunications';

const analyzeEmail = vi.fn();
vi.mock('@/lib/letters', () => ({ analyzeEmail: (...a: unknown[]) => analyzeEmail(...a) }));

const draftHandoff = vi.fn();
vi.mock('@/lib/draftHandoff', () => ({ draftHandoff: (...a: unknown[]) => draftHandoff(...a) }));

const FAMILY = (over: Partial<Family> = {}): Family =>
  ({
    id: 'f1',
    parent_first_name: 'Ana',
    parent_last_name: 'Ruiz',
    email: 'ana@example.com',
    phone: '555-0100',
    school_district: 'LAUSD',
    regional_center: 'ELARC',
    insurance_carrier: 'Kaiser',
    ai_consent_at: null,
    ...over,
  }) as Family;

const CHILD: Child = { id: 'c1', first_name: 'Teddy', grade: '3', school_name: 'Elm' } as Child;

function item(cls: TriageClass, params: Record<string, string> = {}): TriageItem {
  return {
    id: `${cls}:1`,
    cls,
    rank: 0,
    kicker: 'K',
    title: 'T',
    why: 'W',
    action: { kind: 'draft', label: 'Draft', params },
    deferDays: 1,
    deferLabel: 'Back tomorrow',
  };
}

const reply = (over: Partial<Communication> = {}): Communication =>
  ({ id: 'reply1', body: 'They wrote back.', ...over }) as Communication;

function setup(over: {
  family?: Family;
  requests?: FamilyRequest[];
  communications?: Communication[];
} = {}) {
  const navigate = vi.fn();
  const onNotice = vi.fn();
  const { result } = renderHook(() =>
    useDraftFlow({
      family: over.family ?? FAMILY(),
      primaryChild: CHILD,
      familyRequests: over.requests ?? [],
      communications: over.communications ?? [],
      locale: 'en',
      navigate,
      onNotice,
    })
  );
  return { result, navigate, onNotice };
}

beforeEach(() => {
  analyzeEmail.mockReset();
  draftHandoff.mockReset();
});

describe('the consent gate', () => {
  it('no ai_consent_at → opens the manual sheet immediately, never reads the reply', async () => {
    const { result, onNotice } = setup({
      family: FAMILY({ ai_consent_at: null }),
      communications: [reply()],
    });
    await act(async () => {
      await result.current.openDraftFlow(item('reply', { replyId: 'reply1' }));
    });
    expect(analyzeEmail).not.toHaveBeenCalled();
    expect(result.current.readingReply).toBe(false);
    expect(result.current.draft?.item.id).toBe('reply:1');
    expect(result.current.draft?.aiSummary).toBeUndefined();
    expect(onNotice).not.toHaveBeenCalled();
  });

  it('a non-reply draftable item never reads a reply even with consent', async () => {
    analyzeEmail.mockResolvedValue({ analysis: { summary: 's' } });
    const { result } = setup({ family: FAMILY({ ai_consent_at: '2026-01-01' }) });
    await act(async () => {
      await result.current.openDraftFlow(item('overdue', { requestId: 'r1' }));
    });
    expect(analyzeEmail).not.toHaveBeenCalled();
    expect(result.current.draft?.aiSummary).toBeUndefined();
  });
});

describe('the AI reads the reply (9e)', () => {
  it('consent + reply + analysis → the sheet carries the AI summary', async () => {
    analyzeEmail.mockResolvedValue({ analysis: { summary: 'They declined and cited caseload.' } });
    const { result } = setup({
      family: FAMILY({ ai_consent_at: '2026-01-01' }),
      communications: [reply({ id: 'reply1', body: 'No, we cannot.' })],
    });
    await act(async () => {
      await result.current.openDraftFlow(item('reply', { replyId: 'reply1' }));
    });
    expect(analyzeEmail).toHaveBeenCalledWith('No, we cannot.', 'en');
    expect(result.current.draft?.aiSummary).toBe('They declined and cited caseload.');
    expect(result.current.readingReply).toBe(false);
  });

  it('the daily-cap message surfaces through onNotice, then falls back to the manual sheet', async () => {
    analyzeEmail.mockResolvedValue({ analysis: null, error: "You've reached today's AI limit — it resets at midnight." });
    const { result, onNotice } = setup({
      family: FAMILY({ ai_consent_at: '2026-01-01' }),
      communications: [reply()],
    });
    await act(async () => {
      await result.current.openDraftFlow(item('reply', { replyId: 'reply1' }));
    });
    expect(onNotice).toHaveBeenCalledWith(expect.stringContaining('AI limit'));
    expect(result.current.draft?.item.id).toBe('reply:1');
    expect(result.current.draft?.aiSummary).toBeUndefined();
  });
});

describe('the stale-token guard — a late analysis must not pop a sheet the parent left', () => {
  it('cancelReadingReply before the read resolves drops the result', async () => {
    let resolveAnalysis!: (v: { analysis: { summary: string } | null; error?: string }) => void;
    analyzeEmail.mockReturnValue(
      new Promise((res) => {
        resolveAnalysis = res;
      })
    );
    const { result } = setup({
      family: FAMILY({ ai_consent_at: '2026-01-01' }),
      communications: [reply()],
    });

    let open!: Promise<void>;
    act(() => {
      open = result.current.openDraftFlow(item('reply', { replyId: 'reply1' }));
    });
    // Reading overlay is up, waiting on the analysis.
    await waitFor(() => expect(result.current.readingReply).toBe(true));

    // Parent dismisses the overlay (bumps the token) BEFORE the read returns.
    act(() => result.current.cancelReadingReply());
    // The analysis now resolves late.
    await act(async () => {
      resolveAnalysis({ analysis: { summary: 'stale' } });
      await open;
    });

    // The stale result was discarded: no sheet, no summary.
    expect(result.current.draft).toBeNull();
    expect(result.current.readingReply).toBe(false);
  });
});

describe('handoff and profile', () => {
  it('onDraftComplete routes to Letters with the handoff payload', async () => {
    draftHandoff.mockReturnValue({
      template: 'pwn_request',
      question: 'Q',
      guidance: 'G',
      tone: 'professional',
      requestId: 'r1',
    });
    const { result, navigate } = setup({
      family: FAMILY({ ai_consent_at: null }),
      requests: [{ id: 'r1', request_type: 'iep_evaluation' } as FamilyRequest],
    });
    await act(async () => {
      await result.current.openDraftFlow(item('overdue', { requestId: 'r1' }));
    });
    act(() => result.current.onDraftComplete({ heard_back: 'nothing', tone: 'professional' }));

    expect(draftHandoff).toHaveBeenCalledTimes(1);
    // requestType was resolved at OPEN time from the request id.
    expect(draftHandoff.mock.calls[0][2]).toMatchObject({ requestType: 'iep_evaluation', locale: 'en' });
    expect(navigate).toHaveBeenCalledWith('Letters', {
      template: 'pwn_request',
      question: 'Q',
      guidance: 'G',
      tone: 'professional',
      requestId: 'r1',
    });
    // Sheet closed after handoff.
    expect(result.current.draft).toBeNull();
  });

  it('letterProfile maps the family and child the letters bracket', () => {
    const { result } = setup();
    expect(result.current.letterProfile).toMatchObject({
      parentFirstName: 'Ana',
      childFirstName: 'Teddy',
      schoolDistrict: 'LAUSD',
      regionalCenter: 'ELARC',
      insurance: 'Kaiser',
    });
  });

  it('closeDraft dismisses the sheet without navigating', async () => {
    const { result, navigate } = setup({ family: FAMILY({ ai_consent_at: null }) });
    await act(async () => {
      await result.current.openDraftFlow(item('overdue', { requestId: 'r1' }));
    });
    expect(result.current.draft).not.toBeNull();
    act(() => result.current.closeDraft());
    expect(result.current.draft).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });
});
