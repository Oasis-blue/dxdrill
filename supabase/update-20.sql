
-- ===== Update 20: True/False activity, admin analytics and fair leaderboard points =====
-- Run this once in Supabase SQL Editor after updates 1-19. Safe to run again.

create table if not exists public.tf_attempts (
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  attempt_id     text not null check (char_length(attempt_id) between 8 and 80),
  stem_id        text not null check (char_length(stem_id) between 1 and 80),
  topic_id       text not null check (char_length(topic_id) between 1 and 80),
  answered_count smallint not null check (answered_count between 1 and 5),
  correct_count  smallint not null check (correct_count between 0 and answered_count),
  total_count    smallint not null check (total_count between 4 and 5 and answered_count <= total_count),
  created_at     timestamptz not null default now(),
  primary key (user_id, attempt_id, stem_id)
);
create index if not exists tf_attempts_created on public.tf_attempts (created_at);
create index if not exists tf_attempts_user_created on public.tf_attempts (user_id, created_at);
create index if not exists tf_attempts_topic_created on public.tf_attempts (topic_id, created_at);
alter table public.tf_attempts enable row level security;
drop policy if exists tf_attempts_insert_self on public.tf_attempts;
create policy tf_attempts_insert_self on public.tf_attempts for insert to authenticated
  with check (user_id = auth.uid());
revoke all on public.tf_attempts from anon, authenticated;
grant insert on public.tf_attempts to authenticated;
drop trigger if exists tf_attempts_daily_limit on public.tf_attempts;
create trigger tf_attempts_daily_limit before insert on public.tf_attempts
  for each row execute function public.limit_daily_inserts(500);

-- A True/False stem earns at most one leaderboard point, and only when every statement
-- was answered and at least 60% were correct. Repeat attempts never multiply the point.
create or replace function public.student_leaderboard(p_days int default 7, p_class text default null)
returns table (display_name text, class_id text, points bigint)
language sql security definer stable set search_path = public as $$
  with scored as (
    select a.user_id, 'mcq:' || a.question_id as item_key
    from public.answers a
    join public.valid_questions v on v.id = a.question_id
    where a.correct and (
      p_days = 0
      or (p_days = -1 and (a.created_at at time zone 'Africa/Lagos')::date = (now() at time zone 'Africa/Lagos')::date)
      or (p_days > 0 and a.created_at > now() - make_interval(days => p_days))
    )
    union
    select t.user_id, 'tf:' || t.stem_id as item_key
    from public.tf_attempts t
    where t.answered_count = t.total_count
      and t.correct_count >= ceil(t.total_count * 0.6)::int
      and (
        p_days = 0
        or (p_days = -1 and (t.created_at at time zone 'Africa/Lagos')::date = (now() at time zone 'Africa/Lagos')::date)
        or (p_days > 0 and t.created_at > now() - make_interval(days => p_days))
      )
  )
  select p.display_name, p.class_id, count(distinct s.item_key)::bigint
  from scored s join public.profiles p on p.id = s.user_id
  where p_class is null or p.class_id = p_class
  group by p.id, p.display_name, p.class_id
  order by 3 desc, p.display_name
  limit 50
$$;

create or replace function public.class_leaderboard(p_days int default 7)
returns table (class_id text, players bigint, points bigint, per_player numeric)
language sql security definer stable set search_path = public as $$
  with scored as (
    select a.user_id, 'mcq:' || a.question_id as item_key
    from public.answers a
    join public.valid_questions v on v.id = a.question_id
    where a.correct and (
      p_days = 0
      or (p_days = -1 and (a.created_at at time zone 'Africa/Lagos')::date = (now() at time zone 'Africa/Lagos')::date)
      or (p_days > 0 and a.created_at > now() - make_interval(days => p_days))
    )
    union
    select t.user_id, 'tf:' || t.stem_id as item_key
    from public.tf_attempts t
    where t.answered_count = t.total_count
      and t.correct_count >= ceil(t.total_count * 0.6)::int
      and (
        p_days = 0
        or (p_days = -1 and (t.created_at at time zone 'Africa/Lagos')::date = (now() at time zone 'Africa/Lagos')::date)
        or (p_days > 0 and t.created_at > now() - make_interval(days => p_days))
      )
  ), u as (
    select p.class_id, p.id, count(distinct s.item_key)::bigint as pts
    from scored s join public.profiles p on p.id = s.user_id
    where p.class_id is not null
    group by p.class_id, p.id
  )
  select u.class_id, count(*)::bigint, sum(u.pts)::bigint,
         round(sum(u.pts)::numeric / count(*), 1)
  from u group by u.class_id order by 4 desc
$$;
revoke all on function public.student_leaderboard(int, text) from public, anon;
revoke all on function public.class_leaderboard(int) from public, anon;
grant execute on function public.student_leaderboard(int, text) to authenticated;
grant execute on function public.class_leaderboard(int) to authenticated;

-- Public totals combine MCQ answer rows and individual True/False statements answered.
create or replace function public.public_stats()
returns table (members bigint, answers bigint, answers_today bigint)
language sql security definer stable set search_path = public as $$
  select
    (select count(*) from public.profiles p where not p.is_admin),
    (select count(*) from public.answers a where a.user_id not in (select id from public.profiles where is_admin))
      + (select coalesce(sum(t.answered_count), 0) from public.tf_attempts t where t.user_id not in (select id from public.profiles where is_admin)),
    (select count(*) from public.answers a where a.created_at >= (date_trunc('day', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos')
        and a.user_id not in (select id from public.profiles where is_admin))
      + (select coalesce(sum(t.answered_count), 0) from public.tf_attempts t
        where t.created_at >= (date_trunc('day', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos')
          and t.user_id not in (select id from public.profiles where is_admin));
$$;
revoke all on function public.public_stats() from public, anon, authenticated;
grant execute on function public.public_stats() to anon, authenticated;

drop function if exists public.admin_activity_summary();
create function public.admin_activity_summary()
returns table (
  answers_today bigint, answers_7d bigint, people_today bigint, people_7d bigint,
  mcq_answers_today bigint, tf_statements_today bigint, tf_stems_today bigint,
  tf_statements_7d bigint, tf_stems_7d bigint, tf_accuracy_7d int
)
language plpgsql security definer stable set search_path = public as $$
declare d date := (now() at time zone 'Africa/Lagos')::date;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
  with mcq as (
    select a.user_id, a.created_at
    from public.answers a join public.profiles p on p.id = a.user_id
    where not p.is_admin and a.created_at >= now() - interval '7 days'
  ), tf as (
    select t.user_id, t.created_at, t.answered_count, t.correct_count, t.total_count
    from public.tf_attempts t join public.profiles p on p.id = t.user_id
    where not p.is_admin and t.created_at >= now() - interval '7 days'
  ), people as (
    select user_id, created_at from mcq
    union all
    select user_id, created_at from tf
  )
  select
    (select count(*) from mcq where (created_at at time zone 'Africa/Lagos')::date = d)
      + (select coalesce(sum(answered_count), 0) from tf where (created_at at time zone 'Africa/Lagos')::date = d),
    (select count(*) from mcq) + (select coalesce(sum(answered_count), 0) from tf),
    (select count(distinct user_id) from people where (created_at at time zone 'Africa/Lagos')::date = d),
    (select count(distinct user_id) from people),
    (select count(*) from mcq where (created_at at time zone 'Africa/Lagos')::date = d),
    (select coalesce(sum(answered_count), 0) from tf where (created_at at time zone 'Africa/Lagos')::date = d),
    (select count(*) from tf where (created_at at time zone 'Africa/Lagos')::date = d),
    (select coalesce(sum(answered_count), 0) from tf),
    (select count(*) from tf),
    (select case when coalesce(sum(answered_count), 0) = 0 then null
      else round(100.0 * sum(correct_count) / sum(answered_count))::int end from tf);
end $$;

create or replace function public.admin_tf_active_people(p_days int default 7, p_limit int default 20)
returns table (
  display_name text, class_id text, stems_attempted bigint, stems_completed bigint,
  statements bigint, correct bigint, accuracy int
)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
  select p.display_name, p.class_id, count(*)::bigint,
    count(*) filter (where t.answered_count = t.total_count)::bigint,
    sum(t.answered_count)::bigint, sum(t.correct_count)::bigint,
    round(100.0 * sum(t.correct_count) / nullif(sum(t.answered_count), 0))::int
  from public.tf_attempts t join public.profiles p on p.id = t.user_id
  where not p.is_admin and t.created_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 7), 60)))
  group by p.id, p.display_name, p.class_id
  order by sum(t.answered_count) desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
end $$;

create or replace function public.admin_tf_topic_activity(p_days int default 30)
returns table (topic text, people bigint, stems_attempted bigint, statements bigint, accuracy int)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
  select t.topic_id, count(distinct t.user_id)::bigint, count(*)::bigint,
    sum(t.answered_count)::bigint,
    round(100.0 * sum(t.correct_count) / nullif(sum(t.answered_count), 0))::int
  from public.tf_attempts t join public.profiles p on p.id = t.user_id
  where not p.is_admin and t.created_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)))
  group by t.topic_id
  order by sum(t.answered_count) desc;
end $$;

create or replace function public.admin_members(p_search text default '', p_class text default null, p_limit int default 50)
returns table (user_id uuid, display_name text, class_id text, email text, points bigint, answers_total bigint, joined timestamptz, is_admin boolean)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
  select p.id, p.display_name, p.class_id, u.email::text,
    (select count(distinct a.question_id) from public.answers a join public.valid_questions v on v.id = a.question_id where a.user_id = p.id and a.correct)
      + (select count(distinct t.stem_id) from public.tf_attempts t where t.user_id = p.id and t.answered_count = t.total_count and t.correct_count >= ceil(t.total_count * 0.6)::int),
    (select count(*) from public.answers a where a.user_id = p.id)
      + (select coalesce(sum(t.answered_count), 0) from public.tf_attempts t where t.user_id = p.id),
    p.created_at, p.is_admin
  from public.profiles p join auth.users u on u.id = p.id
  where (coalesce(p_class, '') = '' or p.class_id = p_class)
    and (coalesce(p_search, '') = '' or p.display_name ilike '%' || p_search || '%' or u.email ilike '%' || p_search || '%')
  order by p.created_at desc
  limit least(greatest(p_limit, 1), 200);
end $$;

create or replace function public.admin_clear_points(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  delete from public.answers where user_id = p_id;
  delete from public.tf_attempts where user_id = p_id;
end $$;

revoke all on function public.admin_activity_summary(), public.admin_tf_active_people(int, int), public.admin_tf_topic_activity(int) from public, anon;
grant execute on function public.admin_activity_summary(), public.admin_tf_active_people(int, int), public.admin_tf_topic_activity(int) to authenticated;
