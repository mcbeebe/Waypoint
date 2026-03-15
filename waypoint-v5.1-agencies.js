// ═══════════════════════════════════════════════════════
// WAYPOINT V5.1 — ENHANCED AGENCIES + RC ZIP LOOKUP
// Every agency a user might interact with, plus
// zip-to-Regional-Center mapping for all of California
// ═══════════════════════════════════════════════════════

// ─── REGIONAL CENTER ZIP CODE LOOKUP ───
// California has 21 Regional Centers. Each serves specific counties.
// We map county → RC, and zip prefix → county for lookup.
export const RC_DATABASE = {
  "ACRC":  { name: "Alta California Regional Center", phone: "(916) 978-6400", website: "altaregional.org", counties: ["Sacramento","Yolo","Yuba","Sutter","Nevada","Placer","Sierra","El Dorado","Alpine","Colusa"], hours: "Mon-Fri 8am-5pm" },
  "RCEB":  { name: "Regional Center of the East Bay", phone: "(510) 618-6100", website: "rceb.org", counties: ["Alameda","Contra Costa"], hours: "Mon-Fri 8:30am-5pm" },
  "GGRC":  { name: "Golden Gate Regional Center", phone: "(415) 546-9222", website: "ggrc.org", counties: ["San Francisco","San Mateo","Marin"], hours: "Mon-Fri 8:30am-5pm" },
  "NBRC":  { name: "North Bay Regional Center", phone: "(707) 256-1100", website: "nbrc.net", counties: ["Napa","Solano","Sonoma"], hours: "Mon-Fri 8am-5pm" },
  "RCRC":  { name: "Redwood Coast Regional Center", phone: "(707) 445-0893", website: "redwoodcoastrc.org", counties: ["Del Norte","Humboldt","Lake","Mendocino"], hours: "Mon-Fri 8am-5pm" },
  "FNRC":  { name: "Far Northern Regional Center", phone: "(530) 222-4791", website: "farnorthernrc.org", counties: ["Butte","Glenn","Lassen","Modoc","Plumas","Shasta","Siskiyou","Tehama","Trinity"], hours: "Mon-Fri 8am-5pm" },
  "VMRC":  { name: "Valley Mountain Regional Center", phone: "(209) 473-0951", website: "vmrc.net", counties: ["San Joaquin","Stanislaus","Amador","Calaveras","Tuolumne","Mariposa"], hours: "Mon-Fri 8am-5pm" },
  "CVRC":  { name: "Central Valley Regional Center", phone: "(559) 276-4300", website: "cvrc.org", counties: ["Fresno","Kings","Madera","Merced","Tulare"], hours: "Mon-Fri 8am-5pm" },
  "TCRC":  { name: "Tri-Counties Regional Center", phone: "(805) 962-7881", website: "tri-counties.org", counties: ["San Luis Obispo","Santa Barbara","Ventura"], hours: "Mon-Fri 8am-5pm" },
  "KRC":   { name: "Kern Regional Center", phone: "(661) 327-8531", website: "kernrc.org", counties: ["Kern","Inyo","Mono"], hours: "Mon-Fri 8am-5pm" },
  "SCLARC":{ name: "South Central LA Regional Center", phone: "(213) 744-7000", website: "sclarc.org", counties: ["Los Angeles (south central)"], hours: "Mon-Fri 8am-5pm" },
  "ELARC": { name: "Eastern LA Regional Center", phone: "(626) 299-4700", website: "elarc.org", counties: ["Los Angeles (east)"], hours: "Mon-Fri 8am-5pm" },
  "NLACRC":{ name: "North LA County Regional Center", phone: "(818) 778-1900", website: "nlacrc.org", counties: ["Los Angeles (north, San Fernando Valley)"], hours: "Mon-Fri 8am-5pm" },
  "WRC":   { name: "Westside Regional Center", phone: "(310) 258-4000", website: "westsiderc.org", counties: ["Los Angeles (west, Santa Monica, LAX area)"], hours: "Mon-Fri 8am-5pm" },
  "FRC":   { name: "Frank D. Lanterman Regional Center", phone: "(213) 383-1300", website: "lanterman.org", counties: ["Los Angeles (Glendale, Pasadena, northeast)"], hours: "Mon-Fri 8am-5pm" },
  "HRC":   { name: "Harbor Regional Center", phone: "(310) 540-1711", website: "harborrc.org", counties: ["Los Angeles (south bay, harbor, Long Beach)"], hours: "Mon-Fri 8am-5pm" },
  "SGPRC": { name: "San Gabriel/Pomona Regional Center", phone: "(909) 620-7722", website: "sgprc.org", counties: ["Los Angeles (San Gabriel Valley, Pomona)"], hours: "Mon-Fri 8am-5pm" },
  "IRC":   { name: "Inland Regional Center", phone: "(909) 890-3000", website: "inlandrc.org", counties: ["Riverside","San Bernardino"], hours: "Mon-Fri 8am-5pm" },
  "SDRC":  { name: "San Diego Regional Center", phone: "(858) 576-2996", website: "sdrc.org", counties: ["San Diego","Imperial"], hours: "Mon-Fri 8am-5pm" },
  "RCOC":  { name: "Regional Center of Orange County", phone: "(714) 796-5100", website: "rcocdd.com", counties: ["Orange"], hours: "Mon-Fri 8am-5pm" },
  "SARC":  { name: "San Andreas Regional Center", phone: "(408) 374-9960", website: "sarc.org", counties: ["Santa Clara","San Benito","Santa Cruz","Monterey"], hours: "Mon-Fri 8am-5pm" },
};

// Zip prefix → RC code (first 3 digits of zip)
// This covers the major zip ranges. For LA County (which has multiple RCs),
// we default to SCLARC but the user can refine.
export const ZIP_TO_RC = {
  // Sacramento area
  "956":  "ACRC", "957":  "ACRC", "958":  "ACRC", "959":  "ACRC",
  // East Bay
  "945":  "RCEB", "946":  "RCEB", "947":  "RCEB", "948":  "RCEB", "944":  "RCEB",
  // SF / Peninsula
  "940":  "GGRC", "941":  "GGRC", "942":  "GGRC", "943":  "GGRC", "949":  "GGRC",
  // North Bay
  "944":  "NBRC", "949":  "NBRC", "954":  "NBRC", "955":  "NBRC",
  // Marin (overlap with GGRC — Marin is GGRC)
  // Redwood Coast
  "955":  "RCRC", "954":  "RCRC",
  // Far Northern
  "960":  "FNRC", "961":  "FNRC", "962":  "FNRC", "963":  "FNRC", "959":  "FNRC",
  // Valley Mountain (Stockton/Modesto)
  "952":  "VMRC", "953":  "VMRC",
  // Central Valley (Fresno area)
  "936":  "CVRC", "937":  "CVRC", "932":  "CVRC", "933":  "CVRC",
  // Tri-Counties
  "934":  "TCRC", "931":  "TCRC", "930":  "TCRC", "935":  "TCRC",
  // Kern
  "932":  "KRC", "933":  "KRC",
  // LA County (default to SCLARC, refine by sub-zip)
  "900":  "SCLARC", "901":  "SCLARC", "902":  "HRC",
  "903":  "SGPRC",  "904":  "NLACRC",  "905":  "WRC",
  "906":  "WRC",    "907":  "NLACRC",  "908":  "SGPRC",
  "910":  "ELARC",  "911":  "ELARC",   "912":  "FRC",
  "913":  "NLACRC", "914":  "NLACRC",  "915":  "NLACRC",
  "916":  "NLACRC", "917":  "ELARC",   "918":  "FRC",
  // Orange County
  "926":  "RCOC",   "927":  "RCOC",    "928":  "RCOC",
  // Inland Empire
  "921":  "IRC",    "922":  "IRC",     "923":  "IRC",
  "924":  "IRC",    "925":  "IRC",
  // San Diego
  "919":  "SDRC",   "920":  "SDRC",
  // South Bay / Long Beach
  "907":  "HRC",    "908":  "HRC",
  // San Jose / Santa Clara
  "950":  "SARC",   "951":  "SARC",
  // Santa Cruz / Monterey
  "950":  "SARC",   "939":  "SARC",    "938":  "SARC",
};

export function lookupRC(zip) {
  if (!zip || zip.length < 3) return null;
  const prefix = zip.slice(0, 3);
  const code = ZIP_TO_RC[prefix];
  if (code && RC_DATABASE[code]) {
    return { code, ...RC_DATABASE[code] };
  }
  return null;
}

// ─── FULL AGENCY DATABASE ───
// Every agency: what it is, what it does, your rights, watch-outs,
// contact info, and "why this matters" for parent context
export const AGENCIES = {
  rceb: {
    name: "Regional Center",
    type: "State (Nonprofit)",
    phone: "(varies by location)",
    website: "dds.ca.gov",
    hours: "Mon-Fri 8:30am-5pm",
    what: "One of 21 Regional Centers in California. Your primary gateway to developmental disability services under the Lanterman Act: ABA therapy, respite, speech, OT, and a dedicated Service Coordinator who helps coordinate everything.",
    whyMatters: "Regional Center is often the single most important connection for families. Your SC becomes your advocate and guide through the system. RC can fund services that insurance won't cover.",
    services: ["Eligibility evaluation (free)", "Service Coordinator assignment", "ABA therapy funding", "Respite care", "Speech, OT, PT funding (after insurance)", "Adaptive equipment", "Diapers/incontinence supplies (ages 3+)", "Transportation assistance", "Self-Determination Program"],
    rights: ["Self-refer — no doctor referral needed", "15-day intake deadline (W&I §4642)", "120-day eligibility determination (W&I §4643)", "Right to specific services in IPP", "Right to appeal (Fair Hearing / 4731 complaint)", "All communication in your preferred language"],
    watchOut: "Purchase of Service (POS) spending disparities are well-documented — White families receive roughly 2x more than Latino families. Know what's available and request it specifically. Don't wait for your SC to offer services.",
    // Will be dynamically replaced with zip-specific RC
    dynamic: true,
  },
  earlystart: {
    name: "Early Start Program (Regional Center)",
    type: "State Program",
    phone: "(same as your Regional Center)",
    what: "California's early intervention program for infants and toddlers (0-3) with developmental delays or established risk conditions. Lower eligibility threshold than Lanterman Act services for older children.",
    whyMatters: "Research overwhelmingly shows early intervention (before age 3) produces the best outcomes. Early Start has a LOWER bar for eligibility — you don't need a formal diagnosis.",
    services: ["IFSP development (replaces IPP for 0-3)", "Speech, OT, PT, ABA for infants", "Family training and education", "Service coordination", "Transition planning to school IEP at age 3"],
    rights: ["45-day timeline from referral to IFSP", "Services in natural environment", "IFSP review every 6 months", "Transition planning starts at 2yr 9mo"],
    watchOut: "Transition from Early Start to school district IEP at age 3 is where many kids lose services. The school's threshold is different. Start transition planning early and keep both tracks going.",
    dynamic: true,
  },
  school: {
    name: "Your School District (Special Education)",
    type: "Local Education Agency",
    phone: "Contact school main office → ask for SpEd Director",
    what: "Under IDEA (federal law), your school district must provide Free Appropriate Public Education (FAPE) — that includes evaluation, IEP development, and related services like speech, OT, and behavioral support. All FREE.",
    whyMatters: "School services are an entitlement, not a gift. Your child has a RIGHT to be evaluated and to receive an IEP if they qualify. The school cannot refuse a parent's written request for evaluation.",
    services: ["Psychoeducational evaluation (free)", "IEP with measurable goals", "Speech, OT, PT, counseling", "Behavioral support / 1:1 aide", "Assistive technology", "Specialized academic instruction", "Transition services (age 16+)"],
    rights: ["Equal IEP team member — your voice counts as much as theirs", "Bring anyone to IEP meeting (advocate, friend, attorney)", "Request IEP meeting at ANY time in writing", "Request IEE at district expense if you disagree with their eval", "Right to mediation, CDE complaint, or due process hearing", "Don't have to sign IEP the same day — take it home"],
    watchOut: "Schools often offer the minimum they think they can get away with. Come prepared with specific requests. Write everything down. If they refuse something, demand Prior Written Notice explaining WHY.",
  },
  insurance: {
    name: "Your Health Insurance",
    type: "Private / Managed Care",
    what: "California law (SB 946) mandates behavioral health treatment coverage for autism, including ABA therapy. Plans must also cover medically necessary OT, speech, and PT. Mental health parity laws mean MH benefits must equal medical benefits.",
    whyMatters: "Insurance is typically the FIRST payer for therapy services. If your child has autism, ABA coverage is mandated by state law with no annual or lifetime dollar caps. Fight denials — ~60% are overturned on appeal.",
    services: ["ABA therapy (mandated for autism — SB 946)", "OT, Speech, PT", "Psychiatric/psychological services", "Durable medical equipment"],
    rights: ["Appeal any denial (internal + external)", "Independent Medical Review through DMHC (HMO) or CDI (PPO)", "Out-of-network authorization if no in-network available", "Timely access: specialist within 15 business days", "No arbitrary hour/visit caps for mental health (parity law)"],
    watchOut: "First authorization requests are frequently denied. This is common and NOT the end. Appeal immediately. DMHC overturns approximately 60% of denials on Independent Medical Review. Always get denials in writing.",
  },
  ssa: {
    name: "Social Security Administration (SSI)",
    type: "Federal",
    phone: "1-800-772-1213",
    website: "ssa.gov",
    hours: "Mon-Fri 8am-7pm",
    what: "Administers Supplemental Security Income (SSI) — a monthly cash benefit for children with disabilities. Autism with marked or severe functional limitations typically qualifies.",
    whyMatters: "SSI provides approximately $943/month in California. It also automatically enrolls your child in Medi-Cal, which unlocks IHSS and other services. The monthly income helps offset the enormous cost of caregiving.",
    services: ["SSI monthly benefit (~$943/mo in CA)", "Automatic Medi-Cal enrollment on approval", "CalABLE account eligibility ($100K SSI-exempt savings)"],
    rights: ["Appeal any denial (reconsideration → ALJ hearing → Appeals Council)", "Continuing benefits during appeal", "Back pay from application date if approved"],
    watchOut: "The Function Report is where most families lose. Describe your child's WORST days, not best. Be painfully specific about limitations, supervision needs, and safety concerns. 'He needs help with everything' is too vague. 'He cannot dress himself, runs into traffic, smears feces, requires constant line-of-sight supervision' — that's what they need to see.",
  },
  ihss: {
    name: "In-Home Supportive Services (IHSS)",
    type: "County Program",
    phone: "Your county social services office",
    what: "Personal care services to help disabled individuals remain safely at home. Parents CAN be paid providers — this means you can get paid to care for your own child. Requires Medi-Cal.",
    whyMatters: "IHSS is one of the few programs that actually pays parents for the caregiving they're already doing. Hours are based on assessed need and can be substantial — especially with protective supervision.",
    services: ["Personal care (bathing, dressing, feeding)", "Domestic services (cleaning, laundry, meal prep)", "Protective supervision (up to 24 hours/day for safety)", "Paramedical services (medication, tube feeding)", "Medical appointment transportation"],
    rights: ["Choose your provider (including parent or family member)", "Request reassessment at any time if needs increase", "State Fair Hearing if denied or hours are insufficient"],
    watchOut: "Document every task throughout a full 24-hour day. Protective supervision is hard to get but worth fighting for — it's for children who need constant supervision due to safety risks (elopement, self-injury, pica). During the assessment, describe the hardest days.",
  },
  medicaid: {
    name: "Medi-Cal",
    type: "State/Federal (Medicaid)",
    phone: "1-800-541-5555",
    website: "medi-cal.ca.gov",
    hours: "Mon-Fri 8am-5pm",
    what: "California's Medicaid program. EPSDT (Early & Periodic Screening, Diagnostic, and Treatment) covers ALL medically necessary services for children under 21 — often broader than private insurance.",
    whyMatters: "Even if you have private insurance, Medi-Cal as secondary coverage is enormously valuable. It unlocks IHSS, covers gaps in private insurance, and EPSDT means virtually anything medically necessary must be covered for kids.",
    services: ["All medically necessary services under EPSDT", "Therapy (OT, Speech, PT, ABA)", "Prescriptions", "Durable medical equipment", "Transportation to medical appointments", "Mental health services"],
    rights: ["Retroactive coverage 3 months from application", "Continue services during any appeal", "Choose your managed care plan", "Regional Center clients: institutional deeming (only child's income counts)"],
    watchOut: "#1 risk: missing annual redetermination = losing coverage. Set calendar reminders 60 days before renewal. If coverage lapses, reapply immediately — retroactive 3 months.",
  },
  dor: {
    name: "Department of Rehabilitation (DOR)",
    type: "State",
    phone: "1-844-729-2800",
    website: "dor.ca.gov",
    what: "Vocational rehabilitation for transition-age youth and adults with disabilities. Provides job training, supported employment, college support, and the Transition Partnership Program (TPP).",
    whyMatters: "Employment is one of the biggest concerns for families of teens with disabilities. DOR provides real job training, coaching, and placement services. Apply early — waitlists can be long.",
    services: ["Transition Partnership Program (TPP)", "Job coaching and supported employment", "College and vocational training support", "Assistive technology for employment"],
    rights: ["Appeal any service denial", "Individualized Plan for Employment (IPE)", "Invite DOR to IEP transition meetings"],
    watchOut: "Long waitlists — apply at age 15-16, not 18. Invite DOR counselor to your child's IEP transition meetings. They should be part of the planning team.",
  },
};

// ─── LEARN MORE: WHAT IS THIS? ───
// Concise explanations for terms users might not know
export const LEARN_MORE = {
  "SSI": {
    title: "What is SSI?",
    body: "Supplemental Security Income is a federal monthly cash payment for people with disabilities who have limited income. For children, it's based on the severity of the disability. In California, the maximum is about $943/month. Approval also automatically gives your child Medi-Cal.",
    tip: "The application asks about your child's limitations. The Function Report is the most important document — describe the hardest days in specific detail.",
  },
  "IHSS": {
    title: "What is IHSS?",
    body: "In-Home Supportive Services is a California program that pays for personal care so disabled people can stay at home safely. The key benefit: parents can be the paid provider. You're already doing the work — IHSS means you can get compensated for it.",
    tip: "You need Medi-Cal to qualify. The county will assess your child's needs and assign hours. Fight for protective supervision if your child is a safety risk.",
  },
  "IEP": {
    title: "What is an IEP?",
    body: "An Individualized Education Program is a legally binding document that describes your child's special education services, goals, accommodations, and placement. The school MUST follow it. You are an equal team member in creating it.",
    tip: "Never sign the IEP the same day. Take it home, review it, and request changes. Everything the school provides should be written in the IEP.",
  },
  "IPP": {
    title: "What is an IPP?",
    body: "The Individual Program Plan is your contract with Regional Center. It lists the services RC will provide or fund for your child. Like an IEP but for RC services. You have the right to request specific services be included.",
    tip: "If a service isn't in the IPP, RC doesn't have to provide it. Be specific about what you want included. Review it annually.",
  },
  "Regional Center": {
    title: "What is Regional Center?",
    body: "California has 21 Regional Centers that coordinate services for people with developmental disabilities. They provide a Service Coordinator, fund therapies, respite care, and many other services. It's FREE and you can self-refer.",
    tip: "RC is the gateway to most disability services in California. Even if you have insurance and school services, RC fills the gaps.",
  },
  "Medi-Cal": {
    title: "What is Medi-Cal?",
    body: "California's Medicaid program. For children with disabilities, EPSDT means virtually ALL medically necessary services must be covered. Even if you have private insurance, Medi-Cal as secondary is valuable because it covers what private insurance won't.",
    tip: "RC clients get 'institutional deeming' — only the child's income counts, not the parents'. Most RC-eligible children qualify.",
  },
  "CalABLE": {
    title: "What is CalABLE?",
    body: "A tax-advantaged savings account for people with disabilities. You can save up to $100,000 without affecting SSI eligibility. The money can be used for education, housing, transportation, health, and other disability-related expenses.",
    tip: "Open one as soon as you start receiving SSI. It's the only way to save significant money without losing benefits.",
  },
  "DOR": {
    title: "What is DOR?",
    body: "The Department of Rehabilitation helps people with disabilities find and keep employment. For teens, the Transition Partnership Program (TPP) provides job coaching, vocational training, and supported employment services.",
    tip: "Apply at 15-16, not 18. Invite the DOR counselor to your child's IEP transition meetings.",
  },
  "Fair Hearing": {
    title: "What is a Fair Hearing?",
    body: "A formal appeal process where an Administrative Law Judge reviews your case against a government agency (RC, SSA, IHSS, Medi-Cal). If the agency denies services you believe you're entitled to, you can request a Fair Hearing.",
    tip: "You have the right to free legal representation from Disability Rights California (1-800-776-5746).",
  },
  "4731 Complaint": {
    title: "What is a 4731 Complaint?",
    body: "A formal complaint to the California Department of Developmental Services (DDS) against your Regional Center. DDS must investigate. RC has 20 business days to respond. Named after Welfare & Institutions Code §4731.",
    tip: "Use this when RC is violating timelines, denying services without proper notice, or failing to implement your IPP.",
  },
  "CDE Complaint": {
    title: "What is a CDE Compliance Complaint?",
    body: "A formal complaint to the California Department of Education when your school district violates IDEA or state special education law. CDE investigates within 60 days and can order corrective action, compensatory services, and policy changes.",
    tip: "Free to file. More effective than many parents realize. CDE: (916) 319-0800 or file online at cde.ca.gov.",
  },
  "IMR": {
    title: "What is Independent Medical Review?",
    body: "When your insurance denies a service and you've exhausted internal appeals, you can request an IMR through DMHC (for HMO plans) or CDI (for PPO plans). An independent doctor reviews your case. The decision is BINDING on your insurance plan.",
    tip: "DMHC overturns approximately 60% of denials. Always pursue IMR after an internal appeal denial. DMHC: 1-888-466-2219.",
  },
  "EPSDT": {
    title: "What is EPSDT?",
    body: "Early and Periodic Screening, Diagnostic, and Treatment is a federal Medicaid benefit for children under 21. It means Medi-Cal must cover ALL medically necessary services — even services not normally covered for adults. It's the broadest coverage available.",
    tip: "If Medi-Cal denies something for your child, cite EPSDT. For kids under 21, 'medically necessary' is the only standard.",
  },
  "SB 946": {
    title: "What is SB 946?",
    body: "A California law that requires health insurance to cover behavioral health treatment (including ABA therapy) for autism spectrum disorder. No annual or lifetime dollar caps allowed. Cannot limit coverage based on age alone.",
    tip: "If insurance denies ABA, cite SB 946 (Health & Safety Code §1374.73). This is California law — they must cover it.",
  },
};
