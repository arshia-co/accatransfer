export const SMART_APPLY_SETTINGS_STORAGE_KEY = 'acca.smartApply.assistantSettings.v1';

export const SMART_APPLY_REALTIME_VOICES = [
  {
    id: 'marin',
    label: { fa: 'Marin', en: 'Marin', tr: 'Marin', ar: 'Marin' },
    tone: {
      fa: 'شفاف، حرفه‌ای و رسمی‌تر',
      en: 'Clear, professional, and polished',
      tr: 'Net, profesyonel ve premium',
      ar: 'واضح واحترافي ومصقول',
    },
    sample: {
      fa: 'سلام، من دستیار پذیرش آکا هستم. قدم‌به‌قدم کمک می‌کنم مسیر پذیرش مناسب‌تری انتخاب کنید.',
      en: 'Hello, I am your ACCA admission assistant. I will guide you step by step toward a clearer study path.',
      tr: 'Merhaba, ben ACCA kabul asistanınız. Daha net bir eğitim yolu seçmeniz için adım adım yardımcı olurum.',
      ar: 'مرحباً، أنا مساعد القبول في ACCA. سأرشدك خطوة بخطوة لاختيار مسار دراسي أوضح.',
    },
  },
  {
    id: 'cedar',
    label: { fa: 'Cedar', en: 'Cedar', tr: 'Cedar', ar: 'Cedar' },
    tone: {
      fa: 'گرم، طبیعی و گفت‌وگویی‌تر',
      en: 'Warm, natural, and conversational',
      tr: 'Sıcak, doğal ve konuşma odaklı',
      ar: 'دافئ وطبيعي وحواري',
    },
    sample: {
      fa: 'خوش آمدید. با چند سؤال کوتاه، علاقه‌ها و مسیر تحصیلی مناسب شما را با دقت بیشتری بررسی می‌کنم.',
      en: 'Welcome. With a few short questions, I will understand your interests and guide your academic direction more carefully.',
      tr: 'Hoş geldiniz. Birkaç kısa soruyla ilgi alanlarınızı ve akademik yönünüzü daha dikkatli anlayacağım.',
      ar: 'أهلاً بك. من خلال بعض الأسئلة القصيرة سأفهم اهتماماتك واتجاهك الدراسي بشكل أوضح.',
    },
  },
];

export const SMART_APPLY_REALTIME_VOICE_IDS = new Set(
  SMART_APPLY_REALTIME_VOICES.map((voice) => voice.id),
);

export const DEFAULT_SMART_APPLY_SETTINGS = {
  voiceId: 'marin',
  inputDeviceId: '',
  outputDeviceId: '',
  cookies: {
    preferences: true,
    analytics: false,
  },
  consent: {
    accepted: false,
    acceptedAt: null,
    audioPrepared: false,
    microphoneAllowed: false,
    storageAvailable: false,
  },
  permissions: {
    askBeforeFiles: true,
    allowImageContext: false,
    allowSecureDocuments: true,
  },
  chat: {
    autoReadNextStep: true,
    responseDepth: 'balanced',
    saveSessionMemory: true,
  },
};

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function normalizeSmartApplySettings(value) {
  const raw = safeObject(value);
  const cookies = safeObject(raw.cookies);
  const consent = safeObject(raw.consent);
  const permissions = safeObject(raw.permissions);
  const chat = safeObject(raw.chat);
  const voiceId = SMART_APPLY_REALTIME_VOICE_IDS.has(raw.voiceId)
    ? raw.voiceId
    : DEFAULT_SMART_APPLY_SETTINGS.voiceId;

  return {
    voiceId,
    inputDeviceId: typeof raw.inputDeviceId === 'string' ? raw.inputDeviceId : '',
    outputDeviceId: typeof raw.outputDeviceId === 'string' ? raw.outputDeviceId : '',
    cookies: {
      preferences: cookies.preferences !== false,
      analytics: cookies.analytics === true,
    },
    consent: {
      accepted: consent.accepted === true,
      acceptedAt: typeof consent.acceptedAt === 'string' ? consent.acceptedAt : null,
      audioPrepared: consent.audioPrepared === true,
      microphoneAllowed: consent.microphoneAllowed === true,
      storageAvailable: consent.storageAvailable === true,
    },
    permissions: {
      askBeforeFiles: permissions.askBeforeFiles !== false,
      allowImageContext: permissions.allowImageContext === true,
      allowSecureDocuments: permissions.allowSecureDocuments !== false,
    },
    chat: {
      autoReadNextStep: chat.autoReadNextStep !== false,
      responseDepth: ['concise', 'balanced', 'detailed'].includes(chat.responseDepth)
        ? chat.responseDepth
        : DEFAULT_SMART_APPLY_SETTINGS.chat.responseDepth,
      saveSessionMemory: chat.saveSessionMemory !== false,
    },
  };
}

export function readSmartApplySettings() {
  if (typeof window === 'undefined') return DEFAULT_SMART_APPLY_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SMART_APPLY_SETTINGS_STORAGE_KEY);
    return normalizeSmartApplySettings(raw ? JSON.parse(raw) : null);
  } catch {
    return DEFAULT_SMART_APPLY_SETTINGS;
  }
}

export function saveSmartApplySettings(settings) {
  const normalized = normalizeSmartApplySettings(settings);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SMART_APPLY_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}
