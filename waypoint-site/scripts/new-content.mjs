#!/usr/bin/env node
/**
 * Content scaffolder: `npm run new -- <guide|answer|letter|rc> <slug>`
 * Emits a schema-valid draft MDX skeleton in the right collection with the
 * pipeline's non-negotiables pre-wired: status draft, [TBC] reminders,
 * deliberate-choice comments on nextReviewEvent/disclaimerVariant.
 *
 * The keyword-map row must exist FIRST (pipeline §1.1: no row → no draft).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const [kind, slug] = process.argv.slice(2);

const KINDS = ['guide', 'answer', 'letter', 'rc'];
if (!KINDS.includes(kind) || !slug || !/^[a-z0-9/-]+$/.test(slug)) {
  console.error('Usage: npm run new -- <guide|answer|letter|rc> <slug>');
  console.error('  guide slugs may nest (e.g. benefits/my-guide, start/my-diagnosis)');
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const leaf = slug.split('/').pop();

// Pipeline §1.1: refuse to scaffold without a keyword-map row for the URL.
const urlByKind = {
  guide: slug.startsWith('start/') ? `/${slug}/` : `/guides/${slug}/`,
  answer: `/answers/${slug}/`,
  letter: `/letters/${slug}/`,
  rc: `/regional-centers/${slug}/`,
};
const map = readFileSync(path.join(ROOT, 'content-ops', 'keyword-map.yaml'), 'utf8');
if (!map.includes(`url: "${urlByKind[kind]}"`)) {
  console.error(
    `ERROR: no keyword-map row for ${urlByKind[kind]} — add the row first (pipeline §1.1: no row → no draft).`,
  );
  process.exit(1);
}

const dirByKind = {
  guide: 'src/content/guides',
  answer: 'src/content/answers',
  letter: 'src/content/letters',
  rc: 'src/content/regional-centers',
};
const target = path.join(ROOT, dirByKind[kind], `${slug}.mdx`);
if (existsSync(target)) {
  console.error(`ERROR: ${path.relative(ROOT, target)} already exists.`);
  process.exit(1);
}

const extra = {
  guide: 'pillar: benefits # ← set to the keyword-map row’s pillar',
  answer:
    'pillar: benefits # ← set to the keyword-map row’s pillar\nquestionSource: editorial # chat-mined | gsc | paa | kb | editorial',
  letter: `pillar: iep # ← set to the keyword-map row’s pillar\nletterId: ${leaf} # write-once — the D3 letter_copied identity`,
  rc: `rcId: ${leaf} # must be in RC_IDS (src/content.config.ts)\nrcName: "[TBC: full center name]"\ncounties:\n  - "[TBC: verify against the DDS listing]"\nintakePhone: null\nintakeUrl: null\nddsListingUrl: null\nverifiedAsOf: ${today}`,
}[kind];

const body = `---
title: "[TBC: SEO title, ≤70 chars]"
description: "[TBC: meta description, 40–160 chars — the direct answer, not a teaser.]"
locale: en
translationKey: ${leaf}
status: draft
${extra}
dateModified: ${today}
# Choose deliberately (pipeline §2.2/2.3) — a defaulted value is a defect:
nextReviewEvent: annual # ssa-cola-oct | ssi-fbr-jan | ihss-wages-jan | may-revise | june-budget | rc-pos-annual | annual
disclaimerVariant: legal # legal | benefits | medical
---

{/*
  DRAFT — list every fact needing verification here, one [TBC] per claim.
  sources[] stays empty until the founder-edit verify pass confirms URLs.
*/}

import AnswerFirst from '../../components/AnswerFirst.astro';
import Cite from '../../components/Cite.astro';
import HandoffCTA from '../../components/HandoffCTA.astro';
import PlainBox from '../../components/PlainBox.astro';

<PlainBox>
  [TBC: plain-language summary, grade ≤6 — what this is, who it’s for, the one thing to know.]
</PlainBox>

<AnswerFirst>
  [TBC: the direct answer, first — with its citation chip.] <Cite>[TBC]</Cite>
</AnswerFirst>

[TBC: body — voice arc per STYLE-GUIDE §1: validate the feeling → precise,
statute-cited steps → close with earned pride. Cross-link the pillar page
and ≥2 siblings.]

<HandoffCTA
  heading="[TBC]"
  body="[TBC]"
  action="[TBC] →"
  slug="${urlByKind[kind].replace(/^\/|\/$/g, '')}"
  cta="guide-footer"
  pillar="benefits"
/>
`;

mkdirSync(path.dirname(target), { recursive: true });
writeFileSync(target, body);
console.log(`Created ${path.relative(ROOT, target)} (status: draft).`);
console.log('Next: fix the relative import depth if the slug nests, fill [TBC]s, run npm run gates.');
