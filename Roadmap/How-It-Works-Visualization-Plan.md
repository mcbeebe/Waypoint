# "How Waypoint Works" — visualization options (plan)

**Date:** 2026-09-12
**Status:** adopted (built; pending owner review before merge)
**Supersedes:** —
**Superseded-by:** —

## What this is (and isn't)

A new product-tour screen that explains **the app itself** — the loop a
family moves through every time they use Waypoint, a bit of how to get the
most out of it, and a bit of what's happening behind the scenes.

This is **not** the existing "How the System Works" process map
(`Roadmap/Process-Map-Depth-Plan.md`, `Roadmap/mockups/process-map-depth/`),
which explains the *Regional Center / IPP process* an outside agency runs.
The two are easy to conflate by name — this one is about Waypoint, that one
is about the RC. If both ship, they need clearly different labels in the UI
("How Waypoint works" vs. "How the Regional Center process works").

This is a new user-facing flow, so per the standing rule it stops at
plan + mockups here — no screen has been wired into the app, and nothing
ships until the owner picks a direction.

## The content, held constant across all three options

So the three are a fair comparison, all three tell the same story with the
same four loop stages, drawn from what the app actually does today:

1. **Tell** — the family describes their situation in plain language (or
   Waypoint already has it from onboarding: diagnosis, age, RC/IEP/insurance
   status).
2. **Plan** — Waypoint returns one next right step, checked against
   California disability law (Lanterman Act, IDEA, Medi-Cal, SSI) — not a
   full checklist.
3. **Act** — a ready-to-go, friendly ask. Waypoint drafts it; the family
   reviews and sends.
4. **Track** — Waypoint runs the clock on the request (e.g. a 60-day IPP
   timeline). No answer in time, and the next ask firms up a notch —
   collaborative → assertive → adversarial, per the standing escalation-tone
   rule.

...then loops back to Tell/Plan once something changes (a reply, a missed
deadline, a new stage unlocking).

**"How best to use it"** (3 tips, same across options): start at Home, not
the menu; type your situation in plain English, no legal terms needed;
review before you send — you're always in control of what goes out.

**"Under the hood"** (kept light, per the ask — "a bit"): matches your
situation to CA law with the citation attached; starts and tracks the legal
clock on every ask; escalates tone only step-by-step if an agency goes
quiet.

Nothing here is invented — it's the real onboarding data model, the real
`planGenerator`/law-matching behavior, the real draft-flow (ask →
letter → send), and the real escalation-tone rule already in this repo.

## The three options

Built to the current warm brand system (`waypoint-app/src/lib/theme.ts`'s
`brand`/`brandType` tokens — paper/pine/sage/ink, Newsreader + Hanken
Grotesk) and the app's real pin-and-route Brandmark, at
`Roadmap/mockups/how-it-works/` (`OptionA.dc.html`, `OptionB.dc.html`,
`OptionC.dc.html`; `Main.dc.html` holds the leading candidate, Option C).

- **A · The Loop** — a literal circular cycle diagram: four stage nodes
  ringed around a center hub ("keeps going"), with a detail list below
  spelling out each stage. *Motivation:* the most direct answer to "show me
  the loop" — the shape does the explaining before anyone reads a word.
  *Tradeoff:* the tallest of the three (a full ring plus a full list), and
  the most work to build as a real component if it needs to be interactive
  later.
- **B · Under the Hood** — a cutaway: a light "what you do" strip (Tell →
  Plan → Act → Track) sits over a dark "what Waypoint is doing" engine
  panel, each step in the top row lined up with its mechanism below.
  *Motivation:* the most literal answer to "what's happening under the
  hood" — the mechanism is the centerpiece, not an afterthought.
  *Tradeoff:* says less about the loop itself (the repeat is one line, not a
  diagram) and leads with the AI's work over the family's.
- **C · The Route — recommended starting point** — a winding route with
  four numbered waypoint pins (the app's own teardrop-and-route mark, never
  a compass — see `Brandmark.astro`), looping back to pin 1. *Motivation:*
  the only option that **is** the brand ("a GPS for the disability services
  journey") rather than illustrating it generically; the lightest
  under-the-hood treatment keeps it from reading as technical.
  *Tradeoff:* the map metaphor reads best the first time — a returning user
  may want A's or B's denser recap faster than re-walking a route.

Why C is the lead: it is the only one of the three that ties directly to
Waypoint's own visual identity rather than a generic diagram convention, and
it fits the brand's stated design intent best. But nothing is decided —
open the canvas and pick whichever reads best; A and B are equally
buildable.

## Where this would live (once one is picked — not decided yet)

Two natural entry points, not mutually exclusive: (1) a one-time screen
shown right after onboarding completes, before Home; and/or (2) a
persistent entry point (e.g. from Settings/Help, or a "?" near the Ask bar)
so it's revisitable. Exact navigation wiring is a build-phase decision after
the owner picks a direction — out of scope for this plan.

## Update — Sep 12: A and B refined as interactive prototypes

Owner is leaning toward **A** and **B** over C. Both were refined to:

- Full alignment pass against the design canvas's own guidelines: fixed an
  off-palette color slip in Option B's engine-panel labels (was inventing a
  hex not in the warm brand set — now `rgba(255,255,255,0.6)`, matching
  Option A), confirmed every tap target is >= 44px, kept icons as inline
  stroke SVG throughout (no emoji/dingbats).
- **Working interaction**, not just a static picture of one:
  - **Option A** — tap any of the 4 ring nodes to select that stage (it
    fills pine; the detail card below swaps to that stage's text and icon);
    tap the center hub to advance to the *next* stage in sequence, which is
    the diagram actually demonstrating the loop turning rather than just
    depicting it; tap "UNDER THE HOOD" to collapse/expand that panel.
  - **Option B** — tap a top "what you do" chip *or* its matching engine
    row underneath; either one highlights both, which is the cutaway's
    whole argument (this visible step causes that hidden mechanism) made
    provable by touch instead of only implied by position; tap the dashed
    seam to collapse/expand the engine panel.

C stays as a static reference on the canvas (not deleted — kept per the
"keep option identities stable" convention); Main.dc.html still mirrors it
until a final pick is made.

## Update — Sep 12: Option B built as a real screen

Owner picked **Option B**. Built as `waypoint-app/src/screens/main/
HowWaypointWorksScreen.tsx` — the same tap-to-highlight cutaway from the
canvas (a step chip or its engine row selects both; the dashed seam
collapses/expands the panel), trilingual (en/es/vi), Ionicons instead of
the canvas's inline SVG (this app carries no `react-native-svg` — see
`Brandmark.tsx`).

**Naming collision caught by the linking test**: the route was first named
`HowItWorks`, which collided with `ProcessMap`'s existing `how-it-works` URL
(the *Regional Center/school* process map — a different screen entirely).
Renamed to `HowWaypointWorks` / `how-waypoint-works` throughout, so the two
"how it works" screens stay unambiguous at the code and URL level, not just
in conversation.

**Entry point**: Settings → Profile & Settings → Display & Accessibility,
right below the existing "App tour" row (a *different*, older, unrelated
tutorial — see the "not decided" flag below).

**Gates, all green**: `tsc --noEmit`, `eslint`, `vitest` (all four projects,
1292 + 178 tests, including a new 6-case UI test proving the bidirectional
tap-link and the collapse toggle actually work, not just render), and both
web export gates (`expo export -p web --dev` and the production
`build:web`).

**Still open**: the pre-existing `OnboardingTutorial.tsx` swipe-through (a
different "how Waypoint works" — Navigator/Action Plan/Calendar/Letters,
replayable from that same Settings screen) has not been touched or
reconciled with this new screen. Two "how it works" entry points now exist
in Settings; whether they coexist, merge, or one retires is an owner call,
not made here.

Per the standing rule for anything a family sees, this stops short of
auto-merge: no PR was opened (session policy), and a `/adversary` pass ran
before this was presented for owner review — memo below.

## Adversary review — Sep 12

A fresh subagent (no context from this session's own reasoning) reviewed
commit `06d10a9` cold, against the actual source it depends on, not just the
diff.

**What the change does.** Adds a new, self-contained "How Waypoint Works"
screen and registers it end-to-end in the navigation graph; adds one entry
point to it from Profile & Settings. Purely additive — no existing screen's
behavior, route, or data model changes.

**Where it focused.** The one `ProfileScreen.tsx` navigate call (the only
wire connecting the new screen to the app); the three hand-written en/es/vi
translation blocks; the four-file route registration (`routeGraph.ts` /
`MainTabs.tsx` / `linking.ts` / `types/navigation.ts`); the two "how it
works" rows now sitting stacked in Settings.

**Findings, and what happened to each:**

1. **Fixed.** `ProfileScreen.tsx`'s new `(navigation as any).navigate(
   'HowWaypointWorks')` was untyped, defeating the exact compile-time
   guarantee `routeGraph.ts` exists to provide (its own header comment: a
   hand-copied version of this guard once "certified nine dead taps").
   Three sibling screens (`InsuranceScreen.tsx`, `LettersScreen.tsx`,
   `RequestCaseScreen.tsx`) already use the typed form —
   `useNavigation<NativeStackNavigationProp<HomeStackParamList>>()` — so the
   safer pattern was available and already established, not blocked by any
   real typing limitation. Switched to it; `tsc --noEmit` now fails if
   `HowWaypointWorks` is ever renamed or removed without updating this call
   site, closing the silent-dead-tap failure mode the finding described.
2. **Accepted, mitigated by (1) rather than a new test.** No test asserts
   that tapping "View" in Settings actually calls `navigate(
   'HowWaypointWorks')` — `ProfileScreen.tsx` has no test file at all, and
   one would need to mock `useFamily`/`useChildren`/`useDiagnoses`/
   `usePremiumGuard`/`useTextScale`/`useMemories`/Google auth/Supabase to
   render it. The typed-navigation fix in (1) gives the same protection a
   render test would target here (a renamed/removed route fails the build)
   at far lower cost; a full `ProfileScreen.test.tsx` is a reasonable
   follow-up but is its own, separably-scoped effort, not part of this
   change.
3. **Accepted risk, already flagged to the owner.** Two "how it works"
   entries (the pre-existing App tour, and this new screen) now sit stacked
   in Settings with no reconciliation. Confirmed real by the reviewer, and
   already named as the open owner question above — not resolved here on
   purpose.
4. **Disputed.** Flagged as an "unexplained deviation" from `ActionsScreen`'s
   `TouchableOpacity` precedent (cited in the commit message for its
   `aria-pressed` pattern, not its component choice). `Pressable` is in fact
   the established choice in this screen's closer siblings —
   `EscalationLadderScreen.tsx` and `ResourceStackScreen.tsx`, the two most
   directly comparable "explainer" screens — so no change made.

No runtime-breaking defect was found beyond (1). The reviewer independently
verified — by reading the actual dependency, not by inference — the
same-stack navigation resolution, the URL non-collision, every theme token
referenced, the i18n default-locale assumption, the "no react-native-svg" /
"RN-web 0.19 drops accessibilityState→aria" claims from the commit message,
and that no test-query name collides across the new screen's accessible
labels. (It could not itself run `tsc`/`vitest` — its worktree's
`node_modules` inherited the same stray personal-machine symlink noted
above — so gate results were re-run by this session after fix (1), fresh,
and are green: `tsc --noEmit`, `eslint`, and vitest `logic`+`ui`
1292/1292.)

**Assumptions and design decisions**, restated from the reviewer's read: Option B
over A was a deliberate, owner-approved pick among three mocked directions,
not a default — a reviewer could still prefer A's literal loop diagram for a
family under stress, since B leads with the AI's mechanism over the
family's own actions (a tradeoff the plan itself names above). Locale
content is hand-duplicated per screen in a `Strings` record rather than
centralized, matching how sibling screens (`EscalationLadderScreen.tsx`,
`ResourceStackScreen.tsx`) already do it — consistent, not novel; translation
*correctness* (as opposed to structural completeness, which the `Strings`
type enforces) is unverified, same as its siblings.

## Next step

Owner reviews this memo and the screen itself, then decides: ship as-is,
request changes, or resolve the open `OnboardingTutorial` question above.
