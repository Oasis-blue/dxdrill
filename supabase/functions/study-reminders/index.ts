import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPushNotification } from "npm:@mmmike/web-push/send";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-reminder-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
function localParts(date: Date, zone: string) {
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
async function sendDueReminders() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "";
  if (!vapidPublic || !vapidPrivate || !vapidSubject) return reply({ error: "VAPID keys or contact subject missing" }, 503);
  const db = createClient(url, service, { auth: { persistSession: false } });
  const { data: prefs, error: prefError } = await db.from("study_reminder_preferences")
    .select("user_id,local_time,timezone,days_of_week,quiet_start,quiet_end,enabled").eq("enabled", true);
  if (prefError) return reply({ error: "Could not load reminder schedules" }, 500);
  const now = new Date();
  let checked = 0, sent = 0, skipped = 0, failed = 0;
  for (const pref of (prefs || [])) {
    let local;
    try { local = localParts(now, pref.timezone); } catch { failed++; continue; }
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
    let delivered = 0, gone = 0;
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
      } catch (e) { console.error("Push delivery failed", String(e).slice(0, 160)); }
    }
    if (delivered > 0) {
      await db.from("study_reminder_deliveries").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", inserted.id);
      sent++;
    } else {
      await db.from("study_reminder_deliveries").update({ status: "failed", error_code: gone ? "expired_subscription" : "push_failed" }).eq("id", inserted.id);
      failed++;
    }
  }
  return reply({ ok: true, checked, sent, skipped, failed });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  let body: any = null;
  if (req.method === "POST") {
    try { body = await req.json(); } catch { return reply({ error: "Invalid JSON" }, 400); }
    if (body?.action === "run") {
      const expected = Deno.env.get("REMINDER_CRON_SECRET") || "";
      const supplied = req.headers.get("x-reminder-secret") || "";
      if (!expected || supplied !== expected) return reply({ error: "Unauthorized scheduler" }, 401);
      return await sendDueReminders();
    }
    if (body?.action !== "subscribe" || !body.subscription) return reply({ error: "Unsupported action" }, 400);
  } else if (req.method !== "GET") return reply({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return reply({ error: "Sign in required" }, 401);
  const authClient = createClient(url, anon, { auth: { persistSession: false }, global: { headers: { Authorization: "Bearer " + token } } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return reply({ error: "Invalid session" }, 401);
  if (req.method === "GET") {
    if (!publicKey) return reply({ error: "Push keys are not configured" }, 503);
    return reply({ publicKey });
  }
  const sub = body.subscription;
  if (typeof sub.endpoint !== "string" || !sub.endpoint.startsWith("https://") ||
      typeof sub.keys?.p256dh !== "string" || typeof sub.keys?.auth !== "string" ||
      sub.endpoint.length > 2048 || sub.keys.p256dh.length > 256 || sub.keys.auth.length > 256) {
    return reply({ error: "Invalid push subscription" }, 400);
  }
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { error } = await admin.from("study_push_subscriptions").upsert({
    user_id: authData.user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth,
    user_agent: typeof body.userAgent === "string" ? body.userAgent.slice(0, 500) : "",
    updated_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });
  if (error) return reply({ error: "Could not save this device subscription" }, 500);
  return reply({ ok: true });
});
