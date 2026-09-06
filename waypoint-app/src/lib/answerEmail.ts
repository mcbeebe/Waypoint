/**
 * Pulling the actual email out of a Navigator answer.
 *
 * When a parent asks "can you write that email for me", the answer usually
 * comes back as a short note TO THE PARENT followed by the email itself:
 *
 *   Here's the combined version — one email, two asks, same warm tone.
 *
 *   Subject: IPP Addendum Request — Home-Based Life Skills OT and Sibling Support
 *
 *   Hi Lilia,
 *
 *   Thank you again for your ongoing support with Teddy's respite services…
 *
 * "Email this answer" used to send that whole thing verbatim, under a fixed
 * subject of "Waypoint: Disability Services Guidance" (owner report,
 * 2026-09-05: "the subject is unhelpful"). Two things were wrong with that:
 * the agency got a subject line that says nothing about the request, and the
 * first thing they read was Waypoint talking to the parent — "Here's the
 * combined version" — which is not something the parent meant to send.
 *
 * `lib/letterAddress.extractSubject` does not cover this: it deliberately only
 * accepts a Subject: line that OPENS the text, because for a Letters draft
 * anything else is the letter's own prose quoting a thread. Here the preamble
 * comes first by design, so this is its own function rather than a loosening
 * of that one.
 *
 * Pure — no react-native, no I/O.
 */

/** A "Subject:" line, anywhere on its own line. */
const SUBJECT_RE = /^[ \t]*Subject:[ \t]*(.+?)[ \t]*$/m;

/**
 * How far in we will look. A Subject: line deep in a long answer is far more
 * likely to be the model quoting an existing thread than proposing one.
 */
const MAX_LINES_BEFORE_SUBJECT = 12;

const MAX_SUBJECT = 200;

export interface ProposedEmail {
  /** The subject the answer proposed, or null if it did not propose one. */
  subject: string | null;
  /** What should actually be sent — the preamble and Subject: line removed. */
  body: string;
}

/**
 * Split a Navigator answer into the email it proposes.
 *
 * Returns the answer unchanged when there is no proposed subject, so the
 * caller can always use `body` and fall back on `subject` being null.
 */
export function extractProposedEmail(answer: string): ProposedEmail {
  const text = answer ?? '';
  const match = text.match(SUBJECT_RE);
  if (!match || match.index === undefined) return { subject: null, body: text };

  const before = text.slice(0, match.index);
  if (before.split('\n').length - 1 > MAX_LINES_BEFORE_SUBJECT) {
    return { subject: null, body: text };
  }

  const subject = match[1].trim();
  if (!subject) return { subject: null, body: text };

  const after = text.slice(match.index + match[0].length).replace(/^\s*\n/, '').trim();
  // A Subject: line with nothing under it is a mention, not an email.
  if (!after) return { subject: null, body: text };

  return {
    subject: subject.length > MAX_SUBJECT ? `${subject.slice(0, MAX_SUBJECT - 1).trimEnd()}…` : subject,
    body: after,
  };
}

/**
 * The subject to put on an emailed answer: the one the answer proposed, else
 * a fallback the caller supplies.
 */
export function subjectForAnswer(answer: string, fallback: string): string {
  return extractProposedEmail(answer).subject ?? fallback;
}
