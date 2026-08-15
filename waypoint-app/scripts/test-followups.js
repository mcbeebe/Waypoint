/**
 * Ad-hoc checks for src/lib/followups.ts (no test runner in this project).
 * Usage: node scripts/test-followups.js   (exits non-zero on failure)
 *
 * Strips TS types crudely since the module is dependency-free.
 */
const fs = require('fs');
const path = require('path');

const src = fs
  .readFileSync(path.join(__dirname, '../src/lib/followups.ts'), 'utf8')
  .replace(/export interface[\s\S]*?\n}\n/, '')
  .replace(/\(text: string\)/g, '(text)')
  .replace(/\)\s*:\s*[A-Za-z]+(\s*\{)/g, ')$1')
  .replace(/export /g, '');
const mod = {};
new Function(
  `${src}; this.parseFollowups = parseFollowups; this.hideStreamingTrailer = hideStreamingTrailer;`
).call(mod);

const { parseFollowups, hideStreamingTrailer } = mod;

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) {
    failures++;
    console.log('   expected:', JSON.stringify(expected));
    console.log('   actual:  ', JSON.stringify(actual));
  }
}

// parseFollowups
check(
  'normal trailer',
  parseFollowups('Answer text.\n\n[[FOLLOWUPS: Appeal steps | Draft the letter | What is an IPP?]]'),
  { content: 'Answer text.', followUps: ['Appeal steps', 'Draft the letter', 'What is an IPP?'] }
);
check(
  'two options',
  parseFollowups('Short answer.\n[[FOLLOWUPS: More detail | Next steps]]'),
  { content: 'Short answer.', followUps: ['More detail', 'Next steps'] }
);
check('no trailer', parseFollowups('Just an answer.'), {
  content: 'Just an answer.',
  followUps: [],
});
check(
  'truncated trailer (missing ]])',
  parseFollowups('Answer.\n[[FOLLOWUPS: Appeal steps | Draf'),
  { content: 'Answer.', followUps: [] }
);
check(
  'five options capped at 3',
  parseFollowups('A.\n[[FOLLOWUPS: a | b | c | d | e]]').followUps.length,
  3
);
check(
  'bracket in body untouched',
  parseFollowups('Send to [email/address]. Done.'),
  { content: 'Send to [email/address]. Done.', followUps: [] }
);

// hideStreamingTrailer (mid-stream fragments)
check('hide: no trailer', hideStreamingTrailer('Partial answ'), 'Partial answ');
check('hide: lone bracket', hideStreamingTrailer('Answer.\n['), 'Answer.');
check('hide: double bracket', hideStreamingTrailer('Answer.\n[['), 'Answer.');
check('hide: partial keyword', hideStreamingTrailer('Answer.\n[[FOLLOW'), 'Answer.');
check(
  'hide: unterminated options',
  hideStreamingTrailer('Answer.\n[[FOLLOWUPS: Appeal steps | Dr'),
  'Answer.'
);
check(
  'hide: complete trailer',
  hideStreamingTrailer('Answer.\n[[FOLLOWUPS: a | b]]'),
  'Answer.'
);
check(
  'hide: bracket in body kept',
  hideStreamingTrailer('Use [date] as placeholder. More text'),
  'Use [date] as placeholder. More text'
);

process.exit(failures === 0 ? 0 : 1);
