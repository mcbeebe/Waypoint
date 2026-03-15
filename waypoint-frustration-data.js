// ─── waypoint-frustration-data.js ───
// RC Reimbursement Knowledge Base, Frustration Deep-Dive Flow Configs,
// Email Analysis Engine, and Deep Action Generators

// ─── RC REIMBURSEMENT KNOWLEDGE BASE ───
export const RC_REIMBURSABLE = {
  categories: [
    { name: "Respite Care", code: "862/864", description: "In-home or out-of-home respite. Parent relief. Most-used RC service statewide.", typical: "$15-40/hr", notes: "Must be in IPP. Parent CANNOT be respite provider for own child." },
    { name: "Behavioral Support / Personal Assistance", code: "062", description: "1:1 behavioral aide, community integration, social skills groups.", typical: "Varies — 2nd highest POS expenditure", notes: "Different from IHSS. RC-funded when school/insurance don't cover." },
    { name: "ABA Therapy", code: "Various", description: "Applied Behavior Analysis. Insurance is primary payer — RC covers co-pays, gaps, or when insurance denies.", typical: "$60-150/hr", notes: "RC is payer of last resort. Must exhaust insurance first. Keep all EOBs." },
    { name: "Speech Therapy", code: "110/115", description: "Speech-language pathology. RC covers when insurance and school don't provide enough.", typical: "$100-200/session", notes: "Insurance → School → RC. Keep records of all denials." },
    { name: "Occupational Therapy", code: "116", description: "OT for sensory, fine motor, daily living skills.", typical: "$100-200/session", notes: "Same hierarchy: insurance → school → RC is payer of last resort." },
    { name: "Diapers / Incontinence Supplies", code: "840", description: "For children over age 3 with documented medical need.", typical: "$50-150/month", notes: "Physician documentation required. Families often don't know this is covered." },
    { name: "Adaptive Equipment / Devices", code: "Various", description: "AAC devices, adaptive strollers, car seats, sensory equipment, iPads for communication.", typical: "Varies", notes: "Medi-Cal / insurance first. RC covers gaps. Must be in IPP." },
    { name: "Transportation", code: "Various", description: "Gas reimbursement, mileage to appointments, bus passes.", typical: "IRS mileage rate", notes: "Keep a mileage log. Must be for authorized services." },
    { name: "Camp / Social Recreation", code: "Various", description: "Summer camp, adaptive sports, social skills programs, Special Olympics.", typical: "Varies", notes: "Must be in IPP. Ask SC about community integration services." },
    { name: "Parent Training", code: "Various", description: "Training for parents on behavior management, AAC devices, home programs.", typical: "Varies", notes: "Underutilized. Great way to get skills without waiting for a provider." },
    { name: "Supported Living Services", code: "896", description: "For adults: support to live independently.", typical: "Largest POS for adults 22+", notes: "Transition planning starts at age 14." },
    { name: "Self-Determination Program (SDP)", code: "SDP", description: "Family controls budget and chooses own vendors. More flexibility than traditional IPP.", typical: "Individual budget", notes: "Not all RCs fully rolled out. Ask your SC about enrollment." },
  ],
  timeline_rules: {
    intake: { statutory: "15 calendar days from referral to intake", law: "Lanterman Act, W&I Code §4642" },
    eligibility: { statutory: "120 calendar days from referral to eligibility", law: "W&I Code §4643" },
    ipp: { statutory: "60 days from eligibility to initial IPP", law: "W&I Code §4646" },
    service_start: { statutory: "Reasonable time after IPP signed", law: "W&I Code §4648" },
    reimbursement: { statutory: "60 days claim processing (DDS directive)", law: "Title 17, CCR" },
    ipp_annual: { statutory: "Annual IPP review required", law: "W&I Code §4646.5" },
    ifsp: { statutory: "45 days from referral to IFSP (Early Start)", law: "34 CFR §303.310" },
  },
};

// ─── FRUSTRATION DEEP-DIVE FLOW CONFIGS ───
export const FRUSTRATION_DEEP = {
  rc_issue_type: {
    question: "What's going on with Regional Center?",
    options: [
      { label: "They're not responding / too slow", value: "slow_response", emoji: "⏰" },
      { label: "Reimbursement is delayed or denied", value: "reimbursement", emoji: "💸" },
      { label: "Service Coordinator isn't helping", value: "sc_quality", emoji: "👤" },
      { label: "Services were denied or reduced", value: "service_denied", emoji: "🚫" },
      { label: "I don't know what I can get reimbursed for", value: "what_covered", emoji: "❓" },
      { label: "I have emails/documents to share", value: "upload_evidence", emoji: "📎" },
    ],
  },
  rc_slow_what: {
    question: "What are you waiting for?",
    options: [
      { label: "Intake appointment", value: "intake", emoji: "📋" },
      { label: "Evaluation / eligibility decision", value: "eligibility", emoji: "🔬" },
      { label: "IPP meeting", value: "ipp", emoji: "📝" },
      { label: "Service authorization", value: "service_auth", emoji: "✅" },
      { label: "SC to return my call/email", value: "sc_response", emoji: "📞" },
      { label: "Reimbursement payment", value: "reimbursement_wait", emoji: "💰" },
    ],
  },
  rc_slow_detail: {
    question: "How long have you been waiting?",
    options: [
      { label: "1-2 weeks", value: "1_2_weeks", emoji: "📅" },
      { label: "3-4 weeks", value: "3_4_weeks", emoji: "⚠️" },
      { label: "1-2 months", value: "1_2_months", emoji: "🚨" },
      { label: "3+ months", value: "3_plus_months", emoji: "🔴" },
    ],
  },
  rc_reimburse_issue: {
    question: "What's happening with the reimbursement?",
    options: [
      { label: "Submitted claim, no payment yet", value: "waiting", emoji: "⏳" },
      { label: "Claim was denied", value: "denied", emoji: "🚫" },
      { label: "Don't know how to submit", value: "how_to", emoji: "❓" },
      { label: "Partial payment — less than expected", value: "partial", emoji: "💸" },
      { label: "Never knew I could get reimbursed", value: "didnt_know", emoji: "😮" },
    ],
  },
  school_issue_type: {
    question: "What's going on with the school district?",
    options: [
      { label: "Evaluation taking too long", value: "eval_delay", emoji: "⏰" },
      { label: "IEP isn't being implemented", value: "iep_not_implemented", emoji: "🚫" },
      { label: "Want to change goals/services", value: "iep_change", emoji: "📝" },
      { label: "Child being suspended/disciplined", value: "discipline", emoji: "⚠️" },
      { label: "Disagree with school's assessment", value: "disagree_eval", emoji: "👎" },
      { label: "I have emails/documents to share", value: "upload_evidence", emoji: "📎" },
    ],
  },
  insurance_issue_type: {
    question: "What's going on with insurance?",
    options: [
      { label: "Therapy authorization denied", value: "auth_denied", emoji: "🚫" },
      { label: "Not enough hours approved", value: "low_hours", emoji: "⏰" },
      { label: "Can't find in-network providers", value: "no_providers", emoji: "🔍" },
      { label: "Billing dispute / surprise bill", value: "billing", emoji: "💸" },
      { label: "I have a denial letter to share", value: "upload_evidence", emoji: "📎" },
    ],
  },
};

// ─── EMAIL ANALYSIS ENGINE ───
export function analyzeEmailThread(emailText) {
  const analysis = {
    promises: [], timeline_issues: [], red_flags: [],
    missing_follow_through: [], legal_citations: [], summary: "",
  };
  const lower = emailText.toLowerCase();

  // Detect promises
  [
    { pattern: /i will (follow up|get back|send|schedule|check|look into|reach out|call|email|forward|submit)[^.!?\n]*/gi, label: "Promise to follow up" },
    { pattern: /we('ll| will) (get|have|send|schedule|process|complete|review|update|look into)[^.!?\n]*/gi, label: "Promise to act" },
    { pattern: /by (monday|tuesday|wednesday|thursday|friday|next week|end of week|end of day|tomorrow|close of business)[^.!?\n]*/gi, label: "Deadline commitment" },
    { pattern: /(expect|should have|will be ready|should receive|target|goal is) (by|within|in)\s+\d[^.!?\n]*/gi, label: "Timeline commitment" },
  ].forEach(({ pattern, label }) => {
    const matches = emailText.match(pattern);
    if (matches) matches.forEach(m => analysis.promises.push({ text: m.trim().slice(0, 120), type: label }));
  });

  // Detect timeline issues
  if (lower.includes("waiting") || lower.includes("still haven't") || lower.includes("following up again") || lower.includes("checking in again")) {
    analysis.timeline_issues.push("Pattern of repeated follow-ups — indicates systemic delays");
  }
  if (/\d+\s*(weeks?|months?)\s*ago/i.test(emailText)) analysis.timeline_issues.push("Extended wait time referenced in thread");
  if (/no (response|reply|update|callback)/i.test(emailText)) analysis.timeline_issues.push("Documented non-response from agency");
  if (/called (multiple|several|\d+) times/i.test(emailText)) analysis.timeline_issues.push("Multiple contact attempts documented");

  // Detect red flags
  if (/not eligible|doesn't qualify|does not qualify|not covered|ineligible/i.test(emailText))
    analysis.red_flags.push("Eligibility/coverage denial language — request written NOA with specific criteria");
  if (/budget|funding|no funds?|waitlist|wait list|capacity|shortage/i.test(emailText))
    analysis.red_flags.push("Budget/funding excuse — Lanterman Act entitlement is NOT budget-dependent");
  if (/generic (resource|service)/i.test(emailText))
    analysis.red_flags.push("'Generic resource' determination — RC pushing cost to school/insurance. Demand written justification.");
  if (/not our (responsibility|department)|talk to (the|your) school|contact your insurance|refer you to/i.test(emailText))
    analysis.red_flags.push("Buck-passing detected — agency may be inappropriately deferring responsibility");
  if (/policy.{0,20}(changed|new|updated|revised)/i.test(emailText))
    analysis.red_flags.push("Policy change claim — request specific DDS directive number");
  if (/unfortunately|at this time|unable to|regret to inform/i.test(emailText))
    analysis.red_flags.push("Soft denial language detected — get the decision in writing with legal basis");
  if (/verbal.{0,15}(agreement|authorization|approval)/i.test(emailText))
    analysis.red_flags.push("Verbal-only agreement — ALWAYS get authorization in writing before proceeding");

  // Detect missing follow-through
  if (analysis.promises.length > 0 && (lower.includes("following up") || lower.includes("checking in") || lower.includes("still waiting") || lower.includes("hasn't happened")))
    analysis.missing_follow_through.push("Promises were made but required parent follow-up — broken commitment pattern");

  // Legal citations
  if (/intake|referral/i.test(lower)) analysis.legal_citations.push("W&I Code §4642: Intake within 15 days of referral");
  if (/eligib|evaluation|assessment/i.test(lower)) analysis.legal_citations.push("W&I Code §4643: Eligibility within 120 days");
  if (/ipp|individual program plan|service plan/i.test(lower)) analysis.legal_citations.push("W&I Code §4646: IPP within 60 days of eligibility");
  if (/service.{0,20}(denied|won't|can't|unable|refuse|not available)/i.test(lower)) {
    analysis.legal_citations.push("W&I Code §4648: RC shall ensure delivery of services in IPP");
    analysis.legal_citations.push("W&I Code §4710.5: Right to Fair Hearing for any service dispute");
  }
  if (/reimburse/i.test(lower)) analysis.legal_citations.push("Title 17 CCR: Timely processing of claims");
  if (/iep|special education/i.test(lower)) analysis.legal_citations.push("IDEA 34 CFR §300: Free Appropriate Public Education");
  if (/aba|behavioral health|behavior.{0,10}therapy/i.test(lower)) analysis.legal_citations.push("CA SB 946: Mandated behavioral health coverage for autism");

  // Deduplicate
  analysis.legal_citations = [...new Set(analysis.legal_citations)];

  // Summary
  const parts = [];
  if (analysis.red_flags.length) parts.push(`${analysis.red_flags.length} red flag(s)`);
  if (analysis.promises.length) parts.push(`${analysis.promises.length} promise(s) to track`);
  if (analysis.timeline_issues.length) parts.push(`${analysis.timeline_issues.length} timeline concern(s)`);
  if (analysis.legal_citations.length) parts.push(`${analysis.legal_citations.length} applicable law(s)`);
  analysis.summary = parts.length ? parts.join(", ") : "No major issues detected";

  return analysis;
}

// ─── GENERATE RESPONSE EMAIL FROM ANALYSIS ───
export function generateEmailResponse(analysis) {
  let body = `Dear [SC Name / RC],\n\nThank you for your email. I am writing to follow up and document our communication.\n\n`;
  if (analysis.promises.length) {
    body += `I want to confirm the following commitments from our correspondence:\n`;
    analysis.promises.forEach(p => { body += `• "${p.text}"\n`; });
    body += `\nPlease confirm these remain on track with expected completion dates.\n\n`;
  }
  if (analysis.red_flags.length) {
    body += `I have concerns about the following:\n`;
    analysis.red_flags.forEach(rf => { body += `• ${rf}\n`; });
    body += `\n`;
  }
  if (analysis.legal_citations.length) {
    body += `For reference, the applicable legal requirements are:\n`;
    analysis.legal_citations.forEach(c => { body += `• ${c}\n`; });
    body += `\n`;
  }
  body += `I am keeping records of all communications. If this is not resolved within 10 business days, I will:\n`;
  body += `1. File a 4731 complaint with DDS\n2. Contact Disability Rights California (1-800-776-5746)\n3. Request a Fair Hearing through OAH\n\n`;
  body += `I want to work together to get [Name] the services [he/she/they] is entitled to under the Lanterman Act.\n\nSincerely,\n[Your Name]\n[Phone / Email]`;
  return body;
}

// ─── DEEP RC ACTION GENERATOR ───
export function generateDeepRCActions(issueType, detail, intake) {
  const actions = [];
  const rules = RC_REIMBURSABLE.timeline_rules;

  if (issueType === "slow_response") {
    let statutory = "", law = "";
    if (detail.waitingFor === "intake") { statutory = rules.intake.statutory; law = rules.intake.law; }
    else if (detail.waitingFor === "eligibility") { statutory = rules.eligibility.statutory; law = rules.eligibility.law; }
    else if (detail.waitingFor === "ipp") { statutory = rules.ipp.statutory; law = rules.ipp.law; }
    else if (detail.waitingFor === "sc_response") { statutory = "SC should respond within 2 business days"; law = "Lanterman Act duty of care"; }
    else if (detail.waitingFor === "service_auth") { statutory = rules.service_start.statutory; law = rules.service_start.law; }
    else if (detail.waitingFor === "reimbursement_wait") { statutory = rules.reimbursement.statutory; law = rules.reimbursement.law; }

    const isViolation = ["3_4_weeks","1_2_months","3_plus_months"].includes(detail.duration);
    const durationLabel = (detail.duration||"").replace(/_/g, " ");
    const waitLabel = (detail.waitingFor||"").replace(/_/g, " ");

    actions.push({ id: "rc_deep_escalate", priority: "urgent", agencyKey: "rceb", category: "escalation",
      title: isViolation ? `⚠️ Timeline violation: ${statutory}` : `Follow up on ${waitLabel}`,
      subtitle: `You've been waiting ${durationLabel}. Statutory requirement: ${statutory} (${law}).${isViolation ? " This may be a Lanterman Act violation." : ""}`,
      agency: "RC → DDS", deadline: "This week",
      talkingPoints: [
        `I've been waiting ${durationLabel} for ${waitLabel}. The Lanterman Act requires: ${statutory}.`,
        "I'd like to speak with your supervisor.",
        "If this isn't resolved within 5 business days, I will file a 4731 complaint with DDS.",
      ],
      draftMessage: `Dear [RC Director],\n\nRe: Unacceptable delay in ${waitLabel} for [Child Name]\n\nTimeline:\n- Request/referral date: [DATE]\n- Days elapsed: [NUMBER]\n- Statutory requirement: ${statutory}\n- Law: ${law}\n\n${isViolation ? "This constitutes a violation of the Lanterman Act.\n\n" : ""}I request:\n1. Complete ${waitLabel} within 5 business days\n2. Written explanation for the delay\n3. Supervisor name and contact information\n\nIf unresolved, I will:\n- File 4731 complaint with DDS\n- Contact Disability Rights California\n- Request Fair Hearing\n\nSincerely,\n[Your Name]`,
      documents: ["Copy of original request with date", "Email/call log showing delays", "Notes from all phone calls (date, time, name)"],
    });

    if (isViolation) {
      actions.push({ id: "rc_deep_4731", priority: "high", agencyKey: "rceb", category: "escalation",
        title: "File 4731 complaint with DDS",
        subtitle: "DDS must investigate. RC has 20 business days to respond. Your most powerful tool.",
        agency: "DDS", deadline: "If not resolved in 5 days",
        draftMessage: `To: California DDS\nRe: 4731 Complaint\n\nAgainst: [RC Name]\nConsumer: [Child Name], UCI #[if known]\n\nViolation: ${statutory} (${law})\n\nFacts:\n- Request submitted: [DATE]\n- Status: Unresolved after ${durationLabel}\n- Contact attempts: [list dates/methods]\n- SC: [name, if assigned]\n\nRequested resolution:\n- Immediate ${waitLabel}\n- Written explanation\n- Corrective action\n\n[Your Name]\n[Contact Info]`,
      });
    }
  }

  if (issueType === "reimbursement") {
    if (detail.reimburseIssue === "denied") {
      actions.push({ id: "rc_reimburse_appeal", priority: "urgent", agencyKey: "rceb", category: "escalation",
        title: "Appeal reimbursement denial",
        subtitle: "Get denial in writing with specific reason. You can appeal through Fair Hearing.",
        agency: "RC / OAH", deadline: "This week",
        talkingPoints: ["I need the denial in writing with the specific reason.", "Is this service authorized in my IPP?", "I want to request a Fair Hearing."],
        draftMessage: `Dear [SC / RC Finance],\n\nI am appealing the denial of my reimbursement claim.\n\nClaim details:\n- Service: [describe]\n- Date(s): [dates]\n- Amount: $[amount]\n- Provider: [name]\n- IPP authorization: [reference section]\n\nPlease provide:\n1. Written denial with reason\n2. POS code and IPP authorization status\n3. Formal appeal instructions\n\nIf authorized in IPP, I expect reimbursement within 30 days.\n\n[Your Name]`,
      });
    }
    if (detail.reimburseIssue === "waiting") {
      actions.push({ id: "rc_reimburse_followup", priority: "high", agencyKey: "rceb", category: "escalation",
        title: "Follow up on pending reimbursement",
        subtitle: "RC should process claims within 60 days. Escalate if longer.",
        agency: "RC", deadline: "Call this week",
        talkingPoints: ["I submitted a claim on [date]. Status?", "Who in finance can I contact directly?", "If not processed in 10 days, I'll file 4731."],
      });
    }
    if (detail.reimburseIssue === "how_to" || detail.reimburseIssue === "didnt_know") {
      actions.push({ id: "rc_reimburse_guide", priority: "standard", agencyKey: "rceb", category: "support",
        title: "How to submit RC reimbursement claims",
        subtitle: "Step-by-step guide.",
        agency: "RC",
        talkingPoints: [
          "1. Confirm service is in your IPP",
          "2. Get receipts from provider (date, service, NPI, amount)",
          "3. Fill out RC's claim form (ask SC)",
          "4. Attach: receipt + IPP page + proof of payment",
          "5. Submit to RC finance (email + keep copies)",
          "6. Follow up at 30 days. Escalate at 60.",
        ],
        documents: ["RC claim form (get from SC)", "Original receipts", "IPP authorization page", "Proof of payment"],
      });
    }
    if (detail.reimburseIssue === "partial") {
      actions.push({ id: "rc_reimburse_partial", priority: "high", agencyKey: "rceb", category: "escalation",
        title: "Dispute partial reimbursement",
        subtitle: "Request written explanation of the payment calculation. RC must pay the rate authorized in your IPP.",
        agency: "RC", deadline: "This week",
        talkingPoints: ["I received $[amount] but submitted for $[amount]. Please explain the difference.", "What is the authorized rate for this service in our IPP?", "Is this the RC-approved vendor rate or a different calculation?"],
      });
    }
  }

  if (issueType === "sc_quality") {
    actions.push({ id: "rc_change_sc", priority: "high", agencyKey: "rceb", category: "escalation",
      title: "Request a new Service Coordinator",
      subtitle: "You have the right to request a different SC. Ask for the program manager.",
      agency: "RC", deadline: "Call this week",
      talkingPoints: ["I'd like to request a change in SC.", "My concerns: [not returning calls, not informing us of services, not following through].", "Please assign a new SC within 10 business days."],
      draftMessage: `Dear [RC Program Manager],\n\nI request a new Service Coordinator for [Child Name].\n\nCurrent SC: [name]\nReasons:\n- [Not returning calls/emails]\n- [Not informing us of available services]\n- [Not following through on IPP]\n\nPlease assign new SC within 10 business days.\n\n[Your Name]`,
    });
  }

  if (issueType === "service_denied") {
    actions.push({ id: "rc_service_appeal", priority: "urgent", agencyKey: "rceb", category: "escalation",
      title: "Appeal RC service denial",
      subtitle: "Demand written Notice of Action (NOA). 30 days to request Fair Hearing.",
      agency: "RC / OAH", deadline: "Within 30 days of NOA",
      talkingPoints: ["I need written NOA with specific reasons.", "Basis for denial? Is this a generic resource determination?", "I'm requesting a Fair Hearing.", "DRC: 1-800-776-5746"],
      draftMessage: `Dear [RC Director],\n\nI formally appeal the denial of [service] for [Child Name].\n\nI request:\n1. Written NOA with reason\n2. Regulation/policy citation\n3. Fair Hearing procedures\n\nPer the Lanterman Act, [Name] is entitled to services meeting individual needs per the IPP.\n\n[Your Name]`,
    });
  }

  return actions;
}

// ─── DEEP SCHOOL ACTION GENERATOR ───
export function generateDeepSchoolActions(issueType, intake) {
  const actions = [];
  if (issueType === "eval_delay") {
    actions.push({ id: "school_eval_escalate", priority: "urgent", agencyKey: "school", category: "escalation",
      title: "⚠️ School evaluation past 60-day deadline",
      subtitle: "CA Ed Code requires assessment plan within 15 days, evaluation within 60 days of consent. File CDE compliance complaint.",
      agency: "CDE", deadline: "This week",
      draftMessage: `Dear CDE Complaint Unit,\n\nComplaint against [District] for IDEA/Ed Code violation.\n\nI consented to evaluation on [DATE]. It has been [NUMBER] days. The 60-day statutory timeline has been exceeded.\n\nViolation: CA Ed Code §56302.1 (60-day evaluation timeline)\n\nPlease investigate.\n\n[Your Name]`,
    });
  }
  if (issueType === "iep_not_implemented") {
    actions.push({ id: "school_implement", priority: "urgent", agencyKey: "school", category: "escalation",
      title: "⚠️ IEP not being implemented — document and escalate",
      subtitle: "School must implement IEP as written. Failure = denial of FAPE. File compliance complaint.",
      agency: "School / CDE", deadline: "This week",
      talkingPoints: ["Which specific IEP services/goals are not being implemented?", "I'm documenting this for a CDE compliance complaint.", "A failure to implement the IEP is a denial of FAPE under IDEA."],
      draftMessage: `Dear [Principal/SpEd Director],\n\nI am writing to formally notify you that [Name]'s IEP is not being implemented as written.\n\nSpecifically:\n- [Service/accommodation] listed in IEP but not provided since [date]\n- [Goal area] with no progress monitoring or data collection\n\nI request:\n1. Immediate implementation of all IEP provisions\n2. Compensatory services for the period of non-implementation\n3. Written response within 10 days\n\nIf unresolved, I will file a CDE compliance complaint and consider due process.\n\n[Your Name]`,
    });
  }
  if (issueType === "discipline") {
    actions.push({ id: "school_discipline", priority: "urgent", agencyKey: "school", category: "escalation",
      title: "⚠️ Know your rights: Suspension & Manifestation Determination",
      subtitle: "After 10 cumulative days of removal, school must hold Manifestation Determination Review (MDR). If behavior is related to disability, student cannot be suspended.",
      agency: "School District", deadline: "Before next disciplinary action",
      talkingPoints: ["Has my child been removed for 10+ cumulative days this year?", "I'm requesting a Manifestation Determination Review.", "If behavior is a manifestation of disability, the school must conduct an FBA and implement a BIP, not punish.", "I want a copy of all discipline records for this school year."],
    });
  }
  if (issueType === "disagree_eval") {
    actions.push({ id: "school_iee", priority: "high", agencyKey: "school", category: "escalation",
      title: "Request Independent Educational Evaluation (IEE) at district expense",
      subtitle: "You have the right to disagree with the school's eval and request an IEE paid for by the district. They must either pay or file for due process to defend their eval.",
      agency: "School District",
      draftMessage: `Dear [SpEd Director],\n\nI disagree with the psychoeducational evaluation conducted by the district for [Name] on [date].\n\nPer 34 CFR §300.502, I request an Independent Educational Evaluation at public expense.\n\nPlease provide:\n1. The district's criteria for IEEs (evaluator qualifications, location)\n2. A list of approved IEE providers\n3. Written response within 15 days\n\nThe district must either fund the IEE or file for due process. Per IDEA, you may not unreasonably delay.\n\n[Your Name]`,
    });
  }
  return actions;
}

// ─── DEEP INSURANCE ACTION GENERATOR ───
export function generateDeepInsuranceActions(issueType, intake) {
  const actions = [];
  if (issueType === "auth_denied") {
    actions.push({ id: "ins_appeal_deep", priority: "urgent", agencyKey: "insurance", category: "escalation",
      title: "⚠️ File formal insurance appeal + IMR",
      subtitle: "Step 1: Internal appeal within 30 days. Step 2: If denied again, Independent Medical Review through DMHC (HMO) or CDI (PPO).",
      agency: "Insurance → DMHC/CDI", deadline: "Within 30 days of denial",
      talkingPoints: ["I'm formally appealing under my plan's appeal process.", "DMHC: 1-888-466-2219 (HMO) | CDI: 1-800-927-4357 (PPO)", "Is my plan HMO or PPO? This determines which regulator handles IMR."],
      draftMessage: `Dear [Insurance] Appeals Dept,\n\nI appeal the denial of [service] for [Name], Member ID [number].\n\nDiagnosis: [code]. Medical necessity documented by [provider].\n\n${intake.diagnosis === "autism" ? "CA SB 946 mandates behavioral health treatment coverage for autism.\n\n" : ""}If this internal appeal is denied, I will request Independent Medical Review through ${intake.insurance === "private" ? "DMHC or CDI" : "Medi-Cal managed care"}.\n\nAttached: evaluation, referral, denial letter.\n\n[Your Name]`,
    });
  }
  if (issueType === "low_hours") {
    actions.push({ id: "ins_hours_appeal", priority: "high", agencyKey: "insurance", category: "escalation",
      title: "Appeal for more authorized hours",
      subtitle: "Get your treating provider to write a medical necessity letter documenting why more hours are needed. Include measurable treatment goals.",
      agency: "Insurance",
      talkingPoints: ["My child's provider recommends [X] hours but only [Y] were approved.", "I need a peer-to-peer review between my provider and your medical director.", "Please explain the clinical basis for the hour limitation."],
    });
  }
  if (issueType === "no_providers") {
    actions.push({ id: "ins_network", priority: "high", agencyKey: "insurance", category: "escalation",
      title: "Demand out-of-network authorization",
      subtitle: "If no in-network providers within reasonable distance/wait time, insurance MUST authorize out-of-network at in-network rates.",
      agency: "Insurance / DMHC",
      talkingPoints: ["There are no in-network providers accepting new patients within [radius/wait].", "I'm requesting out-of-network authorization at in-network rates per CA network adequacy requirements.", "DMHC timely access standards: 15 business days for specialist, 10 for non-urgent."],
    });
  }
  return actions;
}
