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
import { matchKnowledge } from '../data/knowledgeBase';
import { answerFromKnowledge } from './flows/faqFlow';

const HANDLERS = {
  ...languageFlow,
  ...goalFlow,
  ...majorDiscoveryFlow,
  ...admissionFlow,
  ...documentFlow,
  ...faqFlow,
};

/** Runs one intent through its flow handler. */
export function runIntent(intent, value, state) {
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

const GOAL_HINTS = [
  { value: 'unknown_major', words: ['نمیدونم', 'نمی‌دانم', 'بلد نیستم', "don't know", 'dont know', 'not sure', 'bilmiyorum', 'لا أعرف', 'کدام رشته', 'which major'] },
  { value: 'apply', words: ['اپلای', 'درخواست', 'apply', 'başvur', 'التقديم', 'ثبت نام', 'register'] },
  { value: 'known_major', words: ['دانشگاه', 'university', 'üniversite', 'جامعة', 'رشته‌ام', 'my major'] },
];

/**
 * Naive demo "NLU" for the free-text composer.
 * Order matters: step-specific capture → language → knowledge base → goals.
 * Returns either an intent route or a direct result (for KB answers).
 */
export function interpretFreeText(text, state) {
  const t = String(text || '').trim();
  if (!t) return null;
  const lower = t.toLowerCase();

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

  // 3. Knowledge base lookup (FAQ-style questions typed anywhere).
  const entry = matchKnowledge(lower);
  if (entry) {
    return {
      result: {
        messages: answerFromKnowledge(state.language, entry),
        patch: { currentStep: `faq_${entry.id}` },
      },
    };
  }

  // 4. Goal hints ("I want to apply", …).
  for (const hint of GOAL_HINTS) {
    if (hint.words.some((w) => lower.includes(w))) {
      return { route: { intent: INTENTS.SET_GOAL, value: hint.value } };
    }
  }

  // 5. Fallback.
  return { route: { intent: INTENTS.FREE_TEXT, value: t } };
}
