# Reviewer Agreement — Draft Terms Sheet (English-content reviewer)

**Status: DRAFT TERMS SHEET — NOT AN ENGAGEMENT LETTER AND NOT A CONTRACT.**
This document exists so both sides agree on the shape of the deal before
counsel drafts the formal independent-contractor agreement. Nothing here is
binding; where the two documents differ, the signed agreement controls.
Items marked **[TBC]** are open and expected to move during negotiation.

Owner: Mike Beebe · Last updated: 2026-09-06
Counterpart doc for the Spanish-content role: `AGREEMENT-TERMS-ES.md`

---

## 1. Parties and role

- **Company:** Waypoint [legal entity name — TBC, confirm with counsel],
  publisher of waypointchild.com.
- **Reviewer:** [Name], [credential — e.g., Attorney (CA Bar #____), LCSW,
  or advocate certification], engaged as an independent contractor.
- **Role title (public-facing):** Content Reviewer — [Legal Accuracy /
  Benefits Accuracy].

## 2. Scope of review

**In scope — the reviewer verifies, for each assigned item:**

- Accuracy of statements of law, regulation, and policy (e.g., Lanterman
  Act / WIC citations, IDEA/Section 504, Medi-Cal, IHSS, SSI, SB 946), as
  of the review date.
- Accuracy of procedural steps, deadlines, eligibility rules, and parent
  rights as described.
- Correctness and currency of statute/regulation citations.
- Resolution of any `[TBC]` markers within the reviewer's expertise (the
  drafting process flags unverified facts rather than inventing them; the
  reviewer confirms, corrects, or strikes them).
- Flagging any statement that, while technically accurate, would foreseeably
  mislead a lay parent.

**Out of scope — explicitly not the reviewer's job:**

- Copyediting, style, reading level, SEO, headlines, or structure.
- Authorship or drafting (small suggested rewordings are welcome but never
  required).
- Legal or clinical advice to Waypoint's readers; no attorney-client,
  clinician-patient, or advocate-client relationship is created with any
  reader by the review.
- Review of the Waypoint app, business practices, or anything beyond the
  assigned content items.

## 3. Workflow and sign-off record

- Items arrive at status `in_review` on Waypoint's content ladder
  (draft → founder_edit → in_review → approved → published). The reviewer
  is the gate between `in_review` and `approved`.
- For each item the reviewer returns one of: **approve**, **approve with
  required changes** (enumerated), or **reject** (with reasons). Required
  changes are applied and returned for confirmation before approval.
- Sign-off is recorded in the page's metadata exactly as the site schema
  requires (`review` block in `src/content.config.ts`): reviewer name,
  credential, review date, and the **git SHA of the draft version
  approved**. The reviewer approves that version, not the page in
  perpetuity.
- Any substantive change after sign-off (beyond §7 data-constant refreshes
  and pure copyedits that do not touch legal/benefits meaning) returns the
  item to review.

## 4. Volume and cadence

- Expected volume: approximately **4–8 items per month**. This is a planning
  figure, not a minimum commitment by either side **[TBC — whether to
  guarantee a monthly minimum/retainer]**.
- The reviewer may decline any individual item (conflict, workload, outside
  expertise). Declines route to the named backup (§10).
- Waypoint's publishing cadence is capped by reviewer throughput; all
  reviewed item types count against the cadence, including refreshes.

## 5. Fees

Per-item, invoiced monthly. **All figures [TBC — negotiable]:**

| Item type | Fee |
|---|---|
| Full guide (pillar guide, typically 1,500–3,500 words) | $150–300, tiered by length/complexity |
| Answer page (short single-question page) | $50–75 |
| Regional Center entity pages | Batch pricing — priced per batch, not per page [TBC] |
| Template letters (EN) | Batch pricing — letters reviewed in sets [TBC] |
| Data-constant refresh confirmation (§7 post-hoc check) | Flat nominal fee per refresh event [TBC] |
| Re-review after substantive update | 50% of original item fee [TBC] |

- Paid trial: the first assigned item is compensated at the normal rate
  regardless of whether the engagement continues.
- Payment terms: net 30 from invoice **[TBC]**; method (ACH etc.) [TBC].
- Fee schedule revisited every 6 months or at 2× volume change [TBC].

## 6. Turnaround (SLA)

- Standard turnaround: **5 business days** from assignment to verdict.
- The reviewer may extend by notice before day 3 (e.g., trial schedule);
  items the reviewer cannot take within SLA route to the backup (§10).
- Rush review (2 business days) at a premium rate [TBC], never assumed.

## 7. Standing pre-approval: enumerated data-constant refreshes

To keep time-sensitive figures current without a full review cycle, the
reviewer grants **standing pre-approval** for Waypoint to update **only the
following enumerated data constants** on already-approved pages, with
**post-hoc notification** to the reviewer within 5 business days of publish
[TBC on notice window]:

| Refresh event (site calendar key) | Constants covered |
|---|---|
| `ssa-cola-oct` | Annual SSA cost-of-living adjustment percentage and resulting benefit figures |
| `ssi-fbr-jan` | SSI Federal Benefit Rate and CA state supplement figures |
| `ihss-wages-jan` | IHSS county wage tables / provider pay rates |
| `may-revise` / `june-budget` | State budget figures already cited on approved pages (updated amounts only) |
| `rc-pos-annual` | Regional Center purchase-of-service data figures |

Conditions:

- Only the numeric constants and their effective dates change; **surrounding
  legal/benefits language does not**. If a refresh requires changing any
  sentence beyond the constant (e.g., a rule changed, not just a number),
  the item returns to full review — the standing pre-approval does not apply.
- Every refresh is logged in the page changelog and in the notification to
  the reviewer, with source cited.
- The reviewer may, on notification, retract approval of a specific refresh
  or require full re-review; Waypoint corrects or reverts promptly.
- The reviewer may narrow or revoke this standing pre-approval prospectively
  at any time by notice.

## 8. Credential representation warranty

The reviewer represents and warrants, on signing and continuously during the
engagement, that:

- The credential published with their name (bar license, clinical license,
  certification) is accurately stated, currently active, and in good
  standing with the issuing body.
- They will notify Waypoint within 5 business days of any change in that
  status — lapse, suspension, discipline, restriction, or voluntary
  inactive status — at which point publication of the credential pauses
  pending resolution.
- Waypoint may verify the credential with the issuing body at onboarding
  and periodically [TBC — cadence].

## 9. Public credit and publicity consent

- The reviewer consents to publication of their **name, credential, photo,
  and a short bio** (a) on the site's reviewer/trust page, (b) in the
  per-article "Reviewed by" byline, and (c) in each reviewed article's
  structured data (Article JSON-LD `reviewedBy`).
- Credit is factual attribution of review, not endorsement of Waypoint's
  products; Waypoint will not describe the reviewer as endorsing,
  recommending, or being affiliated with the Waypoint app.
- The reviewer approves the exact bio text and photo before first use.
- Consent is revocable prospectively at any time. On revocation or
  termination: no new uses; existing published reviews retain the credit
  line for accuracy of the historical record unless the reviewer requests
  removal, in which case Waypoint removes the name within [10 business
  days — TBC] and the affected pages return to the review queue.

## 10. Backup reviewer

- Waypoint maintains at least one **named backup reviewer** per subject
  area, disclosed to the primary reviewer. Declined or SLA-lapsed items
  route to the backup; the byline always names whoever actually reviewed.
- The reviewer is encouraged (not required) to propose their own backup
  candidates; any backup signs this same form of agreement.

## 11. Independent contractor status

- The reviewer is an independent contractor — not an employee, partner,
  or agent. No benefits, no withholding; reviewer is responsible for their
  own taxes.
- No exclusivity in either direction. The reviewer may work for anyone,
  including organizations serving the same families.
- The reviewer controls how, when, and where the review work is performed,
  within the SLA.
- [Counsel: confirm classification under CA AB 5 / Borello as applicable —
  TBC.]

## 12. Confidentiality and IP (short form — counsel drafts the real thing)

- Pre-publication drafts and internal pipeline docs are confidential until
  the item publishes; the engagement's fee terms are confidential [TBC].
- Reviewer feedback and edits are licensed to (or owned by) Waypoint for
  use in the published content [counsel to pick the mechanism].
- Nothing restricts the reviewer's own practice, writing, or advocacy.

## 13. Termination

- Either party may terminate on **30 days' written notice** [TBC], or
  immediately for material breach (including a §8 credential event).
- In-flight items: reviewer completes or returns them; completed reviews
  are paid regardless of termination.
- On termination the §9 credit rules apply, and Waypoint's cadence drops to
  backup capacity until a replacement is onboarded — this is by design.

## 14. Liability, disclaimers, insurance

- Published pages carry Waypoint's standard disclaimers (general
  information, not legal advice). The review does not make the reviewer the
  author or publisher.
- Indemnification, limitation of liability, and any E&O insurance
  requirement: **deferred to counsel** [TBC]. Intent: reviewer's exposure
  limited to good-faith performance of the scope in §2.

## 15. Open items for counsel

1. Entity name and signature blocks.
2. Governing law/venue (California — county TBC).
3. AB 5 / contractor-classification review (§11).
4. Indemnification + liability caps (§14).
5. IP mechanism (§12).
6. Whether a monthly minimum/retainer is offered (§4, §5).
7. Publicity-rights language for §9 that survives properly.
8. Final fee schedule and payment terms (§5).
