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
- **Template letters sound like a warm, organized parent — not a paralegal**
  (owner edit, Sept 7 2026, consistent with the escalation ladder: the first
  touch always *asks*). Friendly and collaborative, slightly informal, direct
  and clear. Keep the legally operative elements — it's a *written* request,
  it names the scope, it cites the statute exactly once, plainly — and cut
  everything that sounds like a filing ("formally request," "kindly,"
  "per/pursuant to"). Firmness is for the follow-up letters up the ladder,
  not the first ask.

### 1.1 Approach-agnostic on therapies (owner decision, Sept 7 2026)

Waypoint does not promote or recommend any specific therapy or intervention
approach — **ABA included**. We are philosophically and approach agnostic. The
framing is always the parent's two questions:

1. **What does your child's doctor (or evaluating clinician) recommend?**
2. **What services and therapies does your insurance cover?**

A therapy name may appear only where it is *factually necessary* — e.g.,
describing what a statute mandates plans to cover — and then as description,
never endorsement ("SB 946 requires most fully-insured plans to cover
prescribed behavioral health treatment", not "get ABA covered"). Never rank
approaches, never imply one is standard of care, and never frame a therapy as
the goal of an insurance appeal — coverage of *what the clinician prescribed*
is the goal. This applies to guides, answers, letters, hub/marketing cards,
CTAs, and AI-drafted copy alike.

### 1.2 Three worked examples

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

## 4. Disability language — ✅ DECIDED

> **Ruling: per-community default.** **Decided by Mike, September 8, 2026.** Supersedes the DECISION-PENDING proposal that stood here. Applies to all new drafts immediately; published pages are updated opportunistically at their next edit, not retrofitted in a sweep (see "Applying this to existing content" below).

### The rule

**1. Identity-first for autism content.** "Autistic child," "autistic students," "autistic adults." The autistic self-advocacy community (ASAN and others) has documented this preference clearly, and Waypoint follows the community it is writing about.

**2. Person-first everywhere else, by default.** "Child with Down syndrome," "child with cerebral palsy," "children with disabilities." This matches both the stated preference of those communities and the language of the IEPs, Notices of Action, and Medi-Cal letters our readers are holding while they read us.

**3. Mirror-the-reader overrides both.** In tools, template letters, chat surfaces, and anywhere Waypoint responds to a parent's own words, use the construction the parent used. In anything addressed to an agency, keep the statutory term exactly — "developmental disability" under the Lanterman Act, "child with a disability" under IDEA, and similar are legal terms of art. Precision beats style inside a letter that has to work.

**4. Banned regardless.** Never "special needs," "differently-abled," "handicapped," or cure/deficit framing ("recover," "fix," "combat autism," "suffers from"). "Disability" is not a bad word — use it.

### Worked examples

| Context | Write | Not |
|---|---|---|
| Autism guide body | "If your **autistic child** is under 3, Early Start requires a decision within 45 days." | "your child with autism" |
| Down syndrome guide | "A **child with Down syndrome** qualifies from birth." | "a Down syndrome child" |
| Cross-diagnosis page | "**Children with disabilities** in California have the right to…" | "disabled kids" (unless the page is disability-identity content) |
| Template letter to a district | "…evaluation for my **child with a suspected disability**…" | identity-first phrasing that departs from IDEA's term |
| Tool responding to input | Mirror what the parent typed | House default that contradicts them |

### Why this way

Both constructions are sincerely preferred by large parts of our audience, so a single site-wide rule would be wrong for someone either way. Deferring to each community's own documented preference is the only default that is defensible to all of them — and it is the same instinct the rest of this guide runs on: the reader's framing wins over ours.

### The ABA constraint (unchanged, and independent of the above)

SB 946 content explains a parent's right to insurance coverage of behavioral health treatment, which in practice centers on ABA. ABA is simultaneously the therapy the law entitles families to and the subject of sustained criticism from many autistic adults. Waypoint's job on those pages is the **coverage right**, not therapy advocacy:

- Explain the legal entitlement precisely; do not editorialize ABA as either salvation or harm.
- Use "medically necessary" as the statutory coverage term it is — with a gloss where useful — never as a judgment about the child.
- Where naturally relevant, note that autistic adults hold a range of views on ABA, and link parents to primary community sources rather than characterizing the debate ourselves.

### Applying this to existing content

At the time of the ruling, no published or drafted page used either construction — the diagnosis pages were written to name the diagnosis ("an evaluation for autism") rather than to label the child, so nothing required a retrofit. That is a good pattern and remains available whenever a sentence reads awkwardly under the rule: **naming the diagnosis instead of labelling the child is always in-bounds.**

Going forward: new drafts follow the rule at Stage 1. Existing pages are corrected at their next scheduled edit — the rule is not grounds for reopening a published page on its own, because a language-only churn costs reviewer throughput we do not have.

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

**`cta_id` naming:** kebab-case, placement-based, from a small registry — `header`, `hero`, `home-footer`, `hub-footer`, `guide-footer`, `answer-inline`, `answer-footer`, `letter-footer`, `letter-after-copy`, `rc-footer`, `checklist`, `tool-result`, `pricing-card`, `about-footer`, `product-hero`, `product-footer`. New ids require adding them to this list AND to `CTA_IDS` in `src/lib/appLinks.ts` in the same PR (the taxonomy doc's examples are the pattern; don't proliferate near-duplicates).

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
