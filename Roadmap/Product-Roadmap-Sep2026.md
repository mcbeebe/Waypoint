# Waypoint Product Roadmap — the five features worth building next

**Date:** Sep 13, 2026 · **Status:** draft — every item crosses an auto-ship stop; needs the owner's go
**Supersedes:** nothing. **Extends:** `ROADMAP.md` v2.0 (W0–W3 are code-complete; this is what comes after)
**Superseded-by:** —

*Grounded in a fresh inventory of the working tree taken today, plus
`SpecialNeedsNavigator-Comparison-Sep2026.md`, `Undivided-Comparison-Aug2026.md`,
`Payer-Funded-Pivot-Review-Aug2026.md` and `Waypoint-Leveling-Up-Sep2026.md`.*

**I checked before proposing.** Four features I was ready to recommend turned out
to be already built — the tappable citation (`Citation.tsx`, two consumers), the
draft flow (shipped end-to-end, 9a–9e), on-device deadline reminders
(`notificationPolicy.ts` + `useNotifications`), and multi-child switching
(`ChildPicker.tsx`). They are not in this list. Each item below names what
already exists so the estimate is honest about how much is genuinely new.

---

## 0. Read this before the list

**Waypoint's binding constraint right now is not engineering.** `ROADMAP.md`
reports W0, W1a, W1b and W2 all *code complete*, and every open gate is
operational:

- migrations 043+ not applied in the Supabase SQL editor;
- the two Stripe Payment Links and the webhook secret not created;
- RLS verification queries not run;
- the 099 vendorization packet not submitted;
- **no real family through the pipeline, and no paid invoice**;
- initiative 003 Lane B (server reply push) — *built, awaiting owner deploy*;
- initiative 004 (Learn engine) — *planned, awaiting owner go*.

None of the five features below is worth more than clearing that list. A feature
shipped into a product with unapplied migrations is a feature nobody runs. **The
highest-return hour this month is operational, not a keyboard.**

With that said — here is what to build.

---

## The five, ranked

| # | Feature | Why it wins | Size | Gate |
|---|---|---|---|---|
| 1 | **The Adult Transition** | The one cliff every family hits that no competitor can staff around | 4–6 wks | owner · family-facing + schema |
| 2 | **Grounded answers** | Turns "we cite the law" from a claim into an enforced invariant | 2–3 wks | owner · edge fn + family-facing |
| 3 | **The Binder** | The family's own artifact — free, printable, and it carries a $1,000 lever | 3–4 wks | owner · schema + family-facing |
| 4 | **The Learn engine** | The only asset that compounds while you sleep; CAC ≈ 0 depends on it | 6–8 wks | owner (initiative 004 exists) |
| 5 | **The Outcomes Readout** | Turns families served into evidence a payer will buy | 3–4 wks | owner · leaves the desk |

Read the ranking as *impact per unit of risk*, not as a strict sequence — §7
gives the running order.

---

## 1 · The Adult Transition

**The thesis.** Age 18 is the single largest un-owned surface in the product,
and it is the one place where Waypoint's architecture does something neither
competitor can.

**The gap, measured.** Searching `src/` for the whole adulthood cluster —
conservatorship, supported decision-making, the SSI age-18 redetermination,
Disabled Adult Child benefits — returns **about forty scattered mentions across
eight files** (`agencies.ts`, `journeyMaps.ts`, `planGenerator.ts`,
`homeTriage.ts`, `journeyActions.ts`, `CalendarScreen.tsx`, `ai.ts`,
`database.ts`). The seven journeys in `journeyMaps.ts` are all
**diagnosis**-shaped — Autism, PDA, ADHD, Intellectual Disability, SLD,
Speech/Language, Cerebral Palsy. **There is no journey for the transition to
adulthood, and no clock for any of its dates.** The topic is mentioned
everywhere and owned nowhere.

> **Corrected Sep 13, 2026 (same day), by `initiatives/009-adult-transition/intent.md`.**
> "Mentioned everywhere and owned nowhere" overstates it. Reading the matches
> rather than counting them: three are a different sense entirely (the Lanterman
> criterion that a disability must *originate* before 18), and the transition
> content that exists is deliberate, not accidental — `journeyActions.ts:185`
> already explains the SSI redetermination and its Medi-Cal consequence, and
> `:188` explains that conservatorship "takes months to arrange," carrying a
> comment recording that its matcher was narrowed to stop over-matching. The
> accurate finding is narrower and better: **knowledge with no spine and no
> clock.** No age-keyed arc, no clock for any adulthood date, no registry-backed
> transition statute, no triage rung — all four verified absent. This lowers the
> content risk in the estimate below and sharpens the engineering.

**Why this beats the competition, specifically.** Adult transition is Special
Needs Navigator's centre of mass — his origin story is literally *"what needs to
be done to help kids get underway with adult services after high school."* And
his product **cannot do the one thing this needs**: it has no persistence, so it
can explain the redetermination beautifully in a March session and has no
mechanism to mention it again in October. Undivided's dates are decorative — its
own two surfaces disagree on a date by a day. **Waypoint's whole engine is dates
that arrive.** This is the fight to pick.

**Build on what exists.** `requestClocks.ts` (statutory clock math),
`deadlineReminders.ts` + `notificationPolicy.ts` (the reminder brain, already
shipped), `homeTriage.ts` (the published 8-rung ladder),
`contentSources.ts` (the provenance registry), `lettersCatalog.ts` (22
templates), `edgeChildAge.tz.test.ts` (age math already dual-timezone tested).

**What to build.**
- A transition **arc** in `journeyMaps.ts` keyed to *age*, not diagnosis —
  the first non-diagnosis journey, which is itself a small architectural
  decision worth taking deliberately.
- **Age-triggered clocks** for the dates that actually bite: the SSI age-18
  redetermination, the IEP transition-plan requirement (by 16 in California),
  DOR referral, the school-exit date, and the conservatorship-alternatives
  decision window.
- **Registry entries** for every statute the arc asserts — the level-up review
  already found eight statutes asserted to families in prose with no registry
  entry; do not add a ninth.
- **A triage rung** so the cliff surfaces on Home when the child's age crosses
  the threshold — not as an article a parent has to go find.
- **Letters**: DOR referral, transition-assessment request, records request.

**Honest costs.** `request_type` is a `text ... check (...)` constraint
(`037_family_requests.sql:15`), so new clock types need a **hand-applied
migration**. Conservatorship is legally sensitive and the escalation-tone rule
applies with full force — supported decision-making is presented first, and
conservatorship is never the default recommendation. This needs `/adversary` and
probably a credentialed read.

**You'll know it worked when:** a family with a 15-year-old sees a transition
item on Home without searching for it, and the item cites a statute they can tap.

---

## 2 · Grounded answers

**The thesis.** Waypoint's entire competitive claim is that its guidance is
verifiable. Today that claim rests on a *sentence in a prompt*.

**The gap, measured.** `ai-proxy/index.ts:217` instructs the model: *"If unsure
about a specific fact, say so — don't fabricate legal citations."* KB articles
are pasted into the system prompt as plain text. Nothing structurally prevents a
fabricated statute from reaching a parent.

And the safety net does not cover it. `qa/promptRegression.golden.json` holds 78
cases; `scripts/prompt-regression.mjs` grades exactly two fields —
`expectedCategory` and `expectedTone` — **both properties of the Haiku
classifier**. The third field, `expectedBehavior`, is a written rubric on all 78
cases and **no code reads it**. So the Navigator's *answer* — the thing that can
state a wrong deadline to a frightened parent — has no automated check at all.

**Build on what exists.** `Citation.tsx` **is already shipped** with two
consumers (`OneThingCard`, `ArticleScreen`) and degrades correctly — *"a citation
with no registry entry renders as plain text — never a dead tap."* The UI half is
done. `contentSources.ts` holds the registry. The 78 rubrics are already written.

**What to build.**
- Pass KB articles as `document` content blocks with **citations enabled**, so
  the response carries the cited span and an exact character range in the source.
  The model then cannot cite what the document does not say. Feed that span into
  the `Citation.tsx` that already exists.
- **The answer gate**: extract every statute-shaped token from an answer and fail
  if it is absent from `CONTENT_SOURCES` — a regex and a set lookup, and nearly
  free once the above ships. Plus an LLM judge over the 78 existing rubrics.
  Run it **report-only for two weeks** to learn the real baseline before it blocks.
- **A re-verification job** so `verifiedOn` dates stop decaying, with a test that
  fails when any entry goes stale. This is the correct answer to Sage's live-lookup
  advantage — freshness in the *verification job*, never in the answer path.

**Honest costs.** Citations are incompatible with structured output formats, so
the chat path uses citations and the JSON paths use structured outputs. The
classifier prompt is duplicated between `src/lib/ai.ts` and the regression
script; fix that in the same PR or the suite tests a stale prompt.

**You'll know it worked when:** the answer gate has a published pass rate, and a
statute cannot reach a parent without a registry entry behind it.

---

## 3 · The Binder

**The thesis.** Waypoint has a hearing-grade evidence packet and no portrait of
the child. Families need both, and only one of them is something they'll show
someone.

**The gap, measured.** No binder surface exists — no `binder.ts`, no Binder
screen. What exists is `requestDossier.ts`: a chronological,
provenance-tiered, SHA-256-fingerprinted evidence packet whose own header reads
*"FREE for every family: the export IS the leverage."* That is exactly right for
a fair hearing and **hostile at a first meeting with a new OT.**

Meanwhile the person-centred prompts are already written — *"What is this person
great at? What do people who love them say about them?"* — inside
`src/screens/staff/PCPBuilderScreen.tsx`, **pointed at facilitators and
unreachable by families.**

**Why it matters.** This is Undivided's strongest idea (Vision · Strengths, Loves
and Hobbies · Supporting My Child), and Waypoint already owns the raw material.
It is also the artifact a parent shows to *other parents* — the only organic
growth surface in the product.

**Build on what exists.** `requestDossier.ts` (the export pipeline pattern),
`PCPBuilderScreen.tsx` (the prompts, verbatim), `toolsCatalog.ts:208` (a door
already titled with the child's name, already holding Documents / IEPHub /
HealthRecords / Providers — the Binder in embryo).

**What to build.**
- `children.vision`, `children.strengths`, `children.supports` (migration).
- A **one-page "all about me"** for meetings and provider intakes, and a full
  sectioned binder — both off the existing export pipeline, **kept separate from
  the request dossier**: the provenance machinery is right for a hearing officer
  and wrong for a first appointment.
- Offer it from the triage deadline rung: *"Print Teddy's one-pager for Thursday."*
- Attach the lever. `sdpJourney.ts:166` already states, cited to *codes 024 + 099
  · July 2024 DDS guidance*, that the Regional Center pays **up to $1,000** for a
  person-centred-planning facilitator. Undivided's binder cannot say this.

**Honest costs.** Two traps, both already identified. **Do not** write to
`sdp_cases.pcp_draft` — `pcp_completed_at` unlocks a code-024 invoice line, and a
family self-completing there creates a billable line with no facilitator time
behind it. And **fix `entitlements.ts:105`**, which currently lists *'Document
binder + export'* under Premium and would gate a family's portrait of their own
child. Resolve the `providers` / `family_contacts` duplication first or the
printed Care Team lists the service coordinator twice.

**You'll know it worked when:** a family prints a one-pager before a meeting they
did not tell Waypoint about.

---

## 4 · The Learn engine

**The thesis.** It is the only asset in the product that keeps working when
nobody is building, and the payer-funded model's CAC ≈ 0 assumption depends
entirely on it.

**Status.** This is **initiative 004**, plan written, *awaiting owner go*. I am
not re-proposing it; I am arguing it should get the go.

**The gap.** `learnLibrary.ts` holds 5 paths and 4 articles against Undivided's
art-directed editorial feed. That race, run head-on, is one editor-year minimum
and a funded team wins by default — which is why the scoped version matters:
**~40 articles, each *derived* from a module that already exists** (an
`escalationLadder` rung, a `processMap` stage, a `resourceStack` layer, a
registry claim), each carrying a citation and a reviewed-on date, each ending in
an action the app performs.

**Why now.** Two of the three competitor studies land on the same point from
opposite directions: Undivided's library is bought with payroll, and Special
Needs Navigator's authority is a decade of published writing. **Neither is
purchasable. A derived, cited, California-only library is** — because Waypoint
already owns the modules it derives from.

**Cost lever.** Generate the set through the **Batch API at half the standard
cost**; nothing family-facing is waiting on it. This is the clearest batch
workload in the product.

**Honest costs.** `Home-Rebuild-Plan.md` phase 8 as originally written —
"dozens, then hundreds of articles" — is the single most dangerous line in the
roadmap for a solo owner. The ~40-derived scope is the version to approve.
Marketing-site coordination: `waypoint-site/` has its own content gates and a
`content-review` label that never auto-merges.

**You'll know it worked when:** organic search brings a family to the eligibility
screener without a dollar of paid acquisition.

---

## 5 · The Outcomes Readout

**The thesis.** Waypoint collects outcome data today and cannot show it to the
people who pay. That is the difference between a vendor and a preferred vendor.

**The gap, measured.** Baselines exist — `BaselineKind: 'baseline' | '6mo' |
'12mo'`, `BaselineScreen.tsx`, baseline columns in the schema. And
`evidenceReport.ts` renders a full readout — but read its header: *"the data
section of the **go/no-go memo**."* It is built for the **owner's own decision**:
funnel conversion, hours per family, computed verdicts against kill-criteria.
Searching for a payer-facing or QIP-shaped export returns **nothing**.

**Why it matters most for the business.** The payer review named this precisely:
the durable moats are *"the provenance-dated California knowledge layer, the
outcomes dataset, and RC relationships / QIP standing."* Two of those three run
through this feature. It is also the stated aim of the STTR application and the
strongest asset in a Regional Center conversation — *"a vendor whose every billed
hour traces to a signed, goal-linked, countersigned record."*

**Build on what exists.** `evidenceReport.ts` (the rendering pattern and the
n-carrying discipline — *"every number carries its n"*), the baseline instruments,
`service_events`, the consent model in migration 036.

**What to build.**
- A **payer-facing** readout, separate from the internal scorecard: cohort
  outcomes at baseline / 6mo / 12mo, service utilisation, and time-to-resolution
  on tracked requests — aggregated, consented, and never a named child.
- **The equity cut**, which is the one a Regional Center's QIP actually needs:
  outcomes by language and by catchment. The August review cited a 4.5× service
  gap; being the first vendor who can *measure* it is a real position.
- An export in a format an RC will accept, which per `ROADMAP.md` is
  *demand-driven and awaits RCEB pilot feedback* — so build the data layer now
  and the format after one real conversation.

**Honest costs.** This one **leaves the desk**, so it is the hardest gate in
`CLAUDE.md`: research consent, instrument licensing, de-identification, and a
HIPAA posture the August review flagged as entirely absent from the backlog
(BAAs with Supabase and Anthropic, retention policy, breach process). Do not
publish a single outcome number before that is settled. Budget 2–3 weeks of
non-feature work.

**You'll know it worked when:** one Regional Center asks for the report a second
time.

---

## 6 · Deliberately not on this list

- **Multi-child** — already shipped (`ChildPicker.tsx`).
- **The tappable citation UI** — already shipped (`Citation.tsx`, two consumers).
- **The draft flow** — shipped end to end (9a–9e).
- **On-device deadline reminders** — shipped (initiative 003 Lane A).
- **A community forum** — `FLAGS.community: false` is a payroll decision, and the
  evidence (Cochrane 2021: all seven outcomes null; Understood.org shut theirs)
  has not changed.
- **Multi-state** — the national scope of both competitors is the tax they pay.
  Now true twice over.
- **A "talk to a real expert" button** — killed once for Undivided; the same
  answer for Sage, who can offer it only because the expert is him.
- **Live benefit figures in the answer path** — looks like parity, is a downgrade.
  Freshness belongs in the re-verification job (feature 2).

---

## 7 · Sequencing

**Before any of it — the operational unblock.** Apply the pending migrations, run
the RLS verification, create the Stripe links, submit the 099 packet, and give
Lane B its deploy. Days of work; everything below is worth less until it is done.

**Quarter 1**

1. **Grounded answers (2)** first, and not because it is the most exciting. It is
   the safety net, it is cheap, and every feature after it multiplies the amount
   of cited content in the product. Shipping features 1 and 4 *before* the answer
   gate means scaling the surface area of a risk you cannot currently measure.
2. **The Adult Transition (1)** — the big one, and the schema migration it needs
   is best batched with the Binder's.
3. **The Binder (3)** — shares the migration window; independently shippable.

**Quarter 2**

4. **The Learn engine (4)** — after feature 2, so every derived article is
   generated against an enforced citation gate rather than a hoped-for one. This
   ordering is the whole argument for putting 2 first.
5. **The Outcomes Readout (5)** — gated on the HIPAA/consent work, which should
   start in parallel in Q1 since it is not engineering time.

**One risk worth naming.** Every item here is `[owner]`-gated — family-facing,
schema-touching, or leaving the desk. The auto-ship rule does not apply to any of
it, and the draft-flow standing grant does not extend to it. **This roadmap moves
at the speed of owner review**, and the honest plan is to expect that, not to be
surprised by it.

---

## 8 · Confidence

**Verified in the working tree today:** that `Citation.tsx`, `ChildPicker.tsx`,
the draft flow and on-device reminders are shipped; that no binder, no
age-keyed journey, no age-18 clock and no payer-facing outcomes export exist;
that `evidenceReport.ts` is an internal go/no-go artifact; that
`prompt-regression.mjs` grades only category and tone and never reads
`expectedBehavior`; that `request_type` is a CHECK constraint; that
`entitlements.ts:105` gates the binder export; the initiative registry statuses.

**From prior adopted analyses in this repo:** the Undivided and payer-funded
findings cited above, including the $1,000 facilitator lever, the
`sdp_cases.pcp_draft` billing trap, and the eight unregistered statutes.

**Estimated, not measured:** every size in weeks, and the ranking itself. The
ranking is a judgment about impact per unit of risk for a solo owner running a
payer-funded model — a different funding position would reorder it, most
obviously by moving the Learn engine up.

**Not known:** whether an RC will accept any particular outcomes format (awaits
the RCEB pilot), and what the answer gate's real baseline pass rate is — which is
exactly why feature 2 ships report-only first.
