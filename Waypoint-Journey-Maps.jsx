import { useState } from "react";

const NAVY = "#1B2A4A";
const TEAL = "#0891B2";
const SAGE = "#10B981";
const CORAL = "#F97316";
const VIOLET = "#7C3AED";
const ROSE = "#E11D48";
const SKY = "#0EA5E9";
const AMBER = "#D97706";

// ===================== JOURNEY DATA =====================

const JOURNEYS = {
  "Autism": {
    icon: "🧩", color: VIOLET, subtitle: "Autism Spectrum Disorder",
    intro: "The autism journey touches nearly every system — Regional Center, school, insurance, SSI, IHSS, and more. It's the most complex path, but also the one with the most resources available if you know where to look.",
    phases: [
      {
        age: "0–3", label: "Early Intervention", color: VIOLET, bg: "#F5F3FF", icon: "👶",
        trigger: "Developmental concern or diagnosis",
        description: "This is often the hardest moment — the one where everything shifts. Whether you noticed something yourself or a pediatrician raised a concern, you're now standing at the beginning of a path you never expected. Take a breath. You are not behind. The fact that you're seeking answers means you're already advocating for your child. Early intervention is the single most impactful thing you can do, and California has strong programs designed to help your family right now. You don't need to have it all figured out today.",
        entities: [
          { name: "Pediatrician", action: "Referral for developmental evaluation", time: "Immediate" },
          { name: "Regional Center", action: "Early Start intake → IFSP development", time: "45 days" },
          { name: "Early Start", action: "Home-based speech, OT, ABA therapies", time: "Ongoing" },
          { name: "Insurance", action: "ABA therapy authorization (CA mandate)", time: "30 days" },
          { name: "Medi-Cal", action: "Apply if income-eligible for full coverage", time: "45 days" },
        ],
        milestone: "IFSP in place, therapies started",
        alert: "RC intake must happen within 45 days of referral",
      },
      {
        age: "3–5", label: "Transition to School", color: TEAL, bg: "#F0FDFA", icon: "🎒",
        trigger: "Child turns 3 — moves from Early Start to school district",
        description: "Your child is growing, and so is the system around them. At age 3, responsibility shifts from the Regional Center's Early Start program to your local school district — and that transition can feel like starting over. New people, new acronyms, new meetings. It's normal to feel overwhelmed. But here's what matters: your child has a legal right to a Free Appropriate Public Education, and you have a seat at that IEP table as an equal member of the team. Your voice matters more than anyone else's in that room.",
        entities: [
          { name: "School District", action: "Assessment → first IEP within 60 + 30 days", time: "90 days" },
          { name: "Regional Center", action: "Lanterman eligibility determination", time: "120 days" },
          { name: "IHSS", action: "Apply for paid in-home support hours", time: "30–60 days" },
          { name: "SSI", action: "Apply if income-eligible", time: "3–6 months" },
          { name: "Insurance", action: "Continue ABA + therapy authorizations", time: "Ongoing" },
        ],
        milestone: "IEP active, RC services confirmed, IHSS hours set",
        alert: "Transition planning must start 6 months before 3rd birthday",
      },
      {
        age: "5–13", label: "School Years", color: SKY, bg: "#F0F9FF", icon: "📚",
        trigger: "Ongoing management — annual reviews and re-authorizations",
        description: "You've made it through the early chaos. By now you have systems in place — and your main job is to protect them. Annual IEP meetings, insurance re-authorizations, IHSS reassessments — it can feel repetitive, but each one is an opportunity to make sure your child's services keep pace with their growth. You know more than you think you do. The parent who sat in that first IEP meeting terrified? That parent is now the expert on their child.",
        entities: [
          { name: "School District", action: "Annual IEP reviews + triennial reassessments", time: "Yearly / 3 yr" },
          { name: "Regional Center", action: "Annual IPP review and goal updates", time: "Yearly" },
          { name: "Insurance", action: "Therapy re-authorizations", time: "Every 3–12 mo" },
          { name: "IHSS", action: "Annual hour reassessment", time: "Yearly" },
          { name: "CalABLE", action: "Open tax-advantaged savings account", time: "Any time" },
        ],
        milestone: "Stable services, financial planning started",
        alert: "Request an IEE if you disagree with the school's assessment",
      },
      {
        age: "14–17", label: "Transition Planning", color: AMBER, bg: "#FFFBEB", icon: "🎓",
        trigger: "Transition IEP required by age 16",
        description: "Your child is becoming a young adult, and the system needs to start planning for that — even if it feels too soon. Transition planning is about asking big, hopeful questions: What does a good life look like for my child after school? By law, your child's IEP must include transition goals by age 16. This is also when legal planning begins — conservatorship or supported decision-making. You're building a bridge, and you don't have to build it alone.",
        entities: [
          { name: "School District", action: "Transition IEP with post-secondary goals", time: "By age 16" },
          { name: "DOR", action: "Vocational rehab referral and job training", time: "Apply at 16" },
          { name: "Regional Center", action: "Transition coordinator assigned", time: "Age 14–16" },
          { name: "SNT / CalABLE", action: "Long-term financial planning", time: "Start now" },
          { name: "Conservatorship", action: "Research conservatorship vs. SDM options", time: "6–12 mo before 18" },
        ],
        milestone: "Transition plan in IEP, DOR engaged, legal planning started",
        alert: "Start conservatorship process 6–12 months before age 18",
      },
      {
        age: "18–22", label: "Young Adulthood", color: CORAL, bg: "#FFF7ED", icon: "🧑‍💼",
        trigger: "SSI re-evaluation at 18, school eligibility continues to 22",
        description: "Your child is legally an adult now — and the system treats them differently overnight. SSI eligibility is re-evaluated using adult criteria, which is often easier to qualify for since parental income is no longer counted. Your child still has the right to FAPE through age 22. You've been doing this for almost two decades. You are your child's greatest advocate, and that doesn't change with a birthday.",
        entities: [
          { name: "SSA", action: "Adult SSI re-evaluation (new criteria)", time: "At age 18" },
          { name: "School District", action: "Entitled to FAPE through age 22", time: "Until 22" },
          { name: "Regional Center", action: "Adult services — day programs, SLS", time: "Ongoing" },
          { name: "DOR", action: "Job training and supported employment", time: "Ongoing" },
          { name: "Medi-Cal", action: "Ensure continuous healthcare coverage", time: "Ongoing" },
        ],
        milestone: "Adult benefits secured, employment or day program in place",
        alert: "Gather IEP records — key evidence for SSI adult approval",
      },
      {
        age: "22+", label: "Adult Life", color: ROSE, bg: "#FFF1F2", icon: "🏠",
        trigger: "School services end — RC and SSI become primary supports",
        description: "The school years are behind you, and your child is living their adult life. For many families, this moment carries a mix of pride, grief, and worry — and all of those feelings are valid. Every step you've taken has built a foundation of rights, services, and protections that will support your child for life. You did this. And Waypoint is here for every chapter that comes next.",
        entities: [
          { name: "Regional Center", action: "IPP: housing, employment, day programs", time: "Lifelong" },
          { name: "SSI / Medi-Cal", action: "Monthly income + full health coverage", time: "Lifelong" },
          { name: "IHSS", action: "In-home supportive services continue", time: "Lifelong" },
          { name: "Self-Determination", action: "Direct control over RC service budget", time: "If enrolled" },
          { name: "Special Needs Trust", action: "Protect assets without losing SSI", time: "Lifelong" },
        ],
        milestone: "Stable adult support system in place",
        alert: "SSI $2K resource limit — CalABLE & SNT protect savings",
      },
    ],
  },

  "Down Syndrome": {
    icon: "💛", color: AMBER, subtitle: "Trisomy 21",
    intro: "Down syndrome is an 'established risk' condition — meaning your child qualifies for Regional Center services from day one, often before they even leave the hospital. The medical needs may be greater early on, but the support systems are strong.",
    phases: [
      {
        age: "0–3", label: "Early Days", color: VIOLET, bg: "#F5F3FF", icon: "👶",
        trigger: "Diagnosis at birth or prenatally",
        description: "Your baby is here, and they are perfect and yours. A Down syndrome diagnosis often comes at birth — sometimes even before — and it can hit you in ways you didn't expect. There may be medical needs right away, including cardiac screenings that feel urgent and scary. But here's what you need to know: there is an entire community of families who have walked this path before you, and the support systems in California are among the strongest in the country. Your Regional Center referral can happen while you're still in the hospital. Early Start therapies can begin within weeks. You are not starting from scratch — you're stepping into a system that is ready for you.",
        entities: [
          { name: "Hospital / NICU", action: "Cardiac screening, genetic confirmation", time: "At birth" },
          { name: "Regional Center", action: "Early Start referral (established risk)", time: "45 days" },
          { name: "CCS", action: "California Children's Services for cardiac care", time: "30 days" },
          { name: "Early Start", action: "PT, OT, speech (home-based)", time: "Ongoing" },
          { name: "Medi-Cal", action: "Apply for full health coverage", time: "45 days" },
          { name: "Insurance", action: "Specialist and therapy authorizations", time: "Ongoing" },
        ],
        milestone: "Early Start therapies in place, cardiac care established",
        alert: "CCS referral is critical if cardiac conditions are present",
      },
      {
        age: "3–5", label: "Transition to School", color: TEAL, bg: "#F0FDFA", icon: "🎒",
        trigger: "Transition from Early Start to school district IEP",
        description: "The shift to school can feel bittersweet — you've built relationships with your Early Start team, and now it's time to start over with new people. But your child's rights are strong. Children with Down syndrome typically qualify under the Intellectual Disability or Multiple Disabilities categories for an IEP, and inclusive education is the starting presumption under the law. Don't let anyone tell you your child 'can't' be in a general education classroom without the IEP team considering it first. This is also the right time to apply for IHSS and SSI — your child has strong eligibility for both.",
        entities: [
          { name: "School District", action: "Assessment → IEP with inclusion plan", time: "90 days" },
          { name: "Regional Center", action: "Transition from Early Start to Lanterman services", time: "120 days" },
          { name: "IHSS", action: "Apply for in-home support hours", time: "30–60 days" },
          { name: "SSI", action: "Strong eligibility — apply now", time: "3–6 months" },
          { name: "CCS", action: "Ongoing cardiac / medical specialist care", time: "Ongoing" },
        ],
        milestone: "IEP active with inclusion goals, SSI and IHSS in place",
        alert: "Transition planning starts 6 months before 3rd birthday",
      },
      {
        age: "5–13", label: "School Years", color: SKY, bg: "#F0F9FF", icon: "📚",
        trigger: "Annual IEP reviews, ongoing medical monitoring",
        description: "Your child is in school, making friends, and growing in ways that may surprise everyone — including the professionals. This is the stage where you advocate for high expectations. Children with Down syndrome thrive when they're included, challenged, and supported. Push for meaningful goals, not just 'compliance' goals. Monitor thyroid function, vision, hearing, and cardiac health annually — these are common medical needs that your pediatrician and CCS should be tracking. And don't forget: you are the constant in your child's life. Teachers change, therapists rotate, but you are always there.",
        entities: [
          { name: "School District", action: "Annual IEP + triennial reassessments", time: "Yearly / 3 yr" },
          { name: "Regional Center", action: "Annual IPP review", time: "Yearly" },
          { name: "CCS / Specialists", action: "Cardiac, thyroid, vision, hearing monitoring", time: "Annually" },
          { name: "IHSS", action: "Annual reassessment of hours", time: "Yearly" },
          { name: "CalABLE", action: "Start building long-term savings", time: "Any time" },
        ],
        milestone: "Inclusive education, stable medical care, savings started",
        alert: "Annual thyroid, cardiac, vision, and hearing checks are essential",
      },
      {
        age: "14–17", label: "Transition Planning", color: AMBER, bg: "#FFFBEB", icon: "🎓",
        trigger: "Transition IEP, vocational planning, legal preparation",
        description: "The question shifts from 'What does my child need in school?' to 'What does a good adult life look like?' This can bring up deep emotions — and that's okay. Transition planning for a young person with Down syndrome should focus on their strengths, interests, and dreams. Many adults with Down syndrome work, live semi-independently, and have rich social lives. The foundation you lay now — vocational training through DOR, supported decision-making vs. conservatorship, financial planning through CalABLE and SNTs — determines how much independence and security your child will have as an adult.",
        entities: [
          { name: "School District", action: "Transition IEP with vocational goals", time: "By age 16" },
          { name: "DOR", action: "Job training, supported employment", time: "Apply at 16" },
          { name: "Regional Center", action: "Transition planning coordinator", time: "Age 14–16" },
          { name: "SNT / CalABLE", action: "Financial and estate planning", time: "Start now" },
          { name: "Conservatorship / SDM", action: "Legal decision-making options", time: "6–12 mo before 18" },
        ],
        milestone: "Vocational plan active, legal and financial framework in place",
        alert: "Explore Supported Decision-Making before defaulting to conservatorship",
      },
      {
        age: "18+", label: "Adult Life", color: CORAL, bg: "#FFF7ED", icon: "🏠",
        trigger: "Adult services, employment, housing, lifelong care",
        description: "Your child is an adult. They may be working, living with support, participating in day programs, or building a life that looks different from what you once imagined — but is no less meaningful. SSI provides monthly income, Medi-Cal provides health coverage, IHSS provides daily support, and the Regional Center coordinates it all. If you've enrolled in the Self-Determination Program, your adult child has real control over their budget and services. The work you've done over these years — every IEP, every IPP, every phone call — has built the life your child is living now. You should be proud.",
        entities: [
          { name: "SSI / Medi-Cal", action: "Monthly income + health coverage", time: "Lifelong" },
          { name: "Regional Center", action: "Day programs, SLS, employment support", time: "Lifelong" },
          { name: "IHSS", action: "In-home support continues", time: "Lifelong" },
          { name: "DOR", action: "Ongoing supported employment", time: "Ongoing" },
          { name: "Special Needs Trust", action: "Protect assets, plan for future", time: "Lifelong" },
        ],
        milestone: "Stable adult life with employment, housing, and community",
        alert: "SSI $2K resource limit — CalABLE & SNT protect savings",
      },
    ],
  },

  "Cerebral Palsy": {
    icon: "💪", color: TEAL, subtitle: "Motor & Physical Disability",
    intro: "Cerebral palsy involves complex medical needs alongside developmental support. CCS (California Children's Services) plays a larger role here than in most other diagnoses, and IHSS hours tend to be higher due to physical care needs.",
    phases: [
      {
        age: "0–3", label: "Early Intervention", color: VIOLET, bg: "#F5F3FF", icon: "👶",
        trigger: "Diagnosis in infancy, often following NICU stay",
        description: "A CP diagnosis often comes after a frightening start — a difficult birth, a NICU stay, or months of watching your baby miss milestones that other babies seem to hit effortlessly. The guilt and grief you may feel are real, and they're normal. But your child is resilient, and so are you. California has one of the strongest early intervention systems in the country for children with physical disabilities. CCS provides specialized medical therapy. Regional Center provides developmental services. Early Start brings PT, OT, and speech into your home. You don't need to coordinate all of this alone — that's what the service coordinator is for.",
        entities: [
          { name: "Pediatrician / Neurologist", action: "Diagnosis, imaging, referrals", time: "Immediate" },
          { name: "Regional Center", action: "Early Start intake → IFSP", time: "45 days" },
          { name: "CCS", action: "Medical Therapy Program — PT, OT", time: "30 days" },
          { name: "Early Start", action: "Developmental therapies (home-based)", time: "Ongoing" },
          { name: "Insurance", action: "DME (wheelchair, stander, orthotics)", time: "Prior auth" },
          { name: "Medi-Cal", action: "Full coverage including specialist care", time: "45 days" },
        ],
        milestone: "Therapies in place, DME ordered, medical team established",
        alert: "CCS Medical Therapy Program is free regardless of income",
      },
      {
        age: "3–5", label: "Transition to School", color: TEAL, bg: "#F0FDFA", icon: "🎒",
        trigger: "IEP development with physical accessibility requirements",
        description: "The transition to school introduces a new set of challenges — and they're not just educational. Your child's school needs to be physically accessible. Adaptive equipment needs to be in the classroom. Aides may need to be trained on transfers and feeding. It's a lot to coordinate, and you have every right to insist that it's done properly. The IEP should address not just academics but mobility, communication, self-care, and socialization. CCS continues providing medical therapy in many schools through the Medical Therapy Program (MTP), which operates right on campus. This is also the time to apply for IHSS — children with CP often qualify for high hours due to physical care needs.",
        entities: [
          { name: "School District", action: "IEP with physical accessibility, adaptive PE", time: "90 days" },
          { name: "CCS MTP", action: "School-based physical and occupational therapy", time: "Continues" },
          { name: "Regional Center", action: "Lanterman services — respite, adaptive equipment", time: "120 days" },
          { name: "IHSS", action: "High hours likely — bathing, feeding, mobility", time: "30–60 days" },
          { name: "SSI", action: "Strong eligibility for CP", time: "3–6 months" },
        ],
        milestone: "Accessible IEP, school-based therapy, IHSS hours established",
        alert: "CCS MTP operates in schools — ensure it's in the IEP",
      },
      {
        age: "5–13", label: "School Years", color: SKY, bg: "#F0F9FF", icon: "📚",
        trigger: "Growth changes, equipment updates, educational adaptations",
        description: "Children with CP grow and change — and so do their needs. Growth spurts may mean new orthotics, new wheelchair fittings, new positioning equipment. Spasticity management may require Botox injections or orthopedic surgeries. Each of these changes ripples through the system: insurance authorizations, IEP modifications, IHSS reassessments. It can feel like a full-time job on top of actual parenting. But your child is also growing in ways that matter more — building friendships, discovering interests, developing their voice. Focus on the whole child, not just the medical chart. You are more than a case manager. You are a parent.",
        entities: [
          { name: "School District", action: "Adapted curriculum, assistive technology", time: "Annual IEP" },
          { name: "CCS / Ortho", action: "Growth-related surgeries, orthotics, DME updates", time: "As needed" },
          { name: "Insurance", action: "DME reauthorizations, specialist visits", time: "Ongoing" },
          { name: "Regional Center", action: "Respite, adaptive recreation, home mods", time: "Annual IPP" },
          { name: "IHSS", action: "Reassess hours as needs change", time: "Yearly" },
        ],
        milestone: "Adaptive equipment current, educational access maintained",
        alert: "DME must be updated as child grows — don't wait for it to break",
      },
      {
        age: "14–17", label: "Transition Planning", color: AMBER, bg: "#FFFBEB", icon: "🎓",
        trigger: "Transition IEP, assistive technology, adult living planning",
        description: "Transition for a young person with CP is about more than employment — it's about independence, mobility, communication, and living situation. What kind of support will they need as an adult? Where will they live? How will they get around? These are big questions, and they deserve thoughtful, person-centered answers. Assistive technology is often a game-changer at this stage — communication devices, powered mobility, smart home adaptations. DOR can fund vocational training and assistive tech for employment. The Regional Center begins planning for adult services. You're laying the groundwork for your child's adult life, and every decision matters.",
        entities: [
          { name: "School District", action: "Transition IEP — assistive tech, mobility, vocational", time: "By age 16" },
          { name: "DOR", action: "Assistive tech funding, vocational rehab", time: "Apply at 16" },
          { name: "Regional Center", action: "Adult living planning — SLS, ILS options", time: "Age 14–16" },
          { name: "SNT / CalABLE", action: "Long-term financial security planning", time: "Start now" },
          { name: "Conservatorship / SDM", action: "Legal options for decision-making", time: "Before 18" },
        ],
        milestone: "Assistive tech in place, adult living plan developed",
        alert: "DOR can fund assistive technology for employment — apply early",
      },
      {
        age: "18+", label: "Adult Life", color: CORAL, bg: "#FFF7ED", icon: "🏠",
        trigger: "Adult services, independent/supported living, lifelong medical care",
        description: "Your child is an adult, and the physical needs don't go away — but neither does the support. IHSS provides daily hands-on care. The Regional Center coordinates housing (Supported Living Services or Independent Living Services), day programs, and community integration. CCS transitions to adult medical programs, and Medi-Cal ensures ongoing health coverage. Many adults with CP live rich, full, connected lives with the right supports in place. The infrastructure you've built over these years — the medical team, the equipment, the services — carries forward. This is the life you've been building toward. And it's a good one.",
        entities: [
          { name: "IHSS", action: "Daily personal care — often high hours", time: "Lifelong" },
          { name: "Regional Center", action: "SLS/ILS, day programs, community access", time: "Lifelong" },
          { name: "SSI / Medi-Cal", action: "Income + full medical coverage", time: "Lifelong" },
          { name: "CCS → Adult programs", action: "Ongoing orthopedic, neurological care", time: "Transition" },
          { name: "Special Needs Trust", action: "Asset protection for quality of life", time: "Lifelong" },
        ],
        milestone: "Independent or supported living established, medical care continuous",
        alert: "CCS services end at age 21 — ensure Medi-Cal covers adult specialists",
      },
    ],
  },

  "ADHD": {
    icon: "⚡", color: SKY, subtitle: "Attention-Deficit/Hyperactivity Disorder",
    intro: "ADHD on its own doesn't qualify for Regional Center services — but it absolutely qualifies for school supports (IEP or 504), and may qualify for SSI in severe cases. The journey is different but no less important.",
    phases: [
      {
        age: "0–5", label: "Early Recognition", color: VIOLET, bg: "#F5F3FF", icon: "👶",
        trigger: "Behavioral concerns, hyperactivity, difficulty in preschool",
        description: "ADHD is often first noticed when a child enters a structured environment — preschool, daycare, kindergarten — and the behaviors that seemed like 'just being a kid' start standing out. Getting a formal diagnosis before age 5 can be tricky; many clinicians are hesitant to diagnose this young. That doesn't mean you're wrong about what you're seeing. Trust your instincts. A developmental pediatrician or child psychologist can evaluate your child and help you understand what's happening. Even without a formal ADHD diagnosis, your child may qualify for early intervention services if there are developmental delays present. You are the first person who noticed. That matters.",
        entities: [
          { name: "Pediatrician", action: "Screening, referral to specialist", time: "Immediate" },
          { name: "Dev. Pediatrician", action: "Comprehensive evaluation and diagnosis", time: "3–12 mo wait" },
          { name: "Insurance", action: "Behavioral therapy and evaluation coverage", time: "Prior auth" },
          { name: "Preschool / Daycare", action: "Behavioral support plan", time: "As needed" },
        ],
        milestone: "Formal evaluation complete, support strategies in place",
        alert: "Specialist waitlists can be 3–12 months — get on the list early",
      },
      {
        age: "5–13", label: "School Support", color: SKY, bg: "#F0F9FF", icon: "📚",
        trigger: "Academic and behavioral challenges in school",
        description: "This is where the rubber meets the road. Your child is in school, and ADHD is affecting their ability to learn, stay organized, follow directions, or manage their behavior. You have two paths: a 504 Plan (accommodations like extra time, preferential seating, movement breaks) or an IEP (if ADHD substantially impacts educational performance, your child may qualify under 'Other Health Impairment'). Don't let anyone tell you ADHD isn't a 'real disability' or doesn't qualify for support. The law is clear. If your child's ADHD is affecting their education, the school has an obligation to help. You may also want to explore whether medication is right for your family — that's a personal decision and there is no wrong answer.",
        entities: [
          { name: "School District", action: "Request evaluation → IEP or 504 Plan", time: "60 days" },
          { name: "Insurance", action: "Medication management, therapy coverage", time: "Ongoing" },
          { name: "Pediatrician", action: "Medication monitoring if applicable", time: "Quarterly" },
          { name: "SSI", action: "May qualify if marked/severe functional limitations", time: "3–6 months" },
          { name: "Medi-Cal", action: "Full coverage if income-eligible", time: "45 days" },
        ],
        milestone: "504 or IEP in place, effective treatment plan established",
        alert: "Put your evaluation request IN WRITING — this starts the legal clock",
      },
      {
        age: "14–17", label: "Transition & Self-Advocacy", color: AMBER, bg: "#FFFBEB", icon: "🎓",
        trigger: "Growing independence, learning self-management",
        description: "Adolescence with ADHD brings a unique challenge: your child needs to start managing their own disability. Executive function skills — planning, organization, time management, emotional regulation — are exactly the things ADHD makes harder. The transition IEP should include self-advocacy goals: Can your teen explain their diagnosis? Can they request accommodations? Can they manage their own medication? These skills are more valuable than any grade. If your teen is heading to college, they'll need to self-identify and request accommodations — the school won't do it for them anymore. If they're heading to work, DOR can help with job skills and placement. You're shifting from doing it for them to coaching them to do it themselves. That's hard. But it's the goal.",
        entities: [
          { name: "School District", action: "Transition IEP with self-advocacy goals", time: "By age 16" },
          { name: "DOR", action: "Vocational support if employment barrier", time: "Apply at 16" },
          { name: "Insurance", action: "Continued therapy and medication", time: "Ongoing" },
          { name: "College Disability Services", action: "Research accommodations process", time: "Junior year" },
        ],
        milestone: "Self-advocacy skills developing, post-secondary plan in place",
        alert: "College accommodations require self-identification — practice now",
      },
      {
        age: "18+", label: "Adult Life", color: CORAL, bg: "#FFF7ED", icon: "🧑‍💼",
        trigger: "Self-management, employment, continued treatment",
        description: "ADHD doesn't go away at 18 — but the support system changes dramatically. Your young adult is now responsible for their own healthcare, medication management, and accommodation requests. If they're in college, they'll work with disability services. If they're working, ADA protections apply. SSI may continue if the disability is severe enough to limit employment. The most important thing you've given your child isn't any single service — it's the understanding that their brain works differently, that it's not a character flaw, and that they have the right to ask for what they need. That's a gift that lasts a lifetime.",
        entities: [
          { name: "Insurance / Medi-Cal", action: "Continued medication and therapy coverage", time: "Ongoing" },
          { name: "College / Employer", action: "ADA accommodations, disability services", time: "Self-identify" },
          { name: "SSI", action: "May continue if severe functional limitations", time: "Adult review" },
          { name: "DOR", action: "Job coaching and placement support", time: "If needed" },
        ],
        milestone: "Independent self-management of ADHD with appropriate supports",
        alert: "Health insurance coverage — ensure no gap at age 26 (parent plan cutoff)",
      },
    ],
  },

  "Intellectual Disability": {
    icon: "🌱", color: SAGE, subtitle: "Intellectual & Developmental Disability",
    intro: "Intellectual disability is a primary qualifying diagnosis for Regional Center — your child is entitled to lifelong services under the Lanterman Act. The journey is long, but the support infrastructure is comprehensive.",
    phases: [
      {
        age: "0–3", label: "Early Intervention", color: VIOLET, bg: "#F5F3FF", icon: "👶",
        trigger: "Developmental delays identified",
        description: "You may have noticed your baby wasn't meeting milestones at the same pace as other children — or a pediatrician may have raised the concern. Either way, the word 'delay' can feel heavy. But delay doesn't define your child's potential — it describes where they are right now, and early intervention is designed to close that gap as much as possible. Your child qualifies for Regional Center services, which means a service coordinator, an Individualized Family Service Plan, and therapies delivered in your home. You are not expected to be a therapist. You are expected to be a parent. The professionals come to you.",
        entities: [
          { name: "Pediatrician", action: "Developmental screening and referral", time: "Immediate" },
          { name: "Regional Center", action: "Early Start → IFSP with full services", time: "45 days" },
          { name: "Early Start", action: "Speech, OT, developmental therapies", time: "Ongoing" },
          { name: "Medi-Cal", action: "Full healthcare coverage", time: "45 days" },
          { name: "Insurance", action: "Therapy authorizations as applicable", time: "Ongoing" },
        ],
        milestone: "IFSP active, developmental therapies in progress",
        alert: "RC determination for ID is straightforward — don't delay the referral",
      },
      {
        age: "3–5", label: "Transition to School", color: TEAL, bg: "#F0FDFA", icon: "🎒",
        trigger: "First IEP, school placement, expanded services",
        description: "School is a new world — and for a child with intellectual disability, the IEP is the document that shapes their entire educational experience. Insist on meaningful inclusion whenever possible. Your child has the right to be educated alongside their peers to the maximum extent appropriate. The IEP should include functional skills, communication goals, and social skills — not just academics. Apply for IHSS now if you haven't already. SSI eligibility is strong for children with ID. The Regional Center continues providing services alongside the school system — they complement each other, and you deserve both.",
        entities: [
          { name: "School District", action: "Assessment → IEP with functional goals", time: "90 days" },
          { name: "Regional Center", action: "Lanterman eligibility — strong case for ID", time: "120 days" },
          { name: "IHSS", action: "In-home support hours", time: "30–60 days" },
          { name: "SSI", action: "Strong eligibility — apply now", time: "3–6 months" },
          { name: "Insurance", action: "Therapy coverage continues", time: "Ongoing" },
        ],
        milestone: "IEP with inclusive goals, SSI and IHSS established",
        alert: "Inclusion is the legal presumption — the school must justify any removal",
      },
      {
        age: "5–13", label: "School Years", color: SKY, bg: "#F0F9FF", icon: "📚",
        trigger: "Ongoing education, life skills development, annual reviews",
        description: "The school years are a marathon, not a sprint. Your child is learning — maybe not at the same pace or in the same way as their peers, but they are learning. Celebrate the progress, even when it feels small. Annual IEPs should focus on functional life skills alongside academics: communication, self-care, safety awareness, social skills, and community participation. The Regional Center IPP should complement the IEP, not duplicate it. And don't forget about yourself. Caregiver burnout is real, and respite care exists for a reason. Asking for help is not a failure — it's good parenting.",
        entities: [
          { name: "School District", action: "Annual IEP with life skills focus", time: "Yearly" },
          { name: "Regional Center", action: "Respite care, social skills groups, camps", time: "Annual IPP" },
          { name: "IHSS", action: "Annual reassessment", time: "Yearly" },
          { name: "Insurance", action: "Therapy re-authorizations", time: "Ongoing" },
          { name: "CalABLE", action: "Start long-term savings", time: "Any time" },
        ],
        milestone: "Consistent progress on functional goals, family supported",
        alert: "Request respite care through RC — caregiver wellbeing matters",
      },
      {
        age: "14–17", label: "Transition Planning", color: AMBER, bg: "#FFFBEB", icon: "🎓",
        trigger: "Transition IEP, adult life planning, legal preparation",
        description: "What does a good life look like for your child as an adult? That question is at the heart of transition planning, and the answer is deeply personal. For some families, it's supported employment and a shared living arrangement. For others, it's a day program with community activities. There is no wrong answer — only the one that fits your child. The transition IEP should include vocational assessments, community-based instruction, and independent living skills. DOR should be at the IEP table. The Regional Center assigns a transition coordinator. And the legal questions — conservatorship, Supported Decision-Making, Special Needs Trusts — need attention before your child turns 18. It's a lot. Take it one step at a time.",
        entities: [
          { name: "School District", action: "Transition IEP — vocational, community-based", time: "By age 16" },
          { name: "DOR", action: "Supported employment and job training", time: "Apply at 16" },
          { name: "Regional Center", action: "Adult service planning begins", time: "Age 14–16" },
          { name: "SNT / CalABLE", action: "Financial protection for adulthood", time: "Start now" },
          { name: "Conservatorship / SDM", action: "Legal decision-making framework", time: "Before 18" },
        ],
        milestone: "Transition plan active, adult services identified, legal framework set",
        alert: "Limited conservatorship is most common for ID — start 6–12 months before 18",
      },
      {
        age: "18+", label: "Adult Life", color: CORAL, bg: "#FFF7ED", icon: "🏠",
        trigger: "Lifelong services through RC, SSI, IHSS, Medi-Cal",
        description: "This is the life you've been building toward — and it can be a beautiful one. Adults with intellectual disabilities are living fuller, more connected lives than ever before. Supported employment, day programs, community integration, shared living, and independent living services are all available through the Regional Center. SSI provides income. Medi-Cal provides healthcare. IHSS provides daily support. The Self-Determination Program gives your adult child (or you, as their conservator) direct control over the RC budget to design services that truly fit their life. You have navigated one of the most complex systems in the country for your child's entire life. You've earned every good thing that comes from it.",
        entities: [
          { name: "Regional Center", action: "Day programs, SLS/ILS, employment, community", time: "Lifelong" },
          { name: "SSI / Medi-Cal", action: "Income + healthcare", time: "Lifelong" },
          { name: "IHSS", action: "Daily living support", time: "Lifelong" },
          { name: "Self-Determination", action: "Person-centered budget control", time: "If enrolled" },
          { name: "Special Needs Trust", action: "Lifetime asset protection", time: "Lifelong" },
        ],
        milestone: "Meaningful adult life with community, employment, and support",
        alert: "SSI $2K resource limit — CalABLE & SNT are essential",
      },
    ],
  },

  "Epilepsy": {
    icon: "🧠", color: ROSE, subtitle: "Seizure Disorders",
    intro: "Epilepsy qualifies for Regional Center as a primary diagnosis. CCS plays a significant role in neurological care. The unpredictability of seizures adds unique challenges to school, caregiving, and daily life.",
    phases: [
      {
        age: "0–5", label: "Diagnosis & Stabilization", color: VIOLET, bg: "#F5F3FF", icon: "👶",
        trigger: "First seizure, diagnosis, medication management",
        description: "Watching your child have a seizure is one of the most terrifying experiences a parent can have. Nothing prepares you for it. In the aftermath — the ER visits, the EEGs, the medication trials — it's easy to feel like you're drowning in medical jargon and fear. But you are doing the right things by seeking answers. Epilepsy is a qualifying diagnosis for Regional Center services under the Lanterman Act. CCS provides neurological care through paneled specialists. And if your child has developmental delays alongside epilepsy — which is common — Early Start services can begin right away. You don't have to have all the answers. You just need to take the next step.",
        entities: [
          { name: "Neurologist", action: "EEG, diagnosis, medication management", time: "Immediate" },
          { name: "Regional Center", action: "Early Start if developmental delays present", time: "45 days" },
          { name: "CCS", action: "Neurological specialty care", time: "30 days" },
          { name: "Insurance", action: "Medication and specialist coverage", time: "Ongoing" },
          { name: "Medi-Cal", action: "Apply for comprehensive coverage", time: "45 days" },
        ],
        milestone: "Seizures managed, developmental supports in place",
        alert: "CCS covers neurology regardless of income — apply immediately",
      },
      {
        age: "5–13", label: "School & Safety", color: SKY, bg: "#F0F9FF", icon: "📚",
        trigger: "Seizure action plan at school, IEP/504 accommodations",
        description: "School with epilepsy requires a layer of safety planning that other families don't think about. Your child needs a seizure action plan on file. Staff need to be trained. Rescue medication may need to be available. And the cognitive effects of both the seizures and the medications — memory, attention, processing speed — may need to be addressed through an IEP or 504 Plan. You may feel anxious every time you drop your child off. That anxiety is valid. But with the right plans in place, your child can thrive at school. Don't hesitate to push for the supports they need — this is their legal right.",
        entities: [
          { name: "School District", action: "IEP or 504 — seizure plan, cognitive accommodations", time: "60 days" },
          { name: "School Nurse", action: "Seizure action plan, rescue medication training", time: "Immediate" },
          { name: "CCS / Neurology", action: "Ongoing medication management", time: "Quarterly" },
          { name: "IHSS", action: "Protective supervision if seizures are uncontrolled", time: "30–60 days" },
          { name: "SSI", action: "Eligible if seizures cause substantial limitations", time: "3–6 months" },
        ],
        milestone: "Safe school environment, effective seizure management",
        alert: "Seizure action plan must be updated annually and after any med changes",
      },
      {
        age: "14+", label: "Transition & Adult Life", color: AMBER, bg: "#FFFBEB", icon: "🎓",
        trigger: "Driving restrictions, employment planning, adult neurology",
        description: "Epilepsy in adolescence and adulthood brings questions other families don't face. Driving restrictions (CA requires seizure-free periods). Employment considerations. The social stigma that still, unfairly, surrounds seizure disorders. Transition planning should address all of this — vocational goals that account for seizure safety, self-management of medication, and planning for the transfer from pediatric to adult neurology. If seizures are well-controlled, many adults with epilepsy live fully independent lives. If they're not, IHSS protective supervision, Regional Center services, and SSI provide a safety net. Either way, your child deserves a plan that's built around possibilities, not limitations.",
        entities: [
          { name: "School District", action: "Transition IEP — employment, self-management", time: "By age 16" },
          { name: "DOR", action: "Vocational rehab with seizure accommodations", time: "Apply at 16" },
          { name: "Adult Neurology", action: "Transfer from pediatric to adult provider", time: "Age 18" },
          { name: "DMV", action: "Seizure-free driving requirements", time: "Varies" },
          { name: "SSI / IHSS", action: "Continue if seizures limit function", time: "Lifelong" },
          { name: "Regional Center", action: "Adult services if DD co-occurs", time: "Lifelong" },
        ],
        milestone: "Successful transition to adult medical care and employment/support",
        alert: "CA requires 3–6 month seizure-free period to drive — plan transportation",
      },
    ],
  },

  "Multiple Disabilities": {
    icon: "🌈", color: "#8B5CF6", subtitle: "Co-occurring Diagnoses (e.g., Autism + CP)",
    intro: "When your child has multiple diagnoses, the complexity multiplies. More agencies, more providers, more paperwork. But eligibility is also typically stronger across the board, and you have more leverage to request comprehensive services.",
    phases: [
      {
        age: "0–3", label: "Early Intervention", color: VIOLET, bg: "#F5F3FF", icon: "👶",
        trigger: "Multiple diagnoses identified, often from birth or NICU",
        description: "When your child has more than one diagnosis, the early days can feel like an avalanche — multiple specialists, multiple therapies, multiple systems all demanding your attention at once. It's easy to feel like you're failing because you can't keep up with everything. You're not failing. You're parenting a child with complex needs in a system that wasn't designed to be this complicated. The good news: multiple diagnoses typically mean stronger eligibility for services across the board. Regional Center, CCS, IHSS, SSI — your child likely qualifies for all of them. The challenge is coordinating them. Let your Regional Center service coordinator help. That's literally their job.",
        entities: [
          { name: "Medical Team", action: "Multi-specialty coordination", time: "Immediate" },
          { name: "Regional Center", action: "Early Start — comprehensive IFSP", time: "45 days" },
          { name: "CCS", action: "Medical specialty care", time: "30 days" },
          { name: "Early Start", action: "Multiple therapies (PT, OT, speech, ABA)", time: "Ongoing" },
          { name: "Insurance / Medi-Cal", action: "Complex care coordination", time: "Ongoing" },
        ],
        milestone: "All diagnoses addressed, comprehensive therapy plan in place",
        alert: "Ask RC for a service coordinator experienced with complex cases",
      },
      {
        age: "3–13", label: "School Years", color: SKY, bg: "#F0F9FF", icon: "📚",
        trigger: "IEP under Multiple Disabilities category, intensive services",
        description: "Your child's IEP will be one of the most detailed documents the school produces — and it needs to be. Multiple disabilities mean multiple goals, multiple service providers, and multiple accommodations. Don't settle for an IEP that addresses one diagnosis but ignores the others. The school is required to address all of your child's disability-related needs. Meanwhile, the Regional Center, IHSS, insurance, and CCS are all running in parallel. You are the only person who sees the whole picture. That makes you the most important person on every team your child has. Use that power. Speak up in every meeting. Write follow-up emails. Document everything.",
        entities: [
          { name: "School District", action: "IEP — Multiple Disabilities, comprehensive goals", time: "Annual" },
          { name: "Regional Center", action: "Full service package — respite, therapies, equipment", time: "Annual IPP" },
          { name: "CCS", action: "Ongoing medical specialty care", time: "As needed" },
          { name: "IHSS", action: "High hours — multiple care needs", time: "Yearly" },
          { name: "Insurance", action: "Multi-specialty authorizations", time: "Ongoing" },
          { name: "CalABLE / SSI", action: "Financial supports and savings", time: "Ongoing" },
        ],
        milestone: "Comprehensive IEP, all service systems active and coordinated",
        alert: "Document everything — email follow-ups create a paper trail you'll need",
      },
      {
        age: "14+", label: "Transition & Adult Life", color: AMBER, bg: "#FFFBEB", icon: "🎓",
        trigger: "Complex transition planning across multiple service systems",
        description: "Transition with multiple disabilities is the most complex version of an already complex process. Every system needs a plan. The school needs a transition IEP. The Regional Center needs an adult services plan. DOR needs a vocational assessment. SSI needs an adult re-evaluation. Legal planning — conservatorship, SDM, Special Needs Trusts — is almost certainly necessary. But here's what I want you to hear: the fact that this is complex doesn't mean it's impossible. You have done harder things than this. You have navigated this system for your child's entire life. You have built a team, learned the law, and fought for every service. This is the final major transition, and you have everything you need to make it work. The life ahead can be a good one. You've made sure of that.",
        entities: [
          { name: "School District", action: "Comprehensive transition IEP", time: "By age 16" },
          { name: "DOR", action: "Multi-disability vocational assessment", time: "Apply at 16" },
          { name: "Regional Center", action: "Complex adult service coordination", time: "Age 14+" },
          { name: "SSI / Medi-Cal", action: "Adult re-evaluation, continued coverage", time: "At age 18" },
          { name: "IHSS", action: "Continued high-hour support", time: "Lifelong" },
          { name: "Conservatorship / SNT", action: "Legal and financial protection", time: "Before 18" },
        ],
        milestone: "All adult systems in place, comprehensive support network established",
        alert: "Start adult transition planning at 14 — complex cases need extra time",
      },
    ],
  },
};

// ===================== COMPONENT =====================

export default function JourneyMaps() {
  const journeyKeys = Object.keys(JOURNEYS);
  const [activeDx, setActiveDx] = useState(journeyKeys[0]);
  const [expanded, setExpanded] = useState(0);
  const journey = JOURNEYS[activeDx];

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", background: "#FAFBFC", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(165deg, ${NAVY} 0%, #0C3654 100%)`, padding: "28px 16px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${TEAL}, ${SAGE})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 800 }}>◎</div>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>WAYPOINT</span>
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 30, color: "#fff", lineHeight: 1.2, margin: "0 0 6px" }}>
            Journey Maps
          </h1>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, margin: "0 auto 20px", maxWidth: 480 }}>
            Every path is different. Select your child's diagnosis to see the agencies, milestones, and deadlines ahead.
          </p>

          {/* Diagnosis tabs */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
            {journeyKeys.map(dx => {
              const j = JOURNEYS[dx];
              const active = dx === activeDx;
              return (
                <button key={dx} onClick={() => { setActiveDx(dx); setExpanded(0); }}
                  style={{
                    padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                    background: active ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
                    color: active ? "#fff" : "rgba(255,255,255,0.5)",
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    transition: "all 0.2s",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                  <span style={{ fontSize: 16 }}>{j.icon}</span> {dx}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Journey content */}
      <div style={{ padding: "24px 16px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          {/* Journey intro */}
          <div style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", marginBottom: 20, border: "1px solid #E2E8F0", display: "flex", gap: 16, alignItems: "flex-start" }}>
            <span style={{ fontSize: 36 }}>{journey.icon}</span>
            <div>
              <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 24, color: NAVY, margin: "0 0 4px" }}>{activeDx}</h2>
              <p style={{ fontSize: 13, color: journey.color, fontWeight: 600, margin: "0 0 8px" }}>{journey.subtitle}</p>
              <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6, margin: 0 }}>{journey.intro}</p>
            </div>
          </div>

          {/* Timeline */}
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 43, top: 0, bottom: 0, width: 3, background: "linear-gradient(to bottom, #E2E8F0, #CBD5E1, #E2E8F0)", borderRadius: 2, zIndex: 0 }} />

            {journey.phases.map((phase, i) => {
              const isOpen = expanded === i;
              return (
                <div key={i} style={{ position: "relative", marginBottom: 12, zIndex: 1 }}>
                  <div onClick={() => setExpanded(isOpen ? null : i)}
                    style={{
                      display: "flex", gap: 14, cursor: "pointer",
                      background: isOpen ? phase.bg : "#fff",
                      borderRadius: 16, border: `2px solid ${isOpen ? phase.color + "50" : "#E2E8F0"}`,
                      padding: isOpen ? "18px 20px" : "12px 18px",
                      transition: "all 0.3s ease",
                      boxShadow: isOpen ? `0 4px 20px ${phase.color}10` : "0 1px 3px rgba(0,0,0,0.04)",
                      alignItems: "flex-start",
                    }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: `linear-gradient(140deg, ${phase.color}, ${phase.color}BB)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20, boxShadow: `0 2px 10px ${phase.color}25`,
                    }}>{phase.icon}</div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: phase.color, background: phase.color + "15", padding: "2px 9px", borderRadius: 5, letterSpacing: 0.5 }}>
                          AGE {phase.age}
                        </span>
                        <span style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>{phase.label}</span>
                      </div>
                      <p style={{ fontSize: 12, color: "#64748B", margin: "3px 0 0" }}>{phase.trigger}</p>

                      {isOpen && (
                        <div style={{ marginTop: 14 }}>
                          <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", marginBottom: 14, border: `1px solid ${phase.color}15`, borderLeft: `4px solid ${phase.color}` }}>
                            <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.8, margin: 0 }}>{phase.description}</p>
                          </div>

                          <p style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Key agencies</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            {phase.entities.map((ent, j) => (
                              <div key={j} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 9, padding: "8px 12px", border: "1px solid #E2E8F0" }}>
                                <div style={{ width: 7, height: 7, borderRadius: "50%", background: phase.color, flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{ent.name}</span>
                                  <span style={{ fontSize: 12, color: "#64748B", marginLeft: 5 }}>— {ent.action}</span>
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 600, color: phase.color, background: phase.color + "12", padding: "2px 8px", borderRadius: 5, whiteSpace: "nowrap", flexShrink: 0 }}>{ent.time}</span>
                              </div>
                            ))}
                          </div>

                          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                            <div style={{ flex: 1, minWidth: 180, background: SAGE + "0D", borderRadius: 10, padding: "10px 14px", border: `1px solid ${SAGE}22` }}>
                              <span style={{ fontSize: 10, fontWeight: 800, color: SAGE, textTransform: "uppercase", letterSpacing: 0.5 }}>✓ Milestone</span>
                              <p style={{ fontSize: 12, color: NAVY, margin: "4px 0 0", fontWeight: 600 }}>{phase.milestone}</p>
                            </div>
                            <div style={{ flex: 1, minWidth: 180, background: CORAL + "0D", borderRadius: 10, padding: "10px 14px", border: `1px solid ${CORAL}22` }}>
                              <span style={{ fontSize: 10, fontWeight: 800, color: CORAL, textTransform: "uppercase", letterSpacing: 0.5 }}>⏰ Deadline</span>
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

          {/* Bottom CTA */}
          <div style={{ textAlign: "center", background: `linear-gradient(135deg, ${NAVY}, #0F2847)`, borderRadius: 16, padding: "28px 20px", marginTop: 24 }}>
            <p style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 20, color: "#fff", margin: "0 0 8px" }}>
              You shouldn't have to be the expert. That's our job.
            </p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", margin: "0 auto 16px", maxWidth: 460, lineHeight: 1.6 }}>
              Waypoint maps every entity, deadline, and right for your child's specific diagnosis — so you can focus on what matters most.
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: TEAL, color: "#fff", padding: "11px 26px", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 14px ${TEAL}40` }}>
              🧭 Join the Waitlist
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
