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
