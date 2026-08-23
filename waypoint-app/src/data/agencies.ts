import { SSI_FBR_MONTHLY, SSI_YEAR, SSI_MONTHLY_SHORT } from '@/data/benefitFigures';
/**
 * Agency directory and "Learn More" explainer entries.
 * LEARN_MORE ~lines 906-926). LEARN_MORE bodies converted from inline HTML
 * (<br>/<strong>/<em>) to plain text with \n newlines; wording unchanged.
  *
 * NOTE ON ACCURACY (added after the Aug 2026 content audit): this file contains
 * dated legal figures and statutory timelines. It is NOT frozen — when a law,
 * rate, or deadline changes, UPDATE IT, and verify edits against current
 * primary sources (DDS, SSA, CA Ed Code). Dollar amounts and ages are marked
 * with their year where possible. src/data/contentFacts.test.ts guards against
 * known-stale values reappearing.
 */
import type { Agency, LearnMoreEntry } from './types';

/** The 8 core agencies families navigate. */
export const AGENCIES: Agency[] = [
  {
    key: 'rceb',
    name: 'Regional Center',
    type: 'State (Nonprofit)',
    phone: '(varies)',
    website: 'dds.ca.gov',
    what: 'One of 21 Regional Centers in CA. Primary gateway to developmental disability services under the Lanterman Act: ABA, respite, speech, OT, and a Service Coordinator.',
    whyMatters: 'RC is often the single most important connection. Your SC becomes your guide. RC funds services insurance won\'t cover.',
    services: ['Eligibility evaluation (free)', 'Service Coordinator assignment', 'ABA therapy funding', 'Respite care', 'Speech, OT, PT funding', 'Adaptive equipment', 'Diapers/incontinence (3+)', 'Transportation', 'Self-Determination Program'],
    rights: ['Self-refer — no doctor needed', '15-working-day intake (W&I §4642)', '120-day eligibility (W&I §4643)', 'Right to appeal (Fair Hearing / 4731)', 'All communication in your language'],
    watchOut: 'POS spending disparities: White families receive ~2x more than Latino families. Know what\'s available and request it specifically.',
    dynamic: true,
  },
  {
    key: 'earlystart',
    name: 'Early Start Program',
    type: 'State Program',
    phone: '(same as your RC)',
    website: '',
    what: 'Early intervention for 0-3 with developmental delays. LOWER eligibility bar than Lanterman Act.',
    whyMatters: 'Research overwhelmingly shows early intervention before age 3 produces the best outcomes.',
    services: ['IFSP development', 'Speech, OT, PT, ABA for infants', 'Family training', 'Service coordination', 'Transition planning to IEP at 3'],
    rights: ['45-day referral to IFSP', 'Services in natural environment', 'IFSP review every 6 months'],
    watchOut: 'Transition from Early Start to school IEP at age 3 is where many kids lose services.',
    dynamic: true,
  },
  {
    key: 'school',
    name: 'School District (Special Ed)',
    type: 'Local Education Agency',
    phone: 'Call school main office',
    website: '',
    what: 'Under IDEA, your district must provide FAPE — evaluation, IEP, and related services. All FREE.',
    whyMatters: 'School services are an entitlement, not a gift. Your child has a RIGHT to be evaluated.',
    services: ['Psychoeducational evaluation (free)', 'IEP with measurable goals', 'Speech, OT, PT, counseling', 'Behavioral support / aide', 'Assistive technology', 'Transition services (16+)'],
    rights: ['Equal IEP team member', 'Bring anyone to meeting', 'Request IEP meeting at ANY time', 'Request IEE at district expense', 'Don\'t have to sign same day'],
    watchOut: 'Schools often offer the minimum. Come prepared. If they refuse, demand Prior Written Notice.',
  },
  {
    key: 'insurance',
    name: 'Health Insurance',
    type: 'Private/Managed Care',
    phone: '',
    website: '',
    what: 'CA law (SB 946) mandates ABA for autism. Plans must cover OT, speech, PT. Mental health parity applies.',
    whyMatters: 'Insurance is first payer. ~60% of denials overturned on appeal. Always fight denials.',
    services: ['ABA therapy (mandated — SB 946)', 'OT, Speech, PT', 'Psychiatric services', 'DME'],
    rights: ['Appeal any denial', 'Independent Medical Review (DMHC/CDI)', 'Out-of-network if none available', 'Timely access: 15 business days'],
    watchOut: 'First requests frequently denied. This is common, NOT the end. Appeal immediately.',
  },
  {
    key: 'ssa',
    name: 'Social Security (SSI)',
    type: 'Federal',
    phone: '1-800-772-1213',
    website: 'ssa.gov',
    what: `SSI ~$${SSI_FBR_MONTHLY}/month (${SSI_YEAR}) for children with disabilities. Auto-enrolls in Medi-Cal.`,
    whyMatters: 'Real money + Medi-Cal. The Function Report is key — describe WORST days.',
    services: [`SSI ${SSI_MONTHLY_SHORT} (adjusted annually)`, 'Automatic Medi-Cal', 'CalABLE eligibility'],
    rights: ['Appeal any denial', 'Continuing benefits during appeal', 'Back pay from application date'],
    watchOut: 'Function Report: describe WORST days. Be painfully specific about limitations.',
  },
  {
    key: 'ihss',
    name: 'IHSS',
    type: 'County Program',
    phone: 'County social services',
    website: '',
    what: 'Personal care for disabled individuals at home. Parents CAN be paid providers.',
    whyMatters: 'One of few programs that pays parents for caregiving they already do.',
    services: ['Personal care', 'Domestic services', 'Protective supervision (up to 24hr)', 'Medical transport'],
    rights: ['Choose your provider (including parent)', 'Request reassessment anytime', 'Fair Hearing'],
    watchOut: 'Document every task in a full 24-hour day. Fight for protective supervision.',
  },
  {
    key: 'medicaid',
    name: 'Medi-Cal',
    type: 'State/Federal',
    phone: '1-800-541-5555',
    website: '',
    what: 'CA Medicaid. EPSDT covers ALL medically necessary services for children under 21.',
    whyMatters: 'Even with private insurance, Medi-Cal as secondary is enormously valuable.',
    services: ['All services under EPSDT', 'Therapy', 'Prescriptions', 'DME', 'Transport'],
    rights: ['Retroactive 3 months', 'Continue services during appeal'],
    watchOut: '#1 risk: missing annual redetermination. Set reminders 60 days before renewal.',
  },
  {
    key: 'dor',
    name: 'Dept of Rehabilitation',
    type: 'State',
    phone: '1-844-729-2800',
    website: '',
    what: 'Vocational rehab for transition-age youth. Job training, supported employment.',
    whyMatters: 'Employment is the biggest long-term concern. Apply early — waitlists are long.',
    services: ['Transition Partnership Program', 'Job coaching', 'Supported employment', 'College support'],
    rights: ['Appeal denials', 'Individualized Plan for Employment'],
    watchOut: 'Apply at 15-16, not 18. Invite DOR to IEP transition meetings.',
  },
];

/** Explainer entries keyed by the GAS keys (shown from chat "Learn more" links). */
export const LEARN_MORE: Record<string, LearnMoreEntry> = {
  'SSI': {
    key: 'SSI',
    title: 'Supplemental Security Income (SSI)',
    body: `What it is: A federal monthly cash benefit for people with disabilities who have limited income and resources. Administered by the Social Security Administration (SSA).\n\nAmount: Up to ~$${SSI_FBR_MONTHLY} (${SSI_YEAR} federal rate, adjusted annually; CA adds a state supplement)/month in CA (federal + state supplement). Adjusted annually for cost of living.\n\nFor children: A child under 18 qualifies if they have a medically determinable physical or mental impairment that results in 'marked and severe functional limitations' expected to last 12+ months or result in death. Family income and resources are considered (under $2,000 countable resources).\n\nKey benefits beyond cash: Automatic Medi-Cal enrollment in CA (no separate application), eligibility for CalABLE savings account, pathway to IHSS.\n\nHow to apply: Call SSA at 1-800-772-1213, visit ssa.gov, or go to your local SSA office. Child applications cannot be fully completed online — you'll need an appointment.\n\nTimeline: 3-6 months for initial decision. If denied, appeal within 60 days — approval rates improve significantly on appeal.\n\nThe Function Report (SSA-3375-BK): This is the most important document in your application. It asks how your child's disability affects daily life. Describe your child's WORST days in vivid, specific detail. Never minimize.`,
    tip: 'The #1 mistake: writing the Function Report on a good day. Describe the worst days. \'Cannot dress independently — puts clothes on backwards, cannot button or zip, requires full physical help for 30+ minutes.\' Get letters from every provider. If denied, appeal — don\'t re-apply. Consider a disability attorney (they work on contingency).',
  },
  'IHSS': {
    key: 'IHSS',
    title: 'In-Home Supportive Services (IHSS)',
    body: 'What it is: A California program that provides funding for in-home care services so people with disabilities can live safely at home instead of in institutions. Administered by county social services.\n\nServices covered: Personal care (bathing, dressing, feeding, toileting), domestic tasks (cooking, cleaning, laundry), protective supervision (for those who are a danger to themselves without supervision), paramedical (giving medications, wound care with physician authorization), transportation to medical appointments, meal preparation.\n\nWho can be a provider: Parents, family members, friends, or professional caregivers. Parents CAN be paid providers for their own children — this is one of the only programs that compensates family caregivers.\n\nPay rate: $16-$20+/hour depending on county. Hours are determined by a social worker\'s in-home assessment.\n\nRequirement: Must have Medi-Cal. Apply through your county IHSS office or at BenefitsCal.com.\n\nThe assessment visit: A social worker comes to your home and observes your child\'s needs. Hours are assigned based on what they see. DO NOT help your child \'perform\' during the visit — let the assessor see the real level of need.\n\nProtective supervision: Additional hours for children who are a danger to themselves if left alone (wandering, putting objects in mouth, no sense of danger). Document every incident.',
    tip: 'Keep a daily care log for 1-2 weeks before the assessment. Time everything: bathing (15 min with full assist), feeding (20 min), dressing (10 min). During the assessment, don\'t compensate for your child\'s needs. If you disagree with hours, appeal within 90 days. For protective supervision, document every safety incident with dates.',
  },
  'IEP': {
    key: 'IEP',
    title: 'Individualized Education Program (IEP)',
    body: 'What it is: A legally binding document under IDEA (Individuals with Disabilities Education Act) that guarantees your child with a disability receives specific special education services and accommodations at school. Unlike a 504 plan, the IEP is enforceable by law — the school MUST provide every service listed.\n\nWhat\'s in an IEP: Present levels of performance, measurable annual goals, special education services (speech, OT, counseling, aide support), accommodations (extra time, modified assignments), placement (general ed, special day class, resource room), related services, transition plan (at age 16).\n\nYour rights as a parent: You are an EQUAL member of the IEP team. You can request a meeting anytime. You can bring anyone to the meeting (advocate, attorney, therapist). You do NOT have to sign the same day — take it home. You can consent to parts and reject others. You can request an audio recording of the meeting (CA Ed Code §56341.1).\n\nKey timelines: School has 15 days to respond to evaluation request with an assessment plan. 60 days from your signed consent to complete the evaluation AND hold the IEP meeting — one combined 60-day window (CA Ed Code §56344). School breaks longer than 5 schooldays pause the clock. IEP reviewed annually, re-evaluation every 3 years.\n\nIf the school violates the IEP: File a CDE compliance complaint ((916) 319-0800), request compensatory services, or file for due process hearing. Free legal help: Disability Rights CA 1-800-776-5746.',
    tip: 'NEVER sign the IEP at the meeting. Always say \'I\'d like to take this home to review.\' Once you sign, changes are much harder. Request all evaluation reports 5 days BEFORE the meeting. Record the meeting. If the school says \'we don\'t have the budget,\' that is NOT a legal reason to deny services.',
  },
  'IPP': {
    key: 'IPP',
    title: 'Individual Program Plan (IPP)',
    body: 'What it is: Your contract with Regional Center listing every service RC will provide or fund. Under the Lanterman Act (§4646), the IPP is developed jointly with you and must be based on your child\'s assessed needs — not RC\'s budget.\n\nWhat should be in the IPP: Assessment results, goals in all life areas, specific services authorized (type, frequency, duration, provider), timelines for implementation, Service Coordinator contact info, your rights and how to appeal.\n\nHow it works: You meet with your Service Coordinator at least annually to develop/review the IPP. You can request an IPP meeting anytime — RC must hold it within 30 days. Emergency IPP within 7 days.\n\nKey rule: If a service isn\'t written in the IPP, RC has no obligation to provide it. Be specific: don\'t accept \'RC will explore options.\' Write: \'RC will fund 10 hours/week of ABA therapy at $X rate with [provider name], starting by [date].\'\n\nYour rights: You must agree to the IPP. You can refuse to sign and request another meeting. If you disagree, request a Fair Hearing (§4710.5). Aid Paid Pending: if you appeal, existing services continue during the appeal.',
    tip: 'Be extremely specific in the IPP. Instead of \'RC will provide therapy,\' write \'RC will fund 15 hours/week of ABA therapy with [provider], beginning [date], at a rate of $X/hour.\' Vague language lets RC off the hook. If RC says \'we can\'t afford it,\' cite the Lanterman Act entitlement principle: services are based on need, not budget.',
  },
  'Regional Center': {
    key: 'Regional Center',
    title: 'What is Regional Center?',
    body: 'What it is: California has 21 Regional Centers (RCs) that serve as the primary service coordinators for people with developmental disabilities. Created by the Lanterman Act, RCs provide lifelong support — from birth through adulthood.\n\nWhat RC provides: A dedicated Service Coordinator (SC), comprehensive assessments, funded therapies (ABA, OT, speech, PT), respite care, diapers and supplies, assistive technology, behavioral support, camp programs, social skills groups, transition services, supported employment, independent living services, and more.\n\nWho qualifies: People with: autism, intellectual disability, cerebral palsy, epilepsy, or conditions requiring similar treatment. Disability must originate before age 18 and substantially impair 3+ major life areas. Early Start (ages 0-3) has a LOWER bar — delays or at-risk conditions qualify.\n\nCost: FREE. You can self-refer (no doctor referral needed). RC is \'payer of last resort\' — they bill insurance first, then pick up the rest.\n\nKey timelines: Intake within 15 working days of referral. Eligibility within 120 days. IPP within 60 days of eligibility.\n\nFind your RC: dds.ca.gov/rc or call DDS at 833-538-3723.',
    tip: 'RC is the most powerful connection you\'ll make. Your Service Coordinator is your long-term guide. Build that relationship. If your SC isn\'t responsive, request a new one (your right). RC fills the gaps between insurance, school, and Medi-Cal. Even if those other systems are providing services, RC likely offers things they don\'t: respite, diapers, camp, social skills groups, and more.',
  },
  'Medi-Cal': {
    key: 'Medi-Cal',
    title: 'What is Medi-Cal?',
    body: 'What it is: California\'s Medicaid program — free or low-cost health coverage for low-income individuals and families. For children with disabilities, Medi-Cal is a critical gateway to additional services.\n\nWhy it matters for your child:\n• EPSDT (Early and Periodic Screening, Diagnostic and Treatment): Federal Medicaid benefit for children under 21. Requires Medi-Cal to cover ALL medically necessary services — even if they\'re not in the standard benefit package. This is the most comprehensive pediatric health benefit in the country.\n• Unlocks IHSS: You must have Medi-Cal to qualify for IHSS (paid caregiving).\n• Secondary insurance: Medi-Cal covers what private insurance doesn\'t — copays, deductibles, services that were denied.\n• Institutional deeming: For RC clients, only the CHILD\'s income counts for eligibility — not the family\'s. Most children with developmental disabilities qualify regardless of family income.\n\nHow to apply: Online at BenefitsCal.com, by phone at 1-800-300-1506, at your county social services office, or through CoveredCA.com.\n\nRetroactive coverage: Medi-Cal can be backdated up to 3 months before your application. Keep all medical receipts.',
    tip: 'Apply even if you think you earn too much. Institutional deeming for RC clients means only your child\'s income counts. If Medi-Cal denies a service for your child, cite EPSDT — they must cover ALL medically necessary services for children under 21. Medi-Cal is retroactive 3 months — save all receipts.',
  },
  'CalABLE': {
    key: 'CalABLE',
    title: 'What is CalABLE?',
    body: 'What it is: A tax-advantaged savings account created under the federal ABLE Act, allowing individuals with disabilities to save money without losing SSI, Medi-Cal, or other means-tested benefits.\n\nKey features:\n• Save up to $100,000 without affecting SSI ($2,000 normal resource limit)\n• Annual contribution limit: $20,000/year (2026 limit, adjusted annually). Anyone can contribute.\n• Earnings grow tax-free (like a 529 plan)\n• Funds can be used for \'Qualified Disability Expenses\': education, housing, transportation, employment training, assistive technology, health/wellness, financial management, legal fees, oversight, and more\n\nEligibility: Disability onset before age 46 (raised from 26 by the ABLE Age Adjustment Act, effective Jan 1, 2026), AND either receiving SSI/SSDI or able to self-certify the disability meets SSA criteria.\n\nHow to open: Go to CalABLE.ca.gov. Account is in the beneficiary\'s name; a parent/guardian can be the authorized signer. Choose from savings or investment options.\n\nWhy it matters: Without CalABLE, any savings over $2,000 disqualifies your child from SSI and Medi-Cal. CalABLE lets you build a financial safety net.',
    tip: 'Open a CalABLE account as soon as SSI is approved. Tell grandparents, relatives, and friends — contributions make great gifts that don\'t jeopardize benefits. If your child ever earns money (even small amounts), deposit it into CalABLE to stay under the SSI resource limit.',
  },
  'DOR': {
    key: 'DOR',
    title: 'Department of Rehabilitation (DOR)',
    body: 'What it is: California\'s primary agency for vocational rehabilitation. DOR helps people with disabilities prepare for, find, and keep employment through training, education, and support services.\n\nServices offered: Career assessment and counseling, job training and internships, supported employment and job coaching, college/trade school tuition assistance, assistive technology for the workplace, resume building and interview skills, Transition Partnership Program (TPP) for students age 16+ in special education.\n\nEligibility: Must have a disability that creates a barrier to employment, AND must be able to benefit from DOR services to achieve employment. Most RC clients qualify.\n\nHow to apply: Find your local DOR office at dor.ca.gov/Home/OfficeLocator. Apply online, by phone, or in person.\n\nThe IPE: Once eligible, you and your DOR counselor create an Individualized Plan for Employment (IPE) — similar to an IEP but focused on employment goals.\n\nTimeline: Eligibility within 60 days of application. Waitlists for services can be 6-12 months.',
    tip: 'Apply at 15-16 — don\'t wait until graduation. Ask for \'Order of Selection Category 1\' (most significant disability) to be served first. DOR can pay for college — many families don\'t know this. Request that DOR attend IEP transition meetings.',
  },
  'Fair Hearing': {
    key: 'Fair Hearing',
    title: 'What is a Fair Hearing?',
    body: 'What it is: A formal administrative appeal where an independent Administrative Law Judge (ALJ) reviews your case. Available when you disagree with decisions from Regional Center, SSA, IHSS, or Medi-Cal.\n\nFor Regional Center (§4710.5): You have 60 days to request a Fair Hearing after receiving a written Notice of Action. The ALJ hearing must be held within 50 days. Decision within 80 days. Aid Paid Pending: If you file within 10 days of the notice, existing services CONTINUE while you appeal.\n\nFor SSI: Request \'reconsideration\' first, then hearing before an ALJ. File within 60 days of denial. Consider a disability attorney (contingency — no upfront cost).\n\nFor IHSS: Request a State Hearing within 90 days of your Notice of Action. You can request Aid Paid Pending to keep current hours during appeal.\n\nFree legal help: Disability Rights CA: 1-800-776-5746. They provide free advocacy and representation for people with disabilities in California.',
    tip: 'ALWAYS appeal a denial — approval rates improve significantly on appeal. For RC: file within 30 days to keep services during appeal (Aid Paid Pending). For SSI: never re-apply — always appeal the denial. Free legal help from Disability Rights CA: 1-800-776-5746.',
  },
  '4731 Complaint': {
    key: '4731 Complaint',
    title: 'Section 4731 Consumer Rights Complaint',
    body: 'What it is: A legal mechanism under W&I Code §4731 to report rights violations by your Regional Center, developmental center, or any Lanterman-funded service provider. Anyone — parent, guardian, advocate — can file on behalf of a consumer.\n\nWhen to file: SC not returning calls or emails. IPP not provided in your language. Not included in planning decisions. Discrimination or retaliation. Failure to provide required notices. Missing assessment or eligibility timelines. Not informed of your rights.\n\nTimeline:\n• RC director must investigate within 20 working days and send written resolution\n• If unsatisfied, appeal to DDS within 15 working days\n• DDS issues final decision within 45 days\n\nHow to file:\n1. Complete Form DS 255 (English/Spanish) or write a signed, dated letter\n2. Include: consumer name, specific rights violated, dates, names, what happened, what you want fixed\n3. Send to your RC director\n4. Keep copies of everything\n\nWhat DDS can order: Acknowledgment of violation, staff retraining, policy changes, corrective action plans, prevention measures.\n\nImportant: 4731 is for rights violations. For service amount disputes, use Fair Hearing (§4710.5). You can file both simultaneously.\n\nContact DDS Appeals: 833-538-3723 · Appeals@dds.ca.gov\n1215 O Street, MS 8-20, Sacramento CA 95814',
    tip: 'Document everything: dates, names, what was said. Send complaint by certified mail. Be specific about which right was violated and what resolution you want. Attach copies of emails and letters.',
  },
  'Lanterman Act': {
    key: 'Lanterman Act',
    title: 'The Lanterman Act — Your Rights',
    body: 'What it is: The Lanterman Developmental Disabilities Services Act (W&I Code §4500+) is California\'s foundational disability law — the strongest in the nation. It creates an entitlement to services, meaning they are NOT budget-dependent.\n\nWho qualifies: Autism, intellectual disability, cerebral palsy, epilepsy, and conditions requiring similar treatment. Disability must originate before age 18, continue indefinitely, and substantially impair 3+ major life areas.\n\nCore rights (§4502): Same legal rights as all Californians. Right to services based on need, least restrictive setting, choice and autonomy, information in your language, appeal any decision, and file complaints.\n\nKey timelines:\n• §4642 — Intake: Assessment within 120 days of referral\n• §4643 — Eligibility: Decision within 120 days, written notice required\n• §4646 — IPP: Within 60 days of eligibility. You can request a meeting anytime (must be held within 30 days). Emergency IPP within 7 days\n• §4648 — Services: Must be delivered as authorized in IPP. RC monitors quality\n• §4710.5 — Appeals: 60 days to appeal. ALJ decision within 80 days. Aid Paid Pending = keep services while appealing\n• §4731 — Complaints: File for rights violations. 20-day RC investigation\n\nThe entitlement principle: Unlike most states, once you\'re Lanterman-eligible, RC MUST purchase services to meet your assessed needs. Budget shortfalls cannot override your entitlement. No waiting lists for eligible consumers.\n\nPOS disparities: Data shows White families receive roughly 2x the Purchase of Service spending compared to Latino families. Know what\'s available and request it specifically — the system won\'t always offer it proactively.\n\nKey sections to cite: §4502 (equal rights), §4512 (definitions/rights), §4620 (RC responsibilities), §4642 (intake), §4643 (eligibility), §4646 (IPP), §4648 (services), §4710.5 (appeals), §4731 (complaints)',
    tip: 'The Lanterman Act is your most powerful tool. When RC says \'we don\'t have budget\' or \'there\'s a waitlist,\' cite the entitlement principle. Services are based on NEED, not budget. Free legal help: Disability Rights CA 1-800-776-5746.',
  },
  'CDE Complaint': {
    key: 'CDE Complaint',
    title: 'CA Dept of Education Compliance Complaint',
    body: 'What it is: A formal complaint to the California Department of Education (CDE) when your school district violates federal IDEA or state special education law. CDE is required to investigate and issue findings within 60 days.\n\nWhen to file: School missed evaluation timelines (15 days for assessment plan, 60 days for evaluation). IEP not being implemented. Services listed in IEP not being provided. School refused to evaluate your child. Procedural violations (no parent notice, no translation, improper meeting).\n\nHow to file: Download the Uniform Complaint Procedures (UCP) form from your district\'s website, or write a letter to CDE directly. Include: your child\'s name, school, specific violations, dates, what you want fixed.\n\nWhere to send: CDE Special Education Division, 1430 N Street, Sacramento, CA 95814. Phone: (916) 319-0800.\n\nTimeline: CDE must investigate and issue a report within 60 days. If violations are found, CDE orders corrective action (compensatory services, policy changes, staff training).\n\nImportant: Filing a complaint does NOT require an attorney. It\'s FREE. Schools take CDE complaints seriously because CDE has enforcement power.',
    tip: 'CDE complaints are more effective than most parents realize. Schools know CDE can order corrective action and monitor compliance. Be specific about which law was violated and include dates. You can file a CDE complaint AND request due process simultaneously — they serve different purposes.',
  },
  'IMR': {
    key: 'IMR',
    title: 'Independent Medical Review (IMR)',
    body: 'What it is: When your health insurance denies a service or treatment and you\'ve exhausted the internal appeals process, you can request an Independent Medical Review. An outside panel of doctors reviews your case and makes a BINDING decision that the insurance company MUST follow.\n\nFor HMOs: File with the Department of Managed Health Care (DMHC) at 1-888-466-2219 or dmhc.ca.gov.\n\nFor PPOs: File with the California Department of Insurance (CDI) at 1-800-927-4357 or insurance.ca.gov.\n\nSuccess rate: DMHC overturns approximately 60% of insurance denials through IMR. Always pursue this option.\n\nTimeline: Standard IMR: decision within 45 days. Urgent/expedited IMR: decision within 72 hours (for situations where delay would seriously jeopardize health).\n\nCost: FREE to the patient.\n\nHow to file: After receiving your insurance company\'s final internal appeal denial, contact DMHC or CDI. They\'ll send you an IMR application. Submit with all supporting medical documentation.',
    tip: 'DMHC overturns ~60% of denials — always pursue IMR. Request expedited (72-hour) review if your child\'s condition could worsen without treatment. The IMR decision is legally binding — the insurance company cannot refuse. Keep every denial letter and appeal response as documentation.',
  },
  'EPSDT': {
    key: 'EPSDT',
    title: 'Early and Periodic Screening, Diagnostic and Treatment (EPSDT)',
    body: 'What it is: A federal Medicaid benefit for children and young adults under age 21. EPSDT is the most comprehensive pediatric health benefit in the United States. Under EPSDT, Medi-Cal MUST cover ALL medically necessary services for your child — even services that aren\'t in the standard adult Medi-Cal benefit package.\n\nWhat\'s covered: Virtually everything that is medically necessary: therapy (OT, speech, PT, ABA), mental health services, dental, vision, hearing, medical equipment, home health, personal care, and more. If a licensed provider says it\'s medically necessary, Medi-Cal must cover it.\n\nKey principle: The standard is \'medical necessity,\' not \'what\'s in the benefit list.\' If Medi-Cal covers a service for adults but says it doesn\'t cover it for kids, EPSDT overrides that — kids get broader coverage.\n\nHow to use it: When Medi-Cal denies a service for your child, cite EPSDT (42 U.S.C. §1396d(r)). Request the denial in writing and appeal, stating that the service is medically necessary under EPSDT.\n\nScreening: EPSDT also requires regular developmental screenings at well-child visits. If your pediatrician isn\'t screening, request it.',
    tip: 'EPSDT is your trump card with Medi-Cal. If they deny ANY service for your child under 21, cite EPSDT and request a fair hearing. The legal standard is simply \'medically necessary to correct or ameliorate a condition\' — that\'s a very broad standard. Get a letter from your child\'s doctor stating medical necessity and reference 42 U.S.C. §1396d(r).',
  },
  'SB 946': {
    key: 'SB 946',
    title: 'SB 946 — Insurance Coverage for Autism',
    body: 'What it is: California Senate Bill 946 (codified as Health & Safety Code §1374.73 and Insurance Code §10144.51) requires health insurance plans to cover behavioral health treatment (BHT), including Applied Behavior Analysis (ABA), for individuals diagnosed with autism spectrum disorder.\n\nKey provisions:\n• No annual or lifetime dollar caps on BHT/ABA coverage\n• Coverage cannot be denied solely because treatment is \'educational\' or \'habilitative\' rather than \'medical\'\n• Applies to all state-regulated health plans (HMOs and PPOs)\n• Includes diagnosis of ASD by a qualified professional\n• Covers treatment prescribed by a licensed physician or psychologist\n\nWhat\'s covered: ABA therapy, behavioral intervention, social skills training, assessment and treatment planning by Board Certified Behavior Analysts (BCBAs), and behavioral health treatment by qualified providers.\n\nIf insurance denies ABA:\n1. Request the denial IN WRITING with the specific reason\n2. File an internal appeal citing SB 946 (H&S Code §1374.73)\n3. If denied again, file for Independent Medical Review (IMR) with DMHC\n4. DMHC overturns ~60% of ABA denials\n\nImportant: SB 946 does not apply to self-funded employer plans (ERISA plans). Ask your HR department if your plan is \'state-regulated\' or \'self-funded.\' If self-funded, federal Mental Health Parity Act may still apply.',
    tip: 'If insurance denies ABA, cite SB 946 (Health & Safety Code §1374.73) specifically in your appeal. Many insurance reps don\'t know about this law. Ask for the \'Behavioral Health\' or \'Autism Services\' department — general member services often gives incorrect information. If your employer has a self-funded plan (not covered by SB 946), cite the federal Mental Health Parity and Addiction Equity Act instead.',
  },
};
