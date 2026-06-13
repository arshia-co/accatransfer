// Flow 6 — FAQ over the mini knowledge base.
import { INTENTS } from '../intents';
import { aiMsg, action } from '../messageKit';
import { KNOWLEDGE_BASE, findKnowledgeEntry } from '../../data/knowledgeBase';

const FAQ_INTRO = {
  fa: 'حتماً. سؤال‌تان را به زبان خودتان بنویسید. برای شروع، این سه موضوع بیشتر پرسیده می‌شوند:',
  en: 'Of course. Ask in your own words. To get started, these three topics come up most often:',
  tr: 'Elbette. Sorunuzu kendi sözlerinizle yazın. Başlangıç için en sık bu üç konu soruluyor:',
  ar: 'بالطبع. اطرح سؤالك بكلماتك. للبدء، هذه أكثر ثلاثة موضوعات شيوعاً:',
};

const MORE_QUESTIONS = {
  fa: 'سؤال دیگری هم هست؟ این‌ها هم پرتکرارند:',
  en: 'Anything else? These come up a lot too:',
  tr: 'Başka bir şey var mı? Bunlar da sık soruluyor:',
  ar: 'هل من شيء آخر؟ هذه أيضاً تتكرر كثيراً:',
};

const CTA_DISCOVERY = {
  fa: 'کشف رشته مناسب من',
  en: 'Discover my best-fit major',
  tr: 'Bana uygun bölümü keşfet',
  ar: 'اكتشف تخصصي المناسب',
};
const CTA_BACK = { fa: 'بازگشت به مسیرهای اصلی', en: 'Back to the main paths', tr: 'Ana yollara dön', ar: 'العودة للمسارات الرئيسية' };
const CTA_COUNSELOR = { fa: 'گفت‌وگو با مشاور', en: 'Talk to a counselor', tr: 'Danışmanla görüş', ar: 'تحدث مع مستشار' };

function questionChips(lang, { excludeId, limit } = {}) {
  return KNOWLEDGE_BASE
    .filter((e) => e.id !== excludeId)
    .slice(0, limit ?? KNOWLEDGE_BASE.length)
    .map((e) => action(lang, e.question, e.id, INTENTS.FAQ_QUESTION));
}

export function startFaq(lang, basePatch = {}) {
  return {
    messages: [
      aiMsg(lang, FAQ_INTRO, {
        actions: [
          ...questionChips(lang, { limit: 3 }),
          action(lang, CTA_BACK, 'goals', INTENTS.BACK_TO_GOALS, { icon: 'Undo2' }),
        ],
      }),
    ],
    patch: { ...basePatch, currentIntent: INTENTS.FAQ_QUESTION, currentStep: 'faq' },
  };
}

export function answerFromKnowledge(lang, entry) {
  return [
    aiMsg(lang, entry.answer),
    aiMsg(lang, MORE_QUESTIONS, {
      actions: [
        ...questionChips(lang, { excludeId: entry.id, limit: 3 }),
        action(lang, CTA_DISCOVERY, 'discovery', INTENTS.DISCOVERY_START, { icon: 'Compass' }),
        action(lang, CTA_COUNSELOR, 'counselor', INTENTS.TALK_TO_COUNSELOR, { icon: 'MessageCircle' }),
      ],
    }),
  ];
}

export const faqFlow = {
  [INTENTS.FAQ_START]: ({ state }) => startFaq(state.language),

  [INTENTS.FAQ_QUESTION]: ({ value, state }) => {
    const lang = state.language;
    const entry = findKnowledgeEntry(value);
    if (!entry) return startFaq(lang);
    return {
      messages: answerFromKnowledge(lang, entry),
      patch: { currentStep: `faq_${entry.id}` },
    };
  },
};
