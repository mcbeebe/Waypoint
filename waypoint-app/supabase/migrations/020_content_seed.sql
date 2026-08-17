-- 020: Content seed — Resources guides + Blog starter posts (wave 4)
--
-- The Resources and Blog screens shipped in Phase 10 but their tables were
-- never seeded. This seeds a curated starter library. Idempotent: each
-- block only inserts when its table is still empty, so re-running (or
-- running after the team has added content) is safe.

-- ─── Resources / Guides ─────────────────────────────────────────────────────

insert into public.resources (title, body, category, tags, difficulty_level, estimated_read_time)
select v.title, v.body, v.category, v.tags, v.difficulty, v.read_time
from (values
  (
    'Your First 30 Days After a Diagnosis',
    E'Take a breath. This is a big moment, and it''s normal to feel overwhelmed, scared, relieved, or all three at once. Thousands of California families have walked this path — here''s the map.\n\nWEEK 1 — ONE PHONE CALL\n• Call your local Regional Center and say: "I''d like to refer my child for intake." That''s it. Under the Lanterman Act, intake must be scheduled within 15 working days.\n• If your child is under 3, ask for "Early Start" — the timeline is faster (45 days evaluation-to-IFSP).\n\nWEEKS 2-3 — TWO PARALLEL TRACKS\nCalifornia runs two separate systems, and you''ll eventually use both:\n• Regional Center (services, respite, therapies) — driven by the Lanterman Act\n• School District (education support: IEP or 504) — driven by IDEA\nStart with the Regional Center. The school track can wait a week or two.\n\nWEEK 4 — BUILD YOUR PAPER TRAIL\n• Start one folder (physical or digital) for every letter, evaluation, and email.\n• Put every request in writing from now on — written requests start legal clocks; phone calls don''t.\n\nSUPPORT FOR YOU\n• Parent support: Parent to Parent USA matches you with a trained parent who''s been there (free).\n• Your county''s Family Resource Center offers free peer support.\n• Disability Rights California: 1-800-776-5746 for any rights question, free.',
    'getting_started',
    array['new diagnosis','regional center','first steps'],
    'beginner', 6
  ),
  (
    'How Regional Center Intake Actually Works',
    E'The Regional Center is the front door to California''s developmental services system — 21 nonprofit centers under the Lanterman Act serve every county.\n\nTHE TIMELINE THE LAW REQUIRES\n• Intake meeting: within 15 working days of your referral (W&I §4642)\n• Eligibility decision: within 120 days — faster (60) if delay would risk your child''s progress (W&I §4643)\n• IPP meeting: within 60 days of eligibility (W&I §4646)\n\nWHO QUALIFIES\nA "substantial disability" beginning before age 18 that''s expected to continue indefinitely: intellectual disability, cerebral palsy, epilepsy, autism, or a condition requiring similar supports. Children under 3 qualify for Early Start with just a 33% delay in one area (or risk factors).\n\nWHAT TO BRING TO INTAKE\n• Any evaluations or medical records you have (don''t wait for "complete" records)\n• A short written summary of your concerns and your child''s history\n• Your questions, written down — intake is also YOUR interview of THEM\n\nIF THEY SAY NO\nEligibility denials can be appealed through a Fair Hearing (you have 60 days). Roughly a third of appealed denials are reversed. Disability Rights California (1-800-776-5746) helps free of charge.',
    'regional_center',
    array['intake','eligibility','lanterman act','early start'],
    'beginner', 7
  ),
  (
    'The IPP: Getting Services Written Into the Plan',
    E'The Individual Program Plan (IPP) is the contract between your family and the Regional Center. Services not written in the IPP don''t exist — so the IPP meeting is where advocacy matters most.\n\nBEFORE THE MEETING\n• Write a one-page "vision statement": what does your child need to thrive this year?\n• List specific services you want considered: respite hours, ABA, social skills groups, camps, diapers (over age 3), adaptive equipment.\n• Ask other parents at your RC what services THEY receive — services vary widely and knowledge is leverage.\n\nAT THE MEETING\n• Everything is negotiable. "We don''t fund that" usually means "we don''t fund that unless you push."\n• Ask for the assessment behind any "no": "What assessment shows my child doesn''t need this?"\n• Don''t sign anything you disagree with. You can take the IPP home to review.\n\nAFTER THE MEETING\n• Services must begin within 60 days of the IPP (W&I §4648).\n• If a service is denied, demand a written Notice of Action — it starts your appeal rights.\n• The IPP can be reopened ANY time circumstances change. You never have to wait for the annual review.',
    'regional_center',
    array['ipp','services','respite','advocacy'],
    'intermediate', 8
  ),
  (
    'IEP Basics: The 7 Steps From Request to Services',
    E'The Individualized Education Program (IEP) is how your child gets special education services under IDEA. Here''s the whole pipeline.\n\n1. REQUEST AN EVALUATION — IN WRITING\nEmail the principal and special education director: "I am requesting a comprehensive evaluation of my child in all areas of suspected disability." The district then has 15 calendar days to give you an assessment plan (Ed Code §56321).\n\n2. SIGN THE ASSESSMENT PLAN\nThe 60-day evaluation clock starts at your signature — not your request.\n\n3. THE EVALUATION\nPsychoeducational testing, plus any area of suspected disability: speech, OT, behavior. You can (and should) add your own private evaluations to the record.\n\n4. THE ELIGIBILITY MEETING\nThe team decides if your child qualifies under one of 13 categories. Disagree? You can request an Independent Educational Evaluation at district expense.\n\n5. WRITING THE IEP\nGoals must be measurable. Push for specifics: minutes per week, group size, provider qualifications.\n\n6. CONSENT\nYou can consent in part — accept the speech services while disputing placement, for example.\n\n7. IMPLEMENTATION + PROGRESS\nThe IEP must be implemented as written, and you get progress reports as often as report cards. Failure to implement = denial of FAPE = grounds for a compliance complaint.',
    'iep',
    array['iep','evaluation','school','idea','fape'],
    'beginner', 8
  ),
  (
    'What To Do When the School Says No',
    E'Districts count on parents giving up after the first "no." Don''t. Every refusal has a legal counter.\n\n"WE DON''T HAVE THE RESOURCES" → Resources are legally irrelevant to FAPE. Ask them to put the refusal in Prior Written Notice (34 CFR §300.503) — most walk it back rather than write it down.\n\n"LET''S TRY RTI/MTSS FIRST" → RTI cannot delay or deny an evaluation you''ve requested in writing. Restate your request and the 15-day clock.\n\n"YOUR CHILD IS TOO SMART FOR AN IEP" → Eligibility is about educational impact, not grades. Anxiety, behavior, and social needs count.\n\n"WE''LL SUSPEND HIM AGAIN" → After 10 cumulative days of removal, the school owes a Manifestation Determination Review. Behavior that manifests from disability gets an FBA and behavior plan, not punishment.\n\nYOUR ESCALATION LADDER\n1. Written request restating your position (creates the record)\n2. Prior Written Notice demand for any refusal\n3. CDE compliance complaint (free, 60-day investigation): (916) 319-0800\n4. Due process filing with OAH: 916-263-0550\n5. Free legal help: Disability Rights California 1-800-776-5746',
    'iep',
    array['advocacy','pwn','cde complaint','discipline'],
    'intermediate', 7
  ),
  (
    'SB 946 and Insurance-Funded ABA: Your Rights',
    E'California law (SB 946, Health & Safety Code §1374.73) requires state-regulated health plans to cover behavioral health treatment — including ABA — for autism.\n\nWHAT''S COVERED\n• ABA and other evidence-based behavioral programs\n• Prescribed by a licensed physician or psychologist\n• Delivered under a treatment plan by a qualified autism service provider\n\nTHE CATCHES\n• Self-funded employer plans (ERISA) escape state law — ask HR if your plan is "fully insured" or "self-funded."\n• Medi-Cal covers ABA separately through EPSDT for members under 21.\n\nWHEN HOURS GET CUT\nInsurers routinely approve fewer hours than the provider recommends. Counter with:\n• A peer-to-peer review between your BCBA/physician and their medical director\n• A written medical-necessity letter citing functional data\n• An Independent Medical Review if the internal appeal fails — DMHC overturns roughly 6 in 10 denials: 1-888-466-2219\n\nTHE GOLDEN RULE\nNever accept a verbal denial. "Please send that decision in writing with the clinical basis" — that sentence starts every appeal right you have.',
    'insurance',
    array['sb 946','aba','autism','appeals','imr'],
    'intermediate', 6
  ),
  (
    'Medi-Cal for Kids With Disabilities (Even Higher-Income Families)',
    E'Many families skip Medi-Cal assuming they earn too much. Three doors stay open regardless of income:\n\n1. INSTITUTIONAL DEEMING WAIVER\nIf your child is a Regional Center consumer, the HCBS-DD waiver counts only the CHILD''S income — not yours. Ask your Service Coordinator to start "institutional deeming." Medi-Cal then covers copays, therapies, diapers, and IHSS eligibility.\n\n2. SSI-LINKED MEDI-CAL\nChildren approved for SSI get Medi-Cal automatically.\n\n3. WORKING DISABLED PROGRAM (for adults 18+)\nYoung adults can work and keep Medi-Cal with premiums as low as $0-$250/month.\n\nWHY BOTHER IF YOU HAVE PRIVATE INSURANCE?\nMedi-Cal as secondary insurance picks up what private plans won''t: copays and deductibles, incontinence supplies after age 3, EPSDT services (anything medically necessary for members under 21), and it unlocks IHSS — which can pay YOU as your child''s care provider.\n\nAPPLY\nBenefitsCal.com (~45-60 minutes online) or through your Service Coordinator for the waiver route.',
    'insurance',
    array['medi-cal','waiver','ihss','epsdt','ssi'],
    'intermediate', 6
  ),
  (
    'IHSS: Getting Paid to Care for Your Own Child',
    E'In-Home Supportive Services pays for care that keeps your child safely at home — and in California, parents can be the paid provider.\n\nWHO QUALIFIES\nYour child needs Medi-Cal (see the waiver guide — parental income can be bypassed) and needs help beyond what''s typical for their age: supervision for safety, help with bathing, dressing, feeding, or "protective supervision" for behaviors like elopement.\n\nTHE ASSESSMENT\nA county social worker visits your home and scores every task. Two make-or-break tips:\n• Describe your child''s WORST days, not their best. The assessment must capture real need.\n• Keep a one-week log of every care task and its minutes before the visit — read from it.\n\nPROTECTIVE SUPERVISION\nThe largest award category (up to 195 hours/month) for children who would hurt themselves without constant watching. Doctors must document the risk — ask for "protective supervision" by name in the physician''s form (SOC 821).\n\nIF HOURS COME BACK LOW\nAppeal within 90 days (request "Aid Paid Pending" within 10 days of the notice to keep current hours during appeal). State hearings reverse or improve a large share of IHSS decisions.',
    'legal',
    array['ihss','protective supervision','medi-cal','appeals'],
    'advanced', 7
  ),
  (
    'SSI for Children: The Application Marathon',
    E'Supplemental Security Income pays monthly cash benefits for children with disabilities in lower-income households — and unlocks automatic Medi-Cal.\n\nBEFORE YOU START\n• Income limits are real for SSI (unlike the Medi-Cal waiver). Roughly: a single parent with one child can earn ~$3,900/month gross before ineligibility; two-parent households more.\n• The asset limit is $2,000 (child''s own assets) — a CalABLE account shelters up to $100,000.\n\nTHE PROCESS (2-4 HOURS SPREAD OVER DAYS)\n1. Call 1-800-772-1213 or start at ssa.gov/apply — ask for a "child disability application"\n2. Complete the Child Disability Report (every provider, school, medication)\n3. Sign releases so SSA can pull records\n4. Possible consultative exam at SSA''s expense\n\nSURVIVAL TIPS\n• Answer every function question for your child''s worst days\n• Never leave a question blank; "see attached" with detail beats a short answer\n• Track your protective filing date — benefits pay from it\n\nDENIED?\nOver half of child SSI applications are denied initially, and many win on appeal. Request reconsideration within 60 days; free help: your local Legal Aid or DRC 1-800-776-5746.',
    'legal',
    array['ssi','benefits','calable','appeals'],
    'advanced', 8
  ),
  (
    'Turning 3: The Early Start → Preschool Cliff',
    E'At the third birthday, Early Start ends and everything changes in one week. Plan at 2½ to avoid a services gap.\n\nWHAT CHANGES\n• Early Start (Regional Center) hands education services to your SCHOOL DISTRICT\n• The IFSP becomes an IEP — a different document under different law\n• Regional Center keeps non-education services ONLY if your child qualifies under Lanterman (a new eligibility decision)\n\nTHE TIMELINE THAT PROTECTS YOU\n• By 2 yrs 9 mo: transition planning meeting (your service coordinator must set this up)\n• The district must evaluate and hold an IEP meeting so services start ON the 3rd birthday — not "when a spot opens"\n\nPARENT MOVES THAT MATTER\n• Sign the district''s assessment plan quickly — the 60-day clock helps you here\n• Visit the proposed preschool class before consenting to placement\n• If Lanterman eligibility is denied at 3 (common for speech-only delays), you can appeal, and school services continue regardless\n• Keep private/insurance therapies running through the transition — school services replace educational supports, not medical ones.',
    'transitions',
    array['early start','age 3','preschool','ifsp to iep'],
    'intermediate', 6
  ),
  (
    'The Paper Trail: Documentation Habits That Win Disputes',
    E'Cases are won by the parent with the better records. Build these habits now, before you need them.\n\nTHE GOLDEN RULES\n1. If it wasn''t written down, it didn''t happen. After every phone call, send a confirming email: "Thanks for speaking with me today — my understanding is..."\n2. One folder per system (RC, school, insurance, medical), sorted by date.\n3. Names, dates, times for every contact — a simple notes app entry is enough.\n\nWHAT TO KEEP FOREVER\n• Every evaluation and assessment report\n• Every IEP, IFSP, and IPP (all versions)\n• Denial letters and Notices of Action — these are appeal tickets\n• Attendance/service logs showing missed sessions\n\nEMAIL BEATS EVERYTHING\nWritten requests start legal clocks (15 days for an assessment plan; 15 working days for RC intake). Phone calls start nothing. When you must call, follow up in writing the same day.\n\nREQUEST YOUR RECORDS YEARLY\nSchools: 5 business days under Ed Code §49069 (first copy free). Regional Center: W&I §4725. Reading your child''s file often reveals reports you never received.',
    'getting_started',
    array['documentation','records','advocacy'],
    'beginner', 5
  ),
  (
    'Free Help Directory: Who To Call, For What',
    E'You don''t have to pay an advocate for most problems. California''s free help network, organized by problem:\n\nANY RIGHTS QUESTION\n• Disability Rights California: 1-800-776-5746 — free legal advocacy, publications, template letters\n• OCRA (Office of Clients'' Rights Advocacy): free RC-related legal help, one advocate per Regional Center — ask your RC for your OCRA contact\n\nSCHOOL / IEP HELP (free Parent Training & Information Centers)\n• DREDF: 800-253-2103 (Northern CA)\n• MATRIX: 800-578-2592 (Marin, Napa, Solano, Sonoma)\n• Parents Helping Parents: 408-727-5775 (Santa Clara + Central Coast)\n• TASK: 866-828-8275 (LA, Orange, San Diego + inland)\n• EPU Children''s Center: 844-445-0305 (Central Valley)\n\nINSURANCE FIGHTS\n• DMHC Help Center (HMO plans): 1-888-466-2219 — files IMRs\n• CDI (PPO plans): 1-800-927-4357\n\nHEARINGS & COMPLAINTS\n• OAH (fair hearings, due process): 916-263-0550\n• CDE complaint unit: 916-319-0800\n\nPEER SUPPORT\n• Parent to Parent USA: free trained-parent matching\n• Your county Family Resource Center (search "[county] family resource center")\n• Warmline Family Resource Center (Sacramento region): 916-455-9500',
    'getting_started',
    array['directory','drc','pti','dmhc','peer support'],
    'beginner', 5
  )
) as v(title, body, category, tags, difficulty, read_time)
where not exists (select 1 from public.resources);

-- ─── Blog starter posts ─────────────────────────────────────────────────────

insert into public.blog_posts (title, excerpt, body, category, tags, is_featured, is_published, published_at)
select v.title, v.excerpt, v.body, v.category, v.tags, v.featured, true, now()
from (values
  (
    'Welcome to Waypoint',
    'Why we built a free GPS for California''s disability services maze — and how to get the most out of it.',
    E'If you''re here, you''re probably navigating one of the hardest systems in America: getting services for a child with a disability in California. Regional Centers, IEPs, Medi-Cal, IHSS, SSI, insurance appeals — 15 to 25 different agencies, each with its own acronyms, deadlines, and unwritten rules.\n\nHere''s the uncomfortable truth we built Waypoint to fix: families who know the system get more services. The knowledge gap IS the disparity. Paid advocates charge $115/month or more to close it. We think the map should be free.\n\nWHAT WAYPOINT DOES\n• The AI Navigator answers your questions with actual statute citations and tells you the exact words to say\n• Your Action Plan turns advice into tracked steps with deadlines\n• The letter generator drafts assessment requests, appeals, and complaints with your family''s details filled in\n• The document reader analyzes IEPs and flags what''s missing\n\nWHERE TO START\nTell us about your child in onboarding, then open the Journey Map. Your first three actions are already waiting — most families'' first step is a single 15-minute phone call.\n\nYou know your child. We know the system. Let''s go.',
    'updates', array['welcome','getting started'], true
  ),
  (
    'The One Sentence That Starts Everything',
    'Most families wait months longer than they need to — because nobody tells them that services start with a single written request.',
    E'There''s a sentence that unlocks California''s two biggest service systems, and most parents have never heard it:\n\n"I am requesting an evaluation of my child, in writing, today."\n\nWhy writing? Because in both systems, WRITTEN requests start legally enforceable clocks:\n• Regional Center: intake within 15 working days (W&I §4642)\n• School district: assessment plan within 15 calendar days (Ed Code §56321)\n\nA phone call starts nothing. A conversation at pickup starts nothing. A worried email to the teacher starts nothing — unless it clearly requests evaluation.\n\nTHE TWO EMAILS TO SEND THIS WEEK\n1. To your Regional Center intake line: "I am referring my child, [name], DOB [date], for intake and assessment. Please confirm receipt."\n2. To your school principal AND special education director: "I am requesting a comprehensive evaluation of my child in all areas of suspected disability. Please send the assessment plan within 15 days as required by Ed Code §56321."\n\nSend them even if someone told you to "wait and see." You can always slow down a process you started; you can''t recover months you never put on the clock.\n\nWaypoint''s letter generator will write both emails with your details — open Letters from the Home screen.',
    'guides', array['first steps','evaluation','regional center','iep'], false
  ),
  (
    'Why "No" Usually Means "Not Unless You Push"',
    'Denials are a budgeting strategy, not a final answer. The data on appeals proves it.',
    E'Here''s a pattern every experienced advocate knows: the first answer is often no, and the no often doesn''t survive a challenge.\n\nTHE NUMBERS\n• Independent Medical Review overturns roughly 60% of insurance denials that reach it (DMHC data)\n• A large share of appealed Regional Center service denials settle before hearing — in the family''s favor\n• More than half of child SSI applications are denied initially; many win on appeal\n\nWhy? Systems under budget pressure deny softly and count on attrition. Families who push encounter a different system than families who don''t. That''s unfair — and it''s also leverage, once you know it.\n\nTHE PUSH, IN THREE MOVES\n1. GET IT IN WRITING. "Please send me that decision in writing, with the specific reason and the regulation it''s based on." Verbal denials evaporate under this sentence.\n2. NAME THE APPEAL. Every system has one: Fair Hearing (RC), due process/CDE complaint (school), internal appeal + IMR (insurance), state hearing (IHSS/SSI). Asking for it by name signals you won''t attrit.\n3. GET FREE BACKUP. Disability Rights California (1-800-776-5746) and your local PTI exist exactly for this, at no cost.\n\nWaypoint''s "I''m stuck" button on the Home screen builds you a specific escalation plan — with the letters already drafted.',
    'advocacy', array['appeals','denials','fair hearing','imr'], false
  ),
  (
    'Regional Center Respite: The Most Under-Used Benefit',
    'Almost every RC family qualifies for respite hours. Many never ask.',
    E'Respite is temporary care for your child so you can rest, run errands, or just be a person for a few hours. It''s one of the most commonly authorized Regional Center services — and one of the least requested by new families, because nobody tells them it exists.\n\nTHE BASICS\n• Purchased by your Regional Center through your child''s IPP\n• Typical starting authorizations run 16-32 hours per MONTH (varies by RC and need)\n• In-home (a worker comes to you) or out-of-home (licensed provider)\n• You can often hire someone you already trust — a grandparent, neighbor, or your regular babysitter — through the RC''s respite agency or participant-directed services\n\nHOW TO ASK\nAt your next IPP meeting (or reopen the IPP now — you never have to wait): "We''re requesting respite hours. Caring for [child] requires [describe: constant supervision, night wakings, behavioral support]. What assessment do you need to authorize this?"\n\nIF YOU HEAR "WE DON''T FUND THAT" OR "THERE''S A WAITLIST"\nServices are based on IPP need, not slogans or lists. Ask for the denial in a written Notice of Action — appeal rights attach immediately. Most "waitlist" answers become authorizations when a parent asks for the NOA.\n\nAsk Waypoint''s Navigator about respite rates and vendors for YOUR Regional Center — and check the Reimbursables screen for what else your RC can fund.',
    'guides', array['respite','regional center','ipp','services'], false
  )
) as v(title, excerpt, body, category, tags, featured)
where not exists (select 1 from public.blog_posts);
