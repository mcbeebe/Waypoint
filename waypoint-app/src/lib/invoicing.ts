/**
 * Invoice assembly (PRD W-D: D2) — one model, two payers. Pure logic that
 * turns logged service events into invoice lines so billing can never
 * disagree with time capture:
 *
 *   regional_center  code 024 (PCP, flat up to $1,000 on completion) and
 *                    code 099 (transition hours at the org's hourly rate) —
 *                    099 billing is GATED on a vendored packet (D1).
 *   fms              ongoing facilitation at the family's agreed annual
 *                    price — the family approved this line in their budget.
 *
 * Aged receivables (30/60/90) live here too so the money screen and the
 * owner dashboard bucket identically.
 */
import { SDP_PCP_CAP } from '@/data/benefitFigures';
import type { Invoice, InvoicePayerType, ServiceEvent, VendorPacketStatus } from '@/types/database';
import { formatCents } from '@/lib/spendingPlan';

export interface DraftInvoiceLine {
  serviceEventId: string | null;
  description: string;
  serviceCode: '024' | '099' | 'FAC';
  quantity: number;
  unitPriceCents: number;
  amountCents: number;
}

export interface DraftInvoice {
  payerType: InvoicePayerType;
  lines: DraftInvoiceLine[];
  totalCents: number;
  /** Events that could not be billed, with the reason — never dropped silently. */
  skipped: Array<{ serviceEventId: string; reason: string }>;
}

type BillableEvent = Pick<
  ServiceEvent,
  'id' | 'activity_type' | 'minutes' | 'occurred_on' | 'billable'
>;

export interface RcInvoiceInput {
  events: BillableEvent[];
  /** Hourly 099 rate, cents. */
  hourlyRate099Cents: number;
  /** Bill the flat 024 PCP fee (only on PCP completion, once). */
  includePcpFee: boolean;
  /** Actual PCP cost in cents; capped at SDP_PCP_CAP. */
  pcpCostCents?: number;
  vendorStatus099: VendorPacketStatus | null;
}

/** Regional Center invoice: 024 + 099 paths, vendorization-gated. */
export function draftRcInvoice(input: RcInvoiceInput): DraftInvoice {
  const lines: DraftInvoiceLine[] = [];
  const skipped: DraftInvoice['skipped'] = [];

  if (input.includePcpFee) {
    const capCents = SDP_PCP_CAP * 100;
    const amount = Math.min(input.pcpCostCents ?? capCents, capCents);
    lines.push({
      serviceEventId: null,
      description: `Person-centered plan (code 024, capped at ${formatCents(capCents)})`,
      serviceCode: '024',
      quantity: 1,
      unitPriceCents: amount,
      amountCents: amount,
    });
  }

  const vendored = input.vendorStatus099 === 'vendored';
  for (const e of input.events) {
    if (e.activity_type !== 'transition_099') continue;
    if (!e.billable) {
      skipped.push({ serviceEventId: e.id, reason: 'Marked non-billable' });
      continue;
    }
    if (!vendored) {
      skipped.push({
        serviceEventId: e.id,
        reason: '099 vendorization not complete — billing unlocks when the packet is vendored',
      });
      continue;
    }
    const hours = e.minutes / 60;
    const amount = Math.round(hours * input.hourlyRate099Cents);
    lines.push({
      serviceEventId: e.id,
      description: `Transition support ${e.occurred_on} (code 099, ${hours.toFixed(2)}h)`,
      serviceCode: '099',
      quantity: Math.round(hours * 100) / 100,
      unitPriceCents: input.hourlyRate099Cents,
      amountCents: amount,
    });
  }

  return {
    payerType: 'regional_center',
    lines,
    totalCents: lines.reduce((s, l) => s + l.amountCents, 0),
    skipped,
  };
}

/**
 * FMS invoice: the annual facilitation line at the family's agreed price.
 * Anniversary re-invoicing (D3) calls this with the new period.
 */
export function draftFmsInvoice(
  agreedAnnualPriceCents: number | null,
  periodLabel: string
): DraftInvoice {
  if (!agreedAnnualPriceCents || agreedAnnualPriceCents <= 0) {
    return {
      payerType: 'fms',
      lines: [],
      totalCents: 0,
      skipped: [
        { serviceEventId: '', reason: 'No agreed facilitation price on the case yet — agree it with the family first' },
      ],
    };
  }
  return {
    payerType: 'fms',
    lines: [
      {
        serviceEventId: null,
        description: `Independent facilitation, ${periodLabel} (family-approved budget line)`,
        serviceCode: 'FAC',
        quantity: 1,
        unitPriceCents: agreedAnnualPriceCents,
        amountCents: agreedAnnualPriceCents,
      },
    ],
    totalCents: agreedAnnualPriceCents,
    skipped: [],
  };
}

// ── Aged receivables ────────────────────────────────────────────────────────

export interface AgedBuckets {
  current: number; // 0–30 days outstanding, cents
  d31to60: number;
  d61to90: number;
  over90: number;
  totalOutstanding: number;
}

type OutstandingInvoice = Pick<Invoice, 'status' | 'issued_on' | 'total_cents'>;

export function agedReceivables(invoices: OutstandingInvoice[], now = new Date()): AgedBuckets {
  const buckets: AgedBuckets = { current: 0, d31to60: 0, d61to90: 0, over90: 0, totalOutstanding: 0 };
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const msPerDay = 24 * 60 * 60 * 1000;
  for (const inv of invoices) {
    if (inv.status !== 'submitted' || !inv.issued_on) continue;
    const age = Math.floor((today - new Date(`${inv.issued_on}T00:00:00`).getTime()) / msPerDay);
    if (age <= 30) buckets.current += inv.total_cents;
    else if (age <= 60) buckets.d31to60 += inv.total_cents;
    else if (age <= 90) buckets.d61to90 += inv.total_cents;
    else buckets.over90 += inv.total_cents;
    buckets.totalOutstanding += inv.total_cents;
  }
  return buckets;
}
