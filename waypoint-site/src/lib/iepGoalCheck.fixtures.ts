/**
 * Independent goal corpora for the IEP goal check (initiative 013). Written by
 * the third adversarial review, not by the code's author, so the rules are
 * measured against wording they were not tuned on. Names are fictional.
 *
 * COMPLETE: each goal names all five parts — every part must be spotted.
 * STRIPPED: each goal is missing exactly ONE part — that part must stay
 * not spotted, or a parent is told a goal is complete and never asks.
 */
import type { GoalPartId } from './iepGoalCheck';

export const COMPLETE: Array<[string, string]> = [
  // reading
  ['reading', 'By 05/2027, when presented with a 3rd grade level passage, Jordan will decode CVCe words with 90% accuracy across 3 consecutive probes as measured by teacher-made assessments.'],
  ['reading', 'Given a list of 20 high-frequency words, Student will read the words aloud with 95% accuracy in 3 out of 4 trials by the end of the 2026-27 IEP term, as measured by teacher records.'],
  ['reading', 'BY THE END OF THE IEP YEAR, GIVEN A FIRST GRADE LEVEL TEXT, STUDENT WILL READ 60 WORDS CORRECT PER MINUTE ON 3 CONSECUTIVE PROBES AS MEASURED BY CBM.'],
  ['reading', 'by next IEP when reading a short story my son will answer who what where questions 4 out of 5 times measured by his teachers data'],
  ['reading', 'Diego will identify the main idea and two supporting details in an informational text at his instructional level with 80% accuracy in 4/5 trials by October 2027. (Measured by: work samples and teacher-charted data)'],
  ['reading', 'Within one calendar year, after listening to a read-aloud, Ava will sequence 4 story events using picture cards with 80% accuracy over three consecutive sessions, as evidenced by SLP data collection.'],
  ['reading', 'By February 2027, given phonics instruction in a small group, Liam will blend three-phoneme words orally in 8 out of 10 opportunities, as measured by teacher-recorded data.'],
  // writing
  ['writing', 'By 6/1/2027, given a graphic organizer and a writing prompt, Isabella will write a 5-paragraph essay that scores a 3 or better on the district rubric in 3 of 4 writing samples, as measured by the special education teacher.'],
  ['writing', 'Given a sentence frame, Mateo will write a complete sentence with correct capitalization and ending punctuation in 4 out of 5 trials by May 2027. Progress will be measured through work samples.'],
  ['writing', 'In one year, when given a topic, Student will independently compose a paragraph of at least 5 sentences with a topic sentence and closing sentence on 3 of 4 occasions as documented by writing samples.'],
  ['writing', 'by june 2027 when he has to write in class Ethan will type his answers using a chromebook with speech to text with 80% accuracy as measured by teacher work samples'],
  ['writing', 'By the end of the 2026-2027 IEP period, using a keyboard, Noah will type 15 words per minute with 90% accuracy over 3 consecutive weekly timings, as measured by typing program reports.'],
  // math
  ['math', 'By May 2027, given 10 two-digit addition problems with regrouping, Sophia will solve them with 80% accuracy on 4 of 5 consecutive probes as measured by curriculum-based assessments.'],
  ['math', 'GIVEN A CALCULATOR AND 10 WORD PROBLEMS, STUDENT WILL SOLVE MULTI-STEP PROBLEMS WITH 70% ACCURACY IN 3 OF 4 TRIALS BY 06/2027 AS MEASURED BY TEACHER-MADE TESTS.'],
  ['math', 'By the annual IEP date, when presented with coins, Elijah will count mixed coins up to $1.00 with 90% accuracy in 4 out of 5 trials, as measured by observation and data collection.'],
  ['math', 'Within 12 months, using a number line, Harper will add and subtract within 20 with 85% accuracy across 3 consecutive data collection days (teacher-charted data).'],
  ['math', 'Lucas will tell time to the nearest five minutes on an analog clock with 80% accuracy in 4 of 5 trials when given a clock face, by May 2027, as measured by teacher observation and data.'],
  ['math', 'By March 2027, given manipulatives, Amelia will identify fractions 1/2, 1/3, and 1/4 with 80% accuracy on 3 of 4 probes, as measured by teacher-made assessments.'],
  // behavior
  ['behavior', 'By the end of the IEP term, when presented with a non-preferred task, Oliver will use a replacement behavior (requesting a break with his break card) in 80% of opportunities across 4 consecutive weeks as measured by ABC data and staff tally sheets.'],
  ['behavior', 'By May 2027, during structured classroom activities, Student will remain in assigned area for 20 minutes with no more than 2 verbal redirections on 4 out of 5 days, as measured by behavior tracking sheets.'],
  ['behavior', 'Within one year, when given a verbal direction from an adult, Mason will comply within 30 seconds in 8 of 10 opportunities as measured by staff frequency data.'],
  ['behavior', 'By January 2027, during transitions between classes, Charlotte will keep hands and feet to herself with zero incidents of aggression for 4 consecutive weeks, as measured by daily behavior logs.'],
  ['behavior', 'by the end of the school year when he gets upset Jacob will use a calming strategy like deep breaths or the calm corner 4 out of 5 times instead of hitting as tracked by the behaviorist'],
  ['behavior', 'By June 2027, during independent seatwork, Aiden will raise his hand and wait to be called on before speaking in 80% of observed opportunities per teacher frequency count.'],
  // speech/language
  ['speech', 'By May 2027, in structured conversation with the SLP, Emma will produce the /r/ sound in all word positions with 80% accuracy over 3 consecutive sessions, as measured by SLP data.'],
  ['speech', 'Given a picture scene, Student will produce grammatically correct sentences of 5+ words in 8 out of 10 opportunities by 6/2027 as measured by speech-language pathologist records.'],
  ['speech', 'By the next annual IEP, using his AAC device, Henry will request preferred items or activities with 2+ symbol combinations in 4 of 5 opportunities across 2 settings, as measured by SLP and staff data.'],
  ['speech', 'Within 12 months, when asked a wh- question about a short story, Mia will answer correctly in 4 out of 5 trials with minimal cues, as measured by SLP probes.'],
  ['speech', 'BY 05/30/2027, IN A SMALL GROUP SETTING, STUDENT WILL USE AGE-APPROPRIATE FLUENCY STRATEGIES TO PRODUCE FLUENT SPEECH IN 90% OF UTTERANCES DURING A 5 MINUTE CONVERSATION AS MEASURED BY SLP OBSERVATION.'],
  ['speech', 'By May 2027, given a category, Ella will name 5 items belonging to that category in 4 of 5 trials. This will be measured by SLP data collection.'],
  // OT / fine motor
  ['ot', 'By May 2027, given a pencil grip, Benjamin will copy a sentence of 6 words with correct letter formation and spacing in 4 of 5 trials, as measured by OT work samples.'],
  ['ot', 'Within one year, using adaptive scissors, Student will cut along a curved line staying within 1/4 inch of the line in 4/5 trials as measured by OT observation.'],
  ['ot', 'By the end of the IEP year, when given a zipper on his jacket, Logan will independently zip and unzip it in 4 of 5 opportunities as measured by OT data and teacher checklist.'],
  ['ot', 'by next may during handwriting work my daughter will write her first and last name legibly on lined paper in 4 out of 5 tries as measured by her OT'],
  ['ot', 'By 12/2026, given a visual model, Grace will build a 6-block design in 3 of 4 trials (OT data).'],
  // social
  ['social', 'By May 2027, during unstructured times such as lunch and recess, Jack will initiate a conversation with a peer at least 2 times per day on 4 of 5 days as measured by staff observation.'],
  ['social', 'Given a role-play scenario, Student will identify the feelings of others from facial expressions with 80% accuracy in 4 of 5 trials by the end of the IEP period, as measured by counselor data.'],
  ['social', 'By June 2027, in a small group game, Owen will take turns and wait his turn without prompting in 4 out of 5 opportunities as measured by teacher data.'],
  ['social', 'Within the IEP year, when joining a group activity, Chloe will use a social script to ask to join in 3 of 4 observed opportunities, as measured by school psychologist observation records.'],
  ['social', 'By the end of the 2026-27 school year, in structured social skills group, Lily will maintain a back-and-forth conversation for 4 exchanges in 80% of opportunities as measured by data collected by the speech pathologist.'],
  // self-help / functional
  ['selfhelp', 'By May 2027, given a picture task analysis, Wyatt will complete a 5-step handwashing routine independently in 4 of 5 opportunities as measured by staff task analysis data.'],
  ['selfhelp', 'Within one year, during lunch, Student will open his containers independently in 80% of opportunities as measured by staff checklist.'],
  ['selfhelp', 'By the end of the IEP period, using a visual schedule, Zoe will independently transition between activities within 2 minutes on 4 of 5 days, as documented on a daily data sheet.'],
  ['selfhelp', 'BY ANNUAL REVIEW, GIVEN A VISUAL SCHEDULE, STUDENT WILL INDEPENDENTLY FOLLOW HIS ARRIVAL ROUTINE (HANG BACKPACK, TURN IN FOLDER, SIT DOWN) WITH 90% ACCURACY FOR 10 CONSECUTIVE SCHOOL DAYS AS MEASURED BY STAFF DATA.'],
  ['selfhelp', 'By May 2027, given a menu and $10, Carter will order a meal and pay at a community restaurant with no more than 1 prompt in 3 of 4 community outings, as measured by staff checklist.'],
  // transition (14+)
  ['transition', 'By the end of 11th grade, given access to career interest inventories, Student will identify 3 careers of interest and the education required for each with 100% accuracy, as measured by completed career portfolio.'],
  ['transition', 'Within one year, when given a job application, Jayden will complete all required fields accurately in 4 of 5 trials as measured by teacher review of work samples.'],
  ['transition', 'By June 2027, using public transportation with a job coach, Sebastian will travel from school to his work site independently on 4 of 5 consecutive trips as measured by job coach data.'],
  ['transition', 'By the end of the 2026-2027 school year, during his work experience placement, Gabriel will arrive on time and complete assigned tasks with 90% accuracy across 4 consecutive weeks as measured by employer evaluations.'],
  ['transition', 'Upon completion of 12th grade, given a budget worksheet, Student will create a monthly budget with 90% accuracy in 3 of 4 trials, as measured by teacher-made rubric.'],
  ['transition', 'By May 2027, in a mock interview, Aaliyah will answer 5 common interview questions with appropriate eye contact and complete sentences in 4 out of 5 opportunities, as measured by transition specialist rubric.'],
  ['transition', 'Student will advocate for his accommodations by requesting extended time from his general education teachers in 4 out of 5 opportunities, when given a test, by the end of the IEP year, as measured by teacher report.'],
  // misc phrasing
  ['reading', 'Student will read a passage at the 4th grade level. Criteria: 100 wcpm with 95% accuracy. Conditions: given an unpracticed passage. Measured by: DIBELS ORF. Target date: 05/2027.'],
  ['math', 'Annual Goal: By 05/15/2027, given a set of 20 single-digit multiplication facts, Ryan will state the answers with 90% accuracy within 2 minutes in 3 consecutive trials as measured by timed probes.'],
];

export const STRIPPED: Array<[string, GoalPartId]> = [
  // missing timeframe
  ['When presented with a 3rd grade level passage, Jordan will decode CVCe words with 90% accuracy across 3 consecutive probes as measured by teacher-made assessments.', 'timeframe'],
  ['Given a sentence frame, Mateo will write a complete sentence with correct capitalization in 4 out of 5 trials. Progress will be measured through work samples.', 'timeframe'],
  ['During transitions between classes, Charlotte will keep hands and feet to herself with zero incidents for 4 consecutive weeks, as measured by daily behavior logs.', 'timeframe'],
  ['Using his AAC device, Henry will request preferred items in 4 of 5 opportunities across 2 settings, as measured by SLP and staff data.', 'timeframe'],
  ['Given a menu and $10, Carter will order a meal at a community restaurant with no more than 1 prompt in 3 of 4 outings, as measured by staff checklist.', 'timeframe'],
  ['In structured conversation with the SLP, Emma will produce /r/ with 80% accuracy over 3 consecutive sessions during the year, as measured by SLP data.', 'timeframe'],
  ['Given 10 two-digit addition problems, Sophia will solve them with 80% accuracy on 4 of 5 probes as measured by quarterly progress reports.', 'timeframe'],
  ['Given a picture task analysis, Wyatt will complete a 5-step handwashing routine in 4 of 5 opportunities, reviewed at his annual IEP team meeting, as measured by staff data.', 'timeframe'],
  // missing conditions
  ['By May 2027, Sophia will solve two-digit addition problems with 80% accuracy on 4 of 5 consecutive probes as measured by curriculum-based assessments.', 'conditions'],
  ['By June 2027, Owen will take turns in 4 out of 5 opportunities as measured by teacher data.', 'conditions'],
  ['Within 12 months, Harper will add and subtract within 20 with 85% accuracy across 3 consecutive data collection days (teacher-charted data).', 'conditions'],
  ['By the end of the IEP year, Logan will independently zip his jacket in 4 of 5 opportunities as measured by OT data.', 'conditions'],
  ['By May 2027, Student will read 90 words correct per minute, as measured by DIBELS.', 'conditions'],
  ['By May 2027, Student will write a paragraph using correct punctuation in 4 of 5 trials, as measured by work samples.', 'conditions'],
  ['By May 2027, Student will use complete sentences in 80% of opportunities, as measured by SLP data.', 'conditions'],
  ['By the end of the 2026-27 school year, Emma will produce /r/ in all positions with 80% accuracy over 3 consecutive sessions, as measured by SLP data.', 'conditions'],
  ['By May 2027, Liam will read 20 sight words with 90% accuracy in 3 of 4 trials, with progress measured by teacher data.', 'conditions'],
  ['By 6/2027 Student will complete 4 of 5 math problems correctly as measured by teacher data.', 'conditions'],
  ['By June 2027, Jack, a 4th grader, will initiate a conversation with a peer 2 times per day, as measured by staff observation.', 'conditions'],
  ['By May 2027, Noah will type 15 words per minute with 90% accuracy, with the special education teacher tracking weekly timings.', 'conditions'],
  // missing observable skill
  ['By May 2027, when given a grade-level passage, Maya will improve her reading comprehension in 4 of 5 trials, as measured by teacher data.', 'skill'],
  ['By May 2027, during class, Student will demonstrate appropriate behavior 80% of the time, as measured by staff data.', 'skill'],
  ['Within one year, given instruction, Student will develop age-appropriate social skills in 4 of 5 opportunities as measured by counselor observation.', 'skill'],
  ['By June 2027, given support, Ethan will understand grade-level math concepts with 80% accuracy as measured by teacher tests.', 'skill'],
  ['By May 2027, during unstructured time, Student will display appropriate social skills in 4 of 5 opportunities as measured by staff observation.', 'skill'],
  ['By May 2027, given a passage, Maya will increase reading fluency by 20% as measured by DIBELS.', 'skill'],
  ['By May 2027, during independent work, Student will show improved attention in 80% of intervals as measured by teacher data.', 'skill'],
  ['By May 2027, when given visual supports, Student will be more independent in 4 of 5 opportunities as measured by staff data.', 'skill'],
  ['By May 2027, given OT services, Student will strengthen fine motor skills in 4 of 5 trials as measured by OT data.', 'skill'],
  ['By May 2027, in the classroom, Student will make progress on his reading goals 80% of the time as measured by teacher data.', 'skill'],
  // missing criterion
  ['By May 2027, when given a grade-level passage, Maya will answer comprehension questions correctly, as measured by teacher-charted data.', 'criterion'],
  ['By June 2027, during recess, Jack will initiate play with peers, as measured by staff observation.', 'criterion'],
  ['Within one year, given a writing prompt, Student will write a paragraph with a topic sentence and closing sentence as measured by work samples.', 'criterion'],
  ['By May 2027, when frustrated, Oliver will request a break using his break card, as measured by staff data.', 'criterion'],
  ['By the end of the 2026-27 school year, in speech therapy, Emma will produce /r/ correctly in conversation, as measured by SLP data.', 'criterion'],
  ['By May 2027, given 2-step directions, Student will follow the directions with fewer prompts, as measured by teacher data.', 'criterion'],
  ['By May 2027, given a visual schedule, Zoe will transition between activities independently, as documented on a daily data sheet.', 'criterion'],
  ['By May 2027, using adaptive scissors, Student will cut along a curved line, as measured by OT observation of 3rd grade work.', 'criterion'],
  // missing measurement
  ['By May 2027, when given a grade-level passage, Maya will answer 4 of 5 comprehension questions correctly in 3 of 4 trials.', 'measurement'],
  ['Within one year, given a writing prompt and a graphic organizer, Maya will write a five-sentence paragraph with 80% accuracy.', 'measurement'],
  ['By June 2027, using his AAC device, Henry will request items in 4 of 5 opportunities across 2 settings.', 'measurement'],
  ['By May 2027, at recess, Jack will initiate play with a peer at least 3 times per week, as reported to the parent at the IEP meeting.', 'measurement'],
  ['By May 2027, given a menu, Carter will order a meal using his communication device in 3 of 4 community outings, with the teacher present.', 'measurement'],
  ['By May 2027, given a passage, Sam will read charts and graphs with 80% accuracy in 4 of 5 trials.', 'measurement'],
  ['By May 2027, given a 5-step checklist, Wyatt will complete his morning routine in 4 of 5 opportunities.', 'measurement'],
  ['By May 2027, given a field of 3 picture symbols, Student will select the correct one in 4 of 5 trials using his device data screen.', 'measurement'],
];

/**
 * Fourth review's held-out sets (64 complete, 64 stripped), written without
 * reading the rules, fixtures, or tests. Before the fixes they drove: 21/64
 * complete goals had a part wrongly not spotted (10 were verb-first "Annual
 * goal:" lines declined outright) and 5/63 stripped goals had the missing part
 * wrongly spotted. s62 ("given data from her reading log as a prompt") is the
 * one remaining false "spotted": a debatable edge case, kept as a known miss.
 */
export interface HeldOutGoal {
  id: string;
  domain: string;
  text: string;
  missing?: GoalPartId;
  note?: string;
}

export const HELDOUT_COMPLETE: HeldOutGoal[] = [
  // reading
  { id: 'c01', domain: 'reading', text: 'By June 2027, when given a passage at the 3rd grade instructional level, Maya will read aloud at 90 words correct per minute with 95% accuracy, as measured by monthly DIBELS oral reading fluency probes administered by the education specialist.' },
  { id: 'c02', domain: 'reading', text: 'Annual goal: Given a short informational text and a graphic organizer, answer 4 out of 5 literal and inferential comprehension questions in writing in 3 of 4 consecutive trials by the annual IEP review, as measured by teacher-charted work samples.' },
  { id: 'c03', domain: 'reading', text: 'By 5/2027, given a list of 20 CVC words, Jonah will decode the words with 80% accuracy over 3 consecutive sessions. Progress will be measured by the resource teacher using weekly running records.' },
  { id: 'c04', domain: 'reading', text: 'GOAL #2 READING. BY THE END OF THE 2026-2027 SCHOOL YEAR, GIVEN A GRADE-LEVEL FICTION TEXT, STUDENT WILL IDENTIFY THE MAIN IDEA AND TWO SUPPORTING DETAILS WITH 80% ACCURACY IN 4 OUT OF 5 TRIALS AS MEASURED BY TEACHER-MADE ASSESSMENTS AND DATA COLLECTION.' },
  { id: 'c05', domain: 'reading', text: 'within one year, when reading a 2nd grade level text with a partner, my son will retell the beginning, middle and end of the story in 3 out of 4 opportunities, tracked by the reading specialist on a retell rubric' },
  { id: 'c06', domain: 'reading', text: 'Goal area: Reading Fluency. Baseline: 42 wcpm. Annual goal: By November 2027, given unfamiliar 2nd grade passages, Ana will read 70 words correct per minute on 3 consecutive probes. Measured by: curriculum-based measurement probes, collected biweekly by the SAI teacher.' },
  { id: 'c07', domain: 'reading', text: 'By the next annual IEP, given a set of 25 high-frequency sight words on flash cards, Leo will read 22 of 25 words within 3 seconds each across 3 consecutive data days (teacher data sheets, weekly).' },
  // writing
  { id: 'c08', domain: 'writing', text: 'By March 2027, given a writing prompt and a paragraph frame, Sofia will write a paragraph with a topic sentence, three supporting details, and a concluding sentence scoring 3 or higher on the district writing rubric in 4 of 5 writing samples, as measured by work samples collected by the special education teacher.' },
  { id: 'c09', domain: 'writing', text: 'Annual goal: Using speech-to-text software, compose a five-sentence narrative with correct capitalization and end punctuation in 80% of sentences, across 3 consecutive writing samples, by the end of the IEP year. Measured by: teacher-scored writing samples.' },
  { id: 'c10', domain: 'writing', text: 'By June 2027, when dictated 10 grade-level spelling words, Eli will spell 8 of 10 words correctly on 4 consecutive weekly spelling probes as recorded by the general education teacher.' },
  { id: 'c11', domain: 'writing', text: 'in 12 months, given sentence starters and a word bank, student will write 3 complete sentences about a picture with correct subject-verb agreement in 4/5 trials as measured by work samples and teacher observation' },
  { id: 'c12', domain: 'writing', text: 'BY 6/2027, GIVEN A GRAPHIC ORGANIZER, STUDENT WILL WRITE A 5 PARAGRAPH ESSAY THAT SCORES AT LEAST 3/4 ON THE GRADE LEVEL RUBRIC ON 3 OF 4 ASSIGNMENTS AS MEASURED BY RUBRIC SCORES RECORDED BY THE RSP TEACHER.' },
  // math
  { id: 'c13', domain: 'math', text: 'By May 2027, given 20 single-digit addition problems, Ava will solve them with 90% accuracy within 5 minutes in 3 consecutive trials, as measured by timed probes recorded by the special education teacher.' },
  { id: 'c14', domain: 'math', text: 'Annual goal: Given a two-step word problem involving multiplication and a calculator, solve the problem and show the equation used with 80% accuracy in 4 out of 5 opportunities by the annual review. Progress measured by curriculum-based assessments, monthly.' },
  { id: 'c15', domain: 'math', text: 'By the end of the IEP period, when presented with coins (pennies, nickels, dimes, quarters) totaling up to $1.00, Marcus will count the value correctly in 8 out of 10 trials, as documented on data sheets by the paraeducator.' },
  { id: 'c16', domain: 'math', text: 'within 1 year, using a number line, my daughter will compare two fractions with like denominators using <, >, or = with 80 percent accuracy on 3 of 4 weekly probes; her teacher tracks this on a progress chart' },
  { id: 'c17', domain: 'math', text: 'By February 2027, given an analog clock, Daniel will tell time to the nearest 5 minutes with 90% accuracy across 3 sessions. Criteria: 90% accuracy, 3 sessions. Measured by: teacher-recorded data.' },
  { id: 'c18', domain: 'math', text: 'By 11/2027, given 10 multi-digit subtraction problems with regrouping, Priya will solve 8 of 10 correctly on 4 of 5 probes (measured by teacher-made probes, scored weekly).' },
  // behavior
  { id: 'c19', domain: 'behavior', text: 'By June 2027, when frustrated during academic tasks, Tyler will request a break using his break card instead of leaving the classroom in 4 out of 5 opportunities per day for 4 consecutive weeks, as measured by behavior data collected by the classroom aide.' },
  { id: 'c20', domain: 'behavior', text: 'Annual goal: During independent work periods, with a visual timer, remain seated and engaged with the assigned task for 15 minutes with no more than 2 verbal prompts on 4 of 5 days, by the annual IEP. Measured by: interval recording by the behaviorist.' },
  { id: 'c21', domain: 'behavior', text: 'By the next IEP, during transitions between classes, Jordan will walk to the next location keeping hands to himself on 90% of transitions across 10 consecutive school days, as measured by staff tally sheets.' },
  { id: 'c22', domain: 'behavior', text: 'BY MAY 2027, WHEN GIVEN A NON-PREFERRED TASK, STUDENT WILL BEGIN THE TASK WITHIN 2 MINUTES OF THE DIRECTION IN 80% OF OPPORTUNITIES AS MEASURED BY TEACHER DATA COLLECTION 3 TIMES PER WEEK.' },
  { id: 'c23', domain: 'behavior', text: 'by december 2027 when he is upset at recess, my son will use a calming strategy (deep breaths, counting to 10, or asking an adult for help) in 4 of 5 incidents, the counselor keeps a log' },
  { id: 'c24', domain: 'behavior', text: 'By June 2027, given a self-monitoring checklist, Emma will complete and turn in homework assignments on 85% of school days per month, as measured by the case manager\'s weekly review of the gradebook.' },
  // speech/language
  { id: 'c25', domain: 'speech', text: 'By May 2027, during structured speech activities, Liam will produce the /r/ sound in the initial position of words with 80% accuracy across 3 consecutive sessions, as measured by SLP data collection.' },
  { id: 'c26', domain: 'speech', text: 'Annual goal: Given a picture scene, describe it using complete sentences of 5 or more words in 4 out of 5 opportunities over 3 consecutive therapy sessions by the end of the IEP year. Measured by: speech-language pathologist session notes.' },
  { id: 'c27', domain: 'speech', text: 'By June 2027, using his AAC device, Noah will request preferred items and activities with 2-symbol combinations in 8 of 10 opportunities across 3 settings, as measured by SLP and teacher data.' },
  { id: 'c28', domain: 'speech', text: 'within one year, when asked a "wh" question about a short story read aloud, she will answer correctly in 4 out of 5 trials as tracked by the speech therapist' },
  { id: 'c29', domain: 'speech', text: 'BY 6/2027, IN CONVERSATION WITH PEERS, STUDENT WILL USE AGE-APPROPRIATE FLUENCY STRATEGIES (EASY ONSET, PAUSING) TO PRODUCE SENTENCES WITH FEWER THAN 3 DISFLUENCIES PER MINUTE IN 4 OF 5 SAMPLES, AS MEASURED BY SLP LANGUAGE SAMPLES.' },
  { id: 'c30', domain: 'speech', text: 'By March 2027, given a category name (e.g., animals, foods), Isabella will name 5 items in the category within 30 seconds on 4 of 5 trials. Progress will be monitored by the SLP with session data.' },
  // OT / fine motor
  { id: 'c31', domain: 'OT', text: 'By June 2027, given a pencil grip and lined paper, Ethan will copy a 3-word sentence with letters correctly sized and spaced in 4 out of 5 trials, as measured by OT work samples.' },
  { id: 'c32', domain: 'OT', text: 'Annual goal: Using adapted scissors, cut along a curved line staying within 1/4 inch of the line for 90% of its length in 3 of 4 trials by the annual review. Measured by: occupational therapist observation and data.' },
  { id: 'c33', domain: 'OT', text: 'By May 2027, during classroom writing tasks, Mia will write her first and last name legibly with correct letter formation in 4 of 5 opportunities as documented by the OT on a handwriting checklist.' },
  { id: 'c34', domain: 'OT', text: 'in one year, with a visual model, he will button and unbutton 4 buttons on his jacket independently in 3 out of 4 tries, OT will keep data' },
  { id: 'c35', domain: 'OT', text: 'BY THE ANNUAL IEP, GIVEN A KEYBOARD AND TYPING PROGRAM, STUDENT WILL TYPE 20 WORDS PER MINUTE WITH 90% ACCURACY ON 3 CONSECUTIVE TIMED TESTS AS MEASURED BY THE TYPING PROGRAM REPORTS REVIEWED BY THE OT.' },
  // social
  { id: 'c36', domain: 'social', text: 'By June 2027, during unstructured play at recess, Aiden will initiate a conversation or game with a peer at least 3 times per recess on 4 of 5 days, as measured by observation by the inclusion specialist.' },
  { id: 'c37', domain: 'social', text: 'Annual goal: During small group activities, take turns and wait for a peer to finish speaking before responding in 80% of opportunities across 4 consecutive weeks by the end of the IEP year. Measured by: teacher frequency counts.' },
  { id: 'c38', domain: 'social', text: 'By April 2027, given a social scenario card, Chloe will identify the emotion of the person and state an appropriate response in 4 out of 5 trials (data kept by the school psychologist in weekly social skills group).' },
  { id: 'c39', domain: 'social', text: 'by next year, during lunch with a peer buddy, my daughter will maintain a back and forth conversation for 3 exchanges in 3 of 4 lunch periods observed, and the aide will write it down on the data sheet' },
  { id: 'c40', domain: 'social', text: 'By May 2027, when a peer greets him, Lucas will return the greeting with eye contact or a wave within 5 seconds in 80% of opportunities, as measured by staff data collected twice weekly.' },
  // self-help
  { id: 'c41', domain: 'self-help', text: 'By June 2027, given a picture schedule, Henry will complete the 5-step handwashing routine independently in 4 of 5 opportunities across 2 consecutive weeks, as measured by task analysis data collected by the paraprofessional.' },
  { id: 'c42', domain: 'self-help', text: 'Annual goal: With a visual checklist posted in the cubby area, unpack his backpack and put away materials within 5 minutes of arrival on 4 of 5 school days by the annual review. Measured by: teacher checklist.' },
  { id: 'c43', domain: 'self-help', text: 'By the end of the school year, during lunch, Grace will open her own food containers without adult help in 90% of lunch periods, as recorded by the lunch aide on a daily log.' },
  { id: 'c44', domain: 'self-help', text: 'within 12 months, when he needs to use the restroom, my son will tell an adult using words or his picture card in 4 out of 5 opportunities, tracked by his teacher on a toileting chart' },
  { id: 'c45', domain: 'self-help', text: 'BY MAY 2027, GIVEN A VERBAL CUE, STUDENT WILL PUT ON HIS COAT AND ZIP IT INDEPENDENTLY IN 4 OF 5 TRIALS ACROSS 3 WEEKS AS MEASURED BY STAFF DATA SHEETS.' },
  // transition (14+)
  { id: 'c46', domain: 'transition', text: 'By June 2027, given a list of local job openings, Carlos (age 16) will complete two job applications accurately with 90% of fields filled correctly, as measured by the transition specialist using an application checklist.' },
  { id: 'c47', domain: 'transition', text: 'Annual goal: Using a smartphone transit app, plan and take the bus from school to the community college campus independently on 4 of 5 community outings by the end of the IEP year. Measured by: job coach observation and data sheets.' },
  { id: 'c48', domain: 'transition', text: 'By May 2027, during a mock interview with an adult, Aaliyah will answer 5 common interview questions with relevant responses and appropriate eye contact on 3 of 4 practice interviews, as scored on a rubric by the WorkAbility coordinator.' },
  { id: 'c49', domain: 'transition', text: 'By the next annual IEP, given a monthly budget worksheet and a $500 allowance, Kevin will create a budget that covers all listed expenses with 100% accuracy on 3 consecutive attempts, as measured by teacher review of completed worksheets.' },
  { id: 'c50', domain: 'transition', text: 'by june 2027 at his work-based learning site, my son (17) will clock in on time and finish his assigned tasks with no more than 1 reminder per shift for 8 of 10 shifts, the job coach records it on a weekly log' },
  { id: 'c51', domain: 'transition', text: 'BY THE END OF 12TH GRADE (JUNE 2027), WHEN GIVEN A COLLEGE APPLICATION, STUDENT WILL IDENTIFY AND REQUEST HIS ACCOMMODATIONS FROM THE DISABILITY SERVICES OFFICE IN 2 OF 2 OPPORTUNITIES AS DOCUMENTED BY THE TRANSITION TEACHER.' },
  // preschool
  { id: 'c52', domain: 'preschool', text: 'By June 2027, during circle time, Zoe will sit with the group and attend to the teacher for 10 minutes with no more than 1 prompt on 4 of 5 days, as measured by teacher data.' },
  { id: 'c53', domain: 'preschool', text: 'Annual goal: Given a model, imitate 3-block structures (tower, bridge) in 4 out of 5 trials by May 2027. Measured by: early childhood special education teacher observation logged weekly.' },
  { id: 'c54', domain: 'preschool', text: 'By the end of the preschool year, when shown pictures of common objects, Mateo will label 20 objects using single words in 80% of trials, as measured by SLP probe data.' },
  { id: 'c55', domain: 'preschool', text: 'in 1 year, during free play, my 4 year old will play next to or with a peer sharing toys for 5 minutes in 3 of 4 observations, her preschool teacher takes notes' },
  { id: 'c56', domain: 'preschool', text: 'By April 2027, given a crayon and a model, Lily will draw a circle and a cross in 4 of 5 attempts as recorded by the preschool OT on a fine motor checklist.' },
  { id: 'c57', domain: 'preschool', text: 'BY THE ANNUAL REVIEW, DURING SNACK TIME, STUDENT WILL REQUEST "MORE" USING A SIGN OR WORD IN 8 OF 10 OPPORTUNITIES ACROSS 3 CONSECUTIVE DAYS AS MEASURED BY TEACHER AND SLP DATA COLLECTION.' },
  // misc format variation
  { id: 'c58', domain: 'math', text: 'Student will add two-digit numbers with regrouping when given a worksheet of 10 problems, with 80% accuracy in 3 consecutive trials, by June 2027 (progress measured by weekly teacher probes).' },
  { id: 'c59', domain: 'reading', text: 'Area: Reading comprehension. Timeline: by 6/1/2027. Condition: given a grade-level passage read aloud. Behavior: Ben will sequence 4 events from the story. Criteria: 4 of 5 trials. Measured by: teacher records.' },
  { id: 'c60', domain: 'writing', text: 'By June 2027 Jayden will edit his own written work for capitalization and punctuation using an editing checklist. He will correct 4 out of 5 errors on 3 consecutive samples, as measured by teacher review of drafts.' },
  { id: 'c61', domain: 'behavior', text: 'By May 2027, when given a direction by an adult, Oliver will comply within 30 seconds in 80% of opportunities over 3 consecutive weeks. Data will be collected daily by the paraeducator.' },
  { id: 'c62', domain: 'speech', text: 'Student will, by the end of the IEP year, when given a choice board, point to one of two pictures to make a choice in 4 out of 5 opportunities as measured by SLP data.' },
  { id: 'c63', domain: 'transition', text: 'By June 2027, given a mock pay stub, Riya (15) will identify gross pay, deductions and net pay with 90% accuracy on 3 of 4 worksheets, as measured by teacher-graded worksheets.' },
  { id: 'c64', domain: 'social', text: 'Over the next 12 months, during cooperative learning groups, Sam will give a compliment or encouraging comment to a peer at least 2 times per session in 4 of 5 sessions, as measured by teacher tally.' },
];

export const HELDOUT_STRIPPED: HeldOutGoal[] = [
  // ---- missing TIMEFRAME (~12): date-like / label lead-ins that are not a deadline
  { id: 's01', missing: 'timeframe', domain: 'reading', text: 'Given a grade-level passage, Maya will read 90 words correct per minute with 95% accuracy, as measured by DIBELS probes administered by the education specialist.' },
  { id: 's02', missing: 'timeframe', domain: 'math', text: 'Goal 3 (2026-2027 IEP): Given 20 addition facts, Ava will solve them with 90% accuracy in 3 consecutive trials, as measured by timed probes.', note: 'school-year label, not a deadline - debatable' },
  { id: 's03', missing: 'timeframe', domain: 'behavior', text: 'When frustrated, Tyler will request a break using his break card in 4 out of 5 opportunities per day, as measured by behavior data collected by the aide.' },
  { id: 's04', missing: 'timeframe', domain: 'writing', text: 'IEP date 10/14/2026. Given a paragraph frame, Sofia will write a paragraph with a topic sentence and 3 details scoring 3 on the rubric in 4 of 5 samples, as measured by work samples.' },
  { id: 's05', missing: 'timeframe', domain: 'speech', text: 'During structured activities, Liam will produce /r/ in initial position with 80% accuracy across 3 consecutive sessions, as measured by SLP data.' },
  { id: 's06', missing: 'timeframe', domain: 'OT', text: 'Annual goal: Given a pencil grip, copy a 3-word sentence with correct letter sizing in 4 of 5 trials. Measured by: OT work samples.', note: '"Annual goal" label implies a year - debatable' },
  { id: 's07', missing: 'timeframe', domain: 'social', text: 'During recess, Aiden will initiate a game with a peer at least 3 times per recess on 4 of 5 days, as measured by observation by the inclusion specialist.' },
  { id: 's08', missing: 'timeframe', domain: 'self-help', text: 'Given a picture schedule, Henry will complete the handwashing routine independently in 4 of 5 opportunities, as measured by task analysis data collected weekly.' },
  { id: 's09', missing: 'timeframe', domain: 'transition', text: 'Carlos (age 16, grade 11) will complete two job applications with 90% of fields correct when given a list of job openings, as measured by the transition specialist checklist.' },
  { id: 's10', missing: 'timeframe', domain: 'preschool', text: 'During circle time, Zoe will attend to the teacher for 10 minutes with no more than 1 prompt on 4 of 5 days, as measured by teacher data.' },
  { id: 's11', missing: 'timeframe', domain: 'math', text: 'Baseline (Sept 2026): 40% accuracy. Given coins up to $1.00, Marcus will count the value in 8 out of 10 trials, as documented on data sheets by the paraeducator.', note: 'baseline date is not a deadline' },
  { id: 's12', missing: 'timeframe', domain: 'behavior', text: 'STUDENT WILL BEGIN A NON-PREFERRED TASK WITHIN 2 MINUTES OF THE DIRECTION WHEN GIVEN A TASK IN 80% OF OPPORTUNITIES AS MEASURED BY TEACHER DATA COLLECTION.' , note: '"within 2 minutes" is latency criterion, not timeframe' },
  { id: 's13', missing: 'timeframe', domain: 'reading', text: 'given a 2nd grade book, my son will retell the story beginning middle and end in 3 of 4 tries, the reading specialist tracks it on a rubric each week' },

  // ---- missing CONDITIONS (~12)
  { id: 's14', missing: 'conditions', domain: 'reading', text: 'By June 2027, Maya will read 90 words correct per minute with 95% accuracy, as measured by monthly DIBELS probes.' },
  { id: 's15', missing: 'conditions', domain: 'math', text: 'By May 2027, Ava will solve single-digit addition problems with 90% accuracy in 3 consecutive trials, as measured by teacher probes.' },
  { id: 's16', missing: 'conditions', domain: 'behavior', text: 'By June 2027, Jordan will keep his hands to himself in 90% of observed intervals, as measured by staff tally sheets.' },
  { id: 's17', missing: 'conditions', domain: 'speech', text: 'By May 2027, Liam will produce the /r/ sound in the initial position of words with 80% accuracy as measured by SLP data.' },
  { id: 's18', missing: 'conditions', domain: 'OT', text: 'By May 2027, Mia will write her first and last name with correct letter formation in 4 of 5 opportunities as documented by the OT.' },
  { id: 's19', missing: 'conditions', domain: 'social', text: 'By April 2027, Chloe will identify emotions and state an appropriate response in 4 out of 5 trials, as measured by school psychologist data.' },
  { id: 's20', missing: 'conditions', domain: 'self-help', text: 'By June 2027, Grace will open her food containers independently in 90% of opportunities, as recorded by the aide.' },
  { id: 's21', missing: 'conditions', domain: 'transition', text: 'By June 2027, Kevin will create a monthly budget covering all expenses with 100% accuracy on 3 consecutive attempts, as measured by teacher review.' },
  { id: 's22', missing: 'conditions', domain: 'writing', text: 'BY JUNE 2027, STUDENT WILL WRITE A 5 PARAGRAPH ESSAY SCORING 3/4 ON THE RUBRIC ON 3 OF 4 ASSIGNMENTS AS MEASURED BY RUBRIC SCORES.' },
  { id: 's23', missing: 'conditions', domain: 'preschool', text: 'by next year my daughter will label 20 common objects using single words in 80% of trials, the speech therapist will track it' },
  { id: 's24', missing: 'conditions', domain: 'speech', text: 'By June 2027, Noah will request preferred items with 2-symbol combinations in 8 of 10 opportunities, as measured by SLP data.', note: 'no AAC/setting given' },
  { id: 's25', missing: 'conditions', domain: 'behavior', text: 'By May 2027, Oliver will comply with adult directions within 30 seconds in 80% of opportunities, as measured by daily paraeducator data.', note: '"adult directions" is part of the skill, not a condition - debatable' },

  // ---- missing SKILL (~12): vague verbs, incl. ones not commonly listed; support nouns nearby
  { id: 's26', missing: 'skill', domain: 'reading', text: 'By June 2027, given grade-level passages, Maya will improve her reading fluency with 80% accuracy, as measured by DIBELS probes.' },
  { id: 's27', missing: 'skill', domain: 'math', text: 'By May 2027, given a calculator, Ava will demonstrate understanding of multiplication with 80% accuracy in 4 of 5 trials, as measured by teacher probes.' },
  { id: 's28', missing: 'skill', domain: 'behavior', text: 'By June 2027, during class, Tyler will work on his self-regulation skills in 4 out of 5 opportunities, as measured by behavior data.' },
  { id: 's29', missing: 'skill', domain: 'speech', text: 'By May 2027, during therapy sessions, Liam will strengthen his articulation skills with 80% accuracy, as measured by SLP data.' },
  { id: 's30', missing: 'skill', domain: 'social', text: 'By June 2027, during recess, Aiden will develop age-appropriate social skills in 4 of 5 observations, as measured by inclusion specialist notes.' },
  { id: 's31', missing: 'skill', domain: 'writing', text: 'By March 2027, given a paragraph frame and a word bank, Sofia will grow as a writer, scoring in 4 of 5 samples as measured by work samples.', note: 'criterion also weak - acceptable' },
  { id: 's32', missing: 'skill', domain: 'OT', text: 'By May 2027, with a pencil grip, Mia will build her fine motor strength in 4 of 5 opportunities as documented by the OT.' },
  { id: 's33', missing: 'skill', domain: 'self-help', text: 'By June 2027, given a visual schedule, Henry will be more independent with self-care in 80% of opportunities, as measured by staff data.' },
  { id: 's34', missing: 'skill', domain: 'transition', text: 'By June 2027, given community outings, Carlos will gain awareness of job options in 4 of 5 opportunities, as measured by the transition specialist.' },
  { id: 's35', missing: 'skill', domain: 'preschool', text: 'By the end of the preschool year, during circle time with visual supports, Zoe will engage appropriately in 80% of trials, as measured by teacher data.' },
  { id: 's36', missing: 'skill', domain: 'reading', text: 'BY JUNE 2027, GIVEN GRADE LEVEL TEXT, STUDENT WILL APPRECIATE AND EXPLORE A VARIETY OF GENRES IN 4 OF 5 TRIALS AS MEASURED BY TEACHER RECORDS.' },
  { id: 's37', missing: 'skill', domain: 'math', text: 'by june 2027 with a number line my son will get better at math facts 80% of the time, teacher keeps a chart' },
  { id: 's38', missing: 'skill', domain: 'behavior', text: 'By May 2027, given a token board, Oliver will be compliant and respectful in 80% of opportunities, as measured by daily paraeducator data.' },

  // ---- missing CRITERION (~12): task-size numbers, goal numbers, dates, ages, grade levels
  { id: 's39', missing: 'criterion', domain: 'reading', text: 'By June 2027, given a 3rd grade passage, Maya will read aloud and answer comprehension questions, as measured by monthly DIBELS probes.', note: 'grade number is task level' },
  { id: 's40', missing: 'criterion', domain: 'writing', text: 'By March 2027, given a writing prompt, Sofia will write a 5-sentence paragraph with a topic sentence, as measured by work samples collected by the teacher.' },
  { id: 's41', missing: 'criterion', domain: 'math', text: 'Goal 4: By May 2027, given 2-digit addition problems with regrouping, Ava will solve the problems, as measured by weekly teacher probes.' },
  { id: 's42', missing: 'criterion', domain: 'self-help', text: 'By June 2027, given a picture schedule, Henry will complete the 5-step handwashing routine, as measured by task analysis data collected by the paraprofessional.' },
  { id: 's43', missing: 'criterion', domain: 'transition', text: 'By June 2027, Carlos (age 16) will complete 2 job applications when given a list of openings, as measured by the transition specialist checklist.', note: '"2 applications" is a product count - debatable' },
  { id: 's44', missing: 'criterion', domain: 'speech', text: 'By May 2027, given a picture scene, Liam will describe it using 5-word sentences, as measured by SLP session notes.' },
  { id: 's45', missing: 'criterion', domain: 'OT', text: 'By May 2027, using adapted scissors, Ethan will cut along a 6-inch curved line, as measured by OT observation.' },
  { id: 's46', missing: 'criterion', domain: 'behavior', text: 'By June 2027, during independent work, Tyler will follow his 3-step break routine when frustrated, as measured by behavior data collected by the aide.' },
  { id: 's47', missing: 'criterion', domain: 'social', text: 'By 6/30/2027, during lunch with a peer buddy, Chloe will hold a conversation about a shared interest, as measured by data collected by the school psychologist.' },
  { id: 's48', missing: 'criterion', domain: 'preschool', text: 'By April 2027, given a model, Lily (age 4) will build 3-block towers, as recorded by the preschool OT on a fine motor checklist.' },
  { id: 's49', missing: 'criterion', domain: 'math', text: 'BY 5/2027, GIVEN A 2-STEP WORD PROBLEM AND A CALCULATOR, STUDENT WILL SOLVE THE PROBLEM AND SHOW HIS WORK, AS MEASURED BY CURRICULUM-BASED ASSESSMENTS ADMINISTERED 2 TIMES PER MONTH.', note: 'measurement frequency number, not criterion' },
  { id: 's50', missing: 'criterion', domain: 'reading', text: 'in 12 months, given 25 sight words on flash cards, my son will read the sight words, his teacher will track it on weekly data sheets' },
  { id: 's51', missing: 'criterion', domain: 'speech', text: 'By June 2027, during 30-minute speech sessions, Noah will use his AAC device to request items, as measured by SLP data.' },

  // ---- missing MEASUREMENT (~12)
  { id: 's52', missing: 'measurement', domain: 'reading', text: 'By June 2027, given a grade-level passage, Maya will read 90 words correct per minute with 95% accuracy.' },
  { id: 's53', missing: 'measurement', domain: 'math', text: 'By May 2027, given 20 addition problems, Ava will solve them with 90% accuracy in 3 consecutive trials.' },
  { id: 's54', missing: 'measurement', domain: 'behavior', text: 'By June 2027, when frustrated, Tyler will request a break using his break card in 4 out of 5 opportunities.' },
  { id: 's55', missing: 'measurement', domain: 'speech', text: 'By May 2027, during structured activities with the speech-language pathologist, Liam will produce /r/ with 80% accuracy across 3 consecutive sessions.', note: 'SLP named as a condition partner, not tracker' },
  { id: 's56', missing: 'measurement', domain: 'OT', text: 'By May 2027, given a pencil grip and a teacher model, Mia will write her name with correct letter formation in 4 of 5 opportunities.' },
  { id: 's57', missing: 'measurement', domain: 'social', text: 'By June 2027, during recess with adult support, Aiden will initiate play with a peer at least 3 times per recess on 4 of 5 days.' },
  { id: 's58', missing: 'measurement', domain: 'self-help', text: 'BY MAY 2027, GIVEN A VERBAL CUE FROM STAFF, STUDENT WILL PUT ON HIS COAT AND ZIP IT INDEPENDENTLY IN 4 OF 5 TRIALS.' },
  { id: 's59', missing: 'measurement', domain: 'transition', text: 'By June 2027, given a monthly budget worksheet and a $500 allowance, Kevin will create a budget with 100% accuracy on 3 consecutive attempts.' },
  { id: 's60', missing: 'measurement', domain: 'writing', text: 'by march 2027 with a word bank and sentence starters my daughter will write 3 complete sentences in 4/5 trials' },
  { id: 's61', missing: 'measurement', domain: 'preschool', text: 'By June 2027, during circle time with a visual schedule, Zoe will attend to the teacher for 10 minutes on 4 of 5 days.' },
  { id: 's62', missing: 'measurement', domain: 'reading', text: 'By June 2027, given data from her reading log as a prompt, Ana will summarize a chapter in 3 sentences with 80% accuracy in 4 of 5 trials.', note: '"data" and "log" are inside the condition' },
  { id: 's63', missing: 'measurement', domain: 'behavior', text: 'By June 2027, when given a self-monitoring checklist, Emma will record her own on-task behavior and stay on task for 85% of intervals across 4 weeks.', note: 'self-monitoring as skill; debatable whether it is measurement' },
  { id: 's64', missing: 'measurement', domain: 'math', text: 'By 11/2027, during math with a teacher-made graph paper template, Priya will line up and solve multi-digit subtraction with 8 of 10 correct on 4 of 5 worksheets.', note: '"teacher-made" in condition' },
];
