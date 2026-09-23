# Special Needs Navigator vs Waypoint — Competitive Analysis

**Date:** Sep 13, 2026 · **Status:** adopted
**Supersedes:** nothing — first analysis of this competitor
**Superseded-by:** —

*Companion to `Undivided-Comparison-Aug2026.md`. Same method: external research
resolved against the Waypoint repo, with every claim tagged by evidence class.
Undivided is the funded-content competitor; Special Needs Navigator is the
solo-expert competitor. They are different threats and only one of them is
actually pointed at Waypoint's lane.*

**Research constraint, stated up front.** This session's egress proxy blocks
every non-allowlisted host, so `specialneedsnavigator.us`,
`app.specialneedsnavigator.us` and `waypoints.substack.com` could **not** be
fetched directly. Page content below comes from search-engine extraction of
those pages, not from my own retrieval. DNS and hosting facts **were** obtained
first-hand from this machine. Every claim carries a tag:

| Tag | Meaning |
|---|---|
| **[VERIFIED]** | I obtained it directly (DNS resolution, repo measurement) |
| **[REPORTED]** | Extracted from their own published pages/posts by search, not fetched by me |
| **[INFERRED]** | My reasoning from the above — argued, not observed |
| **[UNKNOWN]** | Not publicly available. Said so rather than guessed. |

---

## 1. The verdict, in four sentences

Special Needs Navigator is a **single-expert AI consultation wrapper** — one
CFP®'s decade of disability-planning knowledge, packaged as a stateless paid
chat session on Vercel with Stripe at the door — and it is **not** the same
product category as Waypoint, despite the near-identical positioning language.

It beats Waypoint on exactly two axes: **national scope** (all 50 states'
benefit interactions vs Waypoint's deliberate California lock) and **credentialed
human authority** (a named CFP® with a public decade-long body of work, vs an
app that cites statutes).

It is structurally behind on everything Waypoint's architecture exists to do:
it has **no database, no accounts, no memory between sessions, no deadlines, no
clocks, no documents, no letters, no export, and no ability to notice anything
about a family when they are not typing** — by its own design, "once you close
the window, the conversation is gone."

**Revenue and uptake are not disclosed anywhere, by anyone.** Any number is a
model, and §7 gives ranges with their assumptions exposed rather than a figure
pretending to be a fact.

---

## 2. Identity resolution — there are three of these

This matters, because searching the name returns three different entities and
conflating them produces a wrong analysis.

1. **Special Needs Navigator (2020–2024) — a financial advisory practice.**
   Eric Jorgensen's own firm, Frederick MD. Interviewed under that name on the
   *Frederick Factor* podcast in Oct 2021. **[REPORTED]** It was rebranded to
   **True North Disability Planning**, which then **merged into Visible National
   Trust** — announced in his post "end of an era," Mar 20 2024. **[REPORTED]**
2. **`specialneedsnavigator.net`** — resolves to the **same Squarespace IPs** as
   the `.us` domain (198.185.159.144/145, 198.49.23.144/145). **[VERIFIED]**
   Same owner; a retained/parked domain, not a separate company.
3. **Special Needs Navigator (2026– ) — the AI product. This is the competitor.**
   The old brand name reused for a new thing. Announced Mar 17 2026, live
   **Apr 2 2026** at `app.specialneedsnavigator.us`. **[REPORTED]**

**So: the company is five and a half months old as a product, and is one
person.** He is not a startup founder with a team; he is a practitioner who
merged his practice into a trust company and then shipped a tool. The
competitive read changes completely once you know that.

### The name collision is worth one sentence

His newsletter — the knowledge base the whole product is built from — is called
**Waypoints** (`waypoints.substack.com`), launched ~2021, four years before this
repo's product. **[REPORTED]** That is a real, if minor, trademark and SEO
hazard for "Waypoint" in the *exact* vertical. It is not a reason to rename, but
it is a reason to never file a mark on the bare word in the disability-planning
class without counsel looking at it first.

---

## 3. The stack — hard evidence

This is the part I could verify myself. Resolved from this machine:

```
specialneedsnavigator.us      → 198.185.159.144/145, 198.49.23.144/145   [VERIFIED]
www.specialneedsnavigator.us  → same                                      [VERIFIED]
specialneedsnavigator.net     → same                                      [VERIFIED]
app.specialneedsnavigator.us  → 216.150.1.193, 216.150.16.193             [VERIFIED]
   canonical name: d86638f9ae716618.vercel-dns-017.com                    [VERIFIED]
```

| Layer | What they run | Evidence |
|---|---|---|
| Marketing site | **Squarespace** | `198.185.159.x` / `198.49.23.x` are Squarespace's anycast ranges **[VERIFIED]** |
| Application | **Vercel** | CNAME to `*.vercel-dns-017.com`, AS16509 **[VERIFIED]** |
| Payments | **Stripe** | "Processed securely through Stripe before the session opens" **[REPORTED]** |
| Content / audience | **Substack** (`waypoints.substack.com`, Cloudflare-fronted) **[VERIFIED]** |
| Podcast | Spotify for Creators — 194 episodes, **concluded** **[REPORTED]** |
| Database | **None visible, and none needed** — see §4 **[INFERRED]** |
| Auth / accounts | **None** — payment is the gate, not a login **[INFERRED from [REPORTED] flow]** |
| AI model | **Undisclosed.** Their FAQ says only "one of the most capable AI models available." **[REPORTED]** |

### What their code is, and why you cannot read it

There is **no public repository, no npm package, no open-source component, and
no published API.** **[VERIFIED — nothing surfaced across repeated searches]**
It is a closed commercial web app. So "dig hard on their code" resolves to:
*the code is not available, and here is what can be established about it without
it.* I am not going to speculate line-by-line about a codebase nobody can see.

What the observable surface does establish, tightly:

- **A Vercel-hosted app subdomain, separate from a Squarespace marketing site.**
  That is the canonical shape of a Next.js (or similar) app deployed via
  `vercel deploy`, with the brochureware left on a no-code host. **[INFERRED]**
- **A stateless request model.** "Sessions are not saved. Once you close the
  window, the conversation is gone." **[REPORTED]** A product with no persistence
  needs no Postgres, no migrations, no row-level security, no GDPR/CCPA deletion
  endpoint, and no backup story. This is the single biggest engineering decision
  they made and it is why one person could ship it.
- **Stripe as the authentication layer.** Pay → session opens. No account system
  to build, no password reset, no email verification, no session management
  beyond the browser tab. **[INFERRED from [REPORTED] flow]**
- **No mobile app.** Web only, "available on any device." **[REPORTED]** No App
  Store presence surfaced.

**Honest read: this is a well-chosen architecture for a solo operator, not a
weak one.** They removed every subsystem that requires a team to maintain. The
cost of that choice is §5.

---

## 4. How they use AI — the actual mechanism

The assistant is named **Sage**. The published flow, in order **[REPORTED]**:

1. **Mode select** — Family or Professional.
2. **Fit-check screen** — "confirms Sage is the right tool for your situation
   *before you pay*." A pre-payment qualification gate.
3. **Stripe payment** — $14.99 Family / $34.99 Professional, per session.
4. **Disclaimer gate** — two checkboxes: educational tool only; you will verify
   with the appropriate agency or professional.
5. **The session** — unlimited turns, no time limit. Sage asks orienting
   questions (state, support needs) *before* analyzing.
6. **Exit artifacts** — a structured summary (case overview · key concerns ·
   risks identified · planning considerations · next steps) **or** the full raw
   transcript, downloadable.
7. **A "Session Restart Prompt"** appended to every summary — paste it into the
   next session to restore context.
8. **"Request Case Review"** in the session header — emails Eric a summary of
   your case; he follows up personally.

### The four techniques worth stealing, and the one worth refusing

**a. The "Session Restart Prompt" is the cleverest thing in the product.**
It is manual, user-carried memory. Instead of building persistence, they make
the *user* the storage layer and hand them a portable context blob. It costs
nothing, it dodges every privacy obligation, and it makes the artifact feel
like something you own. Waypoint has real persistence and a real case file and
therefore doesn't need this — but the *framing* ("here is a thing you carry
away, and it works anywhere") is exactly what §3c of the Undivided analysis says
`requestDossier.ts` fails to communicate. They shipped the feeling; Waypoint
shipped the substance and buried it four taps deep behind the word "Export."

**b. The fit-check before the paywall.** Qualifying the user *before* taking
money is both good ethics and good refund-avoidance. Waypoint's `FLAGS.paywall:
false` means this is not live work today, but when `entitlements.ts` goes hot,
the pattern is right.

**c. Scope refusal as a feature.** "Sage will tell you when something is outside
its scope — when you need an attorney, or when your situation is complex enough
that you should talk to a person." **[REPORTED]** That is `src/lib/ai.ts`'s job
too, and Waypoint's footer ("Educational information only — not legal advice ·
Disability Rights California: 1-800-776-5746") is the stronger version because
it names a real free phone number instead of a category.

**d. Live figure lookup.** "Sage can look up current SSA figures in real time."
**[REPORTED]** This is tool use or retrieval against a live source, not frozen
prompt text. It is the right instinct and it is a **real gap in Waypoint**:
Waypoint's benefit figures live in static data with human verification dates.
Static-plus-dated is *more* defensible than live-and-unattributed — but only if
somebody actually re-verifies, and `contentSources.ts` has no re-verification
job. Their approach fails differently from Waypoint's, not worse.

**e. The one to refuse: an uncapped session against a fixed price.** "Ask as
many questions as you need, no time limit," at $14.99. See §7 — this is the
structural flaw in their business model and it is not a small one.

### What they do NOT do with AI — and it's most of the list

No document ingestion. No IEP or assessment upload. No letter or email
generation. No deadline extraction. No structured data written anywhere. No
push, no reminder, no follow-up — **the product cannot contact the user at all.**
No classification, no routing, no triage. No multilingual support surfaced. No
evaluation harness, golden set, or regression suite is mentioned publicly
**[UNKNOWN, but nothing suggests one exists]**.

**This is a conversation, priced per conversation.** Waypoint is a system of
record that happens to include a conversation. That is the whole competitive
story and everything in §5 and §6 follows from it.

---

## 5. Head-to-head, on measured numbers

Waypoint's column is measured from this repo today, not quoted from `CLAUDE.md`
(which had drifted — see §9).

| | Special Needs Navigator | Waypoint |
|---|---|---|
| Age as a product | **5.5 months** (live Apr 2 2026) **[REPORTED]** | multi-year, 61 migrations deep **[VERIFIED]** |
| Team | **1** (Eric Jorgensen, CFP®) **[REPORTED]** | 1 owner + agent sessions |
| Platform | Web only **[REPORTED]** | Expo/React Native — iOS, Android, web **[VERIFIED]** |
| Codebase | Closed, unknowable | **~86,100 lines** TS/TSX in `src/` **[VERIFIED]** |
| Screens | ~5 app states **[INFERRED]** | **73 screen files** (58 under `main/`) **[VERIFIED]** |
| Tests | **[UNKNOWN]** | **124 test files / 1,317 test blocks**, 4 vitest projects incl. dual-timezone **[VERIFIED]** |
| AI eval harness | **[UNKNOWN]** | **78-case golden prompt-regression set** (`qa/promptRegression.golden.json`) **[VERIFIED]** |
| Backend | None visible **[INFERRED]** | Supabase Postgres, **61 migrations**, pgvector RAG, **8 Edge Functions** **[VERIFIED]** |
| Persistence | **Zero by design** **[REPORTED]** | Full: families, children, providers, services, documents, expenses, appointments, deadlines, requests, communications **[VERIFIED]** |
| Memory across sessions | Copy-paste a prompt blob **[REPORTED]** | Real, server-side |
| Geography | **National, all 50 states** **[REPORTED]** | **California only, deliberately** |
| Languages | English **[REPORTED]** | **English · Spanish · Vietnamese**, structurally enforced by `localeParity.test.ts` **[VERIFIED]** |
| Statutory clocks | None | `requestClocks.ts` — live deadline math |
| Letters | None | `lettersCatalog.ts` — 22 templates |
| Evidence export | Session transcript (a chat log) | `requestDossier.ts` — provenance-tiered, SHA-256-fingerprinted case file |
| Citations | Not surfaced **[REPORTED]** | Registry with verification dates (`contentSources.ts`) |
| Can reach the user | **No** | Push planned (phase 7); email live |
| Price | **$14.99 / $34.99 per session**, no subscription **[REPORTED]** | $99/yr in `entitlements.ts`, `FLAGS.paywall: false` |
| Human escalation | **Yes — the founder himself**, by email **[REPORTED]** | No. Points to OCRA / DRC (free, statutory) |

---

## 6. Where they genuinely beat Waypoint

Three things, and only three. I looked hard for more.

**1. National scope — and it is not close.** SSI, Medicaid, DAC, ABLE, SNTs,
waiver waitlists **and TRICARE/FEHB for federal employees with disabled
dependents** **[REPORTED]**, across all states. Waypoint is California-locked,
which `Undivided-Comparison-Aug2026.md` §5 argues is correct and which I agree
with — but it means a family in Ohio is *their* customer and can never be
Waypoint's. **The military/federal-employee niche is genuinely uncontested**
and is the single sharpest wedge in their product. Waypoint has nothing on
TRICARE.

**2. A named, credentialed, findable human.** CFP®. Retired Navy Chief, 20 years
active duty. Widower — his wife Christine died in 2012, the month he retired.
Father of William, 23, autistic and non-verbal. **[REPORTED]** Ten years of
practice, 194 podcast episodes, a four-year newsletter archive. That is an
authority position Waypoint cannot manufacture and should not try to fake — the
Undivided analysis reached the identical conclusion about their staffed
navigators ("Size: payroll. Unbuyable. Do not fake it."). **The rule holds
twice now. Stop re-deriving it.**

**3. Lifespan coverage — the adult transition.** His origin story is explicitly
*"what needs to be done to help kids get underway with adult services after
high school"* **[REPORTED]**: age-18 redetermination, DAC benefits, guardianship,
SNTs, ABLE. Waypoint's centre of mass is the school-age IEP/IPP fight. **Age 18
is a cliff every Waypoint family will hit**, and today `eligibility.ts` and
`edgeChildAge.tz.test.ts` handle the age math but no surface *teaches the
transition*. This is the most portable idea in their whole product.

### And one free shot, of the same kind §3h took at Undivided

Their entire value proposition is **"catch issues people miss before they become
expensive mistakes"** — and the product is architecturally incapable of catching
anything, because it cannot see the family except while they are typing and
paying. The age-18 redetermination they warn about is a **date**. Sage can
explain it beautifully in a $14.99 session in March and has no mechanism
whatsoever to mention it again in October. Waypoint's `deadlineReminders.ts`,
`requestClocks.ts` and `homeTriage.ts` exist precisely because *noticing on the
family's behalf* is the product. They named Waypoint's thesis in their marketing
copy and then built the one architecture that cannot deliver it.

---

## 7. Uptake and revenue — what is actually knowable

**Directly: nothing.** No funding round, no press coverage, no disclosed
metrics, no Crunchbase-style profile, no investor, no team page. **[VERIFIED —
searched repeatedly, across funding, press, review and community angles]**

This is not a gap in my research. It is the finding: **a solo, self-funded,
unincorporated-as-far-as-anyone-can-tell product with no outside capital and no
public traction data.**

### The traction signals that do exist, and how weak they are

| Signal | Value | What it's worth |
|---|---|---|
| Podcast scale | 194 episodes, **concluded** **[REPORTED]** | Real body of work; wound down, so not a growth channel |
| Podcast reach | Castbox: **7 subscribers, 448 plays** **[REPORTED]** | One minor platform only. Not the total. Not nothing, either. |
| Substack subscribers | **[UNKNOWN]** — not public | The most important missing number |
| Independent reviews | **None found** — no Reddit, no Facebook group threads, no Capterra, no press | Five months post-launch. Telling. |
| Third-party testimonials | Only on their own site **[REPORTED]** | Self-reported |
| App Store presence | None | Web-only confirmed |

**Read it honestly: five months after launch there is no organic public
conversation about this product anywhere I could find.** For a consumer tool in
a vertical with famously loud Facebook communities, that is evidence of low
uptake — not proof, but the absence is loud.

### Revenue: a model, not a number

**There is no disclosed revenue. What follows is arithmetic on published prices,
and every input is labelled.**

Unit economics, per session:

| | Family | Professional |
|---|---|---|
| Price **[REPORTED]** | $14.99 | $34.99 |
| Stripe (2.9% + $0.30) | −$0.73 | −$1.32 |
| **Net to him** | **$14.26** | **$33.67** |

Against that sits an **uncapped** inference bill — "as many questions as you
need, no time limit." A long session on a frontier model, with context growing
each turn, can plausibly run **$0.30–$2.00 with aggressive prompt caching, or
$3–$8+ without it** **[INFERRED]**. At $14.99, an uncached power user is a
meaningful margin event; a small number of them is a real problem. **This is the
flaw in their model**: they sold a fixed price against a variable cost they do
not control, and the customers most motivated to buy — overwhelmed parents with
complicated cases — are exactly the ones who generate the longest sessions.

Volume scenarios, **assumptions fully exposed** (80% Family / 20% Professional mix):

| Scenario | Sessions/day | Sessions/yr | Gross revenue/yr |
|---|---|---|---|
| Trickle | 1 | 365 | **≈ $6,900** |
| Modest | 3 | 1,095 | **≈ $20,700** |
| Working | 10 | 3,650 | **≈ $69,000** |
| Would-be-news | 20 | 7,300 | **≈ $138,000** |

**My estimate, and I want the uncertainty on the record: the trickle-to-modest
band — roughly $5k–$25k/yr gross — is the most likely reality.** The reasoning:
one person, no paid acquisition surfaced, no press, no community chatter, a
concluded podcast, a Substack of unknown but almost certainly four-digit size,
and a $14.99 one-time purchase with no retention mechanic — nothing about that
funnel produces ten sessions a day. **I could be wrong. This is the weakest
claim in this document and it is a model, not a measurement.**

### The revenue that probably matters more than the sessions

Three non-session lines, all **[REPORTED]**:

1. **"Request Case Review" → `eric@`.** The AI session is a **$14.99 lead
   magnet for paid human consultation.** That is likely the real economics.
2. **`/marketplace` → Visible National Trust** — the pooled-SNT company his own
   practice merged into (product partners BlackRock, Huntington Bank; trustee is
   a Delaware 501(c)(3)). A referral surface into trust business, where a single
   funded SNT is worth orders of magnitude more than a session fee.
3. **Paid Substack.** Reader-supported, paywalled posts.

**So the honest competitive read is: Special Needs Navigator is probably not
primarily a software business.** It is a credentialed practitioner's top-of-funnel
for trust and planning work, wearing an AI product as its front door. Waypoint
is competing with it for attention, not really for revenue — and it is worth
saying plainly that **this is a more coherent solo business model than a $99/yr
consumer subscription**, because it monetises the 2% who need a trust instead of
the 100% who need a letter.

---

## 8. What to do — ranked

**Do not build any of this as a project.** Nothing here displaces the
draft-flow initiative (`Roadmap/Draft-Flow-Plan.md`) or the phase-6 Home
deletion, which remain the plan of record.

**1. Take the age-18 transition seriously — it is the one real content gap.**
*[owner — family-facing, needs `/adversary`]* The SSI age-18 redetermination,
DAC benefits, conservatorship vs. supported decision-making, and the school-exit
cliff are California-specific, statutorily dated, and land squarely in
`requestClocks.ts` + `homeTriage.ts` territory. This is Waypoint's architecture
doing what theirs cannot: **a date that arrives, on a screen the family already
has.** Size: the clocks are days; the content is weeks. Sequence it after the
draft flow, not into it.

**2. Add a re-verification job to `contentSources.ts`.** *auto-ships.* Their
live-figure lookup is a genuine advantage over static data that nobody
re-checks. Waypoint's answer is not to go live — it is to make "verified
Aug 23, 2026" true, by failing a test when any registry entry's `verifiedOn`
passes a staleness threshold. That converts the provenance registry from a
claim into an enforced invariant, which is strictly better than their approach.

**3. Steal the fit-check-before-paywall pattern into `entitlements.ts`.**
*auto-ships, low cost, dormant until `FLAGS.paywall` flips.*

**4. Note the trademark hazard and move on.** `waypoints.substack.com` predates
this product by ~4 years in the identical vertical. Don't rename, don't panic —
but no bare-word mark filing without counsel. One line in a decision record is
the right amount of effort.

**5. Nothing else.** Specifically **do not**: go multi-state (their advantage is
the tax they pay, per `Undivided-Comparison-Aug2026.md` §5 — the argument is
unchanged and now applies twice), add per-session pricing (uncapped COGS against
a fixed price, see §7), build a "talk to a real expert" button (the same
bait-and-switch the Undivided analysis already killed; they can offer it because
the expert is *him*), or chase TRICARE/FEHB (out of California scope, and it is
his personal domain expertise as a retired Chief — unbuyable).

---

## 9. Repo accuracy note

`CLAUDE.md`'s "Current state (2026-09-03)" line had drifted from measured
reality and is corrected in the same commit as this document, per the repo's own
"keep this section true" rule:

| Claim | Measured Sep 13 2026 |
|---|---|
| 59 migrations | **61** |
| 44 screens under `main/` | **58** (73 screen files total) |
| 111 test files / 1313 tests | **124 test files / 1,317 test blocks** |

---

## 10. Confidence register

**What I am confident of:** the hosting stack (I resolved it myself); that they
are one person; that the product is stateless and has no persistence; that no
public code exists; that no funding, press, or independent review exists; that
the product is architecturally unable to contact a user.

**What is second-hand:** every price, feature and flow detail. I could not fetch
their pages — the egress proxy blocked them. Consistent across multiple
independent search extractions, but not retrieved by me.

**What I do not know, and did not guess:** the model and provider behind Sage
(their FAQ deliberately does not say); Substack subscriber count; actual session
volume; actual revenue; whether any business entity exists; whether they have
tests or evals.

**The weakest claim here** is the $5k–$25k/yr revenue band in §7. It is an
inference chain from absent public signals, not a measurement, and it should be
revisited if any traction data ever surfaces.

---

## Sources

- [Special Needs Navigator — home](https://specialneedsnavigator.us/)
- [How It Works](https://specialneedsnavigator.us/how-it-works)
- [FAQ](https://specialneedsnavigator.us/faq)
- [About Eric Jorgensen](https://specialneedsnavigator.us/about/)
- [The app](https://app.specialneedsnavigator.us/)
- [Marketplace → Visible National Trust](https://specialneedsnavigator.us/marketplace)
- [`specialneedsnavigator.net`](https://specialneedsnavigator.net/)
- [Waypoints — "Special Needs Navigator Is Live" (Apr 2 2026)](https://waypoints.substack.com/p/special-needs-navigator-is-live)
- [Waypoints — "Launching Special Needs Navigator" (Mar 17 2026)](https://waypoints.substack.com/p/launching-special-needs-navigator)
- [Waypoints — "My Vision for Special Needs Navigator"](https://waypoints.substack.com/p/my-vision-for-special-needs-navigator)
- [Waypoints — "Where Disability Planning Needs to Go"](https://waypoints.substack.com/p/where-disability-planning-needs-to)
- [Waypoints — "8 Questions Worth Asking Sage"](https://waypoints.substack.com/p/8-questions-worth-asking-sage)
- [Waypoints — "end of an era" (True North → Visible merger, Mar 20 2024)](https://waypoints.substack.com/p/end-of-an-era)
- [Waypoints newsletter](https://waypoints.substack.com/)
- [ABCs of Disability Planning podcast — Apple](https://podcasts.apple.com/us/podcast/abcs-of-disability-planning/id1542581132)
- [ABCs of Disability Planning — Spotify for Creators](https://creators.spotify.com/pod/profile/abcs-disability-planning/)
- [ABCs of Disability Planning — Castbox (7 subs / 448 plays)](https://castbox.fm/channel/4646290?country=us)
- [Frederick Factor Ep. 2 — Eric Jorgensen (Oct 2021)](https://frederickfactor.com/2021/10/20/episode-2-the-accessibility-factor/)
- [21st Century Dads Ep. 269 — Eric Jorgensen](https://21stcenturydads.org/269-eric-jorgensen-of-frederick-md-a-retired-navy-vet-widower-father-of-a-son-with-autism-offers-disability-planning-advice/)
- [Madison House Autism Foundation — Eric Jorgensen, CFP](https://madisonhouseautism.org/financial-planning/autism-gurus-eric-jorgensen/)
- [Eric Jorgensen — LinkedIn](https://www.linkedin.com/in/eric-j-jorgensen/)
- [Visible National Trust — disAbled Life Alliance listing](https://disabledlifealliance.com/disabled-life-innovation-gateway/listings/visible-national-trust/)
- [IPinfo — 216.150.1.193 (AS16509)](https://ipinfo.io/216.150.1.193)
- [IPinfo — 216.150.16.193 (AS16509)](https://ipinfo.io/216.150.16.193)
- Hosting/DNS facts resolved first-hand from this session (§3).
