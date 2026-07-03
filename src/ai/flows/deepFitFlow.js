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
import { classifyDiscoveryText, optionShortMeaning } from '../discoveryAssistant';

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
  fa: 'تحلیل عمیق آماده است. پاسخ‌ها را از زاویه علایق، ترجیح یادگیری، انگیزه، توان تحصیلی، محیط مطلوب، واقعیت مسیر و تصویر آینده کنار هم گذاشتم. نتیجه زیر یک «نقشه تصمیم آموزشی» است، نه یک برچسب شخصیتی یا تشخیص روان‌شناختی.',
  en: 'Your deep analysis is ready. I cross-read your answers across interests, learning preferences, motivation, academic strengths, preferred environment, path reality, and future identity. The result is an educational decision map, not a personality label or psychological diagnosis.',
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

const CONFIRM_MAP = {
  fa: (label, reason) => `از توضیحی که دادی، این گزینه به پاسخ تو نزدیک‌تر است:\n«${label}»\n\nچرا؟ ${reason}\n\nاگر درست است، همین را برای پروفایل عمیق ثبت کنم؟`,
  en: (label, reason) => `From what you wrote, this option is closest to your answer:\n“${label}”\n\nWhy: ${reason}\n\nIf this is right, should I save it for your deep profile?`,
};
const CONFIRM_YES = { fa: 'بله، همین را ثبت کن', en: 'Yes, save this' };
const COMPARE_LEAD = {
  fa: 'به نظر می‌رسد بین دو گزینه نزدیک مانده‌ای. تفاوتشان را دقیق‌تر ولی ساده می‌گویم:',
  en: 'It sounds like you are between two close options. Here is the difference in simple terms:',
};
const COMPARE_FOOTER = {
  fa: 'گزینه‌ای را انتخاب کن که در رفتار واقعی تو بیشتر تکرار می‌شود. اگر فقط دوست داری آن‌طور باشی ولی معمولاً این‌طور عمل نمی‌کنی، گزینه دیگر ممکن است دقیق‌تر باشد.',
  en: 'Choose the one that happens more often in your real behavior. If you only wish you were like that but usually act differently, the other option may be more accurate.',
};
const OPTION_GUIDE_TITLE = {
  fa: 'راهنمای ساده گزینه‌ها:',
  en: 'Plain option guide:',
};
const GENERAL_SELECTION_NOTE = {
  fa: 'به زبان ساده: این سؤال دنبال پاسخ ایده‌آل نیست؛ دنبال الگوی واقعی رفتار، یادگیری و تصمیم‌گیری توست.',
  en: 'In simple terms: this question is not looking for an ideal answer; it is looking for your real pattern of behavior, learning, and decision-making.',
};
const HELP_REASSURE = {
  fa: 'اینجا پاسخ درست یا غلط نداریم. نزدیک‌ترین گزینه به رفتار واقعی خودت را انتخاب کن؛ اگر بین دو گزینه ماندی، می‌توانی بنویسی «بین اول و سوم موندم» تا مقایسه‌شان کنم.',
  en: 'There is no right or wrong answer here. Choose what is closest to your real behavior; if you are stuck between two, type “between first and third” and I will compare them.',
};
const UNSURE = {
  fa: 'دقیق مطمئن نشدم کدام گزینه را می‌گویی. می‌توانی یکی از گزینه‌ها را بزنی، یا با یک مثال کوتاه‌تر بگویی معمولاً چه کار می‌کنی تا راهنمایی‌ات کنم.',
  en: 'I’m not fully sure which option you mean. You can tap one option, or give me a shorter example of what you usually do and I’ll guide you.',
};
const VOICE_UNSURE = {
  fa: 'پاسخ صوتی‌ات برای انتخاب گزینه شفافیت کافی نداشت. برای اینکه اشتباه ثبت نکنم، لطفاً میکروفون را دوباره بزن و واضح‌تر بگو، یا یکی از گزینه‌ها را انتخاب کن.',
  en: 'Your voice answer was not clear enough for me to choose an option safely. To avoid a wrong selection, tap the microphone again and say it more clearly, or choose one option.',
};
const VOICE_ACCEPTED = {
  fa: (label, reason) => `پاسخ صوتی‌ات را با اطمینان کافی فهمیدم و این گزینه را برای پروفایل عمیق ثبت کردم:\n«${label}»\n\n${reason}`,
  en: (label, reason) => `I understood your voice answer with enough confidence and saved this option for your deep profile:\n“${label}”\n\n${reason}`,
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

function optionGuide(item, lang) {
  return [
    L(OPTION_GUIDE_TITLE, lang),
    ...item.options.map((option) => `• ${L(option.label, lang)} — ${optionShortMeaning(option, lang)}`),
  ].join('\n');
}

function deepFitExplanationForQuestion(item, lang) {
  const question = L(item.text, lang);
  const base = (EXPLAIN[lang] || EXPLAIN.en)(question);
  return [
    base,
    L(GENERAL_SELECTION_NOTE, lang),
    optionGuide(item, lang),
  ].filter(Boolean).join('\n\n');
}

function comparisonMessage(lang, item, candidates = []) {
  const [first, second] = candidates
    .map((candidate) => {
      const option = item.options.find((entry) => entry.id === candidate.optionId);
      return option ? { option, reason: candidate.reason } : null;
    })
    .filter(Boolean);
  if (!first || !second) return null;
  return [
    L(COMPARE_LEAD, lang),
    `1. ${L(first.option.label, lang)}\n   ${first.reason}\n   ${optionShortMeaning(first.option, lang)}`,
    `2. ${L(second.option.label, lang)}\n   ${second.reason}\n   ${optionShortMeaning(second.option, lang)}`,
    L(COMPARE_FOOTER, lang),
  ].join('\n\n');
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
          deepFitExplanationForQuestion(item, state.language),
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

  [INTENTS.DEEP_FIT_FREE_TEXT]: ({ value, state }) => {
    const lang = state.language;
    const answerCount = state.deepFitAnswers?.length || 0;
    const item = questionAt(answerCount, state.deepFitAdaptiveIds || []);
    if (!item) return { messages: [], patch: {} };
    const isVoiceInput = state.inputMode === 'voice';
    const verdict = classifyDiscoveryText(value, item, lang, { mode: isVoiceInput ? 'voice' : 'text' });
    const stepPatch = {
      currentIntent: INTENTS.DEEP_FIT_ANSWER,
      currentStep: `deep_fit_q_${answerCount}`,
    };

    if (verdict.kind === 'map') {
      const option = item.options.find((entry) => entry.id === verdict.optionId);
      if (!option) return { messages: [], patch: stepPatch };
      if (isVoiceInput && (verdict.confidence || 0) >= 0.68) {
        const next = deepFitFlow[INTENTS.DEEP_FIT_ANSWER]({ value: verdict.optionId, state });
        return {
          ...next,
          messages: [
            aiMsg(lang, (VOICE_ACCEPTED[lang] || VOICE_ACCEPTED.en)(
              L(option.label, lang),
              verdict.reason || optionShortMeaning(option, lang),
            ), {
              meta: { tone: 'assist' },
            }),
            ...(next.messages || []),
          ],
        };
      }
      return {
        messages: [
          aiMsg(lang, (CONFIRM_MAP[lang] || CONFIRM_MAP.en)(
            L(option.label, lang),
            verdict.reason || optionShortMeaning(option, lang),
          ), {
            meta: { tone: 'assist' },
            actions: [
              action(lang, CONFIRM_YES, verdict.optionId, INTENTS.DEEP_FIT_ANSWER, { variant: 'primary', icon: 'CheckCircle2' }),
              ...questionActions(lang, item),
            ],
          }),
        ],
        patch: stepPatch,
      };
    }

    if (verdict.kind === 'compare') {
      const candidateIds = new Set((verdict.candidates || []).map((candidate) => candidate.optionId));
      const candidateActions = (verdict.candidates || [])
        .map((candidate) => item.options.find((option) => option.id === candidate.optionId))
        .filter(Boolean)
        .map((option) => action(lang, option.label, option.id, INTENTS.DEEP_FIT_ANSWER, { variant: 'primary', icon: 'CheckCircle2' }));
      const remainingActions = questionActions(lang, item).filter((entry) => !candidateIds.has(entry.value));
      return {
        messages: [
          aiMsg(lang, comparisonMessage(lang, item, verdict.candidates) || HELP_REASSURE, {
            meta: { tone: 'assist' },
            actions: [
              ...candidateActions,
              ...remainingActions,
            ],
          }),
        ],
        patch: stepPatch,
      };
    }

    if (verdict.kind === 'clarify') {
      return {
        messages: [
          aiMsg(lang, verdict.glossary.explain, { meta: { tone: 'assist' } }),
          aiMsg(lang, deepFitExplanationForQuestion(item, lang), {
            meta: { tone: 'assist' },
            actions: questionActions(lang, item),
          }),
        ],
        patch: stepPatch,
      };
    }

    if (verdict.kind === 'kb') {
      return {
        messages: [
          aiMsg(lang, verdict.kb.answer, { meta: { tone: 'assist' } }),
          questionMessage(lang, answerCount, state.deepFitAdaptiveIds || []),
        ],
        patch: stepPatch,
      };
    }

    return {
      messages: [
        aiMsg(lang, verdict.kind === 'help' ? HELP_REASSURE : isVoiceInput ? VOICE_UNSURE : UNSURE, {
          meta: { tone: 'assist' },
          actions: questionActions(lang, item),
        }),
      ],
      patch: stepPatch,
    };
  },
};
