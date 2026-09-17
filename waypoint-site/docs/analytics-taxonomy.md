# Analytics taxonomy & deep-link contract (Decision D3 — FROZEN)

**This document is the single source of truth** for event names, properties, and the
deep-link parameter contract across waypointchild.com (site) and
app.waypointchild.com (product). Never add an event, prop, or param outside this
doc. Both repos link here from code comments. Changing this contract requires
editing this doc first, in its own PR, with both sides' parsers updated in the
same change.

## Providers

**Plausible remains the source of truth** for the event taxonomy below and for
the north star metric. **GA4 is a second, additional tracker** (added 2026-09,
site-only) for acquisition/audience reporting Plausible doesn't cover — it is
not a replacement and does not change any event name, prop, or the north star
definition. Every event listed below fires to both providers: `BaseLayout.astro`
mirrors each `window.plausible(...)` call to `gtag('event', ...)` with the same
name and props at a single dispatch point, so no per-event code exists in two
places. GA4 loads only when `VERCEL_ENV === 'production'`, the same gate as
Plausible — that gate, not the ID, is what keeps preview/branch QA traffic out
of the property. Google Signals / ad personalization are left off in both the
GA4 property config and the per-call `gtag('config', ...)` options, matching
the privacy posture Plausible was chosen for.

The Measurement ID is **committed in `BaseLayout.astro`**, not held in an env
var: gtag.js publishes it in the markup of every page, so it is public by
construction and there is nothing to protect. This is deliberate — it keeps the
production tag working without a deploy-time secret. `GA_MEASUREMENT_ID`
overrides it when a build needs to point at a different property.

## Site-side events (Plausible, cookieless, data-domain: waypointchild.com)

| Event | Props | Fires when |
|---|---|---|
| `read_complete` | `slug`, `pillar`, `locale` | 75% scroll depth AND ≥45s dwell on an article page. Heuristic is versioned here (v1); never compare across heuristic versions. |
| `tool_started` | `tool_id`, `locale` | First meaningful input in a tool island |
| `tool_completed` | `tool_id`, `locale`, `outcome?` | Result rendered (decision trees pass the outcome node id) |
| `letter_copied` | `letter_id`, `locale` | Copy button success |
| `newsletter_subscribe` | `source` | Confirmed double-opt-in only (not form submit) |
| `app_signup_click` | `slug`, `pillar`, `locale`, `cta_id`, `tool_id?` | Any deep-link CTA into the app |
| `search_used` | `locale` | Pagefind query submitted |
| `js_error` | `page`, `message_hash` | window.onerror / unhandledrejection beacon |
| `not_found` | `path` | 404 page render |

## Deep-link parameter contract (site → app)

Every `app_signup_click` CTA links to `https://app.waypointchild.com/start` with:

| Param | Content | Notes |
|---|---|---|
| `wp_slug` | Originating page slug | required |
| `wp_pillar` | Pillar enum value | required on pillar content |
| `wp_cta` | CTA identifier (e.g. `guide-footer`, `tool-result`, `checklist`) | required |
| `wp_locale` | `en` \| `es` | required |
| `wp_ctx` | base64url JSON context payload | optional |
| `utm_source=site`, `utm_medium=organic-content` | Fixed values | required |

`wp_ctx` payload shapes (versioned by `v` field):
- Checklist: `{v:1, kind:'checklist', slug, checked:[itemId,...]}`
- Tool result: `{v:1, kind:'tool', tool_id, inputs_summary, result_summary}` — summaries
  only, never raw benefit figures typed by the user (privacy: the site is stateless;
  what crosses the boundary is the minimum needed to prefill onboarding).
- Guide: `{v:1, kind:'guide', slug, next_action}`

**Redirect survival requirement:** params MUST survive the app's auth flows —
including Apple Sign-In and OAuth redirects. The app persists the payload
(sessionStorage or state param) at first touch on `/start`, BEFORE auth begins.
Tested explicitly per auth path; re-verified in the monthly reconciliation.

## App-side events (same Plausible data-domain + Supabase)

GA4 mirroring is site-only for now — waypoint-app has no web analytics
surface, so app-side events below stay Plausible + Supabase only.

| Event | Props | Fires when |
|---|---|---|
| `account_created` | `first_touch_source` | Signup completes |
| `first_plan_saved` | `first_touch_source` | The activation qualifier for the north star |

## First-touch attribution (Supabase, write-once)

On signup, the app writes `first_touch` (jsonb) to the user-level record ONCE and
never overwrites it:

```json
{
  "source": "site",
  "medium": "organic-content",
  "landing_slug": "...",
  "wp": { "slug": "...", "pillar": "...", "cta": "...", "locale": "en", "ctx": {} },
  "captured_at": "ISO-8601"
}
```

Migration SQL lives at `docs/first-touch-migration.sql` (applied via waypoint-app's
migration sequence and gates — numbered at apply time, per D6).

## North star

**Organic-attributed created accounts per week, qualified by `first_plan_saved`.**
Supabase (`first_touch`) is the source of truth; Plausible is directional.
Reconciled monthly to within ±10%; known leakage (direct app visits, param
stripping) documented here as discovered:

- (none logged yet)
