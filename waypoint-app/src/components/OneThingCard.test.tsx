/**
 * The One Thing card, rendered.
 *
 * Three defects the logic suite could not see: the calm headline rendered
 * inside a 10.5px kicker pill, the legal citation hidden behind a persisted
 * collapse while the claim stayed on screen, and the return date visible
 * only to a screen reader.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OneThingCard from './OneThingCard';
import { triageHome } from '@/lib/homeTriage';
import type { TriageInput } from '@/lib/homeTriage';
import type { FamilyRequest } from '@/hooks/useRequests';

const NOW = new Date('2026-08-29T09:00:00');

function req(over: Partial<FamilyRequest>): FamilyRequest {
  return {
    id: 'r1', family_id: 'fam', child_id: null, request_type: 'ipp_meeting',
    title: 'IPP meeting', requested_on: '2026-07-01', channel: 'email',
    status: 'requested', decided_on: null, notes: null, communication_id: null,
    created_at: '2026-07-01T10:00:00Z', updated_at: '2026-07-01T10:00:00Z',
    ...over,
  } as FamilyRequest;
}
function input(over: Partial<TriageInput> = {}): TriageInput {
  return {
    now: NOW, childName: 'Teddy', ageYears: 7, rcStatus: 'known',
    iepStatus: 'active', hasDiagnosis: false,
    requests: [], communications: [], appointments: [], drafts: [],
    gmail: { connected: true, lastCheckedAt: '2026-08-29T06:32:00' },
    ...over,
  };
}
function card(over: Partial<TriageInput> = {}, props: Record<string, unknown> = {}) {
  return render(
    <OneThingCard
      result={triageHome(input(over))}
      locale="en"
      shared
      onAct={() => {}}
      onDefer={() => {}}
      onAnswer={() => {}}
      {...props}
    />
  );
}

describe('the claim and its evidence stay together', () => {
  it('shows the citation on an overdue card', () => {
    card({ requests: [req({})] });
    expect(screen.getByText('W&I §4646.5(b)')).toBeInTheDocument();
  });

  it('keeps the citation and "Not today" visible when the card is collapsed', () => {
    card({ requests: [req({})] });
    fireEvent.click(screen.getByLabelText(/Collapse this card/i));
    // Hiding the legal basis behind a persisted toggle while the claim stays
    // on screen inverts the rule the card exists to keep.
    expect(screen.getByText('W&I §4646.5(b)')).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Not today/i).length).toBeGreaterThan(0);
  });
});

describe('"Not today" says when it comes back, on the button', () => {
  it('shows the return date to everyone, not only a screen reader', () => {
    card({ requests: [req({})] });
    expect(screen.getByText(/Back tomorrow morning/i)).toBeInTheDocument();
  });

  it('says so when the skip is device-only', () => {
    card({ requests: [req({})] }, { shared: false });
    expect(screen.getByText(/on this device only/i)).toBeInTheDocument();
  });
});

describe('the calm card has a headline, not a shrunken eyebrow', () => {
  it('renders the calm title in the title style and a short kicker above it', () => {
    const { container } = card();
    const title = screen.getByText(/Nothing has a clock on it today|Nothing needs you today/i);
    // The kicker pill is ~10.5px; a full sentence must not render at that size.
    const size = Number((title as HTMLElement).style.fontSize.replace('px', ''));
    expect(size).toBeGreaterThan(14);
    expect(container.textContent).toMatch(/NOTHING DUE|DONE TODAY|FIRST LOOK/);
  });
});

describe('the published order is checkable', () => {
  it('opens the ladder sheet and marks the rung that fired', () => {
    card({ requests: [req({})] });
    fireEvent.click(screen.getByLabelText(/How Waypoint decides/i));
    expect(screen.getByText(/A legal deadline that has passed/i)).toBeInTheDocument();
    expect(screen.getAllByText(/showing now/i).length).toBeGreaterThan(0);
    // A rung nothing can fill says so rather than reading like a clear one.
    expect(screen.getByText(/not set up yet/i)).toBeInTheDocument();
  });
});

describe('a question card offers only answers the column accepts', () => {
  it('renders the answers as buttons and reports the value chosen', () => {
    const onAnswer = vi.fn();
    card({ rcStatus: null }, { onAnswer });
    fireEvent.click(screen.getByLabelText(/Yes, we have a case/i));
    expect(onAnswer).toHaveBeenCalled();
    expect(onAnswer.mock.calls[0][1]).toBe('active');
  });
});
