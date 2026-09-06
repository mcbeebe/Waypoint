# Answers Pipeline — how /answers/ pages get made

**Owner:** content-ops (Mike). **Applies to:** the `answers` collection in
`src/content.config.ts` (D2). **Related contracts:** `docs/analytics-taxonomy.md`
(D3), `content-ops/SCHEMA.md` (field semantics), `content-ops/keyword-map.yaml`
(query→URL ownership), `content-ops/answers/QUEUE.md` (the working queue).

---

## 1. Purpose

`/answers/` pages are short, single-question pages that answer **one question a
California parent actually asked**, in their words, with a direct answer first
and a statute-cited path forward. They are not mini-guides. One question, one
answer, one next step, one link deeper into the pillar guide that owns the
topic.

Why they exist:

- Parents search in questions ("can the regional center make me use insurance
  first?"), not in topic labels. Guides rank for topics; answers pages rank for
  questions.
- They are cheap to review (short, single-claim), so they fit inside the
  reviewer-throughput cadence cap without displacing a guide.
- Each one is a doorway: answer honestly and completely on the page (never a
  teaser), then route to the owning guide and, where genuinely useful, the app.

Every answers page is YMYL and rides the full status ladder
(`draft → founder_edit → in_review → approved → published`). The D2 schema
blocks `published` without a completed review block. **Answers pages count
against the same cadence cap as everything else reviewed** — do not treat them
as free volume.

---

## 2. Question sources, ranked

Each source maps to a `questionSource` frontmatter value (D2 enum:
`chat-mined | gsc | paa | kb | editorial`). Two tiers: what we use **now**
(zero privacy risk) and what we unlock **later** (chat mining, hard-gated).

### Tier 1 — use now (no privacy exposure)

Ranked by evidence quality:

1. **`gsc` — Google Search Console queries** (once the site has data).
   Strongest signal: real queries, real impressions, our real pages. Pull the
   query report monthly, filter to question-shaped queries and to queries where
   we rank on page 2+ or where no existing page is the obvious answer. GSC data
   is Google's aggregate — no user of ours is identifiable in it.
2. **`paa` — People-Also-Ask boxes.** Search our pillar head terms
   (regional center eligibility, IEP timelines, IHSS protective supervision,
   SB 946, SSI for a disabled child) and harvest the PAA questions, including
   the second-ring questions that expand. Record the harvest date and the
   query that surfaced each PAA in the queue entry.
3. **`kb` — implicit questions in the existing KB.** The Entity Navigation
   Matrix (49 deep-dive articles powering the gas-mvp AI engine) already
   encodes what parents need to know. Walk each article and extract the
   questions it implicitly answers ("what happens at a 4731 complaint?",
   "who pays first, Medi-Cal or private insurance?"). This mines **our own
   editorial content**, not user data — zero privacy risk, and it front-loads
   questions we can already answer accurately.
4. **`editorial` — editorial judgment** (the D2 default). Questions Mike or
   the credentialed reviewer knows parents ask from lived experience of the
   system — IEP-season questions, annual-IPP questions, "the RC said no, now
   what" questions. Lowest external evidence, so use it to fill seasonal gaps,
   not as the main pipe.

> Note on on-site search: D3's `search_used` event deliberately carries no
> query text (cookieless, `locale` only). On-site search terms are therefore
> **not** a source today. If we ever want them, that is a D3 amendment (its own
> PR, both parsers) — do not log query text ad hoc.

### Tier 2 — later: `chat-mined` (HARD-GATED)

The richest future source: what parents actually ask the AI Navigator.
Locations:

- **Supabase** (waypoint-app): `chat_sessions` / `chat_messages` tables.
- **gas-mvp**: the `ChatSessions` sheet (plus `InteractionLog`) in the Google
  Sheets backend.

**HARD GATE — no exceptions:**

- Chat mining is **blocked until the privacy policy's disclosure (Section 4
  below) is live on the published privacy policy** at waypointchild.com, and
  the app links to that policy. No sampling, no "just to scope it" reads of
  chat content for content purposes before that date.
- **Chats collected BEFORE any disclosure existed are a counsel question.**
  Users who chatted under an earlier policy (or no policy) never saw the
  disclosure. Whether those historical chats — including everything currently
  in the gas-mvp `ChatSessions` sheet — can be mined even in anonymized,
  aggregated form is not a founder-judgment call. **OPEN QUESTION FOR COUNSEL,
  logged here on 2026-09-06; status: unresolved. Until counsel answers in
  writing, the mineable corpus starts at the disclosure go-live date, and
  everything earlier is off-limits.**
- When the gate lifts, only the anonymization spec in Section 3 governs how
  mining works. Pages produced this way set `questionSource: chat-mined` —
  the provenance field exists precisely so we can audit or unwind this class
  of pages if the rules change.

---

## 3. Anonymization spec (chat-mined, once unlocked)

The pipeline is: **raw chats → stripped themes → intent clusters → one
rewritten canonical question per cluster.** Raw chat text never gets closer to
the site than step one, and nothing user-written survives to publication.

**Strip at ingestion** (before any human reads for content purposes):

- All personal names — parents, children, family members, staff.
- Children's names in any form, including nicknames and initials.
- City names with population under 100,000 (check against Census QuickFacts;
  when in doubt, strip). Replace with the county or "a city in [county]
  County." Cities of 100k+ may stay only when the question is genuinely
  city-specific; default to county anyway.
- Provider names, clinic names, school names, school district names, and
  individual regional center staff names. (The regional center itself may
  stay — "Harbor Regional Center denied respite" is system-level, not
  personal — but drop it too if the combination below triggers.)
- Dates of birth, ages stated to the month, and any date that identifies an
  event (an IEP date, a hearing date).
- Case numbers, client numbers, UCI numbers, docket numbers, claim numbers,
  phone numbers, emails, addresses.
- **Combination rule:** a rare diagnosis + a location + an age can identify a
  child even with the name gone. If a stripped item still reads as "probably
  one specific family," generalize further or discard it.

**Cluster by intent, not by wording.** Group stripped questions that seek the
same thing ("RC says use private insurance first — do I have to?" and "regional
center making us bill Kaiser for ABA" are one intent). An intent must appear
from **at least 3 distinct users** before it can enter the queue — this is a
floor against publishing one family's uniquely identifying situation, not a
popularity contest. (Threshold adjustable upward, never below 3.)

**Publication rule — no verbatim, ever.** Every published answers page poses a
**rewritten canonical question**: composed fresh by us to represent the
cluster, in plain language, at grade 7–8. Never a quoted chat, never a lightly
edited chat, never a distinctive user phrase that could be recognized by the
person who typed it. If a user's phrasing is so distinctive it's the best way
to say it, that is exactly the phrasing we cannot use.

Working artifacts of mining (stripped exports, cluster notes) live outside the
site repo, are minimized, and are deleted once the queue entry is written. The
queue entry records only: canonical question, intent cluster label, cluster
size, and date range mined — no excerpts.

---

## 4. Privacy-policy disclosure language (hand to counsel)

Draft for counsel to review, edit, and place in the privacy policy. This is
proposed language, not final; counsel owns the final wording and placement.

> **How your questions improve our public guides.** We review the questions
> that users ask Waypoint in anonymized, aggregated form to understand which
> topics California families need help with — for example, noticing that many
> families ask how regional center funding interacts with private insurance.
> These aggregated themes inform the free public educational content we write
> and publish. Before any review for this purpose, we remove names, locations,
> provider and school names, dates of birth, case numbers, and other
> identifying details, and we only act on themes that appear across multiple
> users' questions. We never publish your questions, chats, or any part of
> them verbatim, and no published content will describe your individual
> situation.

Also flag for counsel, alongside the pre-disclosure question in Section 2:
whether this disclosure requires affirmative in-product notice (banner or
changelog) versus policy update alone, and any retention-limit language they
want attached to the mining workflow.

---

## 5. Queue mechanics

The queue lives at `content-ops/answers/QUEUE.md`. Rules:

- **Monthly refresh.** Refresh the queue in the first week of each month,
  alongside the D3 monthly analytics reconciliation (same sitting — the GSC
  pull serves both). Each refresh: pull Tier 1 sources, add new candidates,
  re-rank, prune answered/stale entries.
- **Queue entry format** (one per candidate):
  - Canonical question (rewritten, grade 7–8)
  - `pillar` (D2 enum) and proposed slug + `translationKey`
  - `questionSource` + evidence (GSC query strings and rough impression tier
    once data exists; PAA seed query + harvest date; KB article ID; for
    chat-mined later: cluster label + size + date range)
  - Status: `candidate → cleared → drafting → done` (done = the page enters
    the normal D2 ladder and leaves the queue)
- **Dedupe against `keyword-map.yaml` — the map owns query→URL assignments.**
  Before a candidate is `cleared`: look up every query/variant in the map. If
  the map already assigns the query to a URL, that page owns it — the
  candidate is dropped, or reframed to a genuinely distinct intent. An answers
  page never gets drafted for a query the map has given to a guide.
- **Cannibalization check before drafting.** Even when the map is silent:
  search published content (Pagefind + grep) for the question's substance. If
  an existing guide substantially answers it, the fix is a better heading,
  anchor, or FAQ block **on the guide** — not a new page. If the answers page
  proceeds, the same PR that adds the draft **updates `keyword-map.yaml`** to
  assign the question's queries to the new URL, so the next dedupe pass sees
  it.
- **Cadence cap.** Cleared candidates only move to `drafting` when reviewer
  throughput has room after guides, letters, and refresh-event updates already
  in flight. The cap counts ALL reviewed items; answers pages have no
  side door.
- **ES twins.** Every EN answers page gets an ES sibling on the same
  `translationKey` — plan both against the cap when clearing a candidate.

---

## 6. Page anatomy (per the D2 `answers` schema)

Files: `src/content/answers/**/*.mdx`, per the directory and slug conventions
in `content-ops/SCHEMA.md`.

**Frontmatter** — all `seoBase` fields plus the two `answers` extensions:

```yaml
title: "Can the Regional Center make us use private insurance first?"  # the question itself, ≤70 chars
description: ""            # 40–160 chars; restate question + gist of the answer
locale: en                 # 'en' | 'es'
translationKey: rc-insurance-first   # shared with the ES twin before it exists
status: draft              # ladder: draft → founder_edit → in_review → approved → published
author: Mike Beebe
review: null               # required non-null before status: published (D2 refine)
datePublished: null
dateModified: 2026-09-06
nextReviewEvent: annual    # pick the named event the answer depends on, e.g. ssi-fbr-jan for SSI amounts
sources: []                # in practice ≥1 primary source (statute, DDS/DOE page) before in_review
changelog: []
disclaimerVariant: legal   # 'benefits' for Medi-Cal/IHSS/SSI answers, 'medical' where applicable
noindex: false
pillar: insurance          # D2 pillar enum — the guide pillar that owns this question
questionSource: editorial  # 'chat-mined' | 'gsc' | 'paa' | 'kb' | 'editorial' — set from the queue entry
```

**Body structure** (short — target roughly 200–450 words; if it wants to be
longer, it's a guide section, not an answer):

1. **H1 = the question** (matches `title`).
2. **Direct answer, first paragraph.** 2–4 sentences that fully answer the
   question — no throat-clearing, no teaser. One clause of validation at most
   ("This rule surprises a lot of families — here's how it actually works"),
   then the answer. This paragraph is the featured-snippet target.
3. **What the law says.** The statute or regulation, cited inline in
   "WIC §4643" style, in plain grade 7–8 language. Any dollar figure, phone
   number, or timeline that isn't verified against a primary source ships as
   `[TBC]` with a note — never invented.
4. **What to do next.** 2–4 concrete steps. Link the relevant EN+ES template
   letter or stateless tool when one exists.
5. **Go deeper.** One link to the owning pillar guide (the `pillar` field's
   guide), phrased as the natural next read.
6. **One CTA (optional, max one).** A D3-compliant deep link to
   `https://app.waypointchild.com/start` carrying `wp_slug`, `wp_pillar`,
   `wp_cta=answer-footer`, `wp_locale`, `utm_source=site`,
   `utm_medium=organic-content`. It fires `app_signup_click` per the frozen
   taxonomy — no new events or params without a D3 amendment. `read_complete`
   applies to answers pages as-is (they are article pages).

**Standing rules restated because they bind here too:** zero email gates —
the full answer is on the page; no fabricated statistics, dollar figures,
phone numbers, or citations; nothing renders publicly below
`status: published`, and `published` requires the completed review block with
reviewer credential and `versionReviewed` SHA.
