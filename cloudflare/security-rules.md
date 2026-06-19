# ACCA Cloudflare Security Rules

The current DNS for `accatransfer.com` still uses Google nameservers and points
to GitHub Pages. These Cloudflare rules only protect real traffic after the
domain is added to Cloudflare and the `accatransfer.com` / `www` records are
orange-cloud proxied.

## Turnstile

- Site key: expose as `VITE_TURNSTILE_SITE_KEY`.
- Spin siteverify Worker: expose as `VITE_TURNSTILE_VERIFY_URL`.
- Secret key: set in Supabase Edge Function secrets as `TURNSTILE_SECRET_KEY`.
- Supabase Auth: enable CAPTCHA in the Supabase Auth dashboard and select
  Cloudflare Turnstile using the same secret.
- Server validation exists in:
  - `turnstile-siteverify-acca-smart-apply` Cloudflare Worker
  - `guest-transcript-ocr`
  - `security-verify`
  - `document-ocr`
  - `transfer-analyze`
  - `smart-apply-chat`
  - `smart-apply-voice`

## Rate Limiting Rules

Create rules in Cloudflare WAF > Rate limiting rules:

| Rule | Expression | Suggested limit | Action |
| --- | --- | --- | --- |
| Auth | `(http.request.uri.path in {"/login" "/signup" "/password-reset"})` | 10 requests / 10 min / IP | Managed Challenge |
| Smart Apply start | `(http.request.uri.path eq "/smart-apply/start")` | 12 requests / 10 min / IP | Managed Challenge |
| Uploads | `(http.request.uri.path in {"/transfer/upload" "/document/upload"})` | 8 requests / 10 min / IP | Managed Challenge |
| AI API | `(starts_with(http.request.uri.path, "/api/ai/"))` | 20 requests / 10 min / IP | Block for 10 min |
| OCR API | `(starts_with(http.request.uri.path, "/api/ocr/"))` | 8 requests / 10 min / IP | Block for 10 min |

If the live app continues to call Supabase functions directly at
`*.supabase.co/functions/v1/*`, these path-based Cloudflare rules on
`accatransfer.com` will not see that traffic. Keep the Edge Function Turnstile
validation enabled, or add Cloudflare Worker proxy routes for `/api/ai/*` and
`/api/ocr/*`.

## WAF, Bot And Headers

- Enable Cloudflare WAF Managed Rules for the zone.
- Enable Bot Fight Mode or Super Bot Fight Mode if the plan supports it.
- Attach `cloudflare/security-worker.js` as a Worker route for
  `accatransfer.com/*` and `www.accatransfer.com/*` to add CSP, HSTS,
  X-Content-Type-Options, Referrer-Policy, Permissions-Policy and trace logs.
- Use Cloudflare dashboard Logs / Workers Logs / Trace Events to inspect blocked
  requests and request IDs from `X-ACCA-Request-ID`.
