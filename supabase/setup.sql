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

-- AFTER you sign up on the site, make yourself the admin (put your own email in):
-- update public.profiles set is_admin = true where id = (select id from auth.users where email = 'YOUR-EMAIL-HERE');
