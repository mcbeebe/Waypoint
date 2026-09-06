# Waypoint Style Guide

**Owner:** Mike Beebe · **Applies to:** all content in `src/content/` (EN and ES) · **Last updated:** 2026-09-06

Companion to `content-ops/CONTENT-PIPELINE.md`. The pipeline says *when* things happen; this guide says *how the words sound*. Frozen contracts (`src/content.config.ts`, `docs/analytics-taxonomy.md`) win over anything here.

> **The one-sentence voice:** Waypoint sounds like a friend who happens to be a disability rights attorney — warm first, precise always, never scary.

---

## 1. Voice

Every piece follows the same three-beat arc:

1. **Validate the feeling first.** Name what the parent is experiencing before explaining anything. One or two sentences, specific, never syrupy. Not "we understand this can be difficult" (generic) — instead name the actual moment: the unreturned call, the acronym soup, the denial letter on the kitchen table.
2. **Then precise, plain-language, statute-cited steps.** Short imperative steps. Each legal claim carries a citation chip (§3). Say what the law requires, who owes it to you, and what to do if they don't.
3. **Close with earned pride.** The ending reflects back what the parent just did or is about to do — competence they demonstrated, not cheerleading. No "You've got this!" No exclamation points doing emotional labor.

**Never fear-monger.** Deadlines and consequences are stated once, factually, attached to the step that handles them. Urgency lives in the verb ("send this week"), never in doom ("or your child could lose everything").

**Other voice rules**

- Second person ("you," "your child"), active voice, present tense where possible.
- Name the system's failure plainly when it fails. "The Regional Center missed its deadline" — not "delays can sometimes occur."
- No hedging stacks. One qualifier max per sentence. "Usually" or "in most cases" — never "it may often be possible that."
- Acronyms: spell out on first use with the acronym in parentheses, then acronym alone. Exception: IEP and SSI may stand alone after the summary box defines them.
- We never promise outcomes. We promise the process and the parent's rights within it.
- No legalese cosplay: "ask for," not "request that"; "the law says," not "pursuant to."

### 1.1 Three worked examples

> Day counts below are tagged `[TBC]` on purpose — the examples model how drafts look **before** verification (pipeline §2.5). Verified values replace the tags during founder edit.

**Example A — opening a guide (Regional Center intake delay)**

*Before (fails: leads with the system, hedgy, faintly scary):*

> The Regional Center intake process can unfortunately involve significant delays, and many families find themselves waiting months without answers. It is important to understand that failure to act quickly may negatively affect your child's access to services.

*After (validates → cites → moves):*

> You called the Regional Center weeks ago, and nobody has called back. That silence is not a sign you did something wrong — and it's not something you have to accept. California law puts the clock on them, not you: once you request services, the Regional Center must complete its assessment within a set deadline ([TBC: verify timeline] days — WIC §4643). Here's how to restart that clock in writing today.

**Example B — a step (requesting an IEP assessment)**

*Before (fails: passive, no citation, buries the action):*

> An assessment plan should generally be provided by the school district within a certain period of time after a request for evaluation has been submitted, so it is advisable that requests be made in written form whenever possible.

*After (imperative, chip-cited, one action per step):*

> **Step 2: Put your request in writing.** Email or hand-deliver a short letter asking the district to assess your child for special education. A written request starts a legal clock: the district must respond with an assessment plan within [TBC: verify timeline] days (5 CCR §3021; Ed Code [TBC: confirm section]). Keep a dated copy — it's your proof the clock started. Our template letter does this in two minutes.

**Example C — a closing (after an SSI application walkthrough)**

*Before (fails: hollow cheerleading, exclamation doing the work):*

> You've got this, super-parent! Applying for SSI can feel overwhelming, but with a positive attitude, anything is possible!

*After (earned pride — reflects what they actually did):*

> You just did something most people never have to learn: you read the Social Security rules (POMS SI 01320.500), gathered the records, and filed a complete application. Whatever SSA decides first, you now know the process better than most of the people your family will deal with — and if the answer is no, you already know an appeal is a normal next step, not a dead end.

---

## 2. Reading level

- **Target: grade 7–8** (Flesch-Kincaid or equivalent), checked during founder edit. The plain-language summary box aims lower — **grade 6 or below**.
- Citation chips, statute names, and program names are excluded from the mental math — "Lanterman Act" costs syllables we happily pay.
- How to get there without dumbing down: shorter sentences (target average ≤18 words), one idea per sentence, concrete verbs, cut nominalizations ("decide," not "make a determination").
- Never sacrifice precision for the score. If a legal term is the accurate term (e.g., "due process hearing"), keep it — and gloss it in plain words the first time.
- ES content targets the equivalent readability in Spanish; translate meaning, not syntax.

---

## 3. Citations

**Format: chip-sized, primary-source linked.** A citation is a short parenthetical "chip" in the prose; the full source lives in frontmatter `sources[]` (label + URL + accessed date), which renders in the Trust Block and powers the chip's link.

| Source type | Chip format | Example |
|---|---|---|
| CA Welfare & Institutions Code | `WIC §NNNN` | WIC §4643 |
| CA Education Code | `Ed Code §NNNNN` | Ed Code §56321 [TBC: verify section before use] |
| CA Code of Regulations | `T CCR §NNNN` | 5 CCR §3021 |
| CA statute by bill name | `SB 946` / `AB NNN` | SB 946 |
| Federal statute | `20 USC §NNNN` | 20 USC §1415 [TBC: verify before use] |
| Federal regulations | `34 CFR §NNN.NN` | 34 CFR §300.301 [TBC: verify before use] |
| SSA POMS | `POMS XX NNNNN.NNN` | POMS SI 01320.500 |
| CDSS Manual of Policies & Procedures | `MPP §NN-NNN` | MPP §30-757 [TBC: verify before use] |
| All-County Welfare Directors Letter | `ACWDL NN-NN` | ACWDL [TBC] |

**Rules**

1. Chips sit at the end of the claim they support, in parentheses. One chip can cover one sentence or one step — never a whole section on faith.
2. Every chip must have a matching `sources[]` entry pointing at the primary source (leginfo, POMS on ssa.gov, official CCR, agency page). The chip renders as a link to that URL.
3. **Never invent a citation.** A remembered-but-unverified section number is written as `[TBC: verify §]` until checked against the primary source. An invented citation is the single worst defect this site can ship.
4. Cite the law, not our summary of it, when the two could differ: if we paraphrase, the chip still points to the statute so the parent can check us.
5. Chips are informational, not decorative — a paragraph with no legal claim gets no chip.

---

## 4. Disability language — ⚠️ DECISION-PENDING

> **Status:** OPEN. **Decider: Mike.** **REQUIRED-BEFORE: piece #8** — no more than seven pieces may reach founder edit before this section is resolved, because retrofitting language across published YMYL pages resets them to `in_review` and burns reviewer throughput.

### The question

**Identity-first** ("autistic child," "disabled kids") vs. **person-first** ("child with autism," "children with disabilities"). Both are sincerely preferred by large parts of our audience; the choice signals whose framing we default to.

- **Identity-first** is strongly preferred by much of the autistic self-advocacy community (see ASAN's published position), which treats autism as identity, not affliction.
- **Person-first** remains the norm in most clinical, educational, and government writing our readers will encounter (IEPs, Regional Center documents, Medi-Cal notices), and is preferred by many parents and by several disability communities outside autism.
- Our primary reader is a **parent**, often newly diagnosed-adjacent, often searching in person-first terms — but our content should not teach them language the community their child belongs to finds othering.

### The ABA wrinkle (matters most for SB 946 / insurance content)

SB 946 content explains a parent's right to insurance coverage of behavioral health treatment, which in practice centers on ABA. ABA is simultaneously (a) the therapy the law entitles families to and many parents are fighting to get covered, and (b) the subject of sustained criticism from many autistic adults. Waypoint's job on these pages is the **coverage right**, not therapy advocacy. Working constraints for SB 946 content regardless of the pending decision:

- Explain the legal entitlement precisely; do not editorialize ABA as either salvation or harm.
- Avoid cure/deficit framing ("recover," "fix," "combat autism") everywhere, and be careful with "medically necessary" — use it as the statutory coverage term it is, with quotes or gloss where needed, not as a value judgment about the child.
- Acknowledge, where naturally relevant, that autistic adults hold a range of views on ABA, and link parents to primary community sources rather than characterizing the debate ourselves.

### Research inputs before deciding

- ASAN (Autistic Self Advocacy Network) — identity-first language explainer and related resources
- NCDJ (National Center on Disability and Journalism) Disability Language Style Guide
- How our own audience talks: keyword-map query phrasings, chat-mined question wording (`questionSource: chat-mined`), GSC queries
- Peer sites' choices and any published community survey data on language preference [TBC: collect links into the decision memo]

### Recommended default (proposal awaiting Mike's decision)

1. **Identity-first for autism-specific content** ("autistic child," "autistic students"), reflecting the documented preference of the autistic community.
2. **Person-first elsewhere by default** ("child with Down syndrome," "children with disabilities"), matching the documents and agencies those readers navigate.
3. **Mirror-the-reader rule** overrides both: in tools, template letters, and any surface that responds to a parent's own words, use the construction the parent used. In letters addressed to agencies, mirror the statutory/agency term where precision requires it (e.g., "developmental disability" under the Lanterman Act is a legal term of art — keep it).
4. Never "special needs," "differently-abled," "handicapped," or euphemisms; "disability" is not a bad word. (This sub-rule is settled regardless of the main decision.)

**On decision:** record the ruling and date here, remove the DECISION-PENDING banner, and add a line to the founder-edit voice checklist.

---

## 5. Plain-language summary box

Every guide and answer opens with a summary box, directly under the H1.

- **Heading:** "The short version" (EN) / "En pocas palabras" (ES) — consistent site-wide.
- **Length:** 3–5 bullets **or** a single paragraph ≤75 words. Never both.
- **Reading level:** grade 6 or below — this box is for the parent reading at 11pm with 40 seconds.
- **Content:** what this page tells you, the single most important action, and the one deadline or right that matters most. If the page defines IEP/SSI-class acronyms, define them here.
- **No citation chips inside the box** — chips live in the body where the claims are made. The box is a promise; the body is the proof.
- **No CTA inside the box.** The box earns trust; it doesn't sell.
- Write it **last**, from the finished piece — it summarizes what's actually on the page, not what the outline hoped.
- ES twin: translate the meaning, re-check length and level in Spanish; never machine-translate the EN box verbatim.

---

## 6. CTA and deep-link copy

The mechanics (URL, params, events) are frozen in `docs/analytics-taxonomy.md`. This section governs the words and the naming.

**Copy rules**

- **Action-first, outcome-clear:** the button says what happens next in the parent's world. "Build your step-by-step plan" · "Turn this into your checklist" · "Save these steps to your plan."
- **Never fear or loss-framing:** no "Don't lose your benefits," no countdowns, no "before it's too late."
- **Never gate-flavored:** the CTA offers *more* (a personalized plan in the app); it never implies the page's content was the teaser. Zero email gates, always.
- One **primary** CTA per page (typically `guide-footer` or `tool-result`); inline CTAs are secondary and quieter.
- CTA microcopy states it's free to start if space allows; never invent pricing claims — link, don't promise.
- ES pages carry ES CTA copy and `wp_locale=es`; never an EN button on an ES page.

**`cta_id` naming:** kebab-case, placement-based, from a small registry — `header`, `hero`, `home-footer`, `hub-footer`, `guide-footer`, `answer-inline`, `answer-footer`, `letter-footer`, `letter-after-copy`, `rc-footer`, `checklist`, `tool-result`, `pricing-card`, `about-footer`. New ids require adding them to this list AND to `CTA_IDS` in `src/lib/appLinks.ts` in the same PR (the taxonomy doc's examples are the pattern; don't proliferate near-duplicates).

**Param hygiene:** every deep-link CTA carries `wp_slug`, `wp_pillar`, `wp_cta`, `wp_locale`, and the fixed `utm_source=site&utm_medium=organic-content`; `wp_ctx` only when there's real context to carry, and **summaries only — never raw benefit figures the user typed** (taxonomy doc, privacy rule). If a CTA can't populate a required param, that's a build bug, not a copy choice.

---

## 7. Numbers, dates, and dollars

**Numbers**

- Numerals for everything tied to rights, deadlines, ages, and counts: "15 days," "3 years old," "21 regional centers." Clarity beats Chicago style for this audience.
- Spell a number only when it opens a sentence — or better, rewrite so it doesn't.
- Timelines always name the unit and the trigger: "15 calendar days from when the district receives your letter" — never a bare "15 days" when calendar-vs-business or the start event is ambiguous. If the statute's clock type is unverified: `[TBC: calendar or business days?]`.
- Ranges use an en dash with units on the second number: "3–5 years."

**Dates**

- Prose (EN): "January 1, 2026." Prose (ES): "1 de enero de 2026." Never numeric slash dates in prose (01/02/2026 is ambiguous to our audience).
- Frontmatter and machine contexts: ISO 8601 (`2026-01-01`), per the schema's date fields.
- Effective dates travel with their figures: "the 2026 rate, effective January 1, 2026."

**Dollars**

- `$` + comma grouping, no cents unless cents are official: "$943," not "$943.00" — but keep official cents when the source has them.
- Say the period in words in prose: "per month," not "/mo" (abbreviation acceptable inside tables and tool UI).
- **Every dollar figure ships with three companions:** the primary source (chip + `sources[]`), its effective date, and a frontmatter `nextReviewEvent` that will trigger its refresh (e.g., FBR → `ssi-fbr-jan`). A dollar figure with `nextReviewEvent: annual` by default-neglect is a pipeline defect.
- Unverified figures are `[TBC: figure + source]` — never a remembered number, never "about $X." Zero `[TBC]` at publish (pipeline §0.1).
- ES pages keep US number formatting for dollars ("$1,000") since readers see these figures on US agency notices.

**Phone numbers**

- Format: `(555) 555-0100` style — [TBC: adopt a real example from a verified RC listing; never publish an invented number even as a format sample].
- Only from a verified primary listing (agency site), stored in the `regionalCenters` collection with `verifiedAsOf` (CI warns >120 days, blocks edits >180 days — schema contract). Body prose links to the RC page rather than duplicating phone numbers that can rot.
