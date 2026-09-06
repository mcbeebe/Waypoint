/** Generates the Chabot Family Navigator (v0.3, 3 pages) Word doc. */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, ShadingType, AlignmentType, BorderStyle, LevelFormat,
} = require('docx');
const fs = require('fs');

const NAVY = '1B2A4A', TEAL = '0891B2', SAGE = '10B981', CORAL = 'F97316';
const MID = '64748B', LIGHT = 'F8FAFC', BORDER = 'E2E8F0', WHITE = 'FFFFFF';
const TEALSOFT = 'E8F2F7', SAGESOFT = 'E6F7F1';
const FONT = 'Calibri', DISPLAY = 'Georgia';

const CONTENT_W = 10080; // letter 12240 − 2×1080 margins

const numbering = {
  config: [{
    reference: 'bullets',
    levels: [{
      level: 0, format: LevelFormat.BULLET, text: '•',
      style: { paragraph: { indent: { left: 360, hanging: 200 } } },
    }],
  }],
};

const cellBorders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  left: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  right: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
};

const run = (text, opts = {}) => new TextRun({ text, font: FONT, size: 20, color: '334155', ...opts });

const title = (text) => new Paragraph({
  spacing: { after: 60 },
  children: [run(text, { size: 46, bold: true, color: NAVY, font: DISPLAY })],
});

const subtitle = (text) => new Paragraph({
  spacing: { after: 70 },
  children: [run(text, { size: 23, bold: true, color: TEAL })],
});

const tagline = (text) => new Paragraph({
  spacing: { after: 170 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: TEAL } },
  children: [run(text, { size: 19, italics: true, color: MID })],
});

const sectionHead = (text, color = NAVY) => new Paragraph({
  spacing: { before: 230, after: 100 },
  shading: { type: ShadingType.CLEAR, fill: color },
  indent: { left: 80, right: 80 },
  children: [run(`  ${text}`, { size: 22, bold: true, color: WHITE })],
});

const pathHead = (text, color = TEAL) => new Paragraph({
  spacing: { before: 180, after: 70 },
  children: [run(text, { size: 22, bold: true, color, font: DISPLAY })],
});

const body = (children, opts = {}) => new Paragraph({
  spacing: { after: 80 }, ...opts,
  children: children.map(c => typeof c === 'string' ? run(c) : c),
});

const bullet = (children) => new Paragraph({
  numbering: { reference: 'bullets', level: 0 },
  spacing: { after: 70 },
  children: children.map(c => typeof c === 'string' ? run(c) : c),
});

const step = (n, children) => new Paragraph({
  spacing: { after: 70 },
  indent: { left: 460, hanging: 300 },
  children: [
    run(`${n}.  `, { bold: true, color: TEAL, size: 21 }),
    ...children.map(c => typeof c === 'string' ? run(c) : c),
  ],
});

const box = (children, fill = TEALSOFT) => new Paragraph({
  spacing: { before: 60, after: 120 },
  shading: { type: ShadingType.CLEAR, fill },
  indent: { left: 140, right: 140 },
  border: {
    top: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
    left: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
    right: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  },
  children: children.map(c => typeof c === 'string' ? run(c) : c),
});

const footer = (text) => new Paragraph({
  spacing: { before: 220 },
  border: { top: { style: BorderStyle.SINGLE, size: 6, color: BORDER } },
  children: [run(text, { size: 16, italics: true, color: MID })],
});

// Fill-in blanks: coral + yellow highlight so nothing ships unnoticed.
const fill = (t) => run(t, { bold: true, color: CORAL, highlight: 'yellow' });

function table(colWidths, headerCells, rows, headerFill = NAVY, pad = 60) {
  const mkCell = (content, opts = {}) => new TableCell({
    width: { size: opts.w, type: WidthType.DXA },
    borders: cellBorders,
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill } : undefined,
    margins: { top: pad, bottom: pad, left: 100, right: 100 },
    children: [new Paragraph({
      children: content.map(c => typeof c === 'string' ? run(c, opts.runOpts) : c),
    })],
  });
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headerCells.map((h, i) => mkCell([h], {
          w: colWidths[i], fill: headerFill,
          runOpts: { bold: true, color: WHITE, size: 19 },
        })),
      }),
      ...rows.map((r, ri) => new TableRow({
        cantSplit: true,
        children: r.map((c, i) => mkCell(Array.isArray(c) ? c : [c], {
          w: colWidths[i], fill: ri % 2 ? LIGHT : WHITE,
        })),
      })),
    ],
  });
}

// The Day 0 → 15 → 60 schedule strip.
function scheduleStrip() {
  const w = CONTENT_W / 3;
  const cell = (day, text) => new TableCell({
    width: { size: w, type: WidthType.DXA },
    borders: cellBorders,
    shading: { type: ShadingType.CLEAR, fill: TEALSOFT },
    margins: { top: 90, bottom: 90, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [run(day, { size: 30, bold: true, color: TEAL, font: DISPLAY })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [run(text, { size: 19, color: '334155' })],
      }),
    ],
  });
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [w, w, w],
    rows: [new TableRow({
      cantSplit: true,
      children: [
        cell('DAY 0', 'You send the magic words asking for testing.'),
        cell('BY DAY 15', 'The school sends you a testing plan to sign.'),
        cell('BY DAY 60', 'Testing is done — the team meets to talk it through with you.'),
      ],
    })],
  });
}

// ─── Page 1 — Find your path ───

const p1 = [
  title('The Chabot Family Navigator'),
  subtitle('A friendly map for families of kids with ADHD, autism, and other brains that work differently'),
  tagline('Written by a Chabot parent who’s been exactly where you are. The short version: you’re not alone, it’s always okay to ask, and you and the school are on the same team. Here’s the map.'),

  body([run('How this guide works. ', { bold: true, color: NAVY, size: 21 }),
    'School support can feel like a maze full of acronyms. It isn’t, really. It’s ',
    run('three paths, a few magic words, and a shared schedule.', { bold: true }),
    ' Find the path that sounds like your family, follow the steps, and flip to page 2 whenever you hit a word that makes your eyes cross — there’s a decoder for that.']),

  sectionHead('FIND YOUR PATH'),

  pathHead('🌱 PATH 1 — “Something’s going on with my kid, but nobody’s named it yet.”'),
  body(['Maybe it’s big feelings after school. Trouble sitting still, or making friends, or notes coming home. You don’t need a diagnosis to start — just curiosity, and a team. The school wants to figure this out with you.']),
  step(1, [run('Start with the teacher. ', { bold: true }), 'Ask the simplest question there is: ', run('“What are you seeing?”', { italics: true }), ' Teachers see 25 kids a day; their answer is gold — and they’ll be glad you asked.']),
  step(2, [run('Ask for an SST. ', { bold: true }), 'That’s just a meeting — you, the teacher, and a few school folks around a table comparing notes and trying ideas together. No forms to fear, nothing signed away. The front office can set one up.']),
  step(3, [run('Or ask for free testing. ', { bold: true }), 'The school can test how your child learns — for free — so everyone understands what helps. Just ask ', run('in writing', { bold: true }), ' (the magic words are on page 2).']),
  box([run('The friendly secret: ', { bold: true, color: NAVY }),
    'when you ask in writing, an official schedule begins — set by California law so that nothing gets lost in a busy school year. A hallway chat is lovely; an email is a hallway chat the calendar remembers. Do both!']),

  pathHead('💬 PATH 2 — “A doctor gave us a diagnosis, but school looks the same.”'),
  body(['Here’s the plain truth, with no villain in it: doctors and schools run on different paperwork, so a diagnosis doesn’t automatically flow into the classroom. Bridging that gap is a conversation — and there are ', run('two menus', { bold: true }), ' to talk through together:']),
  bullet([run('A 504 plan = the small-changes list. ', { bold: true, color: TEAL }), 'Sitting near the teacher. Movement breaks. Extra time on tests. Little adjustments, written down, so every adult at school knows them — even a substitute on day one.']),
  bullet([run('An IEP = the big plan. ', { bold: true, color: TEAL }), 'Actual extra teaching and services — small-group help, speech, occupational therapy — with written goals the whole team celebrates and updates every year.']),
  body([run('Not sure which fits? ', { bold: true }), 'Nobody expects you to be. Ask for the free testing (Path 1, step 3). The results help you ', run('and', { italics: true }), ' the school pick together — and testing often explains your kid better than years of guessing.']),

  pathHead('🌟 PATH 3 — “We have an IEP or 504, and something needs a tune-up.”'),
  body(['Plans are living things. Kids grow, classrooms change, and what worked in fall might need adjusting by spring. That’s normal — and it’s what the team is for.']),
  step(1, [run('Start with a friendly check-in. ', { bold: true }), run('“Could we look at how the reading help is going? Here’s what we’re seeing at home.”', { italics: true }), ' Most tune-ups happen right here, in one conversation.']),
  step(2, [run('You can gather the team any time. ', { bold: true }), 'Not just at the once-a-year review. Ask in writing, and the meeting lands on the calendar within ', run('30 days', { bold: true }), '.']),
  step(3, [run('Before any meeting: ', { bold: true }), 'ask for the reports and goals ahead of time, and bring one page of notes about what you see at home. You know your kid best — that page helps the team see the whole child.']),
];

// ─── Page 2 — Decoder, schedule, magic words ───

const p2 = [
  sectionHead('🔤 THE DECODER RING', TEAL),
  body(['Every field has its alphabet soup. Here’s yours, translated:'], { spacing: { after: 60 } }),
  table([1560, 2700, 5820],
    ['The letters', 'Stand for', 'What it actually means'],
    [
      [[run('IEP', { bold: true })], 'Individualized Education Program', 'The big plan: extra teaching and services, with goals, in writing, that the whole team works toward together.'],
      [[run('504', { bold: true })], 'Section 504 (a 1973 civil-rights law)', 'The small-changes list: seating, breaks, extra time — written down so every adult knows, every day.'],
      [[run('SST', { bold: true })], 'Student Success Team', 'A no-pressure meeting where you and the school compare notes and try ideas. Often the first step.'],
      [[run('IDEA', { bold: true })], 'Individuals with Disabilities Education Act', 'The national promise behind all of this: every kid gets what they need to learn, for free.'],
      [[run('Evaluation', { bold: true })], '(also “assessment”)', 'Free testing by school specialists so everyone understands how your child learns and what helps.'],
      [[run('RSP', { bold: true })], 'Resource Specialist Program', 'The teacher whose whole job is giving kids extra help. Chabot has one — go say hi.'],
      [[run('OT', { bold: true })], 'Occupational Therapy', 'Help with hands and bodies: handwriting, scissors, staying comfortable and calm in a busy classroom.'],
      [[run('ESY', { bold: true })], 'Extended School Year', 'Summer learning for kids who lose skills over long breaks — part of some IEPs. Ask in spring.'],
    ], TEAL, 40),

  sectionHead('📅 THE SHARED SCHEDULE — THIS IS THE PART TO REMEMBER'),
  body(['When you ask ', run('in writing', { bold: true }), ', California sets a schedule everyone can count on — so you always know what happens next:'], { spacing: { after: 60 } }),
  scheduleStrip(),
  body(['And any time you already have a plan: a written request for a team meeting puts it on the calendar ', run('within 30 days.', { bold: true })], { spacing: { before: 100, after: 40 } }),
  body([run('The fine print: Cal. Ed. Code §§ 56321, 56344, 56343.5. School breaks longer than 5 days pause the schedule — so asks sent before winter break land sooner than asks sent after.', { size: 16, italics: true, color: MID })], { spacing: { after: 40 } }),

  sectionHead('✉️ THE MAGIC WORDS (COPY, PASTE, ADD YOUR KID’S NAME, SEND)', TEAL),
  body(['Email these to the principal. One sentence is genuinely enough — it gives the school exactly what it needs to get started.'], { spacing: { after: 60 } }),
  table([2500, 7580],
    ['You’d like', 'Send this'],
    [
      ['Free testing', [run('“I’m requesting a special education assessment for my child, [name], under IDEA. Please send me an assessment plan.”', { italics: true })]],
      ['A team meeting (IEP)', [run('“I’d like to request an IEP team meeting for [name] to talk about [topic]. What dates work for the team?”', { italics: true })]],
      ['The small-changes list (504)', [run('“I’d like to talk about a 504 plan for [name]. Who should I meet with, and when?”', { italics: true })]],
      ['Your kid’s file', [run('“I’m requesting a complete copy of [name]’s student records, including all assessments. Thank you!”', { italics: true })]],
    ], TEAL, 50),
  box([run('Two tiny habits that change everything: ', { bold: true, color: NAVY }),
    'keep a copy of every email, and lead with kindness every time. Writing keeps everyone organized; kindness keeps everyone on the same team. That combination solves almost everything.'], SAGESOFT),
];

// ─── Page 3 — People & places ───

const p3 = [
  sectionHead('🏫 YOUR CHABOT CREW'),
  body(['These are the humans — and they’re your partners from day one. They chose jobs helping kids; start from that.']),
  table([4400, 2300, 3380],
    ['Who', 'Name', 'How to reach them'],
    [
      ['Principal', [fill('[fill in]')], [fill('[email]')]],
      ['RSP teacher (the extra-help teacher)', [fill('[fill in]')], [fill('[email]')]],
      ['School psychologist (runs the testing)', [fill('[fill in]')], [fill('[email]')]],
      ['504 coordinator (keeper of the small-changes lists)', [fill('[fill in]')], [fill('[email]')]],
      ['Front office (they know everything)', [fill('[fill in]')], [fill('[phone]')]],
      ['PTA inclusion contact (a fellow parent)', [fill('[fill in]')], [fill('[email]')]],
    ]),

  sectionHead('🗺️ THE WIDER WORLD, TRANSLATED', TEAL),
  bullet([run('OUSD Special Education', { bold: true }), ' — the district office that supports every Oakland school’s plans and testing. ousd.org/specialeducation · ', fill('[dept phone]')]),
  bullet([run('CAC (Community Advisory Committee)', { bold: true }), ' — Oakland’s parent group for special education. Real parents, real answers, and the district’s special-ed leaders in the room, listening. Meets the 1st Monday of each month ', fill('[re-verify time/place before print]'), '.']),
  bullet([run('RCEB (Regional Center of the East Bay)', { bold: true }), ' — a state-funded office that pays for help ', run('outside', { italics: true }), ' school: therapy, parent coaching, breaks for caregivers. ', run('Autism qualifies; ADHD alone usually doesn’t', { bold: true }), ' — but the phone call is free and they’re kind, so make it. rceb.org']),
  bullet([run('DREDF', { bold: true }), ' — a Berkeley nonprofit of parents and lawyers who teach families how school support works, free. Classes, guides, and a phone line for when you’re stuck. dredf.org']),
  bullet([run('Family Resource Navigators', { bold: true }), ' — Alameda County parents (who’ve been there) helping families find services and untangle insurance and Medi-Cal. familyresourcenavigators.org']),
  bullet([run('The insurance thing worth knowing: ', { bold: true }), 'California law requires health plans — including Medi-Cal — to cover autism behavioral therapy (ABA). If a plan says no, it’s worth a second ask, and the folks above can help you make it. (SB 946)']),

  sectionHead('💛 FIND YOUR PEOPLE', SAGE),
  bullet([run('Chabot Neurodiverse Families Google Group', { bold: true }), ' — private and parent-run. Which camps actually work. Which therapists have openings. How the IEP meeting really went. Zero judgment, because everyone in it gets it. Join: ', fill('[group link / QR code]')]),
  bullet([run('Berkeley Parents Network', { bold: true }), ' — twenty years of Oakland parents answering each other’s exact questions. berkeleyparentsnetwork.org']),

  sectionHead('⭐ THREE PROMISES FROM PARENTS WHO’VE BEEN THERE'),
  step(1, [run('Ask in writing, every time. ', { bold: true }), 'Writing keeps busy people organized, makes plans official, and keeps everyone’s promises easy to keep — yours included.']),
  step(2, [run('Lead with friendly. ', { bold: true }), 'The teachers and specialists want your kid to succeed. Start every ask like you believe that — because it’s true, and because this team is yours for years.']),
  step(3, [run('Bring a buddy whenever you like. ', { bold: true }), 'A friend, a Group parent, or a free DREDF-trained advocate is welcome at any meeting. A second set of ears makes everything easier.']),

  footer('Made with love by a Chabot parent. This is a map, not legal advice — the schedule cites California Education Code, and details change, so double-check with OUSD. Version 0.3 · September 2026 · A Waypoint community project.'),
];

const props = {
  page: {
    size: { width: 12240, height: 15840 },
    margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 },
  },
};

const outDir = '/home/user/Waypoint/Roadmap/initiatives/008-chabot-local-tools/exports';
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const doc = new Document({
    numbering,
    sections: [p1, p2, p3].map(children => ({ properties: props, children })),
  });
  fs.writeFileSync(`${outDir}/Chabot-Family-Navigator-v0.3.docx`, await Packer.toBuffer(doc));
  console.log('wrote Chabot-Family-Navigator-v0.3.docx');
})();
