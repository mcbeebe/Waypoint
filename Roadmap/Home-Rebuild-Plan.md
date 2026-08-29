# Home Rebuild — Development Plan

**Date:** Aug 29, 2026 · **Status:** Phases 1–2 shipped, phases 3–8 planned
**Supersedes** the three-phase sketch at the end of `Home-Redesign-Concepts.md`,
which predates the four-tab decision, Tools/Plan, pinned tools, Learn, the
collapsible card and the month view.

## Where we actually are

- **Concept A ("The Next Right Thing") is chosen** — by six rounds of
  iteration, then confirmed. The prototype settled the information
  architecture: four tabs (Home · Ask · Tools · Plan), pinned tool tiles with
  a suggestion, Learn folded into Ask, Profile under the avatar as Settings,
  a collapsible One Thing card, and Plan carrying a real month calendar.
- **Phase 1 shipped** (PR #119): `lib/homeTriage.ts` + 27 tests — the ladder,
  the queue, deferrals, the four calm states, and the sensor line. **No screen
  consumes it yet**, so app behavior is unchanged.
- **Everything below is unbuilt.** `HomeScreen.tsx` is still 973 lines and
  still renders every surface the audit condemned.

## Rules that constrain every phase

1. **Each phase ships on its own, green.** `npx tsc --noEmit`, `npx vitest
   run`, `npx eslint . --ext .ts,.tsx --quiet` — then PR and merge. No phase
   depends on a later one to be correct.
2. **Pure logic first, screens second.** Every phase adds a tested module
   before the UI that uses it. Screens stay dumb; derivations stay testable.
3. **Trilingual gate.** Every new user-facing string ships en/es/vi with a
   `localeParity` structural test — same keys, same routes, same citations,
   different prose.
4. **Provenance discipline.** No claim without its evidence, citations on
   anything legal, and `WAYPOINT NOTICED` stays banned by test.
5. **Collaborative-first tone** in every new letter, CTA and stage string.
6. **Behind a flag until the set is coherent.** `FLAGS.newHome` (default
   **on** while you dogfood) so a demo can fall back in one commit.

---

## The phases

| # | Phase | Size | Ships | Depends on |
|---|---|---|---|---|
| 1 | Triage engine | M | ✅ merged (#119) | — |
| 2 | One Thing card + sensor + deferrals | L | ✅ merged — card replaces the duplicating cards | 1, migration 048 |
| 3 | Plan tab (Actions + Calendar, List/Month) | L | Merged tab, month grid | — |
| 4 | Tools tab + pins + suggestion | M | Tools becomes a place | migration 048 |
| 5 | Ask absorbs Learn + tab bar reshape | M | Four tabs, account menu | 3, 4 |
| 6 | Home reduction | M | Home = card + composer + status line | 2, 3, 4, 5 |
| 7 | The outbound loop (push) | L | "We'll tell you" becomes true | 1 |
| 8 | Learn content engine | XL | Article library + SEO | 5, own plan |

### Phase 2 — The One Thing card, the sensor line, the deferral loop

The phase where the ten audit findings die on screen.

**New:** `hooks/useTriage.ts` (assembles `TriageInput` from the hooks Home
already loads — requests, communications, children, appointments, drafts from
`communications` where `status='draft'`); `components/OneThingCard.tsx`
(kicker, title, why, citation chip, primary action, *Not today*, collapse,
speaker, and the "How Waypoint decides" ladder sheet);
`components/SensorLine.tsx`; `hooks/useDeferrals.ts`.

**Migration 048** — `home_deferrals` (family_id, item_id, returns_on,
created_by, created_at). Deferrals go to the database, not AsyncStorage,
because *Later with Undo* is a named feature and audit finding #10 was
silent shared snoozes: a co-parent must see what the other set aside.

**Deleted in the same PR** (they would duplicate the card): `ReplyCard`,
`InsightCard`, `StackInsightCard`, `GapPromptsCard`, and the deadline banner.

**Done when:** the card renders every ladder class with real data, "Not today"
persists and advances, the sheet shows live queue state, and the calm state
distinguishes its four kinds.

**Shipped, with four changes to what this section planned:**

1. **Migration 048 also carries `families.tool_pins`** (phase 4's column).
   Migrations are applied by hand; one manual run is better than two.
2. **`lib/homeCard.ts` was added** — the ladder sheet, the "done means done"
   rule, and the card copy, trilingual and tested (17 tests). Phase 2 needed a
   pure module of its own, per the rule that screens stay dumb.
3. **The benefit-stack insight was grafted onto the opportunity rung.**
   Deleting `StackInsightCard` would otherwise have dropped a shipped surface:
   `deriveStackInsight` now wins that rung when an unlock guide exists, exactly
   as the card used to win the slot — minus its `WAYPOINT NOTICED` eyebrow.
4. **A phase-1 bug died here.** The Regional Center question offered
   `rc_status: 'none'`, which the 012 check constraint rejects — the answer
   would have failed to save and the question returned forever. Answers are now
   typed to their columns and pinned by a test.

**Deferred out of phase 2, on purpose:**

- **The card has no speaker button.** `expo-speech` is not in the project and
  the registry's current version does not match this SDK line; the card is
  fully labelled for the screen reader instead. Revisit with the accessibility
  pass.
- **`lib/gapRules.ts` and `lib/snooze.ts` are now unreferenced** by app code
  (their consumers were the deleted cards). `gapRules` holds real domain
  knowledge about which profile gaps matter — **phase 6 should feed the
  question rung from it** rather than deleting it. `snooze.ts` is superseded by
  `home_deferrals` and can go with the phase 6 deletion.
- **Home still duplicates today's appointments** — the `today` rung and
  `TodayCard` can both show the same 9am IEP meeting. Phase 6 deletes
  `TodayCard`; until then the duplication stands.

### Phase 3 — Plan tab (Actions + Calendar merged)

**New:** `lib/planView.ts` — pure merge of actions, appointments, deadlines,
waiting-on-agency clocks and set-aside items into one list, plus the month
grid model (day cells, appointment vs deadline markers, the month holding the
next item). `screens/main/PlanScreen.tsx` with the List/Month switch.

**Moved:** `Expenses` and `TaxReport` out of the Calendar tab and under
Tools → Money, where `toolsCatalog` already lists them.

**Done when:** every dated and undated obligation appears exactly once, the
month grid marks today and distinguishes deadline from appointment, and
Plan opens on the month holding the next item.

### Phase 4 — Tools tab, pinned tiles, the suggestion

**New:** `lib/toolPins.ts` — pin list, cap of 6, defaults (the three action
tools), and `suggestPin()` (opened ≥3 times, never pinned, never declined).
`screens/main/ToolsScreen.tsx` promoting the shipped `ToolsArea` content to a
full screen with the tile grid above it.

**Storage:** pins are **one shared set per family** (your call) → a
`tool_pins jsonb` column on `families` in migration 048. Open counts stay in
AsyncStorage — a per-device heuristic, not family state.

**Done when:** pinning from any row lands a tile, Edit removes, the cap holds
with an honest message, and the suggestion appears once and never returns
after either answer.

### Phase 5 — Ask absorbs Learn, and the bar becomes four tabs

**New:** `lib/learnLibrary.ts` (guides, articles, glossary — trilingual, with
the provenance registry pattern), the library rendered under the Ask
composer, four popular-question chips, `components/AccountMenu.tsx` for the
avatar → Settings dropdown.

**Changed:** `MainTabs.tsx` → Home · Ask · Tools · Plan; Profile leaves the
bar; `navigation.ts` gains the new routes.

**Done when:** the four tabs are live, the avatar menu reaches everything
Profile held, and searching "what is an IPP" finds the library.

### Phase 6 — Home reduction

Now that Tools and Plan are tabs, Home sheds everything else: `TodayCard` and
the scope pills, `CheckInCard`, `OnboardingTutorial`, `ProfileCompletionCard`,
the financial snapshot, the progress ring, the empathy message, the RC card
(absorbed into Contacts and call-class actions), and the `ToolsArea`
accordion. Home ends as **greeting → card → composer → one status line**.

**Done when:** `HomeScreen.tsx` is under ~250 lines and every deleted surface
is reachable from its new home (verified against the nothing-is-lost
inventory in `Home-Redesign-Concepts.md`).

### Phase 7 — The outbound loop

The calm state promises "Waypoint will tell you if Sep 12 passes." **Until
this ships, that promise is not true** — see Risks.

**New:** `expo-notifications` + push tokens, a `notification_policy` reusing
the *same ladder* (a push fires only when the #1 item changes class to
time-critical, or a reply arrives), an edge function on a `pg_cron` schedule,
and quiet hours.

### Phase 8 — Learn content engine

Article schema, the Entity Navigation Matrix (49 KB articles) as seed corpus,
provenance per claim with a last-reviewed date, every article ending in an
action that exists, public web routes for SEO. **Needs its own short plan
before any of it is built** — sizing and the authoring workflow are open.

---

## Decisions this plan takes

| Decision | Choice | Why |
|---|---|---|
| Deferral storage | Database (migration 048) | Later/Undo is a feature; audit #10 was silent shared snoozes |
| Pin storage | `families.tool_pins` jsonb, one shared set | Your call: one set per family, not per child |
| Tool open counts | AsyncStorage, per device | A suggestion heuristic, not family state |
| Feature flag | `FLAGS.newHome`, default on | Cheap fallback for a demo; no users to protect yet |
| Phase order | Tabs before Home reduction | Deleting Home surfaces before their new homes exist would strand them |

## Risks

- **The push loop is load-bearing.** The calm state's "we'll tell you"
  is a promise the product cannot keep until phase 7. *Mitigation:* ship
  phase 7 before launch, or soften the copy to "check back — Waypoint has
  been watching" until it lands. Decide at phase 6.
- **Phase 6 is a big deletion** in a 973-line screen. *Mitigation:* the
  adversarial review workflow over the diff, as used on the Request Case File
  (27 findings, all fixed).
- **Plan is thin for new families** — two lines and a step on day one, which
  is exactly when they are deciding whether to keep the app. *Mitigation:*
  watch it in the pilot; if it stays thin, Plan absorbs the case files.
- **Discovery drops one tap** by design. *Mitigation:* skip-rate telemetry on
  deferrals and door-engagement metrics, so a wrong #1 pick is measurable.
- **Trilingual debt compounds.** Every phase adds strings; the locale-parity
  test is the only thing keeping es/vi from silently rotting.

## Open questions

1. **Ship phase 7 before launch, or soften the calm copy?** (Decide at phase 6.)
2. **Does the crisis class get an intake in this arc,** or stay scaffolded?
   The ladder has the slot; nothing feeds it yet.
3. **Telemetry:** are you comfortable with anonymous skip-rate and
   door-engagement events, so the ladder can be corrected with evidence?
