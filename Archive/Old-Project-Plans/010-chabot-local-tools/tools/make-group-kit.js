/** Generates the Chabot Google Group setup kit Word doc (v0.1). */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, LevelFormat,
} = require('docx');
const fs = require('fs');

const NAVY = '1B2A4A', TEAL = '0891B2', SAGE = '10B981', CORAL = 'F97316';
const MID = '64748B', LIGHT = 'F8FAFC', BORDER = 'E2E8F0', WHITE = 'FFFFFF';
const TEALSOFT = 'E8F2F7', SAGESOFT = 'E6F7F1';
const FONT = 'Calibri', DISPLAY = 'Georgia';
const CONTENT_W = 10080;

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
const fill = (t) => run(t, { bold: true, color: CORAL, highlight: 'yellow' });

const title = (text) => new Paragraph({
  spacing: { after: 60 },
  children: [run(text, { size: 40, bold: true, color: NAVY, font: DISPLAY })],
});
const subtitle = (text) => new Paragraph({
  spacing: { after: 160 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: TEAL } },
  children: [run(text, { size: 20, italics: true, color: MID })],
});
const sectionHead = (text, color = NAVY) => new Paragraph({
  spacing: { before: 240, after: 100 },
  shading: { type: ShadingType.CLEAR, fill: color },
  indent: { left: 80, right: 80 },
  children: [run(`  ${text}`, { size: 22, bold: true, color: WHITE })],
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
// Blockquote paragraph: light card + teal left rail. Pass last=true on the
// final line of a quote block for extra space after.
const bq = (children, opts = {}) => new Paragraph({
  spacing: { after: opts.last ? 140 : 20 },
  indent: { left: 260, right: 140 },
  shading: { type: ShadingType.CLEAR, fill: opts.fill || 'FBF9F4' },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: TEAL } },
  children: children.map(c => typeof c === 'string' ? run(c, { size: 19 }) : c),
});
const bqLabel = (text) => bq([run(text, { size: 16, bold: true, color: TEAL, allCaps: true })]);
const footer = (text) => new Paragraph({
  spacing: { before: 220 },
  border: { top: { style: BorderStyle.SINGLE, size: 6, color: BORDER } },
  children: [run(text, { size: 16, italics: true, color: MID })],
});

function table(colWidths, headerCells, rows, headerFill = NAVY, pad = 45) {
  const mkCell = (content, opts = {}) => new TableCell({
    width: { size: opts.w, type: WidthType.DXA },
    borders: cellBorders,
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill } : undefined,
    margins: { top: pad, bottom: pad, left: 100, right: 100 },
    children: [new Paragraph({
      children: content.map(c => typeof c === 'string' ? run(c, opts.runOpts || { size: 18 }) : c),
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
          runOpts: { bold: true, color: WHITE, size: 18 },
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

const b = (t) => run(t, { bold: true, size: 19 });
const i19 = (t) => run(t, { italics: true, size: 19 });

const kids = [
  title('Chabot Google Group — Setup Kit'),
  subtitle('Everything needed to launch “Chabot Neurodiverse Families” in one sitting: settings, norms, welcome copy, seed invites, and the moderation playbook. Fill the highlighted blanks as you go.'),

  sectionHead('1 · CREATE THE GROUP  (15 MINUTES · GROUPS.GOOGLE.COM)'),
  step(1, ['Go to ', run('groups.google.com', { bold: true }), ' → ', run('Create group', { bold: true }), '.']),
  step(2, [run('Name: ', { bold: true }), 'Chabot Neurodiverse Families']),
  step(3, [run('Group email: ', { bold: true }), 'chabot-nd-families@googlegroups.com — short enough to say out loud at pickup. (If taken: chabot-neurodiverse-families.)']),
  step(4, [run('Description & welcome message: ', { bold: true }), 'paste from sections 2 and 3.']),
  step(5, ['Open ', run('Group settings', { bold: true }), ' and set the table below.']),
  table([3300, 3100, 3680],
    ['Setting', 'Value', 'Why'],
    [
      ['Who can see group', 'Anyone on the web', 'So the flyer QR resolves to an “ask to join” page'],
      ['Who can join group', 'Anyone on the web can ask', 'You approve each request — the front door'],
      ['Allow external members', [b('On')], 'Parents without Gmail can join by email'],
      ['Who can view conversations', 'Group members', 'The privacy promise — nothing is public'],
      ['Who can post', 'Group members', '—'],
      ['Who can view members', 'Group members', 'Don’t expose the member list'],
      ['Conversation history', [b('On')], 'This IS the archive — the whole point'],
      ['Message moderation', 'No moderation', 'Trust-first for members'],
      ['New member restrictions', 'New member posts are moderated', 'Catches spam; approve their first post, then they’re free'],
      ['Spam message handling', 'Moderate and notify', '—'],
      ['Subject prefix', '[ChabotND]', 'Threads are findable in a crowded inbox'],
      ['Email footer', 'On, with the norms link', 'Every email carries the exit and the rules'],
    ]),
  body([]),
  step(6, [run('Add a co-owner immediately ', { bold: true }), '(Member moderation → promote): ', fill('[co-moderator name/email]'), '. Two moderators, never one.']),
  step(7, ['Post the pinned first post (section 4), then send the seed invites (section 5).']),
  step(8, [run('Close the loop: ', { bold: true }), 'paste the join link (groups.google.com/g/chabot-nd-families) into every yellow ', fill('[group link]'), ' blank in the Navigator and flyer.']),

  sectionHead('2 · GROUP DESCRIPTION  (PUBLIC — THE JOIN PAGE SHOWS THIS)', TEAL),
  bq([run('A private, parent-run group for Chabot Elementary families raising kids with ADHD, autism, and other brains that work differently. We trade the real answers: which camps actually work, which therapists have openings, how the IEP meeting really went. Zero judgment — everyone here gets it.', { size: 19 })]),
  bq([run('To join, tell us your connection to Chabot (kid’s grade or teacher is plenty). Membership is Chabot families and staff-recommended friends only, and everything shared inside stays inside.', { size: 19 })], { last: true }),

  sectionHead('3 · WELCOME MESSAGE  (NEW MEMBERS SEE THIS ON JOINING)', TEAL),
  bq([b('Welcome — we’re glad you found us. 💛')]),
  bq([run('This group is Chabot parents helping Chabot parents. Ask anything — the question you’re embarrassed to ask is the one five other families are quietly googling at midnight. Three things to know:', { size: 19 })]),
  bq([b('1. What’s shared here stays here. '), run('That’s the deal that makes honest answers possible.', { size: 19 })]),
  bq([b('2. We’re partners with our school. '), run('Vent feelings freely; leave staff names out of the hard stuff. (Praise by name is always welcome!)', { size: 19 })]),
  bq([b('3. Start with the map. '), run('The Chabot Family Navigator — what to ask for, who to ask, and the exact words to use: ', { size: 19 }), fill('[navigator link]')]),
  bq([run('Introduce yourself when you’re ready (kid’s grade + one thing that’s working + one thing that’s hard is a great format). Or just lurk for a while — that’s allowed too.', { size: 19 })], { last: true }),

  sectionHead('4 · THE PINNED FIRST POST — “START HERE” AND THE FIVE NORMS'),
  body([run('Subject: ', { bold: true }), run('[ChabotND] Start here — what this group is, and our five norms', { italics: true })]),
  bq([run('Hi, I’m ', { size: 19 }), fill('[your first name]'), run(' — Chabot parent, and the one who hit “create group.” Here’s what this is and how we keep it good.', { size: 19 })]),
  bq([b('What this group is for: '), run('the school-specific knowledge that exists nowhere else. Which after-school programs genuinely handle our kids. Which OTs have openings. What an SST at Chabot is actually like. You ask, someone who’s been there answers, and the answer stays searchable for the next family.', { size: 19 })]),
  bq([b('Our five norms:')]),
  bq([b('1. What’s shared here stays here. '), run('Screenshots and forwards break the group. Don’t.', { size: 19 })]),
  bq([b('2. We’re partners with our school. '), run('The teachers and specialists want our kids to succeed. Vent feelings, not names — praise by name, but keep staff names out of the hard stuff. If something needs raising, the Navigator has the friendly words to raise it well.', { size: 19 })]),
  bq([b('3. Every question is a good question. '), run('First-week-of-diagnosis questions especially. Nobody here was born knowing what an IEP is.', { size: 19 })]),
  bq([b('4. Advice is experience, not prescription. '), run('We share what worked for our kid. Doctors, therapists, and DREDF get the final word on medical and legal questions.', { size: 19 })]),
  bq([b('5. Our kids’ privacy leads. '), run('Share what you’d be comfortable with your child reading someday. Initials are always fine.', { size: 19 })]),
  bq([run('(And one small one: no sales pitches — vendor recommendations are gold, vendor self-promotion isn’t. Check with a moderator first.)', { size: 19, italics: true })]),
  bq([b('Moderators: '), fill('[you]'), run(' and ', { size: 19 }), fill('[co-moderator]'), run('. Reply here or email us directly any time.', { size: 19 })]),
  bq([run('Now — introduce yourself below if you like: kid’s grade, one thing that’s working, one thing that’s hard. I’ll go first in the comments.', { size: 19 })], { last: true }),

  sectionHead('5 · SEED INVITE  (PERSONAL EMAIL TO 3–5 FAMILIES YOU KNOW)', TEAL),
  body([run('Subject: ', { bold: true }), run('Starting something small for Chabot families like ours', { italics: true })]),
  bq([run('Hi ', { size: 19 }), fill('[name]'), run(',', { size: 19 })]),
  bq([run('I’m starting a small private email group for Chabot families raising kids with ADHD, autism, and other brains that work differently — a place to trade the real answers (camps, therapists, how IEP meetings actually go) without judgment, because everyone in it gets it.', { size: 19 })]),
  bq([run('I’m asking you first, before it goes on any flyer, because you’re exactly the kind of parent who makes a group like this worth joining. Would you be one of the founding few? All it takes is accepting the invite and, when you get a minute, answering someone’s question once in a while.', { size: 19 })]),
  bq([run('Join here: ', { size: 19 }), fill('[group link]'), run(' — and if you know another Chabot family who should be in the room, tell me or just forward this.', { size: 19 })]),
  bq([fill('[your name]'), run(' · ', { size: 19 }), fill('[kid]'), run('’s parent, Room ', { size: 19 }), fill('[x]')], { last: true }),

  sectionHead('6 · THE FIRST TWO WEEKS  (HOW A GROUP COMES ALIVE)', SAGE),
  bullet([b('Day 1: '), 'pinned post up, your own intro in its comments, seed invites out.']),
  bullet([b('Day 2–3: '), 'post two real questions yourself — ones you genuinely want answered (“Anyone’s kid done the ', fill('[local camp]'), ' aftercare? How’d it go?”). Nothing invites a first post like an answerable question.']),
  bullet([b('Week 1: '), 'ask each seed family, personally, to post one question or one recommendation. Ten posts in the archive changes how the room feels.']),
  bullet([b('Week 2: '), 'flyer goes out (backpack folder / PTA newsletter) with the QR. From here it grows itself.']),
  bullet([b('Monthly, 10 minutes: '), 'approve pending members, welcome new folks by name, re-pin anything that answered a big question.']),

  sectionHead('7 · MODERATION PLAYBOOK'),
  bullet([b('A join request you don’t recognize. '), 'Reply asking their Chabot connection (“whose class is your kiddo in?”). Room parents and the front office can confirm edge cases. When in doubt, a quick friendly email beats a silent decline.']),
  bullet([b('A thread heats up about a staff member. '), 'Don’t delete — redirect, fast and kindly, in-thread: ', i19('“Totally hear the frustration — let’s keep names out per our norms. The Navigator has the friendly script for raising exactly this, and I’m happy to help you draft the ask — message me.”'), ' The norm does the work; you just point at it.']),
  bullet([b('A vendor or salesy post. '), 'Recommendations from parents are always welcome; self-promotion goes through a moderator, and the answer is usually a friendly no.']),

  footer('One honest note: Google’s join-request flow lets a requester add a note, but personal groups have no formal custom “join question” field — the description does that job by telling people what to include. Verify setting names against the live UI; Google moves furniture occasionally. Kit v0.1 · September 2026 · Initiative 008 · A Waypoint community project.'),
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
  const doc = new Document({ numbering, sections: [{ properties: props, children: kids }] });
  fs.writeFileSync(`${outDir}/Chabot-Google-Group-Kit-v0.1.docx`, await Packer.toBuffer(doc));
  console.log('wrote Chabot-Google-Group-Kit-v0.1.docx');
})();
