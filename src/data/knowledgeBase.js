// Mini knowledge base powering the FAQ flow and the mock free-text "NLU".
// Real answers will come from the backend AI + CMS later; these entries keep
// the demo conversation honest and on-brand.
export const KNOWLEDGE_BASE = [
  {
    id: 'kb_scholarship',
    keywords: ['scholarship', 'burs', 'بورس', 'بورسیه', 'منحة', 'منح', 'discount', 'تخفیف'],
    question: {
      fa: 'بورسیه چطور کار می‌کند؟',
      en: 'How do scholarships work?',
      tr: 'Burslar nasıl işliyor?',
      ar: 'كيف تعمل المنح الدراسية؟',
    },
    answer: {
      fa: 'دانشگاه‌های خصوصی ترکیه معمولاً تخفیف شهریه ۲۵٪ تا ۷۵٪ ارائه می‌دهند و آکا ادو به تعداد محدودی صندلی بورسیه ۱۰۰٪ در دانشگاه‌های همکار دسترسی دارد. میزان بورسیه به رشته، مقطع و زمان ثبت‌نام بستگی دارد — هر چه زودتر اقدام کنید، گزینه‌های بهتری باز است.',
      en: 'Private universities in Turkey usually offer 25–75% tuition discounts, and ACCA EDU has access to a limited number of 100% scholarship seats at partner universities. The amount depends on the major, the degree level and how early you apply — earlier applications unlock better options.',
      tr: 'Türkiye’deki özel üniversiteler genellikle %25–75 arası burs sunar; ACCA EDU’nun partner üniversitelerde sınırlı sayıda %100 burslu kontenjana erişimi vardır. Oran; bölüme, dereceye ve başvuru zamanına göre değişir — erken başvuru daha iyi seçenekler açar.',
      ar: 'تقدّم الجامعات الخاصة في تركيا عادةً خصومات من 25% إلى 75% على الرسوم، ولدى ACCA EDU عدد محدود من مقاعد المنح الكاملة 100% لدى الجامعات الشريكة. تعتمد النسبة على التخصص والمرحلة وتوقيت التقديم — التقديم المبكر يفتح خيارات أفضل.',
    },
  },
  {
    id: 'kb_residence',
    keywords: ['residence', 'ikamet', 'اقامت', 'إقامة', 'permit', 'visa', 'ویزا', 'فيزا', 'e-ikamet'],
    question: {
      fa: 'اقامت دانشجویی چطور گرفته می‌شود؟',
      en: 'How does the student residence permit work?',
      tr: 'Öğrenci ikameti nasıl alınır?',
      ar: 'كيف أحصل على الإقامة الطلابية؟',
    },
    answer: {
      fa: 'بعد از ثبت‌نام در دانشگاه، درخواست اقامت دانشجویی (e-ikamet) داخل ترکیه ثبت می‌شود؛ مدارک اصلی شامل پاسپورت، مدرک دانشجویی، بیمه سلامت و سند محل سکونت است. تیم آکا ادو کل مسیر — از وقت راندوو تا تحویل کارت — همراه شماست.',
      en: 'After enrolling at the university, you file the student residence permit (e-ikamet) inside Turkey; the core documents are your passport, student certificate, health insurance and proof of address. The ACCA EDU team walks you through the whole path, from the appointment to receiving your card.',
      tr: 'Üniversiteye kayıttan sonra öğrenci ikameti (e-ikamet) Türkiye içinde başvurulur; temel belgeler pasaport, öğrenci belgesi, sağlık sigortası ve adres kanıtıdır. ACCA EDU ekibi randevudan kartın teslimine kadar yanınızdadır.',
      ar: 'بعد التسجيل في الجامعة، يُقدَّم طلب الإقامة الطلابية (e-ikamet) داخل تركيا؛ والمستندات الأساسية هي جواز السفر ووثيقة الطالب والتأمين الصحي وإثبات السكن. فريق ACCA EDU يرافقك طوال المسار من الموعد حتى استلام البطاقة.',
    },
  },
  {
    id: 'kb_cost',
    keywords: ['cost', 'tuition', 'fee', 'شهریه', 'هزینه', 'ücret', 'maliyet', 'رسوم', 'تكلفة', 'price'],
    question: {
      fa: 'هزینه تحصیل و زندگی چقدر است؟',
      en: 'How much do tuition and living cost?',
      tr: 'Eğitim ve yaşam maliyeti ne kadar?',
      ar: 'كم تكلفة الدراسة والمعيشة؟',
    },
    answer: {
      fa: 'شهریه رشته‌های غیرپزشکی در دانشگاه‌های خصوصی معمولاً از حدود ۲٬۵۰۰ تا ۹٬۰۰۰ دلار در سال است؛ رشته‌های پزشکی بالاتر است. هزینه زندگی دانشجویی در استانبول به‌طور متوسط حدود ۳۰۰ تا ۵۰۰ دلار در ماه (با خوابگاه) برآورد می‌شود. این اعداد در نسخه دمو نمونه هستند.',
      en: 'Non-medical majors at private universities usually run about $2,500–$9,000 per year; medical programs cost more. Student living costs in Istanbul average roughly $300–$500 per month with a dorm. Figures in this demo are sample data.',
      tr: 'Özel üniversitelerde tıp dışı bölümler genelde yılda yaklaşık 2.500–9.000 USD arasındadır; tıp programları daha yüksektir. İstanbul’da öğrenci yaşamı yurtla birlikte ayda ortalama 300–500 USD’dir. Bu demodaki rakamlar örnektir.',
      ar: 'تتراوح رسوم التخصصات غير الطبية في الجامعات الخاصة عادةً بين 2,500 و9,000 دولار سنوياً؛ والبرامج الطبية أعلى. متوسط تكلفة معيشة الطالب في إسطنبول حوالي 300–500 دولار شهرياً مع السكن الجامعي. الأرقام في هذه النسخة تجريبية.',
    },
  },
  {
    id: 'kb_language',
    keywords: ['language', 'english', 'turkish', 'زبان', 'انگلیسی', 'ترکی', 'dil', 'ingilizce', 'لغة', 'إنجليزية', 'toefl', 'ielts', 'tomer'],
    question: {
      fa: 'تحصیل به چه زبانی است؟ مدرک زبان لازم است؟',
      en: 'What language are programs taught in? Do I need a certificate?',
      tr: 'Programlar hangi dilde? Sertifika gerekir mi?',
      ar: 'بأي لغة تكون الدراسة؟ وهل أحتاج شهادة لغة؟',
    },
    answer: {
      fa: 'بیشتر دانشگاه‌های خصوصی هم برنامه انگلیسی دارند هم ترکی. برای برنامه‌های انگلیسی معمولاً آزمون داخلی دانشگاه یا TOEFL کافی است و بدون مدرک هم با گذراندن سال آمادگی (Prep) می‌توانید شروع کنید. برای برنامه‌های ترکی، مدرک TÖMER لازم می‌شود.',
      en: 'Most private universities offer both English and Turkish tracks. For English programs the university’s own exam or TOEFL is usually enough, and without a certificate you can start with a preparatory year. Turkish-track programs require a TÖMER certificate.',
      tr: 'Çoğu özel üniversitede hem İngilizce hem Türkçe programlar vardır. İngilizce programlar için üniversitenin kendi sınavı veya TOEFL genellikle yeterlidir; sertifikasız da hazırlık yılıyla başlayabilirsiniz. Türkçe programlar için TÖMER gerekir.',
      ar: 'تقدّم معظم الجامعات الخاصة برامج بالإنجليزية والتركية. للبرامج الإنجليزية يكفي عادةً اختبار الجامعة الداخلي أو TOEFL، ويمكن البدء بسنة تحضيرية إن لم تملك شهادة. البرامج التركية تتطلب شهادة TÖMER.',
    },
  },
  {
    id: 'kb_insurance',
    keywords: ['insurance', 'sigorta', 'بیمه', 'تأمين', 'health insurance'],
    question: {
      fa: 'بیمه سلامت دانشجویی چیست؟',
      en: 'What about student health insurance?',
      tr: 'Öğrenci sağlık sigortası nasıl?',
      ar: 'ماذا عن التأمين الصحي للطلاب؟',
    },
    answer: {
      fa: 'برای اقامت دانشجویی، بیمه سلامت خصوصی معتبر در ترکیه الزامی است و معمولاً سالانه تمدید می‌شود. دانشجویان زیر ۲۵ سال می‌توانند در بازه‌های مشخص به بیمه عمومی SGK هم منتقل شوند که پوشش کامل‌تری دارد.',
      en: 'A valid private health insurance in Turkey is mandatory for the residence permit and is renewed yearly. Students under 25 can also switch to the public SGK insurance during set windows, which gives fuller coverage.',
      tr: 'İkamet için Türkiye’de geçerli özel sağlık sigortası zorunludur ve yıllık yenilenir. 25 yaş altı öğrenciler belirli dönemlerde daha kapsamlı olan SGK’ya geçebilir.',
      ar: 'التأمين الصحي الخاص الساري في تركيا إلزامي للإقامة ويُجدَّد سنوياً. ويمكن للطلاب دون 25 عاماً الانتقال إلى التأمين الحكومي SGK في فترات محددة للحصول على تغطية أشمل.',
    },
  },
  {
    id: 'kb_housing',
    keywords: ['dorm', 'housing', 'accommodation', 'خوابگاه', 'مسکن', 'اسکان', 'yurt', 'konaklama', 'سكن'],
    question: {
      fa: 'خوابگاه و مسکن دانشجویی چطور است؟',
      en: 'How do dorms and student housing work?',
      tr: 'Yurt ve öğrenci konaklaması nasıl?',
      ar: 'كيف يعمل السكن الطلابي؟',
    },
    answer: {
      fa: 'گزینه‌ها شامل خوابگاه دانشگاه، خوابگاه‌های خصوصی و آپارتمان اشتراکی است. نکته مهم: آدرس شما باید رسماً در سیستم NVI ثبت شود چون برای اقامت حیاتی است. آکا ادو در انتخاب و رزرو مسکن قبل از ورود کمک می‌کند.',
      en: 'Options include university dorms, private dorms and shared apartments. Key point: your address must be officially registered in the NVI system, since it is critical for the residence permit. ACCA EDU helps you choose and reserve housing before arrival.',
      tr: 'Seçenekler üniversite yurdu, özel yurtlar ve paylaşımlı dairelerdir. Önemli: adresiniz NVI sisteminde resmî olarak kayıtlı olmalıdır; ikamet için kritiktir. ACCA EDU, varıştan önce konaklama seçimi ve rezervasyonunda yardımcı olur.',
      ar: 'الخيارات تشمل سكن الجامعة والسكن الخاص والشقق المشتركة. النقطة المهمة: يجب تسجيل عنوانك رسمياً في نظام NVI لأنه أساسي للإقامة. يساعدك فريق ACCA EDU في اختيار السكن وحجزه قبل الوصول.',
    },
  },
  {
    id: 'kb_documents',
    keywords: ['document', 'documents', 'مدارک', 'مدرک', 'belge', 'evrak', 'مستندات', 'وثائق', 'apply documents'],
    question: {
      fa: 'چه مدارکی برای پذیرش لازم است؟',
      en: 'What documents do I need to apply?',
      tr: 'Başvuru için hangi belgeler gerekli?',
      ar: 'ما المستندات المطلوبة للتقديم؟',
    },
    answer: {
      fa: 'برای شروع پذیرش معمولاً همین کافی است: اسکن پاسپورت، دیپلم (یا گواهی پیش‌دانشگاهی)، ریزنمرات و یک عکس پرسنلی. مدرک زبان اگر داشته باشید امتیاز است ولی برای شروع الزامی نیست. ترجمه رسمی مدارک را هم تیم ما راهنمایی می‌کند.',
      en: 'To start an application you usually just need: a passport scan, your diploma (or pre-graduation letter), transcripts and one personal photo. A language certificate helps but is not required to start. Our team also guides you on certified translations.',
      tr: 'Başvuruya başlamak için genellikle şunlar yeterli: pasaport taraması, diploma (veya geçici mezuniyet yazısı), transkript ve bir vesikalık. Dil sertifikası avantajdır ama başlangıçta zorunlu değildir. Yeminli çeviri için de ekibimiz yol gösterir.',
      ar: 'لبدء التقديم تحتاج عادةً إلى: صورة جواز السفر، الشهادة الثانوية (أو إفادة تخرج)، كشف الدرجات وصورة شخصية. شهادة اللغة ميزة لكنها ليست شرطاً للبدء. كما يرشدك فريقنا للترجمة المحلّفة.',
    },
  },
  {
    id: 'kb_intakes',
    keywords: ['deadline', 'intake', 'semester', 'مهلت', 'ترم', 'şubat', 'eylül', 'dönem', 'موعد', 'فصل', 'when apply'],
    question: {
      fa: 'چه زمانی باید اقدام کنم؟',
      en: 'When should I apply?',
      tr: 'Ne zaman başvurmalıyım?',
      ar: 'متى يجب أن أقدّم؟',
    },
    answer: {
      fa: 'دو ورودی اصلی وجود دارد: پاییز (سپتامبر/اکتبر) و بهار (فوریه). ثبت‌نام ورودی پاییز معمولاً از بهار همان سال باز می‌شود و صندلی‌های بورسیه زودتر پر می‌شوند — بهترین زمان اقدام ۴ تا ۶ ماه قبل از شروع ترم است.',
      en: 'There are two main intakes: Fall (September/October) and Spring (February). Fall applications usually open in spring, and scholarship seats fill early — the sweet spot is applying 4–6 months before the semester starts.',
      tr: 'İki ana dönem var: Güz (Eylül/Ekim) ve Bahar (Şubat). Güz başvuruları genellikle ilkbaharda açılır ve burslu kontenjanlar erken dolar — en iyi zaman, dönemden 4–6 ay öncesidir.',
      ar: 'هناك فصلان رئيسيان: الخريف (سبتمبر/أكتوبر) والربيع (فبراير). تفتح طلبات الخريف عادةً في الربيع، وتمتلئ مقاعد المنح مبكراً — الوقت الأمثل للتقديم قبل 4–6 أشهر من بداية الفصل.',
    },
  },
];

export function findKnowledgeEntry(id) {
  return KNOWLEDGE_BASE.find((e) => e.id === id) || null;
}

/** Naive keyword lookup used by the mock free-text understanding. */
export function matchKnowledge(text) {
  const t = String(text || '').toLowerCase();
  if (!t.trim()) return null;
  let best = null;
  let bestHits = 0;
  for (const entry of KNOWLEDGE_BASE) {
    const hits = entry.keywords.reduce((n, k) => (t.includes(k.toLowerCase()) ? n + 1 : n), 0);
    if (hits > bestHits) {
      best = entry;
      bestHits = hits;
    }
  }
  return best;
}
