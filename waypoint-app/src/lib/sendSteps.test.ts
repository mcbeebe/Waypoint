import { describe, it, expect } from 'vitest';
import { sendSteps } from './sendSteps';
import { statutoryDays } from './requestClocks';

const base = { locale: 'en' as const, from: 'parent@gmail.com', toName: 'Lilia Talavera' };

describe('sendSteps', () => {
  it('says who it is from and to, and that the parent confirms first', () => {
    const { title, steps } = sendSteps({ ...base, tracking: 'none' });
    expect(title).toBe('WHEN YOU PRESS SEND');
    expect(steps[0]).toMatch(/one last time — nothing goes until you confirm/);
    expect(steps[1]).toBe('It’s sent from parent@gmail.com to Lilia Talavera, and shows up in your Gmail Sent folder.');
    expect(steps.at(-1)).toMatch(/reply comes in .* shows on Home/);
  });

  it('names the legal deadline only when this send starts one', () => {
    const clock = sendSteps({ ...base, tracking: 'clock', clockDays: statutoryDays('ipp_meeting') });
    expect(clock.steps[2]).toMatch(/30-day legal timeline for this request/);
    // Not "for an answer": the IPP clock is a meeting held, the IEP one a plan sent.
    expect(clock.steps[2]).not.toMatch(/answer/);
    for (const tracking of ['tracked', 'case', 'none'] as const) {
      expect(sendSteps({ ...base, tracking }).steps.join(' ')).not.toMatch(/timeline|deadline/);
    }
    // A clock-type request whose law sets no deadline must not invent one.
    expect(sendSteps({ ...base, tracking: 'clock', clockDays: null }).steps.join(' ')).not.toMatch(/timeline|deadline|day/);
  });

  it('a letter from an open case says it joins that case file, not a new request', () => {
    expect(sendSteps({ ...base, tracking: 'case' }).steps[2]).toMatch(/case file/);
    expect(sendSteps({ ...base, tracking: 'tracked' }).steps[2]).toMatch(/starts tracking the request/);
    expect(sendSteps({ ...base, tracking: 'none' }).steps[2]).toBe('A copy is saved to your Paper Trail.');
  });

  it('falls back to "your Gmail" when the address is unknown', () => {
    expect(sendSteps({ ...base, from: null, tracking: 'none' }).steps[1]).toMatch(/^It’s sent from your Gmail to/);
  });

  it('is translated in every step, with the same structure', () => {
    const en = sendSteps({ ...base, tracking: 'clock', clockDays: 30 });
    for (const locale of ['es', 'vi'] as const) {
      const other = sendSteps({ ...base, locale, tracking: 'clock', clockDays: 30 });
      expect(other.steps).toHaveLength(en.steps.length);
      other.steps.forEach((s, i) => expect(s).not.toBe(en.steps[i]));
      expect(other.steps[1]).toContain('Lilia Talavera');
      expect(other.steps[2]).toContain('30');
    }
  });

  it('statutoryDays reports the law, and null where it sets none', () => {
    expect(statutoryDays('ipp_meeting')).toBe(30);
    expect(statutoryDays('iep_evaluation')).toBe(15);
    expect(statutoryDays('other')).toBeNull();
  });
});
