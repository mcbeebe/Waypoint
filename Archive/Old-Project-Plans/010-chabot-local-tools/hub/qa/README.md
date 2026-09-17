# Chabot Hub — QA suites

Browser tests for `../chabot-hub.html`. 276 checks across five suites.

## Running them

`playwright-core` is not vendored — same convention as
`../../tools/make-flyer.js`, which requires it the same way. Chromium is
already on the box at `/opt/pw-browsers/chromium`; do **not** run
`playwright install`.

```bash
npm install playwright-core          # once, anywhere on the resolution path
node hub-functional.test.mjs
node hub-search.test.mjs
node hub-mobile.test.mjs
node hub-admin.test.mjs
node hub-pages.test.mjs
```

Each exits non-zero if anything fails and prints a `PASS`/`FAIL` line per
check. They resolve the page relative to this directory, so they run from
wherever the repo is checked out.

## What each covers

**`hub-functional.test.mjs`** (83) — every page reachable and rendering; the
two posting destinations named and cross-linked; posting a question, tip and
resource; threading and replies; helpful votes; flagging; the three-way
parent/mod/admin role cycle; "My Contributions" showing only your own posts;
XSS escaping of all user content; and an assertion that **no approval queue
exists** — the string "pending review" must appear nowhere.

**`hub-search.test.mjs`** (51) — long-form lessons keep their headline and full
body untruncated; lessons render on Wisdom, stay out of the Discussions feed,
and appear in My Contributions; flagged lessons reach the mod dashboard; search
finds posts, lessons and reference pages and excludes flagged content; and the
AI layer under a stubbed `window.claude` — streaming, the Stop button, every
error code, and **assertions that the escalation tone rules and the
prompt-injection framing are present in the prompt**.

**`hub-mobile.test.mjs`** (54) — the drawer opens, navigates and closes four
ways; every page (including the admin-only ones) is checked for horizontal
overflow at 390px; wide tables scroll inside their own box; grids collapse to
one column; inputs are ≥16px so iOS does not auto-zoom; modals fit and stack
above the drawer; and desktop is unchanged.

**`hub-admin.test.mjs`** (53) — Contacts and Directory are editable by a plain
Member (no role switch needed), for both group shapes (Chabot Elementary vs.
OUSD, provider vs. category); edits update in place rather than duplicating;
"+ Add a Provider" lands in the Directory, not the Discussions feed; flagging
a directory entry surfaces it in the Mod Dashboard tagged `Directory`; Manage
Team add/remove and the last-admin guard; **an id-collision regression test**
that adds several contacts/providers/team members and asserts no ids repeat;
and content assertions for the ported Navigator material (the full Decoder
Ring, the Day 0/15/60 schedule).

**`hub-pages.test.mjs`** (35) — Manage Pages is admin-only; publishing into an
existing sidebar section vs. typing a brand-new one; a second page in the same
new section reuses that section instead of duplicating its heading; the tiny
markdown renderer (`#`/`##` headings, `- ` bullets, `**bold**`); editing a
page in place (no duplicate, old content fully replaced); moving a page
between sections; validation (empty title, empty body, an unnamed new
section); role visibility on an **already-rendered** page updating live when
the viewer's role changes, with no re-navigation needed; XSS safety for both
the title and body; and deleting a page while viewing it never leaves a blank
screen.

## Cautions learned the hard way

Several of these tests were themselves wrong before they were right, and the
failures were silent — they *passed*:

- the original mobile test asserted "no horizontal scroll", which passed
  because the sidebar was `display: none`. There was no navigation on a phone
  at all, and the green test hid it.
- a touch-target test measured collapsed (`display: none`) buttons and read
  their height as `0`.
- a role-visibility check on a custom page used `page.isVisible()` without
  first navigating to that page — `isVisible()` follows the whole ancestor
  chain, so it correctly reported "not visible" for the true reason (the page
  wasn't the active one), which looked exactly like an app bug until the test
  was fixed to navigate there first.

And one real app bug this QA process caught mid-build, worth naming because
the mechanism is easy to reintroduce: `renderCustomPages()` rebuilds the
custom pages' `<div>` elements from scratch (unlike `renderContacts()` /
`renderDirectory()` / `renderTeam()`, which only refresh list *contents*).
It was briefly wired into `switchPage()`'s generic per-navigation refresh
chain, which meant navigating *to* a custom page set `.active` and then, in
the same call, immediately rebuilt that same element without the class —
silently blanking the page you'd just clicked into. Any future render
function that recreates DOM nodes (rather than updating them in place) needs
to be called only when its underlying data changes, never folded into a
navigation-triggered refresh loop.

When adding a mobile check, assert the thing is **present and usable**, not
merely that nothing overflows. When asserting visibility of something inside
a page, make sure that page is actually the active one first.
