# DxDrill study reminders — implementation and setup

## Goal
Opt-in Web Push study reminders that can arrive while DxDrill is closed, subject to browser/OS support and notification permission. Reminders are disabled by default.

## Existing app behaviour
The current streak is device-local in `js/streak.js`. It uses the Lagos calendar day and requires five completed practice/Spotter questions. It is not synced to Supabase. The first reminder release is a scheduled practice nudge, not a claim that a cloud streak is at risk.

## Repository implementation
- `supabase/update-24.sql`: account preferences, per-device Web Push subscriptions, RLS and duplicate-delivery log.
- `js/reminders.js`: Account page controls; permission is requested only after the user presses Enable.
- `sw.js`: visible notification display and click-through into the app.
- `supabase/functions/study-reminders/index.ts`: authenticated subscription endpoint plus secret-protected scheduled sender. It uses `@mmmike/web-push` (Web Crypto, RFC 8291/8292) rather than Node-only crypto.
- `tools/vapid-keygen.html`: creates a VAPID key pair locally in the browser. It does not upload the keys.

## Supabase setup (dashboard only; no terminal)

1. Run `supabase/update-24.sql` in Supabase → SQL Editor.
2. In Supabase → Edge Functions, create a function named **swift-action**. Paste the contents of `supabase/functions/study-reminders/index.ts` into its editor and deploy it.
3. In that function's settings, turn **Verify JWT** off. The function performs its own checks: student requests must contain a valid Supabase user token; scheduled requests must contain the private `REMINDER_CRON_SECRET`. Do not remove those checks.
4. Open the deployed DxDrill site at `/tools/vapid-keygen.html` and generate one VAPID key pair. In Supabase → Edge Functions → Secrets, add:
   - `VAPID_PUBLIC_KEY` — public key from the generator
   - `VAPID_PRIVATE_KEY` — private key from the generator (keep secret)
   - `VAPID_SUBJECT` — a contact URI such as `mailto:your-real-contact-email@example.com` (replace with a real address)
5. Run `supabase/update-25.sql` in SQL Editor. It enables the scheduler extensions, creates a random shared scheduler secret in Vault, and schedules the function once per minute.
6. Run this query in SQL Editor and copy the returned value directly into the Edge Function secret named `REMINDER_CRON_SECRET`:
   ```sql
   select decrypted_secret
   from vault.decrypted_secrets
   where name = 'dxdrill_reminder_cron_secret';
   ``
   Do not put that value in GitHub or send it in chat. Supabase's built-in `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` environment variables are used by the function; do not expose the service-role key.
7. Sign in to DxDrill → Account → Study reminders, choose a time and days, then press **Enable notifications on this device**. The browser will ask for permission.

If the function was deployed before the secrets were added, redeploy/restart it if the Dashboard requires that for new secrets to take effect. Check Edge Function logs and Cron job run history if delivery does not work.

## Security and delivery behaviour
- Private VAPID and scheduler secrets stay in Supabase Function Secrets / Vault, never in GitHub.
- Student requests are authenticated against Supabase Auth before subscription data is written.
- Scheduler requests are accepted only with the shared random secret.
- Students can access only their own preferences and subscriptions through RLS; delivery logs are server-managed.
- Each account can receive at most one daily-practice reminder per local calendar day, even with multiple devices.
- Expired subscriptions (push service HTTP 404/410) are deleted.
- Quiet hours and weekday preferences are evaluated in the saved IANA time zone.
- The first version does not yet suppress a reminder based on same-day completed questions because the current local streak and Spotter activity are not authoritative server-side data. This can be added after the streak sync design is implemented.
- Push delivery is best-effort and depends on browser/OS support, connectivity and notification settings. It is not guaranteed to arrive at an exact minute.

## Platform notes
- iOS/iPadOS Web Push requires DxDrill to be installed as a Home Screen web app and supported OS versions (16.4+).
- Browser notification permission is requested only after an explicit user action.
- Supabase quotas and plan limits should be checked in the project dashboard; this design does not guarantee zero cost.

## Streak direction
Keep local recording and offline display, but introduce account-synced daily progress as the cross-device source of truth. Preserve the five-question daily threshold. Migrate the existing local history carefully and deduplicate by event ID/day so a device switch or offline replay cannot inflate the streak.
