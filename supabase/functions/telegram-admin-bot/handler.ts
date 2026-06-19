import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  ?? namedKey("SUPABASE_SECRET_KEYS");
const TELEGRAM_BOT_TOKEN_ENV = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const RESEND_API_KEY_ENV = Deno.env.get("RESEND_API_KEY") ?? "";
const DEFAULT_EMAIL_FROM_ADDRESS = "ACCA Admissions <no-reply@accatransfer.com>";
const EMAIL_FROM_ADDRESS_ENV = Deno.env.get("EMAIL_FROM_ADDRESS") ?? "";
const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") ?? "https://accatransfer.com").replace(/\/$/, "");
const AUTHORIZED_TELEGRAM_ADMIN_IDS = new Set(
  (Deno.env.get("AUTHORIZED_TELEGRAM_ADMIN_IDS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const ALLOW_UNVERIFIED_WEBHOOK = Deno.env.get("TELEGRAM_ADMIN_ALLOW_UNVERIFIED") === "true";

const PAGE_SIZE = 5;
const REF_TTL_MINUTES = 15;
const SESSION_TTL_MINUTES = 30;
const DOCUMENT_BUCKET = "student-documents";
const MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024;
const EMAIL_ATTACHMENT_LIMIT = 8 * 1024 * 1024;
const BULK_EMAIL_LIMIT = 500;
const RESEND_SEND_INTERVAL_MS = 650;
let cachedTelegramBotToken: string | null = null;
let cachedEmailSettings: Json | null = null;
let lastResendRequestAt = 0;
const ALLOWED_ATTACHMENT_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

type Json = Record<string, any>;
type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};
type TelegramMessage = {
  message_id: number;
  text?: string;
  caption?: string;
  document?: {
    file_id: string;
    file_unique_id?: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  };
  photo?: Array<{
    file_id: string;
    file_unique_id?: string;
    file_size?: number;
    width?: number;
    height?: number;
  }>;
  chat: { id: number; type?: string };
  from?: TelegramUser;
};
type CallbackQuery = {
  id: string;
  data?: string;
  from: TelegramUser;
  message?: TelegramMessage;
};
type TelegramUpdate = {
  message?: TelegramMessage;
  callback_query?: CallbackQuery;
};
type Admin = {
  id: string;
  telegram_user_id: number;
  role: string;
  display_name: string | null;
  telegram_username: string | null;
  permissions: string[];
};

function namedKey(envName: string) {
  try {
    const value = JSON.parse(Deno.env.get(envName) ?? "{}");
    return value.default ?? Object.values(value)[0] ?? "";
  } catch {
    return "";
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function methodResponse(method: string, payload: Json) {
  return json({ method, ...payload });
}

async function telegram(method: string, payload: Json) {
  const token = await getTelegramBotToken();
  if (!token) return methodResponse(method, payload);
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error("telegram api failed", method, await res.text());
  }
  return json({ ok: true });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(value: unknown, length = 42) {
  const text = String(value ?? "—");
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Europe/Istanbul",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function safeFilename(name?: string | null) {
  const fallback = `acca-file-${Date.now()}`;
  const raw = String(name || fallback);
  const extension = raw.includes(".") ? `.${raw.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")}` : "";
  const base = raw
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^\w-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || fallback;
  return `${base}${extension}`;
}

function inferMimeType(fileName?: string | null, provided?: string | null) {
  if (provided && provided !== "application/octet-stream") return provided;
  const ext = String(fileName || "").split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "doc") return "application/msword";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return provided || "application/octet-stream";
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttleResendRequest() {
  const now = Date.now();
  const waitMs = Math.max(0, RESEND_SEND_INTERVAL_MS - (now - lastResendRequestAt));
  if (waitMs > 0) await sleep(waitMs);
  lastResendRequestAt = Date.now();
}

function displayName(user?: TelegramUser) {
  return [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim()
    || user?.username
    || (user?.id ? String(user.id) : "Admin");
}

function hasPermission(admin: Admin, permission: string) {
  return admin.permissions.includes("*") || admin.permissions.includes(permission);
}

function keyboard(rows: Json[][]) {
  return { inline_keyboard: rows };
}

function button(text: string, data: string): Json {
  return { text, callback_data: data };
}

function urlButton(text: string, url: string): Json {
  return { text, url };
}

function pageButtons(prefix: string, page: number) {
  const rows: Json[][] = [];
  const nav: Json[] = [];
  if (page > 0) nav.push(button("صفحه قبل", `${prefix}:${page - 1}`));
  nav.push(button("تازه‌سازی", `${prefix}:${page}`));
  nav.push(button("صفحه بعد", `${prefix}:${page + 1}`));
  rows.push(nav);
  rows.push([button("منوی اصلی", "menu")]);
  return rows;
}

function callbackTarget(update: TelegramUpdate) {
  const callback = update.callback_query;
  if (!callback?.message) return null;
  return {
    chat_id: callback.message.chat.id,
    message_id: callback.message.message_id,
  };
}

async function render(update: TelegramUpdate, text: string, replyMarkup?: Json) {
  const target = callbackTarget(update);
  const payload = {
    ...(target ?? { chat_id: update.message?.chat.id }),
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: replyMarkup,
  };
  if (target) return telegram("editMessageText", payload);
  return telegram("sendMessage", payload);
}

async function getSettings() {
  const { data, error } = await supabase
    .from("telegram_bot_settings")
    .select("webhook_secret, bot_label, bot_token")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getTelegramBotToken() {
  if (TELEGRAM_BOT_TOKEN_ENV) return TELEGRAM_BOT_TOKEN_ENV;
  if (cachedTelegramBotToken !== null) return cachedTelegramBotToken;
  const settings = await getSettings();
  cachedTelegramBotToken = settings?.bot_token?.trim() || "";
  return cachedTelegramBotToken;
}

async function getEmailSettings() {
  if (cachedEmailSettings) return cachedEmailSettings;
  const { data, error } = await supabase
    .from("email_delivery_settings")
    .select("enabled, provider, resend_api_key, from_address")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  cachedEmailSettings = data ?? {
    enabled: false,
    provider: "resend",
    resend_api_key: null,
    from_address: DEFAULT_EMAIL_FROM_ADDRESS,
  };
  return cachedEmailSettings;
}

async function getEmailProviderState() {
  const settings = await getEmailSettings();
  const resendKey = RESEND_API_KEY_ENV || (settings?.enabled ? settings?.resend_api_key?.trim() : "");
  return {
    provider: "resend",
    configured: Boolean(resendKey),
    fromAddress: EMAIL_FROM_ADDRESS_ENV || settings?.from_address || DEFAULT_EMAIL_FROM_ADDRESS,
    source: RESEND_API_KEY_ENV ? "edge_secret" : settings?.resend_api_key ? "bot_settings" : "missing",
  };
}

async function verifyWebhook(req: Request) {
  const settings = await getSettings();
  const expected = settings?.webhook_secret;
  if (!expected || ALLOW_UNVERIFIED_WEBHOOK) return true;
  const received = req.headers.get("x-telegram-bot-api-secret-token");
  return Boolean(received && received === expected);
}

async function upsertBootstrapAdmin(user: TelegramUser) {
  const { data, error } = await supabase
    .from("telegram_admins")
    .upsert({
      telegram_user_id: user.id,
      role: "super_admin",
      display_name: displayName(user),
      telegram_username: user.username ?? null,
      is_active: true,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "telegram_user_id" })
    .select("id, telegram_user_id, role, display_name, telegram_username")
    .single();
  if (error) throw error;
  return data;
}

async function getAdmin(user: TelegramUser): Promise<Admin | null> {
  let { data: admin, error } = await supabase
    .from("telegram_admins")
    .select("id, telegram_user_id, role, display_name, telegram_username, is_active")
    .eq("telegram_user_id", user.id)
    .maybeSingle();
  if (error) throw error;

  if (!admin && AUTHORIZED_TELEGRAM_ADMIN_IDS.has(String(user.id))) {
    admin = await upsertBootstrapAdmin(user);
  }
  if (!admin?.is_active && !AUTHORIZED_TELEGRAM_ADMIN_IDS.has(String(user.id))) return null;
  if (!admin) return null;

  const { data: role, error: roleError } = await supabase
    .from("telegram_admin_roles")
    .select("permissions")
    .eq("role", admin.role)
    .single();
  if (roleError) throw roleError;

  await supabase
    .from("telegram_admins")
    .update({
      display_name: displayName(user),
      telegram_username: user.username ?? null,
      last_seen_at: new Date().toISOString(),
    })
    .eq("id", admin.id);

  return {
    id: admin.id,
    telegram_user_id: Number(admin.telegram_user_id),
    role: admin.role,
    display_name: admin.display_name,
    telegram_username: admin.telegram_username,
    permissions: Array.isArray(role?.permissions) ? role.permissions : [],
  };
}

async function audit(admin: Admin | null, actionType: string, options: Json = {}) {
  const payload = {
    admin_id: admin?.id ?? null,
    telegram_user_id: admin?.telegram_user_id ?? options.telegram_user_id ?? null,
    admin_display_name: admin?.display_name ?? null,
    role: admin?.role ?? null,
    action_type: actionType,
    target_entity_type: options.target_entity_type ?? null,
    target_entity_id: options.target_entity_id ?? null,
    affected_user_id: options.affected_user_id ?? null,
    application_id: options.application_id ?? null,
    previous_value: options.previous_value ?? null,
    new_value: options.new_value ?? null,
    metadata: options.metadata ?? {},
    status: options.status ?? "success",
    error_message: options.error_message ?? null,
  };
  const { error } = await supabase.from("telegram_admin_audit_logs").insert(payload);
  if (error) console.error("audit insert failed", error);
}

async function upsertSession(user: TelegramUser, chatId: number, state = "idle", context: Json = {}) {
  await supabase.from("telegram_bot_sessions").upsert({
    telegram_user_id: user.id,
    chat_id: chatId,
    state,
    context,
    expires_at: new Date(Date.now() + SESSION_TTL_MINUTES * 60_000).toISOString(),
  }, { onConflict: "telegram_user_id" });
}

async function getSession(user: TelegramUser) {
  const { data } = await supabase
    .from("telegram_bot_sessions")
    .select("*")
    .eq("telegram_user_id", user.id)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return data;
}

function randomToken() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function createRef(admin: Admin, chatId: number, action: string, payload: Json) {
  const token = randomToken();
  await supabase.from("telegram_bot_callback_refs").insert({
    token,
    telegram_user_id: admin.telegram_user_id,
    chat_id: chatId,
    action,
    payload,
    expires_at: new Date(Date.now() + REF_TTL_MINUTES * 60_000).toISOString(),
  });
  return `r:${token}`;
}

async function getRef(admin: Admin, chatId: number, token: string) {
  const { data, error } = await supabase
    .from("telegram_bot_callback_refs")
    .select("*")
    .eq("token", token)
    .eq("telegram_user_id", admin.telegram_user_id)
    .eq("chat_id", chatId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function cleanupRefs(admin: Admin) {
  await supabase
    .from("telegram_bot_callback_refs")
    .delete()
    .eq("telegram_user_id", admin.telegram_user_id)
    .lt("expires_at", new Date().toISOString());
}

function mainMenu(admin: Admin) {
  const rows: Json[][] = [];
  if (hasPermission(admin, "view_users")) rows.push([button("👥 مدیریت کاربران", "users:0")]);
  if (hasPermission(admin, "view_applications")) rows.push([button("📝 مدیریت درخواست‌ها", "apps:0")]);
  if (hasPermission(admin, "view_documents")) rows.push([button("📂 مدیریت مدارک", "docs:0")]);
  rows.push([
    button("📄 نامه‌ها و پذیرش‌ها", "letters"),
    button("📧 ارسال ایمیل", "email"),
  ]);
  rows.push([
    button("🔔 اعلان‌های پنل", "notifications"),
    button("📊 آمار", "stats"),
  ]);
  if (hasPermission(admin, "view_logs")) rows.push([button("🕘 لاگ‌ها", "logs:0")]);
  rows.push([button("🔍 جستجوی سریع", "search"), button("⚙️ تنظیمات", "settings")]);
  return keyboard(rows);
}

async function renderMenu(update: TelegramUpdate, admin: Admin) {
  await upsertSession(update.callback_query?.from ?? update.message!.from!, update.callback_query?.message?.chat.id ?? update.message!.chat.id);
  await audit(admin, "menu_opened");
  return render(update, [
    "پنل ادمین <b>ACCA Leads</b>",
    "",
    `ادمین: <b>${escapeHtml(admin.display_name || "ACCA Admin")}</b>`,
    `نقش: <code>${escapeHtml(admin.role)}</code>`,
    "",
    "از منوی زیر بخش مورد نظر را انتخاب کنید.",
  ].join("\n"), mainMenu(admin));
}

async function renderUnauthorized(update: TelegramUpdate, telegramUser?: TelegramUser) {
  const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
  await audit(null, "unauthorized_telegram_access", {
    telegram_user_id: telegramUser?.id,
    status: "failure",
    error_message: "Telegram user is not authorized.",
  });
  return telegram("sendMessage", {
    chat_id: chatId,
    text: [
      "دسترسی شما برای پنل ادمین ACCA فعال نیست.",
      "",
      "برای فعال‌سازی، این Telegram ID را به Super Admin بدهید:",
      `<code>${escapeHtml(telegramUser?.id ?? "unknown")}</code>`,
    ].join("\n"),
    parse_mode: "HTML",
  });
}

async function renderUsers(update: TelegramUpdate, admin: Admin, page: number) {
  if (!hasPermission(admin, "view_users")) return render(update, "دسترسی شما برای مشاهده کاربران کافی نیست.", keyboard([[button("منوی اصلی", "menu")]]));
  const safePage = Math.max(0, page);
  const { data: usersPage, error } = await supabase.auth.admin.listUsers({
    page: safePage + 1,
    perPage: PAGE_SIZE,
  });
  if (error) throw error;
  const users = usersPage.users ?? [];
  const ids = users.map((user) => user.id);
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("*").in("id", ids)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((profile: Json) => [profile.id, profile]));
  const rows: Json[][] = [];
  const lines = [
    "<b>👥 مدیریت کاربران</b>",
    `صفحه ${safePage + 1}`,
    "",
  ];
  for (const user of users) {
    const profile = profileById.get(user.id) as Json | undefined;
    const name = profile?.full_name || user.email || user.id;
    lines.push(`• ${escapeHtml(truncate(name, 34))}`);
    lines.push(`  <code>${escapeHtml(user.email || "no email")}</code>`);
    const ref = await createRef(admin, update.callback_query?.message?.chat.id ?? update.message!.chat.id, "user_detail", { user_id: user.id });
    rows.push([button(`مشاهده ${truncate(name, 22)}`, ref)]);
  }
  rows.push(...pageButtons("users", safePage));
  await audit(admin, "users_listed", { metadata: { page: safePage } });
  return render(update, lines.join("\n"), keyboard(rows));
}

async function renderUserDetail(update: TelegramUpdate, admin: Admin, userId: string) {
  if (!hasPermission(admin, "view_users")) return render(update, "دسترسی کافی نیست.", keyboard([[button("منوی اصلی", "menu")]]));
  const [{ data: authUser }, profileResult, docsResult, submissionsResult, selectionsResult] = await Promise.all([
    supabase.auth.admin.getUserById(userId),
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("student_documents").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("application_submissions").select("*").eq("user_id", userId).order("submitted_at", { ascending: false }).limit(5),
    supabase.from("student_program_selections").select("*").eq("user_id", userId),
  ]);
  const profile = profileResult.data as Json | null;
  const user = authUser.user;
  const latestSubmission = submissionsResult.data?.[0] as Json | undefined;
  const lines = [
    "<b>پرونده کاربر</b>",
    "",
    `نام: <b>${escapeHtml(profile?.full_name || "—")}</b>`,
    `ایمیل: <code>${escapeHtml(user?.email || "—")}</code>`,
    `تلفن: <code>${escapeHtml(profile?.phone_e164 || profile?.phone_number || "—")}</code>`,
    `زبان: ${escapeHtml(profile?.language || "—")}`,
    `ثبت‌نام: ${fmtDate(user?.created_at)}`,
    `آخرین بروزرسانی پروفایل: ${fmtDate(profile?.updated_at)}`,
    `مدارک: <b>${docsResult.count ?? 0}</b>`,
    `درخواست‌ها: <b>${submissionsResult.data?.length ?? 0}</b>`,
    `آخرین وضعیت: <code>${escapeHtml(latestSubmission?.admin_status || latestSubmission?.status || "—")}</code>`,
    "",
    "انتخاب‌های برنامه:",
    ...(selectionsResult.data?.length
      ? selectionsResult.data.map((item: Json) => `• ${escapeHtml(item.product)} | ${escapeHtml(item.university_name)} / ${escapeHtml(item.program_name)}`)
      : ["—"]),
  ];
  const rows: Json[][] = [];
  rows.push([button("درخواست‌های کاربر", await createRef(admin, update.callback_query?.message?.chat.id ?? update.message!.chat.id, "user_applications", { user_id: userId }))]);
  rows.push([button("مدارک کاربر", await createRef(admin, update.callback_query?.message?.chat.id ?? update.message!.chat.id, "user_documents", { user_id: userId }))]);
  rows.push([button("ارسال اعلان پنل", await createRef(admin, update.callback_query?.message?.chat.id ?? update.message!.chat.id, "notify_user_prepare", { user_id: userId }))]);
  rows.push([button("بازگشت", "users:0"), button("منوی اصلی", "menu")]);
  await audit(admin, "user_viewed", { target_entity_type: "user", target_entity_id: userId, affected_user_id: userId });
  return render(update, lines.join("\n"), keyboard(rows));
}

async function renderApplications(update: TelegramUpdate, admin: Admin, page: number, userId?: string) {
  if (!hasPermission(admin, "view_applications")) return render(update, "دسترسی شما برای مشاهده درخواست‌ها کافی نیست.", keyboard([[button("منوی اصلی", "menu")]]));
  const from = Math.max(0, page) * PAGE_SIZE;
  let query = supabase
    .from("application_submissions")
    .select("id,user_id,product,intent,status,admin_status,submitted_at,payload_snapshot,delivery_error")
    .order("submitted_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query;
  if (error) throw error;
  const rows: Json[][] = [];
  const lines = [
    "<b>📝 مدیریت درخواست‌ها</b>",
    userId ? "درخواست‌های همین کاربر" : `صفحه ${page + 1}`,
    "",
  ];
  for (const item of data ?? []) {
    const snap = item.payload_snapshot as Json;
    const profile = snap?.user?.profile ?? {};
    const selection = snap?.selected_program ?? {};
    const title = `${profile.full_name || snap?.user?.email || "دانشجو"} | ${selection.program_name || item.product}`;
    lines.push(`• <b>${escapeHtml(truncate(title, 48))}</b>`);
    lines.push(`  وضعیت: <code>${escapeHtml(item.admin_status || item.status)}</code> | ${fmtDate(item.submitted_at)}`);
    rows.push([button(`پرونده ${truncate(item.id, 8)}`, await createRef(admin, update.callback_query?.message?.chat.id ?? update.message!.chat.id, "app_detail", { application_id: item.id }))]);
  }
  rows.push(...pageButtons("apps", Math.max(0, page)));
  await audit(admin, "applications_listed", { metadata: { page, user_id: userId ?? null } });
  return render(update, lines.join("\n"), keyboard(rows));
}

async function renderApplicationDetail(update: TelegramUpdate, admin: Admin, applicationId: string) {
  if (!hasPermission(admin, "view_applications")) return render(update, "دسترسی کافی نیست.", keyboard([[button("منوی اصلی", "menu")]]));
  const { data: app, error } = await supabase
    .from("application_submissions")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();
  if (error) throw error;
  if (!app) return render(update, "درخواست پیدا نشد.", keyboard([[button("منوی اصلی", "menu")]]));
  const snap = app.payload_snapshot as Json;
  const profile = snap?.user?.profile ?? {};
  const selection = snap?.selected_program ?? {};
  const lines = [
    "<b>جزئیات درخواست</b>",
    "",
    `کد: <code>${escapeHtml(app.id)}</code>`,
    `دانشجو: <b>${escapeHtml(profile.full_name || snap?.user?.email || "—")}</b>`,
    `سرویس: ${app.product === "ai_transfer" ? "AI Transfer" : "Smart Apply"}`,
    `نوع: ${escapeHtml(app.intent)}`,
    `وضعیت ارسال: <code>${escapeHtml(app.status)}</code>`,
    `وضعیت ادمین: <code>${escapeHtml(app.admin_status || "new")}</code>`,
    `دانشگاه: ${escapeHtml(selection.university_name || "—")}`,
    `رشته: ${escapeHtml(selection.program_name || "—")}`,
    `ارسال شده: ${fmtDate(app.submitted_at)}`,
    app.delivery_error ? `خطای ارسال: ${escapeHtml(app.delivery_error)}` : "",
  ].filter(Boolean);
  const rows: Json[][] = [];
  if (hasPermission(admin, "manage_applications")) {
    rows.push([button("🔄 تغییر وضعیت", await createRef(admin, update.callback_query?.message?.chat.id ?? update.message!.chat.id, "app_status_menu", { application_id: app.id }))]);
  }
  rows.push([button("مدارک مرتبط", await createRef(admin, update.callback_query?.message?.chat.id ?? update.message!.chat.id, "user_documents", { user_id: app.user_id }))]);
  rows.push([button("کاربر", await createRef(admin, update.callback_query?.message?.chat.id ?? update.message!.chat.id, "user_detail", { user_id: app.user_id }))]);
  rows.push([button("بازگشت", "apps:0"), button("منوی اصلی", "menu")]);
  await audit(admin, "application_viewed", {
    target_entity_type: "application",
    target_entity_id: app.id,
    application_id: app.id,
    affected_user_id: app.user_id,
  });
  return render(update, lines.join("\n"), keyboard(rows));
}

const ADMIN_STATUSES = [
  ["under_review", "در حال بررسی"],
  ["documents_missing", "مدارک ناقص"],
  ["documents_complete", "مدارک کامل"],
  ["submitted_to_university", "ارسال به دانشگاه"],
  ["conditional_acceptance", "پذیرش مشروط"],
  ["final_acceptance", "پذیرش نهایی"],
  ["rejected", "رد شده"],
  ["visa_process", "فرآیند ویزا"],
  ["enrolled", "ثبت‌نام شده"],
  ["cancelled", "لغو شده"],
];

const STATUS_PRIORITY: Record<string, string> = {
  documents_missing: "high",
  conditional_acceptance: "high",
  final_acceptance: "urgent",
  rejected: "high",
  visa_process: "high",
  enrolled: "high",
};

function statusLabel(status: string) {
  return ADMIN_STATUSES.find(([value]) => value === status)?.[1] ?? status;
}

function productLabel(product?: string | null) {
  return product === "ai_transfer" ? "AI Transfer" : "Smart Apply";
}

function appContext(app: Json) {
  const snap = (app.payload_snapshot ?? {}) as Json;
  const profile = snap?.user?.profile ?? {};
  const selection = snap?.selected_program ?? {};
  const readiness = snap?.readiness ?? {};
  const missing = Array.isArray(readiness?.missing) ? readiness.missing : [];
  return {
    email: snap?.user?.email ?? null,
    studentName: profile.full_name || snap?.user?.email || "دانشجو",
    university: selection.university_name || selection.university || "دانشگاه انتخاب‌شده",
    program: selection.program_name || selection.program || "رشته انتخاب‌شده",
    country: selection.country || "",
    submittedAt: app.submitted_at ?? app.created_at ?? null,
    missingDocuments: missing,
  };
}

function statusDocumentKind(status: string) {
  if (status === "conditional_acceptance" || status === "final_acceptance") return "acceptance_letter";
  if (status === "documents_missing") return "document_request";
  if (status === "rejected") return "rejection_notice";
  return "status_update_attachment";
}

function letterTypeForStatus(status: string) {
  if (status === "conditional_acceptance") return "conditional_acceptance";
  if (status === "final_acceptance") return "final_acceptance";
  if (status === "documents_missing") return "document_request";
  if (status === "rejected") return "rejection_notice";
  return "application_status_update";
}

function buildStudentStatusCopy(app: Json, status: string, note?: string | null, attachment?: Json | null) {
  const context = appContext(app);
  const label = statusLabel(status);
  const missing = context.missingDocuments.length
    ? `\nمدارک نیازمند تکمیل: ${context.missingDocuments.join("، ")}`
    : "";
  const attachmentLine = attachment?.original_name
    ? `\nفایل پیوست: ${attachment.original_name}`
    : "";
  const noteLine = note?.trim() ? `\n\nیادداشت تیم پذیرش:\n${note.trim().slice(0, 1400)}` : "";

  const statusSpecific: Record<string, string> = {
    under_review: "پرونده شما وارد بررسی انسانی تیم ACCA شد. نتیجه هر مرحله از همین پنل و ایمیل اطلاع‌رسانی می‌شود.",
    documents_missing: `برای ادامه بررسی، بخشی از مدارک پرونده نیاز به تکمیل یا اصلاح دارد.${missing}`,
    documents_complete: "مدارک اصلی پرونده شما کامل ثبت شده و برای مرحله بعدی آماده است.",
    submitted_to_university: "پرونده شما برای بررسی رسمی به دانشگاه مقصد ارسال شد. تصمیم نهایی با دانشگاه است.",
    conditional_acceptance: "پذیرش مشروط شما دریافت شد. لطفاً فایل پذیرش و شرایط ذکرشده را با دقت بررسی کنید.",
    final_acceptance: "پذیرش نهایی شما آماده است. فایل رسمی در پنل قرار گرفت و مراحل بعدی ثبت‌نام قابل پیگیری است.",
    rejected: "نتیجه بررسی دانشگاه برای این پرونده منفی ثبت شد. تیم ACCA می‌تواند مسیرهای جایگزین را با شما بررسی کند.",
    visa_process: "پرونده وارد مرحله هماهنگی سفر/ورود و مدارک بعد از پذیرش شده است.",
    enrolled: "وضعیت پرونده به ثبت‌نام‌شده تغییر کرد. اطلاعات تکمیلی در پنل شما باقی می‌ماند.",
    cancelled: "این پرونده لغو شد. اگر این تغییر را انتظار نداشتید، با تیم ACCA تماس بگیرید.",
  };

  return {
    title: status === "final_acceptance"
      ? "پذیرش نهایی شما آماده شد"
      : status === "conditional_acceptance"
        ? "پذیرش مشروط شما دریافت شد"
        : status === "documents_missing"
          ? "مدارک پرونده شما نیاز به تکمیل دارد"
          : "وضعیت پرونده شما به‌روزرسانی شد",
    message: [
      `وضعیت پرونده ${productLabel(app.product)} شما به «${label}» تغییر کرد.`,
      `دانشگاه: ${context.university}`,
      `رشته: ${context.program}`,
      context.submittedAt ? `تاریخ ثبت درخواست: ${fmtDate(context.submittedAt)}` : "",
      "",
      statusSpecific[status] ?? "تیم ACCA آخرین وضعیت پرونده شما را ثبت کرد.",
      attachmentLine,
      noteLine,
    ].filter(Boolean).join("\n").slice(0, 1800),
  };
}

function buildStatusEmail(app: Json, status: string, note?: string | null, attachment?: Json | null) {
  const context = appContext(app);
  const copy = buildStudentStatusCopy(app, status, note, attachment);
  const accountUrl = `${APP_BASE_URL}/account`;
  const text = [
    `سلام ${context.studentName} عزیز،`,
    "",
    copy.message,
    "",
    "برای مشاهده جزئیات، فایل‌ها و ادامه مسیر وارد پنل مرکزی ACCA شوید:",
    accountUrl,
    "",
    "این پیام اطلاع‌رسانی وضعیت پرونده است و به معنی تضمین پذیرش یا تصمیم نهایی دانشگاه نیست.",
    "ACCA Admissions",
  ].join("\n");
  const html = `
    <div dir="rtl" style="font-family:Arial,Tahoma,sans-serif;line-height:1.9;color:#102f48">
      <h2 style="margin:0 0 12px">${escapeHtml(copy.title)}</h2>
      <p>سلام ${escapeHtml(context.studentName)} عزیز،</p>
      <p style="white-space:pre-line">${escapeHtml(copy.message)}</p>
      <p><a href="${escapeHtml(accountUrl)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#14745f;color:white;text-decoration:none;font-weight:700">ورود به پنل مرکزی ACCA</a></p>
      <p style="font-size:12px;color:#64748b">این پیام اطلاع‌رسانی وضعیت پرونده است و به معنی تضمین پذیرش یا تصمیم نهایی دانشگاه نیست.</p>
    </div>
  `;
  return {
    subject: copy.title,
    text,
    html,
  };
}

async function sendStudentEmail({
  to,
  subject,
  text,
  html,
  attachment,
}: {
  to?: string | null;
  subject: string;
  text: string;
  html: string;
  attachment?: { filename: string; content: string; content_type: string } | null;
}) {
  if (!to) return { status: "skipped", provider: "resend", failure_reason: "Student email is missing." };
  const emailState = await getEmailProviderState();
  const settings = await getEmailSettings();
  const resendApiKey = RESEND_API_KEY_ENV || settings?.resend_api_key?.trim() || "";
  if (!emailState.configured || !resendApiKey) {
    return { status: "queued", provider: "resend", failure_reason: "Email provider is not configured." };
  }
  const payload: Json = {
    from: emailState.fromAddress,
    to: [to],
    subject,
    text,
    html,
  };
  if (attachment) payload.attachments = [attachment];

  await throttleResendRequest();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const failureReason = body?.message || `Resend responded with ${res.status}`;
    if (res.status === 429) {
      return {
        status: "queued",
        provider: "resend",
        failure_reason: failureReason,
        provider_message_id: null,
      };
    }
    return {
      status: "failed",
      provider: "resend",
      failure_reason: failureReason,
      provider_message_id: null,
    };
  }
  return {
    status: "sent",
    provider: "resend",
    failure_reason: null,
    provider_message_id: body?.id ?? null,
  };
}

async function loadRetryEmailAttachment(log: Json) {
  if (!log?.letter_id) return null;
  const { data: letter, error } = await supabase
    .from("user_letters")
    .select("bucket_id, object_path, original_name, mime_type, size_bytes")
    .eq("id", log.letter_id)
    .maybeSingle();
  if (error) throw error;
  if (!letter?.object_path) return null;
  const sizeBytes = Number(letter.size_bytes ?? 0);
  if (sizeBytes > EMAIL_ATTACHMENT_LIMIT) return null;

  const bucketId = letter.bucket_id || DOCUMENT_BUCKET;
  const { data, error: downloadError } = await supabase.storage
    .from(bucketId)
    .download(letter.object_path);
  if (downloadError) throw downloadError;
  if (!data) return null;
  const buffer = await data.arrayBuffer();
  if (buffer.byteLength > EMAIL_ATTACHMENT_LIMIT) return null;

  const filename = safeFilename(letter.original_name || `attachment-${log.letter_id}`);
  return {
    filename,
    content: arrayBufferToBase64(buffer),
    content_type: inferMimeType(filename, letter.mime_type),
  };
}

function getMessageAttachment(message?: TelegramMessage) {
  if (!message) return null;
  if (message.document?.file_id) {
    const fileName = message.document.file_name || `telegram-document-${message.message_id}`;
    return {
      file_id: message.document.file_id,
      file_name: fileName,
      mime_type: inferMimeType(fileName, message.document.mime_type),
      file_size: message.document.file_size ?? null,
      source: "document",
    };
  }
  if (message.photo?.length) {
    const photo = [...message.photo].sort((a, b) => (b.file_size ?? 0) - (a.file_size ?? 0))[0];
    return {
      file_id: photo.file_id,
      file_name: `telegram-photo-${message.message_id}.jpg`,
      mime_type: "image/jpeg",
      file_size: photo.file_size ?? null,
      source: "photo",
    };
  }
  return null;
}

function validateTelegramAttachment(attachment: Json) {
  if (attachment.file_size && attachment.file_size > MAX_ATTACHMENT_SIZE) {
    return "حجم فایل باید کمتر از ۱۵ مگابایت باشد.";
  }
  if (!ALLOWED_ATTACHMENT_MIME.has(attachment.mime_type)) {
    return "فرمت مجاز نیست. لطفاً PDF، JPG، PNG، DOC یا DOCX ارسال کنید.";
  }
  return null;
}

async function getTelegramFilePath(fileId: string) {
  const token = await getTelegramBotToken();
  if (!token) {
    throw new Error("Telegram bot token is not available in bot settings.");
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const body = await res.json();
  if (!res.ok || !body?.ok || !body?.result?.file_path) {
    throw new Error(body?.description || "Telegram file could not be resolved.");
  }
  return body.result.file_path as string;
}

async function downloadTelegramFile(filePath: string) {
  const token = await getTelegramBotToken();
  if (!token) {
    throw new Error("Telegram bot token is not available in bot settings.");
  }
  const res = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
  if (!res.ok) throw new Error(`Telegram file download failed with ${res.status}.`);
  return await res.arrayBuffer();
}

async function maybeRunDocumentOcr(documentId: string, mimeType: string) {
  if (!["application/pdf", "image/jpeg", "image/png"].includes(mimeType)) return;
  try {
    const task = supabase.functions.invoke("document-ocr", {
      body: { documentId, force: true },
    }).then(({ error }) => {
      if (error) console.error("document OCR invoke failed", error);
    });
    EdgeRuntime.waitUntil(task);
  } catch (error) {
    console.error("document OCR scheduling failed", error);
  }
}

async function saveStatusAttachment({
  admin,
  app,
  status,
  note,
  attachment,
  fileBuffer,
}: {
  admin: Admin;
  app: Json;
  status: string;
  note?: string | null;
  attachment: Json;
  fileBuffer: ArrayBuffer;
}) {
  const mimeType = inferMimeType(attachment.file_name, attachment.mime_type);
  const originalName = safeFilename(attachment.file_name);
  const objectPath = `${app.user_id}/${app.product}/admin/${app.id}/${crypto.randomUUID()}-${originalName}`;
  const blob = new Blob([fileBuffer], { type: mimeType });
  const { error: uploadError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(objectPath, blob, {
      contentType: mimeType,
      cacheControl: "3600",
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const documentKind = statusDocumentKind(status);
  const { data: document, error: documentError } = await supabase
    .from("student_documents")
    .insert({
      user_id: app.user_id,
      product: app.product,
      document_kind: documentKind,
      bucket_id: DOCUMENT_BUCKET,
      object_path: objectPath,
      original_name: originalName,
      mime_type: mimeType,
      size_bytes: fileBuffer.byteLength,
      status: "verified",
      review_status: documentKind === "acceptance_letter" ? "admin_review" : "reviewed",
      reviewer_admin_id: admin.id,
      reviewed_at: new Date().toISOString(),
      review_notes: `Uploaded by Telegram admin for ${statusLabel(status)}.`,
      quality_report: {
        source: "telegram_admin_bot",
        telegram_source: attachment.source,
        admin_status: status,
      },
    })
    .select()
    .single();
  if (documentError) {
    await supabase.storage.from(DOCUMENT_BUCKET).remove([objectPath]);
    throw documentError;
  }

  const letterTitle = status === "final_acceptance"
    ? "پذیرش نهایی دانشگاه"
    : status === "conditional_acceptance"
      ? "پذیرش مشروط دانشگاه"
      : `فایل وضعیت ${statusLabel(status)}`;
  const { data: letter, error: letterError } = await supabase
    .from("user_letters")
    .insert({
      user_id: app.user_id,
      application_id: app.id,
      document_id: document.id,
      title: letterTitle,
      letter_type: letterTypeForStatus(status),
      admin_message: note?.trim() || null,
      bucket_id: DOCUMENT_BUCKET,
      object_path: objectPath,
      original_name: originalName,
      mime_type: mimeType,
      size_bytes: fileBuffer.byteLength,
      created_by_admin_id: admin.id,
    })
    .select()
    .single();
  if (letterError) throw letterError;

  await maybeRunDocumentOcr(document.id, mimeType);

  return {
    document_id: document.id,
    letter_id: letter.id,
    original_name: originalName,
    mime_type: mimeType,
    size_bytes: fileBuffer.byteLength,
    object_path: objectPath,
    emailAttachment: fileBuffer.byteLength <= EMAIL_ATTACHMENT_LIMIT
      ? {
        filename: originalName,
        content: arrayBufferToBase64(fileBuffer),
        content_type: mimeType,
      }
      : null,
  };
}

async function renderStatusMenu(update: TelegramUpdate, admin: Admin, applicationId: string) {
  if (!hasPermission(admin, "manage_applications")) return render(update, "دسترسی کافی نیست.", keyboard([[button("منوی اصلی", "menu")]]));
  const rows: Json[][] = [];
  for (let i = 0; i < ADMIN_STATUSES.length; i += 2) {
    const chunk = ADMIN_STATUSES.slice(i, i + 2);
    rows.push(await Promise.all(chunk.map(async ([status, label]) => button(label, await createRef(admin, update.callback_query?.message?.chat.id ?? update.message!.chat.id, "app_status_apply", { application_id: applicationId, status })))));
  }
  rows.push([button("بازگشت به درخواست", await createRef(admin, update.callback_query?.message?.chat.id ?? update.message!.chat.id, "app_detail", { application_id: applicationId }))]);
  return render(update, [
    "وضعیت جدید درخواست را انتخاب کنید.",
    "",
    "با انتخاب هر وضعیت، همان لحظه پرونده به‌روزرسانی می‌شود، اعلان پنل ساخته می‌شود و ایمیل دانشجو به صورت خودکار آماده/ارسال می‌شود.",
    "اگر فایل پذیرش یا پیوست دارید، بعد از ثبت وضعیت از دکمه «ارسال فایل برای همین وضعیت» استفاده کنید.",
  ].join("\n"), keyboard(rows));
}

async function confirmApplicationStatus(update: TelegramUpdate, admin: Admin, applicationId: string, status: string, note?: string | null) {
  if (!hasPermission(admin, "manage_applications")) return render(update, "دسترسی کافی نیست.", keyboard([[button("منوی اصلی", "menu")]]));
  const { data: app, error } = await supabase
    .from("application_submissions")
    .select("id,user_id,product,admin_status,submitted_at,payload_snapshot")
    .eq("id", applicationId)
    .maybeSingle();
  if (error) throw error;
  if (!app) return render(update, "درخواست پیدا نشد.", keyboard([[button("منوی اصلی", "menu")]]));
  const chatId = update.callback_query?.message?.chat.id ?? update.message!.chat.id;
  const confirmRef = await createRef(admin, chatId, "app_status_apply", { application_id: applicationId, status, note: note ?? null });
  const noteRef = await createRef(admin, chatId, "app_status_note_prepare", { application_id: applicationId, status, note: note ?? null });
  const attachRef = await createRef(admin, chatId, "app_status_attachment_prepare", { application_id: applicationId, status, note: note ?? null });
  const context = appContext(app);
  return render(update, [
    "<b>تأیید تغییر وضعیت</b>",
    "",
    `درخواست: <code>${escapeHtml(applicationId)}</code>`,
    `وضعیت قبلی: <code>${escapeHtml(app.admin_status || "new")}</code>`,
    `وضعیت جدید: <b>${escapeHtml(statusLabel(status))}</b>`,
    `دانشگاه: ${escapeHtml(context.university)}`,
    `رشته: ${escapeHtml(context.program)}`,
    note?.trim() ? `یادداشت اختصاصی: ${escapeHtml(note.trim().slice(0, 280))}` : "",
    "",
    "پس از ثبت، وضعیت در پنل دانشجو نمایش داده می‌شود، ایمیل اطلاع‌رسانی ساخته می‌شود و در audit log باقی می‌ماند.",
  ].join("\n"), keyboard([
    [button("ثبت و اطلاع‌رسانی بدون فایل", confirmRef)],
    [button(note?.trim() ? "ویرایش متن اختصاصی" : "افزودن متن اختصاصی", noteRef)],
    [button("ثبت همراه فایل پیوست", attachRef)],
    [button("لغو", await createRef(admin, update.callback_query?.message?.chat.id ?? update.message!.chat.id, "app_detail", { application_id: applicationId }))],
  ]));
}

async function renderStatusNotePrompt(update: TelegramUpdate, admin: Admin, applicationId: string, status: string, note?: string | null) {
  const chatId = update.callback_query?.message?.chat.id ?? update.message!.chat.id;
  const user = update.callback_query?.from ?? update.message!.from!;
  await upsertSession(user, chatId, "awaiting_status_note", { application_id: applicationId, status, note: note ?? null });
  return render(update, [
    "<b>متن اختصاصی برای دانشجو</b>",
    "",
    `وضعیت: <b>${escapeHtml(statusLabel(status))}</b>`,
    "متنی که می‌خواهید داخل ایمیل و اعلان پنل بیاید را بفرستید.",
    "",
    "برای لغو /cancel را بفرستید.",
  ].join("\n"), keyboard([[button("لغو", "cancel")], [button("منوی اصلی", "menu")]]));
}

async function renderStatusAttachmentPrompt(update: TelegramUpdate, admin: Admin, applicationId: string, status: string, note?: string | null) {
  const chatId = update.callback_query?.message?.chat.id ?? update.message!.chat.id;
  const user = update.callback_query?.from ?? update.message!.from!;
  const hasTelegramToken = Boolean(await getTelegramBotToken());
  await upsertSession(user, chatId, "awaiting_status_attachment", { application_id: applicationId, status, note: note ?? null });
  return render(update, [
    "<b>ارسال فایل پیوست پرونده</b>",
    "",
    `وضعیت: <b>${escapeHtml(statusLabel(status))}</b>`,
    "فایل PDF، JPG، PNG، DOC یا DOCX را همینجا ارسال کنید.",
    "برای پذیرش مشروط یا نهایی، فایل در بخش پذیرش پنل دانشجو هم نمایش داده می‌شود.",
    "",
    hasTelegramToken
      ? "پس از دریافت فایل، وضعیت پرونده ثبت و ایمیل/اعلان ساخته می‌شود."
      : "توکن بات در تنظیمات داخلی پیدا نشد. webhook فعال است، اما دسترسی دانلود فایل هنوز آماده نیست.",
  ].join("\n"), keyboard([[button("لغو", "cancel")], [button("منوی اصلی", "menu")]]));
}

async function applyApplicationStatus(update: TelegramUpdate, admin: Admin, applicationId: string, status: string, options: Json = {}) {
  if (!hasPermission(admin, "manage_applications")) return render(update, "دسترسی کافی نیست.", keyboard([[button("منوی اصلی", "menu")]]));
  const { data: app, error } = await supabase
    .from("application_submissions")
    .select("id,user_id,product,intent,status,admin_status,submitted_at,payload_snapshot")
    .eq("id", applicationId)
    .maybeSingle();
  if (error) throw error;
  if (!app) return render(update, "درخواست پیدا نشد.", keyboard([[button("منوی اصلی", "menu")]]));
  const previous = app.admin_status || "new";
  const note = typeof options.note === "string" ? options.note.trim().slice(0, 1500) : null;
  const attachment = options.attachment ?? null;
  const copy = buildStudentStatusCopy(app, status, note, attachment);
  const email = buildStatusEmail(app, status, note, attachment);
  const { data: authUser } = await supabase.auth.admin.getUserById(app.user_id);
  const recipient = appContext(app).email || authUser?.user?.email || null;
  const emailDelivery = await sendStudentEmail({
    to: recipient,
    subject: email.subject,
    text: email.text,
    html: email.html,
    attachment: attachment?.emailAttachment ?? null,
  });
  const { data: emailLog, error: emailLogError } = await supabase
    .from("email_logs")
    .insert({
      user_id: app.user_id,
      application_id: applicationId,
      letter_id: attachment?.letter_id ?? null,
      recipient_email: recipient,
      subject: email.subject,
      body_text: email.text,
      body_html: email.html,
      status: emailDelivery.status,
      provider: emailDelivery.provider,
      provider_message_id: emailDelivery.provider_message_id ?? null,
      failure_reason: emailDelivery.failure_reason ?? null,
      metadata: {
        admin_status: status,
        previous_status: previous,
        attachment_name: attachment?.original_name ?? null,
        email_attachment_included: Boolean(attachment?.emailAttachment),
      },
      created_by_admin_id: admin.id,
    })
    .select()
    .single();
  if (emailLogError) console.error("email log insert failed", emailLogError);

  const { error: updateError } = await supabase
    .from("application_submissions")
    .update({
      admin_status: status,
      assigned_admin_id: admin.id,
      admin_status_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);
  if (updateError) throw updateError;
  const { data: notification, error: notificationError } = await supabase.from("user_notifications").insert({
    user_id: app.user_id,
    application_id: applicationId,
    document_id: attachment?.document_id ?? null,
    letter_id: attachment?.letter_id ?? null,
    email_log_id: emailLog?.id ?? null,
    title: copy.title,
    message: copy.message,
    notification_type: "application_update",
    priority: STATUS_PRIORITY[status] ?? "normal",
    action_url: "/account",
    created_by_admin_id: admin.id,
    delivery_status: emailDelivery.status === "sent" ? "email_sent" : "created",
  }).select().single();
  if (notificationError) throw notificationError;
  await supabase.from("application_status_history").insert({
    application_id: applicationId,
    user_id: app.user_id,
    previous_status: previous,
    new_status: status,
    changed_by_admin_id: admin.id,
    note,
    admin_message: note,
    notify_user: true,
    notification_id: notification?.id ?? null,
    email_log_id: emailLog?.id ?? null,
    letter_id: attachment?.letter_id ?? null,
    document_id: attachment?.document_id ?? null,
  });
  if (attachment?.letter_id && emailLog?.id) {
    await supabase.from("user_letters").update({ email_status: emailDelivery.status }).eq("id", attachment.letter_id);
  }
  await audit(admin, "application_status_changed", {
    target_entity_type: "application",
    target_entity_id: applicationId,
    application_id: applicationId,
    affected_user_id: app.user_id,
    previous_value: { admin_status: previous },
    new_value: {
      admin_status: status,
      note: note ?? null,
      document_id: attachment?.document_id ?? null,
      letter_id: attachment?.letter_id ?? null,
      email_status: emailDelivery.status,
    },
  });
  const chatId = update.callback_query?.message?.chat.id ?? update.message!.chat.id;
  const attachmentRef = await createRef(admin, chatId, "app_status_attachment_prepare", {
    application_id: applicationId,
    status,
    note: note ?? null,
  });
  const noteRef = await createRef(admin, chatId, "app_status_note_prepare", {
    application_id: applicationId,
    status,
    note: note ?? null,
  });
  const appRef = await createRef(admin, chatId, "app_detail", { application_id: applicationId });
  return render(update, [
    "وضعیت درخواست با موفقیت به‌روزرسانی شد.",
    "",
    `اعلان پنل: ثبت شد`,
    `ایمیل: ${emailDelivery.status === "sent" ? "ارسال شد" : emailDelivery.status === "queued" ? "در صف ارسال" : emailDelivery.status === "skipped" ? "ایمیل دانشجو پیدا نشد" : "ثبت نشد"}`,
    attachment?.original_name ? `فایل: ${attachment.original_name}` : "",
  ].filter(Boolean).join("\n"), keyboard([
    [button("ارسال فایل برای همین وضعیت", attachmentRef)],
    [button("افزودن متن اختصاصی", noteRef)],
    [button("مشاهده درخواست", appRef)],
    [button("منوی اصلی", "menu")],
  ]));
}

async function renderDocuments(update: TelegramUpdate, admin: Admin, page: number, userId?: string) {
  if (!hasPermission(admin, "view_documents")) return render(update, "دسترسی شما برای مشاهده مدارک کافی نیست.", keyboard([[button("منوی اصلی", "menu")]]));
  const from = Math.max(0, page) * PAGE_SIZE;
  let query = supabase
    .from("student_documents")
    .select("*")
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query;
  if (error) throw error;
  const rows: Json[][] = [];
  const lines = [
    "<b>📂 مدیریت مدارک</b>",
    userId ? "مدارک همین کاربر" : `صفحه ${page + 1}`,
    "",
  ];
  for (const doc of data ?? []) {
    lines.push(`• <b>${escapeHtml(truncate(doc.original_name, 42))}</b>`);
    lines.push(`  ${escapeHtml(doc.document_kind)} | <code>${escapeHtml(doc.review_status)}</code> | OCR ${escapeHtml(doc.ocr_confidence ?? "—")}%`);
    rows.push([button(`مشاهده ${truncate(doc.document_kind, 20)}`, await createRef(admin, update.callback_query?.message?.chat.id ?? update.message!.chat.id, "doc_detail", { document_id: doc.id }))]);
  }
  rows.push(...pageButtons("docs", Math.max(0, page)));
  await audit(admin, "documents_listed", { metadata: { page, user_id: userId ?? null } });
  return render(update, lines.join("\n"), keyboard(rows));
}

async function renderDocumentDetail(update: TelegramUpdate, admin: Admin, documentId: string) {
  if (!hasPermission(admin, "view_documents")) return render(update, "دسترسی کافی نیست.", keyboard([[button("منوی اصلی", "menu")]]));
  const { data: doc, error } = await supabase
    .from("student_documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw error;
  if (!doc) return render(update, "مدرک پیدا نشد.", keyboard([[button("منوی اصلی", "menu")]]));
  const signed = await supabase.storage
    .from(doc.bucket_id || "student-documents")
    .createSignedUrl(doc.object_path, 600);
  const rows: Json[][] = [];
  if (signed.data?.signedUrl) rows.push([urlButton("مشاهده امن فایل (۱۰ دقیقه)", signed.data.signedUrl)]);
  if (hasPermission(admin, "manage_documents")) {
    rows.push([
      button("تأیید مدرک", await createRef(admin, update.callback_query?.message?.chat.id ?? update.message!.chat.id, "doc_review_confirm", { document_id: doc.id, review_status: "reviewed", status: "verified" })),
      button("رد مدرک", await createRef(admin, update.callback_query?.message?.chat.id ?? update.message!.chat.id, "doc_review_confirm", { document_id: doc.id, review_status: "rejected", status: "rejected" })),
    ]);
  }
  rows.push([button("کاربر", await createRef(admin, update.callback_query?.message?.chat.id ?? update.message!.chat.id, "user_detail", { user_id: doc.user_id }))]);
  rows.push([button("بازگشت", "docs:0"), button("منوی اصلی", "menu")]);
  await audit(admin, "document_viewed", {
    target_entity_type: "document",
    target_entity_id: doc.id,
    affected_user_id: doc.user_id,
  });
  return render(update, [
    "<b>جزئیات مدرک</b>",
    "",
    `نام فایل: <b>${escapeHtml(doc.original_name)}</b>`,
    `نوع: ${escapeHtml(doc.document_kind)}`,
    `سرویس: ${escapeHtml(doc.product)}`,
    `وضعیت فایل: <code>${escapeHtml(doc.status)}</code>`,
    `وضعیت بررسی: <code>${escapeHtml(doc.review_status)}</code>`,
    `OCR: ${escapeHtml(doc.ocr_confidence ?? "—")}%`,
    `حجم: ${escapeHtml(doc.size_bytes ?? "—")} bytes`,
    `آپلود: ${fmtDate(doc.created_at)}`,
    doc.review_notes ? `یادداشت: ${escapeHtml(doc.review_notes)}` : "",
  ].filter(Boolean).join("\n"), keyboard(rows));
}

async function applyDocumentReview(update: TelegramUpdate, admin: Admin, documentId: string, reviewStatus: string, status: string) {
  if (!hasPermission(admin, "manage_documents")) return render(update, "دسترسی کافی نیست.", keyboard([[button("منوی اصلی", "menu")]]));
  const { data: doc, error } = await supabase
    .from("student_documents")
    .select("id,user_id,status,review_status")
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw error;
  if (!doc) return render(update, "مدرک پیدا نشد.", keyboard([[button("منوی اصلی", "menu")]]));
  const { error: updateError } = await supabase
    .from("student_documents")
    .update({
      status,
      review_status: reviewStatus,
      reviewer_admin_id: admin.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      review_notes: reviewStatus === "rejected" ? "Rejected from Telegram admin panel." : null,
    })
    .eq("id", documentId);
  if (updateError) throw updateError;
  await supabase.from("user_notifications").insert({
    user_id: doc.user_id,
    title: reviewStatus === "rejected" ? "مدرک شما نیاز به اصلاح دارد" : "مدرک شما بررسی شد",
    message: reviewStatus === "rejected"
      ? "یکی از مدارک شما توسط تیم ACCA نیازمند آپلود مجدد یا اصلاح تشخیص داده شد."
      : "یکی از مدارک شما توسط تیم ACCA بررسی و تأیید شد.",
    notification_type: "document_request",
    priority: reviewStatus === "rejected" ? "high" : "normal",
    created_by_admin_id: admin.id,
  });
  await audit(admin, "document_reviewed", {
    target_entity_type: "document",
    target_entity_id: documentId,
    affected_user_id: doc.user_id,
    previous_value: { status: doc.status, review_status: doc.review_status },
    new_value: { status, review_status: reviewStatus },
  });
  return render(update, "وضعیت مدرک ثبت شد.", keyboard([
    [button("مشاهده مدرک", await createRef(admin, update.callback_query?.message?.chat.id ?? update.message!.chat.id, "doc_detail", { document_id: documentId }))],
    [button("منوی اصلی", "menu")],
  ]));
}

async function renderStats(update: TelegramUpdate, admin: Admin) {
  if (!hasPermission(admin, "view_stats")) return render(update, "دسترسی کافی نیست.", keyboard([[button("منوی اصلی", "menu")]]));
  const sinceToday = new Date();
  sinceToday.setHours(0, 0, 0, 0);
  const [
    users,
    usersToday,
    apps,
    docsPending,
    appsNew,
    appsReview,
    docsAll,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sinceToday.toISOString()),
    supabase.from("application_submissions").select("id", { count: "exact", head: true }),
    supabase.from("student_documents").select("id", { count: "exact", head: true }).in("review_status", ["pending", "admin_review", "student_confirmation"]),
    supabase.from("application_submissions").select("id", { count: "exact", head: true }).eq("admin_status", "new"),
    supabase.from("application_submissions").select("id", { count: "exact", head: true }).eq("admin_status", "under_review"),
    supabase.from("student_documents").select("id", { count: "exact", head: true }),
  ]);
  await audit(admin, "stats_viewed");
  return render(update, [
    "<b>📊 آمار سریع</b>",
    "",
    `کل کاربران: <b>${users.count ?? 0}</b>`,
    `کاربران جدید امروز: <b>${usersToday.count ?? 0}</b>`,
    `کل درخواست‌ها: <b>${apps.count ?? 0}</b>`,
    `درخواست‌های جدید: <b>${appsNew.count ?? 0}</b>`,
    `در حال بررسی: <b>${appsReview.count ?? 0}</b>`,
    `کل مدارک: <b>${docsAll.count ?? 0}</b>`,
    `مدارک منتظر بررسی: <b>${docsPending.count ?? 0}</b>`,
  ].join("\n"), keyboard([[button("تازه‌سازی", "stats")], [button("منوی اصلی", "menu")]]));
}

async function renderLogs(update: TelegramUpdate, admin: Admin, page: number) {
  if (!hasPermission(admin, "view_logs")) return render(update, "دسترسی کافی نیست.", keyboard([[button("منوی اصلی", "menu")]]));
  const from = Math.max(0, page) * PAGE_SIZE;
  const { data, error } = await supabase
    .from("telegram_admin_audit_logs")
    .select("action_type, admin_display_name, role, status, target_entity_type, target_entity_id, created_at")
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;
  const lines = ["<b>🕘 فعالیت‌ها و لاگ‌ها</b>", `صفحه ${page + 1}`, ""];
  for (const log of data ?? []) {
    lines.push(`• ${escapeHtml(log.action_type)} | <code>${escapeHtml(log.status)}</code>`);
    lines.push(`  ${escapeHtml(log.admin_display_name || "system")} | ${fmtDate(log.created_at)}`);
  }
  return render(update, lines.join("\n"), keyboard(pageButtons("logs", Math.max(0, page))));
}

async function renderSearchPrompt(update: TelegramUpdate, admin: Admin) {
  await upsertSession(update.callback_query!.from, update.callback_query!.message!.chat.id, "awaiting_search", {});
  return render(update, [
    "<b>جستجوی سریع</b>",
    "",
    "نام، ایمیل، تلفن، یا بخشی از کد درخواست را ارسال کنید.",
    "برای لغو، /cancel را بفرستید.",
  ].join("\n"), keyboard([[button("لغو", "cancel")], [button("منوی اصلی", "menu")]]));
}

async function renderSearchResults(update: TelegramUpdate, admin: Admin, term: string) {
  const chatId = update.message!.chat.id;
  await upsertSession(update.message!.from!, chatId, "idle", {});
  const safeTerm = term.trim().slice(0, 80);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(safeTerm);
  const profileQuery = supabase
    .from("profiles")
    .select("*")
    .or(`full_name.ilike.%${safeTerm.replace(/[%_,]/g, "")}%,phone_number.ilike.%${safeTerm.replace(/[%_,]/g, "")}%,phone_e164.ilike.%${safeTerm.replace(/[%_,]/g, "")}%`)
    .limit(5);
  const appQuery = isUuid
    ? supabase
      .from("application_submissions")
      .select("id,user_id,product,admin_status,submitted_at,payload_snapshot")
      .eq("id", safeTerm)
      .limit(3)
    : Promise.resolve({ data: [], error: null });
  const [profiles, apps] = await Promise.all([profileQuery, appQuery]);
  const rows: Json[][] = [];
  const lines = [`<b>نتایج جستجو برای:</b> ${escapeHtml(safeTerm)}`, ""];
  if (profiles.data?.length) {
    lines.push("کاربران:");
    for (const profile of profiles.data) {
      lines.push(`• ${escapeHtml(profile.full_name || profile.phone_e164 || profile.id)}`);
      rows.push([button(`کاربر ${truncate(profile.full_name || profile.id, 22)}`, await createRef(admin, chatId, "user_detail", { user_id: profile.id }))]);
    }
  }
  if (apps.data?.length) {
    lines.push("", "درخواست‌ها:");
    for (const app of apps.data) {
      lines.push(`• ${escapeHtml(app.id)} | ${escapeHtml(app.admin_status)}`);
      rows.push([button(`درخواست ${truncate(app.id, 8)}`, await createRef(admin, chatId, "app_detail", { application_id: app.id }))]);
    }
  }
  if (!profiles.data?.length && !apps.data?.length) lines.push("نتیجه‌ای پیدا نشد.");
  rows.push([button("جستجوی جدید", "search"), button("منوی اصلی", "menu")]);
  await audit(admin, "quick_search", { metadata: { term: safeTerm, profile_count: profiles.data?.length ?? 0, app_count: apps.data?.length ?? 0 } });
  return render(update, lines.join("\n"), keyboard(rows));
}

function canManageEmailSettings(admin: Admin) {
  return admin.role === "super_admin" || admin.permissions.includes("*");
}

function emailAudienceLabel(audience: string) {
  if (audience === "smart_apply") return "کاربران Smart Apply";
  if (audience === "ai_transfer") return "کاربران AI Transfer";
  return "همه کاربران دارای ایمیل";
}

function marketingEmailHtml(subject: string, body: string) {
  const accountUrl = `${APP_BASE_URL}/account`;
  return `
    <div dir="rtl" style="font-family:Arial,Tahoma,sans-serif;line-height:1.9;color:#102f48;max-width:640px;margin:0 auto">
      <h2 style="margin:0 0 16px">${escapeHtml(subject)}</h2>
      <div style="white-space:pre-line;font-size:15px">${escapeHtml(body)}</div>
      <p style="margin-top:24px"><a href="${escapeHtml(accountUrl)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#14745f;color:white;text-decoration:none;font-weight:700">ورود به پنل مرکزی ACCA</a></p>
      <p style="font-size:12px;color:#64748b;margin-top:24px">این پیام از طرف ACCA Admissions ارسال شده است.</p>
    </div>
  `;
}

function addRecipient(recipients: Map<string, Json>, userId?: string | null, email?: string | null, name?: string | null) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return;
  if (!recipients.has(normalizedEmail)) {
    recipients.set(normalizedEmail, {
      user_id: userId ?? null,
      email: normalizedEmail,
      name: name || normalizedEmail,
    });
  }
}

async function listAudienceRecipients(audience: string, limit = BULK_EMAIL_LIMIT) {
  const recipients = new Map<string, Json>();
  if (audience === "all") {
    for (let page = 1; page <= 10 && recipients.size < limit; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
      if (error) throw error;
      const users = data.users ?? [];
      for (const user of users) {
        addRecipient(
          recipients,
          user.id,
          user.email,
          user.user_metadata?.full_name || user.user_metadata?.name || null,
        );
        if (recipients.size >= limit) break;
      }
      if (users.length < 100) break;
    }
    return [...recipients.values()];
  }

  const product = audience === "ai_transfer" ? "ai_transfer" : "smart_apply";
  const { data, error } = await supabase
    .from("application_submissions")
    .select("user_id, payload_snapshot, submitted_at")
    .eq("product", product)
    .order("submitted_at", { ascending: false })
    .limit(limit * 2);
  if (error) throw error;

  const missingEmailUserIds = new Set<string>();
  for (const item of data ?? []) {
    const snap = item.payload_snapshot as Json;
    const email = snap?.user?.email ?? null;
    const name = snap?.user?.profile?.full_name ?? null;
    addRecipient(recipients, item.user_id, email, name);
    if (!email && item.user_id) missingEmailUserIds.add(item.user_id);
    if (recipients.size >= limit) break;
  }

  for (const userId of missingEmailUserIds) {
    if (recipients.size >= limit) break;
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    addRecipient(
      recipients,
      userId,
      authUser.user?.email,
      authUser.user?.user_metadata?.full_name || authUser.user?.user_metadata?.name || null,
    );
  }

  return [...recipients.values()].slice(0, limit);
}

async function renderEmailCenter(update: TelegramUpdate, admin: Admin) {
  if (!hasPermission(admin, "send_notifications")) {
    return render(update, "دسترسی کافی نیست.", keyboard([[button("منوی اصلی", "menu")]]));
  }
  const [state, queuedResult, sentResult, failedResult] = await Promise.all([
    getEmailProviderState(),
    supabase.from("email_logs").select("id", { count: "exact", head: true }).eq("status", "queued"),
    supabase.from("email_logs").select("id", { count: "exact", head: true }).eq("status", "sent"),
    supabase.from("email_logs").select("id", { count: "exact", head: true }).eq("status", "failed"),
  ]);
  const rows: Json[][] = [
    [button("ارسال ایمیل مرکزی", "email_compose")],
    [button("ارسال دوباره ایمیل‌های صف", "email_retry")],
  ];
  if (canManageEmailSettings(admin)) {
    rows.push([
      button("تنظیم Resend API Key", "email_provider_key"),
      button("تنظیم فرستنده", "email_from"),
    ]);
  }
  rows.push([button("منوی اصلی", "menu")]);
  await audit(admin, "email_center_opened");
  return render(update, [
    "<b>مرکز ایمیل ACCA</b>",
    "",
    `وضعیت ارسال: <b>${state.configured ? "فعال" : "نیازمند تنظیم"}</b>`,
    `فرستنده: <code>${escapeHtml(state.fromAddress)}</code>`,
    `Provider: <code>${escapeHtml(state.provider)}</code>`,
    `منبع کلید: <code>${escapeHtml(state.source)}</code>`,
    "",
    `در صف: <b>${queuedResult.count ?? 0}</b>`,
    `ارسال‌شده: <b>${sentResult.count ?? 0}</b>`,
    `ناموفق: <b>${failedResult.count ?? 0}</b>`,
    "",
    state.configured
      ? "می‌توانید ایمیل وضعیت یا ایمیل مرکزی/پروموشنی ارسال کنید."
      : "برای ارسال واقعی ایمیل، ابتدا کلید Resend را تنظیم کنید. تا قبل از آن ایمیل‌ها فقط در صف ثبت می‌شوند.",
  ].join("\n"), keyboard(rows));
}

async function renderEmailAudienceMenu(update: TelegramUpdate, admin: Admin) {
  if (!hasPermission(admin, "send_notifications")) return render(update, "دسترسی کافی نیست.", keyboard([[button("منوی اصلی", "menu")]]));
  return render(update, [
    "<b>ارسال ایمیل مرکزی</b>",
    "",
    "مخاطب را انتخاب کنید. بعد از انتخاب، موضوع و متن ایمیل را مرحله‌به‌مرحله می‌فرستید و قبل از ارسال نهایی preview می‌گیرید.",
  ].join("\n"), keyboard([
    [button("همه کاربران", "email_audience_all")],
    [button("کاربران Smart Apply", "email_audience_smart_apply")],
    [button("کاربران AI Transfer", "email_audience_ai_transfer")],
    [button("بازگشت به مرکز ایمیل", "email")],
  ]));
}

async function renderEmailSubjectPrompt(update: TelegramUpdate, admin: Admin, audience: string) {
  const chatId = update.callback_query?.message?.chat.id ?? update.message!.chat.id;
  const user = update.callback_query?.from ?? update.message!.from!;
  await upsertSession(user, chatId, "awaiting_bulk_email_subject", { audience });
  return render(update, [
    "<b>موضوع ایمیل را بفرستید</b>",
    "",
    `مخاطب: <b>${escapeHtml(emailAudienceLabel(audience))}</b>`,
    "موضوع کوتاه، روشن و حرفه‌ای باشد.",
    "",
    "برای لغو /cancel را بفرستید.",
  ].join("\n"), keyboard([[button("لغو", "cancel")], [button("مرکز ایمیل", "email")]]));
}

async function handleBulkEmailSubjectText(update: TelegramUpdate, admin: Admin, session: Json, text: string) {
  if (!hasPermission(admin, "send_notifications")) return render(update, "دسترسی کافی نیست.", keyboard([[button("منوی اصلی", "menu")]]));
  const subject = text.trim().slice(0, 120);
  if (subject.length < 4) {
    return render(update, "موضوع خیلی کوتاه است. لطفاً یک موضوع واضح‌تر بفرستید.", keyboard([[button("لغو", "cancel")]]));
  }
  await upsertSession(update.message!.from!, update.message!.chat.id, "awaiting_bulk_email_body", {
    audience: session.context?.audience ?? "all",
    subject,
  });
  return render(update, [
    "<b>متن ایمیل را بفرستید</b>",
    "",
    `موضوع: <b>${escapeHtml(subject)}</b>`,
    "متن را همینجا بفرستید. لینک‌ها را هم می‌توانید داخل متن قرار دهید.",
    "",
    "برای لغو /cancel را بفرستید.",
  ].join("\n"), keyboard([[button("لغو", "cancel")], [button("مرکز ایمیل", "email")]]));
}

async function handleBulkEmailBodyText(update: TelegramUpdate, admin: Admin, session: Json, text: string) {
  if (!hasPermission(admin, "send_notifications")) return render(update, "دسترسی کافی نیست.", keyboard([[button("منوی اصلی", "menu")]]));
  const audience = session.context?.audience ?? "all";
  const subject = String(session.context?.subject ?? "").slice(0, 120);
  const body = text.trim().slice(0, 5000);
  if (!subject || body.length < 10) {
    return render(update, "متن ایمیل خیلی کوتاه است. لطفاً متن کامل‌تری بفرستید.", keyboard([[button("لغو", "cancel")]]));
  }
  const recipients = await listAudienceRecipients(audience);
  const sendRef = await createRef(admin, update.message!.chat.id, "bulk_email_send", { audience, subject, body });
  await upsertSession(update.message!.from!, update.message!.chat.id, "idle", {});
  return render(update, [
    "<b>پیش‌نمایش ارسال ایمیل</b>",
    "",
    `مخاطب: <b>${escapeHtml(emailAudienceLabel(audience))}</b>`,
    `تعداد ایمیل معتبر: <b>${recipients.length}</b>`,
    `موضوع: <b>${escapeHtml(subject)}</b>`,
    "",
    escapeHtml(body.slice(0, 900)),
    body.length > 900 ? "\n..." : "",
    "",
    "اگر تأیید کنید، ایمیل‌ها همین الان ارسال و در email_logs ثبت می‌شوند.",
  ].join("\n"), keyboard([
    [button("تأیید و ارسال", sendRef)],
    [button("ویرایش از اول", "email_compose")],
    [button("لغو", "email")],
  ]));
}

async function sendBulkEmail(update: TelegramUpdate, admin: Admin, payload: Json) {
  if (!hasPermission(admin, "send_notifications")) return render(update, "دسترسی کافی نیست.", keyboard([[button("منوی اصلی", "menu")]]));
  const state = await getEmailProviderState();
  if (!state.configured) {
    return render(update, [
      "<b>ارسال ایمیل فعال نیست</b>",
      "",
      "کلید Resend هنوز تنظیم نشده است. اول از مرکز ایمیل، «تنظیم Resend API Key» را بزنید.",
    ].join("\n"), keyboard([[button("تنظیم Resend API Key", "email_provider_key")], [button("مرکز ایمیل", "email")]]));
  }
  const audience = payload.audience ?? "all";
  const subject = String(payload.subject ?? "").slice(0, 120);
  const body = String(payload.body ?? "").slice(0, 5000);
  const recipients = await listAudienceRecipients(audience);
  if (!recipients.length) {
    return render(update, "برای این گروه، ایمیل معتبری پیدا نشد.", keyboard([[button("مرکز ایمیل", "email")]]));
  }
  await render(update, `ارسال شروع شد. تعداد گیرنده‌ها: ${recipients.length}`, keyboard([[button("مرکز ایمیل", "email")]]));
  let sent = 0;
  let failed = 0;
  let queued = 0;
  let skipped = 0;
  const html = marketingEmailHtml(subject, body);
  for (const recipient of recipients) {
    const delivery = await sendStudentEmail({
      to: recipient.email,
      subject,
      text: body,
      html,
    });
    if (delivery.status === "sent") sent += 1;
    else if (delivery.status === "failed") failed += 1;
    else if (delivery.status === "queued") queued += 1;
    else skipped += 1;
    await supabase.from("email_logs").insert({
      user_id: recipient.user_id,
      recipient_email: recipient.email,
      subject,
      body_text: body,
      body_html: html,
      status: delivery.status,
      provider: delivery.provider,
      provider_message_id: delivery.provider_message_id ?? null,
      failure_reason: delivery.failure_reason ?? null,
      metadata: {
        source: "telegram_email_center",
        audience,
        bulk_email: true,
      },
      created_by_admin_id: admin.id,
    });
  }
  await audit(admin, "bulk_email_sent", {
    metadata: { audience, recipient_count: recipients.length, sent, failed, queued, skipped },
  });
  return render(update, [
    "<b>ارسال ایمیل مرکزی تمام شد</b>",
    "",
    `مخاطب: ${escapeHtml(emailAudienceLabel(audience))}`,
    `ارسال‌شده: <b>${sent}</b>`,
    `ناموفق: <b>${failed}</b>`,
    `در صف: <b>${queued}</b>`,
    `بدون ایمیل/رد شده: <b>${skipped}</b>`,
  ].join("\n"), keyboard([[button("مرکز ایمیل", "email")], [button("منوی اصلی", "menu")]]));
}

async function retryQueuedEmails(update: TelegramUpdate, admin: Admin) {
  if (!hasPermission(admin, "send_notifications")) return render(update, "دسترسی کافی نیست.", keyboard([[button("منوی اصلی", "menu")]]));
  const state = await getEmailProviderState();
  if (!state.configured) {
    return render(update, [
      "<b>ارسال مجدد ممکن نیست</b>",
      "",
      "کلید Resend هنوز تنظیم نشده است. اول provider را فعال کنید، بعد ایمیل‌های صف را دوباره بفرستید.",
    ].join("\n"), keyboard([[button("تنظیم Resend API Key", "email_provider_key")], [button("مرکز ایمیل", "email")]]));
  }
  const { data: logs, error } = await supabase
    .from("email_logs")
    .select("*")
    .eq("status", "queued")
    .not("recipient_email", "is", null)
    .order("created_at", { ascending: true })
    .limit(25);
  if (error) throw error;
  if (!logs?.length) return render(update, "ایمیل در صف وجود ندارد.", keyboard([[button("مرکز ایمیل", "email")]]));

  let sent = 0;
  let failed = 0;
  let queued = 0;
  for (const log of logs) {
    let retryAttachment: { filename: string; content: string; content_type: string } | null = null;
    let attachmentFailure: string | null = null;
    try {
      retryAttachment = await loadRetryEmailAttachment(log);
    } catch (error) {
      attachmentFailure = error instanceof Error ? error.message : String(error);
    }
    const delivery = attachmentFailure
      ? {
        status: "failed",
        provider: "resend",
        provider_message_id: null,
        failure_reason: `Attachment could not be loaded for retry: ${attachmentFailure}`,
      }
      : await sendStudentEmail({
        to: log.recipient_email,
        subject: log.subject,
        text: log.body_text || "",
        html: log.body_html || marketingEmailHtml(log.subject, log.body_text || ""),
        attachment: retryAttachment,
      });
    if (delivery.status === "sent") sent += 1;
    if (delivery.status === "failed") failed += 1;
    if (delivery.status === "queued") queued += 1;
    await supabase.from("email_logs").update({
      status: delivery.status,
      provider: delivery.provider,
      provider_message_id: delivery.provider_message_id ?? null,
      failure_reason: delivery.failure_reason ?? null,
      metadata: {
        ...(log.metadata ?? {}),
        retry_attempted_at: new Date().toISOString(),
        retry_attachment_included: Boolean(retryAttachment),
        retry_attachment_required: Boolean(log.letter_id),
      },
      updated_at: new Date().toISOString(),
    }).eq("id", log.id);
  }
  await audit(admin, "queued_emails_retried", { metadata: { attempted: logs.length, sent, failed, queued } });
  return render(update, [
    "<b>ارسال دوباره ایمیل‌های صف انجام شد</b>",
    "",
    `تعداد بررسی‌شده: <b>${logs.length}</b>`,
    `ارسال‌شده: <b>${sent}</b>`,
    `ناموفق: <b>${failed}</b>`,
    `در صف: <b>${queued}</b>`,
  ].join("\n"), keyboard([[button("مرکز ایمیل", "email")], [button("منوی اصلی", "menu")]]));
}

async function renderEmailProviderKeyPrompt(update: TelegramUpdate, admin: Admin) {
  if (!canManageEmailSettings(admin)) return render(update, "فقط Super Admin می‌تواند تنظیمات provider ایمیل را تغییر دهد.", keyboard([[button("مرکز ایمیل", "email")]]));
  const chatId = update.callback_query?.message?.chat.id ?? update.message!.chat.id;
  const user = update.callback_query?.from ?? update.message!.from!;
  await upsertSession(user, chatId, "awaiting_email_provider_key", {});
  return render(update, [
    "<b>تنظیم Resend API Key</b>",
    "",
    "کلید Resend را همینجا بفرستید. مقدار کلید دوباره نمایش داده نمی‌شود و فقط در تنظیمات server-side ذخیره می‌شود.",
    "",
    "نمونه فرمت: <code>re_...</code>",
    "برای لغو /cancel را بفرستید.",
  ].join("\n"), keyboard([[button("لغو", "cancel")], [button("مرکز ایمیل", "email")]]));
}

async function handleEmailProviderKeyText(update: TelegramUpdate, admin: Admin, text: string) {
  if (!canManageEmailSettings(admin)) return render(update, "دسترسی کافی نیست.", keyboard([[button("مرکز ایمیل", "email")]]));
  const key = text.trim();
  if (!/^re_[A-Za-z0-9_-]{12,}$/.test(key)) {
    return render(update, "این شبیه Resend API Key معتبر نیست. لطفاً کلید با فرمت re_... را بفرستید.", keyboard([[button("لغو", "cancel")], [button("مرکز ایمیل", "email")]]));
  }
  const settings = await getEmailSettings();
  const { error } = await supabase.from("email_delivery_settings").upsert({
    id: true,
    provider: "resend",
    resend_api_key: key,
    from_address: settings?.from_address || DEFAULT_EMAIL_FROM_ADDRESS,
    enabled: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (error) throw error;
  cachedEmailSettings = null;
  await upsertSession(update.message!.from!, update.message!.chat.id, "idle", {});
  await audit(admin, "email_provider_key_configured");
  return render(update, [
    "<b>Provider ایمیل فعال شد</b>",
    "",
    "کلید Resend ذخیره شد. حالا می‌توانید ایمیل‌های صف را دوباره ارسال کنید یا ایمیل مرکزی بفرستید.",
  ].join("\n"), keyboard([[button("ارسال دوباره ایمیل‌های صف", "email_retry")], [button("مرکز ایمیل", "email")]]));
}

async function renderEmailFromPrompt(update: TelegramUpdate, admin: Admin) {
  if (!canManageEmailSettings(admin)) return render(update, "فقط Super Admin می‌تواند فرستنده ایمیل را تغییر دهد.", keyboard([[button("مرکز ایمیل", "email")]]));
  const chatId = update.callback_query?.message?.chat.id ?? update.message!.chat.id;
  const user = update.callback_query?.from ?? update.message!.from!;
  await upsertSession(user, chatId, "awaiting_email_from_address", {});
  return render(update, [
    "<b>تنظیم فرستنده ایمیل</b>",
    "",
    "فرستنده را بفرستید. پیشنهاد فعلی:",
    `<code>${escapeHtml(DEFAULT_EMAIL_FROM_ADDRESS)}</code>`,
    "",
    "دامنه باید در provider ایمیل شما verified باشد.",
  ].join("\n"), keyboard([[button("لغو", "cancel")], [button("مرکز ایمیل", "email")]]));
}

async function handleEmailFromText(update: TelegramUpdate, admin: Admin, text: string) {
  if (!canManageEmailSettings(admin)) return render(update, "دسترسی کافی نیست.", keyboard([[button("مرکز ایمیل", "email")]]));
  const fromAddress = text.trim().slice(0, 160);
  if (!/@[^\s>]+\.[^\s>]+/.test(fromAddress)) {
    return render(update, "فرستنده باید یک ایمیل معتبر داشته باشد؛ مثل ACCA Admissions <no-reply@accatransfer.com>", keyboard([[button("لغو", "cancel")], [button("مرکز ایمیل", "email")]]));
  }
  const settings = await getEmailSettings();
  const { error } = await supabase.from("email_delivery_settings").upsert({
    id: true,
    provider: "resend",
    resend_api_key: settings?.resend_api_key ?? null,
    from_address: fromAddress,
    enabled: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (error) throw error;
  cachedEmailSettings = null;
  await upsertSession(update.message!.from!, update.message!.chat.id, "idle", {});
  await audit(admin, "email_from_address_updated", { metadata: { from_address: fromAddress } });
  return render(update, `فرستنده ایمیل ذخیره شد:\n<code>${escapeHtml(fromAddress)}</code>`, keyboard([[button("مرکز ایمیل", "email")]]));
}

async function renderComingSoon(update: TelegramUpdate, section: string) {
  return render(update, [
    `<b>${escapeHtml(section)}</b>`,
    "",
    "این بخش در فاز بعدی به workflow کامل چندمرحله‌ای وصل می‌شود.",
    "فعلاً زیرساخت امن نقش‌ها، نشست‌ها و audit آماده است.",
  ].join("\n"), keyboard([[button("منوی اصلی", "menu")]]));
}

async function handleRef(update: TelegramUpdate, admin: Admin, token: string) {
  const chatId = update.callback_query!.message!.chat.id;
  const ref = await getRef(admin, chatId, token);
  if (!ref) return render(update, "این دکمه منقضی شده یا معتبر نیست. لطفاً از منوی اصلی دوباره شروع کنید.", keyboard([[button("منوی اصلی", "menu")]]));
  const payload = ref.payload ?? {};
  switch (ref.action) {
    case "user_detail":
      return renderUserDetail(update, admin, payload.user_id);
    case "user_applications":
      return renderApplications(update, admin, 0, payload.user_id);
    case "user_documents":
      return renderDocuments(update, admin, 0, payload.user_id);
    case "app_detail":
      return renderApplicationDetail(update, admin, payload.application_id);
    case "app_status_menu":
      return renderStatusMenu(update, admin, payload.application_id);
    case "app_status_confirm":
      return confirmApplicationStatus(update, admin, payload.application_id, payload.status);
    case "app_status_apply":
      return applyApplicationStatus(update, admin, payload.application_id, payload.status, { note: payload.note ?? null });
    case "app_status_note_prepare":
      return renderStatusNotePrompt(update, admin, payload.application_id, payload.status, payload.note ?? null);
    case "app_status_attachment_prepare":
      return renderStatusAttachmentPrompt(update, admin, payload.application_id, payload.status, payload.note ?? null);
    case "doc_detail":
      return renderDocumentDetail(update, admin, payload.document_id);
    case "doc_review_confirm":
      return applyDocumentReview(update, admin, payload.document_id, payload.review_status, payload.status);
    case "notify_user_prepare":
      await upsertSession(update.callback_query!.from, chatId, "awaiting_notification", { user_id: payload.user_id });
      return render(update, "متن اعلان پنل را ارسال کنید. عنوان به‌صورت پیش‌فرض «پیام جدید از ACCA» خواهد بود.", keyboard([[button("لغو", "cancel")], [button("منوی اصلی", "menu")]]));
    case "bulk_email_send":
      return sendBulkEmail(update, admin, payload);
    default:
      return render(update, "عملیات ناشناخته است.", keyboard([[button("منوی اصلی", "menu")]]));
  }
}

async function handleNotificationText(update: TelegramUpdate, admin: Admin, session: Json, text: string) {
  if (!hasPermission(admin, "send_notifications")) return render(update, "دسترسی کافی نیست.", keyboard([[button("منوی اصلی", "menu")]]));
  const userId = session.context?.user_id;
  if (!userId) return render(update, "نشست عملیات منقضی شده است.", keyboard([[button("منوی اصلی", "menu")]]));
  await supabase.from("user_notifications").insert({
    user_id: userId,
    title: "پیام جدید از ACCA",
    message: text.trim().slice(0, 1500),
    notification_type: "custom",
    priority: "normal",
    created_by_admin_id: admin.id,
  });
  await upsertSession(update.message!.from!, update.message!.chat.id, "idle", {});
  await audit(admin, "panel_notification_sent", {
    affected_user_id: userId,
    target_entity_type: "user",
    target_entity_id: userId,
  });
  return render(update, "اعلان در پنل کاربر ثبت شد.", keyboard([[button("منوی اصلی", "menu")]]));
}

async function handleStatusNoteText(update: TelegramUpdate, admin: Admin, session: Json, text: string) {
  const applicationId = session.context?.application_id;
  const status = session.context?.status;
  if (!applicationId || !status) return render(update, "نشست عملیات منقضی شده است.", keyboard([[button("منوی اصلی", "menu")]]));
  const note = text.trim().slice(0, 1500);
  await upsertSession(update.message!.from!, update.message!.chat.id, "idle", {});
  return confirmApplicationStatus(update, admin, applicationId, status, note);
}

async function handleStatusAttachmentMessage(update: TelegramUpdate, admin: Admin, session: Json) {
  const applicationId = session.context?.application_id;
  const status = session.context?.status;
  const note = typeof session.context?.note === "string" ? session.context.note : null;
  if (!applicationId || !status) return render(update, "نشست عملیات منقضی شده است.", keyboard([[button("منوی اصلی", "menu")]]));
  const attachment = getMessageAttachment(update.message);
  if (!attachment) {
    return render(update, "لطفاً فایل PDF، JPG، PNG، DOC یا DOCX را همینجا ارسال کنید، یا /cancel را بفرستید.", keyboard([[button("لغو", "cancel")], [button("منوی اصلی", "menu")]]));
  }
  if (!await getTelegramBotToken()) {
    return render(update, "توکن بات تلگرام در تنظیمات داخلی پیدا نشد. webhook بات فعال است اما دسترسی دانلود فایل ندارد.", keyboard([[button("منوی اصلی", "menu")]]));
  }
  const validationError = validateTelegramAttachment(attachment);
  if (validationError) return render(update, validationError, keyboard([[button("لغو", "cancel")], [button("منوی اصلی", "menu")]]));

  const { data: app, error } = await supabase
    .from("application_submissions")
    .select("id,user_id,product,intent,status,admin_status,submitted_at,payload_snapshot")
    .eq("id", applicationId)
    .maybeSingle();
  if (error) throw error;
  if (!app) return render(update, "درخواست پیدا نشد.", keyboard([[button("منوی اصلی", "menu")]]));

  await render(update, "فایل دریافت شد. در حال ذخیره امن، ثبت وضعیت و ساخت ایمیل/اعلان...", keyboard([[button("منوی اصلی", "menu")]]));
  const filePath = await getTelegramFilePath(attachment.file_id);
  const fileBuffer = await downloadTelegramFile(filePath);
  if (fileBuffer.byteLength > MAX_ATTACHMENT_SIZE) {
    return render(update, "حجم فایل باید کمتر از ۱۵ مگابایت باشد.", keyboard([[button("منوی اصلی", "menu")]]));
  }
  const saved = await saveStatusAttachment({
    admin,
    app,
    status,
    note,
    attachment,
    fileBuffer,
  });
  await upsertSession(update.message!.from!, update.message!.chat.id, "idle", {});
  await audit(admin, "application_status_attachment_uploaded", {
    target_entity_type: "application",
    target_entity_id: applicationId,
    application_id: applicationId,
    affected_user_id: app.user_id,
    metadata: {
      status,
      document_id: saved.document_id,
      letter_id: saved.letter_id,
      original_name: saved.original_name,
      mime_type: saved.mime_type,
      size_bytes: saved.size_bytes,
    },
  });
  return applyApplicationStatus(update, admin, applicationId, status, { note, attachment: saved });
}

async function handleCallback(update: TelegramUpdate, admin: Admin) {
  const data = update.callback_query?.data ?? "";
  await cleanupRefs(admin);
  if (data === "menu") return renderMenu(update, admin);
  if (data === "cancel") {
    await upsertSession(update.callback_query!.from, update.callback_query!.message!.chat.id, "idle", {});
    return render(update, "عملیات لغو شد.", keyboard([[button("منوی اصلی", "menu")]]));
  }
  if (data.startsWith("users:")) return renderUsers(update, admin, Number(data.split(":")[1] || 0));
  if (data.startsWith("apps:")) return renderApplications(update, admin, Number(data.split(":")[1] || 0));
  if (data.startsWith("docs:")) return renderDocuments(update, admin, Number(data.split(":")[1] || 0));
  if (data.startsWith("logs:")) return renderLogs(update, admin, Number(data.split(":")[1] || 0));
  if (data === "stats") return renderStats(update, admin);
  if (data === "search") return renderSearchPrompt(update, admin);
  if (data === "settings") return renderSettings(update, admin);
  if (data === "email") return renderEmailCenter(update, admin);
  if (data === "email_compose") return renderEmailAudienceMenu(update, admin);
  if (data === "email_retry") return retryQueuedEmails(update, admin);
  if (data === "email_provider_key") return renderEmailProviderKeyPrompt(update, admin);
  if (data === "email_from") return renderEmailFromPrompt(update, admin);
  if (data === "email_audience_all") return renderEmailSubjectPrompt(update, admin, "all");
  if (data === "email_audience_smart_apply") return renderEmailSubjectPrompt(update, admin, "smart_apply");
  if (data === "email_audience_ai_transfer") return renderEmailSubjectPrompt(update, admin, "ai_transfer");
  if (data === "letters") return renderComingSoon(update, "📄 نامه‌ها و پذیرش‌ها");
  if (data === "notifications") return renderComingSoon(update, "🔔 اعلان‌های پنل");
  if (data.startsWith("r:")) return handleRef(update, admin, data.slice(2));
  return render(update, "دستور نامعتبر است.", keyboard([[button("منوی اصلی", "menu")]]));
}

async function renderSettings(update: TelegramUpdate, admin: Admin) {
  const { data: admins } = await supabase
    .from("telegram_admins")
    .select("telegram_user_id, display_name, role, is_active, last_seen_at")
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(8);
  const lines = [
    "<b>⚙️ تنظیمات ادمین‌بات</b>",
    "",
    "ادمین‌های فعال:",
    ...(admins?.length
      ? admins.map((item: Json) => `• ${escapeHtml(item.display_name || item.telegram_user_id)} | <code>${escapeHtml(item.role)}</code> | ${item.is_active ? "فعال" : "غیرفعال"}`)
      : ["—"]),
    "",
    "برای اضافه‌کردن ادمین جدید، Telegram ID او را در جدول telegram_admins با نقش مناسب ثبت کنید یا موقتاً در AUTHORIZED_TELEGRAM_ADMIN_IDS قرار دهید.",
  ];
  await audit(admin, "settings_viewed");
  return render(update, lines.join("\n"), keyboard([[button("منوی اصلی", "menu")]]));
}

export async function handleTelegramAdminBot(req: Request) {
  if (req.method !== "POST") return new Response("ok");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Supabase admin credentials are not configured." }, 500);
  }

  try {
    const verified = await verifyWebhook(req);
    if (!verified) return json({ error: "invalid telegram webhook secret" }, 403);

    const update = await req.json() as TelegramUpdate;
    const telegramUser = update.message?.from ?? update.callback_query?.from;
    if (!telegramUser) return json({ ok: true });

    const admin = await getAdmin(telegramUser);
    if (!admin) return renderUnauthorized(update, telegramUser);

    if (update.callback_query) return handleCallback(update, admin);

    const text = update.message?.text?.trim() ?? "";
    if (text === "/cancel") {
      await upsertSession(telegramUser, update.message!.chat.id, "idle", {});
      return render(update, "عملیات لغو شد.", keyboard([[button("منوی اصلی", "menu")]]));
    }
    if (text === "/start" || text === "/admin" || text === "منو") {
      return renderMenu(update, admin);
    }

    const session = await getSession(telegramUser);
    if (session?.state === "awaiting_search" && text) {
      return renderSearchResults(update, admin, text);
    }
    if (session?.state === "awaiting_notification" && text) {
      return handleNotificationText(update, admin, session, text);
    }
    if (session?.state === "awaiting_email_provider_key" && text) {
      return handleEmailProviderKeyText(update, admin, text);
    }
    if (session?.state === "awaiting_email_from_address" && text) {
      return handleEmailFromText(update, admin, text);
    }
    if (session?.state === "awaiting_bulk_email_subject" && text) {
      return handleBulkEmailSubjectText(update, admin, session, text);
    }
    if (session?.state === "awaiting_bulk_email_body" && text) {
      return handleBulkEmailBodyText(update, admin, session, text);
    }
    if (session?.state === "awaiting_status_note" && text) {
      return handleStatusNoteText(update, admin, session, text);
    }
    if (session?.state === "awaiting_status_attachment") {
      return handleStatusAttachmentMessage(update, admin, session);
    }

    return renderMenu(update, admin);
  } catch (error) {
    console.error("telegram admin bot error", error);
    return json({ ok: false, error: "internal error" }, 200);
  }
}
