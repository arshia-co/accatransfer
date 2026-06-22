/* ============================================================================
 * Per-route SEO for the accatransfer.com SPA.
 *
 * The app currently ships with a site-wide `noindex` (demo / pre-launch). This
 * module prepares the FULL public-SEO surface — per-route title, description,
 * canonical, Open Graph, Twitter and robots — so that going live is a single
 * switch: flip ALLOW_INDEX to `true` and the public pages below become
 * indexable, while the private app pages (/account*, /reset-password*, and any
 * unknown route) always stay `noindex`.
 *
 * It runs entirely client-side from main.jsx (no React/App.jsx coupling) and is
 * free of build-time tooling, matching the plain `vite build` pipeline.
 * ========================================================================== */

const SITE_ORIGIN = 'https://accatransfer.com';
const BRAND = 'ACCA Smart Apply';
const OG_IMAGE = `${SITE_ORIGIN}/assets/acca-logo-320.webp`;

// ⚠️ LAUNCH SWITCH — set to `true` on go-live to let the public pages (below)
// be indexed by search engines. Until then the whole site stays noindex.
export const ALLOW_INDEX = false;

const DEFAULT_DESCRIPTION =
  'ACCA Smart Apply — مسیر پذیرش و انتقالی تحصیلی در ترکیه با یک دستیار هوشمند: کشف رشته، انتخاب دانشگاه و شروع درخواست، قدم‌به‌قدم.';

// Public, SEO-worthy routes. Anything NOT listed here (account, reset-password,
// unknown paths) is treated as private and always rendered noindex.
const ROUTES = {
  '/': {
    public: true,
    title: 'ACCA Transfer | دستیار هوشمند پذیرش و انتقالی تحصیلی در ترکیه',
    description:
      'ACCA Transfer: انتخاب کنید — Smart Apply برای پذیرش تحصیلی یا AI Transfer برای انتقالی دانشگاهی به ترکیه. دستیار هوشمند، قدم‌به‌قدم و بدون فرم‌های طولانی.',
  },
  '/smart-apply': {
    public: true,
    title: 'Smart Apply | دستیار هوشمند پذیرش تحصیلی در ترکیه | ACCA',
    description:
      'Smart Apply — دستیار هوشمند پذیرش: کشف رشته، یافتن دانشگاه‌های مناسب در ترکیه و شروع درخواست، بدون فرم‌های طولانی.',
  },
  '/ai-transfer': {
    public: true,
    title: 'AI Transfer | انتقالی دانشگاهی هوشمند به ترکیه | ACCA',
    description:
      'AI Transfer — انتقالی دانشگاهی به ترکیه با تحلیل هوشمند ریزنمرات و تطبیق مقدماتی دروس؛ بررسی واجد شرایط بودن در چند دقیقه.',
  },
  '/smart-apply/glossary': {
    public: true,
    title: 'واژه‌نامهٔ پذیرش و انتقالی تحصیلی در ترکیه | ACCA Smart Apply',
    description:
      'واژه‌نامهٔ ساده و کاربردی اصطلاحات پذیرش تحصیلی، انتقالی دانشگاهی و مسیر Smart Apply و AI Transfer در ترکیه.',
  },
};

function normalizePath(raw) {
  const path = String(raw || '/').replace(/\/+$/, '');
  return path || '/';
}

function ensureTag(selector, create) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el;
}

function setMeta(attr, key, content) {
  const el = ensureTag(`meta[${attr}="${key}"]`, () => {
    const m = document.createElement('meta');
    m.setAttribute(attr, key);
    return m;
  });
  el.setAttribute('content', content);
}

function setLink(rel, href) {
  const el = ensureTag(`link[rel="${rel}"]`, () => {
    const l = document.createElement('link');
    l.setAttribute('rel', rel);
    return l;
  });
  el.setAttribute('href', href);
}

/** Apply the SEO head for a given path. Safe to call repeatedly. */
export function applySeo(rawPath) {
  if (typeof document === 'undefined') return;
  const path = normalizePath(rawPath ?? window.location.pathname);
  const route = ROUTES[path];
  const indexable = ALLOW_INDEX && Boolean(route?.public);

  const title = route?.title || `${BRAND} | دستیار هوشمند پذیرش تحصیلی`;
  const description = route?.description || DEFAULT_DESCRIPTION;
  const canonical = `${SITE_ORIGIN}${path === '/' ? '/' : path}`;
  const robots = indexable
    ? 'index, follow, max-image-preview:large, max-snippet:-1'
    : 'noindex, nofollow';

  document.title = title;
  setMeta('name', 'description', description);
  setMeta('name', 'robots', robots);
  setMeta('name', 'googlebot', robots);
  setLink('canonical', canonical);

  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:url', canonical);
  setMeta('property', 'og:image', OG_IMAGE);

  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', OG_IMAGE);
}

let started = false;

/**
 * Start route-aware SEO. The SPA navigates via history.pushState /
 * replaceState (and the browser back/forward via popstate), so we patch those
 * to re-apply the head — plus an initial pass on load.
 */
export function initSeo() {
  if (typeof window === 'undefined' || started) return;
  started = true;

  const run = () => applySeo(window.location.pathname);

  ['pushState', 'replaceState'].forEach((method) => {
    const original = window.history[method];
    if (typeof original !== 'function' || original.__accaSeoPatched) return;
    const patched = function patchedHistory(...args) {
      const result = original.apply(this, args);
      run();
      return result;
    };
    patched.__accaSeoPatched = true;
    window.history[method] = patched;
  });

  window.addEventListener('popstate', run);
  run();
}
