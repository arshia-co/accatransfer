// AI provider — the single seam between the UI/store and "the AI".
//
// Two modes, chosen automatically:
//  • Mock (no backend): the local conversation engine + simulated latency, so
//    the public demo always runs with zero config.
//  • Real (Supabase configured): open questions / FAQ / free chat are answered
//    by OpenAI via the secure `smart-apply-chat` Edge Function. The structured
//    steps (language pick, name, the 25-question Major Discovery, goal routing,
//    the admission funnel) stay deterministic — fast, consistent, no token cost.
import { runIntent, interpretFreeText } from './conversationEngine.mock';
import { INTENTS } from './intents';
import { aiMsg, action } from './messageKit';
import { goalActions } from './flows/goalFlow';
import { realChat, isRealChatConfigured } from './realChatProvider';

const rand = (min, max) => min + Math.random() * (max - min);

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Reading/typing pace for one message, in ms (capped to keep the demo snappy). */
export function typingDelayFor(message, index = 0) {
  const len = (message.content || '').length;
  const base = message.component ? 750 : 350;
  const extra = message.meta?.thinkLonger ? 900 : 0;
  const firstPause = index === 0 ? 250 : 0;
  return Math.min(1800, base + firstPause + extra + len * 6 + rand(0, 180));
}

// Free text we always keep deterministic (capturing a choice, not chatting).
const STRUCTURED_INTENTS = new Set([
  INTENTS.SET_LANGUAGE,
  INTENTS.DISCOVERY_SET_NAME,
  INTENTS.DISCOVERY_FREE_TEXT,
  INTENTS.SET_GOAL,
]);

const BACK_LABEL = { fa: 'بازگشت به مسیرهای اصلی', en: 'Back to the main paths', tr: 'Ana yollara dön', ar: 'العودة إلى المسارات الرئيسية' };
const COUNSELOR_LABEL = { fa: 'گفت‌وگو با مشاور', en: 'Talk to a counselor', tr: 'Danışmanla görüş', ar: 'تحدث مع مستشار' };

// Keep the student moving after a free-form AI answer, so quick replies never
// disappear for good.
function followupActions(state) {
  const lang = state.language;
  if (state.currentStep === 'awaiting_goal') return goalActions(lang);
  return [
    action(lang, BACK_LABEL, 'goals', INTENTS.BACK_TO_GOALS, { icon: 'Undo2' }),
    action(lang, COUNSELOR_LABEL, 'counselor', INTENTS.TALK_TO_COUNSELOR, { icon: 'MessageCircle' }),
  ];
}

/**
 * Sends an intent (button tap) to the "AI" and resolves with the engine result.
 * @returns {Promise<{messages, patch, openLoginGate, effect}>}
 */
export async function sendIntent(intent, value, state) {
  await delay(rand(420, 700)); // simulated network/inference latency
  return runIntent(intent, value, state);
}

/**
 * Sends free text to the "AI". Structured captures stay local; open questions
 * go to the real model when configured, with a mock fallback on any failure.
 */
export async function sendText(text, state) {
  await delay(rand(260, 480));
  const interpreted = interpretFreeText(text, state);

  if (interpreted?.route && STRUCTURED_INTENTS.has(interpreted.route.intent)) {
    return runIntent(interpreted.route.intent, interpreted.route.value, state);
  }

  if (isRealChatConfigured) {
    const reply = await realChat({ state, userText: text });
    if (reply) {
      return { messages: [aiMsg(state.language, reply, { actions: followupActions(state) })], patch: {} };
    }
    // fall through to mock answer on provider failure
  }

  if (!interpreted) return { messages: [], patch: {} };
  if (interpreted.result) return interpreted.result;
  const { intent, value } = interpreted.route;
  return runIntent(intent, value, state);
}
