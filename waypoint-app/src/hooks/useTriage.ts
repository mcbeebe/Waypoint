/**
 * The Home triage hook (Roadmap/Home-Rebuild-Plan.md phase 2) — assembles a
 * `TriageInput` from the data Home already loads, runs the published ladder,
 * and owns the state the card needs: what was set aside, and what was
 * actually finished today.
 *
 * The screen stays dumb: everything decidable lives in `lib/homeTriage.ts`
 * and `lib/homeCard.ts`, both pure and tested.
 *
 * Two things this hook is careful about, because both produced false calm:
 * - **Absence of data is not absence of obligations.** `loading` and
 *   `dataFailed` go into the ladder, which then refuses to call the day calm.
 * - **A check only counts if it happened.** The Gmail stamp is written on a
 *   typed 'checked' outcome, never merely because a sync was attempted.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { autoSyncReplies } from '@/lib/gmail';
import { localDay, triageHome, deferUntil } from '@/lib/homeTriage';
import type {
  TriageInput,
  TriageItem,
  TriageResult,
  TriageActionItem,
  TriageAppointment,
  TriageDeadline,
  TriageDraft,
  LaterItem,
} from '@/lib/homeTriage';
import { resolveCompleted } from '@/lib/homeCard';
import { useDeferrals } from '@/hooks/useDeferrals';
import type { FamilyRequest } from '@/hooks/useRequests';
import type { Communication } from '@/hooks/useCommunications';
import type {
  Action,
  Appointment,
  Deadline,
  RcStatus,
  IepStatus,
  BenefitStatus,
} from '@/types/database';
import { MEDI_CAL_DEEMING_REQUEST_TITLE } from '@/lib/resourceStack';
import type { FunnelLocale } from '@/lib/eligibility';

/** When Gmail was last actually checked — the sensor line's evidence. */
const GMAIL_CHECKED_KEY = 'waypoint.home.gmailCheckedAt';
/** Today's taps, so calm can say "done" without inventing it. */
const ACTED_KEY = 'waypoint.home.acted';

interface ActedRecord {
  day: string;
  ids: string[];
}

async function readActed(today: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(ACTED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ActedRecord;
    // Yesterday's work is not today's calm.
    return parsed?.day === today && Array.isArray(parsed.ids) ? parsed.ids : [];
  } catch {
    return [];
  }
}

export interface UseTriageArgs {
  familyId?: string;
  childId?: string | null;
  childName?: string | null;
  ageYears?: number | null;
  rcStatus?: RcStatus | null;
  iepStatus?: IepStatus | null;
  hasDiagnosis?: boolean;
  mediCalStatus?: BenefitStatus | null;
  ihssStatus?: BenefitStatus | null;
  ssiStatus?: BenefitStatus | null;
  sdpStep?: number | null;
  locale: FunnelLocale;
  requests: FamilyRequest[];
  communications: Communication[];
  deadlines: Deadline[];
  appointments: Appointment[];
  /** The family's plan actions — overdue/today ones reach the ladder (#34). */
  actions: Action[];
  /** True while any of the above is still being fetched. */
  loading?: boolean;
  /** True when a fetch failed — an empty list is then not evidence. */
  dataFailed?: boolean;
  /** Called when a Gmail sync brought new replies in, so the log refetches. */
  onRepliesSynced?: () => void;
}

export interface UseTriage {
  result: TriageResult;
  /** Items finished today — the ladder sheet marks their rungs done. */
  completedIds: string[];
  /** False when set-aside items live only on this device. */
  shared: boolean;
  /** Set the leading item aside. False when nothing could be persisted. */
  defer: (item: TriageItem) => Promise<boolean>;
  /** Bring a set-aside item back now. */
  undo: (itemId: string) => Promise<boolean>;
  /** Record that the family acted on an item, for the "done" calm state. */
  markActed: (itemId: string) => Promise<void>;
}

export function useTriage(args: UseTriageArgs): UseTriage {
  const {
    familyId,
    childId,
    childName,
    ageYears,
    rcStatus,
    iepStatus,
    hasDiagnosis,
    mediCalStatus,
    ihssStatus,
    ssiStatus,
    sdpStep,
    locale,
    requests,
    communications,
    deadlines,
    appointments,
    actions,
    loading,
    dataFailed,
    onRepliesSynced,
  } = args;

  const {
    deferrals,
    titles: deferralTitles,
    shared,
    loading: deferralsLoading,
    defer: persistDefer,
    undo: persistUndo,
    refetch: refetchDeferrals,
  } = useDeferrals(familyId);
  const [acted, setActed] = useState<string[]>([]);
  const actedRef = useRef<string[]>([]);
  const [gmail, setGmail] = useState<TriageInput['gmail']>({
    connected: false,
    checking: true,
  });
  /**
   * `now` is a state value, not a fresh `new Date()` per render, so the
   * ladder cannot reshuffle under a parent mid-tap — but it is re-derived
   * when the screen regains focus, because a phone left open overnight was
   * otherwise still working from yesterday's calendar date.
   */
  const [now, setNow] = useState(() => new Date());
  const today = useMemo(() => localDay(now), [now]);

  useFocusEffect(
    useCallback(() => {
      setNow((prev) => (localDay(prev) === localDay(new Date()) ? prev : new Date()));
      void refetchDeferrals();
    }, [refetchDeferrals])
  );

  useEffect(() => {
    void readActed(today).then((ids) => {
      actedRef.current = ids;
      setActed(ids);
    });
  }, [today]);

  // Gmail provenance: what was checked, and when. The outcome is typed
  // because a failed sync used to be stamped as a successful check.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await AsyncStorage.getItem(GMAIL_CHECKED_KEY).catch(() => null);
      const sync = await autoSyncReplies();
      if (cancelled) return;
      if (sync.outcome === 'checked') {
        const stamp = new Date().toISOString();
        AsyncStorage.setItem(GMAIL_CHECKED_KEY, stamp).catch(() => {});
        setGmail({ connected: true, lastCheckedAt: stamp });
        if (sync.newReplies > 0) onRepliesSynced?.();
        return;
      }
      if (sync.outcome === 'failed') {
        setGmail({ connected: true, lastCheckedAt: stored, failed: true });
        return;
      }
      if (sync.outcome === 'throttled') {
        // Another screen synced within the interval; the stored stamp is
        // still the truth about when the mailbox was last read.
        setGmail({ connected: true, lastCheckedAt: stored });
        return;
      }
      setGmail({ connected: false });
    })().catch(() => {
      if (!cancelled) setGmail({ connected: false, failed: true });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drafts: TriageDraft[] = useMemo(
    () =>
      communications
        .filter((c) => c.status === 'draft')
        .map((c) => ({
          id: c.id,
          templateKey: c.template_key,
          subject: c.subject,
          body: c.body,
          savedAt: c.created_at,
        })),
    [communications]
  );

  const triageAppointments: TriageAppointment[] = useMemo(
    () =>
      appointments.map((a) => ({
        id: a.id,
        title: a.title,
        startTime: a.start_time,
      })),
    [appointments]
  );

  const triageDeadlines: TriageDeadline[] = useMemo(
    () =>
      deadlines
        .filter((d) => d.status !== 'completed')
        .map((d) => ({
          id: d.id,
          title: d.title,
          dueOn: d.due_date.slice(0, 10),
          kind: d.deadline_type,
        })),
    [deadlines]
  );

  // Plan actions the ladder should weigh (task #34). The engine filters to
  // open + overdue/today itself; passing the whole set keeps firstRun honest.
  const triageActions: TriageActionItem[] = useMemo(
    () =>
      actions.map((a) => ({
        id: a.id,
        title: a.title,
        status: a.status,
        priority: a.priority,
        dueOn: a.due_date ? a.due_date.slice(0, 10) : null,
        category: a.category,
      })),
    [actions]
  );

  // A tracked deeming request reads as applied, so a sent letter is reflected
  // in the stack rather than the family being asked to send it twice.
  const mediCalRequested = useMemo(
    () =>
      requests.some(
        (r) =>
          r.title === MEDI_CAL_DEEMING_REQUEST_TITLE &&
          (r.status === 'requested' || r.status === 'in_progress' || r.status === 'granted')
      ),
    [requests]
  );

  const stillLoading = !!loading || deferralsLoading;

  const input: TriageInput = useMemo(
    () => ({
      locale,
      now,
      childId,
      childName,
      ageYears,
      rcStatus,
      iepStatus,
      hasDiagnosis,
      mediCalStatus,
      ihssStatus,
      ssiStatus,
      sdpStep,
      mediCalRequested,
      requests,
      communications,
      deadlines: triageDeadlines,
      actions: triageActions,
      appointments: triageAppointments,
      drafts,
      deferrals,
      gmail,
      loading: stillLoading,
      dataFailed,
      // Nothing tracked yet at all — and only claimable once the records
      // actually loaded, or a failed fetch reads as a brand-new family. An
      // existing plan action counts as history, so a family with actions is
      // never "first run" (and never gets the false-calm empty state).
      firstRun:
        !stillLoading &&
        !dataFailed &&
        requests.length === 0 &&
        communications.length === 0 &&
        triageDeadlines.length === 0 &&
        triageActions.length === 0 &&
        triageAppointments.length === 0,
    }),
    [
      locale, now, childId, childName, ageYears, rcStatus, iepStatus, hasDiagnosis,
      mediCalStatus, ihssStatus, ssiStatus, sdpStep, mediCalRequested,
      requests, communications, triageDeadlines, triageActions, triageAppointments, drafts,
      deferrals, gmail, stillLoading, dataFailed,
    ]
  );

  const { result, completedIds } = useMemo(() => {
    // Two passes on purpose: an item only counts as finished when it stopped
    // being live, so the first pass has to run without any completions. And
    // nothing counts as finished while the records are unread — an empty
    // list from a failed fetch is not a finished day.
    const dry = triageHome(input);
    const completed =
      stillLoading || dataFailed
        ? {}
        : resolveCompleted(
            acted,
            dry.queue.map((i) => i.id),
            dry.later.map((l) => l.id)
          );
    const ids = Object.keys(completed);
    const base = ids.length ? triageHome({ ...input, completed }) : dry;

    // Set-aside items whose underlying thing no longer generates a candidate
    // would otherwise vanish from Later — the silent-dismiss failure, one
    // step removed. The stored title carries them.
    const listed = new Set(base.later.map((l) => l.id));
    const orphans: LaterItem[] = Object.entries(deferrals)
      .filter(([id, returnsOn]) => !listed.has(id) && returnsOn > localDay(now))
      .filter(([id]) => deferralTitles[id])
      .map(([id, returnsOn]) => ({
        id,
        title: deferralTitles[id],
        returnsOn,
        returnLabel: '',
      }));

    return {
      result: orphans.length ? { ...base, later: [...base.later, ...orphans] } : base,
      completedIds: ids,
    };
  }, [input, acted, stillLoading, dataFailed, deferrals, deferralTitles, now]);

  const defer = useCallback(
    async (item: TriageItem) => persistDefer(item.id, deferUntil(item, now), item.title),
    [persistDefer, now]
  );

  const markActed = useCallback(
    async (itemId: string) => {
      if (actedRef.current.includes(itemId)) return;
      const next = [...actedRef.current, itemId];
      actedRef.current = next;
      setActed(next);
      await AsyncStorage.setItem(ACTED_KEY, JSON.stringify({ day: today, ids: next })).catch(
        () => {}
      );
    },
    [today]
  );

  return { result, completedIds, shared, defer, undo: persistUndo, markActed };
}
