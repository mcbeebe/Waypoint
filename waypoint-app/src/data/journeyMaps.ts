/**
 * Diagnosis-specific journey maps for California disability services.
 *
 *  - gas-mvp/Index.html — JOURNEY_MAP_DATA / JOURNEY_MAP_DEFAULT (~lines 1708–1913),
 *    getJourneyForDiagnosis() (~1917–1929), getJourneyPhaseForAge() (~1035–1061)
 *  - Waypoint-Journey-Maps.jsx — richer ancestor; its finer-grained phases win where
 *    it has more phases than gas-mvp (autism, down, cp, adhd, id). The JSX `trigger`
 *    field is intentionally dropped.
  *
 * NOTE ON ACCURACY (added after the Aug 2026 content audit): this file contains
 * dated legal figures and statutory timelines. It is NOT frozen — when a law,
 * rate, or deadline changes, UPDATE IT, and verify edits against current
 * primary sources (DDS, SSA, CA Ed Code). Dollar amounts and ages are marked
 * with their year where possible. src/data/contentFacts.test.ts guards against
 * known-stale values reappearing.
 */

import type { Journey } from './types';

export const JOURNEY_MAP_DATA: Record<string, Journey> = {
  autism: {
    icon: '🧩',
    title: 'Autism (ASD)',
    subtitle: 'Autism Spectrum Disorder',
    color: '#7C3AED',
    intro: 'The autism journey touches nearly every system — Regional Center, school, insurance, SSI, IHSS, and more. It\'s the most complex path, but also the one with the most resources available if you know where to look.',
    phases: [
      {
        age: '0–3', label: 'Early Intervention', color: '#7C3AED', bg: '#F5F3FF', icon: '👶',
        description: 'This is often the hardest moment — the one where everything shifts. Whether you noticed something yourself or a pediatrician raised a concern, you\'re now standing at the beginning of a path you never expected. Take a breath. You are not behind. The fact that you\'re seeking answers means you\'re already advocating for your child. Early intervention is the single most impactful thing you can do, and California has strong programs designed to help your family right now. You don\'t need to have it all figured out today.',
        entities: [
          { name: 'Pediatrician', action: 'Referral for developmental evaluation', time: 'Immediate' },
          { name: 'Regional Center', action: 'Early Start intake → IFSP development', time: '45 days' },
          { name: 'Early Start', action: 'Home-based speech, OT, ABA therapies', time: 'Ongoing' },
          { name: 'Insurance', action: 'ABA therapy authorization (CA mandate)', time: '30 days' },
          { name: 'Medi-Cal', action: 'Apply if income-eligible for full coverage', time: '45 days' },
        ],
        milestone: 'IFSP in place, therapies started',
        alert: 'RC intake must happen within 45 days of referral',
      },
      {
        age: '3–5', label: 'Transition to School', color: '#0891B2', bg: '#F0FDFA', icon: '🎒',
        description: 'Your child is growing, and so is the system around them. At age 3, responsibility shifts from the Regional Center\'s Early Start program to your local school district — and that transition can feel like starting over. New people, new acronyms, new meetings. It\'s normal to feel overwhelmed. But here\'s what matters: your child has a legal right to a Free Appropriate Public Education, and you have a seat at that IEP table as an equal member of the team. Your voice matters more than anyone else\'s in that room.',
        entities: [
          { name: 'School District', action: 'Assessment plan (15 days) → eval + first IEP within 60 days of consent', time: '~75 days' },
          { name: 'Regional Center', action: 'Lanterman eligibility determination', time: '120 days' },
          { name: 'IHSS', action: 'Apply for paid in-home support hours', time: '30–60 days' },
          { name: 'SSI', action: 'Apply if income-eligible', time: '3–6 months' },
          { name: 'Insurance', action: 'Continue ABA + therapy authorizations', time: 'Ongoing' },
        ],
        milestone: 'IEP active, RC services confirmed, IHSS hours set',
        alert: 'Transition planning must start 6 months before 3rd birthday',
      },
      {
        age: '5–13', label: 'School Years', color: '#0EA5E9', bg: '#F0F9FF', icon: '📚',
        description: 'You\'ve made it through the early chaos. By now you have systems in place — and your main job is to protect them. Annual IEP meetings, insurance re-authorizations, IHSS reassessments — it can feel repetitive, but each one is an opportunity to make sure your child\'s services keep pace with their growth. You know more than you think you do. The parent who sat in that first IEP meeting terrified? That parent is now the expert on their child.',
        entities: [
          { name: 'School District', action: 'Annual IEP reviews + triennial reassessments', time: 'Yearly / 3 yr' },
          { name: 'Regional Center', action: 'Annual IPP review and goal updates', time: 'Yearly' },
          { name: 'Insurance', action: 'Therapy re-authorizations', time: 'Every 3–12 mo' },
          { name: 'IHSS', action: 'Annual hour reassessment', time: 'Yearly' },
          { name: 'CalABLE', action: 'Open tax-advantaged savings account', time: 'Any time' },
        ],
        milestone: 'Stable services, financial planning started',
        alert: 'Request an IEE if you disagree with the school\'s assessment',
      },
      {
        age: '14–17', label: 'Transition Planning', color: '#D97706', bg: '#FFFBEB', icon: '🎓',
        description: 'Your child is becoming a young adult, and the system needs to start planning for that — even if it feels too soon. Transition planning is about asking big, hopeful questions: What does a good life look like for my child after school? By law, your child\'s IEP must include transition goals by age 16. This is also when legal planning begins — conservatorship or supported decision-making. You\'re building a bridge, and you don\'t have to build it alone.',
        entities: [
          { name: 'School District', action: 'Transition IEP with post-secondary goals', time: 'By age 16' },
          { name: 'DOR', action: 'Vocational rehab referral and job training', time: 'Apply at 16' },
          { name: 'Regional Center', action: 'Transition coordinator assigned', time: 'Age 14–16' },
          { name: 'SNT / CalABLE', action: 'Long-term financial planning', time: 'Start now' },
          { name: 'Conservatorship', action: 'Research conservatorship vs. SDM options', time: '6–12 mo before 18' },
        ],
        milestone: 'Transition plan in IEP, DOR engaged, legal planning started',
        alert: 'Start conservatorship process 6–12 months before age 18',
      },
      {
        age: '18–22', label: 'Young Adulthood', color: '#F97316', bg: '#FFF7ED', icon: '🧑‍💼',
        description: 'Your child is legally an adult now — and the system treats them differently overnight. SSI eligibility is re-evaluated using adult criteria, which is often easier to qualify for since parental income is no longer counted. Your child still has the right to FAPE through age 22. You\'ve been doing this for almost two decades. You are your child\'s greatest advocate, and that doesn\'t change with a birthday.',
        entities: [
          { name: 'SSA', action: 'Adult SSI re-evaluation (new criteria)', time: 'At age 18' },
          { name: 'School District', action: 'Entitled to FAPE through age 22', time: 'Until 22' },
          { name: 'Regional Center', action: 'Adult services — day programs, SLS', time: 'Ongoing' },
          { name: 'DOR', action: 'Job training and supported employment', time: 'Ongoing' },
          { name: 'Medi-Cal', action: 'Ensure continuous healthcare coverage', time: 'Ongoing' },
        ],
        milestone: 'Adult benefits secured, employment or day program in place',
        alert: 'Gather IEP records — key evidence for SSI adult approval',
      },
      {
        age: '22+', label: 'Adult Life', color: '#E11D48', bg: '#FFF1F2', icon: '🏠',
        description: 'The school years are behind you, and your child is living their adult life. For many families, this moment carries a mix of pride, grief, and worry — and all of those feelings are valid. Every step you\'ve taken has built a foundation of rights, services, and protections that will support your child for life. You did this. And Waypoint is here for every chapter that comes next.',
        entities: [
          { name: 'Regional Center', action: 'IPP: housing, employment, day programs', time: 'Lifelong' },
          { name: 'SSI / Medi-Cal', action: 'Monthly income + full health coverage', time: 'Lifelong' },
          { name: 'IHSS', action: 'In-home supportive services continue', time: 'Lifelong' },
          { name: 'Self-Determination', action: 'Direct control over RC service budget', time: 'If enrolled' },
          { name: 'Special Needs Trust', action: 'Protect assets without losing SSI', time: 'Lifelong' },
        ],
        milestone: 'Stable adult support system in place',
        alert: 'SSI $2K resource limit — CalABLE & SNT protect savings',
      },
    ],
  },
  down: {
    icon: '💛',
    title: 'Down Syndrome',
    subtitle: 'Trisomy 21',
    color: '#D97706',
    intro: 'Down syndrome is an \'established risk\' condition — meaning your child qualifies for Regional Center services from day one, often before they even leave the hospital. The medical needs may be greater early on, but the support systems are strong.',
    phases: [
      {
        age: '0–3', label: 'Early Days', color: '#7C3AED', bg: '#F5F3FF', icon: '👶',
        description: 'Your baby is here, and they are perfect and yours. A Down syndrome diagnosis often comes at birth — sometimes even before — and it can hit you in ways you didn\'t expect. There may be medical needs right away, including cardiac screenings that feel urgent and scary. But here\'s what you need to know: there is an entire community of families who have walked this path before you, and the support systems in California are among the strongest in the country. Your Regional Center referral can happen while you\'re still in the hospital. Early Start therapies can begin within weeks. You are not starting from scratch — you\'re stepping into a system that is ready for you.',
        entities: [
          { name: 'Hospital / NICU', action: 'Cardiac screening, genetic confirmation', time: 'At birth' },
          { name: 'Regional Center', action: 'Early Start referral (established risk)', time: '45 days' },
          { name: 'CCS', action: 'California Children\'s Services for cardiac care', time: '30 days' },
          { name: 'Early Start', action: 'PT, OT, speech (home-based)', time: 'Ongoing' },
          { name: 'Medi-Cal', action: 'Apply for full health coverage', time: '45 days' },
          { name: 'Insurance', action: 'Specialist and therapy authorizations', time: 'Ongoing' },
        ],
        milestone: 'Early Start therapies in place, cardiac care established',
        alert: 'CCS referral is critical if cardiac conditions are present',
      },
      {
        age: '3–5', label: 'Transition to School', color: '#0891B2', bg: '#F0FDFA', icon: '🎒',
        description: 'The shift to school can feel bittersweet — you\'ve built relationships with your Early Start team, and now it\'s time to start over with new people. But your child\'s rights are strong. Children with Down syndrome typically qualify under the Intellectual Disability or Multiple Disabilities categories for an IEP, and inclusive education is the starting presumption under the law. Don\'t let anyone tell you your child \'can\'t\' be in a general education classroom without the IEP team considering it first. This is also the right time to apply for IHSS and SSI — your child has strong eligibility for both.',
        entities: [
          { name: 'School District', action: 'Assessment → IEP with inclusion plan', time: '~75 days' },
          { name: 'Regional Center', action: 'Transition from Early Start to Lanterman services', time: '120 days' },
          { name: 'IHSS', action: 'Apply for in-home support hours', time: '30–60 days' },
          { name: 'SSI', action: 'Strong eligibility — apply now', time: '3–6 months' },
          { name: 'CCS', action: 'Ongoing cardiac / medical specialist care', time: 'Ongoing' },
        ],
        milestone: 'IEP active with inclusion goals, SSI and IHSS in place',
        alert: 'Transition planning starts 6 months before 3rd birthday',
      },
      {
        age: '5–13', label: 'School Years', color: '#0EA5E9', bg: '#F0F9FF', icon: '📚',
        description: 'Your child is in school, making friends, and growing in ways that may surprise everyone — including the professionals. This is the stage where you advocate for high expectations. Children with Down syndrome thrive when they\'re included, challenged, and supported. Push for meaningful goals, not just \'compliance\' goals. Monitor thyroid function, vision, hearing, and cardiac health annually — these are common medical needs that your pediatrician and CCS should be tracking. And don\'t forget: you are the constant in your child\'s life. Teachers change, therapists rotate, but you are always there.',
        entities: [
          { name: 'School District', action: 'Annual IEP + triennial reassessments', time: 'Yearly / 3 yr' },
          { name: 'Regional Center', action: 'Annual IPP review', time: 'Yearly' },
          { name: 'CCS / Specialists', action: 'Cardiac, thyroid, vision, hearing monitoring', time: 'Annually' },
          { name: 'IHSS', action: 'Annual reassessment of hours', time: 'Yearly' },
          { name: 'CalABLE', action: 'Start building long-term savings', time: 'Any time' },
        ],
        milestone: 'Inclusive education, stable medical care, savings started',
        alert: 'Annual thyroid, cardiac, vision, and hearing checks are essential',
      },
      {
        age: '14–17', label: 'Transition Planning', color: '#D97706', bg: '#FFFBEB', icon: '🎓',
        description: 'The question shifts from \'What does my child need in school?\' to \'What does a good adult life look like?\' This can bring up deep emotions — and that\'s okay. Transition planning for a young person with Down syndrome should focus on their strengths, interests, and dreams. Many adults with Down syndrome work, live semi-independently, and have rich social lives. The foundation you lay now — vocational training through DOR, supported decision-making vs. conservatorship, financial planning through CalABLE and SNTs — determines how much independence and security your child will have as an adult.',
        entities: [
          { name: 'School District', action: 'Transition IEP with vocational goals', time: 'By age 16' },
          { name: 'DOR', action: 'Job training, supported employment', time: 'Apply at 16' },
          { name: 'Regional Center', action: 'Transition planning coordinator', time: 'Age 14–16' },
          { name: 'SNT / CalABLE', action: 'Financial and estate planning', time: 'Start now' },
          { name: 'Conservatorship / SDM', action: 'Legal decision-making options', time: '6–12 mo before 18' },
        ],
        milestone: 'Vocational plan active, legal and financial framework in place',
        alert: 'Explore Supported Decision-Making before defaulting to conservatorship',
      },
      {
        age: '18+', label: 'Adult Life', color: '#F97316', bg: '#FFF7ED', icon: '🏠',
        description: 'Your child is an adult. They may be working, living with support, participating in day programs, or building a life that looks different from what you once imagined — but is no less meaningful. SSI provides monthly income, Medi-Cal provides health coverage, IHSS provides daily support, and the Regional Center coordinates it all. If you\'ve enrolled in the Self-Determination Program, your adult child has real control over their budget and services. The work you\'ve done over these years — every IEP, every IPP, every phone call — has built the life your child is living now. You should be proud.',
        entities: [
          { name: 'SSI / Medi-Cal', action: 'Monthly income + health coverage', time: 'Lifelong' },
          { name: 'Regional Center', action: 'Day programs, SLS, employment support', time: 'Lifelong' },
          { name: 'IHSS', action: 'In-home support continues', time: 'Lifelong' },
          { name: 'DOR', action: 'Ongoing supported employment', time: 'Ongoing' },
          { name: 'Special Needs Trust', action: 'Protect assets, plan for future', time: 'Lifelong' },
        ],
        milestone: 'Stable adult life with employment, housing, and community',
        alert: 'SSI $2K resource limit — CalABLE & SNT protect savings',
      },
    ],
  },
  cp: {
    icon: '💪',
    title: 'Cerebral Palsy',
    subtitle: 'Motor & Physical Disability',
    color: '#0891B2',
    intro: 'Cerebral palsy involves complex medical needs alongside developmental support. CCS (California Children\'s Services) plays a larger role here than in most other diagnoses, and IHSS hours tend to be higher due to physical care needs.',
    phases: [
      {
        age: '0–3', label: 'Early Intervention', color: '#7C3AED', bg: '#F5F3FF', icon: '👶',
        description: 'A CP diagnosis often comes after a frightening start — a difficult birth, a NICU stay, or months of watching your baby miss milestones that other babies seem to hit effortlessly. The guilt and grief you may feel are real, and they\'re normal. But your child is resilient, and so are you. California has one of the strongest early intervention systems in the country for children with physical disabilities. CCS provides specialized medical therapy. Regional Center provides developmental services. Early Start brings PT, OT, and speech into your home. You don\'t need to coordinate all of this alone — that\'s what the service coordinator is for.',
        entities: [
          { name: 'Pediatrician / Neurologist', action: 'Diagnosis, imaging, referrals', time: 'Immediate' },
          { name: 'Regional Center', action: 'Early Start intake → IFSP', time: '45 days' },
          { name: 'CCS', action: 'Medical Therapy Program — PT, OT', time: '30 days' },
          { name: 'Early Start', action: 'Developmental therapies (home-based)', time: 'Ongoing' },
          { name: 'Insurance', action: 'DME (wheelchair, stander, orthotics)', time: 'Prior auth' },
          { name: 'Medi-Cal', action: 'Full coverage including specialist care', time: '45 days' },
        ],
        milestone: 'Therapies in place, DME ordered, medical team established',
        alert: 'CCS Medical Therapy Program is free regardless of income',
      },
      {
        age: '3–5', label: 'Transition to School', color: '#0891B2', bg: '#F0FDFA', icon: '🎒',
        description: 'The transition to school introduces a new set of challenges — and they\'re not just educational. Your child\'s school needs to be physically accessible. Adaptive equipment needs to be in the classroom. Aides may need to be trained on transfers and feeding. It\'s a lot to coordinate, and you have every right to insist that it\'s done properly. The IEP should address not just academics but mobility, communication, self-care, and socialization. CCS continues providing medical therapy in many schools through the Medical Therapy Program (MTP), which operates right on campus. This is also the time to apply for IHSS — children with CP often qualify for high hours due to physical care needs.',
        entities: [
          { name: 'School District', action: 'IEP with physical accessibility, adaptive PE', time: '~75 days' },
          { name: 'CCS MTP', action: 'School-based physical and occupational therapy', time: 'Continues' },
          { name: 'Regional Center', action: 'Lanterman services — respite, adaptive equipment', time: '120 days' },
          { name: 'IHSS', action: 'High hours likely — bathing, feeding, mobility', time: '30–60 days' },
          { name: 'SSI', action: 'Strong eligibility for CP', time: '3–6 months' },
        ],
        milestone: 'Accessible IEP, school-based therapy, IHSS hours established',
        alert: 'CCS MTP operates in schools — ensure it\'s in the IEP',
      },
      {
        age: '5–13', label: 'School Years', color: '#0EA5E9', bg: '#F0F9FF', icon: '📚',
        description: 'Children with CP grow and change — and so do their needs. Growth spurts may mean new orthotics, new wheelchair fittings, new positioning equipment. Spasticity management may require Botox injections or orthopedic surgeries. Each of these changes ripples through the system: insurance authorizations, IEP modifications, IHSS reassessments. It can feel like a full-time job on top of actual parenting. But your child is also growing in ways that matter more — building friendships, discovering interests, developing their voice. Focus on the whole child, not just the medical chart. You are more than a case manager. You are a parent.',
        entities: [
          { name: 'School District', action: 'Adapted curriculum, assistive technology', time: 'Annual IEP' },
          { name: 'CCS / Ortho', action: 'Growth-related surgeries, orthotics, DME updates', time: 'As needed' },
          { name: 'Insurance', action: 'DME reauthorizations, specialist visits', time: 'Ongoing' },
          { name: 'Regional Center', action: 'Respite, adaptive recreation, home mods', time: 'Annual IPP' },
          { name: 'IHSS', action: 'Reassess hours as needs change', time: 'Yearly' },
        ],
        milestone: 'Adaptive equipment current, educational access maintained',
        alert: 'DME must be updated as child grows — don\'t wait for it to break',
      },
      {
        age: '14–17', label: 'Transition Planning', color: '#D97706', bg: '#FFFBEB', icon: '🎓',
        description: 'Transition for a young person with CP is about more than employment — it\'s about independence, mobility, communication, and living situation. What kind of support will they need as an adult? Where will they live? How will they get around? These are big questions, and they deserve thoughtful, person-centered answers. Assistive technology is often a game-changer at this stage — communication devices, powered mobility, smart home adaptations. DOR can fund vocational training and assistive tech for employment. The Regional Center begins planning for adult services. You\'re laying the groundwork for your child\'s adult life, and every decision matters.',
        entities: [
          { name: 'School District', action: 'Transition IEP — assistive tech, mobility, vocational', time: 'By age 16' },
          { name: 'DOR', action: 'Assistive tech funding, vocational rehab', time: 'Apply at 16' },
          { name: 'Regional Center', action: 'Adult living planning — SLS, ILS options', time: 'Age 14–16' },
          { name: 'SNT / CalABLE', action: 'Long-term financial security planning', time: 'Start now' },
          { name: 'Conservatorship / SDM', action: 'Legal options for decision-making', time: 'Before 18' },
        ],
        milestone: 'Assistive tech in place, adult living plan developed',
        alert: 'DOR can fund assistive technology for employment — apply early',
      },
      {
        age: '18+', label: 'Adult Life', color: '#F97316', bg: '#FFF7ED', icon: '🏠',
        description: 'Your child is an adult, and the physical needs don\'t go away — but neither does the support. IHSS provides daily hands-on care. The Regional Center coordinates housing (Supported Living Services or Independent Living Services), day programs, and community integration. CCS transitions to adult medical programs, and Medi-Cal ensures ongoing health coverage. Many adults with CP live rich, full, connected lives with the right supports in place. The infrastructure you\'ve built over these years — the medical team, the equipment, the services — carries forward. This is the life you\'ve been building toward. And it\'s a good one.',
        entities: [
          { name: 'IHSS', action: 'Daily personal care — often high hours', time: 'Lifelong' },
          { name: 'Regional Center', action: 'SLS/ILS, day programs, community access', time: 'Lifelong' },
          { name: 'SSI / Medi-Cal', action: 'Income + full medical coverage', time: 'Lifelong' },
          { name: 'CCS → Adult programs', action: 'Ongoing orthopedic, neurological care', time: 'Transition' },
          { name: 'Special Needs Trust', action: 'Asset protection for quality of life', time: 'Lifelong' },
        ],
        milestone: 'Independent or supported living established, medical care continuous',
        alert: 'CCS services end at age 21 — ensure Medi-Cal covers adult specialists',
      },
    ],
  },
  adhd: {
    icon: '⚡',
    title: 'ADHD',
    subtitle: 'Attention-Deficit/Hyperactivity Disorder',
    color: '#0EA5E9',
    intro: 'ADHD on its own does not qualify for Regional Center services under the Lanterman Act. Adding a co-occurring learning disability (such as dyslexia or dyscalculia) also does not qualify, because learning disabilities are not one of the five Lanterman-qualifying conditions. However, if ADHD co-occurs with autism, intellectual disability, cerebral palsy, epilepsy, or a condition closely related to intellectual disability, then RC eligibility opens up. Regardless of RC status, ADHD absolutely qualifies for school supports (IEP under \'Other Health Impairment\' or a 504 plan), and may qualify for SSI in severe cases.',
    phases: [
      {
        age: '0–5', label: 'Early Recognition', color: '#7C3AED', bg: '#F5F3FF', icon: '👶',
        description: 'ADHD is often first noticed when a child enters a structured environment — preschool, daycare, kindergarten — and the behaviors that seemed like \'just being a kid\' start standing out. Getting a formal diagnosis before age 5 can be tricky; many clinicians are hesitant to diagnose this young. That doesn\'t mean you\'re wrong about what you\'re seeing. Trust your instincts. A developmental pediatrician or child psychologist can evaluate your child and help you understand what\'s happening. Even without a formal ADHD diagnosis, your child may qualify for early intervention services if there are developmental delays present. You are the first person who noticed. That matters.',
        entities: [
          { name: 'Pediatrician', action: 'Screening, referral to specialist', time: 'Immediate' },
          { name: 'Dev. Pediatrician', action: 'Comprehensive evaluation and diagnosis', time: '3–12 mo wait' },
          { name: 'Insurance', action: 'Behavioral therapy and evaluation coverage', time: 'Prior auth' },
          { name: 'Preschool / Daycare', action: 'Behavioral support plan', time: 'As needed' },
        ],
        milestone: 'Formal evaluation complete, support strategies in place',
        alert: 'Specialist waitlists can be 3–12 months — get on the list early',
      },
      {
        age: '5–13', label: 'School Support', color: '#0EA5E9', bg: '#F0F9FF', icon: '📚',
        description: 'This is where the rubber meets the road. Your child is in school, and ADHD is affecting their ability to learn, stay organized, follow directions, or manage their behavior. You have two paths: a 504 Plan (accommodations like extra time, preferential seating, movement breaks) or an IEP (if ADHD substantially impacts educational performance, your child may qualify under \'Other Health Impairment\'). Don\'t let anyone tell you ADHD isn\'t a \'real disability\' or doesn\'t qualify for support. The law is clear. If your child\'s ADHD is affecting their education, the school has an obligation to help. You may also want to explore whether medication is right for your family — that\'s a personal decision and there is no wrong answer.',
        entities: [
          { name: 'School District', action: 'Request evaluation → IEP or 504 Plan', time: '60 days' },
          { name: 'Insurance', action: 'Medication management, therapy coverage', time: 'Ongoing' },
          { name: 'Pediatrician', action: 'Medication monitoring if applicable', time: 'Quarterly' },
          { name: 'SSI', action: 'May qualify if marked/severe functional limitations', time: '3–6 months' },
          { name: 'Medi-Cal', action: 'Full coverage if income-eligible', time: '45 days' },
        ],
        milestone: '504 or IEP in place, effective treatment plan established',
        alert: 'Put your evaluation request IN WRITING — this starts the legal clock',
      },
      {
        age: '14–17', label: 'Transition & Self-Advocacy', color: '#D97706', bg: '#FFFBEB', icon: '🎓',
        description: 'Adolescence with ADHD brings a unique challenge: your child needs to start managing their own disability. Executive function skills — planning, organization, time management, emotional regulation — are exactly the things ADHD makes harder. The transition IEP should include self-advocacy goals: Can your teen explain their diagnosis? Can they request accommodations? Can they manage their own medication? These skills are more valuable than any grade. If your teen is heading to college, they\'ll need to self-identify and request accommodations — the school won\'t do it for them anymore. If they\'re heading to work, DOR can help with job skills and placement. You\'re shifting from doing it for them to coaching them to do it themselves. That\'s hard. But it\'s the goal.',
        entities: [
          { name: 'School District', action: 'Transition IEP with self-advocacy goals', time: 'By age 16' },
          { name: 'DOR', action: 'Vocational support if employment barrier', time: 'Apply at 16' },
          { name: 'Insurance', action: 'Continued therapy and medication', time: 'Ongoing' },
          { name: 'College Disability Services', action: 'Research accommodations process', time: 'Junior year' },
        ],
        milestone: 'Self-advocacy skills developing, post-secondary plan in place',
        alert: 'College accommodations require self-identification — practice now',
      },
      {
        age: '18+', label: 'Adult Life', color: '#F97316', bg: '#FFF7ED', icon: '🧑‍💼',
        description: 'ADHD doesn\'t go away at 18 — but the support system changes dramatically. Your young adult is now responsible for their own healthcare, medication management, and accommodation requests. If they\'re in college, they\'ll work with disability services. If they\'re working, ADA protections apply. SSI may continue if the disability is severe enough to limit employment. The most important thing you\'ve given your child isn\'t any single service — it\'s the understanding that their brain works differently, that it\'s not a character flaw, and that they have the right to ask for what they need. That\'s a gift that lasts a lifetime.',
        entities: [
          { name: 'Insurance / Medi-Cal', action: 'Continued medication and therapy coverage', time: 'Ongoing' },
          { name: 'College / Employer', action: 'ADA accommodations, disability services', time: 'Self-identify' },
          { name: 'SSI', action: 'May continue if severe functional limitations', time: 'Adult review' },
          { name: 'DOR', action: 'Job coaching and placement support', time: 'If needed' },
        ],
        milestone: 'Independent self-management of ADHD with appropriate supports',
        alert: 'Health insurance coverage — ensure no gap at age 26 (parent plan cutoff)',
      },
    ],
  },
  id: {
    icon: '🌱',
    title: 'Intellectual Disability',
    subtitle: 'Intellectual & Developmental Disability',
    color: '#10B981',
    intro: 'Intellectual disability is a primary qualifying diagnosis for Regional Center — your child is entitled to lifelong services under the Lanterman Act. The journey is long, but the support infrastructure is comprehensive.',
    phases: [
      {
        age: '0–3', label: 'Early Intervention', color: '#7C3AED', bg: '#F5F3FF', icon: '👶',
        description: 'You may have noticed your baby wasn\'t meeting milestones at the same pace as other children — or a pediatrician may have raised the concern. Either way, the word \'delay\' can feel heavy. But delay doesn\'t define your child\'s potential — it describes where they are right now, and early intervention is designed to close that gap as much as possible. Your child qualifies for Regional Center services, which means a service coordinator, an Individualized Family Service Plan, and therapies delivered in your home. You are not expected to be a therapist. You are expected to be a parent. The professionals come to you.',
        entities: [
          { name: 'Pediatrician', action: 'Developmental screening and referral', time: 'Immediate' },
          { name: 'Regional Center', action: 'Early Start → IFSP with full services', time: '45 days' },
          { name: 'Early Start', action: 'Speech, OT, developmental therapies', time: 'Ongoing' },
          { name: 'Medi-Cal', action: 'Full healthcare coverage', time: '45 days' },
          { name: 'Insurance', action: 'Therapy authorizations as applicable', time: 'Ongoing' },
        ],
        milestone: 'IFSP active, developmental therapies in progress',
        alert: 'RC determination for ID is straightforward — don\'t delay the referral',
      },
      {
        age: '3–5', label: 'Transition to School', color: '#0891B2', bg: '#F0FDFA', icon: '🎒',
        description: 'School is a new world — and for a child with intellectual disability, the IEP is the document that shapes their entire educational experience. Insist on meaningful inclusion whenever possible. Your child has the right to be educated alongside their peers to the maximum extent appropriate. The IEP should include functional skills, communication goals, and social skills — not just academics. Apply for IHSS now if you haven\'t already. SSI eligibility is strong for children with ID. The Regional Center continues providing services alongside the school system — they complement each other, and you deserve both.',
        entities: [
          { name: 'School District', action: 'Assessment → IEP with functional goals', time: '~75 days' },
          { name: 'Regional Center', action: 'Lanterman eligibility — strong case for ID', time: '120 days' },
          { name: 'IHSS', action: 'In-home support hours', time: '30–60 days' },
          { name: 'SSI', action: 'Strong eligibility — apply now', time: '3–6 months' },
          { name: 'Insurance', action: 'Therapy coverage continues', time: 'Ongoing' },
        ],
        milestone: 'IEP with inclusive goals, SSI and IHSS established',
        alert: 'Inclusion is the legal presumption — the school must justify any removal',
      },
      {
        age: '5–13', label: 'School Years', color: '#0EA5E9', bg: '#F0F9FF', icon: '📚',
        description: 'The school years are a marathon, not a sprint. Your child is learning — maybe not at the same pace or in the same way as their peers, but they are learning. Celebrate the progress, even when it feels small. Annual IEPs should focus on functional life skills alongside academics: communication, self-care, safety awareness, social skills, and community participation. The Regional Center IPP should complement the IEP, not duplicate it. And don\'t forget about yourself. Caregiver burnout is real, and respite care exists for a reason. Asking for help is not a failure — it\'s good parenting.',
        entities: [
          { name: 'School District', action: 'Annual IEP with life skills focus', time: 'Yearly' },
          { name: 'Regional Center', action: 'Respite care, social skills groups, camps', time: 'Annual IPP' },
          { name: 'IHSS', action: 'Annual reassessment', time: 'Yearly' },
          { name: 'Insurance', action: 'Therapy re-authorizations', time: 'Ongoing' },
          { name: 'CalABLE', action: 'Start long-term savings', time: 'Any time' },
        ],
        milestone: 'Consistent progress on functional goals, family supported',
        alert: 'Request respite care through RC — caregiver wellbeing matters',
      },
      {
        age: '14–17', label: 'Transition Planning', color: '#D97706', bg: '#FFFBEB', icon: '🎓',
        description: 'What does a good life look like for your child as an adult? That question is at the heart of transition planning, and the answer is deeply personal. For some families, it\'s supported employment and a shared living arrangement. For others, it\'s a day program with community activities. There is no wrong answer — only the one that fits your child. The transition IEP should include vocational assessments, community-based instruction, and independent living skills. DOR should be at the IEP table. The Regional Center assigns a transition coordinator. And the legal questions — conservatorship, Supported Decision-Making, Special Needs Trusts — need attention before your child turns 18. It\'s a lot. Take it one step at a time.',
        entities: [
          { name: 'School District', action: 'Transition IEP — vocational, community-based', time: 'By age 16' },
          { name: 'DOR', action: 'Supported employment and job training', time: 'Apply at 16' },
          { name: 'Regional Center', action: 'Adult service planning begins', time: 'Age 14–16' },
          { name: 'SNT / CalABLE', action: 'Financial protection for adulthood', time: 'Start now' },
          { name: 'Conservatorship / SDM', action: 'Legal decision-making framework', time: 'Before 18' },
        ],
        milestone: 'Transition plan active, adult services identified, legal framework set',
        alert: 'Limited conservatorship is most common for ID — start 6–12 months before 18',
      },
      {
        age: '18+', label: 'Adult Life', color: '#F97316', bg: '#FFF7ED', icon: '🏠',
        description: 'This is the life you\'ve been building toward — and it can be a beautiful one. Adults with intellectual disabilities are living fuller, more connected lives than ever before. Supported employment, day programs, community integration, shared living, and independent living services are all available through the Regional Center. SSI provides income. Medi-Cal provides healthcare. IHSS provides daily support. The Self-Determination Program gives your adult child (or you, as their conservator) direct control over the RC budget to design services that truly fit their life. You have navigated one of the most complex systems in the country for your child\'s entire life. You\'ve earned every good thing that comes from it.',
        entities: [
          { name: 'Regional Center', action: 'Day programs, SLS/ILS, employment, community', time: 'Lifelong' },
          { name: 'SSI / Medi-Cal', action: 'Income + healthcare', time: 'Lifelong' },
          { name: 'IHSS', action: 'Daily living support', time: 'Lifelong' },
          { name: 'Self-Determination', action: 'Person-centered budget control', time: 'If enrolled' },
          { name: 'Special Needs Trust', action: 'Lifetime asset protection', time: 'Lifelong' },
        ],
        milestone: 'Meaningful adult life with community, employment, and support',
        alert: 'SSI $2K resource limit — CalABLE & SNT are essential',
      },
    ],
  },
  epilepsy: {
    icon: '🧠',
    title: 'Epilepsy',
    subtitle: 'Seizure Disorders',
    color: '#E11D48',
    intro: 'Epilepsy qualifies for Regional Center as a primary diagnosis. CCS plays a significant role in neurological care. The unpredictability of seizures adds unique challenges to school, caregiving, and daily life.',
    phases: [
      {
        age: '0–5', label: 'Diagnosis & Stabilization', color: '#7C3AED', bg: '#F5F3FF', icon: '👶',
        description: 'Watching your child have a seizure is one of the most terrifying experiences a parent can have. But you are doing the right things by seeking answers. You don\'t have to have all the answers. You just need to take the next step.',
        entities: [
          { name: 'Neurologist', action: 'EEG, diagnosis, medication', time: 'Immediate' },
          { name: 'CCS', action: 'Neurological specialty care', time: '30 days' },
          { name: 'Regional Center', action: 'Early Start if developmental delays', time: '45 days' },
        ],
        milestone: 'Seizures managed, supports in place',
        alert: 'CCS covers neurology regardless of income',
      },
      {
        age: '5–13', label: 'School & Safety', color: '#0EA5E9', bg: '#F0F9FF', icon: '📚',
        description: 'Your child needs a seizure action plan at school. Staff need training. Rescue medication must be available. With the right plans in place, your child can thrive at school.',
        entities: [
          { name: 'School District', action: 'IEP or 504 — seizure plan, accommodations', time: '60 days' },
          { name: 'IHSS', action: 'Protective supervision if uncontrolled', time: '30–60 days' },
          { name: 'SSI', action: 'Eligible if substantial limitations', time: '3–6 months' },
        ],
        milestone: 'Safe school environment, effective management',
        alert: 'Seizure action plan must be updated after any med changes',
      },
      {
        age: '14+', label: 'Transition & Adult Life', color: '#D97706', bg: '#FFFBEB', icon: '🎓',
        description: 'Driving restrictions, employment considerations, and transferring to adult neurology. If seizures are well-controlled, many adults live fully independent lives. Your child deserves a plan built around possibilities.',
        entities: [
          { name: 'Adult Neurology', action: 'Transfer from pediatric provider', time: 'Age 18' },
          { name: 'DOR', action: 'Vocational rehab with accommodations', time: 'Apply at 16' },
          { name: 'DMV', action: 'Seizure-free driving requirements', time: 'Varies' },
        ],
        milestone: 'Adult medical care, employment or support in place',
        alert: 'CA requires 3–6 month seizure-free period to drive',
      },
    ],
  },
  multiple: {
    icon: '🌈',
    title: 'Multiple Disabilities',
    subtitle: 'Co-occurring Diagnoses',
    color: '#7C3AED',
    intro: 'When your child has multiple diagnoses, the complexity multiplies. But eligibility is also typically stronger across the board, and you have more leverage to request comprehensive services.',
    phases: [
      {
        age: '0–3', label: 'Early Intervention', color: '#7C3AED', bg: '#F5F3FF', icon: '👶',
        description: 'When your child has more than one diagnosis, the early days can feel like an avalanche. You\'re not failing. You\'re parenting a child with complex needs. Multiple diagnoses mean stronger eligibility across the board.',
        entities: [
          { name: 'Medical Team', action: 'Multi-specialty coordination', time: 'Immediate' },
          { name: 'Regional Center', action: 'Comprehensive IFSP', time: '45 days' },
          { name: 'CCS', action: 'Medical specialty care', time: '30 days' },
        ],
        milestone: 'All diagnoses addressed, comprehensive plan in place',
        alert: 'Ask RC for a coordinator experienced with complex cases',
      },
      {
        age: '3–13', label: 'School Years', color: '#0EA5E9', bg: '#F0F9FF', icon: '📚',
        description: 'Don\'t settle for an IEP that addresses one diagnosis but ignores the others. You are the only person who sees the whole picture. Use that power. Document everything.',
        entities: [
          { name: 'School District', action: 'IEP — Multiple Disabilities, all goals', time: 'Annual' },
          { name: 'Regional Center', action: 'Full service package', time: 'Annual IPP' },
          { name: 'IHSS / SSI', action: 'High hours + income support', time: 'Ongoing' },
        ],
        milestone: 'Comprehensive IEP, all systems active',
        alert: 'Email follow-ups create the paper trail you\'ll need',
      },
      {
        age: '14+', label: 'Transition & Adult Life', color: '#D97706', bg: '#FFFBEB', icon: '🎓',
        description: 'The most complex transition, but you\'ve done harder things than this. This is the final major transition, and you have everything you need. The life ahead can be a good one.',
        entities: [
          { name: 'School District', action: 'Comprehensive transition IEP', time: 'By age 16' },
          { name: 'Regional Center', action: 'Complex adult service coordination', time: 'Lifelong' },
          { name: 'Conservatorship / SNT', action: 'Legal and financial protection', time: 'Before 18' },
        ],
        milestone: 'All adult systems in place',
        alert: 'Start transition planning at 14 — complex cases need extra time',
      },
    ],
  },
  delay: {
    icon: '📊',
    title: 'Developmental Delay',
    subtitle: 'General Developmental Delay',
    color: '#0891B2',
    intro: 'Developmental delay qualifies your child for Regional Center Early Start services. This is often the beginning of a longer journey — and early intervention makes the biggest difference.',
    phases: [
      {
        age: '0–3', label: 'Early Intervention', color: '#7C3AED', bg: '#F5F3FF', icon: '👶',
        description: 'A developmental delay diagnosis doesn\'t predict your child\'s future — it tells you where they need help right now. California\'s Early Start program is one of the best in the country. Let the system work for you.',
        entities: [
          { name: 'Regional Center', action: 'Early Start → IFSP', time: '45 days' },
          { name: 'Pediatrician', action: 'Developmental screening', time: 'Immediate' },
          { name: 'Medi-Cal', action: 'Apply for health coverage', time: '45 days' },
        ],
        milestone: 'IFSP active with therapies',
        alert: 'Don\'t wait for a specific diagnosis — delay alone qualifies for Early Start',
      },
      {
        age: '3–5', label: 'School Transition', color: '#0891B2', bg: '#F0FDFA', icon: '🎒',
        description: 'At age 3, your child transitions from Early Start to the school district. This is also when a more specific diagnosis may emerge. Either way, your child has the right to an IEP.',
        entities: [
          { name: 'School District', action: 'Assessment → IEP', time: '~75 days' },
          { name: 'Regional Center', action: 'Lanterman eligibility review', time: '120 days' },
          { name: 'IHSS / SSI', action: 'Apply based on functional needs', time: '30–180 days' },
        ],
        milestone: 'IEP active, RC status determined',
        alert: 'Transition planning starts 6 months before 3rd birthday',
      },
      {
        age: '5+', label: 'School Years & Beyond', color: '#0EA5E9', bg: '#F0F9FF', icon: '📚',
        description: 'As your child grows, services evolve. Annual IEP reviews ensure goals stay relevant. If a more specific diagnosis is identified, new services may become available. Stay engaged and keep advocating.',
        entities: [
          { name: 'School District', action: 'Annual IEP reviews', time: 'Yearly' },
          { name: 'Regional Center', action: 'Annual IPP if eligible', time: 'Yearly' },
          { name: 'Insurance', action: 'Therapy re-authorizations', time: 'Ongoing' },
        ],
        milestone: 'Stable services, ongoing progress',
        alert: 'Request updated assessments if you notice new concerns',
      },
    ],
  },
  sli: {
    icon: '🗣️',
    title: 'Speech/Language Impairment',
    subtitle: 'Communication Disorders',
    color: '#0891B2',
    intro: 'Speech and language impairments are among the most common childhood disabilities. School-based services are often the primary support, but insurance and Regional Center may also play a role.',
    phases: [
      {
        age: '0–3', label: 'Early Intervention', color: '#7C3AED', bg: '#F5F3FF', icon: '👶',
        description: 'If your child isn\'t babbling, pointing, or using words by expected milestones, trust your instincts. Early speech therapy can make a tremendous difference. Regional Center may provide services if the delay is significant.',
        entities: [
          { name: 'Pediatrician', action: 'Hearing test + speech referral', time: 'Immediate' },
          { name: 'Regional Center', action: 'Early Start if significant delay', time: '45 days' },
          { name: 'Insurance', action: 'Speech therapy coverage', time: 'Prior auth' },
        ],
        milestone: 'Speech therapy started, hearing verified',
        alert: 'Always rule out hearing loss first',
      },
      {
        age: '3–13', label: 'School Years', color: '#0EA5E9', bg: '#F0F9FF', icon: '📚',
        description: 'Your child has the right to speech-language services at school through an IEP or 504 plan. Don\'t accept \'wait and see\' if your child is struggling. Put your request for evaluation in writing.',
        entities: [
          { name: 'School District', action: 'IEP or 504 with speech services', time: '60 days' },
          { name: 'Insurance', action: 'Private speech therapy if needed', time: 'Ongoing' },
          { name: 'SSI', action: 'May qualify if severe impact', time: '3–6 months' },
        ],
        milestone: 'Speech services active, progress monitored',
        alert: 'School has 15 days to give you an assessment plan, then 60 days from your signed consent to evaluate',
      },
      {
        age: '14+', label: 'Transition', color: '#D97706', bg: '#FFFBEB', icon: '🎓',
        description: 'As your child enters adolescence, the focus shifts to social communication, self-advocacy, and preparing for life after school. Assistive technology may help with communication independence.',
        entities: [
          { name: 'School District', action: 'Transition IEP with communication goals', time: 'By age 16' },
          { name: 'DOR', action: 'Vocational support if communication barriers', time: 'Apply at 16' },
        ],
        milestone: 'Communication independence developing',
        alert: 'Explore AAC devices if verbal communication is limited',
      },
    ],
  },
  sld: {
    icon: '📖',
    title: 'Specific Learning Disability',
    subtitle: 'Dyslexia, Dyscalculia & Related',
    color: '#0EA5E9',
    intro: 'Learning disabilities are primarily addressed through the school system via IEP or 504 plans. Your child doesn\'t qualify for Regional Center, but their rights to educational support are strong.',
    phases: [
      {
        age: '5–13', label: 'Identification & Support', color: '#0EA5E9', bg: '#F0F9FF', icon: '📚',
        description: 'Learning disabilities often become apparent when academic demands increase. If your child is struggling despite effort, request an evaluation. The school cannot say no to a written request.',
        entities: [
          { name: 'School District', action: 'Psychoeducational evaluation → IEP or 504', time: '60 days' },
          { name: 'Insurance', action: 'Private neuropsych evaluation if needed', time: 'Prior auth' },
          { name: 'Private Tutor', action: 'Specialized reading/math intervention', time: 'As needed' },
        ],
        milestone: 'IEP or 504 in place with accommodations',
        alert: 'Put evaluation request IN WRITING to start the legal timeline',
      },
      {
        age: '14+', label: 'Transition & Self-Advocacy', color: '#D97706', bg: '#FFFBEB', icon: '🎓',
        description: 'Your teen needs to understand their disability and know how to request accommodations. In college, they must self-identify. These self-advocacy skills are essential for lifelong success.',
        entities: [
          { name: 'School District', action: 'Transition IEP with self-advocacy', time: 'By age 16' },
          { name: 'College Board / ACT', action: 'Request testing accommodations', time: 'Junior year' },
          { name: 'College Disability Office', action: 'Register and provide documentation', time: 'Before enrollment' },
        ],
        milestone: 'Self-advocacy skills, post-secondary plan ready',
        alert: 'Request updated evaluation before high school exit for documentation',
      },
    ],
  },
};

/** Fallback journey for diagnoses without specific maps — general overview */
export const JOURNEY_MAP_DEFAULT: Journey = {
  icon: '🧭',
  title: 'Your Child\'s Journey',
  subtitle: 'Navigating California Disability Services',
  color: '#0891B2',
  intro: 'Every journey is different, but the systems your family will interact with follow common patterns. Here\'s a general roadmap of what lies ahead.',
  phases: [
    {
      age: '0–3', label: 'Early Intervention', color: '#7C3AED', bg: '#F5F3FF', icon: '👶',
      description: 'California\'s Early Start program provides therapies and support for children birth to 3 with developmental concerns. Regional Center coordinates these services at no cost to families.',
      entities: [
        { name: 'Pediatrician', action: 'Developmental screening and referrals', time: 'Immediate' },
        { name: 'Regional Center', action: 'Intake and service planning', time: '45 days' },
        { name: 'Insurance / Medi-Cal', action: 'Therapy and specialist coverage', time: 'Ongoing' },
      ],
      milestone: 'Service plan active, therapies started',
      alert: 'Don\'t wait for a specific diagnosis to contact Regional Center',
    },
    {
      age: '3–17', label: 'School Years', color: '#0EA5E9', bg: '#F0F9FF', icon: '📚',
      description: 'Your child has the right to a Free Appropriate Public Education. An IEP or 504 Plan ensures they get the support they need at school. You are an equal member of the IEP team.',
      entities: [
        { name: 'School District', action: 'Evaluation → IEP or 504 Plan', time: '~60–75 days' },
        { name: 'Regional Center', action: 'Ongoing services if eligible', time: 'Annual' },
        { name: 'IHSS / SSI', action: 'Apply based on functional needs', time: 'Varies' },
      ],
      milestone: 'Educational supports in place, services coordinated',
      alert: 'Always put requests in writing to start legal timelines',
    },
    {
      age: '18+', label: 'Adult Life', color: '#D97706', bg: '#FFFBEB', icon: '🏠',
      description: 'Transition to adulthood means new systems and new decisions — adult services, employment, legal planning, and financial protection. Start planning early.',
      entities: [
        { name: 'DOR', action: 'Vocational rehabilitation', time: 'Apply at 16' },
        { name: 'SSI / Medi-Cal', action: 'Adult benefits', time: 'At age 18' },
        { name: 'Regional Center', action: 'Adult services if eligible', time: 'Lifelong' },
      ],
      milestone: 'Adult support systems established',
      alert: 'Begin transition planning no later than age 14–16',
    },
  ],
};

/**
 * Resolves the journey map for a child's diagnoses.
 * Ported from gas-mvp getJourneyForDiagnosis(): the primary (first) diagnosis
 * selects the journey, with the same alias mapping as the GAS MVP.
 *
 * @param diagnoses Diagnosis keys in intake order; the first is treated as primary.
 * @returns The matching journey, or JOURNEY_MAP_DEFAULT when no specific map exists.
 */
/**
 * The JOURNEY_MAP_DATA key a set of diagnoses resolves to, or '_default'.
 * Navigation passes this key (not the journey object) so phase links stay
 * serializable and survive a reload.
 */
export function getJourneyKeyForDiagnosis(diagnoses: string[]): string {
  const primary = diagnoses[0] || '';
  let dxKey = primary;
  if (dxKey === 'dyslexia') dxKey = 'sld';
  if (dxKey === 'md') dxKey = 'cp'; // muscular dystrophy shares similar physical disability path
  if (dxKey === 'tbi') dxKey = 'multiple'; // TBI often co-occurs
  // PDA is an autism-spectrum profile
  if (dxKey === 'pda') dxKey = 'autism';
  if (dxKey === 'deaf' || dxKey === 'blind' || dxKey === 'ed' || dxKey === 'ohi' || dxKey === 'suspected') dxKey = '_default';
  return JOURNEY_MAP_DATA[dxKey] ? dxKey : '_default';
}

/** The journey for a key from getJourneyKeyForDiagnosis(). */
export function getJourneyByKey(key: string): Journey {
  return JOURNEY_MAP_DATA[key] ?? JOURNEY_MAP_DEFAULT;
}

export function getJourneyForDiagnosis(diagnoses: string[]): Journey {
  return getJourneyByKey(getJourneyKeyForDiagnosis(diagnoses));
}

/**
 * Returns the index of the journey phase matching a child's age in years.
 * Ported from gas-mvp getJourneyPhaseForAge(): parses each phase's age range
 * label (e.g. '0–3', '3–5', '14–17', '18+', '22+' — en-dash or hyphen ranges)
 * and returns the containing phase. Ages beyond all ranges land on the final
 * 'N+' phase; younger or unparseable ages return 0.
 *
 * @param ageYears The child's age in whole years.
 * @param journey The journey whose phases should be matched.
 * @returns Zero-based index into journey.phases.
 */
export function getPhaseIndexForAge(ageYears: number, journey: Journey): number {
  // Parse the phase age ranges and find best match
  for (let i = 0; i < journey.phases.length; i++) {
    const phaseAge = journey.phases[i].age; // e.g. "0–3", "3–5", "14+", "18+"
    const match = phaseAge.match(/(\d+)[\s]*[–\-][\s]*(\d+)/);
    if (match) {
      const lo = parseInt(match[1], 10);
      const hi = parseInt(match[2], 10);
      if (ageYears >= lo && ageYears < hi) return i;
      // Handle edge: if child is exactly hi years, check next phase
      if (ageYears === hi && i < journey.phases.length - 1) continue;
    }
    // Handle "14+" or "18+" format
    const plusMatch = phaseAge.match(/(\d+)\+/);
    if (plusMatch) {
      const threshold = parseInt(plusMatch[1], 10);
      if (ageYears >= threshold) return i;
    }
  }
  // Default: last phase if older than all ranges, first if younger
  return 0;
}
