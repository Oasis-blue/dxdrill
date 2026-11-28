# DxDrill app reliability and admin audit

**Audit date:** 28 November 2026  
**Repository:** `Oasis-blue/dxdrill`, branch `main`  
**Scope:** persistence, offline behaviour, account syncing, personal analytics, practice flows, admin feedback, question reports, activity data and safeguards.

## Executive summary

The core design is sound for an early offline-first learning app: MCQ and T/F practice can run locally; signed-in learning activity is queued for Supabase; personal analytics are private RPCs; and admin reporting functions check `public.is_admin()`. This was a source-code and SQL review, not a live browser or production-database test.

Two verified client-side reliability defects were fixed in this audit:
1. MCQ and T/F pending queues were cleared when the server returned a daily-limit error. That silently discarded unsent learning activity.
2. MCQ queue flushing had no in-flight guard. A second flush could race the first and both could act on the same pending batch.

A separate admin UX defect was fixed: failure to delete a feedback message was silently ignored.

## Changes committed

| File | Change |
|---|---|
| `js/cloud.js` | Keep pending MCQ and T/F attempts when a daily limit is reached; pause retrying that queue until a later online event or new submission; serialize MCQ flushing; remove only the batch prefix that was actually sent, preserving items queued during the request. |
| `js/feedback.js` | Check the result of `admin_delete_feedback`; show a useful error instead of silently doing nothing when deletion fails. |
| `sw.js` | Bump service-worker cache version to `dxdrill-v14.36` so clients fetch the reliability fixes. |

The sync fix does not change leaderboard scoring rules or the database schema. Existing queue entries remain compatible.

## Findings by area

### 1. Persistence and offline behaviour

- The app stores local question history, T/F statement history, unfinished T/F runs, feature preferences, and pending cloud queues in `localStorage`.
- The MCQ practice run itself is held in memory. Reloading or closing the tab during an unfinished MCQ run loses that run's position and selections; already recorded completed answers remain in local history.
- T/F unfinished runs are saved under `dx.tf.run` and can be resumed after reload.
- The service worker caches the app shell and all question/term files listed in the manifest. Supabase calls are deliberately network-only.
- Question and term file fetches retry once, but final file failures are caught and logged to the console. The overall loader still marks the bank ready after the task pool settles. There is no prominent in-app warning identifying missing files, so a learner may see an incomplete bank if a file repeatedly fails.
- Local storage writes fail silently if browser storage is blocked or full. The app remains usable, but local persistence is not guaranteed in that situation.

**Follow-up candidates:** consider resumable MCQ runs; surface a visible incomplete-bank warning and retry control; make storage-unavailable state visible. These need careful UX decisions and were not included in this patch.

### 2. Account syncing and learning records

- MCQ responses are queued under `dx.pending`; T/F stem attempts are queued separately under `dx.tf.pending`.
- Sync requires a signed-in user. Offline practice without an account remains local; it is not later merged into a new account automatically.
- T/F uploads use an attempt ID and an upsert conflict key, making a retry of the same T/F attempt idempotent.
- MCQ uploads use plain inserts and the local pending queue currently de-duplicates identical question/result pairs while they are pending. This can undercount repeated identical MCQ outcomes made before a successful sync, and a lost network response after a successful insert could result in a duplicate on retry. A fully robust solution needs a client-generated MCQ attempt ID stored with each row and a matching database migration; this was not improvised in the current patch.
- The queue has a finite local cap of 500 entries. Very long periods offline or repeated storage failures can exceed what the app retains.
- The server's daily insert caps are intentional anti-abuse safeguards. Pending data is now retained on a cap error instead of being deleted. It retries after a later online event or subsequent submission; the app does not currently show a dedicated pending-sync count/status.
- T/F leaderboard points remain one point per distinct stem only when all statements are answered and at least 60% are correct. Repeated attempts do not farm points.

### 3. Personal learning progress and analytics

- `my_learning_progress`, `my_review_mistakes` and `my_learning_analytics` are security-definer functions that require an authenticated user and scope their data queries to `auth.uid()`.
- Topic mapping for MCQs is supplied by the client because historical answer rows store question IDs rather than topic IDs.
- The analytics call waits for the complete question bank before building the topic map, avoiding a partial-map query during normal loading.
- The 14-day activity and two-period topic comparison are derived from synced MCQ and T/F records, not unsynced offline practice.
- Review Mistakes uses the last synced MCQ result for signed-in users and local stats as a fallback for questions without a remote record. The code includes the prior fix for a correctly re-answered question disappearing from the synced review list.
- Error states for personal analytics/progress are cached as loaded for the current page session. A transient failure may therefore require a page reload or a fresh authentication event before the data is retried.

**Not verified live:** the Supabase migrations and RPCs have not been exercised against a production account during this audit. The user previously confirmed running updates 20, 21 and 23; update 22 is also required for Review Mistakes. Repository inspection cannot establish that the live database has the expected schema, grants or data.

### 4. Practice flows

- MCQ Study mode reveals the answer and explanation after each selection; Exam mode defers feedback until the end.
- MCQ history is recorded locally when a run is completed. Cloud syncing is separate and requires sign-in.
- T/F runs support resume, exam/practice marking, timed mode, skipped statements and local statement-level analytics.
- T/F cloud activity is submitted after checking a stem, with partial attempts represented by answered/correct/total counts.
- Practice without internet is supported by the cached shell and question files, but live rooms, accounts, leaderboards and server reporting require a connection.

### 5. Admin feedback and question reporting

- Student feedback is submitted through `send_feedback`; the SQL function requires authentication, limits messages to 5 per user per day, and enforces 5–1000 characters.
- Only an admin can call `admin_feedback` or `admin_delete_feedback`. The admin feedback list loads up to 100 most recent messages; there is no pagination or archive/search interface yet.
- Feedback deletion now reports failures to the admin.
- Question reports require sign-in, allow a controlled reason plus a note of up to 500 characters, and limit one open report per user per question. A user can report again after the earlier report is closed.
- Admins see open reports grouped by question, with counts/reasons and up to three notes. They can mark all open reports for a question resolved or dismissed.
- Report listing is capped at 500 open rows and has no pagination. Resolved/dismissed history is not shown in the current admin interface.
- SQL row-level security restricts report reads to the submitting user or an admin, and updates to admins. Feedback is accessed through security-definer RPCs with explicit admin checks.

### 6. Admin activity and safeguards

- The admin activity panel combines MCQ and T/F activity, active learners, topic activity/coverage, and most-missed MCQs. Admin accounts are excluded from student activity summaries.
- Visitor and page analytics use a random device identifier, daily aggregation and retention cleanup. They are not individual-level identity analytics; one person using multiple devices may count more than once.
- Admin RPCs inspected in the setup/update SQL check `public.is_admin()`. Public/anonymous execution is revoked for the admin reporting and management functions reviewed.
- Member removal prevents an admin from deleting their own account or another admin account. The UI also withholds reset/remove actions for admin accounts.
- The database `admin_clear_points` function itself does not repeat the self/admin protection used by `admin_remove_member`. The current UI hides the action for admin accounts, but database-side hardening would be safer if multiple admin accounts are ever used.
- The admin settings save several values in parallel rather than in one database transaction. A partial failure can leave some values saved while the UI reports a failure; the user can refresh and inspect the saved values.

## Remaining verification checklist

These require a browser and/or live Supabase access and cannot be certified from repository source alone:

- [ ] Sign in on two devices and confirm MCQ/T/F synced history appears consistently.
- [ ] Complete an MCQ, mark it wrong, then correct it; refresh and confirm Review Mistakes no longer lists it.
- [ ] Practise offline while signed in, reconnect, and confirm both pending queues sync without loss.
- [ ] Confirm daily-limit errors retain pending queue data and that the next permitted sync clears it.
- [ ] Open the personal dashboard and verify 14-day activity, topic comparisons and progress against known test attempts.
- [ ] Submit a student feedback message and confirm it appears in the admin Feedback page.
- [ ] Submit a question report and confirm it appears in Account > Admin: reported questions; resolve it and confirm the list updates.
- [ ] Confirm non-admin accounts cannot access admin RPC data or admin actions.
- [ ] Test the app after the service worker updates to `dxdrill-v14.36`.

## Audit conclusion

The three code changes above address verified defects without changing curriculum data, question IDs, leaderboard rules or Supabase schema. The remaining items are either known limitations or live-environment checks. They should be handled in a separate, testable pass rather than mixed into this reliability patch.
