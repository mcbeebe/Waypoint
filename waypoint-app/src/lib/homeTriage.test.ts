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
      drafts: [{ id: 'd1', templateKey: 'rc_request', subject: 'Respite request', body: 'Dear…', savedAt: '2026-08-27T20:00:00Z' }],
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
    // Provenance: it names the evidence it was derived from, whichever
    // derivation won the rung.
    expect(op?.why).toMatch(/^Because/);
    expect(op?.why.toUpperCase()).not.toContain('WAYPOINT NOTICED');
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
    // Phase 9: a reply on a tracked request drafts the answer, carrying the case.
    expect(item?.action.kind).toBe('draft');
    expect(item?.action.params?.requestId).toBe(r.id);
    expect(item?.action.params?.replyId).toBe(reply.id);
    expect(item?.title).toContain('Standing frame');
  });

  it('a stray reply still drafts an answer, carrying its reply id', () => {
    const stray = comm({
      direction: 'incoming', gmail_thread_id: 'solo', gmail_message_id: 'm9', contact: 'Front Desk <fd@x.org>',
      sent_at: '2026-08-28T09:00:00Z', occurred_at: '2026-08-28T09:00:00Z',
    });
    const item = triageHome(base({ communications: [stray] })).queue.find((i) => i.cls === 'reply');
    expect(item?.action.kind).toBe('draft');
    expect(item?.action.params?.replyId).toBe(stray.id);
    expect(item?.action.params?.requestId).toBeUndefined();
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
      drafts: [{ id: 'd', templateKey: null, subject: 'Draft', body: 'Dear…', savedAt: '2026-08-28T10:00:00Z' }],
    }));
    for (const i of r.queue) {
      expect(i.deferDays).toBeGreaterThan(0);
      expect(i.deferLabel.length).toBeGreaterThan(4);
    }
  });
});

describe('the ladder can see plan actions (task #34)', () => {
  // A family with only these settings reaches the calm "clear" state, so any
  // change to calm below is caused by the action, not the fixture.
  const calmBase = { rcStatus: 'known' as const, iepStatus: 'active' as const, hasDiagnosis: false };
  function action(over: Partial<NonNullable<TriageInput['actions']>[number]> = {}) {
    seq += 1;
    return {
      id: `a${seq}`, title: 'Call the OT to schedule', status: 'not_started',
      priority: 'medium', dueOn: '2026-08-20', category: 'regional_center',
      ...over,
    };
  }

  it('an overdue action kills the false calm — it used to say "nothing needs you today"', () => {
    // Proof the fixture is otherwise calm:
    expect(triageHome(base(calmBase)).calm?.kind).toBe('clear');
    // Add one overdue action and the day is no longer calm; the action leads.
    const r = triageHome(base({ ...calmBase, actions: [action({ dueOn: '2026-08-20' })] }));
    expect(r.calm).toBeNull();
    expect(r.item?.cls).toBe('overdue');
    expect(r.item?.title).toBe('Call the OT to schedule');
    expect(r.item?.kicker).toContain('OVERDUE');
  });

  it('the action card opens the action in the Tracker stack, not Home', () => {
    const a = action({ id: 'act-123', dueOn: '2026-08-20' });
    const r = triageHome(base({ ...calmBase, actions: [a] }));
    // A navigate bubbles to Home's parent, never to a sibling stack, so the
    // action must name the Tracker tab or it resolves nowhere.
    expect(r.item?.action.tab).toBe('Tracker');
    expect(r.item?.action.screen).toBe('ActionDetail');
    expect(r.item?.action.params).toEqual({ actionId: 'act-123' });
  });

  it('an action due today lands on the today rung, not overdue', () => {
    const r = triageHome(base({ ...calmBase, actions: [action({ dueOn: '2026-08-29' })] }));
    expect(r.item?.cls).toBe('today');
    expect(r.item?.kicker).toContain('DUE TODAY');
  });

  it('a future action stays on the Plan tab — the ladder leads with what is due now', () => {
    const r = triageHome(base({ ...calmBase, actions: [action({ dueOn: '2026-09-15' })] }));
    expect(r.calm?.kind).toBe('clear');
    expect(r.queue.some((i) => i.id.includes('action'))).toBe(false);
  });

  it('an undated action is never surfaced (there is no clock to lead with)', () => {
    const r = triageHome(base({ ...calmBase, actions: [action({ dueOn: null })] }));
    expect(r.calm?.kind).toBe('clear');
  });

  it('a malformed due date is dropped, never asserted as "due today"', () => {
    const r = triageHome(base({ ...calmBase, actions: [action({ dueOn: 'not-a-date' })] }));
    expect(r.calm?.kind).toBe('clear');
    expect(r.queue.some((i) => i.id.includes('action'))).toBe(false);
  });

  it('completed and dismissed actions are invisible, matching the agenda', () => {
    const r = triageHome(base({
      ...calmBase,
      actions: [
        action({ dueOn: '2026-08-20', status: 'completed' }),
        action({ dueOn: '2026-08-20', status: 'dismissed' }),
      ],
    }));
    expect(r.calm?.kind).toBe('clear');
  });

  it('overdue actions rank alongside overdue clocks, above a reply', () => {
    const r = triageHome(base({
      ...calmBase,
      actions: [action({ dueOn: '2026-08-20' })],
      requests: [req({ requested_on: '2026-07-01' })],
    }));
    // Both overdue-tier items lead; the reply (rank 3) never gets above them.
    expect(r.queue[0].rank).toBe(TRIAGE_RANK.overdue);
    expect(r.item?.cls).toBe('overdue');
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
    expect(bare.calm?.body).toContain('Nothing else needs you right now');
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

  it('names the next date without promising a notification it cannot send', () => {
    const clock = req({ request_type: 'rc_assessment', requested_on: '2026-08-25' }); // 120 days out
    const calm = triageHome(base({ requests: [clock], rcStatus: 'known', hasDiagnosis: false }));
    expect(calm.item).toBeNull();
    // The push loop is phase 7. Until it ships, the calm state must not say
    // Waypoint will tell anyone anything.
    expect(calm.calm?.body).toContain('Check back');
    expect(calm.calm?.body).not.toContain('will tell you');
  });

  it('restores the promise once notifications are enabled (phase 7)', () => {
    const clock = req({ request_type: 'rc_assessment', requested_on: '2026-08-25' });
    const calm = triageHome(
      base({ requests: [clock], rcStatus: 'known', hasDiagnosis: false, notificationsEnabled: true })
    );
    expect(calm.item).toBeNull();
    // Now the loop can keep it, so the calm state makes the promise.
    expect(calm.calm?.body).toContain('will tell you');
    expect(calm.calm?.body).toContain('close the app');
    expect(calm.calm?.body).not.toContain('Check back');
  });

  it('refuses to call it calm when the records could not be read', () => {
    const failed = triageHome(base({ dataFailed: true, rcStatus: 'known', hasDiagnosis: false }));
    expect(failed.calm?.kind).toBe('unavailable');
    expect(failed.calm?.body).toContain('not an all-clear');
  });

  it('refuses first-run while the records are still loading', () => {
    const loadingRun = triageHome(
      base({ loading: true, firstRun: true, rcStatus: 'known', hasDiagnosis: false })
    );
    expect(loadingRun.calm?.kind).toBe('unavailable');
    expect(loadingRun.calm?.title).toContain('Checking your records');
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

  it('says it is still looking rather than guessing "not connected"', () => {
    const s = sensorLine(base({ gmail: { connected: false, checking: true } }));
    expect(s.text).toContain('Checking Gmail');
    expect(s.text).not.toContain('not connected');
  });

  it('dates a check that did not happen today, and stops calling it ok', () => {
    const stale = sensorLine(
      base({ gmail: { connected: true, lastCheckedAt: '2026-08-26T06:32:00' } })
    );
    // A bare time reads as this morning. Three days old must say the day.
    expect(stale.text).toContain('Aug 26');
    expect(stale.ok).toBe(false);
  });

  it('never claims deadlines are stored on the device', () => {
    for (const loc of ['en', 'es', 'vi'] as const) {
      const s = sensorLine(base({ locale: loc }));
      expect(s.text.toLowerCase()).not.toContain('on your phone');
      expect(s.text.toLowerCase()).not.toContain('en su teléfono');
    }
  });

  it('says out loud when the records could not be read', () => {
    const s = sensorLine(base({ dataFailed: true }));
    expect(s.text).toContain("Couldn't reach your records");
    expect(s.ok).toBe(false);
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

describe('the opportunity rung carries the benefit-stack unlock', () => {
  it('prefers a stack unlock over the generic insight, without its eyebrow', () => {
    const result = triageHome(
      base({ rcStatus: 'active', iepStatus: 'active', mediCalStatus: 'none', ageYears: 7 })
    );
    expect(result.item?.cls).toBe('opportunity');
    expect(result.item?.id.startsWith('opportunity:stack_')).toBe(true);
    // The stack module's own eyebrow is "WAYPOINT NOTICED" — the banned
    // string. The ladder must state the class instead.
    expect(result.item?.kicker.toUpperCase()).not.toContain('WAYPOINT NOTICED');
    expect(result.item?.why.toUpperCase()).not.toContain('WAYPOINT NOTICED');
    expect(result.item?.citation).toBeTruthy();
    expect(['ResourceStack', 'RequestTracker']).toContain(result.item?.action.screen);
  });

  it('falls back to the generic insight when no unlock guide applies', () => {
    const result = triageHome(
      base({ rcStatus: 'known', iepStatus: 'active', hasDiagnosis: true, ageYears: 4 })
    );
    if (result.item?.cls === 'opportunity') {
      expect(result.item.id.startsWith('opportunity:stack_')).toBe(false);
    }
  });
});

describe('a question card never offers an answer the database would reject', () => {
  const RC_STATUSES = ['unknown', 'known', 'applied', 'active'];
  const IEP_STATUSES = ['no', 'unknown', 'eval_done', 'active', 'na'];

  it('offers only legal rc_status values', () => {
    const result = triageHome(base({ rcStatus: null }));
    const item = result.queue.find((i) => i.id === 'question:rc_status');
    expect(item?.answers?.length).toBeGreaterThan(0);
    for (const a of item!.answers!) expect(RC_STATUSES).toContain(a.value);
  });

  it('offers only legal iep_status values', () => {
    const result = triageHome(base({ rcStatus: 'active', iepStatus: null }));
    const item = result.queue.find((i) => i.id === 'question:iep_status');
    expect(item?.answers?.length).toBeGreaterThan(0);
    for (const a of item!.answers!) expect(IEP_STATUSES).toContain(a.value);
  });
});

describe('the deadlines table has a rung (the deleted banner had the only one)', () => {
  const dl = (over: Partial<{ id: string; title: string; dueOn: string; kind: string }> = {}) => ({
    id: 'dl1', title: 'IEP annual review', dueOn: '2026-09-05', kind: 'iep_annual_review',
    ...over,
  });

  it('leads with a passed date as overdue', () => {
    const r = triageHome(base({ deadlines: [dl({ dueOn: '2026-08-20' })] }));
    expect(r.item?.cls).toBe('overdue');
    expect(r.item?.title).toBe('IEP annual review');
    expect(r.item?.action.tab).toBe('Calendar');
  });

  it('picks up a triennial ten days out — the band the agenda cannot see', () => {
    const r = triageHome(base({ deadlines: [dl({ dueOn: '2026-09-08', title: 'Triennial' })] }));
    expect(r.queue.some((i) => i.cls === 'clock' && i.title === 'Triennial')).toBe(true);
  });

  it('ignores a date beyond the warning window', () => {
    const r = triageHome(base({ deadlines: [dl({ dueOn: '2026-11-01' })] }));
    expect(r.queue.some((i) => i.id.includes('deadline'))).toBe(false);
  });
});

describe('a draft is work you left, not work you abandoned', () => {
  const draft = (savedAt: string) => ({
    id: 'd9', templateKey: 'records_request', subject: 'Records', body: 'Dear…', savedAt,
  });

  it('leads with a draft saved yesterday', () => {
    expect(triageHome(base({ drafts: [draft('2026-08-28T18:00:00Z')] })).item?.cls).toBe('resume');
  });

  it('stops parking a month-old draft above a passed legal deadline', () => {
    const r = triageHome(
      base({ drafts: [draft('2026-08-01T10:00:00Z')], requests: [req({ requested_on: '2026-07-01' })] })
    );
    expect(r.item?.cls).toBe('overdue');
    expect(r.queue.some((i) => i.cls === 'resume')).toBe(false);
  });

  it('carries the saved text, so resuming is not starting over', () => {
    const r = triageHome(base({ drafts: [draft('2026-08-28T18:00:00Z')] }));
    expect(r.item?.action.params?.draftBody).toBe('Dear…');
  });
});

describe('child-scoped state never answers for a sibling', () => {
  it('scopes the question id to the child', () => {
    const maya = triageHome(base({ childId: 'kid-1', rcStatus: null }));
    const leo = triageHome(base({ childId: 'kid-2', rcStatus: null }));
    expect(maya.item?.id).not.toBe(leo.item?.id);
    expect(maya.item?.id).toContain('kid-1');
  });

  it('keeps the opportunity id stable when the stack mode flips', () => {
    const before = triageHome(
      base({ rcStatus: 'active', iepStatus: 'active', mediCalStatus: 'none', childId: 'kid-1' })
    );
    const after = triageHome(
      base({
        rcStatus: 'active', iepStatus: 'active', mediCalStatus: 'none', childId: 'kid-1',
        mediCalRequested: true,
      })
    );
    // Acting on the item used to change its id, which voided its own
    // deferral and brought it straight back.
    expect(before.item?.id).toBe(after.item?.id);
  });
});

describe('locale parity across the whole ladder', () => {
  // Built once: the req() factory mints a new id per call, so re-building it
  // per locale would compare different families.
  const POPULATED: TriageInput = (() =>
    base({
      requests: [req({ requested_on: '2026-07-01' }), req({ request_type: 'iep_evaluation', requested_on: '2026-08-21' })],
      deadlines: [{ id: 'dl', title: 'Annual review', dueOn: '2026-09-02', kind: 'iep_annual_review' }],
      drafts: [{ id: 'd', templateKey: 'rc_request', subject: 'Respite', body: 'Dear…', savedAt: '2026-08-28T18:00:00Z' }],
      appointments: [{ id: 'a', title: 'Clinic', startTime: '2026-08-29T15:00:00' }],
      rcStatus: null,
    }))();

  it('gives every locale the same items, ids, routes and citations', () => {
    const en = triageHome({ ...POPULATED, locale: 'en' });
    for (const loc of ['es', 'vi'] as const) {
      const other = triageHome({ ...POPULATED, locale: loc });
      expect(other.queue.map((i) => i.id)).toEqual(en.queue.map((i) => i.id));
      expect(other.queue.map((i) => i.cls)).toEqual(en.queue.map((i) => i.cls));
      expect(other.queue.map((i) => i.action.screen)).toEqual(en.queue.map((i) => i.action.screen));
      // Citations are legal references — they stay in English.
      expect(other.queue.map((i) => i.citation)).toEqual(en.queue.map((i) => i.citation));
    }
  });

  it('translates the prose rather than repeating English', () => {
    const en = triageHome({ ...POPULATED, locale: 'en' });
    for (const loc of ['es', 'vi'] as const) {
      const other = triageHome({ ...POPULATED, locale: loc });
      other.queue.forEach((item, i) => {
        expect(item.kicker.length).toBeGreaterThan(0);
        expect(item.action.label).not.toBe(en.queue[i].action.label);
      });
    }
  });
});

describe('Home describes the status, not an actor who failed (owner decision)', () => {
  it('states an overdue answer neutrally in every locale', () => {
    const overdue = req({ requested_on: '2026-07-01', title: 'IPP meeting' });
    for (const loc of ['en', 'es', 'vi'] as const) {
      const item = triageHome(base({ requests: [overdue], locale: loc })).item!;
      expect(item.cls).toBe('overdue');
      // No accusatory subject: the answer is past due, nobody "missed" or
      // "owes". Tone firms up on the escalation ladder, not on Home.
      expect(item.title).not.toMatch(/They missed|They owe|No cumplieron|Le deben|Họ đã trễ|Họ nợ/);
    }
    expect(triageHome(base({ requests: [overdue] })).item?.title).toContain('is past due');
  });

  it('states a running clock as a due date, not a debt', () => {
    const soon = req({ request_type: 'iep_evaluation', requested_on: '2026-08-21' });
    const item = triageHome(base({ requests: [soon] })).queue.find((i) => i.cls === 'clock')!;
    expect(item.title).toMatch(/is due/);
    expect(item.title).not.toMatch(/owe/);
  });

  it('never claims an outcome it has no data for', () => {
    const overdue = req({ requested_on: '2026-07-01' });
    for (const loc of ['en', 'es', 'vi'] as const) {
      const item = triageHome(base({ requests: [overdue], locale: loc })).item!;
      expect(item.why).not.toMatch(/usually moves|suele mover|thường làm mọi việc/);
    }
  });
});
