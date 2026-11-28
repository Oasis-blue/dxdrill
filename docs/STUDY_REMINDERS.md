# DxDrill study reminders — implementation notes

## Goal
Opt-in Web Push study reminders that can arrive while DxDrill is closed, subject to browser/OS support and notification permission. Reminders are disabled by default.

## Existing app behaviour
The current streak is device-local in `js/streak.js`. It uses the Lagos calendar day and requires five completed practice/Spotter questions. It is not synced to Supabase. The first reminder release must therefore be a simple scheduled practice nudge, not a claim that a cloud streak is at risk.

## Database foundation
Run `supabase/update-24.sql` in Supabase SQL Editor. It creates:
- `study_reminder_preferences`: one opt-in schedule per account, local time, IANA timezone, selected weekdays and optional quiet hours.
- `study_push_subscriptions`: one row per subscribed browser/device, with row-level security restricting access to the owner.
- `study_reminder_deliveries`: server-managed send log with a unique account/type/local-date key to prevent duplicate reminders on retries or across devices.

The migration contains no secrets. Students cannot create or modify delivery records.

## Delivery architecture still to deploy
1. Add a Web Push subscription from a user gesture after explaining the permission prompt.
2. Store the subscription under the signed-in account. Unsubscribe/delete it on request and remove expired endpoints after HTTP 404/410 responses.
3. Use a server-side Edge Function to select due preferences by their IANA timezone and weekday, honour quiet hours, create the unique delivery record, and send an encrypted Web Push payload.
4. Schedule the function through Supabase Cron. Keep the service-role key and VAPID private key in server-side secrets only; never put either in GitHub or browser code.
5. The service worker must display a visible notification for every push and route notification clicks into DxDrill.
6. Verify delivery on real Android and iOS devices before describing the feature as live.

## Platform notes
- iOS/iPadOS Web Push requires DxDrill to be installed as a Home Screen web app and supported OS versions (16.4+).
- Browser notification permission must be requested only after a clear user action.
- Push delivery is best-effort and depends on device/browser settings, connectivity and OS policies.
- Supabase quotas and plan limits should be checked in the project dashboard; this design does not guarantee zero cost.
