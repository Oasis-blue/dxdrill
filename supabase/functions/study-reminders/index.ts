import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET" && req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return reply({ error: "Sign in required" }, 401);

  const authClient = createClient(url, anon, { auth: { persistSession: false }, global: { headers: { Authorization: "Bearer " + token } } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return reply({ error: "Invalid session" }, 401);

  if (req.method === "GET") {
    if (!publicKey) return reply({ error: "Push keys are not configured" }, 503);
    return reply({ publicKey });
  }

  let body: any;
  try { body = await req.json(); } catch { return reply({ error: "Invalid JSON" }, 400); }
  if (body?.action !== "subscribe" || !body.subscription) return reply({ error: "Unsupported action" }, 400);

  const sub = body.subscription;
  if (typeof sub.endpoint !== "string" || !sub.endpoint.startsWith("https://") ||
      typeof sub.keys?.p256dh !== "string" || typeof sub.keys?.auth !== "string" ||
      sub.endpoint.length > 2048 || sub.keys.p256dh.length > 256 || sub.keys.auth.length > 256) {
    return reply({ error: "Invalid push subscription" }, 400);
  }

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { error } = await admin.from("study_push_subscriptions").upsert({
    user_id: authData.user.id,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    user_agent: typeof body.userAgent === "string" ? body.userAgent.slice(0, 500) : "",
    updated_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });
  if (error) return reply({ error: "Could not save this device subscription" }, 500);
  return reply({ ok: true });
});
