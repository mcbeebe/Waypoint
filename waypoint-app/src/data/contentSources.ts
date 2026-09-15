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

/** The prose-audit backlog, verified by the owner on this date (phase A2). */
const VERIFIED_SEP = '2026-09-15';

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
    // '§56329' bare is the parent section; the registry verified (b), and the
    // prose cites the section. Both resolve here rather than to two entries.
    covers: ['Ed Code §56329(b) · §56501', 'Ed Code §56329'],
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=EDC&sectionNum=56329.',
    verifiedOn: '2026-08-26',
    claim:
      'A parent who disagrees with a district assessment may obtain an independent educational evaluation at public expense unless the district initiates and prevails at a due-process hearing; §56501 provides the due-process forum.',
  },
  {
    key: 'wic_4648',
    title: 'Welfare & Institutions Code §4648(a) (securing IPP services)',
    // As above: prose cites the parent §4648, the registry verified (a).
    covers: ['W&I §4646.5 · §4648(a)', 'W&I §4648'],
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
    key: 'cfr_303_310',
    title: '34 CFR §303.310 (Early Start post-referral timeline)',
    covers: ['34 CFR §303.310 · Early Start'],
    url: 'https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-303/subpart-D/subject-group-ECFR821570af41ca511/section-303.310',
    verifiedOn: '2026-08-29',
    claim:
      'Under IDEA Part C, the initial evaluation, initial assessments, and the initial IFSP meeting must be completed within 45 days of the referral (exceptional documented family circumstances excepted).',
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

  // ── Registered 2026-09-15 ────────────────────────────────────────────────
  // The prose-audit backlog (`statuteAudit.ts`, phase A2). Each of these was
  // asserted to families in running text — several inside letter templates a
  // parent sends to a district or Regional Center under the heading
  // "Violations:" — with no entry here. Owner verified the set on 2026-09-15
  // against the sources below; see `Roadmap/Statute-Registry-Worksheet-Sep2026.md`
  // for the claim each one was checked against.
  {
    key: 'cfr_300_301',
    title: '34 CFR §300.301 (IDEA — initial evaluation)',
    covers: ['34 CFR §300.301'],
    url: 'https://www.ecfr.gov/current/title-34/section-300.301',
    verifiedOn: VERIFIED_SEP,
    claim:
      'A parent may request an initial special-education evaluation; the district must conduct it within 60 days of consent unless state law sets another timeline.',
  },
  {
    key: 'cfr_300_502',
    title: '34 CFR §300.502 (IDEA — independent educational evaluation)',
    covers: ['34 CFR §300.502'],
    url: 'https://www.ecfr.gov/current/title-34/section-300.502',
    verifiedOn: VERIFIED_SEP,
    claim:
      'A parent who disagrees with the district evaluation may request an IEE at public expense; the district must either fund it or file for due process.',
  },
  {
    key: 'edc_56302_1',
    title: 'Education Code §56302.1 (referral for assessment)',
    covers: ['Ed Code §56302.1'],
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=EDC&sectionNum=56302.1.',
    verifiedOn: VERIFIED_SEP,
    claim:
      'A parent referral for special-education assessment starts the statutory assessment-plan and evaluation clocks.',
  },
  {
    key: 'edc_56341_1',
    title: 'Education Code §56341.1 (IEP team duties)',
    covers: ['Ed Code §56341.1', 'IDEA · Ed Code §56341.1'],
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=EDC&sectionNum=56341.1.',
    verifiedOn: VERIFIED_SEP,
    claim:
      "The IEP team must consider the parent's concerns and the strengths of the child when developing the IEP.",
  },
  {
    key: 'hsc_1374_73',
    title: 'Health & Safety Code §1374.73 (autism behavioral health treatment)',
    covers: ['H&S §1374.73', 'Health & Safety Code §1374.73'],
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=1374.73.',
    verifiedOn: VERIFIED_SEP,
    claim:
      'Health plans regulated by DMHC must cover behavioral health treatment, including ABA, for pervasive developmental disorder or autism.',
  },
  {
    key: 'ins_10144_51',
    title: 'Insurance Code §10144.51 (autism behavioral health treatment — CDI plans)',
    covers: ['Ins Code §10144.51', 'Insurance Code §10144.51'],
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=INS&sectionNum=10144.51.',
    verifiedOn: VERIFIED_SEP,
    claim:
      'The Insurance Code twin of H&S §1374.73: disability insurers regulated by CDI must cover behavioral health treatment for autism.',
  },
  {
    key: 'usc_1396d_r',
    title: '42 U.S.C. §1396d(r) — EPSDT',
    covers: ['42 U.S.C. §1396d(r)', '42 USC §1396d(r)'],
    url: 'https://www.law.cornell.edu/uscode/text/42/1396d',
    verifiedOn: VERIFIED_SEP,
    claim:
      'EPSDT requires Medicaid (Medi-Cal) to cover any medically necessary service to correct or ameliorate a condition for a beneficiary under 21, whether or not the service is in the state plan for adults.',
  },
  {
    key: 'wic_4500',
    title: 'Welfare & Institutions Code §4500 (Lanterman Act — opening)',
    covers: ['W&I §4500'],
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=4500.',
    verifiedOn: VERIFIED_SEP,
    claim: 'The opening section of the Lanterman Developmental Disabilities Services Act.',
  },
  {
    key: 'wic_4502',
    title: 'Welfare & Institutions Code §4502 (rights)',
    covers: ['W&I §4502'],
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=4502.',
    verifiedOn: VERIFIED_SEP,
    claim:
      'People with developmental disabilities have the same legal rights as all other Californians, plus enumerated rights to treatment, dignity, and participation in decisions.',
  },
  {
    key: 'wic_4620',
    title: 'Welfare & Institutions Code §4620 (Regional Center responsibilities)',
    covers: ['W&I §4620'],
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=4620.',
    verifiedOn: VERIFIED_SEP,
    claim:
      'DDS contracts with private non-profit regional centers to deliver Lanterman services locally.',
  },
  {
    key: 'wic_4642',
    title: 'Welfare & Institutions Code §4642 (intake)',
    covers: ['W&I §4642', 'Lanterman Act, W&I §4642'],
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=4642.',
    verifiedOn: VERIFIED_SEP,
    claim:
      'A regional center must provide initial intake within 15 working days of a request for services.',
  },
  {
    key: 'wic_95014',
    title: 'Welfare & Institutions Code §95014 (Early Start eligibility)',
    covers: ['W&I §95014'],
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=95014.',
    verifiedOn: VERIFIED_SEP,
    claim:
      'Eligibility for Early Start (California Early Intervention Services) for infants and toddlers from birth to 36 months.',
  },
  {
    // A NAMED authority, not a numbered California code section — which is why
    // the prose says "a Section 504 plan" and must keep saying exactly that. A
    // parent's letter to a principal is not the place for a US Code cite, and
    // the collaborative-tone rule says the first ask stays plain. The audit
    // recognises this entry by its literal `covers` string instead.
    key: 'section_504',
    title: 'Section 504 of the Rehabilitation Act of 1973 (29 U.S.C. §794)',
    covers: ['Section 504', '29 U.S.C. §794'],
    url: 'https://www.hhs.gov/civil-rights/for-individuals/disability/laws-guidance/index.html',
    verifiedOn: VERIFIED_SEP,
    claim:
      'Section 504 prohibits disability discrimination by recipients of federal funds, and is the basis for a school "504 plan" of accommodations for a student who does not qualify for an IEP.',
  },
];

/** The registry entry covering a UI citation string, or null. */
export function sourceForCitation(citation: string): ContentSource | null {
  return CONTENT_SOURCES.find((s) => s.covers.includes(citation)) ?? null;
}
