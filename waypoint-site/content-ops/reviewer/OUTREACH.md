# Reviewer Outreach — Sourcing Channels + Email Templates

Status: working doc (internal, not published)
Owner: Mike Beebe
Last updated: 2026-09-06

Waypoint publishes nothing YMYL without credentialed review (status ladder:
draft → founder_edit → in_review → approved → published, enforced in
`src/content.config.ts`). This doc is how we find and recruit the reviewers.

## Who we need

Three reviewer profiles, roughly matching our pillars:

| Profile | Reviews | Credential we can publish |
|---|---|---|
| Special-education / disability-rights attorney | IEP, Regional Center (Lanterman), SB 946 insurance guides + template letters | CA Bar number, practice area |
| Non-attorney special-education advocate | IEP/504 procedural guides, answer pages, letters | COPAA SEAT or equivalent training, years of practice |
| Benefits specialist (social worker) | Medi-Cal, IHSS, SSI, CCS content | LCSW / MSW, NASW membership, benefits-planning experience |

Plus one **Spanish-language reviewer** (any of the above profiles, bilingual —
see `AGREEMENT-TERMS-ES.md` for that role's scope).

What every candidate must accept up front:

- The role: reviewing parent-facing guides for **legal/benefits accuracy** —
  not copyediting, not authorship.
- Volume: roughly **4–8 items/month** (our publish cadence is capped at
  reviewer throughput, so their capacity literally sets our cadence).
- Compensation: **per-item fee** (see `AGREEMENT-TERMS.md`).
- Credit: **public** — name, credential, and photo on the trust hub and in
  each article's reviewed-by metadata. Anonymous review doesn't build trust,
  so it isn't offered.
- Sign-off is versioned: they approve a specific draft (recorded by git SHA),
  and material changes after sign-off go back through review.

## Sourcing channels

Work these in order of warmth. Personalized one-at-a-time outreach only — no
mail-merge blasts. Target list size before sending anything: 8–12 names per
profile, so one polite pass fills the bench.

### 1. COPAA member directory (attorneys + advocates)

The Council of Parent Attorneys and Advocates maintains a member directory
searchable by state. Filter to California, then shortlist:

- Solo or small-firm attorneys (big-firm associates can't take side
  engagements easily; solos can, and the per-item fee is meaningful to them).
- Advocates listed with SEAT training or long tenure.
- Anyone who already writes or presents publicly (conference sessions, blog
  posts, webinars) — they've shown they value public-facing education, which
  is exactly what we're asking them to put their name on.

Directory access details / whether search requires membership: [TBC — check
copaa.org before relying on this channel].

### 2. Disability Rights California alumni

Former DRC staff attorneys and advocates are the single best profile fit:
deep Lanterman Act + benefits expertise, mission-aligned, and many go solo or
into consulting after leaving. Find them via:

- LinkedIn: past-company filter = "Disability Rights California", current role
  = attorney / consultant / advocate.
- Speaker lists from past DRC trainings and OCRA (Office of Clients' Rights
  Advocacy) events [TBC — verify names against current listings before
  contacting].

Do NOT pitch current DRC staff on paid side work — conflict-of-interest rules
likely bar it and it burns the relationship. Alumni only.

### 3. Solo special-education attorneys

- State Bar of California attorney search: education law / disability
  practice areas, active status.
- Local SELPA hearing representative lists and OAH (Office of Administrative
  Hearings) special-education decisions name counsel of record — attorneys
  who represent families (not districts) are our side of the bar.
- Referral ask: every call that ends in a "no" gets one question — "who else
  should I be talking to?" Special-ed law in CA is a small world; two calls
  usually produce a warm name.

### 4. NASW-CA benefits specialists

For Medi-Cal / IHSS / SSI content we want a licensed social worker who does
benefits navigation, not clinical practice:

- NASW California chapter — member directory / specialty groups [TBC — access
  method], and their published CE presenters on public benefits topics.
- LinkedIn: "LCSW" + "IHSS" or "Medi-Cal waiver" or "benefits planning" +
  California.
- Regional Center service-coordinator alumni (LinkedIn past-company = any of
  the 21 RCs) are a strong adjacent pool.

### 5. Senior PTI / FRC staff

Parent Training and Information Centers and Family Resource Centers employ
staff who explain these exact systems to parents daily. Senior staff
(program directors, lead parent advisors with 10+ years) are ideal for
plain-language accuracy review and are underpaid — a per-item fee lands well.

**We already have the org list:** PTI organization contacts live in
`gas-mvp/Waypoint-Entity-Navigation-Matrix-v9_4.xlsx`, **PTI Coverage Map
sheet**. Start there instead of rebuilding the list. Verify each contact is
current before emailing [TBC — the sheet's contacts have not been re-verified
recently].

Note: staff may need employer sign-off for paid outside work. Offer to keep
the engagement personal (evenings/weekends, their name not their org's) or,
alternatively, explore an org-level review arrangement — their call.

### 6. LinkedIn searches (cross-cutting)

Useful query patterns (adjust quotes/filters as LinkedIn allows):

- `"special education attorney" California -district -"school district counsel"`
- `"education advocate" IEP California COPAA`
- `LCSW "public benefits" OR "IHSS" OR "Medi-Cal" California`
- `"parent training and information" OR "family resource center" director California`
- Past company: "Disability Rights California" OR any Regional Center name

Connect with a short note, then move to email — the templates below are
email-length, not DM-length. A trimmed 3-sentence DM version: who we are, the
paid review role, ask for their email to send details.

## Outreach ground rules

- **One personalized email, one bump.** Follow up once after 5–7 business
  days, then stop. No sequences.
- **Be honest about how the content is made.** Drafts are AI-assisted and
  founder-edited; the reviewer is the credentialed accuracy gate before
  anything publishes. Leading with this is a feature — it's why the role
  exists — and hiding it would poison the relationship at signing time.
- **Never imply endorsement of Waypoint's app or business** — the engagement
  is content accuracy review only.
- **No fee haggling in email.** Name the range, save negotiation for the call.
- Track pipeline in a simple sheet (name, profile, channel, date contacted,
  status, notes). Don't contact two people at the same small org
  simultaneously.

---

## Email variant A — attorney-targeted

**Subject:** Paid review role: CA special-ed guides for parents (4–8/month)

> Hi [First name],
>
> I found you through [specific: COPAA's California directory / your OAH case
> representing a family against [district] / your presentation on [topic]].
> [One genuine sentence about their work — read something of theirs first.]
>
> I'm Mike Beebe, the founder of Waypoint (waypointchild.com). We publish
> free, plain-language guides for California parents of kids with
> disabilities — Regional Center eligibility and IPPs under the Lanterman
> Act, IEPs, SB 946 insurance, that world. Everything cites the actual
> statute (WIC §4643, not "the law says"), and nothing goes behind an email
> gate. The mission is simple: the parents who can't afford an attorney
> shouldn't also get the worst information.
>
> Here's the honest setup: drafts are AI-assisted and I edit every one, but
> we have a hard rule that **no guide publishes without a credentialed
> reviewer signing off on its legal accuracy** — and your name, credential,
> and photo appear publicly on everything you approve. That's the role I'm
> hoping interests you:
>
> - Review 4–8 items/month for legal accuracy (statutes, procedures,
>   deadlines) — not copyediting, drafts arrive clean
> - Per-item fee: $150–300 per guide depending on length, less for short
>   Q&A pages; 5-business-day turnaround
> - Public credit on the guide and our reviewer page; you approve a specific
>   version, and changes after that come back to you
> - Independent contractor, no exclusivity, decline any item
>
> Would you be open to a 20-minute call in the next couple of weeks? I'll
> send a sample guide and the one-page terms sheet ahead of time so the call
> is a real evaluation, not a pitch. [Two or three concrete time windows.]
>
> Thanks either way — and if this isn't for you but a colleague comes to
> mind, I'd be grateful for the name.
>
> Mike Beebe
> Founder, Waypoint — waypointchild.com
> [phone] · [email]

## Email variant B — advocate-targeted

**Subject:** Would you fact-check parent guides we publish? (paid, credited)

> Hi [First name],
>
> I came across you via [specific: COPAA / your advocacy practice / a parent
> group where your name keeps coming up]. [One genuine sentence about their
> work.]
>
> I'm Mike Beebe, founder of Waypoint (waypointchild.com). I'm a
> [personal one-liner — founder's connection to this community, keep it
> honest and short]. We publish free guides that walk California parents
> through the systems you navigate every day — IEP timelines, Regional
> Center intake, what to put in writing and when. Grade 7–8 reading level,
> every claim cited, English and Spanish, no email gates, no upsell inside
> the guides.
>
> The rule that makes it trustworthy: **nothing publishes until someone who
> actually does this work has reviewed it for accuracy.** Drafts are
> AI-assisted and I edit them, but you'd be the gate — checking that the
> procedures, timelines, and parent rights are right in practice, not just
> on paper. Your name and credentials appear on every guide you approve.
>
> The practical shape:
>
> - About 4–8 items/month — guides, short answer pages, template letters
> - Paid per item ($150–300 for a full guide, less for short pieces);
>   5-business-day turnaround, decline anything, no exclusivity
> - Public credit on each piece and on our reviewer page
>
> Could we grab 20 minutes on a call? I'll send a sample guide first so you
> can judge the quality before we talk. [Two or three concrete time
> windows.]
>
> And if the timing's wrong but you know the right person, I'd genuinely
> appreciate a name.
>
> Mike Beebe
> Founder, Waypoint — waypointchild.com
> [phone] · [email]

## Email variant C — PTI/FRC-staff-targeted

**Subject:** Paid side role for someone who explains this system every day

> Hi [First name],
>
> You've spent [X years] at [org] helping families figure out Regional
> Centers, IEPs, and benefits — which is exactly why I'm writing to you and
> not a law firm. [One genuine sentence — a training they ran, a resource
> their org publishes, tenure.]
>
> I'm Mike Beebe, founder of Waypoint (waypointchild.com). We publish free
> plain-language guides for California parents — the same explanations your
> phone advisors give one family at a time, written down, cited to the
> statute, in English and Spanish, with no email gate in front of them.
>
> Before anything publishes, we require sign-off from someone with real
> field experience that the steps are accurate and actually work the way we
> say they do. I'd like that reviewer to be you, personally (this is a
> side engagement in your own name, not something I'm asking of [org] —
> though if an org-level arrangement fits better, I'm open to that
> conversation too):
>
> - Review roughly 4–8 short items/month for accuracy — does the intake
>   process, timeline, or benefit rule match what families actually
>   experience
> - Paid per item; ~1–2 hours per guide, on your own schedule,
>   5-business-day turnaround
> - Your name and role credited publicly on every piece you approve
>
> Would a 20-minute call work sometime in the next two weeks? I'll send a
> sample guide ahead of time. [Two or three concrete time windows.]
>
> Either way, thank you for the work you do — Waypoint exists because
> centers like yours can't clone their best people.
>
> Mike Beebe
> Founder, Waypoint — waypointchild.com
> [phone] · [email]

---

## Follow-up bump (all variants)

Send once, 5–7 business days after the original, replying on the same thread:

> Hi [First name] — floating this back up in case it got buried. Short
> version: paid per-item review of California disability guides for parents,
> 4–8/month, public credit, 20-minute call to see if it fits. If it's a no,
> a one-word reply saves us both the guessing. Thanks!

## After the call

If it's a mutual yes: send `AGREEMENT-TERMS.md` (or the ES variant) as the
working terms sheet, plus one sample item to review as a **paid trial** at
the normal per-item fee. The trial is the real interview. Counsel formalizes
the agreement before their first credited review publishes.
