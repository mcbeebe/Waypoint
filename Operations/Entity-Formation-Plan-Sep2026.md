# Waypoint — Entity Formation Plan (Benefit-Entity Options & Registration Steps)

**Date:** September 7, 2026
**Status:** draft — **decision required from owner before step 1**
**Supersedes:** the one-line entity direction in `Roadmap/Payer-Funded-Pivot-Review-Aug2026.md`
§8.2 Phase 0 ("incorporate (C-corp/benefit election)") and the unelaborated line item in
`Operations/099-Vendorization-Packet-Checklist.md` ("Legal entity formed (CA corporation w/ benefit
election)")
**Superseded-by:** —

---

## 1. The finding that changes the question

**A "benefit corporation LLC" does not exist in California.** This is not a technicality — it
decides which of three different filings you make.

California's benefit corporation statute, Corporations Code **§ 14600 et seq.**, defines a benefit
corporation as *a corporation organized under the **General Corporation Law*** that has elected
benefit status. LLCs are governed by an entirely separate title (the California Revised Uniform
Limited Liability Company Act) and there is no parallel benefit-LLC provision anywhere in it.
An LLC in California cannot elect benefit status, full stop.

- [Cal. Corp. Code § 14600 (Justia)](https://law.justia.com/codes/california/code-corp/title-1/division-3/part-13/chapter-1/section-14600/)
- [Cal. Corp. Code § 14600 (FindLaw)](https://codes.findlaw.com/ca/corporations-code/corp-sect-14600/)
- [AB 361 (2011) — the enacting bill](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=201120120AB361)

Some states *do* have a statutory benefit LLC — Delaware's **statutory public benefit limited
liability company**, 6 Del. C. **§ 18-1201–18-1208**, added in 2018. California is not one of them.

So "register Waypoint as an LLC benefit corporation" resolves to one of three real filings, and
they are not close substitutes.

---

## 2. The three real paths

| | **A · California Benefit Corporation** | **B · California LLC + B Corp certification** | **C · Delaware Public Benefit LLC, foreign-qualified in CA** |
|---|---|---|---|
| **Benefit status is…** | **Statutory** — in the Articles, in the Corporations Code | **Contractual + certified** — in the operating agreement, verified by B Lab | **Statutory** — but under Delaware law |
| **Formation filing** | Articles of Incorporation w/ benefit provision, CA SoS | Form **LLC-1**, CA SoS | DE Certificate of Formation + CA Form **LLC-5** |
| **Formation fee** | ~$100 | **$70** | DE fees + **$70** (LLC-5) + certificate of good standing |
| **Year-1 CA franchise tax** | **$0** — corporations are exempt from the $800 minimum in their first taxable year (R&TC § 23153(f)) | **$800.** The LLC first-year waiver expired for LLCs formed after Dec 31, 2023. *(SB 122, signed June 29, 2026: $400 for LLCs formed in TY 2027–2029.)* | **$800** CA + ~$300 DE |
| **Year-2+ recurring** | $800 CA + $25 Statement of Information (annual) | $800 CA + $20 Statement of Information (biennial) | $800 CA + ~$300 DE + two registered agents |
| **Ongoing benefit obligation** | **Annual benefit report** (§ 14630) — narrative on general/specific public benefit against a third-party standard; to shareholders within 120 days of FY end; posted publicly. **Self-certification against the standard is permitted — no audit required.** | B Impact Assessment ≥80 points, third-party verification, recertification, annual fee. **Heavier than a benefit corporation's report.** | Delaware statement to members; plus whatever CA requires of a registered foreign LLC |
| **Licensed professionals on staff** | ✅ Fine | ⚠️ **Risk.** Cal. Corp. Code § 17701.04(e) bars a CA LLC from rendering professional services (services requiring a B&P Code license — incl. LCSW, OT, SLP, MFT) | ⚠️ Same bar — it applies to *foreign* LLCs in California too |
| **SBIR / STTR eligible** | ✅ | ✅ LLCs are an explicitly acceptable legal form | ✅ |
| **DDS / Regional Center vendor** | ✅ | ✅ DS 1891 lists **Limited Liability Company** among accepted entity types | ✅ (as a registered foreign LLC) |
| **DDS SAE grant eligible** | ✅ for-profit CBOs eligible | ✅ | ✅ |
| **Outside investment** | ✅ Standard — stock, option pool, priced rounds, SAFEs | ⚠️ Awkward — no stock, K-1s to every member, most institutional investors decline | ⚠️ Same |
| **Tax default** | C corp (or S election) | Pass-through — **no entity-level federal tax**, profits/losses on the founder's return | Pass-through |

Sources: [Cal. Corp. Code § 17701.04](https://codes.findlaw.com/ca/corporations-code/corp-sect-17701-04/) ·
[6 Del. C. § 18-1201](https://law.justia.com/codes/delaware/title-6/chapter-18/subchapter-xii/section-18-1201/) ·
[§ 18-1202](https://law.justia.com/codes/delaware/2022/title-6/chapter-18/subchapter-xii/section-18-1202/) ·
[Cal. Corp. Code § 14630 — annual benefit report](https://law.justia.com/codes/california/code-corp/title-1/division-3/part-13/chapter-4/section-14630/) ·
[CLA guide to the annual benefit report](https://calawyers.org/california-lawyers-association/cla-esg-committee-guide-template-a-california-benefit-corporations-annual-benefit-report/) ·
[R&TC § 23153](https://codes.findlaw.com/ca/revenue-and-taxation-code/rtc-sect-23153/) ·
[SB 122 (2026)](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260SB122) ·
[DS 1891 Applicant/Vendor Disclosure Statement](https://www.dds.ca.gov/wp-content/uploads/2024/05/DS_1891_2024.pdf) ·
[SBIR/STTR eligibility guide](https://www.sbir.gov/sites/default/files/elig_size_compliance_guide.pdf) ·
[B Lab legal requirement](https://www.bcorporation.net/en-us/about-b-corps/legal-requirements/)

### Path C is a trap — rule it out now

A Delaware public benefit LLC that operates in California must register as a foreign LLC in
California anyway, which means you pay **California's $800 franchise tax regardless**, plus
Delaware's ~$300, plus two registered agents, plus two sets of filings — and you still carry the
§ 17701.04(e) professional-services bar. You buy a Delaware statutory label for roughly
**$1,170+/year in pure overhead** and gain nothing California recognizes. The only reason to
incorporate in Delaware is an institutional priced round, and that reason argues for a Delaware
*corporation*, not an LLC.

---

## 3. Recommendation: **Path A — California Benefit Corporation**

Five reasons, in order of weight:

1. **It is what you actually asked for.** The intent behind "LLC benefit corporation" is a
   mission-locked entity. Path A is the only one where that lock is statutory in your own state
   rather than contractual or certified by a private body.
2. **It is what the plan of record already assumed.** Both
   `Payer-Funded-Pivot-Review-Aug2026.md` §8.2 and `099-Vendorization-Packet-Checklist.md` already
   say *"CA corporation w/ benefit election."* Path A is not a new decision; it is the existing one,
   verified.
3. **The professional-services bar is a live risk on the LLC paths, not a theoretical one.**
   Cal. Corp. Code § 17701.04(e) prohibits a California LLC from rendering professional services.
   The roadmap has Waypoint hiring **W-2 coaches** (Phase 3, code 108) and contemplates outcome
   instruments and clinical-adjacent progress notes. The moment one hire needs an LCSW, OT, SLP, or
   MFT license, an LLC is the wrong container and you are re-forming mid-flight — during
   vendorization, which is the worst possible time.
4. **Year one is cheaper, which is the opposite of most people's assumption.** A California
   corporation is **exempt from the $800 minimum franchise tax in its first taxable year**
   (R&TC § 23153(f)). A California LLC is not — that waiver expired for LLCs formed after
   Dec 31, 2023. Forming a corporation now costs ~$100 in year one; forming an LLC now costs
   $70 + $800.
5. **It keeps the platform option open.** The pivot review's central argument is that the
   multi-tenant staff platform is *"the only branch of this decision tree with venture-class
   valuation attached."* If that branch is ever taken, a corporation is already the right shape —
   stock, an option pool, and a cap table investors will sign. Converting an LLC to a corporation
   later is possible, but it is a taxable, lawyer-billable event you would be paying for at exactly
   the moment cash is tightest.

**The honest cost of Path A:** it is more formal than an LLC. You maintain a board (even a board of
one), bylaws, minutes, and an **annual benefit report**. And a C corp pays entity-level tax, so
early losses sit at the entity as NOLs rather than flowing to your personal return — for a
pre-revenue company with a founder who has W-2 day-job income, **that is a real, quantifiable
give-up.** Ask your CPA to price it before you file; if the personal-tax benefit of pass-through
losses is large enough, an S election on the corporation preserves most of it *without* giving up
the corporate form. That is the question to put to them — not "LLC or corporation."

**If you overrule this and want the LLC anyway** — entirely reasonable if you want pass-through
simplicity, never intend to raise, and are confident you will never employ licensed
professionals — then **Path B** is the honest LLC version, and §5 below gives its steps. Do not use
Path C.

---

## 4. Path A — California Benefit Corporation: step-by-step

### Phase 0 · Decide, before filing anything (week of Sept 7)

- [ ] **Confirm the path** (this document, §3). Blocks everything below.
- [ ] **Engage a California business attorney** — a few hours, not a retainer. Ask specifically
      about: (a) benefit-corporation Articles language, (b) whether code-108 staffing will ever
      require licensed professionals, (c) HIPAA posture (`Payer-Funded-Pivot-Review-Aug2026.md` §5.1
      flags likely covered-entity or business-associate status), (d) COI structure between Waypoint
      as *facilitator* and Waypoint as *provider* — the pivot review calls this **structural, not
      cosmetic**.
- [ ] **Engage a CPA** — C corp vs S election, reasonable-compensation rules, and how the day job
      interacts. Get this before filing; the S election has a deadline tied to formation.
- [ ] **Choose the name.** Check availability with the CA Secretary of State's business search, and
      check the USPTO TESS database for conflicts before committing. Confirm
      `waypointchild.com` alignment.
- [ ] **Write the specific public benefit purpose.** § 14610 requires a general public benefit;
      you may also state a *specific* one, and the annual benefit report must then address it.
      Draft it narrow enough to mean something, broad enough to survive the pivot —
      e.g. *"to improve access to publicly funded disability services for families of children with
      developmental disabilities, with particular attention to families underserved by reason of
      language, income, or geography."* This language is later quoted verbatim in grant narratives,
      the DDS SAE application, and the RCEB program design — write it once, well.

### Phase 1 · Form the entity (target: complete by ~Oct 15, 2026)

> **Why that date:** §5 of `Grant-Pipeline-Sep2026.md` — the federal registration chain runs 4–6+
> weeks and cannot start without an EIN. Jan 5, 2027 (NIH SBIR/STTR) works backward to mid-October.

- [ ] **1.1 File Articles of Incorporation with the benefit provision** — California Secretary of
      State, ~$100. Must state the corporation is a **benefit corporation** and include the public
      benefit purpose from Phase 0. *(Do not use a generic online formation service's default
      template for this step — the benefit language is the whole point and it belongs in the
      Articles, not a side agreement.)*
- [ ] **1.2 Appoint a registered agent** for service of process in California (you may serve, at
      your own address, which then becomes public record — a commercial agent is ~$50–150/yr and
      keeps your home address off the public file).
- [ ] **1.3 Adopt bylaws**, appoint the initial board, issue founder stock, hold the organizational
      meeting, and open the minute book. Include the § 14620 stakeholder-consideration duty so the
      board's standard of care is documented from day one.
- [ ] **1.4 File the Statement of Information** — within **90 days** of incorporation, then
      **annually**. $25.
- [ ] **1.5 Obtain the EIN** from the IRS — free, online, **same day**. Do not pay a third party
      for this. **This is the gate for everything in Phase 2.**
- [ ] **1.6 Make the S-election decision** with your CPA (Form 2553) if that is the outcome of
      Phase 0 — it is deadline-bound relative to formation.
- [ ] **1.7 Open a business bank account** (EIN + Articles + bylaws). **Never commingle.** For a
      single-founder entity this is the #1 way the liability shield gets pierced, and it is also the
      first thing a grant auditor looks at.
- [ ] **1.8 City business license / tax certificate** for your operating city, plus a fictitious
      business name (DBA) filing if you will trade under anything other than the exact legal name.

### Phase 2 · Federal & grant registrations (Oct 15 – Nov 30, 2026)

Strictly ordered — each depends on the one before.

- [ ] **2.1 SAM.gov** → issues the **UEI**. Start first. **3 weeks typical, 6+ worst case.**
- [ ] **2.2 eRA Commons** (NIH) — 2+ weeks. Register the organization, then the PI account.
- [ ] **2.3 SBA Company Registry** — 1–2 business days; issues the SBC Control ID that the NIH
      application requires.
- [ ] **2.4 Grants.gov** — after SAM.gov is active.
- [ ] **2.5 Set grants.gov saved-search alerts** for `NIDILRR` and `93.433`.

### Phase 3 · Operating readiness (parallel with Phase 2)

- [ ] **3.1 Liability insurance** — general + professional/E&O. Required for RCEB vendorization;
      confirm RCEB's limits at the intake call (already an open item in the 099 checklist).
- [ ] **3.2 Workers' comp** — legally required in California from the **first W-2 employee**.
      Post-AB5, the coaches are W-2, not 1099 (`Payer-Funded-Pivot-Review-Aug2026.md` §5.3).
- [ ] **3.3 BAAs** — Supabase (paid tiers) and Anthropic, per the HIPAA posture item.
- [ ] **3.4 Feed the entity into the 099 packet** — `099-Vendorization-Packet-Checklist.md` line 1
      ("Legal entity formed + EIN") closes here, unblocking DS 1890 / DS 1891 / W-9.
- [ ] **3.5 Publish the benefit commitment** on waypointchild.com — § 14630 requires the annual
      benefit report to be posted publicly, and it is also a credibility asset in the DDS SAE
      narrative and with RC service coordinators.

### Phase 4 · Ongoing compliance (calendar these now)

| Cadence | Obligation |
|---|---|
| **Annually, within 120 days of FY end** | **Annual benefit report** (§ 14630) — narrative on general and specific public benefit against a third-party standard; delivered to shareholders and **posted on the website**. Self-certification against the standard is permitted; no audit required. |
| **Annually** | Statement of Information ($25); CA franchise tax ($800 minimum from year 2 — **year 1 is exempt**); federal + state returns |
| **Annually** | Insurance renewal; RCEB vendor-file updates |
| **Ongoing** | Board minutes; keep personal and corporate funds strictly separate |

### Optional · B Corp certification (defer to FY28)

B Lab certification is a **separate, private certification** — not the same thing as being a benefit
corporation, though the two are often confused. It requires a **B Impact Assessment score ≥80**,
third-party verification, an annual fee, and recertification. A California benefit corporation
already satisfies B Lab's legal requirement by virtue of its Articles. **Recommendation: skip for
now.** It is a marketing asset, not a funding unlock — no grant in `Grant-Pipeline-Sep2026.md`
requires or rewards it. Revisit when there is a marketing budget to amplify it.

---

## 5. Path B — California LLC + B Corp certification (only if you overrule §3)

The honest LLC version. Same Phase 0, Phase 2, and Phase 3 as above. Phase 1 differs:

- [ ] **1.1 File Form LLC-1** (Articles of Organization) — CA Secretary of State, **$70**.
- [ ] **1.2 Registered agent** for service of process.
- [ ] **1.3 Draft the operating agreement — this is where the benefit lock lives.** California does
      not give you § 14600, so the mission commitment has to be written into the operating agreement
      as a contractual purpose and a manager duty to weigh stakeholder interests. **Do not
      self-draft this.** It is the entire difference between Path B and a plain LLC, and B Lab will
      later require language of this kind anyway (LLCs must amend their operating agreement
      **within 90 days of certification** to add a social-purpose clause and stakeholder-balancing
      provisions).
- [ ] **1.4 File Form LLC-12** (Statement of Information) within **90 days**, then **biennially**.
      $20.
- [ ] **1.5 EIN** — free, same day.
- [ ] **1.6 Budget the $800 CA franchise tax** — due by the 15th day of the 4th month after
      formation. **No first-year waiver** for LLCs formed after Dec 31, 2023.
- [ ] **1.7 Business bank account; never commingle.**
- [ ] **1.8 City business license / DBA.**
- [ ] **1.9** *(Optional, FY28)* B Corp certification — B Impact Assessment ≥80, verification,
      operating-agreement amendment within 90 days of certification.

**Watch item if you take Path B:** the **$800 franchise tax also applies in year one**, and there is
a genuine timing wrinkle. **SB 122** (signed June 29, 2026) reduces the first-year minimum tax to
**$400** for LLCs, LPs, and LLPs formed in tax years **2027–2029**. Forming in January 2027 instead
of October 2026 saves roughly **$1,200** across 2026–27 — but it **misses the Jan 5, 2027 NIH
deadline entirely** (the registration chain alone is 4–6 weeks) and pushes the federal lane to
April 5, 2027. **Recommendation: form now and pay the $800.** $1,200 is not worth a lost grant
cycle, and it is certainly not worth delaying the 099 vendorization packet, which is gated on the
entity and is Phase-1 *revenue*, not speculative funding.

---

## 6. What this does and does not buy you

**Being a benefit corporation does not win grants.** No program in
`Grant-Pipeline-Sep2026.md` gives benefit corporations preference, a scoring bump, or separate
eligibility. Federal SBIR/STTR cares only that you are a for-profit small business concern;
DDS SAE cares that you are a CBO with an EIN; CHCF cares about the Medi-Cal thesis. Anyone telling
you benefit status unlocks funding is selling something.

**What it actually buys:**

- **A liability shield and a real counterparty** — required before you can sign an RCEB vendor
  agreement, a BAA, an FMS invoice, or a grant award.
- **An EIN**, which is a hard prerequisite for the DDS SAE grant and every federal registration.
- **A mission lock with teeth.** § 14620 obliges directors to consider families, staff, and
  community — not shareholders alone. For a company whose whole thesis is *"free to the family, paid
  by whoever the system already pays,"* that duty is a guardrail against the pressure that will
  eventually arrive to monetize the family side. The pivot review already documents that pressure.
- **Credibility with the exact counterparties that matter** — Regional Centers, DDS, and family
  advocates are structurally skeptical of for-profits in this space. The public benefit purpose and
  the published annual report are a straightforward answer to a question you will be asked
  repeatedly.

---

## 7. Immediate next actions

| # | Action | Owner | By |
|---|---|---|---|
| 1 | **Decide Path A or Path B** | Owner | This week |
| 2 | Book a CA business attorney consult (§4 Phase 0 questions) | Owner | This week |
| 3 | Book a CPA consult — C corp vs S election vs LLC pass-through | Owner | This week |
| 4 | Name availability check (CA SoS + USPTO) | Owner | This week |
| 5 | Draft the specific public benefit purpose | Owner (+ Claude) | Next week |
| 6 | File formation documents | Attorney | By ~Oct 15, 2026 |
| 7 | EIN same day; then start SAM.gov immediately | Owner | Day of filing |
| 8 | Email `SAEgrantprogram@dds.ca.gov` re: next SAE cycle — bundle with the DDS Question-Zero letter | Owner | This month |
| 9 | Apply for self-serve AI/cloud credits | Owner | Week after EIN |

---

*Statutes, fees, and deadlines verified against primary or named sources on September 7, 2026, and
linked at the point of use. Filing fees and tax rules change; re-verify with the California
Secretary of State and the Franchise Tax Board at filing time.*

**This is research to make you a well-prepared client — it is not legal or tax advice, and no
attorney-client relationship exists. Do not file formation documents for an entity that will hold
protected health information, employ W-2 staff in California, and contract with a state agency
without a California business attorney and a CPA reviewing the structure first. The
conflict-of-interest question between Waypoint-as-facilitator and Waypoint-as-provider is
specifically a question for counsel, not for this document.**
