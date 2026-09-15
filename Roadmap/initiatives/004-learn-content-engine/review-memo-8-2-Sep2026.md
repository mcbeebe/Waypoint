# Review memo — slice 8-2, the human-review gate

**Date:** Sep 15, 2026 · **Initiative:** 004 · **Status:** ready for owner review
**Adversarial pass:** fresh subagent, no access to this session's reasoning. 12 findings, all verified by executing probe tests against the real modules.

---

## 1. What this change does

Derived articles (the 22 `learnDerive.ts` projects out of the escalation ladder,
process map and resource stack) cannot reach a family until a person puts an
entry in a review ledger. The ledger ships **empty**, so the change is
behaviourally inert today; the mechanism is what lands.

## 2. Where to focus

- **`learnLibrary.ts:834-853`** — `getLearnArticles()` now composes authored +
  reviewed. This is the load-bearing line: everything else (reader, search,
  Home, Tools) reads through it. It was the fix for the review's two blocking
  findings.
- **`learnReview.ts:106-160`** — `validateLedger()`. The first real entry is
  checked here or nowhere: key existence, ISO date, signature, 5–10 questions,
  locale parity, translation, and `supersedes` target.
- **`learnReview.ts:170-180`** — `supersededKeys()`. An entry that cannot ADD an
  article must not be able to REMOVE one. This asymmetry was a data-loss bug.
- **`learnReview.reachability.test.ts`** — the only place the composed path is
  exercised end to end. Verified it fails 6/8 against the original defect.

## 3. Adversarial findings

| # | Finding | Response |
|---|---|---|
| **F1** | **BLOCKING.** Reviewed article composed into the panel but `getLearnArticle()` returned `null` — every tap dead-ended on "That article isn't available." And `reviewedOn`, the field the ledger exists to supply, renders *only* on that unreachable screen. | **Fixed.** Composition moved into `getLearnArticles()`. |
| **F2** | **BLOCKING.** `searchLearn()` read the authored set, so a parent who browsed found the article and the same parent who typed its title was told "Nothing in the library matches that." | **Fixed** by the same move — search builds from `getLearnLibrary`. |
| **F3** | **Data loss.** A typo'd `key` plus `supersedes` deleted a shipped article and added nothing, reported as success. | **Fixed.** `supersededKeys()` only honours entries that will actually compose. Test pins it. |
| **F4** | Superseded article stayed reachable by search and deep link. | **Fixed** by F1/F2 — one library, one answer. |
| **F5** | Nothing validated a ledger entry; no test read the real `REVIEW_LEDGER`. | **Fixed.** `validateLedger()` + a test over the actual ledger. |
| **F6** | `pick()` shipped an empty es/vi "People also ask" silently; nothing stopped English being pasted into both. | **Fixed.** Count-parity and untranslated-copy checks. |
| **F7** | `sharesCitationWith` was a last-wins map, so `rc_money` could never appear — a reviewer would retire one duplicate and leave another. | **Fixed.** Now `string[]`; test asserts `rc_stage_rc_delivery` reports both. |
| **F8** | `satisfies LearnArticle` does not check spread-in properties, so a future second field on `DerivedArticle` would reach a family unnoticed. | **Fixed.** Explicit return annotation with every field named. |
| **F9** | Half the module had no consumer. | **Partly fixed.** `pendingReview`/`reviewStatus` are consumed by tests only. Accepted for now — see §4. |
| **F10** | Reviewed articles always sort last, and the panel shows 2 collapsed; `stage` is read by no UI. | **Accepted risk, not fixed.** Reordering family-facing content is an editorial decision, not mine to make silently. Flagged for the owner. |
| **F11** | **Root cause.** The plan of record and `learnDerive.ts`'s own header both say `learnLibrary` composes; the change composed in a parallel module. | **Fixed** — and my justification was simply wrong. I assumed a runtime import cycle. `learnDerive` imports from `learnLibrary` with `import type`, which is erased, so there was never a cycle. I asserted it without checking. |
| **F12** | Duplicate ledger entries: last silently won, summary miscounted. | **Fixed.** Validator flags it; composition is first-wins and deterministic. |

**Test-quality findings, all accepted:** tautological assertions restating
`learnDerive`'s contract — **deleted**. Brittle `reviewSummary` string equality —
**replaced** with `reviewStatus()` returning a struct. No end-to-end test of the
central claim — **added** (`learnReview.reachability.test.ts`), and proved it
fails 6/8 against the original defect.

## 4. Assumptions and design decisions

**What I chose:**

- **One library, one answer.** Composition in `getLearnArticles()` rather than a
  helper. The competing property is purity — `learnLibrary` now has a runtime
  dependency on the review gate. I judged a reachable article worth more.
- **The ledger is a typed array in the bundle.** Reviewer's point stands: this
  means the owner cannot publish an article without an engineer and a release.
  For ~22 articles that is an acceptable trade; at 200 it would not be.
- **Enrichment is additive-only.** A reviewer can add stage, questions, date, or
  supersede — they cannot fix a sentence. **The reviewer flagged this as a real
  mismatch with the editorial spec**, whose checklist asks "is there a keepable
  tool" and "read it as a tired parent at 11pm" — neither actionable when `body`
  is locked to the module's prose. A reviewer who finds a projection *almost*
  good must reject it or edit the upstream module. **Unresolved; owner's call.**

**What would change my mind:**

- If the owner wants to publish without a release → the ledger moves to Supabase.
- If reviewers reject projections for prose rather than judgment → add a body
  override, or a `needs-upstream-edit` gap.
- `THIN_BODY_BLOCKS` flags a class (all six stack layers have one `para` by
  construction), not a defect. Dropped from the gap list rather than left as a
  false signal.

## 5. Process

This is family-facing Learn content and is **not** in the draft-flow auto-merge
grant. It needs the owner's approval; the producing session does not mark its
own change reviewed.

**Gates:** `tsc` clean · eslint 0 errors (56 warnings, baseline) · vitest
**142 files / 1591 tests**.
