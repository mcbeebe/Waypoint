# 014 — Reply follow-ups: record Cc, reply-all, "nothing to answer"

**Date:** 2026-10-09 · **Status:** draft — plan awaiting owner go
**Supersedes:** — · **Superseded-by:** —
**Artifacts:** intent.md (this) → plan.md → PR A → PR B → PR C
**Mockup:** `Roadmap/mockups/reply-followups/` (three artboards, invented names)

## Problem

Letters can now copy people (#313), and the owner ruled that every reply counts
as an answer. That leaves three gaps:

1. **Paper Trail doesn't record who was copied.** The Cc exists only in Gmail.
2. **A reply from Paper Trail drops the people who were copied.** It goes to
   the sender only, so a spouse or advocate falls out of the conversation.
3. **A reply that needs no answer comes back every morning.** "I'll get back
   to you" stays the One Thing reply card until the family answers it. The
   only escape is "Back tomorrow morning", which repeats daily.

## Intent

Owner approved all three on 2026-10-09 ("Yes to all"):

- (a) Store the Cc on every sent and synced email, and show it in Paper Trail
  and the data export and request dossier.
- (b) Pre-fill a Paper Trail reply with everyone on the email being answered,
  like Reply all, with each person removable.
- (c) Give a reply a "✓ Nothing to answer" action on the Home card and in Paper
  Trail. It can be undone, and the request's own clock keeps running.

## Non-goals

- Closing a request from a reply. A reply that settles nothing is not an
  outcome.
- AI classification of replies. Home still cannot tell "I'll get back to you"
  from "no", so the family decides.
- Backfilling Cc for emails sent before PR A. Gmail has the data, but
  re-reading every thread is a separate job.

## Stops that still apply

Migrations (064 and 065), the gmail Edge Function and both sync paths, and
family-facing copy all need `/adversary` plus the owner's go per PR, under
CLAUDE.md's "Where auto-ship stops". The draft-flow grant does not cover this
work, because the narrower stop wins.
