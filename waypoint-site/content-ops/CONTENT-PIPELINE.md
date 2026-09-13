# Waypoint Content Pipeline (Authoring SOP)

**Owner:** Mike Beebe · **Applies to:** every item in `src/content/` (guides, answers, letters, regional-centers, research) · **Last updated:** 2026-09-06

This SOP is subordinate to two frozen contracts. If this document ever disagrees with them, they win and this file gets fixed:

- **Schema (D2):** `src/content.config.ts` — frontmatter shape, status ladder, review-block enforcement
- **Analytics + deep links (D3):** `docs/analytics-taxonomy.md` — event names, CTA params, `/start` contract

Field-by-field semantics live in `content-ops/SCHEMA.md` (referenced from the schema file header).

---

## 0. Non-negotiables (read before anything else)

1. **YMYL truth rule.** Never invent statistics, dollar figures, phone numbers, timelines, or citations. Anything unverified gets a `[TBC: what needs verifying]` placeholder. **Zero `[TBC` markers may remain at publish** — CI-greppable, and the founder edit pass resolves each one against a primary source.
2. **Primary sources only.** See the whitelist in §1.3. A secondary blog, law-firm marketing page, or aggregator is never a source — not even a good one.
3. **Nothing publishes without credentialed review.** The schema physically blocks `status: published` without a completed `review` block. Do not work around it.
4. **Zero email gates.** No content, tool, or letter is ever gated behind an email address. `newsletter_subscribe` is opt-in and orthogonal to content access.
5. **No HIPAA claims.** Waypoint is not a covered entity. Never imply otherwise in copy.
6. **Cadence cap = reviewer throughput.** We publish at the speed the reviewer can review, counting **all** reviewed items — EN pieces, ES twins, regional-center pages, and any post-publish edit that re-enters review. If the reviewer can sign off N items this week, we draft at most N+2 (small buffer, never a backlog balloon).

---

## 1. Stage: Inputs (status — not yet a file)

A piece may not be drafted until all three inputs exist.

### 1.1 One keyword-map row

Every piece traces to exactly one row in the keyword map (canonical location: `content-ops/keyword-map` — [TBC: confirm final path/format when the map lands in the repo]). The row supplies:

- target query + close variants
- pillar assignment (`regional-centers` | `iep` | `benefits` | `insurance` | `first-steps` | `start`)
- collection (guide / answer / letter / regional-center page)
- slug and `translationKey`
- for answers: `questionSource` provenance (`chat-mined` | `gsc` | `paa` | `kb` | `editorial`)

No row → no draft. If an idea is good but has no row, add the row first (Monday, see §7).

### 1.2 Pillar outline

The pillar's outline document defines where this piece sits: which pillar page links down to it, which 2+ siblings it must cross-link, and what the piece's single job is (one query intent per piece — split rather than stuff).

### 1.3 Primary sources — the only admissible inputs

| Source class | Where | Used for |
|---|---|---|
| CA statutes (WIC, Ed Code, Ins Code, etc.) | `leginfo.legislature.ca.gov` | Lanterman Act, SB 946, state law claims |
| CA regulations (CCR) | official CCR/Westlaw-hosted CCR | 5 CCR (education), 17 CCR (regional centers) |
| Federal statute/regs (IDEA, ADA, §504) | `congress.gov`, `ecfr.gov` | federal rights claims |
| POMS | `secure.ssa.gov/poms.nsf` | SSI rules, deeming, FBR |
| MPP + ACWDLs / ACLs | CDSS / DHCS official postings | IHSS, Medi-Cal eligibility mechanics |
| Agency pages | `dds.ca.gov`, `cde.ca.gov`, `dhcs.ca.gov`, `ssa.gov` | program facts, contact data, rates |

**Never:** law-firm blogs, advocacy-org explainers, news articles, Wikipedia, other parent sites. They can inspire a question; they can never support a claim. (Advocacy-org materials like ASAN or NCDJ are legitimate inputs for *language/style decisions* — see STYLE-GUIDE §4 — just never for legal/benefit claims.)

Every claim that survives to publish must map to an entry in frontmatter `sources[]` with `label`, `url`, and `accessed` date.

---

## 2. Stage: Claude draft (`status: draft`)

Claude Code drafts the MDX from the three inputs. The draft must:

1. **Validate against `src/content.config.ts`** — full frontmatter, correct collection, `pillar` from the enum, `translationKey` set even though the ES twin doesn't exist yet, `status: draft`, `review: null`, `dateModified` set, `datePublished: null`.
2. **Choose `nextReviewEvent` deliberately** — pick the named refresh event whose data the page depends on (`ssi-fbr-jan`, `ssa-cola-oct`, `ihss-wages-jan`, `may-revise`, `june-budget`, `rc-pos-annual`), else `annual`. Never leave it to the default out of laziness; a page with a dollar figure keyed to a January update that says `annual` is a defect.
3. **Choose `disclaimerVariant`** — `legal` for rights/process content, `benefits` for SSI/Medi-Cal/IHSS money content, `medical` only where diagnosis/treatment is discussed, `none` essentially never on YMYL pages.
4. **Follow STYLE-GUIDE.md** — voice arc, reading level, citation chips, summary box.
5. **Mark every unverified fact `[TBC: …]`** — day counts, dollar amounts, phone numbers, effective dates, even ones Claude is "pretty sure" about. Verification is a human step, not a model vibe.
6. **Populate `sources[]`** with the primary sources actually consulted, real URLs only. A source Claude could not fetch/confirm gets `[TBC: verify URL]` in a draft comment, not a fabricated entry.
7. **Include the deep-link CTA** built exactly per `docs/analytics-taxonomy.md` (§6 checklist below).
8. **Cross-link** the pillar page and ≥2 siblings named in the pillar outline.

Output: one MDX file in the right collection directory, on a branch, `status: draft`.

## 3. Stage: Founder edit (`status: founder_edit`) — timebox 2–4 hrs

Mike's pass. Flip status to `founder_edit` at start. In order:

1. **Verify pass (the [TBC] hunt).** Open every `[TBC]` and every citation chip; check each against its primary source; replace placeholder with the verified value **and** confirm the `sources[]` entry (URL + `accessed` today). Anything that can't be verified today gets cut or rewritten to not need the fact — it does not go to review with a `[TBC]` intact.
2. **Voice check** against STYLE-GUIDE §1: does the opening validate the feeling? Are steps concrete and citation-chipped? Does it close with earned pride, not a pep talk? Is anything fear-mongering? (Cut it.)
3. **Disability-language check** (STYLE-GUIDE §4, decided 2026-09-08): identity-first in autism content ("autistic child"), person-first elsewhere ("child with Down syndrome"), reader's own words mirrored in tools and letters, statutory terms kept exact inside anything addressed to an agency. No "special needs," "differently-abled," "handicapped," or cure framing.
4. **Reading level check** — grade 7–8 target (STYLE-GUIDE §2). Run the checker; fix the worst sentences, don't chase the score decimal.
5. **Structure check** — summary box present and compliant, headings scannable, pillar + sibling links live, CTA params correct.
6. **Trim.** The 2–4 hr timebox exists so the founder edit is an edit, not a rewrite. If it's turning into a rewrite, the draft inputs were bad — kick it back to Stage 1/2 with a note about what was missing.

Output: commit on the branch, `status: in_review`, and the review PR opened (next stage).

## 4. Stage: Review (`status: in_review`)

### 4.1 The PR

- Open a PR to `main` labeled **`content-review`**.
- PR description includes: keyword-map row id, collection + slug, `disclaimerVariant`, `nextReviewEvent`, the **git SHA of the head commit** (this becomes `review.versionReviewed`), and for re-reviews a plain-English diff summary.
- The PR does **not** merge until sign-off is transcribed (§4.4).

### 4.2 The review packet (email — reviewers do not use git)

The reviewer is a credentialed professional (CA attorney for legal/rights content), works by email, and never touches the repo. For each item, Mike sends one email containing:

1. **Rendered HTML copy** of the page — a self-contained HTML file (or PDF) exported from the local build/preview, so the reviewer sees exactly what a parent will see, including the Trust Block, disclaimer, and citation chips. Never send raw MDX.
2. **Source appendix** — the `sources[]` list as clickable links, so every claim can be spot-checked against its primary source.
3. **The structured sign-off form** (§4.3).
4. For re-reviews: what changed since the version they last approved, in plain English.

Subject line convention: `[Waypoint review] <collection>/<slug> — <SHA-short>`.

### 4.3 The sign-off form — maps 1:1 to the `review` frontmatter block

The form (Google Doc / PDF / structured email reply — reviewer's choice) has exactly these fields, because they are exactly what the schema requires:

| Form field | Frontmatter destination |
|---|---|
| Reviewer name | `review.reviewedBy` |
| Credential (e.g., "Attorney, State Bar of California, #[TBC]") | `review.credential` |
| Date of review | `review.date` |
| Version reviewed — **pre-filled by Mike with the git SHA from the PR** | `review.versionReviewed` |

Plus attestations (checkboxes) that don't map to frontmatter but are archived:

- [ ] Legal/benefit claims are accurate as of the review date
- [ ] Every citation was spot-checked against the linked primary source
- [ ] The disclaimer variant is appropriate for this content
- [ ] No language crosses from information into individualized legal advice

And a verdict: **Approved** / **Approved with listed edits** (Mike applies exactly the listed edits, no re-review needed) / **Revise and resubmit** (back to Stage 3, then a fresh packet with a new SHA).

### 4.4 On sign-off

1. Archive the reply email (PDF) in the review archive (`content-ops/review-archive/` if the repo stays private, otherwise a private Drive folder — [TBC: confirm archive location before first review]).
2. Transcribe the form into the `review` block verbatim. `versionReviewed` must be the SHA the reviewer actually saw — if edits were applied after the packet went out, that's a new SHA and a new packet.
3. Flip `status: approved`. Merge the PR (merge commit, per repo convention).

## 5. Stage: Publish (`status: published`)

- Flip `status: published`, set `datePublished`, bump `dateModified`, add a `changelog` entry (`note: "Initial publication"`).
- `astro build` must pass — the schema refine will hard-fail a publish without the review block, which is the point.
- Post-deploy spot check: page renders, Trust Block shows reviewer + date, citation chips link out, CTA carries all required params, page is in the sitemap, hreflang sane for the `translationKey`.

**ES twins** ride the same ladder end to end (draft → founder edit → review → publish) and **count against the reviewer cadence cap** like any other item. The twin shares the `translationKey` and gets its own `review` block.

---

## 6. Post-publish edits

Three classes. Classifying honestly is the whole game:

| Class | Examples | Process |
|---|---|---|
| **Cosmetic** | typo, broken link swapped for the same source, formatting | Edit, bump `dateModified`, changelog note. Status stays `published`. |
| **Data-constant refresh** | new SSI FBR, COLA %, IHSS wage rate, updated RC intake phone — a value keyed to a `nextReviewEvent` | Covered by the **standing pre-approval clause** (below). Status stays `published`. |
| **Substantive** | any change to a legal claim, a step, scope of a right, added/removed section, new citation | **Status resets to `in_review`.** Page keeps serving the last-approved version until the new SHA is signed off (branch until then). Full packet flow, counts against the cap. |

If you're debating which class an edit is, it's substantive.

### 6.1 Standing pre-approval clause (data-constant refreshes)

A one-time signed memo from the reviewer (archived alongside sign-offs — [TBC: memo not yet executed; get signature before first refresh season]) pre-approves a **named, closed list** of update classes so annual number-swaps don't burn review throughput. Conditions, all required:

1. The constant is one keyed to a schema `nextReviewEvent` (`ssa-cola-oct`, `ssi-fbr-jan`, `ihss-wages-jan`, `may-revise`, `june-budget`, `rc-pos-annual`).
2. The new value comes from the **same primary source class** as the old one (e.g., new FBR from POMS/SSA.gov), and the `sources[]` entry is updated with a fresh `accessed` date.
3. The edit changes **only** the constant and its effective date — zero surrounding prose changes.
4. `dateModified` bumped + `changelog` entry naming the refresh event and both values.
5. The reviewer receives a monthly digest email listing all refreshes applied under the clause.

Anything outside those five conditions is substantive → `in_review`.

---

## 7. Weekly rhythm

| Day | Activity |
|---|---|
| **Mon** | Pick keyword-map rows for the week (respecting the cadence cap — count ES twins and pending re-reviews first). Confirm pillar outlines cover them. |
| **Tue–Wed** | Claude drafts; founder edit passes (2–4 hrs each). |
| **Thu** | Open/refresh `content-review` PRs; send review packets; process any sign-offs that came back; publish approved items. |
| **Fri** | Pipeline check: every item's status matches reality; nothing stuck >2 weeks in `in_review` (nudge the reviewer, don't pressure); upcoming `nextReviewEvent` dates within 30 days flagged; `[TBC]` grep across the repo is clean on `main`; reconcile drafted-vs-reviewable count for next Monday. |

---

## 8. Definition of done (per piece — all seven, no exceptions)

- [ ] **Keyword-map row exists** and its id is in the PR description
- [ ] **Schema passes** — `astro build` green; frontmatter validates against `src/content.config.ts` with no defaults-by-neglect (`nextReviewEvent` and `disclaimerVariant` chosen on purpose)
- [ ] **Trust Block complete** — `review` block transcribed from a signed form; `sources[]` all primary with `accessed` dates; zero `[TBC]` markers in the file
- [ ] **Linked into the pillar** — links to its pillar page and ≥2 sibling pieces (and the pillar/siblings link back where the outline says so)
- [ ] **Deep-link CTA per the taxonomy doc** — `/start` URL with `wp_slug`, `wp_pillar`, `wp_cta`, `wp_locale`, fixed `utm_source=site&utm_medium=organic-content`, optional `wp_ctx` per the versioned payload shapes; fires `app_signup_click`; `cta_id` follows STYLE-GUIDE §6 naming
- [ ] **Sitemap presence** — page appears in the generated sitemap; `noindex: false` unless deliberately excluded (and if `noindex: true`, the PR says why)
- [ ] **Cadence accounted** — the item was counted against this week's reviewer throughput
