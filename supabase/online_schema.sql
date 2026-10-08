-- Factory Wars online v0.1. Aditivo: no reemplaza el esquema legacy.
-- Aplicar en Supabase local/administrado antes de conectar el servidor.
create extension if not exists pgcrypto;

create table if not exists public.online_profiles (
  user_id uuid primary key,
  nickname text not null check (char_length(nickname) between 3 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists online_profiles_nickname_ci
  on public.online_profiles (lower(nickname));

create table if not exists public.online_empires (
  user_id uuid not null,
  season_id text not null,
  state_version integer not null default 1,
  state jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, season_id)
);

create table if not exists public.online_seasons (
  id text primary key,
  status text not null default 'open' check (status in ('open','running','complete')),
  roster_size integer not null default 12 check (roster_size between 2 and 100000),
  bot_fill boolean not null default true,
  ruleset_version text not null default 'arena-online-1.7',
  created_at timestamptz not null default now(),
  starts_at timestamptz,
  ends_at timestamptz
);

create table if not exists public.online_season_players (
  season_id text not null references public.online_seasons(id) on delete cascade,
  participant_id text not null,
  user_id uuid,
  display_name text not null,
  civilization text not null check (civilization in ('forge','bastion','swarm','nexus')),
  is_bot boolean not null default false,
  bot_strategy text,
  rating integer not null default 1000,
  points integer not null default 0,
  wins integer not null default 0,
  draws integer not null default 0,
  losses integer not null default 0,
  industrial_score bigint not null default 0,
  created_at timestamptz not null default now(),
  primary key (season_id, participant_id),
  unique (season_id, user_id)
);

create table if not exists public.online_matches (
  id uuid primary key default gen_random_uuid(),
  season_id text references public.online_seasons(id),
  ruleset_version text not null,
  seed bigint not null,
  mode text not null check (mode in ('ranked','casual','bot-fill','territory')),
  status text not null default 'queued' check (status in ('queued','active','complete','abandoned')),
  player_a text not null,
  player_b text not null,
  result text check (result in ('a','b','draw')),
  duration_seconds numeric,
  end_reason text,
  report jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.online_match_events (
  id bigserial primary key,
  match_id uuid not null references public.online_matches(id) on delete cascade,
  seq integer not null,
  event_version integer not null default 1,
  game_time numeric not null,
  event_type text not null,
  player_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (match_id, seq)
);

create table if not exists public.online_match_participants (
  match_id uuid not null references public.online_matches(id) on delete cascade,
  participant_id text not null,
  user_id uuid,
  display_name text not null,
  civilization text not null,
  bot_strategy text,
  result text check (result in ('win','loss','draw')),
  rating_before integer,
  rating_after integer,
  stats jsonb not null default '{}'::jsonb,
  primary key (match_id, participant_id)
);

create table if not exists public.online_economy_events (
  id bigserial primary key,
  user_id uuid not null,
  season_id text not null,
  event_id text not null,
  event_type text not null check (event_type in ('tick','building_upgrade','contract_start','contract_complete','research','prestige','match_reward','admin_adjustment')),
  resource text,
  amount numeric,
  state_revision bigint,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, season_id, event_id)
);

create index if not exists online_matches_season_created
  on public.online_matches (season_id, created_at desc);
create index if not exists online_matches_season_started
  on public.online_matches (season_id, started_at desc, id desc)
  where status='complete';
create index if not exists online_matches_season_export
  on public.online_matches (season_id, started_at desc, id desc)
  where status in ('complete','abandoned');
create index if not exists online_matches_active_player_a
  on public.online_matches (player_a)
  where status in ('queued','active');
create index if not exists online_matches_active_player_b
  on public.online_matches (player_b)
  where status in ('queued','active');
create index if not exists online_match_participants_by_user
  on public.online_match_participants (user_id, match_id) where user_id is not null;
create index if not exists online_economy_events_by_player
  on public.online_economy_events (user_id, season_id, created_at desc);
create index if not exists online_economy_events_player_export
  on public.online_economy_events (user_id, season_id, id desc);
create index if not exists online_economy_events_season_export
  on public.online_economy_events (season_id, id desc);
create index if not exists online_season_players_leaderboard
  on public.online_season_players (season_id, points desc, rating desc, wins desc);
create index if not exists online_season_players_roster
  on public.online_season_players (season_id, is_bot, points desc, rating desc, created_at);

insert into public.online_seasons (id) values ('BETA-ONLINE-01') on conflict do nothing;

-- All writes go through the authenticated game server, never through the browser Data API.
do $$
declare table_name text;
begin
  foreach table_name in array array['online_profiles','online_empires','online_seasons','online_season_players','online_matches','online_match_events','online_match_participants','online_economy_events'] loop
    execute format('alter table public.%I enable row level security', table_name);
    if exists (select 1 from pg_roles where rolname='anon') then
      execute format('revoke all on public.%I from anon', table_name);
    end if;
    if exists (select 1 from pg_roles where rolname='authenticated') then
      execute format('revoke all on public.%I from authenticated', table_name);
    end if;
  end loop;
end $$;
