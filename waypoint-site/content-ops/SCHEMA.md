# Content Schema Reference (D2)

**Source of truth for field *semantics*.** The enforcement mechanism is
[`src/content.config.ts`](../src/content.config.ts) — a page that violates the
schema fails `astro build`, so nothing documented here is optional. Engineering
owns the Zod wiring; content-ops owns this document. If the two ever disagree,
fix this doc and the config in the same PR (the schema is a frozen contract;
changes need their own PR, like D3).

Related contract: [`docs/analytics-taxonomy.md`](../docs/analytics-taxonomy.md)
(D3). Two fields here are also analytics identifiers — `pillar` feeds the
`pillar` prop on `read_complete` / `app_signup_click`, and `letterId` feeds
`letter_id` on `letter_copied`. Renaming either breaks event continuity, so
they are effectively write-once after publish.

---

## Who fills what — the four roles

Every field below names an **owner**. The roles:

| Role | Meaning |
|---|---|
| **Claude draft** | Set by Claude when the draft is generated. May contain `[TBC]` placeholders for anything requiring verification (statistics, dollar figures, phone numbers, citations — per the YMYL hard rule, these are never invented). |
| **Founder** | Set or confirmed by Mike during `founder_edit` — voice pass, resolving `[TBC]`s, verifying contact data, deciding publish timing. |
| **Reviewer** | Supplied by the credentialed reviewer's sign-off. The founder transcribes it into frontmatter, but the *content* (name, credential, date, reviewed SHA) is the reviewer's attestation and is never edited afterward. |
| **Script** | Produced or checked mechanically: the build-time refine, the CI freshness checker, `git rev-parse` for SHAs, hreflang generation from `translationKey`. |

---

## Collections at a glance

All collections load `**/*.mdx` from their folder under `src/content/`. The
slug derives from the file path; the *hreflang relationship* between EN and ES
pages derives from `translationKey` + `locale`, never from the filename.

| Collection | Folder | What it holds | Extra fields beyond the shared base |
|---|---|---|---|
| `guides` | `src/content/guides/` | Long-form pillar guides (Regional Centers, IEP, benefits, insurance, first steps) | `pillar` |
| `answers` | `src/content/answers/` | Short single-question answer pages | `pillar`, `questionSource` |
| `letters` | `src/content/letters/` | EN+ES template letters with copy-to-clipboard | `pillar`, `letterId` |
| `regionalCenters` | `src/content/regional-centers/` | One page per California Regional Center (21) | `rcId`, `rcName`, `counties`, `intakePhone`, `intakeUrl`, `ddsListingUrl`, `verifiedAsOf`, `notAffiliated` |
| `research` | `src/content/research/` | Original data/research publications | `datasetUrl`, `methodologyKey` |
| `legal` | `src/content/legal/` | Privacy policy, terms, disclaimers | **Separate lighter schema** — see [Legal collection](#legal-collection-separate-schema) |

All collections except `legal` share the base schema (`seoBase`). They no
longer share a published-requires-review refine — see **D2-R** below.

---

## The status ladder

```
draft → founder_edit → in_review → approved → published
```

`status` is the single publication gate. **Nothing renders publicly unless
`status === 'published'`** — every other rung exists only in the repo and in
preview builds.

| Status | Meaning | Who advances it | Rules at this rung |
|---|---|---|---|
| `draft` | Claude-generated. May contain `[TBC]` placeholders. Facts unverified. | — (initial state, schema default) | Never shared outside the repo. |
| `founder_edit` | Mike is actively editing: voice pass (validate the feeling → plain-language statute-cited steps → earned pride), resolving `[TBC]`s, grade 7–8 readability check. | Founder, when he picks up the draft | `[TBC]`s should be resolved or explicitly flagged for the reviewer here. |
| `in_review` | Frozen and handed to the credentialed reviewer. | Founder, when the edit pass is done | Only reviewer-requested changes land. Note the commit SHA that was handed over — it becomes `review.versionReviewed`. If substantive changes are made after hand-off, the review restarts against the new SHA. |
| `approved` | Reviewer signed off; the `review` block is filled in. Waiting for a publish slot. | Founder, after transcribing the reviewer's sign-off | The gap between `approved` and `published` exists because of the **cadence cap**: publish rate = reviewer throughput, counting *all* reviewed items (guides, answers, letters, RC pages, and each ES translation separately). |
| `published` | Live on waypointchild.com. | Founder, at publish | Set `datePublished` in the same commit. No `[TBC]` may remain anywhere in the file — resolve it or reword it into an honest, on-page disclosure of the gap (see below); the RC collection additionally still build-refuses `published` with `verifiedAsOf: null` (D11). |

Demotion is allowed: if a published page's facts go stale or a reviewer
withdraws sign-off, drop it back to `in_review` (it disappears from the site on
the next deploy) and log why in `changelog`.

### D2-R: published-requires-review REMOVED (owner decision, 2026-09-09)

Until 2026-09-09, `content.config.ts` attached a refine to every YMYL
collection (`guides`, `answers`, `letters`, `regionalCenters`, `research`)
that build-failed any `published` page with `review: null`. **That refine has
been removed, site-wide, by explicit owner decision** — see the decisions
register and execution log in
`Roadmap/initiatives/008-marketing-content-site/plan.md` for the record. A
page may now reach `published` with no reviewer at all.

This does not relax the `[TBC]` rule (`scripts/check-tbc.mjs` still hard-fails
`in_review`/`approved`/`published` content with a `[TBC]` marker) or the RC
`verifiedAsOf` gate (D11, still build-enforced). It only removes the
requirement that a credentialed human vouch for the content before it ships.
Content published under this decision should say so honestly where a family
would expect a byline, rather than imply a review happened — do not write a
`review` block naming a person who did not actually review the page. Prefer
leaving `review: null` over a fabricated or stand-in attestation.

The `legal` collection is exempt from the ladder — see below.

---

## Shared base fields (`seoBase`)

These apply to `guides`, `answers`, `letters`, `regionalCenters`, and
`research`.

### `title` — string, max 70 chars, **required**

- **Purpose:** The `<title>` tag and the H1 basis. Capped at 70 so it doesn't
  truncate in search results.
- **Who fills:** Claude draft; founder may rewrite for voice.
- **When it changes:** Rarely after publish (title changes reshuffle rankings);
  log any change in `changelog`.
- **Example:** `"How to Request a Regional Center Assessment"`

### `description` — string, 40–160 chars, **required**

- **Purpose:** Meta description. The floor (40) exists because an empty or
  one-line description is an SEO bug; the ceiling (160) prevents truncation.
- **Who fills:** Claude draft; founder edits for voice. Write it like the first
  thing an exhausted parent at 11pm needs to hear.
- **When it changes:** Freely, any edit pass.

### `locale` — `'en' | 'es'`, default `'en'`

- **Purpose:** Page language. Drives the `lang` attribute, hreflang output, and
  the `locale` prop on every D3 event fired from the page.
- **Who fills:** Claude draft (set explicitly on ES files — don't rely on the
  default).
- **When it changes:** Never. An ES version is a *separate file*, not a locale
  flip.

### `translationKey` — string, **required**

- **Purpose:** The hreflang join. See
  [translationKey and the hreflang join](#translationkey-and-the-hreflang-join).
- **Who fills:** Claude draft — **set it on the EN page even before the ES twin
  exists** (the schema requires it precisely so the join is never an
  afterthought).
- **When it changes:** Never after publish; it is the join key.
- **Example:** `rc-assessment-request` (kebab-case, stable, language-neutral).

### `status` — enum, default `'draft'`

See [The status ladder](#the-status-ladder). Founder-owned after the initial
draft.

### `author` — string, default `'Mike Beebe'`

- **Purpose:** Byline and `schema.org/author`. Solo-founder site, so the
  default is almost always right; a guest expert byline overrides it.
- **Who fills:** Schema default; founder overrides for guest content.
- **When it changes:** Effectively never.

### `review` — object or `null`, default `null`

The credentialed-review attestation. `null` until the reviewer signs off.
**Must be non-null when `status: published`** (build-enforced).

| Subfield | Type | Meaning | Who fills |
|---|---|---|---|
| `reviewedBy` | string | Reviewer's name as it should appear publicly | Reviewer (transcribed by founder) |
| `credential` | string | The credential that makes this review count, e.g. `"Special education attorney, CA licensed"` — the *specific* qualification, not "expert" | Reviewer |
| `date` | date | Date of sign-off | Reviewer |
| `versionReviewed` | string | **git SHA of the draft the reviewer signed off on.** Capture with `git rev-parse --short HEAD` at hand-off. If the file changes substantively after this SHA, the review no longer covers the live text — re-review. | Script (SHA) + founder (transcription) |

- **When it changes:** Written once per review cycle. A re-review after
  substantive edits *replaces* the block (old block → note it in `changelog`).

### `datePublished` — date or `null`, default `null`

- **Purpose:** First-publication date; feeds `schema.org/datePublished` and the
  visible "Published" line.
- **Who fills:** Founder, in the commit that flips `status` to `published`.
- **When it changes:** Set once, never edited afterward. Updates are what
  `dateModified` is for.

### `dateModified` — date, **required**

- **Purpose:** Last substantive edit; feeds sitemap `lastmod`,
  `schema.org/dateModified`, and the visible "Updated" line. Freshness is a
  trust signal for YMYL content — parents need to know the page reflects
  current rules.
- **Who fills:** Whoever edits — update it in every commit that changes the
  page's *meaning* (not for typo fixes; use judgment, and pair meaningful bumps
  with a `changelog` entry).
- **When it changes:** Every substantive edit.

### `nextReviewEvent` — enum, default `'annual'`

- **Purpose:** Names the *calendar event* that should trigger this page's next
  refresh, so refresh work is driven by the real-world cycle that changes the
  facts — not by an arbitrary date.
- **Who fills:** Claude draft proposes; founder confirms.
- **When it changes:** When the page's subject matter changes.

| Value | Trigger | Typical pages |
|---|---|---|
| `ssa-cola-oct` | SSA announces the annual cost-of-living adjustment (typically mid-October) | SSI amount pages, benefit-planning guides |
| `ssi-fbr-jan` | New SSI federal benefit rate takes effect January 1 | SSI eligibility and payment pages |
| `ihss-wages-jan` | IHSS county wage changes (typically effective in January) | IHSS provider-pay pages |
| `may-revise` | California May Revision of the Governor's budget (mid-May) | Anything tracking proposed DDS/Medi-Cal changes |
| `june-budget` | California enacted budget (late June) | Pages citing budget-dependent program rules |
| `rc-pos-annual` | DDS's annual Regional Center purchase-of-service data publication (exact month [TBC — confirm DDS posting schedule]) | RC pages, POS-disparity research |
| `annual` | Page's own anniversary | Default for evergreen process guides |
| `none` | No scheduled refresh | Truly static content (still subject to `verifiedAsOf` rules where applicable) |

### `sources` — array of `{ label, url, accessed }`, default `[]`

- **Purpose:** The citations rendered on-page. Every statute, figure, deadline,
  or program rule in the body needs a source here. `url` must be a valid URL
  (schema-validated); `accessed` records when it was last checked, which is what
  makes future re-verification tractable.
- **Who fills:** Claude draft proposes (real sources only — a source Claude
  cannot verify gets a `[TBC]` label and a note, never a fabricated URL);
  founder/reviewer verify each one before publish.
- **When it changes:** Any time the body's claims change; bump `accessed` when
  a source is re-checked during a refresh.
- **Example:**
  ```yaml
  sources:
    - label: "WIC § 4643 — Regional Center assessment timeline"
      url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=4643"
      accessed: 2026-08-25
  ```

### `changelog` — array of `{ date, note }`, default `[]`

- **Purpose:** The audit trail connecting drafts, re-reviews and refreshes —
  a maintenance record, kept in frontmatter and in git.
- **NOT rendered on the page.** It used to be (an on-page "Change log" block),
  and the owner removed it on 2026-09-07: it was noise for a parent trying to
  read a letter, and it invited engineering shorthand into public copy — a
  published page shipped the string `esReady=false` to readers before it came
  out. Freshness is still visible to readers through `dateModified` and the
  trust block. Write entries for the next maintainer, not for parents.
- **Who fills:** Whoever makes the change (founder for edits, Claude for drafts
  it updates — founder confirms).
- **When it changes:** Append-only. Every post-publish substantive edit gets an
  entry; never rewrite old entries.

### `disclaimerVariant` — enum, default `'legal'`

- **Purpose:** Selects which standing disclaimer block the layout renders. The
  disclaimer *copy* lives in the layout (counsel-reviewed via the `legal`
  collection process); this field only picks the variant.
- **Who fills:** Claude draft; founder confirms.
- **Values:** `legal` (rights/process content — "not legal advice"; the safe
  default), `benefits` (SSI/Medi-Cal/IHSS money content), `medical` (anything
  touching diagnosis or treatment), `none` (**rare** — only pages making no
  YMYL claims at all; if in doubt, it isn't `none`).
- **When it changes:** Only if the page's subject matter shifts.

### `noindex` — boolean, default `false`

- **Purpose:** Emits `<meta name="robots" content="noindex">`. For pages that
  must exist at a URL but shouldn't rank: redirect targets kept for continuity,
  thin utility pages, temporary variants.
- **Who fills:** Founder only — this is a deliberate SEO decision, never part
  of a Claude draft.
- **When it changes:** Rarely; log the reason in `changelog`.

---

## Per-collection fields

### `guides`

| Field | Type | Notes |
|---|---|---|
| `pillar` | enum, **required** | One of `regional-centers`, `iep`, `benefits`, `insurance`, `first-steps`, `start`. Drives site IA (which pillar hub lists the page) **and** the `pillar` analytics prop (D3) — so it must match the D3 taxonomy exactly and never change after publish. Claude draft sets it; founder confirms. |

### `answers`

| Field | Type | Notes |
|---|---|---|
| `pillar` | enum, **required** | Same semantics as `guides.pillar`. |
| `questionSource` | enum, default `'editorial'` | Provenance of the question — how it entered the queue. Internal prioritization signal (not rendered). Claude draft sets it from the queue metadata. Values: `chat-mined` (de-identified pattern from gas-mvp AI Navigator logs — never a verbatim user question), `gsc` (Google Search Console query data), `paa` (People-Also-Ask research), `kb` (gap found in the Entity Navigation Matrix), `editorial` (founder judgment). |

### `letters`

| Field | Type | Notes |
|---|---|---|
| `pillar` | enum, **required** | Same semantics as `guides.pillar`. |
| `letterId` | string, **required** | Stable machine ID for the letter, e.g. `rc-assessment-request`. This is the `letter_id` prop on the D3 `letter_copied` event, so: kebab-case, write-once, and **identical on the EN and ES versions** (the letter is one product in two languages; `translationKey` handles hreflang, `letterId` handles analytics identity). Claude draft assigns it; founder confirms before first publish. |

### `regionalCenters`

One page per Regional Center. This collection carries live contact data, so it
has the strictest freshness machinery on the site.

| Field | Type | Notes |
|---|---|---|
| `rcId` | enum, **required** | One of the 21 canonical IDs: `alta-california`, `central-valley`, `east-bay`, `eastern-la`, `far-northern`, `golden-gate`, `harbor`, `inland`, `kern`, `lanterman`, `north-bay`, `north-la`, `orange-county`, `redwood-coast`, `san-andreas`, `san-diego`, `san-gabriel-pomona`, `south-central-la`, `tri-counties`, `valley-mountain`, `westside`. The enum is closed — a typo fails the build. Set once by Claude draft; never changes. |
| `rcName` | string, **required** | Official display name, e.g. `"Harbor Regional Center"`. Verify against the RC's own site — several centers' legal names differ from their common names. Founder verifies. |
| `counties` | string array, **min 1** | Counties (or sub-county service areas, for the LA-region centers) the RC serves. Verify against the DDS listing. Founder verifies. |
| `intakePhone` | string or `null`, default `null` | **The center's MAIN line**, formatted as it should be dialed. Policy (owner, 2026-09-07): publish the main/general number, NOT a dedicated intake queue — a main line is always answered and can transfer, while an intake line may be voicemail, or age-gated and wrong for the caller (several centers run separate 0–3 and 3+ intake lines). The field keeps its name for compatibility. **Never drafted from memory or training data — the YMYL rule.** Stays `null` (or a bracketed `[TBC …]` note in pre-publish statuses) until verified against the RC's own site; must be a real verified value or `null` at publish. Founder/script verifies. |
| `intakeUrl` | URL or `null`, default `null` | The RC's own intake/eligibility page. Must be a valid URL (schema-validated) — a `[TBC]` string fails the build here, so unverified means `null`. Founder verifies. |
| `ddsListingUrl` | URL or `null`, default `null` | This RC's entry on the DDS website — the independent cross-check for the contact data. Founder verifies. |
| `verifiedAsOf` | date **or `null`** | When the contact data (`rcName`, `counties`, `intakePhone`, `intakeUrl`, `ddsListingUrl`) was last actually verified. **`null` means never verified** — the honest state for a stub whose data is still an authored guess. See [freshness tiers](#verifiedasof-freshness-tiers) — CI-enforced. Founder (or a verification script) sets a date **only** after real verification, never as a drive-by bump. A page cannot publish with `null` here: the schema rejects it, so an unverified center can never reach a family. |
| `notAffiliated` | literal `true`, default `true` | Renders the "Waypoint is not affiliated with this Regional Center or with DDS" notice. The type is `z.literal(true)`: it cannot be set to `false` — attempting to fails the build. Exists so the disclaimer can never be silently dropped. Script/schema owns it; humans leave it alone. |

### `research`

| Field | Type | Notes |
|---|---|---|
| `datasetUrl` | string or `null`, default `null` | Link to the underlying published dataset (public repo, CSV, or source-agency file) so readers can check the work. `null` while the dataset isn't yet published — but a research page should rarely publish without one. Founder fills. |
| `methodologyKey` | string or `null`, default `null` | Joins the article to its methodology writeup (shared methodology pages serve multiple articles). Stable kebab-case key, e.g. `pos-disparity-v1`. Claude draft proposes; founder confirms. |

Note `research` has no `pillar` — research pages hang off the research hub, not
a pillar hub.

### `legal` collection (separate schema)

Legal pages (privacy policy, terms, disclaimer library) use a deliberately
lighter schema — no status ladder, no `review` block, no `sources`. The
governing discipline is different: **legal copy changes only via counsel**, and
the process control is the PR (counsel-reviewed text lands verbatim), not a
frontmatter state machine.

| Field | Type | Notes |
|---|---|---|
| `title` | string, max 70, **required** | Same as base. |
| `description` | string, 40–160, **required** | Same as base. |
| `locale` | `'en' \| 'es'`, default `'en'` | Same as base. |
| `translationKey` | string, **required** | Same hreflang join as everywhere else — legal pages get ES versions too. |
| `dateModified` | date, **required** | Same as base. |
| `lastLegalReview` | date or `null`, default `null` | When counsel last reviewed this exact text. `null` only while a page is pre-launch. Founder transcribes counsel's date. |
| `reviewedBy` | string or `null`, default `null` | Counsel identification, as it should be recorded (e.g. firm name). Founder transcribes. |

House rule (convention, not schema-enforced): don't merge changes to a `legal`
page body without updating `lastLegalReview`/`reviewedBy` in the same PR.

---

## `translationKey` and the hreflang join

How EN and ES versions of a page find each other:

1. Both files live in the **same collection** and share the **same
   `translationKey`**, with different `locale` values. Filenames and slugs are
   free to differ per language (`guides/en/rc-assessment.mdx` ↔
   `guides/es/evaluacion-centro-regional.mdx` — path layout is an engineering
   convention, not a schema rule).
2. At build time, a script pairs pages on
   `(collection, translationKey)` and emits reciprocal
   `<link rel="alternate" hreflang="en|es">` tags plus an `x-default`.
3. **Set `translationKey` on the EN page at draft time, before the ES twin
   exists.** The schema makes it required for exactly this reason: when the
   translation lands months later, the join already works with zero edits to
   the published EN page.
4. A page whose twin doesn't exist yet simply emits no alternate — nothing
   breaks, nothing to clean up later.

Rules: kebab-case, language-neutral (describe the topic, not the English
title), unique within its collection per locale, and **write-once** — changing
it after publish severs the pair.

Translation ≠ shortcut: an ES page is a full YMYL item. It gets its own status
ladder, its own `review` block (bilingual or ES-competent reviewer), and it
**counts against the cadence cap** like any other reviewed item.

---

## `verifiedAsOf` freshness tiers (regional-centers only)

> **Why the field is nullable (changed 2026-09-07).** It used to be a required
> non-nullable date, so an unverified stub had no way to say so — it had to
> carry *some* date. All 21 RC stubs were generated carrying the same
> `2026-09-06`, and a verification pass later found four of them had never been
> checked against any source at all. A required date field had quietly
> manufactured twenty-one verification claims, and the freshness tiers below
> were measuring the age of a fiction. `null` now says "never verified", and the
> publish refinement blocks `null` from shipping — so honesty is free before
> publish and the guarantee at publish is exactly as strong as before.


Contact data goes stale silently — an RC changes its intake number and no
build fails. `verifiedAsOf` plus a CI check is the countermeasure. The check
compares `verifiedAsOf` to the current date:

| Age | Tier | CI behavior |
|---|---|---|
| ≤ 120 days | Fresh | Passes silently. |
| > 120 days | **Warn** | CI emits a warning on builds and PRs naming the stale page(s). Queue a re-verification. |
| > 180 days | **Block** | CI **fails any PR that edits that page** until the contact data is re-verified and `verifiedAsOf` updated. You cannot ship other changes to a page while its contact data is this stale — the re-verification rides in the same PR. |

What a re-verification actually is (bumping the date without doing this
defeats the entire mechanism):

1. Open `intakeUrl` and the RC's own contact page — confirm the intake phone
   and URL still match; confirm `ddsListingUrl` still resolves and agrees.
2. Update any field that changed; add a `changelog` entry describing what
   changed (or "re-verified, no changes").
3. Set `verifiedAsOf` to the date you actually checked. Bump `dateModified`
   only if page content changed.

`verifiedAsOf` ≠ `dateModified`: a page can be edited daily and still have
stale contact data, and vice versa.

---

## Worked example 1 — a published guide

`src/content/guides/en/rc-assessment-request.mdx` (illustrative — reviewer
identity and SHA are placeholders):

```yaml
---
title: "How to Request a Regional Center Assessment"
description: "What happens after you call intake, the Lanterman Act timelines that protect you, and exactly what to say and send."
locale: en
translationKey: rc-assessment-request
status: published
author: Mike Beebe
pillar: regional-centers
review:
  reviewedBy: "[Reviewer full name]"
  credential: "[Specific credential, e.g. attorney, CA licensed — as attested]"
  date: 2026-08-28
  versionReviewed: "3f9c2ab"
datePublished: 2026-09-02
dateModified: 2026-09-02
nextReviewEvent: annual
sources:
  - label: "WIC § 4643 — Regional Center assessment timeline"
    url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=4643"
    accessed: 2026-08-25
changelog:
  - date: 2026-09-02
    note: "Initial publication."
disclaimerVariant: legal
noindex: false
---
```

Why this validates: `status: published` and `review` is complete (the refine
passes); `description` is within 40–160; `translationKey` is set even though
`guides/es/` doesn't have the twin yet — when
`solicitar-evaluacion-centro-regional.mdx` lands with
`translationKey: rc-assessment-request` and `locale: es`, hreflang pairs them
automatically.

## Worked example 2 — a regional-center page mid-review

`src/content/regional-centers/en/harbor.mdx`, at the `in_review` rung —
contact data verified, reviewer sign-off pending:

```yaml
---
title: "Harbor Regional Center: Intake, Eligibility, and Contacts"
description: "How to start intake at Harbor Regional Center, the areas it serves, and the timelines the Lanterman Act gives your family."
locale: en
translationKey: rc-harbor
status: in_review
author: Mike Beebe
rcId: harbor
rcName: "Harbor Regional Center"
counties:
  - "[TBC — confirm exact service area wording against DDS listing]"
intakePhone: null           # fill only with a number verified on the RC's own site
intakeUrl: null             # must be a valid URL or null — [TBC] strings fail the build
ddsListingUrl: null         # [TBC — link this RC's entry on dds.ca.gov]
verifiedAsOf: 2026-09-01
notAffiliated: true
review: null                # in_review: sign-off pending — publishing now would fail the build
datePublished: null
dateModified: 2026-09-04
nextReviewEvent: rc-pos-annual
sources: []
changelog: []
disclaimerVariant: legal
noindex: false
---
```

Why this validates *now* but could not publish: the refine only bites at
`status: published`, so `review: null` is fine mid-ladder. Before this page can
flip to `published`: every `[TBC]` and `null` contact field resolved with
verified values (or a deliberate `null`), `review` filled from the sign-off,
`datePublished` set, and `verifiedAsOf` current (it is — 5 days old, fresh
tier). Note `intakeUrl`/`ddsListingUrl` accept only real URLs or `null`, so
unverified-but-drafted values are impossible by construction; `intakePhone` is
a free string, so the "verified or null" rule there is discipline, backed by
the publish checklist.

---

## Quick pre-publish checklist

- [ ] `status: published` and `review` block complete (`versionReviewed` = the SHA the reviewer actually saw)
- [ ] No `[TBC]` anywhere in frontmatter or body
- [ ] `datePublished` set; `dateModified` current; `changelog` has the entry
- [ ] `translationKey` set and language-neutral (twin can join later)
- [ ] Every claim in the body has a `sources` entry with a fresh `accessed` date
- [ ] `pillar` / `letterId` match the D3 analytics taxonomy exactly
- [ ] Regional-center pages: `verifiedAsOf` within 120 days
- [ ] This publish fits within the reviewer-throughput cadence cap
