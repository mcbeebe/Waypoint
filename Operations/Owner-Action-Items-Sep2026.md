# Owner action items — September 2026

**Date:** Sep 13, 2026 · **Updated:** Sep 15, 2026 · **Status:** Step 1 is the only thing left — Steps 2, 3 and 4 are DONE
**Companion to:** `Roadmap/Statute-Registry-Worksheet-Sep2026.md` (the detail behind Step 2),
`Roadmap/Build-Plan-Items1-4-Sep2026.md`, `Roadmap/initiatives/009-adult-transition/`

---

## How to use this

1. Tick boxes as you finish them. Write answers directly in the blanks.
2. When a **whole step** is done, tell Claude "Step N is done" — the work that
   unblocks is listed under each step.
3. This file is the cross-session state. A returning session should read it
   before asking what's outstanding.

**Everything here is something only you can do.** Code that was waiting on
nobody has already shipped.

---

## 🔴 Step 1 — Unblock the product

Nothing built after this matters until it is done. `ROADMAP.md` reports W0–W3
all **code complete**; every open gate is operational. You have a finished
product that is not fully running.

- [ ] **1.1 · Apply migrations 043+** in order, in the Supabase SQL editor.
      `waypoint-app/scripts/build-pending-migrations.mjs` bundles a range into
      one transaction. *(~20 min)*
- [ ] **1.2 · Run the RLS verification queries.** *(~10 min)*
- [ ] **1.3 · Create the two Stripe Payment Links + the webhook secret**, then
      set the env vars. *(~30 min)*
- [ ] **1.4 · Deploy initiative 003 Lane B** — `push-send` and the reply poll
      are built and waiting on your deploy. See
      `Roadmap/initiatives/003-outbound-loop/plan.md` §7B-3 / 7B-4. *(~10 min)*
- [ ] **1.5 · Submit the 099 vendorization packet** — its own checklist is
      `Operations/099-Vendorization-Packet-Checklist.md`. *(~1 hr, plus RCEB's
      response time)*

> **Then:** the app runs end to end, Premium can take a payment, and a reply
> from an agency can reach a parent's phone.

---

## ✅ Step 2 — Verify the statutes — **DONE Sep 15, 2026**

> Owner verified rows 1–14 as REGISTER and corrected row 15 to 29 U.S.C. §794.
> All 23 gaps are closed; `KNOWN_GAPS` is empty and the ratchet is now a plain
> gate. Registry went from 25 entries to 38. Nothing below needs doing again —
> kept for the record.

**23 findings, but only 15 need you to open a source.** The audit
(`statuteAudit.ts`) found every statute asserted in prose with nothing behind
it. Detail, quoted claims and file:line for all of them are in
`Roadmap/Statute-Registry-Worksheet-Sep2026.md`.

**Why this one is urgent:** several of these sit inside **letter templates a
parent sends to a school district or Regional Center**, under the heading
`Violations:`. A wrong section number there is a false legal claim a family
makes on Waypoint's word, to an agency with power over their child.

### 2A · Eight that need no lookup — just confirm the code name

The registry **already covers** these. The prose simply writes `§4731` where it
should write `W&I §4731`, so a parent cannot look it up. In-repo evidence:
`agencies.ts:183` lists them together under "W&I Code §4500+", and
`agencies.ts:177` spells out "W&I Code §4731".

- [x] **Confirmed and applied.**
      One glance, no source lookup.

| Prose says | Should say | Where |
|---|---|---|
| `§4642` | **W&I** §4642 | actionEmail.ts, planGenerator.ts |
| `§4643` | **W&I** §4643 | processMap.ts |
| `§4646` | **W&I** §4646 | agencies.ts |
| `§4710` | **W&I** §4710 | learnLibrary.ts |
| `§4710.5` | **W&I** §4710.5 | agencies.ts, learnLibrary.ts, +1 |
| `§4731` | **W&I** §4731 | agencies.ts, escalationLadder.ts, +3 |
| `§56321` | **Ed Code** §56321 | iepDeadlines.ts |
| `§56344` | **Ed Code** §56344 | iepDeadlines.ts, planGenerator.ts |

*(`§4642` also appears in 2B — it is the one of these eight the registry does
not yet cover, so it needs the lookup there as well.)*

### 2B · Fifteen that need a source opened

For each: click the link, read the section, and write **one** verdict in the
last column.

- **`REGISTER`** — it says what we claim. Claude writes the registry entry.
- **`FIX`** — the citation is wrong; note the right one.
- **`REMOVE`** — the source does not support the claim; the citation comes out.

| # | Citation | What the app rests on it | Source (unverified) | Verdict |
|---|---|---|---|---|
| 1 | 34 CFR §300.301 | right to request an evaluation — in a **CDE complaint template** | [ecfr](https://www.ecfr.gov/current/title-34/section-300.301) | |
| 2 | 34 CFR §300.502 | IEE at public expense — in an **IEE request letter** | [ecfr](https://www.ecfr.gov/current/title-34/section-300.502) | |
| 3 | Ed Code §56302.1 | the 60-day evaluation timeline — in a **complaint template** | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=EDC&sectionNum=56302.1.) | |
| 4 | Ed Code §56341.1 | IEP team duties | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=EDC&sectionNum=56341.1.) | |
| 5 | Ed Code §56329 | assessment / IEE rights (registry verified §56329(b) only) | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=EDC&sectionNum=56329.) | |
| 6 | H&S Code §1374.73 | autism behavioral-health treatment mandate | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=1374.73.) | |
| 7 | Ins Code §10144.51 | the Insurance Code twin of §1374.73 | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=INS&sectionNum=10144.51.) | |
| 8 | 42 U.S.C. §1396d(r) | EPSDT — cited in a **Medi-Cal denial appeal** | [cornell](https://www.law.cornell.edu/uscode/text/42/1396d) | |
| 9 | W&I §4500 | the Lanterman Act's opening section | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=4500.) | |
| 10 | W&I §4502 | rights of persons with developmental disabilities | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=4502.) | |
| 11 | W&I §4620 | Regional Center responsibilities | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=4620.) | |
| 12 | W&I §4642 | intake assessment within 120 days | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=4642.) | |
| 13 | W&I §4648 | services must be delivered as authorised (registry verified §4648(a) only) | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=4648.) | |
| 14 | W&I §95014 | Early Start eligibility | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=95014.) | |
| 15 | Section 504 (Rehabilitation Act) | 504 plans as an IEP fallback — **not a California code**; likely 29 U.S.C. §794 | [cornell](https://www.law.cornell.edu/uscode/text/29/794) | |

- [x] **All 15 verdicts given.** 1–14 REGISTER; 15 corrected to 29 U.S.C. §794.

> **Then Claude:** writes every registry entry with your date, applies the eight
> prose fixes, empties `KNOWN_GAPS` in `statuteAudit.guard.test.ts`, and
> promotes the ratchet from "no new debt" to a hard gate. *(~1 day)*

---

## ✅ Step 3 — Two decisions on the Adult Transition — **BOTH ANSWERED**

Read `Roadmap/initiatives/009-adult-transition/intent.md` first (one page).

### 3.1 · Legal-capacity content — **ANSWERED Sep 15, 2026**

- [x] **"It's OK to present the legal options, but NOT OK to give legal
      opinions."** The content stays, constrained. Claude asked this as a
      binary (credentialed review, or cut it); the answer is neither and is
      better than both.

**The rule, as encoded in `initiatives/009-adult-transition/intent.md`:**

| Allowed | Not allowed in Waypoint's voice |
|---|---|
| Name every option that exists | Rank them |
| Describe factually what each is | Call one "lighter" or "most common" |
| Say when the decision arrives, and how long it takes | Recommend an order to consider them in |
| Route to free credentialed help (OCRA) | Describe how to file, or draft an instrument |

**Escape hatch:** if California law itself ranks the options, Waypoint may state
that as a *fact about the law* — because it arrives with a registered citation.
The statute gate makes this mechanical: say it only if you can cite it.

**Already applied** to four shipped lines that were opinions — including
"Limited conservatorship is most common for ID," an unsourced empirical claim
that nudged families toward the option that removes rights.

### 3.2 · Age range for v1 — **ANSWERED Sep 15, 2026**

- [x] **"Stop at school exit."** v1 runs **ages 14 → school exit**.

The answer settles something the question didn't: the upper bound is an **event,
not an age**. A student may exit at 18 with a diploma or stay to 22 on a
certificate track — so the arc reads the exit date rather than assuming a
birthday. That makes it a real clock input, which is the right shape for a
product whose whole claim is dates that arrive.

> **Then Claude:** builds B1 — the age-keyed arc, the date/window split, and
> design-canvas mockups. *(~3 days, then back to you for approval before code.)*

---

## ✅ Step 4 — Approve the Learn engine scope — **APPROVED Sep 15, 2026**

Initiative 004 is planned and waiting. The scope question is the whole decision.

- [x] **APPROVED Sep 15, 2026 — ~40 derived articles**, each generated from a module that
      already exists, each carrying a citation and a reviewed-on date, each
      ending in an action the app performs.
- [x] **Not approved** (correctly) — phase 8's original "dozens, then hundreds of articles"
      — the level-up review called that the single most dangerous line in the
      roadmap for a solo owner.

**Sequence note:** do not start this until **Step 2** is done. The entire reason
grounded answers was sequenced first is so all 40 articles generate against a
citation gate that actually works.

> **Corrected Sep 15, after deriving it:** "~40" is mostly already built. The
> harness (`learnDerive.ts`) shipped Sep 8 and mechanically emits **22** articles;
> **5** more are already live. So the gap is **~13**, not 40, and the next step is
> slice **8-2** — composing and human-reviewing the 22 — rather than new writing.
> Full accounting: `Roadmap/initiatives/004-learn-content-engine/analysis-manifest-Sep2026.md`

---

## Status log

Append a line when something changes; a returning session reads this first.

| Date | What changed |
|---|---|
| 2026-09-15 | **Step 4 scope corrected after measurement:** the Learn harness already ships 22 derived articles and 5 are live, so the approved "~40" needs ~13 new ones, not 40. Next slice is 8-2 (compose + review), not authoring. |
| 2026-09-15 | **Step 3.2 answered** ("stop at school exit" — an event, not an age) and **Step 4 approved** (~40 derived articles). Only Step 1, the operational unblock, remains. |
| 2026-09-15 | **Step 3.1 answered:** present the options, never give a legal opinion. Rule encoded in initiative 009; four shipped opinion lines neutralised. |
| 2026-09-15 | **Step 2 closed.** Owner verified all 23. 12 authorities registered, 2 parent sections folded into existing entries, Section 504 registered as a named authority, 9 bare `§` given their code in prose (trilingual). Registry 25 → 38 entries. `KNOWN_GAPS` empty; ratchet is now a hard gate. Gates green: 140 files / 1560 tests. |
| 2026-09-13 | Checklist created. Steps 1–4 all open. Code that needed no decision has shipped: `statuteAudit.ts` + ratchet, `sourceFreshness.ts`, initiative 009 intent/plan. |

---

## What is NOT waiting on you

So you can skip past it: the statute audit and its ratchet, the provenance
freshness module, the build plan, the product roadmap, the competitor analyses,
and initiative 009's intent and plan are all written, tested and pushed. Gates
green at 140 test files / 1,558 tests.
