// Flow 2 — "What would you like help with today?" + general routing,
// free-text fallback, counselor handoff and the mock login actions.
import { INTENTS, GOALS } from '../intents';
import { aiMsg, action } from '../messageKit';
import { startDiscovery } from './majorDiscoveryFlow';
import { startKnownMajor, startApply } from './admissionFlow';
import { startFaq } from './faqFlow';

const GOAL_QUESTION = {
  fa: 'برای اینکه دقیق راهنمایی‌ات کنم، الان روی کدام تصمیم تمرکز کنیم؟\n\n✨ پیشنهاد آکا: حتی اگر رشته‌ات را می‌دانی، «کشف رشته با AI» در ۴ دقیقه تیپ تحصیلی، نقاط قوت پنهان و رشته‌های هم‌خوان را نشانت می‌دهد و انتخابت را محکم‌تر می‌کند — رایگان و بدون نیاز به ورود.',
  en: 'So I can guide you precisely, which decision should we focus on right now?\n\n✨ ACCA tip: even if you already know your major, the 4-minute “AI Major Discovery” reveals your academic type, hidden strengths and best-fit majors — and makes your choice stronger. Free, no account needed.',
  tr: 'Sana doğru rehberlik edebilmem için şu an hangi karara odaklanalım?\n\n✨ ACCA ipucu: bölümünü bilsen bile, 4 dakikalık “AI ile Bölüm Keşfi” akademik tipini, gizli güçlü yönlerini ve en uygun bölümleri gösterir — seçimini güçlendirir. Ücretsiz, hesap gerekmez.',
  ar: 'كي أرشدك بدقة، على أي قرار نركّز الآن؟\n\n✨ نصيحة ACCA: حتى لو كنت تعرف تخصصك، فإن «اكتشاف التخصص بالذكاء الاصطناعي» خلال 4 دقائق يكشف نمطك الأكاديمي ونقاط قوتك الخفية والتخصصات الأنسب — ويجعل اختيارك أقوى. مجاناً وبدون حساب.',
};

const GOAL_LABELS = {
  unknown: {
    fa: 'برای انتخاب رشته راهنمایی می‌خواهم',
    en: 'Help me choose a major',
    tr: 'Bölüm seçmeme yardım et',
    ar: 'ساعدني في اختيار تخصص',
  },
  known: {
    fa: 'رشته‌ام را می‌دانم؛ مسیر پذیرش می‌خواهم',
    en: 'I know my major; guide my admission path',
    tr: 'Bölümümü biliyorum; kabul yolumu planla',
    ar: 'أعرف تخصصي؛ أرشدني لمسار القبول',
  },
  apply: {
    fa: 'برای شروع درخواست آماده‌ام',
    en: 'I’m ready to plan an application',
    tr: 'Başvurumu planlamaya hazırım',
    ar: 'أنا مستعد لتخطيط طلب',
  },
  questions: {
    fa: 'فعلاً یک سؤال مشخص دارم',
    en: 'I have a specific question',
    tr: 'Belirli bir sorum var',
    ar: 'لدي سؤال محدد',
  },
};

const FREE_TEXT_FALLBACK = {
  fa: 'برای اینکه پاسخ دقیقی بدهم، بهتر است نزدیک‌ترین مسیر را انتخاب کنیم. اگر ترجیح می‌دهید، هدفتان را با یک جمله کوتاه بنویسید:',
  en: 'To give you a useful answer, let’s choose the closest path. You can also describe your goal in one short sentence:',
  tr: 'Yararlı bir yanıt verebilmem için en yakın yolu seçelim. Hedefinizi kısa bir cümleyle de yazabilirsiniz:',
  ar: 'لأقدم لك إجابة مفيدة، لنختر المسار الأقرب. ويمكنك أيضاً وصف هدفك بجملة قصيرة:',
};

const COUNSELOR_MSG = {
  fa: 'یک گفت‌وگوی خصوصی واتساپ با مشاور آکا باز می‌کنم. پاسخ‌های این جلسه خودکار ارسال نمی‌شوند؛ شما انتخاب می‌کنید چه اطلاعاتی را به اشتراک بگذارید. اگر پنجره باز نشد: ۹۰۵۳۵۴۵۸۵۴۴۰+',
  en: 'I’ll open a private WhatsApp conversation with an ACCA counselor. Your answers from this session are not sent automatically — you choose what to share. If it does not open: +90 535 458 54 40.',
  tr: 'Bir ACCA danışmanıyla özel WhatsApp görüşmesi açacağım. Bu oturumdaki yanıtlarınız otomatik gönderilmez; ne paylaşacağınıza siz karar verirsiniz. Açılmazsa: +90 535 458 54 40.',
  ar: 'سأفتح محادثة واتساب خاصة مع مستشار ACCA. لا تُرسل إجابات هذه الجلسة تلقائياً؛ أنت تختار ما تشاركه. إذا لم تفتح: +90 535 458 54 40.',
};

const LOGIN_DONE = {
  fa: 'خوش آمدید! 🎉 (ورود نمایشی) نتیجه و پروفایل شما ذخیره شد — این هم پیش‌نمایش داشبورد اپلای هوشمند شما.',
  en: 'Welcome aboard! 🎉 (demo sign-in) Your result and profile are saved — here’s a preview of your Smart Apply dashboard.',
  tr: 'Aramıza hoş geldin! 🎉 (demo giriş) Sonucun ve profilin kaydedildi — işte Smart Apply panelinin önizlemesi.',
  ar: 'أهلاً بك! 🎉 (دخول تجريبي) تم حفظ نتيجتك وملفك — هذه معاينة للوحة التقديم الذكي الخاصة بك.',
};

const GUEST_OK = {
  fa: 'حتماً! به‌عنوان مهمان ادامه می‌دهیم — پیشرفت شما فقط در همین جلسه نگه داشته می‌شود. هر وقت خواستید می‌توانید وارد شوید.',
  en: 'Sure! Continuing as a guest — your progress stays in this session only. You can log in any time.',
  tr: 'Tabii! Misafir olarak devam ediyoruz — ilerlemen yalnızca bu oturumda saklanır. İstediğin an giriş yapabilirsin.',
  ar: 'بالتأكيد! نتابع كزائر — يبقى تقدمك في هذه الجلسة فقط، ويمكنك تسجيل الدخول متى شئت.',
};

const NEXT_LABELS = {
  documents: { fa: 'چه مدارکی لازم دارم؟', en: 'What documents do I need?', tr: 'Hangi belgeler gerekli?', ar: 'ما المستندات المطلوبة؟' },
  faq: { fa: 'چند سؤال دیگر دارم', en: 'I have more questions', tr: 'Başka sorularım var', ar: 'لدي أسئلة أخرى' },
  goals: { fa: 'بازگشت به مسیرهای اصلی', en: 'Back to the main paths', tr: 'Ana yollara dön', ar: 'العودة إلى المسارات الرئيسية' },
  dashboard: { fa: 'دیدن داشبورد من', en: 'See my dashboard', tr: 'Panelimi gör', ar: 'عرض لوحتي' },
};

export function goalActions(lang) {
  return [
    action(lang, GOAL_LABELS.unknown, GOALS.UNKNOWN_MAJOR, INTENTS.SET_GOAL, { icon: 'Sparkles', variant: 'primary' }),
    action(lang, GOAL_LABELS.known, GOALS.KNOWN_MAJOR, INTENTS.SET_GOAL, { icon: 'GraduationCap' }),
    action(lang, GOAL_LABELS.apply, GOALS.APPLY, INTENTS.SET_GOAL, { icon: 'Send' }),
    action(lang, GOAL_LABELS.questions, GOALS.QUESTIONS, INTENTS.SET_GOAL, { icon: 'MessageCircleQuestion' }),
  ];
}

export function startGoalQuestion(lang) {
  return aiMsg(lang, GOAL_QUESTION, { actions: goalActions(lang) });
}

export const goalFlow = {
  [INTENTS.SET_GOAL]: ({ value, state }) => {
    const lang = state.language;
    const base = { goal: value };
    switch (value) {
      case GOALS.UNKNOWN_MAJOR:
        return startDiscovery(lang, base);
      case GOALS.KNOWN_MAJOR:
        return startKnownMajor(lang, base);
      case GOALS.APPLY:
        return startApply(lang, base);
      case GOALS.QUESTIONS:
      default:
        return startFaq(lang, base);
    }
  },

  [INTENTS.BACK_TO_GOALS]: ({ state }) => ({
    messages: [startGoalQuestion(state.language)],
    patch: { currentIntent: INTENTS.SET_GOAL, currentStep: 'awaiting_goal' },
  }),

  [INTENTS.FREE_TEXT]: ({ state }) => ({
    messages: [aiMsg(state.language, FREE_TEXT_FALLBACK, { actions: goalActions(state.language) })],
    patch: {},
  }),

  [INTENTS.TALK_TO_COUNSELOR]: ({ state }) => ({
    messages: [aiMsg(state.language, COUNSELOR_MSG)],
    patch: { isLoginGateOpen: false },
    effect: 'whatsapp',
  }),

  [INTENTS.OPEN_LOGIN_GATE]: () => ({
    messages: [],
    patch: { isLoginGateOpen: true },
  }),

  [INTENTS.LOGIN_MOCK]: ({ state }) => ({
    messages: [
      aiMsg(state.language, LOGIN_DONE, {
        actions: [
          action(state.language, NEXT_LABELS.dashboard, 'dashboard', INTENTS.OPEN_DASHBOARD, { icon: 'LayoutDashboard' }),
          action(state.language, NEXT_LABELS.documents, 'docs', INTENTS.DOCUMENTS_OVERVIEW, { icon: 'FileText' }),
          action(state.language, NEXT_LABELS.faq, 'faq', INTENTS.FAQ_START, { icon: 'MessageCircleQuestion' }),
        ],
      }),
    ],
    patch: { isLoginGateOpen: false, isAuthenticated: true },
    effect: 'open_dashboard',
  }),

  [INTENTS.CONTINUE_GUEST]: ({ state }) => ({
    messages: [
      aiMsg(state.language, GUEST_OK, {
        actions: [
          action(state.language, NEXT_LABELS.documents, 'docs', INTENTS.DOCUMENTS_OVERVIEW, { icon: 'FileText' }),
          action(state.language, NEXT_LABELS.faq, 'faq', INTENTS.FAQ_START, { icon: 'MessageCircleQuestion' }),
          action(state.language, NEXT_LABELS.goals, 'goals', INTENTS.BACK_TO_GOALS, { icon: 'Undo2' }),
        ],
      }),
    ],
    patch: { isLoginGateOpen: false },
  }),

  [INTENTS.OPEN_DASHBOARD]: () => ({
    messages: [],
    patch: { isDashboardOpen: true },
  }),
};
