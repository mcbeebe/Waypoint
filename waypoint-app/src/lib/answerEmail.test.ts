import { describe, it, expect } from 'vitest';
import { extractProposedEmail, subjectForAnswer } from './answerEmail';

/** The shape the owner actually hit (2026-09-05), preamble and all. */
const REAL_ANSWER = `Here's the combined version — one email, two asks, same warm tone.

Subject: IPP Addendum Request — Home-Based Life Skills OT and Sibling Support

Hi Lilia,

Thank you again for your ongoing support with Teddy's respite services — they've made a real difference for our family.

I'd like to ask about adding two things to Teddy's IPP.`;

describe('an answer that proposes an email', () => {
  const { subject, body } = extractProposedEmail(REAL_ANSWER);

  it('uses the subject the answer proposed', () => {
    expect(subject).toBe('IPP Addendum Request — Home-Based Life Skills OT and Sibling Support');
  });

  it('does not send Waypoint talking to the parent', () => {
    // "Here's the combined version — one email, two asks, same warm tone" is
    // addressed to the parent. A Regional Center should never read it.
    expect(body).not.toContain("Here's the combined version");
    expect(body).not.toContain('same warm tone');
  });

  it('does not leave the Subject: line inside the body', () => {
    expect(body).not.toMatch(/^Subject:/m);
  });

  it('starts the email at the greeting', () => {
    expect(body.startsWith('Hi Lilia,')).toBe(true);
  });

  it('keeps the whole letter after the greeting', () => {
    expect(body).toContain("Thank you again for your ongoing support");
    expect(body).toContain("adding two things to Teddy's IPP");
  });
});

describe('an answer that proposes nothing', () => {
  const plain =
    'Regional Center OT is a payor-of-last-resort service, so documenting insurance ' +
    'and school district attempts in the same email keeps your request moving.';

  it('returns the answer unchanged', () => {
    expect(extractProposedEmail(plain)).toEqual({ subject: null, body: plain });
  });

  it('falls back to the caller subject', () => {
    expect(subjectForAnswer(plain, 'Waypoint: Disability Services Guidance')).toBe(
      'Waypoint: Disability Services Guidance'
    );
  });
});

describe('things that look like a proposed email but are not', () => {
  it('ignores a Subject: buried deep in a long answer — probably a quoted thread', () => {
    const long = `${Array.from({ length: 20 }, (_, i) => `Point ${i}`).join('\n')}
Subject: Re: something they already sent you

quoted text`;
    expect(extractProposedEmail(long).subject).toBeNull();
  });

  it('ignores a Subject: line with nothing under it', () => {
    const mention = 'Put this in the subject line.\n\nSubject: \n';
    expect(extractProposedEmail(mention).subject).toBeNull();
  });

  it('ignores an empty subject value', () => {
    expect(extractProposedEmail('Subject:\n\nHi there').subject).toBeNull();
  });

  it('survives an empty answer', () => {
    expect(extractProposedEmail('')).toEqual({ subject: null, body: '' });
  });
});

describe('guards', () => {
  it('clips a runaway subject rather than shipping a 500-char header', () => {
    const answer = `Subject: ${'x'.repeat(400)}\n\nHi there,\n\nBody.`;
    const { subject } = extractProposedEmail(answer);
    expect(subject!.length).toBeLessThanOrEqual(200);
    expect(subject!.endsWith('…')).toBe(true);
  });

  it('takes the FIRST proposed subject when an answer offers two drafts', () => {
    const answer =
      'Option A:\n\nSubject: Ask for the assessment\n\nHi,\n\nA.\n\n' +
      'Option B:\n\nSubject: Escalate to DDS\n\nHi,\n\nB.';
    expect(extractProposedEmail(answer).subject).toBe('Ask for the assessment');
  });

  it('tolerates leading whitespace on the subject line', () => {
    expect(extractProposedEmail('  Subject: Padded\n\nHi,\n\nBody.').subject).toBe('Padded');
  });

  it('catches a lowercase "subject:" too — a model completion is not guaranteed to capitalize it', () => {
    // Regression: this function used to be case-SENSITIVE while
    // lib/letterAddress's own subject parser was not, so the two disagreed
    // on the same text — this one silently kept the "here's the combined
    // version" preamble and the literal "subject:" line in the body.
    const { subject, body } = extractProposedEmail(
      "Here's the combined version.\n\nsubject: IEP Assessment Request\n\nHi Keri,\n\nBody."
    );
    expect(subject).toBe('IEP Assessment Request');
    expect(body).not.toContain("Here's the combined version");
    expect(body.startsWith('Hi Keri,')).toBe(true);
  });
});
