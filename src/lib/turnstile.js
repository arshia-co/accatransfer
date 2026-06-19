// Cloudflare Turnstile loader for public and high-cost flows. Supabase Edge
// Functions remain the enforcement point for private flows; the optional Spin
// siteverify Worker protects public OCR entry points before high-cost work runs.
//
// Dormant by design: if VITE_TURNSTILE_SITE_KEY is not set, isTurnstileEnabled()
// is false and the UI skips the gate entirely (so dev/builds without keys work).

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
const SITEVERIFY_URL = import.meta.env.VITE_TURNSTILE_VERIFY_URL || '';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise = null;

export function isTurnstileEnabled() {
  return Boolean(SITE_KEY);
}

export function isTurnstileWorkerEnabled() {
  return Boolean(SITEVERIFY_URL);
}

function loadScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('turnstile: no window'));
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('turnstile: script failed')));
        if (window.turnstile) resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('turnstile: script failed'));
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

function normalizeAction(action) {
  return String(action || 'acca_security')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32) || 'acca_security';
}

function idempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const parts = crypto.getRandomValues(new Uint32Array(2));
    return `${Date.now()}-${parts[0].toString(16)}${parts[1].toString(16)}`;
  }
  return `${Date.now()}`;
}

export async function verifyTurnstileWithWorker(token, action = 'turnstile-spin-v1') {
  if (!SITEVERIFY_URL) return { success: true, skipped: true };
  if (!token) throw new Error('Security check is required. Please try again.');

  const response = await fetch(SITEVERIFY_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      token,
      action: normalizeAction(action),
      idempotency_key: idempotencyKey(),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success !== true) {
    throw new Error('Security check failed. Please refresh and try again.');
  }
  return data;
}

// Renders a managed Turnstile widget into `el` and returns control helpers.
// `onToken` fires with a fresh, single-use token (on first solve and after each
// reset/auto-refresh). Returns null when Turnstile is not configured.
export async function renderTurnstile(el, {
  onToken,
  onError,
  onExpire,
  action = 'transfer_upload',
} = {}) {
  if (!SITE_KEY || !el) return null;
  await loadScript();
  if (!window.turnstile) throw new Error('turnstile: unavailable');
  const widgetId = window.turnstile.render(el, {
    sitekey: SITE_KEY,
    theme: 'auto',
    action: normalizeAction(action),
    callback: (token) => { if (onToken) onToken(token); },
    'error-callback': () => { if (onError) onError(); },
    'expired-callback': () => { if (onExpire) onExpire(); },
  });
  return {
    widgetId,
    reset: () => { try { window.turnstile.reset(widgetId); } catch { /* ignore */ } },
    remove: () => { try { window.turnstile.remove(widgetId); } catch { /* ignore */ } },
    getResponse: () => { try { return window.turnstile.getResponse(widgetId); } catch { return ''; } },
  };
}

// Runs an invisible Turnstile check and resolves with a fresh token. Returns
// null when Turnstile is not configured, which keeps local/dev demos usable.
export async function getTurnstileToken(action = 'acca_security') {
  if (!SITE_KEY) return null;
  if (typeof document === 'undefined') return null;
  await loadScript();
  if (!window.turnstile) throw new Error('turnstile: unavailable');

  return new Promise((resolve, reject) => {
    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.position = 'fixed';
    host.style.left = '-10000px';
    host.style.bottom = '0';
    host.style.width = '1px';
    host.style.height = '1px';
    host.style.overflow = 'hidden';
    document.body.appendChild(host);

    let widgetId = null;
    const cleanup = () => {
      window.clearTimeout(timeout);
      try {
        if (widgetId) window.turnstile.remove(widgetId);
      } catch {
        /* ignore cleanup failures */
      }
      host.remove();
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Security check timed out. Please try again.'));
    }, 15000);

    try {
      widgetId = window.turnstile.render(host, {
        sitekey: SITE_KEY,
        theme: 'auto',
        size: 'invisible',
        execution: 'execute',
        action: normalizeAction(action),
        callback: (token) => {
          cleanup();
          resolve(token);
        },
        'error-callback': () => {
          cleanup();
          reject(new Error('Security check failed. Please refresh and try again.'));
        },
        'expired-callback': () => {
          cleanup();
          reject(new Error('Security check expired. Please try again.'));
        },
      });
      window.turnstile.execute(widgetId);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}
