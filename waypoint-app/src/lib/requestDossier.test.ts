import { describe, it, expect } from 'vitest';
import { buildRequestCase } from './requestCase';
import {
  splitDossierEvents,
  buildRequestDossierText,
  renderRequestDossierHtml,
} from './requestDossier';
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
    request_type: 'ipp_meeting',
    title: 'IPP meeting for Teddy',
    requested_on: '2026-07-01',
    channel: 'email',
    status: 'requested',
    decided_on: null,
    notes: null,
    communication_id: null,
    created_at: '2026-07-01T14:00:00Z',
    updated_at: '2026-07-01T14:00:00Z',
    ...over,
  } as FamilyRequest;
}

/** A case with all three linkages and a backdated hand-logged call. */
function fullCase() {
  const r = req({ communication_id: 'origin' });
  const origin = comm({
    id: 'origin',
    subject: 'Requesting an IPP meeting',
    gmail_thread_id: 't1',
    gmail_message_id: 'm1',
    occurred_at: '2026-07-01T10:00:00Z',
    sent_at: '2026-07-01T10:00:00Z',
    created_at: '2026-07-01T10:00:00Z',
  });
  const reply = comm({
    direction: 'incoming',
    subject: 'Re: Requesting an IPP meeting',
    gmail_thread_id: 't1',
    gmail_message_id: 'm2',
    occurred_at: '2026-07-10T09:00:00Z',
    sent_at: '2026-07-10T09:00:00Z',
    created_at: '2026-07-10T09:05:00Z',
  });
  // Backdated: happened in May, logged in August — sent_at lies, occurred_at doesn't.
  const call = comm({
    kind: 'call',
    subject: 'Called the service coordinator',
    request_id: r.id,
    occurred_at: '2026-05-02T12:00:00Z',
    sent_at: '2026-08-29T09:00:00Z',
    created_at: '2026-08-29T09:00:00Z',
  });
  return { r, kase: buildRequestCase(r, [origin, reply, call], 'en', NOW) };
}

const OPTS = { generatedOn: '2026-08-29', parentName: 'Alex Rivera', childName: 'Teddy' };

describe('splitDossierEvents — exact links vs thread inference', () => {
  it('closure-linked items leave the core table for their own section', () => {
    const { kase } = fullCase();
    const { core, thread } = splitDossierEvents(kase);
    expect(core.map((e) => e.linkage).sort()).toEqual(['origin_letter', 'request_id']);
    expect(thread).toHaveLength(1);
    expect(thread[0].communication.direction).toBe('incoming');
  });

  // The Case file button prints kase.events.length. This does NOT test the
  // button — RequestCaseScreen.test.tsx does that, by reading the label and
  // the thread together. What it pins is the property the button relies on:
  // the document accounts for every event, so a total taken from the case can
  // never exceed or undershoot what the parent finds inside the file.
  it('the document accounts for every event — nothing is silently dropped', () => {
    const { kase } = fullCase();
    const { core, thread } = splitDossierEvents(kase);
    expect(core.length + thread.length).toBe(kase.events.length);

    const text = buildRequestDossierText(kase, OPTS);
    expect(text).toContain(`RECORD (${core.length} item${core.length === 1 ? '' : 's'}, oldest first)`);
    expect(text).toContain(`SAME EMAIL THREAD (${thread.length} item`);
    // Every event's subject actually appears, in one section or the other.
    for (const e of kase.events) expect(text).toContain(e.communication.subject!);
  });

  it('singular and plural both hold, so "1 items" can never ship', () => {
    const r = req({ communication_id: 'origin' });
    const only = comm({ id: 'origin', subject: 'Requesting an IPP meeting' });
    const kase = buildRequestCase(r, [only], 'en', NOW);
    expect(splitDossierEvents(kase).core).toHaveLength(1);
    expect(buildRequestDossierText(kase, OPTS)).toContain('RECORD (1 item, oldest first)');

    const empty = buildRequestCase(req({}), [], 'en', NOW);
    expect(splitDossierEvents(empty).core).toHaveLength(0);
    expect(buildRequestDossierText(empty, OPTS)).toContain('RECORD (0 items, oldest first)');
  });

  it('the document a parent opens is headed "Case file", never "dossier"', () => {
    const { kase } = fullCase();
    const text = buildRequestDossierText(kase, OPTS);
    const html = renderRequestDossierHtml(kase, OPTS);
    expect(text).toContain('CASE FILE —');
    expect(html).toContain('<h1>Case file —');
    expect(html).toContain('<title>Case file —');
    // "Dossier" is our word for it, not a word any parent asked for.
    expect(text.toLowerCase()).not.toContain('dossier');
    expect(html.toLowerCase()).not.toContain('dossier');
  });
});

describe('buildRequestDossierText', () => {
  it('orders by the honest event time — the May call leads despite its August sent_at', () => {
    const { kase } = fullCase();
    const text = buildRequestDossierText(kase, OPTS);
    const callAt = text.indexOf('Called the service coordinator');
    const letterAt = text.indexOf('Requesting an IPP meeting');
    expect(callAt).toBeGreaterThan(-1);
    expect(callAt).toBeLessThan(letterAt);
    expect(text).toContain('May 2, 2026');
  });

  it('a recalled item states both dates instead of pretending precision', () => {
    const { kase } = fullCase();
    const text = buildRequestDossierText(kase, OPTS);
    expect(text).toContain('Recalled later — happened May 2, 2026, logged Aug 29, 2026');
  });

  it('states the item counts and the legal clock with its citation', () => {
    const { kase } = fullCase();
    const text = buildRequestDossierText(kase, OPTS);
    expect(text).toContain('RECORD (2 items');
    expect(text).toContain('SAME EMAIL THREAD (1 item ');
    expect(text).toContain('W&I §4646.5(b)');
    expect(text).toContain('passed'); // 30-day clock from Jul 1 is long gone by Aug 29
  });

  it('never overclaims immutability; the fingerprint appears only when computed and says what it covers', () => {
    const { kase } = fullCase();
    const bare = buildRequestDossierText(kase, OPTS);
    expect(bare).not.toContain('SHA-256');
    expect(bare.toLowerCase()).not.toContain('immutable');
    expect(bare.toLowerCase()).not.toContain('tamper');
    const hashed = buildRequestDossierText(kase, { ...OPTS, contentHash: 'abc123' });
    expect(hashed).toContain('Record fingerprint (SHA-256');
    expect(hashed).toContain('abc123');
    // The hash covers this export's text content, not the file the reader
    // holds — and since the export date and day counts are inside the
    // hashed text, no cross-day reproducibility may be promised either.
    expect(hashed).toContain('not this file');
    expect(hashed).not.toContain('identifies this exact document');
    expect(hashed).not.toContain('reproduces it');
  });

  it('a denied request never reads as "went unanswered" — it was answered with a no', () => {
    const r = req({ status: 'denied', decided_on: '2026-08-15' });
    const noa = comm({
      template_key: 'noa_request', request_id: r.id,
      occurred_at: '2026-08-16T10:00:00Z', created_at: '2026-08-16T10:00:00Z',
    });
    const kase = buildRequestCase(r, [noa], 'en', NOW);
    const text = buildRequestDossierText(kase, OPTS);
    expect(text).not.toContain('went unanswered');
    expect(text).toContain('the written decision (Notice of Action) has been requested');
  });
});

describe('renderRequestDossierHtml', () => {
  it('is self-contained, escaped, and free of undefineds', () => {
    const { kase } = fullCase();
    kase.request.title = 'Respite <script>alert(1)</script>';
    const html = renderRequestDossierHtml(kase, { ...OPTS, contentHash: 'deadbeef' });
    expect(html).toContain('<!doctype html>');
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('undefined');
    expect(html).toContain('Same email thread (1 item)');
    expect(html).toContain('deadbeef');
  });

  it('a phone-only case renders an honest empty record, not a fake row', () => {
    const r = req({ channel: 'phone', requested_on: '2026-08-20', created_at: '2026-08-29T09:00:00Z' });
    const kase = buildRequestCase(r, [], 'en', NOW);
    const html = renderRequestDossierHtml(kase, OPTS);
    expect(html).toContain('tracked from a spoken ask');
    expect(html).not.toContain('Same email thread');
  });

  it('an email-channel request with an unlinked record never claims a "spoken ask"', () => {
    const r = req({ channel: 'email', requested_on: '2026-08-20' });
    const kase = buildRequestCase(r, [], 'en', NOW);
    expect(renderRequestDossierHtml(kase, OPTS)).not.toContain('spoken ask');
    expect(buildRequestDossierText(kase, OPTS)).toContain('No written items are linked');
  });
});
