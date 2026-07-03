import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { getTurnstileToken } from '../lib/turnstile';

export async function reportSmartApplyMessageIssue(payload) {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: true, skipped: true };
  }

  const turnstileToken = await getTurnstileToken('smart_apply_feedback');
  const { data, error } = await supabase.functions.invoke('smart-apply-feedback', {
    body: {
      ...payload,
      turnstileToken,
    },
  });

  if (error) throw error;
  return data || { ok: true };
}
