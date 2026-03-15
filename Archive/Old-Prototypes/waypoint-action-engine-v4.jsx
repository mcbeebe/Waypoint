import { useState, useCallback, useRef, useEffect } from "react";

// ─── Design tokens ───
const C = {
  bg: "#F8F7F4", card: "#FFF", accent: "#2563EB", accentLight: "#EFF6FF",
  accentDark: "#1E40AF", urgent: "#DC2626", urgentLight: "#FEF2F2", urgentBorder: "#FECACA",
  success: "#059669", successLight: "#ECFDF5", successBorder: "#A7F3D0",
  warn: "#D97706", warnLight: "#FFFBEB", warnBorder: "#FDE68A",
  muted: "#6B7280", mutedLight: "#F3F4F6", border: "#E5E7EB",
  text: "#111827", textSec: "#4B5563", purple: "#7C3AED", purpleLight: "#F5F3FF",
  dark: "#1A1A2E", teal: "#0D9488", tealLight: "#F0FDFA", tealBorder: "#99F6E4",
  rose: "#E11D48", roseLight: "#FFF1F2", roseBorder: "#FECDD3",
  warmBg: "#FFFBF5",
};

// ─── Agency database ───
const AGENCIES = {
  rceb: { name: "Regional Center of the East Bay (RCEB)", type: "State (Nonprofit)", phone: "(510) 618-6100", website: "rceb.org", hours: "Mon-Fri 8:30am–5pm",
    what: "One of 21 Regional Centers in CA. Primary gateway to developmental disability services: ABA, respite, speech, OT, and a Service Coordinator.", services: ["Eligibility evaluation (free)", "Service Coordinator assignment", "ABA therapy funding", "Respite care", "Speech, OT, PT funding (after insurance)", "Self-Determination Program"],
    rights: ["Self-refer — no doctor needed", "15-day intake deadline", "Right to specific services in IPP", "Right to appeal (Fair Hearing / 4731)", "All communication in your preferred language"], watchOut: "POS spending disparities documented — White families receive ~2x more than Latino families. Know what's available and request it." },
  earlystart: { name: "Early Start Program (Regional Center)", type: "State Program", phone: "(510) 618-6100",
    what: "California's early intervention program for infants/toddlers (0-3). Lower eligibility threshold than Lanterman Act.", services: ["IFSP development", "Speech, OT, PT, ABA for infants", "Family training", "Service coordination", "Transition planning to IEP at age 3"],
    rights: ["45-day timeline from referral to IFSP", "Services in natural environment", "IFSP review every 6 months", "Transition planning starts at 2yr 9mo"], watchOut: "Transition from Early Start to IEP at age 3 is where many kids lose services." },
  school: { name: "Your School District (Special Ed)", type: "Local Education Agency", phone: "Contact school main office",
    what: "Under IDEA, your district must provide FAPE including evaluation, IEP development, and related services — all free.", services: ["Psychoeducational evaluation", "IEP with measurable goals", "Speech, OT, PT, counseling", "Behavioral support / aide", "Assistive technology", "Specialized placement"],
    rights: ["Equal IEP team member", "Bring anyone to IEP meeting", "Request IEP meeting at ANY time", "Request IEE at district expense", "Right to mediation/complaint/due process"], watchOut: "Schools often offer the minimum. Come prepared. You don't have to sign the IEP the same day." },
  insurance: { name: "Your Health Insurance", type: "Private/Managed Care",
    what: "CA law (SB 946) mandates behavioral health treatment coverage for autism, including ABA.", services: ["ABA therapy", "OT, Speech, PT", "Psychiatric services", "DME"],
    rights: ["Appeal any denial", "External review (DMHC/CDI)", "Out-of-network if no in-network available"], watchOut: "Know if DMHC or CDI regulates your plan. First auth often denied — appeal." },
  ssa: { name: "Social Security Administration", type: "Federal", phone: "1-800-772-1213", website: "ssa.gov",
    what: "Administers SSI — monthly cash benefit for children with disabilities.", services: ["SSI ~$943/mo in CA", "Automatic Medi-Cal enrollment"],
    rights: ["Appeal any denial", "CalABLE $100K exempt"], watchOut: "Function Report: describe WORST days." },
  ihss: { name: "In-Home Supportive Services", type: "County Program", phone: "County social services",
    what: "Personal care to keep disabled individuals home safely. Parents CAN be paid providers.", services: ["Personal care", "Domestic services", "Protective supervision", "Medical transport"],
    rights: ["Choose your provider", "Request reassessment anytime", "State Fair Hearing"], watchOut: "Document every task in a full 24-hour day." },
  medicaid: { name: "Medi-Cal", type: "State/Federal", phone: "1-800-541-5555",
    what: "CA Medicaid. EPSDT covers ALL medically necessary services for children under 21.", services: ["All medically necessary services", "Therapy", "Rx", "DME", "Transport"],
    rights: ["Retroactive coverage 3 months", "Continue services during appeal"], watchOut: "#1 risk: missing annual redetermination." },
  dor: { name: "Dept of Rehabilitation", type: "State", phone: "1-844-729-2800",
    what: "Vocational rehab for transition-age youth.", services: ["Transition Partnership Program", "Job coaching", "Supported employment"],
    rights: ["Appeal service denials", "Individualized plan for employment"], watchOut: "Long waitlists. Apply early." },
};

// ─── Intake questions ───
const INTAKE_QUESTIONS = [
  { key: "diagnosis", question: "What diagnosis has your child received?",
    options: [
      { label: "Autism (ASD)", value: "autism" },
      { label: "Developmental delay", value: "delay" },
      { label: "Intellectual disability", value: "id" },
      { label: "Learning disability (dyslexia, etc.)", value: "sld" },
      { label: "ADHD", value: "adhd" },
      { label: "Cerebral palsy", value: "cp" },
      { label: "Suspected but not yet diagnosed", value: "suspected" },
    ]},
  { key: "age", question: "How old is your child?",
    options: [
      { label: "Under 3", value: "0-2" },
      { label: "3–5 (preschool)", value: "3-5" },
      { label: "6–12 (elementary/middle)", value: "6-12" },
      { label: "13–17 (transition age)", value: "13-17" },
    ]},
  { key: "diagnosed_by", question: "Who provided the diagnosis?",
    options: [
      { label: "School district", value: "school" },
      { label: "Pediatrician / PCP", value: "pediatrician" },
      { label: "Private specialist", value: "private" },
      { label: "Regional Center", value: "rc" },
      { label: "Not yet diagnosed", value: "none" },
    ]},
  { key: "rc_status", question: "Are you connected with a Regional Center?",
    options: [
      { label: "Don't know what it is", value: "unknown" },
      { label: "Know about it, haven't applied", value: "known" },
      { label: "Applied, waiting", value: "applied" },
      { label: "Active — have Service Coordinator", value: "active" },
      { label: "Not applicable", value: "na" },
    ]},
  { key: "iep_status", question: "Does your child have an IEP or 504 plan?",
    options: [
      { label: "No", value: "no" },
      { label: "Don't know what that is", value: "unknown" },
      { label: "Evaluation done, no IEP yet", value: "eval_done" },
      { label: "Yes, active IEP", value: "active" },
      { label: "Has a 504 plan", value: "504" },
      { label: "Not school-age yet", value: "na" },
    ]},
  { key: "insurance", question: "What health coverage does your child have?",
    options: [
      { label: "Private (employer)", value: "private" },
      { label: "Medi-Cal", value: "medicaid" },
      { label: "Both private + Medi-Cal", value: "both" },
      { label: "None / unsure", value: "none" },
    ]},
];

// ─── V4 CHECK-IN SYSTEM ───
// Three triggers: (1) all current actions done, (2) timed weekly, (3) life event
const CHECK_IN_QUESTIONS = {
  // ── Emotional check-in (appears when all actions done or weekly) ──
  emotional: {
    question: "How are you feeling about everything right now?",
    options: [
      { label: "Making progress, feeling good", value: "good", emoji: "💪" },
      { label: "Overwhelmed — too much at once", value: "overwhelmed", emoji: "😰" },
      { label: "Stuck — not sure what to do next", value: "stuck", emoji: "🤔" },
      { label: "Frustrated with a system/agency", value: "frustrated", emoji: "😤" },
      { label: "Something changed — need to update", value: "changed", emoji: "🔄" },
      { label: "Taking a break, come back later", value: "break", emoji: "☕" },
    ],
  },
  // ── Life event detection (follows "something changed") ──
  life_event: {
    question: "What changed?",
    options: [
      { label: "Got a new diagnosis", value: "new_diagnosis", emoji: "📋" },
      { label: "Child aged into new bracket", value: "age_change", emoji: "🎂" },
      { label: "RC status changed", value: "rc_change", emoji: "🏛" },
      { label: "IEP meeting happened / status changed", value: "iep_change", emoji: "📝" },
      { label: "Got denied / appealing something", value: "denial", emoji: "⚠️" },
      { label: "Insurance changed", value: "insurance_change", emoji: "💊" },
      { label: "We moved", value: "moved", emoji: "🏠" },
      { label: "Something else", value: "other", emoji: "💬" },
    ],
  },
  // ── Frustration follow-up ──
  frustration_target: {
    question: "Which system is giving you trouble?",
    options: [
      { label: "Regional Center", value: "rc", emoji: "🏛" },
      { label: "School district / IEP", value: "school", emoji: "🏫" },
      { label: "Insurance", value: "insurance", emoji: "💊" },
      { label: "SSI / Social Security", value: "ssi", emoji: "🏦" },
      { label: "IHSS", value: "ihss", emoji: "🏠" },
      { label: "Medi-Cal", value: "medicaid", emoji: "🏥" },
      { label: "Everything at once", value: "everything", emoji: "😵" },
    ],
  },
  // ── RC status delta ──
  rc_update: {
    question: "What's your RC status now?",
    options: [
      { label: "Applied / referral sent", value: "applied", emoji: "📤" },
      { label: "Intake scheduled", value: "intake_scheduled", emoji: "📅" },
      { label: "Evaluation in progress", value: "evaluating", emoji: "🔬" },
      { label: "Found eligible!", value: "eligible", emoji: "🎉" },
      { label: "Denied eligibility", value: "denied", emoji: "😢" },
      { label: "Got Service Coordinator", value: "active", emoji: "✅" },
    ],
  },
  // ── IEP status delta ──
  iep_update: {
    question: "What happened with the IEP?",
    options: [
      { label: "Evaluation request sent", value: "eval_requested", emoji: "📤" },
      { label: "Assessment plan received", value: "plan_received", emoji: "📋" },
      { label: "Evaluation complete", value: "eval_done", emoji: "📊" },
      { label: "IEP meeting scheduled", value: "meeting_scheduled", emoji: "📅" },
      { label: "IEP is now active!", value: "active", emoji: "🎉" },
      { label: "School denied eligibility", value: "denied", emoji: "😢" },
      { label: "We disagree with the IEP", value: "disagree", emoji: "⚠️" },
    ],
  },
  // ── NEW: what else does the family need? ──
  additional_needs: {
    question: "Is there anything else your family needs support with right now?",
    options: [
      { label: "After-school care / activities", value: "afterschool", emoji: "🎨" },
      { label: "Behavioral plan (BIP)", value: "bip", emoji: "📋" },
      { label: "Changing therapists or providers", value: "providers", emoji: "🔄" },
      { label: "IEP amendment / adjustments", value: "iep_amend", emoji: "📝" },
      { label: "Respite care / caregiver burnout", value: "respite", emoji: "🫂" },
      { label: "Financial help / benefits questions", value: "financial", emoji: "💰" },
      { label: "Nothing right now — I'm good", value: "none", emoji: "👍" },
    ],
  },
};

// ─── RENEWAL / MAINTENANCE CALENDAR ───
function generateRenewalActions(intake) {
  const actions = [];
  const rcEligible = ["autism","delay","id","cp","suspected"].includes(intake.diagnosis);
  // These only appear once family has active services
  if (intake.iep_status === "active") {
    actions.push({ id: "renewal_iep_annual", priority: "standard", agencyKey: "school", category: "renewal",
      title: "📆 Annual IEP review coming up", subtitle: "IEP must be reviewed within 12 months. Prepare parent concerns letter. You can request changes to goals, services, placement, and accommodations.",
      agency: "School District", deadline: "Within 12 months of last IEP",
      talkingPoints: ["I'd like to prepare for our annual IEP review. Can you send me a copy of the current IEP and progress reports?", "I have concerns I'd like to add to the agenda: [list]"],
      documents: ["Current IEP copy", "Quarterly progress reports", "Parent concerns letter", "Outside evaluations if any"],
      smsReminder: "30 days before annual IEP: 'Start preparing. Request progress reports. Draft concerns letter.'",
    });
    actions.push({ id: "renewal_iep_triennial", priority: "high", agencyKey: "school", category: "renewal",
      title: "📆 Triennial reassessment due (every 3 years)", subtitle: "Full re-evaluation required every 3 years. Do NOT waive — updated data protects eligibility and may reveal new areas of need.",
      agency: "School District", deadline: "Every 3 years from initial eval",
      talkingPoints: ["I do NOT wish to waive the triennial reassessment.", "I'd like testing in all areas of suspected disability, including any new concerns."],
      smsReminder: "60 days before triennial: 'Do NOT waive. Request full reassessment in all areas.'",
    });
  }
  if (intake.rc_status === "active" && rcEligible) {
    actions.push({ id: "renewal_ipp_annual", priority: "standard", agencyKey: "rceb", category: "renewal",
      title: "📆 Annual IPP review with RC", subtitle: "Review goals, services, and hours with your Service Coordinator. This is YOUR meeting — bring requests for new or increased services.",
      agency: "Regional Center", deadline: "Within 12 months of last IPP",
      talkingPoints: ["I'd like to add these services to our IPP: [list]", "I want to review our POS spending compared to similar families at this RC.", "Are there any new programs or grants available?"],
      smsReminder: "30 days before IPP review: 'Prepare service requests. Check POS spending data.'",
    });
  }
  if (intake.insurance !== "none") {
    actions.push({ id: "renewal_therapy_auth", priority: "high", agencyKey: "insurance", category: "renewal",
      title: "📆 Therapy authorization renewal", subtitle: "Insurance re-authorization required every 3-12 months depending on plan. Don't let it lapse — gaps in authorization = gaps in services.",
      agency: "Insurance", deadline: "Check auth expiration dates",
      talkingPoints: ["I need to renew authorization for [OT/speech/ABA]. Current auth expires [date].", "Please process this as continuation — no gaps in services."],
      smsReminder: "45 days before auth expires: 'Start renewal. Get provider progress report.'",
    });
  }
  if (intake.insurance === "medicaid" || intake.insurance === "both") {
    actions.push({ id: "renewal_medicaid", priority: "urgent", agencyKey: "medicaid", category: "renewal",
      title: "📆 Medi-Cal annual redetermination", subtitle: "Missing this = losing coverage = losing IHSS. Check mail for renewal packet. Respond immediately.",
      agency: "Medi-Cal / County", deadline: "Annually — check notice dates",
      smsReminder: "When renewal arrives: 'Complete Medi-Cal renewal IMMEDIATELY. This protects IHSS + therapy coverage.'",
    });
  }
  return actions;
}

// ─── ADDITIONAL SUPPORT ACTIONS (after-school, BIP, respite, etc.) ───
function generateSupportActions(needType, intake) {
  const actions = [];
  if (needType === "afterschool") {
    actions.push({ id: "support_afterschool", priority: "standard", agencyKey: null, category: "support",
      title: "Find inclusive after-school programs", subtitle: "RC may fund social skills groups and recreation programs. School district must provide extended school year (ESY) if regression documented. Community programs with inclusion support available.",
      agency: "RC / School / Community",
      talkingPoints: ["To RC: 'I'd like social skills groups or community integration services added to our IPP.'", "To school: 'I'd like to discuss ESY eligibility. Here is evidence of regression during breaks.'"],
      documents: ["ESY regression data (work samples before/after breaks)", "RC social skills group vendor list"],
    });
  }
  if (needType === "bip") {
    actions.push({ id: "support_bip", priority: "high", agencyKey: "school", category: "support",
      title: "Request Behavior Intervention Plan (BIP)", subtitle: "If your child has behavioral challenges at school, request a Functional Behavior Assessment (FBA) → BIP. The school MUST do this before suspending or removing a student with a disability.",
      agency: "School District",
      talkingPoints: ["I'm requesting a Functional Behavior Assessment for my child.", "Based on the FBA, I'd like a Behavior Intervention Plan developed as part of the IEP.", "My child should NOT be suspended without a Manifestation Determination Review."],
      draftMessage: `Dear [IEP Team/Principal],\n\nI am requesting a Functional Behavior Assessment (FBA) for my child, [Name]. [He/She/They] is experiencing behavioral challenges at school including [describe behaviors].\n\nPer IDEA, I request:\n1. A comprehensive FBA conducted by a qualified behavior specialist\n2. Development of a Behavior Intervention Plan (BIP) based on the FBA findings\n3. An IEP meeting to incorporate the BIP into [Name]'s IEP\n\nPlease provide an assessment plan within 15 days.\n\nSincerely,\n[Your Name]`,
    });
  }
  if (needType === "providers") {
    actions.push({ id: "support_providers", priority: "standard", agencyKey: null, category: "support",
      title: "Changing therapists or providers", subtitle: "You have the right to choose providers. For RC services, request vendor list from Service Coordinator. For insurance, check in-network directory. For school, you can request a different service provider.",
      agency: "RC / Insurance / School",
      talkingPoints: ["To RC: 'I'd like to see the full vendor list for [service type]. I want to explore other providers.'", "To insurance: 'I need to switch to a different in-network provider for [service].'", "To school: 'I have concerns about the current service delivery. I'd like to discuss alternatives at an IEP meeting.'"],
    });
  }
  if (needType === "iep_amend") {
    actions.push({ id: "support_iep_amend", priority: "high", agencyKey: "school", category: "support",
      title: "Request IEP amendment", subtitle: "You don't have to wait for the annual review. You can request an IEP meeting at ANY time to change goals, add services, update accommodations, or adjust placement.",
      agency: "School District",
      draftMessage: `Dear [Special Ed Director],\n\nI am requesting an IEP meeting for my child, [Name], to discuss amendments to the current IEP.\n\nI would like to discuss:\n- [List specific changes: new goals, additional services, updated accommodations, placement change, BIP, assistive technology, etc.]\n\nPer IDEA, I am requesting this meeting be scheduled within 30 calendar days.\n\nSincerely,\n[Your Name]`,
      talkingPoints: ["I don't need to wait for the annual review — I'm requesting an amendment meeting now.", "I'd like these specific changes: [list]"],
    });
  }
  if (needType === "respite") {
    const rcEligible = ["autism","delay","id","cp","suspected"].includes(intake.diagnosis);
    actions.push({ id: "support_respite", priority: "urgent", agencyKey: rcEligible ? "rceb" : null, category: "support",
      title: "Get respite care — you need a break", subtitle: rcEligible ? "Respite is the #1 most-used RC service. Request it in your IPP. IHSS also provides respite hours. You deserve support." : "Ask your pediatrician about respite resources. Local nonprofits and regional family resource centers may help.",
      agency: rcEligible ? "Regional Center / IHSS" : "Community Resources",
      talkingPoints: rcEligible ? [
        "I need respite care added to our IPP. I'm experiencing caregiver burnout.",
        "How many hours of respite can we get per month?",
        "Can my IHSS hours include respite time?",
      ] : ["I need caregiver support and respite options. What resources are available in our area?"],
    });
  }
  if (needType === "financial") {
    actions.push({ id: "support_financial", priority: "high", agencyKey: null, category: "support",
      title: "Review financial benefits and options", subtitle: "Let's make sure you're not leaving money on the table: SSI, IHSS (parent as paid provider), CalABLE, Medi-Cal waivers, tax deductions for medical/therapy expenses.",
      agency: "Multiple agencies",
      talkingPoints: ["Check SSI status: Am I receiving the maximum benefit?", "IHSS: Am I enrolled as paid provider for my child?", "CalABLE: Is my account set up?", "Tax prep: Am I deducting all eligible medical/therapy expenses?"],
    });
  }
  return actions;
}

// ─── FRUSTRATION → ESCALATION ACTIONS ───
function generateFrustrationActions(target, intake) {
  const actions = [];
  if (target === "rc" || target === "everything") {
    actions.push({ id: "escalate_rc", priority: "urgent", agencyKey: "rceb", category: "escalation",
      title: "Escalate Regional Center issue", subtitle: "You have multiple escalation paths: request supervisor, file 4731 complaint with DDS, contact Disability Rights California, or request Fair Hearing.",
      agency: "RC / DDS / DRC",
      talkingPoints: ["I'd like to speak with your supervisor about my case.", "If unresolved, I will file a 4731 complaint with the Dept of Developmental Services.", "Disability Rights California: 1-800-776-5746 (free legal help)"],
      draftMessage: `To: DDS Complaint Unit\nRe: 4731 Complaint Against [RC Name]\n\nI am filing a complaint regarding [RC Name]'s failure to:\n- [Describe issue: delayed services, denied request, unresponsive SC, etc.]\n\nRelevant facts:\n- Date of request/issue: [date]\n- Service Coordinator: [name]\n- Actions taken so far: [list]\n\nI request DDS investigate and ensure compliance with the Lanterman Act.\n\n[Your Name]\n[Phone/Email]`,
    });
  }
  if (target === "school" || target === "everything") {
    actions.push({ id: "escalate_school", priority: "urgent", agencyKey: "school", category: "escalation",
      title: "Escalate school district issue", subtitle: "File CDE compliance complaint (free, 60-day investigation). Or request mediation. Or file for due process hearing. Disability Rights California can help.",
      agency: "CDE / OAH / DRC",
      talkingPoints: ["I want to file a compliance complaint with the California Department of Education.", "I want to request mediation through the Office of Administrative Hearings.", "DRC free legal help: 1-800-776-5746"],
    });
  }
  if (target === "insurance" || target === "everything") {
    actions.push({ id: "escalate_insurance", priority: "urgent", agencyKey: "insurance", category: "escalation",
      title: "Escalate insurance issue", subtitle: "File formal appeal → if denied, request Independent Medical Review through DMHC (HMO) or CDI (PPO). They overturn denials frequently.",
      agency: "DMHC / CDI",
      talkingPoints: ["I want to file an Independent Medical Review.", "Is my plan regulated by DMHC or CDI? I need to file with the correct agency.", "DMHC: 1-888-466-2219 | CDI: 1-800-927-4357"],
    });
  }
  if (target === "ssi" || target === "everything") {
    actions.push({ id: "escalate_ssi", priority: "high", agencyKey: "ssa", category: "escalation",
      title: "Appeal SSI denial", subtitle: "You have 60 days to request reconsideration. After that: hearing before ALJ (highest overturn rate). Don't give up — most approvals happen at hearing.",
      agency: "SSA",
      talkingPoints: ["I want to request reconsideration of my child's SSI denial.", "Can I see a copy of the denial reason?", "I'd like to request a hearing before an Administrative Law Judge."],
    });
  }
  return actions;
}

// ─── LIFE EVENT → SMART DELTA RE-INTAKE ───
const DELTA_QUESTIONS = {
  new_diagnosis: [
    { key: "diagnosis", question: "What is the new/updated diagnosis?",
      options: INTAKE_QUESTIONS[0].options },
  ],
  age_change: [
    { key: "age", question: "What age bracket is your child in now?",
      options: INTAKE_QUESTIONS[1].options },
  ],
  rc_change: [
    { key: "rc_status", question: "What's your RC status now?",
      options: INTAKE_QUESTIONS[3].options },
  ],
  iep_change: [
    { key: "iep_status", question: "What's your IEP status now?",
      options: INTAKE_QUESTIONS[4].options },
  ],
  insurance_change: [
    { key: "insurance", question: "What insurance does your child have now?",
      options: INTAKE_QUESTIONS[5].options },
  ],
  denial: [
    { key: "denial_type", question: "What was denied?",
      options: [
        { label: "RC eligibility denied", value: "rc_denied" },
        { label: "IEP eligibility denied", value: "iep_denied" },
        { label: "Insurance denied therapy", value: "ins_denied" },
        { label: "SSI denied", value: "ssi_denied" },
        { label: "IHSS hours too low", value: "ihss_low" },
      ]},
  ],
};

// ─── V3 ENGINE (plan generator) — unchanged ───
function generatePlan(intake) {
  const { diagnosis, age, diagnosed_by, rc_status, iep_status, insurance } = intake;
  const actions = [];
  let priorityCounter = 0;
  const urgent = () => ({ priority: "urgent", order: priorityCounter++ });
  const high = () => ({ priority: "high", order: priorityCounter++ });
  const standard = () => ({ priority: "standard", order: priorityCounter++ });
  const rcEligible = ["autism","delay","id","cp","suspected"].includes(diagnosis);
  const needsRC = rcEligible && !["active","applied"].includes(rc_status);
  const needsIEP = !["active","eval_done"].includes(iep_status) && age !== "0-2";
  const isEarlyStart = age === "0-2";
  const isTransition = age === "13-17";
  const needsMediCal = ["private","none"].includes(insurance);
  const needsDiagnosis = diagnosed_by === "none" || diagnosis === "suspected";

  // BLOCK 1: RC
  if (isEarlyStart && rcEligible && rc_status !== "active") {
    actions.push({ id: "es_refer", ...urgent(), agencyKey: "earlystart", title: "Call Regional Center for Early Start referral",
      subtitle: "Early Start serves ages 0-3. Lower eligibility threshold. IFSP within 45 days.", agency: "Early Start / RC", deadline: "Call this week",
      talkingPoints: ["I'd like to refer my child for Early Start services.", "What documents do I need for intake?", "I understand the IFSP should be developed within 45 days."],
      documents: ["Birth certificate", "Medical records", "Any evaluations"], smsReminder: "Tomorrow 9am: 'Call RC for Early Start.'", followUpKey: "rc_done" });
  } else if (needsRC && !isEarlyStart) {
    actions.push({ id: "rc_refer", ...urgent(), agencyKey: "rceb", title: "Call Regional Center to start your referral",
      subtitle: "Your child's diagnosis qualifies. Free evaluation, Service Coordinator, funded services.", agency: "RCEB", deadline: "Call this week",
      talkingPoints: [`I'd like to make a referral for my child who ${needsDiagnosis ? "I believe has developmental delays" : `was diagnosed with ${diagnosis}`}.`, "What documents should I bring?"],
      documents: diagnosed_by !== "none" ? ["Diagnosis report", "Birth certificate", "CA residency", "Medical records"] : ["Birth certificate", "CA residency", "Medical records", "Written concerns"],
      smsReminder: "Tomorrow 9am: 'Call RCEB (510) 618-6100.'", followUpKey: "rc_done" });
  } else if (rc_status === "applied") {
    actions.push({ id: "rc_followup", ...high(), agencyKey: "rceb", title: "Follow up on RC application status",
      subtitle: "120-day statutory deadline from referral.", agency: "RCEB", deadline: "Call this week",
      talkingPoints: ["I'm checking on my child's referral status.", "Lanterman Act requires intake within 15 days."], smsReminder: "Tomorrow: 'Call RCEB to check referral status.'" });
  }
  // BLOCK 2: Diagnosis
  if (needsDiagnosis && !isEarlyStart) {
    actions.push({ id: "get_eval", ...urgent(), agencyKey: null, title: "Get a formal evaluation for your child",
      subtitle: "Dual-track: school district (free) + Regional Center (free). Both simultaneously is fastest.", agency: "Multiple options", deadline: "Start this week",
      talkingPoints: ["To pediatrician: 'I'd like a referral for a developmental evaluation.'", "To school: 'I'm requesting a special education evaluation in writing.'"],
      smsReminder: "This week: 'Request eval from school AND call RC. Both free.'" });
  }
  // BLOCK 3: School / IEP
  if (needsIEP && iep_status !== "na") {
    const hasSchoolEval = diagnosed_by === "school" || iep_status === "eval_done";
    if (hasSchoolEval) {
      actions.push({ id: "iep_request", ...urgent(), agencyKey: "school", title: "Send written request for IEP meeting",
        subtitle: "School evaluated — now they owe you an IEP. 30 days.", agency: "School District", deadline: "30 days from evaluation",
        draftMessage: `Dear [Principal/Special Ed Director],\n\nI request an IEP meeting for [Name], DOB [date], in [grade] at [school].\n\n[Name] was evaluated and found to have [diagnosis]. Per IDEA and CA Ed Code, I request a meeting within 30 days.\n\nSincerely,\n[Your Name]`,
        smsReminder: "Monday: 'Send IEP request. Email + certified mail.'", followUpKey: "iep_done" });
    } else {
      actions.push({ id: "school_eval", ...urgent(), agencyKey: "school", title: "Request school district evaluation (in writing)",
        subtitle: "District must respond within 15 days. FREE. Separate from RC.", agency: "School District", deadline: "Send this week",
        draftMessage: `Dear [Principal/Special Ed Director],\n\nI request a comprehensive special education evaluation for [Name], DOB [date], in [grade] at [school].\n\nConcerns: [describe]. Please assess in ALL areas of suspected disability.\n\nPlease provide an assessment plan within 15 days per CA Ed Code §56321.\n\nSincerely,\n[Your Name]`,
        smsReminder: "Monday: 'Send eval request. Email + certified mail.'", followUpKey: "school_eval_done" });
    }
  } else if (iep_status === "active" && isTransition) {
    actions.push({ id: "transition_iep", ...high(), agencyKey: "school", title: "Ensure transition goals are in your IEP",
      subtitle: "By age 16, IEP must include postsecondary goals.", agency: "School District", deadline: "Before next annual review",
      talkingPoints: ["I want transition goals for postsecondary education, employment, and independent living.", "Invite RC transition coordinator and DOR to our IEP meeting."] });
  }
  // BLOCK 4: Therapy / Insurance
  if ((diagnosis === "autism" || diagnosis === "delay" || diagnosis === "cp") && (insurance === "private" || insurance === "both")) {
    actions.push({ id: "ot_referral", ...urgent(), agencyKey: null, title: "Get pediatrician referral for therapy",
      subtitle: "Insurance requires physician referral.", agency: "Pediatrician", deadline: "Call this week",
      talkingPoints: [`My child has ${diagnosis}. I need referrals for OT${diagnosis === "autism" ? " and ABA" : ""} and a medical necessity letter.`],
      smsReminder: "Tomorrow: 'Call pediatrician for therapy referrals.'", followUpKey: "ped_done" });
    actions.push({ id: "ins_check", ...urgent(), agencyKey: "insurance", title: "Call insurance for therapy coverage",
      subtitle: diagnosis === "autism" ? "CA law mandates ABA coverage." : "Confirm OT/speech coverage.", agency: "Insurance", deadline: "After getting referral",
      talkingPoints: ["I'm calling about therapy coverage. Diagnosis code: " + (diagnosis === "autism" ? "F84.0" : "F88"), "What's the prior auth process?"],
      smsReminder: "After referral: 'Call insurance re: therapy coverage.'", followUpKey: "ins_done", dependsOn: "ot_referral" });
  }
  // BLOCK 5: Benefits
  if (needsMediCal && rcEligible) {
    actions.push({ id: "medicaid_apply", ...high(), agencyKey: "medicaid", title: "Apply for Medi-Cal",
      subtitle: "Even with private insurance — unlocks IHSS and HCBS-DD waiver.", agency: "Medi-Cal / County", deadline: "Within 30 days",
      smsReminder: "Next week: 'Apply for Medi-Cal.'" });
  }
  if (rcEligible && diagnosis !== "sld") {
    actions.push({ id: "ssi_apply", ...high(), agencyKey: "ssa", title: "Start SSI application",
      subtitle: "~$943/mo in CA. High denial rate — start early. Function Report is KEY.", agency: "SSA", deadline: "Within 30 days",
      smsReminder: "In 2 weeks: 'Start SSI. Function Report: describe WORST days.'" });
    if (insurance === "medicaid" || insurance === "both") {
      actions.push({ id: "ihss_apply", ...high(), agencyKey: "ihss", title: "Apply for IHSS",
        subtitle: "Parents can be paid providers. Requires Medi-Cal.", agency: "County IHSS", deadline: "After Medi-Cal active",
        dependsOn: insurance === "medicaid" || insurance === "both" ? null : "medicaid_apply",
        smsReminder: "After Medi-Cal: 'Apply for IHSS.'" });
    }
  }
  // BLOCK 6: SLD
  if (diagnosis === "sld") {
    actions.push({ id: "sld_private_eval", ...high(), agencyKey: null, title: "Consider private psychoeducational evaluation",
      subtitle: "School evals often insufficient. Or request IEE at district expense.", agency: "Private Neuropsychologist", deadline: "If school eval feels incomplete" });
    actions.push({ id: "sld_504", ...standard(), agencyKey: "school", title: "Know your 504 plan option",
      subtitle: "If IEP denied, 504 provides accommodations.", agency: "School District" });
  }
  // BLOCK 7: ADHD
  if (diagnosis === "adhd") {
    actions.push({ id: "adhd_504", ...urgent(), agencyKey: "school", title: "Request 504 plan or IEP evaluation",
      subtitle: "ADHD = Other Health Impairment for IEP. Or Section 504 for accommodations.", agency: "School District", deadline: "Send this week",
      draftMessage: `Dear [Principal],\n\nI request evaluation for IEP or 504 for [Name], diagnosed with ADHD, which substantially limits learning.\n\nSincerely,\n[Your Name]` });
  }
  // BLOCK 8: Transition
  if (isTransition && rcEligible) {
    actions.push({ id: "dor_apply", ...standard(), agencyKey: "dor", title: "Apply to Dept of Rehabilitation (DOR)",
      subtitle: "Job training, supported employment. Long waitlists — apply early.", agency: "DOR", deadline: "By age 15-16" });
    actions.push({ id: "conserv_plan", ...standard(), agencyKey: null, title: "Start conservatorship / SDM planning",
      subtitle: "At 18 your child becomes legal adult. Start 6-12 months before.", agency: "Attorney / Court", deadline: "6-12 months before age 18" });
  }
  // BLOCK 9: Financial
  if (rcEligible) {
    actions.push({ id: "calable", ...standard(), agencyKey: null, title: "Set up CalABLE account",
      subtitle: "Tax-advantaged savings. $100K SSI-exempt.", agency: "CalABLE" });
  }
  return actions;
}

// ─── Follow-up configs ───
const FOLLOWUPS = {
  rc_done: { question: "How did the RC call go?", options: [
    { label: "Intake scheduled!", value: "scheduled", emoji: "✅" },
    { label: "Left voicemail", value: "voicemail", emoji: "📞" },
    { label: "Line busy / couldn't reach", value: "busy", emoji: "😤" },
    { label: "Need more help", value: "confused", emoji: "❓" },
  ]},
  iep_done: { question: "What happened with the IEP letter?", options: [
    { label: "Sent, got confirmation", value: "confirmed", emoji: "✅" },
    { label: "Sent, no response yet", value: "waiting", emoji: "⏳" },
    { label: "Haven't sent yet", value: "not_sent", emoji: "📝" },
    { label: "Meeting scheduled", value: "scheduled", emoji: "🎉" },
  ]},
  school_eval_done: { question: "What happened with the eval request?", options: [
    { label: "Assessment plan received!", value: "plan_received", emoji: "✅" },
    { label: "Sent, waiting", value: "waiting", emoji: "⏳" },
    { label: "School refused / delayed", value: "refused", emoji: "🚫" },
    { label: "Haven't sent yet", value: "not_sent", emoji: "📝" },
  ]},
  ped_done: { question: "Did you get the referral?", options: [
    { label: "Yes, referral in hand", value: "got_it", emoji: "✅" },
    { label: "Appointment scheduled", value: "appt_set", emoji: "📅" },
    { label: "Pediatrician refused", value: "refused", emoji: "⚠️" },
  ]},
  ins_done: { question: "What did insurance say?", options: [
    { label: "Approved!", value: "approved", emoji: "✅" },
    { label: "Prior auth submitted", value: "pending", emoji: "⏳" },
    { label: "Denied", value: "denied", emoji: "🚫" },
  ]},
};

function getFollowUpActions(key, answer, intake) {
  const a = [];
  if (key === "rc_done" && answer === "voicemail") {
    a.push({ id: "rc_retry", priority: "urgent", agencyKey: "rceb", title: "Follow up with RC — call again tomorrow 8:30am", subtitle: "Lines clearest first thing.", agency: "RCEB", deadline: "Tomorrow 8:30am", followUpKey: "rc_done" });
  }
  if (key === "rc_done" && answer === "busy") {
    a.push({ id: "rc_email", priority: "urgent", agencyKey: "rceb", title: "Email RC intake directly", subtitle: "Creates paper trail + triggers 15-day deadline.", agency: "RCEB", deadline: "Send today",
      draftMessage: `Subject: Referral Request — [Child Name]\n\nDear RCEB Intake,\n\nI am requesting evaluation for my child. I have been unable to reach intake by phone. Per the Lanterman Act, intake should be scheduled within 15 days.\n\nThank you,\n[Your Name]` });
  }
  if (key === "ins_done" && answer === "denied") {
    a.push({ id: "ins_appeal", priority: "urgent", agencyKey: "insurance", title: "⚠️ File insurance appeal immediately", subtitle: "30 days to appeal. Denials are commonly overturned.", agency: "Insurance / DMHC", deadline: "Within 30 days",
      draftMessage: `Dear Appeals Dept,\n\nI appeal the denial of [service] for [Name], Member ID [number].\n\nBasis: Medical necessity per evaluation. ${intake.diagnosis === "autism" ? "CA SB 946 mandates behavioral health coverage." : ""}\n\nIf denied again, I will request Independent Medical Review.\n\nAttached: evaluation, referral, denial letter.\n\n[Your Name]` });
  }
  if (key === "school_eval_done" && answer === "refused") {
    a.push({ id: "school_complaint", priority: "urgent", agencyKey: "school", title: "⚠️ File CDE compliance complaint", subtitle: "Schools cannot refuse evaluation upon written request.", agency: "CDE", deadline: "File within 1 year",
      draftMessage: `Dear CDE Complaint Unit,\n\nI am filing a compliance complaint against [District] for failure to evaluate per IDEA.\n\nOn [date], I submitted a written request. The district has [refused/not responded].\n\nViolations: 34 CFR §300.301, CA Ed Code §56321.\n\nAttached: my written request with date.\n\n[Your Name]` });
  }
  if (answer === "not_sent") return [];
  return a;
}

// ─── DENIAL → IMMEDIATE APPEAL ACTIONS ───
function generateDenialActions(denialType, intake) {
  const actions = [];
  if (denialType === "rc_denied") {
    actions.push({ id: "appeal_rc", priority: "urgent", agencyKey: "rceb", category: "appeal", title: "⚠️ Appeal RC eligibility denial",
      subtitle: "You have the right to a Fair Hearing. Also file 4731 complaint with DDS. Contact Disability Rights California for free legal help.",
      agency: "RC / OAH / DRC", deadline: "Immediately",
      talkingPoints: ["I want to appeal the eligibility denial.", "I'm requesting a Fair Hearing.", "DRC: 1-800-776-5746"],
      draftMessage: `Dear [RC Director],\n\nI am formally appealing the denial of Lanterman Act eligibility for my child, [Name].\n\nI request:\n1. Written explanation of denial with specific criteria not met\n2. All evaluation reports used in determination\n3. A Fair Hearing through the Office of Administrative Hearings\n\nI have contacted Disability Rights California for legal assistance.\n\n[Your Name]` });
  }
  if (denialType === "iep_denied") {
    actions.push({ id: "appeal_iep", priority: "urgent", agencyKey: "school", category: "appeal", title: "⚠️ Challenge IEP eligibility denial",
      subtitle: "Request Prior Written Notice explaining why. Consider IEE at district expense. File CDE complaint or request mediation.", agency: "School / CDE",
      talkingPoints: ["I want Prior Written Notice explaining exactly why my child was denied.", "I disagree with the evaluation and request an IEE at district expense.", "I'm considering filing a compliance complaint with CDE."] });
  }
  if (denialType === "ins_denied") {
    actions.push({ id: "appeal_ins", priority: "urgent", agencyKey: "insurance", category: "appeal", title: "⚠️ Appeal insurance denial",
      subtitle: "Internal appeal → DMHC/CDI external review. They overturn frequently.", agency: "Insurance / DMHC / CDI", deadline: "Within 30 days" });
  }
  if (denialType === "ssi_denied") {
    actions.push({ id: "appeal_ssi", priority: "urgent", agencyKey: "ssa", category: "appeal", title: "⚠️ Appeal SSI denial",
      subtitle: "Request reconsideration within 60 days. Most approvals happen at ALJ hearing. Don't give up.", agency: "SSA", deadline: "60 days" });
  }
  if (denialType === "ihss_low") {
    actions.push({ id: "appeal_ihss", priority: "high", agencyKey: "ihss", category: "appeal", title: "Request IHSS reassessment for more hours",
      subtitle: "You can request reassessment at any time. Prepare a detailed 24-hour care log.", agency: "County IHSS",
      talkingPoints: ["I want to request a reassessment. My child's needs have increased.", "I have a detailed 24-hour care log documenting all tasks."] });
  }
  return actions;
}

// ─── Rendering helpers ───
function Sec({title,text}){return <div style={{marginBottom:12}}><div style={{fontSize:10,fontWeight:700,color:C.accent,letterSpacing:0.5,marginBottom:4,textTransform:"uppercase"}}>{title}</div><div style={{fontSize:13,color:C.text,lineHeight:1.5}}>{text}</div></div>}
function List({title,items,color}){return <div style={{marginBottom:12}}><div style={{fontSize:10,fontWeight:700,color,letterSpacing:0.5,marginBottom:6,textTransform:"uppercase"}}>{title}</div>{items.map((it,i)=><div key={i} style={{display:"flex",gap:6,marginBottom:3,fontSize:13,color:C.text,lineHeight:1.4}}><span style={{color,fontWeight:700}}>→</span>{it}</div>)}</div>}

function AgencyPanel({ agencyKey, onClose }) {
  const a = AGENCIES[agencyKey]; if (!a) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",justifyContent:"flex-end"}} onClick={onClose}>
      <div style={{width:"100%",maxWidth:420,background:C.bg,height:"100%",overflowY:"auto",padding:24,boxShadow:"-8px 0 32px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div><div style={{fontSize:18,fontWeight:800,color:C.text}}>{a.name}</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>{a.type}</div></div>
          <button onClick={onClose} style={{background:C.mutedLight,border:"none",borderRadius:8,width:32,height:32,fontSize:16,cursor:"pointer",color:C.muted}}>×</button>
        </div>
        {(a.phone||a.website)&&<div style={{background:C.accentLight,borderRadius:10,padding:12,marginBottom:14,fontSize:13}}>{a.phone&&<div>📞 {a.phone}</div>}{a.website&&<div>🌐 {a.website}</div>}{a.hours&&<div>🕐 {a.hours}</div>}</div>}
        <Sec title="What they do" text={a.what}/>{a.services&&<List title="Services" items={a.services} color={C.accent}/>}{a.rights&&<List title="Your rights" items={a.rights} color={C.success}/>}
        {a.watchOut&&<div style={{background:C.urgentLight,borderRadius:10,padding:12,marginTop:12,borderLeft:`3px solid ${C.urgent}`}}><div style={{fontSize:10,fontWeight:700,color:C.urgent,letterSpacing:0.5,marginBottom:4,textTransform:"uppercase"}}>⚠ Watch out</div><div style={{fontSize:13,color:C.text,lineHeight:1.5}}>{a.watchOut}</div></div>}
      </div>
    </div>);
}

function ActionCard({ action, onComplete, onExpand, expanded, onAgency, followUpUI, onFollowUp }) {
  const done = action.completed; const locked = action.locked;
  const isRenewal = action.category === "renewal"; const isSupport = action.category === "support"; const isEscalation = action.category === "escalation" || action.category === "appeal";
  const pr = { urgent:{bg:C.urgentLight,border:C.urgentBorder,badge:C.urgent,label:"DO THIS WEEK"}, high:{bg:C.warnLight,border:C.warnBorder,badge:C.warn,label:"NEXT 30 DAYS"}, standard:{bg:C.accentLight,border:"#BFDBFE",badge:C.accent,label:"WHEN READY"} };
  let p = done ? {bg:C.successLight,border:C.successBorder,badge:C.success,label:"✓ DONE"} : locked ? {bg:C.mutedLight,border:C.border,badge:C.muted,label:"LOCKED"} : pr[action.priority];
  if (isRenewal && !done) p = {bg:C.tealLight,border:C.tealBorder,badge:C.teal,label:"📆 RENEWAL"};
  if (isSupport && !done) p = {bg:C.warmBg,border:"#FED7AA",badge:C.warn,label:"SUPPORT"};
  if (isEscalation && !done) p = {bg:C.roseLight,border:C.roseBorder,badge:C.rose,label:"⚡ ESCALATION"};

  return (
    <div style={{background:done?C.successLight:locked?"#FAFAFA":C.card,border:`1.5px solid ${done?C.successBorder:p.border}`,borderRadius:14,marginBottom:12,overflow:"hidden",opacity:done&&!followUpUI?0.6:locked?0.5:1,boxShadow:expanded?"0 4px 20px rgba(0,0,0,0.07)":"0 1px 3px rgba(0,0,0,0.04)",transition:"all 0.25s"}}>
      <div onClick={locked?undefined:()=>onExpand()} style={{padding:"14px 18px",cursor:locked?"default":"pointer",display:"flex",alignItems:"flex-start",gap:12}}>
        <div onClick={e=>{e.stopPropagation();if(!locked)onComplete()}} style={{width:24,height:24,minWidth:24,borderRadius:7,border:`2px solid ${done?C.success:p.badge}`,background:done?C.success:"white",display:"flex",alignItems:"center",justifyContent:"center",cursor:locked?"default":"pointer",marginTop:2}}>
          {done&&<span style={{color:"white",fontSize:13,fontWeight:700}}>✓</span>}{locked&&<span style={{color:C.muted,fontSize:10}}>🔒</span>}
        </div>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
            <span style={{fontSize:9,fontWeight:700,letterSpacing:0.7,color:p.badge,background:p.bg,padding:"2px 7px",borderRadius:4}}>{p.label}</span>
            {action.agencyKey&&<button onClick={e=>{e.stopPropagation();onAgency(action.agencyKey)}} style={{fontSize:9,color:C.accent,fontWeight:600,background:"none",border:`1px solid ${C.accent}`,borderRadius:4,padding:"1px 5px",cursor:"pointer"}}>{action.agency} ℹ️</button>}
            {!action.agencyKey&&action.agency&&<span style={{fontSize:9,color:C.muted,fontWeight:500}}>{action.agency}</span>}
            {action.deadline&&!done&&!locked&&<span style={{fontSize:9,color:C.urgent,fontWeight:600}}>⏱ {action.deadline}</span>}
          </div>
          <div style={{fontSize:14,fontWeight:600,color:C.text,lineHeight:1.3,textDecoration:done&&!followUpUI?"line-through":"none"}}>{action.title}</div>
          <div style={{fontSize:12,color:C.textSec,marginTop:2,lineHeight:1.4}}>{action.subtitle}</div>
          {locked&&<div style={{fontSize:11,color:C.muted,marginTop:4,fontStyle:"italic"}}>🔒 Unlocks after: {action.dependsOnLabel||action.dependsOn}</div>}
        </div>
        {!locked&&<div style={{fontSize:16,color:C.muted,transform:expanded?"rotate(180deg)":"rotate(0)",transition:"transform 0.2s",marginTop:3}}>▾</div>}
      </div>
      {followUpUI&&<div style={{padding:"0 18px 14px 54px"}}><div style={{background:C.purpleLight,borderRadius:10,padding:14,border:"1.5px solid #DDD6FE"}}><div style={{fontSize:13,fontWeight:700,color:C.purple,marginBottom:10}}>{followUpUI.question}</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{followUpUI.options.map((o,i)=><button key={i} onClick={()=>onFollowUp(o.value)} style={{padding:"7px 12px",borderRadius:8,fontSize:12,fontWeight:500,border:"1.5px solid #DDD6FE",background:"white",cursor:"pointer",color:C.text,display:"flex",alignItems:"center",gap:5}}><span>{o.emoji}</span>{o.label}</button>)}</div></div></div>}
      {expanded&&!followUpUI&&!locked&&<div style={{padding:"0 18px 16px 54px"}}>
        {action.talkingPoints&&<div style={{marginBottom:14}}><div style={{fontSize:10,fontWeight:700,color:C.accent,letterSpacing:0.5,marginBottom:6,textTransform:"uppercase"}}>📞 What to say</div><div style={{background:C.accentLight,borderRadius:8,padding:12,borderLeft:`3px solid ${C.accent}`}}>{action.talkingPoints.map((t,i)=><div key={i} style={{fontSize:12,color:C.text,lineHeight:1.5,marginBottom:i<action.talkingPoints.length-1?8:0,fontStyle:"italic"}}>"{t}"</div>)}</div></div>}
        {action.draftMessage&&<div style={{marginBottom:14}}><div style={{fontSize:10,fontWeight:700,color:C.purple,letterSpacing:0.5,marginBottom:6,textTransform:"uppercase"}}>✉ Draft ready</div><div style={{background:C.purpleLight,borderRadius:8,padding:12,borderLeft:`3px solid ${C.purple}`,fontSize:12,color:C.text,lineHeight:1.5,whiteSpace:"pre-line",maxHeight:180,overflowY:"auto"}}>{action.draftMessage}</div></div>}
        {action.documents&&<div style={{marginBottom:14}}><div style={{fontSize:10,fontWeight:700,color:C.warn,letterSpacing:0.5,marginBottom:6,textTransform:"uppercase"}}>📄 Documents</div>{action.documents.map((d,i)=><div key={i} style={{display:"flex",gap:6,marginBottom:3,fontSize:12,color:C.textSec}}><span style={{color:C.warn}}>○</span>{d}</div>)}</div>}
        {action.smsReminder&&<div style={{background:C.mutedLight,borderRadius:8,padding:10,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18}}>🔔</span><div style={{flex:1}}><div style={{fontSize:11,fontWeight:600,color:C.text}}>SMS Reminder</div><div style={{fontSize:10,color:C.muted}}>{action.smsReminder}</div></div></div>}
      </div>}
    </div>);
}

// ─── Check-In Card ───
function CheckInCard({ config, onAnswer, style }) {
  return (
    <div style={{ background: `linear-gradient(135deg, ${C.tealLight}, #F0F9FF)`, borderRadius: 16, padding: 20, border: `2px solid ${C.tealBorder}`, boxShadow: "0 4px 24px rgba(13,148,136,0.1)", ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: C.teal, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💬</div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.teal, letterSpacing: 0.8, textTransform: "uppercase" }}>Check-in</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{config.question}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {config.options.map((o, i) => (
          <button key={i} onClick={() => onAnswer(o.value)} style={{
            padding: "11px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500, textAlign: "left",
            border: `1.5px solid ${C.tealBorder}`, background: "white", color: C.text, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s",
          }}>
            <span style={{ fontSize: 18 }}>{o.emoji}</span>{o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Emotional Throttle Banner ───
function ThrottleBanner({ onDismiss }) {
  return (
    <div style={{ background: `linear-gradient(135deg, ${C.roseLight}, #FFF7ED)`, borderRadius: 14, padding: 18, border: `2px solid ${C.roseBorder}`, marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ fontSize: 28 }}>🫂</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>We hear you. You're doing more than most people realize.</div>
          <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.5, marginBottom: 10 }}>We've paused your lower-priority items and moved just your most important next step to the top. Take it one thing at a time.</div>
          <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6, background: "white", borderRadius: 8, padding: 12, border: `1px solid ${C.roseBorder}` }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Support resources:</div>
            <div>📞 <b>Disability Rights CA:</b> 1-800-776-5746 (free legal help)</div>
            <div>📞 <b>Family Resource Centers:</b> Ask your RC for your local FRC</div>
            <div>📞 <b>NAMI Helpline:</b> 1-800-950-6264 (emotional support)</div>
            <div>📞 <b>Parent to Parent:</b> Peer support from other parents</div>
          </div>
          <button onClick={onDismiss} style={{ marginTop: 10, background: C.teal, color: "white", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>I'm ready to continue with my top action</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ───
export default function WaypointV4() {
  // Core state (from V3)
  const [phase, setPhase] = useState("intake"); // intake | plan | checkin | delta
  const [intake, setIntake] = useState({});
  const [step, setStep] = useState(0);
  const [actions, setActions] = useState([]);
  const [completed, setCompleted] = useState(new Set());
  const [expanded, setExpanded] = useState(-1);
  const [agencyPanel, setAgencyPanel] = useState(null);
  const [pendingFollowUp, setPendingFollowUp] = useState(null);
  const [outcomes, setOutcomes] = useState({});
  const [dynamicActions, setDynamicActions] = useState([]);

  // V4 state: check-in loop
  const [checkInStep, setCheckInStep] = useState(null); // which check-in question to show
  const [emotionalState, setEmotionalState] = useState(null); // good | overwhelmed | stuck | frustrated | break
  const [throttled, setThrottled] = useState(false); // emotional throttle active
  const [renewalActions, setRenewalActions] = useState([]);
  const [supportActions, setSupportActions] = useState([]);
  const [showRenewals, setShowRenewals] = useState(false);

  // Delta re-intake state
  const [deltaQuestions, setDeltaQuestions] = useState([]);
  const [deltaStep, setDeltaStep] = useState(0);
  const [deltaAnswers, setDeltaAnswers] = useState({});

  // ─── Trigger check-in when all current actions are done ───
  const allActions = [...actions, ...dynamicActions, ...supportActions];
  const resolvedActions = allActions.map(a => {
    if (a.dependsOn) {
      const dep = allActions.find(d => d.id === a.dependsOn);
      const depIdx = dep ? allActions.indexOf(dep) : -1;
      const depCompleted = depIdx >= 0 ? completed.has(depIdx) : false;
      return { ...a, locked: !depCompleted, dependsOnLabel: dep?.title?.slice(0, 40) };
    }
    return { ...a, locked: false };
  });

  const completedCount = completed.size;
  const activeActions = resolvedActions.filter((_, i) => !completed.has(i));
  const totalActions = resolvedActions.length;
  const progress = totalActions > 0 ? Math.round((completedCount / totalActions) * 100) : 0;
  const allDone = activeActions.length === 0 && totalActions > 0;

  // ─── Intake handler ───
  const handleIntake = (value) => {
    const next = { ...intake, [INTAKE_QUESTIONS[step].key]: value };
    setIntake(next);
    if (step < INTAKE_QUESTIONS.length - 1) {
      setTimeout(() => setStep(step + 1), 200);
    } else {
      const plan = generatePlan(next);
      setActions(plan);
      const renewals = generateRenewalActions(next);
      setRenewalActions(renewals);
      setExpanded(0);
      setTimeout(() => setPhase("plan"), 300);
    }
  };

  // ─── Completion handler ───
  const handleComplete = (idx) => {
    const action = resolvedActions[idx];
    if (action.locked) return;
    if (!completed.has(idx)) {
      setCompleted(prev => new Set([...prev, idx]));
      if (action.followUpKey && FOLLOWUPS[action.followUpKey]) {
        setPendingFollowUp({ idx, key: action.followUpKey });
      }
      const nextIdx = resolvedActions.findIndex((a, i) => i > idx && !completed.has(i) && !a.locked);
      if (nextIdx >= 0) setExpanded(nextIdx);
    } else {
      setCompleted(prev => { const n = new Set(prev); n.delete(idx); return n; });
      setPendingFollowUp(null);
    }
  };

  // ─── Follow-up handler ───
  const handleFollowUp = (idx, answer) => {
    const action = resolvedActions[idx];
    setOutcomes(prev => ({ ...prev, [action.followUpKey]: answer }));
    setPendingFollowUp(null);
    if (answer === "not_sent") {
      setCompleted(prev => { const n = new Set(prev); n.delete(idx); return n; });
      return;
    }
    const newActions = getFollowUpActions(action.followUpKey, answer, intake);
    if (newActions.length) setDynamicActions(prev => [...prev, ...newActions]);
  };

  // ─── CHECK-IN FLOW HANDLER ───
  const handleCheckIn = (questionKey, answer) => {
    if (questionKey === "emotional") {
      setEmotionalState(answer);
      if (answer === "good") {
        // Great — show additional needs question
        setCheckInStep("additional_needs");
      } else if (answer === "overwhelmed") {
        // Throttle: show support, reduce visible actions
        setThrottled(true);
        setCheckInStep(null);
        setPhase("plan");
      } else if (answer === "stuck") {
        // Show additional needs to figure out what to surface
        setCheckInStep("additional_needs");
      } else if (answer === "frustrated") {
        setCheckInStep("frustration_target");
      } else if (answer === "changed") {
        setCheckInStep("life_event");
      } else if (answer === "break") {
        setCheckInStep(null);
        setPhase("plan");
      }
    } else if (questionKey === "frustration_target") {
      // Generate escalation actions based on target
      const escalation = generateFrustrationActions(answer, intake);
      if (escalation.length) setDynamicActions(prev => [...prev, ...escalation]);
      setCheckInStep("additional_needs"); // Then check for other needs
    } else if (questionKey === "life_event") {
      // Smart delta: show only the question(s) that changed
      if (answer === "denial") {
        setDeltaQuestions(DELTA_QUESTIONS.denial);
        setDeltaStep(0);
        setDeltaAnswers({});
        setPhase("delta");
        setCheckInStep(null);
      } else if (answer === "other") {
        setCheckInStep("additional_needs");
      } else {
        const dq = DELTA_QUESTIONS[answer];
        if (dq) {
          setDeltaQuestions(dq);
          setDeltaStep(0);
          setDeltaAnswers({});
          setPhase("delta");
          setCheckInStep(null);
        } else {
          setCheckInStep("additional_needs");
        }
      }
    } else if (questionKey === "additional_needs") {
      if (answer !== "none") {
        const support = generateSupportActions(answer, intake);
        if (support.length) setSupportActions(prev => [...prev, ...support]);
      }
      setCheckInStep(null);
      setPhase("plan");
    }
  };

  // ─── DELTA RE-INTAKE HANDLER ───
  const handleDelta = (value) => {
    const q = deltaQuestions[deltaStep];
    const newAnswers = { ...deltaAnswers, [q.key]: value };
    setDeltaAnswers(newAnswers);

    if (deltaStep < deltaQuestions.length - 1) {
      setTimeout(() => setDeltaStep(deltaStep + 1), 200);
    } else {
      // Apply delta to intake and re-generate plan
      if (q.key === "denial_type") {
        // Denial: inject appeal actions
        const denialActions = generateDenialActions(value, intake);
        setDynamicActions(prev => [...prev, ...denialActions]);
        setPhase("plan");
      } else {
        // Update intake and re-gen
        const updatedIntake = { ...intake, ...newAnswers };
        setIntake(updatedIntake);
        // Re-generate base plan with new intake
        const newPlan = generatePlan(updatedIntake);
        // Keep dynamic/support actions, replace base actions
        setActions(newPlan);
        const renewals = generateRenewalActions(updatedIntake);
        setRenewalActions(renewals);
        // Reset completed for new actions (keep dynamic completions)
        setCompleted(new Set());
        setExpanded(0);
        setPhase("plan");
      }
    }
  };

  // ─── Filter actions if throttled ───
  const displayActions = throttled
    ? resolvedActions.filter((a, i) => a.priority === "urgent" && !completed.has(i)).slice(0, 1).concat(resolvedActions.filter((a, i) => completed.has(i)))
    : resolvedActions;

  const nextAction = resolvedActions.find((a, i) => !completed.has(i) && !a.locked);

  // ─── Render INTAKE ───
  if (phase === "intake") {
    const q = INTAKE_QUESTIONS[step];
    return (
      <div style={{maxWidth:460,margin:"0 auto",padding:24,fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",background:C.bg,minHeight:"100vh"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:26,fontWeight:800,color:C.text,letterSpacing:-0.5}}>Waypoint</div>
          <div style={{fontSize:13,color:C.muted}}>Let's figure out where you are</div>
        </div>
        <div style={{display:"flex",gap:3,marginBottom:24}}>{INTAKE_QUESTIONS.map((_,i)=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<=step?C.accent:C.border,transition:"background 0.3s"}}/>)}</div>
        <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:14,lineHeight:1.4}}>{q.question}</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {q.options.map((o,i)=><button key={i} onClick={()=>handleIntake(o.value)} style={{
            padding:"12px 16px",borderRadius:10,fontSize:14,fontWeight:500,textAlign:"left",
            border:`1.5px solid ${intake[q.key]===o.value?C.accent:C.border}`,
            background:intake[q.key]===o.value?C.accentLight:"white", color:intake[q.key]===o.value?C.accentDark:C.textSec,cursor:"pointer",transition:"all 0.15s",
          }}>{o.label}</button>)}
        </div>
        {step>0&&<button onClick={()=>setStep(step-1)} style={{background:"none",border:"none",color:C.muted,fontSize:12,cursor:"pointer",padding:"10px 0",fontWeight:500}}>← Back</button>}
      </div>
    );
  }

  // ─── Render DELTA RE-INTAKE ───
  if (phase === "delta") {
    const q = deltaQuestions[deltaStep];
    return (
      <div style={{maxWidth:460,margin:"0 auto",padding:24,fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",background:C.bg,minHeight:"100vh"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:26,fontWeight:800,color:C.text,letterSpacing:-0.5}}>Waypoint</div>
          <div style={{fontSize:13,color:C.teal,fontWeight:600}}>🔄 Updating your plan</div>
        </div>
        <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:14,lineHeight:1.4}}>{q.question}</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {q.options.map((o,i)=><button key={i} onClick={()=>handleDelta(o.value)} style={{
            padding:"12px 16px",borderRadius:10,fontSize:14,fontWeight:500,textAlign:"left",
            border:`1.5px solid ${C.border}`,background:"white",color:C.textSec,cursor:"pointer",
          }}>{o.label}</button>)}
        </div>
        <button onClick={()=>{setPhase("plan");setCheckInStep(null)}} style={{background:"none",border:"none",color:C.muted,fontSize:12,cursor:"pointer",padding:"10px 0",fontWeight:500}}>← Cancel, go back to plan</button>
      </div>
    );
  }

  // ─── Render CHECK-IN (standalone step) ───
  if (phase === "checkin" && checkInStep) {
    const config = CHECK_IN_QUESTIONS[checkInStep];
    return (
      <div style={{maxWidth:460,margin:"0 auto",padding:24,fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",background:C.bg,minHeight:"100vh"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:26,fontWeight:800,color:C.text,letterSpacing:-0.5}}>Waypoint</div>
          <div style={{fontSize:13,color:C.teal,fontWeight:600}}>Checking in with you</div>
        </div>
        <CheckInCard config={config} onAnswer={(v) => handleCheckIn(checkInStep, v)} />
        <button onClick={()=>{setPhase("plan");setCheckInStep(null)}} style={{background:"none",border:"none",color:C.muted,fontSize:12,cursor:"pointer",padding:"12px 0",fontWeight:500,display:"block",margin:"0 auto"}}>Skip — go back to my plan</button>
      </div>
    );
  }

  // ─── Render PLAN (with check-in triggers) ───
  const diagLabel = {autism:"Autism (ASD)",delay:"Developmental delay",id:"Intellectual disability",sld:"Learning disability",adhd:"ADHD",cp:"Cerebral palsy",suspected:"Suspected"}[intake.diagnosis]||intake.diagnosis;
  const ageLabel = {"0-2":"Under 3","3-5":"Ages 3-5","6-12":"Ages 6-12","13-17":"Ages 13-17"}[intake.age]||intake.age;
  const rcLabel = {unknown:"RC: unknown",known:"RC: not applied",applied:"RC: pending",active:"RC: active",na:"RC: N/A"}[intake.rc_status]||"";

  return (
    <div style={{maxWidth:500,margin:"0 auto",padding:24,fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",background:C.bg,minHeight:"100vh"}}>
      {/* Header */}
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
          <div style={{fontSize:24,fontWeight:800,color:C.text,letterSpacing:-0.5}}>Waypoint</div>
          <div style={{fontSize:10,fontWeight:600,color:C.accent,background:C.accentLight,padding:"2px 7px",borderRadius:5}}>V4 • CONTINUOUS LOOP</div>
        </div>
        <div style={{fontSize:13,color:C.textSec}}>{diagLabel} • {ageLabel} • {rcLabel}</div>
        <div style={{display:"flex",gap:8,marginTop:4}}>
          <button onClick={()=>{setPhase("checkin");setCheckInStep("emotional")}} style={{fontSize:11,color:C.teal,background:C.tealLight,border:`1px solid ${C.tealBorder}`,borderRadius:6,padding:"4px 10px",cursor:"pointer",fontWeight:600}}>💬 Check in</button>
          <button onClick={()=>setShowRenewals(!showRenewals)} style={{fontSize:11,color:C.purple,background:C.purpleLight,border:"1px solid #DDD6FE",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontWeight:600}}>📆 {showRenewals?"Hide":"Show"} renewals ({renewalActions.length})</button>
          <button onClick={()=>{setPhase("intake");setStep(0);setActions([]);setDynamicActions([]);setSupportActions([]);setCompleted(new Set());setOutcomes({});setRenewalActions([]);setThrottled(false);setEmotionalState(null)}} style={{fontSize:11,color:C.muted,background:"none",border:"none",cursor:"pointer",fontWeight:500}}>↺ Reset</button>
        </div>
      </div>

      {/* Emotional throttle banner */}
      {throttled && <ThrottleBanner onDismiss={() => setThrottled(false)} />}

      {/* Progress bar */}
      <div style={{background:C.card,borderRadius:12,padding:14,marginBottom:18,border:`1px solid ${C.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:12,fontWeight:600,color:C.text}}>{completedCount} of {totalActions} actions</span>
          <span style={{fontSize:12,fontWeight:700,color:C.accent}}>{progress}%</span>
        </div>
        <div style={{height:7,borderRadius:4,background:C.mutedLight,overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:4,background:`linear-gradient(90deg,${C.accent},${C.accentDark})`,width:`${progress}%`,transition:"width 0.5s"}}/>
        </div>
        {nextAction&&!throttled&&<div style={{marginTop:8,fontSize:11,color:C.accent,fontWeight:600}}>→ Next: {nextAction.title}</div>}
      </div>

      {/* All actions done → check-in trigger */}
      {allDone && !checkInStep && (
        <div style={{marginBottom:18}}>
          <CheckInCard config={CHECK_IN_QUESTIONS.emotional} onAnswer={(v) => handleCheckIn("emotional", v)} style={{}} />
        </div>
      )}

      {/* Inline check-in (if in plan phase but check-in active) */}
      {checkInStep && phase === "plan" && (
        <div style={{marginBottom:18}}>
          <CheckInCard config={CHECK_IN_QUESTIONS[checkInStep]} onAnswer={(v) => handleCheckIn(checkInStep, v)} style={{}} />
        </div>
      )}

      {/* Dynamic action label */}
      {dynamicActions.length>0&&<div style={{fontSize:10,fontWeight:700,color:C.purple,letterSpacing:0.6,marginBottom:6,textTransform:"uppercase"}}>⚡ Updated based on your progress</div>}

      {/* Active actions */}
      {(throttled ? displayActions : resolvedActions).map((action, i) => {
        const realIdx = throttled ? resolvedActions.indexOf(action) : i;
        return (
          <ActionCard key={action.id+realIdx}
            action={{...action, completed:completed.has(realIdx)}}
            onComplete={()=>handleComplete(realIdx)}
            onExpand={()=>setExpanded(expanded===realIdx?-1:realIdx)}
            expanded={expanded===realIdx}
            onAgency={k=>setAgencyPanel(k)}
            followUpUI={pendingFollowUp?.idx===realIdx?FOLLOWUPS[pendingFollowUp.key]:null}
            onFollowUp={answer=>handleFollowUp(realIdx,answer)}
          />
        );
      })}

      {/* Renewal calendar section */}
      {showRenewals && renewalActions.length > 0 && (
        <div style={{marginTop:18}}>
          <div style={{fontSize:10,fontWeight:700,color:C.teal,letterSpacing:0.8,marginBottom:10,textTransform:"uppercase"}}>📆 Upcoming Renewals & Annual Reviews</div>
          {renewalActions.map((action, i) => (
            <ActionCard key={"ren_"+action.id}
              action={{...action, completed:false}}
              onComplete={()=>{}}
              onExpand={()=>setExpanded(expanded===("ren_"+i)?"":("ren_"+i))}
              expanded={expanded===("ren_"+i)}
              onAgency={k=>setAgencyPanel(k)}
              followUpUI={null}
              onFollowUp={()=>{}}
            />
          ))}
        </div>
      )}

      {/* Journey Status Dashboard */}
      {Object.keys(outcomes).length>0&&<div style={{background:C.dark,borderRadius:14,padding:18,marginTop:18}}>
        <div style={{fontSize:10,fontWeight:700,color:"#818CF8",letterSpacing:0.8,marginBottom:12,textTransform:"uppercase"}}>📊 Journey Status</div>
        {Object.entries(outcomes).map(([k,v])=>{
          const labels = {rc_done:{scheduled:"✅ RC intake scheduled",voicemail:"📞 RC — awaiting callback",busy:"📧 RC — email sent",confused:"❓ RC — needs guidance"},
            iep_done:{confirmed:"✅ IEP request confirmed",waiting:"⏳ IEP — awaiting response",scheduled:"🎉 IEP meeting scheduled"},
            school_eval_done:{plan_received:"✅ Assessment plan received",waiting:"⏳ Evaluation — awaiting response",refused:"🚫 School refused — complaint filed"},
            ped_done:{got_it:"✅ Referral in hand",appt_set:"📅 Pediatrician appt scheduled",refused:"⚠️ Pediatrician refused"},
            ins_done:{approved:"✅ Insurance approved",pending:"⏳ Prior auth submitted",denied:"🚫 Denied — appeal in progress"}};
          const label = labels[k]?.[v]; if(!label) return null;
          return <div key={k} style={{background:"rgba(255,255,255,0.06)",borderRadius:8,padding:10,marginBottom:6,fontSize:12,color:"#E5E7EB"}}>{label}</div>;
        })}
        {emotionalState && <div style={{background:"rgba(255,255,255,0.06)",borderRadius:8,padding:10,marginBottom:6,fontSize:12,color:"#E5E7EB"}}>
          {emotionalState === "good" ? "💪 Feeling good" : emotionalState === "overwhelmed" ? "🫂 Overwhelmed — throttled to essentials" : emotionalState === "stuck" ? "🤔 Stuck — additional support surfaced" : emotionalState === "frustrated" ? "😤 Frustrated — escalation paths provided" : emotionalState === "break" ? "☕ Taking a break" : `🔄 ${emotionalState}`}
        </div>}
      </div>}

      {agencyPanel&&<AgencyPanel agencyKey={agencyPanel} onClose={()=>setAgencyPanel(null)}/>}
    </div>
  );
}
