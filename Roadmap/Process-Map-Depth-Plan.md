# Process Map Depth — life after authorization (plan, Aug 28 2026)

## The gap (owner feedback)

Both maps end at "services get authorized/delivered — or refused." Real
families live in what comes next: Is the service actually being delivered?
Is it the right amount? What lanes exist besides the default? What's the
escalation ladder when it's going wrong? The maps should answer all four —
with the same honesty rules (real clocks, citations, one lever per stage).

## Regional Center map — two new stages + a pathways compare

**New stage 5 · "Living with services — check the delivery."**
The IPP promises hours; vendors deliver (or don't). Content: compare
authorized hours vs delivered hours (ask the provider for service logs);
vendor waitlists don't suspend the RC's IPP obligation — the RC must find
an alternative vendor or another way to deliver; log gaps in the paper
trail. Lever: `rc_request` follow-up ("service authorized on X is not
being delivered — provide a delivery plan or alternative vendor").
Clock (honest): none fixed; the annual IPP review is the backstop and the
30-day requested-review rule is the accelerator.

**Pathways compare card (replaces the bare SDP fork panel): "Two lanes to
receive services."** Side-by-side:
- *Traditional (POS)*: RC picks vendored providers, authorization by
  authorization. Least admin; least control; vendor waitlists are your
  problem in practice.
- *Self-Determination*: annual budget the family directs; non-vendored
  providers allowed; FMS handles payroll. Most control; more admin; entry
  via the steps 0–8 journey (already built).
Also name participant-directed services *within* traditional (respite/
transport PDS where the RC offers it) as the middle lane — verify current
DDS PDS scope at build time.
CTA: "Compare lanes for Teddy" → PathDecider (exists) + SDP journey.

**New stage 6 · "Not working? The escalation ladder."** Four rungs, in
order, each with its lever:
1. Put it in writing + request the IPP review (30-day clock — exists).
2. Demand the NOA, then **appeal it — 60 days** (aid paid pending if filed
   within 30) → verify W&I §4710.5 exact windows at build.
3. **§4731 complaint** to the RC director — response due within 20 working
   days (template exists: `dds_4731_complaint`).
4. Free advocates: **OCRA** (Office of Clients' Rights Advocacy) at every
   RC + Disability Rights California — say plainly these are free.

## School map — one new stage + a "can't deliver" options panel

**New stage 5 · "Is it working? Check the data."** The IEP is a contract
with numbers in it. Content: goals must carry measurable baselines and
progress reporting at least as often as report cards (verify Ed Code
§56345(a)(3)); request the **service delivery logs** (minutes delivered vs
IEP minutes — shortfalls are compensable); slow/no progress on goals is
evidence for more services, not a reason to lower goals; if the district
can't produce data, that's the red flag. Lever: NEW letter template
`progress_data_request` — asks for current progress on every goal +
service logs for the last grading period (5-business-day records clock
applies). Default request drafted at build.

**New panel · "If the district can't deliver."** The options most families
are never told, one line each:
- **NPA/NPS**: district funds a non-public agency/school when it can't
  provide FAPE itself.
- **Compensatory education**: missed minutes are owed back (remedy in
  complaints/due process — no statute clock; say so honestly).
- **ESY**: extended school year when regression + slow recoupment.
- **504-only lane** for accommodations-level needs.
CTA: Ask AI (these are conversations, not single letters).

**Existing stage "Disagree? You have real leverage"** gains one line:
unilateral placement + reimbursement requires 10-business-day written
notice (verify 34 CFR 300.148) — a trap families fall into silently.

## Build plan (after your go)

1. **Content + provenance** — processMap stage additions (trilingual),
   new `progress_data_request` letter + sent moment, pathway-compare data
   in a pure module; verify + register every new citation (contentSources
   coverage guard enforces this mechanically). Locale parity extended.
2. **Pathways compare UI** — a two/three-lane compare card component used
   by the RC map (traditional vs SDP) with the PathDecider beneath it.
3. **You-are-here derivation** — unchanged for school (active → data
   stage); RC active + has_ipp lands on "living with services."

Citations to verify at build (search + register before any copy ships):
Ed Code §56345(a)(3) progress-report cadence · W&I §4710.5 appeal windows
(60d / 30d aid-paid-pending) · §4731 20-working-day response · 34 CFR
§300.148 10-day notice · current DDS PDS scope in traditional POS.

## Open questions for the owner

- Pathways compare: RC map only, or also a school variant (district
  services vs NPA vs 504-only)?
- Should "check the data" auto-create a recurring reminder (each grading
  period) in the tracker?
- Escalation ladder: render as a stage card (matches the map) or a
  distinct stepped "ladder" visual (mockup shows the ladder)?
