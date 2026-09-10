# Chabot Family Hub — plan of record

**Date:** 2026-09-10 · **Status:** adopted (prototype) · **Supersedes:** —
· **Superseded-by:** —

A clickable, single-file prototype of a Chabot-only community hub: reference
guides plus a place parents post to each other. Lives at
`hub/chabot-hub.html`; QA at `hub/qa/`.

## The scope decision — read this first

`intent.md` names the danger to design against: **"Building a mini-Waypoint
instead of a paper flyer."** This hub crosses that line. It is a 14-page app
with search, an AI layer, and a moderation view.

That was not drift. The owner walked it there deliberately, over four asks:

1. *"How might you build out a local forum… would a Google group be best?"*
2. *"Think hyperlocal. We do want this: a forum or discussion board… It may
   need to be a purpose-built app."*
3. *"I'm leaning towards Option 2; or another way that is more truly
   interactive and collaborative. I don't want to be a bottleneck."*
4. *"Build the updated hub with real-time discussions, moderation dashboard."*

So the guardrail in `intent.md` still holds for the **paper** tools (Navigator,
flyer, Google Group kit) — those stay shippable-in-days by one parent. The hub
is a separate, deliberately larger bet. Anyone reading `intent.md` alone would
otherwise conclude this work went off the rails; it did not.

What the guardrail still buys us: nothing here is wired to a backend yet, so
the cost of abandoning the hub is one HTML file.

## Two content formats, two destinations

The single most-repeated point of confusion in the design sessions was where a
contribution goes. It is now settled and visible in the nav:

| Format | Destination | Shape |
| --- | --- | --- |
| **Tip** — short, a sentence or two | **Discussions** | Threaded, quick back-and-forth |
| **Lesson** — long-form, a story | **Wisdom** | A card with a headline, an attribution line, and an unbounded body |

Both are kept; neither replaces the other. The nav labels them `SHORT` and
`LONG-FORM`, and the two pages cross-link. The Wisdom page's eight seed
reflections are data, not markup, so a parent's lesson renders
indistinguishably alongside them.

Earlier builds sent a lesson through the tip form, which truncated its title to
60 characters and filed it in the discussion feed. That is the failure this
split exists to prevent.

## Moderation: open posting, flag-only

Owner decision, explicit and twice-stated: *"I don't want to moderate and have
to approve posts."*

- A post is **live the moment it is submitted**. There is no pending state, no
  approval queue, no badge.
- Any parent can **flag** a post that breaks the guidelines.
- The mod dashboard shows **flagged content only** — never a review queue of
  everything. A mod either clears the flag (post stays) or hides the post.
- Mods are the owner plus 2–3 trusted parents.

The prototype enforces this structurally: there is no `pending` status in the
data model at all, and a test asserts the string "pending review" appears
nowhere in the rendered app.

## AI search — built, currently dormant

Global search runs a local keyword pass over every post, lesson, reply and
reference page, renders results immediately, then asks Claude for a summary
plus suggested next steps that streams in above them. Results never block on
the AI.

**It is switched off in the published artifact.** The `sample` capability
cannot be declared on a publicly-shared artifact, and this one is shared by
link. Turning it on requires the owner to disable public sharing, then a
republish declaring `capabilities: {sample: {}}`. The page already degrades
correctly: `claude.use('sample')` resolving `null` hides the panel and leaves
keyword search working.

Also worth weighing before enabling: **each search spends the viewer's own
Claude usage**, and each viewer is asked to consent on first use.

### The tone contract is in the prompt, and tested

The AI writes family-facing advice, so the escalation rule from `CLAUDE.md` is
encoded in the prompt and pinned by assertions in `hub-search.test.mjs`:

- "ask" or "request" — never "demand", "insist", "fight"
- status, not blame: *"An answer on the evaluation is past due"*, never *"the
  school ignored you"*
- firmer steps named only as later stages, after an ask has gone unanswered
- not a doctor or a lawyer; parent experience is experience, not prescription

Community posts reach the model inside `<contributions>` tags, explicitly
labelled as data rather than instructions, so a parent cannot post text that
redirects the AI.

## What is real and what is not

**Real:** every screen, the posting flows, threading, replies, helpful votes,
flagging, the mod view, search ranking, the AI call path, responsive layout.

**Not real:** persistence. State lives in a JS array, so a refresh resets it
and nothing is shared between viewers. This is the gap between the prototype
and something 10–20 Chabot parents could actually use.

## Open decisions

1. **Public sharing vs AI search** — owner's call (see above).
2. **Backend.** The artifact `db` capability would give real cross-viewer
   persistence without standing up Supabase. Not started; not yet asked for.
3. **Real content.** Provider names, phone numbers and the Chabot/OUSD contact
   table are placeholders or `[Fill in]`. Nothing here has been fact-checked
   against a primary source, and it must be before any parent sees it.
4. **Relationship to the Google Group.** Both exist; whether the hub replaces
   the group, or the group stays the email-native front door, is undecided.

## QA

180 automated browser checks across three suites — see `hub/qa/README.md`.
Bugs these caught, all of which had shipped in an earlier build:

- a duplicate element id meant every reply was read from the wrong field
- user content was interpolated unescaped (a posted `<script>` executed)
- the sidebar title was navy on navy — invisible since the first version
- on a phone the sidebar was `display: none`, so there was **no navigation at
  all**; a "no horizontal scroll" test had been passing precisely because of it
- searching twice quickly let the cancelled first call blank the second's panel
