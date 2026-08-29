import { describe, it, expect } from 'vitest';
import {
  eventAt,
  provenanceOf,
  threadFor,
  deriveStage,
  buildRequestCase,
  requestForCommunication,
  caseBadge,
  isReplyOutsideRequests,
} from './requestCase';
import type { FamilyRequest } from '@/hooks/useRequests';
import type { Communication } from '@/hooks/useCommunications';

const NOW = new Date('2026-08-29T12:00:00');

let seq = 0;
function comm(over: Partial<Communication>): Communication {
  seq += 1;
  return {
    id: `c${seq}`,
    family_id: 'fam',
    child_id: null,
    kind: 'letter',
    direction: 'outgoing',
    contact: null,
    organization: 'regional_center',
    subject: 'Subject',
    body: 'Body',
    template_key: null,
    status: 'sent',
    sent_at: '2026-08-26T14:14:00Z',
    occurred_at: '2026-08-26T14:14:00Z',
    gmail_thread_id: null,
    gmail_message_id: null,
    request_id: null,
    created_at: '2026-08-26T14:14:00Z',
    ...over,
  } as Communication;
}

function req(over: Partial<FamilyRequest>): FamilyRequest {
  seq += 1;
  return {
    id: `r${seq}`,
    family_id: 'fam',
    child_id: null,
    request_type: 'service_request',
    title: 'Respite for Teddy',
    requested_on: '2026-08-26',
    channel: 'email',
    status: 'requested',
    decided_on: null,
    notes: null,
    communication_id: null,
    created_at: '2026-08-26T14:00:00Z',
    updated_at: '2026-08-26T14:00:00Z',
    ...over,
  } as FamilyRequest;
}

describe('eventAt — the sent_at trap', () => {
  it('a backdated hand-logged call orders by when it happened, never by the false sent_at', () => {
    // logCommunication stamps sent_at = now() even for a May call logged in August
    const call = comm({
      kind: 'call',
      occurred_at: '2026-05-02T12:00:00Z',
      sent_at: '2026-08-29T09:00:00Z',
      created_at: '2026-08-29T09:00:00Z',
    });
    expect(eventAt(call)).toBe('2026-05-02T12:00:00Z');
    expect(provenanceOf(call)).toBe('recalled');
  });

  it('a Gmail-carried item trusts its provider timestamp', () => {
    const g = comm({ gmail_message_id: 'm1', sent_at: '2026-08-26T14:14:00Z' });
    expect(eventAt(g)).toBe('2026-08-26T14:14:00Z');
    expect(provenanceOf(g)).toBe('gmail');
  });

  it('a promptly-logged entry is contemporaneous', () => {
    const c = comm({ kind: 'note', occurred_at: '2026-08-26T10:00:00Z', created_at: '2026-08-26T18:00:00Z' });
    expect(provenanceOf(c)).toBe('contemporaneous');
  });
});

describe('threadFor — three link paths and the ambiguity guard', () => {
  it('unions request_id, origin letter, and thread closure, ascending by honest time', () => {
    const r = req({ communication_id: 'origin' });
    const origin = comm({ id: 'origin', gmail_thread_id: 't1', gmail_message_id: 'm1' });
    const reply = comm({
      direction: 'incoming', gmail_thread_id: 't1', gmail_message_id: 'm2',
      sent_at: '2026-08-28T09:02:00Z', occurred_at: '2026-08-28T09:02:00Z',
    });
    const call = comm({
      kind: 'call', request_id: r.id,
      occurred_at: '2026-05-02T12:00:00Z', sent_at: '2026-08-29T09:00:00Z',
      created_at: '2026-08-29T09:00:00Z',
    });
    const events = threadFor(r, [origin, reply, call]);
    expect(events.map((e) => e.linkage)).toEqual(['request_id', 'origin_letter', 'gmail_thread']);
    expect(events[0].communication.kind).toBe('call'); // May sorts first despite August sent_at
    expect(events[2].communication.direction).toBe('incoming');
  });

  it('a Gmail thread serving two requests contributes nothing by closure', () => {
    const r1 = req({});
    const r2 = req({});
    const a = comm({ gmail_thread_id: 'shared', request_id: r1.id });
    const b = comm({ gmail_thread_id: 'shared', request_id: r2.id });
    const stray = comm({ direction: 'incoming', gmail_thread_id: 'shared' });
    const events = threadFor(r1, [a, b, stray]);
    // a is linked by request_id; b and the stray reply are NOT pulled in
    expect(events).toHaveLength(1);
    expect(events[0].communication.id).toBe(a.id);
  });

  it('pre-047 data links via the legacy origin path alone', () => {
    const r = req({ communication_id: 'legacy' });
    const legacy = comm({ id: 'legacy' });
    expect(threadFor(r, [legacy])).toHaveLength(1);
  });
});

describe('escalation — silence climbs, conversation never does', () => {
  it('an unanswered reply nulls the next lever', () => {
    const r = req({ communication_id: 'o' });
    const o = comm({ id: 'o', gmail_thread_id: 't', gmail_message_id: 'm1' });
    const reply = comm({
      direction: 'incoming', gmail_thread_id: 't', gmail_message_id: 'm2',
      sent_at: '2026-08-28T09:00:00Z', occurred_at: '2026-08-28T09:00:00Z',
    });
    const c = buildRequestCase(r, [o, reply], 'en', NOW);
    expect(c.unansweredReply).not.toBeNull();
    expect(c.nextLever).toBeNull();
  });

  it('a phone-only ask offers rung 1: put it in writing, warmly — never the denial-premised NOA letter', () => {
    const r = req({ channel: 'phone', requested_on: '2026-08-20', created_at: '2026-08-29T09:00:00Z' });
    const c = buildRequestCase(r, [], 'en', NOW);
    expect(c.nextLever?.rung).toBe(1);
    expect(c.nextLever?.reAskInstead).toBe(false);
    // service_request's tracker lever is noa_request ("I was told no…") —
    // the FIRST written ask must be the friendly rc_request instead.
    expect(c.nextLever?.template).toBe('rc_request');
    expect(c.backdated).toBe(true);
    expect(c.provenanceLine).toContain('logged in Waypoint');
  });

  it('a months-stale phone ask advises a fresh written ask, not escalation', () => {
    const r = req({ channel: 'phone', requested_on: '2026-03-01', created_at: '2026-08-29T09:00:00Z' });
    const c = buildRequestCase(r, [], 'en', NOW);
    expect(c.nextLever?.rung).toBe(1);
    expect(c.nextLever?.reAskInstead).toBe(true);
  });

  it('quiet past the follow-up window climbs to rung 2; after a follow-up, rung 3, venue-correct', () => {
    const r = req({ request_type: 'ipp_meeting', requested_on: '2026-07-01' });
    const ask = comm({
      template_key: 'ipp_review_request', request_id: r.id,
      occurred_at: '2026-07-01T10:00:00Z', created_at: '2026-07-01T10:00:00Z',
    });
    const c1 = buildRequestCase(r, [ask], 'en', NOW);
    expect(c1.stage).toBe('ask');
    expect(c1.nextLever?.rung).toBe(2);
    // The rung-2 lever must be a template deriveStage counts as follow_up —
    // otherwise sending it never advances the rung strip.
    expect(c1.nextLever?.template).toBe('rc_timeline_followup');

    const followUp = comm({
      template_key: 'rc_timeline_followup', request_id: r.id,
      occurred_at: '2026-08-01T10:00:00Z', created_at: '2026-08-01T10:00:00Z',
    });
    const c2 = buildRequestCase(r, [ask, followUp], 'en', NOW);
    expect(c2.stage).toBe('follow_up');
    expect(c2.nextLever?.rung).toBe(3);
    expect(c2.nextLever?.template).toBe('dds_4731_complaint');

    const school = req({ request_type: 'iep_evaluation', requested_on: '2026-07-01' });
    const sAsk = comm({ template_key: 'assessment_request', request_id: school.id, occurred_at: '2026-07-01T10:00:00Z', created_at: '2026-07-01T10:00:00Z' });
    const cSchool = buildRequestCase(school, [sAsk], 'en', NOW);
    expect(cSchool.nextLever?.template).toBe('pwn_request'); // school follow-up is PWN, not an RC letter
    const sFollow = comm({ template_key: 'pwn_request', request_id: school.id, occurred_at: '2026-08-01T10:00:00Z', created_at: '2026-08-01T10:00:00Z' });
    const c3 = buildRequestCase(school, [sAsk, sFollow], 'en', NOW);
    expect(c3.nextLever?.template).toBe('cde_complaint');
  });

  it('asking twice IS following up: a second sent ask advances the stage', () => {
    const r = req({ request_type: 'other', requested_on: '2026-06-01' });
    const ask1 = comm({ template_key: 'general', request_id: r.id, occurred_at: '2026-06-01T10:00:00Z', created_at: '2026-06-01T10:00:00Z' });
    const c1 = buildRequestCase(r, [ask1], 'en', NOW);
    expect(c1.stage).toBe('ask');
    expect(c1.nextLever?.rung).toBe(2);
    expect(c1.nextLever?.template).toBe('general'); // unknown org: the follow-up is another honest ask
    const ask2 = comm({ template_key: 'general', request_id: r.id, occurred_at: '2026-07-01T10:00:00Z', created_at: '2026-07-01T10:00:00Z' });
    const c2 = buildRequestCase(r, [ask1, ask2], 'en', NOW);
    expect(c2.stage).toBe('follow_up');
    expect(c2.nextLever?.template).toBe('complaint'); // generic formal venue for 'other'
  });

  it('once the formal complaint is filed, silence offers no further rung', () => {
    const r = req({ request_type: 'ipp_meeting', requested_on: '2026-05-01' });
    const formal = comm({ template_key: 'dds_4731_complaint', request_id: r.id, occurred_at: '2026-07-01T10:00:00Z', created_at: '2026-07-01T10:00:00Z' });
    const c = buildRequestCase(r, [formal], 'en', NOW);
    expect(c.stage).toBe('formal');
    expect(c.nextLever).toBeNull();
  });

  it('a denial routes to the written Notice of Action — once', () => {
    const r = req({ status: 'denied' });
    const c = buildRequestCase(r, [], 'en', NOW);
    expect(c.nextLever?.template).toBe('noa_request');
    // Sent it? Then the ball is theirs — re-offering the same letter
    // minutes later invites a duplicate send.
    const noa = comm({ template_key: 'noa_request', request_id: r.id });
    expect(buildRequestCase(r, [noa], 'en', NOW).nextLever).toBeNull();
  });

  it('a private note or unsent draft never "answers" the agency; a sent letter does', () => {
    const r = req({});
    const reply = comm({
      direction: 'incoming', request_id: r.id, gmail_message_id: 'm1',
      sent_at: '2026-08-20T09:00:00Z', occurred_at: '2026-08-20T09:00:00Z',
    });
    const note = comm({ kind: 'note', request_id: r.id, occurred_at: '2026-08-21T09:00:00Z', created_at: '2026-08-21T09:00:00Z' });
    const draft = comm({ status: 'draft', sent_at: null, request_id: r.id, occurred_at: '2026-08-22T09:00:00Z', created_at: '2026-08-22T09:00:00Z' });
    expect(buildRequestCase(r, [reply, note], 'en', NOW).unansweredReply).not.toBeNull();
    expect(buildRequestCase(r, [reply, draft], 'en', NOW).unansweredReply).not.toBeNull();
    const sent = comm({ request_id: r.id, occurred_at: '2026-08-23T09:00:00Z', created_at: '2026-08-23T09:00:00Z' });
    expect(buildRequestCase(r, [reply, note, sent], 'en', NOW).unansweredReply).toBeNull();
  });

  it('drafts never advance the stage', () => {
    const draft = comm({ template_key: 'dds_4731_complaint', status: 'draft' });
    expect(deriveStage([{ communication: draft, when: draft.occurred_at, role: 'formal', linkage: 'request_id', provenance: 'contemporaneous' }])).toBe('ask');
  });
});

describe('badge the job, not the channel', () => {
  it('a reply on a tracked request badges Requests as info, and leaves Sent & Received', () => {
    const r = req({ communication_id: 'o' });
    const o = comm({ id: 'o', gmail_thread_id: 't', gmail_message_id: 'm1', request_id: r.id });
    const reply = comm({
      direction: 'incoming', gmail_thread_id: 't', gmail_message_id: 'm2',
      sent_at: '2026-08-28T09:00:00Z', occurred_at: '2026-08-28T09:00:00Z',
    });
    const badge = caseBadge([r], [o, reply], 'en', NOW);
    expect(badge?.text).toBe('1 new reply');
    expect(badge?.tone).toBe('info');
    expect(isReplyOutsideRequests(reply, [r], [o, reply])).toBe(false);
  });

  it('a reply on an untracked thread stays with Sent & Received', () => {
    const stray = comm({ direction: 'incoming', gmail_thread_id: 'solo', gmail_message_id: 'm9' });
    expect(isReplyOutsideRequests(stray, [], [stray])).toBe(true);
    expect(requestForCommunication(stray, [], [stray])).toBeNull();
  });

  it('pre-047, a reply on the founding thread still finds its case via the origin letter', () => {
    const r = req({ communication_id: 'origin' });
    // Neither row carries request_id — the 045 communication_id is the only link.
    const origin = comm({ id: 'origin', gmail_thread_id: 't', gmail_message_id: 'm1' });
    const reply = comm({
      direction: 'incoming', gmail_thread_id: 't', gmail_message_id: 'm2',
      sent_at: '2026-08-28T09:00:00Z', occurred_at: '2026-08-28T09:00:00Z',
    });
    expect(requestForCommunication(reply, [r], [origin, reply])?.id).toBe(r.id);
    expect(isReplyOutsideRequests(reply, [r], [origin, reply])).toBe(false);
  });

  it('a reply on a granted request stays with Sent & Received — its case has no live work', () => {
    const r = req({ status: 'granted' });
    const reply = comm({
      direction: 'incoming', request_id: r.id, gmail_message_id: 'm3',
      sent_at: '2026-08-28T09:00:00Z', occurred_at: '2026-08-28T09:00:00Z',
    });
    expect(isReplyOutsideRequests(reply, [r], [reply])).toBe(true);
    expect(caseBadge([r], [reply], 'en', NOW)).toBeNull();
  });

  it('a reply on a DENIED request is still case work and badges Requests', () => {
    const r = req({ status: 'denied' });
    const reply = comm({
      direction: 'incoming', request_id: r.id, gmail_message_id: 'm4',
      sent_at: '2026-08-28T09:00:00Z', occurred_at: '2026-08-28T09:00:00Z',
    });
    expect(isReplyOutsideRequests(reply, [r], [reply])).toBe(false);
    expect(caseBadge([r], [reply], 'en', NOW)?.text).toBe('1 new reply');
  });

  it('overdue beats waiting; closed requests badge nothing', () => {
    const overdue = req({ request_type: 'ipp_meeting', requested_on: '2026-07-01' });
    expect(caseBadge([overdue], [], 'en', NOW)?.text).toBe('1 overdue');
    expect(caseBadge([req({ status: 'granted' })], [], 'en', NOW)).toBeNull();
  });
});

describe('locale parity', () => {
  it('structure is locale-invariant; prose is not', () => {
    const r = req({ channel: 'phone', requested_on: '2026-08-20', created_at: '2026-08-29T09:00:00Z' });
    const en = buildRequestCase(r, [], 'en', NOW);
    for (const locale of ['es', 'vi'] as const) {
      const other = buildRequestCase(r, [], locale, NOW);
      expect(other.stage).toBe(en.stage);
      expect(other.nextLever?.template).toBe(en.nextLever?.template);
      expect(other.nextLever?.rung).toBe(en.nextLever?.rung);
      expect(other.nextLever?.reason).not.toBe(en.nextLever?.reason);
    }
  });
});
