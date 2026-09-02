/**
 * Turn a plan item into a ready-to-send email.
 *
 * Owner request (Sep 2 2026): "on action items there should be way to generate
 * email." A parent looking at "Ask the Regional Center for an assessment"
 * should not have to re-type it into their mail app — and when they do send
 * it, it belongs in the paper trail like every other outbound letter.
 *
 * TONE (CLAUDE.md, owner preference Aug 2026). The first contact is always
 * friendly and collaborative — "ask" and "request", never "demand". Nothing in
 * here asserts a deadline against the agency, states a legal consequence, or
 * names a right; a due date the family set for themselves becomes "it would
 * help to have this by …", not "you must respond by …". Escalation is the
 * Letters templates' job, one rung at a time, after an ask goes unanswered.
 *
 * WHAT IS DELIBERATELY LEFT OUT of the agency email: `action.script`. That
 * field is the *phone* script — "Hi, I'm calling about my son's…" — and pasted
 * into an email it reads as a transcript of a call that never happened. The
 * team email (below) does carry it, because there it is context for a person
 * who may be about to make that call.
 *
 * Pure — no react-native, no I/O — so it runs in the `logic` project.
 */

import { formatActionForSharing, parseActionDescription } from './actionContent';

export interface ActionEmailAction {
  title: string;
  description?: string | null;
  category: string;
  priority: string;
  status?: string;
  due_date?: string | null;
  script?: string | null;
  steps?: Array<{ step: string; done?: boolean }> | null;
}

export interface ActionEmailContext {
  /** The child this concerns — named once, in the opening line. */
  childFirstName?: string | null;
  /** Signed as the parent, when we know their name. */
  parentName?: string | null;
}

/** Who this draft addresses. The two read very differently. */
export type ActionEmailAudience = 'agency' | 'team';

export interface ActionEmail {
  subject: string;
  body: string;
}

/** How to name the recipient's world in the opening line. */
const AUDIENCE_BY_CATEGORY: Record<string, string> = {
  regional_center: 'Regional Center',
  iep: 'school',
  insurance: 'insurance',
  benefits: 'benefits',
  medical: 'care',
  legal: 'case',
  general: '',
};

const MAX_SUBJECT = 120;

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.5 ? cut.slice(0, space) : cut).replace(/[\s,;:.—–-]+$/, '')}…`;
}

/** A due date the FAMILY set, phrased as a hope rather than an instruction. */
function friendlyBy(dueDate: string): string | null {
  const d = new Date(`${dueDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const when = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  return `If it's possible, having an answer by ${when} would really help us plan.`;
}

/**
 * The subject line. Named for the child first, because that is what an intake
 * coordinator sorts by.
 */
export function buildActionEmailSubject(
  action: ActionEmailAction,
  ctx: ActionEmailContext = {}
): string {
  const child = ctx.childFirstName?.trim();
  return clip(child ? `${child} — ${action.title}` : action.title, MAX_SUBJECT);
}

/**
 * The collaborative first ask, built from the action's own content: what the
 * family is asking for, the context Waypoint recorded, and the steps as *our*
 * understanding — offered for correction, not asserted.
 */
function buildAgencyBody(action: ActionEmailAction, ctx: ActionEmailContext): string {
  const content = parseActionDescription(action.description ?? '');
  const child = ctx.childFirstName?.trim();
  const world = AUDIENCE_BY_CATEGORY[action.category] ?? '';
  const lines: string[] = ['Hello,', ''];

  const opener = child
    ? `I'm ${child}'s parent, and I'm writing to ask for your help with one thing.`
    : "I'm writing to ask for your help with one thing.";
  lines.push(opener, '');

  lines.push(action.title, '');

  if (content.summary) lines.push(content.summary, '');

  const openSteps = (action.steps ?? []).filter((s) => !s.done).map((s) => s.step);
  if (openSteps.length > 0) {
    lines.push("Here's what I understand needs to happen — please correct me if I have any of it wrong:");
    openSteps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    lines.push('');
  }

  if (content.documents.length > 0) {
    lines.push('If it would help, I can send along:');
    content.documents.forEach((d) => lines.push(`• ${d}`));
    lines.push('');
  }

  lines.push(
    world
      ? `Could you let me know what the next step is on your side, and whether you need anything else from me? I'd rather get this right the first time than add to your ${world} workload.`
      : 'Could you let me know what the next step is on your side, and whether you need anything else from me?'
  );

  if (action.due_date) {
    const by = friendlyBy(action.due_date);
    if (by) lines.push('', by);
  }

  lines.push('', 'Thank you for your time,');
  lines.push(ctx.parentName?.trim() || '[Your name]');

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * For a co-parent, advocate or grandparent: the whole item, verbatim, in the
 * format the Share button already produces — including the phone script, which
 * is exactly what a teammate about to make the call needs.
 */
function buildTeamBody(action: ActionEmailAction, ctx: ActionEmailContext): string {
  const child = ctx.childFirstName?.trim();
  const intro = child
    ? `Hi — here's the next step on ${child}'s plan. Sharing it so we're both looking at the same thing.`
    : "Hi — here's the next step on our plan. Sharing it so we're both looking at the same thing.";
  return [
    intro,
    '',
    formatActionForSharing({
      title: action.title,
      description: action.description ?? null,
      category: action.category,
      priority: action.priority,
      status: action.status ?? 'not_started',
      due_date: action.due_date ?? null,
      script: action.script ?? null,
      steps: (action.steps ?? []).map((s) => ({ step: s.step, done: !!s.done })),
    }),
  ].join('\n');
}

/** Subject + body for one plan item, addressed to an agency or to your team. */
export function buildActionEmail(
  action: ActionEmailAction,
  ctx: ActionEmailContext = {},
  audience: ActionEmailAudience = 'agency'
): ActionEmail {
  return {
    subject: buildActionEmailSubject(action, ctx),
    body:
      audience === 'agency' ? buildAgencyBody(action, ctx) : buildTeamBody(action, ctx),
  };
}
