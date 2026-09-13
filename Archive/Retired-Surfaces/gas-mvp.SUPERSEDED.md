# gas-mvp — SUPERSEDED

**Archived:** 2026-09-07, by owner decision
**Was:** `gas-mvp/` at the repo root — the Google Apps Script MVP
**Now:** `Archive/Retired-Surfaces/gas-mvp/`
**Superseded by:** `waypoint-app/` (Expo / React Native, Supabase) for the
product, and `waypoint-site/` (Astro, waypointchild.com) for the content and
tools that used to live inside the MVP's chat UI.

## What this was

A single-file Apps Script application — `Code.gs` (~3200 lines, AI engine, user
management, Google Sheets as the database) and `Index.html` (~4800 lines, the
whole SPA including the AI Navigator chat). Twelve sprints of work: tone
calibration, the Entity Navigation Matrix, onboarding, action plans, Spanish and
Vietnamese i18n, email drafts, a QA testing lab. It was the real product for a
while. Deploys were manual copy-paste into the Apps Script editor; `.clasp.json`
existed but was never wired up.

## Why it is archived and not merely retired

The owner confirmed on 2026-09-07 that it no longer serves users and needs no
maintenance. It stayed at the repo root for several months after that stopped
being true, and CLAUDE.md described it as "still serving users" and "Active —
Production" the whole time — which is how a session ended up preparing a
production patch for it.

## Do not treat this as a source of truth

The same day it was retired, a verification pass found its ZIP router
(`Index.html`, `ZIP_TO_RC`) sending:

- the **city of San Diego** (`921`) to Inland Regional Center, two counties away;
- **Long Beach** (`908`) to San Gabriel/Pomona;
- **Santa Monica** (`904`) to North Los Angeles County;
- the **Antelope Valley** (`935`) to Tri-Counties in Santa Barbara;
- all of **Humboldt and Del Norte** (`955`) to North Bay in Napa — Redwood Coast
  Regional Center appears nowhere in its ZIP map at all.

It also lists **Mariposa County** under Valley Mountain Regional Center; DDS and
CVRC both place it in Central Valley. `waypoint-app` carries the corrected
tables with regression tests.

A value repeated here is **not corroboration** for the same value elsewhere. An
adversarial reviewer found a Regional Center phone number appearing in three
repo files — this one included — that turned out to be a single hand-authored
string copied three times in one commit.

## What survives it, and where

- **`Waypoint-Entity-Navigation-Matrix-v9_4.xlsx`** (in this directory) is the
  49-article knowledge base the MVP's AI engine ran on, and it is still a live
  **content source**: the marketing site's Regional Center pages were seeded
  from it, and `waypoint-site/content-ops/reviewer/OUTREACH.md` points a
  credentialed reviewer at it. Being archived does not retire it as a source —
  but it is unverified reference material, never verified data. Its single
  Regional Center row is why all 21 county lists had to be authored and then
  verified against DDS rather than converted.
- The KB content itself (226 Entity Navigation Matrix articles) is already
  seeded in Supabase and serves `waypoint-app`.
- `WayPoint-Dev-Session-EntityKB-v9.4.txt` at the repo root documents the Matrix
  and contains historical absolute paths to this directory's old location. Those
  are a record of what was done and have deliberately not been rewritten.

## Housekeeping

The `ANTHROPIC_API_KEY` this surface used lived in Apps Script Script
Properties, not in this repo. If it is still live, it is worth revoking — no
maintained surface depends on it.
