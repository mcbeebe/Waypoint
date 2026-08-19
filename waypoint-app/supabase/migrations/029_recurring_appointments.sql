-- 029: Recurring appointments (Phase-5 depth)
-- Recurrence lives on the base appointment row and is expanded client-side
-- into virtual occurrences — editing the base edits the whole series.

alter table public.appointments
  add column if not exists recurrence text
    check (recurrence in ('weekly', 'biweekly', 'monthly')),
  add column if not exists recurrence_until date;

comment on column public.appointments.recurrence is
  'Repeat rule expanded client-side: weekly | biweekly | monthly. Null = one-off.';
comment on column public.appointments.recurrence_until is
  'Last date (inclusive) the series repeats; null = open-ended.';
