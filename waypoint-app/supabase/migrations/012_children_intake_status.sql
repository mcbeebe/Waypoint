-- 012: Persist Regional Center and IEP status collected during onboarding
-- These two intake answers drive the personalized starter plan (system-seeded
-- actions) and were previously discarded after the onboarding flow finished.

alter table public.children
  add column rc_status text
    check (rc_status in ('unknown', 'known', 'applied', 'active')),
  add column iep_status text
    check (iep_status in ('no', 'unknown', 'eval_done', 'active', 'na'));

comment on column public.children.rc_status is
  'Regional Center status from onboarding: unknown | known | applied | active';
comment on column public.children.iep_status is
  'IEP status from onboarding: no | unknown | eval_done | active | na';
