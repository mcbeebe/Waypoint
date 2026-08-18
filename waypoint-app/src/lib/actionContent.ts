/**
 * Action-content helpers for the detail view (UX 4: dummy-proof reading).
 *
 * - parseActionDescription() splits the structured description that
 *   planGenerator composes (summary / ⏰ Timeline / 🕒 Effort / Why this
 *   matters / Documents to gather / Do I qualify? / 💡 Insider tip) back
 *   into sections so the screen can render scannable cards. Free-form
 *   descriptions (chat-saved or manual actions) fall through to `summary`.
 *
 * - extractLinks() pulls websites and phone numbers out of action text and
 *   labels the well-known application portals, so users get one-tap
 *   "go apply" buttons instead of hunting through prose.
 */

export interface ParsedActionContent {
  summary: string;
  timeline: string | null;
  effort: string | null;
  why: string | null;
  documents: string[];
  eligibility: string | null;
  tip: string | null;
}

export function parseActionDescription(description: string): ParsedActionContent {
  const result: ParsedActionContent = {
    summary: '',
    timeline: null,
    effort: null,
    why: null,
    documents: [],
    eligibility: null,
    tip: null,
  };

  const blocks = description.split('\n\n');
  const summaryParts: string[] = [];

  for (const block of blocks) {
    const b = block.trim();
    if (b.startsWith('⏰ Timeline:')) {
      result.timeline = b.replace('⏰ Timeline:', '').trim();
    } else if (b.startsWith('🕒 Effort:')) {
      result.effort = b.replace('🕒 Effort:', '').trim();
    } else if (b.startsWith('Why this matters:')) {
      result.why = b.replace('Why this matters:', '').trim();
    } else if (b.startsWith('Documents to gather:')) {
      result.documents = b
        .replace('Documents to gather:', '')
        .split('\n')
        .map(line => line.replace(/^•\s*/, '').trim())
        .filter(Boolean);
    } else if (b.startsWith('Do I qualify?')) {
      result.eligibility = b.replace('Do I qualify?', '').trim();
    } else if (b.startsWith('💡 Insider tip:')) {
      result.tip = b.replace('💡 Insider tip:', '').trim();
    } else if (b) {
      summaryParts.push(b);
    }
  }

  result.summary = summaryParts.join('\n\n');
  return result;
}

// ─── Link extraction ─────────────────────────────────────────────────────────

export interface ActionLink {
  label: string;
  url: string;
}

export interface ActionPhone {
  label: string;
  number: string;
}

/** Friendly labels for the portals parents actually apply through. */
const KNOWN_SITES: Array<{ match: RegExp; label: string }> = [
  { match: /benefitscal\.com/i, label: 'Apply at BenefitsCal.com' },
  { match: /coveredca\.com/i, label: 'Covered California' },
  { match: /ssa\.gov/i, label: 'Social Security (ssa.gov)' },
  { match: /dds\.ca\.gov/i, label: 'Find your Regional Center' },
  { match: /calable\.ca\.gov/i, label: 'Open a CalABLE account' },
  { match: /dor\.ca\.gov/i, label: 'Dept. of Rehabilitation' },
  { match: /cdss\.ca\.gov/i, label: 'County IHSS offices' },
  { match: /etimesheets\.ihss\.ca\.gov/i, label: 'IHSS timesheets' },
  { match: /ndss\.org/i, label: 'National Down Syndrome Society' },
];

const URL_RE = /\b(?:https?:\/\/)?(?:[a-z0-9-]+\.)+(?:com|org|gov|net|edu)(?:\/[a-zA-Z0-9\-._~/]*)?/gi;
const PHONE_RE = /\b1-\d{3}-\d{3}-\d{4}\b|\(\d{3}\)\s?\d{3}-\d{4}/g;

export function extractLinks(texts: Array<string | null | undefined>): {
  links: ActionLink[];
  phones: ActionPhone[];
} {
  const joined = texts.filter(Boolean).join('\n');

  const links: ActionLink[] = [];
  const seenUrls = new Set<string>();
  for (const raw of joined.match(URL_RE) ?? []) {
    const cleaned = raw.replace(/[.,)]+$/, '');
    const key = cleaned.toLowerCase().replace(/^https?:\/\//, '');
    if (seenUrls.has(key)) continue;
    seenUrls.add(key);
    const known = KNOWN_SITES.find(s => s.match.test(cleaned));
    const domain = key.split('/')[0];
    links.push({
      label: known ? known.label : `Visit ${domain}`,
      url: cleaned.startsWith('http') ? cleaned : `https://${cleaned}`,
    });
  }

  const phones: ActionPhone[] = [];
  const seenPhones = new Set<string>();
  for (const raw of joined.match(PHONE_RE) ?? []) {
    const digits = raw.replace(/\D/g, '');
    if (seenPhones.has(digits)) continue;
    seenPhones.add(digits);
    phones.push({ label: `Call ${raw}`, number: digits });
  }

  return { links, phones };
}

// ─── Share formatting ───────────────────────────────────────────────────────

/** The fields of an Action the share text is built from */
export interface ShareableAction {
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  script: string | null;
  steps: Array<{ step: string; done: boolean }> | null;
  due_date: string | null;
}

const SHARE_CATEGORY_LABELS: Record<string, string> = {
  regional_center: 'Regional Center',
  iep: 'IEP / School',
  insurance: 'Insurance',
  benefits: 'Benefits',
  medical: 'Medical',
  legal: 'Legal',
  general: 'General',
};

function shareDate(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Render an action as clean plain text for sharing outside the app
 * (text message, email, WhatsApp) — so a partner who doesn't use Waypoint
 * gets everything needed to act: what, when, why, the exact words to say,
 * and the checklist.
 */
export function formatActionForSharing(action: ShareableAction): string {
  const lines: string[] = [];
  const content = parseActionDescription(action.description ?? '');

  lines.push(`📋 ${action.title}`);

  const metaBits = [
    SHARE_CATEGORY_LABELS[action.category] ?? action.category,
    action.priority === 'urgent' || action.priority === 'high'
      ? `${action.priority === 'urgent' ? 'Urgent' : 'High'} priority`
      : null,
    action.due_date ? `Due ${shareDate(action.due_date)}` : null,
  ].filter(Boolean);
  if (metaBits.length) lines.push(metaBits.join(' · '));

  if (content.summary) lines.push('', content.summary);
  if (content.timeline) lines.push('', `⏰ Timeline: ${content.timeline}`);
  if (content.effort) lines.push('', `🕒 Time needed: ${content.effort}`);
  if (content.why) lines.push('', `Why this matters: ${content.why}`);

  if (action.steps && action.steps.length > 0) {
    lines.push('', 'Steps:');
    action.steps.forEach((s, i) => {
      lines.push(`${s.done ? '✅' : '▢'} ${i + 1}. ${s.step}`);
    });
  }

  if (action.script) lines.push('', action.script);

  if (content.documents.length > 0) {
    lines.push('', 'Documents to gather:');
    content.documents.forEach((d) => lines.push(`• ${d}`));
  }
  if (content.eligibility) lines.push('', `Do we qualify?\n${content.eligibility}`);
  if (content.tip) lines.push('', `💡 Tip: ${content.tip}`);

  lines.push('', '— Shared from Waypoint · waypointchild.com');
  return lines.join('\n');
}
