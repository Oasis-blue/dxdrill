-- DxDrill study reminder scheduler.
-- Prerequisites:
-- 1. Deploy supabase/functions/study-reminders/index.ts as Edge Function "study-reminders".
-- 2. In that function's settings, turn OFF gateway JWT verification. The function verifies
--    student JWTs itself and protects scheduled runs with REMINDER_CRON_SECRET.
-- 3. Add the same REMINDER_CRON_SECRET value to Edge Function secrets and this database Vault.
-- This script creates a random Vault secret once if it does not already exist.

create extension if not exists pg_cron with schema pg_catalog;
create schema if not exists extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (
    select 1 from vault.secrets where name = 'dxdrill_reminder_cron_secret'
  ) then
    perform vault.create_secret(
      encode(gen_random_bytes(32), 'hex'),
      'dxdrill_reminder_cron_secret',
      'Shared secret for the DxDrill study reminder scheduled Edge Function'
    );
  end if;
end
$$;

-- Run this query separately after the script and copy the result into the
-- Edge Function secret named REMINDER_CRON_SECRET. Do not commit or publish it.
-- select decrypted_secret from vault.decrypted_secrets where name = 'dxdrill_reminder_cron_secret';

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'dxdrill-study-reminders') then
    perform cron.schedule(
      'dxdrill-study-reminders',
      '* * * * *',
      $job$
        select net.http_post(
          url := 'https://dkullruinrnwjmhlxlpl.supabase.co/functions/v1/study-reminders',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-reminder-secret',
            (select decrypted_secret from vault.decrypted_secrets where name = 'dxdrill_reminder_cron_secret')
          ),
          body := '{"action":"run"}'::jsonb
        );
      $job$
    );
  end if;
end
$$;
