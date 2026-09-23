# 004 — Learn manifest: derivation run and what it found

**Date:** Sep 15, 2026 · **Status:** analysis — NOT a plan of record
**Initiative:** 004 · **Method:** 15-agent workflow (10 module readers → merge → 4 adversarial critics)

---

## The headline: I re-derived what the repo already generates

The run produced 40 candidate articles from 76 raw candidates across 10 module
readers. Then the critics found the thing the readers had not been told to look
for, and it invalidates most of the output:

**`src/lib/learnDerive.ts` already exists — 236 lines, shipped Sep 8.** Slice 8-1,
"the derivation harness", is built. `deriveArticles()` mechanically projects
**22 articles** from the same modules four of my ten readers were reading, and
does it better than the readers did: trilingual by construction, carrying each
module's own already-verified citation, ending in the action the module already
points at.

I read 004's `plan.md`, saw 8-1 listed as a slice, and assumed it was unbuilt.
It was not. **24 of the 40 candidates duplicate it.** That is the same class of
error this session has caught twice already — proposing work that exists — and
this time I made it myself, at a cost of 32 minutes and 1.8M subagent tokens.

The critique is what the run was worth. It is reproduced below because every
load-bearing claim in it was verified against the repo by hand afterwards, and
every one held.

---

## The corrected arithmetic for "~40"

| Source | Count | State |
|---|---|---|
| `deriveArticles()` — ladder 4, RC stages 6, school stages 6, stack layers 6 | **22** | **Built.** Needs slice 8-2: composition into `learnLibrary` + the human-review pass. |
| Hand-authored, already shipped (`rc_said_no`, `ipp_clock`, `rc_money`, `sibling_support`, `first_iep`) | **5** | Live. |
| **Subtotal already accounted for** | **27** | |
| The gap to ~40 | **~13** | The only genuinely new writing the approved scope needs. |

**So the owner's approved "~40" is mostly already built.** The open work is
slice 8-2 (compose + review the 22) plus roughly 13 additive articles — not 40
new ones. That is a materially smaller and better-shaped job than the approval
implied, and it should be said before anyone budgets three weeks for it.

---

## The additive pool — 16 candidates for ~13 slots

These derive from the six modules `learnDerive.ts` does **not** touch. Every one
carries defects from the critique; none is shippable as written. Fix at
composition time, not by editing this table.

| # | Slug | Stage | Source | Citation | Defects |
|---|---|---|---|---|---|
| 1 | `early-start-under-three` | noticing | eligibility | IDEA Part C · Early Start | 1 should-fix |
| 2 | `turning-three-what-changes` | now_what | eligibility | Ed Code §56321 · §56344 | 3 should-fix |
| 3 | `add-a-need-to-the-ipp` | seeking_help | letters | W&I §4646.5 · §4648(a) | — |
| 4 | `agency-regional-center-what-it-does` | seeking_help | agencies | W&I §4620 | 1 should-fix |
| 5 | `early-start-45-day-clock` | noticing | registry | 34 CFR §303.310 · Early Start | **2 blocking**, 0 should-fix |
| 6 | `get-my-childs-records` | seeking_help | registry | Ed Code §56500.4 · §56504 | — |
| 7 | `insurance-must-cover-aba` | advocating | registry | H&S §1374.73 | 3 should-fix |
| 8 | `likely-eligible-vs-needs-review` | overwhelmed | eligibility | **null** | 2 should-fix |
| 9 | `agency-dor-after-high-school` | now_what | agencies | **null** | 2 should-fix |
| 10 | `iep-triennial-re-evaluation` | now_what | clocks | **null** | **1 blocking**, 2 should-fix |
| 11 | `request-with-no-legal-clock` | advocating | clocks | W&I §4710 | — |
| 12 | `school-break-days-may-not-count` | advocating | clocks | Ed Code §56321 · §56344 | **1 blocking**, 1 should-fix |
| 13 | `sdp-budget-ipp-meeting` | advocating | sdpJourney | W&I §4685.8 | — |
| 14 | `sdp-fix-the-ipp-first` | seeking_help | sdpJourney | W&I §4685.8 · §4646.5(b) | 1 should-fix |
| 15 | `sdp-orientation-two-parts-scdd` | seeking_help | sdpJourney | W&I §4685.8 · DDS D-2026-SDP-002 | — |
| 16 | `ssi-what-it-pays-and-what-it-depends-on` | seeking_help | eligibility | SSA 2026 COLA | 1 should-fix |

Stage spread of the pool: {'noticing': 2, 'seeking_help': 6, 'overwhelmed': 1, 'advocating': 4, 'now_what': 3}.
Source spread: {'eligibility': 4, 'registry': 3, 'agencies': 2, 'letters': 1, 'sdpJourney': 3, 'clocks': 3}.

---

## The defects that must be fixed before any of this composes

Verified against the repo, not taken on the critics' word:

1. **Dead end-actions.** `ADDABLE_TYPES` in `RequestTrackerScreen.tsx:41-49` does
   **not** include `rc_intake`, and there is no Early Start / Part C referral
   type and no Notice-of-Action type at all. Three candidates end in "log it in
   RequestTracker", which a parent cannot do. Confirmed by reading the file.
2. **A real mis-citation.** `benefit-layers-in-order` is cited to **W&I §4685.8**,
   which `contentSources.ts:74` shows is the **Self-Determination Program**
   statute — nothing to do with the order of benefit layers. Confirmed.
3. **A citation that would fail the build.** One title carries a bare `§4731`
   with no code named. `statuteAudit.guard.test.ts` now fails on exactly that,
   so this would break CI rather than ship quietly — the gate working as
   designed, on my own output.
4. **A claim its citation does not support.** `ssi-and-the-month-after-18` rests
   the deeming rule on "SSA 2026 COLA", a figures entry.
5. **A clock asserted flatter than the law.** `ask-for-iep-meeting-any-time`
   states a flat 30-day rule; the registry entry it cites records an exception.
6. **Voice.** At least one `primaryQuestion` blames the actor — "Are they
   actually late?" — against the spec's status-of-the-answer rule.
7. **Schema.** No candidate carries `relatedQuestions` or `bridge`, which
   `editorial-spec.md` lines 87-106 make required, and none names its keepable
   tool.
8. **English-only.** The spec makes Spanish and Vietnamese peers;
   `learnDerive.ts` already does this correctly and this pool does not.
9. **009 under-represented.** Adult transition (ages 14 → school exit, now in
   scope) gets two articles. It should get more of the ~13.

---

## What to do next, in order

1. **Ship slice 8-2 for the 22 derived articles** — composition into
   `learnLibrary` plus the human-review pass the harness header explicitly
   defers to it. This is the real open work and it needs no new prose.
2. **Only then** write the ~13 additive ones, from the pool above, with the
   nine defect classes fixed and the adult-transition share raised.
3. **Do not re-run this workflow.** Its readers would have to be told what
   `learnDerive.ts` covers, at which point the honest prompt is "find the gap",
   which is what this document already records.
