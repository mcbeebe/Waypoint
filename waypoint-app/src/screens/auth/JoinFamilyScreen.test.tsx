/**
 * Family Sharing B3 — the Join screen, rendered.
 *
 * The logic suite cannot see a wrong screen for a state, a button that calls
 * the wrong RPC, or an accept that never reports back. Each state below is a
 * real person's moment: the co-parent who taps a 15-day-old link, the one who
 * signed in with the wrong address, the one who already joined.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const rpc = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    auth: { getUser: async () => ({ data: { user: { email: 'jordan@example.com' } } }) },
  },
}));

import JoinFamilyScreen from './JoinFamilyScreen';

const T = '8f3c2b1a-4d5e-4f60-9a7b-1c2d3e4f5a6b';

function preview(over: Record<string, unknown> = {}) {
  return {
    data: {
      state: 'pending',
      role: 'member',
      inviter_name: 'Maya',
      email_matches: true,
      invitee_email_hint: 'j***@example.com',
      ...over,
    },
    error: null,
  };
}

beforeEach(() => rpc.mockReset());

describe('JoinFamilyScreen', () => {
  it('previews a live invite and accepts through the guarded RPC', async () => {
    rpc.mockImplementation(async (fn: string) =>
      fn === 'preview_family_invitation' ? preview() : { data: 'fam-1', error: null }
    );
    const onDone = vi.fn();
    render(<JoinFamilyScreen token={T} onDone={onDone} onNotNow={() => {}} />);

    expect(await screen.findByText('Maya invited you to their Waypoint family')).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledWith('preview_family_invitation', { p_token: T });

    fireEvent.click(screen.getByText("Accept & join Maya's family"));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(rpc).toHaveBeenCalledWith('accept_family_invitation', { p_token: T });
  });

  it('shows the expired state from the preview', async () => {
    rpc.mockResolvedValue(preview({ state: 'expired' }));
    render(<JoinFamilyScreen token={T} onDone={() => {}} onNotNow={() => {}} />);
    expect(await screen.findByText('This invite has expired')).toBeInTheDocument();
    expect(screen.queryByText(/Accept & join/)).not.toBeInTheDocument();
  });

  it('refuses a live invite sent to a different address, and says which', async () => {
    rpc.mockResolvedValue(preview({ email_matches: false, invitee_email_hint: 'd***@example.com' }));
    render(<JoinFamilyScreen token={T} onDone={() => {}} onNotNow={() => {}} />);
    expect(await screen.findByText('This invite is for a different email')).toBeInTheDocument();
    expect(screen.getByText(/d\*\*\*@example\.com/)).toBeInTheDocument();
    expect(screen.queryByText(/Accept & join/)).not.toBeInTheDocument();
  });

  it('maps an RPC error on preview to its state', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'invite_already_used' } });
    const onDone = vi.fn();
    render(<JoinFamilyScreen token={T} onDone={onDone} onNotNow={() => {}} />);
    expect(await screen.findByText("You're already on this family")).toBeInTheDocument();
    fireEvent.click(screen.getByText('Open Waypoint'));
    expect(onDone).toHaveBeenCalled();
  });

  it('flips to the expired state when accept itself is refused', async () => {
    rpc.mockImplementation(async (fn: string) =>
      fn === 'preview_family_invitation'
        ? preview()
        : { data: null, error: { message: 'invite_expired' } }
    );
    const onDone = vi.fn();
    render(<JoinFamilyScreen token={T} onDone={onDone} onNotNow={() => {}} />);
    fireEvent.click(await screen.findByText("Accept & join Maya's family"));
    expect(await screen.findByText('This invite has expired')).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('"Not now" hands the decision back without joining', async () => {
    rpc.mockResolvedValue(preview());
    const onNotNow = vi.fn();
    render(<JoinFamilyScreen token={T} onDone={() => {}} onNotNow={onNotNow} />);
    fireEvent.click(await screen.findByText('Not now'));
    expect(onNotNow).toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalledWith('accept_family_invitation', expect.anything());
  });
});
