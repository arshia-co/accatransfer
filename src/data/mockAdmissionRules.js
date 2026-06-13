// Demo admission rules: required documents and the step-by-step timeline the
// assistant previews. A backend rules service will replace this module later.

export const DEGREE_LEVELS = [
  { id: 'highschool', label: { fa: 'دانش‌آموز دبیرستان', en: 'High-school student', tr: 'Lise öğrencisi', ar: 'طالب ثانوية' } },
  { id: 'bachelor', label: { fa: 'متقاضی کارشناسی', en: 'Bachelor applicant', tr: 'Lisans adayı', ar: 'متقدم للبكالوريوس' } },
  { id: 'master', label: { fa: 'متقاضی ارشد', en: 'Master applicant', tr: 'Yüksek lisans adayı', ar: 'متقدم للماجستير' } },
  { id: 'transfer', label: { fa: 'انتقالی (مثلاً پزشکی)', en: 'Transfer student', tr: 'Yatay geçiş', ar: 'طالب تحويل' } },
];

export const BUDGET_RANGES = [
  { id: 'b_low', maxUSD: 4000, label: { fa: 'تا ۴ هزار دلار در سال', en: 'Up to $4k / year', tr: 'Yılda 4 bin $’a kadar', ar: 'حتى 4 آلاف دولار سنوياً' } },
  { id: 'b_mid', maxUSD: 9000, label: { fa: '۴ تا ۹ هزار دلار در سال', en: '$4k–$9k / year', tr: 'Yılda 4–9 bin $', ar: '4–9 آلاف دولار سنوياً' } },
  { id: 'b_high', maxUSD: 30000, label: { fa: 'بالای ۹ هزار دلار (شامل پزشکی)', en: 'Above $9k (incl. medicine)', tr: '9 bin $ üzeri (tıp dâhil)', ar: 'أكثر من 9 آلاف (يشمل الطب)' } },
  { id: 'b_unsure', maxUSD: null, label: { fa: 'هنوز مطمئن نیستم', en: 'Not sure yet', tr: 'Henüz emin değilim', ar: 'لست متأكداً بعد' } },
];

export const GPA_RANGES = [
  { id: 'g_high', label: { fa: 'بالای ۱۷ (از ۲۰)', en: 'Top tier (85%+)', tr: 'Üst dilim (%85+)', ar: 'ممتاز (85%+)' } },
  { id: 'g_mid', label: { fa: 'بین ۱۴ تا ۱۷', en: 'Strong (70–85%)', tr: 'İyi (%70–85)', ar: 'جيد جداً (70–85%)' } },
  { id: 'g_ok', label: { fa: 'بین ۱۲ تا ۱۴', en: 'Average (60–70%)', tr: 'Orta (%60–70)', ar: 'متوسط (60–70%)' } },
  { id: 'g_low', label: { fa: 'زیر ۱۲', en: 'Below 60%', tr: '%60 altı', ar: 'أقل من 60%' } },
];

export const COUNTRIES = [
  { id: 'ir', label: { fa: 'ایران', en: 'Iran', tr: 'İran', ar: 'إيران' } },
  { id: 'az', label: { fa: 'آذربایجان', en: 'Azerbaijan', tr: 'Azerbaycan', ar: 'أذربيجان' } },
  { id: 'iq', label: { fa: 'عراق', en: 'Iraq', tr: 'Irak', ar: 'العراق' } },
  { id: 'tm', label: { fa: 'ترکمنستان', en: 'Turkmenistan', tr: 'Türkmenistan', ar: 'تركمانستان' } },
  { id: 'other', label: { fa: 'کشور دیگر', en: 'Other country', tr: 'Diğer', ar: 'بلد آخر' } },
];

// Document checklist per degree level (ids map to UI document cards).
export const REQUIRED_DOCUMENTS = {
  highschool: ['passport', 'transcript', 'photo'],
  bachelor: ['passport', 'diploma', 'transcript', 'photo', 'language'],
  master: ['passport', 'diploma', 'transcript', 'photo', 'language'],
  transfer: ['passport', 'diploma', 'transcript', 'photo', 'language'],
};

// The admission journey previewed by AdmissionTimelinePreview.
export const ADMISSION_TIMELINE = [
  {
    id: 't1',
    title: { fa: 'پروفایل و انتخاب رشته', en: 'Profile & major selection', tr: 'Profil ve bölüm seçimi', ar: 'الملف واختيار التخصص' },
    hint: { fa: 'هفته ۱', en: 'Week 1', tr: '1. hafta', ar: 'الأسبوع 1' },
    desc: {
      fa: 'تکمیل پروفایل هوشمند و نهایی کردن رشته و مقطع با مشاور.',
      en: 'Complete your smart profile and lock the major and degree with a counselor.',
      tr: 'Akıllı profili tamamlayıp bölüm ve dereceyi danışmanla netleştirin.',
      ar: 'أكمل ملفك الذكي وثبّت التخصص والمرحلة مع المستشار.',
    },
  },
  {
    id: 't2',
    title: { fa: 'فهرست دانشگاه‌ها و بورسیه', en: 'University shortlist & scholarships', tr: 'Üniversite listesi ve burslar', ar: 'قائمة الجامعات والمنح' },
    hint: { fa: 'هفته ۱–۲', en: 'Weeks 1–2', tr: '1–2. hafta', ar: 'الأسبوع 1–2' },
    desc: {
      fa: 'مقایسه شهریه‌ها، زبان تحصیل و گزینه‌های بورسیه دانشگاه‌های همکار.',
      en: 'Compare tuitions, teaching language and scholarship options across partners.',
      tr: 'Ücretleri, eğitim dilini ve burs seçeneklerini karşılaştırın.',
      ar: 'قارن الرسوم ولغة الدراسة وخيارات المنح بين الجامعات الشريكة.',
    },
  },
  {
    id: 't3',
    title: { fa: 'ارسال درخواست و مدارک', en: 'Application & documents', tr: 'Başvuru ve belgeler', ar: 'الطلب والمستندات' },
    hint: { fa: 'هفته ۲–۳', en: 'Weeks 2–3', tr: '2–3. hafta', ar: 'الأسبوع 2–3' },
    desc: {
      fa: 'بارگذاری پاسپورت، دیپلم و ریزنمرات؛ ثبت رسمی درخواست توسط آکا ادو.',
      en: 'Upload passport, diploma and transcripts; ACCA EDU files the official application.',
      tr: 'Pasaport, diploma ve transkript yüklenir; resmî başvuruyu ACCA EDU yapar.',
      ar: 'رفع جواز السفر والشهادة وكشف الدرجات؛ وتقدّم ACCA EDU الطلب رسمياً.',
    },
  },
  {
    id: 't4',
    title: { fa: 'دریافت پذیرش', en: 'Acceptance letter', tr: 'Kabul mektubu', ar: 'خطاب القبول' },
    hint: { fa: 'هفته ۳–۵', en: 'Weeks 3–5', tr: '3–5. hafta', ar: 'الأسبوع 3–5' },
    desc: {
      fa: 'صدور نامه پذیرش اولیه و سپس پذیرش نهایی پس از پیش‌پرداخت شهریه.',
      en: 'Conditional letter first, then the final acceptance after the tuition deposit.',
      tr: 'Önce şartlı kabul, depozito sonrası kesin kabul mektubu.',
      ar: 'خطاب قبول مبدئي ثم القبول النهائي بعد دفع العربون.',
    },
  },
  {
    id: 't5',
    title: { fa: 'ثبت‌نام و ویزا', en: 'Enrollment & visa', tr: 'Kayıt ve vize', ar: 'التسجيل والتأشيرة' },
    hint: { fa: 'ماه ۲–۳', en: 'Months 2–3', tr: '2–3. ay', ar: 'الشهر 2–3' },
    desc: {
      fa: 'ثبت‌نام نهایی در دانشگاه و در صورت نیاز، دریافت ویزای تحصیلی.',
      en: 'Final university registration and, if needed, the student visa.',
      tr: 'Üniversiteye kesin kayıt ve gerekiyorsa öğrenci vizesi.',
      ar: 'التسجيل النهائي في الجامعة، والحصول على التأشيرة إذا لزم.',
    },
  },
  {
    id: 't6',
    title: { fa: 'ورود، اسکان و اقامت', en: 'Arrival, housing & residence', tr: 'Varış, konaklama ve ikamet', ar: 'الوصول والسكن والإقامة' },
    hint: { fa: 'ماه ۳–۴', en: 'Months 3–4', tr: '3–4. ay', ar: 'الشهر 3–4' },
    desc: {
      fa: 'استقبال، تحویل مسکن، بیمه سلامت و ثبت درخواست اقامت دانشجویی.',
      en: 'Arrival support, housing handover, health insurance and the residence permit filing.',
      tr: 'Karşılama, konut teslimi, sağlık sigortası ve ikamet başvurusu.',
      ar: 'الاستقبال وتسليم السكن والتأمين الصحي وتقديم طلب الإقامة.',
    },
  },
];
