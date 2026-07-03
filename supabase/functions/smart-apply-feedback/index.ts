import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyTurnstile } from "../_shared/security.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  ?? namedKey("SUPABASE_SECRET_KEYS");
const TELEGRAM_BOT_TOKEN_ENV = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";

const allowedOrigins = new Set([
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://accatransfer.com",
  "https://www.accatransfer.com",
  "https://accatransfer.vercel.app",
  ...(Deno.env.get("APP_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
]);

type Json = Record<string, any>;

function namedKey(envName: string) {
  try {
    const value = JSON.parse(Deno.env.get(envName) ?? "{}");
    return value.default ?? Object.values(value)[0] ?? "";
  } catch {
    return "";
  }
}

function headers(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://accatransfer.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headers(req) });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(value: unknown, max = 1200) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function formatDate() {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Istanbul",
    }).format(new Date());
  } catch {
    return new Date().toISOString();
  }
}

async function getTelegramBotToken(admin: ReturnType<typeof createClient>) {
  if (TELEGRAM_BOT_TOKEN_ENV) return TELEGRAM_BOT_TOKEN_ENV;
  const { data, error } = await admin
    .from("telegram_bot_settings")
    .select("bot_token")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  return data?.bot_token?.trim() || "";
}

async function sendTelegram(admin: ReturnType<typeof createClient>, text: string) {
  const token = await getTelegramBotToken(admin);
  if (!token) return { attempted: 0, sent: 0, failed: 0, skipped: true };

  const { data, error } = await admin
    .from("telegram_admins")
    .select("telegram_user_id")
    .eq("is_active", true);
  if (error) throw error;

  let sent = 0;
  let failed = 0;
  for (const item of data ?? []) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: item.telegram_user_id,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (res.ok) sent += 1;
    else {
      failed += 1;
      console.error("smart apply feedback telegram failed", item.telegram_user_id, await res.text());
    }
  }

  return { attempted: data?.length ?? 0, sent, failed, skipped: false };
}

function buildTelegramText(payload: Json) {
  const message = payload.message ?? {};
  const actionLabels = Array.isArray(message.actions)
    ? message.actions.map((action: Json, index: number) => `${index + 1}. ${action.label ?? "-"}`).join("\n")
    : "";

  return [
    "<b>Smart Apply message bug report</b>",
    "",
    `Time: <code>${escapeHtml(formatDate())}</code>`,
    `Language: <code>${escapeHtml(payload.language || "-")}</code>`,
    `Page: ${escapeHtml(payload.pageUrl || "-")}`,
    `Message ID: <code>${escapeHtml(message.id || "-")}</code>`,
    `Role: <code>${escapeHtml(message.role || "-")}</code>`,
    `Component: <code>${escapeHtml(message.component || "-")}</code>`,
    "",
    "<b>Reported message</b>",
    `<pre>${escapeHtml(truncate(payload.messageText, 1400))}</pre>`,
    actionLabels ? `<b>Actions</b>\n<pre>${escapeHtml(truncate(actionLabels, 700))}</pre>` : "",
    payload.note ? `<b>User note</b>\n<pre>${escapeHtml(truncate(payload.note, 700))}</pre>` : "",
    "",
    `<b>User agent</b>\n<code>${escapeHtml(truncate(payload.userAgent, 220))}</code>`,
  ].filter(Boolean).join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: headers(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) return json(req, { error: "Origin not allowed" }, 403);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(req, { error: "Server credentials are not configured." }, 500);
  }

  let payload: Json;
  try {
    payload = await req.json();
  } catch {
    return json(req, { error: "Invalid JSON body" }, 400);
  }

  const security = await verifyTurnstile(req, payload.turnstileToken, "smart_apply_feedback");
  if (!security.ok) return json(req, { error: security.message || "Security check failed." }, security.status || 403);

  const messageText = truncate(payload.messageText, 4000);
  if (!messageText) return json(req, { error: "Message text is required." }, 400);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const telegram = await sendTelegram(admin, buildTelegramText({ ...payload, messageText }));

    const { error: auditError } = await admin.from("telegram_admin_audit_logs").insert({
      action_type: "smart_apply_bug_report",
      target_entity_type: "smart_apply_message",
      target_entity_id: String(payload.message?.id || "unknown"),
      metadata: {
        product: payload.product ?? "smart_apply",
        language: payload.language ?? null,
        page_url: payload.pageUrl ?? null,
        message: payload.message ?? null,
        note: payload.note ?? null,
        telegram,
      },
      source: "smart_apply_feedback",
    });
    if (auditError) console.warn("feedback audit log skipped", auditError.message);

    return json(req, { ok: true, telegram });
  } catch (error) {
    console.error("smart apply feedback failed", error);
    return json(req, { error: error?.message || "Feedback report failed." }, 500);
  }
});
