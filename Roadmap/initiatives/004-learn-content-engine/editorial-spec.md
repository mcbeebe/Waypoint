# 004 — Editorial spec: writing for the busy caregiver

**Date:** 2026-08-31 · **Status:** adopted
**Supersedes:** — · **Superseded-by:** —

**Read `intent.md` and `plan.md` first.** This is the governance layer for every
Learn body — the rules an author (human or AI-drafting-then-reviewed) writes
against, and the rules a reviewer checks against before `reviewedOn` is stamped.
The owner's busy-caregiver content framework (Aug 2026), pinned here so it is a
spec, not a memory.

---

## Who is reading, and in what state

A parent opens Learn between other things — in a waiting room, after a bad call,
at 11pm when the child is finally asleep. They are tired, often frightened,
sometimes already blaming themselves. **Assume that reader, every time.** The
writing earns its place by lowering the load, never adding to it.

Three consequences drive the whole spec:

1. **Utility over prose.** The goal is not to be read; it is to be *used*. Every
   article carries something the parent **keeps and carries into the room** — a
   checklist to bring to the meeting, a script for the phone call. Prose sets it
   up; the tool is the payload. (Schema: `checklist` / `script` blocks in
   `learnLibrary.ts`.)
2. **One next step, and it is real.** Every article ends in an action the app can
   actually take — a letter it drafts, a tracker it opens, a screen that exists.
   An explainer that leaves a parent with nothing to do is where the old blog
   died (the module's own docstring says so).
3. **Never scold.** The reader is doing their best with what they had. Content
   states what to do next; it never implies they should have done it sooner.

---

## The journey, not the topic

Learn is organized by **where the parent is**, not by subject. A parent in
crisis and a parent just noticing something is off need different doors, even
for the same statute. Five stages (`LearnStage` in `learnLibrary.ts`):

| Stage | The parent's inner sentence | What they need from us |
|---|---|---|
| `noticing` | "Something isn't right." | Name it plainly; the first, lowest-stakes step. |
| `seeking_help` | "I need help — where do I start?" | The map, the request that starts the clock, what to bring. |
| `overwhelmed` | "There's too much and I'm drowning." | One thing. Permission to do only that. Nothing else on screen. |
| `advocating` | "They said no / it isn't working." | The escalation ladder, one rung at a time, with the letter. |
| `now_what` | "It's handled — what's next?" | The next layer, the renewal, the thing that unlocks next. |

Every hand-authored article names its stage; derived articles inherit one from
their source rung/stage/layer (8-0c). The Learn panel groups by stage so a
parent finds the door that matches their sentence.

---

## Voice

- **Collaborative-first, always.** The first step with any agency is friendly —
  *ask*, *request*, never *demand*. Tone firms up only rung by rung as asks go
  unanswered (collaborative → assertive → adversarial). This governs body copy,
  scripts, checklists, and CTAs alike. Pinned by the tone test in
  `learnLibrary.test.ts`.
- **Status of the answer, not blame of the actor.** "An answer on X is past due,"
  never "They failed you." The framing a parent reads first is the one they carry
  into the phone call; it starts neutral.
- **No guilt.** No "you should have," "if only you'd," "why didn't you." Pinned by
  the no-guilt test.
- **Plain language.** Agency words appear, then are explained in the parent's
  words. Second-person, short sentences, concrete nouns.
- **Trilingual by construction.** English, Spanish, Vietnamese are peers, not a
  translation afterthought. The `L()` picker and the locale-parity tests hold it.

---

## What every body must contain

1. **A `para` open** that names the situation in the parent's words.
2. **The mechanism** — the deadline, the right, the rule — in one or two `para`s
   or a `steps` block.
3. **A keepable `tool`** — a `checklist` (what to bring / write down) or a
   `script` (what to say). This is the utility-over-prose payload.
4. **A `callout`** that holds the tone rule for *this* situation (ask first,
   this is a step not a no, keep it friendly and factual).
5. **A real end-action** (`target`) the app performs.

An **email is never a `tool`.** A letter or message the parent sends is the
article's *end-action*: it opens the real draft-and-send flow (the Letters
composer, backed by connected Gmail), so nothing family-facing is copy-pasted
that Waypoint could have drafted and sent properly. Checklists and scripts are
copyable because the parent *keeps* them; letters route through the pipeline
because Waypoint *sends* them. (Owner decision, Aug 2026.)

---

## Provenance

- **Every legal claim carries a citation** covered by `data/contentSources.ts`.
  The provenance test fails the build on an orphan claim; citations never
  translate.
- **No "Reviewed" seal until a human reviewed it.** An AI-drafted body carries no
  `reviewedOn` — the seal stays hidden rather than showing a date no one earned.
  The owner stamps it as part of approving the content (8-2 pipeline). The test
  in `learnLibrary.test.ts` currently asserts *all* bodies are unstamped; delete
  that assertion the moment 8-2 stamps the first real date.

---

## The reviewer's checklist (before `reviewedOn`)

Bring this to every content review:

- [ ] Every legal claim is in the registry, and the citation is right.
- [ ] The body ends in a real, reachable action; if it drafts a letter, it uses
      the Letters flow, not a copy block.
- [ ] There is a keepable tool (checklist or script) the parent can carry.
- [ ] The stage matches where such a parent actually is.
- [ ] Collaborative-first: no "demand", no blame of an actor, no guilt.
- [ ] The Spanish and Vietnamese say the same thing, at the same reading level —
      not a machine gloss.
- [ ] Read it as a tired parent at 11pm. Does it lower the load or add to it?

Only then is `reviewedOn` honest.
