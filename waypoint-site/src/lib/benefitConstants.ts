/**
 * Typed accessors over src/data/benefit-constants.json (D4 — the single
 * source of truth for benefit figures). Current-year values ship null until
 * verified against their sourceUrl; consumers must handle the null state,
 * never fall back to prior-year figures on a rendered page.
 */
import constants from '../data/benefit-constants.json';
import type { DeemingConstants } from './ssiDeeming';

interface ConstantEntry {
  value: number | null;
  year: number;
  sourceUrl: string;
  verifiedAsOf: string | null;
  note: string;
}

function entry(key: string): ConstantEntry {
  const e = (constants as Record<string, unknown>)[key];
  if (!e || typeof e !== 'object') throw new Error(`benefit-constants.json missing key: ${key}`);
  return e as ConstantEntry;
}

/**
 * Verified current-year deeming constants, or null while any needed figure
 * is still unverified — the calculator renders its pending state on null.
 * The child allocation is a real entry, not a derivation, so a verified
 * value that differs from (couple − individual) is used, not ignored (D4).
 */
export function currentDeemingConstants(): (DeemingConstants & { year: number }) | null {
  const ind = entry('ssi_fbr_individual');
  const cpl = entry('ssi_fbr_couple');
  const alloc = entry('ssi_child_allocation');
  const general = entry('ssi_general_exclusion');
  const earned = entry('ssi_earned_exclusion');
  if (ind.value == null || cpl.value == null || alloc.value == null) return null;
  if (general.value == null || earned.value == null) return null;
  return {
    fbrIndividual: ind.value,
    fbrCouple: cpl.value,
    childAllocation: alloc.value,
    generalExclusion: general.value,
    earnedExclusion: earned.value,
    year: ind.year,
  };
}

/** The SSA source URL shown beside calculator output and pending states. */
export function ssiSourceUrl(): string {
  return entry('ssi_fbr_individual').sourceUrl;
}

/**
 * CCS (California Children's Services) financial-eligibility figures, formatted
 * for prose. D4: content pages interpolate these instead of hard-coding a
 * dollar amount, so a threshold change lands in the constants file only.
 * Throws rather than rendering a blank if a figure is ever unset — a benefits
 * page must never show a family an empty income limit.
 */
function requiredValue(key: string): number {
  const v = entry(key).value;
  if (v == null) {
    throw new Error(`benefit-constants: "${key}" is null; no page may render an empty benefit figure.`);
  }
  return v;
}

/** CCS family adjusted-gross-income ceiling, formatted (e.g. "$40,000"). */
export function ccsIncomeCeiling(): string {
  return '$' + requiredValue('ccs_income_ceiling').toLocaleString('en-US');
}

/** CCS out-of-pocket cost-share threshold as a bare number (a percentage). */
export function ccsCostSharePercent(): number {
  return requiredValue('ccs_cost_share_percent');
}
