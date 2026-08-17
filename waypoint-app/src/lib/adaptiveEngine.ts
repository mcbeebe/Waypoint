/**
 * Adaptive engine — TypeScript port of the GAS MVP's frustration deep-dive
 * flows (FRUSTRATION_DEEP), deep escalation action generators
 * (generateDeepRCActions / generateDeepSchoolActions /
 * generateDeepInsuranceActions), and completion check-ins (FOLLOWUPS +
 * getFollowUpActions), all from gas-mvp/Index.html.
 *
 * The wizard is deterministic — no AI calls. A parent taps "I'm stuck",
 * answers 1-3 questions about which system is failing them and how, and gets
 * legally-grounded escalation actions (with statute citations, talking
 * points, and draft letters) injected into their action plan. Some actions
 * depend on others (depends_on) and stay locked until the prerequisite is
 * completed; some ask a check-in question when completed (follow_up_key)
 * whose answer can generate the next round of actions.
 *
 * Field mapping follows planGenerator.ts:
 *   subtitle/whyMatters/documents → description; talkingPoints/draftMessage
 *   → script; GAS priority 'standard' → 'medium'.
 */

import type { ActionCategory, ActionPriority } from '@/types/database';

// ─── Question flows ──────────────────────────────────────────────────────────

export interface FlowOption {
  label: string;
  value: string;
  emoji: string;
}

export interface FlowStep {
  question: string;
  options: FlowOption[];
}

export type FrustrationTarget = 'rc' | 'school' | 'insurance';

export const FRUSTRATION_TARGETS: Array<{ label: string; value: FrustrationTarget; emoji: string }> = [
  { label: 'Regional Center', value: 'rc', emoji: '🏛' },
  { label: 'School / IEP', value: 'school', emoji: '🏫' },
  { label: 'Insurance', value: 'insurance', emoji: '💊' },
];

/** Ported verbatim from GAS FRUSTRATION_DEEP */
export const FRUSTRATION_DEEP: Record<string, FlowStep> = {
  rc_issue_type: {
    question: "What's going on with Regional Center?",
    options: [
      { label: "They're not responding / too slow", value: 'slow_response', emoji: '⏰' },
      { label: 'Reimbursement delayed or denied', value: 'reimbursement', emoji: '💸' },
      { label: "Service Coordinator isn't helping", value: 'sc_quality', emoji: '👤' },
      { label: 'Services denied or reduced', value: 'service_denied', emoji: '🚫' },
      { label: "Don't know what's reimbursable", value: 'what_covered', emoji: '❓' },
    ],
  },
  rc_slow_what: {
    question: 'What are you waiting for?',
    options: [
      { label: 'Intake appointment', value: 'intake', emoji: '📋' },
      { label: 'Eligibility decision', value: 'eligibility', emoji: '🔬' },
      { label: 'IPP meeting', value: 'ipp', emoji: '📝' },
      { label: 'Service authorization', value: 'service_auth', emoji: '✅' },
      { label: 'SC to return call/email', value: 'sc_response', emoji: '📞' },
      { label: 'Reimbursement payment', value: 'reimbursement_wait', emoji: '💰' },
    ],
  },
  rc_slow_duration: {
    question: 'How long have you been waiting?',
    options: [
      { label: '1-2 weeks', value: '1_2_weeks', emoji: '📅' },
      { label: '3-4 weeks', value: '3_4_weeks', emoji: '⚠️' },
      { label: '1-2 months', value: '1_2_months', emoji: '🚨' },
      { label: '3+ months', value: '3_plus_months', emoji: '🔴' },
    ],
  },
  rc_reimburse_issue: {
    question: "What's happening with the reimbursement?",
    options: [
      { label: 'Submitted claim, no payment yet', value: 'waiting', emoji: '⏳' },
      { label: 'Claim was denied', value: 'denied', emoji: '🚫' },
      { label: "Don't know how to submit", value: 'how_to', emoji: '❓' },
      { label: 'Partial payment — less than expected', value: 'partial', emoji: '💸' },
      { label: 'Never knew I could get reimbursed', value: 'didnt_know', emoji: '😮' },
    ],
  },
  school_issue_type: {
    question: "What's going on with school?",
    options: [
      { label: 'Evaluation too slow', value: 'eval_delay', emoji: '⏰' },
      { label: 'IEP not being implemented', value: 'iep_not_implemented', emoji: '🚫' },
      { label: 'Want to change goals/services', value: 'iep_change', emoji: '📝' },
      { label: 'Suspension / discipline', value: 'discipline', emoji: '⚠️' },
      { label: 'Disagree with evaluation', value: 'disagree_eval', emoji: '👎' },
    ],
  },
  insurance_issue_type: {
    question: "What's going on with insurance?",
    options: [
      { label: 'Authorization denied', value: 'auth_denied', emoji: '🚫' },
      { label: 'Not enough hours', value: 'low_hours', emoji: '⏰' },
      { label: 'No in-network providers', value: 'no_providers', emoji: '🔍' },
      { label: 'Billing dispute', value: 'billing', emoji: '💸' },
    ],
  },
};

/** Completion check-in questions, keyed by an action's follow_up_key */
export const FOLLOWUPS: Record<string, FlowStep> = {
  rc_done: {
    question: 'How did the RC call go?',
    options: [
      { label: 'Intake scheduled!', value: 'scheduled', emoji: '✅' },
      { label: 'Left voicemail', value: 'voicemail', emoji: '📞' },
      { label: "Lines busy / couldn't reach", value: 'busy', emoji: '😤' },
      { label: 'Need help understanding', value: 'confused', emoji: '❓' },
    ],
  },
  iep_done: {
    question: 'IEP request status?',
    options: [
      { label: 'Sent and confirmed!', value: 'confirmed', emoji: '✅' },
      { label: 'Sent, waiting for reply', value: 'waiting', emoji: '⏳' },
      { label: "Haven't sent yet", value: 'not_sent', emoji: '📝' },
    ],
  },
  school_eval_done: {
    question: 'School evaluation request?',
    options: [
      { label: 'Assessment plan received!', value: 'plan_received', emoji: '✅' },
      { label: 'Sent, waiting', value: 'waiting', emoji: '⏳' },
      { label: 'School refused to evaluate', value: 'refused', emoji: '🚫' },
      { label: "Haven't sent yet", value: 'not_sent', emoji: '📝' },
    ],
  },
  ped_done: {
    question: 'Got the referral?',
    options: [
      { label: 'Yes — referral in hand', value: 'got_it', emoji: '✅' },
      { label: 'Appointment scheduled', value: 'appt_set', emoji: '📅' },
      { label: 'Doctor refused referral', value: 'refused', emoji: '⚠️' },
    ],
  },
  ins_done: {
    question: 'What did insurance say?',
    options: [
      { label: 'Approved!', value: 'approved', emoji: '✅' },
      { label: 'Pending/processing', value: 'pending', emoji: '⏳' },
      { label: 'Denied', value: 'denied', emoji: '🚫' },
    ],
  },
};

// ─── Generated action shape ──────────────────────────────────────────────────

/** Everything a family already told us, threaded into the generated drafts */
export interface AdaptiveContext {
  childName?: string | null;
  parentName?: string | null;
  regionalCenterName?: string | null;
  email?: string | null;
  /** Display names of the child's diagnoses (e.g. "autism (ASD)") */
  diagnoses?: string[];
}

/** A generated action ready to insert (family_id/source added at insert) */
export interface GeneratedAction {
  /** Stable key from the GAS engine, used to wire depends_on between siblings */
  key: string;
  dependsOnKey?: string;
  title: string;
  description: string;
  category: ActionCategory;
  priority: ActionPriority;
  script: string | null;
  follow_up_key: string | null;
  follow_up_note: string | null;
}

interface DeepContent {
  key: string;
  dependsOnKey?: string;
  priority: 'urgent' | 'high' | 'standard';
  category: ActionCategory;
  title: string;
  subtitle: string;
  whyMatters?: string;
  agency?: string;
  deadline?: string;
  talkingPoints?: string[];
  draftMessage?: string;
  documents?: string[];
  followUpKey?: string;
  smsReminder?: string;
}

const PRIORITY_MAP: Record<DeepContent['priority'], ActionPriority> = {
  urgent: 'urgent',
  high: 'high',
  standard: 'medium',
};

function build(content: DeepContent): GeneratedAction {
  const parts: string[] = [content.subtitle];
  if (content.agency) parts.push(`Agency: ${content.agency}`);
  if (content.deadline) parts.push(`⏰ Timeline: ${content.deadline}`);
  if (content.whyMatters) parts.push(`Why this matters: ${content.whyMatters}`);
  if (content.documents && content.documents.length > 0) {
    parts.push('Documents to gather:\n' + content.documents.map((d) => `• ${d}`).join('\n'));
  }

  let script: string | null = null;
  if (content.talkingPoints && content.talkingPoints.length > 0) {
    script = 'What to say:\n' + content.talkingPoints.map((t) => `• ${t}`).join('\n');
  }
  if (content.draftMessage) {
    script = (script ? `${script}\n\n` : '') + `Draft letter:\n${content.draftMessage}`;
  }

  return {
    key: content.key,
    dependsOnKey: content.dependsOnKey,
    title: content.title,
    description: parts.join('\n\n'),
    category: content.category,
    priority: PRIORITY_MAP[content.priority],
    script,
    follow_up_key: content.followUpKey ?? null,
    follow_up_note: content.smsReminder ?? null,
  };
}

// ─── Deep escalation generators (faithful ports) ─────────────────────────────

export interface RCFlowDetail {
  issueType?: string;
  waitingFor?: string;
  duration?: string;
  reimburseIssue?: string;
}

export function generateDeepRCActions(
  issueType: string,
  detail: RCFlowDetail,
  ctx: AdaptiveContext
): GeneratedAction[] {
  const actions: GeneratedAction[] = [];
  const childName = ctx.childName || '[Child Name]';
  const parentName = ctx.parentName || '[Your Name]';

  if (issueType === 'slow_response') {
    let statutory = '';
    let law = '';
    switch (detail.waitingFor) {
      case 'intake': statutory = 'Intake within 15 working days'; law = 'W&I §4642'; break;
      case 'eligibility': statutory = 'Eligibility within 120 days'; law = 'W&I §4643'; break;
      case 'ipp': statutory = 'IPP within 60 days of eligibility'; law = 'W&I §4646'; break;
      case 'sc_response': statutory = 'SC should respond within 2 business days'; law = 'Lanterman Act duty of care'; break;
      case 'service_auth': statutory = 'Services within 60 days of IPP'; law = 'W&I §4648'; break;
      case 'reimbursement_wait': statutory = 'Claims processed within 60 days'; law = 'Title 17 CCR'; break;
    }

    const isViolation = ['3_4_weeks', '1_2_months', '3_plus_months'].includes(detail.duration ?? '');
    const durationLabel = (detail.duration ?? '').replace(/_/g, ' ');
    const waitLabel = (detail.waitingFor ?? '').replace(/_/g, ' ');

    actions.push(build({
      key: 'rc_deep_escalate', priority: 'urgent', category: 'regional_center',
      title: isViolation ? `⚠️ Timeline violation: ${statutory}` : `Follow up on ${waitLabel}`,
      subtitle: `You've been waiting ${durationLabel}. Statutory requirement: ${statutory} (${law}).${isViolation ? ' This may be a Lanterman Act violation.' : ''}`,
      agency: 'RC → DDS', deadline: 'This week',
      talkingPoints: [
        `I've been waiting ${durationLabel} for ${waitLabel}. The Lanterman Act requires: ${statutory}.`,
        "I'd like to speak with your supervisor.",
        "If this isn't resolved within 5 business days, I will file a 4731 complaint with DDS.",
      ],
      draftMessage: `Dear [RC Director],\n\nRe: Unacceptable delay in ${waitLabel} for ${childName}\n\nTimeline:\n- Request/referral date: [DATE]\n- Days elapsed: [NUMBER]\n- Statutory requirement: ${statutory}\n- Law: ${law}\n\n${isViolation ? 'This constitutes a violation of the Lanterman Act.\n\n' : ''}I request:\n1. Complete ${waitLabel} within 5 business days\n2. Written explanation for the delay\n3. Supervisor name and contact information\n\nIf unresolved, I will:\n- File 4731 complaint with DDS\n- Contact Disability Rights California (1-800-776-5746)\n- Request Fair Hearing\n\nSincerely,\n${parentName}`,
      documents: ['Copy of original request with date', 'Email/call log showing delays', 'Notes from all phone calls (date, time, name)'],
    }));

    if (isViolation) {
      actions.push(build({
        key: 'rc_deep_4731', dependsOnKey: 'rc_deep_escalate', priority: 'high', category: 'regional_center',
        title: 'File 4731 complaint with DDS',
        subtitle: 'DDS must investigate. RC has 20 business days to respond. Your most powerful tool.',
        agency: 'DDS', deadline: 'If not resolved in 5 days',
        draftMessage: `To: California DDS\nRe: 4731 Complaint\n\nAgainst: ${ctx.regionalCenterName || '[RC Name]'}\nConsumer: ${childName}\n\nViolation: ${statutory} (${law})\n\nFacts:\n- Request submitted: [DATE]\n- Status: Unresolved after ${durationLabel}\n- Contact attempts: [list dates/methods]\n- SC: [name, if assigned]\n\nRequested resolution:\n- Immediate ${waitLabel}\n- Written explanation\n- Corrective action\n\n${parentName}\n[Contact Info]`,
      }));
    }
  }

  if (issueType === 'reimbursement') {
    if (detail.reimburseIssue === 'denied') {
      actions.push(build({
        key: 'rc_reimburse_appeal', priority: 'urgent', category: 'regional_center',
        title: 'Appeal reimbursement denial',
        subtitle: 'Get denial in writing with specific reason. You can appeal through Fair Hearing.',
        agency: 'RC / OAH', deadline: 'This week',
        talkingPoints: [
          'I need the denial in writing with the specific reason.',
          'Is this service authorized in my IPP?',
          'I want to request a Fair Hearing.',
        ],
        draftMessage: `Dear [SC / RC Finance],\n\nI am appealing the denial of my reimbursement claim.\n\nClaim details:\n- Service: [describe]\n- Date(s): [dates]\n- Amount: $[amount]\n- Provider: [name]\n- IPP authorization: [reference section]\n\nPlease provide:\n1. Written denial with reason\n2. POS code and IPP authorization status\n3. Formal appeal instructions\n\nIf authorized in IPP, I expect reimbursement within 30 days.\n\n${parentName}`,
      }));
    }
    if (detail.reimburseIssue === 'waiting') {
      actions.push(build({
        key: 'rc_reimburse_followup', priority: 'high', category: 'regional_center',
        title: 'Follow up on pending reimbursement',
        subtitle: 'RC should process claims within 60 days. Escalate if longer.',
        agency: 'RC', deadline: 'Call this week',
        talkingPoints: [
          'I submitted a claim on [date]. Status?',
          'Who in finance can I contact directly?',
          "If not processed in 10 days, I'll file 4731.",
        ],
      }));
    }
    if (detail.reimburseIssue === 'how_to' || detail.reimburseIssue === 'didnt_know') {
      actions.push(build({
        key: 'rc_reimburse_guide', priority: 'standard', category: 'regional_center',
        title: 'How to submit RC reimbursement claims',
        subtitle: 'Step-by-step guide to getting reimbursed.',
        agency: 'RC',
        talkingPoints: [
          '1. Confirm service is in your IPP',
          '2. Get receipts from provider (date, service, NPI, amount)',
          "3. Fill out RC's claim form (ask SC)",
          '4. Attach: receipt + IPP page + proof of payment',
          '5. Submit to RC finance (email + keep copies)',
          '6. Follow up at 30 days. Escalate at 60.',
        ],
        documents: ['RC claim form (get from SC)', 'Original receipts', 'IPP authorization page', 'Proof of payment'],
      }));
    }
    if (detail.reimburseIssue === 'partial') {
      actions.push(build({
        key: 'rc_reimburse_partial', priority: 'high', category: 'regional_center',
        title: 'Dispute partial reimbursement',
        subtitle: 'Request written explanation of the payment calculation. RC must pay the rate authorized in your IPP.',
        agency: 'RC', deadline: 'This week',
        talkingPoints: [
          'I received $[amount] but submitted for $[amount]. Please explain the difference.',
          'What is the authorized rate for this service in our IPP?',
          'Is this the RC-approved vendor rate or a different calculation?',
        ],
      }));
    }
  }

  if (issueType === 'sc_quality') {
    actions.push(build({
      key: 'rc_change_sc', priority: 'high', category: 'regional_center',
      title: 'Request a new Service Coordinator',
      subtitle: 'You have the right to request a different SC. Ask for the program manager.',
      agency: 'RC', deadline: 'Call this week',
      talkingPoints: [
        "I'd like to request a change in SC.",
        'My concerns: [not returning calls, not informing us of services, not following through].',
        'Please assign a new SC within 10 business days.',
      ],
      draftMessage: `Dear [RC Program Manager],\n\nI request a new Service Coordinator for ${childName}.\n\nCurrent SC: [name]\nReasons:\n- [Not returning calls/emails]\n- [Not informing us of available services]\n- [Not following through on IPP]\n\nPlease assign new SC within 10 business days.\n\n${parentName}`,
    }));
  }

  if (issueType === 'service_denied') {
    actions.push(build({
      key: 'rc_service_appeal', priority: 'urgent', category: 'regional_center',
      title: '⚠️ Appeal RC service denial',
      subtitle: 'Demand written Notice of Action (NOA). 30 days to request Fair Hearing.',
      agency: 'RC / OAH', deadline: 'Within 30 days of NOA',
      talkingPoints: [
        'I need written NOA with specific reasons.',
        'Basis for denial? Is this a generic resource determination?',
        "I'm requesting a Fair Hearing.",
        'DRC: 1-800-776-5746',
      ],
      draftMessage: `Dear [RC Director],\n\nI formally appeal the denial of [service] for ${childName}.\n\nI request:\n1. Written NOA with reason\n2. Regulation/policy citation\n3. Fair Hearing procedures\n\nPer the Lanterman Act, ${childName} is entitled to services meeting individual needs per the IPP.\n\n${parentName}`,
    }));
  }

  return actions;
}

export function generateDeepSchoolActions(issueType: string, ctx: AdaptiveContext): GeneratedAction[] {
  const actions: GeneratedAction[] = [];
  const childName = ctx.childName || '[Child Name]';
  const parentName = ctx.parentName || '[Your Name]';

  if (issueType === 'eval_delay') {
    actions.push(build({
      key: 'school_eval_escalate', priority: 'urgent', category: 'iep',
      title: '⚠️ School evaluation past 60-day deadline',
      subtitle: 'CA Ed Code requires assessment plan within 15 days, evaluation within 60 days of consent. File CDE compliance complaint.',
      agency: 'CDE', deadline: 'This week',
      draftMessage: `Dear CDE Complaint Unit,\n\nComplaint against [District] for IDEA/Ed Code violation.\n\nI consented to evaluation on [DATE]. It has been [NUMBER] days. The 60-day statutory timeline has been exceeded.\n\nViolation: CA Ed Code §56302.1\n\nPlease investigate.\n\n${parentName}`,
    }));
  }
  if (issueType === 'iep_not_implemented') {
    actions.push(build({
      key: 'school_implement', priority: 'urgent', category: 'iep',
      title: '⚠️ IEP not being implemented — document and escalate',
      subtitle: 'School must implement IEP as written. Failure = denial of FAPE. File compliance complaint.',
      agency: 'School / CDE', deadline: 'This week',
      talkingPoints: [
        'Which specific IEP services/goals are not being implemented?',
        "I'm documenting this for a CDE compliance complaint.",
        'A failure to implement the IEP is a denial of FAPE under IDEA.',
      ],
      draftMessage: `Dear [Principal/SpEd Director],\n\nI am writing to formally notify you that ${childName}'s IEP is not being implemented as written.\n\nSpecifically:\n- [Service/accommodation] listed in IEP but not provided since [date]\n- [Goal area] with no progress monitoring\n\nI request:\n1. Immediate implementation of all IEP provisions\n2. Compensatory services for the period of non-implementation\n3. Written response within 10 days\n\nIf unresolved, I will file a CDE compliance complaint.\n\n${parentName}`,
    }));
  }
  if (issueType === 'iep_change') {
    actions.push(build({
      key: 'school_iep_amend', priority: 'high', category: 'iep',
      title: 'Request IEP amendment meeting',
      subtitle: "You can request an IEP meeting at ANY time — don't wait for the annual review.",
      agency: 'School District',
      talkingPoints: [
        "I'm requesting an IEP amendment meeting per IDEA.",
        'Specific areas I want to discuss: [goals, services, placement].',
        "I'd like to bring [advocate/support person].",
      ],
      draftMessage: `Dear [SpEd Director],\n\nI request an IEP amendment meeting for ${childName}.\n\nI want to discuss:\n- [Specific goals/services to change]\n- [Reason for change]\n\nPer IDEA, this meeting should be scheduled within 30 days.\n\n${parentName}`,
    }));
  }
  if (issueType === 'discipline') {
    actions.push(build({
      key: 'school_discipline', priority: 'urgent', category: 'iep',
      title: '⚠️ Know your rights: Suspension & Manifestation Determination',
      subtitle: 'After 10 cumulative days of removal, school must hold Manifestation Determination Review. If behavior is related to disability, student cannot be suspended.',
      agency: 'School District', deadline: 'Before next disciplinary action',
      talkingPoints: [
        'Has my child been removed for 10+ cumulative days this year?',
        "I'm requesting a Manifestation Determination Review.",
        'If behavior is a manifestation of disability, the school must conduct an FBA and implement a BIP, not punish.',
        'I want a copy of all discipline records for this school year.',
      ],
    }));
  }
  if (issueType === 'disagree_eval') {
    actions.push(build({
      key: 'school_iee', priority: 'high', category: 'iep',
      title: 'Request Independent Educational Evaluation (IEE) at district expense',
      subtitle: "You disagree with the school's eval? Request an IEE paid for by the district. They must either pay or file due process.",
      agency: 'School District',
      draftMessage: `Dear [SpEd Director],\n\nI disagree with the psychoeducational evaluation conducted by the district for ${childName} on [date].\n\nPer 34 CFR §300.502, I request an Independent Educational Evaluation at public expense.\n\nPlease provide:\n1. The district's criteria for IEEs\n2. A list of approved IEE providers\n3. Written response within 15 days\n\nThe district must either fund the IEE or file for due process.\n\n${parentName}`,
    }));
  }
  return actions;
}

export function generateDeepInsuranceActions(issueType: string, ctx: AdaptiveContext): GeneratedAction[] {
  const actions: GeneratedAction[] = [];
  const childName = ctx.childName || '[Child Name]';
  const parentName = ctx.parentName || '[Your Name]';
  const hasAutism = (ctx.diagnoses ?? []).some((d) => /autism|asd/i.test(d));

  if (issueType === 'auth_denied') {
    actions.push(build({
      key: 'ins_appeal_deep', priority: 'urgent', category: 'insurance',
      title: '⚠️ File formal insurance appeal + IMR',
      subtitle: 'Step 1: Internal appeal within 30 days. Step 2: If denied again, Independent Medical Review through DMHC (HMO) or CDI (PPO). ~60% overturned.',
      agency: 'Insurance → DMHC/CDI', deadline: 'Within 30 days of denial',
      talkingPoints: [
        "I'm formally appealing under my plan's appeal process.",
        'DMHC: 1-888-466-2219 (HMO) | CDI: 1-800-927-4357 (PPO)',
        'Is my plan HMO or PPO? This determines which regulator handles IMR.',
      ],
      draftMessage: `Dear [Insurance] Appeals Dept,\n\nI appeal the denial of [service] for ${childName}, Member ID [number].\n\nDiagnosis: [code]. Medical necessity documented by [provider].\n\n${hasAutism ? 'CA SB 946 mandates behavioral health treatment coverage for autism.\n\n' : ''}If this internal appeal is denied, I will request Independent Medical Review.\n\nAttached: evaluation, referral, denial letter.\n\n${parentName}`,
    }));
  }
  if (issueType === 'low_hours') {
    actions.push(build({
      key: 'ins_hours_appeal', priority: 'high', category: 'insurance',
      title: 'Appeal for more authorized hours',
      subtitle: 'Get your treating provider to write a medical necessity letter documenting why more hours are needed.',
      agency: 'Insurance',
      talkingPoints: [
        "My child's provider recommends [X] hours but only [Y] were approved.",
        'I need a peer-to-peer review between my provider and your medical director.',
        'Please explain the clinical basis for the hour limitation.',
      ],
    }));
  }
  if (issueType === 'no_providers') {
    actions.push(build({
      key: 'ins_network', priority: 'high', category: 'insurance',
      title: 'Demand out-of-network authorization',
      subtitle: 'If no in-network providers within reasonable distance/wait time, insurance MUST authorize out-of-network at in-network rates.',
      agency: 'Insurance / DMHC',
      talkingPoints: [
        'There are no in-network providers accepting new patients within [radius/wait].',
        "I'm requesting out-of-network authorization at in-network rates per CA network adequacy requirements.",
        'DMHC timely access standards: 15 business days for specialist, 10 for non-urgent.',
      ],
    }));
  }
  if (issueType === 'billing') {
    actions.push(build({
      key: 'ins_billing', priority: 'standard', category: 'insurance',
      title: 'Dispute billing issue',
      subtitle: 'Request itemized statement. Check EOB vs provider bill. File grievance if unresolved.',
      agency: 'Insurance',
      talkingPoints: [
        'I need an itemized statement for [date of service].',
        'My EOB shows [amount] but I was billed [amount].',
        "I'm filing a grievance if this isn't corrected within 30 days.",
      ],
    }));
  }
  return actions;
}

// ─── Completion check-in follow-up actions (port of getFollowUpActions) ──────

export function getFollowUpActions(key: string, answer: string, ctx: AdaptiveContext): GeneratedAction[] {
  const a: GeneratedAction[] = [];
  const childName = ctx.childName || '[Child Name]';
  const parentName = ctx.parentName || '[Your Name]';
  const dxName = (ctx.diagnoses ?? []).join(', ');
  const suspectedOnly = (ctx.diagnoses ?? []).every((d) => /suspected/i.test(d)) || (ctx.diagnoses ?? []).length === 0;
  const hasAutism = (ctx.diagnoses ?? []).some((d) => /autism|asd/i.test(d));

  if (key === 'rc_done' && answer === 'voicemail') {
    a.push(build({
      key: 'rc_retry', priority: 'urgent', category: 'regional_center',
      title: 'Call RC again tomorrow at 8:30am',
      subtitle: "Don't wait for callback. Lines are clearest first thing in the morning.",
      agency: 'RC', deadline: 'Tomorrow 8:30am',
      talkingPoints: ["I called yesterday about referring my child. I'd like to confirm the referral is in process and get a confirmation number."],
      smsReminder: 'Tomorrow 8:25am: Call RC. Ask for intake coordinator name + confirmation #.',
      followUpKey: 'rc_done',
    }));
  }
  if (key === 'rc_done' && answer === 'busy') {
    a.push(build({
      key: 'rc_email', priority: 'urgent', category: 'regional_center',
      title: 'Email RC intake directly',
      subtitle: 'Phone lines overloaded. Email creates a paper trail and triggers the 15-day deadline.',
      agency: 'RC', deadline: 'Send today',
      draftMessage: `Subject: Referral Request — ${childName}, DOB [date]\n\nDear Intake Team,\n\nI am requesting an intake evaluation for my child, ${childName}, who has ${suspectedOnly ? 'developmental concerns' : `been diagnosed with ${dxName}`}.\n\nI have been unable to reach intake by phone. Per the Lanterman Act, intake should be scheduled within 15 days of referral.\n\nPhone: [your number]\nEmail: ${ctx.email || '[your email]'}\n\nThank you,\n${parentName}`,
      smsReminder: 'Today: Email RC intake. Attach eval report. Reference 15-day Lanterman deadline.',
    }));
  }
  if (key === 'ins_done' && answer === 'denied') {
    a.push(build({
      key: 'ins_appeal', priority: 'urgent', category: 'insurance',
      title: '⚠️ File insurance appeal immediately',
      subtitle: 'Denials are common and often overturned. DMHC overturns ~60% on IMR.',
      whyMatters: "Insurance companies frequently deny first requests. Appeals are often successful — don't give up.",
      agency: 'Insurance / DMHC', deadline: 'Within 30 days of denial',
      draftMessage: `Dear [Insurance] Appeals Department,\n\nI formally appeal the denial of [therapy] for ${childName}, Member ID [number].\n\nDiagnosis: ${hasAutism ? 'F84.0 (ASD)' : '[ICD code]'}\n\n${hasAutism ? 'CA SB 946 mandates behavioral health coverage for autism.\n\n' : ''}If denied, I will request Independent Medical Review through DMHC.\n\nAttached: evaluation, referral, denial letter\n\nSincerely,\n${parentName}`,
      smsReminder: 'Today: File appeal. Attach eval + doctor letter. 30-day deadline.',
    }));
  }
  if (key === 'school_eval_done' && answer === 'refused') {
    a.push(build({
      key: 'school_cde', priority: 'urgent', category: 'iep',
      title: '⚠️ School refused — file CDE complaint',
      subtitle: "Schools cannot refuse a parent's written evaluation request. This violates IDEA.",
      whyMatters: 'CDE complaint is free, investigated within 60 days, and can order immediate evaluation.',
      agency: 'CDE', deadline: 'File this week',
      draftMessage: `Dear CDE Complaint Unit,\n\nCompliance complaint against [School District] for IDEA violation.\n\nOn [date], I submitted a written request for evaluation for ${childName}. The district has refused.\n\nViolations:\n- 34 CFR §300.301 (right to request evaluation)\n- CA Ed Code §56321 (15-day assessment plan)\n\nI request CDE order immediate evaluation + compensatory services.\n\nAttached: copy of original request with date\n\n${parentName}`,
      smsReminder: 'This week: File CDE complaint. CDE: (916) 319-0800.',
    }));
  }
  if (key === 'ped_done' && answer === 'refused') {
    a.push(build({
      key: 'ped_new', priority: 'high', category: 'medical',
      title: 'Find a new pediatrician or go direct to specialist',
      subtitle: 'Some pediatricians are gatekeepers. You can self-refer to many therapy providers.',
      agency: 'Medical', deadline: 'This week',
    }));
  }
  return a;
}

// ─── Wizard driver (port of homeFrustrationStep's state machine) ─────────────

export interface FrustrationFlowState {
  target: FrustrationTarget;
  step: 'issue_type' | 'slow_what' | 'slow_duration' | 'reimburse_issue';
  detail: RCFlowDetail;
}

export type FrustrationAdvance =
  | { kind: 'step'; state: FrustrationFlowState; step: FlowStep }
  | { kind: 'actions'; actions: GeneratedAction[] }
  | { kind: 'navigate'; screen: 'Reimbursables' };

export function startFrustrationFlow(target: FrustrationTarget): { state: FrustrationFlowState; step: FlowStep } {
  return {
    state: { target, step: 'issue_type', detail: {} },
    step: FRUSTRATION_DEEP[`${target}_issue_type`],
  };
}

export function advanceFrustrationFlow(
  state: FrustrationFlowState,
  value: string,
  ctx: AdaptiveContext
): FrustrationAdvance {
  const { target } = state;

  if (target === 'rc') {
    if (state.step === 'issue_type') {
      if (value === 'what_covered') return { kind: 'navigate', screen: 'Reimbursables' };
      if (value === 'slow_response') {
        return {
          kind: 'step',
          state: { ...state, step: 'slow_what', detail: { issueType: value } },
          step: FRUSTRATION_DEEP.rc_slow_what,
        };
      }
      if (value === 'reimbursement') {
        return {
          kind: 'step',
          state: { ...state, step: 'reimburse_issue', detail: { issueType: value } },
          step: FRUSTRATION_DEEP.rc_reimburse_issue,
        };
      }
      return { kind: 'actions', actions: generateDeepRCActions(value, { issueType: value }, ctx) };
    }
    if (state.step === 'slow_what') {
      return {
        kind: 'step',
        state: { ...state, step: 'slow_duration', detail: { ...state.detail, waitingFor: value } },
        step: FRUSTRATION_DEEP.rc_slow_duration,
      };
    }
    if (state.step === 'slow_duration') {
      const detail = { ...state.detail, duration: value };
      return { kind: 'actions', actions: generateDeepRCActions('slow_response', detail, ctx) };
    }
    if (state.step === 'reimburse_issue') {
      const detail = { ...state.detail, reimburseIssue: value };
      return { kind: 'actions', actions: generateDeepRCActions('reimbursement', detail, ctx) };
    }
  }
  if (target === 'school') {
    return { kind: 'actions', actions: generateDeepSchoolActions(value, ctx) };
  }
  return { kind: 'actions', actions: generateDeepInsuranceActions(value, ctx) };
}

// ─── Insertion with dependency wiring ────────────────────────────────────────

/**
 * Insert generated actions for a family, wiring depends_on between siblings
 * (an action whose dependsOnKey names another action in the same batch gets
 * that action's new row id). Returns the number inserted, -1 on failure.
 */
export async function insertGeneratedActions(
  familyId: string,
  childId: string | null,
  actions: GeneratedAction[]
): Promise<number> {
  try {
    if (actions.length === 0) return 0;
    // Deferred import keeps this module free of react-native transitive
    // imports so the pure generators stay unit-testable under node
    const { supabase } = await import('@/lib/supabase');

    // Insert independents first so dependents can reference their ids
    const independents = actions.filter((a) => !a.dependsOnKey);
    const dependents = actions.filter((a) => a.dependsOnKey);

    const toRow = (a: GeneratedAction, depends_on: string | null) => ({
      family_id: familyId,
      child_id: childId,
      title: a.title,
      description: a.description,
      category: a.category,
      priority: a.priority,
      script: a.script,
      follow_up_key: a.follow_up_key,
      follow_up_note: a.follow_up_note,
      depends_on,
      source: 'system' as const,
      status: 'not_started' as const,
    });

    const { data: inserted, error } = await supabase
      .from('actions')
      .insert(independents.map((a) => toRow(a, null)))
      .select('id, title');
    if (error) throw error;

    const idByKey = new Map<string, string>();
    independents.forEach((a) => {
      const row = (inserted ?? []).find((r: { title: string }) => r.title === a.title);
      if (row) idByKey.set(a.key, (row as { id: string }).id);
    });

    if (dependents.length > 0) {
      const { error: depError } = await supabase
        .from('actions')
        .insert(dependents.map((a) => toRow(a, idByKey.get(a.dependsOnKey!) ?? null)));
      if (depError) throw depError;
    }
    return actions.length;
  } catch (err) {
    console.warn('Escalation action insert failed:', err);
    return -1;
  }
}
