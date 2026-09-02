/**
 * Turn a plan item into a ready-to-send email — for the parent's own team.
 *
 * Owner request (Sep 2 2026): "on action items there should be way to generate
 * email." A parent looking at "Ask the Regional Center for a speech assessment"
 * should not have to re-type it — and when they send it, it belongs in the
 * paper trail like every other outbound message.
 *
 * ── WHY THERE IS NO AGENCY DRAFT HERE (an adversary finding, Sep 2 2026) ──
 *
 * The first version of this module also generated a "friendly first ask"
 * addressed to the Regional Center or school district, built by concatenating
 * the action's own title, summary, open steps and document list. That was
 * wrong, and the adversary pass proved it with the app's REAL generators
 * rather than a hand-written fixture. Every one of those fields is written TO
 * THE PARENT, and a large share of it is escalation material:
 *
 *   planGenerator  → "RC must schedule intake within 15 working days
 *                     (Lanterman Act §4642)", "Eligibility determination must
 *                     happen within 120 days", "Build that relationship."
 *   adaptiveEngine → "⚠️ Timeline violation: Eligibility within 120 days",
 *                     "This may be a Lanterman Act violation", "Agency: RC →
 *                     DDS", "File 4731 complaint with DDS", "Your most
 *                     powerful tool."
 *
 * So one tap of "Write this email" could send a Regional Center an accusation
 * of a statutory violation, the family's own escalation strategy, and an offer
 * to hand over their evidence log — all under "I'm writing to ask for your
 * help with one thing." That is the exact inverse of CLAUDE.md's escalation
 * rule: the first contact is friendly and collaborative, and firming up
 * happens one rung at a time, deliberately, after an ask goes unanswered.
 *
 * No regex launders parent-facing escalation copy into a collaborative agency
 * letter. The app already has the right tool for writing to an agency —
 * LettersScreen, whose templates carry the tone ladder — so the action detail
 * screen points there instead, and this module generates only the draft that
 * is safe to build from action content: the one to a person on YOUR side.
 *
 * Pure — no react-native, no I/O — so it runs in the `logic` project.
 */

import { formatActionForSharing } from './actionContent';

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
  /**
   * The child this concerns — named in the opening line. Only pass a name the
   * action is actually ABOUT: an unattached action in a two-child family used
   * to borrow the primary child's name and produce an email about the wrong
   * kid (adversary finding, Sep 2 2026).
   */
  childFirstName?: string | null;
}

export interface ActionEmail {
  subject: string;
  body: string;
}

const MAX_SUBJECT = 120;

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.5 ? cut.slice(0, space) : cut).replace(/[\s,;:.—–-]+$/, '')}…`;
}

/** The subject line — the child first, since that is what a teammate scans for. */
export function buildActionEmailSubject(
  action: ActionEmailAction,
  ctx: ActionEmailContext = {}
): string {
  const child = ctx.childFirstName?.trim();
  return clip(child ? `${child} — ${action.title}` : action.title, MAX_SUBJECT);
}

/**
 * For a co-parent, advocate or grandparent: the whole item, in the format the
 * Share button already produces — script included, because a teammate about to
 * make the call is exactly who needs it. Reusing `formatActionForSharing`
 * means Share and Email can never say different things about one step.
 *
 * Everything here stays inside the family. Nothing in this body is addressed
 * to, or safe to send to, an agency — see the module header.
 */
export function buildActionEmail(
  action: ActionEmailAction,
  ctx: ActionEmailContext = {}
): ActionEmail {
  const child = ctx.childFirstName?.trim();
  const intro = child
    ? `Hi — here's the next step on ${child}'s plan. Sharing it so we're both looking at the same thing.`
    : "Hi — here's the next step on our plan. Sharing it so we're both looking at the same thing.";

  return {
    subject: buildActionEmailSubject(action, ctx),
    body: [
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
    ].join('\n'),
  };
}
