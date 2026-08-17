/**
 * Structured trailer parsing for AI Navigator responses.
 *
 * The server-side system prompt (ai-proxy) instructs the model to end every
 * response with trailer lines, each on its own line:
 *
 *   [[META: category | urgency]]
 *   [[QUICKREPLIES: yes | no | not sure]]
 *   [[STEPS: [{"action":"...","who":"...","timeline":"...","script":"..."}]]]
 *   [[CONTEXT: one sentence]]
 *   [[RIGHTS: one sentence]]
 *   [[WATCHOUT: one sentence]]
 *   [[RESOURCES: [{"name":"...","url":"...","phone":"...","how":"..."}]]]
 *   [[DRAFT: template_key | offer text]]
 *   [[FOLLOWUPS: option 1 | option 2 | option 3]]
 *
 * Trailers are never shown as text: during streaming the whole trailing
 * block (complete or partial) is hidden by hideStreamingTrailer(); on
 * completion parseTrailers() strips it from the stored content and returns
 * structured metadata for rendering as cards and chips.
 */

const TRAILER_NAMES = [
  'META',
  'QUICKREPLIES',
  'STEPS',
  'CONTEXT',
  'RIGHTS',
  'WATCHOUT',
  'RESOURCES',
  'DRAFT',
  'FOLLOWUPS',
] as const;

// Greedy (.*) so values containing "]" (JSON arrays in STEPS/RESOURCES)
// parse correctly — the regex anchors on the LAST "]]" of the line.
const COMPLETE_LINE_RE = /^\[\[([A-Z]+):(.*)\]\]$/;

export interface ChatStep {
  action: string;
  who?: string;
  timeline?: string;
  script?: string;
}

export interface ChatResource {
  name: string;
  url?: string;
  phone?: string;
  how?: string;
}

/** Structured metadata parsed from a completed response's trailers. */
export interface ChatMeta {
  category?: string;
  urgency?: 'low' | 'medium' | 'high';
  quickReplies: string[];
  steps: ChatStep[];
  context?: string;
  rights?: string;
  watchOut?: string;
  resources: ChatResource[];
  draftKey?: string;
  draftOffer?: string;
  followUps: string[];
}

export interface ParsedMessage {
  content: string;
  meta: ChatMeta;
}

/** Legacy shape kept for existing call sites. */
export interface ParsedResponse {
  content: string;
  followUps: string[];
}

export function emptyChatMeta(): ChatMeta {
  return { quickReplies: [], steps: [], resources: [], followUps: [] };
}

/** True if the meta carries anything worth rendering beyond plain prose. */
export function hasRichMeta(meta: ChatMeta | undefined | null): boolean {
  if (!meta) return false;
  return Boolean(
    meta.steps.length ||
    meta.resources.length ||
    meta.quickReplies.length ||
    meta.context ||
    meta.rights ||
    meta.watchOut ||
    meta.draftKey
  );
}

/** A string that could still grow into "[[NAME:" as tokens arrive. */
function isPartialTrailer(tail: string): boolean {
  if (!tail.startsWith('[')) return false;
  for (const name of TRAILER_NAMES) {
    const prefix = `[[${name}:`;
    if (prefix.startsWith(tail) || tail.startsWith(prefix)) return true;
  }
  // "[" or "[[" alone — could become any trailer
  return tail === '[' || tail === '[[';
}

/**
 * True if `s` consists only of trailer lines (each complete), except that
 * the FINAL non-empty line may be a partial fragment still streaming in.
 */
function isTrailerRegion(s: string): boolean {
  const lines = s.split('\n');
  let sawKnown = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const m = line.match(COMPLETE_LINE_RE);
    if (m) {
      // Unknown names are tolerated (stripped + ignored) as long as a known
      // trailer anchors the block — the model may emit new trailer types.
      if (TRAILER_NAMES.includes(m[1] as typeof TRAILER_NAMES[number])) sawKnown = true;
      continue;
    }
    // A non-matching line is only tolerable if it's the last non-empty line
    // and looks like a trailer mid-stream.
    const isLast = lines.slice(i + 1).every((l) => !l.trim());
    return isLast && isPartialTrailer(line);
  }
  return sawKnown;
}

/**
 * Index where the trailing trailer block starts, or -1 if none.
 * Handles mid-stream fragments: a trailing "[", "[[STE", or an
 * unterminated "[[STEPS: [{"action":"call" — none of these may flash.
 */
export function trailerBlockStart(text: string): number {
  let idx = text.indexOf('[[');
  while (idx !== -1) {
    // Trailers start at the beginning of a line (or right after prose ends)
    if (isTrailerRegion(text.slice(idx))) return idx;
    idx = text.indexOf('[[', idx + 2);
  }
  // Lone trailing "[" could be the start of "[["
  if (text.endsWith('[')) return text.length - 1;
  return -1;
}

function splitPipes(value: string, max: number): string[] {
  return value
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);
}

function parseJsonArray<T>(value: string, map: (item: Record<string, unknown>) => T | null): T[] {
  try {
    const parsed = JSON.parse(value.trim());
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => (item && typeof item === 'object' ? map(item as Record<string, unknown>) : null))
      .filter((x): x is T => x !== null);
  } catch {
    return [];
  }
}

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim() : undefined;

/**
 * Split a completed response into display content and structured metadata.
 * Tolerates truncated trailers (missing "]]") by stripping the fragment.
 * Unknown trailer names and malformed JSON are dropped silently — a bad
 * trailer must never break the answer.
 */
export function parseTrailers(text: string): ParsedMessage {
  const meta = emptyChatMeta();
  const start = trailerBlockStart(text);
  if (start === -1) return { content: text, meta };

  const block = text.slice(start);
  for (const rawLine of block.split('\n')) {
    const line = rawLine.trim();
    const m = line.match(COMPLETE_LINE_RE);
    if (!m) continue;
    const value = m[2].trim();
    switch (m[1]) {
      case 'META': {
        const [category, urgency] = splitPipes(value, 2);
        if (category) meta.category = category.toLowerCase();
        if (urgency && ['low', 'medium', 'high'].includes(urgency.toLowerCase())) {
          meta.urgency = urgency.toLowerCase() as ChatMeta['urgency'];
        }
        break;
      }
      case 'QUICKREPLIES':
        meta.quickReplies = splitPipes(value, 3);
        break;
      case 'STEPS':
        meta.steps = parseJsonArray<ChatStep>(value, (item) => {
          const action = str(item.action);
          if (!action) return null;
          return {
            action,
            who: str(item.who),
            timeline: str(item.timeline),
            script: str(item.script),
          };
        }).slice(0, 5);
        break;
      case 'CONTEXT':
        if (value) meta.context = value;
        break;
      case 'RIGHTS':
        if (value) meta.rights = value;
        break;
      case 'WATCHOUT':
        if (value) meta.watchOut = value;
        break;
      case 'RESOURCES':
        meta.resources = parseJsonArray<ChatResource>(value, (item) => {
          const name = str(item.name);
          if (!name) return null;
          return {
            name,
            url: str(item.url),
            phone: str(item.phone),
            how: str(item.how),
          };
        }).slice(0, 3);
        break;
      case 'DRAFT': {
        const [key, ...offer] = value.split('|').map((s) => s.trim());
        if (key) {
          meta.draftKey = key;
          meta.draftOffer = offer.filter(Boolean).join(' | ') || undefined;
        }
        break;
      }
      case 'FOLLOWUPS':
        meta.followUps = splitPipes(value, 3);
        break;
    }
  }

  return { content: text.slice(0, start).trimEnd(), meta };
}

/**
 * Legacy wrapper: split a completed response into display content and
 * follow-up options only.
 */
export function parseFollowups(text: string): ParsedResponse {
  const { content, meta } = parseTrailers(text);
  return { content, followUps: meta.followUps };
}

/**
 * Hide a complete or partially-streamed trailer block during token
 * streaming. Called on every render while isStreaming — must never flash
 * "[[STEPS..." as tokens arrive (including a lone trailing "[").
 */
export function hideStreamingTrailer(text: string): string {
  const start = trailerBlockStart(text);
  return start === -1 ? text : text.slice(0, start).trimEnd();
}
