-- =============================================================================
-- agent_cache — stores the latest 24/7 scanner result (key='latest') and a
-- debounce lock (key='lock'), plus a small history. Written by the server-side
-- scanner using the service_role key (which bypasses RLS). Run this once in the
-- Supabase SQL editor.
-- =============================================================================

create table if not exists public.agent_cache (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_history (
  id uuid primary key default gen_random_uuid(),
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_agent_history_created on public.agent_history(created_at desc);

-- RLS on: only the service_role (server) reads/writes. No public policies needed.
alter table public.agent_cache enable row level security;
alter table public.agent_history enable row level security;
