import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")
  ?? namedKey("SUPABASE_PUBLISHABLE_KEYS");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  ?? namedKey("SUPABASE_SECRET_KEYS");
const RESEND_API_KEY_ENV = Deno.env.get("RESEND_API_KEY") ?? "";
const DEFAULT_EMAIL_FROM_ADDRESS = "ACCA Admissions <no-reply@accatransfer.com>";
const EMAIL_FROM_ADDRESS_ENV = Deno.env.get("EMAIL_FROM_ADDRESS") ?? "";
const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") ?? "https://accatransfer.com").replace(/\/$/, "");

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

function responseHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin)
      ? origin
      : "https://accatransfer.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(req) });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value = new Date()) {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
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
    .select("enabled, provider, resend_api_key, from_address")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  return data ?? {
    enabled: false,
    provider: "resend",
    resend_api_key: null,
    from_address: DEFAULT_EMAIL_FROM_ADDRESS,
  };
}

function changedFieldsText(fields: Json[]) {
  if (!Array.isArray(fields) || !fields.length) return "مشخصات حساب شما به‌روزرسانی شد.";
  return fields
    .map((field) => {
      const label = field.label || field.field || "فیلد";
      const previous = field.previous ? `از «${field.previous}» ` : "";
      const next = field.next ? `به «${field.next}»` : "به‌روزرسانی شد";
      return `- ${label}: ${previous}${next}`;
    })
    .join("\n");
}

function buildEmail(eventType: string, details: Json, profile: Json | null, email: string) {
  const studentName = profile?.full_name || email || "دانشجوی عزیز";
  const productLabel = details.product === "ai_transfer"
    ? "AI Transfer"
    : details.product === "smart_apply"
      ? "Smart Apply"
      : "ACCA Central Account";
  const accountUrl = `${APP_BASE_URL}/account${details.product ? `?product=${details.product}` : ""}`;
  const occurredAt = formatDate();

  const templates: Record<string, { subject: string; lead: string; detail: string; action?: string }> = {
    login: {
      subject: "ورود موفق به حساب ACCA",
      lead: `یک ورود موفق به حساب مرکزی شما ثبت شد.`,
      detail: [
        `سرویس: ${productLabel}`,
        `روش ورود: ${details.method === "email_otp" ? "کد ایمیل" : "رمز عبور"}`,
        `زمان: ${occurredAt}`,
      ].join("\n"),
      action: "اگر این ورود توسط شما انجام نشده، لطفاً سریعاً رمز حساب را تغییر دهید.",
    },
    password_changed: {
      subject: "رمز عبور حساب شما تغییر کرد",
      lead: "رمز عبور حساب مرکزی ACCA شما با موفقیت تغییر کرد.",
      detail: [
        `روش تغییر: ${details.method === "reset_link" ? "لینک امن ایمیل" : "داخل پنل کاربری"}`,
        `زمان: ${occurredAt}`,
      ].join("\n"),
      action: "اگر شما این تغییر را انجام نداده‌اید، با تیم ACCA تماس بگیرید.",
    },
    profile_updated: {
      subject: "مشخصات حساب شما به‌روزرسانی شد",
      lead: "مشخصات پروفایل مرکزی شما تغییر کرد.",
      detail: changedFieldsText(details.changedFields),
      action: "برای بررسی نسخه جدید پروفایل وارد پنل مرکزی شوید.",
    },
  };

  const template = templates[eventType];
  if (!template) throw new Error("Unsupported account email event.");

  const text = [
    `سلام ${studentName}،`,
    "",
    template.lead,
    "",
    template.detail,
    "",
    template.action || "",
    "",
    "ورود به پنل مرکزی:",
    accountUrl,
    "",
    "ACCA Admissions",
  ].filter(Boolean).join("\n");

  const html = `
    <div dir="rtl" style="font-family:Arial,Tahoma,sans-serif;line-height:1.9;color:#102f48">
      <h2 style="margin:0 0 12px">${escapeHtml(template.subject)}</h2>
      <p>سلام ${escapeHtml(studentName)}،</p>
      <p>${escapeHtml(template.lead)}</p>
      <pre style="white-space:pre-wrap;font-family:Arial,Tahoma,sans-serif;background:#f7f3ec;border-radius:16px;padding:14px;color:#102f48">${escapeHtml(template.detail)}</pre>
      ${template.action ? `<p style="color:#7c5d20">${escapeHtml(template.action)}</p>` : ""}
      <p><a href="${escapeHtml(accountUrl)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#14745f;color:white;text-decoration:none;font-weight:700">ورود به پنل مرکزی ACCA</a></p>
      <p style="font-size:12px;color:#64748b">این ایمیل برای امنیت و پیگیری حساب شما ارسال شده است.</p>
    </div>
  `;

  return { subject: template.subject, text, html, accountUrl };
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

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text, html }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      status: response.status === 429 ? "queued" : "failed",
      provider: "resend",
      provider_message_id: null,
      failure_reason: body?.message || `Resend responded with ${response.status}`,
    };
  }
  return {
    status: "sent",
    provider: "resend",
    provider_message_id: body?.id ?? null,
    failure_reason: null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: responseHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) return json(req, { error: "Origin not allowed" }, 403);
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(req, { error: "Server credentials are not configured." }, 500);
  }

  const authorization = req.headers.get("authorization");
  if (!authorization) return json(req, { error: "Authentication required" }, 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json(req, { error: "Invalid session" }, 401);

  let payload: { eventType?: string; details?: Json };
  try {
    payload = await req.json();
  } catch {
    return json(req, { error: "Invalid JSON body" }, 400);
  }

  const eventType = String(payload.eventType || "");
  if (!["login", "password_changed", "profile_updated"].includes(eventType)) {
    return json(req, { error: "Unsupported account email event." }, 400);
  }

  const userId = authData.user.id;
  const email = authData.user.email;
  if (!email) return json(req, { error: "User email is missing." }, 400);

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  const details = payload.details ?? {};
  const emailCopy = buildEmail(eventType, details, profile, email);
  const delivery = await sendEmail({
    admin,
    to: email,
    subject: emailCopy.subject,
    text: emailCopy.text,
    html: emailCopy.html,
  });

  const { data: log, error: logError } = await admin
    .from("email_logs")
    .insert({
      user_id: userId,
      recipient_email: email,
      subject: emailCopy.subject,
      body_text: emailCopy.text,
      body_html: emailCopy.html,
      status: delivery.status,
      provider: delivery.provider,
      provider_message_id: delivery.provider_message_id ?? null,
      failure_reason: delivery.failure_reason ?? null,
      metadata: {
        source: "account_event_email",
        event_type: eventType,
        details,
        account_url: emailCopy.accountUrl,
      },
    })
    .select("id,status")
    .single();
  if (logError) throw logError;

  return json(req, {
    ok: true,
    status: delivery.status,
    email_log_id: log?.id ?? null,
  });
});
