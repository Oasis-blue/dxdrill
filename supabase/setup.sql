-- DxDrill database setup. Paste this whole file into Supabase: SQL Editor -> New query -> Run.
-- Safe to run again: it only creates what is missing.

create table if not exists public.classes (
  id    text primary key,
  label text not null,
  name  text not null default '',
  level text not null
);
insert into public.classes (id, label, name, level) values
  ('u20','U20','Pioneers','400L'),
  ('u21','U21','Mavericks','300L'),
  ('u22','U22','Pacesetters','300L'),
  ('u23','U23','Nova Spires','200L'),
  ('u24','U24','Imperium','200L'),
  ('u25','U25','','200L'),
  ('u26','U26','Freshers','100L')
on conflict (id) do nothing;

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  class_id     text references public.classes(id),
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.answers (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  question_id text not null check (char_length(question_id) <= 60),
  correct     boolean not null,
  created_at  timestamptz not null default now()
);
create index if not exists answers_user_time on public.answers (user_id, created_at);
create index if not exists answers_time on public.answers (created_at);

-- Who is an admin (security definer so policies can ask without looping).
create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare cls text := new.raw_user_meta_data->>'class_id';
begin
  if cls is not null and not exists (select 1 from public.classes where id = cls) then cls := null; end if;
  insert into public.profiles (id, display_name, class_id)
  values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1)), 40), cls);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row level security: nobody sees or changes more than they should.
alter table public.classes  enable row level security;
alter table public.profiles enable row level security;
alter table public.answers  enable row level security;

drop policy if exists classes_read   on public.classes;
drop policy if exists classes_admin  on public.classes;
create policy classes_read  on public.classes for select using (true);
create policy classes_admin on public.classes for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists profiles_read_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_read_own   on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists answers_insert_own on public.answers;
drop policy if exists answers_read_own   on public.answers;
create policy answers_insert_own on public.answers for insert with check (user_id = auth.uid());
create policy answers_read_own   on public.answers for select using (user_id = auth.uid() or public.is_admin());

-- Members can change only their name and class. is_admin can only be set from the SQL editor.
revoke update on public.profiles from anon, authenticated;
grant  update (display_name, class_id) on public.profiles to authenticated;
revoke update on public.classes from anon, authenticated;
grant  update (name) on public.classes to authenticated;   -- the policy above limits this to admins
grant  select on public.classes to anon, authenticated;
grant  select on public.profiles to authenticated;
grant  select, insert on public.answers to authenticated;

-- Leaderboards. Points = different questions answered correctly in the period (repeating a question does not add points).
-- p_days = 0 means all time.
create or replace function public.student_leaderboard(p_days int default 7, p_class text default null)
returns table (display_name text, class_id text, points bigint)
language sql security definer stable set search_path = public as $$
  select p.display_name, p.class_id, count(distinct a.question_id) as points
  from public.answers a join public.profiles p on p.id = a.user_id
  where a.correct and (p_days = 0 or a.created_at > now() - make_interval(days => p_days))
    and (p_class is null or p.class_id = p_class)
  group by p.id, p.display_name, p.class_id
  order by points desc, p.display_name
  limit 50
$$;

create or replace function public.class_leaderboard(p_days int default 7)
returns table (class_id text, players bigint, points bigint, per_player numeric)
language sql security definer stable set search_path = public as $$
  with u as (
    select p.class_id, p.id, count(distinct a.question_id) as pts
    from public.answers a join public.profiles p on p.id = a.user_id
    where a.correct and p.class_id is not null
      and (p_days = 0 or a.created_at > now() - make_interval(days => p_days))
    group by p.class_id, p.id
  )
  select u.class_id, count(*) as players, sum(u.pts) as points, round(sum(u.pts)::numeric / count(*), 1) as per_player
  from u group by u.class_id order by per_player desc
$$;

revoke all on function public.student_leaderboard(int, text) from public, anon;
revoke all on function public.class_leaderboard(int) from public, anon;
grant execute on function public.student_leaderboard(int, text) to authenticated;
grant execute on function public.class_leaderboard(int) to authenticated;
grant execute on function public.is_admin() to authenticated;

-- Question reports: students flag a wrong or unclear question, admins review them.
create table if not exists public.question_reports (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  question_id text not null check (char_length(question_id) <= 60),
  reason      text not null check (reason in ('wrong_answer','explanation','unclear','typo','other')),
  note        text not null default '' check (char_length(note) <= 500),
  status      text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at  timestamptz not null default now()
);
-- One open report per student per question (they can report again once it is closed).
create unique index if not exists question_reports_one_open
  on public.question_reports (user_id, question_id) where status = 'open';
create index if not exists question_reports_status on public.question_reports (status, created_at);

alter table public.question_reports enable row level security;
drop policy if exists reports_insert_own  on public.question_reports;
drop policy if exists reports_read        on public.question_reports;
drop policy if exists reports_admin_close on public.question_reports;
create policy reports_insert_own  on public.question_reports for insert with check (user_id = auth.uid());
create policy reports_read        on public.question_reports for select using (user_id = auth.uid() or public.is_admin());
create policy reports_admin_close on public.question_reports for update using (public.is_admin()) with check (public.is_admin());

revoke update on public.question_reports from anon, authenticated;
grant  update (status) on public.question_reports to authenticated;   -- the policy above limits this to admins
grant  select, insert on public.question_reports to authenticated;

-- ===== Update 1 (leaderboard hardening) =====
-- 1. The list of real questions. Only these count on leaderboards.
create table if not exists public.valid_questions (
  id text primary key check (char_length(id) <= 60)
);
alter table public.valid_questions enable row level security;   -- no policies: students cannot read or change it
revoke all on public.valid_questions from anon, authenticated;

-- The admin's "Sync questions" button on the Account page fills the list.
create or replace function public.sync_question_ids(p_ids text[]) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  insert into public.valid_questions (id)
    select distinct x from unnest(p_ids) as x where x is not null and char_length(x) between 1 and 60
    on conflict do nothing;
  select count(*) into n from public.valid_questions;
  return n;
end $$;
revoke all on function public.sync_question_ids(text[]) from public, anon;
grant execute on function public.sync_question_ids(text[]) to authenticated;

-- 2. Leaderboards count only real questions.
create or replace function public.student_leaderboard(p_days int default 7, p_class text default null)
returns table (display_name text, class_id text, points bigint)
language sql security definer stable set search_path = public as $$
  select p.display_name, p.class_id, count(distinct a.question_id) as points
  from public.answers a
  join public.valid_questions v on v.id = a.question_id
  join public.profiles p on p.id = a.user_id
  where a.correct and (p_days = 0 or a.created_at > now() - make_interval(days => p_days))
    and (p_class is null or p.class_id = p_class)
  group by p.id, p.display_name, p.class_id
  order by points desc, p.display_name
  limit 50
$$;

create or replace function public.class_leaderboard(p_days int default 7)
returns table (class_id text, players bigint, points bigint, per_player numeric)
language sql security definer stable set search_path = public as $$
  with u as (
    select p.class_id, p.id, count(distinct a.question_id) as pts
    from public.answers a
    join public.valid_questions v on v.id = a.question_id
    join public.profiles p on p.id = a.user_id
    where a.correct and p.class_id is not null
      and (p_days = 0 or a.created_at > now() - make_interval(days => p_days))
    group by p.class_id, p.id
  )
  select u.class_id, count(*) as players, sum(u.pts) as points, round(sum(u.pts)::numeric / count(*), 1) as per_player
  from u group by u.class_id order by per_player desc
$$;
revoke all on function public.student_leaderboard(int, text) from public, anon;
revoke all on function public.class_leaderboard(int) from public, anon;
grant execute on function public.student_leaderboard(int, text) to authenticated;
grant execute on function public.class_leaderboard(int) to authenticated;

-- 3. Daily limits per student, so nobody can flood the tables.
create or replace function public.limit_daily_inserts() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int; cap int := tg_argv[0]::int;
begin
  execute format('select count(*) from public.%I where user_id = $1 and created_at > now() - interval ''1 day''', tg_table_name)
    into n using new.user_id;
  if n >= cap then raise exception 'daily limit reached'; end if;
  return new;
end $$;

drop trigger if exists answers_daily_limit on public.answers;
create trigger answers_daily_limit before insert on public.answers
  for each row execute function public.limit_daily_inserts(1500);

drop trigger if exists reports_daily_limit on public.question_reports;
create trigger reports_daily_limit before insert on public.question_reports
  for each row execute function public.limit_daily_inserts(30);

-- 4. Names cannot contain hidden or control characters.
do $$ begin
  alter table public.profiles add constraint display_name_clean check (display_name !~ '[[:cntrl:]]') not valid;
exception when duplicate_object then null; end $$;

-- ===== Update 2 (admin member tools) =====
-- The admin can fix other members' name and class (members still only change their own).
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update using (public.is_admin()) with check (public.is_admin());

-- Member list for the admin: search by name or email, optional class filter, newest first.
create or replace function public.admin_members(p_search text default '', p_class text default null, p_limit int default 50)
returns table (user_id uuid, display_name text, class_id text, email text, points bigint, answers_total bigint, joined timestamptz, is_admin boolean)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
  select p.id, p.display_name, p.class_id, u.email::text,
    (select count(distinct a.question_id) from public.answers a join public.valid_questions v on v.id = a.question_id where a.user_id = p.id and a.correct),
    (select count(*) from public.answers a where a.user_id = p.id),
    p.created_at, p.is_admin
  from public.profiles p join auth.users u on u.id = p.id
  where (coalesce(p_class, '') = '' or p.class_id = p_class)
    and (coalesce(p_search, '') = '' or p.display_name ilike '%' || p_search || '%' or u.email ilike '%' || p_search || '%')
  order by p.created_at desc
  limit least(greatest(p_limit, 1), 200);
end $$;

create or replace function public.admin_class_counts()
returns table (class_id text, members bigint)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query select p.class_id, count(*) from public.profiles p group by p.class_id order by p.class_id;
end $$;

-- Remove a member and everything they scored (their answers and reports go with them). Admins cannot be removed here.
create or replace function public.admin_remove_member(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if p_id = auth.uid() or exists (select 1 from public.profiles where id = p_id and is_admin) then raise exception 'not allowed'; end if;
  delete from auth.users where id = p_id;
end $$;

-- Keep the member, delete all their scores (for a cheater you want to warn first).
create or replace function public.admin_clear_points(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  delete from public.answers where user_id = p_id;
end $$;

revoke all on function public.admin_members(text, text, int) from public, anon;
revoke all on function public.admin_class_counts() from public, anon;
revoke all on function public.admin_remove_member(uuid) from public, anon;
revoke all on function public.admin_clear_points(uuid) from public, anon;
grant execute on function public.admin_members(text, text, int) to authenticated;
grant execute on function public.admin_class_counts() to authenticated;
grant execute on function public.admin_remove_member(uuid) to authenticated;
grant execute on function public.admin_clear_points(uuid) to authenticated;

-- ===== Update 3 (polls) =====
create table if not exists public.polls (
  id           bigint generated always as identity primary key,
  question     text not null check (char_length(question) between 3 and 200),
  allow_change boolean not null default true,
  closes_at    timestamptz,
  is_closed    boolean not null default false,
  created_at   timestamptz not null default now()
);
create table if not exists public.poll_options (
  id       bigint generated always as identity primary key,
  poll_id  bigint not null references public.polls(id) on delete cascade,
  label    text not null check (char_length(label) between 1 and 80),
  position int not null default 0
);
create index if not exists poll_options_poll on public.poll_options (poll_id);
create table if not exists public.poll_votes (
  poll_id    bigint not null references public.polls(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  option_id  bigint not null references public.poll_options(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);
create index if not exists poll_votes_option on public.poll_votes (option_id);

-- Students suggest polls; the admin reads them.
create table if not exists public.poll_suggestions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text       text not null check (char_length(text) between 5 and 200),
  status     text not null default 'open' check (status in ('open','used','dismissed')),
  created_at timestamptz not null default now()
);

alter table public.polls             enable row level security;
alter table public.poll_options      enable row level security;
alter table public.poll_votes        enable row level security;
alter table public.poll_suggestions  enable row level security;

drop policy if exists polls_read    on public.polls;
drop policy if exists options_read  on public.poll_options;
drop policy if exists votes_own     on public.poll_votes;
drop policy if exists sugg_insert   on public.poll_suggestions;
drop policy if exists sugg_read     on public.poll_suggestions;
drop policy if exists sugg_update   on public.poll_suggestions;
create policy polls_read   on public.polls        for select to authenticated using (true);
create policy options_read on public.poll_options for select to authenticated using (true);
create policy votes_own    on public.poll_votes   for select to authenticated using (user_id = auth.uid());   -- you only see your own vote; results come from poll_results()
create policy sugg_insert  on public.poll_suggestions for insert to authenticated with check (user_id = auth.uid());
create policy sugg_read    on public.poll_suggestions for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy sugg_update  on public.poll_suggestions for update to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.polls, public.poll_options, public.poll_votes, public.poll_suggestions from anon, authenticated;
grant select on public.polls, public.poll_options, public.poll_votes to authenticated;
grant select, insert on public.poll_suggestions to authenticated;
grant update (status) on public.poll_suggestions to authenticated;   -- the policy limits this to admins

drop trigger if exists sugg_daily_limit on public.poll_suggestions;
create trigger sugg_daily_limit before insert on public.poll_suggestions
  for each row execute function public.limit_daily_inserts(5);

-- Voting goes through this function so the rules cannot be bypassed.
create or replace function public.cast_vote(p_poll bigint, p_option bigint) returns void
language plpgsql security definer set search_path = public as $$
declare pl public.polls%rowtype;
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  select * into pl from public.polls where id = p_poll;
  if not found then raise exception 'poll not found'; end if;
  if pl.is_closed or (pl.closes_at is not null and pl.closes_at <= now()) then raise exception 'poll closed'; end if;
  if not exists (select 1 from public.poll_options where id = p_option and poll_id = p_poll) then raise exception 'bad option'; end if;
  if exists (select 1 from public.poll_votes where poll_id = p_poll and user_id = auth.uid()) then
    if not pl.allow_change then raise exception 'already voted'; end if;
    update public.poll_votes set option_id = p_option, created_at = now() where poll_id = p_poll and user_id = auth.uid();
  else
    insert into public.poll_votes (poll_id, user_id, option_id) values (p_poll, auth.uid(), p_option);
  end if;
end $$;

-- Results are only shown to people who voted, when a poll is closed, and to the admin.
create or replace function public.poll_results(p_poll_ids bigint[])
returns table (poll_id bigint, option_id bigint, votes bigint, class_votes bigint)
language sql security definer stable set search_path = public as $$
  with me as (select class_id from public.profiles where id = auth.uid()),
  allowed as (
    select p.id from public.polls p
    where p.id = any(p_poll_ids) and auth.uid() is not null and (
      public.is_admin() or p.is_closed or (p.closes_at is not null and p.closes_at <= now())
      or exists (select 1 from public.poll_votes v where v.poll_id = p.id and v.user_id = auth.uid()))
  )
  select o.poll_id, o.id, count(v.user_id),
         count(v.user_id) filter (where pr.class_id is not null and pr.class_id = (select class_id from me))
  from public.poll_options o
  join allowed a on a.id = o.poll_id
  left join public.poll_votes v on v.option_id = o.id
  left join public.profiles pr on pr.id = v.user_id
  group by o.poll_id, o.id
$$;

create or replace function public.admin_create_poll(p_question text, p_options text[], p_closes timestamptz default null, p_allow_change boolean default true)
returns bigint
language plpgsql security definer set search_path = public as $$
declare pid bigint; opts text[];
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  select array_agg(trim(x)) into opts from unnest(p_options) as x where trim(x) <> '';
  if opts is null or array_length(opts, 1) < 2 or array_length(opts, 1) > 5 then raise exception 'a poll needs 2 to 5 options'; end if;
  insert into public.polls (question, allow_change, closes_at) values (trim(p_question), p_allow_change, p_closes) returning id into pid;
  insert into public.poll_options (poll_id, label, position)
    select pid, left(o.label, 80), o.ord from unnest(opts) with ordinality as o(label, ord);
  return pid;
end $$;

create or replace function public.admin_set_poll_closed(p_id bigint, p_closed boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  update public.polls set is_closed = p_closed, closes_at = case when p_closed then closes_at else null end where id = p_id;
end $$;

create or replace function public.admin_delete_poll(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  delete from public.polls where id = p_id;
end $$;

revoke all on function public.cast_vote(bigint, bigint) from public, anon;
revoke all on function public.poll_results(bigint[]) from public, anon;
revoke all on function public.admin_create_poll(text, text[], timestamptz, boolean) from public, anon;
revoke all on function public.admin_set_poll_closed(bigint, boolean) from public, anon;
revoke all on function public.admin_delete_poll(bigint) from public, anon;
grant execute on function public.cast_vote(bigint, bigint) to authenticated;
grant execute on function public.poll_results(bigint[]) to authenticated;
grant execute on function public.admin_create_poll(text, text[], timestamptz, boolean) to authenticated;
grant execute on function public.admin_set_poll_closed(bigint, boolean) to authenticated;
grant execute on function public.admin_delete_poll(bigint) to authenticated;

-- ===== Update 4 (window competitions) =====
-- 1. The hidden question bank. Students can never read this table; only the functions below can.
create table if not exists public.competition_questions (
  id         text primary key check (char_length(id) <= 60),
  pool       text not null default 'general' check (char_length(pool) <= 40),
  q          text not null check (char_length(q) between 3 and 1000),
  options    text[] not null check (array_length(options, 1) = 4),
  answer     int  not null check (answer between 0 and 3),
  explain    text not null default '' check (char_length(explain) <= 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.competitions (
  id               bigint generated always as identity primary key,
  name             text not null check (char_length(name) between 3 and 80),
  opens_at         timestamptz not null,
  closes_at        timestamptz not null,
  n_questions      int not null check (n_questions between 1 and 100),
  seconds_per_q    int not null check (seconds_per_q between 5 and 300),
  pool             text,                       -- null = draw from the whole bank
  created_at       timestamptz not null default now(),
  check (closes_at > opens_at)
);

create table if not exists public.competition_entries (
  id             bigint generated always as identity primary key,
  competition_id bigint not null references public.competitions(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  qids           text[] not null,
  current_idx    int not null default 0,
  q_started_at   timestamptz not null default now(),
  deadline_at    timestamptz not null,
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  score          int not null default 0,
  total_ms       bigint not null default 0,
  unique (competition_id, user_id)
);
create table if not exists public.competition_answers (
  entry_id    bigint not null references public.competition_entries(id) on delete cascade,
  idx         int not null,
  question_id text not null,
  choice      int not null,                    -- -1 = ran out of time
  correct     boolean not null,
  ms          bigint not null,
  primary key (entry_id, idx)
);

alter table public.competition_questions enable row level security;
alter table public.competitions          enable row level security;
alter table public.competition_entries  enable row level security;
alter table public.competition_answers  enable row level security;

drop policy if exists comps_read   on public.competitions;
drop policy if exists entries_read on public.competition_entries;
create policy comps_read   on public.competitions        for select to authenticated using (true);
create policy entries_read on public.competition_entries for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Students may see that they started or finished. They may NOT read score, questions or answers.
revoke all on public.competition_questions, public.competitions, public.competition_entries, public.competition_answers from anon, authenticated;
grant select on public.competitions to authenticated;
grant select (id, competition_id, user_id, current_idx, started_at, finished_at) on public.competition_entries to authenticated;

-- 2. Internal: apply timeouts and the closing time to one entry.
create or replace function public._comp_tick(p_entry bigint) returns void
language plpgsql security definer set search_path = public as $$
declare e public.competition_entries; c public.competitions;
begin
  select * into e from public.competition_entries where id = p_entry for update;
  if not found or e.finished_at is not null then return; end if;
  select * into c from public.competitions where id = e.competition_id;
  if now() > c.closes_at then
    update public.competition_entries set finished_at = now() where id = e.id;
    return;
  end if;
  if now() > e.deadline_at + interval '1 second' then
    insert into public.competition_answers (entry_id, idx, question_id, choice, correct, ms)
      values (e.id, e.current_idx, e.qids[e.current_idx + 1], -1, false, c.seconds_per_q * 1000);
    update public.competition_entries set
      current_idx = current_idx + 1,
      total_ms = total_ms + c.seconds_per_q * 1000,
      finished_at = case when current_idx + 1 >= c.n_questions then now() else null end,
      q_started_at = now(),
      deadline_at = now() + make_interval(secs => c.seconds_per_q)
    where id = e.id;
  end if;
end $$;

-- 3. What the student sees: the current question WITHOUT its answer.
create or replace function public.comp_state(p_comp bigint)
returns table (state text, q_idx int, q_total int, q_text text, q_options text[], secs_left numeric)
language plpgsql security definer set search_path = public as $$
declare c public.competitions; e public.competition_entries;
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  select * into c from public.competitions where id = p_comp;
  if not found then raise exception 'competition not found'; end if;
  select * into e from public.competition_entries where competition_id = p_comp and user_id = auth.uid();
  if not found then
    return query select 'none'::text, 0, c.n_questions, null::text, null::text[], 0::numeric; return;
  end if;
  perform public._comp_tick(e.id);
  select * into e from public.competition_entries where id = e.id;
  if e.finished_at is not null then
    return query select 'finished'::text, e.current_idx, c.n_questions, null::text, null::text[], 0::numeric; return;
  end if;
  return query select 'question'::text, e.current_idx, c.n_questions, cq.q, cq.options,
                      greatest(0, extract(epoch from (e.deadline_at - now())))::numeric
               from public.competition_questions cq where cq.id = e.qids[e.current_idx + 1];
end $$;

create or replace function public.comp_start(p_comp bigint)
returns table (state text, q_idx int, q_total int, q_text text, q_options text[], secs_left numeric)
language plpgsql security definer set search_path = public as $$
declare c public.competitions; ids text[];
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  select * into c from public.competitions where id = p_comp;
  if not found then raise exception 'competition not found'; end if;
  if exists (select 1 from public.competition_entries where competition_id = p_comp and user_id = auth.uid()) then
    return query select * from public.comp_state(p_comp); return;          -- resume
  end if;
  if now() < c.opens_at then raise exception 'not open yet'; end if;
  if now() + make_interval(secs => c.n_questions * c.seconds_per_q + 30) > c.closes_at then raise exception 'too late to start'; end if;
  select array_agg(s.id) into ids from (
    select cq.id from public.competition_questions cq where c.pool is null or cq.pool = c.pool order by random() limit c.n_questions) s;
  if coalesce(array_length(ids, 1), 0) < c.n_questions then raise exception 'not enough questions'; end if;
  insert into public.competition_entries (competition_id, user_id, qids, q_started_at, deadline_at)
    values (p_comp, auth.uid(), ids, now(), now() + make_interval(secs => c.seconds_per_q))
    on conflict do nothing;
  return query select * from public.comp_state(p_comp);
end $$;

-- p_choice -1 means the student ran out of time. The result of an answer is never shown during the competition.
create or replace function public.comp_answer(p_comp bigint, p_idx int, p_choice int)
returns table (state text, q_idx int, q_total int, q_text text, q_options text[], secs_left numeric)
language plpgsql security definer set search_path = public as $$
declare c public.competitions; e public.competition_entries; ans int; ok boolean; spent bigint;
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  select * into c from public.competitions where id = p_comp;
  if not found then raise exception 'competition not found'; end if;
  select * into e from public.competition_entries where competition_id = p_comp and user_id = auth.uid();
  if not found then raise exception 'not started'; end if;
  perform public._comp_tick(e.id);
  select * into e from public.competition_entries where id = e.id for update;
  if e.finished_at is not null or p_idx <> e.current_idx then
    return query select * from public.comp_state(p_comp); return;           -- late or repeated click: ignored
  end if;
  select cq.answer into ans from public.competition_questions cq where cq.id = e.qids[e.current_idx + 1];
  spent := least(c.seconds_per_q * 1000, greatest(0, (extract(epoch from (now() - e.q_started_at)) * 1000)::bigint));
  ok := p_choice between 0 and 3 and p_choice = ans and now() <= e.deadline_at + interval '1 second';
  insert into public.competition_answers (entry_id, idx, question_id, choice, correct, ms)
    values (e.id, e.current_idx, e.qids[e.current_idx + 1], p_choice, ok, spent);
  update public.competition_entries set
    score = score + case when ok then 1 else 0 end,
    total_ms = total_ms + spent,
    current_idx = current_idx + 1,
    finished_at = case when current_idx + 1 >= c.n_questions then now() else null end,
    q_started_at = now(),
    deadline_at = now() + make_interval(secs => c.seconds_per_q)
  where id = e.id;
  return query select * from public.comp_state(p_comp);
end $$;

-- 4. Results: only after the competition closes (the admin can look any time). Admin entries are left out.
create or replace function public.comp_leaderboard(p_comp bigint)
returns table (display_name text, class_id text, score int, total_ms bigint, q_total int)
language plpgsql security definer stable set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  if not (public.is_admin() or exists (select 1 from public.competitions where id = p_comp and closes_at <= now())) then raise exception 'results not open'; end if;
  return query
    select p.display_name, p.class_id, e.score, e.total_ms, c.n_questions
    from public.competition_entries e join public.profiles p on p.id = e.user_id join public.competitions c on c.id = e.competition_id
    where e.competition_id = p_comp and not p.is_admin
    order by e.score desc, e.total_ms asc, e.started_at asc limit 100;
end $$;

create or replace function public.comp_class_board(p_comp bigint)
returns table (class_id text, participants bigint, avg_score numeric, total_score bigint)
language plpgsql security definer stable set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  if not (public.is_admin() or exists (select 1 from public.competitions where id = p_comp and closes_at <= now())) then raise exception 'results not open'; end if;
  return query
    select p.class_id, count(*), round(avg(e.score), 1), sum(e.score)::bigint
    from public.competition_entries e join public.profiles p on p.id = e.user_id
    where e.competition_id = p_comp and not p.is_admin and p.class_id is not null
    group by p.class_id order by avg(e.score) desc;
end $$;

create or replace function public.comp_my_result(p_comp bigint)
returns table (score int, q_total int, my_rank bigint, participants bigint, total_ms bigint)
language plpgsql security definer stable set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  if not (public.is_admin() or exists (select 1 from public.competitions where id = p_comp and closes_at <= now())) then raise exception 'results not open'; end if;
  return query
    with r as (
      select e.user_id, e.score, e.total_ms, rank() over (order by e.score desc, e.total_ms asc) as rk
      from public.competition_entries e join public.profiles p on p.id = e.user_id
      where e.competition_id = p_comp and not p.is_admin)
    select r.score, (select n_questions from public.competitions where id = p_comp), r.rk, (select count(*) from r), r.total_ms
    from r where r.user_id = auth.uid();
end $$;

create or replace function public.comp_review(p_comp bigint)
returns table (idx int, q_text text, q_options text[], right_answer int, explain text, your_choice int, was_correct boolean)
language plpgsql security definer stable set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  if not (public.is_admin() or exists (select 1 from public.competitions where id = p_comp and closes_at <= now())) then raise exception 'results not open'; end if;
  return query
    select a.idx, cq.q, cq.options, cq.answer, cq.explain, a.choice, a.correct
    from public.competition_entries e join public.competition_answers a on a.entry_id = e.id
    join public.competition_questions cq on cq.id = a.question_id
    where e.competition_id = p_comp and e.user_id = auth.uid() order by a.idx;
end $$;

-- 5. Admin tools.
create or replace function public.admin_import_comp_questions(p_items jsonb, p_pool text default 'general') returns int
language plpgsql security definer set search_path = public as $$
declare it jsonb; n int := 0; opts text[]; pl text := left(coalesce(nullif(trim(p_pool), ''), 'general'), 40);
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 300 then raise exception 'send an array of up to 300 questions'; end if;
  for it in select * from jsonb_array_elements(p_items) loop
    select array_agg(x) into opts from jsonb_array_elements_text(it->'options') as x;
    if opts is null or array_length(opts, 1) <> 4 then raise exception 'question % needs exactly 4 options', coalesce(it->>'id', '?'); end if;
    insert into public.competition_questions (id, pool, q, options, answer, explain)
      values (left(it->>'id', 60), pl, it->>'q', opts, (it->>'answer')::int, coalesce(it->>'explain', ''))
    on conflict (id) do update set pool = excluded.pool, q = excluded.q, options = excluded.options, answer = excluded.answer, explain = excluded.explain;
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.admin_comp_bank() returns table (pool text, questions bigint)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query select cq.pool, count(*) from public.competition_questions cq group by cq.pool order by cq.pool;
end $$;

create or replace function public.admin_delete_comp_pool(p_pool text) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  delete from public.competition_questions where pool = p_pool;
  get diagnostics n = row_count; return n;
end $$;

create or replace function public.admin_create_competition(p_name text, p_opens timestamptz, p_closes timestamptz, p_n int, p_sec int, p_pool text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare cid bigint; have int;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  select count(*) into have from public.competition_questions cq where coalesce(p_pool, '') = '' or cq.pool = p_pool;
  if have < p_n then raise exception 'not enough questions in the bank (have %)', have; end if;
  insert into public.competitions (name, opens_at, closes_at, n_questions, seconds_per_q, pool)
    values (trim(p_name), p_opens, p_closes, p_n, p_sec, nullif(p_pool, '')) returning id into cid;
  return cid;
end $$;

create or replace function public.admin_end_competition(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  update public.competitions set closes_at = greatest(opens_at + interval '1 second', now()) where id = p_id and closes_at > now();
end $$;

create or replace function public.admin_delete_competition(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  delete from public.competitions where id = p_id;
end $$;

-- 6. Who may call what.
revoke all on function public._comp_tick(bigint) from public, anon, authenticated;
revoke all on function public.comp_state(bigint), public.comp_start(bigint), public.comp_answer(bigint, int, int),
  public.comp_leaderboard(bigint), public.comp_class_board(bigint), public.comp_my_result(bigint), public.comp_review(bigint),
  public.admin_import_comp_questions(jsonb, text), public.admin_comp_bank(), public.admin_delete_comp_pool(text),
  public.admin_create_competition(text, timestamptz, timestamptz, int, int, text), public.admin_end_competition(bigint),
  public.admin_delete_competition(bigint) from public, anon;
grant execute on function public.comp_state(bigint), public.comp_start(bigint), public.comp_answer(bigint, int, int),
  public.comp_leaderboard(bigint), public.comp_class_board(bigint), public.comp_my_result(bigint), public.comp_review(bigint),
  public.admin_import_comp_questions(jsonb, text), public.admin_comp_bank(), public.admin_delete_comp_pool(text),
  public.admin_create_competition(text, timestamptz, timestamptz, int, int, text), public.admin_end_competition(bigint),
  public.admin_delete_competition(bigint) to authenticated;

-- AFTER you sign up on the site, make yourself the admin (put your own email in):
-- update public.profiles set is_admin = true where id = (select id from auth.users where email = 'YOUR-EMAIL-HERE');

-- ===== Update 5 (live rooms) =====
create table if not exists public.rooms (
  id            bigint generated always as identity primary key,
  code          text not null unique,
  host_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null check (char_length(name) between 2 and 60),
  pace          text not null check (pace in ('host','auto')),
  seconds_per_q int  not null check (seconds_per_q between 5 and 300),
  n_questions   int  not null check (n_questions between 1 and 50),
  status        text not null default 'lobby' check (status in ('lobby','question','reveal','finished')),
  cur_idx       int  not null default -1,
  q_started_at  timestamptz,
  reveal_at     timestamptz,
  created_at    timestamptz not null default now()
);
create table if not exists public.room_questions (
  room_id bigint not null references public.rooms(id) on delete cascade,
  idx     int not null,
  q       text not null,
  options text[] not null check (array_length(options, 1) = 4),
  answer  int not null check (answer between 0 and 3),
  explain text not null default '',
  primary key (room_id, idx)
);
create table if not exists public.room_players (
  room_id   bigint not null references public.rooms(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  score     int not null default 0,
  primary key (room_id, user_id)
);
create table if not exists public.room_answers (
  room_id bigint not null,
  idx     int not null,
  user_id uuid not null,
  choice  int not null,
  correct boolean not null,
  points  int not null,
  ms      bigint not null,
  primary key (room_id, idx, user_id),
  foreign key (room_id, user_id) references public.room_players(room_id, user_id) on delete cascade
);
alter table public.rooms          enable row level security;
alter table public.room_questions enable row level security;
alter table public.room_players   enable row level security;
alter table public.room_answers   enable row level security;
revoke all on public.rooms, public.room_questions, public.room_players, public.room_answers from anon, authenticated;   -- everything goes through the functions below

-- Internal: moves the room on when the clock says so (question time up; auto pace shows the answer for 7 seconds, then continues).
create or replace function public._room_tick(p_room bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r public.rooms; changed boolean := true; guard int := 0;
begin
  select * into r from public.rooms where id = p_room for update;
  if not found then return; end if;
  while changed and guard < 60 loop
    changed := false; guard := guard + 1;
    if r.status = 'question' and now() >= r.q_started_at + make_interval(secs => r.seconds_per_q) then
      update public.rooms set status = 'reveal', reveal_at = r.q_started_at + make_interval(secs => r.seconds_per_q) where id = r.id returning * into r;
      changed := true;
    elsif r.status = 'reveal' and r.pace = 'auto' and now() >= r.reveal_at + interval '7 seconds' then
      if r.cur_idx + 1 >= r.n_questions then
        update public.rooms set status = 'finished' where id = r.id returning * into r;
      else
        update public.rooms set status = 'question', cur_idx = cur_idx + 1, q_started_at = greatest(r.reveal_at + interval '7 seconds', r.q_started_at) where id = r.id returning * into r;
      end if;
      changed := true;
    end if;
  end loop;
end $$;

-- What a phone (or the host screen) sees. The right answer appears only at the reveal.
create or replace function public.room_state(p_room bigint)
returns table (room_id bigint, name text, pace text, sec int, n int, status text, cur_idx int, q_text text, q_options text[],
               secs_left numeric, reveal_left numeric, players bigint, answered bigint, right_answer int, explain text,
               my_choice int, my_points int, my_score int, my_rank bigint, option_counts int[], is_host boolean)
language plpgsql security definer set search_path = public as $$
declare r public.rooms; me int := null; isn boolean; qrow public.room_questions; mine public.room_answers; ps public.room_players;
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  perform public._room_tick(p_room);
  select * into r from public.rooms where id = p_room;
  if not found then raise exception 'room not found'; end if;
  isn := (r.host_id = auth.uid());
  select * into ps from public.room_players rp0 where rp0.room_id = r.id and rp0.user_id = auth.uid();
  if not isn and not found and not public.is_admin() then raise exception 'not in room'; end if;
  if r.cur_idx >= 0 then select * into qrow from public.room_questions where room_questions.room_id = r.id and idx = r.cur_idx; end if;
  select * into mine from public.room_answers where room_answers.room_id = r.id and idx = r.cur_idx and user_id = auth.uid();
  return query select r.id, r.name, r.pace, r.seconds_per_q, r.n_questions, r.status, r.cur_idx,
    case when r.status in ('question','reveal') or (r.status = 'finished' and r.cur_idx >= 0) then qrow.q end,
    case when r.status in ('question','reveal') or (r.status = 'finished' and r.cur_idx >= 0) then qrow.options end,
    case when r.status = 'question' then greatest(0, extract(epoch from (r.q_started_at + make_interval(secs => r.seconds_per_q) - now())))::numeric else 0::numeric end,
    case when r.status = 'reveal' and r.pace = 'auto' then greatest(0, 7 - extract(epoch from (now() - r.reveal_at)))::numeric else 0::numeric end,
    (select count(*) from public.room_players rp where rp.room_id = r.id),
    (select count(*) from public.room_answers ra where ra.room_id = r.id and ra.idx = r.cur_idx),
    case when r.status in ('reveal','finished') then qrow.answer end,
    case when r.status in ('reveal','finished') then qrow.explain end,
    mine.choice,
    case when r.status in ('reveal','finished') then mine.points end,
    coalesce(ps.score, 0),
    case when ps.user_id is not null then 1 + (select count(*) from public.room_players rp where rp.room_id = r.id and rp.score > ps.score) end,
    case when r.status in ('reveal','finished') then (select array_agg(c order by g) from (
        select g, count(a.user_id)::int as c from generate_series(0, 3) g
        left join public.room_answers a on a.room_id = r.id and a.idx = r.cur_idx and a.choice = g group by g) s) end,
    isn;
end $$;

create or replace function public.room_join(p_code text)
returns table (room_id bigint)
language plpgsql security definer set search_path = public as $$
declare r public.rooms;
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  select * into r from public.rooms where code = upper(trim(p_code));
  if not found then raise exception 'room not found'; end if;
  if r.status = 'finished' then raise exception 'room finished'; end if;
  if not exists (select 1 from public.room_players where room_players.room_id = r.id and user_id = auth.uid())
     and (select count(*) from public.room_players where room_players.room_id = r.id) >= 150 then raise exception 'room full'; end if;
  insert into public.room_players (room_id, user_id) values (r.id, auth.uid()) on conflict do nothing;
  return query select r.id;
end $$;

create or replace function public.room_answer(p_room bigint, p_idx int, p_choice int) returns void
language plpgsql security definer set search_path = public as $$
declare r public.rooms; ans int; spent bigint; ok boolean; pts int;
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  perform public._room_tick(p_room);
  select * into r from public.rooms where id = p_room;
  if not found or r.status <> 'question' or r.cur_idx <> p_idx then return; end if;                 -- too late or stale: ignored
  if not exists (select 1 from public.room_players where room_id = p_room and user_id = auth.uid()) then raise exception 'not in room'; end if;
  if now() > r.q_started_at + make_interval(secs => r.seconds_per_q) + interval '1 second' then return; end if;
  select answer into ans from public.room_questions where room_id = p_room and idx = p_idx;
  spent := least(r.seconds_per_q * 1000, greatest(0, (extract(epoch from (now() - r.q_started_at)) * 1000)::bigint));
  ok := p_choice between 0 and 3 and p_choice = ans;
  pts := case when ok then 500 + round(500 * greatest(0, 1 - spent / (r.seconds_per_q * 1000.0)))::int else 0 end;
  insert into public.room_answers (room_id, idx, user_id, choice, correct, points, ms)
    values (p_room, p_idx, auth.uid(), p_choice, ok, pts, spent) on conflict do nothing;       -- the first answer counts
  if found then update public.room_players set score = score + pts where room_id = p_room and user_id = auth.uid(); end if;
end $$;

create or replace function public.room_board(p_room bigint)
returns table (display_name text, class_id text, score int)
language plpgsql security definer stable set search_path = public as $$
declare r public.rooms;
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  select * into r from public.rooms where id = p_room;
  if not found then raise exception 'room not found'; end if;
  if not (r.host_id = auth.uid() or public.is_admin() or (r.status in ('reveal','finished') and exists (select 1 from public.room_players where room_id = p_room and user_id = auth.uid()))) then raise exception 'not allowed'; end if;
  return query select p.display_name, p.class_id, rp.score from public.room_players rp join public.profiles p on p.id = rp.user_id
    where rp.room_id = p_room order by rp.score desc, p.display_name limit 10;
end $$;

create or replace function public.room_class_board(p_room bigint)
returns table (class_id text, players bigint, avg_score numeric)
language plpgsql security definer stable set search_path = public as $$
declare r public.rooms;
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  select * into r from public.rooms where id = p_room;
  if not found then raise exception 'room not found'; end if;
  if not (r.host_id = auth.uid() or public.is_admin() or (r.status = 'finished' and exists (select 1 from public.room_players where room_id = p_room and user_id = auth.uid()))) then raise exception 'not allowed'; end if;
  return query select p.class_id, count(*), round(avg(rp.score), 0) from public.room_players rp join public.profiles p on p.id = rp.user_id
    where rp.room_id = p_room and p.class_id is not null group by p.class_id order by avg(rp.score) desc;
end $$;

-- Host controls.
create or replace function public._room_host(p_room bigint) returns public.rooms
language plpgsql security definer set search_path = public as $$
declare r public.rooms;
begin
  select * into r from public.rooms where id = p_room for update;
  if not found then raise exception 'room not found'; end if;
  if r.host_id <> auth.uid() and not public.is_admin() then raise exception 'not allowed'; end if;
  return r;
end $$;

create or replace function public.room_start(p_room bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r public.rooms;
begin
  r := public._room_host(p_room);
  if r.status = 'lobby' then update public.rooms set status = 'question', cur_idx = 0, q_started_at = now() where id = r.id; end if;
end $$;

-- Host presses Next: during a question it shows the answer now; at the answer it moves on (or finishes after the last question).
create or replace function public.room_next(p_room bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r public.rooms;
begin
  r := public._room_host(p_room);
  perform public._room_tick(p_room);
  select * into r from public.rooms where id = p_room;
  if r.status = 'question' then
    update public.rooms set status = 'reveal', reveal_at = now() where id = r.id;
  elsif r.status = 'reveal' then
    if r.cur_idx + 1 >= r.n_questions then update public.rooms set status = 'finished' where id = r.id;
    else update public.rooms set status = 'question', cur_idx = cur_idx + 1, q_started_at = now() where id = r.id; end if;
  end if;
end $$;

create or replace function public.room_end(p_room bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r public.rooms;
begin
  r := public._room_host(p_room);
  update public.rooms set status = 'finished' where id = r.id;
end $$;

create or replace function public.admin_delete_room(p_room bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r public.rooms;
begin
  r := public._room_host(p_room);
  delete from public.rooms where id = r.id;
end $$;

-- Create a room. p_source 'bank' draws random questions from the hidden bank (p_pool); 'items' uses the questions the admin sends (public practice questions).
create or replace function public.admin_create_room(p_name text, p_pace text, p_sec int, p_n int, p_source text, p_pool text default null, p_items jsonb default null)
returns table (room_id bigint, code text)
language plpgsql security definer set search_path = public as $$
declare rid bigint; c text; tries int := 0; it jsonb; k int := 0; opts text[]; have int;
        alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  delete from public.rooms where created_at < now() - interval '2 days';
  loop
    c := ''; for i in 1..5 loop c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1); end loop;
    exit when not exists (select 1 from public.rooms where rooms.code = c);
    tries := tries + 1; if tries > 30 then raise exception 'could not make a code'; end if;
  end loop;
  if p_source = 'bank' then
    select count(*) into have from public.competition_questions cq where coalesce(p_pool, '') = '' or cq.pool = p_pool;
    if have < p_n then raise exception 'not enough questions in the bank (have %)', have; end if;
  elsif p_source = 'items' then
    if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < p_n then raise exception 'not enough questions sent'; end if;
  else raise exception 'bad source'; end if;
  insert into public.rooms (code, host_id, name, pace, seconds_per_q, n_questions) values (c, auth.uid(), trim(p_name), p_pace, p_sec, p_n) returning id into rid;
  if p_source = 'bank' then
    insert into public.room_questions (room_id, idx, q, options, answer, explain)
      select rid, (row_number() over () - 1)::int, s.q, s.options, s.answer, s.explain
      from (select cq.q, cq.options, cq.answer, cq.explain from public.competition_questions cq where coalesce(p_pool, '') = '' or cq.pool = p_pool order by random() limit p_n) s;
  else
    for it in select * from jsonb_array_elements(p_items) loop
      exit when k >= p_n;
      select array_agg(x) into opts from jsonb_array_elements_text(it->'options') as x;
      if opts is null or array_length(opts, 1) <> 4 then raise exception 'every question needs exactly 4 options'; end if;
      insert into public.room_questions (room_id, idx, q, options, answer, explain) values (rid, k, it->>'q', opts, (it->>'answer')::int, coalesce(it->>'explain', ''));
      k := k + 1;
    end loop;
  end if;
  return query select rid, c;
end $$;

revoke all on function public._room_tick(bigint), public._room_host(bigint) from public, anon, authenticated;
revoke all on function public.room_state(bigint), public.room_join(text), public.room_answer(bigint, int, int), public.room_board(bigint),
  public.room_class_board(bigint), public.room_start(bigint), public.room_next(bigint), public.room_end(bigint), public.admin_delete_room(bigint),
  public.admin_create_room(text, text, int, int, text, text, jsonb) from public, anon;
grant execute on function public.room_state(bigint), public.room_join(text), public.room_answer(bigint, int, int), public.room_board(bigint),
  public.room_class_board(bigint), public.room_start(bigint), public.room_next(bigint), public.room_end(bigint), public.admin_delete_room(bigint),
  public.admin_create_room(text, text, int, int, text, text, jsonb) to authenticated;

-- ===== Update 6 (get-ready lead-in, server clock) =====
drop function if exists public.room_state(bigint);

create or replace function public._room_tick(p_room bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r public.rooms; changed boolean := true; guard int := 0;
begin
  select * into r from public.rooms where id = p_room for update;
  if not found then return; end if;
  while changed and guard < 60 loop
    changed := false; guard := guard + 1;
    if r.status = 'question' and now() >= r.q_started_at + make_interval(secs => r.seconds_per_q) then
      update public.rooms set status = 'reveal', reveal_at = r.q_started_at + make_interval(secs => r.seconds_per_q) where id = r.id returning * into r;
      changed := true;
    elsif r.status = 'reveal' and r.pace = 'auto' and now() >= r.reveal_at + interval '7 seconds' then
      if r.cur_idx + 1 >= r.n_questions then
        update public.rooms set status = 'finished' where id = r.id returning * into r;
      else
        update public.rooms set status = 'question', cur_idx = cur_idx + 1, q_started_at = r.reveal_at + interval '10 seconds' where id = r.id returning * into r;
      end if;
      changed := true;
    end if;
  end loop;
end $$;

create or replace function public.room_state(p_room bigint)
returns table (room_id bigint, name text, pace text, sec int, n int, status text, cur_idx int, q_text text, q_options text[],
               secs_left numeric, lead_left numeric, reveal_left numeric, players bigint, answered bigint, right_answer int, explain text,
               my_choice int, my_points int, my_score int, my_rank bigint, option_counts int[], is_host boolean)
language plpgsql security definer set search_path = public as $$
declare r public.rooms; me int := null; isn boolean; qrow public.room_questions; mine public.room_answers; ps public.room_players;
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  perform public._room_tick(p_room);
  select * into r from public.rooms where id = p_room;
  if not found then raise exception 'room not found'; end if;
  isn := (r.host_id = auth.uid());
  select * into ps from public.room_players rp0 where rp0.room_id = r.id and rp0.user_id = auth.uid();
  if not isn and not found and not public.is_admin() then raise exception 'not in room'; end if;
  if r.cur_idx >= 0 then select * into qrow from public.room_questions where room_questions.room_id = r.id and idx = r.cur_idx; end if;
  select * into mine from public.room_answers where room_answers.room_id = r.id and idx = r.cur_idx and user_id = auth.uid();
  return query select r.id, r.name, r.pace, r.seconds_per_q, r.n_questions, r.status, r.cur_idx,
    case when r.status in ('question','reveal') or (r.status = 'finished' and r.cur_idx >= 0) then qrow.q end,
    case when r.status in ('question','reveal') or (r.status = 'finished' and r.cur_idx >= 0) then qrow.options end,
    case when r.status = 'question' then greatest(0, extract(epoch from (r.q_started_at + make_interval(secs => r.seconds_per_q) - now())))::numeric else 0::numeric end,
    case when r.status = 'question' then greatest(0, extract(epoch from (r.q_started_at - now())))::numeric else 0::numeric end,
    case when r.status = 'reveal' and r.pace = 'auto' then greatest(0, 7 - extract(epoch from (now() - r.reveal_at)))::numeric else 0::numeric end,
    (select count(*) from public.room_players rp where rp.room_id = r.id),
    (select count(*) from public.room_answers ra where ra.room_id = r.id and ra.idx = r.cur_idx),
    case when r.status in ('reveal','finished') then qrow.answer end,
    case when r.status in ('reveal','finished') then qrow.explain end,
    mine.choice,
    case when r.status in ('reveal','finished') then mine.points end,
    coalesce(ps.score, 0),
    case when ps.user_id is not null then 1 + (select count(*) from public.room_players rp where rp.room_id = r.id and rp.score > ps.score) end,
    case when r.status in ('reveal','finished') then (select array_agg(c order by g) from (
        select g, count(a.user_id)::int as c from generate_series(0, 3) g
        left join public.room_answers a on a.room_id = r.id and a.idx = r.cur_idx and a.choice = g group by g) s) end,
    isn;
end $$;

create or replace function public.room_answer(p_room bigint, p_idx int, p_choice int) returns void
language plpgsql security definer set search_path = public as $$
declare r public.rooms; ans int; spent bigint; ok boolean; pts int;
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  perform public._room_tick(p_room);
  select * into r from public.rooms where id = p_room;
  if not found or r.status <> 'question' or r.cur_idx <> p_idx then return; end if;                 -- too late or stale: ignored
  if not exists (select 1 from public.room_players where room_id = p_room and user_id = auth.uid()) then raise exception 'not in room'; end if;
  if now() < r.q_started_at then return; end if;                                                    -- still in the get-ready lead-in
  if now() > r.q_started_at + make_interval(secs => r.seconds_per_q) + interval '1 second' then return; end if;
  select answer into ans from public.room_questions where room_id = p_room and idx = p_idx;
  spent := least(r.seconds_per_q * 1000, greatest(0, (extract(epoch from (now() - r.q_started_at)) * 1000)::bigint));
  ok := p_choice between 0 and 3 and p_choice = ans;
  pts := case when ok then 500 + round(500 * greatest(0, 1 - spent / (r.seconds_per_q * 1000.0)))::int else 0 end;
  insert into public.room_answers (room_id, idx, user_id, choice, correct, points, ms)
    values (p_room, p_idx, auth.uid(), p_choice, ok, pts, spent) on conflict do nothing;       -- the first answer counts
  if found then update public.room_players set score = score + pts where room_id = p_room and user_id = auth.uid(); end if;
end $$;

create or replace function public.room_start(p_room bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r public.rooms;
begin
  r := public._room_host(p_room);
  if r.status = 'lobby' then update public.rooms set status = 'question', cur_idx = 0, q_started_at = now() + interval '3 seconds' where id = r.id; end if;
end $$;

create or replace function public.room_next(p_room bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r public.rooms;
begin
  r := public._room_host(p_room);
  perform public._room_tick(p_room);
  select * into r from public.rooms where id = p_room;
  if r.status = 'question' then
    update public.rooms set status = 'reveal', reveal_at = greatest(now(), r.q_started_at) where id = r.id;
  elsif r.status = 'reveal' then
    if r.cur_idx + 1 >= r.n_questions then update public.rooms set status = 'finished' where id = r.id;
    else update public.rooms set status = 'question', cur_idx = cur_idx + 1, q_started_at = now() + interval '3 seconds' where id = r.id; end if;
  end if;
end $$;

revoke all on function public.room_state(bigint), public.room_answer(bigint, int, int), public.room_start(bigint), public.room_next(bigint) from public, anon;
grant execute on function public.room_state(bigint), public.room_answer(bigint, int, int), public.room_start(bigint), public.room_next(bigint) to authenticated;
revoke all on function public._room_tick(bigint) from public, anon, authenticated;

-- Lets the site tell a phone whose date or time is wrong (which makes sign-in fail straight away).
create or replace function public.server_time() returns timestamptz language sql stable as $$ select now() $$;
grant execute on function public.server_time() to anon, authenticated;

-- ===== Update 7 (feedback box) =====
-- DxDrill update 7: a feedback box. Students send a message; only the admin can read them. Needs updates 1 to 6. Safe to run again.

create table if not exists public.feedback (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  page       text not null default '',
  message    text not null check (char_length(message) between 5 and 1000),
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;            -- only the functions below touch it

create or replace function public.send_feedback(p_message text, p_page text default '') returns void
language plpgsql security definer set search_path = public as $$
declare m text := trim(coalesce(p_message, ''));
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  if char_length(m) < 5 then raise exception 'message too short'; end if;
  if char_length(m) > 1000 then raise exception 'message too long'; end if;
  if (select count(*) from public.feedback where user_id = auth.uid() and created_at > now() - interval '1 day') >= 5 then raise exception 'too many today'; end if;
  insert into public.feedback (user_id, page, message) values (auth.uid(), left(coalesce(p_page, ''), 40), m);
end $$;

create or replace function public.admin_feedback(p_limit int default 100)
returns table (id bigint, created_at timestamptz, display_name text, class_id text, page text, message text)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query select f.id, f.created_at, p.display_name, p.class_id, f.page, f.message
    from public.feedback f left join public.profiles p on p.id = f.user_id order by f.created_at desc limit least(greatest(p_limit, 1), 300);
end $$;

create or replace function public.admin_delete_feedback(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  delete from public.feedback where id = p_id;
end $$;

revoke all on function public.send_feedback(text, text), public.admin_feedback(int), public.admin_delete_feedback(bigint) from public, anon;
grant execute on function public.send_feedback(text, text), public.admin_feedback(int), public.admin_delete_feedback(bigint) to authenticated;

-- ===== Update 8 (debates) =====
-- DxDrill update 8: debates. A claim, students take a side with an optional short reason, and react to each other's reasons.
-- Needs updates 1 to 7. Safe to run again.

create table if not exists public.debates (
  id         bigint generated always as identity primary key,
  claim      text not null check (char_length(claim) between 5 and 200),
  context    text not null default '' check (char_length(context) <= 600),
  closed     boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.debate_takes (
  id         bigint generated always as identity primary key,
  debate_id  bigint not null references public.debates(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  side       text not null check (side in ('agree','disagree')),
  reason     text check (reason is null or char_length(reason) between 1 and 300),
  hidden     boolean not null default false,
  created_at timestamptz not null default now(),
  unique (debate_id, user_id)
);
create table if not exists public.debate_reactions (
  take_id bigint not null references public.debate_takes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind    text not null check (kind in ('good','new','unsure')),
  primary key (take_id, user_id)
);
create table if not exists public.debate_suggestions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  topic      text not null check (char_length(topic) between 5 and 200),
  created_at timestamptz not null default now()
);
alter table public.debates            enable row level security;
alter table public.debate_takes       enable row level security;
alter table public.debate_reactions   enable row level security;
alter table public.debate_suggestions enable row level security;
revoke all on public.debates, public.debate_takes, public.debate_reactions, public.debate_suggestions from anon, authenticated;

create or replace function public.debate_list()
returns table (id bigint, claim text, closed boolean, created_at timestamptz, takes bigint, my_side text)
language plpgsql security definer stable set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  return query select d.id, d.claim, d.closed, d.created_at,
      (select count(*) from public.debate_takes t where t.debate_id = d.id),
      (select t.side from public.debate_takes t where t.debate_id = d.id and t.user_id = auth.uid())
    from public.debates d order by d.closed, d.created_at desc limit 100;
end $$;

-- The split between sides stays hidden until you have taken a side yourself (or it is closed, or you are the admin).
create or replace function public.debate_info(p_id bigint)
returns table (id bigint, claim text, context text, closed boolean, my_side text, my_reason text, n_agree bigint, n_disagree bigint)
language plpgsql security definer stable set search_path = public as $$
declare d public.debates; mine public.debate_takes; see boolean;
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  select * into d from public.debates where debates.id = p_id;
  if not found then raise exception 'not found'; end if;
  select * into mine from public.debate_takes t where t.debate_id = p_id and t.user_id = auth.uid();
  see := found or d.closed or public.is_admin();
  return query select d.id, d.claim, d.context, d.closed, mine.side, mine.reason,
    case when see then (select count(*) from public.debate_takes t where t.debate_id = p_id and t.side = 'agree') end,
    case when see then (select count(*) from public.debate_takes t where t.debate_id = p_id and t.side = 'disagree') end;
end $$;

create or replace function public.debate_takes(p_id bigint, p_side text default null, p_limit int default 40)
returns table (id bigint, display_name text, class_id text, side text, reason text, hidden boolean, created_at timestamptz,
               good bigint, new_to_me bigint, unsure bigint, my_reaction text, mine boolean)
language plpgsql security definer stable set search_path = public as $$
declare d public.debates;
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  select * into d from public.debates where debates.id = p_id;
  if not found then raise exception 'not found'; end if;
  if not (d.closed or public.is_admin() or exists (select 1 from public.debate_takes t where t.debate_id = p_id and t.user_id = auth.uid())) then raise exception 'take a side first'; end if;
  return query
    select t.id, p.display_name, p.class_id, t.side, t.reason, t.hidden, t.created_at,
      (select count(*) from public.debate_reactions r where r.take_id = t.id and r.kind = 'good'),
      (select count(*) from public.debate_reactions r where r.take_id = t.id and r.kind = 'new'),
      (select count(*) from public.debate_reactions r where r.take_id = t.id and r.kind = 'unsure'),
      (select r.kind from public.debate_reactions r where r.take_id = t.id and r.user_id = auth.uid()),
      (t.user_id = auth.uid())
    from public.debate_takes t join public.profiles p on p.id = t.user_id
    where t.debate_id = p_id and t.reason is not null and (p_side is null or t.side = p_side) and (not t.hidden or public.is_admin())
    order by (select count(*) from public.debate_reactions r where r.take_id = t.id) desc, t.created_at desc
    limit least(greatest(p_limit, 1), 100);
end $$;

create or replace function public.debate_take(p_id bigint, p_side text, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare d public.debates; r text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  select * into d from public.debates where debates.id = p_id;
  if not found then raise exception 'not found'; end if;
  if d.closed then raise exception 'debate closed'; end if;
  if p_side not in ('agree','disagree') then raise exception 'bad side'; end if;
  if r is not null and char_length(r) > 300 then raise exception 'reason too long'; end if;
  insert into public.debate_takes (debate_id, user_id, side, reason) values (p_id, auth.uid(), p_side, r)
    on conflict (debate_id, user_id) do update set side = excluded.side, reason = excluded.reason, hidden = false;
end $$;

-- One reaction per person per reason. p_kind null removes yours. Not on your own reason.
create or replace function public.debate_react(p_take bigint, p_kind text) returns void
language plpgsql security definer set search_path = public as $$
declare t public.debate_takes; d public.debates;
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  select * into t from public.debate_takes where id = p_take;
  if not found then raise exception 'not found'; end if;
  select * into d from public.debates where debates.id = t.debate_id;
  if d.closed then raise exception 'debate closed'; end if;
  if t.user_id = auth.uid() then raise exception 'not your own'; end if;
  if not exists (select 1 from public.debate_takes x where x.debate_id = t.debate_id and x.user_id = auth.uid()) then raise exception 'take a side first'; end if;
  if p_kind is null then delete from public.debate_reactions where take_id = p_take and user_id = auth.uid();
  else
    if p_kind not in ('good','new','unsure') then raise exception 'bad kind'; end if;
    insert into public.debate_reactions (take_id, user_id, kind) values (p_take, auth.uid(), p_kind)
      on conflict (take_id, user_id) do update set kind = excluded.kind;
  end if;
end $$;

create or replace function public.debate_suggest(p_topic text) returns void
language plpgsql security definer set search_path = public as $$
declare m text := trim(coalesce(p_topic, ''));
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  if char_length(m) < 5 then raise exception 'too short'; end if;
  if char_length(m) > 200 then raise exception 'too long'; end if;
  if (select count(*) from public.debate_suggestions where user_id = auth.uid() and created_at > now() - interval '1 day') >= 5 then raise exception 'too many today'; end if;
  insert into public.debate_suggestions (user_id, topic) values (auth.uid(), m);
end $$;

create or replace function public.admin_debate_suggestions()
returns table (id bigint, created_at timestamptz, display_name text, topic text)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query select s.id, s.created_at, p.display_name, s.topic from public.debate_suggestions s left join public.profiles p on p.id = s.user_id order by s.created_at desc limit 100;
end $$;

create or replace function public.admin_delete_debate_suggestion(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  delete from public.debate_suggestions where id = p_id;
end $$;

create or replace function public.admin_create_debate(p_claim text, p_context text default '') returns bigint
language plpgsql security definer set search_path = public as $$
declare rid bigint;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  insert into public.debates (claim, context) values (trim(p_claim), trim(coalesce(p_context, ''))) returning id into rid;
  return rid;
end $$;

create or replace function public.admin_set_debate_closed(p_id bigint, p_closed boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  update public.debates set closed = p_closed where id = p_id;
end $$;

create or replace function public.admin_delete_debate(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  delete from public.debates where id = p_id;
end $$;

create or replace function public.admin_hide_take(p_take bigint, p_hide boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  update public.debate_takes set hidden = p_hide where id = p_take;
end $$;

revoke all on function public.debate_list(), public.debate_info(bigint), public.debate_takes(bigint, text, int), public.debate_take(bigint, text, text),
  public.debate_react(bigint, text), public.debate_suggest(text), public.admin_debate_suggestions(), public.admin_delete_debate_suggestion(bigint),
  public.admin_create_debate(text, text), public.admin_set_debate_closed(bigint, boolean), public.admin_delete_debate(bigint), public.admin_hide_take(bigint, boolean) from public, anon;
grant execute on function public.debate_list(), public.debate_info(bigint), public.debate_takes(bigint, text, int), public.debate_take(bigint, text, text),
  public.debate_react(bigint, text), public.debate_suggest(text), public.admin_debate_suggestions(), public.admin_delete_debate_suggestion(bigint),
  public.admin_create_debate(text, text), public.admin_set_debate_closed(bigint, boolean), public.admin_delete_debate(bigint), public.admin_hide_take(bigint, boolean) to authenticated;

-- ===== Update 9 (feature switches) =====
-- DxDrill update 9: feature switches. The admin shows or hides features from students without uploading anything.
-- Needs updates 1 to 8. Safe to run again (it never resets a switch you have already set).

create table if not exists public.site_features (
  key        text primary key,
  enabled    boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.site_features enable row level security;
revoke all on public.site_features from anon, authenticated;

insert into public.site_features (key, enabled) values
  ('cards', true), ('polls', true), ('competitions', true), ('live', true), ('debates', false)
on conflict (key) do nothing;

create or replace function public.site_features() returns table (key text, enabled boolean)
language sql security definer stable set search_path = public as $$ select f.key, f.enabled from public.site_features f $$;

create or replace function public.admin_set_feature(p_key text, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  insert into public.site_features (key, enabled, updated_at) values (p_key, p_on, now())
    on conflict (key) do update set enabled = excluded.enabled, updated_at = now();
end $$;

revoke all on function public.site_features(), public.admin_set_feature(text, boolean) from public, anon, authenticated;
grant execute on function public.site_features() to anon, authenticated;
grant execute on function public.admin_set_feature(text, boolean) to authenticated;

-- ===== Update 10 (practice with friends) =====
-- DxDrill update 10: practice with friends. Any signed-in student can host a small room (public questions only), with limits.
-- Needs updates 1 to 9. Safe to run again.

alter table public.rooms add column if not exists kind text not null default 'admin' check (kind in ('admin','friends'));
alter table public.rooms add column if not exists max_players int not null default 150 check (max_players between 2 and 150);

create table if not exists public.site_settings (
  key text primary key,
  val int not null
);
alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon, authenticated;
insert into public.site_settings (key, val) values ('friend_max_players', 30), ('friend_active_rooms', 20), ('friend_rooms_per_day', 3)
  on conflict (key) do nothing;
insert into public.site_features (key, enabled) values ('friends', false) on conflict (key) do nothing;

create or replace function public.admin_site_settings() returns table (key text, val int)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query select s.key, s.val from public.site_settings s order by s.key;
end $$;
create or replace function public.admin_set_setting(p_key text, p_val int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if p_key not in ('friend_max_players','friend_active_rooms','friend_rooms_per_day') then raise exception 'unknown setting'; end if;
  update public.site_settings set val = greatest(1, least(coalesce(p_val, 1), case when p_key = 'friend_max_players' then 150 else 500 end)) where key = p_key;
end $$;

-- A student starts a room. Limits: one open room each, a few per day, a cap on rooms in play at once, a cap on players per room.
create or replace function public.friend_create_room(p_name text, p_pace text, p_sec int, p_n int, p_items jsonb)
returns table (room_id bigint, code text)
language plpgsql security definer set search_path = public as $$
declare rid bigint; c text; tries int := 0; it jsonb; k int := 0; opts text[]; q text;
        alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; on_ boolean; mx int; act int; perday int;
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  select enabled into on_ from public.site_features where key = 'friends';
  if not coalesce(on_, false) and not public.is_admin() then raise exception 'not open yet'; end if;
  if p_pace not in ('host','auto') then raise exception 'bad pace'; end if;
  if p_n < 3 or p_n > 20 then raise exception 'bad count'; end if;
  if p_sec < 10 or p_sec > 60 then raise exception 'bad seconds'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 or char_length(trim(p_name)) > 60 then raise exception 'bad name'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < p_n or jsonb_array_length(p_items) > 50 then raise exception 'not enough questions sent'; end if;
  delete from public.rooms where created_at < now() - interval '2 days';
  if exists (select 1 from public.rooms where host_id = auth.uid() and status <> 'finished' and created_at > now() - interval '3 hours') then raise exception 'you have a room open'; end if;
  select val into perday from public.site_settings where key = 'friend_rooms_per_day';
  if (select count(*) from public.rooms where host_id = auth.uid() and kind = 'friends' and created_at > now() - interval '1 day') >= coalesce(perday, 3) then raise exception 'too many rooms today'; end if;
  select val into act from public.site_settings where key = 'friend_active_rooms';
  if (select count(*) from public.rooms where kind = 'friends' and status <> 'finished' and created_at > now() - interval '2 hours') >= coalesce(act, 20) then raise exception 'busy right now'; end if;
  select val into mx from public.site_settings where key = 'friend_max_players';
  loop
    c := ''; for i in 1..5 loop c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1); end loop;
    exit when not exists (select 1 from public.rooms where rooms.code = c);
    tries := tries + 1; if tries > 30 then raise exception 'could not make a code'; end if;
  end loop;
  insert into public.rooms (code, host_id, name, pace, seconds_per_q, n_questions, kind, max_players)
    values (c, auth.uid(), trim(p_name), p_pace, p_sec, p_n, 'friends', greatest(2, coalesce(mx, 30))) returning id into rid;
  for it in select * from jsonb_array_elements(p_items) loop
    exit when k >= p_n;
    q := it->>'q';
    if q is null or char_length(q) > 600 then raise exception 'bad question'; end if;
    select array_agg(x) into opts from jsonb_array_elements_text(it->'options') as x;
    if opts is null or array_length(opts, 1) <> 4 then raise exception 'every question needs exactly 4 options'; end if;
    if exists (select 1 from unnest(opts) o where char_length(o) > 250) then raise exception 'bad question'; end if;
    if coalesce((it->>'answer')::int, -1) not between 0 and 3 then raise exception 'bad question'; end if;
    insert into public.room_questions (room_id, idx, q, options, answer, explain) values (rid, k, q, opts, (it->>'answer')::int, left(coalesce(it->>'explain', ''), 600));
    k := k + 1;
  end loop;
  insert into public.room_players (room_id, user_id) values (rid, auth.uid());   -- the host plays too
  return query select rid, c;
end $$;

drop function if exists public.room_state(bigint);

create or replace function public.room_state(p_room bigint)
returns table (room_id bigint, kind text, max_players int, name text, pace text, sec int, n int, status text, cur_idx int, q_text text, q_options text[],
               secs_left numeric, lead_left numeric, reveal_left numeric, players bigint, answered bigint, right_answer int, explain text,
               my_choice int, my_points int, my_score int, my_rank bigint, option_counts int[], is_host boolean)
language plpgsql security definer set search_path = public as $$
declare r public.rooms; me int := null; isn boolean; qrow public.room_questions; mine public.room_answers; ps public.room_players;
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  perform public._room_tick(p_room);
  select * into r from public.rooms where id = p_room;
  if not found then raise exception 'room not found'; end if;
  isn := (r.host_id = auth.uid());
  select * into ps from public.room_players rp0 where rp0.room_id = r.id and rp0.user_id = auth.uid();
  if not isn and not found and not public.is_admin() then raise exception 'not in room'; end if;
  if r.cur_idx >= 0 then select * into qrow from public.room_questions where room_questions.room_id = r.id and idx = r.cur_idx; end if;
  select * into mine from public.room_answers where room_answers.room_id = r.id and idx = r.cur_idx and user_id = auth.uid();
  return query select r.id, r.kind, r.max_players, r.name, r.pace, r.seconds_per_q, r.n_questions, r.status, r.cur_idx,
    case when r.status in ('question','reveal') or (r.status = 'finished' and r.cur_idx >= 0) then qrow.q end,
    case when r.status in ('question','reveal') or (r.status = 'finished' and r.cur_idx >= 0) then qrow.options end,
    case when r.status = 'question' then greatest(0, extract(epoch from (r.q_started_at + make_interval(secs => r.seconds_per_q) - now())))::numeric else 0::numeric end,
    case when r.status = 'question' then greatest(0, extract(epoch from (r.q_started_at - now())))::numeric else 0::numeric end,
    case when r.status = 'reveal' and r.pace = 'auto' then greatest(0, 7 - extract(epoch from (now() - r.reveal_at)))::numeric else 0::numeric end,
    (select count(*) from public.room_players rp where rp.room_id = r.id),
    (select count(*) from public.room_answers ra where ra.room_id = r.id and ra.idx = r.cur_idx),
    case when r.status in ('reveal','finished') then qrow.answer end,
    case when r.status in ('reveal','finished') then qrow.explain end,
    mine.choice,
    case when r.status in ('reveal','finished') then mine.points end,
    coalesce(ps.score, 0),
    case when ps.user_id is not null then 1 + (select count(*) from public.room_players rp where rp.room_id = r.id and rp.score > ps.score) end,
    case when r.status in ('reveal','finished') then (select array_agg(c order by g) from (
        select g, count(a.user_id)::int as c from generate_series(0, 3) g
        left join public.room_answers a on a.room_id = r.id and a.idx = r.cur_idx and a.choice = g group by g) s) end,
    isn;
end $$;

create or replace function public.room_join(p_code text)
returns table (room_id bigint)
language plpgsql security definer set search_path = public as $$
declare r public.rooms;
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  select * into r from public.rooms where code = upper(trim(p_code));
  if not found then raise exception 'room not found'; end if;
  if r.status = 'finished' then raise exception 'room finished'; end if;
  if not exists (select 1 from public.room_players where room_players.room_id = r.id and user_id = auth.uid())
     and (select count(*) from public.room_players where room_players.room_id = r.id) >= r.max_players then raise exception 'room full'; end if;
  insert into public.room_players (room_id, user_id) values (r.id, auth.uid()) on conflict do nothing;
  return query select r.id;
end $$;

create or replace function public.room_start(p_room bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r public.rooms;
begin
  r := public._room_host(p_room);
  if r.kind = 'friends' and (select count(*) from public.room_players where room_id = r.id) < 2 then raise exception 'need a friend'; end if;
  if r.status = 'lobby' then update public.rooms set status = 'question', cur_idx = 0, q_started_at = now() + interval '3 seconds' where id = r.id; end if;
end $$;

revoke all on function public.room_state(bigint), public.room_join(text), public.room_start(bigint), public.friend_create_room(text, text, int, int, jsonb),
  public.admin_site_settings(), public.admin_set_setting(text, int) from public, anon;
grant execute on function public.room_state(bigint), public.room_join(text), public.room_start(bigint), public.friend_create_room(text, text, int, int, jsonb),
  public.admin_site_settings(), public.admin_set_setting(text, int) to authenticated;
