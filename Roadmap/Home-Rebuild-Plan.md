# Home Rebuild — Development Plan

**Date:** Aug 29, 2026 · **Status:** Phases 1–5 shipped, phases 6–8 planned
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
| 3 | Plan tab (Actions + Calendar, List/Month) | L | ✅ merged tab, month grid | — |
| 4 | Tools tab + pins + suggestion | M | ✅ Tools becomes a place | migration 048 |
| 5 | Ask absorbs Learn + tab bar reshape | M | ✅ four tabs, account menu | 3, 4 |
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

**Then three independent adversarial reviews found ~40 verified defects, and
the fixes changed the phase further:**

5. **The `deadlines` table had no rung.** The deleted banner was its only
   prominent Home surface, and the ladder's clock rungs read `family_requests`
   only — so an IEP triennial ten days out, or an authorization expiring in
   twelve, appeared nowhere. The ladder now reads deadlines too.
6. **A failed Gmail sync was stamped as a successful check.**
   `autoSyncReplies` returned `ran: true` whether or not the sync worked, so
   the sensor line could say "Gmail checked 3:42 PM" over an unread inbox. The
   outcome is now typed (`checked | failed | throttled | not_connected`), and
   a check that is not from today prints its date.
7. **The calm state promised a notification the app cannot send.** "Waypoint
   will tell you if Sep 19 passes" is phase 7's promise, and phase 7 has not
   shipped. It now says the date is being counted and to check back — the
   mitigation this plan's own Risks section named. **Restore the promise in
   the same PR that makes it keepable.**
8. **Absence of data read as absence of obligations.** `firstRun` and "done
   today" both treated an empty array as fact, so an offline morning produced
   "Nothing needs you today." The ladder now takes `loading` and `dataFailed`
   and has a fifth calm kind, `unavailable`, that says a connection problem is
   not an all-clear.
9. **Deferrals and answers were not child-scoped**, so setting Maya's question
   aside suppressed Leo's, and answering Maya's could tell Leo's Home the day
   was done. Ids carry the child.
10. **A draft never expired.** Rung 0 outranks a passed statutory deadline, so
    one abandoned letter parked itself above an overdue IPP request every
    morning. Drafts lead only for 48 hours — and now carry their saved text,
    which the old action dropped, sending "finish the letter you started" to
    an empty editor.
11. **"I'm not sure" re-rendered the identical card forever.** It now sets the
    question aside with its return date.
12. **Every failed deferral write was swallowed** — the card advanced, Later
    showed a return date, and nothing was persisted anywhere. Writes now fall
    back to the device, revert if even that fails, and tell the family.
13. Migration 048's policies moved to 027's broadened `family_members OR
    owner` form, RLS is enabled after the policies exist, and the comment no
    longer claims a co-parent visibility the app cannot yet resolve.
14. Copy and accessibility: the calm headline was rendering as a 10.5px
    eyebrow; the citation and "Not today" were hidden behind a persisted
    collapse; touch targets were below the repo's own 44pt minimum; line
    heights did not scale with text size; "Deadlines stored on your phone" was
    false; "one verified thing you may be owed" claimed verification that does
    not happen; the crisis rung now reads "not set up yet" instead of "—".

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

**Shipped, with four departures from this section:**

1. **The list needed a sixth section.** The prototype stopped at "this week",
   so a deadline three weeks out existed only in the month grid — a dated
   obligation the list dropped. `Coming up` holds everything past day seven,
   and `Past due` leads. Pinned by a test that counts every entry exactly once.
2. **The Actions tab is hidden from the bar now, not at phase 5.** Two tabs
   answering the same question is the confusion the merge exists to end. The
   Tracker stack stays registered and Plan links to the full list, so nothing
   is unreachable; phase 5 only reshapes what remains.
3. **The full calendar stays behind Plan**, reached from a link on it. Adding,
   editing, recurrence, reminders and Google sync all live in `CalendarScreen`
   and none of it survives a merge that replaces the screen.
4. **The tax report had no entry point at all** — the route was registered and
   nothing in the app navigated to it, so the tool promising "Expenses & tax
   report" delivered half. Expenses now links to it.

**The adversarial review then found nine verified defects, all fixed:**

- **Recurring appointments were never expanded.** `useAppointments` loads
  recurring base rows regardless of the window on purpose, and expansion is
  the consumer's job — so every weekly therapy session showed as its first
  occurrence, in *Past due*, forever, while the real sessions appeared
  nowhere and Month opened on the month of the first one. Plan expands
  occurrences the way `CalendarScreen` does.
- **Days were sorted by their localized time string**, so 1:00 PM came before
  9:00 AM. Entries carry an ISO sort key now.
- **Every "waiting on an agency" row was a dead tap** — `RequestCase` is
  registered in the Home stack, and a `navigate` from Plan (in the Calendar
  stack) is silently unhandled in production. The section carrying the legal
  citations was the one that did nothing.
- **Plan claimed "nothing to do" while loading and after a failed fetch** —
  the same defect Home was fixed for one phase earlier, in the tab whose
  whole job is to be the list of record.
- **A deferred item was listed twice**, under both its own section and
  *Later*; items whose return day had passed stayed listed; and an item with
  no stored title vanished entirely. `planView` now dedupes, expires and
  falls back.
- **The month grid said "Nothing on this day"** for months outside the
  four-month fetch window. The window follows the cursor.
- **Deep links broke:** `/expenses` and `/tax-report` still pointed into the
  Calendar stack, and Plan had no URL at all.
- **`CalendarMain` rendered two stacked headers.**
- **Deadline push reminders stopped being re-armed** — `CalendarScreen`'s
  mount was the app's only caller, and Plan took its place as the tab's
  landing screen.

Plus: statutory due dates shifted a day on any UTC+ device
(`requestClocks.ts` sliced a UTC ISO string from a local-midnight date — a
citation on a date the statute never gave); the provenance line failed WCAG
AA contrast at 2.6:1; pull-to-refresh missed two sections; nothing refetched
on focus; the "Waypoint only" scope preference was ignored; Spanish read
"vence el Hoy" and the Vietnamese signpost named a Tools door that does not
exist under that name.

**Known and not fixed here:** three tests fail under a UTC+ timezone
(`homeTriage`, `recurrence`, `transitionHours`) — they fail on `main` too, so
they are pre-existing TZ-fragility rather than this change, but they hint at
real bugs east of Greenwich and deserve their own pass.

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

**Shipped, with three departures:**

1. **Tools is a screen, not yet a tab** — the bar reshape stays in phase 5, so
   `ToolsScreen` is registered on the Home stack and reached from Home. That
   also reduced Home early: the inline tools drawer is gone, replaced by the
   family's pinned tiles and one "All tools ›" door.
2. **The cap refuses rather than evicts.** Six pins is the limit and the
   seventh is declined out loud with a message. On a list shared by two
   parents, a pin that silently pushes out another parent's tile is the
   quiet-overwrite problem in a different costume.
3. **An empty pin list is a real choice.** The three action tools seed a
   family that has never chosen; once `tool_pins` exists on the row — even as
   `[]` — it is honoured, so "I removed them all" is not undone on next load.

Pins degrade the same way deferrals do: without migration 048 they fall back
to the device and the screen says "saved on this device only".

**The adversarial review then found eighteen defects. The worst inverted the
whole feature:**

- **The defaults were unreachable, so every family would have opened an empty
  toolbox.** `tool_pins jsonb not null default '[]'` puts an array in every
  row, so "is this an array?" can never mean "has this family chosen?" — and
  because Home had just shed its inline tools drawer, Letters, Requests and
  Sent & Received went two taps away for *everyone*. The app now writes an
  object (`{"v":1,"pins":[…]}`) and reads a bare array as the untouched
  default. Pinned by tests.
- **Concurrent writes clobbered the whole column** — a second device with a
  stale list would evict the other parent's tiles, which is the eviction the
  cap exists to prevent, arriving through the back door. Every write now
  re-reads the row and applies the change to what is actually there.
- **A pin that saved nowhere reported success.** The AsyncStorage fallback
  swallowed its own failure, so a tile could appear, survive the session and
  vanish at next launch. Failures now revert and say so.
- **Device pins were discarded** the first time the column answered, with no
  hoist — the machinery `useDeferrals` already had.
- **The copy promised "for everyone in your family"** in three languages, a
  scope the app cannot deliver: `useFamily` still resolves families by
  `user_id`. It now promises what is true — every device you sign in on.
- **A screen-reader user could not pin anything.** The star was nested inside
  an accessible row, so it was unreachable — and the star is the only way to
  pin. It is a sibling now.
- **Two hook instances clobbered each other's open counts**, which made the
  three-open suggestion threshold effectively unreachable for anyone who used
  both screens.
- Plus: the delete control was 24pt against the repo's own 44pt minimum; edit
  mode became unexitable when the last tile was removed; the full grid showed
  the empty-grid hint; unpinning immediately re-suggested the same tool; the
  cap refusal was announced where nobody would see it; Tools ignored the
  selected child and fetched diagnoses it never used; and the one door to the
  whole toolbox was hardcoded English.

The gap the review named as highest-leverage stands: `useToolPins` and
`useDeferrals` have no hook-level tests, and most of the above lived there.

### Phase 5 — Ask absorbs Learn, and the bar becomes four tabs

**New:** `lib/learnLibrary.ts` (guides, articles, glossary — trilingual, with
the provenance registry pattern), the library rendered under the Ask
composer, four popular-question chips, `components/AccountMenu.tsx` for the
avatar → Settings dropdown.

**Changed:** `MainTabs.tsx` → Home · Ask · Tools · Plan; Profile leaves the
bar; `navigation.ts` gains the new routes.

**Done when:** the four tabs are live, the avatar menu reaches everything
Profile held, and searching "what is an IPP" finds the library.

**Shipped, with two structural decisions this section did not anticipate:**

1. **Both stacks register the same destinations.** A `navigate` bubbles to
   parents, never to a sibling stack — which is exactly how the Plan tab
   shipped a section of dead taps in phase 3. So `destinationScreens()` is
   registered in the Home stack *and* the Tools stack, and a tool row resolves
   inside whichever tab it was tapped from, each keeping its own back history.
   `navRegistry.test.ts` now guards every tool, Learn and account-menu target
   against the registered set, so that defect cannot ship twice.
2. **The library answers before the AI does.** Typing into Ask searches
   `learnLibrary` first; if the library already knows, it says so and the AI
   stays one tap away. Stop words are stripped, so "what is an IPP" finds the
   glossary rather than everything containing "is".

Ask's five hardcoded suggestion chips are gone, replaced by the library's four
popular questions — trilingual, and each one tested to actually find something.

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

0. **Two the reviews raised that only you can settle:**
   - **Tone.** The overdue rung says "They missed the deadline on X" and "They
     owe you an answer". That is description to the parent, not language for
     the agency — but it is the frame the parent carries into the call. Keep,
     or soften to a neutral "past due"?
   - **Legal.** `requestClocks.ts` anchors the W&I §4646.5(b) 30-day IPP clock
     to the parent's request date. If the statute runs from completion of the
     assessment instead, every overdue card attaches a correct citation to an
     incorrectly anchored claim. Worth a lawyer's eye before launch.
1. **Ship phase 7 before launch, or soften the calm copy?** Softened for now
   (see change 7 above). The decision that remains is whether push ships
   before launch or the softened copy is the launch copy.
2. **Does the crisis class get an intake in this arc,** or stay scaffolded?
   The ladder has the slot; nothing feeds it yet.
3. **Telemetry:** are you comfortable with anonymous skip-rate and
   door-engagement events, so the ladder can be corrected with evidence?
