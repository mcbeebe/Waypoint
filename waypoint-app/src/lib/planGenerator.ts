/**
 * Starter plan generator — TypeScript port of the GAS MVP's generateRichPlan
 * (gas-mvp/Index.html). Turns onboarding intake answers (diagnoses, age,
 * Regional Center status, IEP status, insurance) into a personalized set of
 * starter actions, seeded into the Supabase `actions` table with
 * source: 'system' when onboarding completes.
 *
 * Field mapping from the GAS action shape onto the `actions` schema:
 * - title                                → title
 * - subtitle + whyMatters + documents
 *   + eligibility + insiderTip          → description
 * - talkingPoints + draftMessage         → script
 * - steps (string[])                     → steps ([{step, done}])
 * - urgent / high / standard             → priority urgent / high / medium
 * - deadline (relative phrase)           → due_date (computed) + phrase in description
 * - smsReminder                          → follow_up_note
 */

import type { ActionCategory, ActionPriority, ActionStep } from '@/types/database';
import { SSI_FBR_MONTHLY, SSI_YEAR } from '@/data/benefitFigures';
import { stableKeyFor } from '@/lib/actionKeys';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlanIntake {
  /** Diagnosis keys from DiagnosisSelector (e.g. 'autism', 'delay', 'suspected') */
  diagnoses: string[];
  birthday: Date | null;
  /** 'unknown' | 'known' | 'applied' | 'active' */
  rcStatus: string;
  /** 'no' | 'unknown' | 'eval_done' | 'active' | 'na' */
  iepStatus: string;
  /** 'private' | 'medicaid' | 'both' | 'none' */
  insurance: string;
  childName?: string;
  parentName?: string;
  zipCode?: string;
}

/** A generated action, ready to insert once family_id/child_id/source are added */
export interface StarterAction {
  title: string;
  description: string;
  category: ActionCategory;
  priority: ActionPriority;
  script: string | null;
  steps: ActionStep[] | null;
  due_date: string | null;
  follow_up_note: string | null;
  /** FOLLOWUPS check-in set (adaptiveEngine) shown when this action completes */
  follow_up_key: string | null;
}

type AgeBand = '0-2' | '3-5' | '6-12' | '13-17';

interface ActionContent {
  title: string;
  subtitle: string;
  whyMatters: string;
  category: ActionCategory;
  deadlineLabel?: string;
  dueInDays?: number;
  talkingPoints?: string[];
  draftMessage?: string;
  steps?: string[];
  documents?: string[];
  eligibility?: string;
  insiderTip?: string;
  smsReminder?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Same banding as OnboardingFlow's getAge(): 0-2, 3-5, 6-12, 13-17 */
export function ageBandFromBirthday(birthday: Date): AgeBand {
  const now = new Date();
  let years = now.getFullYear() - birthday.getFullYear();
  const months = now.getMonth() - birthday.getMonth();
  if (months < 0) years--;
  if (years >= 13) return '13-17';
  if (years >= 6) return '6-12';
  if (years >= 3) return '3-5';
  return '0-2';
}

function ageYearsFromBirthday(birthday: Date): number {
  const now = new Date();
  let years = now.getFullYear() - birthday.getFullYear();
  const months = now.getMonth() - birthday.getMonth();
  if (months < 0 || (months === 0 && now.getDate() < birthday.getDate())) years--;
  return Math.max(0, years);
}

/** YYYY-MM-DD in local time, `days` from today */
function isoDateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Honest parent-effort estimates per action, keyed by STABLE ACTION KEY
 * (src/lib/actionKeys.ts), surfaced in the detail view so families know the
 * size of the lift before they start (UX 4).
 */
const EFFORT_BY_KEY: Record<string, string> = {
  rc_early_start_referral: 'One 15–20 min phone call to start; intake visit comes later',
  rc_start_referral: 'One 15–20 min phone call, plus ~1 hour gathering documents',
  rc_follow_up_application: 'One 10–15 min phone call',
  sdp_ask_in_writing: '~20 min: review and send the pre-drafted letter',
  dx_formal_evaluation: '~1 hour total: one letter and two phone calls',
  iep_request_meeting: '~30 min to personalize and send the letter',
  iep_request_evaluation: '~30 min to personalize and send the letter',
  therapy_pediatrician_referral: "One 10–15 min call to your pediatrician's office",
  insurance_verify_coverage: 'One 30–45 min phone call (have your insurance card ready)',
  medical_apply: '~45–60 min online application at BenefitsCal.com',
  ssi_apply: 'The biggest lift: 2–4 hours spread over several days (call + forms)',
  ihss_apply: '~1 hour application, then one in-home assessment visit',
  iep_504_request: '~30 min to personalize and send the letter',
  ccs_apply: '~30 min: one call to your doctor for the referral',
  ccs_down_syndrome: '~30–45 min of calls to RC and your pediatrician',
  deaf_hoh_services: '~30 min: written request plus a call to the school',
  vision_services: '~30 min: written request plus a call to the school',
  tbi_coordinate: '~45 min of calls across school and RC',
  ermhs_request: '~30 min: written request to the school',
  sli_iep_evaluation: '~30 min: written request to the school',
  dor_apply: '~45 min application at dor.ca.gov',
  calable_setup: '~30 min online at CalABLE.ca.gov',
};

/**
 * Completion check-in sets by STABLE ACTION KEY (GAS followUpKey). When one of
 * these actions is completed, the Tracker asks "how did it go?" and blocker
 * answers generate the next escalation steps (see lib/adaptiveEngine.ts).
 */
const FOLLOW_UP_KEY_BY_KEY: Record<string, string> = {
  rc_early_start_referral: 'rc_done',
  rc_start_referral: 'rc_done',
  iep_request_meeting: 'iep_done',
  iep_request_evaluation: 'school_eval_done',
  therapy_pediatrician_referral: 'ped_done',
  insurance_verify_coverage: 'ins_done',
};

function buildAction(content: ActionContent, priority: ActionPriority): StarterAction {
  // Stable key (C-12 step 1): the ONE title lookup — every other table keys
  // on the stable key, so retitling or localizing an action cannot silently
  // detach its effort estimate or follow-up check-in.
  const stableKey = stableKeyFor(content.title);
  const parts: string[] = [content.subtitle];
  if (content.deadlineLabel) parts.push(`⏰ Timeline: ${content.deadlineLabel}`);
  const effort = stableKey ? EFFORT_BY_KEY[stableKey] : undefined;
  if (effort) parts.push(`🕒 Effort: ${effort}`);
  parts.push(`Why this matters: ${content.whyMatters}`);
  if (content.documents && content.documents.length > 0) {
    parts.push('Documents to gather:\n' + content.documents.map(d => `• ${d}`).join('\n'));
  }
  if (content.eligibility) parts.push(`Do I qualify?\n${content.eligibility}`);
  if (content.insiderTip) parts.push(`💡 Insider tip: ${content.insiderTip}`);

  let script: string | null = null;
  if (content.talkingPoints && content.talkingPoints.length > 0) {
    script = 'What to say:\n' + content.talkingPoints.map(t => `• ${t}`).join('\n');
  }
  if (content.draftMessage) {
    script = (script ? `${script}\n\n` : '') + `Draft letter:\n${content.draftMessage}`;
  }

  return {
    title: content.title,
    description: parts.join('\n\n'),
    category: content.category,
    priority,
    script,
    steps: content.steps ? content.steps.map(s => ({ step: s, done: false })) : null,
    due_date: content.dueInDays != null ? isoDateInDays(content.dueInDays) : null,
    follow_up_note: content.smsReminder ?? null,
    follow_up_key: (stableKey ? FOLLOW_UP_KEY_BY_KEY[stableKey] : undefined) ?? null,
  };
}

const DX_NAMES: Record<string, string> = {
  autism: 'autism (ASD)',
  pda: 'PDA (pathological demand avoidance)',
  ptsd: 'PTSD / trauma',
  delay: 'developmental delays',
  id: 'intellectual disability',
  cp: 'cerebral palsy',
  sld: 'specific learning disability',
  adhd: 'ADHD',
  suspected: 'suspected developmental delays',
  down: 'Down syndrome',
  epilepsy: 'epilepsy',
  sli: 'speech/language impairment',
  dyslexia: 'dyslexia/dyscalculia',
  md: 'muscular dystrophy',
  tbi: 'traumatic brain injury',
  deaf: 'deaf/hard of hearing',
  blind: 'blind/visually impaired',
  multiple: 'multiple disabilities',
  ed: 'emotional disturbance',
  ohi: 'other health impairment',
  sensory: 'sensory processing disorder',
  genetic: 'genetic condition',
};

// ─── Reseed after profile changes ────────────────────────────────────────────

/**
 * Regenerate the system starter plan after intake answers change (RC status,
 * IEP status, diagnoses, insurance) — mirrors the GAS MVP, which rebuilt the
 * plan on every profile save. Untouched system actions (still not_started)
 * are replaced by the fresh plan; anything the family has started, completed,
 * or dismissed is preserved, and fresh duplicates of preserved titles are
 * skipped.
 *
 * Returns the number of actions inserted, or -1 on failure (non-fatal).
 */
export async function reseedStarterPlan(
  familyId: string,
  childId: string,
  intake: PlanIntake
): Promise<number> {
  try {
    const fresh = generateStarterPlan(intake);

    // Deferred import keeps this module importable in vitest (the supabase
    // client pulls in react-native, whose Flow syntax vitest can't parse)
    const { supabase } = await import('@/lib/supabase');

    const { data: existing, error: fetchError } = await supabase
      .from('actions')
      .select('id, title, status')
      .eq('family_id', familyId)
      .eq('source', 'system');
    if (fetchError) throw fetchError;

    const rows = existing ?? [];
    const keepTitles = new Set(rows.filter(a => a.status !== 'not_started').map(a => a.title));
    const removeIds = rows.filter(a => a.status === 'not_started').map(a => a.id);

    if (removeIds.length > 0) {
      const { error: deleteError } = await supabase.from('actions').delete().in('id', removeIds);
      if (deleteError) throw deleteError;
    }

    const inserts = fresh
      .filter(a => !keepTitles.has(a.title))
      .map(a => ({ ...a, family_id: familyId, child_id: childId, source: 'system' as const }));

    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from('actions').insert(inserts);
      if (insertError) throw insertError;
    }
    return inserts.length;
  } catch (err) {
    console.warn('Starter plan reseed failed:', err);
    return -1;
  }
}

// ─── Generator ───────────────────────────────────────────────────────────────

export function generateStarterPlan(intake: PlanIntake): StarterAction[] {
  const diagnosisArr = intake.diagnoses ?? [];
  const rcStatus = intake.rcStatus;
  const iepStatus = intake.iepStatus;
  const insurance = intake.insurance;
  const childName = intake.childName || "[Child's Name]";
  const parentName = intake.parentName || '[Your Name]';
  const zipCode = intake.zipCode || 'my ZIP code';

  const age: AgeBand | '' = intake.birthday ? ageBandFromBirthday(intake.birthday) : '';
  const ageYears = intake.birthday ? String(ageYearsFromBirthday(intake.birthday)) : '[age]';

  // PDA is an autism-spectrum profile — asking for 'autism' also matches 'pda'
  // so PDA families get the autism plan content (SB 946, ABA referrals, etc.)
  const hasDx = (v: string) =>
    diagnosisArr.includes(v) || (v === 'autism' && diagnosisArr.includes('pda'));

  // RC eligibility: YES for the Lanterman qualifying conditions + related dx;
  // CONDITIONAL for others. 'genetic' (new in the app's selector) is treated as
  // conditional — many genetic conditions qualify as "closely related to ID."
  const rcYes =
    hasDx('autism') || hasDx('delay') || hasDx('id') || hasDx('cp') || hasDx('epilepsy') ||
    hasDx('down') || hasDx('md') || hasDx('tbi') || hasDx('multiple') || hasDx('suspected');
  const rcConditional =
    hasDx('deaf') || hasDx('blind') || hasDx('ed') || hasDx('ohi') || hasDx('sli') || hasDx('genetic');
  const rcE = rcYes || rcConditional;

  const needsRC = rcE && !['active', 'applied'].includes(rcStatus);
  // Note: the GAS original also excluded 'eval_done' here, which made its
  // "request IEP meeting" branch (gated on eval_done inside this block)
  // unreachable. Only an active IEP means no school action is needed.
  const needsIEP = iepStatus !== 'active' && age !== '0-2';
  const isES = age === '0-2';
  const isTr = age === '13-17';
  const needsMC = ['private', 'none'].includes(insurance);
  const needsDx = hasDx('suspected') && diagnosisArr.length === 1;

  const dxName = diagnosisArr.map(d => DX_NAMES[d] || d).join(', ');

  const actions: StarterAction[] = [];

  // ── RC / Early Start ──────────────────────────────────────────────────────
  if (isES && rcE && rcStatus !== 'active') {
    actions.push(buildAction({
      category: 'regional_center',
      title: 'Call Regional Center for Early Start referral',
      subtitle: 'Early Start serves ages 0–3 with a LOWER eligibility bar — no diagnosis needed. Your child gets an IFSP (plan of services) within 45 days of referral.',
      whyMatters: 'Research is unambiguous: early intervention before age 3 produces the best long-term outcomes across speech, behavior, and cognition. Each month of delay matters. Early Start is free, requires NO diagnosis, and opens the door to speech therapy, OT, behavioral support, and parent training — all at no cost.',
      deadlineLabel: 'Call this week',
      dueInDays: 7,
      talkingPoints: [
        `Hi, I'd like to refer my child for Early Start services. They are under 3 and I have concerns about ${needsDx ? 'developmental delays' : dxName}.`,
        "I understand anyone can make this referral — I'm self-referring as the parent.",
        'What documents do I need to bring to the intake appointment?',
        'The Lanterman Act requires an IFSP within 45 days — I want to make sure we stay on track.',
        'Will my child receive a multidisciplinary evaluation as part of intake?',
        'Can services begin while the evaluation is still in progress?',
      ],
      steps: [
        "Call your local RC and say 'I want to refer my child for Early Start.'",
        "They'll schedule an intake — this must happen within 45 days.",
        'A team evaluates your child across all developmental areas (speech, motor, cognitive, social).',
        "Within 45 days, you'll have an IFSP meeting to set goals and authorize services.",
        'Services can include speech therapy, OT, ABA, parent training, and more — all FREE.',
        'You are a full member of the IFSP team. Nothing is decided without you.',
      ],
      documents: [
        'Birth certificate',
        'Medical records or pediatrician notes',
        'Any existing evaluations (not required)',
        'Insurance card (RC is payer of last resort — they bill insurance first)',
      ],
      smsReminder: 'Tomorrow 9am: Call RC for Early Start. 45-day timeline. No diagnosis needed.',
      insiderTip: "You do NOT need a doctor's referral. Anyone — parent, grandparent, daycare worker — can refer a child. If RC tries to delay, cite W&I Code §95014. Services should start as soon as the IFSP is signed.",
    }, 'urgent'));
  } else if (needsRC && !isES) {
    actions.push(buildAction({
      category: 'regional_center',
      title: 'Call Regional Center to start your referral',
      subtitle: `Your child's ${needsDx ? 'suspected ' : ''}diagnosis qualifies for Lanterman Act services. RC provides a free evaluation, assigns a Service Coordinator, and funds services that insurance and school don't cover.`,
      whyMatters: "Regional Center is often the single most important connection a family makes. Your Service Coordinator becomes your long-term guide through the system. RC funds therapies, respite care, diapers, assistive technology, camp, and more — services that insurance won't touch. Under the Lanterman Act, these services are an ENTITLEMENT, not a privilege.",
      deadlineLabel: 'Call this week',
      dueInDays: 7,
      talkingPoints: [
        `Hi, I'd like to make a referral for my child who ${needsDx ? 'I believe has developmental delays' : `was diagnosed with ${dxName}`}.`,
        "I'd like to schedule an intake appointment. I understand it should happen within 15 working days.",
        'What documents should I bring to intake?',
        'How long does the eligibility determination take? I understand the Lanterman Act allows up to 120 days.',
        'Will my child be assigned a Service Coordinator at intake?',
        'Can you tell me about the IPP process and what services are available?',
      ],
      steps: [
        "Call your local RC (find number at dds.ca.gov/rc) and say 'I want to refer my child.'",
        'RC must schedule intake within 15 working days (Lanterman Act §4642).',
        'Bring ALL documents — diagnosis, medical records, school records, insurance.',
        'At intake, they begin a multidisciplinary assessment across all areas of need.',
        'Eligibility determination must happen within 120 days.',
        "If eligible, you'll have an IPP (Individual Program Plan) meeting within 60 days — this is where services are authorized.",
        'Your Service Coordinator is your ongoing point of contact. Build that relationship.',
      ],
      documents: needsDx
        ? ['Birth certificate', 'CA residency proof (utility bill, lease)', 'Medical records', 'Written list of your concerns', 'Insurance card']
        : ['Diagnosis report (most important document)', 'Birth certificate', 'CA residency proof (utility bill, lease)', 'Medical records', 'School records / IEP if available', 'Insurance card'],
      smsReminder: 'Tomorrow 9am: Call RC. Have documents ready. 15-working-day intake deadline.',
      insiderTip: "You can self-refer — no doctor needed. If RC says there's a 'waitlist,' push back: under Lanterman, there are NO waitlists for intake. If they miss the 15-day timeline, document it and file a 4731 complaint. Ask for your SC's supervisor's name upfront — you may need it later.",
    }, 'urgent'));
  } else if (rcStatus === 'applied') {
    actions.push(buildAction({
      category: 'regional_center',
      title: 'Follow up on RC application status',
      subtitle: 'Check where you are in the process. The Lanterman Act sets firm timelines: intake within 15 working days, eligibility within 120 days, IPP within 60 days of eligibility.',
      whyMatters: 'These timelines are statutory — not suggestions. If RC is slow, you have the legal right to escalate. Many families wait quietly, not realizing the law is on their side. A simple follow-up call showing you know the timelines often speeds things up dramatically.',
      deadlineLabel: 'Call this week',
      dueInDays: 7,
      talkingPoints: [
        "Hi, I'm calling to follow up on my child's referral. I submitted it on [date].",
        'Has the intake been scheduled yet? Under Lanterman Act §4642, intake should happen within 15 working days.',
        "Who is our assigned Service Coordinator? I'd like their direct contact information.",
        "What is the expected timeline for eligibility determination? I understand it's 120 days maximum.",
        'Are there any documents I can provide to speed up the process?',
        "If timelines are not being met, I'd like to understand my options for escalating.",
      ],
      steps: [
        'Call RC and reference your referral date — be specific.',
        "Ask for your Service Coordinator's name and direct number.",
        'If past 15 working days with no intake: ask for the supervisor.',
        'Document every call: date, time, who you spoke with, what was said.',
        'If still no progress, file a 4731 complaint (your right under W&I Code §4731).',
        'Consider requesting a Fair Hearing if services are being delayed (§4710.5).',
      ],
      documents: ['Your referral date (check email/records)', 'Any correspondence from RC', 'Notes from previous calls'],
      smsReminder: 'Tomorrow: Call RC. Reference referral date and 15-day rule.',
      insiderTip: "Keep a 'communication log' — a simple notebook with date, who you called, what they said. This becomes powerful evidence if you need to file a complaint. If you feel stuck, call Disability Rights CA (1-800-776-5746) for free advocacy help.",
    }, 'high'));
  } else if (rcStatus === 'active') {
    // The fork most families are never told about: nearly every consumer
    // qualifies for Self-Determination, ~1.5% are enrolled. Surfacing it in
    // the starter plan is a core free-tier promise (PRD W-G).
    actions.push(buildAction({
      category: 'regional_center',
      title: 'Ask about Self-Determination in writing',
      subtitle: "Your child is a Regional Center consumer — which means a second path exists: the Self-Determination Program turns services into an annual budget your family directs. Most families are never told. One written request starts the conversation.",
      whyMatters: "On the traditional path, the Regional Center buys services one authorization at a time and you wait on each decision. Under SDP (W&I §4685.8), your child's services become an annual budget you control — pick providers, set schedules, reallocate as needs change. Nearly every consumer qualifies, yet only about 1.5% are enrolled, largely because families don't know to ask. Your starting budget is built from the last 12 months of authorized services PLUS unmet needs documented in the IPP — so asking early, and documenting needs before converting, directly protects your budget.",
      deadlineLabel: 'Send this month',
      dueInDays: 21,
      talkingPoints: [
        'I want to learn about the Self-Determination Program for my child.',
        'Please refer us to the next SDP orientation — I understand orientation is the first required step.',
        "Please send copies of all of my child's service authorizations from the last 12 months — I understand the individual budget is based on them.",
        'If there are needs we should document in the IPP first, I want to schedule an IPP review meeting (within 30 days of my request).',
      ],
      steps: [
        'Send the SDP information request letter (Waypoint drafts it for you).',
        'Attend the SDP orientation — required before enrolling, offered regularly by every RC.',
        "Review your child's authorization history when it arrives — this is the budget basis.",
        'Before converting: get any unmet needs written into the IPP via a review meeting (30-day clock).',
        'Decide with real numbers — Waypoint\'s "Which path fits us?" tool walks you through the trade-offs.',
      ],
      documents: ["Your child's current IPP (request a copy if you don't have one)", 'Any denials or unmet-needs notes — these belong in the IPP before converting'],
      smsReminder: 'This week: send the SDP info request letter. Budget basis = last 12 months of authorizations.',
      insiderTip: "Don't convert before documenting. The budget formula anchors to the PRIOR 12 months of authorized services plus documented unmet needs — families who switch first and document later lock in smaller budgets. Ask for the orientation AND your authorization records in the same letter, then use the 30-day IPP meeting rule to get missing needs on paper.",
    }, 'high'));
  }

  // ── Diagnosis ─────────────────────────────────────────────────────────────
  if (needsDx && !isES) {
    actions.push(buildAction({
      category: 'medical',
      title: 'Get a formal evaluation for your child',
      subtitle: "There are multiple FREE paths to a diagnosis: school district evaluation, Regional Center assessment, or private specialist with insurance. Run them in parallel — don't wait for one before starting another.",
      whyMatters: "A formal diagnosis unlocks nearly every service: Regional Center eligibility, IEP qualification, insurance-covered therapy (especially ABA under SB 946), SSI, IHSS, and more. Without it, you're fighting with one hand tied behind your back. The good news: you don't need to pay — school and RC evaluations are completely free.",
      deadlineLabel: 'Start this week',
      dueInDays: 7,
      talkingPoints: [
        "To pediatrician: 'I need a referral for a comprehensive developmental evaluation. Can you refer to a developmental pediatrician or neuropsychologist?'",
        "To school district: 'I am requesting a comprehensive special education evaluation for my child in ALL areas of suspected disability. This is a formal written request.'",
        "To Regional Center: 'I'd like to self-refer my child for an assessment. I have concerns about developmental delays.'",
        "To insurance: 'I need authorization for a developmental/neuropsychological evaluation. What providers are in-network?'",
      ],
      steps: [
        "Start ALL three tracks simultaneously — don't wait for one to finish.",
        'SCHOOL: Send a written request (email + certified mail) to the Special Ed Director. School has 15 days to respond with an assessment plan.',
        'REGIONAL CENTER: Call and self-refer. RC intake must happen within 15 working days.',
        'PRIVATE: Ask pediatrician for a referral to a developmental pediatrician, child neurologist, or licensed psychologist. Call insurance to confirm coverage.',
        'Whichever evaluation completes first, use that report to accelerate the others.',
        "Keep copies of EVERY evaluation — you'll need them for IEP, RC, insurance, and SSI.",
      ],
      documents: [
        'Written log of specific concerns (dates and examples)',
        'School report cards and teacher observations',
        "Developmental milestones record (what they can/can't do)",
        'Medical records from pediatrician',
        'Any previous screenings (ASQ, M-CHAT, etc.)',
      ],
      smsReminder: 'This week: Request eval from school AND call RC. Both free. Dual-track is fastest.',
      insiderTip: 'The #1 mistake families make is going one path at a time. Run all three simultaneously — school, RC, and private. Whoever finishes first, that report helps the others. School evaluations focus on educational impact; RC evaluations focus on developmental disability; private evaluations are often the most thorough. You want all three perspectives.',
    }, 'urgent'));
  }

  // ── School / IEP ──────────────────────────────────────────────────────────
  if (needsIEP && iepStatus !== 'na') {
    if (iepStatus === 'eval_done') {
      actions.push(buildAction({
        category: 'iep',
        title: 'Send written request for IEP meeting',
        subtitle: 'Your child has been evaluated — the evaluation and IEP meeting share one 60-day clock that started when you signed the assessment consent (CA Ed Code §56344) — the meeting should already be scheduled. The IEP is a legally binding document that guarantees services.',
        whyMatters: "The IEP is the most powerful document in your child's education. Unlike a 504 plan, it's backed by federal law (IDEA) and is legally enforceable. Once services are written into the IEP, the school district MUST provide them — or they're in violation. This meeting is where you lock in speech therapy hours, aide support, behavioral services, accommodations, and modifications.",
        deadlineLabel: 'Within the 60-day clock from signed consent',
        dueInDays: 30,
        draftMessage: `Dear [Principal/Special Ed Director],\n\nI formally request an IEP meeting for ${childName}, who was recently evaluated and found to have ${dxName}.\n\nPer CA Ed Code §56344, the evaluation and IEP meeting must be completed within 60 days of my signed consent to the assessment plan. I request the meeting be scheduled promptly within that window.\n\nPlease confirm the meeting date in writing. I would also like to receive a copy of all assessment reports at least 5 days before the meeting, per my right under CA Ed Code §56329.\n\nSincerely,\n${parentName}`,
        steps: [
          'Send your written IEP meeting request via BOTH email and certified mail to the Special Ed Director.',
          'Request all evaluation reports 5 days BEFORE the meeting (your legal right — CA Ed Code §56329).',
          'Read reports carefully. Highlight anything you disagree with or want to discuss.',
          "Before the meeting, write your 'parent concerns' statement — what YOU observe at home.",
          "At the meeting: you are an EQUAL member of the team. Don't sign the same day if you're unsure.",
          "If you disagree with anything, write 'I do not consent' on those sections and take the IEP home.",
          'You have the right to bring ANYONE to the meeting: advocate, friend, translator, therapist.',
        ],
        documents: [
          'Copy of evaluation reports (request from school)',
          'Your written parent concerns statement',
          'Communication log with school',
          'Any private evaluations or therapy reports',
          'Notes on what services you want in the IEP',
        ],
        smsReminder: 'Monday: Send IEP request. Email + certified mail. 30-day clock starts.',
        insiderTip: "NEVER sign the IEP at the meeting. Say 'I'd like to take this home to review.' You have the right to do this. Once you sign, it's much harder to change. Also: request an audio recording of the meeting — you have the right under CA Ed Code §56341.1. If the school says no, they must provide the recording at their expense.",
      }, 'urgent'));
    } else {
      actions.push(buildAction({
        category: 'iep',
        title: 'Request school district evaluation (in writing)',
        subtitle: 'Your school district must respond with an assessment plan within 15 calendar days of your written request. The full evaluation is completely FREE — even at private school.',
        whyMatters: 'A school evaluation is your gateway to an IEP — a legally enforceable document guaranteeing your child receives the services they need. Under IDEA (federal law) and CA Education Code, the district must evaluate in ALL areas of suspected disability, at no cost to you. This applies even if your child attends private school.',
        deadlineLabel: 'Send this week',
        dueInDays: 7,
        draftMessage: `Dear [Principal/Special Ed Director],\n\nI am writing to formally request a comprehensive special education evaluation for ${childName} under IDEA and CA Education Code §56321.\n\nI am concerned about: [describe specific concerns — speech delays, difficulty with social interaction, behavioral challenges, academic struggles, etc.]\n\nPlease assess in ALL areas of suspected disability, including but not limited to: academic achievement, cognitive ability, speech/language, occupational therapy, social-emotional functioning, and adaptive behavior.\n\nPer CA Ed Code §56321, please provide an assessment plan within 15 calendar days of receiving this request.\n\nSincerely,\n${parentName}`,
        steps: [
          'Write the request letter (use the draft as a starting point).',
          'Send via BOTH email and certified mail to the Special Ed Director. Keep the certified mail receipt.',
          'School has exactly 15 calendar days to send you an Assessment Plan — not 15 school days, CALENDAR days.',
          'Review the Assessment Plan carefully. Make sure it covers ALL areas of concern, not just academics.',
          "Sign the Assessment Plan (this gives consent to evaluate — it doesn't commit you to anything).",
          'School then has 60 calendar days from your consent to complete the evaluation.',
          'The IEP meeting must happen within that same 60-day window — the evaluation and the meeting share one clock (§56344).',
        ],
        documents: [
          'Your written request letter (keep a dated copy)',
          'Certified mail receipt as proof of delivery',
          'Any existing medical diagnoses or evaluations',
          'Teacher observations or report cards',
          'Your own notes on developmental concerns',
        ],
        smsReminder: 'Monday: Send eval request. Email + certified mail. 15-day deadline.',
        insiderTip: "Be specific in your concerns but ask them to evaluate in ALL areas of suspected disability. If you only mention speech, they might only test speech. Write: 'Please assess in all areas of suspected disability.' If the school misses the 15-day or 60-day deadlines, file a compliance complaint with CDE at (916) 319-0800 — it's free and surprisingly effective.",
      }, 'urgent'));
    }
  }

  // ── Therapy / Insurance ───────────────────────────────────────────────────
  // 'sensory' and 'genetic' (new in the app's selector) added — both are
  // therapy-relevant diagnoses even where RC eligibility is conditional.
  const therapyDx =
    hasDx('autism') || hasDx('delay') || hasDx('cp') || hasDx('id') || hasDx('down') ||
    hasDx('epilepsy') || hasDx('md') || hasDx('tbi') || hasDx('deaf') || hasDx('blind') ||
    hasDx('multiple') || hasDx('sli') || hasDx('ohi') || hasDx('sensory') || hasDx('genetic');
  if (therapyDx && ['private', 'both'].includes(insurance)) {
    actions.push(buildAction({
      category: 'medical',
      title: 'Get pediatrician referral for therapy',
      subtitle: `Most insurance plans require a physician referral before covering therapy. You need referrals for OT${hasDx('autism') ? ', speech, and ABA' : ''}, plus a Letter of Medical Necessity — the single most important document for insurance approval.`,
      whyMatters: "The physician referral and Letter of Medical Necessity (LMN) are your tickets to insurance-covered therapy. Without them, insurance will deny claims. A strong LMN from your pediatrician — one that uses words like 'medically necessary' and cites specific functional limitations — can make the difference between approval and denial. Get this done first because everything else depends on it.",
      deadlineLabel: 'Call this week',
      dueInDays: 7,
      talkingPoints: [
        `My child was diagnosed with ${dxName}. I need referrals for occupational therapy${hasDx('autism') ? ', speech therapy, and ABA (Applied Behavior Analysis)' : ''}.`,
        'Can you write a Letter of Medical Necessity? Insurance requires this for prior authorization.',
        'In the letter, can you include: the diagnosis with ICD-10 code, specific functional limitations, recommended frequency and duration of therapy, and that treatment is medically necessary?',
        "Can you also include: 'Without treatment, the patient's condition is expected to deteriorate' — this language helps with appeals.",
        'I may need updated letters for ongoing authorization. Can we plan for that?',
      ],
      steps: [
        "Call your pediatrician's office and request a 'referral appointment' or ask if referrals can be done without a visit.",
        'Specifically ask for: (1) referral orders for each therapy type, (2) Letter of Medical Necessity on office letterhead.',
        `Make sure the LMN includes: diagnosis + ICD-10 code${hasDx('autism') ? ' (F84.0 for ASD)' : ''}, functional limitations, recommended therapy type/frequency, and the words 'medically necessary.'`,
        "Get multiple copies of the LMN — you'll need one for insurance, one for RC, one for your records.",
        "Ask for the referral to be faxed directly to your insurance and to specific providers if you've identified them.",
        "Request that the pediatrician note 'ongoing/chronic condition' so referrals don't expire after a few sessions.",
      ],
      documents: [
        'Diagnosis report with ICD-10 code',
        'List of specific functional concerns (eating, dressing, communication, safety)',
        'Any existing therapy evaluations',
        'Insurance card (front and back)',
      ],
      smsReminder: 'Tomorrow: Call pediatrician for referrals + medical necessity letter.',
      insiderTip: "Ask the pediatrician to write the LMN using insurance-friendly language: 'medically necessary to prevent regression,' 'functional limitations in daily living,' 'without intervention, prognosis is poor.' Generic letters get denied. Specific, clinical letters get approved. Keep the original — you'll reuse it for every authorization cycle.",
    }, 'urgent'));
    actions.push(buildAction({
      category: 'insurance',
      title: 'Call insurance to verify therapy coverage',
      subtitle: `Confirm your plan's coverage for ${hasDx('autism') ? 'ABA, OT, and speech' : 'therapy'}. Start the prior authorization process.${hasDx('autism') ? ' Under CA law SB 946, insurance MUST cover behavioral health treatment (ABA) for autism with no dollar caps.' : ''}`,
      whyMatters: `Insurance is the 'first payer' — they pay before RC or Medi-Cal. Getting prior authorization locked in means services can start. If you skip this step, you may end up paying out of pocket or waiting months for retroactive approval. Know your rights: ${hasDx('autism') ? 'SB 946 (CA Health & Safety Code §1374.73) requires insurance to cover ABA therapy for autism, with no annual or lifetime dollar limits.' : "many therapy types are covered under your plan's rehabilitation benefits."}`,
      deadlineLabel: 'After getting referral',
      dueInDays: 14,
      talkingPoints: [
        `I'm calling about ${hasDx('autism') ? 'ABA therapy and occupational therapy' : 'therapy'} coverage for my child. Diagnosis: ${dxName}${hasDx('autism') ? ', ICD-10 code F84.0' : ''}.`,
        'What is the prior authorization process? What forms do I need to submit?',
        'How many sessions are authorized per year? Is there an annual cap?',
        hasDx('autism')
          ? 'I understand SB 946 requires coverage of behavioral health treatment for autism with no dollar caps. Can you confirm this applies to my plan?'
          : "What are my plan's rehabilitation therapy benefits?",
        `Can you send me a list of in-network providers near ${zipCode}?`,
        'What is the appeals process if a prior authorization is denied?',
        'Is there an out-of-network exception process if no in-network providers are available?',
      ],
      steps: [
        'Call the Member Services number on the back of your insurance card.',
        "Write down the reference number for the call, the representative's name, and the date.",
        "Ask specifically: (1) Is prior auth required? (2) How many sessions authorized? (3) What's the copay? (4) Any annual limits?",
        'Request a list of in-network providers by specialty in your ZIP code.',
        "Submit the prior authorization with your doctor's referral and Letter of Medical Necessity.",
        'If denied: request the denial IN WRITING with the specific reason and your appeal rights.',
        'Track authorization expiration dates — set calendar reminders to re-authorize before they lapse.',
      ],
      documents: [
        'Insurance card (front and back, member ID and group number)',
        'Physician referral orders',
        'Letter of Medical Necessity',
        'Diagnosis report with ICD-10 code',
        'Your ZIP code for provider search',
      ],
      smsReminder: 'Day 3: Call insurance about coverage, prior auth, in-network providers.',
      insiderTip: `Always get the representative's name, call reference number, and ask them to note the call on your account. If they deny something verbally, say: 'Please send me that denial in writing with the specific contractual provision.' This forces them to be accurate. ${hasDx('autism') ? "If they deny ABA, cite SB 946 — many reps don't know about it. Ask for the 'Behavioral Health' or 'Autism Services' department specifically. " : ''}If no in-network providers are available within a reasonable distance, you can request a 'network adequacy exception' to see out-of-network providers at in-network rates.`,
    }, 'urgent'));
  }

  // ── Medi-Cal ──────────────────────────────────────────────────────────────
  if (needsMC && rcE) {
    actions.push(buildAction({
      category: 'benefits',
      title: 'Apply for Medi-Cal',
      subtitle: 'Even if you have private insurance, your child likely qualifies for Medi-Cal. This unlocks IHSS (paid caregiving), covers copays and deductibles, and provides EPSDT — which requires Medi-Cal to cover ALL medically necessary services for children under 21.',
      whyMatters: "Medi-Cal is the gateway to multiple critical programs. It unlocks IHSS (where parents can be paid to provide care), covers therapy copays, provides EPSDT (the most comprehensive pediatric benefit in the country), and serves as secondary insurance that catches what private insurance misses. For RC clients, 'institutional deeming' means only your CHILD's income counts — not yours — so most children with disabilities qualify regardless of family income.",
      deadlineLabel: 'Within 30 days',
      dueInDays: 30,
      talkingPoints: [
        "I'm applying for Medi-Cal for my child who has a developmental disability.",
        'My child is a Regional Center client (or pending). I understand institutional deeming applies — only my child\'s income should be counted.',
        'We have private insurance but need Medi-Cal as secondary coverage.',
        'What documentation do I need to submit?',
        'How long until coverage is active? Can it be retroactive?',
        'I want to make sure my child is enrolled in full-scope Medi-Cal, not restricted scope.',
      ],
      steps: [
        'Choose your application method: online at CoveredCA.com/Medi-Cal, by phone at 1-800-300-1506, in person at your county social services office, or by mail.',
        "Online is fastest: go to BenefitsCal.com (CA's benefit portal) and create an account.",
        "Fill out the application. For 'household,' you may list only the child if institutional deeming applies (RC client).",
        'Submit proof of income, residency, and identity for your child.',
        'County has 45 days to process. For kids with disabilities, request expedited processing.',
        "Once approved, you'll receive a Benefits Identification Card (BIC) — this is the Medi-Cal card.",
        'Medi-Cal can be retroactive up to 3 months before your application date — keep receipts for medical expenses.',
      ],
      documents: [
        "Child's birth certificate or passport",
        "Child's Social Security Number",
        'Proof of CA residency (utility bill, lease, school enrollment)',
        'Proof of household income (pay stubs, tax return, SSI award letter)',
        'Immigration documents if applicable (many immigration statuses qualify)',
        'RC referral or eligibility letter (for institutional deeming)',
      ],
      eligibility: "For children with developmental disabilities who are Regional Center clients, institutional deeming applies — only your CHILD's income and resources are counted, not the family's. Most children qualify. Without institutional deeming, income limits vary by household size. Bottom line: if your child is an RC client or has a developmental disability, apply regardless of family income. Check at BenefitsCal.com or call 1-800-300-1506.",
      smsReminder: 'Next week: Apply for Medi-Cal at BenefitsCal.com or call 1-800-300-1506.',
      insiderTip: "Apply even if you think you earn too much. 'Institutional deeming' for RC clients means only your child's income and resources are counted, not the family's. Most children with developmental disabilities qualify. If denied, appeal — and ask RC to provide a letter confirming your child is their client. Also: Medi-Cal is retroactive up to 3 months, so keep all medical receipts from the past 90 days.",
    }, 'high'));
  }

  // ── SSI + IHSS ────────────────────────────────────────────────────────────
  const ssiExcluded =
    (hasDx('sld') && diagnosisArr.length === 1) ||
    (hasDx('dyslexia') && diagnosisArr.length === 1);
  if (rcE && !ssiExcluded) {
    actions.push(buildAction({
      category: 'benefits',
      title: 'Start SSI application',
      subtitle: `SSI provides ~$${SSI_FBR_MONTHLY}/month (${SSI_YEAR} rate, adjusted annually) in cash benefits plus automatic Medi-Cal enrollment. ${hasDx('autism') ? 'Children with autism who have marked limitations in social functioning, communication, or behavior typically qualify.' : "Your child's diagnosis may qualify based on functional limitations."} This is real income for your family.`,
      whyMatters: "SSI puts nearly $1,000/month directly into your family's hands — that's over $11,000/year. It also automatically enrolls your child in Medi-Cal (which unlocks IHSS, EPSDT, and more). The application is lengthy and many families give up, but the approval rate for children with well-documented developmental disabilities is significant. The key is the Function Report: describe your child's WORST days, not their best.",
      deadlineLabel: 'Within 30 days',
      dueInDays: 30,
      talkingPoints: [
        `I'm calling to start an SSI application for my child who has ${dxName}.`,
        "I'd like to schedule an appointment to file. Can we do this by phone or do I need to come in?",
        'What specific documentation do I need to bring or submit?',
        'How do I complete the Function Report for a child?',
        'How long does the determination process take?',
        'If denied, what is the appeals process and timeline?',
      ],
      steps: [
        "Call SSA at 1-800-772-1213 (TTY: 1-800-325-0778) or visit ssa.gov to start. You CANNOT complete the child SSI application fully online — you'll need to schedule a phone or in-person appointment.",
        'Gather all medical evidence: diagnosis reports, therapy records, school evaluations, IEP, hospital records.',
        "The most important document is the Function Report (SSA-3375-BK for children). This is where you describe your child's daily functioning.",
        "CRITICAL: On the Function Report, describe your child's WORST days, not their best. Be specific: 'He cannot dress himself without full physical assistance. He puts clothes on backwards, cannot button, cannot zip. This takes 30+ minutes with constant help.'",
        'Get letters from every provider: pediatrician, therapist, teacher, RC Service Coordinator. Each should describe limitations they observe.',
        'Submit everything. SSA reviews with Disability Determination Services (DDS). This takes 3-6 months.',
        'If denied (many are initially), APPEAL within 60 days. The approval rate on appeal is significantly higher. Consider contacting a disability attorney — they work on contingency (no upfront cost).',
      ],
      documents: [
        "Child's Social Security card and birth certificate",
        'Parent/guardian Social Security numbers',
        'Diagnosis reports with ICD-10 codes',
        'ALL medical records (pediatrician, specialists, hospital)',
        'Therapy records (OT, speech, ABA, PT)',
        'School records, IEP, report cards, teacher observations',
        'Regional Center intake or eligibility documents',
        'Function Report (SSA-3375-BK) — THE most important document',
        'Proof of household income and resources',
      ],
      eligibility: "For children under 18, SSI looks at BOTH the child's disability AND the family's income/resources. Resource limit: $2,000 in countable resources (your home, one vehicle, and CalABLE accounts up to $100K do NOT count). Disability standard: 'marked and severe functional limitations' compared to same-age peers. Bottom line: if your child has a significant developmental disability, apply — SSA's income deductions are generous and many families who think they earn too much actually qualify. Apply: 1-800-772-1213 or ssa.gov.",
      smsReminder: 'Week 2: Start SSI app. Call 1-800-772-1213 to schedule appointment.',
      insiderTip: "The #1 reason SSI applications are denied is insufficient evidence of functional limitations. The diagnosis alone isn't enough — SSA wants to know HOW the disability affects daily life. On the Function Report, never write 'sometimes' or 'can do with help.' Write: 'Cannot do independently. Requires full physical assistance every time.' Describe meltdowns, safety risks, sleep disruption, inability to self-care. If denied, appeal immediately — don't re-apply (you lose time). A disability attorney takes cases on contingency and can dramatically improve your odds.",
    }, 'high'));
    actions.push(buildAction({
      category: 'benefits',
      title: 'Apply for IHSS (In-Home Supportive Services)',
      subtitle: 'IHSS pays for in-home caregiving so your child can live at home safely. Parents CAN be paid providers — this is one of the only programs that compensates the caregiving you\'re already doing. Covers personal care, domestic tasks, protective supervision, and more.',
      whyMatters: "IHSS is a game-changer for families. It pays parents (or other caregivers) an hourly rate to provide care you're already providing — bathing, feeding, dressing, supervision, transportation to medical appointments. For children with autism or developmental disabilities who need constant supervision for safety, 'protective supervision' hours can be substantial. Current IHSS wages in CA range from $16-$20+/hour depending on county.",
      deadlineLabel: 'After Medi-Cal',
      dueInDays: 45,
      talkingPoints: [
        `I'm calling to apply for IHSS for my child who has ${dxName}.`,
        "My child has Medi-Cal. I'd like to be the paid provider — is that possible?",
        'My child needs help with: [personal care / feeding / bathing / dressing / toileting / supervision for safety / transportation to medical appointments].',
        "I'd like to apply for protective supervision hours — my child is a safety risk if left unsupervised.",
        "What documentation do I need? Do I need a physician's statement?",
        'How does the assessment visit work? What should I prepare?',
      ],
      steps: [
        'Your child MUST have Medi-Cal first. If not enrolled yet, complete that application first.',
        'Call your county IHSS office (find yours at cdss.ca.gov/ihss) or apply online at BenefitsCal.com.',
        'A social worker will schedule an in-home assessment visit. This is where hours are determined.',
        'BEFORE the visit: keep a detailed daily care log for 1-2 weeks documenting every task you assist with and how long it takes.',
        "During the visit: demonstrate your child's actual needs. Do NOT help them 'perform' — let the social worker see the reality.",
        'Request Protective Supervision if your child is a safety risk (wanders, puts things in mouth, no sense of danger). These hours are in ADDITION to personal care.',
        'After approval, complete provider enrollment (background check, orientation). Parents can serve as providers.',
        'Submit timesheets every two weeks through the Electronic Services Portal (ESP) at etimesheets.ihss.ca.gov.',
      ],
      documents: [
        "Child's Medi-Cal Benefits Identification Card (BIC)",
        'SOC 295 — Health Care Certification form (physician fills out, documenting care needs)',
        'Daily care log (1-2 weeks of detailed notes)',
        'Diagnosis reports and medical records',
        'Any safety incident documentation (wandering, injuries, 911 calls)',
        'Your own ID and Social Security number (for provider enrollment)',
      ],
      eligibility: 'Requirement #1: your child MUST have Medi-Cal — no exceptions. Requirement #2: must live at home. Requirement #3: must need assistance with daily activities due to the disability. There is NO separate income limit for IHSS — if your child has Medi-Cal, income is not re-tested. If your child needs ANY help with daily living because of their disability, you likely qualify. Apply: your county IHSS office or BenefitsCal.com.',
      smsReminder: 'After Medi-Cal approved: Apply for IHSS at county office or BenefitsCal.com.',
      insiderTip: 'The in-home assessment is EVERYTHING. The social worker observes for about an hour and assigns hours based on what they see. Prepare by keeping a detailed care log showing exactly what you do each day and how long it takes. During the visit, do NOT compensate for your child\'s needs — let the assessor see the true level of support required. If you disagree with the hours assigned, appeal immediately. For protective supervision: document every safety incident, elopement attempt, or dangerous behavior. The county must give you a written notice of the hours — if you disagree, you have 90 days to request a state hearing.',
    }, 'high'));
  }

  // ── ADHD-specific ─────────────────────────────────────────────────────────
  // Gated on needsIEP: a child who already HAS an active IEP doesn't need to
  // be told to request an evaluation — that step is behind them.
  if (hasDx('adhd') && needsIEP && iepStatus !== 'na') {
    actions.push(buildAction({
      category: 'iep',
      title: 'Request 504 Plan or IEP evaluation',
      subtitle: "ADHD qualifies for an IEP under the 'Other Health Impairment' (OHI) category, OR for a Section 504 plan. An IEP is stronger (legally binding services), while a 504 provides accommodations. Request the IEP evaluation first — if denied, the 504 is your fallback.",
      whyMatters: "Without a 504 or IEP, your child's school has ZERO legal obligation to accommodate their ADHD — no extra time on tests, no preferential seating, no breaks, no behavioral support. An IEP provides enforceable services (like counseling, behavioral support, or modified assignments), while a 504 guarantees accommodations (extra time, fidget tools, movement breaks, chunked assignments). ADHD qualifies for both under federal law.",
      deadlineLabel: 'Request this week',
      dueInDays: 7,
      talkingPoints: [
        "My child has been diagnosed with ADHD. I am requesting a comprehensive special education evaluation under the 'Other Health Impairment' category of IDEA.",
        'If my child does not qualify for an IEP, I want to request a Section 504 plan evaluation as well.',
        "ADHD is affecting my child's ability to [focus in class / complete assignments / follow multi-step directions / manage behavior / organize materials].",
        'I am making this request in writing and expect an assessment plan within 15 calendar days.',
        "I'd like the evaluation to cover: attention, executive functioning, social-emotional, academic achievement, and behavioral assessments.",
      ],
      draftMessage: `Dear [Principal/Special Ed Director],\n\nI am writing to formally request a comprehensive special education evaluation for ${childName} under IDEA, specifically under the 'Other Health Impairment' category for ADHD.\n\nMy child's ADHD is significantly affecting their ability to [focus, complete work, follow directions, manage behavior, organize materials — be specific].\n\nIf my child is found not eligible for an IEP, I also request evaluation for a Section 504 plan.\n\nPer CA Ed Code §56321, please provide an assessment plan within 15 calendar days.\n\nSincerely,\n${parentName}`,
      steps: [
        "Send a WRITTEN request to the Special Ed Director for an IEP evaluation under 'Other Health Impairment' (OHI). Email + certified mail.",
        'School has 15 calendar days to respond with an assessment plan.',
        'If the school tries to offer only a 504 without evaluating for IEP first — push back. You have the right to a full evaluation.',
        "If found eligible for IEP: you'll get enforceable services. Push for behavioral support, counseling, executive functioning coaching.",
        'If NOT eligible for IEP: immediately request a 504 plan meeting. 504 is easier to get and still provides important accommodations.',
        'Common 504 accommodations for ADHD: extended time (1.5x), preferential seating, movement breaks, chunked assignments, visual schedules, reduced homework, fidget tools, check-ins with teacher.',
        "Review the plan at least annually. Request a meeting anytime things aren't working.",
      ],
      documents: [
        'ADHD diagnosis report from physician or psychologist',
        'Teacher observations or behavior reports',
        'Report cards showing pattern of difficulty',
        'Any previous testing or screening results',
        'Your written list of specific school-related concerns',
      ],
      smsReminder: 'This week: Send written IEP/504 request to school. Email + certified mail.',
      insiderTip: "Important: ADHD alone does not qualify for Regional Center. If your child also has autism, intellectual disability, or another Lanterman-qualifying condition, pursue RC separately. Schools sometimes try to skip the IEP evaluation and go straight to 504 because 504 is cheaper and less enforceable. Don't accept this. Insist on a full special education evaluation first. If ADHD is significantly impacting academics OR behavior, your child likely qualifies for an IEP under OHI. The magic words: 'My child's ADHD adversely affects their educational performance.' If the school still says no, ask for their denial in writing — called 'Prior Written Notice' — and consider filing a CDE complaint.",
    }, 'urgent'));
  }

  // ── Epilepsy-specific: CCS eligible ───────────────────────────────────────
  if (hasDx('epilepsy')) {
    actions.push(buildAction({
      category: 'medical',
      title: "Apply for California Children's Services (CCS)",
      subtitle: 'Epilepsy is a CCS-eligible condition. CCS covers specialized medical care, therapy, and medical equipment for children under 21 — regardless of immigration status.',
      whyMatters: "CCS is one of California's most underused programs. It covers specialized medical care that insurance often limits — neurology visits, medication management, EEGs, specialized therapies, and medical equipment. There's no cost for families under the income threshold, and even higher-income families only pay a share. CCS works alongside your other coverage.",
      deadlineLabel: 'Apply within 30 days',
      dueInDays: 30,
      steps: [
        'Ask your pediatrician or neurologist for a CCS referral, or apply directly through your county health department.',
        'CCS will verify the diagnosis is on their eligible conditions list (epilepsy qualifies).',
        'Provide medical records and proof of diagnosis.',
        'CCS assigns a Medical Therapy Unit if physical therapy is needed.',
        'Coverage includes specialist visits, medications, monitoring equipment, and medically necessary therapies.',
      ],
      documents: [
        'Diagnosis report from neurologist',
        'Medical records documenting seizure history',
        'Insurance information',
        'Proof of CA residency',
      ],
      insiderTip: "CCS can be combined with Medi-Cal and private insurance. It's a 'payer of last resort,' meaning it fills gaps other coverage misses. If your child's neurologist isn't CCS-paneled, CCS can authorize out-of-network care.",
    }, 'high'));
  }

  // ── Down syndrome-specific ────────────────────────────────────────────────
  if (hasDx('down')) {
    actions.push(buildAction({
      category: 'medical',
      title: 'Apply for CCS and connect with Down syndrome resources',
      subtitle: 'Down syndrome qualifies for CCS (conditional) and full RC services. Many children with Down syndrome benefit from early speech therapy, OT, and PT — start as early as possible.',
      whyMatters: 'Children with Down syndrome qualify for a wide range of services across RC, school, insurance, and CCS. Early intervention — especially speech therapy and physical therapy — has strong evidence for improving long-term outcomes. Connecting with a Down syndrome-specific support organization can also help you navigate medical appointments, therapy schedules, and school advocacy.',
      deadlineLabel: 'Start this month',
      dueInDays: 30,
      steps: [
        "Contact your Regional Center if you haven't already — Down syndrome is a qualifying condition.",
        'Ask your pediatrician for CCS referral for any associated medical conditions (cardiac, thyroid, etc.).',
        'Connect with the National Down Syndrome Society (ndss.org) or local parent groups for peer support.',
        'Request comprehensive early intervention services: speech, OT, PT, and feeding therapy if needed.',
        "Ensure your child's IEP addresses all areas of need — academic, speech, motor, social, and adaptive skills.",
      ],
      documents: [
        'Genetic testing/diagnosis report',
        'Medical records (cardiac, thyroid, hearing screenings)',
        'Any existing therapy evaluations',
      ],
      insiderTip: "Children with Down syndrome often qualify for services across almost every program in the system. Don't let anyone tell you 'they're too high-functioning' — eligibility is based on the diagnosis, not the severity. Request evaluations in ALL developmental areas.",
    }, 'high'));
  }

  // ── Deaf/Hard of Hearing-specific ─────────────────────────────────────────
  if (hasDx('deaf')) {
    actions.push(buildAction({
      category: 'iep',
      title: 'Connect with Deaf/HoH specialized services',
      subtitle: 'Your child qualifies for specialized services including DHH itinerant teachers, audiological services, and communication supports (ASL, oral, or total communication). Schools must provide a communication plan.',
      whyMatters: 'Under IDEA, Deaf/Hard of Hearing is its own disability category with specialized requirements. Schools must consider communication needs, language and communication mode, opportunities for direct communication with peers, and academic level. California also has Schools for the Deaf (CSD in Fremont and Riverside) as placement options.',
      deadlineLabel: 'Start this week',
      dueInDays: 7,
      steps: [
        'Request an IEP evaluation if not already in progress — DHH is its own IDEA category.',
        'Ask for a DHH specialist teacher to be part of the IEP team.',
        'Discuss communication modality: ASL, oral/auditory, total communication, or cued speech.',
        'Request audiological services through the school and CCS.',
        'Explore assistive technology: hearing aids, FM systems, captioning, visual alerts.',
        'Contact California School for the Deaf for resources even if not enrolling.',
      ],
      documents: [
        'Audiological evaluation',
        'ENT medical records',
        'Any speech/language evaluations',
        'Communication assessment',
      ],
      insiderTip: "The IEP must include a 'communication plan' for DHH students. Schools often overlook this. Insist on it. Also: if your child uses ASL, they're entitled to a qualified ASL interpreter — not just someone who 'knows some signs.' CCS covers hearing aids and audiological services.",
    }, 'high'));
  }

  // ── Blind/Visually Impaired-specific ──────────────────────────────────────
  if (hasDx('blind')) {
    actions.push(buildAction({
      category: 'iep',
      title: 'Connect with vision impairment services',
      subtitle: 'Your child qualifies for specialized services including a Teacher of the Visually Impaired (TVI), orientation and mobility training, and assistive technology. CCS covers eye care and specialized equipment.',
      whyMatters: "Children who are blind or visually impaired have specific legal protections and specialized services available. A Teacher of the Visually Impaired should be on the IEP team. Orientation and mobility instruction is critical for independence. Braille instruction is required unless the IEP team explicitly determines it's not appropriate.",
      deadlineLabel: 'Start this week',
      dueInDays: 7,
      steps: [
        'Request an IEP evaluation under the Visual Impairment category.',
        'Ensure a certified Teacher of the Visually Impaired (TVI) is on the IEP team.',
        'Request Orientation and Mobility (O&M) assessment and services.',
        'Discuss assistive technology: screen readers, magnification, Braille displays.',
        'Contact your RC for additional vision-related supports.',
        'Apply for CCS — visual impairment is a qualifying condition.',
      ],
      documents: [
        'Ophthalmological/optometric evaluation',
        'Functional vision assessment',
        'Learning media assessment (determines Braille vs. print)',
        'Medical records',
      ],
      insiderTip: "Under IDEA, schools must provide Braille instruction unless the IEP team determines it's not appropriate after a proper assessment. Don't let the school skip this. Also: contact the Department of Rehabilitation early — they have Pre-Employment Transition Services for blind/VI youth starting at age 14.",
    }, 'high'));
  }

  // ── TBI-specific ──────────────────────────────────────────────────────────
  if (hasDx('tbi')) {
    actions.push(buildAction({
      category: 'medical',
      title: 'Coordinate TBI-specific services across systems',
      subtitle: 'Traumatic Brain Injury qualifies for RC, IEP (TBI is its own IDEA category), CCS, and full insurance-covered rehabilitation. TBI needs change over time — regular re-evaluations are essential.',
      whyMatters: "TBI is unique because needs can evolve significantly over months and years. What your child needs today may differ from what they need in 6 months. RC, school, and medical services all need to coordinate. Under IDEA, TBI is its own disability category — the school cannot lump it into 'Other Health Impairment.' Push for TBI-specific classification as it unlocks specialized services.",
      deadlineLabel: 'Start this week',
      dueInDays: 7,
      steps: [
        "Ensure the IEP classifies your child under 'Traumatic Brain Injury' — not OHI.",
        'Request neuropsychological re-evaluation every 6-12 months (TBI recovery evolves).',
        'Contact RC for comprehensive service coordination.',
        'Apply for CCS for specialized medical and rehabilitation services.',
        'Request a school-based speech-language pathologist who has TBI experience.',
        'Consider cognitive rehabilitation therapy through insurance.',
      ],
      documents: [
        'Neurological/neuropsychological evaluation',
        'Hospital and rehabilitation records',
        'Current therapy progress reports',
        'School performance records pre- and post-injury',
      ],
      insiderTip: 'Schools often underestimate the long-term effects of TBI. Push for re-evaluations — your child\'s needs 6 months after injury may be very different from day one. Also: RC eligibility for TBI requires the injury to have occurred before age 18 and to result in significant functional limitations. Document everything from the beginning.',
    }, 'high'));
  }

  // ── Emotional Disturbance-specific ────────────────────────────────────────
  if (hasDx('ed')) {
    actions.push(buildAction({
      category: 'iep',
      title: 'Request ERMHS (mental health services) through school',
      subtitle: 'Emotional Disturbance qualifies for an IEP and ERMHS — Educationally Related Mental Health Services. These are counseling, behavioral support, and therapeutic services provided through the school at no cost.',
      whyMatters: 'ERMHS provides school-based mental health services that are critical for students with emotional disturbance. These services are part of the IEP and legally enforceable — the school MUST provide them. ERMHS can include individual counseling, group therapy, behavioral intervention, crisis support, and parent training. County mental health may also be involved for more intensive needs.',
      deadlineLabel: 'Request this week',
      dueInDays: 7,
      steps: [
        'Request an IEP evaluation under the Emotional Disturbance category.',
        'Ask for an ERMHS assessment as part of the evaluation.',
        "If eligible, ERMHS services are written into the IEP — they're legally binding.",
        'Services may include: individual/group counseling, behavioral support, therapeutic behavioral services, day treatment.',
        "If school-based services aren't sufficient, request county mental health referral.",
        'Ensure a Behavioral Intervention Plan (BIP) is included in the IEP.',
      ],
      documents: [
        'Mental health evaluation or diagnosis',
        'School behavioral records',
        'Disciplinary records',
        'Any private therapy records',
        'Parent observations of behavioral concerns',
      ],
      insiderTip: "If your child is being suspended or disciplined repeatedly, they may need an ERMHS assessment. Under IDEA, a student with a disability cannot be suspended for more than 10 days if the behavior is a 'manifestation' of their disability. Request a Manifestation Determination Review (MDR) if facing suspension — and make sure ERMHS is part of the solution, not punishment.",
    }, 'high'));
  }

  // ── Speech/Language Impairment-specific ───────────────────────────────────
  if (hasDx('sli') && !hasDx('autism') && needsIEP && iepStatus !== 'na') {
    actions.push(buildAction({
      category: 'iep',
      title: 'Request speech/language IEP evaluation',
      subtitle: 'Speech/Language Impairment is its own IDEA category. Your child is entitled to a school-based evaluation and, if eligible, speech therapy services through an IEP — completely free.',
      whyMatters: 'School-based speech therapy through an IEP is free and legally enforceable. Many families only pursue private therapy and don\'t realize the school must provide services too. You can (and should) have both — school speech therapy during the week and private therapy through insurance. They address different aspects: school focuses on educational impact, private focuses on broader communication goals.',
      deadlineLabel: 'Request this week',
      dueInDays: 7,
      steps: [
        'Send a written request for a speech/language evaluation to the Special Ed Director.',
        'School has 15 calendar days to respond with an assessment plan.',
        'A Speech-Language Pathologist (SLP) will evaluate articulation, language, fluency, and pragmatics.',
        'If eligible, speech therapy goals and minutes are written into the IEP.',
        'Request AAC (Augmentative and Alternative Communication) assessment if your child has limited verbal speech.',
        "Pursue private speech therapy simultaneously through insurance — don't wait.",
      ],
      documents: [
        'Any existing speech/language evaluations',
        'Pediatrician concerns or referral',
        'Communication samples or parent observations',
        'School report cards noting communication concerns',
      ],
      insiderTip: 'Schools sometimes offer minimal speech minutes (like 30 min/week). Push for what your child actually needs based on the evaluation. If the SLP recommends more minutes than the school offers, document the discrepancy. Also: RC eligibility for SLI alone is conditional, but if speech delays are accompanied by other developmental concerns, RC may qualify your child.',
    }, 'high'));
  }

  // ── Transition (teens) ────────────────────────────────────────────────────
  if (isTr && rcE) {
    actions.push(buildAction({
      category: 'general',
      title: 'Apply to Department of Rehabilitation (DOR)',
      subtitle: 'DOR provides vocational rehabilitation: job training, supported employment, job coaching, assistive technology for work, and college support. Apply at age 15–16 — waitlists can be 6+ months and transition planning starts early.',
      whyMatters: 'Employment is the #1 long-term concern for families of teens with disabilities. DOR is the primary state agency for job readiness. Their Transition Partnership Program (TPP) specifically serves students age 16+ who are in special education. Starting early means your teen gets on the waitlist, builds job skills, and transitions smoothly from school to employment or supported work. DOR can also attend IEP transition meetings and coordinate with the school.',
      deadlineLabel: 'Start application',
      dueInDays: 30,
      talkingPoints: [
        `I'm calling to apply for vocational rehabilitation services for my teenager who has ${dxName}.`,
        `They are ${ageYears} and currently in special education with an IEP.`,
        "I'm interested in the Transition Partnership Program (TPP). What's the eligibility process?",
        "Can a DOR counselor attend my child's next IEP transition meeting?",
        'What job training, internship, or supported employment options are available?',
        'Does DOR provide assistive technology assessments for the workplace?',
      ],
      steps: [
        'Find your local DOR office at dor.ca.gov/Home/OfficeLocator.',
        'Call or walk in to request an application. You can also apply online at dor.ca.gov.',
        'DOR will schedule an eligibility interview (usually within 60 days of application).',
        'Eligibility is based on: a disability that creates a barrier to employment + ability to benefit from services.',
        'Once eligible, you and your DOR counselor create an Individualized Plan for Employment (IPE).',
        'Services may include: job coaching, supported employment, paid internships, college tuition assistance, assistive technology, resume/interview skills.',
        "Request that DOR be invited to your child's IEP transition meetings — they should coordinate with the school.",
        'If your teen is 16+, ask about the Transition Partnership Program (TPP) specifically.',
      ],
      documents: [
        'Diagnosis report and medical records',
        'IEP (especially transition goals section)',
        'School transcript or records',
        'Any previous work experience or volunteer history',
        'RC eligibility or IPP if available',
      ],
      smsReminder: 'This month: Apply to DOR at dor.ca.gov or call local office. Waitlists are long — start now.',
      insiderTip: "DOR waitlists can be 6-12 months, which is why applying at 15-16 is critical. Ask to be placed in 'Order of Selection Category 1' (most significant disability) — RC clients usually qualify. This means you're served first. Also: DOR can pay for community college, trade school, or university if it's part of the employment plan. Many families don't realize this.",
    }, 'medium'));
    actions.push(buildAction({
      category: 'benefits',
      title: 'Set up a CalABLE savings account',
      subtitle: 'CalABLE lets individuals with disabilities save up to $100,000 without losing SSI or Medi-Cal eligibility. Earnings grow tax-free. Use funds for education, housing, transportation, assistive technology, health, and more.',
      whyMatters: "Here's the problem CalABLE solves: SSI has a $2,000 resource limit. If your child has more than $2,000 in savings, they lose SSI and Medi-Cal. CalABLE is a special savings account (under the federal ABLE Act) that's EXEMPT from that limit — you can save up to $100,000 without affecting benefits. Funds grow tax-free and can be used for any disability-related expense. It's essentially a tax-advantaged savings account designed specifically for people with disabilities.",
      deadlineLabel: 'When ready',
      steps: [
        "Go to CalABLE.ca.gov and click 'Open an Account.'",
        "The account is in your CHILD's name (they are the beneficiary). You can be the authorized signer.",
        'Eligibility: disability onset before age 46 (raised from 26 effective Jan 1, 2026), AND either receiving SSI/SSDI OR can self-certify the disability.',
        'Choose your investment option: savings (safe) or investment portfolios (growth potential).',
        'Contribute up to $20,000/year (2026 limit, adjusted annually). Anyone can contribute — grandparents, family, friends.',
        "Use the funds for 'Qualified Disability Expenses': housing, education, transportation, assistive technology, health, financial management, job training, legal fees, and more.",
        'Keep receipts for all withdrawals — they must be for qualified expenses.',
        "Funds up to $100,000 are excluded from SSI's $2,000 resource limit.",
      ],
      documents: [
        "Child's Social Security number",
        "Proof of disability (SSI award letter, or doctor's certification if self-certifying)",
        'Your ID as authorized signer',
        'Bank account for linking contributions',
      ],
      smsReminder: 'When SSI approved: Open CalABLE account at CalABLE.ca.gov to protect savings.',
      insiderTip: 'Open the CalABLE account as soon as SSI is approved (or even before, if you can self-certify). The most common mistake is accumulating savings in a regular bank account and accidentally losing SSI eligibility. CalABLE is also a great way for grandparents and relatives to contribute to your child\'s future without jeopardizing benefits. Contributions make excellent birthday and holiday gifts.',
    }, 'medium'));
  }

  return actions;
}
