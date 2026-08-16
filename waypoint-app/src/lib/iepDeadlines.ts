/**
 * IEP timeline reminders (roadmap 2.4) — computes the statutory IEP clocks
 * from the child's IEP dates and syncs them into the `deadlines` table,
 * which already feeds Home alerts and the Calendar.
 *
 * Clocks:
 * - Annual review: last annual review + 1 year
 * - Triennial evaluation: last triennial + 3 years
 * - Assessment plan due: written request + 15 calendar days (CA Ed Code §56321)
 * - Evaluation complete due: signed consent + 60 calendar days
 */

import { supabase } from '@/lib/supabase';

const IEP_DEADLINE_TYPES = [
  'iep_annual_review',
  'iep_triennial',
  'iep_assessment_plan',
  'iep_assessment_complete',
] as const;

export interface IEPDates {
  lastAnnualReview: string | null;
  lastTriennial: string | null;
  assessmentPlanRequested: string | null;
  assessmentConsentSigned: string | null;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function addYears(dateStr: string, years: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split('T')[0];
}

/**
 * Replace the child's IEP-derived deadlines with freshly computed ones.
 * Returns the number of deadlines created, or -1 on failure (non-fatal).
 */
export async function syncIEPDeadlines(
  familyId: string,
  childId: string,
  childName: string,
  dates: IEPDates
): Promise<number> {
  try {
    // Clear previously computed IEP clocks for this child
    const { error: deleteError } = await supabase
      .from('deadlines')
      .delete()
      .eq('child_id', childId)
      .in('deadline_type', IEP_DEADLINE_TYPES as unknown as string[]);
    if (deleteError) throw deleteError;

    const rows: Array<Record<string, unknown>> = [];

    if (dates.lastAnnualReview) {
      rows.push({
        family_id: familyId,
        child_id: childId,
        title: `${childName}'s IEP annual review due`,
        deadline_type: 'iep_annual_review',
        due_date: addYears(dates.lastAnnualReview, 1),
        notes: 'The school must hold an IEP review at least annually. Request a meeting in writing if none is scheduled.',
      });
    }
    if (dates.lastTriennial) {
      rows.push({
        family_id: familyId,
        child_id: childId,
        title: `${childName}'s triennial re-evaluation due`,
        deadline_type: 'iep_triennial',
        due_date: addYears(dates.lastTriennial, 3),
        notes: 'A comprehensive re-evaluation is required every 3 years. You can request one sooner in writing.',
      });
    }
    if (dates.assessmentPlanRequested) {
      rows.push({
        family_id: familyId,
        child_id: childId,
        title: 'School assessment plan due (15-day clock)',
        deadline_type: 'iep_assessment_plan',
        due_date: addDays(dates.assessmentPlanRequested, 15),
        notes: 'CA Ed Code §56321: the district has 15 calendar days from your written request to provide an assessment plan. If missed, file a CDE compliance complaint (916-319-0800).',
      });
    }
    if (dates.assessmentConsentSigned) {
      rows.push({
        family_id: familyId,
        child_id: childId,
        title: 'Evaluation completion due (60-day clock)',
        deadline_type: 'iep_assessment_complete',
        due_date: addDays(dates.assessmentConsentSigned, 60),
        notes: 'The district has 60 calendar days from signed consent to complete the evaluation and hold the IEP meeting.',
      });
    }

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from('deadlines').insert(rows);
      if (insertError) throw insertError;
    }
    return rows.length;
  } catch (err) {
    console.warn('IEP deadline sync failed:', err);
    return -1;
  }
}
