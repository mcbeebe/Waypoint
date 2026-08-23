/**
 * W3 evidence readout (PRD phase W3) — the data section of the go/no-go
 * memo, generated instead of hand-assembled. Pure: takes raw rows, returns
 * a structured report plus a self-contained HTML rendering. Every number
 * carries its n; where a gate exists (3% funnel, ≤30h/family model) the
 * verdict is computed, not editorialized.
 */
import { FUNNEL_GATE, HOURS_PER_FAMILY_MODEL } from '@/lib/evidenceTargets';
import { formatCents } from '@/lib/spendingPlan';

export interface FunnelEventRow {
  family_id: string;
  step: string;
  source: string | null;
  language: string | null;
}
export interface ServiceEventRow {
  family_id: string;
  case_id: string | null;
  minutes: number;
}
export interface CaseRow {
  id: string;
  stage: string;
  agreed_annual_price_cents: number | null;
}
export interface BaselineRow {
  case_id: string;
  kind: 'baseline' | '6mo' | '12mo';
  coordination_hours_per_week: number | null;
  caregiver_strain: number | null;
}
export interface InvoiceRow {
  status: string;
  payer_type: string;
  total_cents: number;
}

export interface EvidenceInputs {
  funnelEvents: FunnelEventRow[];
  serviceEvents: ServiceEventRow[];
  cases: CaseRow[];
  baselines: BaselineRow[];
  invoices: InvoiceRow[];
}

export interface FunnelCut {
  label: string;
  registered: number;
  booked: number;
  /** booked ÷ registered; null when no registrations. */
  conversion: number | null;
}

export interface BaselineDelta {
  n: number;
  avgCoordinationBefore: number | null;
  avgCoordinationAfter: number | null;
  avgStrainBefore: number | null;
  avgStrainAfter: number | null;
}

export interface EvidenceReport {
  generatedOn: string;
  // The four kill-criteria numbers
  pipelineValueCents: number;
  invoicedCents: number;
  paidCents: number;
  paidInvoiceCount: number;
  hoursPerFamily: number | null;
  familiesWithTime: number;
  conversion: number | null;
  registered: number;
  booked: number;
  // Verdicts (null = not enough data to call)
  funnelVerdict: 'pass' | 'fail' | null;
  hoursVerdict: 'pass' | 'fail' | null;
  paidInvoiceVerdict: 'pass' | 'fail';
  // Cuts
  funnelBySource: FunnelCut[];
  funnelByLanguage: FunnelCut[];
  stepCounts: Array<{ step: string; families: number }>;
  hoursByStage: Array<{ stage: string; cases: number; avgHours: number }>;
  outcomes: BaselineDelta;
}

const STEP_ORDER = [
  'registered', 'eligibility_result_viewed', 'funded_offer_viewed',
  'booking_started', 'booking_completed', 'became_client',
];

function cutBy(events: FunnelEventRow[], key: 'source' | 'language'): FunnelCut[] {
  const groups = new Map<string, FunnelEventRow[]>();
  for (const e of events) {
    const label = e[key] ?? '(not set)';
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(e);
  }
  return [...groups.entries()]
    .map(([label, rows]) => {
      const registered = new Set(rows.filter((r) => r.step === 'registered').map((r) => r.family_id)).size;
      const booked = new Set(rows.filter((r) => r.step === 'booking_completed').map((r) => r.family_id)).size;
      return { label, registered, booked, conversion: registered > 0 ? booked / registered : null };
    })
    .sort((a, b) => b.registered - a.registered);
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

export function buildEvidenceReport(inputs: EvidenceInputs, now = new Date()): EvidenceReport {
  const { funnelEvents, serviceEvents, cases, baselines, invoices } = inputs;

  const pipelineValueCents = cases.reduce((s, c) => s + (c.agreed_annual_price_cents ?? 0), 0);
  const invoicedCents = invoices
    .filter((i) => i.status === 'submitted' || i.status === 'paid')
    .reduce((s, i) => s + i.total_cents, 0);
  const paid = invoices.filter((i) => i.status === 'paid');
  const paidCents = paid.reduce((s, i) => s + i.total_cents, 0);

  const minutesByFamily = new Map<string, number>();
  for (const e of serviceEvents) {
    minutesByFamily.set(e.family_id, (minutesByFamily.get(e.family_id) ?? 0) + e.minutes);
  }
  const familiesWithTime = minutesByFamily.size;
  const hoursPerFamily = familiesWithTime
    ? Math.round(([...minutesByFamily.values()].reduce((a, b) => a + b, 0) / familiesWithTime / 60) * 10) / 10
    : null;

  const registered = new Set(funnelEvents.filter((e) => e.step === 'registered').map((e) => e.family_id)).size;
  const booked = new Set(funnelEvents.filter((e) => e.step === 'booking_completed').map((e) => e.family_id)).size;
  const conversion = registered > 0 ? booked / registered : null;

  const stepCounts = STEP_ORDER.map((step) => ({
    step,
    families: new Set(funnelEvents.filter((e) => e.step === step).map((e) => e.family_id)).size,
  }));

  // Hours by stage: minutes on events whose case is known, grouped by stage
  const caseById = new Map(cases.map((c) => [c.id, c]));
  const minutesByStage = new Map<string, { minutes: number; caseIds: Set<string> }>();
  for (const e of serviceEvents) {
    const c = e.case_id ? caseById.get(e.case_id) : undefined;
    if (!c) continue;
    if (!minutesByStage.has(c.stage)) minutesByStage.set(c.stage, { minutes: 0, caseIds: new Set() });
    const g = minutesByStage.get(c.stage)!;
    g.minutes += e.minutes;
    g.caseIds.add(c.id);
  }
  const hoursByStage = [...minutesByStage.entries()].map(([stage, g]) => ({
    stage,
    cases: g.caseIds.size,
    avgHours: Math.round((g.minutes / 60 / g.caseIds.size) * 10) / 10,
  }));

  // Outcomes: baseline vs latest re-measure, per case, averaged
  const byCase = new Map<string, BaselineRow[]>();
  for (const b of baselines) {
    if (!byCase.has(b.case_id)) byCase.set(b.case_id, []);
    byCase.get(b.case_id)!.push(b);
  }
  const coordBefore: number[] = []; const coordAfter: number[] = [];
  const strainBefore: number[] = []; const strainAfter: number[] = [];
  let outcomesN = 0;
  for (const rows of byCase.values()) {
    const base = rows.find((r) => r.kind === 'baseline');
    const after = rows.find((r) => r.kind === '12mo') ?? rows.find((r) => r.kind === '6mo');
    if (!base || !after) continue;
    outcomesN++;
    if (base.coordination_hours_per_week != null) coordBefore.push(Number(base.coordination_hours_per_week));
    if (after.coordination_hours_per_week != null) coordAfter.push(Number(after.coordination_hours_per_week));
    if (base.caregiver_strain != null) strainBefore.push(base.caregiver_strain);
    if (after.caregiver_strain != null) strainAfter.push(after.caregiver_strain);
  }

  return {
    generatedOn: now.toISOString().slice(0, 10),
    pipelineValueCents,
    invoicedCents,
    paidCents,
    paidInvoiceCount: paid.length,
    hoursPerFamily,
    familiesWithTime,
    conversion,
    registered,
    booked,
    funnelVerdict: conversion === null ? null : conversion >= FUNNEL_GATE ? 'pass' : 'fail',
    hoursVerdict:
      hoursPerFamily === null ? null : hoursPerFamily <= HOURS_PER_FAMILY_MODEL ? 'pass' : 'fail',
    paidInvoiceVerdict: paid.length > 0 ? 'pass' : 'fail',
    funnelBySource: cutBy(funnelEvents, 'source'),
    funnelByLanguage: cutBy(funnelEvents, 'language'),
    stepCounts,
    hoursByStage,
    outcomes: {
      n: outcomesN,
      avgCoordinationBefore: avg(coordBefore),
      avgCoordinationAfter: avg(coordAfter),
      avgStrainBefore: avg(strainBefore),
      avgStrainAfter: avg(strainAfter),
    },
  };
}

// ── HTML rendering (self-contained; opens in a tab / attaches to the memo) ──

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function pct(v: number | null): string {
  return v === null ? '—' : `${Math.round(v * 1000) / 10}%`;
}

function verdictBadge(v: 'pass' | 'fail' | null): string {
  if (v === null) return '<span class="badge na">insufficient data</span>';
  return v === 'pass'
    ? '<span class="badge pass">PASS</span>'
    : '<span class="badge fail">FAIL</span>';
}

export function renderEvidenceHtml(r: EvidenceReport): string {
  const cutRows = (cuts: FunnelCut[]) =>
    cuts
      .map(
        (c) =>
          `<tr><td>${esc(c.label)}</td><td>${c.registered}</td><td>${c.booked}</td><td>${pct(c.conversion)}</td></tr>`
      )
      .join('');
  return `<!doctype html><html><head><meta charset="utf-8">
<title>Waypoint Evidence Readout ${r.generatedOn}</title>
<style>
  body{font-family:-apple-system,Segoe UI,sans-serif;color:#1F2937;max-width:760px;margin:40px auto;padding:0 20px;line-height:1.5}
  h1{color:#1B2A4A} h2{color:#1B2A4A;border-bottom:2px solid #0891B2;padding-bottom:6px;margin-top:36px}
  table{border-collapse:collapse;width:100%;font-size:14px} th,td{text-align:left;padding:6px 10px;border-bottom:1px solid #DDE3E6}
  th{color:#5B6B7C;text-transform:uppercase;font-size:11px;letter-spacing:.05em}
  .badge{font-weight:700;padding:2px 10px;border-radius:99px;font-size:12px}
  .pass{background:#E6F7F1;color:#0F7B5F}.fail{background:#FEE2E2;color:#DC2626}.na{background:#F1F5F9;color:#64748B}
  .kpi{display:inline-block;margin:8px 24px 8px 0}.kpi b{display:block;font-size:26px;color:#1B2A4A}
  .meta{color:#5B6B7C;font-size:13px}
</style></head><body>
<h1>Waypoint — Phase-1 Evidence Readout</h1>
<p class="meta">Generated ${r.generatedOn} from live product data. Gates: free→booked ≥ ${FUNNEL_GATE * 100}%; hours/family ≤ ${HOURS_PER_FAMILY_MODEL}h; ≥ 1 paid invoice.</p>

<h2>Kill-criteria verdicts</h2>
<p>
  Funnel conversion ${verdictBadge(r.funnelVerdict)} &nbsp;·&nbsp;
  Hours per family ${verdictBadge(r.hoursVerdict)} &nbsp;·&nbsp;
  Paid invoice ${verdictBadge(r.paidInvoiceVerdict)}
</p>
<div>
  <span class="kpi"><b>${formatCents(r.pipelineValueCents)}</b>pipeline value</span>
  <span class="kpi"><b>${formatCents(r.invoicedCents)}</b>invoiced (${formatCents(r.paidCents)} paid, n=${r.paidInvoiceCount})</span>
  <span class="kpi"><b>${r.hoursPerFamily ?? '—'}h</b>hours/family (n=${r.familiesWithTime})</span>
  <span class="kpi"><b>${pct(r.conversion)}</b>free→booked (${r.booked}/${r.registered})</span>
</div>

<h2>Funnel (distinct families)</h2>
<table><tr><th>Step</th><th>Families</th></tr>
${r.stepCounts.map((s) => `<tr><td>${esc(s.step)}</td><td>${s.families}</td></tr>`).join('')}
</table>

<h2>Conversion by acquisition source</h2>
<table><tr><th>Source</th><th>Registered</th><th>Booked</th><th>Conversion</th></tr>${cutRows(r.funnelBySource)}</table>

<h2>Conversion by language</h2>
<table><tr><th>Language</th><th>Registered</th><th>Booked</th><th>Conversion</th></tr>${cutRows(r.funnelByLanguage)}</table>

<h2>Facilitation hours by case stage</h2>
<table><tr><th>Stage</th><th>Cases</th><th>Avg hours</th></tr>
${r.hoursByStage.map((h) => `<tr><td>${esc(h.stage)}</td><td>${h.cases}</td><td>${h.avgHours}h</td></tr>`).join('') || '<tr><td colspan="3">No case-attributed time yet</td></tr>'}
</table>

<h2>Family outcomes (baseline → latest re-measure, n=${r.outcomes.n})</h2>
<table><tr><th>Measure</th><th>Baseline</th><th>Re-measure</th></tr>
<tr><td>Care-coordination hours/week (avg)</td><td>${r.outcomes.avgCoordinationBefore ?? '—'}</td><td>${r.outcomes.avgCoordinationAfter ?? '—'}</td></tr>
<tr><td>Caregiver strain 1–5 (avg)</td><td>${r.outcomes.avgStrainBefore ?? '—'}</td><td>${r.outcomes.avgStrainAfter ?? '—'}</td></tr>
</table>

<p class="meta">Every figure derives from rows in the product database at generation time; n-counts are stated wherever an average is shown. Prepared for the Phase-1 go/no-go memo (ROADMAP.md W3).</p>
</body></html>`;
}
