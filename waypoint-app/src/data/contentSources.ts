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
    covers: ['Lanterman Act', 'Lanterman Act, W&I §4512 · §4643', 'Lanterman Act, W&I §4512'],
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
    covers: ['W&I §4685.8', 'W&I §4685.8(u)', 'W&I §4685.8 · §4646.5(b)'],
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
    covers: ['DDS SDP guidance (2024)', 'codes 024 + 099 · July 2024 DDS guidance'],
    url: 'https://www.dds.ca.gov/initiatives/sdp/',
    verifiedOn: VERIFIED,
    claim:
      'Service code 024 person-centered-plan reimbursement cap ($1,000) and code 099 transition-support cap (40 hours) — see benefitFigures.',
  },
  {
    key: 'dds_d_2026_sdp_002',
    title: 'DDS Directive D-2026-SelfDeterminationProgram-002 (Mar 24, 2026)',
    covers: ['DDS D-2026-SDP-002', 'W&I §4685.8 · DDS D-2026-SDP-002'],
    url: 'https://www.dds.ca.gov/wp-content/uploads/2026/03/D-2026-Self-DeterminationProgram-002.pdf',
    verifiedOn: '2026-08-25',
    claim:
      'Effective Apr 1, 2026: SDP orientation is two required 2-hour sessions delivered only by SCDD (Part A before B, certificate after each); handing both certificates to the service coordinator triggers a mandatory four-item response (IPP copy, transition-supports info, FMS info, budget-process steps).',
  },
  {
    key: 'dds_fms_models',
    title: 'DDS FMS models comparison (Bill Payer · Sole Employer · Co-Employer)',
    covers: ['three models: Bill Payer · Sole Employer · Co-Employer'],
    url: 'https://www.dds.ca.gov/wp-content/uploads/2021/04/FMSModelsComparisonChart_04272021.pdf',
    verifiedOn: '2026-08-25',
    claim:
      'The three FMS models and their duties; since July 1, 2022 the regional center pays the FMS outside the individual budget.',
  },
  {
    key: 'edc_56341',
    title: 'Education Code §56341 (IEP team and contents)',
    covers: ['IDEA · Ed Code §56341'],
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=EDC&sectionNum=56341.',
    verifiedOn: '2026-08-25',
    claim:
      'The IEP delivers services (therapies, aide support, placement) at no cost as part of FAPE from age 3 to 22.',
  },
  {
    key: 'edc_56343_5',
    title: 'Education Code §56343.5 (IEP meeting on parent request)',
    covers: ['Ed Code §56343.5'],
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=EDC&sectionNum=56343.5.',
    verifiedOn: '2026-08-26',
    claim:
      'An IEP team meeting requested in writing by a parent must be held within 30 days of the request (school vacations excepted).',
  },
  {
    key: 'edc_56500_4_56504',
    title: 'Education Code §56500.4 (prior written notice) · §56504 (records)',
    covers: ['Ed Code §56500.4 · §56504'],
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=EDC&sectionNum=56504.',
    verifiedOn: '2026-08-26',
    claim:
      'Refusals to initiate or change identification, evaluation, or placement require prior written notice; parents get school records within 5 business days of a request.',
  },
  {
    key: 'edc_56329b_56501',
    title: 'Education Code §56329(b) (IEE at public expense) · §56501 (due process)',
    covers: ['Ed Code §56329(b) · §56501'],
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=EDC&sectionNum=56329.',
    verifiedOn: '2026-08-26',
    claim:
      'A parent who disagrees with a district assessment may obtain an independent educational evaluation at public expense unless the district initiates and prevails at a due-process hearing; §56501 provides the due-process forum.',
  },
  {
    key: 'wic_4648',
    title: 'Welfare & Institutions Code §4648(a) (securing IPP services)',
    covers: ['W&I §4646.5 · §4648(a)'],
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=4648.',
    verifiedOn: '2026-08-28',
    claim:
      'Once the IPP is developed, the regional center must secure the services and supports it lists — including contracting with alternative providers when needed — so a vendor waitlist does not suspend the obligation to deliver.',
  },
  {
    key: 'wic_4710_5',
    title: 'Welfare & Institutions Code §4710.5 (appeal windows)',
    covers: ['W&I §4710.5', 'W&I §4710.5 · §4731'],
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=4710.5.',
    verifiedOn: '2026-08-28',
    claim:
      'An appeal of a regional center decision must be filed within 60 days of the notice of action; filing within 30 days continues existing services during the appeal (aid paid pending).',
  },
  {
    key: 'wic_4731',
    title: 'Welfare & Institutions Code §4731 (rights-violation complaint)',
    covers: ['W&I §4731'],
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=4731.',
    verifiedOn: '2026-08-28',
    claim:
      'A consumer or representative may file a rights-violation complaint with the regional center director, who must respond with a written proposed resolution within 20 working days; unresolved complaints escalate to DDS.',
  },
  {
    key: 'edc_56345a3',
    title: 'Education Code §56345(a)(3) (progress reporting) · §56504 (records)',
    covers: ['Ed Code §56345(a)(3) · §56504'],
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=EDC&sectionNum=56345.',
    verifiedOn: '2026-08-28',
    claim:
      'The IEP must state how progress toward each annual goal is measured and provide periodic progress reports at least as often as report cards (concurrent with their issuance); §56504 provides records within 5 business days of a written request.',
  },
  {
    key: 'cfr_300_148',
    title: '34 CFR §300.148 (unilateral placement notice)',
    covers: ['Ed Code §56329(b) · §56501 · 34 CFR §300.148'],
    url: 'https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-300/subpart-B/subject-group-ECFRc2669ba9c45f0d6/section-300.148',
    verifiedOn: '2026-08-28',
    claim:
      'Reimbursement for a unilateral private placement may be reduced or denied unless the parents gave written notice to the district at least 10 business days before removing the child (or stated the rejection at the most recent IEP meeting); §56329(b)/§56501 cover IEE and due process as before.',
  },
  {
    key: 'dds_pds_faq',
    title: 'DDS Participant-Directed Services FAQ (2020)',
    covers: ['W&I §4685.8 · DDS PDS FAQ'],
    url: 'https://www.dds.ca.gov/wp-content/uploads/2020/10/Participant-DirectedServices_Self-Advocate-Families_FAQ_10052020.pdf',
    verifiedOn: '2026-08-28',
    claim:
      'Within traditional POS, a participant-directed model is available for respite, day care, non-medical transportation, nursing, and day services where the regional center offers it — the family chooses who provides, with an FMS; SDP itself is §4685.8.',
  },
  {
    key: 'ocra_drc',
    title: "OCRA — Office of Clients' Rights Advocacy (Disability Rights California)",
    covers: ['OCRA · Disability Rights California'],
    url: 'https://www.disabilityrightsca.org/what-we-do/programs/office-of-clients-rights-advocacy-ocra',
    verifiedOn: '2026-08-28',
    claim:
      "OCRA, run by Disability Rights California under contract with DDS, provides a free Clients' Rights Advocate for the clients of every one of the 21 regional centers; advocates are independent of the regional center.",
  },
  {
    key: 'hcbs_deeming',
    title: 'Medi-Cal HCBS (DD) waiver — institutional deeming',
    covers: ['HCBS waiver deeming'],
    url: 'https://www.dds.ca.gov/services/medi-cal-waiver/',
    verifiedOn: '2026-08-25',
    claim:
      "Institutional deeming under the HCBS DD waiver determines a child's Medi-Cal eligibility without counting parental income or resources.",
  },
];

/** The registry entry covering a UI citation string, or null. */
export function sourceForCitation(citation: string): ContentSource | null {
  return CONTENT_SOURCES.find((s) => s.covers.includes(citation)) ?? null;
}
