# waypoint-site — waypointchild.com

The marketing/content site for Waypoint (Astro, static output, Vercel). The
design source of truth is `Waypoint-Marketing-Site-Prototype.html` at the repo
root — **port it, don't redesign it**. The plan of record is
`Roadmap/initiatives/008-marketing-content-site/`.

## Frozen contracts

- **Content schema (D2):** `src/content.config.ts`, documented in
  `content-ops/SCHEMA.md`. A page missing SEO/review frontmatter fails the
  build; `status: published` requires a completed review block.
- **Analytics + deep links (D3):** `docs/analytics-taxonomy.md`. Every event
  and `wp_*` param comes from that doc — change the doc first, in its own PR.
- **Benefit figures (D4):** `src/data/benefit-constants.json` only. Current-year
  values ship `null` until verified; consumers must render a pending state.

## Commands

```bash
npm run dev          # dev server (drafts visible; search index absent until a build)
npm run gates        # check + tests + [TBC] ratchet
                     #   + drafts build     -> link check + axe scan
                     #   + production build -> link check + axe scan --production
                     #   + sitemap∩noindex + keyword map — the CI gate
                     # BOTH builds are scanned on purpose: a component that branches on
                     # publish state (GatedLink) renders differently in production, and a
                     # drafts-only scan once certified a card that was dead text when live.
npm test             # vitest (pure modules: deeming math, deep-link builder)
npm run axe          # drafts build + axe scan of every page (fails on serious/critical;
                     #   fresh clones need `npx playwright install chromium` once)
npm run new -- guide benefits/my-slug   # scaffold a draft (keyword-map row required first)
npm run build        # production build + Pagefind index — publishes ONLY status:published
npm run build:drafts # preview build — drafts render with banners + noindex
```

## The publish gate (how drafts work)

Content collections (guides, answers, letters, regional-centers, research)
render **only** entries with `status: published` — unless the build runs with
`WAYPOINT_SHOW_DRAFTS=1` (dev servers set it implicitly). Draft pages carry a
visible red banner and `noindex`. Hub pages, the header, and the footer link
only to pages that exist in the current build; gated cards show "Publishing
soon". This makes launch-checklist row 17 ("every publicly rendered YMYL page
is published + reviewed") true by construction.

**Vercel setup:** set `WAYPOINT_SHOW_DRAFTS=1` on the *Preview* environment
only, so PR previews show work-in-progress and production never does.

The two `/tools/` pages are product surfaces, not collection content: they are
always built, and each carries `noindex` + a draft banner until its data and
copy are signed off. The **SSI deeming calculator** cleared that on 2026-09-07
(verified 2026 constants + owner sign-off) and is now indexed; the **Regional
Center finder** still ships `noindex` pending county-spine verification. When
a tool flips, three things move together — the `noindex`, the draft banner,
and the exclusion in `astro.config.mjs`'s sitemap filter — and
`scripts/check-sitemap-noindex.mjs` fails the build if they get out of step.

**A published page may link to an unpublished one** via `GatedLink`: it renders
a real link when the target exists in the build and honest "(in review — coming
soon)" text when it does not, so the link appears by itself the moment the
target publishes. It throws at build time on an href matching no content entry
at all — the internal-link checker only sees `<a href>` in `dist`, so a typo
would otherwise be an invisible permanent placeholder. Because its output
differs between the two builds, it is the reason `gates` scans both.

## Layout of the code

```
src/
├── content.config.ts   # D2 schema (frozen contract)
├── content/            # MDX: guides (start/* → /start/), answers, letters,
│                       #   regional-centers, research, legal
├── components/         # Prototype-ported primitives (Cite, AnswerFirst,
│                       #   TrustBlock, HandoffCTA, LetterBlock, CheckItem, …)
├── layouts/            # BaseLayout (shell + analytics), ArticleLayout
│                       #   (trust chrome + JSON-LD + read_complete), LegalLayout
├── lib/                # content.ts (publish gate), appLinks.ts (D3 builder),
│                       #   jsonld.ts, ssiDeeming.ts (+tests), benefitConstants.ts,
│                       #   regionalCenters.ts (D11 spine)
├── pages/              # routes; tools are .astro pages with inline islands
└── styles/global.css   # brand tokens + the prototype-ported design system
content-ops/            # keyword map (+CI validator), pipeline SOP, style guide,
                        #   reviewer docs, refresh calendar
docs/                   # analytics taxonomy (D3), redirect map, launch checklist,
                        #   legal review packet, compliance components
```

## Content workflow (short version — full SOP in content-ops/CONTENT-PIPELINE.md)

keyword-map row → Claude draft (`status: draft`, `[TBC]` on every unverified
fact) → founder edit (verify every `[TBC]`, fill `sources[]`) → `content-review`
PR + email packet → transcribe sign-off into the `review` block → `published`.
Nothing YMYL publishes without the review block — the schema enforces it.
