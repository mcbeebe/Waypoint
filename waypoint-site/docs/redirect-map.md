# Domain cutover & redirect map — waypointchild.com

**Status:** plan (pre-execution) · **Audited:** 2026-09-06 · **Owner:** Mike (DNS/registrar actions) + Claude (config, verification)
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
- Cloudflare Workers custom domains require the zone to be **on Cloudflare nameservers**, so the nameserver move (§4) is a hard prerequisite for the marketing site taking the apex.

## 2. Target state

| Host | Serves | Indexing |
|---|---|---|
| `waypointchild.com` (apex) | Marketing/content site (Astro on Cloudflare Workers) | Indexed. Canonical host. |
| `www.waypointchild.com` | Nothing — **301 → apex** (path-aware, see §6) | Redirect only |
| `app.waypointchild.com` | Product app (Vercel) | **noindex** (X-Robots-Tag + robots.txt disallow) |

## 3. Phase A — stand up `app.waypointchild.com` and de-index the app

Runs **before** the nameserver move, entirely at Namecheap + Vercel. Zero user-facing risk: `www` keeps serving the app throughout.

### A1. DNS + Vercel domain (Mike + Claude)

1. In the Vercel project for the app: **Add domain** `app.waypointchild.com`. Vercel will show the required CNAME target (currently `cname.vercel-dns.com` — use whatever the dashboard displays at execution time).
2. **[MIKE ACTION — Namecheap Advanced DNS]** Add: `CNAME` · host `app` · value as shown by Vercel · TTL **5 min** (lowest available).
3. Wait for Vercel to show the domain as verified with a certificate issued.
4. Do **not** remove `www` from the Vercel project yet — both hosts serve the app during the transition window.

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

## 4. Phase B — move the zone to Cloudflare **[MIKE ACTION]**

Required for Workers custom domains on the apex. Sequence to make it boring:

1. Create the `waypointchild.com` zone in Cloudflare (Free plan is fine). Cloudflare auto-imports records — **manually diff the imported records against Namecheap Advanced DNS** before proceeding. Confirm at minimum: the `app` CNAME from Phase A, MX/TXT records if any mail or verification records exist **[TBC — inventory the Namecheap zone at execution time; do not lose SPF/DKIM/verification TXTs]**.
2. Recreate `www` and the apex in the Cloudflare zone **pointing at the current Vercel targets first** (i.e., replicate today's behavior exactly), proxy status DNS-only (grey cloud) initially so behavior is identical.
3. **[MIKE ACTION — Namecheap → Domain → Nameservers → Custom DNS]** Enter the two nameservers Cloudflare assigns.
4. Wait for Cloudflare to mark the zone **Active**. Registry NS changes are not governed by TTLs we control (`.com` NS records commonly cache up to ~48h); plan the apex cutover no earlier than the zone showing Active **plus a same-behavior soak of at least 24h**.
5. During the soak, nothing user-visible changes: apex still 308s to `www`, `www` still serves the app, `app` serves the app with noindex.

## 5. Phase C — marketing site takes the apex

Only after: zone Active on Cloudflare, soak clean, marketing site passing its own launch checklist (`docs/launch-checklist.md`).

1. Deploy the Astro site to Cloudflare Workers; attach **custom domain `waypointchild.com`** (Workers → Domains & Routes). This replaces the apex's current Vercel redirect record.
2. Flip the proxy on `www` to Cloudflare (orange cloud) and attach the redirect rules in §6.
3. Remove `www.waypointchild.com` and `waypointchild.com` from the Vercel project **only after** §7 verification passes — Vercel must stop answering for them, but not before the Cloudflare side demonstrably works.
4. `app.waypointchild.com` stays on Vercel, untouched.

## 6. 301 redirect rules (Cloudflare, on `www`)

`www` historically served **only the app**, so every old `www` deep link is an app link. But the canonical-host convention (and the plan of record) is `www → apex`. Resolution: **path-aware rules — known app routes go to the app host; everything else goes to the apex.** All rules are 301 and MUST carry the path and full query string (the D3 `wp_*`/`utm_*` params and any auth callback params must survive).

Implement as Cloudflare **Single Redirects** (Rules → Redirect Rules), ordered:

| # | Match (host = `www.waypointchild.com`) | Target | Type |
|---|---|---|---|
| 1 | Path starts with any app route prefix: `/start`, `/login`, `/signup`, `/auth`, `/onboarding`, `/home`, `/chat` **[TBC — enumerate the full route list from the waypoint-app navigator/router at cutover time; this list must be regenerated, not assumed]** | `https://app.waypointchild.com${path}${query}` — dynamic expression: `concat("https://app.waypointchild.com", http.request.uri.path)` with *Preserve query string* ON | 301 |
| 2 | Everything else on `www` (catch-all, lower priority) | `https://waypointchild.com${path}${query}` — same dynamic form, *Preserve query string* ON | 301 |

Rule 2 sends unknown `www` paths to the **same path on the apex** (not the homepage): the marketing site's 404 page then handles genuinely dead paths, which keeps the 404 measurable via the `not_found` Plausible event instead of silently flattening everything to `/`.

Also on the apex zone: no apex-side redirects needed (the Worker serves it), but confirm no legacy Vercel 308 remains cached in any edge after cutover (§7).

## 7. Verification curls (run all; keep output in the PR that closes the cutover)

```sh
# 1. Apex serves the marketing site directly — 200, no redirect hop
curl -sI https://waypointchild.com/ | head -5
#   expect: HTTP/2 200 (and NOT a 308 to www)

# 2. www root → apex root, 301, single hop
curl -sI https://www.waypointchild.com/ | grep -iE '^(HTTP|location)'
#   expect: 301 / location: https://waypointchild.com/

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
```

## 8. Rollback plan

Pre-position rollback **before** each phase, not during an incident.

**TTL prep (before Phase B):** set every host record in the Namecheap zone to the minimum TTL (5 min) at least 24h before the nameserver change, so a rollback of individual records propagates fast. Record the exact current Namecheap record set (screenshot + export) — this is the rollback artifact.

**Rollback of Phase C (apex cutover) — minutes, no registrar involved:**
1. In Cloudflare: detach the Workers custom domain from the apex; restore the apex record to the pre-cutover Vercel target; disable the two redirect rules.
2. Re-add `www`/apex domains in Vercel if they were already removed.
3. The app was never moved off `app.*`, so the product is unaffected throughout.

**Rollback of Phase B (nameserver move) — slow path, avoid needing it:**
1. **[MIKE ACTION — Namecheap]** Switch nameservers back to Namecheap BasicDNS (`dns1.registrar-servers.com` / `dns2.registrar-servers.com`).
2. Expect up to ~48h of split-brain while registry NS caches expire — which is why Phase B replicates current behavior exactly (both DNS providers answer identically during the window, making split-brain harmless).
3. Keep the Namecheap zone's records intact (do not delete them after the move) for at least 30 days; they are the live fallback.

**Rollback of Phase A:** remove the `app` CNAME and revert the `vercel.json`/robots PR. (There is no realistic scenario requiring this — noindex on the app is desired regardless.)

## 9. Sequencing vs. build-plan week 3

The build plan puts the domain cutover in **week 3**. Mapping:

| When | What | Gate |
|---|---|---|
| Now / week 1 | Phase A (app subdomain + noindex) | None — do immediately; it de-risks everything and stops app-shell indexing today |
| End of week 2 | TTL prep + Cloudflare zone created + record diff done | Record inventory signed off |
| Week 3, day 1 **[MIKE ACTION]** | Phase B nameserver switch | Cloudflare zone Active |
| Week 3, day 2–3 | Soak (no visible change) | 24h clean soak |
| Week 3, day 3–4 | Phase C apex cutover + redirect rules | `docs/launch-checklist.md` all BLOCKER items green |
| Week 3, day 4–5 | §7 verification, GSC domain-property re-verify, remove old Vercel domain bindings | All curls pass |

Hard rule: **Phase C never happens on a Friday**, and never before the launch checklist's BLOCKER rows are all green.
