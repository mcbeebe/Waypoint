# The site build plan — waypointchild.com

**Date:** 2026-09-05 · **Status:** adopted · **Supersedes:** — · **Superseded-by:** —

This is the document of record for the "Waypoint Site Build Plan" artifact
(published Sept 5–6, 2026; synthesized from three independently drafted
workstream plans — engineering/platform, content & SEO ops, launch/compliance/
growth — cross-examined by a critic agent; 13 conflicts resolved in the
decisions register). The companion strategy doc is the "Waypoint Marketing
Site Plan" artifact; the design source of truth is
`Waypoint-Marketing-Site-Prototype.html` (**port, don't redesign**).

## Operating model

- **Where:** `waypoint-site/` in the monorepo. Astro static output, Vercel.
- **Site gates** (`npm run gates`, CI: `.github/workflows/site.yml`):
  `astro check` · vitest · drafts build · production build (Zod frontmatter
  failures fail the build) · keyword-map validator. Phase 1 adds JSON-LD
  validation, hreflang reciprocity, link checking, Lighthouse budgets,
  axe-core per template. Green gates → auto-PR-and-merge per repo convention.
  **Exception:** `content-review` PRs wait for the credentialed reviewer —
  never auto-merged.
- **Content is code:** MDX through the status ladder
  `draft → founder_edit → in_review → approved → published`, schema-enforced.
  Nothing YMYL publishes without a reviewer recorded in frontmatter.
- **The cadence cap is the reviewer's throughput** — counting everything in
  the review queue (guides, answers, entity batches, letters, ES twins,
  re-reviews). ~4–8 reviewed items/week max once batches flow.

## Decisions register (binding)

| ID | Decision |
|----|----------|
| D1 | Directory: `waypoint-site/`, everywhere; content-ops lives under it |
| D2 | One content schema: `src/content.config.ts` (locale + translationKey + status ladder + review block + changelog + nextReviewEvent + sources). Content-ops owns semantics (`content-ops/SCHEMA.md`); engineering wires it |
| D3 | One analytics & deep-link contract: `docs/analytics-taxonomy.md` — frozen before HandoffCTA or the app-side parser |
| D4 | One constants file: `src/data/benefit-constants.json` (null-until-verified). The SSI calculator binds to it; January COLA refresh = constants flip |
| D5 | Legal pages are content: MDX `legal` collection via LegalLayout |
| D6 | First-touch migration written once, applied through waypoint-app's gates, numbered at apply time |
| D7 | Cutover moves to week 3 (front of Phase 1) — the indexation clock starts when pages live on the apex |
| D8 | Phase 0 is two weeks; DNS/zone control first, before anything that writes DNS records |
| D9 | One accessibility statement: initial WCAG 2.2 AA statement in Phase 1 (axe CI + manual pass); the Phase 2 external audit updates the same page |
| D10 | One style guide: `content-ops/STYLE-GUIDE.md`, incl. the disability-language decision — due before piece #8 |
| D11 | One Regional Center data spine: entity MDX frontmatter is the source; finder/tables derive from it at build. No hand-typed county maps |
| D12 | ES IEP letter drafted in Phase 1, publishes as an /es/ page when Phase 2 i18n routing lands (the EN page's toggle ships the ES text sooner) |
| D13 | Newly owned items: /product/ + pricing decision (Mike), app-side save-and-continue work, app noindex, Plausible sub, domain custody, email forwarding, GSC API account, social profiles, chat-mining consent question in the counsel packet, newsletter authorship, freshness-fix slot. **Pricing DECIDED 2026-09-06 (owner, in session): Plus $4.99/mo, Pro $9.99/mo — half the prototype figures — with a 3-month free trial on both.** Yearly prices halved to $44.99/$89.99 by the same instruction, pending explicit confirmation. Billing (Stripe / App Store products, trial mechanics) must be set to match before any real checkout — owner dashboard action; the site only states the prices. |
| D14 | Hosting: **Vercel, not Cloudflare** (settled 2026-09-06). Second Vercel project, root `waypoint-site`, DNS stays at Namecheap, no nameserver migration |

## The phase clock

| Phase | Calendar | Headline outcome |
|---|---|---|
| 0 · Foundation | Sept 8–19, 2026 | Deployable token-true skeleton, CI, schema + analytics contracts, legal drafts to counsel, reviewer outreach out, DNS control |
| 1 · Build & wedge | Sept 22 – Oct 31 | Cutover early; 12 pages + 2 tools live; guides #1–7 through the full review loop; attribution verified end-to-end |
| 2 · Authority & Español | Nov 2026 – mid-Jan 2027 | First 10 complete · 21 RC pages · /es/ live with credited review · COLA + Jan 1 refresh sprints executed · 40–55 published pages |
| 3 · Moats & amplification | Jan – Jun 2027 | POS-disparity study + press push · embeddable calculator · static answer layer · north-star closed loop · Vietnamese go/no-go memo |

## Phase 1 — build & wedge content (current)

**Engineering:** week-3 domain cutover per `waypoint-site/docs/redirect-map.md`
(Phase A app-noindex shipped in #203/#204) · component port + article
primitives + layouts + the 12 routes at prototype parity · stateless
interactive tools bound to D4/D11 (zero network) with unit tests · SEO
plumbing (JSON-LD suite — no FAQPage; build-time OG images; Pagefind; RSS;
per-locale sitemaps with hreflang) · CI hardening (JSON-LD validator,
hreflang reciprocity, linkinator, Lighthouse budgets, axe-core) ·
accessibility pass → initial `/accessibility/` statement · content
scaffolding CLI.

**Content:** wedge pieces #1–7 in order (First 100 Days → IHSS protective
supervision → Medi-Cal deeming → IEP evaluation letter → SSI + calculator →
RC appeals → IPP prep). #1–5 may draft pre-reviewer but **hold at
approved-pending until countersigned; guides do not publish unreviewed,
ever**. Sign the reviewer (Mike closes). Entity Matrix conversion → 21 stubs,
first 5 enriched + reviewed. 12 letters extracted, first 6 through review.
Disability-language decision before piece #8. First 3 answers from interim
sources. /product/ copy once Mike confirms pricing.

**Compliance/growth:** legal pages live before article #1 · tool a11y specs
before islands are built · events QA'd in Plausible · stateless-tools claim
verified and stated in /privacy/ · first-touch migration through app gates +
one full attribution loop verified (Apple Sign-In path specifically) ·
go/no-go checklist run before article #1 and before the tools announce.

**Exit gate:** apex live with all 12 pages at prototype parity · both tools
working, stateless, completion events flowing · guides #1–7 published with
reviewer sign-off in frontmatter · 21 entity stubs, first 5 live · ≥6 letters
live · CI green and auto-deploying · one attributed signup verified in
Supabase · initial conformance statement published.

**If the reviewer isn't signed by week 6:** throughput shifts (entities,
letters, answers continue; guides queue at approved-pending) — it never
publishes unreviewed.

## Phases 2–3 (summary)

Phase 2: i18n routing + /es/ with credited human review (letters first) ·
EntityLayout + all 21 RC pages with freshness enforcement · respite-hours
table + CSV + Dataset JSON-LD · SB 946 decision tree (after the language
decision) · October COLA + January FBR/IHSS refresh sprints under the
standing pre-approval clause · chat-mined answers gated on the live privacy
disclosure · backup reviewer signed · weekly growth report + monthly
AI-citation audit. Phase 3: the POS-disparity study (data → findings →
validation → PTI/FRC-weighted outreach) · /embed/ calculator · static
pre-approved answer layer · reviewer-gate CI flips to blocking · RUNBOOK ·
north-star reconciliation (Supabase source of truth, Plausible directional) ·
May Revise / June budget sprints · Vietnamese go/no-go memo.

## App-side workstream (own gates, waypoint-app)

Phase 1 (blocks attribution verification): `/start` deep-link route on
app.waypointchild.com, D3 `wp_*` parser, write-once first-touch surviving
OAuth/Apple redirects, `account_created` + `first_plan_saved` events,
Plausible on the shared data-domain. Phase 2: restore checklist state from
ctx, prefill onboarding, the "saved plan" confirmation moment.

## Budget (headline)

Credentialed reviewer ~$10–15K yr 1 (the critical path and largest cash
line) · Spanish reviewer $200–500/mo from Phase 2 · counsel one-time $1.5–3K ·
external WCAG audit $2–5K · Plausible/ESP/PO box ~$30–60/mo · hosting ~$0 on
the existing Vercel Pro. TBC figures are approval framing, not quotes.

## SPOFs & degraded mode

The reviewer (backup signed mid-Phase 2; pre-approval clause for constants) ·
Mike (degraded mode: refresh sprints + light-review work take the slots;
nothing publishes unreviewed; the cadence cap just drops) · Entity Matrix
(inspect structure; WebFetch-verify every contact; stamps CI-enforced) · the
attribution contract (one frozen doc; Apple path tested; Supabase is truth) ·
platform accounts (2FA + recovery codes) · counsel (packet sent complete;
chase at two weeks).

## Execution log

| Date | PR | What shipped |
|---|---|---|
| 2026-09-06 | #200 | Phase 0 foundation: scaffold, D2/D3 contracts, content-ops rails, compliance drafts, site CI |
| 2026-09-06 | #201 | D14: host on Vercel, not Cloudflare |
| 2026-09-06 | #202 | Redirect-map A2b: auth continuity for the app host move |
| 2026-09-06 | #203 | Phase A noindex: de-index the app deployment |
| 2026-09-06 | #204 | noindex all *.vercel.app hosts until the apex launch |
| 2026-09-06 | #206 | Phase 1a: component port, layouts, 12 routes at prototype parity, draft-gated builds, both tools (calculator pending-verified constants), D3 CTA builder + events, draft MDX for 6 pages, vitest — plus the full adversary pass (11 findings fixed; memo in the PR) |
| 2026-09-06 | #207 | D13 pricing decided by the owner: Plus $4.99/mo, Pro $9.99/mo, 3-month free trial — /pricing/ tier grid unlocked in production; competitor comparison stays preview-only until verified (checklist row 25) |
| 2026-09-06 | #208 | Wedge drafts #3 (Medi-Cal institutional deeming) + #5 (SSI for children; zero dollar figures until D4 constants verify). #6+ held for the reviewer per plan |
| 2026-09-06 | #209 | 20 RC draft stubs — the D11 county spine AUTHORED (plan correction: the Entity Matrix has one RC row, nothing to convert); counties [TBC] pending DDS verification; finder county map complete in preview |
| 2026-09-06 | #210 | SEO/CI tranche: Pagefind search (+/search/, search_used), RSS (published-only), axe-core CI gate (checklist row 8 — fails on serious/critical; its first run caught and fixed 24 real WCAG issues: handoff/draft-banner contrast, underlines for in-text links, .soon states), content scaffolder (`npm run new`, enforces no-row-no-draft). The D9 /accessibility/ statement still waits on the manual keyboard/VoiceOver pass (human step) |

| 2026-09-07 | #221 | Founder approval recorded on the three wedge pages (status→founder_edit) + fact-check pass across all 29 drafts: 45-day Early Start clock re-attributed to 17 CCR §52086 (was WIC §4643), NOA appeal windows updated to the 2023 rule (60d / 30d aid-paid-pending, WIC §4710.5), IHSS 195/283 + SOC 873 framing fixed, sources[] receipts added |
| 2026-09-07 | #222 | **FIRST CONTENT PUBLISH.** `/start/autism/`, `/letters/iep-evaluation-request/` (EN only) and `/guides/benefits/` go live on the apex with founder-signed review blocks; SSI deeming calculator launched with verified 2026 constants (noindex + draft banner removed); new `GatedLink` renders published→draft spoke links as honest "coming soon" text |
| 2026-09-07 | #223 | Hotfix of the live pages from the post-merge adversarial review: calculator prose described the deeming steps in the REVERSE order of the code (~$500/mo discrepancy against its own tool); `/guides/benefits/` published with zero inbound links (orphan — the guides index gated its card on a draft spoke); `GatedLink` dropped `class`, turning a 4-of-4-gated SideCard into dead grey text; engineering notes (`esReady=false`) rendering to parents in public changelogs; a hard-coded CCS `$40,000` (D4); a miscited WIC §4512(b); the unresolved `[TBC]` inside the live algorithm. Plus the two gate gaps behind them — axe now scans the production build too, and `check-sitemap-noindex.mjs` enforces sitemap ∩ noindex = ∅ |

**Owner decision (2026-09-07) — publish gate for the first three pages.**
Asked directly how the D2 review gate should apply to the founder-approved,
fact-checked wedge pages now that the apex is live, the owner chose:
**"Publish, I'm the reviewer"** — the review block on `/start/autism/`,
`/letters/iep-evaluation-request/`, and `/guides/benefits/` is signed
`Mike Beebe, Founder` (versionReviewed daab5050). This narrows, for these
three pages, what the review block attests: founder review + snippet-level
source verification (receipts in sources[]), not an outside credentialed
expert. An expert sign-off remains wanted and replaces the founder block
when it lands. Two companion decisions: the **Spanish letter text does not
render** until the credited bilingual reviewer signs (LetterBlock
esReady={false} shows an "en revisión" notice), and — revised when the
question was re-asked — the **2026 SSI constants populate now** from the
snippet-level verification (FBR $994/$1,491, child allocation $497), so
the deeming calculator computes live; the SSA/CDSS links stay in the
constants file for anyone to re-verify.

**Process lesson (2026-09-07) — the gates certified a build nobody ships.**
Every visual and accessibility gate ran only on `build:drafts`. `GatedLink` is the
first component whose output differs by publish state: a real `<a>` under the drafts
flag, a placeholder span in production. Its production rendering therefore existed in
no build any gate had ever scanned, and in no Vercel Preview a human reviewed — so a
sidebar of dead grey text passed every check and shipped. `npm run gates` now runs the
full axe pass against the production build as well. **Any component that branches on
publish state must be scanned in the build real families get**, and preview approval is
not evidence about production for such a component.

A second, blunter lesson: the adversarial review was launched before the merge and lost
across a session boundary, and the merge went ahead without it. Its findings were all
real, and four were live-visible. The `/adversary` memo is a gate, not a formality — if
it has not reported, the change has not been reviewed.

**Recorded deviation (2026-09-06):** the two launch tools are framework-free
Astro `<script>` islands over pure tested modules, not Preact components as
the Phase 1 card sketched — two forms with a result panel don't earn a
framework runtime. Revisit when the SB 946 DecisionTree lands (Phase 2),
where stepped state does.
