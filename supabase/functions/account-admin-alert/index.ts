import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyTurnstile } from "../_shared/security.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")
  ?? namedKey("SUPABASE_PUBLISHABLE_KEYS");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  ?? namedKey("SUPABASE_SECRET_KEYS");
const TELEGRAM_BOT_TOKEN_ENV = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const RESEND_API_KEY_ENV = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM_ADDRESS_ENV = Deno.env.get("EMAIL_FROM_ADDRESS") ?? "";
const DEFAULT_EMAIL_FROM_ADDRESS = "ACCA Admissions <no-reply@accatransfer.com>";
const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") ?? "https://accatransfer.com").replace(/\/$/, "");
const ADMIN_ALERT_EMAILS = (Deno.env.get("ADMIN_ALERT_EMAILS") ?? "arshia@accatransfer.com")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

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

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function productLabel(product?: string | null) {
  if (product === "ai_transfer") return "AI Transfer";
  if (product === "smart_apply") return "Smart Apply";
  return "ACCA Central Account";
}

function formatDate(value = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Istanbul",
    }).format(value);
  } catch {
    return value.toISOString();
  }
}

async function getEmailSettings(admin: ReturnType<typeof createClient>) {
  const { data, error } = await admin
    .from("email_delivery_settings")
    .select("enabled, resend_api_key, from_address")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  return data ?? { enabled: false, resend_api_key: null, from_address: DEFAULT_EMAIL_FROM_ADDRESS };
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
      console.error("telegram admin alert failed", item.telegram_user_id, await res.text());
    }
  }
  return { attempted: data?.length ?? 0, sent, failed, skipped: false };
}

async function sendEmail({
  admin,
  to,
  subject,
  text,
  html,
}: {
  admin: ReturnType<typeof createClient>;
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const settings = await getEmailSettings(admin);
  const resendApiKey = RESEND_API_KEY_ENV || (settings?.enabled ? settings?.resend_api_key?.trim() : "");
  const from = EMAIL_FROM_ADDRESS_ENV || settings?.from_address || DEFAULT_EMAIL_FROM_ADDRESS;
  if (!resendApiKey) {
    return {
      status: "queued",
      provider: "resend",
      provider_message_id: null,
      failure_reason: "Email provider is not configured.",
    };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text, html }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      status: res.status === 429 ? "queued" : "failed",
      provider: "resend",
      provider_message_id: null,
      failure_reason: body?.message || `Resend responded with ${res.status}`,
    };
  }
  return {
    status: "sent",
    provider: "resend",
    provider_message_id: body?.id ?? null,
    failure_reason: null,
  };
}

async function resolveUser(req: Request, admin: ReturnType<typeof createClient>, payload: Json, eventType: string) {
  const authorization = req.headers.get("authorization") ?? "";
  if (authorization) {
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await userClient.auth.getUser();
    if (!error && data.user) return data.user as Json;
  }

  if (eventType !== "signup") {
    throw new Response(JSON.stringify({ error: "Authentication required for login alerts." }), { status: 401, headers: headers(req) });
  }

  const check = await verifyTurnstile(req, payload.turnstileToken, "signup_admin_alert");
  if (!check.ok) {
    throw new Response(JSON.stringify({ error: check.message || "Security check failed." }), {
      status: check.status || 403,
      headers: headers(req),
    });
  }

  const details = payload.details ?? {};
  const userId = String(details.userId || "");
  const email = normalizeEmail(details.email);
  if (!userId || !email) {
    throw new Response(JSON.stringify({ error: "Signup alert requires user id and email." }), { status: 400, headers: headers(req) });
  }

  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) {
    throw new Response(JSON.stringify({ error: "Created user could not be verified." }), { status: 404, headers: headers(req) });
  }
  if (normalizeEmail(data.user.email) !== email) {
    throw new Response(JSON.stringify({ error: "User/email mismatch." }), { status: 403, headers: headers(req) });
  }
  const createdAt = new Date(data.user.created_at).getTime();
  if (!Number.isFinite(createdAt) || Date.now() - createdAt > 60 * 60 * 1000) {
    throw new Response(JSON.stringify({ error: "Signup alert window expired." }), { status: 403, headers: headers(req) });
  }
  return data.user as Json;
}

function buildCopy(eventType: string, user: Json, profile: Json | null, details: Json) {
  const isSignup = eventType === "signup";
  const subject = isSignup ? "ACCA | New account signup" : "ACCA | Account login";
  const name = profile?.full_name || details.fullName || user.user_metadata?.full_name || "Unknown";
  const email = user.email || details.email || "Unknown";
  const product = productLabel(details.product || profile?.current_product);
  const occurredAt = formatDate();
  const accountUrl = `${APP_BASE_URL}/account`;
  const language = details.language || profile?.language || user.user_metadata?.language || "unknown";

  const text = [
    subject,
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Product: ${product}`,
    `Method: ${details.method || "unknown"}`,
    `Source: ${details.source || "auth_modal"}`,
    `Language: ${language}`,
    `Time: ${occurredAt}`,
    isSignup ? `Needs email confirmation: ${details.needsEmailConfirmation ? "yes" : "no"}` : "",
    `User ID: ${user.id}`,
    "",
    `Account panel: ${accountUrl}`,
  ].filter(Boolean).join("\n");

  const html = `
    <div style="font-family:Arial,Tahoma,sans-serif;line-height:1.8;color:#102f48">
      <h2>${escapeHtml(subject)}</h2>
      <p><b>Name:</b> ${escapeHtml(name)}</p>
      <p><b>Email:</b> ${escapeHtml(email)}</p>
      <p><b>Product:</b> ${escapeHtml(product)}</p>
      <p><b>Method:</b> ${escapeHtml(details.method || "unknown")}</p>
      <p><b>Source:</b> ${escapeHtml(details.source || "auth_modal")}</p>
      <p><b>Language:</b> ${escapeHtml(language)}</p>
      <p><b>Time:</b> ${escapeHtml(occurredAt)}</p>
      ${isSignup ? `<p><b>Needs email confirmation:</b> ${details.needsEmailConfirmation ? "yes" : "no"}</p>` : ""}
      <p><b>User ID:</b> <code>${escapeHtml(user.id)}</code></p>
      <p><a href="${escapeHtml(accountUrl)}" style="display:inline-block;padding:10px 16px;border-radius:999px;background:#14745f;color:white;text-decoration:none;font-weight:700">Open ACCA account panel</a></p>
    </div>
  `;

  const telegram = [
    isSignup ? "New ACCA account signup" : "ACCA account login",
    "",
    `Name: <b>${escapeHtml(name)}</b>`,
    `Email: <code>${escapeHtml(email)}</code>`,
    `Product: <b>${escapeHtml(product)}</b>`,
    `Method: <code>${escapeHtml(details.method || "unknown")}</code>`,
    `Source: <code>${escapeHtml(details.source || "auth_modal")}</code>`,
    `Language: <code>${escapeHtml(language)}</code>`,
    `Time: ${escapeHtml(occurredAt)}`,
    isSignup ? `Email confirmation: <b>${details.needsEmailConfirmation ? "pending" : "completed"}</b>` : "",
    `User ID: <code>${escapeHtml(user.id)}</code>`,
  ].filter(Boolean).join("\n");

  return { subject, text, html, telegram };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: headers(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) return json(req, { error: "Origin not allowed" }, 403);
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(req, { error: "Server credentials are not configured." }, 500);
  }

  let payload: { eventType?: string; details?: Json; turnstileToken?: string };
  try {
    payload = await req.json();
  } catch {
    return json(req, { error: "Invalid JSON body" }, 400);
  }

  const eventType = String(payload.eventType || "");
  if (!["signup", "login"].includes(eventType)) {
    return json(req, { error: "Unsupported account admin alert event." }, 400);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const details = payload.details ?? {};

  try {
    const user = await resolveUser(req, admin, payload, eventType);
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name,current_product,language")
      .eq("id", user.id)
      .maybeSingle();

    const copy = buildCopy(eventType, user, profile, details);
    const telegram = await sendTelegram(admin, copy.telegram);
    const email = [];

    for (const recipient of ADMIN_ALERT_EMAILS) {
      const delivery = await sendEmail({ admin, to: recipient, subject: copy.subject, text: copy.text, html: copy.html });
      await admin.from("email_logs").insert({
        user_id: user.id,
        recipient_email: recipient,
        subject: copy.subject,
        body_text: copy.text,
        body_html: copy.html,
        status: delivery.status,
        provider: delivery.provider,
        provider_message_id: delivery.provider_message_id ?? null,
        failure_reason: delivery.failure_reason ?? null,
        metadata: { source: "account_admin_alert", event_type: eventType, details, admin_alert: true },
      });
      email.push({ recipient_email: recipient, ...delivery });
    }

    await admin.from("telegram_admin_audit_logs").insert({
      action_type: "account_admin_alert",
      target_entity_type: "auth_user",
      target_entity_id: user.id,
      affected_user_id: user.id,
      metadata: { event_type: eventType, product: details.product ?? profile?.current_product ?? null, telegram, email },
      source: "account_admin_alert",
    });

    return json(req, { ok: true, event_type: eventType, telegram, email });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("account admin alert failed", error);
    return json(req, { error: error?.message || "Account admin alert failed." }, 500);
  }
});
