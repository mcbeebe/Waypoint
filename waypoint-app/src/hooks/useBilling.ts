/**
 * Billing + owner-scorecard data hooks (PRD W-D: D2, D4). Supervisor/admin
 * surfaces: RLS returns nothing for facilitators, so these hooks degrade to
 * empty rather than erroring.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  Invoice,
  SdpCase,
  VendorPacket,
  ServiceEvent,
  Family,
  InvoiceStatus,
} from '@/types/database';
import type { DraftInvoice } from '@/lib/invoicing';

export interface BillableCase {
  sdpCase: SdpCase;
  familyName: string;
  uninvoiced099: ServiceEvent[];
  pcpInvoiced: boolean;
}

interface UseBillingReturn {
  invoices: Invoice[];
  cases: BillableCase[];
  rate099Cents: number | null;
  orgId: string | null;
  vendorStatus099: VendorPacket['status'] | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setRate099: (cents: number) => Promise<boolean>;
  createInvoice: (
    draft: DraftInvoice,
    meta: { payerName: string; familyId?: string; caseId?: string }
  ) => Promise<boolean>;
  advanceInvoice: (invoice: Invoice) => Promise<boolean>;
}

function familyDisplayName(f: Pick<Family, 'parent_first_name' | 'parent_last_name'> | undefined): string {
  return [f?.parent_first_name, f?.parent_last_name].filter(Boolean).join(' ') || 'Family';
}

const NEXT_STATUS: Partial<Record<InvoiceStatus, InvoiceStatus>> = {
  draft: 'submitted',
  submitted: 'paid',
};

export function useBilling(): UseBillingReturn {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [cases, setCases] = useState<BillableCase[]>([]);
  const [rate099Cents, setRate099Cents] = useState<number | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [vendorStatus099, setVendorStatus099] = useState<VendorPacket['status'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: staff } = await supabase
        .from('staff')
        .select('organization_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (!staff) return;
      setOrgId(staff.organization_id);

      const [orgRes, invRes, caseRes, famRes, evRes, lineRes, packetRes] = await Promise.all([
        supabase.from('organizations').select('rate_099_cents').eq('id', staff.organization_id).maybeSingle(),
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('sdp_cases').select('*').is('closed_on', null),
        supabase.from('families').select('id, parent_first_name, parent_last_name'),
        supabase
          .from('service_events')
          .select('*')
          .eq('activity_type', 'transition_099')
          .eq('billable', true),
        supabase.from('invoice_lines').select('service_event_id'),
        supabase
          .from('vendor_packets')
          .select('status')
          .eq('packet_type', '099')
          .neq('status', 'rejected')
          .limit(1)
          .maybeSingle(),
      ]);
      const firstError =
        orgRes.error || invRes.error || caseRes.error || famRes.error || evRes.error || lineRes.error;
      if (firstError) {
        setError(firstError.message);
        return;
      }

      setRate099Cents(
        (orgRes.data as { rate_099_cents?: number | null } | null)?.rate_099_cents ?? null
      );
      setInvoices(invRes.data ?? []);
      setVendorStatus099(packetRes.data?.status ?? null);

      const invoicedEventIds = new Set(
        (lineRes.data ?? []).map((l) => l.service_event_id).filter(Boolean)
      );
      const famById = new Map((famRes.data ?? []).map((f) => [f.id, f]));
      const pcpInvoicedCases = new Set(
        (invRes.data ?? [])
          .filter((i) => i.payer_type === 'regional_center' && i.status !== 'void' && i.case_id)
          .map((i) => i.case_id as string)
      );
      setCases(
        (caseRes.data ?? []).map((c) => ({
          sdpCase: c,
          familyName: familyDisplayName(famById.get(c.family_id)),
          uninvoiced099: (evRes.data ?? []).filter(
            (e) => e.case_id === c.id && !invoicedEventIds.has(e.id)
          ),
          // Coarse guard: any non-void RC invoice on the case is assumed to
          // carry the one-time 024 line, so drafting won't double-bill it.
          pcpInvoiced: pcpInvoicedCases.has(c.id),
        }))
      );
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load billing');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const setRate099 = useCallback(async (cents: number): Promise<boolean> => {
    if (!orgId) return false;
    const { error: e } = await supabase
      .from('organizations')
      .update({ rate_099_cents: cents })
      .eq('id', orgId);
    if (e) {
      setError(e.message);
      return false;
    }
    setRate099Cents(cents);
    return true;
  }, [orgId]);

  const createInvoice: UseBillingReturn['createInvoice'] = useCallback(async (draft, meta) => {
    if (!orgId || draft.lines.length === 0) return false;
    try {
      const number = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()}`;
      const { data: invoice, error: invErr } = await supabase
        .from('invoices')
        .insert({
          organization_id: orgId,
          invoice_number: number,
          payer_type: draft.payerType,
          payer_name: meta.payerName,
          family_id: meta.familyId ?? null,
          case_id: meta.caseId ?? null,
          status: 'draft',
          issued_on: new Date().toISOString().slice(0, 10),
          total_cents: draft.totalCents,
        })
        .select()
        .single();
      if (invErr) throw invErr;
      const { error: lineErr } = await supabase.from('invoice_lines').insert(
        draft.lines.map((l) => ({
          invoice_id: invoice.id,
          service_event_id: l.serviceEventId,
          description: l.description,
          service_code: l.serviceCode,
          quantity: l.quantity,
          unit_price_cents: l.unitPriceCents,
          amount_cents: l.amountCents,
        }))
      );
      if (lineErr) throw lineErr;
      await refetch();
      return true;
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to create invoice');
      return false;
    }
  }, [orgId, refetch]);

  const advanceInvoice = useCallback(async (invoice: Invoice): Promise<boolean> => {
    const next = NEXT_STATUS[invoice.status];
    if (!next) return false;
    const patch: Partial<Invoice> = { status: next };
    if (next === 'paid') patch.paid_on = new Date().toISOString().slice(0, 10);
    const { error: e } = await supabase.from('invoices').update(patch).eq('id', invoice.id);
    if (e) {
      setError(e.message);
      return false;
    }
    setInvoices((prev) =>
      prev.map((i) => (i.id === invoice.id ? { ...i, ...patch } : i))
    );
    return true;
  }, []);

  return {
    invoices, cases, rate099Cents, orgId, vendorStatus099,
    loading, error, refetch, setRate099, createInvoice, advanceInvoice,
  };
}

// ─── Owner scorecard (D4) ────────────────────────────────────────────────────

export interface OwnerMetrics {
  /** Sum of agreed annual prices across open cases, cents. */
  pipelineValueCents: number;
  invoicedCents: number;
  paidCents: number;
  /** Average logged hours per family with any logged time. */
  hoursPerFamily: number;
  familiesWithTime: number;
  /** Distinct families per funnel step. */
  funnel: Record<string, number>;
  /** booking_completed ÷ registered (0–1), null when no registrations. */
  conversion: number | null;
}

export function useOwnerMetrics() {
  const [metrics, setMetrics] = useState<OwnerMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [caseRes, invRes, evRes, funnelRes] = await Promise.all([
          supabase.from('sdp_cases').select('agreed_annual_price_cents').is('closed_on', null),
          supabase.from('invoices').select('status, total_cents'),
          supabase.from('service_events').select('family_id, minutes'),
          supabase
            .from('analytics_events')
            .select('family_id, event_data')
            .eq('event_type', 'funnel_step'),
        ]);
        if (cancelled) return;

        const pipelineValueCents = (caseRes.data ?? []).reduce(
          (s, c) => s + (c.agreed_annual_price_cents ?? 0),
          0
        );
        const invoicedCents = (invRes.data ?? [])
          .filter((i) => i.status === 'submitted' || i.status === 'paid')
          .reduce((s, i) => s + i.total_cents, 0);
        const paidCents = (invRes.data ?? [])
          .filter((i) => i.status === 'paid')
          .reduce((s, i) => s + i.total_cents, 0);

        const minutesByFamily = new Map<string, number>();
        for (const e of evRes.data ?? []) {
          minutesByFamily.set(e.family_id, (minutesByFamily.get(e.family_id) ?? 0) + e.minutes);
        }
        const familiesWithTime = minutesByFamily.size;
        const hoursPerFamily = familiesWithTime
          ? Math.round(
              ([...minutesByFamily.values()].reduce((a, b) => a + b, 0) / familiesWithTime / 60) * 10
            ) / 10
          : 0;

        const stepFamilies = new Map<string, Set<string>>();
        for (const row of funnelRes.data ?? []) {
          const step = (row.event_data as { step?: string } | null)?.step;
          if (!step) continue;
          if (!stepFamilies.has(step)) stepFamilies.set(step, new Set());
          stepFamilies.get(step)!.add(row.family_id);
        }
        const funnel: Record<string, number> = {};
        for (const [step, fams] of stepFamilies) funnel[step] = fams.size;
        const registered = funnel.registered ?? 0;
        const booked = funnel.booking_completed ?? 0;
        const conversion = registered > 0 ? booked / registered : null;

        setMetrics({
          pipelineValueCents, invoicedCents, paidCents,
          hoursPerFamily, familiesWithTime, funnel, conversion,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { metrics, loading };
}

// ─── W3 evidence readout data (one-shot fetch) ──────────────────────────────

import type { EvidenceInputs } from '@/lib/evidenceReport';

/**
 * Raw rows for the exportable evidence readout (ROADMAP W3). Supervisor/
 * admin RLS applies — a facilitator gets partial rows and the readout says
 * so via its n-counts rather than erroring.
 */
export async function fetchEvidenceInputs(): Promise<EvidenceInputs> {
  const [funnelRes, evRes, caseRes, baseRes, invRes] = await Promise.all([
    supabase
      .from('analytics_events')
      .select('family_id, event_data')
      .eq('event_type', 'funnel_step'),
    supabase.from('service_events').select('family_id, case_id, minutes'),
    supabase.from('sdp_cases').select('id, stage, agreed_annual_price_cents').is('closed_on', null),
    supabase
      .from('family_baselines')
      .select('case_id, kind, coordination_hours_per_week, caregiver_strain'),
    supabase.from('invoices').select('status, payer_type, total_cents'),
  ]);
  return {
    funnelEvents: (funnelRes.data ?? []).map((r) => {
      const d = (r.event_data ?? {}) as { step?: string; source?: string | null; language?: string | null };
      return {
        family_id: r.family_id,
        step: d.step ?? '',
        source: d.source ?? null,
        language: d.language ?? null,
      };
    }),
    serviceEvents: evRes.data ?? [],
    cases: caseRes.data ?? [],
    baselines: baseRes.data ?? [],
    invoices: invRes.data ?? [],
  };
}
