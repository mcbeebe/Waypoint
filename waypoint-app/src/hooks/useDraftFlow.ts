/**
 * The draft flow's orchestration (Roadmap/Draft-Flow-Plan.md phases 9a–9e),
 * lifted out of HomeScreen so Home is the render and this is the engine.
 *
 * A "Draft the follow-up" / "Draft your answer" tap on the One Thing card runs
 * `openDraftFlow`: for a reply it lets the AI READ the reply first (9e) and
 * shows that reading in the question sheet, then hands the parent's answers off
 * to a prefilled Letters draft. Nothing is classified or auto-routed — the AI's
 * reading is shown, the parent picks (see openDraftFlow's note).
 *
 * The stale-open guard (draftFlowToken) and the 8s read bound live here; the
 * screen only renders the sheet and the reading overlay this hook drives.
 */
import { useMemo, useRef, useState } from 'react';
import { analyzeEmail } from '@/lib/letters';
import { draftHandoff } from '@/lib/draftHandoff';
import type { LetterProfile } from '@/lib/draftBlanks';
import type { RequestType } from '@/lib/requestClocks';
import type { TriageItem } from '@/lib/homeTriage';
import type { FunnelLocale } from '@/lib/eligibility';
import type { Family, Child } from '@/types/database';
import type { FamilyRequest } from '@/hooks/useRequests';
import type { Communication } from '@/hooks/useCommunications';

/** The open sheet, with the owning request's type resolved AT OPEN TIME — so a
 *  requests refetch between opening and "Write my letter" can't swap the letter
 *  out from under the parent. */
export interface DraftState {
  item: TriageItem;
  requestType: RequestType | null;
  aiSummary?: string;
}

interface UseDraftFlowParams {
  family: Family | null;
  primaryChild: Child | null;
  familyRequests: FamilyRequest[];
  communications: Communication[];
  locale: FunnelLocale;
  /** Navigate to Letters with the prefilled draft. */
  navigate: (screen: string, params?: unknown) => void;
  /** Surface an honest failure (e.g. the daily-AI-cap message). */
  onNotice: (message: string) => void;
}

export interface UseDraftFlowResult {
  /** The open question sheet, or null. */
  draft: DraftState | null;
  /** Close the sheet without drafting. */
  closeDraft: () => void;
  /** True while Waypoint reads a reply before the sheet opens (9e). */
  readingReply: boolean;
  /** Everything the app already knows that letters ask for. */
  letterProfile: LetterProfile;
  /** A draftable card's tap: open the sheet (reading the reply first). */
  openDraftFlow: (item: TriageItem) => Promise<void>;
  /** Dismiss the reading overlay and abandon the in-flight analysis. */
  cancelReadingReply: () => void;
  /** Sheet complete: turn the answers into a prefilled Letters draft. */
  onDraftComplete: (answers: Record<string, string>) => void;
}

export function useDraftFlow({
  family,
  primaryChild,
  familyRequests,
  communications,
  locale,
  navigate,
  onNotice,
}: UseDraftFlowParams): UseDraftFlowResult {
  const letterProfile: LetterProfile = useMemo(
    () => ({
      parentFirstName: family?.parent_first_name,
      parentLastName: family?.parent_last_name,
      email: family?.email,
      phone: family?.phone,
      childFirstName: primaryChild?.first_name,
      childGrade: primaryChild?.grade,
      schoolName: primaryChild?.school_name,
      schoolDistrict: family?.school_district,
      regionalCenter: family?.regional_center,
      insurance: family?.insurance_carrier,
    }),
    [family, primaryChild]
  );

  const [draft, setDraft] = useState<DraftState | null>(null);
  const [readingReply, setReadingReply] = useState(false);
  // Bumped on every open (and on cancel) so a slow/timed-out analysis that
  // resolves late can't pop a stale sheet after the parent moved on.
  const draftFlowToken = useRef(0);

  /**
   * Open the question sheet. For a reply (9e), let the AI READ the reply first
   * and show its reading in the sheet, so the parent answers "what did they
   * say?" from what the reply actually said. The AI does NOT pre-pick the
   * answer — classifying a denial into a legal-routing chip from the model's
   * localized prose isn't reliable (it would fail silently for es/vi and
   * misfire in English), and a wrong "they said no" routes to a formal notice.
   * No consent / a failed or slow read just opens the manual sheet.
   */
  const openDraftFlow = async (item: TriageItem) => {
    const token = ++draftFlowToken.current;
    const reqId = item.action.params?.requestId;
    const requestType: RequestType | null =
      (reqId && familyRequests.find((r) => r.id === reqId)?.request_type) || null;
    const replyId = item.action.params?.replyId;
    const reply =
      item.cls === 'reply' && replyId ? communications.find((c) => c.id === replyId) : null;

    if (reply?.body && family?.ai_consent_at) {
      setReadingReply(true);
      try {
        // Bounded: a stalled network must never trap the parent behind the
        // reading overlay — after 8s we just open the manual sheet.
        const timeout = new Promise<{ analysis: null; error?: string }>((resolve) =>
          setTimeout(() => resolve({ analysis: null, error: 'timeout' }), 8000)
        );
        const { analysis, error } = await Promise.race([
          analyzeEmail(reply.body, locale),
          timeout,
        ]);
        if (token !== draftFlowToken.current) return; // cancelled or superseded
        if (error && error.toLowerCase().includes('limit')) {
          onNotice(error); // surface the daily-AI-cap message
        }
        if (analysis) {
          setDraft({ item, requestType, aiSummary: analysis.summary });
          return;
        }
      } catch {
        /* fall through to the manual sheet */
      } finally {
        setReadingReply(false);
      }
      if (token !== draftFlowToken.current) return;
    }
    setDraft({ item, requestType });
  };

  const cancelReadingReply = () => {
    draftFlowToken.current++;
    setReadingReply(false);
  };

  const onDraftComplete = (answers: Record<string, string>) => {
    const d = draft;
    setDraft(null);
    if (!d) return;
    const h = draftHandoff(d.item, answers, {
      requestType: d.requestType,
      profile: letterProfile,
      locale,
    });
    navigate('Letters', {
      template: h.template,
      question: h.question,
      guidance: h.guidance,
      tone: h.tone,
      requestId: h.requestId,
    });
  };

  return {
    draft,
    closeDraft: () => setDraft(null),
    readingReply,
    letterProfile,
    openDraftFlow,
    cancelReadingReply,
    onDraftComplete,
  };
}
