# Open Items — Forward Plan (post-overhaul)

**Date:** Aug 30, 2026 · **Status:** draft
**Supersedes:** nothing.
**Sits under:** `Home-Rebuild-Plan.md` (phases 7–8), `Undivided-Comparison-Aug2026.md`
(the still-open gaps), and `initiatives/003-outbound-loop/` (Lane B).

*The status review this plan accompanies is published as an artifact for the
owner. This is the durable record of what remains and the order to take it in.
Written before building, per the plan-first rule.*

---

## Where we are (Aug 30, 2026)

The overhaul's two winning bets are shipped and merged: the Home rebuild
(phases 1–6, PRs #119→#134) and the draft flow (9a–9e, #126→#133). Phase 7
Lane A (on-device reminders) shipped (#135–#136); Lane B's token foundation is
merged (#137) and migrations 049 + 050 are applied. The guides-in-Learn
cleanup is in review (#139).

What remains falls into four tracks, roughly independent, ordered by what
unblocks what.

---

## Track A — finish the outbound loop (server half)

**Owner-gated** (Edge Functions have no CI; schema is applied). Continues
`initiatives/003-outbound-loop/`.

- **7B-3 · `push-send` Edge Function.** Reads `push_tokens`, sends an Expo push
  for an incoming reply, stamps `communications.notified_at` so it fires
  exactly once. Deno; excluded from CI — treat as unverified, `/adversary`
  before merge.
- **7B-4 · the server poll.** `pg_cron` + `pg_net` sweep: server-side Gmail
  sync for connected families, then `push-send` for each unnotified incoming
  reply. The partial index `communications_unnotified_incoming_idx` (migration
  050) is what it scans.
- **Blocker to actually deliver:** `expo.extra.eas.projectId` must be added to
  `app.json`. Until then device registration is a safe no-op and nothing can be
  delivered.

**Done when:** a reply that arrives while the app is closed produces exactly one
"you have a reply" push, and turning notifications off in-app stops it (token
deletion = consent withdrawal).

---

## Track B — the human-navigator door

**New user-facing flow → plan + mockups + owner go before building.** This plan
is that plan; mockups follow on request.

### What exists today

One human-navigator surface: **`FundedOfferScreen.tsx`** ("Work with a
Navigator, free to you," deep-link `free-help`). It's the old "scheduling
page" — a slot-picker (`introSlots.ts`, stub times) whose **Book** button
creates a "Waypoint Navigator intro call" appointment via
`useAppointments.createAppointment`. **But it's gated**: reachable only from
`EligibilityResultScreen` when Self-Determination applies (`sdpAvailable`).
There is no direct door from Home, and the bottom-bar **"Navigator" tab is the
AI chat**, not a person.

### The MVP

1. **Surface.** A discoverable, ungated "Talk to a real navigator" entry on
   **Home** (sibling to the AI composer CTA in `HomeScreen.tsx`), reusing the
   `FundedOfferScreen` navigator-card copy so no new family-facing copy is
   written from scratch. Collaborative-first tone, trilingual with a
   locale-parity test.
2. **Capture.** One short ask (what's going on + best time/way to reach them) —
   not the SDP funnel.
3. **Persist + "push to you for now."** Mirror the existing appointment insert:
   a request row (a dedicated `navigator_requests` table, or reuse the
   appointment/action shape) via a Supabase-table hook exactly like
   `createAppointment`, RLS-scoped, best-effort. Fire a `trackFunnelStep`-style
   analytics event so it lands on the **owner scorecard** (`useBilling` /
   `useOwnerMetrics`) you already have. **No new infrastructure.**
4. **The real push (fast-follow).** To literally buzz the owner's phone, feed
   the request into the Lane B `push-send` function once Track A lands — the
   human-navigator request becomes the outbound loop's first owner-facing
   notification. Until then it's a scorecard row the owner sees on open.

### Open question for the owner

Keep it a single "request a call" (lightest), or preserve the slot-picker so
families self-schedule? For "push to you now," the request row is enough; the
slot-picker is a fast-follow.

### Why "for now"

A standing human-navigator service is a business-model commitment (Undivided's
is staffed). The MVP proves demand and routes it to the owner without staffing
anything — a request lands on the owner, who responds by hand. It does **not**
promise the family a scheduled human until the owner decides to staff it.

---

## Track C — the visual-system & empty-state pass

**Design phase → deliver as a design canvas first, then build surface by
surface.** Undivided-audit items 6, 7, 8, 16–19:

- **Empty states that teach** (item 6): first-run and zero-data surfaces
  orient the parent instead of sitting blank.
- **Person-centred framing** (16–19): the child first, then the systems.
- **A cohesive editorial pass** (7–8) on top of the existing `theme.ts`
  tokens — spacing, art direction, type — not a token rewrite.

Each shipped increment stays under the auto-ship stops (family-facing) →
`/adversary` + owner approval.

---

## Track D — phase 8, the Learn content engine

**Its own plan before a line of code.** Extra-large and content-heavy: article
library, editorial art, SEO. The audit's explicit advice is *do not race
content* — this is deliberately last. Depends on Track C's visual system for
how the content reads.

---

## Sequencing

Track A and Track B converge (B's request becomes A's first owner push), so
they pair naturally. Track C is independent design work that can run alongside.
Track D waits on C and on the owner's word that it's time.

| Track | Gate | Blocked by |
|---|---|---|
| A — outbound server half | owner (Edge Fn + schema) | `eas.projectId` in `app.json` |
| B — navigator door | owner go (new flow) | mockups (on request) |
| C — visual / empty states | owner per increment | design canvas first |
| D — phase 8 content | owner "when" | its own plan; Track C |
