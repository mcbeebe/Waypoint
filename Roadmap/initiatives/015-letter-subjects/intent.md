# 015 — Letter subjects: written for the letter, not the template

**Date:** 2026-10-09 · **Status:** adopted — owner-approved plan 2026-10-07; PR 1 merged (#305), PR 2 awaiting owner
**Supersedes:** — · **Superseded-by:** —
**Artifacts:** intent.md (this) → PR bodies, each carrying its own `/adversary` memo

## Problem

On 2026-10-07 the owner sent a follow-up to a provider through Letters' "Send now
with Gmail". The email asked her to put a recommendation in writing. It went
out with the subject **"IPP Meeting Request — <child's name>"**, which the owner
could neither see clearly nor change before it was sent.

- **Why the subject was wrong:** the draft prompt (`ai-proxy`, `DRAFT_OUTPUT_RULES`)
  never asked for a subject. So `buildSubject` fell back to the *template's* title,
  and the Navigator had routed the note through the IPP template.
- **Why it couldn't be caught:** the subject was static text, and the button sent
  on one tap.

## Intent

Owner-approved plan, 2026-10-07:

- **PR 1 (#305, merged):**
  - The subject is an editable field.
  - "Send now with Gmail" says it sends automatically, and opens a confirm pop-up
    showing From, To, Subject and the message before anything goes.
  - One paper-trail row per letter.
- **PR 2 (this folder's deploy-surface PR):** after the draft is written, `ai-proxy`
  makes a second, small model call that reads the finished letter and writes its
  subject. It returns `{ draft, subject }`; the draft itself is untouched. The app
  already reads `subject` (shipped in #305).
  - The subject's rules:
    - Say what this letter actually asks.
    - Name a formal request first, so an intake desk routes it.
    - Use the child's name as the letter writes it.
    - No diagnosis: a subject shows on lock screens and in shared inboxes.
    - Neutral wording, whatever the letter's tone.
    - Same language as the letter.
  - `_shared/subjectLine.ts` (pure, tested from `src/`) cleans the reply into one
    safe header line.
  - The app fills known `[BRACKET]` blanks in the subject, the same as in the body.
  - **Rejected:** asking the draft model for a "Subject:" first line. An
    adversarial review found it fights the draft prompt's own rules (the warm
    tone's opening, the LANGUAGE line's "write the ENTIRE draft in …"), and any
    parsing miss left a literal "Subject: …" in a letter a family sends.

## Non-goals

- **Extra To recipients, and a sync filter for copied people.** Both were in the
  original plan. Both were dropped on 2026-10-09:
  - Cc shipped separately (#313, initiative 014).
  - The owner confirmed initiative 014's ruling that every reply counts as an answer.
- **Fixing the Navigator's template routing** (a provider note sent as an IPP
  request). That's a separate task: it also opens a statutory clock that should
  not exist.
- **Re-subjecting letters already saved.** Reopened drafts keep their saved
  subject (#305).

## Stops that still apply

PR 2 changes an Edge Function (`ai-proxy`) and the copy a family sends under
their name. Per CLAUDE.md's "Where auto-ship stops", it needs `/adversary`, a
memo in the PR, and the **owner's go**. The draft-flow grant does not cover it,
because the narrower stop wins.

## How we'll know

A generated letter's subject names what the letter asks, in the letter's
language, without the parent typing one. The template title appears only as
the fallback for drafts with no model subject (reopened legacy rows, and chat
answers).
