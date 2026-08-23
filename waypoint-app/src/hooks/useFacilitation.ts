/**
 * Facilitation workspace data hooks (PRD W-C) — the staff side of the
 * house. All reads ride the additive RLS staff policies (036/039): a
 * facilitator sees exactly the consented caseload, and revocation empties
 * these queries immediately.
 *
 * Failure rule (C6): honest errors, never fake offline success — every
 * mutation returns null/false on failure and surfaces the message.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  Family,
  SdpCase,
  ServiceEvent,
  ServiceActivityType,
  SpendingPlanLine,
  TransitionExtension,
  FamilyBaseline,
  StaffMember,
} from '@/types/database';
import { deadlineFor } from '@/lib/requestClocks';
import type { RequestType } from '@/lib/requestClocks';
import { transitionHoursStatus, canLogTransitionMinutes } from '@/lib/transitionHours';
import { rankCaseload } from '@/lib/caseloadRanking';
import type { RankedCase } from '@/lib/caseloadRanking';

// ─── useStaffSelf ────────────────────────────────────────────────────────────

export interface StaffSelf {
  staff: Pick<StaffMember, 'id' | 'organization_id' | 'role' | 'full_name'> | null;
  orgName: string;
}

export function useStaffSelf() {
  const [self, setSelf] = useState<StaffSelf>({ staff: null, orgName: 'Waypoint' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: staff } = await supabase
          .from('staff')
          .select('id, organization_id, role, full_name')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        if (cancelled || !staff) return;
        const { data: org } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', staff.organization_id)
          .maybeSingle();
        if (!cancelled) setSelf({ staff, orgName: org?.name ?? 'Waypoint' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...self, loading };
}

// ─── useCaseload ─────────────────────────────────────────────────────────────

export interface CaseloadRow extends RankedCase {
  familyId: string;
  regionalCenter: string | null;
  /** null when the family has no case yet — "start case" affordance. */
  hasCase: boolean;
}

interface UseCaseloadReturn {
  rows: CaseloadRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function familyDisplayName(f: Pick<Family, 'parent_first_name' | 'parent_last_name'>): string {
  return [f.parent_first_name, f.parent_last_name].filter(Boolean).join(' ') || 'Family';
}

export function useCaseload(): UseCaseloadReturn {
  const [rows, setRows] = useState<CaseloadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setError(null);
      const [famRes, caseRes, eventRes, reqRes] = await Promise.all([
        supabase
          .from('families')
          .select('id, parent_first_name, parent_last_name, regional_center'),
        supabase
          .from('sdp_cases')
          .select('id, family_id, stage, last_contact_on, closed_on')
          .is('closed_on', null),
        supabase
          .from('service_events')
          .select('case_id, activity_type, minutes, occurred_on')
          .eq('activity_type', 'transition_099'),
        supabase
          .from('family_requests')
          .select('family_id, request_type, requested_on, status')
          .in('status', ['requested', 'in_progress']),
      ]);
      const firstError = famRes.error || caseRes.error || eventRes.error || reqRes.error;
      if (firstError) {
        setError(firstError.message);
        return;
      }

      const families = famRes.data ?? [];
      const cases = caseRes.data ?? [];
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const msPerDay = 24 * 60 * 60 * 1000;

      const pctByCase = new Map<string, number>();
      for (const c of cases) {
        const events = (eventRes.data ?? []).filter((e) => e.case_id === c.id);
        pctByCase.set(
          c.id,
          transitionHoursStatus(
            events.map((e) => ({
              activity_type: e.activity_type as ServiceActivityType,
              minutes: e.minutes,
              occurred_on: e.occurred_on,
            })),
            [],
            now
          ).pctUsed
        );
      }

      const minDeadlineByFamily = new Map<string, number>();
      for (const r of reqRes.data ?? []) {
        const d = deadlineFor(r.request_type as RequestType, r.requested_on, now);
        if (!d) continue;
        const cur = minDeadlineByFamily.get(r.family_id);
        if (cur === undefined || d.daysRemaining < cur)
          minDeadlineByFamily.set(r.family_id, d.daysRemaining);
      }

      const caseByFamily = new Map(cases.map((c) => [c.family_id, c]));
      const signals = families.map((f) => {
        const c = caseByFamily.get(f.id);
        const lastContact = c?.last_contact_on
          ? Math.floor((today.getTime() - new Date(`${c.last_contact_on}T00:00:00`).getTime()) / msPerDay)
          : null;
        return {
          caseId: c?.id ?? `family:${f.id}`,
          familyName: familyDisplayName(f),
          stage: (c?.stage ?? 'intake') as SdpCase['stage'],
          nextDeadlineDays: minDeadlineByFamily.get(f.id) ?? null,
          pct099Used: c ? (pctByCase.get(c.id) ?? 0) : 0,
          daysSinceContact: lastContact,
        };
      });

      const ranked = rankCaseload(signals);
      const familyByName = new Map(families.map((f) => [f.id, f]));
      setRows(
        ranked.map((r) => {
          const familyId = r.caseId.startsWith('family:')
            ? r.caseId.slice('family:'.length)
            : (cases.find((c) => c.id === r.caseId)?.family_id ?? '');
          const fam = familyByName.get(familyId);
          return {
            ...r,
            familyId,
            regionalCenter: fam?.regional_center ?? null,
            hasCase: !r.caseId.startsWith('family:'),
          };
        })
      );
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load caseload');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { rows, loading, error, refetch };
}

// ─── useSdpCase ──────────────────────────────────────────────────────────────

interface UseSdpCaseReturn {
  sdpCase: SdpCase | null;
  family: Family | null;
  events: ServiceEvent[];
  extensions: TransitionExtension[];
  planLines: SpendingPlanLine[];
  baselines: FamilyBaseline[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createCase: (familyId: string) => Promise<SdpCase | null>;
  updateCase: (patch: Partial<SdpCase>) => Promise<boolean>;
  /** Logs time; enforces the 099 hard stop BEFORE writing (C4). */
  logTime: (input: {
    activityType: ServiceActivityType;
    minutes: number;
    occurredOn: string;
    notes?: string;
  }) => Promise<{ ok: boolean; blockedReason?: string }>;
  addPlanLine: (line: {
    category: string;
    providerName: string;
    serviceCode?: string;
    annualAmountCents: number;
  }) => Promise<boolean>;
  removePlanLine: (lineId: string) => Promise<boolean>;
  requestExtension: (additionalHours: number, notes?: string) => Promise<boolean>;
  saveBaseline: (b: {
    kind: FamilyBaseline['kind'];
    servicesInPlace: string;
    unmetNeeds: string;
    coordinationHoursPerWeek: number | null;
    caregiverStrain: number | null;
  }) => Promise<boolean>;
}

/** Pass either an existing caseId, or a familyId to view/start a case. */
export function useSdpCase(params: { caseId?: string; familyId?: string }): UseSdpCaseReturn {
  const { caseId, familyId } = params;
  const [sdpCase, setSdpCase] = useState<SdpCase | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [events, setEvents] = useState<ServiceEvent[]>([]);
  const [extensions, setExtensions] = useState<TransitionExtension[]>([]);
  const [planLines, setPlanLines] = useState<SpendingPlanLine[]>([]);
  const [baselines, setBaselines] = useState<FamilyBaseline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setError(null);
      let c: SdpCase | null = null;
      if (caseId && !caseId.startsWith('family:')) {
        const { data, error: e } = await supabase
          .from('sdp_cases').select('*').eq('id', caseId).maybeSingle();
        if (e) throw e;
        c = data;
      } else if (familyId) {
        const { data, error: e } = await supabase
          .from('sdp_cases').select('*').eq('family_id', familyId)
          .is('closed_on', null).maybeSingle();
        if (e) throw e;
        c = data;
      }
      setSdpCase(c);

      const famId = c?.family_id ?? familyId;
      if (famId) {
        const { data: fam } = await supabase
          .from('families').select('*').eq('id', famId).maybeSingle();
        setFamily(fam);
      }

      if (c) {
        const [ev, ext, lines, base] = await Promise.all([
          supabase.from('service_events').select('*')
            .eq('case_id', c.id).order('occurred_on', { ascending: false }),
          supabase.from('transition_extensions').select('*').eq('case_id', c.id),
          supabase.from('spending_plan_lines').select('*')
            .eq('case_id', c.id).order('created_at'),
          supabase.from('family_baselines').select('*').eq('case_id', c.id),
        ]);
        setEvents(ev.data ?? []);
        setExtensions(ext.data ?? []);
        setPlanLines(lines.data ?? []);
        setBaselines(base.data ?? []);
      } else {
        setEvents([]); setExtensions([]); setPlanLines([]); setBaselines([]);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load case');
    } finally {
      setLoading(false);
    }
  }, [caseId, familyId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const withStaff = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data: staff, error: e } = await supabase
      .from('staff')
      .select('id, organization_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    if (e) throw e;
    if (!staff) throw new Error('No staff record for this account');
    return staff;
  }, []);

  const createCase = useCallback(async (targetFamilyId: string): Promise<SdpCase | null> => {
    try {
      const staff = await withStaff();
      const { data, error: e } = await supabase
        .from('sdp_cases')
        .insert({
          organization_id: staff.organization_id,
          family_id: targetFamilyId,
          facilitator_staff_id: staff.id,
          stage: 'intake',
        })
        .select()
        .single();
      if (e) throw e;
      setSdpCase(data);
      return data;
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to create case');
      return null;
    }
  }, [withStaff]);

  const updateCase = useCallback(async (patch: Partial<SdpCase>): Promise<boolean> => {
    if (!sdpCase) return false;
    try {
      const { data, error: e } = await supabase
        .from('sdp_cases').update(patch).eq('id', sdpCase.id).select().single();
      if (e) throw e;
      setSdpCase(data);
      return true;
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to update case');
      return false;
    }
  }, [sdpCase]);

  const logTime: UseSdpCaseReturn['logTime'] = useCallback(async (input) => {
    if (!sdpCase) return { ok: false, blockedReason: 'No case loaded' };
    if (input.activityType === 'transition_099') {
      const check = canLogTransitionMinutes(input.minutes, events, extensions);
      if (!check.allowed) return { ok: false, blockedReason: check.reason ?? undefined };
    }
    try {
      const staff = await withStaff();
      const { data, error: e } = await supabase
        .from('service_events')
        .insert({
          organization_id: staff.organization_id,
          staff_id: staff.id,
          family_id: sdpCase.family_id,
          case_id: sdpCase.id,
          activity_type: input.activityType,
          minutes: input.minutes,
          occurred_on: input.occurredOn,
          notes: input.notes ?? null,
        })
        .select()
        .single();
      if (e) throw e;
      setEvents((prev) => [data, ...prev]);
      await supabase
        .from('sdp_cases')
        .update({ last_contact_on: input.occurredOn })
        .eq('id', sdpCase.id);
      return { ok: true };
    } catch (err: unknown) {
      const e = err as { message?: string };
      return { ok: false, blockedReason: e.message || 'Failed to log time' };
    }
  }, [sdpCase, events, extensions, withStaff]);

  const addPlanLine: UseSdpCaseReturn['addPlanLine'] = useCallback(async (line) => {
    if (!sdpCase) return false;
    try {
      const { data, error: e } = await supabase
        .from('spending_plan_lines')
        .insert({
          case_id: sdpCase.id,
          category: line.category,
          provider_name: line.providerName,
          service_code: line.serviceCode ?? null,
          annual_amount_cents: line.annualAmountCents,
        })
        .select()
        .single();
      if (e) throw e;
      setPlanLines((prev) => [...prev, data]);
      return true;
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to add line');
      return false;
    }
  }, [sdpCase]);

  const removePlanLine = useCallback(async (lineId: string): Promise<boolean> => {
    try {
      const { error: e } = await supabase.from('spending_plan_lines').delete().eq('id', lineId);
      if (e) throw e;
      setPlanLines((prev) => prev.filter((l) => l.id !== lineId));
      return true;
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to remove line');
      return false;
    }
  }, []);

  const requestExtension = useCallback(async (additionalHours: number, notes?: string) => {
    if (!sdpCase) return false;
    try {
      const { data, error: e } = await supabase
        .from('transition_extensions')
        .insert({
          case_id: sdpCase.id,
          requested_on: new Date().toISOString().slice(0, 10),
          additional_hours: additionalHours,
          notes: notes ?? null,
        })
        .select()
        .single();
      if (e) throw e;
      setExtensions((prev) => [...prev, data]);
      return true;
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to request extension');
      return false;
    }
  }, [sdpCase]);

  const saveBaseline: UseSdpCaseReturn['saveBaseline'] = useCallback(async (b) => {
    if (!sdpCase) return false;
    try {
      const captured = new Date();
      const remeasure = new Date(captured);
      remeasure.setMonth(remeasure.getMonth() + (b.kind === 'baseline' ? 6 : b.kind === '6mo' ? 6 : 12));
      const { data, error: e } = await supabase
        .from('family_baselines')
        .upsert(
          {
            case_id: sdpCase.id,
            family_id: sdpCase.family_id,
            kind: b.kind,
            captured_on: captured.toISOString().slice(0, 10),
            services_in_place: b.servicesInPlace,
            unmet_needs: b.unmetNeeds,
            coordination_hours_per_week: b.coordinationHoursPerWeek,
            caregiver_strain: b.caregiverStrain,
            remeasure_due_on: b.kind === '12mo' ? null : remeasure.toISOString().slice(0, 10),
          },
          { onConflict: 'case_id,kind' }
        )
        .select()
        .single();
      if (e) throw e;
      setBaselines((prev) => [...prev.filter((x) => x.kind !== b.kind), data]);
      return true;
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to save baseline');
      return false;
    }
  }, [sdpCase]);

  return {
    sdpCase, family, events, extensions, planLines, baselines,
    loading, error, refetch,
    createCase, updateCase, logTime, addPlanLine, removePlanLine,
    requestExtension, saveBaseline,
  };
}
