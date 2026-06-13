// Real AI chat provider — calls the secure `smart-apply-chat` Edge Function
// (which holds the OpenAI key server-side). Used for open Q&A / FAQ / free
// conversation once Supabase is configured. The deterministic 25-question
// Major Discovery stays local by design (no token cost, perfectly consistent).
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { L } from '../lib/lang';
import { ACCA_CATEGORY_LABELS } from '../data/majorQuestions';

export const isRealChatConfigured = isSupabaseConfigured;

// Compact, privacy-light snapshot of what the student shared, to ground replies.
function profileSummary(state) {
  const p = state.studentProfile || {};
  const bits = [];
  if (p.name) bits.push(`name=${p.name}`);
  if (state.goal) bits.push(`goal=${state.goal}`);
  if (p.degree) bits.push(`degree=${p.degree}`);
  if (p.country) bits.push(`country=${p.country}`);
  if (p.knownMajor) bits.push(`major=${p.knownMajor}`);
  if (state.discoveryResult?.accaArchetype?.primary) bits.push(`archetype=${state.discoveryResult.accaArchetype.primary}`);
  const interests = (p.interests || []).map((k) => L(ACCA_CATEGORY_LABELS[k] || {}, 'en')).filter(Boolean);
  if (interests.length) bits.push(`interests=${interests.join('/')}`);
  return bits.join(', ');
}

// Maps the stored chat into OpenAI's role format (last turns only; rich cards
// without text are skipped).
function toHistory(messages) {
  return (messages || [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content)
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content }));
}

/**
 * @returns {Promise<string|null>} the assistant reply text, or null on failure
 * so the caller can fall back to the mock answer.
 */
export async function realChat({ state, userText }) {
  if (!supabase) return null;
  const history = toHistory(state.messages);
  history.push({ role: 'user', content: userText });
  try {
    const { data, error } = await supabase.functions.invoke('smart-apply-chat', {
      body: { messages: history, language: state.language, profileSummary: profileSummary(state) },
    });
    if (error) return null;
    const reply = (data?.reply || '').trim();
    return reply || null;
  } catch {
    return null;
  }
}
