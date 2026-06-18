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
- Application admin status change with confirmation.
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
```

`AUTHORIZED_TELEGRAM_ADMIN_IDS` is a comma-separated bootstrap list. Any user ID
there is upserted as `super_admin` on first `/start`.

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

## Current Limitations

- Full letter upload, custom email composer, and Telegram file upload workflows
  are scaffolded for Phase 2 but intentionally not enabled in Phase 1.
- The website notification center table is ready; UI surfacing can be polished
  in the next frontend pass.
