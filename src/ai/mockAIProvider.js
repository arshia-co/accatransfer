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
import { realChat, isRealChatConfigured } from './realChatProvider';
import {
  buildGuidedContext,
  guidedDecisionResult,
  localGuidedDecision,
  validateGuidedDecision,
} from './guidedSelection';

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
  INTENTS.GUIDED_CONFIRM_OPTION,
  INTENTS.GUIDED_CANCEL_CONFIRMATION,
]);

/**
 * Sends an intent (button tap) to the "AI" and resolves with the engine result.
 * @returns {Promise<{messages, patch, openLoginGate, effect}>}
 */
export async function sendIntent(intent, value, state) {
  await delay(rand(420, 700)); // simulated network/inference latency
  return runIntent(intent, value, state);
}

/**
 * Sends free text to the AI classifier. It may explain, redirect, or suggest
 * an allowed option, but only the deterministic flow engine can move forward.
 */
export async function sendText(text, state) {
  await delay(rand(260, 480));
  const interpreted = interpretFreeText(text, state);

  if (interpreted?.route && STRUCTURED_INTENTS.has(interpreted.route.intent)) {
    return runIntent(interpreted.route.intent, interpreted.route.value, state);
  }

  if (interpreted?.result) return interpreted.result;

  const context = buildGuidedContext(state);
  if (!context.allowedOptions.length) {
    if (!interpreted) return { messages: [], patch: {} };
    const { intent, value } = interpreted.route;
    return runIntent(intent, value, state);
  }

  let decision = null;
  if (isRealChatConfigured) {
    decision = await realChat({ state, userText: text, context });
  }

  const validatedDecision = validateGuidedDecision(
    decision || localGuidedDecision({ context, studentMessage: text, language: state.language }),
    context,
    text,
    state.language,
  );
  const guided = guidedDecisionResult({ decision: validatedDecision, context, state });

  if (guided?.selected) {
    return runIntent(guided.selected.nextIntent, guided.selected.value, state);
  }
  if (guided?.result) return guided.result;

  return runIntent(INTENTS.FREE_TEXT, text, state);
}
