// Flow 4 — admission funnel.
// Covers both "I know my major" (category → major → funnel) and
// "I want to apply" (funnel directly), ending with a direction preview:
// matching programs/universities + admission timeline + login gate.
import { INTENTS, GOALS } from '../intents';
import { aiMsg, action } from '../messageKit';
import { ACCA_CATEGORY_LABELS } from '../../data/majorQuestions';
import { MAJORS, programsForMajor, MOCK_PROGRAMS } from '../../data/mockPrograms';
import { DEGREE_LEVELS, COUNTRIES, GPA_RANGES, BUDGET_RANGES } from '../../data/mockAdmissionRules';

const KNOWN_INTRO = {
  fa: 'بسیار خوب. رشته را به‌عنوان نقطه شروع در نظر می‌گیرم و فقط اطلاعاتی را می‌پرسم که برای ساختن مسیر پذیرش لازم است. رشته شما به کدام حوزه نزدیک‌تر است؟',
  en: 'Good. I’ll use your major as the starting point and ask only what is needed to shape an admission path. Which area is it closest to?',
  tr: 'Güzel. Bölümünüzü başlangıç noktası alıp yalnızca kabul yolunu çizmek için gerekenleri soracağım. Hangi alana daha yakın?',
  ar: 'جيد. سأستخدم تخصصك نقطة بداية وأسأل فقط عما نحتاجه لبناء مسار القبول. إلى أي مجال هو أقرب؟',
};

const PICK_MAJOR = {
  fa: 'کدام‌یک به رشته شما نزدیک‌تر است؟',
  en: 'Which one is closest to your major?',
  tr: 'Hangisi bölümüne en yakın?',
  ar: 'أيها أقرب إلى تخصصك؟',
};

const OTHER_MAJOR = {
  fa: 'رشته من در لیست نیست',
  en: 'My major isn’t listed',
  tr: 'Bölümüm listede yok',
  ar: 'تخصصي غير موجود',
};

const OTHER_MAJOR_REPLY = {
  fa: 'مشکلی نیست. در این نسخه فهرست کوتاهی نمایش داده می‌شود. می‌توانیم نام رشته را با مشاور بررسی کنیم یا ابتدا چند رشته نزدیک را کشف کنیم.',
  en: 'No problem. This preview shows a shorter catalog. We can confirm your major with a counselor or first explore a few nearby study areas.',
  tr: 'Sorun değil. Bu önizleme daha kısa bir katalog gösteriyor. Bölümünüzü danışmanla doğrulayabilir veya önce yakın alanları keşfedebiliriz.',
  ar: 'لا مشكلة. تعرض هذه المعاينة قائمة مختصرة. يمكننا تأكيد تخصصك مع مستشار أو استكشاف بعض المجالات القريبة أولاً.',
};

const APPLY_INTRO = {
  fa: 'حتماً. برای اینکه درخواست را روی گزینه‌های واقعی بنا کنیم، اول باید بدانم رشته‌تان مشخص است یا هنوز برای انتخاب آن راهنمایی می‌خواهید.',
  en: 'Absolutely. To build the application around realistic options, I first need to know whether your major is decided or you still want guidance choosing it.',
  tr: 'Elbette. Başvuruyu gerçekçi seçenekler üzerine kurmak için önce bölümünüzün belli olup olmadığını veya seçim için rehberlik isteyip istemediğinizi bilmeliyim.',
  ar: 'بالتأكيد. لبناء الطلب على خيارات واقعية، أحتاج أولاً لمعرفة ما إذا كان تخصصك محدداً أم ما زلت تريد إرشاداً لاختياره.',
};

const APPLY_MAJOR_KNOWN = {
  fa: 'بله، رشته‌ام مشخص است',
  en: 'Yes, my major is decided',
  tr: 'Evet, bölümüm belli',
  ar: 'نعم، تخصصي محدد',
};

const ASK_DEGREE = {
  fa: 'در چه مقطعی هستید؟',
  en: 'Which stage are you at?',
  tr: 'Hangi aşamadasın?',
  ar: 'في أي مرحلة أنت؟',
};

const ASK_COUNTRY = {
  fa: 'از کدام کشور اقدام می‌کنید؟',
  en: 'Which country are you applying from?',
  tr: 'Hangi ülkeden başvuruyorsun?',
  ar: 'من أي بلد تقدّم؟',
};

const ASK_GPA = {
  fa: 'معدل‌تان حدوداً در کدام بازه است؟',
  en: 'Roughly, which range is your GPA in?',
  tr: 'Not ortalaman yaklaşık hangi aralıkta?',
  ar: 'في أي نطاق يقع معدلك تقريباً؟',
};

const ASK_BUDGET = {
  fa: 'بودجه سالانه شما برای شهریه حدوداً چقدر است؟',
  en: 'What’s your rough yearly tuition budget?',
  tr: 'Yıllık öğrenim bütçen yaklaşık ne kadar?',
  ar: 'كم ميزانيتك السنوية التقريبية للرسوم؟',
};

const GPA_RECAP = {
  fa: 'تصویر اولیه روشن است: مقطع، مبدأ درخواست و بازه تحصیلی مشخص شد. یک سؤال عملی دیگر مانده تا گزینه‌ها را مرتب کنم.',
  en: 'The early picture is clear: degree, application origin, and academic range are set. One practical question remains before I organize the options.',
  tr: 'İlk tablo net: derece, başvuru ülkesi ve akademik aralık belli. Seçenekleri düzenlemeden önce son bir pratik soru kaldı.',
  ar: 'الصورة الأولية واضحة: الدرجة وبلد التقديم والنطاق الأكاديمي محددة. بقي سؤال عملي واحد قبل ترتيب الخيارات.',
};

const DIRECTION_READY = {
  fa: 'بر اساس پاسخ‌های شما، این یک جهت اولیه و قابل بررسی است. این گزینه‌ها با اطلاعاتی که تا اینجا داده‌اید هم‌خوانی بیشتری دارند:',
  en: 'Based on your answers, this is a preliminary direction worth reviewing. These options align more closely with what you have shared so far:',
  tr: 'Yanıtlarınıza göre bu, incelenmeye değer bir ön yöndür. Bu seçenekler şu ana kadar paylaştıklarınızla daha yakından örtüşüyor:',
  ar: 'بناءً على إجاباتك، هذا اتجاه أولي يستحق المراجعة. هذه الخيارات أقرب لما شاركته حتى الآن:',
};

const GPA_LOW_NOTE = {
  fa: 'با توجه به معدل، روی گزینه‌های قابل‌دسترس‌تر تمرکز کردم؛ مشاور ما می‌تواند مسیرهای تقویتی را هم نشان بدهد.',
  en: 'Given the GPA range, I focused on more accessible options; a counselor can also map booster paths.',
  tr: 'Not aralığına göre daha erişilebilir seçeneklere odaklandım; danışman destek yolları da gösterebilir.',
  ar: 'نظراً لنطاق المعدل، ركزت على خيارات أيسر؛ ويمكن للمستشار رسم مسارات داعمة أيضاً.',
};

const TIMELINE_LEAD = {
  fa: 'اگر این جهت مناسب باشد، مسیر پذیرش شما معمولاً با این مراحل ادامه پیدا می‌کند:',
  en: 'If this direction feels right, your admission journey would usually continue through these stages:',
  tr: 'Bu yön size uygunsa kabul yolculuğunuz genellikle şu aşamalarla ilerler:',
  ar: 'إذا بدا هذا الاتجاه مناسباً، فعادةً ما تتابع رحلة القبول عبر هذه المراحل:',
};

const MATCH_NOTE = {
  fa: 'این‌ها گزینه‌های اولیه بر پایه داده نمونه هستند. شرایط پذیرش، شهریه و ظرفیت باید برای ترم و دانشگاه مقصد بررسی شوند.',
  en: 'These are preliminary examples using sample data. Eligibility, tuition, and availability must be verified for the target university and intake.',
  tr: 'Bunlar örnek verilerle oluşturulan ön seçeneklerdir. Uygunluk, ücret ve kontenjan hedef üniversite ve dönem için doğrulanmalıdır.',
  ar: 'هذه أمثلة أولية باستخدام بيانات تجريبية. يجب التحقق من الأهلية والرسوم والتوفر للجامعة والفصل المستهدفين.',
};

const NO_BUDGET_MATCH = {
  fa: 'در این بازه بودجه برای این رشته گزینه مستقیم کم است؛ نزدیک‌ترین گزینه‌ها را نشان می‌دهم — بورسیه می‌تواند فاصله را جبران کند:',
  en: 'Direct options for this major are tight in that budget; here are the closest ones — scholarships can bridge the gap:',
  tr: 'Bu bütçede bu bölüm için doğrudan seçenek az; en yakınlarını gösteriyorum — burslar farkı kapatabilir:',
  ar: 'الخيارات المباشرة لهذا التخصص قليلة ضمن هذه الميزانية؛ إليك الأقرب — والمنح يمكن أن تسد الفارق:',
};

const CTA_LOGIN_APPLY = {
  fa: 'ذخیره این مسیر و ادامه',
  en: 'Save this plan and continue',
  tr: 'Bu planı kaydet ve devam et',
  ar: 'احفظ هذه الخطة وتابع',
};
const CTA_DOCS = { fa: 'چه مدارکی لازم دارم؟', en: 'What documents do I need?', tr: 'Hangi belgeler gerekli?', ar: 'ما المستندات المطلوبة؟' };
const CTA_DISCOVERY_FIRST = {
  fa: 'اول کمکم کن رشته انتخاب کنم',
  en: 'Help me choose a major first',
  tr: 'Önce bölüm seçmeme yardım et',
  ar: 'ساعدني أولاً في اختيار التخصص',
};

function degreeActions(lang) {
  return DEGREE_LEVELS.map((d) => action(lang, d.label, d.id, INTENTS.APPLY_SET_DEGREE));
}

/** Reusable entry into the funnel at the degree question (e.g. straight from
 *  a discovery result with the top major preselected via basePatch). */
export function askDegreeStep(lang, basePatch = {}) {
  return {
    messages: [aiMsg(lang, ASK_DEGREE, { actions: degreeActions(lang) })],
    patch: {
      ...basePatch,
      currentIntent: INTENTS.APPLY_SET_DEGREE,
      currentStep: 'apply_degree',
    },
  };
}

export function startKnownMajor(lang, basePatch = {}) {
  const categoryActions = Object.entries(ACCA_CATEGORY_LABELS).map(([key, label]) =>
    action(lang, label, key, INTENTS.KNOWN_MAJOR_CATEGORY),
  );
  return {
    messages: [aiMsg(lang, KNOWN_INTRO, { actions: categoryActions })],
    patch: {
      ...basePatch,
      currentIntent: INTENTS.KNOWN_MAJOR_CATEGORY,
      currentStep: 'known_category',
    },
  };
}

export function startApply(lang, basePatch = {}) {
  return {
    messages: [
      aiMsg(lang, APPLY_INTRO, {
        actions: [
          action(lang, APPLY_MAJOR_KNOWN, GOALS.KNOWN_MAJOR, INTENTS.SET_GOAL, { icon: 'GraduationCap' }),
          action(lang, CTA_DISCOVERY_FIRST, GOALS.UNKNOWN_MAJOR, INTENTS.SET_GOAL, { icon: 'Compass' }),
        ],
      }),
    ],
    patch: {
      ...basePatch,
      currentIntent: INTENTS.SET_GOAL,
      currentStep: 'apply_major_status',
    },
  };
}

function directionResult({ lang, state }) {
  const profile = state.studentProfile || {};
  const budget = BUDGET_RANGES.find((b) => b.id === profile.budget);
  const budgetMax = budget?.maxUSD ?? null;
  const lowGpa = profile.gpa === 'g_low';

  const messages = [];
  let programs;

  if (profile.knownMajor) {
    programs = programsForMajor(profile.knownMajor, { budgetMaxUSD: budgetMax });
    if (!programs.length) {
      programs = programsForMajor(profile.knownMajor).slice(0, 3);
      messages.push(aiMsg(lang, NO_BUDGET_MATCH));
    } else {
      messages.push(aiMsg(lang, DIRECTION_READY));
    }
    programs = programs.slice(0, 3);
  } else {
    messages.push(aiMsg(lang, DIRECTION_READY));
    // No major yet → lean on budget-friendly, scholarship-friendly programs.
    programs = MOCK_PROGRAMS
      .filter((p) => (budgetMax == null || p.tuitionUSD <= budgetMax) && p.degree === (profile.degree === 'master' ? 'master' : 'bachelor'))
      .sort((a, b) => a.tuitionUSD - b.tuitionUSD)
      .slice(0, 3);
    if (!programs.length) programs = MOCK_PROGRAMS.slice(0, 3);
  }

  if (lowGpa) messages.push(aiMsg(lang, GPA_LOW_NOTE, { meta: { tone: 'note' } }));
  messages.push(aiMsg(lang, MATCH_NOTE, { meta: { tone: 'note' } }));

  messages.push(
    aiMsg(lang, '', {
      component: 'university_list',
      payload: { programIds: programs.map((p) => p.id) },
    }),
  );
  messages.push(
    aiMsg(lang, TIMELINE_LEAD, {
      component: 'timeline',
      payload: { degree: profile.degree || 'bachelor' },
      actions: [
        action(lang, CTA_LOGIN_APPLY, 'login', INTENTS.OPEN_LOGIN_GATE, { variant: 'primary', icon: 'LogIn' }),
        action(lang, CTA_DOCS, 'docs', INTENTS.DOCUMENTS_OVERVIEW, { icon: 'FileText' }),
        ...(profile.knownMajor
          ? []
          : [action(lang, CTA_DISCOVERY_FIRST, 'discovery', INTENTS.DISCOVERY_START, { icon: 'Compass' })]),
      ],
    }),
  );

  return {
    messages,
    patch: {
      currentIntent: INTENTS.OPEN_LOGIN_GATE,
      currentStep: 'direction_ready',
      directionPrograms: programs.map((p) => p.id),
    },
  };
}

export const admissionFlow = {
  [INTENTS.KNOWN_MAJOR_CATEGORY]: ({ value, state }) => {
    const lang = state.language;
    const inCategory = MAJORS
      .filter((m) => m.acca[value])
      .sort((a, b) => (b.acca[value] || 0) - (a.acca[value] || 0))
      .slice(0, 6);
    return {
      messages: [
        aiMsg(lang, PICK_MAJOR, {
          actions: [
            ...inCategory.map((m) => action(lang, m.name, m.id, INTENTS.KNOWN_MAJOR_PICK)),
            action(lang, OTHER_MAJOR, '_other', INTENTS.KNOWN_MAJOR_PICK),
          ],
        }),
      ],
      patch: {
        currentIntent: INTENTS.KNOWN_MAJOR_PICK,
        currentStep: 'known_pick',
        studentProfile: { interests: [value] },
      },
    };
  },

  [INTENTS.KNOWN_MAJOR_PICK]: ({ value, state }) => {
    const lang = state.language;
    if (value === '_other') {
      return {
        messages: [
          aiMsg(lang, OTHER_MAJOR_REPLY, {
            actions: [
              action(lang, { fa: 'گفت‌وگو با مشاور', en: 'Talk to a counselor', tr: 'Danışmanla görüş', ar: 'تحدث مع مستشار' }, 'counselor', INTENTS.TALK_TO_COUNSELOR, { icon: 'MessageCircle' }),
              action(lang, CTA_DISCOVERY_FIRST, 'discovery', INTENTS.DISCOVERY_START, { icon: 'Compass' }),
            ],
          }),
        ],
        patch: { currentStep: 'known_other' },
      };
    }
    return {
      messages: [
        aiMsg(lang, {
          fa: 'متوجه شدم. این رشته را مبنای بررسی قرار می‌دهم. حالا مقطع مورد نظرتان را مشخص کنیم.',
          en: 'Understood. I’ll use that major as the anchor for the review. Now let’s set your intended degree level.',
          tr: 'Anladım. İnceleme için bu bölümü temel alacağım. Şimdi hedeflediğiniz dereceyi belirleyelim.',
          ar: 'فهمت. سأستخدم هذا التخصص أساساً للمراجعة. الآن لنحدد الدرجة التي تستهدفها.',
        }),
        aiMsg(lang, ASK_DEGREE, { actions: degreeActions(lang) }),
      ],
      patch: {
        currentIntent: INTENTS.APPLY_SET_DEGREE,
        currentStep: 'apply_degree',
        studentProfile: { knownMajor: value },
      },
    };
  },

  [INTENTS.APPLY_SET_DEGREE]: ({ value, state }) => ({
    messages: [
      aiMsg(state.language, ASK_COUNTRY, {
        actions: COUNTRIES.map((c) => action(state.language, c.label, c.id, INTENTS.APPLY_SET_COUNTRY)),
      }),
    ],
    patch: {
      currentIntent: INTENTS.APPLY_SET_COUNTRY,
      currentStep: 'apply_country',
      studentProfile: { degree: value },
    },
  }),

  [INTENTS.APPLY_SET_COUNTRY]: ({ value, state }) => ({
    messages: [
      aiMsg(state.language, ASK_GPA, {
        actions: GPA_RANGES.map((g) => action(state.language, g.label, g.id, INTENTS.APPLY_SET_GPA)),
      }),
    ],
    patch: {
      currentIntent: INTENTS.APPLY_SET_GPA,
      currentStep: 'apply_gpa',
      studentProfile: { country: value },
    },
  }),

  [INTENTS.APPLY_SET_GPA]: ({ value, state }) => ({
    messages: [
      aiMsg(state.language, GPA_RECAP, { meta: { tone: 'recap' } }),
      aiMsg(state.language, ASK_BUDGET, {
        actions: BUDGET_RANGES.map((b) => action(state.language, b.label, b.id, INTENTS.APPLY_SET_BUDGET)),
      }),
    ],
    patch: {
      currentIntent: INTENTS.APPLY_SET_BUDGET,
      currentStep: 'apply_budget',
      studentProfile: { gpa: value },
    },
  }),

  [INTENTS.APPLY_SET_BUDGET]: ({ value, state }) => {
    const nextState = {
      ...state,
      studentProfile: { ...state.studentProfile, budget: value },
    };
    const result = directionResult({ lang: state.language, state: nextState });
    result.patch.studentProfile = { ...(result.patch.studentProfile || {}), budget: value };
    return result;
  },

  [INTENTS.APPLY_SHOW_DIRECTION]: ({ state }) => directionResult({ lang: state.language, state }),
};
