# 008 — Build plan: the Chabot Hub, prototype to product

**Date:** 2026-09-13 · **Status:** proposed — awaiting owner go
**Supersedes:** — · **Superseded-by:** —

This is the build plan for taking the Chabot Hub from a single-file,
in-memory Claude Artifact prototype to a real, live, Firebase-backed product
a pilot group of Chabot families can actually use — and a PTA volunteer can
run for five years without touching code.

It complements `hub-plan.md`, which stays the record of *why* every feature
decision was made (the tone contract, the moderation model, the
Firebase-vs-Supabase call). This document does not re-derive those decisions;
it sequences the work of making them real, and it exists specifically to
answer one question this initiative hasn't had a single place to answer
before: **when we build this for real, is anything already promised at risk
of getting dropped?** Section 2 below is that check.

## 1. Scope — read this before anything else

This plan is **the single-school Chabot pilot only.** `intent.md`'s guardrail
— "building a mini-Waypoint instead of a paper flyer" — already got crossed
once, deliberately, for the hub itself; this plan does not cross it again.
Explicitly out of scope:

- **The multi-school "hub-and-spoke" vision.** The owner raised this and then
  said "let's revisit it later" — this plan treats that as still later. Every
  design choice below (single Firestore project, a hardcoded `Community` id
  implicit throughout the schema, no tenant/school-switcher UI) assumes one
  school. Multi-tenancy is a distinct, larger initiative if the pilot works.
- **The Google Docs integration tiers** (Tier 2/3, real Drive/Docs OAuth) —
  parked by the owner ("let's park the Google doc integration idea... I'll
  come back to it"). The buildable alternative already shipped (a live
  shared worksheet via the artifact's own realtime layer) is not part of
  this plan either; it was a comparison demo, not a committed feature.
- **AI search staying live.** It is built and tested but dormant (see
  `hub-plan.md` § AI search). Enabling it is an independent owner call, not
  gated by anything in this plan, and not assumed on.

## 2. Requirements traceability

Everything already committed to, across `intent.md`, `recommendations.md`,
and `hub-plan.md`, checked against what the real build must preserve. Nothing
here is new; the point of this table is that a phased rebuild has a specific
failure mode — quietly losing a requirement that only existed in chat or in
an earlier document — and this closes it.

| Requirement | Source | Status in prototype | Real-build obligation |
|---|---|---|---|
| Collaborative-first tone; asks not demands; status not blame | `intent.md` "Locked"; `CLAUDE.md` escalation rule | Encoded in copy + AI prompt, tested | Carry unchanged into every new screen; no exception for admin-only UI |
| Legal claims carry citations + "not legal advice" framing | `intent.md` "Locked" | Day 0/15/60 schedule cites Cal. Ed. Code | Any new legal content added later follows the same rule |
| Two content formats, two destinations (tip→Discussions, lesson→Wisdom) | `hub-plan.md` | Built, tested (51 checks in `hub-search.test.mjs`) | Firestore schema keeps `type` on the same `posts` collection; UI unchanged |
| Open posting, flag-only moderation, no approval queue | `hub-plan.md`, owner stated twice | Built structurally (no `pending` state exists) | Security rules must not introduce an approval gate by accident |
| Three-role model: parent / mod / admin | `hub-plan.md` | **Client-side only** — `currentUser` is one devtools line from "admin" | **This is the actual point of Phase 3.** Security rules enforce it server-side |
| Member-editable Contacts & Directory (not admin-gated) | Owner: "make contacts editable by Members; directory same" | Built, tested (`hub-admin.test.mjs`) | Rules: any authenticated user may write `contacts`/`directory` |
| Admin-only Manage Team, last-admin guard | `hub-plan.md` | Built client-side; guard is a JS `if`, not enforced | Phase 3: a Cloud Function enforces the guard, not just the UI |
| Admin-only Page Builder, tiny safe markdown | `hub-plan.md` | Built, tested (`hub-pages.test.mjs`, 35 checks) | `pages` collection; rules restrict writes to `team` members with role `admin` |
| Auth: any signed-in account, no allowlist | Owner decision, `hub-plan.md` | Not built (no auth exists yet) | Phase 1 |
| Guides public / parent content members-only | Owner decision, `hub-plan.md` | Not built (everything is one page today) | Phase 1 (two-tier split) |
| No inactivity-pausing backend | `hub-plan.md` (the reason Firebase over Supabase) | N/A | Use classic Firebase **Hosting**, not App Hosting — see § 5 risk register |
| Global search across posts/lessons/pages | `hub-plan.md` | Built, tested (`hub-search.test.mjs`) | Client-side keyword search over Firestore-fetched data; unchanged approach |
| Fact-check every contact/phone/meeting time before real families see it | `recommendations.md` "Facts to re-verify"; `intent.md` "Done when" | Every value is `[Fill in]` or placeholder today | **Phase 0**, blocking — see below |
| Nothing family-facing auto-ships | `intent.md` "Done when"; `CLAUDE.md` "Where auto-ship stops" | N/A (no PRs shipped from this repo yet touch production) | Every PR below runs `/adversary`, posts the memo, waits for the owner |
| Multi-school template potential | `intent.md` "The shape" | N/A | Explicitly deferred — § 1 |

## 3. Architecture (decided already; referenced, not repeated)

Firebase Auth + Firestore + **classic Firebase Hosting**. Full reasoning,
the Supabase comparison, and the rejected Apps Script option are in
`hub-plan.md` § "Decided: authentication and backend." The one addition
this plan makes: **use classic Hosting, specifically, not Firebase App
Hosting** — a newer, separate product with a documented trial-period-then-
archive-then-delete mechanic for unpaid usage. Classic Hosting (static file
serving) carries no such mechanic in its own pricing docs. This is a
refinement, not a reversal of the Firebase decision.

Collections (unchanged from the architecture already specified):
`profiles`, `posts` (+ `comments` subcollection), `votes`, `contacts`,
`directory`, `team`, `pages`. The existing ~2,700-line UI in
`hub/chabot-hub.html` is kept; each in-memory array becomes a collection
listener. `renderPosts()` / `renderContacts()` / `renderDirectory()` /
`renderTeam()` / `renderCustomPages()` keep their names and shapes — they
just read from `onSnapshot` instead of a JS array.

## 4. Phased build plan

Every phase ships something a real person can use. Every PR in every phase
is family-facing, tone-bearing, or legal-framing by this initiative's own
"Done when" bar, so every PR runs `/adversary`, posts the memo, and **waits
for the owner** — the draft-flow auto-merge grant in `CLAUDE.md` does not
cover this initiative.

### Phase 0 — Decisions & content readiness (blocking, no code)

Nothing below can start until these are answered:

1. **Who owns the Firebase/Google account** that holds this for five years —
   a person-decision, not a technical one (`hub-plan.md`).
2. **Re-verify every placeholder** against a live source before it reaches
   Firestore as seed data: Chabot staff contacts, OUSD department lines, the
   CAC meeting time/location, the Education Code citations
   (`recommendations.md`'s exact list). Placeholder data in a prototype is a
   demo; placeholder data in a real signed-in app is a family calling a
   wrong number.
3. **Google Group relationship** — does the hub replace it, sit alongside
   it, or feed it? (Still open; `hub-plan.md`'s speculative "Group as
   membership list" idea is retracted — it would need a paid Workspace
   domain — so this is a fresh decision, not a resolved one.)
4. **Email-link sign-in alongside Google?** For parents without a Google
   account (`hub-plan.md` "Still needs the owner").

### Phase 1 — Foundation

Firebase project created (Hosting + Auth + Firestore, Spark tier); the
two-tier page split (public reference guides, indexable; members-only
Discussions/Wisdom/Directory/Contacts, `noindex`); Google + email-link sign-in
wired to a `profiles` collection written on first sign-in.

*Ships:* a real URL, a real sign-in, the reference guides live for anyone —
including a parent who never joins — which keeps the flyer's QR code useful.

### Phase 2 — Community data goes real

`posts` + `comments` + `votes` on Firestore with realtime listeners,
replacing the in-memory array for this slice. Security rules: authenticated
read; create requires `author_uid == request.auth.uid`; author-only
edit/delete.

*Ships:* real-time discussions and Wisdom, persisted, shared across every
viewer — the actual gap named throughout `hub-plan.md` ("state lives in a
JS array... nothing shared between viewers") is closed for this slice.

### Phase 3 — Admin data goes real, and the role model becomes real

`contacts` / `directory` / `team` / `pages` on Firestore. Security rules
replace the client-side `currentUser` check entirely:

- `contacts`, `directory` writable by any authenticated user (Member-level,
  per the owner's explicit instruction)
- `team` writable only by existing `admin`-role members
- Moderation actions (clear flag, hide, remove) gated to `team` members with
  role `mod` or `admin`
- A Cloud Function enforces the last-admin guard server-side — today it is
  a JS `if` a determined user could bypass

*Ships:* the actual sustainability promise this whole framework was built
for — Contacts/Directory/Team/Pages are real, shared, and permission-checked
by a server, not by whether someone opened devtools.

### Phase 4 — Hardening & pilot

Firestore security-rules unit tests (`@firebase/rules-unit-testing`) —
concretely: assert an unauthenticated read of every members-only collection
returns empty, that a member cannot forge another member's `author_uid`,
that a non-team member cannot clear a flag, that removing the last admin
fails. App Check wired in. A one-page PTA-admin handoff runbook written
(how to add an admin, how to review a flag, who to call if Firebase itself
has a problem). Pilot: a small real group of Chabot families onboarded.

*Ships:* the thing this plan is actually for — real families, safely.

## 5. Testing strategy

The 276 existing browser checks across 5 suites (`hub-functional`,
`hub-search`, `hub-mobile`, `hub-admin`, `hub-pages` — see
`hub/qa/README.md`) are **kept**, not replaced: they're re-pointed at pages
served against the Firebase emulator suite instead of the static prototype,
so every interaction behavior already verified this session stays verified.
A new rules-unit-test suite is *added* for what browser tests structurally
cannot check — server-side permission enforcement.

**A gap this initiative has not raised anywhere until now:** no accessibility
audit exists for this hub. For a product whose whole purpose is serving
families of kids with disabilities — some of whom are themselves disabled,
or navigating this with their own access needs — shipping a real, signed-in
product without one is a values inconsistency worth naming plainly rather
than quietly absorbing into "QA passed." Proposed: an automated pass
(axe-core against the emulator-backed build) plus one manual screen-reader
pass through the core flows (sign in, post a question, read Wisdom) before
Phase 4's pilot opens, not after.

## 6. Risk register

| Risk | Status | Mitigation |
|---|---|---|
| Firebase Spark tier pauses idle projects like Supabase does | **Genuinely unverified** — `firebase.google.com` is blocked by this session's egress proxy; secondary sources say no, but that is not confirmed from Firebase's own docs | Confirm directly against Firebase's pricing/FAQ docs before Phase 1 starts, from an environment that can reach them |
| Firebase **App Hosting**'s trial-then-archive-then-delete mechanic | Confirmed via WebSearch this session | Use classic Hosting, not App Hosting — specified in § 3 |
| Ownership/handoff — who holds the account for 5 years | Open | Phase 0, item 1 |
| Content accuracy — every contact is a placeholder | Confirmed, not yet fixed | Phase 0, item 2, blocking |
| Moderation doesn't scale past 2–3 volunteer mods | Not yet a problem at pilot size | Revisit if flag volume grows; not a pilot-blocking risk |
| Scope creep back toward multi-school or Google Docs OAuth | Named explicitly in § 1 | This document is the guardrail; re-read `intent.md` before adding scope |
| **No privacy notice exists**, and this app will hold real accounts and real stories about children | **Newly surfaced by this plan — not previously discussed anywhere in this initiative** | Owner decision needed: does a lightweight privacy notice ship with Phase 1? Flagged, not decided here |
| No accessibility audit | **Newly surfaced by this plan** | § 5, before Phase 4's pilot |

## 7. Proposed success metrics (owner's to confirm or change)

Proposed only — nothing here has been agreed to, and these numbers are mine,
not the owner's:

- ≥10 of the Google Group's families sign in during the first month
- At least one post per week in Discussions or Wisdom, sustained for a month
- No flagged-content item sits unreviewed more than 72 hours
- Zero incidents of a parent unable to reach a real contact via the
  Contacts page (the concrete test of Phase 0's fact-check)

## 8. Owner decisions needed — consolidated

Gathered from this document and `hub-plan.md`, so there is one list instead
of several:

1. Who owns the Firebase/Google account for the next five years (§ 4, Phase 0)
2. Google Group's relationship to the hub going forward (§ 4, Phase 0)
3. Email-link sign-in alongside Google — yes or no (§ 4, Phase 0)
4. Does a privacy notice ship with Phase 1, given real accounts and real
   stories about children (§ 6, newly surfaced)
5. Target pilot size and timeline, if different from § 7's proposed metrics
6. Confirmation to proceed with Phase 0 at all

Until these are answered, no code in this plan should be written — this
document is the plan the owner asked for, not a go-ahead to start Phase 0.
