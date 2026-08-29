# Home Tools Redesign — plan (Aug 28 2026)

## The problem (owner feedback + heuristics)

The Tools area is 26 identical monochrome tiles in a flat 4-column
grid. That fails busy caregivers on four counts:

1. **No hierarchy.** "Letters" (used weekly, starts legal clocks) has
   the same visual weight as "Blog." Nothing tells a stressed parent
   what matters.
2. **No grouping.** Related things are scattered: Letters row 3, Paper
   Trail row 3, Requests row 2 — one workflow, three places.
3. **Labels without meaning.** "Your Result," "Insights," "Email
   Check" — a bare noun under an icon assumes the user already knows
   the app. First-time users don't.
4. **26 choices at once.** Hick's law: decision time grows with
   options. The apps caregivers already trust (banking, health
   portals) show 5–8 primary destinations and tuck the rest behind
   "More" or search.

Industry patterns worth copying: group by **job to be done**, not by
feature name; **list rows with one-line descriptions** beat icon grids
for comprehension (the description teaches the app); **progressive
disclosure** ("Everything else →") instead of showing all 26;
44px+ touch targets throughout.

## The grouping (shared by all concepts)

Every current destination keeps a home:

- **Take action** — Letters · Requests & Clocks · Paper Trail (Email
  Check folds in here)
- **Understand the system** — How it works (RC + School) · Journey ·
  Your Result · Agencies
- **Money & benefits** — RC Funding · Expenses · Tax Report · Insurance
- **Child's records** — Documents · IEP Hub · Health Records ·
  Providers · Services
- **Everything else** (collapsed) — Resources · Blog · Insights ·
  Family · Premium · Provider Portal

## Three concepts (mockups on the canvas)

- **A · "Front pocket"** — grouped list rows: tinted icon + label +
  one-line plain-language description + chevron, sections in
  priority order, search on top, "Everything else" collapsed.
  *Motivation:* highest comprehension — the descriptions teach the app;
  fastest to scan under stress. *Tradeoff:* longer page (scrolling),
  fewer items visible per screen than a grid. **Recommended.**
- **B · "Five doors"** — the grid survives but collapsed to five big
  hub cards, each with a color identity and a contents line; each
  opens a hub screen. *Motivation:* calmest Home, five choices total.
  *Tradeoff:* every tool is one extra tap away; hub screens are new
  surfaces to build.
- **C · "Shortcuts first"** — 4 personalized shortcut tiles (learned
  from usage; sensible defaults before that), then compact grouped
  rows without descriptions, "More tools" collapsed. *Motivation:*
  frequent actions one tap away, still compact. *Tradeoff:* compact
  rows lose the teaching descriptions; personalization needs a
  usage-tracking increment.

## Build plan (after the pick)

1. Pure module `toolsCatalog.ts`: every destination with group, label,
   description, icon, route (trilingual) — one source for Home and
   the "Everything else" screen; tests for route validity.
2. HomeScreen: replace the Tools grid with the chosen concept
   (Ionicons stay — the mockups' SVG icons map 1:1).
3. "Everything else" list screen (A-Z, searchable) so nothing is lost.
4. If C: a lightweight tap-count in AsyncStorage picks the shortcut
   four; defaults = Letters, Requests, Paper Trail, IEP Hub.

Quick Actions row (Ask AI · Actions · Calendar · Profile) duplicates
the tab bar exactly — all three concepts drop it and give the space
back to content. Flag if you want it kept.

## Outcome (Aug 29 2026)

Owner picked the A+B hybrid; a 10-persona × 3-concept simulated stress
test (see the Caregiver Stress Test artifact) confirmed the structure
and rewrote the vocabulary. **Built as hybrid v2**: `lib/toolsCatalog.ts`
(single source: actions, doors, routes, search, age-aware placeholder,
date/direction badges) + `components/ToolsArea.tsx` (search + privacy
line, always-open action rows with live badges and a zero-request
starter state, four accordion doors with remembered state), replacing
the 26-tile grid and the Quick Actions row on Home. Owner decisions:
"Paper Trail" survives as English flavor text only; stage-awareness
shipped at the 80% level (empty states, age-aware search examples,
transition named on the Understand door); multi-child handled by the
existing Home ChildPicker (records door follows the selection).

**Scoped follow-up increment (owner-approved): unify request + thread
+ clock.** One request = its letter, its replies, its statutory clock,
one status view, exportable as a single dated PDF ("will this hold up
when they lie to me?"). The data model already links these
(family_requests.communication_id, gmail_thread_id); badge the job,
not the channel. Plan + mockups first, per the standing rule.
