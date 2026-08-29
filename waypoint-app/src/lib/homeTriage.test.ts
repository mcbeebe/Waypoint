import { describe, it, expect } from 'vitest';
import {
  triageHome,
  sensorLine,
  deferUntil,
  localDay,
  TRIAGE_LADDER,
  TRIAGE_RANK,
} from './homeTriage';
import type { TriageInput } from './homeTriage';
import type { FamilyRequest } from '@/hooks/useRequests';
import type { Communication } from '@/hooks/useCommunications';

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
function comm(over: Partial<Communication>): Communication {
  seq += 1;
  return {
    id: `c${seq}`, family_id: 'fam', child_id: null, kind: 'letter', direction: 'outgoing',
    contact: null, organization: 'regional_center', subject: 'Subject', body: 'Body',
    template_key: null, status: 'sent', sent_at: '2026-08-26T14:00:00Z',
    occurred_at: '2026-08-26T14:00:00Z', gmail_thread_id: null, gmail_message_id: null,
    request_id: null, created_at: '2026-08-26T14:00:00Z',
    ...over,
  } as Communication;
}
/** A family with nothing outstanding — every test adds only what it needs. */
function base(over: Partial<TriageInput> = {}): TriageInput {
  return {
    now: NOW, childName: 'Teddy', ageYears: 7,
    rcStatus: 'active', iepStatus: 'active', hasDiagnosis: true,
    requests: [], communications: [], appointments: [], drafts: [],
    gmail: { connected: true, lastCheckedAt: '2026-08-29T06:32:00' },
    ...over,
  };
}

describe('the ladder is a published, stable order', () => {
  it('ranks classes in the documented sequence', () => {
    expect(TRIAGE_LADDER).toEqual([
      'resume', 'crisis', 'overdue', 'reply', 'today', 'clock', 'question', 'opportunity',
    ]);
    expect(TRIAGE_RANK.resume).toBeLessThan(TRIAGE_RANK.overdue);
    expect(TRIAGE_RANK.overdue).toBeLessThan(TRIAGE_RANK.reply);
    expect(TRIAGE_RANK.reply).toBeLessThan(TRIAGE_RANK.today);
    expect(TRIAGE_RANK.question).toBeLessThan(TRIAGE_RANK.opportunity);
  });

  it('unfinished work outranks an overdue clock, which outranks a reply', () => {
    const overdue = req({ request_type: 'ipp_meeting', requested_on: '2026-07-01' });
    const origin = comm({ id: 'o', gmail_thread_id: 't', gmail_message_id: 'm1' });
    const reply = comm({
      direction: 'incoming', gmail_thread_id: 't', gmail_message_id: 'm2', contact: 'Lilia Talavera <l@rceb.org>',
      sent_at: '2026-08-28T09:00:00Z', occurred_at: '2026-08-28T09:00:00Z',
    });
    const r = triageHome(base({
      requests: [overdue], communications: [origin, reply],
      drafts: [{ id: 'd1', templateKey: 'rc_request', subject: 'Respite request', savedAt: '2026-08-27T20:00:00Z' }],
    }));
    expect(r.queue.map((i) => i.cls)).toEqual(['resume', 'overdue', 'reply', 'opportunity']);
    expect(r.item?.cls).toBe('resume');
    expect(r.calm).toBeNull();
  });

  it('is deterministic — same inputs, same order', () => {
    const input = base({ requests: [req({ requested_on: '2026-07-01' }), req({ request_type: 'iep_evaluation', requested_on: '2026-08-25' })] });
    expect(triageHome(input).queue.map((i) => i.id)).toEqual(triageHome(input).queue.map((i) => i.id));
  });
});

describe('never assert without evidence', () => {
  it('a request with no statutory clock produces no clock card', () => {
    const r = triageHome(base({ requests: [req({ request_type: 'service_request', requested_on: '2026-01-01' })] }));
    expect(r.queue.some((i) => i.cls === 'overdue' || i.cls === 'clock')).toBe(false);
  });

  it('a clock outside its warning window waits its turn', () => {
    // iep_evaluation is a 15-day clock; asked today, 15 days out = inside the
    // window, so pick a longer clock that is still far away.
    const far = req({ request_type: 'rc_assessment', requested_on: '2026-08-25' }); // 120 days
    expect(triageHome(base({ requests: [far] })).queue.some((i) => i.cls === 'clock')).toBe(false);
  });

  it('an answered reply is not a reply card', () => {
    const inbound = comm({ direction: 'incoming', gmail_thread_id: 't', gmail_message_id: 'm1', occurred_at: '2026-08-20T09:00:00Z', sent_at: '2026-08-20T09:00:00Z' });
    const answered = comm({ gmail_thread_id: 't', occurred_at: '2026-08-21T09:00:00Z', sent_at: '2026-08-21T09:00:00Z' });
    expect(triageHome(base({ communications: [inbound, answered] })).queue.some((i) => i.cls === 'reply')).toBe(false);
  });

  it('a profile Waypoint already knows raises no question', () => {
    const r = triageHome(base({ rcStatus: 'active', iepStatus: 'active' }));
    expect(r.queue.some((i) => i.cls === 'question')).toBe(false);
  });

  it('appointments on other days never claim to be today', () => {
    const r = triageHome(base({
      appointments: [{ id: 'a1', title: 'OT session', startTime: '2026-09-02T15:00:00' }],
    }));
    expect(r.queue.some((i) => i.cls === 'today')).toBe(false);
  });
});

describe('provenance, not praise', () => {
  it('no kicker ever says WAYPOINT NOTICED, and each names its class', () => {
    const overdue = req({ requested_on: '2026-07-01' });
    const reply = comm({
      direction: 'incoming', gmail_thread_id: 't', gmail_message_id: 'm2', contact: 'Lilia Talavera <l@rceb.org>',
      sent_at: '2026-08-28T09:00:00Z', occurred_at: '2026-08-28T09:00:00Z',
    });
    const r = triageHome(base({
      requests: [overdue], communications: [reply],
      rcStatus: 'applied', iepStatus: 'active',
      appointments: [{ id: 'a1', title: 'OT session', startTime: '2026-08-29T15:00:00' }],
    }));
    expect(r.queue.length).toBeGreaterThan(2);
    for (const i of r.queue) {
      expect(i.kicker).not.toContain('WAYPOINT NOTICED');
      expect(i.kicker.length).toBeGreaterThan(3);
      expect(i.why.length).toBeGreaterThan(20);
    }
    expect(r.queue.find((i) => i.cls === 'reply')?.kicker).toContain('YESTERDAY');
    expect(r.queue.find((i) => i.cls === 'overdue')?.kicker).toContain('DEADLINE PASSED');
  });

  it('a clock card carries the statute it comes from', () => {
    const r = triageHome(base({ requests: [req({ request_type: 'iep_evaluation', requested_on: '2026-08-21' })] }));
    const clock = r.queue.find((i) => i.cls === 'clock');
    expect(clock?.citation).toBe('Ed Code §56321');
  });

  it('an opportunity says what it was derived from and cites its source', () => {
    const r = triageHome(base({ rcStatus: 'active', iepStatus: 'active' }));
    const op = r.queue.find((i) => i.cls === 'opportunity');
    expect(op?.why).toContain('Because you told us');
    expect(op?.citation).toBeTruthy();
  });
});

describe('badge the job: a reply routes to its case', () => {
  it('a reply on a tracked request opens the case file, not the paper trail', () => {
    const r = req({ communication_id: 'o', title: 'Standing frame' });
    const origin = comm({ id: 'o', gmail_thread_id: 't', gmail_message_id: 'm1', request_id: r.id });
    const reply = comm({
      direction: 'incoming', gmail_thread_id: 't', gmail_message_id: 'm2', contact: 'Lilia <l@rceb.org>',
      sent_at: '2026-08-28T09:00:00Z', occurred_at: '2026-08-28T09:00:00Z',
    });
    const item = triageHome(base({ requests: [r], communications: [origin, reply] })).queue.find((i) => i.cls === 'reply');
    expect(item?.action.screen).toBe('RequestCase');
    expect(item?.action.params?.requestId).toBe(r.id);
    expect(item?.title).toContain('Standing frame');
  });

  it('a stray reply still has somewhere to go', () => {
    const stray = comm({
      direction: 'incoming', gmail_thread_id: 'solo', gmail_message_id: 'm9', contact: 'Front Desk <fd@x.org>',
      sent_at: '2026-08-28T09:00:00Z', occurred_at: '2026-08-28T09:00:00Z',
    });
    const item = triageHome(base({ communications: [stray] })).queue.find((i) => i.cls === 'reply');
    expect(item?.action.screen).toBe('CommunicationLog');
    expect(item?.action.params?.openReplyId).toBe(stray.id);
  });
});

describe('deferral is honest', () => {
  it('a set-aside item leaves the queue but stays listed with its return date', () => {
    const overdue = req({ requested_on: '2026-07-01' });
    const first = triageHome(base({ requests: [overdue], rcStatus: 'active' }));
    const top = first.item!;
    expect(top.cls).toBe('overdue');

    const returnsOn = deferUntil(top, NOW);
    expect(returnsOn).toBe('2026-08-30');

    const after = triageHome(base({ requests: [overdue], rcStatus: 'active', deferrals: { [top.id]: returnsOn } }));
    expect(after.queue.some((i) => i.id === top.id)).toBe(false);
    expect(after.later.map((l) => l.id)).toContain(top.id);
    expect(after.later[0].returnsOn).toBe(returnsOn);
    expect(after.later[0].returnLabel).toBeTruthy();
    expect(after.item?.cls).toBe('opportunity');   // the queue advanced
  });

  it('an item returns on its day, not before and not never', () => {
    const overdue = req({ requested_on: '2026-07-01' });
    const id = triageHome(base({ requests: [overdue] })).item!.id;
    const stillHeld = triageHome(base({ requests: [overdue], deferrals: { [id]: '2026-08-30' } }));
    expect(stillHeld.queue.some((i) => i.id === id)).toBe(false);
    const returned = triageHome(base({ requests: [overdue], deferrals: { [id]: '2026-08-29' } }));
    expect(returned.queue.some((i) => i.id === id)).toBe(true);
  });

  it('every item promises a return window in words', () => {
    const r = triageHome(base({
      requests: [req({ requested_on: '2026-07-01' })],
      rcStatus: 'applied', iepStatus: 'active',
      drafts: [{ id: 'd', templateKey: null, subject: 'Draft', savedAt: '2026-08-28T10:00:00Z' }],
    }));
    for (const i of r.queue) {
      expect(i.deferDays).toBeGreaterThan(0);
      expect(i.deferLabel.length).toBeGreaterThan(4);
    }
  });
});

describe('calm is earned, and says which quiet this is', () => {
  it('nothing tracked and nothing done → clear, with what Waypoint is watching', () => {
    const r = triageHome(base({ requests: [req({ request_type: 'iep_evaluation', requested_on: '2026-08-29' })] , rcStatus: 'active', iepStatus: 'active' }));
    // the 15-day clock is inside its window, so it leads — remove it to reach calm
    const calm = triageHome(base({ rcStatus: 'active', iepStatus: 'active' }));
    void r;
    expect(calm.item?.cls).toBe('opportunity');
    const bare = triageHome(base({ rcStatus: 'known', iepStatus: 'active', hasDiagnosis: false }));
    expect(bare.calm?.kind).toBe('clear');
    expect(bare.calm?.body).toContain('close the app');
  });

  it('finishing something says done — not "nothing has a clock"', () => {
    const overdue = req({ requested_on: '2026-07-01' });
    const id = triageHome(base({ requests: [overdue], hasDiagnosis: false, rcStatus: 'known' })).item!.id;
    const done = triageHome(base({ requests: [overdue], hasDiagnosis: false, rcStatus: 'known', completed: { [id]: true } }));
    expect(done.calm?.kind).toBe('done');
    expect(done.calm?.title).toContain('most important thing');
  });

  it('skipping everything says set aside — and points at where it went', () => {
    const overdue = req({ requested_on: '2026-07-01' });
    const id = triageHome(base({ requests: [overdue], hasDiagnosis: false, rcStatus: 'known' })).item!.id;
    const skipped = triageHome(base({ requests: [overdue], hasDiagnosis: false, rcStatus: 'known', deferrals: { [id]: '2026-08-30' } }));
    expect(skipped.calm?.kind).toBe('set_aside');
    expect(skipped.calm?.body).toContain('Undo');
  });

  it('minute zero is its own state, never a fake dashboard', () => {
    const first = triageHome(base({ firstRun: true, rcStatus: 'known', iepStatus: 'active', hasDiagnosis: false }));
    expect(first.calm?.kind).toBe('first_run');
    expect(first.calm?.title).toContain('Teddy');
  });

  it('the calm state names the clock it is watching', () => {
    const clock = req({ request_type: 'rc_assessment', requested_on: '2026-08-25' }); // 120 days out
    const calm = triageHome(base({ requests: [clock], rcStatus: 'known', hasDiagnosis: false }));
    expect(calm.item).toBeNull();
    expect(calm.calm?.body).toContain('Waypoint will tell you');
  });
});

describe('the sensor line tells the truth about what was checked', () => {
  it('reports the time Gmail was actually checked', () => {
    const s = sensorLine(base());
    expect(s.text).toContain('Gmail checked');
    expect(s.ok).toBe(true);
  });

  it('a failed check says so and is not ok', () => {
    const s = sensorLine(base({ gmail: { connected: true, failed: true } }));
    expect(s.text).toContain("Couldn't check Gmail");
    expect(s.ok).toBe(false);
  });

  it('never implies a connection that does not exist', () => {
    const s = sensorLine(base({ gmail: { connected: false } }));
    expect(s.text).toContain('not connected');
    expect(s.text).not.toContain('checked');
    expect(s.ok).toBe(false);
  });

  it('only claims calendar sync when it happened', () => {
    expect(sensorLine(base({ calendarSynced: true })).text).toContain('Calendar synced');
    expect(sensorLine(base({ calendarSynced: false })).text).not.toContain('Calendar synced');
  });
});

describe('locale parity', () => {
  it('structure is locale-invariant; prose is not', () => {
    const input = base({
      requests: [req({ requested_on: '2026-07-01' })],
      rcStatus: 'applied', iepStatus: 'active',
    });
    const en = triageHome({ ...input, locale: 'en' });
    for (const locale of ['es', 'vi'] as const) {
      const other = triageHome({ ...input, locale });
      expect(other.queue.map((i) => i.cls)).toEqual(en.queue.map((i) => i.cls));
      expect(other.queue.map((i) => i.id)).toEqual(en.queue.map((i) => i.id));
      expect(other.item?.action.screen).toBe(en.item?.action.screen);
      expect(other.item?.citation).toBe(en.item?.citation);
      expect(other.item?.title).not.toBe(en.item?.title);
      expect(other.sensor.text).not.toBe(en.sensor.text);
    }
  });
});

describe('local dates never drift', () => {
  it('uses the local calendar day, not a UTC slice', () => {
    // 9pm local on Aug 29 is Aug 30 in UTC; the day must stay the 29th.
    expect(localDay(new Date(2026, 7, 29, 21, 0, 0))).toBe('2026-08-29');
  });
});
