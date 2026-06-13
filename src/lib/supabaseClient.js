// Supabase browser client — progressive enhancement.
// When VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set, the app uses REAL
// Supabase auth, a real user panel and the real OpenAI-backed chat (via the
// `smart-apply-chat` Edge Function). When they are absent (e.g. the public
// demo with no backend), everything falls back to the mock experience, so the
// project always runs. Nothing here exposes a secret — the anon key is
// RLS-gated and the OpenAI key never reaches the browser.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export const FUNCTIONS_URL =
  import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || (url ? `${url}/functions/v1` : null);
