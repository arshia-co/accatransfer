import { INTENTS } from '../intents';
import { action, aiMsg } from '../messageKit';
import { L } from '../../lib/lang';
import {
  DEEP_FIT_ADAPTIVE_COUNT,
  DEEP_FIT_CORE_QUESTIONS,
  DEEP_FIT_CORE_TOTAL,
  DISCOVERY_SECTION_COUNT,
  findDeepFitQuestion,
} from '../../data/deepFitQuestions';
import {
  buildDeepFitRecap,
  computeDeepFitResult,
  selectAdaptiveQuestionIds,
} from '../deepFitScoring';

const INTRO = {
  fa: 'حالا وارد ACCA Deep Fit می‌شویم؛ نسخه کامل‌تر پروفایل راهنمایی آموزشی شما. پاسخ‌های تست اولیه حفظ شده‌اند و از همان نقطه ادامه می‌دهیم. این بخش حدود ۵ تا ۷ دقیقه زمان می‌برد و پیشنهادها را از حوزه‌های کلی به مسیرهای دقیق‌تر و بین‌رشته‌ای می‌رساند.',
  en: 'Now we move into ACCA Deep Fit, the fuller version of your educational guidance profile. Your earlier answers are preserved, so we continue from where you stopped. This section takes about 5-7 minutes and moves from broad fields to more precise, interdisciplinary paths.',
};

const RESUME = {
  fa: (current, total) => `پروفایل عمیق تو در حافظه مانده است. از سؤال ${current} از ${total} ادامه می‌دهیم؛ هیچ پاسخی از بین نرفته.`,
  en: (current, total) => `Your deep profile is saved. We will continue from question ${current} of ${total}; none of your answers were lost.`,
};

const ADAPTIVE_LEAD = {
  fa: `۵۲ سؤال اصلی کامل شد. حالا ${DEEP_FIT_ADAPTIVE_COUNT} سؤال کوتاه و تطبیقی می‌پرسم تا بین مسیرهای نزدیک، تفاوت‌های مهم را روشن کنم.`,
  en: `The 52 core questions are complete. I will now ask ${DEEP_FIT_ADAPTIVE_COUNT} short adaptive questions to distinguish between your closest paths.`,
};

const RESULT_LEAD = {
  fa: 'تحلیل عمیق آماده است. پاسخ‌ها را از زاویه سبک شناختی، علایق، انگیزه، توان تحصیلی، محیط مطلوب و تصویر آینده کنار هم گذاشتم. نتیجه زیر یک «نقشه تصمیم» است، نه یک برچسب شخصیتی.',
  en: 'Your deep analysis is ready. I cross-read your answers across cognitive style, interests, motivation, academic strengths, preferred environment, and future identity. The result is a decision map, not a personality label.',
};

const EXPLAIN = {
  fa: (question) => `این سؤال می‌خواهد تفاوت بین «علاقه به یک موضوع» و «راحت‌بودن با واقعیت روزمره آن مسیر» را روشن کند.\n\nسؤال فعلی:\n«${question}»\n\nنزدیک‌ترین گزینه به رفتار واقعی خودت را انتخاب کن؛ پاسخ ایده‌آل یا درست وجود ندارد.`,
  en: (question) => `This question separates interest in a subject from comfort with the daily reality of that path.\n\nCurrent question:\n“${question}”\n\nChoose the option closest to your real behavior. There is no ideal or correct answer.`,
};

const LABELS = {
  explain: { fa: 'این سؤال چه چیزی را می‌سنجد؟', en: 'What is this question checking?' },
  account: { fa: 'مشاهده در پنل مرکزی', en: 'View in central account' },
  universities: { fa: 'بررسی دانشگاه‌های متناسب', en: 'Explore matching universities' },
  documents: { fa: 'ادامه با مدارک تحصیلی', en: 'Continue with academic documents' },
  counselor: { fa: 'مرور نتیجه با مشاور', en: 'Review with a counselor' },
};

const RECAP_STAGES = new Set([30, 36, 42, 48]);

function totalFor(adaptiveIds) {
  return DEEP_FIT_CORE_TOTAL + Math.max(DEEP_FIT_ADAPTIVE_COUNT, adaptiveIds?.length || 0);
}

function questionAt(answerCount, adaptiveIds) {
  if (answerCount < DEEP_FIT_CORE_TOTAL) return DEEP_FIT_CORE_QUESTIONS[answerCount] || null;
  return findDeepFitQuestion(adaptiveIds?.[answerCount - DEEP_FIT_CORE_TOTAL]) || null;
}

function questionActions(lang, item) {
  return [
    ...item.options.map((candidate) => action(
      lang,
      candidate.label,
      candidate.id,
      INTENTS.DEEP_FIT_ANSWER,
    )),
    action(lang, LABELS.explain, 'explain', INTENTS.DEEP_FIT_EXPLAIN, {
      variant: 'help',
      icon: 'MessageCircleQuestion',
    }),
  ];
}

function questionMessage(lang, answerCount, adaptiveIds) {
  const item = questionAt(answerCount, adaptiveIds);
  if (!item) return null;
  return aiMsg(lang, item.text, {
    meta: {
      progress: answerCount + 1,
      total: totalFor(adaptiveIds),
      deepFit: true,
    },
    actions: questionActions(lang, item),
  });
}

function resultMessages(lang, result) {
  return [
    aiMsg(lang, RESULT_LEAD, { meta: { thinkLonger: true } }),
    aiMsg(lang, '', {
      component: 'deep_fit_result',
      payload: result,
      actions: [
        action(lang, LABELS.account, 'account', INTENTS.OPEN_ACCOUNT, { variant: 'primary', icon: 'LayoutDashboard' }),
        action(lang, LABELS.universities, 'universities', INTENTS.DISCOVERY_SEE_UNIVERSITIES, { icon: 'Building2' }),
        action(lang, LABELS.documents, 'documents', INTENTS.DOCUMENTS_OVERVIEW, { icon: 'FileText' }),
        action(lang, LABELS.counselor, 'counselor', INTENTS.TALK_TO_COUNSELOR, { icon: 'MessageCircle' }),
      ],
    }),
  ];
}

export const deepFitFlow = {
  [INTENTS.DEEP_FIT_START]: ({ state }) => {
    const lang = state.language;
    if (state.deepFitResult) {
      return {
        messages: resultMessages(lang, state.deepFitResult),
        patch: {
          currentIntent: INTENTS.DEEP_FIT_START,
          currentStep: 'deep_fit_done',
          deepFitStatus: 'completed',
        },
      };
    }

    const savedAnswers = Array.isArray(state.deepFitAnswers) ? state.deepFitAnswers : [];
    // The 25 guest-discovery answers are authoritative for the first section and
    // must never be re-asked. Seed them first, then keep any Deep-Fit-only
    // answers (question 26 onward) that the student already gave.
    const discoveryAnswers = Array.isArray(state.discoveryAnswers)
      ? state.discoveryAnswers.slice(0, DISCOVERY_SECTION_COUNT)
      : [];
    const seededAnswers = discoveryAnswers.length
      ? [...discoveryAnswers, ...savedAnswers.slice(discoveryAnswers.length)]
      : savedAnswers;
    const adaptiveIds = seededAnswers.length >= DEEP_FIT_CORE_TOTAL
      ? (state.deepFitAdaptiveIds?.length
          ? state.deepFitAdaptiveIds
          : selectAdaptiveQuestionIds(seededAnswers))
      : (state.deepFitAdaptiveIds || []);
    const item = questionMessage(lang, seededAnswers.length, adaptiveIds);
    const isResume = state.deepFitStatus === 'in_progress' || savedAnswers.length > 0;
    const total = totalFor(adaptiveIds);

    return {
      messages: [
        aiMsg(
          lang,
          isResume
            ? (RESUME[lang] || RESUME.en)(seededAnswers.length + 1, total)
            : INTRO,
          { meta: { tone: isResume ? 'recap' : 'note' } },
        ),
        item,
      ].filter(Boolean),
      patch: {
        deepFitAnswers: seededAnswers,
        deepFitAdaptiveIds: adaptiveIds,
        deepFitStatus: 'in_progress',
        currentIntent: INTENTS.DEEP_FIT_ANSWER,
        currentStep: `deep_fit_q_${seededAnswers.length}`,
      },
    };
  },

  [INTENTS.DEEP_FIT_ANSWER]: ({ value, state }) => {
    const lang = state.language;
    const answers = [...(state.deepFitAnswers || []), value];
    let adaptiveIds = state.deepFitAdaptiveIds || [];
    const messages = [];

    if (answers.length === DEEP_FIT_CORE_TOTAL) {
      adaptiveIds = adaptiveIds.length ? adaptiveIds : selectAdaptiveQuestionIds(answers);
      messages.push(aiMsg(lang, ADAPTIVE_LEAD, { meta: { tone: 'recap' } }));
    } else if (RECAP_STAGES.has(answers.length)) {
      const recap = buildDeepFitRecap(answers, answers.length);
      if (recap) messages.push(aiMsg(lang, recap, { meta: { tone: 'recap' } }));
    }

    const next = questionMessage(lang, answers.length, adaptiveIds);
    if (next) {
      messages.push(next);
      return {
        messages,
        patch: {
          deepFitAnswers: answers,
          deepFitAdaptiveIds: adaptiveIds,
          deepFitStatus: 'in_progress',
          currentIntent: INTENTS.DEEP_FIT_ANSWER,
          currentStep: `deep_fit_q_${answers.length}`,
        },
      };
    }

    const result = computeDeepFitResult(answers, adaptiveIds);
    return {
      messages: [...messages, ...resultMessages(lang, result)],
      patch: {
        deepFitAnswers: answers,
        deepFitAdaptiveIds: adaptiveIds,
        deepFitResult: result,
        deepFitStatus: 'completed',
        currentIntent: INTENTS.DEEP_FIT_START,
        currentStep: 'deep_fit_done',
        recommendedMajors: result.catalogMajors || state.recommendedMajors,
      },
    };
  },

  [INTENTS.DEEP_FIT_RESHOW]: ({ state }) => ({
    messages: [
      questionMessage(
        state.language,
        state.deepFitAnswers?.length || 0,
        state.deepFitAdaptiveIds || [],
      ),
    ].filter(Boolean),
    patch: {
      currentIntent: INTENTS.DEEP_FIT_ANSWER,
      currentStep: `deep_fit_q_${state.deepFitAnswers?.length || 0}`,
    },
  }),

  [INTENTS.DEEP_FIT_EXPLAIN]: ({ state }) => {
    const answerCount = state.deepFitAnswers?.length || 0;
    const item = questionAt(answerCount, state.deepFitAdaptiveIds || []);
    if (!item) return { messages: [], patch: {} };
    return {
      messages: [
        aiMsg(
          state.language,
          (EXPLAIN[state.language] || EXPLAIN.en)(L(item.text, state.language)),
          {
            meta: { tone: 'assist' },
            actions: questionActions(state.language, item),
          },
        ),
      ],
      patch: {
        currentIntent: INTENTS.DEEP_FIT_ANSWER,
        currentStep: `deep_fit_q_${answerCount}`,
      },
    };
  },
};
