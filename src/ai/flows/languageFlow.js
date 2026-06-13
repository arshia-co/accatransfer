// Flow 1 — welcome + language selection.
import { INTENTS } from '../intents';
import { aiMsg, action } from '../messageKit';
import { startGoalQuestion } from './goalFlow';

const WELCOME = {
  en: 'ACCA Smart Apply\nWelcome · خوش آمدید · Hoş geldiniz · أهلاً بك',
};

const LANGUAGE_QUESTION =
  'First, choose the language that feels easiest.‎\n«ابتدا زبانی را انتخاب کنید که برایتان راحت‌تر است.»';

const OTHER_LANG_NOTE = {
  en: 'No problem — we’ll continue in English for now. More languages are coming with the full release. 🌍',
};

const GREETING_BY_LANG = {
  fa: 'بسیار خوب. من دستیار پذیرش آکا هستم. بدون فرم طولانی و بدون نیاز به ورود، قدم بعدی مناسب را با هم پیدا می‌کنیم.',
  en: 'Perfect. I’m the ACCA admission assistant. No long form and no account needed to begin — we’ll work out your best next step together.',
  tr: 'Harika. Ben ACCA kabul asistanıyım. Uzun form yok ve başlamak için hesap gerekmiyor — en doğru sonraki adımı birlikte bulacağız.',
  ar: 'رائع. أنا مساعد القبول من ACCA. لا نموذج طويل ولا حاجة إلى حساب للبدء — سنحدد معاً أفضل خطوة تالية لك.',
};

export function buildBootMessages() {
  // Welcome is intentionally bilingual-neutral: language is not chosen yet.
  return [
    aiMsg('en', WELCOME.en),
    aiMsg('en', LANGUAGE_QUESTION, {
      actions: [
        action('fa', 'فارسی', 'fa', INTENTS.SET_LANGUAGE),
        action('en', 'English', 'en', INTENTS.SET_LANGUAGE),
        action('tr', 'Türkçe', 'tr', INTENTS.SET_LANGUAGE),
        action('ar', 'العربية', 'ar', INTENTS.SET_LANGUAGE),
        action('en', 'Other', 'other', INTENTS.SET_LANGUAGE),
      ],
    }),
  ];
}

export const languageFlow = {
  [INTENTS.BOOT]: () => ({
    messages: buildBootMessages(),
    patch: { currentIntent: INTENTS.SET_LANGUAGE, currentStep: 'awaiting_language' },
  }),

  [INTENTS.SET_LANGUAGE]: ({ value }) => {
    const isOther = value === 'other';
    const lang = isOther ? 'en' : value;
    const messages = [];
    if (isOther) messages.push(aiMsg('en', OTHER_LANG_NOTE));
    else messages.push(aiMsg(lang, GREETING_BY_LANG[lang]));
    // One-time path preview, so the student pictures the steps ahead.
    messages.push(aiMsg(lang, '', { component: 'journey_map' }));
    messages.push(startGoalQuestion(lang));
    return {
      messages,
      patch: {
        language: lang,
        currentIntent: INTENTS.SET_GOAL,
        currentStep: 'awaiting_goal',
        studentProfile: { preferredLanguage: lang },
      },
    };
  },
};
