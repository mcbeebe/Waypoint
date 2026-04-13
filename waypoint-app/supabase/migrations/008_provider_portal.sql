-- Phase 7: Provider Portal (B2B) schema
-- Provider profiles, family connections, messaging, and document access logging

-- ─── Provider Profiles ──────────────────────────────────────────────────────
create table public.provider_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  name text not null,
  provider_type text not null,
  specialty text,
  organization text,
  npi_number text,
  credentials text,
  phone text,
  email text,
  address text,
  bio text,
  is_verified boolean default false,
  is_accepting_patients boolean default true,
  insurance_accepted text[] default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ─── Provider-Family Connections ────────────────────────────────────────────
create table public.provider_family_connections (
  id uuid primary key default gen_random_uuid(),
  provider_profile_id uuid references public.provider_profiles(id) on delete cascade not null,
  family_id uuid references public.families(id) on delete cascade not null,
  status text not null default 'pending', -- 'pending', 'approved', 'declined', 'revoked'
  requested_by text not null, -- 'provider' or 'family'
  created_at timestamptz default now() not null,
  responded_at timestamptz,
  unique (provider_profile_id, family_id)
);

-- ─── Provider-Family Messages ───────────────────────────────────────────────
create table public.provider_messages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid references public.provider_family_connections(id) on delete cascade not null,
  sender_type text not null, -- 'provider' or 'family'
  sender_id uuid references auth.users(id) on delete cascade not null,
  body text not null,
  is_read boolean default false,
  created_at timestamptz default now() not null
);

-- ─── Document Access Log (audit trail) ──────────────────────────────────────
create table public.document_access_logs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete cascade not null,
  provider_profile_id uuid references public.provider_profiles(id) on delete cascade not null,
  accessed_at timestamptz default now() not null
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
create index idx_provider_profiles_type on public.provider_profiles(provider_type);
create index idx_provider_profiles_org on public.provider_profiles(organization);
create index idx_provider_connections_provider on public.provider_family_connections(provider_profile_id);
create index idx_provider_connections_family on public.provider_family_connections(family_id);
create index idx_provider_messages_connection on public.provider_messages(connection_id);
create index idx_doc_access_doc on public.document_access_logs(document_id);

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.provider_profiles enable row level security;
alter table public.provider_family_connections enable row level security;
alter table public.provider_messages enable row level security;
alter table public.document_access_logs enable row level security;

-- Provider profiles: owners manage own, anyone can read for directory
create policy "Providers manage own profile" on provider_profiles for all
  using (user_id = auth.uid());
create policy "Anyone can read provider profiles" on provider_profiles for select using (true);

-- Connections: both parties can see
create policy "Connection participants can view" on provider_family_connections for select
  using (
    provider_profile_id in (select id from provider_profiles where user_id = auth.uid())
    or family_id in (select id from families where user_id = auth.uid())
  );
create policy "Either party can create connection" on provider_family_connections for insert
  with check (
    provider_profile_id in (select id from provider_profiles where user_id = auth.uid())
    or family_id in (select id from families where user_id = auth.uid())
  );
create policy "Either party can update connection" on provider_family_connections for update
  using (
    provider_profile_id in (select id from provider_profiles where user_id = auth.uid())
    or family_id in (select id from families where user_id = auth.uid())
  );

-- Messages: connection participants only
create policy "Connection participants can read messages" on provider_messages for select
  using (connection_id in (
    select id from provider_family_connections where
      provider_profile_id in (select id from provider_profiles where user_id = auth.uid())
      or family_id in (select id from families where user_id = auth.uid())
  ));
create policy "Connection participants can send messages" on provider_messages for insert
  with check (sender_id = auth.uid());

-- Document access logs: providers and document owners
create policy "Providers can log access" on document_access_logs for insert
  with check (provider_profile_id in (select id from provider_profiles where user_id = auth.uid()));
create policy "Document owners can view access logs" on document_access_logs for select
  using (document_id in (select id from documents where family_id in (select id from families where user_id = auth.uid())));

-- ─── Triggers ───────────────────────────────────────────────────────────────
create trigger set_provider_profiles_updated_at before update on public.provider_profiles
  for each row execute function public.set_updated_at();
