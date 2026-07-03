// Flow 3 — Major Discovery (deep + conversational): 25 questions in 5 layers,
// one at a time, smart recaps every 5 answers, then the full educational-fit +
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
import { classifyDiscoveryText, optionShortMeaning } from '../discoveryAssistant';
import { askDegreeStep } from './admissionFlow';

const INTRO = {
  fa: 'چه خوب که هنوز تصمیم نهایی نگرفته‌اید — یعنی همه مسیرها باز است. 🧭 برای ساختن Educational Fit Profile شما، ۲۵ سؤال کوتاه درباره علایق، سبک یادگیری و ترجیح مسیر می‌پرسم؛ حدود ۴ دقیقه طول می‌کشد و هر پاسخ، نتیجه را دقیق‌تر می‌کند.',
  en: 'It’s actually good that nothing is decided yet — every path is still open. 🧭 To build your Educational Fit Profile, I’ll ask 25 short questions about interests, learning style, and pathway preferences; it takes about 4 minutes, and every answer sharpens the result.',
  tr: 'Henüz karar vermemiş olman aslında iyi — tüm yollar hâlâ açık. 🧭 Educational Fit Profile oluşturmak için ilgi alanların, öğrenme stilin ve yol tercihlerin hakkında 25 kısa soru soracağım.',
  ar: 'جميل أنك لم تقرر بعد — فكل المسارات لا تزال مفتوحة. 🧭 لبناء Educational Fit Profile الخاص بك سأطرح 25 سؤالاً قصيراً عن الاهتمامات وأسلوب التعلم وتفضيلات المسار.',
};

const DISCLAIMER = {
  fa: 'یادآوری شفاف: نتیجه، یک پروفایل راهنمای تحصیلی بر اساس پاسخ‌های شماست — نه تشخیص روان‌شناختی و نه آزمون رسمی MBTI. پاسخ درست یا غلط هم وجود ندارد.\n\n💬 و مهم: هر جای سؤال‌ها واژه‌ای برایت مبهم بود (مثلاً «درون‌گرا یعنی چی؟») همان‌جا تایپ کن؛ برایت توضیح می‌دهم و بعد ادامه می‌دهیم.',
  en: 'Honest note: this is an educational guidance profile based on your answers, not a psychological diagnosis or official MBTI assessment. There are no right or wrong answers.\n\n💬 Important: if any word is unclear (e.g. “what does introvert mean?”), just type it — I’ll explain, then we continue.',
  tr: 'Dürüst not: bu, yanıtlarına dayalı bir eğitim rehberliği profilidir — psikolojik tanı veya resmî MBTI testi değildir. Doğru ya da yanlış yanıt yoktur.\n\n💬 Önemli: bir kelime belirsizse yaz yeter — açıklarım, sonra devam ederiz.',
  ar: 'ملاحظة صريحة: هذه نتيجة إرشاد تعليمي مبنية على إجاباتك — ليست تشخيصاً نفسياً ولا اختبار MBTI رسمياً. ولا توجد إجابات صحيحة أو خاطئة.\n\n💬 مهم: إن غمضت عليك كلمة فاكتبها فقط — أشرحها ثم نكمل.',
};

const NICE_TO_MEET = {
  fa: (n) => `از آشنایی‌تان خوشحالم${n ? `، ${n}` : ''}! بریم سراغ سؤال اول 👇`,
  en: (n) => `Nice to meet you${n ? `, ${n}` : ''}! Here’s the first question 👇`,
  tr: (n) => `Tanıştığımıza memnun oldum${n ? `, ${n}` : ''}! İşte ilk soru 👇`,
  ar: (n) => `سعدت بمعرفتك${n ? ` يا ${n}` : ''}! إليك السؤال الأول 👇`,
};

const RESULT_INTRO = {
  fa: (n) => `تمام شد${n ? `، ${n}` : ''}! 🎉 هر ۲۵ پاسخ را از چند زاویه کنار هم گذاشتم — علایق تحصیلی، ترجیح یادگیری، محیط کاری مطلوب، انگیزه‌ها، محدودیت‌های واقعی و مسیرهای پیشنهادی. این پروفایل جهت‌گیری تحصیلی شماست:`,
  en: (n) => `Done${n ? `, ${n}` : ''}! 🎉 I cross-read all 25 answers across academic interests, learning preferences, preferred work environment, motivations, practical limits, and suggested paths. Here is your Academic Direction Profile:`,
  tr: (n) => `Bitti${n ? `, ${n}` : ''}! 🎉 Yanıtlarını akademik ilgiler, öğrenme tercihleri, çalışma ortamı, motivasyonlar, pratik sınırlar ve önerilen yollar açısından okudum. İşte Akademik Yön Profilin:`,
  ar: (n) => `انتهينا${n ? ` يا ${n}` : ''}! 🎉 قرأت إجاباتك من زاوية الاهتمامات الأكاديمية وتفضيلات التعلم وبيئة العمل والدوافع والقيود الواقعية والمسارات المقترحة. هذا ملف اتجاهك الأكاديمي:`,
};

const CTA_SAVE = { fa: 'ذخیره نتیجه من', en: 'Save my result', tr: 'Sonucumu kaydet', ar: 'احفظ نتيجتي' };
const CTA_DEEP_FIT = {
  fa: 'ادامه با تحلیل عمیق ۵۲ سؤالی',
  en: 'Continue with the 52-question Deep Fit',
  tr: '52 soruluk Deep Fit ile devam et',
  ar: 'تابع مع تحليل Deep Fit المكوّن من 52 سؤالاً',
};
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
  fa: (label, reason) => `از توضیحی که دادی، برداشت من این است که پاسخ تو به این گزینه نزدیک‌تر است:\n«${label}»\n\nچرا این پیشنهاد؟ ${reason}\n\nاگر درست فهمیدم، تأیید کنم و همین را ثبت کنم؟`,
  en: (label, reason) => `From what you wrote, I think your answer is closest to this option:\n“${label}”\n\nWhy I’m suggesting it: ${reason}\n\nIf I understood correctly, should I confirm and select it?`,
  tr: (label, reason) => `Yazdıklarından, yanıtının şu seçeneğe daha yakın olduğunu düşünüyorum:\n“${label}”\n\nNeden bunu öneriyorum? ${reason}\n\nDoğru anladıysam onaylayıp seçeyim mi?`,
  ar: (label, reason) => `من شرحك، يبدو أن إجابتك أقرب إلى هذا الخيار:\n«${label}»\n\nلماذا أقترحه؟ ${reason}\n\nإن فهمتُك جيداً، هل أؤكّده وأختاره؟`,
};
const CONFIRM_YES = { fa: 'بله، همین درست است', en: 'Yes, that’s right', tr: 'Evet, doğru', ar: 'نعم، هذا صحيح' };

const COMPARE_LEAD = {
  fa: 'به نظر می‌رسد بین دو گزینه نزدیک مانده‌ای. تفاوتشان را ساده می‌گویم:',
  en: 'It sounds like you are between two close options. Here is the simple difference:',
  tr: 'İki yakın seçenek arasında kalmış gibisin. Basit fark şu:',
  ar: 'يبدو أنك بين خيارين قريبين. هذا هو الفرق ببساطة:',
};
const COMPARE_FOOTER = {
  fa: 'اگر سناریوی اول بیشتر شبیه رفتار واقعی توست، همان را انتخاب کن؛ اگر سناریوی دوم بیشتر تکرار می‌شود، گزینه دوم دقیق‌تر است. هدف این است که پاسخ واقعی‌تر را بگیریم، نه پاسخ زیباتر را.',
  en: 'If the first scenario feels closer to your real behavior, choose it; if the second happens more often, the second is more accurate. We want the truer answer, not the nicer-sounding one.',
  tr: 'İlk senaryo gerçek davranışına daha yakınsa onu seç; ikinci daha sık oluyorsa ikinci daha doğrudur. Amacımız daha güzel görünen değil, daha gerçek yanıtı seçmek.',
  ar: 'إذا كان السيناريو الأول أقرب لسلوكك الحقيقي فاختره؛ وإذا كان الثاني يتكرر أكثر فهو أدق. نريد الإجابة الأصدق لا الأجمل.',
};

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
const VOICE_UNSURE = {
  fa: 'پاسخ صوتی‌ات برای انتخاب گزینه شفافیت کافی نداشت. برای اینکه اشتباه ثبت نکنم، لطفاً میکروفون را دوباره بزن و واضح‌تر بگو، یا یکی از دکمه‌های زیر را انتخاب کن 👇',
  en: 'Your voice answer was not clear enough for me to choose an option safely. To avoid a wrong selection, tap the microphone again and say it more clearly, or choose one of the buttons below 👇',
  tr: 'Sesli yanıtın güvenli şekilde seçenek seçmem için yeterince net değildi. Yanlış seçim yapmamak için mikrofona tekrar dokunup daha net söyle veya aşağıdaki seçeneklerden birini seç 👇',
  ar: 'إجابتك الصوتية لم تكن واضحة بما يكفي لاختيار خيار بأمان. لتجنب اختيار خاطئ، اضغط على الميكروفون مرة أخرى وقلها بوضوح أكثر، أو اختر أحد الأزرار أدناه 👇',
};
const VOICE_ACCEPTED = {
  fa: (label, reason) => `پاسخ صوتی‌ات را با اطمینان کافی فهمیدم و این گزینه را ثبت کردم:\n«${label}»\n\n${reason}`,
  en: (label, reason) => `I understood your voice answer with enough confidence and saved this option:\n“${label}”\n\n${reason}`,
  tr: (label, reason) => `Sesli yanıtını yeterli güvenle anladım ve bu seçeneği kaydettim:\n“${label}”\n\n${reason}`,
  ar: (label, reason) => `فهمت إجابتك الصوتية بثقة كافية وحفظت هذا الخيار:\n«${label}»\n\n${reason}`,
};

const TOTAL = DISCOVERY_TOTAL;
const RECAP_STAGES = new Set([5, 10, 15, 20]);

// "What does this mean?" — a distinct, different-colored helper on every
// question, so students discover they can ask the AI to explain anything.
const EXPLAIN_LABEL = { fa: 'یعنی چی؟', en: 'What does this mean?', tr: 'Bu ne demek?', ar: 'ماذا يعني هذا؟' };

const EXPLAIN_LEAD = {
  fa: 'بگذار این سؤال را کامل برایت باز کنم 👇',
  en: 'Let me fully unpack this question for you 👇',
  tr: 'Bu soruyu senin için tam olarak açayım 👇',
  ar: 'دعني أوضّح لك هذا السؤال بالكامل 👇',
};

// Short, plain pole labels per MBTI axis. These are combined with the EXACT
// current question text (see QUESTION_FRAME) so the explanation is always about
// the question on screen — not a generic paragraph reused across the whole axis.
const AXIS_POLES = {
  EI: { fa: ['برون‌گرا', 'درون‌گرا'], en: ['more extroverted', 'more introverted'], tr: ['daha dışadönük', 'daha içedönük'], ar: ['أكثر انبساطاً', 'أكثر انطواءً'] },
  SN: { fa: ['واقع‌گرا و جزئی‌نگر', 'شهودی و کل‌نگر'], en: ['concrete and detail-focused', 'intuitive and big-picture'], tr: ['somut ve ayrıntıcı', 'sezgisel ve bütüncül'], ar: ['واقعي ومهتم بالتفاصيل', 'حدسي وشمولي'] },
  TF: { fa: ['منطق‌محور', 'ارزش‌محور'], en: ['logic-led', 'values-led'], tr: ['mantık odaklı', 'değer odaklı'], ar: ['منطقي', 'قيمي'] },
  JP: { fa: ['ساختارمند و برنامه‌محور', 'منعطف و باز'], en: ['structured and planned', 'flexible and open'], tr: ['planlı ve düzenli', 'esnek ve açık'], ar: ['منظم ومخطط', 'مرن ومنفتح'] },
};

// Frames the explanation around the ACTUAL question text the student sees.
const QUESTION_FRAME = {
  fa: (q, a, b) => `سؤالی که الان روی صفحه است این است:\n«${q}»\nهدفش این است که ببینم تو در این مورد بیشتر ${a} هستی یا ${b}.`,
  en: (q, a, b) => `The question on screen right now is:\n“${q}”\nIts goal is to see whether, here, you’re ${a} or ${b}.`,
  tr: (q, a, b) => `Şu an ekrandaki soru:\n“${q}”\nAmacı, burada senin ${a} mı yoksa ${b} mı olduğunu görmek.`,
  ar: (q, a, b) => `السؤال المعروض الآن هو:\n«${q}»\nهدفه أن أرى هل أنت هنا ${a} أم ${b}.`,
};

// Same idea for non-MBTI questions: quote the exact question, then its purpose.
const QUOTE_LEAD = {
  fa: (q) => `سؤالی که الان روی صفحه است این است:\n«${q}»`,
  en: (q) => `The question on screen right now is:\n“${q}”`,
  tr: (q) => `Şu an ekrandaki soru:\n“${q}”`,
  ar: (q) => `السؤال المعروض الآن هو:\n«${q}»`,
};

// Always-shown closing line: ties the explanation back to the on-screen
// options and reassures the student the options stay put.
const CLOSE_TO_OPTIONS = {
  fa: 'حالا با همین دید به گزینه‌های پایین نگاه کن و هر کدام بیشتر شبیه توست همان را بزن — گزینه‌ها همین‌جا می‌مانند تا هر وقت آماده بودی انتخاب کنی.',
  en: 'Now, with that in mind, look at the options below and tap whichever is most like you — the options stay right here until you’re ready to choose.',
  tr: 'Şimdi bunu aklında tutarak aşağıdaki seçeneklere bak ve sana en çok benzeyene dokun — seçenekler hazır olana kadar burada kalıyor.',
  ar: 'الآن، وبهذا في ذهنك، انظر إلى الخيارات بالأسفل واضغط الأقرب إليك — تبقى الخيارات هنا حتى تكون مستعداً للاختيار.',
};

const OPTION_GUIDE_TITLE = {
  fa: 'راهنمای خیلی ساده گزینه‌ها:',
  en: 'Plain option guide:',
  tr: 'Seçeneklerin sade rehberi:',
  ar: 'دليل مبسط للخيارات:',
};
const GENERAL_SELECTION_NOTE = {
  fa: 'به زبان ساده: لازم نیست گزینه‌ای را بزنی که «بهتر» یا «حرفه‌ای‌تر» به نظر می‌رسد. گزینه‌ای را بزن که در زندگی واقعی بیشتر شبیه رفتار، انرژی یا ترجیح توست.',
  en: 'In simple terms: do not choose what sounds “better” or more impressive. Choose the option that best matches your real behavior, energy, or preference.',
  tr: 'Basitçe: kulağa daha iyi ya da daha etkileyici geleni seçme. Gerçek davranışına, enerjine veya tercihine en yakın olanı seç.',
  ar: 'ببساطة: لا تختر ما يبدو أفضل أو أرقى. اختر ما يشبه سلوكك الحقيقي أو طاقتك أو تفضيلك.',
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
    fa: 'این سؤال یک ترجیح یادگیری یا کاری ساده را می‌سنجد (مثل نظم، تجربه‌های تازه یا تعامل). صادقانه‌ترین پاسخ، دقیق‌ترین نتیجه آموزشی را می‌سازد.',
    en: 'This question checks one simple learning or career preference (such as structure, new experiences, or interaction). The most honest answer gives the most useful educational result.',
    tr: 'Bu soru basit bir öğrenme ya da kariyer tercihini kontrol eder. En dürüst yanıt en yararlı eğitim sonucunu verir.',
    ar: 'هذا السؤال يراجع تفضيلاً بسيطاً في التعلم أو العمل. الإجابة الأصدق تعطي نتيجة تعليمية أكثر فائدة.',
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

/** Plain-language explanation of the EXACT question on screen + its goal.
 *  It quotes the current question text so the help always matches what's being
 *  asked (not a generic per-axis paragraph). For MBTI-style questions it adds
 *  the concept from the glossary. Never changes the question — only explains it. */
function explanationForQuestion(q, lang) {
  const qText = L(q.text, lang);
  const optionGuide = [
    L(OPTION_GUIDE_TITLE, lang),
    ...q.options.map((opt) => `• ${L(opt.label, lang)} — ${optionShortMeaning(opt, lang)}`),
  ].join('\n');
  if (q.axis && AXIS_POLES[q.axis]) {
    const poles = L(AXIS_POLES[q.axis], lang) || AXIS_POLES[q.axis].en;
    const frame = (QUESTION_FRAME[lang] || QUESTION_FRAME.en)(qText, poles[0], poles[1]);
    const entry = DISCOVERY_GLOSSARY.find((e) => e.id === q.axis.toLowerCase());
    const concept = entry ? L(entry.explain, lang) : '';
    return [frame, concept, L(GENERAL_SELECTION_NOTE, lang), optionGuide].filter(Boolean).join('\n\n');
  }
  const lead = (QUOTE_LEAD[lang] || QUOTE_LEAD.en)(qText);
  const note = L(LAYER_EXPLAIN[q.layer] || LAYER_EXPLAIN.traits, lang);
  return `${lead}\n\n${note}\n\n${L(GENERAL_SELECTION_NOTE, lang)}\n\n${optionGuide}`;
}

function comparisonMessage(lang, question, candidates = []) {
  const [first, second] = candidates
    .map((candidate) => {
      const option = question.options.find((item) => item.id === candidate.optionId);
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
            action(lang, CTA_DEEP_FIT, 'deep_fit', INTENTS.DEEP_FIT_START, { variant: 'primary', icon: 'BrainCircuit' }),
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
        aiMsg(lang, `${L(EXPLAIN_LEAD, lang)}\n\n${explanationForQuestion(q, lang)}\n\n${L(CLOSE_TO_OPTIONS, lang)}`, { meta: { tone: 'assist' } }),
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
    const isVoiceInput = state.inputMode === 'voice';
    const verdict = classifyDiscoveryText(value, question, lang, { mode: isVoiceInput ? 'voice' : 'text' });
    const stepPatch = { currentStep: `discovery_q_${qIndex}` };

    if (verdict.kind === 'map') {
      const option = question.options.find((o) => o.id === verdict.optionId);
      const label = L(option.label, lang);
      if (isVoiceInput && (verdict.confidence || 0) >= 0.68) {
        const next = majorDiscoveryFlow[INTENTS.DISCOVERY_ANSWER]({ value: verdict.optionId, state });
        return {
          ...next,
          messages: [
            aiMsg(lang, (VOICE_ACCEPTED[lang] || VOICE_ACCEPTED.en)(label, verdict.reason || optionShortMeaning(option, lang)), {
              meta: { tone: 'assist' },
            }),
            ...(next.messages || []),
          ],
        };
      }
      // Keep ALL the original options on the confirm message, so the student can
      // confirm the guess OR tap a different option directly — options never
      // disappear while chatting.
      return {
        messages: [
          aiMsg(lang, CONFIRM_MAP[lang](label, verdict.reason || optionShortMeaning(option, lang)), {
            meta: { tone: 'assist' },
            actions: [
              action(lang, CONFIRM_YES, verdict.optionId, INTENTS.DISCOVERY_ANSWER, { variant: 'primary', icon: 'CheckCircle2' }),
              ...questionActions(lang, qIndex),
            ],
          }),
        ],
        patch: stepPatch,
      };
    }

    if (verdict.kind === 'compare') {
      const message = comparisonMessage(lang, question, verdict.candidates);
      const candidateIds = new Set((verdict.candidates || []).map((candidate) => candidate.optionId));
      const candidateActions = (verdict.candidates || [])
        .map((candidate) => question.options.find((option) => option.id === candidate.optionId))
        .filter(Boolean)
        .map((option) => action(lang, option.label, option.id, INTENTS.DISCOVERY_ANSWER, { variant: 'primary', icon: 'CheckCircle2' }));
      const remainingActions = questionActions(lang, qIndex).filter((item) => !candidateIds.has(item.value));
      return {
        messages: [
          aiMsg(lang, message || HELP_REASSURE, {
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
    const note = verdict.kind === 'help'
      ? HELP_REASSURE
      : isVoiceInput
        ? VOICE_UNSURE
        : UNSURE;
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
