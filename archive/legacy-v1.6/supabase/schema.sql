-- FACTORY WARS v1.5 IMPERIOS · SUPABASE
-- Ejecutar completo en Supabase > SQL Editor.
-- Beta pública de testing. Los rankings son funcionales pero NO anti-cheat para premios monetarios.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  season text not null default 'BETA-IMPERIOS-01',
  current_civ text,
  prestige_count integer not null default 0,
  legacy_nodes numeric not null default 0,
  civ_legacies jsonb not null default '{"forge":0,"bastion":0,"swarm":0,"nexus":0}'::jsonb,
  loyalty jsonb not null default '{"forge":0,"bastion":0,"swarm":0,"nexus":0}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint nickname_len check (char_length(nickname) between 3 and 20),
  constraint profiles_civ check (current_civ is null or current_civ in ('forge','bastion','swarm','nexus'))
);
alter table public.profiles add column if not exists current_civ text;
alter table public.profiles add column if not exists prestige_count integer not null default 0;
alter table public.profiles add column if not exists legacy_nodes numeric not null default 0;
alter table public.profiles add column if not exists civ_legacies jsonb not null default '{"forge":0,"bastion":0,"swarm":0,"nexus":0}'::jsonb;
alter table public.profiles add column if not exists loyalty jsonb not null default '{"forge":0,"bastion":0,"swarm":0,"nexus":0}'::jsonb;
create unique index if not exists profiles_nickname_lower_uq on public.profiles (lower(nickname));

create table if not exists public.matches (
  id text primary key, user_id uuid not null references auth.users(id) on delete cascade,
  season text not null default 'BETA-IMPERIOS-01', version text not null default '1.5-arena', played_at timestamptz not null default now(),
  result text check (result in ('win','loss','draw')), duration numeric, civ text, opponent text,
  invalid_rate numeric, inputs integer, tactical integer, commitments integer, max_threats integer,
  territory_delta numeric, lead_changes integer, comeback boolean, counterplay numeric, build text,
  military_spend numeric, defensive_spend numeric, economic_spend numeric, shield_waste numeric, peak_bank numeric,
  rematch boolean, survey jsonb, objective jsonb not null default '{}'::jsonb,
  verified boolean not null default false, created_at timestamptz not null default now()
);
create index if not exists matches_user_idx on public.matches(user_id, played_at desc);
create index if not exists matches_season_idx on public.matches(season, played_at desc);

create table if not exists public.industrial_states (
  user_id uuid not null references auth.users(id) on delete cascade, season text not null,
  credits numeric not null default 400, energy numeric not null default 220, steel numeric not null default 160,
  intel numeric not null default 0, fragments numeric not null default 0,
  buildings jsonb not null default '{"generator":1,"refinery":1,"lab":1,"automation":1}'::jsonb,
  research jsonb not null default '[]'::jsonb, contracts_completed integer not null default 0,
  lifetime_production numeric not null default 0, cycle_production numeric not null default 0,
  best_score numeric not null default 0, prestige_count integer not null default 0, legacy_nodes numeric not null default 0,
  civ_legacies jsonb not null default '{"forge":0,"bastion":0,"swarm":0,"nexus":0}'::jsonb,
  loyalty jsonb not null default '{"forge":0,"bastion":0,"swarm":0,"nexus":0}'::jsonb,
  last_tick timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(user_id,season)
);

create table if not exists public.faction_contributions (
  user_id uuid not null references auth.users(id) on delete cascade, season text not null,
  civ text not null check(civ in ('forge','bastion','swarm','nexus')),
  pvp_points numeric not null default 0, industrial_points numeric not null default 0, operations_points numeric not null default 0,
  updated_at timestamptz not null default now(), primary key(user_id,season,civ)
);
create table if not exists public.reward_claims (
  user_id uuid not null references auth.users(id) on delete cascade, match_id text not null references public.matches(id) on delete cascade,
  claimed_at timestamptz not null default now(), primary key(user_id,match_id)
);
create table if not exists public.meta_reward_events (
  user_id uuid not null references auth.users(id) on delete cascade, event_id text not null, kind text not null,
  amount numeric not null default 0, created_at timestamptz not null default now(), primary key(user_id,event_id)
);

-- Score Arena: top 10 para que jugar infinitamente no sea la única forma de subir.
create or replace view public.match_scores as
select m.*, (case m.result when 'win' then 100 when 'draw' then 40 else 10 end
 + case upper(coalesce(m.opponent,'')) when 'GREEDY' then 50 when 'TURTLE' then 40 when 'HOARDER' then 35 when 'SABOTEUR' then 30 when 'ADAPTIVE' then 28 when 'TEMPO' then 27 when 'BALANCED' then 25 when 'RUSHER' then 20 when 'RANDOM' then 0 else 15 end
 + least(20,greatest(0,coalesce(m.counterplay,0)*20)) + least(9,greatest(0,coalesce(m.lead_changes,0)*3)))::numeric as match_score
from public.matches m;

create or replace view public.arena_leaderboard as
with ranked as (select ms.*,row_number() over(partition by user_id,season order by match_score desc,played_at asc) rn from public.match_scores ms),
agg as (select user_id,season,count(*) games,count(*) filter(where result='win') wins,avg(match_score) filter(where rn<=10) rating,sum(match_score) filter(where rn<=10) top10_score from ranked group by user_id,season)
select p.nickname,a.user_id,a.season,a.games,a.wins,round(coalesce(a.rating,0),1) rating,round(coalesce(a.top10_score,0),1) top10_score from agg a join public.profiles p on p.user_id=a.user_id;
create or replace view public.leaderboard as select * from public.arena_leaderboard;

create or replace view public.industrial_leaderboard as
select p.nickname,s.user_id,s.season,round(greatest(s.best_score,0),1) industrial_score,s.prestige_count,round(s.best_score,1) best_score,
       round(s.lifetime_production,0) lifetime_production
from public.industrial_states s join public.profiles p on p.user_id=s.user_id;

create or replace view public.empire_leaderboard as
with a0 as (select *,case when count(*) over(partition by season)=1 then 50 else percent_rank() over(partition by season order by rating)*100 end arena_percentile from public.arena_leaderboard),
i0 as (select *,case when count(*) over(partition by season)=1 then 50 else percent_rank() over(partition by season order by industrial_score)*100 end industrial_percentile from public.industrial_leaderboard),
allp as (select p.user_id,p.nickname,p.season,coalesce(a0.arena_percentile,0) arena_percentile,coalesce(i0.industrial_percentile,0) industrial_percentile from public.profiles p left join a0 on a0.user_id=p.user_id and a0.season=p.season left join i0 on i0.user_id=p.user_id and i0.season=p.season)
select *,round((arena_percentile*.60+industrial_percentile*.40)::numeric,1) empire_score from allp;

-- Guerra de civilizaciones: suma ayuda, pero se divide por sqrt(población activa) para reducir la ventaja puramente numérica.
create or replace view public.faction_leaderboard as
with a as (select season,civ,count(distinct user_id) players,sum(pvp_points) pvp,sum(industrial_points) industrial,sum(operations_points) operations from public.faction_contributions group by season,civ),
r as (select *,pvp/sqrt(greatest(players,1)) pvp_r,industrial/sqrt(greatest(players,1)) ind_r,operations/sqrt(greatest(players,1)) ops_r from a),
n as (select *,max(pvp_r) over(partition by season) mp,max(ind_r) over(partition by season) mi,max(ops_r) over(partition by season) mo from r)
select season,civ,players,round((case when mp>0 then pvp_r/mp*100 else 0 end)::numeric,1) pvp_component,
 round((case when mi>0 then ind_r/mi*100 else 0 end)::numeric,1) industrial_component,
 round((case when mo>0 then ops_r/mo*100 else 0 end)::numeric,1) operations_component,
 round(((case when mp>0 then pvp_r/mp*100 else 0 end)*.45+(case when mi>0 then ind_r/mi*100 else 0 end)*.35+(case when mo>0 then ops_r/mo*100 else 0 end)*.20)::numeric,1) faction_score
from n;

-- Un match sólo entrega recompensa una vez aunque luego se actualice encuesta/rematch.
create or replace function public.claim_match_reward(p_match_id text) returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); m public.matches%rowtype; civ text; c numeric; i numeric; f numeric; fp numeric; inserted int;
begin
 if uid is null then raise exception 'auth required'; end if;
 select * into m from public.matches where id=p_match_id and user_id=uid; if not found then raise exception 'match not found'; end if;
 insert into public.reward_claims(user_id,match_id) values(uid,p_match_id) on conflict do nothing; get diagnostics inserted=row_count;
 if inserted=0 then return jsonb_build_object('claimed',false); end if;
 if m.result='win' then c:=180;i:=12;f:=2;fp:=30; elsif m.result='draw' then c:=100;i:=6;f:=1;fp:=12; else c:=70;i:=4;f:=0;fp:=8; end if;
 select current_civ into civ from public.profiles where user_id=uid;
 insert into public.industrial_states(user_id,season,credits,intel,fragments) values(uid,m.season,400+c,i,f)
 on conflict(user_id,season) do update set credits=public.industrial_states.credits+c,intel=public.industrial_states.intel+i,fragments=public.industrial_states.fragments+f,updated_at=now();
 if civ is not null then insert into public.faction_contributions(user_id,season,civ,pvp_points) values(uid,m.season,civ,fp)
 on conflict(user_id,season,civ) do update set pvp_points=public.faction_contributions.pvp_points+fp,updated_at=now(); end if;
 return jsonb_build_object('claimed',true,'reward',jsonb_build_object('credits',c,'intel',i,'fragments',f,'faction',fp));
end $$;

create or replace function public.record_meta_contribution(p_event_id text,p_kind text,p_amount numeric) returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); civ text; amt numeric; inserted int; seas text;
begin
 if uid is null then raise exception 'auth required'; end if; if p_kind not in ('industrial','operations') then raise exception 'invalid kind'; end if;
 amt:=least(greatest(p_amount,0),case when p_kind='industrial' then 200 else 30 end);
 insert into public.meta_reward_events(user_id,event_id,kind,amount) values(uid,p_event_id,p_kind,amt) on conflict do nothing; get diagnostics inserted=row_count;
 if inserted=0 then return jsonb_build_object('recorded',false); end if;
 select current_civ,season into civ,seas from public.profiles where user_id=uid; if civ is null then return jsonb_build_object('recorded',false); end if;
 insert into public.faction_contributions(user_id,season,civ,industrial_points,operations_points) values(uid,seas,civ,case when p_kind='industrial' then amt else 0 end,case when p_kind='operations' then amt else 0 end)
 on conflict(user_id,season,civ) do update set industrial_points=public.faction_contributions.industrial_points+excluded.industrial_points,operations_points=public.faction_contributions.operations_points+excluded.operations_points,updated_at=now();
 return jsonb_build_object('recorded',true,'amount',amt,'civ',civ);
end $$;

alter table public.profiles enable row level security; alter table public.matches enable row level security; alter table public.industrial_states enable row level security; alter table public.faction_contributions enable row level security; alter table public.reward_claims enable row level security; alter table public.meta_reward_events enable row level security;

revoke all on public.profiles,public.matches,public.industrial_states,public.faction_contributions,public.reward_claims,public.meta_reward_events from anon,authenticated;
grant select,insert,update on public.profiles,public.matches,public.industrial_states to authenticated;
grant select on public.arena_leaderboard,public.leaderboard,public.industrial_leaderboard,public.empire_leaderboard,public.faction_leaderboard to authenticated;
grant execute on function public.claim_match_reward(text) to authenticated; grant execute on function public.record_meta_contribution(text,text,numeric) to authenticated;

-- Cada usuario sólo ve/escribe sus filas crudas. Los rankings sólo exponen agregados/nickname mediante vistas.
drop policy if exists profiles_select_own on public.profiles; create policy profiles_select_own on public.profiles for select to authenticated using(auth.uid()=user_id);
drop policy if exists profiles_insert_own on public.profiles; create policy profiles_insert_own on public.profiles for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists profiles_update_own on public.profiles; create policy profiles_update_own on public.profiles for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists matches_select_own on public.matches; create policy matches_select_own on public.matches for select to authenticated using(auth.uid()=user_id);
drop policy if exists matches_insert_own on public.matches; create policy matches_insert_own on public.matches for insert to authenticated with check(auth.uid()=user_id and verified=false);
drop policy if exists matches_update_own on public.matches; create policy matches_update_own on public.matches for update to authenticated using(auth.uid()=user_id and verified=false) with check(auth.uid()=user_id and verified=false);
drop policy if exists industrial_select_own on public.industrial_states; create policy industrial_select_own on public.industrial_states for select to authenticated using(auth.uid()=user_id);
drop policy if exists industrial_insert_own on public.industrial_states; create policy industrial_insert_own on public.industrial_states for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists industrial_update_own on public.industrial_states; create policy industrial_update_own on public.industrial_states for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);

-- Importante: anonymous sign-ins usan el rol authenticated. RLS sigue siendo obligatorio.

-- v1.6 · estado de Liga 10 por usuario/temporada.
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
