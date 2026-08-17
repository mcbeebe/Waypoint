-- 017: Google account linkage for Calendar/Gmail integration (Phase 3)
--
-- Stores the Google OAuth refresh token per user so the google-auth edge
-- function can mint fresh access tokens server-side (the client secret
-- never ships to the browser). Row is deleted on disconnect or when
-- Google reports the grant revoked.

create table if not exists public.google_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_email text,
  refresh_token text not null,
  scopes text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_accounts enable row level security;

drop policy if exists "Users manage own google account" on public.google_accounts;
create policy "Users manage own google account"
  on public.google_accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists set_google_accounts_updated_at on public.google_accounts;
create trigger set_google_accounts_updated_at
  before update on public.google_accounts
  for each row execute function public.handle_updated_at();
