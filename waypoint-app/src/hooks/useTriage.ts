/**
 * The Home triage hook (Roadmap/Home-Rebuild-Plan.md phase 2) — assembles a
 * `TriageInput` from the data Home already loads, runs the published ladder,
 * and owns the two pieces of state the card needs: what was set aside, and
 * what was actually finished today.
 *
 * The screen stays dumb: everything decidable lives in `lib/homeTriage.ts`
 * and `lib/homeCard.ts`, both pure and tested.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { autoSyncReplies, gmailStatus } from '@/lib/gmail';
import { localDay, triageHome, deferUntil } from '@/lib/homeTriage';
import type {
  TriageInput,
  TriageItem,
  TriageResult,
  TriageAppointment,
  TriageDraft,
} from '@/lib/homeTriage';
import { resolveCompleted } from '@/lib/homeCard';
import { useDeferrals } from '@/hooks/useDeferrals';
import type { FamilyRequest } from '@/hooks/useRequests';
import type { Communication } from '@/hooks/useCommunications';
import type { Appointment, RcStatus, IepStatus, BenefitStatus } from '@/types/database';
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
  appointments: Appointment[];
  calendarSynced?: boolean;
  /** Called when a Gmail sync brought new replies in, so the log refetches. */
  onRepliesSynced?: () => void;
}

export interface UseTriage {
  result: TriageResult;
  /** Items finished today — the ladder sheet marks their rungs done. */
  completedIds: string[];
  /** False when set-aside items live only on this device (migration 048 pending). */
  shared: boolean;
  /** Set the leading item aside; the next one takes its place immediately. */
  defer: (item: TriageItem) => Promise<void>;
  /** Bring a set-aside item back now. */
  undo: (itemId: string) => Promise<void>;
  /** Record that the family acted on an item, for the "done" calm state. */
  markActed: (itemId: string) => Promise<void>;
}

export function useTriage(args: UseTriageArgs): UseTriage {
  const {
    familyId,
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
    appointments,
    calendarSynced,
    onRepliesSynced,
  } = args;

  const { deferrals, shared, defer: persistDefer, undo: persistUndo } = useDeferrals(familyId);
  const [acted, setActed] = useState<string[]>([]);
  // Mirrors `acted` so a tap can read the current list without waiting for a
  // render, and so the storage write stays out of the state updater.
  const actedRef = useRef<string[]>([]);
  const [gmail, setGmail] = useState<TriageInput['gmail']>({ connected: false });
  // `now` is captured once per mount so a render never reshuffles the ladder
  // underneath a parent mid-tap.
  const [now] = useState(() => new Date());
  const today = useMemo(() => localDay(now), [now]);
  const syncedRef = useRef(false);

  useEffect(() => {
    void readActed(today).then((ids) => {
      actedRef.current = ids;
      setActed(ids);
    });
  }, [today]);

  // Gmail provenance: what was checked, and when. An unchecked inbox is said
  // out loud rather than quietly implied (the sensor line's whole point).
  useEffect(() => {
    if (syncedRef.current) return;
    syncedRef.current = true;
    let cancelled = false;
    (async () => {
      const status = await gmailStatus();
      const stored = await AsyncStorage.getItem(GMAIL_CHECKED_KEY).catch(() => null);
      if (cancelled) return;
      setGmail({ connected: status.gmail, lastCheckedAt: stored });
      if (!status.gmail) return;
      const sync = await autoSyncReplies();
      if (cancelled) return;
      if (sync.ran) {
        const stamp = new Date().toISOString();
        AsyncStorage.setItem(GMAIL_CHECKED_KEY, stamp).catch(() => {});
        setGmail({ connected: true, lastCheckedAt: stamp });
        if (sync.newReplies > 0) onRepliesSynced?.();
      }
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

  const input: TriageInput = useMemo(
    () => ({
      locale,
      now,
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
      appointments: triageAppointments,
      drafts,
      deferrals,
      gmail,
      calendarSynced,
      // Nothing tracked yet at all — not merely a quiet day.
      firstRun:
        requests.length === 0 &&
        communications.length === 0 &&
        triageAppointments.length === 0,
    }),
    [
      locale, now, childName, ageYears, rcStatus, iepStatus, hasDiagnosis,
      mediCalStatus, ihssStatus, ssiStatus, sdpStep, mediCalRequested,
      requests, communications, triageAppointments, drafts, deferrals, gmail, calendarSynced,
    ]
  );

  const { result, completedIds } = useMemo(() => {
    // Two passes on purpose: an item only counts as finished when it stopped
    // being live, so the first pass has to run without any completions.
    const dry = triageHome(input);
    const completed = resolveCompleted(
      acted,
      dry.queue.map((i) => i.id),
      dry.later.map((l) => l.id)
    );
    const ids = Object.keys(completed);
    return {
      result: ids.length ? triageHome({ ...input, completed }) : dry,
      completedIds: ids,
    };
  }, [input, acted]);

  const defer = useCallback(
    async (item: TriageItem) => {
      await persistDefer(item.id, deferUntil(item, now), item.title);
    },
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
