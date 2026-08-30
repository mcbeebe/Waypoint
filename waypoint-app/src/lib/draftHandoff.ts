/**
 * The draft-flow handoff (Roadmap/Draft-Flow-Plan.md phase 9b) — turns a
 * completed set of question answers into everything the Letters screen needs to
 * open a prefilled draft: which template, the parent's request in their own
 * words, the tone they chose, the case it belongs to, and the card's reasoning
 * as grounding.
 *
 * Pure — no react-native, no supabase — so the mapping (especially which
 * template a "they said no" answer routes to) is unit-testable.
 */
import type { DraftTone } from '@/lib/lettersCatalog';
import type { FunnelLocale } from '@/lib/eligibility';
import type { LetterProfile } from '@/lib/draftBlanks';
import type { RequestType } from '@/lib/requestClocks';
import { REQUEST_LEVERS } from '@/lib/requestClocks';
import type { TriageItem } from '@/lib/homeTriage';
import { questionsFor, answersToRequest, toneFromAnswers } from '@/lib/draftQuestions';

export interface DraftHandoff {
  /** Letters template key. */
  template: string;
  /** The parent's ask, in their own words (English; the AI writes in-locale). */
  question: string;
  tone: DraftTone;
  /** The card's "why", so the draft reflects what it was chosen from. */
  guidance?: string;
  /** The request this draft belongs to, so its log entry attaches to the case. */
  requestId?: string;
}

export interface DraftHandoffCtx {
  /** For a follow-up (overdue/clock): the request's type, resolved by caller. */
  requestType?: RequestType | null;
  profile: LetterProfile;
  locale: FunnelLocale;
}

/**
 * Which template the draft opens. A reply's "they said no" is the load-bearing
 * route — it goes to the Notice-of-Action request, which carries the appeal
 * rights; any other reply is a plain answer. A follow-up uses the request's own
 * lever (the same mapping the case file uses), falling back to a custom letter.
 */
export function templateForDraft(
  item: TriageItem,
  answers: Record<string, string>,
  requestType?: RequestType | null
): string {
  if (item.cls === 'reply') {
    return answers.reply_read === 'said_no' ? 'noa_request' : 'general';
  }
  if (requestType && REQUEST_LEVERS[requestType]) {
    return REQUEST_LEVERS[requestType].template;
  }
  return 'general';
}

export function draftHandoff(
  item: TriageItem,
  answers: Record<string, string>,
  ctx: DraftHandoffCtx
): DraftHandoff {
  const questions = questionsFor(item, ctx.profile, ctx.locale);
  return {
    template: templateForDraft(item, answers, ctx.requestType),
    question: answersToRequest(questions, answers),
    tone: toneFromAnswers(item, answers),
    guidance: item.why,
    requestId: item.action.params?.requestId,
  };
}
