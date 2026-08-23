/**
 * Phase-1 gates (PRD §7 kill criteria) — single source so the Scorecard
 * screen and the exported evidence readout can never disagree on what
 * "pass" means.
 */

/** Free → booked conversion gate from the PRD funnel decision. */
export const FUNNEL_GATE = 0.03;

/** Operating-model assumption: facilitation hours per family per year. */
export const HOURS_PER_FAMILY_MODEL = 30;
