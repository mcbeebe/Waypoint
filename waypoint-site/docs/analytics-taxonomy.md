# Analytics taxonomy & deep-link contract (Decision D3 — FROZEN)

**This document is the single source of truth** for event names, properties, and the
deep-link parameter contract across waypointchild.com (site) and
app.waypointchild.com (product). Never add an event, prop, or param outside this
doc. Both repos link here from code comments. Changing this contract requires
editing this doc first, in its own PR, with both sides' parsers updated in the
same change.

## Providers

**Plausible is the source of truth** for the event taxonomy below and for the
north star metric. Every event listed below fires through `window.plausible`
and nowhere else.

**GA4 was tried and removed.** Added mid-September 2026 as a second tracker
for acquisition/audience reporting (PRs #278, #285), it never sent a hit until
the CSP fix (PR #297) merged on the evening of 2026-10-02 PT, then set `_ga` /
`_ga_<id>` cookies on every visitor for a week while the privacy policy
promised "No cookies". PR #304 (2026-10-09) switched it to consent-denied
cookieless mode; the owner then decided to remove it outright the same day
(the PR that deletes `public/ga-init.js`): under the site's zero-gates rule it
could only ever run consent-denied, where Google's standard reports are
modeled from cookieless pings and thin, and "Google Analytics" sat badly
beside "no ad tech" in the policy. `BaseLayout.astro` keeps expiring the
leftover `_ga*` cookies until their own two-year life runs out (2028-10). Do
not re-add a Google tag without changing the privacy policy first — note also
that GA4's Enhanced Measurement "outbound clicks" default would send the
`/start` deep link, `wp_ctx` payload included, to Google.

**Vercel Web Analytics is a page-view counter only** (added 2026-10, site-only:
`<Analytics />` from `@vercel/analytics/astro` in `BaseLayout.astro`). It
exists for the hosting dashboard and carries no event from this document — no
`track()` call anywhere on the site, and none may be added without changing
this contract first. It is not gated to production: Vercel tags every view
with its environment, so preview traffic is filtered in the dashboard rather
than kept out. It changes nothing above: Plausible stays the source of truth.

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

waypoint-app has no web analytics surface, so app-side events below stay
Plausible + Supabase only.

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
