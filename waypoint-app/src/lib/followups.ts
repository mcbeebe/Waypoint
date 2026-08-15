/**
 * Follow-up suggestion parsing.
 *
 * The Navigator's system prompt instructs the model to end every response
 * with a single trailer line:
 *
 *   [[FOLLOWUPS: option 1 | option 2 | option 3]]
 *
 * The trailer is never shown to the user: during streaming it is hidden by
 * hideStreamingTrailer(), and on completion parseFollowups() strips it from
 * the stored content and returns the options for rendering as tappable chips.
 */

const TRAILER_RE = /\n?\s*\[\[FOLLOWUPS:([^\]]*)\]\]\s*$/;
const TRAILER_START = '[[FOLLOWUPS:';

export interface ParsedResponse {
  content: string;
  followUps: string[];
}

/**
 * If the text ends in a complete-or-partial trailer, return the index where
 * it starts; otherwise -1. Handles mid-stream fragments: a trailing "[",
 * "[[FOLL", or an unterminated "[[FOLLOWUPS: opt 1 | op".
 */
function trailerStartIndex(text: string): number {
  const complete = text.match(TRAILER_RE);
  if (complete && complete.index !== undefined) return complete.index;

  const idx = text.lastIndexOf('[');
  if (idx === -1) return -1;
  // Normalize a possible "[[" start to its first bracket
  const start = idx > 0 && text[idx - 1] === '[' ? idx - 1 : idx;
  const tail = text.slice(start);
  const isPartial =
    tail.length <= TRAILER_START.length
      ? TRAILER_START.startsWith(tail)
      : tail.startsWith(TRAILER_START) && !tail.includes(']]');
  return isPartial ? start : -1;
}

/**
 * Split a completed response into display content and follow-up options.
 * Tolerates a truncated trailer (missing "]]") by stripping the fragment.
 */
export function parseFollowups(text: string): ParsedResponse {
  const match = text.match(TRAILER_RE);
  if (match && match.index !== undefined) {
    const followUps = match[1]
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);
    return { content: text.slice(0, match.index).trimEnd(), followUps };
  }

  const start = trailerStartIndex(text);
  if (start !== -1) {
    return { content: text.slice(0, start).trimEnd(), followUps: [] };
  }
  return { content: text, followUps: [] };
}

/**
 * Hide a complete or partially-streamed trailer during token streaming.
 * Called on every render while isStreaming — must never flash
 * "[[FOLLOWUPS..." as tokens arrive (including a lone trailing "[").
 */
export function hideStreamingTrailer(text: string): string {
  const start = trailerStartIndex(text);
  return start === -1 ? text : text.slice(0, start).trimEnd();
}
