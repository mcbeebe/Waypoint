# Waypoint — Lessons Learned and the Level-Up Plan

**Date:** Sep 13, 2026 · **Status:** draft — proposes work across the auto-ship stops; needs the owner's go
**Supersedes:** nothing
**Superseded-by:** —

*Companion to `SpecialNeedsNavigator-Comparison-Sep2026.md` (the solo-expert
competitor), `Undivided-Comparison-Aug2026.md` (the funded-content competitor),
and `Payer-Funded-Pivot-Review-Aug2026.md` (the business-model review). This
document is what those three add up to, plus a fresh measurement of the repo
taken today.*

**Everything here was measured or read, not recalled.** File paths and line
counts come from this working tree on Sep 13 2026. Anthropic API capabilities
come from the bundled `claude-api` skill reference. Where I am reasoning rather
than reporting, the text says so.

---

## 1. The scoreboard — what is actually true today

Measured this morning. Three of these numbers contradicted `CLAUDE.md`, which
has now been corrected.

| | Measured |
|---|---|
| TypeScript in `src/` | ~86,100 lines |
| Screens | 73 files (58 under `main/`) |
| Migrations | 61, applied by hand |
| Edge Functions | 8 + `_shared/`, `ai-proxy` alone is 1,381 lines |
| Tests | 124 files / 1,317 blocks, 4 vitest projects |
| AI eval | 78 golden cases, its own CI workflow |
| Model tiering | **live** — `isPremium ? 'claude-opus-5' : 'claude-sonnet-5'` |
| Multi-tenancy | **shipped** — `035_organizations_staff_profiles.sql` + 036/039/040/041 |
| Home reduction (phase 6) | **not shipped — regressed.** `HomeScreen.tsx` is **1,037 lines**, up from the 959 the August analysis condemned |

Two of those deserve to be said out loud as wins, because they were the top
recommendations of the August payer review and they were taken:

- **The uncosted free tier is costed.** `ai-proxy/index.ts:645` serves free
  families on Sonnet 5 and Premium on Opus 5. The August review's §3.3 warning —
  "the moat must not have an uncapped burn rate" — is answered in code.
- **The tenancy option is open.** `organizations` exists with `organization_id`
  threaded through staff, assignments, service events, invoices and billing.
  That was called "the single highest-leverage architectural omission." It is no
  longer an omission, and it is the difference between a livelihood and a
  company.

And one that deserves to be said out loud as a failure: **the deletion phase did
not happen, and the screen grew by 78 lines instead.** Every competitive analysis
this repo has produced names the same gap. It is still open.

---

## 2. Seven lessons

Not a sequence — seven independent findings, each with its evidence.

### L1 · Architecture is a business-model decision wearing engineering clothes

Special Needs Navigator has **no database**. Sessions vanish when the tab
closes. That one decision removed accounts, migrations, RLS, deletion
endpoints, backups and a privacy posture — and it is why one person shipped in
five months. Waypoint chose the opposite and pays for it: 61 migrations,
**applied by hand, in order, in a SQL editor.**

The lesson is not "persist less." Persistence is Waypoint's entire advantage —
a product that cannot see the family between sessions cannot notice a deadline.
The lesson is that **every subsystem is payroll you don't have**, so each one
must be earning its keep against that test. Ask it of the Forum stack, of
`snooze.ts`, of the third icon system.

### L2 · The moat is never the app

Three studies now agree from three directions. The August review said it
outright: the moat is *the provenance-dated knowledge layer and the outcomes
dataset*; the app is the funnel. Undivided proves it with payroll — staffed
navigators and an editorial library. Special Needs Navigator proves it
inverted: his moat is a decade of practice and his own name, and the AI product
is a $14.99 front door to trust and planning work.

**Waypoint's version of the moat is verifiability** — `contentSources.ts`,
`requestClocks.ts`, `requestDossier.ts`. That is the asset. Polishing consumer
UX beyond what the funnel needs is not.

### L3 · You cannot buy authority — stop re-deriving this

Undivided's answer was "Size: payroll. Unbuyable. Do not fake it." Special Needs
Navigator's answer is the same: a CFP®, a retired Navy Chief, a father of a
23-year-old autistic son, ten years of practice, 194 podcast episodes.

Two independent competitor studies reached the identical conclusion. **Treat it
as settled and stop spending analysis on it.** The strategic move is not to
manufacture a human — it is to sell the thing a credentialed human *cannot*
scale: a citation a parent can tap, on a date that arrives, in three languages,
at 11pm.

### L4 · Waypoint keeps shipping the substance and burying it

The pattern is now three-for-three:

- `requestDossier.ts` renders a SHA-256-fingerprinted evidence packet whose own
  header says *"the export IS the leverage"* — and it surfaces as a `📄 Export`
  button styled like "+ Log a call."
- `sourceForCitation()` has **zero non-test consumers**. Citations render as
  inert grey text.
- Special Needs Navigator has no persistence at all, and still makes a parent
  feel they are carrying something away — a "Session Restart Prompt" they paste
  into the next session. **They shipped the feeling. Waypoint shipped the
  substance and hid it.**

### L5 · A fixed price against a variable cost is a trap — and Waypoint already dodged it

Special Needs Navigator sells "as many questions as you need, no time limit" for
$14.99. The customers most motivated to buy are overwhelmed parents with
complicated cases — precisely the longest sessions. That is an uncapped cost
against a fixed price, and the flaw is structural.

Waypoint's `ai-proxy` answers this before it was asked: a cheaper model for the
free tier, pinned server-side, with the effort parameter allowlisted so a
modified client cannot raise it. **Name this as a win and do not give it back.**

### L6 · Documents drift silently; measure, never quote

`CLAUDE.md` was wrong on all three of the numbers I checked (59→61, 44→58,
111→124). The August payer review found a business proposal reviewing "a
codebase that no longer exists," with proposed migrations that **collided with
live ones**. Both were written by careful people who quoted instead of
measuring.

The repo's own rule — *"re-measure rather than trusting it"* — is now written
into the line that was wrong.

### L7 · An eval that doesn't grade the risky output is not a safety net

This is the sharpest finding in the whole review, and it is verifiable in
sixty seconds.

`qa/promptRegression.golden.json` holds 78 cases. Each carries four graded-looking
fields — and **only two are graded**. `scripts/prompt-regression.mjs` scores
`expectedCategory` and `expectedTone`: *which knowledge sources got retrieved,
and what tone was picked.* Both are properties of the Haiku **classifier**.

The fourth field, `expectedBehavior`, is a written rubric on all 78 cases —
*"Should explain intake process, 120-day timeline, Early Start. No legal
jargon."* **Nothing reads it.** It is dead data.

So: **the Navigator's actual answer — the thing that can state a wrong deadline
or invent a statute to a frightened parent — has no automated check at all.**
The system prompt asks it not to (`ai-proxy/index.ts:217`, *"don't fabricate
legal citations"*), and an instruction is not a test.

---

## 3. AI tools — seven upgrades, ranked

Each names the file it changes and the API capability it uses. I have read the
code; I have **not** benchmarked these changes — sizes are estimates.

### A1 · Make citations structural instead of instructional ★ the big one

**Today:** `ai-proxy/index.ts:217` *asks* the model not to fabricate citations,
and KB articles are pasted into the system prompt as plain text.

**Instead:** pass KB articles as `document` content blocks with
`citations: {enabled: true}`. The response then splits into text blocks, and
cited blocks carry a `citations` array with `cited_text` and the exact character
range in the source document. The model can no longer cite what the document does
not say — it must point at the span.

Why this matters more for Waypoint than for anyone else: **the provenance
registry is the entire competitive thesis.** Undivided shows no citation
anywhere. Special Needs Navigator does not disclose its model, let alone its
sources. Waypoint asserting statutes in prose is a *claim*; Waypoint returning a
character range in a verified, dated source is a *receipt*. This also finally
gives `sourceForCitation()` its first non-test consumer, and it is what makes the
tappable `<Citation>` component honest rather than decorative.

**Watch out:** citations are incompatible with `output_config.format` — so the
chat path can use citations, and the JSON-producing paths use structured outputs
(A3). Don't try to do both in one call. **Size: ~1–2 weeks. [owner — family-facing + legal framing]**

### A2 · Grade the answer, not the route

**Today:** 78 rubrics sit unread in the golden set (L7).

**Instead:** extend `scripts/prompt-regression.mjs` with a second pass that
calls the full Navigator path and grades the answer two ways:

1. **A hard check, no model needed:** extract every `§`/statute-shaped token
   from the answer and fail if it is absent from `CONTENT_SOURCES`. This is a
   regex and a set lookup. Once A1 ships, it becomes near-free — an uncited claim
   simply has no citation block.
2. **An LLM judge** over the existing `expectedBehavior` text, on a separate
   model, returning a structured verdict.

Keep the current 85%/80% classifier gates; add an answer gate that starts as
*report-only* for two weeks so you learn the real baseline before it blocks.

This is the highest-value-per-hour item in this document. The rubrics are already
written. **Size: 3–4 days. [owner — it changes what ships to families]**

### A3 · Structured outputs for every JSON path

**Today:** `classifyIntent` (`src/lib/ai.ts:241-250`) does
`JSON.parse(result.content[0].text)` inside a `try` whose `catch` returns
`{sources: [], suggestedTone: 'collaborative'}`.

Read what that fallback does: **a malformed classifier response silently
degrades the Navigator to zero retrieved sources** — and the system prompt's
no-KB branch (`:209`) then tells the parent to call Disability Rights California.
A JSON hiccup becomes a worse answer, and nothing logs it.

**Instead:** `output_config: {format: {...}}` with a JSON schema, or `strict: true`
on a tool. Then keep the fallback but **count it** — a silent failure you can't
see is worse than a loud one. **Size: 1–2 days, auto-ships.**

### A4 · Move the classifier prompt server-side

`CLAUDE.md` already flags the duplication between `src/lib/ai.ts` and
`scripts/prompt-regression.mjs`, "held together only by a `must mirror` comment."
There is a second reason to fix it: the Navigator system prompt was moved
server-side in Wave 1 hardening precisely so a modified client couldn't strip the
guardrails — but the **classifier prompt is still assembled on the client** and
posted as `query`. Lower stakes, same shape.

Move it into `ai-proxy` beside the Navigator prompt; have the client send the raw
question and the regression script hit the same endpoint. One prompt, one place,
no mirror to break. **Size: 1 day, auto-ships — except `ai-proxy` has no CI, so
this one gets `/adversary`. [owner — edge function]**

### A5 · Verify the cache actually caches, and drop the stale header

`cache_control: {type:'ephemeral'}` is set at `ai-proxy/index.ts:626`. But
`cache_read_input_tokens` **appears nowhere in the repo** — so nothing has ever
confirmed a cache hit. Prompt caching is prefix-matched: one byte of drift early
in the prefix silently invalidates everything after it, at full price, with no
error.

Two fixes: log `usage.cache_read_input_tokens` per request and alert if it sits
at zero; and drop the `anthropic-beta: prompt-caching-2024-07-31` header
(`:640`) — caching is generally available and the header is vestigial.

Also worth an audit pass: the render order is `tools` → `system` → `messages`, so
anything volatile (a timestamp, a per-request id, the family context) must sit
**after** the last breakpoint or it invalidates the whole prefix.
**Size: hours. [owner — edge function]**

### A6 · Use the Batch API for everything that isn't a parent waiting

Batch runs asynchronously at **50% of standard cost**. Two Waypoint workloads
qualify immediately:

- **The ~40 derived Learn articles** the Undivided analysis scoped (each
  generated from a module that already exists, each carrying a citation and a
  reviewed-on date).
- **The re-verification sweep** in A7.

Nothing family-facing changes; it is a straight halving of the bill on bulk
generation. **Size: 2–3 days when there's bulk work to run. Auto-ships.**

### A7 · Put web search in the re-verification job — never in the answer path

Special Needs Navigator's one genuine AI advantage is that Sage *"can look up
current SSA figures in real time."* Waypoint's benefit figures are static with
human verification dates.

**Do not copy them.** Live lookup with no dated provenance is the weaker
guarantee — it is fresh and unattributable. But Waypoint's model only holds if
someone re-verifies, and `contentSources.ts` has **no re-verification job at
all**, which makes "verified Aug 23, 2026" an assertion that decays.

The synthesis: a scheduled job using the server-side web search tool that
re-checks each registry entry against its cited primary source and **opens a
task when a figure moves** — it never writes to the family-facing answer. Pair it
with a test that fails when any `verifiedOn` passes a staleness threshold. That
converts the provenance registry from a claim into an enforced invariant, which
beats live lookup on exactly the axis Waypoint competes on.

**Size: ~1 week + a scheduled function. [owner — edge function, no CI]**

---

## 4. Platform — four risks, ranked by what they'd cost

**1 · Migrations are applied by hand. 61 of them.** This is the largest
operational risk in the repository, and it has already caused a shipped bug
(`e0bdcdd`, "Fix empty calendar when migration 029 hasn't been applied"). Every
new feature that assumes an unapplied migration is a silent breakage. At 61 the
manual process is past where it is defensible. *Minimum viable fix: a startup
assertion that the schema version the client expects is the one the database has,
so the failure is loud.*

**2 · Nine Edge Functions, no CI, auto-deploy on merge.** `ai-proxy` alone is
1,381 lines and holds the system prompt, the tone ladder, the model pinning, the
entitlement check and the letter templates — i.e. most of the product's legal
surface — and it ships to production on merge with **zero automated
verification.** `deploy-edge-functions.yml` does not know if it works.
*Minimum viable fix: `deno check` in CI, then a smoke test that posts one request
per action and asserts a 200 and a non-empty body.*

**3 · The Home screen grew.** 959 → 1,037 lines while three analyses said delete.
Whatever the reason, the honest read is that **deletion work does not survive
contact with a backlog** unless it is scheduled as a feature.

**4 · Two pricing models coexist.** `entitlements.ts` defines $99/yr and
$14.99/mo with `FLAGS.paywall: false`, while the adopted plan of record is
payer-funded and free to families. That is not yet a contradiction — but both
are "locked" documents pointing different directions, which is exactly the state
§3.2 of the August review called "the most dangerous state a solo-founder project
can be in." Resolve it in writing.

---

## 5. Business model — where the three competitors actually sit

| | Special Needs Navigator | Undivided | Waypoint |
|---|---|---|---|
| Who pays | The family, $14.99–34.99/session | VC, then the FMS | **Whoever the system already pays** |
| Real revenue engine | Lead-gen into trust/planning work | Invoices the FMS | SDP facilitation → code 108 → platform licensing |
| Scope | National | National | California, deliberately |
| Cost control | **None** — unlimited turns, fixed price | Unknown | Model tiering by entitlement, live |
| Structural ceiling | One person's calendar | Payroll | **Software margin, if L3 is pursued** |

### The asset nobody else has, and it is already in the schema

`entitlements.ts` defines five sponsor types: **facilitation · district ·
employer · licensee · community**, each with honest copy — *"Included with your
facilitation — you pay $0,"* *"Covered by your school district — you pay $0."*
And the community waiver is written with unusual care: it *"says nothing about
poverty, hardship, or charity, and carries no end date to worry about."*

That is not a pricing table. **It is a mechanism for being paid by five
different payers while the family always sees $0** — and it is built, tested, and
sitting behind a flag. Neither competitor has anything like it. Special Needs
Navigator has one payer: the parent's credit card. Undivided has one: the FMS.

**This is the business-model headline and it should be the headline of the
pitch,** not a footnote in an entitlements module.

### The one product wedge worth taking from the competitor

**Age 18.** SSI redetermination, DAC benefits, the school-exit cliff,
conservatorship vs. supported decision-making. It is Special Needs Navigator's
centre of mass and Waypoint's blind spot — and it is the one place where
Waypoint's architecture does something his cannot. He can explain the
redetermination beautifully in a March session and has **no mechanism to mention
it again in October.** `requestClocks.ts` + `deadlineReminders.ts` + push is
exactly that mechanism.

Every Waypoint family hits this cliff. **[owner — family-facing, needs `/adversary`]**

---

## 6. The sequenced plan

Governance per `CLAUDE.md`. **[owner]** = needs `/adversary` in the PR and the
owner's approval. Everything else auto-ships on green gates.

### This week — cheap, and two of them are safety

| # | Item | Size | Gate |
|---|---|---|---|
| 1 | **A2 · Grade the answer.** Hard uncited-statute check + LLM judge over the 78 unread rubrics, report-only for two weeks. | 3–4 d | **[owner]** |
| 2 | **A5 · Prove the cache works.** Log `cache_read_input_tokens`, alert on zero, drop the vestigial beta header. | hours | **[owner — edge fn]** |
| 3 | **A3 · Structured outputs** on `classifyIntent`; count the silent fallback instead of swallowing it. | 1–2 d | auto |
| 4 | **Edge-function CI.** `deno check` + one smoke test per action. Nine functions currently ship unverified. | 2 d | auto |
| 5 | **Resolve the pricing contradiction** in writing — one decision record, one superseded document. | hours | **[owner]** |

### Next month — the moat, made structural

| # | Item | Size | Gate |
|---|---|---|---|
| 6 | **A1 · Citations API.** KB articles as `document` blocks with `citations: {enabled: true}`; `<Citation>` renders the returned span. Turns the thesis into a receipt. | 1–2 wk | **[owner]** |
| 7 | **A7 · The re-verification job** + a staleness test that fails CI. Beats live lookup on Waypoint's own axis. | 1 wk | **[owner — edge fn]** |
| 8 | **A4 · Classifier prompt server-side.** Kills the mirror and the last client-assembled prompt. | 1 d | **[owner — edge fn]** |
| 9 | **Phase 6, scheduled as a feature.** 1,037 → ~250 lines. It has lost to the backlog three times; it will lose a fourth unless it is the sprint. | 3–4 d | **[owner]** |
| 10 | **A migration-drift assertion** so an unapplied migration fails loudly instead of shipping a broken feature. | 2 d | **[owner — schema]** |

### Next quarter — the wedge and the ceiling

| # | Item | Size | Gate |
|---|---|---|---|
| 11 | **The age-18 transition.** Clocks + content + the notification that makes it arrive. The one thing neither competitor can do. | wks | **[owner]** |
| 12 | **A6 · Batch** the derived Learn articles at 50% cost, each with a citation and a reviewed-on date. | 2–3 d | auto |
| 13 | **Lead the pitch with the five-payer mechanism.** It is built; it is unique; it is currently a footnote. | — | **[owner]** |

---

## 7. What not to build

Carried forward from two analyses, plus one new.

- **Multi-state.** Their national scope is the tax they pay — no citation, no
  reviewed-on date, California offered as an *example*. Now true of two
  competitors. Lock California in a decision record.
- **Per-session pricing.** The uncapped-COGS trap of L5. Waypoint already has
  the better answer in code.
- **A "talk to a real expert" button.** Killed once for Undivided; the same
  answer for Special Needs Navigator, who can offer it only because the expert is
  him. The DRC phone number in the footer is worth more than the button.
- **Dark mode.** `app.json` pins light; 83 loose hex values would each need a
  counterpart. Unchanged.
- **Content volume as a race.** One editor-year minimum, and a funded team wins
  by default.
- **New:** **live benefit figures in the answer path.** It looks like parity with
  Sage and it is a downgrade — it trades a dated, attributable claim for a fresh,
  unattributable one, on the exact axis Waypoint competes on. Put the freshness
  in the re-verification job instead (A7).

---

## 8. Confidence

**Verified by reading the code today:** every file path, line number and count;
the model tiering; the cache-control call and the missing cache-hit telemetry;
the classifier's silent fallback; that `expectedBehavior` is never read; that
tenancy shipped; that `HomeScreen.tsx` is 1,037 lines; that citations, structured
outputs, batch and web search appear nowhere.

**From the bundled `claude-api` reference:** Batch at 50%; the citations
mechanism (`cited_text`, character ranges, and its incompatibility with
`output_config.format`); structured outputs; prompt-caching prefix semantics and
GA status; the server-side web search tool. Current as of that reference, not
independently re-verified against live docs.

**Estimated, not measured:** every size in weeks and days, and the claim that A2
is the highest value per hour. That is a judgment from the evidence, not a
measurement.

**Not known:** whether the cache is currently hitting (nothing logs it) — which
is itself the argument for A5.
