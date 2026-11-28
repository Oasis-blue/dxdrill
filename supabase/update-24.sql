-- DxDrill study reminders: account-linked preferences, device subscriptions and delivery deduplication.
-- Run once in Supabase SQL Editor after the existing setup.sql / update migrations.
-- No private VAPID keys or service-role credentials belong in this file.

create table if not exists public.study_reminder_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  local_time time not null default '19:00',
  timezone text not null default 'Africa/Lagos',
  days_of_week smallint[] not null default array[1,2,3,4,5,6,7]::smallint[],
  quiet_start time,
  quiet_end time,
  reminder_type text not null default 'daily_practice'
    check (reminder_type in ('daily_practice')),
  updated_at timestamptz not null default now(),
  constraint reminder_timezone_not_blank check (length(trim(timezone)) between 1 and 80),
  constraint reminder_days_valid check (
    cardinality(days_of_week) between 1 and 7
    and days_of_week <@ array[1,2,3,4,5,6,7]::smallint[]
  ),
  constraint reminder_quiet_hours_pair check (
    (quiet_start is null and quiet_end is null)
    or (quiet_start is not null and quiet_end is not null)
  )
);

create table if not exists public.study_push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (length(endpoint) between 1 and 2048),
  p256dh text not null check (length(p256dh) between 1 and 256),
  auth text not null check (length(auth) between 1 and 256),
  user_agent text not null default '' check (length(user_agent) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_success_at timestamptz
);
create index if not exists study_push_subscriptions_user on public.study_push_subscriptions(user_id);

-- One reminder category per account and local calendar day, preventing duplicate sends
-- when the scheduler retries or the user has several subscribed devices.
create table if not exists public.study_reminder_deliveries (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_type text not null default 'daily_practice'
    check (reminder_type in ('daily_practice')),
  local_date date not null,
  status text not null default 'queued'
    check (status in ('queued','sent','failed','skipped')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  error_code text,
  unique (user_id, reminder_type, local_date)
);
create index if not exists study_reminder_deliveries_pending
  on public.study_reminder_deliveries(status, created_at);

alter table public.study_reminder_preferences enable row level security;
alter table public.study_push_subscriptions enable row level security;
alter table public.study_reminder_deliveries enable row level security;

drop policy if exists study_reminder_preferences_read_own on public.study_reminder_preferences;
create policy study_reminder_preferences_read_own on public.study_reminder_preferences
  for select to authenticated using (user_id = auth.uid());
drop policy if exists study_reminder_preferences_insert_own on public.study_reminder_preferences;
create policy study_reminder_preferences_insert_own on public.study_reminder_preferences
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists study_reminder_preferences_update_own on public.study_reminder_preferences;
create policy study_reminder_preferences_update_own on public.study_reminder_preferences
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists study_reminder_preferences_delete_own on public.study_reminder_preferences;
create policy study_reminder_preferences_delete_own on public.study_reminder_preferences
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists study_push_subscriptions_read_own on public.study_push_subscriptions;
create policy study_push_subscriptions_read_own on public.study_push_subscriptions
  for select to authenticated using (user_id = auth.uid());
drop policy if exists study_push_subscriptions_insert_own on public.study_push_subscriptions;
create policy study_push_subscriptions_insert_own on public.study_push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists study_push_subscriptions_delete_own on public.study_push_subscriptions;
create policy study_push_subscriptions_delete_own on public.study_push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- Students may see their own delivery history, but only the server-side scheduler
-- (service role) can create, update or mark deliveries.
drop policy if exists study_reminder_deliveries_read_own on public.study_reminder_deliveries;
create policy study_reminder_deliveries_read_own on public.study_reminder_deliveries
  for select to authenticated using (user_id = auth.uid());

revoke all on public.study_reminder_preferences from anon, authenticated;
revoke all on public.study_push_subscriptions from anon, authenticated;
revoke all on public.study_reminder_deliveries from anon, authenticated;
grant select, insert, update, delete on public.study_reminder_preferences to authenticated;
grant select, insert, delete on public.study_push_subscriptions to authenticated;
grant select on public.study_reminder_deliveries to authenticated;
grant all on public.study_reminder_preferences, public.study_push_subscriptions,
  public.study_reminder_deliveries to service_role;

comment on table public.study_reminder_preferences is
  'Per-account opt-in study reminder schedule. Times are interpreted in the saved IANA timezone.';
comment on table public.study_push_subscriptions is
  'Per-device Web Push subscriptions. Endpoint keys are private user data and are never exposed to other accounts.';
comment on table public.study_reminder_deliveries is
  'Server-managed idempotency log; unique per account, reminder type and local calendar date.';
