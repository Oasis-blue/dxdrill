-- DxDrill study reminder retry support.
-- Run once in Supabase SQL Editor after the original reminder migrations.
-- New deliveries are inserted normally. Existing failed/skipped deliveries may be
-- reclaimed for retry; queued/sent deliveries remain deduplicated.

create or replace function public.claim_study_reminder_delivery(
  p_user_id uuid,
  p_reminder_type text,
  p_local_date date
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_id bigint;
begin
  if p_reminder_type <> 'daily_practice' then
    raise exception 'Unsupported reminder type';
  end if;

  insert into public.study_reminder_deliveries as existing (
    user_id, reminder_type, local_date, status, created_at, sent_at, error_code
  )
  values (
    p_user_id, p_reminder_type, p_local_date, 'queued', now(), null, null
  )
  on conflict (user_id, reminder_type, local_date)
  do update set
    status = 'queued',
    created_at = now(),
    sent_at = null,
    error_code = null
  where existing.status in ('failed', 'skipped')
  returning id into claimed_id;

  return claimed_id;
end;
$$;

revoke all on function public.claim_study_reminder_delivery(uuid, text, date) from public, anon, authenticated;
grant execute on function public.claim_study_reminder_delivery(uuid, text, date) to service_role;

comment on function public.claim_study_reminder_delivery(uuid, text, date) is
  'Atomically creates a daily reminder delivery or reclaims failed/skipped delivery rows for retry without duplicating queued/sent reminders.';
