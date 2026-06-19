const SECURITY_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.accaco.com https://accaco.com https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
    "media-src 'self' blob:",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; "),
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), geolocation=(), payment=(), usb=(), fullscreen=(self), microphone=(self)",
};

export default {
  async fetch(request, env, ctx) {
    const startedAt = Date.now();
    const requestId = crypto.randomUUID();
    const url = new URL(request.url);

    const response = await fetch(request);
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      headers.set(key, value);
    }
    headers.set("X-ACCA-Request-ID", requestId);

    ctx.waitUntil((async () => {
      console.log(JSON.stringify({
        requestId,
        method: request.method,
        path: url.pathname,
        status: response.status,
        cfRay: request.headers.get("cf-ray"),
        colo: request.cf?.colo,
        durationMs: Date.now() - startedAt,
      }));
    })());

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
