-- DxDrill account-synchronised study streaks.
-- Run once in Supabase SQL Editor. Existing device streak history is merged on first sign-in.

create table if not exists public.study_streak_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, local_date)
);
alter table public.study_streak_days enable row level security;

create table if not exists public.study_streak_summaries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  best_streak integer not null default 0 check (best_streak >= 0),
  updated_at timestamptz not null default now()
);
alter table public.study_streak_summaries enable row level security;

drop policy if exists "Users read own streak days" on public.study_streak_days;
create policy "Users read own streak days" on public.study_streak_days
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users read own streak summary" on public.study_streak_summaries;
create policy "Users read own streak summary" on public.study_streak_summaries
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.sync_my_streak(p_days date[], p_best integer default 0)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  all_days jsonb;
  computed_best integer := 0;
  current_run integer := 0;
  latest_day date;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if coalesce(array_length(p_days, 1), 0) > 10000 then raise exception 'too many streak dates'; end if;
  if coalesce(p_best, 0) < 0 or coalesce(p_best, 0) > 100000 then raise exception 'invalid best streak'; end if;

  insert into public.study_streak_days(user_id, local_date)
  select uid, d from unnest(coalesce(p_days, array[]::date[])) d
  where d <= (now() at time zone 'Africa/Lagos')::date
  on conflict (user_id, local_date) do nothing;

  with ordered as (
    select local_date,
      local_date - (row_number() over (order by local_date))::integer as grp
    from public.study_streak_days where user_id = uid
  ), runs as (
    select count(*)::integer as n from ordered group by grp
  )
  select coalesce(max(n), 0) into computed_best from runs;

  insert into public.study_streak_summaries(user_id, best_streak, updated_at)
  values (uid, greatest(computed_best, coalesce(p_best,0)), now())
  on conflict (user_id) do update
    set best_streak = greatest(public.study_streak_summaries.best_streak, excluded.best_streak),
        updated_at = now();

  select max(local_date) into latest_day from public.study_streak_days where user_id = uid;
  if latest_day is not null then
    with recursive back as (
      select latest_day as d
      union all
      select b.d - 1 from back b
      where exists (select 1 from public.study_streak_days x where x.user_id = uid and x.local_date = b.d - 1)
    )
    select count(*)::integer into current_run from back;
  end if;

  select coalesce(jsonb_agg(to_char(local_date, 'YYYY-MM-DD') order by local_date), '[]'::jsonb)
    into all_days from public.study_streak_days where user_id = uid;

  return jsonb_build_object(
    'days', all_days,
    'best', (select best_streak from public.study_streak_summaries where user_id = uid),
    'current', current_run,
    'last', latest_day
  );
end;
$$;

revoke all on function public.sync_my_streak(date[], integer) from public, anon;
grant execute on function public.sync_my_streak(date[], integer) to authenticated;
comment on function public.sync_my_streak(date[], integer) is
  'Idempotently merges a signed-in user''s qualifying Lagos calendar days across devices and preserves their best streak.';
