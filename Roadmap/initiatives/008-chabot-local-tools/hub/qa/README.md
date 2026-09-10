# Chabot Hub — QA suites

Browser tests for `../chabot-hub.html`. 180 checks across three suites.

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
```

Each exits non-zero if anything fails and prints a `PASS`/`FAIL` line per
check. They resolve the page relative to this directory, so they run from
wherever the repo is checked out.

## What each covers

**`hub-functional.test.mjs`** (77) — every page reachable and rendering; the
two posting destinations named and cross-linked; posting a question, tip and
resource; threading and replies; helpful votes; flagging; the parent/mod view
toggle; "My Contributions" showing only your own posts; XSS escaping of all
user content; and an assertion that **no approval queue exists** — the string
"pending review" must appear nowhere.

**`hub-search.test.mjs`** (51) — long-form lessons keep their headline and full
body untruncated; lessons render on Wisdom, stay out of the Discussions feed,
and appear in My Contributions; flagged lessons reach the mod dashboard; search
finds posts, lessons and reference pages and excludes flagged content; and the
AI layer under a stubbed `window.claude` — streaming, the Stop button, every
error code, and **assertions that the escalation tone rules and the
prompt-injection framing are present in the prompt**.

**`hub-mobile.test.mjs`** (52) — the drawer opens, navigates and closes four
ways; every one of the 14 pages is checked for horizontal overflow at 390px;
wide tables scroll inside their own box; grids collapse to one column; inputs
are ≥16px so iOS does not auto-zoom; modals fit and stack above the drawer;
and desktop is unchanged.

## A caution learned the hard way

Two of these tests were themselves wrong before they were right, and both
failures were silent — they *passed*:

- the original mobile test asserted "no horizontal scroll", which passed
  because the sidebar was `display: none`. There was no navigation on a phone
  at all, and the green test hid it.
- a touch-target test measured collapsed (`display: none`) buttons and read
  their height as `0`.

When adding a mobile check, assert the thing is **present and usable**, not
merely that nothing overflows.
