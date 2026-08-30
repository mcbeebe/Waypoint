# The Draft Flow — Plan & Proposals

**Date:** Aug 30, 2026 · **Status:** adopted — shipped end to end (9a–9d + reply loop core; 9e `analyzeEmail` seeding optional/unbuilt)
**Supersedes:** nothing. **Extends:** `Home-Rebuild-Plan.md` §"Phase 9 — The draft flow"
(the four decisions recorded there on Aug 29 are inputs here, not up for re-litigation).
**Sits inside:** `Undivided-Comparison-Aug2026.md` — this draft flow is that
roadmap's item 10, and its §6 "the one thing" is the flagship demo. Numbers
below were reconciled against that verified audit (e.g. the template count, and
the honest fact that the tappable citation UI is unbuilt).

---

## 1. The brief, in the owner's words

> Beat Undivided in user experience and prompting and empowering users; serving
> them up with not only the Next One Thing, but **drafting that email, verbiage
> and guiding them**. Undivided has lots of content but their website and app are
> overwhelming with info. Ours is focused, accessible and action oriented.

That sentence contains the whole strategy, and it names the gap precisely.
Waypoint already tells a parent **what** the next thing is. It does not yet hand
them **the words**. Today the One Thing card's CTA drops the parent into
`LettersScreen` — a template picker, a tone picker, and a 96px-tall empty box
asking them to describe what they need. That is a *second* decision, in a
different vocabulary, at the exact moment their courage is highest.

The draft flow closes that gap: **the card's CTA produces a draft, not a form.**

## 2. Where we do and don't compete

Undivided's product is **a human Navigator plus a very large library**. Their app
is the front door to both. That is a real thing we cannot and should not match:
we are not selling a person.

What we *can* beat is the distance between "I know I should do something" and
"I sent it." Their library makes you read. Our job is to make you send.

| | Undivided | Waypoint (proposed) |
|---|---|---|
| The unit of value | An article, a Navigator call | **A sent letter with a clock on it** |
| Where a session ends | You've read something | You've done something, and we're watching for the answer |
| What you must decide | Which of ~400 articles applies | Nothing — the card already decided |
| Who writes the words | You, after reading | Us (skeleton + law) and AI (your specifics) |
| Effort to first action | Search → read → interpret → compose | **Tap → answer 2–3 questions → review → send** |

We do not out-content them. We out-*finish* them.

## 3. The four decisions already locked (Aug 29)

| Decision | Choice | What it rules out |
|---|---|---|
| What happens on tap | Two or three questions, then the draft | A blank editor; also a twenty-step playbook |
| Where the wording comes from | Curated template + AI fills the specifics | AI writing law; a generic form letter |
| Which "exact words" surface first | How to answer what they just sent you | Phone scripts, meeting talking points |
| Order | Phase 6 first, then the draft flow | Building on a Home that is still a dashboard |

## 4. The proposal: two taps to a sent letter

```
   HOME                QUESTIONS              DRAFT                SENT
   ┌────────┐  tap    ┌────────┐  answer    ┌────────┐  send    ┌────────┐
   │ One    │ ──────▶ │ 2–3 Qs │ ─────────▶ │ ready  │ ───────▶ │ clock  │
   │ Thing  │         │ chips  │            │ to go  │          │ starts │
   └────────┘         └────────┘            └────────┘          └────────┘
       ▲                                                             │
       └──────────────── the answer arrives ◀────────────────────────┘
                        "they replied — here's your answer"
```

Four screens. Everything in them already exists as tested modules; what is
missing is the **assembly**.

### 4.1 What already exists (the honest inventory)

| Piece | Module | State |
|---|---|---|
| Which item is next, and why | `lib/homeTriage.ts` | shipped, 27 tests |
| 22 curated templates, 3 tones | `lib/lettersCatalog.ts` | shipped |
| AI fill + the prompt | `lib/letters.ts` → `ai-proxy` | shipped |
| Fill known blanks from the profile | `lib/draftBlanks.ts` | shipped |
| Which lever fits which request type | `lib/requestClocks.ts` `REQUEST_LEVERS` | shipped |
| The statutory clock a send starts | `lib/requestClocks.ts` `deadlineFor` | shipped |
| What to do after you send | `lib/sentNext.ts` | shipped |
| The paper trail and the case file | `lib/requestCase.ts`, migration 047 | shipped |
| Sending via Gmail | `lib/gmail.ts`, `gmail` Edge Function | shipped |
| The citation *registry* (authority, claim, `verifiedOn`) | `data/contentSources.ts`, `sourceForCitation()` | shipped — but **zero UI consumers** |
| **The 2–3 questions** | `lib/draftQuestions.ts` | **new** |
| **Card CTA → draft, skipping the picker** | — | **new wiring** |
| **The question sheet + draft screen** | — | **new UI** |
| **Guidance in the moment + a tappable `<Citation>`** | — | **new UI** |

Read that table the right way: the *logic* is nearly all built — one new pure
module (`draftQuestions.ts`) and everything downstream already exists and is
tested. What's genuinely new is the **presentation**: the question sheet, the
draft screen's in-the-moment guidance, and the tappable `<Citation>` — the
registry has been waiting for its first real consumer since depth phase 1
(`sourceForCitation()` has none outside its own tests today). Corrected from an
earlier "one new module" framing after the competitive audit checked it against
the code: it is one new *module*, but three new *surfaces*. Still affordable
right after phase 6 — because none of it is new domain logic — but it is a
build, not a re-label.

### 4.2 The questions (the only genuinely new logic)

New pure module `lib/draftQuestions.ts`:

```ts
export interface DraftQuestion {
  id: string;
  prompt: string;                 // trilingual via picker(locale)
  options: Array<{ value: string; label: string }>;  // chips, never a text box
  freeform?: { label: string; placeholder: string }; // optional escape hatch
}
export function questionsFor(item: TriageItem, profile: LetterProfile): DraftQuestion[];
export function answersToRequest(q: DraftQuestion[], a: Record<string,string>): string;
```

Rules the module is built to keep, and that its tests will pin:

1. **Never more than three.** `questionsFor` returns 0–3. A question whose
   answer is already in the family profile is *not asked* — it is asserted on
   the draft screen with a "change this" affordance.
2. **Chips, not prose.** Every question is answerable by tapping. The freeform
   box is an escape hatch, never the primary path — that is the failure mode
   we are leaving behind.
3. **Every answer changes the letter.** A question that does not alter the
   generated text is decoration and gets deleted. This is testable: generate
   with each answer, assert the drafts differ.
4. **Collaborative-first.** Question copy and every option label ask; none
   demand. The tone ladder is chosen by *stage*, not by the parent's mood —
   a first ask is `warm`, a follow-up past due is `professional`, a formal
   step is `strong`. The parent can override, and the override is one tap.
5. **Trilingual, with locale parity tests**, like every other string.

**Worked example** — the card says "An answer on the IPP review is past due":

> **Q1** What have you heard back so far? · *Nothing at all* · *They said they'd
> get back to me* · *They asked for something from me* · *They said no*
> **Q2** How do you want to sound? · *Friendly — first nudge* · *Firmer — it's
> been a while* · *Formal — I want this on the record*
> **Q3** Anything you want them to know? *(optional)*

Three taps. Then the draft.

### 4.3 The draft screen: guidance *in the moment*

This is where we beat the library. Undivided would have you read an article
about IPP timelines. We put the two sentences that matter *next to the
paragraph they explain*, while you're looking at your own letter.

- **The legal sentence is ours and is cited.** The paragraph carrying
  `W&I §4646.5(b)` is template text, not AI text, and it renders with the
  citation chip already used on the One Thing card.
- **AI-filled specifics are marked on first view.** A soft tint over the
  child's name, the dates, the service — with one line: "We filled these in
  from your records. Tap any of them to change it."
- **Remaining blanks are loud.** `analyzeBlanks` already finds them; they
  render as amber chips that scroll into view, and Send stays disabled while
  a required one is empty. (Today they are a passive amber card.)
- **"Why this wording?"** is one tap, and answers in two sentences with the
  citation — not a link to a 2,000-word guide.

### 4.4 Send: the clock, the trail, the file

Sending is the moment Waypoint's promise becomes checkable, so it must produce
three artifacts, all of which already have homes:

1. **A clock.** `deadlineFor()` turns the send into a dated expectation. The
   confirmation states it plainly and neutrally: "They have until Sep 29 to
   hold the meeting." Not "they must" — and, per the Aug 29 framing rule, when
   that date passes Home says *"An answer on the IPP review is past due,"* never
   *"They missed the deadline."*
2. **A paper trail entry.** `logCommunication` + `markCommunicationSent` —
   already wired in `LettersScreen`, and it survives the flow change.
3. **A case file.** `attachCommunicationToRequest` puts this send on the
   request's timeline so the reply, when it comes, lands on the same thread.

The confirmation screen shows all three in one glance and then gets out of the
way: **"Done. We'll watch for the answer."** One button: back to Home.

### 4.5 The reply loop — "here's your answer"

Locked as the first "exact words" surface. When a reply arrives (Gmail thread,
or the parent tells us), the card's kicker is `reply` and the CTA is
**"Draft your answer."** The same three-question flow runs, seeded differently:
the first question becomes *"What did they say?"* with options derived from
`analyzeEmail` — *they agreed · they need more from you · they said no · it's
unclear*. "They said no" routes to the `noa_request` template with its
appeal-rights paragraph. That single route is, on its own, worth the phase.

## 5. Open choices — where I need a decision

Three questions where either answer is defensible and the answer changes the
build. My recommendation is first in each.

**P1 · Where the questions live.**
**(a) A bottom sheet over Home (recommended).** The card stays visible behind
it, so the parent never loses the thing they tapped; dismissal returns them
exactly where they were; it is the cheapest to build and the easiest to
abandon mid-flow without feeling like they failed.
(b) A full screen with a step indicator — more room, more ceremony, and
"3 of 3" is genuinely motivating.
(c) Inline expansion of the card itself — fewest surfaces, but the card is
already the most constrained space we have.

**P2 · How the AI's contribution is marked.**
**(a) Tinted on first view, then plain (recommended)** — honest, non-nagging,
and it disappears once you've seen it.
(b) Never marked — cleanest letter, but we would be passing off machine text
as the family's own words without saying so, and that is the sort of thing we
have refused elsewhere.
(c) A persistent "ours / AI / yours" toggle — maximum transparency, but it
turns a letter into a diff view.

**P3 · What "Send" does when Gmail isn't connected.**
**(a) Copy + open the mail app, and log it as sent-by-you (recommended)** —
works for everyone on day one, and the paper trail still gets an entry, marked
`recalled` rather than `gmail` so provenance stays honest.
(b) Require connecting Gmail first — better evidence, worse conversion, and
it puts an OAuth screen between a parent and their courage.

**Two more I asked on Aug 29 and will assume unless told otherwise:**

- *A brand-new family with an empty account* — assume **they still get the
  questions**, because with no profile to draw on the questions are the only
  source of specifics. The flow degrades to "more blanks to fill," not to a
  worse letter.
- *AI unavailable or offline* — assume **the template-only draft still ships**,
  clearly labeled: "We couldn't reach our writing assistant, so this is the
  standard letter with your details filled in. Everything in it is accurate;
  it's just less specific to your situation." Refusing to produce anything
  would fail the parent at the moment they are ready to act.

## 6. Phasing

Phase 6 (Home reduction) ships first — decided Aug 29. Then:

| # | Ships | Size | Gate |
|---|---|---|---|
| 9a | `lib/draftQuestions.ts` + tests, no UI | S | ✅ merged (#126) |
| 9b | The question sheet + card CTA rewiring | M | ✅ merged (#127) — card CTA → sheet → prefilled draft; the reply loop's "they said no" → PWN (school) / NOA (RC) routing landed here too |
| 9c | The `<Citation>` component + draft-screen guidance | M | ✅ merged — 9c-1 Citation (#128), 9c-2 send-gate (#129), 9c-3 "filled from your records" note (#130) |
| 9d | Send confirmation (clock · trail · case file in one glance) | S | ✅ merged (#131) — three artifacts + Done → Home; kept honest (no "we'll watch", push isn't shipped) |
| 9e | The reply loop | M | Core shipped in 9b (reply CTA → sheet, said-no routing). Remaining polish: **seed the "what did they say?" answer from `analyzeEmail`** so the AI pre-reads the reply — optional enhancement, not built. |

**Status (Aug 30 2026): the draft flow is shipped end to end** — card → 2–3
questions → prefilled draft (tappable Citation, "filled from your records"
note, send gate) → send → confirmation → Done → Home. Also shipped alongside:
task #34 (the ladder now sees plan actions) and migration 049 (the
`home_deferrals` RLS recursion fix — **awaiting the owner's hand-apply**).
Every phase went through `/adversary`; the draft-flow lane was owner-delegated
for self-merge on Aug 30 (see CLAUDE.md). Not yet exercised against real
Supabase data — unit/ui/adversary only.

Each ships green on `npx tsc --noEmit`, `npx vitest run`,
`npx eslint . --ext .ts,.tsx --quiet`.

**Honest total:** ~3–4 weeks of build, matching the competitive audit's
sizing of the same work (its roadmap item 10). The affordability claim is
about *risk*, not calendar: there is almost no new domain logic to get wrong,
because the clocks, the fills, the paper trail and the case file are already
tested. `9c` split the old "guidance + send" phase in two once the audit
showed the tappable citation is its own unbuilt component, not a chip that
already renders.

## 7. Where this stops being auto-shippable

All of it. Every phase here **changes what a family reads, and changes advice,
tone and legal framing** — the first line of CLAUDE.md's "Where auto-ship
stops." So: `/adversary` on each PR, its memo in the PR body, and the owner's
approval before merge. Not delegable to CI this session wrote.

Two specific risks worth naming now:

- **The three-question flow can become a twenty-question flow** the moment
  someone wants "just one more" signal. Rule 1 in §4.2 is the defense, and it
  is a test, not a comment.
- **A confidently wrong draft is worse than no draft.** The mitigation is
  structural, not a prompt tweak: the legal sentences are ours, cited, and
  never written by the model. The model fills names, dates and circumstances.
  `sourceForCitation()` already refuses a citation not in the registry.

## 8. Prerequisite, not part of this phase

Task #34 — **the triage ladder is blind to actions** — must land before 9b.
`homeTriage.ts` never reads actions, `useTriage.ts` never passes them, and
`firstRun` omits them. Until it is fixed the card can lead with a draft while
five items are past due, which is exactly the wrong thing to hand a draft flow.
