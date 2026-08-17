-- 019: Adaptive engine — action dependencies + completion check-ins (wave 2)
--
-- depends_on: an action stays "locked" in the UI until the action it depends
-- on is completed (e.g. "File 4731 complaint" unlocks after "Escalate to RC
-- director"). Ported from the GAS dependency-locking dashboard.
--
-- follow_up_key: names the FOLLOWUPS check-in set the app shows when this
-- action is completed ("How did the RC call go?"); answers can generate new
-- follow-up actions.

alter table public.actions
  add column if not exists depends_on uuid references public.actions(id) on delete set null;

alter table public.actions
  add column if not exists follow_up_key text;

create index if not exists idx_actions_depends_on on public.actions(depends_on);
