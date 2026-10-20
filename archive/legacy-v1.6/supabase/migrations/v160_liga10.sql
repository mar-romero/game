-- Ejecutá este archivo si YA instalaste una versión anterior del schema de Factory Wars.
create table if not exists public.league_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  season text not null,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key(user_id,season)
);
alter table public.league_states enable row level security;
revoke all on public.league_states from anon,authenticated;
grant select,insert,update on public.league_states to authenticated;
drop policy if exists league_states_select_own on public.league_states;
create policy league_states_select_own on public.league_states for select to authenticated using(auth.uid()=user_id);
drop policy if exists league_states_insert_own on public.league_states;
create policy league_states_insert_own on public.league_states for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists league_states_update_own on public.league_states;
create policy league_states_update_own on public.league_states for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
