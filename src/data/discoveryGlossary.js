// Mini glossary that powers the in-conversation "smart help" during Major
// Discovery. When a student types a question like "what does introvert mean?"
// mid-question, the assistant explains the term in plain language (4 langs),
// then re-shows the same question so they can answer with confidence.
//
// Wording stays neutral and non-judgmental: no personality pole is framed as
// better — the goal is an honest, self-aware answer. Backend/LLM-replaceable.

export const DISCOVERY_GLOSSARY = [
  {
    id: 'ei',
    aliases: {
      fa: ['درون‌گرا', 'درونگرا', 'برون‌گرا', 'برونگرا', 'انرژی اجتماعی', 'اینترو', 'اکسترو'],
      en: ['introvert', 'introversion', 'extrovert', 'extravert', 'extroversion'],
      tr: ['içedönük', 'icedonuk', 'dışadönük', 'disadonuk', 'içe dönük'],
      ar: ['انطوائي', 'انبساطي', 'انطواء', 'انبساط'],
    },
    explain: {
      fa: 'درون‌گرا یعنی انرژی‌ات را بیشتر از زمان تنهایی و تمرکز عمیق می‌گیری، و برون‌گرا یعنی از بودن میان جمع و گفت‌وگو شارژ می‌شوی. هیچ‌کدام بهتر یا بدتر نیست؛ فقط می‌خواهم بدانم کدام به تو نزدیک‌تر است.',
      en: 'Being introverted means you recharge more from quiet, focused alone time; being extroverted means you gain energy from people and conversation. Neither is better — I just want to know which feels closer to you.',
      tr: 'İçedönük olmak sessiz ve odaklı yalnız zamandan enerji almak demektir; dışadönük olmak ise insanlardan ve sohbetten enerji almaktır. Hiçbiri daha iyi ya da kötü değil — sadece hangisinin sana yakın olduğunu merak ediyorum.',
      ar: 'الانطوائي يستمد طاقته أكثر من الوقت الهادئ والتركيز بمفرده، والانبساطي يستمدها من الناس والحديث. لا أحدهما أفضل من الآخر — أريد فقط معرفة أيهما أقرب إليك.',
    },
  },
  {
    id: 'sn',
    aliases: {
      fa: ['حسی', 'شهودی', 'شهود', 'واقع‌گرا', 'جزئی‌نگر', 'کل‌نگر'],
      en: ['sensing', 'intuition', 'intuitive', 'big picture', 'detail oriented'],
      tr: ['duyusal', 'sezgisel', 'sezgi', 'ayrıntı', 'bütün resim'],
      ar: ['حسي', 'حدسي', 'الحدس', 'التفاصيل', 'الصورة الكبرى'],
    },
    explain: {
      fa: 'برخی بهتر با جزئیات ملموس و مثال‌های واقعی یاد می‌گیرند (حسی)، و برخی با ایده‌ها، الگوها و تصویر کلی (شهودی). این سؤال فقط می‌سنجد ذهن تو با کدام راحت‌تر است.',
      en: 'Some people learn best from concrete details and real examples (sensing); others from ideas, patterns and the big picture (intuition). This question just checks which your mind prefers.',
      tr: 'Bazı insanlar somut ayrıntılar ve gerçek örneklerle (duyusal), bazıları ise fikirler, örüntüler ve büyük resimle (sezgisel) daha iyi öğrenir. Bu soru sadece zihninin hangisini tercih ettiğini ölçer.',
      ar: 'بعض الناس يتعلمون أفضل من التفاصيل الملموسة والأمثلة الواقعية (حسي)، وآخرون من الأفكار والأنماط والصورة الكبرى (حدسي). هذا السؤال يقيس فقط ما يفضّله عقلك.',
    },
  },
  {
    id: 'tf',
    aliases: {
      fa: ['منطقی', 'تحلیلی', 'احساسی', 'ارزش‌محور', 'منطق', 'احساس'],
      en: ['thinking', 'feeling', 'logic', 'logical', 'values based'],
      tr: ['mantıksal', 'düşünme', 'hissetme', 'değerler', 'mantık'],
      ar: ['منطقي', 'تحليلي', 'عاطفي', 'القيم', 'المنطق'],
    },
    explain: {
      fa: 'وقتی تصمیم می‌گیری، بعضی‌ها بیشتر به منطق و معیارهای عینی تکیه می‌کنند و بعضی‌ها به ارزش‌ها و اثر تصمیم روی آدم‌ها. اینجا هم پاسخ درست و غلط نداریم.',
      en: 'When you decide, some people lean more on logic and objective criteria, others on values and the human impact of the choice. Again, there is no right or wrong answer.',
      tr: 'Karar verirken bazı insanlar daha çok mantığa ve nesnel ölçütlere, bazıları ise değerlere ve kararın insanlara etkisine dayanır. Burada da doğru ya da yanlış yanıt yok.',
      ar: 'عند اتخاذ القرار، يعتمد بعض الناس أكثر على المنطق والمعايير الموضوعية، وآخرون على القيم وأثر القرار على الناس. ولا توجد هنا إجابة صحيحة أو خاطئة.',
    },
  },
  {
    id: 'jp',
    aliases: {
      fa: ['ساختارمند', 'منظم', 'منعطف', 'برنامه‌ریز', 'انعطاف', 'خودجوش'],
      en: ['judging', 'perceiving', 'structured', 'flexible', 'spontaneous', 'planner'],
      tr: ['planlı', 'yargılayıcı', 'algısal', 'esnek', 'yapılandırılmış'],
      ar: ['منظم', 'مرن', 'تخطيط', 'عفوي', 'منهجي'],
    },
    explain: {
      fa: 'بعضی‌ها با برنامه روشن و کارهای مرتب‌شده راحت‌ترند (ساختارمند) و بعضی‌ها دوست دارند گزینه‌ها باز بماند و در لحظه تصمیم بگیرند (منعطف). فقط بگو کدام بیشتر شبیه توست.',
      en: 'Some people feel best with a clear plan and things settled (structured); others like to keep options open and decide in the moment (flexible). Just tell me which is more like you.',
      tr: 'Bazı insanlar net bir plan ve düzenli işlerle daha rahattır (yapılandırılmış); bazıları seçenekleri açık tutup anında karar vermeyi sever (esnek). Sadece hangisinin sana daha çok benzediğini söyle.',
      ar: 'بعض الناس يرتاحون مع خطة واضحة وأمور مرتبة (منهجي)، وآخرون يفضّلون إبقاء الخيارات مفتوحة والقرار في اللحظة (مرن). أخبرني فقط أيهما يشبهك أكثر.',
    },
  },
  {
    id: 'mbti',
    aliases: {
      fa: ['ام بی تی آی', 'تیپ شخصیتی', 'شانزده تیپ', 'mbti'],
      en: ['mbti', 'personality type', '16 personalities', 'myers'],
      tr: ['mbti', 'kişilik tipi', 'kişilik testi'],
      ar: ['mbti', 'نمط الشخصية', 'أنماط الشخصية'],
    },
    explain: {
      fa: 'MBTI یک مدل شناخته‌شده برای توصیف ترجیح‌های فکری است. ما اینجا آزمون رسمی MBTI نمی‌گیریم؛ فقط از همان زبان ساده برای ساختن یک پروفایل راهنمای تحصیلی استفاده می‌کنیم.',
      en: 'MBTI is a well-known model for describing thinking preferences. We are not running an official MBTI test here — we just borrow its simple language to build an educational guidance profile.',
      tr: 'MBTI, düşünme tercihlerini tanımlayan tanınmış bir modeldir. Burada resmî bir MBTI testi yapmıyoruz — sadece bir eğitim rehberliği profili oluşturmak için onun basit dilini ödünç alıyoruz.',
      ar: 'MBTI نموذج معروف لوصف تفضيلات التفكير. نحن لا نُجري اختبار MBTI رسمياً هنا — نستعير لغته البسيطة فقط لبناء ملف إرشاد تعليمي.',
    },
  },
  {
    id: 'riasec',
    aliases: {
      fa: ['ریاسک', 'هالند', 'کد علاقه', 'riasec'],
      en: ['riasec', 'holland', 'interest code'],
      tr: ['riasec', 'holland', 'ilgi kodu'],
      ar: ['riasec', 'هولاند', 'رمز الاهتمام'],
    },
    explain: {
      fa: 'RIASEC یک دسته‌بندی شناخته‌شده از علاقه‌های شغلی است (واقع‌گرا، جستجوگر، هنری، اجتماعی، متهور، منظم). از آن کمک می‌گیرم تا ببینم چه نوع کاری برایت جذاب‌تر است.',
      en: 'RIASEC is a well-known way to group career interests (Realistic, Investigative, Artistic, Social, Enterprising, Conventional). I use it to see what kind of work attracts you.',
      tr: 'RIASEC, kariyer ilgilerini gruplamanın tanınmış bir yoludur (Gerçekçi, Araştırmacı, Sanatsal, Sosyal, Girişimci, Düzenli). Hangi tür işin seni çektiğini görmek için kullanıyorum.',
      ar: 'RIASEC طريقة معروفة لتصنيف الاهتمامات المهنية (واقعي، استقصائي، فني، اجتماعي، ريادي، تقليدي). أستخدمه لأرى نوع العمل الذي يجذبك.',
    },
  },
  {
    id: 'gpa',
    aliases: {
      fa: ['معدل', 'نمره', 'جی پی ای'],
      en: ['gpa', 'grade point', 'my grades'],
      tr: ['not ortalaması', 'gpa', 'notlarım'],
      ar: ['المعدل', 'الدرجات', 'معدلي'],
    },
    explain: {
      fa: 'معدل یعنی میانگین نمره‌های دیپلم یا دانشگاه تو. لازم نیست عدد دقیق بدهی؛ همین که بازه‌اش را بدانم برای تخمین شانس پذیرش کافی است.',
      en: 'GPA means the average of your high-school or university grades. You don’t need an exact number — knowing the rough range is enough for me to estimate admission chances.',
      tr: 'GPA, lise veya üniversite notlarının ortalaması demektir. Kesin bir sayı vermene gerek yok — kabul şansını tahmin etmem için aralığı bilmem yeterli.',
      ar: 'المعدل يعني متوسط درجاتك في الثانوية أو الجامعة. لا تحتاج إلى رقم دقيق — معرفة النطاق تكفيني لتقدير فرص القبول.',
    },
  },
  {
    id: 'prep',
    aliases: {
      fa: ['سال آمادگی', 'پیش‌دانشگاهی', 'پریپ', 'تومر', 'prep'],
      en: ['prep year', 'foundation year', 'preparatory', 'tomer'],
      tr: ['hazırlık', 'hazırlık yılı', 'tömer', 'tomer'],
      ar: ['سنة تحضيرية', 'تحضيري', 'تومر'],
    },
    explain: {
      fa: 'سال آمادگی یک سال پیش از شروع رشته اصلی است که بیشتر برای تقویت زبان (انگلیسی یا ترکی) گذاشته می‌شود. اجباری نیست و فقط وقتی لازم می‌شود که هنوز مدرک زبان نداشته باشی.',
      en: 'A prep year is one year before your main major, mostly to strengthen the language (English or Turkish). It is not always required — only when you don’t yet have a language certificate.',
      tr: 'Hazırlık yılı, ana bölümünden önceki bir yıldır ve çoğunlukla dili (İngilizce veya Türkçe) güçlendirmek içindir. Her zaman zorunlu değildir — yalnızca henüz dil sertifikan yoksa gerekir.',
      ar: 'السنة التحضيرية هي سنة قبل تخصصك الأساسي، غالباً لتقوية اللغة (الإنجليزية أو التركية). ليست إلزامية دائماً — فقط عندما لا تملك شهادة لغة بعد.',
    },
  },
];

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[‌‏‎]/g, '')
    .replace(/[ي]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .trim();

/** Returns the best-matching glossary entry for a free-text question, or null. */
export function matchGlossary(text) {
  const t = norm(text);
  if (!t) return null;
  let best = null;
  let bestLen = 0;
  for (const entry of DISCOVERY_GLOSSARY) {
    for (const list of Object.values(entry.aliases)) {
      for (const alias of list) {
        const a = norm(alias);
        if (a && t.includes(a) && a.length > bestLen) {
          best = entry;
          bestLen = a.length;
        }
      }
    }
  }
  return best;
}
