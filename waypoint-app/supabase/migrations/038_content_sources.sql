-- 038: Content provenance (PRD W-F: F2, REQ-1001) — the auditable mirror of
-- src/data/contentSources.ts. Every statute, rate, and rule the app asserts
-- lives here with where it came from and when a human last verified it, so
-- ops can audit and schedule re-verification without a deploy.
--
-- The app renders from its bundled registry (offline-safe, versioned with
-- the code); this table is the operational ledger. The vitest coverage
-- guard keeps the bundled registry complete; keep this seed in sync when
-- entries change. (Numbering note: the PRD sketched content_sources as 042;
-- it ships early because eligibility cards already display provenance.)

create table public.content_sources (
  key text primary key,
  title text not null,
  -- Exact UI citation strings this source covers (e.g. 'W&I §4643')
  covers text[] not null default '{}',
  url text not null,
  claim text not null,
  verified_on date not null,
  -- Re-verification cadence; ops queries for stale rows
  review_after date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.content_sources enable row level security;

-- World-readable to signed-in users (it is public legal information);
-- writes are admin-only.
create policy "Authenticated read content sources" on public.content_sources
  for select using (auth.role() = 'authenticated');

create policy "Admins manage content sources" on public.content_sources for all
  using (exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  ));

-- Seed — mirrors src/data/contentSources.ts as of 2026-08-23
insert into public.content_sources (key, title, covers, url, claim, verified_on, review_after) values
  ('lanterman_act', 'Lanterman Developmental Disabilities Services Act',
   array['Lanterman Act', 'Lanterman Act, W&I §4512 · §4643'],
   'https://leginfo.legislature.ca.gov/faces/codes_displayexpandedbranch.xhtml?tocCode=WIC&division=4.5.',
   'Regional Center services: entitlement basis, no income test, no cost to families; §4512 defines developmental disability.',
   '2026-08-23', '2027-02-23'),
  ('wic_4643', 'Welfare & Institutions Code §4643',
   array['W&I §4643'],
   'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=4643.',
   'Regional Center assessment within 120 days of intake; 60 days when delay risks harm.',
   '2026-08-23', '2027-02-23'),
  ('wic_4646', 'Welfare & Institutions Code §4646 · §4646.5(b)',
   array['W&I §4646 · §4646.5(b)', 'W&I §4646.5(b)'],
   'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=4646.5.',
   'IPP within 60 days of eligibility determination; a requested IPP review meeting must be held within 30 days.',
   '2026-08-23', '2027-02-23'),
  ('wic_4710', 'Welfare & Institutions Code §4710',
   array['W&I §4710'],
   'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=4710.',
   'Denials and changes require a written Notice of Action with appeal rights.',
   '2026-08-23', '2027-02-23'),
  ('wic_4685_8', 'Welfare & Institutions Code §4685.8 (Self-Determination Program)',
   array['W&I §4685.8'],
   'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=4685.8.',
   'SDP: annual family-directed budget; budget basis is prior-12-month authorized services plus documented unmet needs (AB 143); independent-facilitator independence bar.',
   '2026-08-23', '2027-02-23'),
  ('wic_12300', 'Welfare & Institutions Code §12300 (IHSS)',
   array['W&I §12300'],
   'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=12300.',
   'In-Home Supportive Services: paid in-home care hours; a parent can be the paid provider.',
   '2026-08-23', '2027-02-23'),
  ('edc_56321_56344', 'Education Code §56321 · §56344',
   array['Ed Code §56321 · §56344', 'Ed Code §56321'],
   'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=EDC&sectionNum=56321.',
   'Assessment plan within 15 calendar days of a written special-education referral; IEP within 60 days of consent (§56344).',
   '2026-08-23', '2027-02-23'),
  ('idea_part_c', 'IDEA Part C / California Early Start',
   array['IDEA Part C · Early Start'],
   'https://www.dds.ca.gov/services/early-start/',
   'Early intervention ages 0–3 through Regional Centers at no cost to families.',
   '2026-08-23', '2027-02-23'),
  ('ssa_cola_2026', 'SSA 2026 Cost-of-Living Adjustment (SSI federal benefit rate)',
   array['SSA 2026 COLA'],
   'https://www.ssa.gov/cola/',
   'SSI federal benefit rate for 2026 (see benefitFigures.SSI_FBR_MONTHLY); California adds a state supplement.',
   '2026-08-23', '2026-11-01'),  -- COLA announced each October: re-verify then
  ('dds_sdp_guidance_2024', 'DDS Self-Determination Program guidance (July 2024)',
   array['DDS SDP guidance (2024)'],
   'https://www.dds.ca.gov/initiatives/sdp/',
   'Service code 024 person-centered-plan reimbursement cap ($1,000) and code 099 transition-support cap (40 hours) — see benefitFigures.',
   '2026-08-23', '2027-02-23');
