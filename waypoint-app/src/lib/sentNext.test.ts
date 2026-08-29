import { describe, it, expect } from 'vitest';
import { sentNextFor, trackFor } from './sentNext';
import { deadlineFor, REQUEST_TYPE_LABELS } from './requestClocks';

const LEVER_TEMPLATES = [
  'sdp_info_request', 'ipp_review_request', 'assessment_request',
  'noa_request', 'records_request', 'rc_timeline_followup', 'medi_cal_deeming',
];

describe('sentNextFor', () => {
  it('every lever letter has a sent moment; unknown templates stay quiet', () => {
    for (const key of LEVER_TEMPLATES) {
      expect(sentNextFor(key, 'Teddy'), key).not.toBeNull();
    }
    expect(sentNextFor('general')).toBeNull();
    expect(sentNextFor('iep_prep')).toBeNull();
  });

  it('clock-starting letters track a request type the clock engine knows', () => {
    const ipp = sentNextFor('ipp_review_request')!;
    expect(ipp.track?.requestType).toBe('ipp_meeting');
    const d = deadlineFor(ipp.track!.requestType, '2026-08-23', new Date('2026-08-23T12:00:00'));
    expect(d?.daysRemaining).toBe(30);
    expect(d?.citation).toBe('W&I §4646.5(b)');

    const iep = sentNextFor('assessment_request')!;
    expect(deadlineFor(iep.track!.requestType, '2026-08-23', new Date('2026-08-23T12:00:00'))?.daysRemaining).toBe(15);
  });

  it('every tracked type has a tracker label', () => {
    for (const key of LEVER_TEMPLATES) {
      const n = sentNextFor(key);
      if (n?.track) expect(REQUEST_TYPE_LABELS[n.track.requestType]).toBeTruthy();
    }
  });

  it('no-clock letters say so honestly instead of inventing a deadline', () => {
    const sdp = sentNextFor('sdp_info_request', 'Teddy')!;
    expect(sdp.expectations.join(' ')).toContain('no legal clock');
    expect(deadlineFor(sdp.track!.requestType, '2026-08-23')).toBeNull();
  });

  it('the follow-up letter does not open a duplicate tracked request', () => {
    expect(sentNextFor('rc_timeline_followup')!.track).toBeNull();
  });

  it('a lever letter sent FROM a case never opens a second clock row', () => {
    // Both suppression branches: a template whose default is track:null
    // (rc_timeline_followup), and one that normally opens a row
    // (noa_request → authorization). With a preset request, neither tracks.
    expect(trackFor(sentNextFor('rc_timeline_followup'), 'req-1')).toBeNull();
    const noa = sentNextFor('noa_request')!;
    expect(noa.track).not.toBeNull(); // sanity: default DOES open a row
    expect(trackFor(noa, 'req-1')).toBeNull();
    // …and without a preset request the default behavior is untouched.
    expect(trackFor(noa, null)).toEqual(noa.track);
    expect(trackFor(noa, undefined)).toEqual(noa.track);
    expect(trackFor(null, 'req-1')).toBeNull();
  });

  it('celebrations are specific, and the child is named where it matters', () => {
    const r = sentNextFor('records_request', 'Teddy')!;
    expect(r.celebration).toContain('Teddy');
    for (const key of LEVER_TEMPLATES) {
      const n = sentNextFor(key)!;
      expect(n.celebration.length).toBeGreaterThan(10);
      expect(n.expectations.length).toBeGreaterThanOrEqual(2);
      expect(n.followUpDays).toBeGreaterThan(0);
    }
  });
});

describe('Spanish parity', () => {
  it('ES changes prose but never tracking, clocks, or follow-up timing', () => {
    for (const key of LEVER_TEMPLATES) {
      const en = sentNextFor(key, 'Teddy', 'en')!;
      const es = sentNextFor(key, 'Teddy', 'es')!;
      expect(es.track).toEqual(en.track);
      expect(es.followUpDays).toBe(en.followUpDays);
      expect(es.celebration).not.toBe(en.celebration);
      expect(es.expectations.length).toBe(en.expectations.length);
    }
  });

  it('citations survive translation in the prose', () => {
    const es = sentNextFor('ipp_review_request', 'Teddy', 'es')!;
    expect(es.did).toContain('W&I §4646.5(b)');
  });
});
