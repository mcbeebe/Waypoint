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
  },
  {
    name: 'Behavioral Support',
    code: '062',
    description: '1:1 behavioral aide, community integration, social skills groups.',
    cost: 'Varies — 2nd highest POS expenditure',
    note: "Different from IHSS. RC-funded when school/insurance don't cover.",
  },
  {
    name: 'ABA Therapy',
    code: 'Various',
    description: 'Applied Behavior Analysis. Insurance is primary payer — RC covers co-pays, gaps, or when insurance denies.',
    cost: '$60-150/hr',
    note: 'RC is payer of last resort. Must exhaust insurance first. Keep all EOBs.',
  },
  {
    name: 'Speech Therapy',
    code: 'varies',
    description: "Speech-language pathology. RC covers when insurance and school don't provide enough.",
    cost: '$100-200/session',
    note: 'Insurance → School → RC. Keep records of all denials.',
  },
  {
    name: 'OT',
    code: 'varies',
    description: 'OT for sensory, fine motor, daily living skills.',
    cost: '$100-200/session',
    note: 'Same hierarchy: insurance → school → RC is payer of last resort.',
  },
  {
    name: 'Diapers / Supplies',
    code: '840',
    description: 'For children over age 3 with documented medical need.',
    cost: '$50-150/month',
    note: "Physician note required. Most families don't know this exists.",
  },
  {
    name: 'Adaptive Equipment',
    code: 'Various',
    description: 'AAC devices, adaptive strollers, car seats, sensory equipment, iPads for communication.',
    cost: 'Varies',
    note: 'Medi-Cal / insurance first. RC covers gaps. Must be in IPP.',
  },
  {
    name: 'Transportation',
    code: 'Various',
    description: 'Gas reimbursement, mileage to appointments, bus passes.',
    cost: 'IRS mileage rate',
    note: 'Keep a mileage log. Must be for authorized services.',
  },
  {
    name: 'Camp / Recreation',
    code: 'Various',
    description: 'Summer camp, adaptive sports, social skills programs, Special Olympics.',
    cost: 'Varies',
    note: 'Must be in IPP. Ask SC about community integration services.',
  },
  {
    name: 'Parent Training',
    code: 'Various',
    description: 'Training for parents on behavior management, AAC devices, home programs.',
    cost: 'Varies',
    note: 'Underutilized. Great alternative to waitlists.',
  },
  {
    name: 'Self-Determination (SDP)',
    code: 'SDP',
    description: 'Family controls budget and chooses own vendors. More flexibility than traditional IPP.',
    cost: 'Individual budget',
    note: 'Not all RCs fully rolled out. Ask your SC about enrollment.',
  },
  {
    name: 'Supported Living Services',
    code: '896',
    description: 'For adults: support to live independently.',
    cost: 'Largest POS for adults 22+',
    note: 'Transition planning starts at age 14.',
  },
];
