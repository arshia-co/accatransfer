import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  ?? namedKey("SUPABASE_SECRET_KEYS");
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
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
  if (!TELEGRAM_BOT_TOKEN) return methodResponse(method, payload);
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
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
    .select("webhook_secret, bot_label")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  return data;
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

async function renderStatusMenu(update: TelegramUpdate, admin: Admin, applicationId: string) {
  if (!hasPermission(admin, "manage_applications")) return render(update, "دسترسی کافی نیست.", keyboard([[button("منوی اصلی", "menu")]]));
  const rows: Json[][] = [];
  for (let i = 0; i < ADMIN_STATUSES.length; i += 2) {
    const chunk = ADMIN_STATUSES.slice(i, i + 2);
    rows.push(await Promise.all(chunk.map(async ([status, label]) => button(label, await createRef(admin, update.callback_query?.message?.chat.id ?? update.message!.chat.id, "app_status_confirm", { application_id: applicationId, status })))));
  }
  rows.push([button("بازگشت به درخواست", await createRef(admin, update.callback_query?.message?.chat.id ?? update.message!.chat.id, "app_detail", { application_id: applicationId }))]);
  return render(update, "وضعیت جدید درخواست را انتخاب کنید. مرحله بعدی تأیید نهایی است.", keyboard(rows));
}

async function confirmApplicationStatus(update: TelegramUpdate, admin: Admin, applicationId: string, status: string) {
  if (!hasPermission(admin, "manage_applications")) return render(update, "دسترسی کافی نیست.", keyboard([[button("منوی اصلی", "menu")]]));
  const { data: app, error } = await supabase
    .from("application_submissions")
    .select("id,user_id,admin_status")
    .eq("id", applicationId)
    .maybeSingle();
  if (error) throw error;
  if (!app) return render(update, "درخواست پیدا نشد.", keyboard([[button("منوی اصلی", "menu")]]));
  const statusLabel = ADMIN_STATUSES.find(([value]) => value === status)?.[1] ?? status;
  const confirmRef = await createRef(admin, update.callback_query?.message?.chat.id ?? update.message!.chat.id, "app_status_apply", { application_id: applicationId, status });
  return render(update, [
    "<b>تأیید تغییر وضعیت</b>",
    "",
    `درخواست: <code>${escapeHtml(applicationId)}</code>`,
    `وضعیت قبلی: <code>${escapeHtml(app.admin_status || "new")}</code>`,
    `وضعیت جدید: <b>${escapeHtml(statusLabel)}</b>`,
    "",
    "پس از تأیید، در تاریخچه وضعیت و audit log ثبت می‌شود و یک اعلان پنل برای دانشجو ساخته می‌شود.",
  ].join("\n"), keyboard([
    [button("تأیید تغییر وضعیت", confirmRef)],
    [button("لغو", await createRef(admin, update.callback_query?.message?.chat.id ?? update.message!.chat.id, "app_detail", { application_id: applicationId }))],
  ]));
}

async function applyApplicationStatus(update: TelegramUpdate, admin: Admin, applicationId: string, status: string) {
  const { data: app, error } = await supabase
    .from("application_submissions")
    .select("id,user_id,admin_status")
    .eq("id", applicationId)
    .maybeSingle();
  if (error) throw error;
  if (!app) return render(update, "درخواست پیدا نشد.", keyboard([[button("منوی اصلی", "menu")]]));
  const previous = app.admin_status || "new";
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
  await supabase.from("application_status_history").insert({
    application_id: applicationId,
    user_id: app.user_id,
    previous_status: previous,
    new_status: status,
    changed_by_admin_id: admin.id,
    notify_user: true,
  });
  await supabase.from("user_notifications").insert({
    user_id: app.user_id,
    application_id: applicationId,
    title: "وضعیت پرونده شما به‌روزرسانی شد",
    message: `وضعیت پرونده شما به ${ADMIN_STATUSES.find(([value]) => value === status)?.[1] ?? status} تغییر کرد.`,
    notification_type: "application_update",
    priority: "normal",
    created_by_admin_id: admin.id,
  });
  await audit(admin, "application_status_changed", {
    target_entity_type: "application",
    target_entity_id: applicationId,
    application_id: applicationId,
    affected_user_id: app.user_id,
    previous_value: { admin_status: previous },
    new_value: { admin_status: status },
  });
  return render(update, "وضعیت درخواست با موفقیت به‌روزرسانی شد.", keyboard([
    [button("مشاهده درخواست", await createRef(admin, update.callback_query?.message?.chat.id ?? update.message!.chat.id, "app_detail", { application_id: applicationId }))],
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
      return applyApplicationStatus(update, admin, payload.application_id, payload.status);
    case "doc_detail":
      return renderDocumentDetail(update, admin, payload.document_id);
    case "doc_review_confirm":
      return applyDocumentReview(update, admin, payload.document_id, payload.review_status, payload.status);
    case "notify_user_prepare":
      await upsertSession(update.callback_query!.from, chatId, "awaiting_notification", { user_id: payload.user_id });
      return render(update, "متن اعلان پنل را ارسال کنید. عنوان به‌صورت پیش‌فرض «پیام جدید از ACCA» خواهد بود.", keyboard([[button("لغو", "cancel")], [button("منوی اصلی", "menu")]]));
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
  if (data === "letters") return renderComingSoon(update, "📄 نامه‌ها و پذیرش‌ها");
  if (data === "email") return renderComingSoon(update, "📧 ارسال ایمیل");
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

    return renderMenu(update, admin);
  } catch (error) {
    console.error("telegram admin bot error", error);
    return json({ ok: false, error: "internal error" }, 200);
  }
}
