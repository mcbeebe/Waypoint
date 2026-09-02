/**
 * Family Sharing B2 — what the owner is told about delivery must be true.
 * A card that says "sent" for an email that never left is the failure mode
 * the whole phase exists to prevent.
 */
import { describe, it, expect } from 'vitest';
import { deliveryState, describeSendFailure, shortDate } from './inviteDelivery';

describe('deliveryState', () => {
  it('reports sent only when the row says it went out', () => {
    expect(deliveryState({ sent_at: '2026-09-02T10:00:00Z', send_error: null })).toEqual({ kind: 'sent', at: '2026-09-02T10:00:00Z' });
  });
  it('reports the last failure when nothing has ever gone out', () => {
    expect(deliveryState({ sent_at: null, send_error: 'provider 422' })).toEqual({ kind: 'failed', reason: 'provider 422' });
  });
  it('a successful send clears an older failure', () => {
    // The function nulls send_error on success; sent_at wins either way.
    expect(deliveryState({ sent_at: '2026-09-02T10:00:00Z', send_error: 'old' }).kind).toBe('sent');
  });
  it('is unsent when neither has happened', () => {
    expect(deliveryState({ sent_at: null, send_error: null })).toEqual({ kind: 'unsent' });
  });
});

describe('describeSendFailure', () => {
  it('tells the owner the invite is saved when delivery is not configured', () => {
    expect(describeSendFailure('delivery_not_configured')).toMatch(/saved/);
    expect(describeSendFailure('delivery_not_configured')).toMatch(/by hand/);
  });
  it('passes a short provider reason through', () => {
    expect(describeSendFailure('send_failed', 'Domain not verified')).toBe("The email didn't send (Domain not verified).");
  });
  it('always points at Resend for the unknown case', () => {
    expect(describeSendFailure(undefined)).toMatch(/Resend/);
    expect(describeSendFailure('something_else')).toMatch(/Resend/);
  });
});

describe('shortDate', () => {
  it('renders a short month-day, and nothing for junk', () => {
    expect(shortDate('2026-09-02T10:00:00Z')).toMatch(/^Sep [12]$/); // TZ-tolerant
    expect(shortDate('not a date')).toBe('');
  });
});
