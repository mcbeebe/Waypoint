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
npm run dev          # dev server (drafts visible)
npm run gates        # check + tests + drafts build + production build + keyword map — the CI gate
npm test             # vitest (pure modules: deeming math, deep-link builder)
npm run build        # production build — publishes ONLY status:published content
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
always built but ship `noindex` + a draft banner until their copy passes
expert review (flip both, plus the sitemap exclusion in `astro.config.mjs`,
in the review PR).

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
