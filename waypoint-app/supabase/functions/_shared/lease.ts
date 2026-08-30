/**
 * A single-flight lease for the outbound loop (phase 7, Lane B). Prevents two
 * runs — two overlapping cron fires, a cron fire racing an owner's manual
 * push-send, or a pg_net retry — from double-sending the same replies.
 *
 * A Postgres advisory *session* lock would not survive Supabase's transaction
 * pooling (acquire and release can land on different pooled connections), so
 * this is a lease ROW instead: acquisition is a single atomic UPDATE that only
 * one caller can win, and it self-heals if a run dies without releasing (the
 * lease simply expires). Table + seed row live in migration 052.
 */
import type { createClient } from 'jsr:@supabase/supabase-js@2';

type Supabase = ReturnType<typeof createClient>;

const LEASE_ID = 1;
/** A run holds the lease at most this long; a crashed run frees it after. */
const LEASE_MS = 4 * 60 * 1000;

/** Try to take the lease. Returns true only for the single winning caller. */
export async function acquireLease(supabase: Supabase): Promise<boolean> {
  const now = new Date();
  const until = new Date(now.getTime() + LEASE_MS).toISOString();
  // Atomic: only rows whose lease has expired can be claimed, and only one
  // concurrent UPDATE observes the pre-image, so exactly one caller gets a row.
  const { data, error } = await supabase
    .from('outbound_run_lock')
    .update({ locked_until: until })
    .eq('id', LEASE_ID)
    .lt('locked_until', now.toISOString())
    .select('id');
  if (error) return false; // table missing / DB error → fail closed, skip this run
  return (data?.length ?? 0) > 0;
}

/** Release the lease so the next run can start immediately. Best-effort. */
export async function releaseLease(supabase: Supabase): Promise<void> {
  await supabase
    .from('outbound_run_lock')
    .update({ locked_until: new Date().toISOString() })
    .eq('id', LEASE_ID);
}
