#!/usr/bin/env node
/**
 * Disability-language gate (STYLE-GUIDE §4, decided 2026-09-08).
 *
 * Two tiers, because the rule has two halves and only one of them is
 * mechanically decidable:
 *
 *  1. BANNED TERMS — hard fail, ratcheted like [TBC]: a draft may contain
 *     them mid-edit, but nothing advances past founder_edit carrying
 *     "special needs", "differently-abled", "handicapped", or cure/deficit
 *     framing. Suppress a legitimate instance (quoting a district's letter,
 *     naming a statute or an org's actual title) with a marker on the same
 *     line or the line before:  {\/* lang-lint-ok: why *\/}
 *
 *  2. PERSON-FIRST IN AUTISM CONTENT — warn only, never fails. §4 says
 *     autism content is identity-first ("autistic child"), but whether a
 *     given file is autism content, a mirrored parent quote, or a statutory
 *     term is a judgment call. This tier surfaces candidates for the founder
 *     edit; it does not rule on them.
 *
 * Prose only: frontmatter and MDX comment blocks are stripped before
 * scanning, so drafting notes to ourselves don't trip the gate.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = path.resolve(HERE, '..', 'src', 'content');
const GATED = new Set(['in_review', 'approved', 'published']);
const SUPPRESS = /lang-lint-ok/;

const BANNED = [
  { re: /\bspecial needs\b/gi, why: '"special needs" — name the thing: disability, or the specific diagnosis' },
  { re: /\bdifferently[- ]abled\b/gi, why: '"differently-abled" — euphemism; use "disabled" / "with a disability"' },
  { re: /\bhandicapped\b/gi, why: '"handicapped"' },
  { re: /\bsuffers? from\b/gi, why: '"suffers from" — deficit framing' },
  { re: /\bcombat(?:ing)? autism\b/gi, why: '"combat autism" — cure framing' },
  { re: /\brecover(?:y|ed|ing)? from autism\b/gi, why: 'recovery-from-autism framing' },
  { re: /\bafflicted (?:with|by)\b/gi, why: '"afflicted with" — deficit framing' },
];

// Person-first constructions specifically about autism (warn tier).
const PERSON_FIRST_AUTISM =
  /\b(?:child|children|kid|kids|student|students|adult|adults|person|people|individual|individuals)\s+with\s+(?:an\s+)?autism\b/gi;

function mdxFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...mdxFiles(p));
    else if (/\.mdx?$/.test(name)) out.push(p);
  }
  return out;
}

/** Frontmatter and {/* … *\/} comment blocks are not reader-facing prose. */
function proseLines(text) {
  const withoutFrontmatter = text.replace(/^---\n[\s\S]*?\n---\n/, (m) => '\n'.repeat(m.split('\n').length - 1));
  const withoutComments = withoutFrontmatter.replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => '\n'.repeat(m.split('\n').length - 1));
  return withoutComments.split('\n');
}

const errors = [];
const warnings = [];
let checked = 0;

for (const file of mdxFiles(CONTENT)) {
  checked += 1;
  const text = readFileSync(file, 'utf8');
  const status = text.match(/^status:\s*(\S+)/m)?.[1];
  const rel = path.relative(process.cwd(), file);
  const lines = proseLines(text);

  lines.forEach((line, i) => {
    const suppressed = SUPPRESS.test(line) || (i > 0 && SUPPRESS.test(lines[i - 1]));
    if (suppressed) return;

    for (const { re, why } of BANNED) {
      re.lastIndex = 0;
      if (re.test(line)) {
        const hit = `${rel}:${i + 1} — ${why}`;
        // Ratchet: only a gate once the page leaves the drafting stages.
        if (status && GATED.has(status)) errors.push(hit);
        else warnings.push(`${hit} (draft — resolve before review)`);
      }
    }

    PERSON_FIRST_AUTISM.lastIndex = 0;
    const pf = line.match(PERSON_FIRST_AUTISM);
    if (pf) {
      warnings.push(
        `${rel}:${i + 1} — "${pf[0]}": §4 defaults autism content to identity-first ("autistic child"). Keep it only if this mirrors a parent's own words or a statutory term.`,
      );
    }
  });
}

for (const w of warnings) console.warn(`WARN: ${w}`);

if (errors.length) {
  for (const e of errors) console.error(`ERROR: ${e}`);
  console.error('FAIL: banned disability language on a page past founder_edit (STYLE-GUIDE §4).');
  process.exit(1);
}

console.log(
  `PASS: disability language — ${checked} content files scanned; 0 banned terms past founder_edit, ${warnings.length} warning(s).`,
);
