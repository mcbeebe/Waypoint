import { describe, it, expect } from 'vitest';
import {
  isEmailAddress,
  planEmailRoute,
  handoffCopy,
  GMAIL_SENT_MESSAGE,
  HANDOFF_SENT_MESSAGE,
} from './emailTracking';

describe('isEmailAddress', () => {
  it('accepts ordinary addresses, including the ones agencies actually use', () => {
    for (const a of [
      'intake@altaregional.org',
      'first.last@sanjuan.edu',
      'case-manager+iep@kaiserpermanente.org',
      'PARENT@Example.COM',
    ]) {
      expect(isEmailAddress(a)).toBe(true);
    }
  });

  it('rejects the shapes that produced empty recipients', () => {
    for (const a of ['', '   ', 'nobody', 'no@domain', 'two words@x.com', 'a@b@c.com']) {
      expect(isEmailAddress(a)).toBe(false);
    }
  });

  it('ignores surrounding whitespace', () => {
    expect(isEmailAddress('  intake@altaregional.org  ')).toBe(true);
  });
});

describe('planEmailRoute', () => {
  it('will not send without a recipient — the paper trail records WHO', () => {
    const plan = planEmailRoute({ gmailReady: true, to: '' });
    expect(plan.canSend).toBe(false);
    expect(plan.blockedReason).toMatch(/email address/i);
  });

  it('will not send to something that is not an address', () => {
    const plan = planEmailRoute({ gmailReady: false, to: 'my case manager' });
    expect(plan.canSend).toBe(false);
    expect(plan.blockedReason).toMatch(/doesn't look like/i);
  });

  it('routes through Gmail when the account holds the scope', () => {
    expect(planEmailRoute({ gmailReady: true, to: 'intake@alta.org' })).toEqual({
      route: 'gmail',
      canSend: true,
      blockedReason: '',
    });
  });

  it('hands off to the mail app when Gmail is not connected', () => {
    expect(planEmailRoute({ gmailReady: false, to: 'intake@alta.org' })).toEqual({
      route: 'handoff',
      canSend: true,
      blockedReason: '',
    });
  });
});

describe('handoffCopy', () => {
  it('never claims the email was sent — the row is still a draft here', () => {
    for (const kind of ['gmail', 'mail'] as const) {
      const copy = handoffCopy(kind);
      expect(copy.headline).toMatch(/^Opened in /);
      expect(copy.headline).not.toMatch(/\bsent\b/i);
      expect(copy.body).toMatch(/draft/i);
      expect(copy.laterLabel).toBe('Not yet');
    }
  });

  it('names where it actually opened', () => {
    expect(handoffCopy('gmail').headline).toContain('Gmail');
    expect(handoffCopy('mail').headline).toContain('your email app');
  });
});

describe('the confirmation messages', () => {
  it('only the Gmail path promises reply syncing — it is the only one with a thread id', () => {
    expect(GMAIL_SENT_MESSAGE).toMatch(/replies will sync/i);
    expect(HANDOFF_SENT_MESSAGE).not.toMatch(/replies/i);
    expect(HANDOFF_SENT_MESSAGE).toMatch(/paper trail/i);
  });
});
