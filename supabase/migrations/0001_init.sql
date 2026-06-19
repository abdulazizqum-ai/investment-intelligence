-- =============================================================================
-- Investment Intelligence Multi-Agent System — Supabase schema
-- Run in the Supabase SQL editor (or `supabase db push`).
-- Bilingual narrative fields are stored as JSONB: { "en": "...", "ar": "..." }.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Users / profiles / settings
-- (auth.users is managed by Supabase Auth; public.users mirrors profile data)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  locale text not null default 'en' check (locale in ('en','ar')),
  created_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  risk_preference text default 'moderate' check (risk_preference in ('conservative','moderate','aggressive')),
  investment_horizon text default 'medium_term' check (investment_horizon in ('short_term','medium_term','long_term')),
  language text default 'en' check (language in ('en','ar')),
  api_keys jsonb default '{}'::jsonb,
  data_sources jsonb default '{}'::jsonb,
  watchlist_settings jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  email_alerts boolean default true,
  in_app_alerts boolean default true,
  telegram_alerts boolean default false,
  whatsapp_alerts boolean default false,
  min_priority text default 'medium' check (min_priority in ('critical','high','medium','low')),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Agents
-- ---------------------------------------------------------------------------
create table if not exists public.agents (
  id text primary key,
  name jsonb not null,
  role jsonb not null,
  status text not null default 'idle' check (status in ('active','idle','error')),
  last_run timestamptz,
  confidence int default 0,
  data_sources jsonb default '[]'::jsonb
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id text references public.agents(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text default 'info' check (status in ('info','warn','error')),
  output jsonb,
  message jsonb
);

-- ---------------------------------------------------------------------------
-- News / market events / causality
-- ---------------------------------------------------------------------------
create table if not exists public.news_events (
  id text primary key,
  headline jsonb not null,
  summary jsonb,
  category text not null,
  source text,
  url text,
  published_at timestamptz not null,
  importance_score int default 0,
  is_market_moving boolean default false,
  affected_assets jsonb default '[]'::jsonb,
  analyzed_by jsonb default '[]'::jsonb
);

create table if not exists public.market_events (
  id text primary key,
  title jsonb not null,
  description jsonb,
  category text,
  occurred_at timestamptz not null,
  importance_score int default 0,
  surprise boolean default false,
  affected_assets jsonb default '[]'::jsonb,
  related_news_id text references public.news_events(id) on delete set null,
  causality_chain_id text
);

create table if not exists public.causality_chains (
  id text primary key,
  event_id text references public.market_events(id) on delete cascade,
  cause jsonb,
  chain jsonb,
  direct_impact jsonb,
  second_order_impact jsonb,
  third_order_impact jsonb,
  beneficiaries jsonb default '[]'::jsonb,
  losers jsonb default '[]'::jsonb,
  affected_assets jsonb default '[]'::jsonb,
  time_horizon text,
  urgency_level text,
  trade_opportunity_probability int default 0
);

-- ---------------------------------------------------------------------------
-- Assets / companies / fundamentals
-- ---------------------------------------------------------------------------
create table if not exists public.assets (
  id text primary key,
  name text not null,
  ticker text,
  asset_type text not null,
  sector text,
  market_cap numeric,
  price numeric
);

create table if not exists public.companies (
  id text primary key references public.assets(id) on delete cascade,
  name text not null,
  ticker text not null,
  sector text,
  market_cap numeric,
  price numeric,
  media_mentions_count int default 0,
  noise_level text,
  early_opportunity_score int default 0,
  urgency_score int default 0,
  bull_case jsonb,
  bear_case jsonb,
  neutral_case jsonb,
  final_score int default 0
);

create table if not exists public.company_financials (
  id uuid primary key default gen_random_uuid(),
  company_id text references public.companies(id) on delete cascade,
  revenue numeric, net_income numeric, gross_margin numeric, operating_margin numeric,
  free_cash_flow numeric, debt numeric, cash_position numeric, cash_burn numeric,
  health text check (health in ('strong','improving','risky','weak')),
  as_of timestamptz default now()
);

create table if not exists public.company_growth_metrics (
  id uuid primary key default gen_random_uuid(),
  company_id text references public.companies(id) on delete cascade,
  revenue_growth numeric, customer_growth numeric, hiring_growth numeric,
  new_contracts int, partnerships int, product_adoption numeric, market_expansion numeric,
  growth_score int default 0,
  as_of timestamptz default now()
);

create table if not exists public.valuations (
  id uuid primary key default gen_random_uuid(),
  company_id text references public.companies(id) on delete cascade,
  pe numeric, forward_pe numeric, peg numeric, ev_ebitda numeric, price_to_sales numeric,
  dcf_fair_value numeric,
  rating text check (rating in ('undervalued','fair_value','overvalued')),
  as_of timestamptz default now()
);

create table if not exists public.smart_money_activity (
  id uuid primary key default gen_random_uuid(),
  company_id text references public.companies(id) on delete cascade,
  institutional_ownership numeric, hedge_fund_activity text, insider_buying int, insider_selling int,
  thirteen_f_change numeric, unusual_volume boolean, net_flow text,
  as_of timestamptz default now()
);

create table if not exists public.macro_indicators (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  label jsonb,
  value numeric, previous numeric, consensus numeric,
  surprise boolean default false, trend text,
  as_of timestamptz default now()
);

create table if not exists public.asset_prices (
  id uuid primary key default gen_random_uuid(),
  asset_id text references public.assets(id) on delete cascade,
  price numeric, change numeric, recorded_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Risk / recommendations / alerts
-- ---------------------------------------------------------------------------
create table if not exists public.risks (
  id text primary key,
  subject jsonb,
  overall_score int default 0,
  level text,
  components jsonb default '[]'::jsonb,
  position_size_suggestion text,
  stop_loss numeric,
  max_drawdown_scenario jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.recommendations (
  id text primary key,
  asset_id text references public.assets(id) on delete set null,
  ticker text not null,
  asset_type text not null,
  recommendation_type text not null check (recommendation_type in ('buy','hold','watch','sell')),
  time_horizon text not null check (time_horizon in ('short_term','medium_term','long_term')),
  confidence_score int default 0,
  risk_score int default 0,
  urgency_score int default 0,
  entry_zone jsonb,
  target_zone jsonb,
  stop_loss numeric,
  thesis jsonb,
  reason jsonb,
  catalyst jsonb,
  invalidation_conditions jsonb,
  related_news_id text references public.news_events(id) on delete set null,
  causality_chain_id text references public.causality_chains(id) on delete set null,
  supporting_agents jsonb default '[]'::jsonb,
  agent_outputs jsonb default '[]'::jsonb,
  status text default 'active' check (status in ('active','approved','rejected','expired','closed')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.urgent_alerts (
  id text primary key,
  recommendation_id text references public.recommendations(id) on delete set null,
  ticker text not null,
  asset_type text not null,
  alert_title jsonb not null,
  priority text not null check (priority in ('critical','high','medium','low')),
  urgency_score int default 0,
  confidence_score int default 0,
  risk_score int default 0,
  expected_move jsonb,
  time_window text,
  reason jsonb,
  related_news_id text references public.news_events(id) on delete set null,
  impact_chain_id text references public.causality_chains(id) on delete set null,
  entry_zone jsonb,
  target_zone jsonb,
  stop_loss numeric,
  alternative_scenario jsonb,
  invalidation_conditions jsonb,
  supporting_agents jsonb default '[]'::jsonb,
  delivery_channels jsonb default '[]'::jsonb,
  status text default 'new' check (status in ('new','reviewed','dismissed','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  type text not null,
  title jsonb,
  body jsonb,
  priority text default 'medium',
  read boolean default false,
  link text,
  created_at timestamptz not null default now()
);

create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  asset_id text references public.assets(id) on delete cascade,
  ticker text,
  created_at timestamptz not null default now(),
  unique (user_id, ticker)
);

create table if not exists public.translations (
  id uuid primary key default gen_random_uuid(),
  namespace text not null,
  key text not null,
  en text,
  ar text,
  unique (namespace, key)
);

-- ---------------------------------------------------------------------------
-- Helpful indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_recs_status on public.recommendations(status);
create index if not exists idx_recs_horizon on public.recommendations(time_horizon);
create index if not exists idx_alerts_priority on public.urgent_alerts(priority);
create index if not exists idx_alerts_status on public.urgent_alerts(status);
create index if not exists idx_news_published on public.news_events(published_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Shared research tables are world-readable to authenticated users.
-- User-owned tables are restricted to the owning user.
-- ---------------------------------------------------------------------------
alter table public.recommendations enable row level security;
alter table public.urgent_alerts enable row level security;
alter table public.news_events enable row level security;
alter table public.market_events enable row level security;
alter table public.causality_chains enable row level security;
alter table public.companies enable row level security;
alter table public.assets enable row level security;
alter table public.company_financials enable row level security;
alter table public.company_growth_metrics enable row level security;
alter table public.valuations enable row level security;
alter table public.smart_money_activity enable row level security;
alter table public.macro_indicators enable row level security;
alter table public.asset_prices enable row level security;
alter table public.risks enable row level security;
alter table public.agents enable row level security;
alter table public.agent_runs enable row level security;
alter table public.translations enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'recommendations','urgent_alerts','news_events','market_events','causality_chains',
    'companies','assets','company_financials','company_growth_metrics','valuations',
    'smart_money_activity','macro_indicators','asset_prices','risks','agents','agent_runs','translations'
  ]
  loop
    execute format('drop policy if exists "read_%1$s" on public.%1$s;', t);
    execute format('create policy "read_%1$s" on public.%1$s for select to authenticated using (true);', t);
  end loop;
end$$;

-- User-owned tables
alter table public.users enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.alerts enable row level security;
alter table public.watchlists enable row level security;

drop policy if exists "own_alerts" on public.alerts;
create policy "own_alerts" on public.alerts for all to authenticated
  using (user_id in (select id from public.users where auth_user_id = auth.uid()))
  with check (user_id in (select id from public.users where auth_user_id = auth.uid()));

drop policy if exists "own_watchlists" on public.watchlists;
create policy "own_watchlists" on public.watchlists for all to authenticated
  using (user_id in (select id from public.users where auth_user_id = auth.uid()))
  with check (user_id in (select id from public.users where auth_user_id = auth.uid()));
