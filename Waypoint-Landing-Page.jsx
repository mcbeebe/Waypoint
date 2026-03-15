import { useState, useEffect, useRef } from "react";

const NAVY = "#1B2A4A";
const TEAL = "#0891B2";
const SAGE = "#10B981";
const CORAL = "#F97316";
const DARK = "#334155";
const MID = "#64748B";
const LIGHT = "#F8FAFC";
const VIOLET = "#7C3AED";
const ROSE = "#E11D48";
const SKY = "#0EA5E9";
const AMBER = "#D97706";

// ============ ELIGIBILITY DATA ============
const PROGRAMS = {
  "Autism": [
    { name: "Regional Center", status: "Likely Eligible", desc: "Lifelong services, therapies, respite care, and case management through the Lanterman Act" },
    { name: "IEP (Special Education)", status: "Likely Eligible", desc: "Free Appropriate Public Education with individualized goals and services" },
    { name: "SSI", status: "Check Income", desc: "Monthly cash benefit up to $943/mo for children with disabilities in low-income families" },
    { name: "IHSS", status: "Likely Eligible", desc: "In-Home Supportive Services — paid caregiving hours for daily living assistance" },
    { name: "Medi-Cal", status: "Likely Eligible", desc: "Full-scope health coverage including ABA therapy, speech, OT, and behavioral health" },
    { name: "CCS", status: "Conditional", desc: "California Children's Services for medical therapy and specialized care" },
    { name: "CalABLE Account", status: "Eligible", desc: "Tax-advantaged savings up to $100K without affecting SSI eligibility" },
    { name: "Self-Determination Program", status: "Eligible", desc: "Direct control over Regional Center budget for personalized services" },
    { name: "Insurance ABA Coverage", status: "Mandated", desc: "CA law requires commercial insurers to cover ABA therapy with no age limit" },
    { name: "Respite Care", status: "Likely Eligible", desc: "Short-term relief for caregivers through Regional Center or IHSS" },
    { name: "Medical Expense Deduction", status: "Eligible", desc: "IRS deduction for expenses exceeding 7.5% of AGI" },
    { name: "DOR Vocational Rehab", status: "Age 16+", desc: "Job training, placement, and support for transition-age youth" },
    { name: "Family Cost Participation", status: "May Apply", desc: "RC cost-sharing program — exemptions available for many families" },
    { name: "Section 504 Plan", status: "Eligible", desc: "Civil rights protections and accommodations in school settings" },
  ],
  "ADHD": [
    { name: "IEP or 504 Plan", status: "Likely Eligible", desc: "Educational accommodations and support services" },
    { name: "Regional Center", status: "Conditional", desc: "Only eligible with co-occurring diagnosis (e.g., intellectual disability)" },
    { name: "SSI", status: "Check Severity", desc: "Available if ADHD causes marked and severe functional limitations" },
    { name: "Medi-Cal", status: "Likely Eligible", desc: "Coverage for medication management and behavioral therapy" },
    { name: "Insurance Behavioral Health", status: "Mandated", desc: "Mental health parity laws require coverage" },
    { name: "Medical Expense Deduction", status: "Eligible", desc: "Therapy, medication, and evaluation costs may qualify" },
  ],
  "Intellectual Disability": [
    { name: "Regional Center", status: "Likely Eligible", desc: "Full range of lifelong services under Lanterman Act" },
    { name: "IEP", status: "Likely Eligible", desc: "Modified curriculum, specialized instruction, and related services" },
    { name: "SSI", status: "Likely Eligible", desc: "Strong eligibility for monthly cash benefits" },
    { name: "IHSS", status: "Likely Eligible", desc: "Paid caregiving hours for daily living support" },
    { name: "Medi-Cal", status: "Likely Eligible", desc: "Full-scope coverage including day programs and habilitation" },
    { name: "CalABLE", status: "Eligible", desc: "Tax-advantaged savings without affecting benefits" },
    { name: "Conservatorship / SDM", status: "At Age 18", desc: "Legal decision-making options at adulthood" },
    { name: "DOR", status: "Age 16+", desc: "Vocational rehabilitation and supported employment" },
  ],
  "Down Syndrome": [
    { name: "Regional Center", status: "Likely Eligible", desc: "Early Start services from birth, lifelong support" },
    { name: "IEP", status: "Likely Eligible", desc: "Inclusive education with speech, OT, and adaptive PE" },
    { name: "SSI", status: "Likely Eligible", desc: "Strong eligibility based on functional limitations" },
    { name: "CCS", status: "Likely Eligible", desc: "Cardiac care and physical therapy through CCS-paneled providers" },
    { name: "IHSS", status: "Likely Eligible", desc: "In-home support for daily living activities" },
    { name: "Medi-Cal", status: "Likely Eligible", desc: "Full coverage including specialist care" },
    { name: "CalABLE", status: "Eligible", desc: "Savings vehicle for long-term financial planning" },
  ],
};

// ============ JOURNEY MAP DATA ============
const JOURNEYS = {
  "Autism": { icon: "🧩", color: VIOLET,
    phases: [
      { age: "0–3", label: "Early Intervention", color: VIOLET, icon: "👶", bg: "#F5F3FF",
        description: "This is often the hardest moment — the one where everything shifts. Take a breath. You are not behind. The fact that you're seeking answers means you're already advocating for your child. Early intervention is the single most impactful thing you can do, and California has strong programs designed to help right now.",
        entities: [
          { name: "Pediatrician", action: "Referral for evaluation", time: "Immediate" },
          { name: "Regional Center", action: "Early Start → IFSP", time: "45 days" },
          { name: "Insurance", action: "ABA authorization (CA mandate)", time: "30 days" },
        ],
        milestone: "IFSP in place, therapies started", alert: "RC intake within 45 days of referral" },
      { age: "3–5", label: "School Transition", color: TEAL, icon: "🎒", bg: "#F0FDFA",
        description: "At age 3, responsibility shifts to the school district. Your child has a legal right to a Free Appropriate Public Education, and you have a seat at the IEP table as an equal member. Your voice matters more than anyone else's in that room.",
        entities: [
          { name: "School District", action: "Assessment → first IEP", time: "90 days" },
          { name: "Regional Center", action: "Lanterman eligibility", time: "120 days" },
          { name: "IHSS / SSI", action: "Apply for support + income", time: "30–180 days" },
        ],
        milestone: "IEP active, RC confirmed, IHSS set", alert: "Start transition 6 months before 3rd birthday" },
      { age: "5–13", label: "School Years", color: SKY, icon: "📚", bg: "#F0F9FF",
        description: "You've made it through the early chaos. The parent who sat in that first IEP meeting terrified? That parent is now the expert on their child. This is the stage to focus on stability, financial planning, and making sure services keep pace with growth.",
        entities: [
          { name: "School District", action: "Annual IEP + triennial reassessment", time: "Yearly / 3 yr" },
          { name: "Insurance", action: "Therapy re-authorizations", time: "Every 3–12 mo" },
          { name: "CalABLE", action: "Tax-advantaged savings", time: "Any time" },
        ],
        milestone: "Stable services, financial planning started", alert: "Request IEE if you disagree with school assessment" },
      { age: "14–17", label: "Transition Planning", color: AMBER, icon: "🎓", bg: "#FFFBEB",
        description: "What does a good life look like for your child after school? By law, transition goals must be in the IEP by age 16. You're building a bridge to adulthood — and you don't have to build it alone.",
        entities: [
          { name: "School District", action: "Transition IEP", time: "By age 16" },
          { name: "DOR", action: "Vocational rehab referral", time: "Apply at 16" },
          { name: "Conservatorship", action: "Research options vs. SDM", time: "Before 18" },
        ],
        milestone: "Transition plan active, legal planning started", alert: "Start conservatorship 6–12 months before 18" },
      { age: "18+", label: "Adulthood", color: CORAL, icon: "🏠", bg: "#FFF7ED",
        description: "You've been doing this for almost two decades. You are your child's greatest advocate, and that doesn't change with a birthday. Every step you've taken has built a foundation that supports your child for life. You did this.",
        entities: [
          { name: "Regional Center", action: "Adult services — lifelong", time: "Lifelong" },
          { name: "SSI / Medi-Cal", action: "Income + healthcare", time: "Lifelong" },
          { name: "Self-Determination", action: "Direct budget control", time: "If enrolled" },
        ],
        milestone: "Adult support system in place", alert: "CalABLE & SNT protect savings from SSI limits" },
    ],
  },
  "Down Syndrome": { icon: "💛", color: AMBER,
    phases: [
      { age: "0–3", label: "Early Days", color: VIOLET, icon: "👶", bg: "#F5F3FF",
        description: "Your baby is here, and they are perfect and yours. A Down syndrome diagnosis often comes at birth, and it can hit you in ways you didn't expect. There is an entire community of families who have walked this path before you, and the support systems in California are among the strongest in the country.",
        entities: [
          { name: "Hospital", action: "Cardiac screening, genetic confirmation", time: "At birth" },
          { name: "Regional Center", action: "Early Start (established risk)", time: "45 days" },
          { name: "CCS", action: "Cardiac and specialty care", time: "30 days" },
        ],
        milestone: "Therapies in place, cardiac care established", alert: "CCS referral critical if cardiac conditions present" },
      { age: "3–13", label: "School Years", color: SKY, icon: "📚", bg: "#F0F9FF",
        description: "Children with Down syndrome thrive when they're included, challenged, and supported. Push for meaningful goals, not just compliance. Don't let anyone tell you your child 'can't' be in a general education classroom without the IEP team considering it first. You are the constant in your child's life.",
        entities: [
          { name: "School District", action: "IEP with inclusion goals", time: "Annual" },
          { name: "CCS / Specialists", action: "Cardiac, thyroid, vision monitoring", time: "Annually" },
          { name: "IHSS / SSI", action: "In-home support + income", time: "Ongoing" },
        ],
        milestone: "Inclusive education, stable medical care", alert: "Annual thyroid, cardiac, vision, hearing checks essential" },
      { age: "14+", label: "Transition & Adult Life", color: AMBER, icon: "🎓", bg: "#FFFBEB",
        description: "Many adults with Down syndrome work, live semi-independently, and have rich social lives. The foundation you lay now — vocational training, financial planning, legal protections — determines how much independence and security your child will have. You should be proud of every step that brought you here.",
        entities: [
          { name: "DOR", action: "Supported employment", time: "Apply at 16" },
          { name: "Regional Center", action: "Adult services — lifelong", time: "Lifelong" },
          { name: "SNT / CalABLE", action: "Financial protection", time: "Start now" },
        ],
        milestone: "Meaningful adult life with community and support", alert: "Explore Supported Decision-Making before conservatorship" },
    ],
  },
  "Cerebral Palsy": { icon: "💪", color: TEAL,
    phases: [
      { age: "0–3", label: "Early Intervention", color: VIOLET, icon: "👶", bg: "#F5F3FF",
        description: "A CP diagnosis often comes after a frightening start — a difficult birth, a NICU stay, or months of watching your baby miss milestones. The guilt and grief you may feel are real, and they're normal. But your child is resilient, and so are you. CCS provides specialized medical therapy. Regional Center provides developmental services. You don't need to coordinate all of this alone.",
        entities: [
          { name: "Neurologist", action: "Diagnosis, imaging, referrals", time: "Immediate" },
          { name: "CCS", action: "Medical Therapy Program — PT, OT", time: "30 days" },
          { name: "Regional Center", action: "Early Start → IFSP", time: "45 days" },
          { name: "Insurance", action: "DME — wheelchair, stander, orthotics", time: "Prior auth" },
        ],
        milestone: "Therapies in place, DME ordered, medical team set", alert: "CCS Medical Therapy Program is free regardless of income" },
      { age: "3–13", label: "School Years", color: SKY, icon: "📚", bg: "#F0F9FF",
        description: "Your child's school needs to be physically accessible. Adaptive equipment in the classroom. Aides trained on transfers. Growth spurts mean new orthotics, new wheelchair fittings. But your child is also growing in ways that matter more — building friendships, discovering interests. Focus on the whole child, not just the medical chart. You are more than a case manager. You are a parent.",
        entities: [
          { name: "School District", action: "IEP with accessibility, adaptive PE", time: "Annual" },
          { name: "CCS MTP", action: "School-based PT and OT", time: "Ongoing" },
          { name: "IHSS", action: "High hours — bathing, feeding, mobility", time: "Yearly" },
          { name: "Insurance", action: "DME reauthorizations as child grows", time: "Ongoing" },
        ],
        milestone: "Accessible education, equipment current", alert: "DME must be updated as child grows — don't wait for it to break" },
      { age: "14+", label: "Transition & Adult Life", color: AMBER, icon: "🎓", bg: "#FFFBEB",
        description: "Transition is about independence, mobility, communication, and living situation. Assistive technology is often a game-changer — communication devices, powered mobility, smart home adaptations. Many adults with CP live rich, full, connected lives with the right supports. The infrastructure you've built carries forward. This is the life you've been building toward.",
        entities: [
          { name: "DOR", action: "Assistive tech, vocational rehab", time: "Apply at 16" },
          { name: "IHSS", action: "Daily personal care — often high hours", time: "Lifelong" },
          { name: "Regional Center", action: "SLS/ILS, day programs", time: "Lifelong" },
        ],
        milestone: "Supported living established, medical care continuous", alert: "CCS ends at 21 — ensure Medi-Cal covers adult specialists" },
    ],
  },
  "ADHD": { icon: "⚡", color: SKY,
    phases: [
      { age: "0–5", label: "Early Recognition", color: VIOLET, icon: "👶", bg: "#F5F3FF",
        description: "ADHD is often first noticed when a child enters a structured environment and the behaviors that seemed like 'just being a kid' start standing out. Trust your instincts. A developmental pediatrician can evaluate and help you understand what's happening. You are the first person who noticed. That matters.",
        entities: [
          { name: "Pediatrician", action: "Screening, referral to specialist", time: "Immediate" },
          { name: "Dev. Pediatrician", action: "Comprehensive evaluation", time: "3–12 mo wait" },
          { name: "Insurance", action: "Behavioral therapy coverage", time: "Prior auth" },
        ],
        milestone: "Formal evaluation complete, strategies in place", alert: "Specialist waitlists 3–12 months — get on the list early" },
      { age: "5–13", label: "School Support", color: SKY, icon: "📚", bg: "#F0F9FF",
        description: "Don't let anyone tell you ADHD isn't a 'real disability' or doesn't qualify for support. The law is clear. If your child's ADHD is affecting their education, the school has an obligation to help — through a 504 Plan or an IEP under 'Other Health Impairment.'",
        entities: [
          { name: "School District", action: "Request evaluation → IEP or 504", time: "60 days" },
          { name: "Insurance", action: "Medication management, therapy", time: "Ongoing" },
          { name: "SSI", action: "May qualify if severe limitations", time: "3–6 months" },
        ],
        milestone: "504 or IEP in place, treatment plan established", alert: "Put evaluation request IN WRITING — starts the legal clock" },
      { age: "14+", label: "Transition & Self-Advocacy", color: AMBER, icon: "🎓", bg: "#FFFBEB",
        description: "You're shifting from doing it for them to coaching them to do it themselves. Can your teen explain their diagnosis? Request accommodations? Manage their own medication? These skills are more valuable than any grade. The understanding that their brain works differently and it's not a character flaw — that's a gift that lasts a lifetime.",
        entities: [
          { name: "School District", action: "Transition IEP with self-advocacy goals", time: "By age 16" },
          { name: "College Services", action: "Research accommodations process", time: "Junior year" },
          { name: "DOR", action: "Vocational support if needed", time: "Apply at 16" },
        ],
        milestone: "Self-advocacy skills, post-secondary plan in place", alert: "College requires self-identification — practice now" },
    ],
  },
  "Intellectual Disability": { icon: "🌱", color: SAGE,
    phases: [
      { age: "0–3", label: "Early Intervention", color: VIOLET, icon: "👶", bg: "#F5F3FF",
        description: "'Delay' doesn't define your child's potential — it describes where they are right now, and early intervention is designed to close that gap as much as possible. Your child qualifies for Regional Center services, which means a service coordinator, a plan, and therapies delivered in your home. You are not expected to be a therapist. You are expected to be a parent.",
        entities: [
          { name: "Regional Center", action: "Early Start → IFSP with full services", time: "45 days" },
          { name: "Pediatrician", action: "Developmental screening", time: "Immediate" },
          { name: "Medi-Cal", action: "Full healthcare coverage", time: "45 days" },
        ],
        milestone: "IFSP active, developmental therapies in progress", alert: "RC determination for ID is straightforward — don't delay" },
      { age: "3–13", label: "School Years", color: SKY, icon: "📚", bg: "#F0F9FF",
        description: "Your child is learning — maybe not at the same pace as peers, but they are learning. Celebrate the progress, even when it feels small. Focus on functional life skills alongside academics. And don't forget about yourself. Caregiver burnout is real, and respite care exists for a reason. Asking for help is not a failure — it's good parenting.",
        entities: [
          { name: "School District", action: "IEP with functional life skills focus", time: "Annual" },
          { name: "Regional Center", action: "Respite, social skills, camps", time: "Annual IPP" },
          { name: "IHSS / SSI", action: "Support and income", time: "Ongoing" },
        ],
        milestone: "Consistent progress, family supported", alert: "Request respite care through RC — your wellbeing matters" },
      { age: "14+", label: "Transition & Adult Life", color: AMBER, icon: "🎓", bg: "#FFFBEB",
        description: "What does a good adult life look like for your child? There is no wrong answer — only the one that fits. You have navigated one of the most complex systems in the country for your child's entire life. You've earned every good thing that comes from it.",
        entities: [
          { name: "DOR", action: "Supported employment", time: "Apply at 16" },
          { name: "Regional Center", action: "Day programs, SLS, community", time: "Lifelong" },
          { name: "Self-Determination", action: "Person-centered budget control", time: "If enrolled" },
        ],
        milestone: "Meaningful adult life with community and support", alert: "Limited conservatorship most common — start before 18" },
    ],
  },
  "Epilepsy": { icon: "🧠", color: ROSE,
    phases: [
      { age: "0–5", label: "Diagnosis & Stabilization", color: VIOLET, icon: "👶", bg: "#F5F3FF",
        description: "Watching your child have a seizure is one of the most terrifying experiences a parent can have. Nothing prepares you for it. But you are doing the right things by seeking answers. Epilepsy qualifies for Regional Center services, and CCS provides neurological care through paneled specialists. You don't have to have all the answers. You just need to take the next step.",
        entities: [
          { name: "Neurologist", action: "EEG, diagnosis, medication", time: "Immediate" },
          { name: "CCS", action: "Neurological specialty care", time: "30 days" },
          { name: "Regional Center", action: "Early Start if developmental delays", time: "45 days" },
        ],
        milestone: "Seizures managed, supports in place", alert: "CCS covers neurology regardless of income" },
      { age: "5–13", label: "School & Safety", color: SKY, icon: "📚", bg: "#F0F9FF",
        description: "Your child needs a seizure action plan at school. Staff need to be trained. Rescue medication available. The cognitive effects of seizures and medications may need IEP or 504 accommodations. With the right plans in place, your child can thrive at school.",
        entities: [
          { name: "School District", action: "IEP or 504 — seizure plan, accommodations", time: "60 days" },
          { name: "IHSS", action: "Protective supervision if uncontrolled", time: "30–60 days" },
          { name: "SSI", action: "Eligible if substantial limitations", time: "3–6 months" },
        ],
        milestone: "Safe school environment, effective management", alert: "Seizure action plan must be updated after any med changes" },
      { age: "14+", label: "Transition & Adult Life", color: AMBER, icon: "🎓", bg: "#FFFBEB",
        description: "Driving restrictions, employment considerations, and transferring from pediatric to adult neurology. If seizures are well-controlled, many adults live fully independent lives. If not, IHSS, Regional Center, and SSI provide a safety net. Your child deserves a plan built around possibilities, not limitations.",
        entities: [
          { name: "Adult Neurology", action: "Transfer from pediatric provider", time: "Age 18" },
          { name: "DOR", action: "Vocational rehab with accommodations", time: "Apply at 16" },
          { name: "DMV", action: "Seizure-free driving requirements", time: "Varies" },
        ],
        milestone: "Adult medical care, employment or support in place", alert: "CA requires 3–6 month seizure-free period to drive" },
    ],
  },
  "Multiple Disabilities": { icon: "🌈", color: VIOLET,
    phases: [
      { age: "0–3", label: "Early Intervention", color: VIOLET, icon: "👶", bg: "#F5F3FF",
        description: "When your child has more than one diagnosis, the early days can feel like an avalanche. It's easy to feel like you're failing because you can't keep up. You're not failing. You're parenting a child with complex needs in a system that wasn't designed to be this complicated. Multiple diagnoses mean stronger eligibility across the board. Let your RC service coordinator help. That's literally their job.",
        entities: [
          { name: "Medical Team", action: "Multi-specialty coordination", time: "Immediate" },
          { name: "Regional Center", action: "Comprehensive IFSP", time: "45 days" },
          { name: "CCS", action: "Medical specialty care", time: "30 days" },
        ],
        milestone: "All diagnoses addressed, comprehensive plan in place", alert: "Ask RC for a coordinator experienced with complex cases" },
      { age: "3–13", label: "School Years", color: SKY, icon: "📚", bg: "#F0F9FF",
        description: "Don't settle for an IEP that addresses one diagnosis but ignores the others. The school must address all of your child's needs. You are the only person who sees the whole picture. That makes you the most important person on every team your child has. Use that power. Speak up. Document everything.",
        entities: [
          { name: "School District", action: "IEP — Multiple Disabilities, all goals", time: "Annual" },
          { name: "Regional Center", action: "Full service package", time: "Annual IPP" },
          { name: "IHSS / SSI", action: "High hours + income support", time: "Ongoing" },
        ],
        milestone: "Comprehensive IEP, all systems active", alert: "Email follow-ups create the paper trail you'll need" },
      { age: "14+", label: "Transition & Adult Life", color: AMBER, icon: "🎓", bg: "#FFFBEB",
        description: "The most complex transition, but you've done harder things than this. You've navigated this system for your child's entire life. This is the final major transition, and you have everything you need. The life ahead can be a good one. You've made sure of that.",
        entities: [
          { name: "School District", action: "Comprehensive transition IEP", time: "By age 16" },
          { name: "Regional Center", action: "Complex adult service coordination", time: "Lifelong" },
          { name: "Conservatorship / SNT", action: "Legal and financial protection", time: "Before 18" },
        ],
        milestone: "All adult systems in place", alert: "Start transition planning at 14 — complex cases need extra time" },
    ],
  },
};

// ============ FEATURES + STATS ============
const FEATURES = [
  { icon: "🤖", title: "AI Navigator", desc: "Ask anything about your child's services. Get personalized, legally-cited guidance 24/7.", badge: "Coming Soon" },
  { icon: "✅", title: "Benefits Checker", desc: "See every program your child qualifies for — many you didn't know existed.", badge: "Preview Live" },
  { icon: "📝", title: "IEP Prep & Redlining", desc: "AI reviews your child's IEP, suggests goals, and drafts parent concerns.", badge: "Coming Soon" },
  { icon: "💰", title: "Expense Tracker", desc: "Track every disability-related cost. Surface tax deductions. Monitor reimbursements.", badge: "Coming Soon" },
  { icon: "📁", title: "Document Vault", desc: "Store IEPs, evaluations, insurance letters, and appeals in one secure place.", badge: "Coming Soon" },
  { icon: "📬", title: "Reimbursement Engine", desc: "AI drafts Regional Center reimbursement requests and tracks status.", badge: "Coming Soon" },
];
const STATS = [
  { num: "23", label: "Agencies Mapped", sub: "Every entity a family touches" },
  { num: "13", label: "Diagnoses Covered", sub: "From autism to TBI" },
  { num: "6", label: "Age Bands", sub: "Birth through adulthood" },
  { num: "500+", label: "Hours of Research", sub: "Law, policy, and lived experience" },
];

// ============ HELPERS ============
function AnimatedCounter({ target, suffix = "" }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!vis) return;
    const num = parseInt(target);
    if (isNaN(num)) { setCount(target); return; }
    let i = 0;
    const step = Math.max(1, Math.floor(num / 30));
    const timer = setInterval(() => { i += step; if (i >= num) { setCount(num); clearInterval(timer); } else setCount(i); }, 40);
    return () => clearInterval(timer);
  }, [vis, target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

function TypeWriter({ text, speed = 40 }) {
  const [shown, setShown] = useState(0);
  const [vis, setVis] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!vis || shown >= text.length) return;
    const t = setTimeout(() => setShown(s => s + 1), speed);
    return () => clearTimeout(t);
  }, [vis, shown, text, speed]);
  return <span ref={ref}>{text.slice(0, shown)}<span style={{ opacity: shown < text.length ? 1 : 0 }}>|</span></span>;
}

// ============ MAIN COMPONENT ============
export default function WaypointLanding() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [selectedDx, setSelectedDx] = useState("");
  const [emailForTool, setEmailForTool] = useState("");
  const [toolUnlocked, setToolUnlocked] = useState(false);
  const [journeyDx, setJourneyDx] = useState("Autism");
  const [journeyPhase, setJourneyPhase] = useState(0);

  const programs = PROGRAMS[selectedDx] || [];
  const visiblePrograms = toolUnlocked ? programs : programs.slice(0, 3);
  const journey = JOURNEYS[journeyDx];

  const statusColor = (s) => {
    if (s.includes("Likely") || s === "Mandated" || s === "Eligible") return SAGE;
    if (s.includes("Check") || s === "Conditional" || s.includes("May")) return CORAL;
    return TEAL;
  };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", color: DARK, background: "#fff", overflowX: "hidden" }}>

      {/* ======== NAV ======== */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(27,42,74,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${TEAL}, ${SAGE})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>◎</div>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>WAYPOINT</span>
          </div>
          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            {["Eligibility Tool", "Journey Maps", "Features"].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`} style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>{l}</a>
            ))}
            <a href="#waitlist" style={{ background: TEAL, color: "#fff", padding: "8px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>Join Waitlist</a>
          </div>
        </div>
      </nav>

      {/* ======== HERO ======== */}
      <section style={{ background: `linear-gradient(165deg, ${NAVY} 0%, #0F2847 40%, #0C3654 70%, ${TEAL} 100%)`, paddingTop: 120, paddingBottom: 100, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "radial-gradient(ellipse at 70% 20%, rgba(8,145,178,0.15) 0%, transparent 60%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", position: "relative" }}>
          <div style={{ maxWidth: 720 }}>
            <div style={{ display: "inline-block", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 20, padding: "6px 16px", marginBottom: 24 }}>
              <span style={{ color: SAGE, fontSize: 13, fontWeight: 600 }}>🧭 Now mapping California disability services</span>
            </div>
            <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 54, fontWeight: 400, color: "#fff", lineHeight: 1.1, marginBottom: 20, letterSpacing: -1 }}>
              <TypeWriter text="Your child was just diagnosed. You have questions." speed={35} />
            </h1>
            <p style={{ fontSize: 24, color: TEAL, fontWeight: 600, marginBottom: 12, fontFamily: "'DM Serif Display', Georgia, serif" }}>We have a roadmap.</p>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, marginBottom: 36, maxWidth: 560 }}>
              Waypoint is the AI-powered platform that helps families navigate disability services — from diagnosis to adulthood. Every benefit. Every deadline. Every right. Mapped.
            </p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <a href="#eligibility-tool" style={{ background: TEAL, color: "#fff", padding: "14px 28px", borderRadius: 10, fontSize: 16, fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 20px rgba(8,145,178,0.4)" }}>See What You're Eligible For →</a>
              <a href="#waitlist" style={{ background: "rgba(255,255,255,0.08)", color: "#fff", padding: "14px 28px", borderRadius: 10, fontSize: 16, fontWeight: 600, textDecoration: "none", border: "1px solid rgba(255,255,255,0.15)" }}>Join the Waitlist</a>
            </div>
          </div>
        </div>
      </section>

      {/* ======== PROBLEM ======== */}
      <section style={{ background: LIGHT, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: TEAL, fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>The Problem</p>
          <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 40, color: NAVY, marginBottom: 48, lineHeight: 1.2 }}>Navigating disability services shouldn't require a law degree</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            {[{ n: "23", s: "", l: "Government agencies" }, { n: "47", s: "+", l: "Forms & applications" }, { n: "15", s: "–25", l: "Entities per family" }, { n: "1", s: "", l: "Overwhelmed parent" }].map((s, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 48, fontWeight: 800, color: i === 3 ? CORAL : TEAL, fontFamily: "'DM Serif Display', Georgia, serif" }}><AnimatedCounter target={s.n} suffix={s.s} /></div>
                <p style={{ color: MID, fontSize: 15, marginTop: 8 }}>{s.l}</p>
              </div>
            ))}
          </div>
          <p style={{ color: MID, fontSize: 16, lineHeight: 1.7, marginTop: 32, maxWidth: 700, margin: "32px auto 0" }}>
            The average family of a child with disabilities interacts with 15–25 separate entities across state, federal, school, medical, and financial systems. There's no single place to find what you're entitled to, no one tracking deadlines, and no one drafting the paperwork.
          </p>
        </div>
      </section>

      {/* ======== HOW IT WORKS ======== */}
      <section style={{ padding: "80px 24px", background: "#fff" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: TEAL, fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>How It Works</p>
          <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 40, color: NAVY, marginBottom: 56 }}>Three steps to clarity</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
            {[
              { step: "01", icon: "👶", title: "Tell us about your child", desc: "Diagnosis, age, county, and insurance. Takes 2 minutes." },
              { step: "02", icon: "🗺️", title: "Get your personalized roadmap", desc: "Every program, benefit, and deadline — mapped to your family's situation." },
              { step: "03", icon: "🤖", title: "Let AI handle the paperwork", desc: "Appeals, IEP prep, reimbursement requests — drafted and ready to send." },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: "left", position: "relative" }}>
                <div style={{ fontSize: 64, fontWeight: 900, color: "rgba(8,145,178,0.08)", fontFamily: "'DM Serif Display', Georgia, serif", lineHeight: 1 }}>{s.step}</div>
                <span style={{ fontSize: 36, display: "block", margin: "8px 0 16px" }}>{s.icon}</span>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 8 }}>{s.title}</h3>
                <p style={{ color: MID, fontSize: 15, lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======== ELIGIBILITY TOOL ======== */}
      <section id="eligibility-tool" style={{ background: `linear-gradient(165deg, ${NAVY}, #0C3654)`, padding: "80px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <p style={{ color: TEAL, fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>Free Eligibility Tool</p>
            <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 40, color: "#fff", marginBottom: 12 }}>What is your child eligible for?</h2>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 16 }}>Select a diagnosis to see programs from our Entity Navigation Matrix</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginBottom: 32 }}>
            {Object.keys(PROGRAMS).map(dx => (
              <button key={dx} onClick={() => { setSelectedDx(dx); setToolUnlocked(false); }}
                style={{ padding: "10px 20px", borderRadius: 10, border: selectedDx === dx ? `2px solid ${TEAL}` : "2px solid rgba(255,255,255,0.12)", background: selectedDx === dx ? "rgba(8,145,178,0.2)" : "rgba(255,255,255,0.05)", color: selectedDx === dx ? TEAL : "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{dx}</button>
            ))}
          </div>
          {selectedDx && (
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <span style={{ fontSize: 20 }}>📋</span>
                <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>Programs for {selectedDx}</span>
                <span style={{ background: "rgba(8,145,178,0.2)", color: TEAL, padding: "4px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600 }}>{programs.length} found</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {visiblePrograms.map((pg, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "16px 20px", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: statusColor(pg.status), marginTop: 6, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>{pg.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: statusColor(pg.status), background: statusColor(pg.status) + "18", padding: "2px 10px", borderRadius: 5 }}>{pg.status}</span>
                      </div>
                      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>{pg.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              {!toolUnlocked && programs.length > 3 && (
                <div style={{ marginTop: 20, background: "rgba(8,145,178,0.08)", borderRadius: 12, padding: 20, border: "1px dashed rgba(8,145,178,0.3)" }}>
                  <p style={{ color: "#fff", fontSize: 15, fontWeight: 600, marginBottom: 12 }}>🔒 {programs.length - 3} more programs found. Enter your email to see all results:</p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input value={emailForTool} onChange={e => setEmailForTool(e.target.value)} placeholder="your@email.com" style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 14 }} />
                    <button onClick={() => { if (emailForTool.includes("@")) setToolUnlocked(true); }} style={{ padding: "10px 24px", borderRadius: 8, background: TEAL, color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Unlock All</button>
                  </div>
                </div>
              )}
              {toolUnlocked && (
                <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(16,185,129,0.1)", borderRadius: 8, border: "1px solid rgba(16,185,129,0.2)" }}>
                  <span style={{ color: SAGE, fontSize: 14 }}>✓ Full results unlocked! We'll send your personalized roadmap to {emailForTool}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ======== JOURNEY MAPS ======== */}
      <section id="journey-maps" style={{ padding: "80px 24px", background: "#fff" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <p style={{ color: TEAL, fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>Journey Maps</p>
            <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 40, color: NAVY, marginBottom: 12 }}>See the road ahead</h2>
            <p style={{ color: MID, fontSize: 16, maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>Every diagnosis has a different path. Select yours to see the agencies, milestones, and deadlines from diagnosis to adulthood.</p>
          </div>

          {/* Diagnosis tabs */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginBottom: 28 }}>
            {Object.keys(JOURNEYS).map(dx => {
              const j = JOURNEYS[dx];
              const active = dx === journeyDx;
              return (
                <button key={dx} onClick={() => { setJourneyDx(dx); setJourneyPhase(0); }}
                  style={{ padding: "8px 16px", borderRadius: 10, border: active ? `2px solid ${j.color}` : "2px solid #E2E8F0", background: active ? j.color + "10" : "#fff", color: active ? j.color : MID, fontSize: 13, fontWeight: active ? 700 : 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 16 }}>{j.icon}</span> {dx}
                </button>
              );
            })}
          </div>

          {/* Timeline */}
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 39, top: 0, bottom: 0, width: 3, background: "linear-gradient(to bottom, #E2E8F0, #CBD5E1, #E2E8F0)", borderRadius: 2 }} />
            {journey.phases.map((phase, i) => {
              const isOpen = journeyPhase === i;
              return (
                <div key={`${journeyDx}-${i}`} style={{ position: "relative", marginBottom: 12, zIndex: 1 }}>
                  <div onClick={() => setJourneyPhase(isOpen ? null : i)}
                    style={{ display: "flex", gap: 14, cursor: "pointer", background: isOpen ? phase.bg : "#fff", borderRadius: 16, border: `2px solid ${isOpen ? phase.color + "50" : "#E2E8F0"}`, padding: isOpen ? "18px 20px" : "12px 18px", transition: "all 0.3s", boxShadow: isOpen ? `0 4px 20px ${phase.color}10` : "0 1px 3px rgba(0,0,0,0.04)", alignItems: "flex-start" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: `linear-gradient(140deg, ${phase.color}, ${phase.color}BB)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: `0 2px 10px ${phase.color}25` }}>{phase.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: phase.color, background: phase.color + "15", padding: "2px 9px", borderRadius: 5 }}>AGE {phase.age}</span>
                        <span style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>{phase.label}</span>
                      </div>
                      {isOpen && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", marginBottom: 14, borderLeft: `4px solid ${phase.color}`, border: `1px solid ${phase.color}15` }}>
                            <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.8, margin: 0 }}>{phase.description}</p>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            {phase.entities.map((ent, j) => (
                              <div key={j} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 9, padding: "8px 12px", border: "1px solid #E2E8F0" }}>
                                <div style={{ width: 7, height: 7, borderRadius: "50%", background: phase.color, flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{ent.name}</span>
                                  <span style={{ fontSize: 12, color: MID, marginLeft: 5 }}>— {ent.action}</span>
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 600, color: phase.color, background: phase.color + "12", padding: "2px 8px", borderRadius: 5, whiteSpace: "nowrap", flexShrink: 0 }}>{ent.time}</span>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                            <div style={{ flex: 1, minWidth: 180, background: SAGE + "0D", borderRadius: 10, padding: "10px 14px", border: `1px solid ${SAGE}22` }}>
                              <span style={{ fontSize: 10, fontWeight: 800, color: SAGE, textTransform: "uppercase" }}>✓ Milestone</span>
                              <p style={{ fontSize: 12, color: NAVY, margin: "4px 0 0", fontWeight: 600 }}>{phase.milestone}</p>
                            </div>
                            <div style={{ flex: 1, minWidth: 180, background: CORAL + "0D", borderRadius: 10, padding: "10px 14px", border: `1px solid ${CORAL}22` }}>
                              <span style={{ fontSize: 10, fontWeight: 800, color: CORAL, textTransform: "uppercase" }}>⏰ Deadline</span>
                              <p style={{ fontSize: 12, color: NAVY, margin: "4px 0 0", fontWeight: 600 }}>{phase.alert}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 16, color: "#94A3B8", transition: "transform 0.25s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0, marginTop: 4 }}>▾</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ======== AI DIFFERENCE ======== */}
      <section style={{ padding: "80px 24px", background: LIGHT }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <p style={{ color: TEAL, fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16, textAlign: "center" }}>The AI Difference</p>
          <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 40, color: NAVY, marginBottom: 48, textAlign: "center" }}>Other platforms tell you what to do. We do it.</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={{ background: "#FEF2F2", borderRadius: 16, padding: 28, border: "1px solid #FECACA" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#DC2626", background: "#FEE2E2", padding: "4px 12px", borderRadius: 6 }}>Generic Advice</span>
              <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #FECACA", marginTop: 16 }}>
                <p style={{ color: "#9CA3AF", fontSize: 13, marginBottom: 8 }}>You asked: "Insurance denied my child's OT"</p>
                <p style={{ color: DARK, fontSize: 14, lineHeight: 1.6 }}>"You should file an appeal with your insurance company. Review your plan documents. Consider contacting your state's insurance commissioner."</p>
                <p style={{ color: "#DC2626", fontSize: 12, marginTop: 12, fontStyle: "italic" }}>↑ Now what? Which form? What language? What deadline?</p>
              </div>
            </div>
            <div style={{ background: "#F0FDFA", borderRadius: 16, padding: 28, border: `1px solid ${TEAL}30` }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: TEAL, background: "#E0F7FA", padding: "4px 12px", borderRadius: 6 }}>Waypoint AI</span>
              <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: `1px solid ${TEAL}30`, marginTop: 16 }}>
                <p style={{ color: "#9CA3AF", fontSize: 13, marginBottom: 8 }}>You asked: "Insurance denied my child's OT"</p>
                <p style={{ color: DARK, fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>Based on Maya's Blue Shield plan:</p>
                {["✅ Appeal deadline: March 15. I've drafted your appeal letter.", "✅ Email to Dr. Patel requesting medical necessity letter — ready for review.", "✅ Fallback: RC must provide OT if insurance denies (Lanterman Act §4648).", "📎 Appeal letter attached  •  📧 Email draft ready"].map((t, i) => (
                  <p key={i} style={{ fontSize: 13, color: i === 3 ? TEAL : DARK, lineHeight: 1.5, fontWeight: i === 3 ? 600 : 400 }}>{t}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======== FEATURES ======== */}
      <section id="features" style={{ background: "#fff", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <p style={{ color: TEAL, fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16, textAlign: "center" }}>Platform Features</p>
          <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 40, color: NAVY, marginBottom: 48, textAlign: "center" }}>Everything families need. One place.</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ background: LIGHT, borderRadius: 16, padding: 24, border: "1px solid #E2E8F0", transition: "transform 0.2s", cursor: "default" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <span style={{ fontSize: 32 }}>{f.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: f.badge === "Preview Live" ? SAGE : MID, background: f.badge === "Preview Live" ? "#E6F7EF" : "#F1F5F9", padding: "3px 10px", borderRadius: 5 }}>{f.badge}</span>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: NAVY, marginBottom: 6 }}>{f.title}</h3>
                <p style={{ color: MID, fontSize: 14, lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======== FOUNDER ======== */}
      <section style={{ padding: "80px 24px", background: LIGHT }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", gap: 40, alignItems: "center" }}>
          <div style={{ width: 140, height: 140, borderRadius: 20, background: `linear-gradient(135deg, ${NAVY}, ${TEAL})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56, flexShrink: 0 }}>👨‍👦</div>
          <div>
            <p style={{ color: TEAL, fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>From a Parent Who Gets It</p>
            <p style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 24, color: NAVY, lineHeight: 1.4, marginBottom: 16 }}>
              "I'm Mike, father of two boys in Oakland. When my son needed services, I spent hundreds of hours navigating the system. I built Waypoint so no family has to do it alone."
            </p>
            <p style={{ color: MID, fontSize: 14, lineHeight: 1.6 }}>Mike Beebe — Founder & CEO. 15+ years in enterprise software. Building Waypoint with the same systems thinking that manages complex, multi-stakeholder operations at scale.</p>
          </div>
        </div>
      </section>

      {/* ======== STATS ======== */}
      <section style={{ background: NAVY, padding: "64px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, textAlign: "center" }}>
          {STATS.map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 44, fontWeight: 800, color: TEAL, fontFamily: "'DM Serif Display', Georgia, serif" }}><AnimatedCounter target={s.num} /></div>
              <p style={{ color: "#fff", fontSize: 15, fontWeight: 600, marginTop: 4 }}>{s.label}</p>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 2 }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ======== WAITLIST ======== */}
      <section id="waitlist" style={{ padding: "80px 24px", background: "#fff" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
          <span style={{ fontSize: 48, display: "block", marginBottom: 16 }}>🧭</span>
          <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 36, color: NAVY, marginBottom: 12 }}>Join the waitlist</h2>
          <p style={{ color: MID, fontSize: 16, marginBottom: 32, lineHeight: 1.6 }}>Be the first to know when Waypoint launches. Early access members get 3 months free.</p>
          {!submitted ? (
            <div style={{ background: LIGHT, borderRadius: 16, padding: 28, boxShadow: "0 4px 20px rgba(0,0,0,0.06)", textAlign: "left" }}>
              <label style={{ display: "block", marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: DARK, display: "block", marginBottom: 6 }}>Email</span>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="parent@email.com" style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid #E2E8F0", fontSize: 15, boxSizing: "border-box" }} />
              </label>
              <label style={{ display: "block", marginBottom: 20 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: DARK, display: "block", marginBottom: 8 }}>I am a...</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["Parent/Caregiver", "Provider", "Advocate", "Other"].map(r => (
                    <button key={r} onClick={() => setRole(r)} style={{ padding: "8px 16px", borderRadius: 8, border: role === r ? `2px solid ${TEAL}` : "2px solid #E2E8F0", background: role === r ? `${TEAL}10` : "#fff", color: role === r ? TEAL : MID, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{r}</button>
                  ))}
                </div>
              </label>
              <button onClick={() => { if (email.includes("@") && role) setSubmitted(true); }} style={{ width: "100%", padding: "14px", borderRadius: 10, background: TEAL, color: "#fff", border: "none", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 16px ${TEAL}40` }}>Join the Waitlist →</button>
            </div>
          ) : (
            <div style={{ background: LIGHT, borderRadius: 16, padding: 32, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
              <span style={{ fontSize: 48, display: "block", marginBottom: 16 }}>🎉</span>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: NAVY, marginBottom: 8 }}>You're on the list!</h3>
              <p style={{ color: MID, fontSize: 15, marginBottom: 20 }}>We'll email you at {email} when Waypoint is ready.</p>
              <div style={{ background: "#fff", borderRadius: 12, padding: 16, textAlign: "left" }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 10 }}>While you wait, check out these free resources:</p>
                {["Complete Guide to Regional Center Services", "Understanding Your IEP Rights in California", "2026 Federal Policy Changes: What Families Need to Know"].map((r, i) => (
                  <p key={i} style={{ fontSize: 13, color: TEAL, padding: "4px 0", cursor: "pointer" }}>📄 {r}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ======== FOOTER ======== */}
      <footer style={{ background: NAVY, padding: "48px 24px 32px", borderTop: `3px solid ${TEAL}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 32 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${TEAL}, ${SAGE})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>◎</div>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>WAYPOINT</span>
            </div>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, maxWidth: 280, lineHeight: 1.5 }}>Your child's unexpected journey. Every step, mapped. Built in Oakland, CA.</p>
          </div>
          <div style={{ display: "flex", gap: 48 }}>
            <div>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Product</p>
              {["Features", "Eligibility Tool", "Journey Maps", "Pricing"].map(l => (<p key={l} style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, padding: "4px 0", cursor: "pointer" }}>{l}</p>))}
            </div>
            <div>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Company</p>
              {["About", "Blog", "Privacy", "HIPAA Notice", "Contact"].map(l => (<p key={l} style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, padding: "4px 0", cursor: "pointer" }}>{l}</p>))}
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1000, margin: "32px auto 0", paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>© 2026 Waypoint. All rights reserved.</p>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>Built with ❤️ by a parent, for parents.</p>
        </div>
      </footer>
    </div>
  );
}
