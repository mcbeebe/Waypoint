# Undivided vs Waypoint — Competitive Analysis

**Date:** Aug 30, 2026 · **Status:** adopted
**Supersedes:** the competition notes folded into `Channel-Deep-Dive-Aug2026.md` (kept for pricing history)

*This is the synthesis of a five-lens study of Undivided's app (from ten
screenshots the owner supplied Aug 29) resolved against the Waypoint repo, then
attacked by a critic pass. Facts are marked with file/line where they carry
weight. It is the analysis of record behind the phase-9 draft-flow decision —
its roadmap **item 10 is that draft flow** (see `Roadmap/Draft-Flow-Plan.md`),
and its §6 "the one thing" is the flagship demo those two documents describe
together. Where this document and the draft-flow plan disagree on a number,
this one was verified against the code and wins.*

---

# Waypoint vs Undivided — one plan

*Synthesis of five analyst reports, resolved against the repo at `/home/user/Waypoint` and the ten screenshots. Verified facts are marked with file and line where they carry weight.*

---

## 1. The verdict, in three sentences

Waypoint has the better engine and the worse screen: `homeTriage.ts` (994 lines, 8-rung published ladder), `requestClocks.ts`, `requestCase.ts`, `requestDossier.ts` and `contentSources.ts` do things Undivided's five screens show no trace of — statutory clocks, provenance tiers, a hearing-grade export, a citation registry with verification dates — while Home is still the 959-line dashboard the 20-persona audit condemned, opening on "0% complete" and "$0 · $0 · $0".

Undivided is genuinely ahead on exactly three things — restraint (3 blocks vs 12–15), depth per goal (20 teaching steps vs a flat checkbox list), and person-centred framing (Vision · Strengths, Loves, and Hobbies · Supporting My Child) — and ahead on two more that are funding, not craft: a staffed human navigator and an editorial library.

The gap that matters is not capability, it is that phase 6 of the Home rebuild — the deletion phase — has not shipped, so the owner's own screenshots compare Undivided's finished screen to Waypoint's demolition site.

---

## 2. Where Undivided is genuinely ahead, ranked

**1. Restraint on Home.** Three blocks, one filled-colour alert, one CTA. Waypoint's Home renders 12–15 blocks, ~18 tap targets, 5 competing primary CTAs, and 7 distinct card treatments. **Size: days.** It is already written as phase 6 in `Roadmap/Home-Rebuild-Plan.md` ("Home ends as greeting → card → composer → one status line", `HomeScreen.tsx` under ~250 lines). This is not a gap, it is unshipped work.

**2. Empty states that teach.** "Mark your most important tasks with a ☆" earns its slot. `src/components/EmptyState.tsx` defaults to a 48px 📭 and announces absence. **Size: days, pure copy.**

**3. Depth per goal.** "2 of 20", per-step teaching, per-step tasks, "Add all to tasks", plus Notes / Documents / IEP Assistant tabs. Waypoint's equivalent is `ActionStep { step: string; done: boolean }` (`src/types/database.ts:527`) rendered as a checkbox row. This is real and it is the biggest content gap. **Size: weeks — but see §5; the owner has already ruled out copying the shape.**

**4. Person-centred framing.** Vision, Strengths/Loves/Hobbies, Supporting My Child. Waypoint has these prompts *already written* in `src/screens/staff/PCPBuilderScreen.tsx` ("What is this person great at? What do people who love them say about them?") — pointed at facilitators, unreachable by families. **Size: days for the fields, weeks with migration + trilingual + adversary.**

**5. Visual system.** One icon vocabulary in coloured category chips; three legible surface levels; a 34pt display size with a ~15pt content floor. Waypoint runs three icon systems (Ionicons monochrome teal, Apple emoji, text glyphs), one surface level, 83 loose hex values against a 20-value `theme.ts`, and uses `fonts.sizes.xs = 10` for content. **Size: days for tokens, weeks for the sweep.**

**6. Editorial art direction.** Every Resources card gets a 16:9 illustrated header. Note the cheap truth: the two adjacent OCD cards use the **identical** image — it is a template per content type, not bespoke art. **Size: a week plus a small commission for 6–8 SVG patterns.**

**7. Content volume.** An illustrated, bookmarkable, shareable library vs `learnLibrary.ts`'s 5 paths and 4 articles. **Size: a year and a hire. Do not race this.**

**8. Human navigators and Expert Office Hours.** The two-face avatar pinned to all five screens. **Size: payroll. Unbuyable. Do not fake it.**

---

## 3. Where Waypoint is ahead and does not show it — the cheapest wins

Ranked by return per hour. Every one is verified in the repo.

**a. Tool badges are computed and thrown away on Home. Hours.**
`ToolsArea.tsx:137-142` computes `caseBadge(requests, communications, locale)` and renders **"2 waiting"** on the Tools screen (visible in `ad6b653c`). `PinnedTools.tsx` takes `{ pins, locale, onNotice }` — no badge prop. So the identical tile on Home is blank while two statutory clocks are running. Pass the badge map in. This is the cheapest live-legal-clock-on-first-screen fix in the repo.

**b. `sourceForCitation()` has zero non-test consumers. A week.**
Confirmed by grep: `CONTENT_SOURCES` and `sourceForCitation` appear only in `contentSources.test.ts` and `learnLibrary.test.ts`. Every citation in the UI — "W&I §4646.5(b)" on the One Thing card, on the ladder rungs, in the dossier — renders as inert ~11px grey text. **Not one citation, statute, source or verification date appears anywhere in Undivided's five screens.** A `<Citation>` component opening a sheet with the authority, the claim, `verifiedOn`, and a re-verify link converts the single most defensible asset in the product from a footnote into a seal.

**c. The dossier is a verb four to five taps deep. Days.**
`requestDossier.ts` renders a chronological, provenance-tiered, SHA-256-fingerprinted evidence packet whose header comment reads *"FREE for every family: the export IS the leverage."* It surfaces as `📄 Export` at `RequestCaseScreen.tsx:405`, styled like "+ Log a call". The word "dossier" appears nowhere a parent reads. Rename it to the artifact ("Download the case file (PDF) — for an advocate, OCRA, or a fair hearing. Free."), add a "Case file: N items on record" counter, and add one sentence to `sentNext.ts`'s first-send moment.

**d. The escalation ladder has one in-app entry point. Days to surface.**
`escalationLadder.ts` — four rungs, each with its own clock, citation, letter and tone; rung 4 says **a free advocate is assigned to every Regional Center by law**. Its only tap is a button at `ProcessMapScreen.tsx:382`, itself behind the collapsed "Understand the system" accordion. Undivided never tells a parent that OCRA exists.

**e. Ten finished letters presented as a blank box. Days.**
`lettersCatalog.ts` holds 22 templates; 10 carry a pre-written, legally specific `defaultRequest`. `LettersScreen.tsx` (1021 lines) asks the parent to type what they need.

**f. Trilingual, structurally enforced, hidden in a settings scroll.** `localeParity.test.ts` proves es/vi differ from en in prose only — same keys, citations, lever refs. The switch lives at `ProfileScreen.tsx:763`, behind avatar → Profile and settings → scroll, and is not in `accountMenu.ts`. Undivided is English-only. **Days.**

**g. The published triage ladder is the trust argument, rendered as the smallest text on the card.** `TRIAGE_LADDER` (`homeTriage.ts:44`) — resume · crisis · overdue · reply · today · clock · question · opportunity, fixed order, "the array IS the contract". Undivided's "My Priorities" is **empty on their own marketing screenshot** and asks the parent to star things. Waypoint does the triage and publishes the algorithm, in grey, below "Not today".

**h. And the free shot:** Undivided's Home says the IEP goal *"is due in 33 days on October 2"* while their Roadmap card and their own goal detail both say **Oct 1, 2026**. Their two surfaces disagree by a day. For a product where dates are decoration that is cosmetic. `requestClocks.ts` has a comment about having fixed exactly that bug — "a citation attached to a date the law never gave" — because for Waypoint it would be a false legal claim.

---

## 4. The sequenced plan

**Governance up front.** Per `CLAUDE.md`, everything family-facing, tone-changing, schema-touching or legal needs `/adversary` in the PR plus the owner's approval. Marked **[owner]** below. Everything else auto-ships. Phase 6 clears the initiative bar and should get `Roadmap/initiatives/003-home-reduction/`.

### Next week — make the comparison fair

| # | Item | Size | Files |
|---|---|---|---|
| 1 | **Ship phase 6.** Delete the Financial Snapshot ($0·$0·$0), the 0% ring, the empathy quote, `CheckInCard`, `TodayCard`, `ProfileCompletionCard`, `OnboardingTutorial`, the Journey Map banner, the RC card and the `ToolsArea` accordion. Home = header line (child folded in — kill "Teddy's Dashboard") → One Thing card → composer → one status line. | 3–4 days | `src/screens/main/HomeScreen.tsx` 959→~250 **[owner]** |
| 2 | **One Thing card craft, in the same PR.** Title to ~24pt, `numberOfLines` off the truncated "Progress Data Request — Teddy …". Replace the 10.5px two-line caps eyebrow with an icon chip + two-word class label. Collapse the three stacked ghost controls to one. | 1 day | `src/components/OneThingCard.tsx` **[owner]** |
| 3 | **Badges on Home tiles.** Pass `ToolsArea`'s badge map into `PinnedTools`. | hours | `src/components/PinnedTools.tsx` |
| 4 | **Close the provenance hole before anything multiplies content.** Eight statutes are asserted to families in prose with **no registry entry**: W&I §4642, §95014, Ed Code §56302.1, §56341.1, H&S §1374.73, Title 17 CCR, 34 CFR §300.301, §300.502 — in `planGenerator.ts`, `adaptiveEngine.ts` and (missed by every analyst) `src/data/agencies.ts`. Register them; extend the guard to scan prose, not only structured `citation` fields. | 1 day | `src/data/contentSources.ts`, `contentSources.test.ts` **[owner]** |
| 5 | **Delete `snooze.ts`** (zero consumers, superseded by migration 048) and the Forum/Messages/Thread stack (`FLAGS.community: false` is a payroll decision, not a sprint). Wire `gapRules.ts` into the question rung or cut it. | 1 day | `src/lib/snooze.ts`, `ForumScreen.tsx`, `MessagesScreen.tsx`, `ThreadScreen.tsx`, `src/lib/flags.ts` |
| 6 | **Rewrite the ~10 empty states to teach.** Undivided's empty card earns its slot; `EmptyState.tsx`'s 📭 does not. | 1 day | `src/components/EmptyState.tsx` + call sites **[owner]** |

### Next month — make the engine visible, then make it end in words

| # | Item | Size | Files |
|---|---|---|---|
| 7 | **Token pass.** 3-level elevation scale, three surfaces (page/card/inset), line-height tokens paired to every size (their absence is already logged as a phase-2 defect), a 34pt display, a hairline token. Then codemod the 83 loose hex values — including the two off-whites one digit apart (`theme.ts` `#F8FAFC` vs `HomeScreen.tsx` `#F8FAFB`) and `#0891B2` hardcoded 18 times. **Raise the floor too** — `fonts.sizes.xs = 10` is used for content. | 3–4 days, auto-ships | `src/lib/theme.ts` + sweep |
| 8 | **One icon system.** An `IconChip` (filled glyph, saturated rounded square, one tint per category — `toolsCatalog.ts` already has `icon` on all 23 tools, add `tint`). Delete emoji from chrome: the 64px 🧭 that is currently the brand mark of the flagship AI screen, 👋, 📞, ◐, and the tone-pill emoji. | 3 days | new `src/components/ui/IconChip.tsx`, `toolsCatalog.ts`, `ToolsArea.tsx`, `NavigatorScreen.tsx` |
| 9 | **The `<Citation>` component.** Tap a statute → sheet with the authority, the claim Waypoint rests on it, "verified Aug 23, 2026", and a link to re-verify. Give `sourceForCitation()` its first non-test consumer. | ~1 week | `src/data/contentSources.ts:260`, new `Citation.tsx`, consumers in `OneThingCard`, `RequestCaseScreen`, `EscalationLadderScreen`, `ProcessMapScreen`, `LearnPanel` **[owner]** |
| 10 | **Phase 9 — the draft flow.** Two or three questions from a curated template, then the finished letter, with guidance beside the line it applies to, and the answers landing in the case file as evidence. This is the owner's own Aug 30 brief and it is the answer to Undivided's 20 steps. | 3–4 weeks | `LettersScreen.tsx`, `lettersCatalog.ts`, `draftBlanks.ts`, new `draftInterview.ts`, `requestCase.ts` **[owner]** |
| 11 | **Name the case file and give the dossier a front door** (§3c). Rename the Tools row, add the item counter, add the promise to `sentNext.ts`, rename `📄 Export`, render the dossier's own header lines as a preview card. | 3 days | `toolsCatalog.ts:73`, `RequestCaseScreen.tsx:363-405`, `sentNext.ts` **[owner]** |
| 12 | **Tools stops repeating itself.** The three pinned tiles duplicate the three TAKE ACTION rows on the same screen (`ad6b653c`). Drop the tiles there; compress rows to chip + label + badge + chevron; move the three identical filled stars into edit mode. | 2 days | `ToolsScreen.tsx`, `ToolsArea.tsx`, `PinnedTools.tsx` |
| 13 | **Put one dossier in front of one OCRA advocate.** `escalationLadder.ts` rung 4 already names them as free and statutorily assigned to all 21 RCs. Call RCEB's. Zero dollars, one week, and it is the only test of the claim the whole differentiation rests on. | days | — |

### Next quarter — depth, on Waypoint's terms

| # | Item | Size | Files |
|---|---|---|---|
| 14 | **Phase 7 — push.** No marketing sentence may contain "deadline" until this ships. Phase 2's review already forced the calm state to retract "Waypoint will tell you if Sep 19 passes" to "check back". Undivided doesn't need push because their dates are decorative; Waypoint's are the product. | 3–4 weeks | `expo-notifications`, `notification_policy`, a `pg_cron` edge function **[owner — edge functions have no CI]** |
| 15 | **Expand the statutory clocks.** `requestClocks.ts` computes 3 of 8 request types. The registry already holds verified, URL-cited, dated entries for at least six more agency obligations — school records **5 business days** (§56504), a parent-requested IEP team meeting **30 days** (§56343.5), Part C initial IFSP **45 days** (34 CFR §303.310), RC appeal **60/30 days** (§4710.5), §4731 director response **20 working days**, IEP **60 days from consent** (§56344). Add business-day math. **Honest cost the analysts undersold:** `request_type` is a `text ... check (...)` constraint (`037_family_requests.sql:15`), so new types need a hand-applied migration. | 1–2 weeks + a migration | `requestClocks.ts`, `requestCase.ts`, new migration **[owner — schema]** |
| 16 | **The person-centred half of the Binder, not the menu.** Add `children.vision`, `children.strengths`, `children.supports`; lift the prompts verbatim from `PCPBuilderScreen.tsx`'s four SECTIONS. Do **not** write to `sdp_cases.pcp_draft` — `pcp_completed_at` unlocks a code-024 invoice line, and a family self-completing there creates a billable line with no facilitator time behind it. | 2 weeks | new migration, `types/database.ts`, `ProfileScreen.tsx` **[owner — schema + family-facing]** |
| 17 | **Two exports off the dossier pipeline**, then offer the one-pager from the triage deadline rung: *"Print Teddy's one-pager for Thursday."* A one-page "all about me" for meetings and provider intakes, and a full sectioned binder. Free — and fix `entitlements.ts:67`, which currently lists `'Document binder + export'` under Premium and would gate a family's portrait of their own child. **Keep it separate from the request dossier**: the provenance machinery ("Recalled later — happened Aug 3, logged Aug 19", the no-immutability disclaimer) is right for a hearing officer and hostile at a first meeting with a new OT. | 2 weeks | new `binderExport.ts`, `requestDossier.ts` (pattern), `entitlements.ts`, `homeTriage.ts` **[owner]** |
| 18 | **Repoint the Tools `records` door at a Binder screen**, and make the inert child chip on Home open it. `toolsCatalog.ts:208` already titles the door with the child's name and already holds Documents / IEPHub / HealthRecords / Providers — it is the Binder in embryo. No fifth tab: the slot is reserved for Learn on evidence, and pin rate becomes that evidence. Resolve the `providers` / `family_contacts` duplication first or the printed Care Team lists the service coordinator twice. | 1 week + a merge migration | `toolsCatalog.ts`, new `binder.ts`, `routeGraph.ts` |
| 19 | **The California PCP claim.** Frame the Binder narrative as the raw material of a person-centred plan and attach the lever: `sdpJourney.ts:166` already says, cited to *codes 024 + 099 · July 2024 DDS guidance*, that the Regional Center pays **up to $1,000** for a facilitator. Undivided's Binder cannot say this. Don't overclaim — four text boxes at 11pm is not a billable facilitated deliverable. | days | `sdpJourney.ts`, `contentSources.ts`, `lettersCatalog.ts` **[owner]** |
| 20 | **Rescope phase 8** from "dozens, then hundreds of articles" to ~40 derived articles — each generated from a module that already exists (`escalationLadder` rung, `processMap` stage, `resourceStack` layer, a registry claim), each carrying a citation and a reviewed-on date, each ending in an action the app performs. Write the short plan the phase says it needs before any of it is built. | weeks (plan first) | `learnLibrary.ts`, `Home-Rebuild-Plan.md` phase 8, new `Roadmap/Learn-Content-Plan.md` |

**Resolved disagreement, stated plainly.** Analyst 3 proposed shipping a `playbooks.ts` spine plus a 12–16-step `PlaybookScreen` in week one, sourced from the 112 curated steps in `Waypoint-Entity-Navigation-Matrix-v9_4.xlsx`. The asset is real and undervalued. The screen is not: the owner's phase 9 brief (Aug 30, in the plan of record) explicitly rules out "a twenty-step playbook", and the audit already killed Waypoint's own completion ring for the same reason it should kill "2 of 20". **Resolution: mine the Matrix, ship no checklist screen.** The Matrix rows become the question bank and the guidance snippets for the draft flow (item 10), and the sequencing source for Plan. Revisit a structured journey surface only if the pilot shows parents asking "what else before the meeting?" — and even then, model it on `sdpJourney.ts`, where every step already carries a citation, a lever template and a checklist.

---

## 5. What NOT to build

**Dark mode.** It is the most visible difference and the most tempting mistake. `app.json` pins `userInterfaceStyle: "light"`, `useColorScheme` appears nowhere in `src/`, and each of the 83 loose hex values would need a dark counterpart — doubling a palette before consolidating it multiplies the drift and re-opens every contrast audit in an app that already shipped a provenance line at 2.6:1. Waypoint's content is long-form prose and rendered documents (letters, PDFs, scanned assessments); a white document pane inside dark chrome flashes at 11pm. The gravity Undivided projects comes from restraint, not hue — items 7 and 8 buy it in light mode in a week.

**The human-expert FAB.** Two named faces pinned to every screen works because those humans answer. A "talk to an expert" button backed by an LLM is the exact bait-and-switch the "Educational information only — not legal advice · Disability Rights California: 1-800-776-5746" footer exists to prevent. That footer is worth more than the avatar.

**User-set ★ priority as the organising principle.** Their own Home screenshot shows "My Priorities" **empty**, asking an overwhelmed parent to go do the triage. `homeTriage.ts` decides deterministically and publishes the order. Borrow the pill as a visual form for a *computed* class; never as a replacement for computing it.

**Self-reported checkboxes as the unit of progress.** "2 of 20" measures intent. Waypoint can measure evidence — a row in `communications`, an open `family_requests` with a running clock, a logged call. Trading that for a familiar progress bar forfeits the only claim that beats them.

**Content volume.** `learnLibrary.ts` holds 4 articles against an art-directed editorial feed. That race is one editor-year minimum and a funded team wins it by default. Phase 8 as written — "dozens, then hundreds" — is the single most dangerous line in the roadmap for a solo owner.

**Multi-state.** Their goal step reads *"Different states have different rules about recording IEP meetings, so please check your state's rules… For example, in C[alifornia]…"* — no citation, no reviewed-on date, California offered as an *example*. That hedge is the tax a national company pays and it is Waypoint's opening. Expansion forks `requestClocks.ts` per jurisdiction and multiplies the registry by fifty, each entry needing its own human verification date. Lock "California" as a decision record under `Roadmap/`.

**Bespoke per-article illustration.** Their two adjacent OCD cards use the identical image. Buy 6–8 patterns keyed to content type, not 200 pictures.

**Their chrome.** Two floating buttons stacked over the tab bar, and a sticky "Complete step" pill that sits **on top of** the guidance paragraph about recording rights, obscuring it mid-sentence (`2f6e9a97`). That is a real usability defect on a screen giving legal guidance.

**Their pricing history.** ≈$42/mo → $19/mo → $149/yr → free lead-gen over seven years on ~$5M raised, per `Channel-Deep-Dive-Aug2026.md`. `entitlements.ts` at $99/yr with `FLAGS.paywall: false` is the right posture. Never let it set the roadmap. And never gate the dossier — `requestDossier.ts` already settled that in writing.

**Their eleven-row Binder menu.** It is a settings list wearing a person's clothes. What makes it person-centred is the three field names, not the interaction. Render the portrait on one scrollable screen; don't add navigation depth to an app whose whole redesign premise is fewer surfaces.

---

## 6. The one thing

**One Home card that names the obligation, cites the statute in a way a parent can tap, and ends in a finished letter.**

Side by side, Undivided's best moment is *"Prepare for Teddy's annual IEP meeting is due in 33 days on October 2"* — a date a human typed into a goal, which their own Roadmap card contradicts by a day, on a screen that carries no source anywhere.

Waypoint's version of that moment already has every part built and none of them assembled:

> **An IPP meeting is past due — Sep 14**
> The Regional Center must hold the review within 30 days of your written request.
> **W&I §4646.5(b)** — *tap: "Lanterman Act · verified Aug 23, 2026 · read the section"*
> **[ Write the follow-up ]** → three questions → a finished letter → sent → the clock restarts → item 4 in Teddy's case file.

That is phase 6 (delete the noise), the `<Citation>` component (`sourceForCitation()` gets its first real consumer), and phase 9's draft flow (the owner's own decision) — collapsed into a single card. It is roughly six weeks of the plan above. Nothing else in this comparison makes a parent say *these are not the same kind of product*, and it is the one demo a funded content company with no legal engine cannot answer.
