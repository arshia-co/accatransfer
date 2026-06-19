// Real AI decision provider. The Edge Function may classify a free-text reply
// and write one short helper message, but it cannot advance the conversation.
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { getTurnstileToken } from '../lib/turnstile';
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

/**
 * @returns {Promise<object|null>} a controlled decision, or null on failure.
 */
export async function realChat({ state, userText, context }) {
  if (!supabase) return null;
  try {
    const turnstileToken = await getTurnstileToken('smart_apply_chat');
    const { data, error } = await supabase.functions.invoke('smart-apply-chat', {
      body: {
        language: state.language,
        profileSummary: profileSummary(state),
        currentQuestion: context.currentQuestion,
        allowedOptions: context.allowedOptions,
        currentIntent: context.currentIntent,
        currentStep: context.currentStep,
        mode: context.mode,
        studentMessage: userText,
        turnstileToken,
      },
    });
    if (error) return null;
    return data?.decision || null;
  } catch {
    return null;
  }
}
