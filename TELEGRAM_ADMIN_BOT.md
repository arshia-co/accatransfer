# ACCA Leads Telegram Admin Bot

This repo now includes a secure Telegram admin surface for the existing ACCA
Leads bot. It runs as a Supabase Edge Function:

`telegram-admin-bot`

## What Phase 1 Includes

- Telegram admin whitelist by numeric Telegram user ID.
- Roles: `super_admin`, `admin`, `admissions_officer`,
  `document_reviewer`, `read_only`.
- Role permissions stored in `telegram_admin_roles`.
- Private admin tables with RLS enabled and no browser grants.
- Telegram inline menu in Persian.
- User list/detail.
- Application list/detail.
- Application admin status change with confirmation, optional admin note,
  student panel notification, and email log/send workflow.
- Telegram PDF/JPG/PNG/DOC/DOCX attachment upload for every application status.
- Acceptance-letter attachments are saved to the student's central panel and
  shown in the Smart Apply / AI Transfer acceptance journey.
- Document list/detail.
- Short-lived signed document URLs.
- Document approve/reject actions.
- Panel notification creation.
- Quick search.
- Statistics.
- Audit logs.
- Callback refs stored server-side; sensitive data is not placed in
  `callback_data`.

## Required Supabase Secrets

Set these in Supabase Edge Function secrets:

```bash
TELEGRAM_BOT_TOKEN=
AUTHORIZED_TELEGRAM_ADMIN_IDS=
TELEGRAM_ADMIN_ALLOW_UNVERIFIED=false
RESEND_API_KEY=
EMAIL_FROM_ADDRESS="ACCA Admissions <no-reply@accatransfer.com>"
APP_BASE_URL=https://accatransfer.com
```

`AUTHORIZED_TELEGRAM_ADMIN_IDS` is a comma-separated bootstrap list. Any user ID
there is upserted as `super_admin` on first `/start`.

`TELEGRAM_BOT_TOKEN` is also required for Telegram file download. Without it,
the bot can still answer webhooks through Telegram's webhook response format,
but it cannot fetch uploaded files by `file_id`.

`RESEND_API_KEY` enables real outbound email. If it is missing, the status
change still succeeds, the panel notification is created, and an `email_logs`
row is saved with `status = queued` so the CRM/email provider can be connected
later without losing the event.

After bootstrap, manage admins in `telegram_admins`:

```sql
insert into public.telegram_admins (
  telegram_user_id,
  role,
  display_name,
  is_active
) values (
  123456789,
  'admin',
  'ACCA Staff',
  true
)
on conflict (telegram_user_id) do update set
  role = excluded.role,
  display_name = excluded.display_name,
  is_active = excluded.is_active;
```

## Webhook Setup

Deploy the function first, then set the webhook using the private database
helper. It reads the existing bot token from `private.telegram_notification_config`
and uses the generated secret from `telegram_bot_settings`, without exposing the
token.

```sql
select private.set_telegram_admin_webhook(
  'https://qysluhfrjpcguhneqsuz.functions.supabase.co/telegram-admin-bot'
);
```

The function validates Telegram's `X-Telegram-Bot-Api-Secret-Token` header.

## Security Notes

- Service role is only used inside the Edge Function.
- Telegram usernames are not trusted for authorization.
- Private documents are sent as signed URLs with a 10-minute expiry.
- Destructive/sensitive operations use confirmation.
- Every admin action writes to `telegram_admin_audit_logs`.
- Ordinary browser users cannot read or write admin tables.

## Status + Attachment Flow

1. Open an application in the bot.
2. Choose `تغییر وضعیت`.
3. Pick the new status.
4. Choose one of:
   - `ثبت و اطلاع‌رسانی بدون فایل`
   - `افزودن متن اختصاصی`
   - `ثبت همراه فایل پیوست`
5. The function updates `application_submissions.admin_status`, writes
   `application_status_history`, creates `user_notifications`, logs/sends
   email through `email_logs`, and stores any attachment in `student_documents`.
