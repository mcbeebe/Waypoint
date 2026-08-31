# 004 — Build plan: the Learn content engine (phase 8)

**Date:** 2026-08-30 · **Status:** adopted (reframed 2026-08-31)
**Read `intent.md` first.** This is the comprehensive plan the Home-Rebuild-Plan
phase-8 row and Undivided item 20 both say must exist before any code.

Everything here is family-facing content and a deploy surface (SEO/web) →
**every slice waits for the owner** after `/adversary`. Nothing ships on the
auto-merge grant.

---

## Reframe (owner decision, 2026-08-31) — two doors, one system

The owner reframed the whole initiative, and this is the decision record. The
blog and the AI chat are **not two products with a widget between them.** They
are **two interfaces to one knowledge-and-action system:**

- the **blog** is the *knowledge* layer — discover, understand;
- the **AI** is the *reasoning* layer — personalize, plan;
- the **app** is the *action + memory* layer — draft, track, remember.

The product is the **continuity** between them: *"Tell us what's going on. We'll
help you understand it, figure out what to do next, and keep track of it so you
don't have to explain your child again next week."* The loop is **Discover →
Understand → Personalize → Plan → Act → Remember → Continue.** Mocked up and
signed off across three prototypes (front doors → article → the bridge).

Four consequences that change the slices below:

1. **One canonical knowledge layer, not two stores.** The blog (`learnLibrary`)
   and the AI KB (`knowledge_embeddings`) must retrieve from the *same* record,
   so the AI can only ever cite an article a parent can also read. This
   **promotes slice 8-4 (AI-KB unification) from an optional fast-follow to the
   spine** — it becomes Slice B, its own owner-gated, deploy-surface initiative.
2. **Articles are conversation starters, not encyclopedia entries.** Reframed
   titles ("What is an IEP — *and does my child need one?*"), quick-answer-first,
   and a **required conversation bridge** on every article. See `editorial-spec.md`.
3. **The AI produces artifacts, not answers.** The keepable checklist and the
   letter-via-Letters flow (slice **8-0b**, shipped) are the first bricks of
   exactly this — the earliest instance, not a thing this reframe discards.
4. **Two doors, never forced.** Browse *and* Ask. The AI sits on top of the
   content and never replaces navigation; a parent who just wants the checklist
   gets the checklist.

### Re-sequencing under the reframe

- **Slice A — the conversation bridge (in-app, cheap, build first).** The bridge
  schema fields on every article, the bridge rendered on the reader, and the
  handoff wired into the AI with the article's context preloaded. Pure-module-
  first, fully tested, `/adversary` + owner gate. *This is what's being built now.*
- **Slice B — the canonical knowledge layer (its own initiative).** AI-KB
  unification + the static SEO/RAG front doors (was 8-3 + 8-4). Deploy-surface,
  owner-gated; the front-doors prototype is its spec.
- Slices **8-1** (derivation harness) and **8-0/8-0b** (reader + tools) already
  shipped and stand. **8-2** (authoring pipeline + first bodies) and **8-5**
  (grow to ~40 + measure) continue as the content lane, now feeding both doors.

The original slice catalogue below is kept as the record; Slice A/B are the
lens the owner adopted for what ships next.

---

## The thesis: derive, don't author

The failure mode to avoid is a hand-maintained magazine. So an article is not
free prose — it is a **projection of a module we already own and test**:

| Source module (exists today) | Yields articles about |
|---|---|
| `src/lib/escalationLadder.ts` (rungs) | "When services aren't working" — each rung, its trigger, its letter |
| `src/lib/processMap` (RC / school stages) | "How the Regional Center works" / "…the school system" — each stage + its deadline |
| `src/lib/resourceStack` (benefit layers) | "Money and benefits, layer by layer" — each layer, what unlocks it |
| `src/data/contentSources.ts` (26 registry claims) | one explainer per statutory claim, citation-first |
| `gas-mvp` Entity Navigation Matrix (~86k words) | the prose seed the AI drafts bodies from |

Because each article is generated from a structured source, the count grows
without a proportional maintenance burden, and content **cannot drift** from the
law/logic the app already enforces. Target **~40**, then STOP and measure — do
not race to hundreds (intent.md, "the one danger").

---

## Slices (each a PR, owner-gated)

### 8-0 · The container: article schema + a real reader
The content is worthless without somewhere to read it. Build the container first.
- Extend `LearnArticle` (pure module) with a **`body`** — an ordered list of
  typed sections (`para`, `steps`, `callout`, `citationRef`), trilingual — and
  a **`reviewedOn`** ISO date. Keep `summary`, `citation`, `actionLabel`,
  `target`.
- New **`ArticleScreen`** (Home stack, registered in `routeGraph.ts` so it
  resolves from every tab): renders the body, the **tappable `Citation`**
  component (already built — `Citation.tsx`), the reviewed-on date, and the
  end-action CTA (`target`). Back returns to Learn.
- Migrate the existing 4 articles to the new shape as the fixtures; a render
  test (ui suite) proves an article reads end-to-end and the citation opens.
- **No content flood here** — just the container, reader, and provenance wiring.
- Gate note: adds a screen → `navRegistry.test` + a ui render test.

### 8-1 · The derivation harness (pure, tested)
- `src/lib/learnDerive.ts` — pure functions that project the source modules
  above into `LearnArticle` stubs: title, summary, citation (pulled from the
  registry so it's covered by the provenance test by construction), `target`
  (the action the app already performs), and the `reviewedOn` date.
- Deterministic and node-tested: given the ladder/processMap/resourceStack, it
  emits a stable set of article stubs. `learnLibrary` composes these with the
  hand-written bodies from 8-2.
- This is the "40 without 40× the work" engine.

### 8-2 · Authoring pipeline + first content batch (~10–15 bodies)
- Document the repeatable pipeline in this folder:
  **Matrix (seed) → AI draft body → human review → provenance gate.**
  The AI drafts a body from the Matrix cell(s) for a derived stub; a human
  reviews for accuracy and tone (collaborative-first, status-not-blame); the
  `contentSources.test` fails the build on any un-sourced claim.
- Land the first ~10–15 bodies, trilingual, each ending in a real action.
  Translation follows the funnel's existing es/vi gate.
- Decision for the owner: **hand-author vs AI-draft-then-review.** Recommend
  AI-draft-from-Matrix + mandatory human review — it's the only way a solo
  owner reaches 40 cited articles without an editor-year, and the provenance
  test + human gate keep it honest.

### 8-3 · SEO: static public web pages
The point of Learn is discovery, and today there is zero SEO.
- Extend `scripts/postbuild-web.js`: after `expo export`, read the pure library
  (via a small `learn-content.json` emitted by a tsx step, the same tsx the
  `scripts/` dir already uses) and **generate one static, crawlable HTML page
  per article** — real `<title>`, meta description, Open Graph, canonical, and
  **JSON-LD `Article` + `FAQPage`** — plus **`sitemap.xml`** and **`robots.txt`**.
- The in-app Learn panel reads the same content module, so app and web never
  diverge. **No expo-router migration** — static generation from the pure module
  is far cheaper and keeps the SPA intact.
- Deploy surface → `/adversary` + owner; verify the generated pages validate
  (Rich Results / Lighthouse) before merge.

### 8-4 · (Decision) Feed the AI the same canonical content
Today Learn (`learnLibrary`) and the AI KB (`knowledge_embeddings`, FTS) are
**two disconnected stores**. Optionally add a seed step that exports the
authored, sourced articles into `knowledge_embeddings` so the AI **cites the
same articles** a parent can read — one source of truth, and the AI stops being
able to say something Learn contradicts.
- **Owner decision: do now, or defer?** Recommend a fast-follow after 8-2 (the
  content has to exist first), not a blocker for shipping the reader + SEO.

### 8-5 · Grow to ~40 + the evidence loop
- Fill out the remaining derived bodies to ~40, then **stop and measure**.
- Instrument read-rate / pin-rate on Learn so the reserved-5th-tab decision
  (audit item 18: *"the slot is reserved for Learn on evidence, and pin rate
  becomes that evidence"*) finally has its evidence. Promotion to a tab is a
  **later, separate** decision this initiative only feeds.

---

## Sequencing & dependencies

```
8-0 container ─┬─ 8-1 derive ── 8-2 first bodies ─┬─ 8-3 SEO ── 8-5 grow+measure
               │                                   └─ 8-4 AI-KB (decision)
               └─ benefits from Track C (visual pass) but does not block on it
```

- **8-0 and 8-1 are safe to build the moment the owner says go** — they're
  container + pure engine, no content-team dependency.
- **8-2 onward is the content lane** — paced deliberately ("do not race").
- **Adjacent, not owned here:** person-centred framing (audit items 16–19, the
  Binder/PCP work) is its own track; this initiative only reserves the tab slot
  it references. Track C's visual system improves the reader but isn't a gate.

## Open decisions for the owner (surface before 8-0)

1. **Body schema:** typed sections (recommended — renders consistently, easier
   SEO/JSON-LD) vs a markdown string (faster to author, harder to art-direct).
2. **Authoring:** AI-draft-from-Matrix + human review (recommended) vs
   hand-author only.
3. **AI-KB unification (8-4):** now or fast-follow (recommended: fast-follow).
4. **Depth:** confirm the ~40 ceiling and the "stop and measure" gate before 8-5
   — this is the guardrail against the roadmap's most dangerous line.
