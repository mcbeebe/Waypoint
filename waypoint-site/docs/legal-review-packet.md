# Legal review packet — waypointchild.com (one round)

**Purpose:** everything counsel needs to review the marketing/content site in **a single round**. This is the index; each item links to (or names the future path of) the actual artifact. Nothing in this packet is published until it comes back approved — the D2 status ladder (`draft → founder_edit → in_review → approved → published`) applies to the legal pages too, with counsel as the reviewer of record for this collection.

**Company context for counsel (one paragraph):** Waypoint is a solo-founder company operating (a) a free, static, stateless marketing/content site at waypointchild.com serving California parents of children with disabilities — plain-language guides on Regional Centers (Lanterman Act), IEPs (IDEA), Medi-Cal/IHSS/SSI, and SB 946 insurance, plus client-side tools and EN+ES template letters — and (b) a separate product app at app.waypointchild.com (account-based, Supabase backend). The site collects no PII, sets no cookies for analytics (Plausible, cookieless), and has zero email gates. Waypoint is **not** a HIPAA covered entity and makes no HIPAA claims. Content is YMYL: no invented statistics, figures, or citations; statute-cited ("WIC §4643" style) plain-language guidance at a grade 7–8 reading level.

---

## A. Documents for review

### A1. The three legal MDX drafts (core deliverable)

| Doc | Path (site repo) | Notes for counsel |
|---|---|---|
| Privacy Policy | `src/content/legal/privacy.mdx` (EN) + `privacy.es.mdx` | Must accurately describe: Plausible cookieless analytics; stateless client-side tools (inputs never leave the browser); the `wp_ctx` deep-link payload that crosses to the app (summaries only, never raw user-typed benefit figures — see `docs/analytics-taxonomy.md`); newsletter double opt-in; app-side data handled under the app's own policy. CCPA/CPRA applicability given CA audience. |
| Terms of Use | `src/content/legal/terms.mdx` + ES twin | Includes: no attorney-client relationship, no legal/medical/benefits advice, informational-only, no warranty on statute currency (we date-stamp and cite; laws change), limitation of liability, CA governing law. |
| Disclaimer | `src/content/legal/disclaimer.mdx` + ES twin | The master text behind the inline `disclaimerVariant` blocks (`legal`, `benefits`, `medical`). Counsel reviews the master + all three inline variants as rendered, EN and ES. ES versions are translations of record — counsel should confirm whether they can review Spanish or whether we certify translation fidelity separately. |

Drafts are not yet written as of this packet's creation; they will be attached in `founder_edit` status. **Counsel reviews the exact git SHA named in the cover email** (matches the D2 `versionReviewed` discipline).

### A2. Letter templates — UPL framing question

We publish EN+ES **template letters** (e.g., Regional Center assessment requests, IEP evaluation requests, insurance appeal letters) that parents copy, personalize, and send themselves. The site never sends letters, never collects the filled-in content, and never advises on an individual's situation.

**Questions for counsel:**
1. Does offering statute-citing template letters, framed as self-help forms, create unauthorized-practice-of-law exposure in California? What framing/disclaimer text keeps them squarely in the self-help/forms category?
2. Is per-letter inline text required, or does the site-wide disclaimer + `legal` variant on each letter page suffice?
3. Any constraint on the ES translations (does a translated legal template raise separate issues)?

### A3. Comparative-claims policy

We will sometimes describe how Waypoint differs from other parent-navigation services and from free public resources.

**Proposed policy (for counsel to bless or edit):** name competitors only in factual, verifiable comparisons; no disparagement; no claims about competitors' pricing/outcomes without a cited, dated source; "unlike X" phrasing avoided in favor of "Waypoint does Y"; all comparative pages go through the same review ladder. **Question:** any Lanham Act / CA unfair-competition guardrails we should add before the first comparison page ships?

### A4. Newsletter / CAN-SPAM plan

- Double opt-in only (subscription counted only on confirm — this is wired into analytics, D3 `newsletter_subscribe`).
- Every send: working unsubscribe honored promptly, physical mailing address, truthful subject lines, `From:` identifying Waypoint.
- No purchased lists, no pre-checked boxes, zero email gates anywhere on the site (hard product rule).
- **Questions:** (1) Confirm the physical-address line — solo founder; is a registered agent or CMRA/PO Box address acceptable and advisable instead of a home address? (2) Anything CA-specific (B&P §17529 et seq.) beyond CAN-SPAM we should build in now?

### A5. Chat-mining disclosure + the RETROACTIVITY question

**Practice to review:** the product app's AI chat logs are mined for **themes** (never verbatim text, never identifying details) to decide which public content to write next. The content schema records this provenance (`questionSource: 'chat-mined'`).

**Disclosure:** draft language for the app's privacy policy + in-product notice describing this use, for counsel to review.

**The retroactivity question (flagged, not assumed):** we hold chat logs collected **before any such disclosure existed** (including the earlier Google-Apps-Script MVP era). **May aggregated, de-identified themes from pre-disclosure chats inform public content topics?** Sub-questions:
1. Does theme-level, de-identified use fall within the original collection's reasonable expectations, or does it require fresh notice/consent?
2. If not usable: is there a cleansing procedure (aggregation threshold, human-review firewall, minimum cohort size) that makes historical themes usable?
3. If usable only prospectively: confirm the cutover rule — content may cite `chat-mined` provenance only for chats collected after the disclosure ships.

**Until counsel answers, the working rule is conservative: no pre-disclosure chat data informs published content.**

---

## B. What we need back from counsel

1. Redlines (or approval) on the three legal MDX drafts, EN — plus a position on ES review (A1).
2. A yes/no + required framing text on the letter-template UPL question (A2).
3. Approved comparative-claims policy text (A3).
4. Confirmation of the newsletter plan + address question (A4).
5. Approved chat-mining disclosure text AND a written answer to the retroactivity question with the operative rule we should encode (A5).
6. The inline disclaimer variant texts (`legal`, `benefits`, `medical`) as approved copy blocks we can wire verbatim.
7. Anything counsel believes is missing for a YMYL site aimed at CA parents of disabled children (affirmative gap check).
8. A named reviewer + date we can record in `lastLegalReview` / `reviewedBy` frontmatter.

## C. One-round budget note

This packet is scoped for **one review round**: we send the complete packet, counsel returns consolidated redlines and answers, we implement exactly, and only true misunderstandings get a clarifying email (not a second round). Budget: **[TBC — Mike to confirm the fixed-fee or hours cap with counsel before sending]**. To protect the single round: drafts go out only when complete and internally consistent, questions are closed-ended where possible (see B), and nothing outside this packet's scope is added mid-review. Anything discovered later queues for a future round rather than reopening this one.

## D. Logistics

- **Send as:** one email, this index as the body, drafts attached as PDF renders + a link to the repo paths at a named git SHA.
- **Owner:** Mike (relationship + send + budget); Claude (assembling drafts, encoding the answers back into the site).
- **Blocking:** launch-checklist rows 1–3 depend on items A1 and B6; the cutover cannot happen before this round returns.
