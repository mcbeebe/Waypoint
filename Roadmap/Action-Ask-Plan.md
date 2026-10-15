# "Ask about this" — the action → chat bridge

**Date:** Oct 14, 2026 · **Status:** adopted — owner go Oct 14, built in one PR
**Supersedes:** nothing. **Superseded-by:** nothing.
**Mockups:** `Roadmap/mockups/action-ask/` (3 artboards + canvas notes)

---

## 1. The brief, in the owner's words

> I need ability to ask questions about this particular Task. Such as "Ask about
> this" then it would take me to the Chat page but pull details about the Task
> and my progress automatically as context. For example, I applied for Medi-Cal
> but I want to know more about what to expect next, timelines, deadlines,
> follow ups, what to look for.

The example is the whole design. A parent who has just marked **Apply for
Medi-Cal** done does not have a *task* question any more — they have a *waiting*
question. Today the only way to ask it is to switch to the Navigator tab and
retype everything the app already knows.

## 2. What already exists (so this is small)

Three-quarters of this is shipped and tested:

- `NavigatorMain` already takes an **`ask?: string`** route param. It seeds the
  conversation, holds the seed if a stream is mid-flight, and routes it through
  the AI-consent gate. Four screens already use it — Home search, Journey,
  Reimbursables, SupportDetail.
- `journeyActions.ts` already establishes the pattern for **building the seeded
  sentence in a pure, unit-tested lib function** (`entityStepQuestion`,
  `phaseQuestion`) rather than inline in a screen.
- `ActionDetailScreen` already does a **cross-stack navigate** with the tab
  named (the "Write to an agency" → Letters handoff), with the routeGraph
  caveat written into the code comment.

What is genuinely new: one lib module, one card on the action screen, and one
small pill on the chat screen.

## 3. How the context actually travels — the one real constraint

The Navigator's **system prompt is built server-side** in the `ai-proxy` Edge
Function from DB-derived family context (Wave 1 hardening — guardrails cannot be
stripped by a modified client). The client sends only `messages`, `tone` and
`ragContext`. There is no client-side context slot to fill.

So there are two ways in:

| | How | Cost |
|---|---|---|
| **A. In the seeded message** | The action's state rides in the first user message as a readable sentence | No Edge Function change. Pure, testable. Parent can see and correct it. Matches the shipped Journey pattern |
| **B. A new `actionContext` field on the ai-proxy payload** | Structured, invisible to the parent | Edge Function change — **no CI covers the eight functions**, and they are an explicit stop in the auto-ship rule. Ships unverified |

**Recommendation: A.** The family context (child, diagnoses, Regional Center)
already arrives server-side for free. The seeded message only has to carry the
*action-specific* delta, which is one sentence. B buys invisibility and costs a
deploy surface with no tests — a bad trade for v1.

A also has a property worth naming: the parent can **see what Waypoint thinks
the situation is**, and correct it in their next message if it's wrong. That is
a feature in a product whose whole job is trust.

## 4. What goes into the sentence

From the `Action` row: title, category, status (and `completed_at` when done),
`due_date`, step progress (`n of m`, plus which steps are still unchecked),
`follow_up_date` / `follow_up_note`, and the child it names.

**Deliberately excluded from v1:** the parent's free-text notes
(`useActionNotes`). They are a private scratchpad, arbitrarily long, and may hold
things a parent would not choose to send to a model. If the owner wants them in,
it should be an explicit "include my notes" toggle, not a default.

Example, for the screenshot's case:

> I've finished "Apply for Medi-Cal" — I submitted the application. What happens
> next, how long should it take, and what should I be watching for?

## 5. One button — the owner's call (Oct 14)

The plan proposed four status-aware starter chips. **The owner chose one
button instead:** "Ask about this" prefills the composer with the context
sentence, focuses it, and sends nothing. The question stays the parent's to
write.

That is the better shape for a reason worth recording. A chip is a question
Waypoint put in the parent's mouth; a prefilled composer is a statement of what
Waypoint already knows, with the cursor waiting. The second one asks less of the
screen (this detail view is already long), and it preserves the property that
made plan option A right in the first place: the parent can **see Waypoint's
read of their situation, and correct it before sending**.

The mechanical consequence is that the bridge must NOT use the existing `ask`
param, which sends immediately. It uses a new `prefill` param that does not —
pinned by a test, because the two are one word apart in the call site.

The status-awareness survives in the sentence itself, which is what the model
reads:

| State | What the composer opens with |
|---|---|
| Not started | `About "Apply for Medi-Cal" — I haven't started it yet; it has 8 steps. It's due Aug 24. ` |
| In progress | `About "Apply for Medi-Cal" — I'm part-way through it, 6 of 8 steps done. It's due Aug 24. ` |
| Done | `About "Apply for Medi-Cal" — I've marked it done (Oct 2). ` |
| Done, answer past due | `…I've marked it done (Aug 20). An answer on it is past due. ` |
| Date gone by | `…It was due Aug 24, and that date has passed. ` |

## 6. Tone — the part that needs the most care

This is family-facing copy that *also* steers the model's answer, so the
escalation tone rule binds it twice over.

- The seeded sentence states **the status of the answer**, never an actor who
  failed: "An answer on this is past due," not "They missed the deadline."
- Chips **ask**: "How do I follow up?", never "How do I complain?" Tone firms up
  on the ladder, one rung at a time — not on chip four of screen one.
- The past-due variant is the single riskiest string in the feature. It gets
  pinned by tests the way `homeTriage.test.ts` pins Home.

## 7. Navigation

`ActionDetail` lives in the **Tracker** stack; `NavigatorMain` lives in the
**Navigator** stack. A `navigate` resolves to parents, never siblings, so the
tab must be named:

```ts
navigation.navigate('Navigator', { screen: 'NavigatorMain', params: { ask } })
```

`resolvesFrom('Tracker', { screen: 'NavigatorMain', tab: 'Navigator' })` is the
assertion that keeps this from becoming the repo's third dead tap.

Because the handoff **switches tabs**, Back does not return to the action. Hence
the context pill at the top of the thread: it names what the chat is anchored to
and taps back to `ActionDetail`. This is the only new chat surface, and it is
worth it — without it the parent has to remember which tab they came from.

## 8. Scope

**New:** `src/lib/actionAsk.ts` — pure. `actionAskPrefill(action, opts)` builds
the sentence; `actionAskLabel` / `actionAskHint` are the button's copy.
Trilingual (en/es/vi), matching `homeStarters` / `SupportDetailScreen`.

**Changed:** `ActionDetailScreen.tsx` — one card under the meta chips.
`NavigatorScreen.tsx` — the `prefill` effect (set text, focus, send nothing)
and the context pill. `navigation.ts` — `NavigatorMain` gains `prefill?: string`
and `anchor?: { actionId, title }`. `vitest.setup.ui.tsx` — the navigation mock
gains `setParams`, which no screen under test had needed before.

**Tests (as built, 34 + 12 new):** `actionAsk.test.ts` (logic — every status,
the past-due wording, locale parity, and a banned-phrase tone guard across all
48 state×locale combinations); `actionAsk.tz.test.ts` (east AND west — a
date-only day never shifts, "has it passed?" is asked on the family's calendar,
a timestamp belongs to the day the family is living in); `ActionDetailScreen`
(ui — the button renders, the navigate names the tab, `resolvesFrom` agrees, the
prefill carries status, `ask` is never set, the child is the attached one);
`NavigatorScreen` (ui — the composer fills, `sendMessage` is NOT called, the
param is cleared, the pill resolves back).

Every one of these was mutation-checked: the naive-UTC parse, a UTC "today", a
blaming phrasing, a dropped tab name, an auto-sending prefill, a dropped year,
an overwriting prefill, and each of the three pill-lifecycle clears turn a test
red when removed. The two date mutants were caught by `tz-west` ONLY — the east
suite passed them both, which is the whole argument for running the file twice.

The `/adversary` pass found ten verified defects in the first build, seven of
which were fixed before review: a dropped YEAR (a 14-month-old deadline read
identically to a 7-week-old one), a prefill that destroyed a half-written
question, a pill that survived into an unrelated resumed conversation, a
self-contradicting "part-way through, 3 of 3 steps done", an English-only pill
inside a trilingual flow, a new card that pushed the inline deadline editor
away from the chip that opens it, and an unbounded title. Three of the fixed
behaviours had shipped with no test that failed when they were deleted. The
memo is in the PR.

**Not in scope:** notes in the context, Edge Function changes, any change to how
the answer itself is generated or rendered.

## 9. Gates and approval

Family-facing, and it changes advice framing and tone. That is the **first and
strongest stop** in the auto-ship rule, and this is **not** the draft-flow lane,
so the scoped auto-merge grant does not apply.

Therefore: build → gates (`tsc`, `vitest`, `eslint`) → **`/adversary`** → memo in
the PR → **wait for the owner**. One PR; below the initiative bar (no deploy
surface, no locked decision changed), so the PR description is the record.

## 10. Still open

1. **Notes in the context** — excluded, as proposed. If they are ever wanted it
   should be an opt-in toggle, not a default.
2. **Entry point** — built on `ActionDetail` only. Whether the same affordance
   belongs on the action cards in the Plan list is untested and unanswered.
3. **The pill is a way THERE, not a round trip.** It opens the action; it does
   not come back. ActionDetail's own "← Back" goes to the Home tab (the tab
   navigator's `firstRoute` behaviour), and if the action was dismissed or
   deleted since the chat was opened, the route renders a bare "no longer
   available" with no back control at all. Plan's own rows have exactly the
   same shape, so this is a pre-existing weakness the pill inherits rather than
   one it introduces — but the first build's comments claimed a round trip, and
   they now say what it actually does. Worth a decision: leave it, or give the
   pill a real return path.
4. **The context is editable text with no marker.** A parent can delete half of
   it and send something incoherent, and the model cannot tell generated
   framing from the parent's own words. The alternative — a non-editable
   preamble — costs the property that made prefill the right call.
