// Mock conversation engine.
// Pure routing layer: (intent, value, state) → { messages, patch, openLoginGate, effect }.
// The UI never talks to flows directly — it dispatches intents through the
// mockAIProvider, which calls this engine. Swapping in a real AI backend means
// re-implementing `runIntent`/`interpretFreeText` server-side with the same contract.
import { INTENTS } from './intents';
import { languageFlow } from './flows/languageFlow';
import { goalFlow } from './flows/goalFlow';
import { majorDiscoveryFlow } from './flows/majorDiscoveryFlow';
import { admissionFlow } from './flows/admissionFlow';
import { documentFlow } from './flows/documentFlow';
import { faqFlow } from './flows/faqFlow';
import { deepFitFlow } from './flows/deepFitFlow';
import { matchKnowledge } from '../data/knowledgeBase';
import { answerFromKnowledge } from './flows/faqFlow';
import { cancelGuidedConfirmation, pendingConfirmationRoute } from './guidedSelection';

const HANDLERS = {
  ...languageFlow,
  ...goalFlow,
  ...majorDiscoveryFlow,
  ...admissionFlow,
  ...documentFlow,
  ...faqFlow,
  ...deepFitFlow,
};

/** Runs one intent through its flow handler. */
export function runIntent(intent, value, state) {
  if (intent === INTENTS.GUIDED_CONFIRM_OPTION) {
    const pending = state.pendingOptionConfirmation;
    if (!pending || String(pending.optionId) !== String(value)) {
      return cancelGuidedConfirmation(state) || HANDLERS[INTENTS.FREE_TEXT]({ state });
    }
    const result = runIntent(
      pending.nextIntent,
      pending.value,
      { ...state, pendingOptionConfirmation: null },
    );
    return {
      ...result,
      patch: { ...(result.patch || {}), pendingOptionConfirmation: null },
    };
  }
  if (intent === INTENTS.GUIDED_CANCEL_CONFIRMATION) {
    return cancelGuidedConfirmation(state) || HANDLERS[INTENTS.FREE_TEXT]({ state });
  }
  const handler = HANDLERS[intent];
  if (!handler) {
    // Unknown intent → gentle fallback through the goal menu.
    return HANDLERS[INTENTS.FREE_TEXT]({ state });
  }
  return handler({ value, state });
}

const LANGUAGE_HINTS = [
  { lang: 'fa', words: ['فارسی', 'farsi', 'persian', 'ایران'] },
  { lang: 'en', words: ['english', 'انگلیسی', 'ingilizce'] },
  { lang: 'tr', words: ['türkçe', 'turkce', 'turkish', 'ترکی'] },
  { lang: 'ar', words: ['العربية', 'عربي', 'arabic', 'arapça'] },
];

/**
 * Naive demo "NLU" for the free-text composer.
 * Order matters: confirmation → step capture → language → scoped knowledge.
 * Returns either an intent route or a direct result (for KB answers).
 */
export function interpretFreeText(text, state) {
  const t = String(text || '').trim();
  if (!t) return null;
  const lower = t.toLowerCase();

  const pendingRoute = pendingConfirmationRoute(t, state);
  if (pendingRoute) return { route: pendingRoute };

  // 1. Step-aware capture: the name question accepts raw text.
  if (state.currentStep === 'discovery_name') {
    return { route: { intent: INTENTS.DISCOVERY_SET_NAME, value: t } };
  }

  // 1b. Mid-discovery free text → smart help (clarify a term, answer a side
  // question, or map their words to an option for confirmation). The flow
  // keeps the current question reachable, so the student never loses progress.
  if (typeof state.currentStep === 'string' && state.currentStep.startsWith('discovery_q_')) {
    return { route: { intent: INTENTS.DISCOVERY_FREE_TEXT, value: t } };
  }

  // 2. Explicit language switch.
  if (state.currentStep === 'awaiting_language') {
    for (const hint of LANGUAGE_HINTS) {
      if (hint.words.some((w) => lower.includes(w))) {
        return { route: { intent: INTENTS.SET_LANGUAGE, value: hint.lang } };
      }
    }
    return { route: { intent: INTENTS.SET_LANGUAGE, value: 'other' } };
  }

  // 3. Knowledge base lookup is available only inside the explicit FAQ flow.
  // During guided questions, side questions return to the current options.
  const inFaq = String(state.currentStep || '').startsWith('faq')
    || state.currentIntent === INTENTS.FAQ_QUESTION;
  const entry = inFaq ? matchKnowledge(lower) : null;
  if (entry) {
    return {
      result: {
        messages: answerFromKnowledge(state.language, entry),
        patch: { currentStep: `faq_${entry.id}` },
      },
    };
  }

  // 4. Fallback. The constrained provider handles option matching and asks
  // for confirmation before the deterministic flow engine moves forward.
  return { route: { intent: INTENTS.FREE_TEXT, value: t } };
}
