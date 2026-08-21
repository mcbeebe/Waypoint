-- 033: Keep the IEP analysis, and everything that makes it useful
--
-- The analysis lived only in navigation state: leaving the screen threw
-- away a full legal read of the document, and re-opening it meant paying
-- for the AI again. Saved goals also dropped the most valuable part — the
-- suggested rewrite and the citations behind it.

-- ── The analysis itself, stored with the document it describes ─────────────
alter table public.documents
  add column if not exists analysis jsonb,
  add column if not exists analyzed_at timestamptz;

comment on column public.documents.analysis is
  'Full IEPAnalysisResult from the analyze-iep pipeline: goals, issues, parent summary.';
comment on column public.documents.analyzed_at is
  'When that analysis was produced. Null means this document has not been read yet.';

-- ── What the analysis said about each tracked goal ────────────────────────
alter table public.iep_goals
  add column if not exists strength text,
  add column if not exists suggested_rewrite text,
  add column if not exists issues jsonb,
  add column if not exists legal_citation text;

comment on column public.iep_goals.strength is
  'How the analysis rated this goal: strong | adequate | weak.';
comment on column public.iep_goals.suggested_rewrite is
  'The measurable version of this goal to bring to the IEP meeting.';
comment on column public.iep_goals.issues is
  'Findings for this goal: [{severity, issue, explanation}].';
comment on column public.iep_goals.legal_citation is
  'Regulation supporting the rewrite, e.g. 34 C.F.R. 300.320(a)(2)(i)(A).';
