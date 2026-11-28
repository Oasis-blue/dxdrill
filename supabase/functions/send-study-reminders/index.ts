import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPushNotification } from "npm:@mmmike/web-push/send";

const cors = { "Content-Type": "application/json" };

function parts(date: Date, zone: string) {
  const values = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23",
  }).formatToParts(date);
  const out: Record<string, string> = {};
  values.forEach((p) => { if (p.type !== "literal") out[p.type] = p.value; });
  const weekdays: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return { date: out.year + "-" + out.month + "-" + out.day, time: out.hour + ":" + out.minute, day: weekdays[out.weekday] };
}
function inQuiet(now: string, start: string | null, end: string | null) {
  if (!start || !end) return false;
  const n = now.slice(0, 5), a = start.slice(0, 5), b = end.slice(0, 5);
  if (a === b) return true;
  return a < b ? n >= a && n < b : n >= a || n < b;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const expected = Deno.env.get("REMINDER_CRON_SECRET") || "";
  const supplied = req.headers.get("x-reminder-secret") || "";
  if (!expected || supplied !== expected) return new Response("Unauthorized", { status: 401 });

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "";
  if (!vapidPublic || !vapidPrivate || !vapidSubject) return new Response("VAPID keys or contact subject missing", { status: 503 });

  const db = createClient(url, service, { auth: { persistSession: false } });
  const { data: prefs, error: prefError } = await db.from("study_reminder_preferences")
    .select("user_id,local_time,timezone,days_of_week,quiet_start,quiet_end,enabled")
    .eq("enabled", true);
  if (prefError) return new Response("Could not load reminder schedules", { status: 500 });

  const now = new Date();
  let checked = 0, sent = 0, skipped = 0, failed = 0;
  for (const pref of (prefs || [])) {
    let local;
    try { local = parts(now, pref.timezone); } catch { failed++; continue; }
    checked++;
    if (local.time !== String(pref.local_time).slice(0, 5)) continue;
    if (!(pref.days_of_week || []).includes(local.day)) continue;
    if (inQuiet(local.time, pref.quiet_start, pref.quiet_end)) continue;

    const { data: inserted, error: insertError } = await db.from("study_reminder_deliveries")
      .insert({ user_id: pref.user_id, reminder_type: "daily_practice", local_date: local.date, status: "queued" })
      .select("id").maybeSingle();
    if (insertError || !inserted) { skipped++; continue; }

    const { data: subs, error: subError } = await db.from("study_push_subscriptions")
      .select("id,endpoint,p256dh,auth").eq("user_id", pref.user_id);
    if (subError || !subs?.length) {
      await db.from("study_reminder_deliveries").update({ status: "skipped", error_code: "no_subscription" }).eq("id", inserted.id);
      skipped++; continue;
    }

    let delivered = 0, gone = 0, errors = 0;
    for (const sub of subs) {
      try {
        const ok = await sendPushNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          { title: "Time for a little DxDrill", body: "A few practice questions today can keep your learning moving.", url: "/#practice" },
          { publicKey: vapidPublic, privateKey: vapidPrivate, subject: vapidSubject, ttl: 3600, urgency: "normal" },
        );
        if (ok) {
          delivered++;
          await db.from("study_push_subscriptions").update({ last_success_at: new Date().toISOString() }).eq("id", sub.id);
        } else {
          gone++;
          await db.from("study_push_subscriptions").delete().eq("id", sub.id);
        }
      } catch (e) {
        errors++;
        console.error("Push delivery failed", String(e).slice(0, 160));
      }
    }
    if (delivered > 0) {
      await db.from("study_reminder_deliveries").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", inserted.id);
      sent++;
    } else {
      await db.from("study_reminder_deliveries").update({ status: "failed", error_code: gone ? "expired_subscription" : "push_failed" }).eq("id", inserted.id);
      failed++;
    }
  }
  return new Response(JSON.stringify({ ok: true, checked, sent, skipped, failed }), { headers: cors });
});
