import { INTENTS } from './intents';
import { aiMsg, action } from './messageKit';

export const GUIDED_DECISION_ACTIONS = [
  'select_option',
  'confirm_option',
  'explain_option',
  'repeat_options',
  'out_of_scope_redirect',
  'human_handoff',
];

const COPY = {
  confirm: {
    fa: (label) => `فکر می‌کنم منظورتان «${label}» است. همین گزینه را انتخاب کنم؟`,
    en: (label) => `I think you mean “${label}”. Should I choose this option?`,
    tr: (label) => `Sanırım “${label}” demek istiyorsunuz. Bu seçeneği seçeyim mi?`,
    ar: (label) => `أعتقد أنك تقصد «${label}». هل أختار هذا الخيار؟`,
  },
  confirmYes: {
    fa: 'بله، همین گزینه',
    en: 'Yes, choose this',
    tr: 'Evet, bunu seç',
    ar: 'نعم، اختر هذا',
  },
  confirmNo: {
    fa: 'نه، گزینه‌ها را ببینم',
    en: 'No, show the options',
    tr: 'Hayır, seçenekleri göster',
    ar: 'لا، اعرض الخيارات',
  },
  repeat: {
    fa: 'اشکالی ندارد. لطفاً نزدیک‌ترین گزینه به هدفتان را انتخاب کنید.',
    en: 'No problem. Please choose the option closest to your goal.',
    tr: 'Sorun değil. Lütfen hedefinize en yakın seçeneği seçin.',
    ar: 'لا مشكلة. اختر الخيار الأقرب إلى هدفك.',
  },
  explain: {
    fa: 'این مرحله فقط کمک می‌کند نزدیک‌ترین مسیر را مشخص کنیم. لطفاً یکی از گزینه‌های فعلی را انتخاب کنید.',
    en: 'This step only identifies the closest path for you. Please choose one of the current options.',
    tr: 'Bu adım yalnızca size en yakın yolu belirler. Lütfen mevcut seçeneklerden birini seçin.',
    ar: 'تساعد هذه الخطوة فقط في تحديد المسار الأقرب لك. اختر أحد الخيارات الحالية.',
  },
  redirect: {
    fa: 'این موضوع مهم است، اما برای حفظ مسیر درست ابتدا همین مرحله را کامل کنیم. کدام گزینه به هدفتان نزدیک‌تر است؟',
    en: 'That is important, but let’s complete this step first so your journey stays accurate. Which current option is closest?',
    tr: 'Bu önemli, ancak yolculuğun doğru ilerlemesi için önce bu adımı tamamlayalım. Hangi seçenek size daha yakın?',
    ar: 'هذا مهم، لكن لنكمل هذه الخطوة أولاً حتى يبقى المسار دقيقاً. أي خيار حالي هو الأقرب؟',
  },
  handoff: {
    fa: 'می‌توانم شما را به مشاور انسانی آکا متصل کنم. اگر ترجیح می‌دهید، گزینه گفت‌وگو با مشاور را انتخاب کنید.',
    en: 'I can connect you with a human ACCA counselor. Choose the counselor option if you would prefer that.',
    tr: 'Sizi bir ACCA danışmanına bağlayabilirim. İsterseniz danışman seçeneğini seçin.',
    ar: 'يمكنني توصيلك بمستشار بشري من ACCA. اختر خيار المستشار إذا كنت تفضل ذلك.',
  },
  counselor: {
    fa: 'گفت‌وگو با مشاور',
    en: 'Talk to a counselor',
    tr: 'Danışmanla görüş',
    ar: 'تحدث مع مستشار',
  },
};

const AFFIRMATIVE = [
  'yes', 'yeah', 'yep', 'correct', 'confirm',
  'بله', 'آره', 'اره', 'درسته', 'تایید', 'تأیید',
  'evet', 'doğru', 'dogru', 'نعم', 'صحيح',
];

const NEGATIVE = [
  'no', 'nope', 'cancel',
  'نه', 'خیر', 'اشتباه',
  'hayır', 'hayir', 'لا',
];

const EXPLAIN_CUES = [
  'what does', 'what is', 'explain', 'meaning',
  'یعنی', 'منظور', 'توضیح', 'چیست', 'چیه',
  'ne demek', 'açıkla', 'acikla', 'ماذا يعني', 'اشرح',
];

const HUMAN_CUES = [
  'human', 'counselor', 'counsellor', 'advisor', 'person',
  'مشاور', 'آدم واقعی', 'انسان',
  'danışman', 'danisman', 'insan', 'مستشار', 'شخص',
];

const CONFUSION_CUES = [
  'confused', 'not sure', 'show options', 'repeat',
  'گیج', 'مطمئن نیستم', 'گزینه ها', 'گزینه‌ها', 'تکرار',
  'kararsız', 'kararsiz', 'seçenekler', 'secenekler', 'محتار', 'الخيارات',
];

export function normalizeGuidedText(value) {
  return String(value || '')
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\u200c/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value) {
  return normalizeGuidedText(value).split(' ').filter((token) => token.length > 1);
}

function ngrams(items, size) {
  const result = new Set();
  for (let index = 0; index <= items.length - size; index += 1) {
    result.add(items.slice(index, index + size).join(' '));
  }
  return result;
}

function optionScore(message, label) {
  const normalizedMessage = normalizeGuidedText(message);
  const normalizedLabel = normalizeGuidedText(label);
  if (!normalizedMessage || !normalizedLabel) return 0;
  if (normalizedMessage === normalizedLabel) return 1;

  const messageTokens = tokens(message);
  const labelTokens = tokens(label);
  const messageSet = new Set(messageTokens);
  const labelSet = new Set(labelTokens);
  const shared = [...messageSet].filter((token) => labelSet.has(token)).length;
  const coverage = shared / Math.max(1, Math.min(messageSet.size, labelSet.size));
  const union = new Set([...messageSet, ...labelSet]).size;
  const jaccard = shared / Math.max(1, union);
  const messageBigrams = ngrams(messageTokens, 2);
  const labelBigrams = ngrams(labelTokens, 2);
  const sharesBigram = [...messageBigrams].some((gram) => labelBigrams.has(gram));

  if (normalizedMessage.includes(normalizedLabel) || normalizedLabel.includes(normalizedMessage)) {
    return Math.max(0.88, coverage);
  }
  if (sharesBigram) return Math.max(0.88, coverage);
  return Math.min(0.87, coverage * 0.72 + jaccard * 0.28);
}

function hasCue(message, cues) {
  const normalized = normalizeGuidedText(message);
  return cues.some((cue) => normalized.includes(normalizeGuidedText(cue)));
}

function scalarOptionId(actionItem) {
  const value = actionItem?.value;
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : String(actionItem?.id || '');
}

function latestPromptWithActions(state) {
  if (state.pendingOptionConfirmation?.originalActions?.length) {
    return {
      content: state.pendingOptionConfirmation.currentQuestion || '',
      actions: state.pendingOptionConfirmation.originalActions,
    };
  }
  return [...(state.messages || [])]
    .reverse()
    .find((message) => message.role === 'assistant' && message.actions?.length) || null;
}

export function buildGuidedContext(state) {
  const prompt = latestPromptWithActions(state);
  const rawActions = prompt?.actions || [];
  const allowedOptions = rawActions
    .map((actionItem) => ({
      id: scalarOptionId(actionItem),
      label: String(actionItem.label || ''),
    }))
    .filter((option) => option.id && option.label);

  return {
    currentQuestion: String(prompt?.content || ''),
    allowedOptions,
    currentIntent: state.currentIntent,
    currentStep: state.currentStep,
    mode: String(state.currentStep || '').startsWith('faq') ? 'scoped_faq' : 'guided_selection',
    rawActions,
  };
}

export function isExactOptionText(message, option) {
  return normalizeGuidedText(message) === normalizeGuidedText(option?.label);
}

export function localGuidedDecision({ context, studentMessage, language = 'fa' }) {
  const options = context.allowedOptions || [];
  const ranked = options
    .map((option) => ({ option, score: optionScore(studentMessage, option.label) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];

  if (best && isExactOptionText(studentMessage, best.option)) {
    return {
      action: 'select_option',
      selectedOptionId: best.option.id,
      suggestedOptionId: null,
      message: '',
      showOptions: true,
      moveNext: true,
    };
  }

  if (hasCue(studentMessage, HUMAN_CUES)) {
    return {
      action: 'human_handoff',
      selectedOptionId: null,
      suggestedOptionId: null,
      message: COPY.handoff[language] || COPY.handoff.en,
      showOptions: true,
      moveNext: false,
    };
  }

  if (hasCue(studentMessage, EXPLAIN_CUES)) {
    return {
      action: 'explain_option',
      selectedOptionId: null,
      suggestedOptionId: null,
      message: COPY.explain[language] || COPY.explain.en,
      showOptions: true,
      moveNext: false,
    };
  }

  if (best?.score > 0.85) {
    return {
      action: 'confirm_option',
      selectedOptionId: null,
      suggestedOptionId: best.option.id,
      message: COPY.confirm[language]?.(best.option.label) || COPY.confirm.en(best.option.label),
      showOptions: false,
      moveNext: false,
    };
  }

  if (best?.score >= 0.55 || hasCue(studentMessage, CONFUSION_CUES)) {
    return {
      action: best?.score >= 0.55 ? 'confirm_option' : 'repeat_options',
      selectedOptionId: null,
      suggestedOptionId: best?.score >= 0.55 ? best.option.id : null,
      message: best?.score >= 0.55
        ? (COPY.confirm[language]?.(best.option.label) || COPY.confirm.en(best.option.label))
        : (COPY.repeat[language] || COPY.repeat.en),
      showOptions: best?.score < 0.55,
      moveNext: false,
    };
  }

  return {
    action: 'out_of_scope_redirect',
    selectedOptionId: null,
    suggestedOptionId: null,
    message: COPY.redirect[language] || COPY.redirect.en,
    showOptions: true,
    moveNext: false,
  };
}

export function pendingConfirmationRoute(text, state) {
  if (!state.pendingOptionConfirmation) return null;
  if (hasCue(text, AFFIRMATIVE)) {
    return { intent: INTENTS.GUIDED_CONFIRM_OPTION, value: state.pendingOptionConfirmation.optionId };
  }
  if (hasCue(text, NEGATIVE)) {
    return { intent: INTENTS.GUIDED_CANCEL_CONFIRMATION, value: null };
  }
  return null;
}

export function validateGuidedDecision(decision, context, studentMessage, language = 'fa') {
  const fallback = localGuidedDecision({ context, studentMessage, language });
  if (!decision || !GUIDED_DECISION_ACTIONS.includes(decision.action)) return fallback;
  if (fallback.action === 'select_option') return fallback;
  if (
    fallback.action === 'confirm_option'
    && (decision.action === 'repeat_options' || decision.action === 'out_of_scope_redirect')
  ) {
    return fallback;
  }

  const optionIds = new Set((context.allowedOptions || []).map((option) => option.id));
  const selectedOptionId = optionIds.has(String(decision.selectedOptionId))
    ? String(decision.selectedOptionId)
    : null;
  const suggestedOptionId = optionIds.has(String(decision.suggestedOptionId))
    ? String(decision.suggestedOptionId)
    : null;

  if (decision.action === 'select_option') {
    const option = context.allowedOptions.find((item) => item.id === selectedOptionId);
    if (!option || !isExactOptionText(studentMessage, option)) {
      if (!option) return fallback;
      return {
        action: 'confirm_option',
        selectedOptionId: null,
        suggestedOptionId: option.id,
        message: COPY.confirm[language]?.(option.label) || COPY.confirm.en(option.label),
        showOptions: false,
        moveNext: false,
      };
    }
  }

  if (decision.action === 'confirm_option' && !suggestedOptionId) return fallback;

  return {
    action: decision.action,
    selectedOptionId: decision.action === 'select_option' ? selectedOptionId : null,
    suggestedOptionId: decision.action === 'confirm_option' ? suggestedOptionId : null,
    message: String(decision.message || '').replace(/\s+/g, ' ').trim().slice(0, 420),
    showOptions: decision.action === 'confirm_option' ? false : true,
    moveNext: decision.action === 'select_option',
  };
}

function findRawAction(context, optionId) {
  return context.rawActions.find((item) => scalarOptionId(item) === String(optionId)) || null;
}

export function guidedDecisionResult({ decision, context, state }) {
  const lang = state.language || 'fa';

  if (decision.action === 'select_option') {
    const selected = findRawAction(context, decision.selectedOptionId);
    return selected ? { selected } : null;
  }

  if (decision.action === 'confirm_option') {
    const suggested = findRawAction(context, decision.suggestedOptionId);
    if (!suggested) return null;
    const optionLabel = suggested.label;
    const message = COPY.confirm[lang]?.(optionLabel) || COPY.confirm.en(optionLabel);
    return {
      result: {
        messages: [
          aiMsg(lang, message, {
            meta: { tone: 'assist' },
            actions: [
              action(lang, COPY.confirmYes, decision.suggestedOptionId, INTENTS.GUIDED_CONFIRM_OPTION, {
                variant: 'primary',
                icon: 'CheckCircle2',
              }),
              action(lang, COPY.confirmNo, 'cancel', INTENTS.GUIDED_CANCEL_CONFIRMATION, { icon: 'Undo2' }),
            ],
          }),
        ],
        patch: {
          pendingOptionConfirmation: {
            optionId: decision.suggestedOptionId,
            label: optionLabel,
            value: suggested.value,
            nextIntent: suggested.nextIntent,
            currentQuestion: context.currentQuestion,
            originalActions: context.rawActions,
            currentIntent: state.currentIntent,
            currentStep: state.currentStep,
          },
        },
      },
    };
  }

  const copyKey = decision.action === 'explain_option'
    ? 'explain'
    : decision.action === 'repeat_options'
      ? 'repeat'
      : decision.action === 'human_handoff'
        ? 'handoff'
        : 'redirect';
  const message = decision.message || COPY[copyKey][lang] || COPY[copyKey].en;
  let actions = decision.showOptions ? context.rawActions : [];

  if (decision.action === 'human_handoff') {
    const hasCounselor = actions.some((item) => item.nextIntent === INTENTS.TALK_TO_COUNSELOR);
    if (!hasCounselor) {
      actions = [
        action(lang, COPY.counselor, 'counselor', INTENTS.TALK_TO_COUNSELOR, {
          variant: 'primary',
          icon: 'MessageCircle',
        }),
        ...actions,
      ];
    }
  }

  return {
    result: {
      messages: [aiMsg(lang, message, { meta: { tone: 'assist' }, actions })],
      patch: { pendingOptionConfirmation: null },
    },
  };
}

export function cancelGuidedConfirmation(state) {
  const pending = state.pendingOptionConfirmation;
  if (!pending) return null;
  const lang = state.language || 'fa';
  return {
    messages: [
      aiMsg(lang, COPY.repeat[lang] || COPY.repeat.en, {
        meta: { tone: 'assist' },
        actions: pending.originalActions || [],
      }),
    ],
    patch: {
      pendingOptionConfirmation: null,
      currentIntent: pending.currentIntent,
      currentStep: pending.currentStep,
    },
  };
}
