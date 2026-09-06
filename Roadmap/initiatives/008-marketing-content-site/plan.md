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
| 2026-09-06 | (this PR) | D13 pricing decided by the owner: Plus $4.99/mo, Pro $9.99/mo, 3-month free trial — /pricing/ tier grid unlocked in production; competitor comparison stays preview-only until verified (checklist row 25) |

**Recorded deviation (2026-09-06):** the two launch tools are framework-free
Astro `<script>` islands over pure tested modules, not Preact components as
the Phase 1 card sketched — two forms with a result panel don't earn a
framework runtime. Revisit when the SB 946 DecisionTree lands (Phase 2),
where stepped state does.
