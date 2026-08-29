import { describe, it, expect } from 'vitest';
import {
  buildLadderSheet,
  calmKicker,
  cardLabels,
  classOfItemId,
  deferNotice,
  laterLine,
  resolveCompleted,
} from './homeCard';
import { triageHome, TRIAGE_LADDER } from './homeTriage';
import type { TriageInput, TriageResult } from './homeTriage';
import type { FamilyRequest } from '@/hooks/useRequests';

const NOW = new Date('2026-08-29T09:00:00');

let seq = 0;
function req(over: Partial<FamilyRequest>): FamilyRequest {
  seq += 1;
  return {
    id: `r${seq}`, family_id: 'fam', child_id: null,
    request_type: 'ipp_meeting', title: 'IPP meeting', requested_on: '2026-08-20',
    channel: 'email', status: 'requested', decided_on: null, notes: null,
    communication_id: null, created_at: '2026-08-20T10:00:00Z', updated_at: '2026-08-20T10:00:00Z',
    ...over,
  } as FamilyRequest;
}
function base(over: Partial<TriageInput> = {}): TriageInput {
  return {
    now: NOW, childName: 'Teddy', ageYears: 7,
    rcStatus: 'known', iepStatus: 'active', hasDiagnosis: false,
    requests: [], communications: [], appointments: [], drafts: [],
    gmail: { connected: true, lastCheckedAt: '2026-08-29T06:32:00' },
    ...over,
  };
}
function rowFor(sheet: ReturnType<typeof buildLadderSheet>, cls: string) {
  return sheet.rows.find((r) => r.cls === cls)!;
}

describe('the sheet publishes the whole order, not just the winner', () => {
  it('lists every rung plus the calm state, numbered in ladder order', () => {
    const result: TriageResult = triageHome(base());
    const sheet = buildLadderSheet({ result });
    expect(sheet.rows).toHaveLength(TRIAGE_LADDER.length + 1);
    expect(sheet.rows.slice(0, TRIAGE_LADDER.length).map((r) => r.cls)).toEqual([
      ...TRIAGE_LADDER,
    ]);
    expect(sheet.rows.map((r) => r.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, null]);
  });

  it('marks the rung that fired and leaves the rest checkable', () => {
    const result = triageHome(
      base({
        requests: [
          // Asked 40 days ago: the IPP clock (30 days) has passed.
          req({ requested_on: '2026-07-20', title: 'IPP meeting' }),
          // A second, still inside its window.
          req({ request_type: 'iep_evaluation', requested_on: '2026-08-21', title: 'Assessment' }),
        ],
      })
    );
    const sheet = buildLadderSheet({ result });
    expect(result.item?.cls).toBe('overdue');
    expect(rowFor(sheet, 'overdue').state).toBe('now');
    expect(rowFor(sheet, 'clock').state).toBe('queued');
    expect(rowFor(sheet, 'reply').state).toBe('clear');
    expect(rowFor(sheet, 'reply').stateLabel).toBe('—');
  });

  it('shows the calm row as the one showing now when nothing is live', () => {
    const result = triageHome(base());
    expect(result.item).toBeNull();
    const sheet = buildLadderSheet({ result });
    expect(sheet.rows[sheet.rows.length - 1].state).toBe('now');
    expect(sheet.rows[sheet.rows.length - 1].cls).toBeNull();
  });

  it('says which rung is set aside, so a skip never looks like a clear rung', () => {
    const overdueReq = req({ requested_on: '2026-07-20' });
    const result = triageHome(
      base({
        requests: [overdueReq],
        deferrals: { [`overdue:${overdueReq.id}`]: '2026-09-05' },
      })
    );
    const sheet = buildLadderSheet({ result });
    expect(rowFor(sheet, 'overdue').state).toBe('later');
    expect(rowFor(sheet, 'overdue').stateLabel).toBe('set aside');
  });

  it('marks a finished rung done rather than clear', () => {
    const result = triageHome(base());
    const sheet = buildLadderSheet({ result, completedIds: ['reply:abc'] });
    expect(rowFor(sheet, 'reply').state).toBe('done');
  });
});

describe('an id carries its class, so state never has to be guessed', () => {
  it('reads the class off the prefix', () => {
    expect(classOfItemId('overdue:r1')).toBe('overdue');
    expect(classOfItemId('question:rc_status')).toBe('question');
    expect(classOfItemId('opportunity:medi_cal')).toBe('opportunity');
  });

  it('refuses anything that is not a published class', () => {
    expect(classOfItemId('nudge:r1')).toBeNull();
    expect(classOfItemId('r1')).toBeNull();
  });
});

describe('done means done', () => {
  it('counts a tap only when the thing it was about stopped being true', () => {
    const done = resolveCompleted(['reply:a', 'clock:b'], ['clock:b']);
    expect(done).toEqual({ 'reply:a': true });
  });

  it('never counts a set-aside item as finished', () => {
    const done = resolveCompleted(['overdue:a'], [], ['overdue:a']);
    expect(done).toEqual({});
  });

  it('is empty when nothing was touched today', () => {
    expect(resolveCompleted([], ['reply:a'])).toEqual({});
  });
});

describe('deferral copy never overstates who can see the skip', () => {
  const item = { deferLabel: 'Back tomorrow morning' };

  it('promises only the return date when the family can see it', () => {
    expect(deferNotice(item, { shared: true })).toBe('Back tomorrow morning');
  });

  it('says so out loud when the skip is local to one phone', () => {
    expect(deferNotice(item, { shared: false })).toContain('on this device only');
    expect(deferNotice(item, { shared: false }, 'es')).toContain('solo en este dispositivo');
    expect(deferNotice(item, { shared: false }, 'vi')).toContain('chỉ trên thiết bị này');
  });
});

describe('the Later list always shows the day a thing comes back', () => {
  it('prints a local calendar date, not a UTC slice', () => {
    const line = laterLine({ id: 'x', title: 'x', returnsOn: '2026-09-05', returnLabel: '' });
    expect(line).toBe('Comes back Sep 5');
  });
});

describe('locale parity', () => {
  it('gives every locale the same rows, positions and states', () => {
    const result = triageHome(base({ requests: [req({ requested_on: '2026-07-20' })] }));
    const en = buildLadderSheet({ result, locale: 'en' });
    const es = buildLadderSheet({ result, locale: 'es' });
    const vi = buildLadderSheet({ result, locale: 'vi' });
    for (const other of [es, vi]) {
      expect(other.rows.map((r) => r.cls)).toEqual(en.rows.map((r) => r.cls));
      expect(other.rows.map((r) => r.position)).toEqual(en.rows.map((r) => r.position));
      expect(other.rows.map((r) => r.state)).toEqual(en.rows.map((r) => r.state));
    }
  });

  it('translates the prose rather than repeating English', () => {
    const result = triageHome(base());
    const en = buildLadderSheet({ result, locale: 'en' });
    const es = buildLadderSheet({ result, locale: 'es' });
    const vi = buildLadderSheet({ result, locale: 'vi' });
    expect(es.title).not.toBe(en.title);
    expect(vi.title).not.toBe(en.title);
    expect(es.rows[0].name).not.toBe(en.rows[0].name);
    expect(vi.rows[0].name).not.toBe(en.rows[0].name);
  });

  it('gives every locale the same label keys, all non-empty', () => {
    const en = cardLabels('en');
    for (const loc of ['es', 'vi'] as const) {
      const other = cardLabels(loc);
      expect(Object.keys(other)).toEqual(Object.keys(en));
      for (const key of Object.keys(en) as (keyof typeof en)[]) {
        expect(other[key].length).toBeGreaterThan(0);
        expect(other[key]).not.toBe(en[key]);
      }
    }
  });
});

describe('provenance, not praise', () => {
  it('never puts the banned eyebrow in any sheet string', () => {
    const result = triageHome(base({ requests: [req({ requested_on: '2026-07-20' })] }));
    for (const loc of ['en', 'es', 'vi'] as const) {
      const sheet = buildLadderSheet({ result, locale: loc });
      const blob = [sheet.title, sheet.intro, ...sheet.rows.map((r) => r.name)].join(' ');
      expect(blob.toUpperCase()).not.toContain('WAYPOINT NOTICED');
    }
  });
});

describe('a rung nothing can fill says so', () => {
  it('marks crisis "not set up yet" rather than leaving it reading clear', () => {
    const sheet = buildLadderSheet({ result: triageHome(base()) });
    const crisis = sheet.rows.find((r) => r.cls === 'crisis')!;
    expect(crisis.state).toBe('unwired');
    expect(crisis.stateLabel).toBe('not set up yet');
  });
});

describe('the calm card gets an eyebrow, not its own headline shrunk', () => {
  it('gives every calm kind a short kicker in every locale', () => {
    const kinds = ['done', 'set_aside', 'clear', 'first_run', 'unavailable'] as const;
    for (const kind of kinds) {
      const en = calmKicker(kind, 'en');
      expect(en).toBe(en.toUpperCase());
      expect(en.split(' ').length).toBeLessThanOrEqual(3);
      for (const loc of ['es', 'vi'] as const) {
        expect(calmKicker(kind, loc).length).toBeGreaterThan(0);
      }
    }
  });
});
