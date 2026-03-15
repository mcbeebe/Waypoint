// ═══════════════════════════════════════════════════════════
// WAYPOINT V5.1 — ENHANCED PLAN GENERATOR
// Restores V3/V4 richness: drafts, talking points, SMS,
// documents, follow-ups, and adds "learn more" context
// ═══════════════════════════════════════════════════════════
//
// WHAT V5 LOST (now restored):
// ✅ Draft emails on EVERY base action
// ✅ Talking points ("what to say") on EVERY action
// ✅ Document checklists per action
// ✅ SMS reminder text per action
// ✅ Follow-up prompts (how did it go? → inject new actions)
// ✅ Agency info popup (ℹ️ button)
// ✅ Dependency locking (🔒 unlocks after...)
// ✅ Copy to clipboard on drafts
// ✅ Rich subtitles explaining WHY each action matters
//
// WHAT'S NEW in V5.1:
// ✅ "?" Learn More button — explains what SSI/IHSS/IEP etc. IS
// ✅ "Why this matters" section in expanded card
// ✅ RC by zip code — user enters zip, gets their specific RC
// ✅ Category badges (escalation, support, guidance)
//
// INTEGRATION:
// This file exports generateRichPlan(intake) which replaces
// the simplified genPlan() in v5-unified.jsx
//
// Each action now includes:
// {
//   id, priority, agencyKey, title, subtitle,
//   agency, deadline, order,
//   whyMatters: string,     // explains WHY this action is important
//   learnMoreKey: string,   // key into LEARN_MORE database
//   talkingPoints: string[],
//   draftMessage: string,
//   documents: string[],
//   smsReminder: string,
//   followUpKey: string,    // triggers follow-up question on complete
//   dependsOn: string,      // id of action that must complete first
//   category: string,       // escalation|support|guidance|standard
// }

export function generateRichPlan(intake) {
  const { diagnosis, age, rc_status, iep_status, insurance } = intake;
  const actions = [];
  let p = 0;
  const u = () => ({ priority: "urgent", order: p++ });
  const h = () => ({ priority: "high", order: p++ });
  const s = () => ({ priority: "standard", order: p++ });

  const rcE = ["autism","delay","id","cp","suspected"].includes(diagnosis);
  const needsRC = rcE && !["active","applied"].includes(rc_status);
  const needsIEP = !["active","eval_done"].includes(iep_status) && age !== "0-2";
  const isES = age === "0-2";
  const isTr = age === "13-17";
  const needsMC = ["private","none"].includes(insurance);
  const needsDx = diagnosis === "suspected";
  const dxName = {autism:"autism (ASD)",delay:"developmental delays",id:"intellectual disability",cp:"cerebral palsy",sld:"learning disability",adhd:"ADHD",suspected:"suspected developmental delays"}[diagnosis] || diagnosis;

  // ─── RC / EARLY START ───
  if (isES && rcE && rc_status !== "active") {
    actions.push({ id: "es_refer", ...u(), agencyKey: "earlystart", category: "standard",
      title: "Call Regional Center for Early Start referral",
      subtitle: "Early Start serves ages 0-3 with a LOWER eligibility bar. No formal diagnosis needed — just developmental concerns. IFSP developed within 45 days.",
      whyMatters: "Research is clear: early intervention before age 3 produces the best outcomes. Every month of delay matters. Early Start is free and has a lower bar to qualify than services for older children.",
      learnMoreKey: "Regional Center",
      agency: "Early Start / RC", deadline: "Call this week",
      talkingPoints: [
        `Hi, I'd like to refer my child for Early Start services. My child is ${age === "0-2" ? "under 3" : age} and I have concerns about ${needsDx ? "developmental delays" : dxName}.`,
        "What documents do I need for the intake appointment?",
        "I understand the IFSP should be developed within 45 days of referral.",
      ],
      documents: ["Birth certificate", "Medical records", "Any developmental evaluations", "Insurance card"],
      smsReminder: "Tomorrow 9am: 'Call RC for Early Start. 45-day IFSP timeline. No diagnosis needed.'",
      followUpKey: "rc_done",
    });
  } else if (needsRC && !isES) {
    actions.push({ id: "rc_refer", ...u(), agencyKey: "rceb", category: "standard",
      title: "Call Regional Center to start your referral",
      subtitle: rcE
        ? `Your child's ${needsDx ? "suspected" : ""} diagnosis qualifies. RC provides free evaluation, a dedicated Service Coordinator, and funded services including ABA, respite, speech, and OT.`
        : "RC evaluation is free and can determine eligibility for services.",
      whyMatters: "Regional Center is often the single most important connection for families. Your Service Coordinator becomes your guide through the system. RC can fund services that insurance and school don't cover — respite, adaptive equipment, even diapers.",
      learnMoreKey: "Regional Center",
      agency: "Your Regional Center", deadline: "Call this week",
      talkingPoints: [
        `Hi, I'd like to make a referral for my ${age === "3-5" ? "preschool-age" : age === "6-12" ? "school-age" : "teenage"} child who ${needsDx ? "I believe has developmental delays" : `was diagnosed with ${dxName}`}.`,
        "We'd like to schedule an intake assessment. What documents should I bring?",
        "What is the timeline for eligibility determination? I understand the Lanterman Act requires intake within 15 days.",
      ],
      documents: !needsDx
        ? ["Diagnosis/evaluation report", "Birth certificate", "Proof of CA residency", "Medical records", "Insurance card"]
        : ["Birth certificate", "Proof of CA residency", "Any medical records", "Written description of your concerns"],
      smsReminder: "Tomorrow 9am: 'Call RC. Have documents ready. 15-day intake deadline, 120-day eligibility.'",
      followUpKey: "rc_done",
    });
  } else if (rc_status === "applied") {
    actions.push({ id: "rc_followup", ...h(), agencyKey: "rceb", category: "standard",
      title: "Follow up on RC application status",
      subtitle: "Check where you are in the process. The Lanterman Act requires intake within 15 days and eligibility within 120 days of referral.",
      whyMatters: "Timelines are statutory — they're not suggestions. If RC is taking longer than allowed, you have the right to escalate.",
      learnMoreKey: "Regional Center",
      agency: "Your RC", deadline: "Call this week",
      talkingPoints: [
        "I'm calling to check on the status of my child's referral. We submitted on [date].",
        "Has our intake been scheduled? The Lanterman Act requires intake within 15 days.",
        "What is the expected timeline for eligibility determination?",
      ],
      smsReminder: "Tomorrow: 'Call RC. Reference referral date and 15-day intake rule.'",
    });
  }

  // ─── DIAGNOSIS (if needed) ───
  if (needsDx && !isES) {
    actions.push({ id: "get_eval", ...u(), agencyKey: null, category: "standard",
      title: "Get a formal evaluation for your child",
      subtitle: "A diagnosis opens doors to services. You have multiple free paths: school district evaluation, Regional Center evaluation, or private specialist (insurance may cover).",
      whyMatters: "Without a formal diagnosis, you can still access some services (school evaluation doesn't require one), but a diagnosis significantly strengthens your case for insurance coverage, SSI, and RC services.",
      agency: "Multiple options", deadline: "Start this week",
      talkingPoints: [
        "To pediatrician: 'I have concerns about my child's development. I'd like a referral for a comprehensive developmental evaluation.'",
        "To school: 'I'm requesting a special education evaluation in writing. Here is my letter.'",
        "To RC: 'I'd like to self-refer my child for evaluation.' (No diagnosis needed to start.)",
      ],
      documents: ["Written log of concerns with specific examples", "Any school reports or teacher observations", "Developmental milestones record"],
      smsReminder: "This week: 'Request eval from school AND call RC. Both are free. Dual-track is fastest.'",
    });
  }

  // ─── SCHOOL / IEP ───
  if (needsIEP && iep_status !== "na") {
    const hasEval = iep_status === "eval_done";
    if (hasEval) {
      actions.push({ id: "iep_request", ...u(), agencyKey: "school", category: "standard",
        title: "Send written request for IEP meeting",
        subtitle: "School already evaluated your child — now they owe you an IEP meeting within 30 days of evaluation.",
        whyMatters: "The IEP is a legally binding document. Once services are in the IEP, the school MUST provide them. This is your most powerful tool for getting your child what they need at school.",
        learnMoreKey: "IEP",
        agency: "School District", deadline: "30 days from evaluation",
        draftMessage: `Dear [Principal/Special Ed Director],\n\nI am writing to formally request an IEP meeting for my child, [Name], DOB [date], currently in [grade] at [school].\n\n[Name] was recently evaluated and found to have ${dxName}. Per IDEA and California Education Code §56344, I request an IEP team meeting within 30 calendar days to determine eligibility and develop an IEP.\n\nPlease provide at least 10 days' notice of the meeting date.\n\nSincerely,\n[Your Name]\n[Date]`,
        documents: ["Keep copy with date sent", "Send email AND certified mail", "Evaluation report"],
        smsReminder: "Monday: 'Send IEP request letter. Email + certified mail. 30-day clock starts on receipt.'",
        followUpKey: "iep_done",
      });
    } else {
      actions.push({ id: "school_eval", ...u(), agencyKey: "school", category: "standard",
        title: "Request school district evaluation (in writing)",
        subtitle: "District must respond within 15 days with an assessment plan. The evaluation is completely FREE. This is separate from Regional Center.",
        whyMatters: "A school evaluation is your gateway to an IEP, which gives your child legally enforceable rights to services, accommodations, and support at school.",
        learnMoreKey: "IEP",
        agency: "School District", deadline: "Send this week — 15 days to respond",
        draftMessage: `Dear [Principal/Special Ed Director],\n\nI am writing to request a comprehensive special education evaluation for my child, [Name], DOB [date], currently in [grade] at [school].\n\nI am concerned about [describe concerns]. I am requesting assessment in ALL areas of suspected disability including:\n- Cognitive/intellectual\n- Academic achievement\n- Speech/language\n- Social-emotional/behavioral\n- Adaptive behavior\n- Occupational therapy\n${diagnosis === "autism" || needsDx ? "- Autism-specific assessment (ADOS-2 or equivalent)\n" : ""}\nPlease provide an assessment plan within 15 calendar days per California Education Code §56321.\n\nSincerely,\n[Your Name]\n[Date]`,
        documents: ["Keep a dated copy", "Send email AND certified mail", "Any outside evaluations to share (optional)"],
        smsReminder: "Monday: 'Send eval request. Email + certified mail. 15-day deadline for assessment plan.'",
        followUpKey: "school_eval_done",
      });
    }
  } else if (iep_status === "active" && isTr) {
    actions.push({ id: "transition_iep", ...h(), agencyKey: "school", category: "standard",
      title: "Ensure transition goals are in your IEP",
      subtitle: "By age 16, IEP must include postsecondary goals and transition services for education, employment, and independent living.",
      whyMatters: "Without transition planning, your child could age out of school with no plan for what comes next. This is legally required and critically important.",
      learnMoreKey: "IEP",
      agency: "School District", deadline: "Before next IEP annual review",
      talkingPoints: [
        "I want to make sure [Name]'s IEP includes transition goals for postsecondary education, employment, and independent living.",
        "I'd like to invite the Regional Center transition coordinator and DOR to our next IEP meeting.",
        "What vocational assessments has the school conducted?",
      ],
      smsReminder: "Before annual IEP: 'Request transition goals, invite RC + DOR to meeting.'",
    });
  }

  // ─── THERAPY / INSURANCE ───
  if (["autism","delay","cp"].includes(diagnosis)) {
    if (["private","both"].includes(insurance)) {
      actions.push({ id: "ot_referral", ...u(), agencyKey: null, category: "standard",
        title: "Get pediatrician referral for therapy (OT/Speech)",
        subtitle: "Insurance typically requires a physician referral before authorizing therapy services. Ask for a letter of medical necessity.",
        whyMatters: "The referral is your ticket to insurance-covered therapy. The medical necessity letter is crucial for fighting any future denials.",
        agency: "Pediatrician", deadline: "Call this week",
        talkingPoints: [
          `My child was diagnosed with ${dxName}. I need referrals for occupational therapy${diagnosis === "autism" ? " and ABA therapy" : ""} and a letter of medical necessity.`,
          "Can you write prescriptions for OT, speech therapy, and any other indicated services?",
          "The letter should document specific functional limitations and why treatment is medically necessary.",
        ],
        documents: ["Diagnosis/evaluation report", "List of specific therapy concerns"],
        smsReminder: "Tomorrow: 'Call pediatrician for therapy referrals + medical necessity letter.'",
        followUpKey: "ped_done",
      });
      actions.push({ id: "ins_check", ...u(), agencyKey: "insurance", category: "standard",
        title: "Call insurance to verify therapy coverage",
        subtitle: `Confirm coverage and start prior authorization.${diagnosis === "autism" ? " California law (SB 946) mandates ABA coverage — don't let them deny it." : ""}`,
        whyMatters: "Insurance is the first payer for therapy. Getting authorization locked in means services can start. If denied, you have strong appeal rights.",
        learnMoreKey: diagnosis === "autism" ? "SB 946" : undefined,
        agency: "Insurance", deadline: "After getting referral",
        talkingPoints: [
          `I'm calling about ${diagnosis === "autism" ? "ABA and OT" : "OT and speech therapy"} coverage for my child. Diagnosis: ${diagnosis === "autism" ? "F84.0 (ASD)" : diagnosis === "cp" ? "G80.x" : "F88/F89"}.`,
          "What's the prior authorization process and timeline?",
          "How many sessions are typically approved initially?",
          "Can you send me a list of in-network providers near [ZIP code]?",
        ],
        smsReminder: `Day 3: 'Call insurance. Ask about ${diagnosis === "autism" ? "ABA + OT" : "therapy"} coverage, prior auth, in-network providers.'`,
        followUpKey: "ins_done",
        dependsOn: "ot_referral",
      });
    }
  }

  // ─── BENEFITS: MEDI-CAL ───
  if (needsMC && rcE) {
    actions.push({ id: "medicaid_apply", ...h(), agencyKey: "medicaid", category: "standard",
      title: "Apply for Medi-Cal",
      subtitle: "Even with private insurance — Medi-Cal unlocks IHSS, covers therapy copays, and provides the broadest coverage for kids under EPSDT.",
      whyMatters: "Medi-Cal is the key that unlocks IHSS (where you can be paid to care for your child) and provides backup coverage for anything private insurance doesn't cover. RC clients get institutional deeming — only child's income counts.",
      learnMoreKey: "Medi-Cal",
      agency: "Medi-Cal / County", deadline: "Within 30 days",
      talkingPoints: [
        "I'd like to apply for Medi-Cal for my child with a developmental disability.",
        "They're being evaluated by Regional Center. I understand the HCBS-DD institutional deeming waiver may apply.",
        "Can we apply even though we have private insurance?",
      ],
      documents: ["Proof of income", "CA residency", "Child's SSN and birth certificate"],
      smsReminder: "Next week: 'Apply for Medi-Cal. coveredca.com or county office. Even with private insurance — unlocks IHSS.'",
    });
  }

  // ─── BENEFITS: SSI ───
  if (rcE && diagnosis !== "sld") {
    actions.push({ id: "ssi_apply", ...h(), agencyKey: "ssa", category: "standard",
      title: "Start SSI application",
      subtitle: `SSI provides ~$943/month for children with disabilities. ${diagnosis === "autism" ? "Autism with marked functional limitations typically qualifies." : "Your child's diagnosis may qualify."} Also auto-enrolls in Medi-Cal.`,
      whyMatters: "SSI is real money — almost $1,000/month that helps offset the enormous cost of caregiving, missed work, and medical expenses. It also gives your child Medi-Cal automatically.",
      learnMoreKey: "SSI",
      agency: "SSA", deadline: "Within 30 days",
      talkingPoints: [
        `I want to apply for SSI for my child who has ${dxName}.`,
        "What documentation do I need for the application?",
        "How do I complete the Function Report? (This is the most important part.)",
      ],
      documents: ["Diagnosis reports", "Medical records", "School records/IEP", "Function Report (describe WORST days)"],
      smsReminder: "Week 2: 'Start SSI app at ssa.gov or call 1-800-772-1213. Function Report = key document.'",
    });

    // ─── BENEFITS: IHSS ───
    actions.push({ id: "ihss_apply", ...h(), agencyKey: "ihss", category: "standard",
      title: "Apply for IHSS",
      subtitle: "Parents CAN be paid IHSS providers for their own child. Covers personal care, domestic services, and protective supervision. Requires Medi-Cal.",
      whyMatters: "IHSS is one of the few programs that pays parents for caregiving they're already doing. Hours are based on assessed need — if your child needs constant supervision, fight for protective supervision hours.",
      learnMoreKey: "IHSS",
      agency: "County IHSS", deadline: "After Medi-Cal approved",
      talkingPoints: [
        "I'd like to apply for IHSS for my child with a developmental disability.",
        "I understand parents can be IHSS providers. How does that work?",
        "My child needs [constant supervision / help with bathing, dressing, feeding / etc.]",
      ],
      documents: ["Medi-Cal card", "Physician verification of disability", "Detailed daily care log"],
      smsReminder: "After Medi-Cal: 'Apply for IHSS. Parents can be paid providers. Document 24-hour care needs.'",
      dependsOn: needsMC ? "medicaid_apply" : undefined,
    });
  }

  // ─── ADHD-SPECIFIC ───
  if (diagnosis === "adhd") {
    actions.push({ id: "adhd_504", ...u(), agencyKey: "school", category: "standard",
      title: "Request 504 plan or IEP evaluation",
      subtitle: "ADHD qualifies under 'Other Health Impairment' for IEP, or Section 504 for accommodations. Both give your child legal protections at school.",
      whyMatters: "Without a 504 or IEP, the school has no legal obligation to accommodate your child's ADHD. With one, they must provide specific supports.",
      learnMoreKey: "IEP",
      agency: "School District", deadline: "Request this week",
      talkingPoints: [
        "My child has been diagnosed with ADHD. I'm requesting an evaluation for special education services under 'Other Health Impairment.'",
        "If my child doesn't qualify for an IEP, I want to discuss a 504 plan.",
      ],
    });
  }

  // ─── TRANSITION AGE ───
  if (isTr && rcE) {
    actions.push({ id: "dor_apply", ...s(), agencyKey: "dor", category: "standard",
      title: "Apply to Department of Rehabilitation (DOR)",
      subtitle: "Job training, supported employment, and the Transition Partnership Program. Apply at 15-16 — waitlists are long.",
      whyMatters: "Employment is one of the biggest long-term concerns for families. DOR provides real vocational services. The earlier you apply, the better positioned your child will be.",
      learnMoreKey: "DOR",
      agency: "DOR", deadline: "Start application",
      talkingPoints: [
        "I'd like to apply for vocational rehabilitation services for my teenager with a developmental disability.",
        "What's the timeline for the Transition Partnership Program?",
        "Can you attend my child's next IEP transition meeting?",
      ],
    });
    actions.push({ id: "calable", ...s(), agencyKey: null, category: "support",
      title: "Set up CalABLE account",
      subtitle: "Tax-advantaged savings up to $100,000 without affecting SSI eligibility. Use for education, housing, transportation, and disability-related expenses.",
      whyMatters: "Without CalABLE, having more than $2,000 in savings would disqualify your child from SSI. CalABLE lets you save for the future without losing benefits.",
      learnMoreKey: "CalABLE",
      agency: "CalABLE", deadline: "Set up when ready",
    });
  }

  return actions;
}

// ─── FOLLOW-UP CONFIGS ───
export const FOLLOWUPS = {
  rc_done: { question: "How did the RC call go?", options: [
    { label: "Intake scheduled!", value: "scheduled", emoji: "✅" },
    { label: "Left voicemail", value: "voicemail", emoji: "📞" },
    { label: "Lines busy / couldn't reach", value: "busy", emoji: "😤" },
    { label: "Need help understanding", value: "confused", emoji: "❓" },
  ]},
  iep_done: { question: "IEP request status?", options: [
    { label: "Sent and confirmed!", value: "confirmed", emoji: "✅" },
    { label: "Sent, waiting for reply", value: "waiting", emoji: "⏳" },
    { label: "Haven't sent yet", value: "not_sent", emoji: "📝" },
    { label: "Meeting already scheduled", value: "scheduled", emoji: "🎉" },
  ]},
  school_eval_done: { question: "School evaluation request?", options: [
    { label: "Assessment plan received!", value: "plan_received", emoji: "✅" },
    { label: "Sent, waiting for response", value: "waiting", emoji: "⏳" },
    { label: "School refused to evaluate", value: "refused", emoji: "🚫" },
    { label: "Haven't sent yet", value: "not_sent", emoji: "📝" },
  ]},
  ped_done: { question: "Got the referral?", options: [
    { label: "Yes — referral in hand", value: "got_it", emoji: "✅" },
    { label: "Appointment scheduled", value: "appt_set", emoji: "📅" },
    { label: "Doctor refused referral", value: "refused", emoji: "⚠️" },
  ]},
  ins_done: { question: "What did insurance say?", options: [
    { label: "Approved!", value: "approved", emoji: "✅" },
    { label: "Pending/processing", value: "pending", emoji: "⏳" },
    { label: "Denied", value: "denied", emoji: "🚫" },
  ]},
};

// ─── FOLLOW-UP ACTION GENERATOR ───
export function getFollowUpActions(key, answer, intake) {
  const a = [];
  if (key === "rc_done" && answer === "voicemail") {
    a.push({ id: "rc_retry", priority: "urgent", agencyKey: "rceb", category: "standard",
      title: "Call RC again tomorrow at 8:30am",
      subtitle: "Don't wait for callback. Lines are clearest first thing in the morning. Ask for intake coordinator name and confirmation number.",
      agency: "RC", deadline: "Tomorrow 8:30am",
      talkingPoints: ["I called yesterday about referring my child. I'd like to confirm the referral is in process and get a confirmation number."],
      smsReminder: "Tomorrow 8:25am: 'Call RC. Ask for intake coordinator name + confirmation #.'",
      followUpKey: "rc_done",
    });
  }
  if (key === "rc_done" && answer === "busy") {
    a.push({ id: "rc_email", priority: "urgent", agencyKey: "rceb", category: "standard",
      title: "Email RC intake directly",
      subtitle: "Phone lines overloaded. Email creates a paper trail and triggers the 15-day intake deadline.",
      agency: "RC", deadline: "Send today",
      draftMessage: `Subject: Referral Request — [Child Name], DOB [date]\n\nDear Intake Team,\n\nI am requesting an intake evaluation for my child, [Child Name], DOB [date], who has ${intake.diagnosis === "suspected" ? "developmental concerns" : "been diagnosed with " + intake.diagnosis}.\n\nI have been unable to reach intake by phone. Per the Lanterman Act, intake should be scheduled within 15 days of referral.\n\nPhone: [your number]\nEmail: [your email]\n\nThank you,\n[Your Name]`,
      smsReminder: "Today: 'Email RC intake. Attach eval report. Reference 15-day Lanterman deadline.'",
    });
  }
  if (key === "ins_done" && answer === "denied") {
    a.push({ id: "ins_appeal", priority: "urgent", agencyKey: "insurance", category: "escalation",
      title: "⚠️ File insurance appeal immediately",
      subtitle: "Denials are common and often overturned. You have 30 days. DMHC overturns ~60% on Independent Medical Review.",
      whyMatters: "Insurance companies frequently deny first requests. This is a known pattern. Appeals are often successful — don't give up.",
      learnMoreKey: "IMR",
      agency: "Insurance / DMHC", deadline: "Within 30 days of denial",
      draftMessage: `Dear [Insurance] Appeals Department,\n\nI formally appeal the denial of [therapy] for my child, [Name], Member ID [number].\n\nDiagnosis: ${intake.diagnosis === "autism" ? "F84.0 (ASD)" : "[ICD code]"}\n\nBasis for appeal:\n1. Medical necessity per attached evaluation\n2. ${intake.diagnosis === "autism" ? "CA SB 946 mandating behavioral health coverage for autism" : "Medically necessary treatment per physician"}\n3. Physician referral and medical necessity letter attached\n\nIf denied, I will request Independent Medical Review through ${intake.insurance === "private" ? "DMHC (HMO) or CDI (PPO)" : "Medi-Cal managed care grievance process"}.\n\nAttached: evaluation, referral, denial letter\n\nSincerely,\n[Your Name]`,
      smsReminder: "Today: 'File appeal. Attach eval + doctor letter. 30-day deadline.'",
    });
  }
  if (key === "school_eval_done" && answer === "refused") {
    a.push({ id: "school_cde", priority: "urgent", agencyKey: "school", category: "escalation",
      title: "⚠️ School refused evaluation — file CDE complaint",
      subtitle: "Schools cannot refuse a parent's written evaluation request. This violates IDEA. File a compliance complaint with the California Department of Education.",
      whyMatters: "A school refusing to evaluate is a clear legal violation. The CDE complaint is free, investigated within 60 days, and can order the district to evaluate immediately plus provide compensatory services.",
      learnMoreKey: "CDE Complaint",
      agency: "CDE", deadline: "File this week",
      draftMessage: `Dear CDE Complaint Unit,\n\nCompliance complaint against [School District] for IDEA violation.\n\nOn [date], I submitted a written request for special education evaluation for [Name]. The district has refused.\n\nViolations:\n- 34 CFR §300.301 (right to request evaluation)\n- CA Ed Code §56321 (15-day assessment plan timeline)\n- 34 CFR §300.503 (failure to provide Prior Written Notice)\n\nI request CDE order immediate evaluation + compensatory services.\n\nAttached: copy of original request with date\n\n[Your Name]`,
      smsReminder: "This week: 'File CDE complaint. Attach original request with date. CDE: (916) 319-0800.'",
    });
  }
  if (key === "ped_done" && answer === "refused") {
    a.push({ id: "ped_new", priority: "high", agencyKey: null, category: "support",
      title: "Find a new pediatrician or go direct to specialist",
      subtitle: "Some pediatricians are gatekeepers. You can self-refer to many therapy providers, or ask RC/insurance for direct referral paths.",
      agency: "Medical", deadline: "This week",
    });
  }
  if (answer === "not_sent") return []; // user hasn't acted yet
  return a;
}
