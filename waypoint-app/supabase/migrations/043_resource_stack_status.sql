-- 043: Resource Stack layer statuses + SDP journey position
-- (Roadmap/Resource-Stack-Journey-Plan.md, phase 2). Self-reported in
-- onboarding/profile and editable from the stack; sdp_step is the family's
-- position on the 0-8 enrollment journey (DDS D-2026-SDP-002), null = not
-- started. Where a facilitation case exists, sdp_cases.stage is the richer
-- source; sdp_step is the lightweight self-report for unfacilitated families.

alter table public.children
  add column medi_cal_status text
    check (medi_cal_status in ('none', 'applied', 'active', 'not_eligible', 'unknown')),
  add column ihss_status text
    check (ihss_status in ('none', 'applied', 'active', 'not_eligible', 'unknown')),
  add column ssi_status text
    check (ssi_status in ('none', 'applied', 'active', 'not_eligible', 'unknown')),
  add column sdp_step integer
    check (sdp_step between 0 and 8);

comment on column public.children.medi_cal_status is
  'Medi-Cal status (institutional deeming path): none | applied | active | not_eligible | unknown';
comment on column public.children.ihss_status is
  'IHSS status: none | applied | active | not_eligible | unknown';
comment on column public.children.ssi_status is
  'SSI status: none | applied | active | not_eligible | unknown';
comment on column public.children.sdp_step is
  'Self-reported SDP journey step 0-8 (D-2026-SDP-002 sequence); null = not started';
