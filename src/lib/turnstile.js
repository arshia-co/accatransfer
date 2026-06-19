// Cloudflare Turnstile loader for the public, no-login guest flows. Used to gate
// the free "Check Eligibility" flow so bots can't spam the OCR/AI edge function
// and burn tokens. The server (edge function) is the real enforcement point;
// this just produces a token for it.
//
// Dormant by design: if VITE_TURNSTILE_SITE_KEY is not set, isTurnstileEnabled()
// is false and the UI skips the gate entirely (so dev/builds without keys work).

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise = null;

export function isTurnstileEnabled() {
  return Boolean(SITE_KEY);
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

// Renders a managed Turnstile widget into `el` and returns control helpers.
// `onToken` fires with a fresh, single-use token (on first solve and after each
// reset/auto-refresh). Returns null when Turnstile is not configured.
export async function renderTurnstile(el, { onToken, onError, onExpire } = {}) {
  if (!SITE_KEY || !el) return null;
  await loadScript();
  if (!window.turnstile) throw new Error('turnstile: unavailable');
  const widgetId = window.turnstile.render(el, {
    sitekey: SITE_KEY,
    theme: 'auto',
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
