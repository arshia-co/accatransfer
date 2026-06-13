// Major Discovery question bank.
// Each option adds weighted scores to several dimensions at once:
//   riasec : R I A S E C            (interest types)
//   preference / trait dimensions are internal scoring signals only. They are
//   never presented as a personality test or diagnostic result in the UI.
//   acca   : Health Business Tech Creative Research People Stability
//   motiv  : Income Prestige Security SocialImpact Autonomy Creativity Migration
// Weights are deliberately simple integers so the whole layer can be replaced
// by a real scoring service later without touching the UI.

export const MAJOR_QUESTIONS = [
  {
    id: 'q1',
    text: {
      fa: 'کدام درس در مدرسه باعث می‌شد زمان را فراموش کنید؟',
      en: 'Which school subject made you lose track of time?',
      tr: 'Okulda hangi ders zamanı unutturuyordu?',
      ar: 'أي مادة دراسية كانت تنسيك الوقت؟',
    },
    options: [
      {
        id: 'q1_bio',
        label: { fa: 'زیست و آزمایشگاه', en: 'Biology & lab work', tr: 'Biyoloji ve laboratuvar', ar: 'الأحياء والمختبر' },
        weights: { riasec: { I: 2, S: 1 }, mbti: { S: 1 }, big5: { C: 1 }, hexaco: { C: 1 }, acca: { Health: 3, Research: 1 }, motiv: { SocialImpact: 1 } },
      },
      {
        id: 'q1_math',
        label: { fa: 'ریاضی و کامپیوتر', en: 'Math & computers', tr: 'Matematik ve bilgisayar', ar: 'الرياضيات والحاسوب' },
        weights: { riasec: { I: 2, R: 1 }, mbti: { T: 1, N: 1 }, big5: { O: 1 }, hexaco: { O: 1 }, acca: { Tech: 3, Research: 1 }, motiv: { Autonomy: 1 } },
      },
      {
        id: 'q1_art',
        label: { fa: 'هنر و طراحی', en: 'Art & design', tr: 'Sanat ve tasarım', ar: 'الفن والتصميم' },
        weights: { riasec: { A: 3 }, mbti: { N: 1, F: 1 }, big5: { O: 2 }, hexaco: { O: 2 }, acca: { Creative: 3 }, motiv: { Creativity: 2 } },
      },
      {
        id: 'q1_social',
        label: { fa: 'ادبیات و علوم اجتماعی', en: 'Languages & social studies', tr: 'Diller ve sosyal bilimler', ar: 'اللغات والعلوم الاجتماعية' },
        weights: { riasec: { S: 2, E: 1 }, mbti: { F: 1 }, big5: { A: 1, E: 1 }, hexaco: { X: 1 }, acca: { People: 3 }, motiv: { SocialImpact: 1 } },
      },
    ],
  },
  {
    id: 'q2',
    text: {
      fa: 'دوستانتان معمولاً برای چه چیزی سراغ شما می‌آیند؟',
      en: 'Your friends usually come to you when they need…',
      tr: 'Arkadaşların genelde ne için sana gelir?',
      ar: 'عادةً ما يلجأ إليك أصدقاؤك عندما يحتاجون…',
    },
    options: [
      {
        id: 'q2_listen',
        label: { fa: 'کسی که گوش بدهد و کمک کند', en: 'Someone to listen and help', tr: 'Dinleyip yardım edecek biri', ar: 'من يستمع ويساعد' },
        weights: { riasec: { S: 3 }, mbti: { F: 2 }, big5: { A: 2, Em: 1 }, hexaco: { A: 2, Em: 1 }, acca: { Health: 1, People: 2 }, motiv: { SocialImpact: 2 } },
      },
      {
        id: 'q2_plan',
        label: { fa: 'یک برنامه دقیق و مرحله‌به‌مرحله', en: 'A clear step-by-step plan', tr: 'Net, adım adım bir plan', ar: 'خطة واضحة خطوة بخطوة' },
        weights: { riasec: { E: 1, C: 2 }, mbti: { J: 2, T: 1 }, big5: { C: 2 }, hexaco: { C: 2 }, acca: { Business: 2, Stability: 1 }, motiv: { Security: 1 } },
      },
      {
        id: 'q2_idea',
        label: { fa: 'یک ایده خلاقانه و متفاوت', en: 'A fresh creative idea', tr: 'Yaratıcı, taze bir fikir', ar: 'فكرة إبداعية جديدة' },
        weights: { riasec: { A: 2, I: 1 }, mbti: { N: 2, P: 1 }, big5: { O: 2 }, hexaco: { O: 2 }, acca: { Creative: 2 }, motiv: { Creativity: 2 } },
      },
      {
        id: 'q2_fix',
        label: { fa: 'کسی که خرابی را تعمیر کند', en: 'Someone to fix what is broken', tr: 'Bozulanı tamir edecek biri', ar: 'من يصلح ما تعطّل' },
        weights: { riasec: { R: 3 }, mbti: { S: 1, T: 1 }, big5: { C: 1 }, hexaco: { C: 1 }, acca: { Tech: 2 }, motiv: { Autonomy: 1 } },
      },
    ],
  },
  {
    id: 'q3',
    text: {
      fa: 'برای یک آخر هفته آزاد کدام را انتخاب می‌کنید؟',
      en: 'Pick a project for a free weekend:',
      tr: 'Boş bir hafta sonu için bir proje seç:',
      ar: 'اختر مشروعاً لعطلة نهاية أسبوع حرة:',
    },
    options: [
      {
        id: 'q3_volunteer',
        label: { fa: 'داوطلب در یک کمپ سلامت', en: 'Volunteer at a health camp', tr: 'Sağlık kampında gönüllülük', ar: 'التطوع في مخيم صحي' },
        weights: { riasec: { S: 2 }, mbti: { F: 1, E: 1 }, big5: { A: 2 }, hexaco: { H: 1, A: 1 }, acca: { Health: 3 }, motiv: { SocialImpact: 2 } },
      },
      {
        id: 'q3_app',
        label: { fa: 'ساختن یک اپ یا ربات کوچک', en: 'Build a small app or robot', tr: 'Küçük bir uygulama ya da robot yap', ar: 'بناء تطبيق أو روبوت صغير' },
        weights: { riasec: { R: 2, I: 1 }, mbti: { T: 1, I: 1 }, big5: { O: 1 }, hexaco: { O: 1 }, acca: { Tech: 3 }, motiv: { Autonomy: 1 } },
      },
      {
        id: 'q3_design',
        label: { fa: 'بازطراحی اتاق یا یک پوستر', en: 'Redesign your room or a poster', tr: 'Odanı ya da bir afişi yeniden tasarla', ar: 'إعادة تصميم غرفتك أو ملصق' },
        weights: { riasec: { A: 3 }, mbti: { N: 1, P: 1 }, big5: { O: 2 }, hexaco: { O: 2 }, acca: { Creative: 3 }, motiv: { Creativity: 2 } },
      },
      {
        id: 'q3_shop',
        label: { fa: 'راه‌اندازی یک فروشگاه آنلاین کوچک', en: 'Start a small online shop', tr: 'Küçük bir online mağaza aç', ar: 'إطلاق متجر إلكتروني صغير' },
        weights: { riasec: { E: 3 }, mbti: { E: 1, J: 1 }, big5: { E: 1, C: 1 }, hexaco: { X: 1 }, acca: { Business: 3 }, motiv: { Income: 2 } },
      },
    ],
  },
  {
    id: 'q4',
    text: {
      fa: 'در کار گروهی به‌طور طبیعی چه نقشی می‌گیرید؟',
      en: 'In a team you naturally become…',
      tr: 'Bir ekipte doğal olarak hangi rolü alırsın?',
      ar: 'في فريق العمل، تصبح بشكل طبيعي…',
    },
    options: [
      {
        id: 'q4_lead',
        label: { fa: 'هماهنگ‌کننده و رهبر', en: 'The coordinator / leader', tr: 'Koordinatör / lider', ar: 'المنسّق / القائد' },
        weights: { riasec: { E: 3 }, mbti: { E: 2, J: 1 }, big5: { E: 2 }, hexaco: { X: 2 }, acca: { Business: 2, People: 1 }, motiv: { Prestige: 1 } },
      },
      {
        id: 'q4_research',
        label: { fa: 'پژوهشگر و تحلیل‌گر', en: 'The researcher / analyst', tr: 'Araştırmacı / analist', ar: 'الباحث / المحلّل' },
        weights: { riasec: { I: 3 }, mbti: { I: 2, T: 1 }, big5: { O: 1 }, hexaco: { O: 1 }, acca: { Research: 3 }, motiv: { Autonomy: 1 } },
      },
      {
        id: 'q4_present',
        label: { fa: 'ارائه‌دهنده و سخنگو', en: 'The presenter / storyteller', tr: 'Sunucu / anlatıcı', ar: 'المقدِّم / المتحدث' },
        weights: { riasec: { S: 2, E: 1 }, mbti: { E: 2, F: 1 }, big5: { E: 2 }, hexaco: { X: 2 }, acca: { People: 2, Creative: 1 }, motiv: { Prestige: 1 } },
      },
      {
        id: 'q4_quality',
        label: { fa: 'بررسی‌کننده جزئیات و کیفیت', en: 'The quality & detail checker', tr: 'Kalite ve detay kontrolcüsü', ar: 'مدقّق الجودة والتفاصيل' },
        weights: { riasec: { C: 3 }, mbti: { J: 2, S: 1 }, big5: { C: 2 }, hexaco: { C: 2, H: 1 }, acca: { Stability: 2 }, motiv: { Security: 1 } },
      },
    ],
  },
  {
    id: 'q5',
    text: {
      fa: 'کدام حس رضایت برایتان عمیق‌تر است؟',
      en: 'Which feels most satisfying?',
      tr: 'Hangisi sana daha derin bir tatmin verir?',
      ar: 'أيها يمنحك رضا أعمق؟',
    },
    options: [
      {
        id: 'q5_recover',
        label: { fa: 'کمک به بهبودی یک نفر', en: 'Helping someone recover', tr: 'Birinin iyileşmesine yardım etmek', ar: 'مساعدة شخص على التعافي' },
        weights: { riasec: { S: 3 }, mbti: { F: 2 }, big5: { A: 2, Em: 1 }, hexaco: { A: 1, Em: 1 }, acca: { Health: 3 }, motiv: { SocialImpact: 2 } },
      },
      {
        id: 'q5_puzzle',
        label: { fa: 'حل یک مسئله خیلی سخت', en: 'Cracking a hard problem', tr: 'Zor bir problemi çözmek', ar: 'حلّ مسألة صعبة' },
        weights: { riasec: { I: 3 }, mbti: { T: 2, N: 1 }, big5: { O: 1 }, hexaco: { O: 1 }, acca: { Research: 2, Tech: 1 }, motiv: { Autonomy: 1 } },
      },
      {
        id: 'q5_create',
        label: { fa: 'خلق چیزی زیبا و ماندگار', en: 'Creating something beautiful', tr: 'Güzel bir şey yaratmak', ar: 'صنع شيء جميل' },
        weights: { riasec: { A: 3 }, mbti: { N: 1, F: 1 }, big5: { O: 2 }, hexaco: { O: 2 }, acca: { Creative: 3 }, motiv: { Creativity: 2 } },
      },
      {
        id: 'q5_win',
        label: { fa: 'بستن یک معامله موفق', en: 'Closing a winning deal', tr: 'Kazandıran bir anlaşmayı kapatmak', ar: 'إتمام صفقة ناجحة' },
        weights: { riasec: { E: 3 }, mbti: { E: 1, T: 1 }, big5: { E: 1 }, hexaco: { X: 1 }, acca: { Business: 3 }, motiv: { Income: 2, Prestige: 1 } },
      },
    ],
  },
  {
    id: 'q6',
    text: {
      fa: 'تصمیم‌های مهم را چطور می‌گیرید؟',
      en: 'How do you make big decisions?',
      tr: 'Büyük kararları nasıl verirsin?',
      ar: 'كيف تتخذ قراراتك الكبيرة؟',
    },
    options: [
      {
        id: 'q6_logic',
        label: { fa: 'با لیست منطقی مزایا و معایب', en: 'A logical pros & cons list', tr: 'Mantıklı artı-eksi listesiyle', ar: 'بقائمة منطقية للإيجابيات والسلبيات' },
        weights: { riasec: { I: 1, C: 1 }, mbti: { T: 3, J: 1 }, big5: { C: 1 }, hexaco: { C: 1 }, acca: { Research: 1, Business: 1 }, motiv: { Security: 1 } },
      },
      {
        id: 'q6_heart',
        label: { fa: 'با قلب و ارزش‌هایم', en: 'My heart and my values', tr: 'Kalbim ve değerlerimle', ar: 'بقلبي وقيمي' },
        weights: { riasec: { S: 1, A: 1 }, mbti: { F: 3 }, big5: { A: 1, Em: 1 }, hexaco: { H: 1, Em: 1 }, acca: { People: 1, Creative: 1 }, motiv: { SocialImpact: 1 } },
      },
      {
        id: 'q6_ask',
        label: { fa: 'با مشورت آدم‌های مورد اعتماد', en: 'Asking people I trust', tr: 'Güvendiğim insanlara danışarak', ar: 'باستشارة من أثق بهم' },
        weights: { riasec: { S: 2 }, mbti: { E: 1, F: 1 }, big5: { A: 2, E: 1 }, hexaco: { A: 1, X: 1 }, acca: { People: 2 }, motiv: { Security: 1 } },
      },
      {
        id: 'q6_test',
        label: { fa: 'با آزمایش کوچک و اصلاح مسیر', en: 'Testing small, then adjusting', tr: 'Küçük deneyip yol düzelterek', ar: 'بتجربة صغيرة ثم التعديل' },
        weights: { riasec: { I: 1, E: 1 }, mbti: { P: 2, N: 1 }, big5: { O: 2 }, hexaco: { O: 1 }, acca: { Tech: 1, Business: 1 }, motiv: { Autonomy: 2 } },
      },
    ],
  },
  {
    id: 'q7',
    text: {
      fa: 'محیط کاری رویایی شما کدام است؟',
      en: 'Your dream workplace looks like…',
      tr: 'Hayalindeki iş yeri neresi?',
      ar: 'مكان عملك المثالي يشبه…',
    },
    options: [
      {
        id: 'q7_hospital',
        label: { fa: 'بیمارستان یا کلینیک', en: 'A hospital or clinic', tr: 'Hastane ya da klinik', ar: 'مستشفى أو عيادة' },
        weights: { riasec: { S: 2, I: 1 }, mbti: { S: 1, J: 1 }, big5: { C: 1, A: 1 }, hexaco: { C: 1, A: 1 }, acca: { Health: 3 }, motiv: { SocialImpact: 1, Prestige: 1 } },
      },
      {
        id: 'q7_startup',
        label: { fa: 'استارتاپ یا شرکت فناوری', en: 'A startup or tech company', tr: 'Startup ya da teknoloji şirketi', ar: 'شركة ناشئة أو تقنية' },
        weights: { riasec: { I: 1, E: 1, R: 1 }, mbti: { N: 1, P: 1 }, big5: { O: 2 }, hexaco: { O: 1, X: 1 }, acca: { Tech: 2, Business: 1 }, motiv: { Autonomy: 1, Income: 1 } },
      },
      {
        id: 'q7_studio',
        label: { fa: 'استودیو یا آژانس خلاق', en: 'A studio or creative agency', tr: 'Stüdyo ya da kreatif ajans', ar: 'استوديو أو وكالة إبداعية' },
        weights: { riasec: { A: 3 }, mbti: { N: 1, P: 1 }, big5: { O: 2 }, hexaco: { O: 2 }, acca: { Creative: 3 }, motiv: { Creativity: 2 } },
      },
      {
        id: 'q7_office',
        label: { fa: 'سازمان معتبر و باثبات', en: 'A stable, respected institution', tr: 'Köklü, istikrarlı bir kurum', ar: 'مؤسسة مرموقة ومستقرة' },
        weights: { riasec: { C: 2, E: 1 }, mbti: { S: 1, J: 2 }, big5: { C: 2 }, hexaco: { C: 1, H: 1 }, acca: { Stability: 3, Business: 1 }, motiv: { Security: 2 } },
      },
    ],
  },
  {
    id: 'q8',
    text: {
      fa: 'در آینده شغلی، چه چیزی برایتان مهم‌تر است؟',
      en: 'In your future career, what matters most?',
      tr: 'Gelecekteki kariyerinde en çok ne önemli?',
      ar: 'في مستقبلك المهني، ما الأهم؟',
    },
    options: [
      {
        id: 'q8_income',
        label: { fa: 'درآمد بالا', en: 'High income', tr: 'Yüksek gelir', ar: 'دخل مرتفع' },
        weights: { riasec: { E: 2 }, mbti: { T: 1 }, big5: { C: 1 }, hexaco: { X: 1 }, acca: { Business: 2 }, motiv: { Income: 3, Prestige: 1 } },
      },
      {
        id: 'q8_impact',
        label: { fa: 'تأثیر واقعی روی زندگی آدم‌ها', en: 'Real impact on people’s lives', tr: 'İnsan hayatına gerçek etki', ar: 'أثر حقيقي في حياة الناس' },
        weights: { riasec: { S: 2 }, mbti: { F: 2 }, big5: { A: 2 }, hexaco: { H: 2, A: 1 }, acca: { Health: 1, People: 2 }, motiv: { SocialImpact: 3 } },
      },
      {
        id: 'q8_security',
        label: { fa: 'امنیت و ثبات بلندمدت', en: 'Long-term security & stability', tr: 'Uzun vadeli güvence ve istikrar', ar: 'أمان واستقرار طويل الأمد' },
        weights: { riasec: { C: 2 }, mbti: { S: 1, J: 2 }, big5: { C: 2, Em: 1 }, hexaco: { C: 1, Em: 1 }, acca: { Stability: 3 }, motiv: { Security: 3 } },
      },
      {
        id: 'q8_freedom',
        label: { fa: 'آزادی برای ساختن و خلق کردن', en: 'Freedom to build and create', tr: 'Üretme ve yaratma özgürlüğü', ar: 'حرية البناء والإبداع' },
        weights: { riasec: { A: 1, E: 1, I: 1 }, mbti: { N: 1, P: 2 }, big5: { O: 2 }, hexaco: { O: 2 }, acca: { Creative: 1, Tech: 1 }, motiv: { Autonomy: 3, Creativity: 1 } },
      },
    ],
  },
  {
    id: 'q9',
    text: {
      fa: 'با یک موضوع پیچیده و جدید چطور روبه‌رو می‌شوید؟',
      en: 'A complex new topic appears — how do you learn it?',
      tr: 'Karmaşık yeni bir konu — nasıl öğrenirsin?',
      ar: 'موضوع جديد ومعقّد — كيف تتعلمه؟',
    },
    options: [
      {
        id: 'q9_deep',
        label: { fa: 'مطالعه عمیق منابع و مقاله‌ها', en: 'Deep-reading sources & papers', tr: 'Kaynakları derinlemesine okurum', ar: 'قراءة المصادر بعمق' },
        weights: { riasec: { I: 3 }, mbti: { I: 1, N: 1 }, big5: { O: 2 }, hexaco: { O: 2 }, acca: { Research: 3 }, motiv: { Autonomy: 1 } },
      },
      {
        id: 'q9_hands',
        label: { fa: 'تجربه عملی و دست‌به‌کار شدن', en: 'Hands-on trial and error', tr: 'Deneyerek, elimle yaparak', ar: 'التجربة العملية المباشرة' },
        weights: { riasec: { R: 3 }, mbti: { S: 2, P: 1 }, big5: { O: 1 }, hexaco: { X: 1 }, acca: { Tech: 2 }, motiv: { Autonomy: 1 } },
      },
      {
        id: 'q9_discuss',
        label: { fa: 'گفت‌وگو و یادگیری با دیگران', en: 'Discussing it with others', tr: 'Başkalarıyla tartışarak', ar: 'النقاش مع الآخرين' },
        weights: { riasec: { S: 2, E: 1 }, mbti: { E: 2 }, big5: { E: 2, A: 1 }, hexaco: { X: 2 }, acca: { People: 2 }, motiv: { SocialImpact: 1 } },
      },
      {
        id: 'q9_notes',
        label: { fa: 'جزوه‌نویسی منظم و مرحله‌به‌مرحله', en: 'Organized step-by-step notes', tr: 'Düzenli, adım adım not alarak', ar: 'تدوين منظّم خطوة بخطوة' },
        weights: { riasec: { C: 3 }, mbti: { S: 1, J: 2 }, big5: { C: 3 }, hexaco: { C: 3 }, acca: { Stability: 2 }, motiv: { Security: 1 } },
      },
    ],
  },
  {
    id: 'q10',
    text: {
      fa: 'پنج سال بعد از فارغ‌التحصیلی، خودتان را کجا می‌بینید؟',
      en: 'Five years after graduation, where do you see yourself?',
      tr: 'Mezuniyetten beş yıl sonra kendini nerede görüyorsun?',
      ar: 'بعد خمس سنوات من التخرج، أين ترى نفسك؟',
    },
    options: [
      {
        id: 'q10_global',
        label: { fa: 'در حال کار در یک کشور دیگر', en: 'Working internationally', tr: 'Uluslararası bir kariyerde', ar: 'أعمل في بلد آخر' },
        weights: { riasec: { E: 1, S: 1 }, mbti: { E: 1, N: 1 }, big5: { O: 2, E: 1 }, hexaco: { O: 1, X: 1 }, acca: { People: 1, Business: 1 }, motiv: { Migration: 3 } },
      },
      {
        id: 'q10_founder',
        label: { fa: 'مدیر کسب‌وکار خودم', en: 'Running my own business', tr: 'Kendi işimin başında', ar: 'أدير عملي الخاص' },
        weights: { riasec: { E: 3 }, mbti: { E: 1, P: 1 }, big5: { E: 1, O: 1 }, hexaco: { X: 1 }, acca: { Business: 3 }, motiv: { Autonomy: 2, Income: 1 } },
      },
      {
        id: 'q10_expert',
        label: { fa: 'متخصص شناخته‌شده یک حوزه', en: 'A recognized specialist', tr: 'Tanınan bir uzman', ar: 'خبير معروف في مجاله' },
        weights: { riasec: { I: 2, C: 1 }, mbti: { I: 1, J: 1 }, big5: { C: 2 }, hexaco: { C: 2 }, acca: { Research: 2, Health: 1 }, motiv: { Prestige: 3 } },
      },
      {
        id: 'q10_community',
        label: { fa: 'در حال کمک به جامعه‌ام', en: 'Serving my community', tr: 'Topluma hizmet ederken', ar: 'أخدم مجتمعي' },
        weights: { riasec: { S: 3 }, mbti: { F: 2 }, big5: { A: 2 }, hexaco: { H: 2, A: 1 }, acca: { Health: 1, People: 2 }, motiv: { SocialImpact: 3 } },
      },
    ],
  },
];

// ACCA academic archetypes. `match` lists the (top ACCA category, strong RIASEC
// letters) combinations that map a student onto the archetype.
export const ARCHETYPES = [
  {
    id: 'clinical_helper',
    icon: 'HeartPulse',
    match: { acca: 'Health', riasec: ['S', 'I'] },
    name: { fa: 'کاوشگر سلامت و مراقبت', en: 'Health & Care Explorer', tr: 'Sağlık ve Bakım Kaşifi', ar: 'مستكشف الصحة والرعاية' },
    blurb: {
      fa: 'پاسخ‌های شما ترکیبی از علاقه به علم، مراقبت و اثرگذاری مستقیم بر زندگی دیگران را نشان می‌دهد.',
      en: 'Your answers suggest a blend of interest in science, care, and making a direct difference in people’s lives.',
      tr: 'Yanıtlarınız bilim, bakım ve insanların yaşamında doğrudan fark yaratmaya yönelik bir ilgi gösteriyor.',
      ar: 'تشير إجاباتك إلى مزيج من الاهتمام بالعلم والرعاية وإحداث فرق مباشر في حياة الناس.',
    },
  },
  {
    id: 'scientific_analyst',
    icon: 'Microscope',
    match: { acca: 'Research', riasec: ['I', 'C'] },
    name: { fa: 'کاوشگر علمی و تحلیلی', en: 'Scientific & Analytical Explorer', tr: 'Bilimsel ve Analitik Kaşif', ar: 'مستكشف علمي وتحليلي' },
    blurb: {
      fa: 'پاسخ‌های شما علاقه به پرسش‌های عمیق، پژوهش و پیدا کردن الگوها را برجسته می‌کند.',
      en: 'Your answers highlight an interest in deep questions, research, and finding patterns.',
      tr: 'Yanıtlarınız derin sorulara, araştırmaya ve örüntü bulmaya ilginizi öne çıkarıyor.',
      ar: 'تبرز إجاباتك اهتماماً بالأسئلة العميقة والبحث واكتشاف الأنماط.',
    },
  },
  {
    id: 'strategic_builder',
    icon: 'TrendingUp',
    match: { acca: 'Business', riasec: ['E', 'C'] },
    name: { fa: 'سازنده کسب‌وکار و استراتژی', en: 'Business & Strategy Builder', tr: 'İş ve Strateji Kurucusu', ar: 'باني الأعمال والاستراتيجية' },
    blurb: {
      fa: 'پاسخ‌های شما به هدف‌گذاری، هماهنگ‌کردن افراد و ساختن ایده‌های قابل اجرا نزدیک است.',
      en: 'Your answers lean toward setting goals, coordinating people, and turning ideas into practical ventures.',
      tr: 'Yanıtlarınız hedef belirleme, insanları koordine etme ve fikirleri uygulanabilir girişimlere dönüştürmeye yakın.',
      ar: 'تميل إجاباتك إلى تحديد الأهداف وتنسيق الأشخاص وتحويل الأفكار إلى مشاريع عملية.',
    },
  },
  {
    id: 'creative_designer',
    icon: 'Palette',
    match: { acca: 'Creative', riasec: ['A', 'E'] },
    name: { fa: 'کاوشگر طراحی و خلاقیت', en: 'Design & Creativity Explorer', tr: 'Tasarım ve Yaratıcılık Kaşifi', ar: 'مستكشف التصميم والإبداع' },
    blurb: {
      fa: 'پاسخ‌های شما به خلق‌کردن، بیان ایده‌ها و تجربه‌های بصری و روایی گرایش دارد.',
      en: 'Your answers point toward creating, expressing ideas, and shaping visual or narrative experiences.',
      tr: 'Yanıtlarınız üretmeye, fikirleri ifade etmeye ve görsel ya da anlatısal deneyimler oluşturmaya işaret ediyor.',
      ar: 'تشير إجاباتك إلى الإبداع والتعبير عن الأفكار وصياغة تجارب بصرية أو سردية.',
    },
  },
  {
    id: 'technical_solver',
    icon: 'Cpu',
    match: { acca: 'Tech', riasec: ['R', 'I'] },
    name: { fa: 'کاوشگر فناوری و حل مسئله', en: 'Technology & Problem-Solving Explorer', tr: 'Teknoloji ve Problem Çözme Kaşifi', ar: 'مستكشف التقنية وحل المشكلات' },
    blurb: {
      fa: 'پاسخ‌های شما به ساختن، آزمایش‌کردن و حل مسئله‌های فنی و سیستمی نزدیک است.',
      en: 'Your answers lean toward building, testing, and solving technical or systems-based problems.',
      tr: 'Yanıtlarınız teknik veya sistem tabanlı sorunları kurmaya, denemeye ve çözmeye yakın.',
      ar: 'تميل إجاباتك إلى البناء والتجربة وحل المشكلات التقنية أو المرتبطة بالأنظمة.',
    },
  },
  {
    id: 'social_communicator',
    icon: 'Users',
    match: { acca: 'People', riasec: ['S', 'E'] },
    name: { fa: 'کاوشگر ارتباط و جامعه', en: 'Communication & Society Explorer', tr: 'İletişim ve Toplum Kaşifi', ar: 'مستكشف التواصل والمجتمع' },
    blurb: {
      fa: 'پاسخ‌های شما به گفت‌وگو، آموزش و وصل‌کردن آدم‌ها با ایده‌ها گرایش دارد.',
      en: 'Your answers point toward communication, learning with others, and connecting people with ideas.',
      tr: 'Yanıtlarınız iletişime, başkalarıyla öğrenmeye ve insanları fikirlerle buluşturmaya işaret ediyor.',
      ar: 'تشير إجاباتك إلى التواصل والتعلم مع الآخرين وربط الناس بالأفكار.',
    },
  },
  {
    id: 'stability_planner',
    icon: 'ShieldCheck',
    match: { acca: 'Stability', riasec: ['C', 'S'] },
    name: { fa: 'کاوشگر ساختار و برنامه‌ریزی', en: 'Structure & Planning Explorer', tr: 'Yapı ve Planlama Kaşifi', ar: 'مستكشف التنظيم والتخطيط' },
    blurb: {
      fa: 'پاسخ‌های شما به نظم، جزئیات و ساختن مسیرهای روشن و قابل پیگیری نزدیک است.',
      en: 'Your answers lean toward organization, detail, and building clear, dependable paths.',
      tr: 'Yanıtlarınız düzene, ayrıntıya ve açık, güvenilir yollar kurmaya yakın.',
      ar: 'تميل إجاباتك إلى التنظيم والتفاصيل وبناء مسارات واضحة يمكن الاعتماد عليها.',
    },
  },
  {
    id: 'global_seeker',
    icon: 'Globe2',
    match: { acca: 'GlobalMobility', riasec: ['E', 'S'] },
    name: { fa: 'جوینده فرصت جهانی', en: 'Global Opportunity Seeker', tr: 'Küresel Fırsat Avcısı', ar: 'الباحث عن الفرص العالمية' },
    blurb: {
      fa: 'پاسخ‌های شما به زبان‌ها، فرهنگ‌ها و ساختن آینده‌ای بین‌المللی گرایش روشنی دارد.',
      en: 'Your answers show a clear pull toward languages, cultures, and building an international future.',
      tr: 'Yanıtlarınız dillere, kültürlere ve uluslararası bir gelecek kurmaya belirgin bir eğilim gösteriyor.',
      ar: 'تُظهر إجاباتك ميلاً واضحاً نحو اللغات والثقافات وبناء مستقبل دولي.',
    },
  },
  {
    id: 'precision_specialist',
    icon: 'Crosshair',
    match: { acca: 'Precision', riasec: ['C', 'I'] },
    name: { fa: 'متخصص دقت و کیفیت', en: 'Precision Specialist', tr: 'Hassasiyet Uzmanı', ar: 'اختصاصي الدقة' },
    blurb: {
      fa: 'پاسخ‌های شما به جزئیات، استانداردها و کارِ بی‌نقص نزدیک است — جایی که دقت ارزش خلق می‌کند.',
      en: 'Your answers lean toward detail, standards, and flawless work — where precision creates value.',
      tr: 'Yanıtlarınız detaya, standartlara ve kusursuz işe yakın — hassasiyetin değer ürettiği yer.',
      ar: 'تميل إجاباتك إلى التفاصيل والمعايير والعمل المتقن — حيث تصنع الدقة القيمة.',
    },
  },
  {
    id: 'behavior_explorer',
    icon: 'Brain',
    match: { acca: 'People', riasec: ['I', 'S'] },
    name: { fa: 'کاوشگر رفتار انسان', en: 'Human Behavior Explorer', tr: 'İnsan Davranışı Kâşifi', ar: 'مستكشف السلوك الإنساني' },
    blurb: {
      fa: 'پاسخ‌های شما کنجکاوی علمی را با شیفتگی به درک آدم‌ها ترکیب می‌کند.',
      en: 'Your answers combine scientific curiosity with a fascination for understanding people.',
      tr: 'Yanıtlarınız bilimsel merakı insanları anlama tutkusuyla birleştiriyor.',
      ar: 'تجمع إجاباتك بين الفضول العلمي والشغف بفهم الناس.',
    },
  },
];

// Localized names for the ACCA interest categories (used as interest chips).
export const ACCA_CATEGORY_LABELS = {
  Health: { fa: 'سلامت و درمان', en: 'Health & care', tr: 'Sağlık', ar: 'الصحة والرعاية' },
  Business: { fa: 'کسب‌وکار و مدیریت', en: 'Business & management', tr: 'İş ve yönetim', ar: 'الأعمال والإدارة' },
  Tech: { fa: 'فناوری و مهندسی', en: 'Technology & engineering', tr: 'Teknoloji ve mühendislik', ar: 'التقنية والهندسة' },
  Creative: { fa: 'هنر و خلاقیت', en: 'Art & creativity', tr: 'Sanat ve yaratıcılık', ar: 'الفن والإبداع' },
  Research: { fa: 'علم و پژوهش', en: 'Science & research', tr: 'Bilim ve araştırma', ar: 'العلم والبحث' },
  People: { fa: 'انسان و جامعه', en: 'People & society', tr: 'İnsan ve toplum', ar: 'الإنسان والمجتمع' },
  Stability: { fa: 'نظم و ساختار', en: 'Order & structure', tr: 'Düzen ve yapı', ar: 'النظام والهيكل' },
  Leadership: { fa: 'رهبری', en: 'Leadership', tr: 'Liderlik', ar: 'القيادة' },
  Communication: { fa: 'ارتباطات', en: 'Communication', tr: 'İletişim', ar: 'التواصل' },
  Precision: { fa: 'دقت و جزئیات', en: 'Precision', tr: 'Hassasiyet', ar: 'الدقة' },
  GlobalMobility: { fa: 'تحرک جهانی', en: 'Global mobility', tr: 'Küresel hareketlilik', ar: 'الحراك العالمي' },
};

export const MOTIVATION_LABELS = {
  Income: { fa: 'درآمد', en: 'Income', tr: 'Gelir', ar: 'الدخل' },
  Prestige: { fa: 'اعتبار', en: 'Prestige', tr: 'Prestij', ar: 'المكانة' },
  Security: { fa: 'امنیت', en: 'Security', tr: 'Güvence', ar: 'الأمان' },
  SocialImpact: { fa: 'تأثیر اجتماعی', en: 'Social impact', tr: 'Sosyal etki', ar: 'الأثر الاجتماعي' },
  Autonomy: { fa: 'استقلال', en: 'Autonomy', tr: 'Özerklik', ar: 'الاستقلالية' },
  Creativity: { fa: 'خلاقیت', en: 'Creativity', tr: 'Yaratıcılık', ar: 'الإبداع' },
  Migration: { fa: 'زندگی بین‌المللی', en: 'International life', tr: 'Uluslararası yaşam', ar: 'حياة دولية' },
  FamilyApproval: { fa: 'رضایت خانواده', en: 'Family approval', tr: 'Aile onayı', ar: 'رضا العائلة' },
  Lifestyle: { fa: 'سبک زندگی متعادل', en: 'Balanced lifestyle', tr: 'Dengeli yaşam', ar: 'نمط حياة متوازن' },
};

// Self-reported academic strength areas (layer 5 of discovery).
export const ACADEMIC_STRENGTH_LABELS = {
  BiologyChemistry: { fa: 'زیست و شیمی', en: 'Biology & chemistry', tr: 'Biyoloji ve kimya', ar: 'الأحياء والكيمياء' },
  MathPhysics: { fa: 'ریاضی و فیزیک', en: 'Math & physics', tr: 'Matematik ve fizik', ar: 'الرياضيات والفيزياء' },
  LanguageCommunication: { fa: 'زبان و ارتباطات', en: 'Languages & communication', tr: 'Dil ve iletişim', ar: 'اللغات والتواصل' },
  ArtDesign: { fa: 'هنر و طراحی', en: 'Art & design', tr: 'Sanat ve tasarım', ar: 'الفن والتصميم' },
  BusinessEconomics: { fa: 'اقتصاد و کسب‌وکار', en: 'Business & economics', tr: 'İşletme ve ekonomi', ar: 'الأعمال والاقتصاد' },
  PsychologyHumanities: { fa: 'علوم انسانی و روان‌شناسی', en: 'Psychology & humanities', tr: 'Psikoloji ve sosyal bilimler', ar: 'علم النفس والإنسانيات' },
  TechnologyComputing: { fa: 'کامپیوتر و فناوری', en: 'Technology & computing', tr: 'Teknoloji ve bilişim', ar: 'التقنية والحوسبة' },
  ResearchWriting: { fa: 'پژوهش و نوشتن', en: 'Research & writing', tr: 'Araştırma ve yazma', ar: 'البحث والكتابة' },
};
