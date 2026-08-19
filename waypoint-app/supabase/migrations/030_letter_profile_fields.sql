-- 030: The details letters keep asking for as [BLANKS]
--
-- Drafts were emitting [school name] / [grade] / [Phone number] because the
-- app had nowhere to store them. Now they live on the profile and preload
-- into every draft. (families.phone and families.parent_last_name already
-- exist from 001 — they were simply never collected in the UI.)

alter table public.children
  add column if not exists school_name text,
  add column if not exists grade text;

comment on column public.children.school_name is
  'The specific school this child attends (district lives on families.school_district). Preloads into letter drafts.';
comment on column public.children.grade is
  'Current grade, free text (e.g. "3rd", "TK", "9"). Preloads into letter drafts.';
