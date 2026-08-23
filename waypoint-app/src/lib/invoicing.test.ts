import { describe, it, expect } from 'vitest';
import { draftRcInvoice, draftFmsInvoice, agedReceivables } from './invoicing';
import { SDP_PCP_CAP } from '@/data/benefitFigures';

function ev(id: string, minutes: number, occurred_on: string, billable = true) {
  return { id, activity_type: 'transition_099' as const, minutes, occurred_on, billable };
}

describe('draftRcInvoice', () => {
  it('bills 099 hours at the hourly rate when vendored', () => {
    const inv = draftRcInvoice({
      events: [ev('e1', 90, '2026-08-01'), ev('e2', 30, '2026-08-02')],
      hourlyRate099Cents: 9000,
      includePcpFee: false,
      vendorStatus099: 'vendored',
    });
    expect(inv.lines).toHaveLength(2);
    expect(inv.lines[0].amountCents).toBe(13500); // 1.5h × $90
    expect(inv.totalCents).toBe(18000);
    expect(inv.skipped).toEqual([]);
  });

  it('gates 099 billing on vendorization — skipped with reason, never silently dropped', () => {
    const inv = draftRcInvoice({
      events: [ev('e1', 60, '2026-08-01')],
      hourlyRate099Cents: 9000,
      includePcpFee: false,
      vendorStatus099: 'submitted',
    });
    expect(inv.lines).toEqual([]);
    expect(inv.skipped[0].reason).toContain('vendorization');
  });

  it('caps the 024 PCP fee at the DDS cap', () => {
    const inv = draftRcInvoice({
      events: [],
      hourlyRate099Cents: 0,
      includePcpFee: true,
      pcpCostCents: 150000,
      vendorStatus099: 'vendored',
    });
    expect(inv.lines[0].serviceCode).toBe('024');
    expect(inv.lines[0].amountCents).toBe(SDP_PCP_CAP * 100);
  });

  it('non-billable events are skipped with the reason attached', () => {
    const inv = draftRcInvoice({
      events: [ev('e1', 60, '2026-08-01', false)],
      hourlyRate099Cents: 9000,
      includePcpFee: false,
      vendorStatus099: 'vendored',
    });
    expect(inv.skipped[0].reason).toContain('non-billable');
  });
});

describe('draftFmsInvoice', () => {
  it('bills the family-approved annual price', () => {
    const inv = draftFmsInvoice(240000, '2026–2027');
    expect(inv.payerType).toBe('fms');
    expect(inv.totalCents).toBe(240000);
    expect(inv.lines[0].description).toContain('family-approved');
  });

  it('no agreed price → empty draft with an honest reason', () => {
    const inv = draftFmsInvoice(null, '2026–2027');
    expect(inv.lines).toEqual([]);
    expect(inv.skipped[0].reason).toContain('agreed');
  });
});

describe('agedReceivables', () => {
  const NOW = new Date('2026-08-23T12:00:00');
  it('buckets outstanding invoices by age and ignores paid/draft', () => {
    const buckets = agedReceivables(
      [
        { status: 'submitted', issued_on: '2026-08-10', total_cents: 100 }, // 13d
        { status: 'submitted', issued_on: '2026-07-10', total_cents: 200 }, // 44d
        { status: 'submitted', issued_on: '2026-06-10', total_cents: 300 }, // 74d
        { status: 'submitted', issued_on: '2026-01-10', total_cents: 400 }, // 225d
        { status: 'paid', issued_on: '2026-01-10', total_cents: 9999 },
        { status: 'draft', issued_on: null, total_cents: 5555 },
      ],
      NOW
    );
    expect(buckets.current).toBe(100);
    expect(buckets.d31to60).toBe(200);
    expect(buckets.d61to90).toBe(300);
    expect(buckets.over90).toBe(400);
    expect(buckets.totalOutstanding).toBe(1000);
  });
});
