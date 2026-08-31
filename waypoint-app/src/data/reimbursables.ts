/**
 * Regional Center reimbursable service categories (POS codes).
 * merged with the richer descriptions/notes from waypoint-frustration-data.js
 * (RC_REIMBURSABLE.categories) where that file's text is a superset of the
 * gas-mvp text. 'Supported Living Services' (POS 896) exists only in the
 * frustration-data list and is appended at the end.
  *
 * NOTE ON ACCURACY (added after the Aug 2026 content audit): this file contains
 * dated legal figures and statutory timelines. It is NOT frozen — when a law,
 * rate, or deadline changes, UPDATE IT, and verify edits against current
 * primary sources (DDS, SSA, CA Ed Code). Dollar amounts and ages are marked
 * with their year where possible. src/data/contentFacts.test.ts guards against
 * known-stale values reappearing.
 */
import type { Reimbursable } from './types';

export const RC_REIMBURSABLES: Reimbursable[] = [
  {
    name: 'Respite Care',
    code: '862/868',
    description: 'In-home or out-of-home respite. Parent relief. Most-used RC service statewide.',
    cost: '$15-40/hr',
    note: 'Must be in IPP. Parent CANNOT be respite provider for own child.',
    moreInfo: [
      'The need in the IPP is your family’s — caregiver relief — not only the child’s.',
      'In-home or out-of-home; some families use it for one-on-one time with a sibling.',
      'Ask by name and code (862/868), and say how many hours a week you need.',
    ],
  },
  {
    name: 'Behavioral Support',
    code: '062',
    description: '1:1 behavioral aide, community integration, social skills groups.',
    cost: 'Varies — 2nd highest POS expenditure',
    note: "Different from IHSS. RC-funded when school/insurance don't cover.",
    moreInfo: [
      'Different from IHSS: this builds skills; IHSS pays for personal care.',
      'Ask for a functional assessment to establish the need in the IPP.',
      'Community-integration hours can go toward social programs and camps.',
    ],
  },
  {
    name: 'ABA Therapy',
    code: 'Various',
    description: 'Applied Behavior Analysis. Insurance is primary payer — RC covers co-pays, gaps, or when insurance denies.',
    cost: '$60-150/hr',
    note: 'RC is payer of last resort. Must exhaust insurance first. Keep all EOBs.',
    moreInfo: [
      'Insurance pays first — the RC covers co-pays, gaps, or a denial.',
      'Keep every EOB (explanation of benefits) and denial letter.',
      'The IPP should note exactly what insurance did not cover.',
    ],
  },
  {
    name: 'Speech Therapy',
    code: 'varies',
    description: "Speech-language pathology. RC covers when insurance and school don't provide enough.",
    cost: '$100-200/session',
    note: 'Insurance → School → RC. Keep records of all denials.',
    moreInfo: [
      'Order of payers: insurance → school → Regional Center.',
      'Keep records of what each one denied or under-provided.',
      'The IPP should name the gap the RC is being asked to fill.',
    ],
  },
  {
    name: 'OT',
    code: 'varies',
    description: 'OT for sensory, fine motor, daily living skills.',
    cost: '$100-200/session',
    note: 'Same hierarchy: insurance → school → RC is payer of last resort.',
    moreInfo: [
      'Same payer order: insurance → school → RC as last resort.',
      'For sensory, fine-motor and daily-living needs.',
      'Document the unmet need so it can be written into the IPP.',
    ],
  },
  {
    name: 'Diapers / Supplies',
    code: '840',
    description: 'For children over age 3 with documented medical need.',
    cost: '$50-150/month',
    note: "Physician note required. Most families don't know this exists.",
    moreInfo: [
      'For children over age 3 with a documented medical need.',
      'Get the physician’s note first — it’s what the request rests on.',
      'Most families never hear about this; ask by code (840).',
    ],
  },
  {
    name: 'Adaptive Equipment',
    code: 'Various',
    description: 'AAC devices, adaptive strollers, car seats, sensory equipment, iPads for communication.',
    cost: 'Varies',
    note: 'Medi-Cal / insurance first. RC covers gaps. Must be in IPP.',
    moreInfo: [
      'Medi-Cal or insurance first; the RC covers what they don’t.',
      'Covers AAC devices, adaptive strollers, car seats, sensory equipment.',
      'Must be written into the IPP as a need.',
    ],
  },
  {
    name: 'Transportation',
    code: 'Various',
    description: 'Gas reimbursement, mileage to appointments, bus passes.',
    cost: 'IRS mileage rate',
    note: 'Keep a mileage log. Must be for authorized services.',
    moreInfo: [
      'Gas/mileage reimbursement and bus passes for authorized services.',
      'Keep a mileage log — reimbursement follows the record.',
      'Tie it to services your child is already authorized for.',
    ],
  },
  {
    name: 'Camp / Recreation',
    code: 'Various',
    description: 'Summer camp, adaptive sports, social skills programs, Special Olympics.',
    cost: 'Varies',
    note: 'Must be in IPP. Ask SC about community integration services.',
    moreInfo: [
      'Framed as community integration — that’s the need to name in the IPP.',
      'Covers summer camp, adaptive sports, Special Olympics, social programs.',
      'Ask your coordinator about community-integration services by name.',
    ],
  },
  {
    name: 'Parent Training',
    code: 'Various',
    description: 'Training for parents on behavior management, AAC devices, home programs.',
    cost: 'Varies',
    note: 'Underutilized. Great alternative to waitlists.',
    moreInfo: [
      'Builds your capacity to support your child at home.',
      'Often faster than waiting for a direct-service slot.',
      'Covers behavior strategies, AAC, and home programs.',
    ],
  },
  {
    name: 'Self-Determination (SDP)',
    code: 'SDP',
    description: 'Family controls budget and chooses own vendors. More flexibility than traditional IPP.',
    cost: 'Individual budget',
    note: 'Not all RCs fully rolled out. Ask your SC about enrollment.',
    moreInfo: [
      'You direct an annual budget and choose your own vendors.',
      'More flexible than traditional IPP-purchased services.',
      'It’s available statewide to every eligible RC consumer — most families just aren’t told. Ask for a referral to the SCDD orientation to enroll.',
    ],
  },
  {
    name: 'Supported Living Services',
    code: '896',
    description: 'For adults: support to live independently.',
    cost: 'Largest POS for adults 22+',
    note: 'Transition planning starts at age 14.',
    moreInfo: [
      'For adults: support to live independently in their own home.',
      'Regional Center transition planning can start as early as 14 — ask about it early.',
      'The largest expenditure category for adults 22+.',
    ],
  },
];
