# ACCA Smart Apply — go-live runbook

Goal: publish the app to **accatransfer.com** with **real Supabase auth + user
panel** and a **real OpenAI-powered chat**, with the OpenAI key kept **server-side**.

Architecture (already built in this repo):
- Frontend (Vite/React) → deploy to **Vercel**.
- Auth + data → a **new Supabase project** (`profiles`, `smart_apply_sessions`, RLS).
- AI chat → Supabase **Edge Function** `smart-apply-chat` holding `OPENAI_API_KEY`.
- The 25-question Major Discovery stays local (no token cost); open chat/FAQ use OpenAI.

CLIs are already installed locally: `vercel`, `supabase` (and `gh` via winget —
open a new terminal so it's on PATH, or use the full path).

---

## 0) Things only you can provide
- **Supabase**: create a new project in the dashboard → copy `Project URL`,
  `anon` public key, and the **project ref** (the `xxxx` in `xxxx.supabase.co`).
- **OpenAI**: an API key (`sk-...`). It will be set as a Supabase secret only.
- **Logins**: either run the `login` commands below yourself, or give me
  `SUPABASE_ACCESS_TOKEN` and `VERCEL_TOKEN` so I can run them non-interactively.

## 1) Frontend env
```bash
cp .env.example .env
# edit .env:
#   VITE_SUPABASE_URL=https://<ref>.supabase.co
#   VITE_SUPABASE_ANON_KEY=<anon key>
```

## 2) Database
```bash
supabase login                       # opens browser (or set SUPABASE_ACCESS_TOKEN)
supabase link --project-ref <ref>
supabase db push                     # applies supabase/migrations/0001_init.sql
```
In the dashboard → Authentication → Providers → Email: enable it. To receive a
**6-digit code** (not just a magic link), make sure the email template includes
`{{ .Token }}`. (The magic link also works — it auto-signs-in via the SPA.)

## 3) AI Edge Function (key stays server-side)
```bash
supabase secrets set OPENAI_API_KEY=sk-...        # optional: OPENAI_MODEL=gpt-4o-mini
supabase functions deploy smart-apply-chat
```

## 4) Deploy the site
```bash
npm run build
vercel login            # or set VERCEL_TOKEN
vercel --prod           # set the two VITE_ env vars in the Vercel project settings
```
Add the same `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in
Vercel → Project → Settings → Environment Variables, then redeploy.

## 5) Point the domain (Squarespace DNS)
In Vercel → Project → Settings → Domains, add `accatransfer.com` (and `www`).
Vercel shows the exact records. In Squarespace → Domains → accatransfer.com →
DNS settings, add them (typically an `A` record → `76.76.21.21` for the apex and
a `CNAME` `www` → `cname.vercel-dns.com`; use whatever Vercel displays).
DNS can take up to a few hours to propagate.

> ⚠️ The apex `accatransfer.com` currently serves your existing site. Repointing
> it here replaces that. If you want to keep the current site, use a subdomain
> (e.g. `apply.accatransfer.com`) instead — only the DNS host record changes.

## 6) Smoke test on the live domain
- Open the site → start Smart Apply → it should detect Supabase and show the
  real email-code login at the gate.
- Ask the assistant an open question (e.g. "Compare studying medicine vs
  dentistry in Turkey") → the reply now comes from OpenAI via the Edge Function.
- Log in with the email code → the dashboard opens and a row appears in
  `smart_apply_sessions`.

## Cost guardrails (OpenAI)
- Model defaults to `gpt-4o-mini` (cheap). Replies capped at 600 tokens, last 12
  messages only. Set a **monthly usage limit** in the OpenAI billing dashboard.
- Only open chat/FAQ calls the model; the structured quiz does not.

## Cloudflare security
- Create a Cloudflare Turnstile widget for `accatransfer.com`.
- Add the public site key as `VITE_TURNSTILE_SITE_KEY` in the GitHub Pages
  environment variables or the Vercel project env.
- Add the secret as a Supabase Edge Function secret:
  `supabase secrets set TURNSTILE_SECRET_KEY=<secret>`.
- Enable CAPTCHA in Supabase Auth with the same Turnstile secret so
  login/signup/password reset also validate the token server-side.
- Deploy these functions after setting the secret:
  `security-verify`, `guest-transcript-ocr`, `document-ocr`,
  `transfer-analyze`, `smart-apply-chat`, `smart-apply-voice`.
- `accatransfer.com` currently resolves through Google nameservers to GitHub
  Pages. Cloudflare WAF, Bot Protection, Rate Limiting, HSTS and Worker headers
  will only affect real traffic after the domain is added to Cloudflare and DNS
  records are orange-cloud proxied. Use `cloudflare/security-rules.md` and
  `cloudflare/security-worker.js` for the exact rules and header worker.
