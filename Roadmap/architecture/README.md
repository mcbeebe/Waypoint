# Architecture reference

Date: 2026-09-03
Status: adopted
Supersedes: —
Superseded-by: —

## Documents

| Document | What it covers | Form |
| --- | --- | --- |
| `waypoint-system-map.html` | Front-end user flow, back-end architecture, and the three data flows (Navigator turn, app-closed reply loop, entitlements) | HTML, published as an Artifact |

Published Artifact: <https://claude.ai/code/artifact/0db3e16b-8451-4dc3-bd65-18316216c868>

## Why HTML and not Markdown

The repo's documents-of-record rule is markdown-first because Word/Excel/PowerPoint are
opaque blobs with no diff. Hand-authored HTML is not — it is plain text, reviewable line by
line in a PR, and it is the only form that can carry the seven inline-SVG diagrams that are
most of this document's value. It is the document, not an export of one.

## How it was produced, and how to re-verify it

Every count and claim was read out of the working tree at commit `469b043`, not recalled.
To re-check the figures after the code moves:

```bash
cd waypoint-app
find src/screens -name '*.tsx' ! -name '*.test.tsx' | wc -l   # screens        58
find src/hooks   -name 'use*' ! -name '*.test.*'   | wc -l    # hooks          38
ls supabase/migrations/*.sql                       | wc -l    # migrations     59
ls -d supabase/functions/*/ | grep -v _shared      | wc -l    # edge functions  8
grep -hoiE "create table (if not exists )?(public\.)?[a-z_]+" \
  supabase/migrations/*.sql | awk '{print $NF}' | sort -u | wc -l   # tables    63
npx vitest run                                                # 1205 / 105 runs
```

The design tokens and typefaces are the app's own, read from `waypoint-app/src/lib/theme.ts`
(`brand` palette; Newsreader + Hanken Grotesk), so the document renders in the product's
identity rather than a generic one.

## Keeping it true

This document names specifics that drift: table and screen counts, the model per `ai-proxy`
action, the tier prices, the cron interval, the `verify_jwt` matrix. A PR that changes any of
those should update this document in the same PR, the same way `CLAUDE.md`'s repository map is
maintained.
