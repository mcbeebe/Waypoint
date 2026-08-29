# Request Case File — plan (Aug 29 2026)

One request = one thread = one honest clock. Owner-approved increment
(follow-up from the Home Tools redesign); design selected by a
three-approach panel (evidence-first / minimal-change / lifecycle-first)
judged by a parent-advocate, a staff-engineer, and a legal-aid lens —
unanimous winner: **lifecycle-first**, with judge-mandated grafts.

## The design

**Data spine (migration 047, additive + idempotent).** One durable link:
`communications.request_id → family_requests(id)`, partial index,
backfill from the 045 `communication_id` founders, and a before-insert
trigger so Gmail-synced replies inherit the request from their thread —
guarded twice: family-scoped, and a thread that maps to more than one
request never auto-attaches (mis-attribution is worse evidence than
omission). The gmail edge function inserts through the user-JWT client,
so the trigger covers sync with zero function changes.

**Pure module `lib/requestCase.ts`** (trilingual, tested):
- `eventAt()` — the load-bearing honesty rule: `logCommunication`
  stamps `sent_at = now()` even on backdated rows, so non-Gmail rows
  order by `occurred_at`, never `sent_at`. Governs thread order,
  silence-days, and export chronology.
- `provenanceOf()` — every item is `gmail` (provider timestamp),
  `contemporaneous` (logged within 48h), or `recalled` — shown, never
  hidden.
- `threadFor()` — union of request_id / origin-letter / Gmail-thread
  closure, ambiguity-guarded, works pre-047 via legacy links.
- `deriveStage()` + `nextLever()` — stage from the template keys
  actually on record, mapped to the existing 4-rung escalation ladder
  (never a parallel ladder; rung 4 = OCRA, free). Collaborative-first
  is structural: an unanswered incoming reply nulls the next lever —
  silence, not conversation, climbs the ladder. Formal venue is
  system-correct (CDE for IEP types, §4731 for RC types). A stale
  backdated ask gets "re-ask fresh in writing" instead of escalation.

**UI.** New `RequestCaseScreen` (clock header · 4-rung strip · thread
timeline with provenance chips · in-thread reply via GmailReplyModal ·
log-a-call · export). Tracker cards open the case and gain reply chips;
the add form gains "when did you ask?" + channel pills with two-clock
microcopy. Letters stamps `request_id` on founding and lever letters
(suppressing duplicate tracker rows, both branches tested). Home badges
swap atomically: badge the job, not the channel — a reply on a tracked
request badges Requests and opens the case. Scoped fetch by
request_id/thread defeats the 200-row window on long cases.

**Dossier export (`lib/requestDossier.ts`).** Honest, no fake PDF
button: print-styled standalone HTML (web: download + open-and-print →
real dated PDF in two taps; native: text share, labeled). Contents:
two-clock provenance header, the statutory clock verbatim with citation,
core evidence table (exact-linked items only, strict `eventAt` order,
provenance column), closure-only items in a default-excluded "Related
correspondence" section, an attestations section stating exactly what
the packet can and cannot prove, SHA-256 fingerprint in the footer
(expo-crypto already present).

**Backdating.** Two honest clocks, both already in schema:
`requested_on` (family-asserted) vs `created_at` (server). "Asked by
phone May 2 · logged in Waypoint Aug 29" appears in the case and the
export; deadlines computed from family-reported dates carry a caveat.

## Build phases (~6–7 days, after owner go)

1. **Data spine + pure logic** (~2d): migration 047, request_id
   passthrough with pre-migration retry fallback, requestCase.ts with
   fixtures for the sent_at trap, the ambiguous thread, the unanswered
   reply, and pre-047 data.
2. **Unified view + badge-the-job** (~2.5d): AddEntryModal extraction,
   RequestCaseScreen, tracker/letters wiring, atomic Home badge swap.
3. **Dossier export + copy polish** (~1.5–2d): requestDossier.ts with
   tests asserting chronology, backdate labels, closure exclusion, and
   that no immutability overclaim appears anywhere.

## Open questions for the owner

1. **Premium gate on the export?** Consistency says gate it like other
   exports; two judges flagged that paywalling a hearing-bound family at
   their worst moment is the wrong moment to upsell. Default until you
   decide: gated. My recommendation: make the dossier free — it is the
   trust moment of the whole product.
2. **expo-print dependency?** Approving it upgrades native to real
   one-tap PDF on the same renderer; without it, web is the printable
   path (honestly labeled). Recommendation: approve for phase 3.
3. **Detach/attach control** for off-topic replies inside a request's
   thread (v1 shows a provenance caption; a manual "not part of this
   case" control is a v1.1 candidate).
4. **ES/VI native-speaker review** of the legal-adjacent dossier copy
   before wide release — who reviews?
5. **Thin-thread copy** for phone-first families (case view must read
   "your record so far — add each call," never look broken).
