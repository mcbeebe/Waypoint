import { describe, it, expect } from 'vitest';
import {
  parseTrailers,
  parseFollowups,
  hideStreamingTrailer,
  emptyChatMeta,
  hasRichMeta,
} from './followups';

const FULL_RESPONSE = `You have the right to request an assessment in writing.

The district must respond with an assessment plan within 15 days.

[[META: iep | medium]]
[[QUICKREPLIES: Yes, already asked | Not yet | Verbally only]]
[[STEPS: [{"action":"Send a written assessment request","who":"School district special ed department","timeline":"Today","script":"I am requesting a full evaluation of my child in all areas of suspected disability."},{"action":"Calendar the 15-day deadline","timeline":"15 calendar days"}]]]
[[CONTEXT: Verbal requests don't start the legal clock — only written ones do.]]
[[RIGHTS: You may request an evaluation at any time under IDEA 34 CFR §300.301.]]
[[WATCHOUT: Districts sometimes offer RTI/MTSS instead — you do not have to accept it as a substitute.]]
[[RESOURCES: [{"name":"Disability Rights California","phone":"1-800-776-5746","how":"Free advocacy help"},{"name":"CDE Special Education","url":"https://www.cde.ca.gov/sp/se/"}]]]
[[DRAFT: assessment_request | Want me to draft the assessment request letter?]]
[[FOLLOWUPS: What happens after 15 days? | Draft the letter | What areas should be assessed?]]`;

describe('parseTrailers', () => {
  it('parses a full trailer block into structured meta', () => {
    const { content, meta } = parseTrailers(FULL_RESPONSE);
    expect(content).toContain('assessment plan within 15 days');
    expect(content).not.toContain('[[');
    expect(meta.category).toBe('iep');
    expect(meta.urgency).toBe('medium');
    expect(meta.quickReplies).toEqual(['Yes, already asked', 'Not yet', 'Verbally only']);
    expect(meta.steps).toHaveLength(2);
    expect(meta.steps[0].action).toBe('Send a written assessment request');
    expect(meta.steps[0].script).toMatch(/full evaluation/);
    expect(meta.steps[1].who).toBeUndefined();
    expect(meta.context).toMatch(/legal clock/);
    expect(meta.rights).toMatch(/300\.301/);
    expect(meta.watchOut).toMatch(/RTI/);
    expect(meta.resources).toHaveLength(2);
    expect(meta.resources[0].phone).toBe('1-800-776-5746');
    expect(meta.resources[1].url).toContain('cde.ca.gov');
    expect(meta.draftKey).toBe('assessment_request');
    expect(meta.draftOffer).toMatch(/draft the assessment/);
    expect(meta.followUps).toHaveLength(3);
  });

  it('handles a response with only FOLLOWUPS (legacy shape)', () => {
    const text = 'Short answer.\n\n[[FOLLOWUPS: a | b | c]]';
    const { content, meta } = parseTrailers(text);
    expect(content).toBe('Short answer.');
    expect(meta.followUps).toEqual(['a', 'b', 'c']);
    expect(hasRichMeta(meta)).toBe(false);
  });

  it('returns full text when there are no trailers', () => {
    const text = 'Just prose. Even [BRACKETS] placeholders survive.';
    const { content, meta } = parseTrailers(text);
    expect(content).toBe(text);
    expect(meta).toEqual(emptyChatMeta());
  });

  it('drops malformed STEPS JSON without breaking the answer', () => {
    const text = 'Answer.\n[[STEPS: [{"action": broken]]]\n[[FOLLOWUPS: a | b]]';
    const { content, meta } = parseTrailers(text);
    expect(content).toBe('Answer.');
    expect(meta.steps).toEqual([]);
    expect(meta.followUps).toEqual(['a', 'b']);
  });

  it('ignores unknown trailer names', () => {
    const text = 'Answer.\n\n[[META: rights | low]]\n[[BOGUS: nope]]\n[[FOLLOWUPS: a]]';
    const { content, meta } = parseTrailers(text);
    // BOGUS is not a known trailer, so the block starts at META and BOGUS
    // line is skipped during parsing but stripped from content
    expect(meta.category).toBe('rights');
    expect(meta.followUps).toEqual(['a']);
    expect(content).toBe('Answer.');
  });

  it('strips a truncated trailer fragment at end of text', () => {
    const text = 'Answer.\n\n[[META: iep | low]]\n[[FOLLOWUPS: a | b';
    const { content, meta } = parseTrailers(text);
    expect(content).toBe('Answer.');
    expect(meta.category).toBe('iep');
    // truncated FOLLOWUPS line never completed — dropped
    expect(meta.followUps).toEqual([]);
  });

  it('rejects invalid urgency values', () => {
    const { meta } = parseTrailers('x\n[[META: iep | catastrophic]]');
    expect(meta.category).toBe('iep');
    expect(meta.urgency).toBeUndefined();
  });
});

describe('parseFollowups (legacy wrapper)', () => {
  it('returns content and followUps', () => {
    const { content, followUps } = parseFollowups('Hi.\n\n[[FOLLOWUPS: one | two]]');
    expect(content).toBe('Hi.');
    expect(followUps).toEqual(['one', 'two']);
  });
});

describe('hideStreamingTrailer', () => {
  it('hides a lone trailing "["', () => {
    expect(hideStreamingTrailer('Answer text [')).toBe('Answer text');
  });

  it('hides a partial trailer name', () => {
    expect(hideStreamingTrailer('Answer.\n\n[[STE')).toBe('Answer.');
  });

  it('hides an unterminated STEPS trailer containing JSON brackets', () => {
    const text = 'Answer.\n\n[[META: iep | low]]\n[[STEPS: [{"action":"call the RC"}';
    expect(hideStreamingTrailer(text)).toBe('Answer.');
  });

  it('hides a fully complete trailer block', () => {
    expect(hideStreamingTrailer(FULL_RESPONSE)).not.toContain('[[');
  });

  it('does not hide prose [BRACKETS] placeholders', () => {
    const text = 'Fill in [YOUR NAME] and [DATE] before sending.';
    expect(hideStreamingTrailer(text)).toBe(text);
  });

  it('does not hide mid-prose bracket usage while more prose follows', () => {
    const text = 'Use [BRACKETS] like this.\nMore prose here.';
    expect(hideStreamingTrailer(text)).toBe(text);
  });
});
