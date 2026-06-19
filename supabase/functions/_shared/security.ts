const TURNSTILE_SECRET_KEY = Deno.env.get("TURNSTILE_SECRET_KEY")
  ?? Deno.env.get("CLOUDFLARE_TURNSTILE_SECRET_KEY")
  ?? Deno.env.get("CLOUDFLARE_SECRET_KEY");

function normalizeAction(action?: string | null) {
  return String(action || "acca_security")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32) || "acca_security";
}

function clientIp(req: Request) {
  const forwarded = req.headers.get("CF-Connecting-IP")
    ?? req.headers.get("x-forwarded-for")
    ?? "";
  return forwarded.split(",")[0]?.trim() || null;
}

export type TurnstileResult = {
  ok: boolean;
  skipped?: boolean;
  status?: number;
  message?: string;
};

export async function verifyTurnstile(
  req: Request,
  token: string | null | undefined,
  expectedAction?: string,
): Promise<TurnstileResult> {
  if (!TURNSTILE_SECRET_KEY) {
    return { ok: true, skipped: true };
  }
  if (!token) {
    return {
      ok: false,
      status: 403,
      message: "Security check is required. Please refresh and try again.",
    };
  }

  try {
    const form = new URLSearchParams();
    form.append("secret", TURNSTILE_SECRET_KEY);
    form.append("response", token);
    const ip = clientIp(req);
    if (ip) form.append("remoteip", ip);

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
    });
    const data = await response.json();
    if (!data?.success) {
      console.warn("turnstile rejected", data?.["error-codes"] ?? []);
      return {
        ok: false,
        status: 403,
        message: "Security check failed. Please refresh and try again.",
      };
    }

    const expected = normalizeAction(expectedAction);
    const actual = typeof data.action === "string" ? normalizeAction(data.action) : "";
    if (actual && expected && actual !== expected) {
      console.warn("turnstile action mismatch", { expected, actual });
      return {
        ok: false,
        status: 403,
        message: "Security check failed. Please refresh and try again.",
      };
    }

    return { ok: true };
  } catch (error) {
    console.error("turnstile verify error", error);
    return {
      ok: false,
      status: 503,
      message: "Security check is temporarily unavailable. Please try again.",
    };
  }
}
