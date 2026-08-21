/**
 * Who a letter goes to, and what the subject line says.
 *
 * Drafts open in Gmail with an empty To field and a filler subject ("IEP
 * Email — Mike"), leaving the parent to look up an address and invent a
 * subject at the last step. Waypoint already knows the family's contacts,
 * and the draft usually names both its recipient and its own subject line.
 *
 * Pure module — no react-native imports — so it stays unit-testable.
 */

export interface AddressContact {
  name: string;
  email: string | null;
  organization?: string | null;
  role?: string | null;
}

/** "Subject: …" written by the model at the top of a draft. */
const SUBJECT_LINE_RE = /^\s*subject\s*:\s*(.+?)\s*$/im;

/**
 * Pull a leading "Subject:" line out of a draft.
 * Gmail has its own subject field, so leaving it in the body duplicates it.
 */
export function extractSubject(draft: string): { subject: string | null; body: string } {
  const match = draft.match(SUBJECT_LINE_RE);
  if (!match) return { subject: null, body: draft };

  // Only a line that OPENS the draft is the letter's subject. A "Subject:"
  // appearing later belongs to the letter's own prose (quoting an email
  // thread, say) and is left exactly where it is.
  const index = draft.indexOf(match[0]);
  if (draft.slice(0, index).trim().length > 0) return { subject: null, body: draft };

  return { subject: match[1], body: draft.slice(index + match[0].length).replace(/^\s*\n/, '') };
}

export interface SubjectParts {
  /** A "Subject:" line the draft supplied */
  draftSubject?: string | null;
  /** e.g. "IEP Email" */
  templateTitle: string;
  childFirstName?: string | null;
  familyLastName?: string | null;
}

/**
 * The draft's own subject wins; otherwise name the template and the child,
 * which is what the recipient needs to route it ("IEP Email — Teddy Beebe").
 */
export function buildSubject(parts: SubjectParts): string {
  const fromDraft = parts.draftSubject?.trim();
  if (fromDraft) return fromDraft;

  const child = [parts.childFirstName?.trim(), parts.familyLastName?.trim()]
    .filter(Boolean)
    .join(' ');
  return child ? `${parts.templateTitle} — ${child}` : parts.templateTitle;
}

/** "Hi Keri," / "Dear Ms. Waller," / "Dear Dr. Chen:" */
const GREETING_RE =
  /^[ \t]*(?:hi|hello|dear|good morning|good afternoon)[ \t]+(?:(mr|mrs|ms|miss|dr|prof)\.?[ \t]+)?([A-Za-z][A-Za-z'’-]*)(?:[ \t]+([A-Za-z][A-Za-z'’-]*))?[ \t]*[,:]/im;

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/\b(mr|mrs|ms|miss|dr|prof)\.?\b/g, '')
    .split(/[\s,]+/)
    .filter(Boolean);
}

export interface RecipientMatch {
  /** Addresses to put in the To field */
  to: string[];
  /** The contact matched, for showing the parent who this is going to */
  contact: AddressContact | null;
  /** How the match was made — drives the explanatory line in the UI */
  reason: 'greeting' | 'organization' | 'none';
}

/**
 * Pick the recipient for a draft.
 *
 * The greeting is the strongest signal — the letter literally names who
 * it's for. Failing that, fall back to a saved contact at the organization
 * this kind of letter goes to.
 */
export function pickRecipient(
  draft: string,
  contacts: AddressContact[],
  organization?: string | null
): RecipientMatch {
  const withEmail = contacts.filter((c) => c.email && c.email.includes('@'));
  if (withEmail.length === 0) return { to: [], contact: null, reason: 'none' };

  const greeting = draft.match(GREETING_RE);
  if (greeting) {
    const [, honorific, first, second] = greeting;
    const spoken = [first, second].filter(Boolean).map((w) => w!.toLowerCase());

    const byGreeting = withEmail.find((c) => {
      const tokens = nameTokens(c.name);
      if (tokens.length === 0) return false;
      // "Dear Ms. Waller" names a surname; "Hi Keri" names a first name
      if (honorific && spoken.length === 1) return tokens[tokens.length - 1] === spoken[0];
      return spoken.every((word) => tokens.includes(word));
    });

    if (byGreeting) {
      return { to: [byGreeting.email!], contact: byGreeting, reason: 'greeting' };
    }
  }

  if (organization) {
    const byOrg = withEmail.find((c) => c.organization === organization);
    if (byOrg) return { to: [byOrg.email!], contact: byOrg, reason: 'organization' };
  }

  return { to: [], contact: null, reason: 'none' };
}
