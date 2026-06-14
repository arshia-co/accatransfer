// Flow 3 — Major Discovery (deep + conversational): 25 questions in 5 layers,
// one at a time, smart recaps every 5 answers, then the full personality +
// major-match profile (the "value moment" before any login gate).
//
// Conversational layer: at any question the student can TYPE instead of tapping.
// The assistant then (a) explains a term they don't understand, (b) answers a
// side question, (c) reassures when they ask "which should I pick?", or
// (d) maps their own words to the closest option and asks them to confirm
// before it is selected. The question always stays reachable — progress is
// never lost. See ai/discoveryAssistant.js for the (mock) understanding.
import { INTENTS } from '../intents';
import { aiMsg, action } from '../messageKit';
import { L } from '../../lib/lang';
import { DISCOVERY_QUESTIONS, DISCOVERY_TOTAL } from '../../data/discoveryQuestions';
import { DISCOVERY_GLOSSARY } from '../../data/discoveryGlossary';
import { computeDiscoveryResult, buildRecap } from '../scoring';
import { classifyDiscoveryText } from '../discoveryAssistant';
import { askDegreeStep } from './admissionFlow';

const INTRO = {
  fa: 'چه خوب که هنوز تصمیم نهایی نگرفته‌اید — یعنی همه مسیرها باز است. 🧭 برای ساختن پروفایل عمیق شخصیت تحصیلی شما، ۲۵ سؤال کوتاه می‌پرسم؛ حدود ۴ دقیقه طول می‌کشد و هر پاسخ، نتیجه را دقیق‌تر می‌کند.',
  en: 'It’s actually good that nothing is decided yet — every path is still open. 🧭 To build your deep academic personality profile I’ll ask 25 short questions; it takes about 4 minutes, and every answer sharpens the result.',
  tr: 'Henüz karar vermemiş olman aslında iyi — tüm yollar hâlâ açık. 🧭 Derin akademik kişilik profilini çıkarmak için 25 kısa soru soracağım; yaklaşık 4 dakika sürer ve her yanıt sonucu netleştirir.',
  ar: 'جميل أنك لم تقرر بعد — فكل المسارات لا تزال مفتوحة. 🧭 لبناء ملفك الأكاديمي العميق سأطرح 25 سؤالاً قصيراً؛ يستغرق نحو 4 دقائق، وكل إجابة تجعل النتيجة أدق.',
};

const DISCLAIMER = {
  fa: 'یادآوری شفاف: نتیجه، یک پروفایل راهنمای تحصیلی بر اساس پاسخ‌های شماست — نه تشخیص بالینی و نه آزمون رسمی MBTI. پاسخ درست یا غلط هم وجود ندارد.\n\n💬 و مهم: هر جای سؤال‌ها واژه‌ای برایت مبهم بود (مثلاً «درون‌گرا یعنی چی؟») همان‌جا تایپ کن؛ برایت توضیح می‌دهم و بعد ادامه می‌دهیم.',
  en: 'Honest note: this is an educational guidance profile based on your answers, not a clinical diagnosis or official MBTI assessment. There are no right or wrong answers.\n\n💬 Important: if any word is unclear (e.g. “what does introvert mean?”), just type it — I’ll explain, then we continue.',
  tr: 'Dürüst not: bu, yanıtlarına dayalı bir eğitim rehberliği profilidir — klinik bir tanı ya da resmî MBTI testi değildir. Doğru veya yanlış yanıt da yoktur.\n\n💬 Önemli: bir kelime belirsizse (örn. “içedönük ne demek?”) yaz yeter — açıklarım, sonra devam ederiz.',
  ar: 'ملاحظة صريحة: هذه نتيجة إرشاد تعليمي مبنية على إجاباتك — ليست تشخيصاً سريرياً ولا اختبار MBTI رسمياً. ولا توجد إجابات صحيحة أو خاطئة.\n\n💬 مهم: إن غمضت عليك كلمة (مثل «ما معنى انطوائي؟») اكتبها فقط — أشرحها ثم نكمل.',
};

const NICE_TO_MEET = {
  fa: (n) => `از آشنایی‌تان خوشحالم${n ? `، ${n}` : ''}! بریم سراغ سؤال اول 👇`,
  en: (n) => `Nice to meet you${n ? `, ${n}` : ''}! Here’s the first question 👇`,
  tr: (n) => `Tanıştığımıza memnun oldum${n ? `, ${n}` : ''}! İşte ilk soru 👇`,
  ar: (n) => `سعدت بمعرفتك${n ? ` يا ${n}` : ''}! إليك السؤال الأول 👇`,
};

const RESULT_INTRO = {
  fa: (n) => `تمام شد${n ? `، ${n}` : ''}! 🎉 هر ۲۵ پاسخ را از هفت زاویه کنار هم گذاشتم — ترجیح‌های شناختی، الگوی علایق، تصویر شخصیتی، انگیزه‌ها و نقطه شروع واقعی شما. این پروفایل کامل شماست:`,
  en: (n) => `Done${n ? `, ${n}` : ''}! 🎉 I cross-read all 25 answers from seven angles — cognitive preferences, interest pattern, personality snapshot, motivations and your real starting point. Here is your full profile:`,
  tr: (n) => `Bitti${n ? `, ${n}` : ''}! 🎉 25 yanıtın tamamını yedi açıdan çapraz okudum — bilişsel tercihler, ilgi deseni, kişilik fotoğrafı, motivasyonlar ve gerçek başlangıç noktan. İşte tam profilin:`,
  ar: (n) => `انتهينا${n ? ` يا ${n}` : ''}! 🎉 قرأت إجاباتك الـ25 من سبع زوايا — التفضيلات المعرفية ونمط الاهتمامات واللقطة الشخصية والدوافع ونقطة انطلاقك الواقعية. هذا ملفك الكامل:`,
};

const CTA_SAVE = { fa: 'ذخیره نتیجه من', en: 'Save my result', tr: 'Sonucumu kaydet', ar: 'احفظ نتيجتي' };
const CTA_UNIVERSITIES = { fa: 'دیدن دانشگاه‌های منطبق', en: 'See matching universities', tr: 'Eşleşen üniversiteleri gör', ar: 'عرض الجامعات المطابقة' };
const CTA_DOCS = { fa: 'بارگذاری مدارک', en: 'Upload documents', tr: 'Belgeleri yükle', ar: 'رفع المستندات' };
const CTA_COUNSELOR = { fa: 'گفت‌وگو با مشاور', en: 'Talk to a counselor', tr: 'Danışmanla görüş', ar: 'تحدث مع مستشار' };
const CTA_GUEST = { fa: 'ادامه به‌عنوان مهمان', en: 'Continue as guest', tr: 'Misafir olarak devam et', ar: 'المتابعة كزائر' };

const SEE_UNI_LEAD = {
  fa: 'عالی! بر اساس بالاترین تطابق پروفایل‌تان شروع می‌کنیم — هر وقت خواستید رشته را عوض کنید، کافی است بگویید.',
  en: 'Great! We’ll start from your highest-match major — you can switch it any time, just say so.',
  tr: 'Harika! En yüksek uyumlu bölümünden başlıyoruz — istediğin an değiştirebilirsin.',
  ar: 'رائع! سنبدأ من تخصصك الأعلى تطابقاً — يمكنك تغييره متى شئت.',
};

// ── Conversational-help copy (used by the smart free-text handler) ──
const CONFIRM_MAP = {
  fa: (label) => `پس اگر درست متوجه شدم، منظورت این گزینه است:\n«${label}»\nتأیید کنم و همین را ثبت کنم؟`,
  en: (label) => `So if I understood you correctly, you mean this option:\n“${label}”\nShould I confirm and select it?`,
  tr: (label) => `Doğru anladıysam şu seçeneği kastediyorsun:\n“${label}”\nOnaylayıp bunu seçeyim mi?`,
  ar: (label) => `إذن إن فهمتك صحيحاً، تقصد هذا الخيار:\n«${label}»\nأؤكّده وأختاره؟`,
};
const CONFIRM_YES = { fa: 'بله، همین درست است', en: 'Yes, that’s right', tr: 'Evet, doğru', ar: 'نعم، هذا صحيح' };
const CONFIRM_NO = { fa: 'نه، گزینه‌ها را دوباره ببینم', en: 'No, show me the options', tr: 'Hayır, seçenekleri göster', ar: 'لا، أرني الخيارات' };

const CLARIFY_BACK = {
  fa: 'حالا که روشن شد، همان سؤال را دوباره می‌گذارم 👇',
  en: 'Now that it’s clearer, here’s the same question again 👇',
  tr: 'Şimdi netleştiğine göre aynı soruyu tekrar koyuyorum 👇',
  ar: 'الآن وقد اتضح الأمر، إليك السؤال نفسه مجدداً 👇',
};
const KB_BACK = {
  fa: 'برگردیم به سؤال — هر وقت آماده بودی انتخاب کن 👇',
  en: 'Let’s get back to the question — choose whenever you’re ready 👇',
  tr: 'Soruya dönelim — hazır olduğunda seç 👇',
  ar: 'لنعد إلى السؤال — اختر متى شئت 👇',
};
const HELP_REASSURE = {
  fa: 'اینجا واقعاً پاسخ درست یا غلط نداریم. صادقانه‌ترین انتخاب، دقیق‌ترین نتیجه را می‌سازد — به اولین چیزی که حس می‌کنی نزدیک‌تر است اعتماد کن. کدام گزینه؟',
  en: 'There really is no right or wrong answer here. The most honest pick gives the most accurate result — trust whichever feels closest first. Which option?',
  tr: 'Burada gerçekten doğru ya da yanlış yanıt yok. En dürüst seçim en doğru sonucu verir — ilk hangisi sana yakın geliyorsa ona güven. Hangi seçenek?',
  ar: 'لا توجد هنا حقاً إجابة صحيحة أو خاطئة. الاختيار الأصدق يعطي أدق نتيجة — ثق بأقربها إلى شعورك الأول. أي خيار؟',
};
const UNSURE = {
  fa: 'مطمئن نشدم دقیقاً کدام گزینه را می‌گویی. می‌توانی یکی از دکمه‌های زیر را بزنی، یا کمی واضح‌تر بنویسی تا برایت ثبتش کنم 👇',
  en: 'I’m not fully sure which option you mean. You can tap one below, or say it a little more clearly and I’ll select it for you 👇',
  tr: 'Hangi seçeneği kastettiğinden tam emin olamadım. Aşağıdan birine dokunabilir ya da biraz daha net yazabilirsin 👇',
  ar: 'لست متأكداً تماماً من الخيار الذي تقصده. يمكنك الضغط على أحد الأزرار أدناه أو توضيحه قليلاً فأختاره لك 👇',
};

const TOTAL = DISCOVERY_TOTAL;
const RECAP_STAGES = new Set([5, 10, 15, 20]);

// "What does this mean?" — a distinct, different-colored helper on every
// question, so students discover they can ask the AI to explain anything.
const EXPLAIN_LABEL = { fa: 'یعنی چی؟', en: 'What does this mean?', tr: 'Bu ne demek?', ar: 'ماذا يعني هذا؟' };

const EXPLAIN_LEAD = {
  fa: 'بگذار ساده‌اش کنم 👇',
  en: 'Let me put it simply 👇',
  tr: 'Basitçe anlatayım 👇',
  ar: 'دعني أبسّطها لك 👇',
};

// Plain-language explanation per question layer (when it isn't an MBTI axis
// question, which is explained from the glossary instead). No right answers.
const LAYER_EXPLAIN = {
  riasec: {
    fa: 'این سؤال فقط می‌سنجد چه نوع کار یا فعالیتی برایت جذاب‌تر است. پاسخ درست و غلط ندارد — به چیزی که واقعاً دوستش داری نزدیک‌تر فکر کن.',
    en: 'This question just checks what kind of work or activity attracts you. There’s no right or wrong — pick whatever feels closest to what you actually enjoy.',
    tr: 'Bu soru yalnızca ne tür bir iş veya etkinliğin seni çektiğini ölçer. Doğru ya da yanlış yok — gerçekten sevdiğine en yakın olanı düşün.',
    ar: 'هذا السؤال يقيس فقط نوع العمل أو النشاط الذي يجذبك. لا صواب ولا خطأ — اختر الأقرب إلى ما تستمتع به فعلاً.',
  },
  traits: {
    fa: 'این سؤال یک ویژگی شخصیتی ساده را می‌سنجد (مثل نظم یا علاقه به تجربه‌های تازه). صادقانه‌ترین پاسخ، دقیق‌ترین نتیجه را می‌سازد.',
    en: 'This question checks one simple personality trait (like how organized you are, or how much you enjoy new experiences). The most honest answer gives the most accurate result.',
    tr: 'Bu soru basit bir kişilik özelliğini ölçer (ne kadar düzenli olduğun ya da yeni deneyimleri ne kadar sevdiğin gibi). En dürüst yanıt en doğru sonucu verir.',
    ar: 'هذا السؤال يقيس سمة شخصية بسيطة (مثل مدى تنظيمك أو حبك للتجارب الجديدة). الإجابة الأصدق تعطي أدق نتيجة.',
  },
  motiv: {
    fa: 'این سؤال می‌پرسد چه چیزی در آینده برایت مهم‌تر است (مثل درآمد، امنیت، یا اثرگذاری). به ارزش‌های واقعی خودت فکر کن.',
    en: 'This question asks what matters most to you in the future (like income, security, or making an impact). Think about your real values.',
    tr: 'Bu soru gelecekte senin için en önemli şeyin ne olduğunu sorar (gelir, güvence ya da etki gibi). Gerçek değerlerini düşün.',
    ar: 'هذا السؤال يسأل عمّا يهمك أكثر في المستقبل (كالدخل أو الأمان أو إحداث الأثر). فكّر في قيمك الحقيقية.',
  },
  academic: {
    fa: 'این سؤال درباره نقطه قوت درسی توست — اینکه در کدام درس‌ها راحت‌تری. فقط یک حسِ کلی کافی است.',
    en: 'This question is about your academic strength — which subjects come easiest to you. A rough sense is enough.',
    tr: 'Bu soru akademik güçlü yönünle ilgili — hangi derslerde daha rahatsın. Genel bir his yeterli.',
    ar: 'هذا السؤال عن نقطة قوتك الدراسية — أي المواد أسهل عليك. يكفي إحساس عام.',
  },
  reality: {
    fa: 'این سؤال درباره نقطه شروع واقعی توست (معدل، بودجه، آمادگی). فقط یک تخمین کلی لازم است؛ بعداً دقیق‌ترش می‌کنیم.',
    en: 'This question is about your realistic starting point (GPA, budget, readiness). Just a rough estimate is fine — we refine it later.',
    tr: 'Bu soru gerçekçi başlangıç noktanla ilgili (not, bütçe, hazırlık). Kabaca bir tahmin yeterli — sonra netleştiririz.',
    ar: 'هذا السؤال عن نقطة انطلاقك الواقعية (المعدل، الميزانية، الجاهزية). يكفي تقدير عام — وسنحسّنه لاحقاً.',
  },
};

const currentQuestionIndex = (state) =>
  Math.min(TOTAL - 1, (state.discoveryAnswers || []).length);

/** Plain-language explanation for a question: glossary for MBTI axes, else a
 *  layer-based note. Never changes the question — only explains it. */
function explanationForQuestion(q, lang) {
  if (q.axis) {
    const entry = DISCOVERY_GLOSSARY.find((e) => e.id === q.axis.toLowerCase());
    if (entry) return L(entry.explain, lang);
  }
  const note = LAYER_EXPLAIN[q.layer] || LAYER_EXPLAIN.traits;
  return L(note, lang);
}

function questionActions(lang, qIndex) {
  return [
    ...DISCOVERY_QUESTIONS[qIndex].options.map((opt) =>
      action(lang, opt.label, opt.id, INTENTS.DISCOVERY_ANSWER),
    ),
    // Discoverability nudge: a different-colored "What does this mean?" helper.
    action(lang, EXPLAIN_LABEL, 'explain', INTENTS.DISCOVERY_EXPLAIN, { variant: 'help', icon: 'MessageCircleQuestion' }),
  ];
}

function questionMessage(lang, qIndex) {
  const q = DISCOVERY_QUESTIONS[qIndex];
  return aiMsg(lang, q.text, {
    meta: { progress: qIndex + 1, total: TOTAL },
    actions: questionActions(lang, qIndex),
  });
}

export function startDiscovery(lang, basePatch = {}) {
  return {
    messages: [
      aiMsg(lang, INTRO),
      aiMsg(lang, DISCLAIMER, { meta: { tone: 'note' } }),
      questionMessage(lang, 0),
    ],
    patch: {
      ...basePatch,
      currentIntent: INTENTS.DISCOVERY_ANSWER,
      currentStep: 'discovery_q_0',
      discoveryAnswers: [],
    },
  };
}

export const majorDiscoveryFlow = {
  [INTENTS.DISCOVERY_START]: ({ state }) => startDiscovery(state.language),

  [INTENTS.DISCOVERY_SET_NAME]: ({ value, state }) => {
    const lang = state.language;
    const name = value === '_skip' ? null : String(value || '').trim().slice(0, 40) || null;
    return {
      messages: [aiMsg(lang, NICE_TO_MEET[lang](name)), questionMessage(lang, 0)],
      patch: {
        currentIntent: INTENTS.DISCOVERY_ANSWER,
        currentStep: 'discovery_q_0',
        studentProfile: { name },
      },
    };
  },

  [INTENTS.DISCOVERY_ANSWER]: ({ value, state }) => {
    const lang = state.language;
    const answers = [...(state.discoveryAnswers || []), value];
    const nextIndex = answers.length;

    if (nextIndex < TOTAL) {
      const messages = [];
      if (RECAP_STAGES.has(nextIndex)) {
        messages.push(aiMsg(lang, buildRecap(answers, nextIndex, lang), { meta: { tone: 'recap' } }));
      }
      messages.push(questionMessage(lang, nextIndex));
      return {
        messages,
        patch: { discoveryAnswers: answers, currentStep: `discovery_q_${nextIndex}` },
      };
    }

    // All 25 answered → compute the full profile. The login gate stays
    // behind the student's own choice (value first, account second).
    const result = computeDiscoveryResult(answers);
    const name = state.studentProfile?.name;
    return {
      messages: [
        aiMsg(lang, RESULT_INTRO[lang](name), { meta: { thinkLonger: true } }),
        aiMsg(lang, '', {
          component: 'major_result',
          payload: result,
          actions: [
            action(lang, CTA_SAVE, 'login', INTENTS.OPEN_LOGIN_GATE, { variant: 'primary', icon: 'LogIn' }),
            action(lang, CTA_UNIVERSITIES, 'universities', INTENTS.DISCOVERY_SEE_UNIVERSITIES, { icon: 'Building2' }),
            action(lang, CTA_DOCS, 'docs', INTENTS.DOCUMENTS_OVERVIEW, { icon: 'FileText' }),
            action(lang, CTA_COUNSELOR, 'counselor', INTENTS.TALK_TO_COUNSELOR, { icon: 'MessageCircle' }),
            action(lang, CTA_GUEST, 'guest', INTENTS.CONTINUE_GUEST, { icon: 'UserRound' }),
          ],
        }),
      ],
      patch: {
        discoveryAnswers: answers,
        discoveryResult: result,
        recommendedMajors: result.recommendedMajors,
        currentIntent: INTENTS.OPEN_LOGIN_GATE,
        currentStep: 'discovery_done',
        studentProfile: { interests: result.interests, scores: result },
      },
    };
  },

  // Re-display the current question with its options (after a confirmation
  // is declined, or whenever the student wants to see the choices again).
  [INTENTS.DISCOVERY_RESHOW]: ({ state }) => {
    const lang = state.language;
    const qIndex = currentQuestionIndex(state);
    return {
      messages: [questionMessage(lang, qIndex)],
      patch: { currentStep: `discovery_q_${qIndex}` },
    };
  },

  // "What does this mean?" → explain the current question in plain language,
  // then re-show it. Teaches students they can always ask the AI for help.
  [INTENTS.DISCOVERY_EXPLAIN]: ({ state }) => {
    const lang = state.language;
    const qIndex = currentQuestionIndex(state);
    const q = DISCOVERY_QUESTIONS[qIndex];
    return {
      messages: [
        aiMsg(lang, `${L(EXPLAIN_LEAD, lang)}\n\n${explanationForQuestion(q, lang)}`, { meta: { tone: 'assist' } }),
        questionMessage(lang, qIndex),
      ],
      patch: { currentStep: `discovery_q_${qIndex}` },
    };
  },

  // The student typed instead of tapping. Understand it, help, and keep the
  // question reachable. Never auto-commits an answer — mapping always confirms.
  [INTENTS.DISCOVERY_FREE_TEXT]: ({ value, state }) => {
    const lang = state.language;
    const qIndex = currentQuestionIndex(state);
    const question = DISCOVERY_QUESTIONS[qIndex];
    const verdict = classifyDiscoveryText(value, question, lang);
    const stepPatch = { currentStep: `discovery_q_${qIndex}` };

    if (verdict.kind === 'map') {
      const option = question.options.find((o) => o.id === verdict.optionId);
      const label = L(option.label, lang);
      return {
        messages: [
          aiMsg(lang, CONFIRM_MAP[lang](label), {
            meta: { tone: 'assist' },
            actions: [
              action(lang, CONFIRM_YES, verdict.optionId, INTENTS.DISCOVERY_ANSWER, { variant: 'primary', icon: 'CheckCircle2' }),
              action(lang, CONFIRM_NO, 'reshow', INTENTS.DISCOVERY_RESHOW, { icon: 'RotateCcw' }),
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
          aiMsg(lang, CLARIFY_BACK, { meta: { progress: qIndex + 1, total: TOTAL } }),
          questionMessage(lang, qIndex),
        ],
        patch: stepPatch,
      };
    }

    if (verdict.kind === 'kb') {
      return {
        messages: [
          aiMsg(lang, verdict.kb.answer, { meta: { tone: 'assist' } }),
          aiMsg(lang, KB_BACK),
          questionMessage(lang, qIndex),
        ],
        patch: stepPatch,
      };
    }

    // 'help' (asked which to pick) or 'unsure' (couldn't map) → reassure + re-ask.
    const note = verdict.kind === 'help' ? HELP_REASSURE : UNSURE;
    return {
      messages: [
        aiMsg(lang, note, { meta: { tone: 'assist' } }),
        questionMessage(lang, qIndex),
      ],
      patch: stepPatch,
    };
  },

  /** "See matching universities": jump into the admission funnel with the
   *  top-match major preselected — guest-friendly, no account needed. */
  [INTENTS.DISCOVERY_SEE_UNIVERSITIES]: ({ state }) => {
    const lang = state.language;
    const topMajor = state.discoveryResult?.recommendedMajors?.[0]?.majorId || null;
    const step = askDegreeStep(lang, { studentProfile: { knownMajor: topMajor } });
    step.messages.unshift(aiMsg(lang, SEE_UNI_LEAD));
    return step;
  },
};
