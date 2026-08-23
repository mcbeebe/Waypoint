/**
 * Content provenance registry (PRD W-F: F2, REQ-1001) — every statute,
 * rate, and rule the app asserts, with where it comes from and when a
 * human last verified it. This is the app-side single source of truth;
 * migration 038 mirrors it into `content_sources` so ops can audit and
 * re-verify without a deploy.
 *
 * Rules:
 * - Every citation string shown in the UI must be covered by exactly the
 *   strings in some entry's `covers` — the test enumerates what the
 *   content modules actually emit and fails on any orphan citation.
 * - `verifiedOn` is the date a human confirmed the source says what we
 *   say it says. Bump it when re-verified; never backdate.
 * - Dollar figures live in `src/data/benefitFigures.ts`; entries here
 *   point at the authority those figures came from.
 */

export interface ContentSource {
  /** Stable key, snake_case — mirrored in the content_sources table. */
  key: string;
  /** Human title of the authority. */
  title: string;
  /** Exact citation display strings this source covers in the UI. */
  covers: string[];
  /** Where a human goes to re-verify. */
  url: string;
  /** ISO date the mapping from source → our claim was last verified. */
  verifiedOn: string;
  /** What we rely on this source for, in one line. */
  claim: string;
}

const VERIFIED = '2026-08-23';

export const CONTENT_SOURCES: ContentSource[] = [
  {
    key: 'lanterman_act',
    title: 'Lanterman Developmental Disabilities Services Act',
    covers: ['Lanterman Act', 'Lanterman Act, W&I §4512 · §4643'],
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displayexpandedbranch.xhtml?tocCode=WIC&division=4.5.',
    verifiedOn: VERIFIED,
    claim:
      'Regional Center services: entitlement basis, no income test, no cost to families; §4512 defines developmental disability.',
  },
  {
    key: 'wic_4643',
    title: 'Welfare & Institutions Code §4643',
    covers: ['W&I §4643'],
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=4643.',
    verifiedOn: VERIFIED,
    claim: 'Regional Center assessment within 120 days of intake; 60 days when delay risks harm.',
  },
  {
    key: 'wic_4646',
    title: 'Welfare & Institutions Code §4646 · §4646.5(b)',
    covers: ['W&I §4646 · §4646.5(b)', 'W&I §4646.5(b)'],
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=4646.5.',
    verifiedOn: VERIFIED,
    claim:
      'IPP within 60 days of eligibility determination; a requested IPP review meeting must be held within 30 days.',
  },
  {
    key: 'wic_4710',
    title: 'Welfare & Institutions Code §4710',
    covers: ['W&I §4710'],
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=4710.',
    verifiedOn: VERIFIED,
    claim: 'Denials and changes require a written Notice of Action with appeal rights.',
  },
  {
    key: 'wic_4685_8',
    title: 'Welfare & Institutions Code §4685.8 (Self-Determination Program)',
    covers: ['W&I §4685.8'],
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=4685.8.',
    verifiedOn: VERIFIED,
    claim:
      'SDP: annual family-directed budget; budget basis is prior-12-month authorized services plus documented unmet needs (AB 143); independent-facilitator independence bar.',
  },
  {
    key: 'wic_12300',
    title: 'Welfare & Institutions Code §12300 (IHSS)',
    covers: ['W&I §12300'],
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=12300.',
    verifiedOn: VERIFIED,
    claim: 'In-Home Supportive Services: paid in-home care hours; a parent can be the paid provider.',
  },
  {
    key: 'edc_56321_56344',
    title: 'Education Code §56321 · §56344',
    covers: ['Ed Code §56321 · §56344', 'Ed Code §56321'],
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=EDC&sectionNum=56321.',
    verifiedOn: VERIFIED,
    claim:
      'Assessment plan within 15 calendar days of a written special-education referral; IEP within 60 days of consent (§56344).',
  },
  {
    key: 'idea_part_c',
    title: 'IDEA Part C / California Early Start',
    covers: ['IDEA Part C · Early Start'],
    url: 'https://www.dds.ca.gov/services/early-start/',
    verifiedOn: VERIFIED,
    claim: 'Early intervention ages 0–3 through Regional Centers at no cost to families.',
  },
  {
    key: 'ssa_cola_2026',
    title: 'SSA 2026 Cost-of-Living Adjustment (SSI federal benefit rate)',
    covers: ['SSA 2026 COLA'],
    url: 'https://www.ssa.gov/cola/',
    verifiedOn: VERIFIED,
    claim:
      'SSI federal benefit rate for 2026 (see benefitFigures.SSI_FBR_MONTHLY); California adds a state supplement.',
  },
  {
    key: 'dds_sdp_guidance_2024',
    title: 'DDS Self-Determination Program guidance (July 2024)',
    covers: ['DDS SDP guidance (2024)'],
    url: 'https://www.dds.ca.gov/initiatives/sdp/',
    verifiedOn: VERIFIED,
    claim:
      'Service code 024 person-centered-plan reimbursement cap ($1,000) and code 099 transition-support cap (40 hours) — see benefitFigures.',
  },
];

/** The registry entry covering a UI citation string, or null. */
export function sourceForCitation(citation: string): ContentSource | null {
  return CONTENT_SOURCES.find((s) => s.covers.includes(citation)) ?? null;
}
