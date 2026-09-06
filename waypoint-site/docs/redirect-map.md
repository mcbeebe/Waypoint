# Domain cutover & redirect map — waypointchild.com

**Status:** plan (pre-execution) · **Audited:** 2026-09-06 · **Owner:** Mike (DNS/Vercel dashboard actions) + Claude (config, verification)
**Hosting decision (D14, 2026-09-06):** the marketing site deploys to **Vercel** (Mike is on Vercel Pro; the app already lives there). DNS stays at **Namecheap** — there is **no nameserver migration** in this plan. The earlier Cloudflare Workers plan is superseded.
**Depends on:** D3 deep-link contract (`docs/analytics-taxonomy.md`) — every redirect in this plan MUST preserve query strings, or first-touch attribution breaks.

---

## 1. Audited current state (2026-09-06)

Do not plan against assumptions. This is what the domain actually does today:

| Fact | Audited value |
|---|---|
| Apex `waypointchild.com` | **308 redirect → `www.waypointchild.com`** (Vercel default apex→www) |
| `www.waypointchild.com` | Serves the **product app** — the Expo/React Native **web build** — on Vercel |
| Nameservers | `registrar-servers.com` (Namecheap BasicDNS — zone is managed at Namecheap) |
| `app.waypointchild.com` | **Does not exist in DNS** (NXDOMAIN) |
| App robots posture | The deployment serves **no robots.txt**; the SPA shell is returned for **every path** (including `/robots.txt`), with no `X-Robots-Tag` |

Consequences of the current state:

- Anything Google has indexed lives on `www.*` and is **app-shell URLs**, not content.
- The app is currently **indexable** (no robots.txt, no noindex). Fixing that is step one, and it is independent of everything else — do it immediately.
- Everything below happens inside Vercel + Namecheap DNS records. No DNS-provider change, no registry-level nameserver caching windows, no soak period.

## 2. Target state

| Host | Serves | Indexing |
|---|---|---|
| `waypointchild.com` (apex) | Marketing/content site (Astro static, **Vercel project `waypoint-site`**) | Indexed. Canonical host. |
| `www.waypointchild.com` | Nothing — **301 → apex** (path-aware, see §5) | Redirect only |
| `app.waypointchild.com` | Product app (existing Vercel project) | **noindex** (X-Robots-Tag + robots.txt disallow) |

## 3. Phase A — stand up `app.waypointchild.com` and de-index the app

Runs first, entirely at Namecheap + Vercel. Zero user-facing risk: `www` keeps serving the app throughout.

### A1. DNS + Vercel domain (Mike + Claude)

1. In the Vercel project for the app: **Add domain** `app.waypointchild.com`. Vercel will show the required CNAME target (currently `cname.vercel-dns.com` — use whatever the dashboard displays at execution time).
2. **[MIKE ACTION — Namecheap Advanced DNS]** Add: `CNAME` · host `app` · value as shown by Vercel · TTL **5 min** (lowest available).
3. Wait for Vercel to show the domain as verified with a certificate issued.
4. Do **not** remove `www` from the app project yet — both hosts serve the app during the transition window.

### A2. noindex the app deployment (Claude, in `waypoint-app`)

Two layers, both required (robots.txt controls crawling; the header controls indexing — belt and suspenders because the SPA currently swallows every path):

1. **`vercel.json`** in the waypoint-app web deployment root:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [{ "key": "X-Robots-Tag", "value": "noindex, nofollow" }]
    }
  ]
}
```

2. **`robots.txt`** served as a real static file (it must NOT fall through to the SPA shell — for Expo web, place it in the static/public assets dir so the export includes it, and confirm Vercel serves it before the catch-all):

```
User-agent: *
Disallow: /
```

3. Ship via the normal waypoint-app gates (`npx tsc --noEmit`, `npx vitest run`, eslint), PR to `main`, merge.

### A3. Verify Phase A

```sh
# CNAME resolves
dig +short app.waypointchild.com CNAME

# App serves on the new host, with noindex header
curl -sI https://app.waypointchild.com/ | grep -i x-robots-tag
#   expect: x-robots-tag: noindex, nofollow

# robots.txt is a real file, not the SPA shell
curl -s https://app.waypointchild.com/robots.txt
#   expect exactly: User-agent: * / Disallow: /
curl -s https://app.waypointchild.com/robots.txt | grep -ci '<html'
#   expect: 0

# The OLD host also now carries noindex (same deployment)
curl -sI https://www.waypointchild.com/ | grep -i x-robots-tag
```

Note: adding `X-Robots-Tag: noindex` to `www` at this stage is **intentional and correct** — the app-shell URLs indexed under `www` should start dropping out before the marketing site claims the domain's history.

## 4. Phase B — marketing site takes the apex (all inside Vercel)

Only after: Phase A verified, and the marketing site passing its own launch checklist (`docs/launch-checklist.md`).

1. **[MIKE ACTION — Vercel dashboard]** Create the Vercel project `waypoint-site`: import the same GitHub repo, **Root Directory = `waypoint-site`**, framework preset **Astro** (static output, `dist/`). Git integration gives per-PR preview deploys and production-on-main automatically — no CI deploy step needed.
2. Verify the project builds and serves on its `*.vercel.app` URL; run the launch checklist against that URL.
3. **The domain swap** (minutes, reversible): in the **app** project, remove domains `waypointchild.com` and `www.waypointchild.com` (keep `app.waypointchild.com`). In the **waypoint-site** project, add `waypointchild.com` (primary) and `www.waypointchild.com` — attach `www` as a **served domain of this project, with no dashboard-level redirect**, so the path-aware rules in `waypoint-site/vercel.json` (§5) control it with a single hop.
4. **[MIKE ACTION — Namecheap Advanced DNS, only if Vercel prompts]** Vercel may ask for record updates when domains move between projects (apex A `76.76.21.21` / `www` CNAME `cname.vercel-dns.com` are the current defaults — follow the dashboard). Set TTL 5 min beforehand.
5. `app.waypointchild.com` stays on the app project, untouched.

## 5. 301 redirect rules (in `waypoint-site/vercel.json`, host-conditioned on `www`)

`www` historically served **only the app**, so every old `www` deep link is an app link. But the canonical-host convention is `www → apex`. Resolution: **path-aware rules — known app routes go to the app host; everything else goes to the same path on the apex.** All rules are `permanent: true` (Vercel emits 308; equivalent to 301 for SEO) and Vercel **preserves the full query string** automatically when the destination declares none — the D3 `wp_*`/`utm_*` params and auth callback params survive byte-for-byte.

Already implemented in `waypoint-site/vercel.json`:

| # | Match (host = `www.waypointchild.com`) | Target |
|---|---|---|
| 1 | Path starts with an app route prefix: `/start`, `/login`, `/signup`, `/auth`, `/onboarding`, `/home`, `/chat` **[TBC — regenerate the full prefix list from the waypoint-app navigator/router at cutover time; do not assume]** | `https://app.waypointchild.com/<same path>` |
| 2 | Everything else on `www` (catch-all, last) | `https://waypointchild.com/<same path>` |

Rule 2 sends unknown `www` paths to the **same path on the apex** (not the homepage): the marketing site's 404 page then handles genuinely dead paths, which keeps the 404 measurable via the `not_found` Plausible event instead of silently flattening everything to `/`.

**HSTS** is added post-cutover as a `Strict-Transport-Security` header entry in `vercel.json` (start `max-age=604800`, raise to `15552000` after one clean week) — it is deliberately absent from the pre-cutover config.

## 6. Verification curls (run all; keep output in the PR that closes the cutover)

```sh
# 1. Apex serves the marketing site directly — 200, no redirect hop
curl -sI https://waypointchild.com/ | head -5
#   expect: HTTP/2 200 (and NOT a 308 to www)

# 2. www root → apex root, permanent redirect, single hop
curl -sI https://www.waypointchild.com/ | grep -iE '^(HTTP|location)'
#   expect: 308 / location: https://waypointchild.com/

# 3. www app path → app host, query preserved (D3 contract)
curl -sI "https://www.waypointchild.com/start?wp_slug=test&wp_pillar=iep&wp_cta=guide-footer&wp_locale=en&utm_source=site&utm_medium=organic-content" | grep -i location
#   expect: location: https://app.waypointchild.com/start?wp_slug=test&...utm_medium=organic-content (params intact, byte-for-byte)

# 4. www unknown path → same path on apex (then apex 404 handles it)
curl -sI "https://www.waypointchild.com/some-old-path?x=1" | grep -i location
#   expect: location: https://waypointchild.com/some-old-path?x=1

# 5. App host healthy + noindexed
curl -sI https://app.waypointchild.com/ | grep -iE '^(HTTP|x-robots-tag)'
curl -s https://app.waypointchild.com/robots.txt

# 6. Marketing site is NOT noindexed and serves a real robots.txt
curl -sI https://waypointchild.com/ | grep -i x-robots-tag
#   expect: no output
curl -s https://waypointchild.com/robots.txt
#   expect: site robots.txt with Sitemap: line

# 7. No redirect loops, max 1 hop from any entry point
curl -sIL -o /dev/null -w '%{num_redirects} redirects, final %{url_effective}\n' https://www.waypointchild.com/
curl -sIL -o /dev/null -w '%{num_redirects} redirects, final %{url_effective}\n' http://waypointchild.com/

# 8. Security headers live on the apex
curl -sI https://waypointchild.com/ | grep -iE 'content-security-policy|x-content-type-options|referrer-policy'
```

## 7. Rollback plan

Everything is dashboard-level domain assignment — no registrar involvement, rollback in minutes:

1. In Vercel: re-add `waypointchild.com` + `www.waypointchild.com` to the **app** project (restores today's behavior exactly, including the apex→www 308).
2. Remove both from the `waypoint-site` project.
3. The app never leaves `app.waypointchild.com`, so the product is unaffected throughout.
4. **Rollback of Phase A:** remove the `app` CNAME and revert the `vercel.json`/robots PR. (There is no realistic scenario requiring this — noindex on the app is desired regardless.)

**TTL prep:** set apex/`www`/`app` records at Namecheap to the minimum TTL (5 min) at least 24h before the swap, and export/screenshot the record set — that's the rollback artifact.

## 8. Sequencing vs. build-plan week 3

| When | What | Gate |
|---|---|---|
| Now / week 1 | Phase A (app subdomain + noindex) | None — do immediately; it de-risks everything and stops app-shell indexing today |
| Week 2 | Vercel `waypoint-site` project created; launch checklist run against the `*.vercel.app` URL; TTL prep | Checklist BLOCKER rows green on preview |
| Week 3, day 1–2 | Phase B domain swap + §6 verification | All curls pass |
| Week 3, day 3 | GSC domain-property verify (Namecheap DNS TXT), sitemap submitted, old `www` app-shell coverage monitored | GSC accepted |

Hard rule: **the domain swap never happens on a Friday**, and never before the launch checklist's BLOCKER rows are all green.
