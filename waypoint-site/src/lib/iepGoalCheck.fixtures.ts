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
