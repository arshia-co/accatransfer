const KNOWN_ACCOUNTS_KEY = 'acca-central-known-accounts';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function readKnownAccounts() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KNOWN_ACCOUNTS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeKnownAccounts(accounts) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KNOWN_ACCOUNTS_KEY, JSON.stringify(accounts.slice(0, 6)));
}

export function rememberAccountPreview(user, profile = {}) {
  const email = normalizeEmail(user?.email);
  if (!email) return;

  const preview = {
    email,
    fullName: profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || '',
    avatarUrl: profile?.avatar_url || user?.user_metadata?.avatar_url || '',
    updatedAt: new Date().toISOString(),
  };

  const next = [
    preview,
    ...readKnownAccounts().filter((account) => normalizeEmail(account.email) !== email),
  ];
  writeKnownAccounts(next);
}

export function findRememberedAccountPreview(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return readKnownAccounts().find((account) => normalizeEmail(account.email) === normalized) || null;
}
