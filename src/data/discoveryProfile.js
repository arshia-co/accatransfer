// Result-content catalogs for the deep Major Discovery profile.
// Pure presentation data (4 languages) + tiny predicate helpers used by the
// mock scoring engine. A backend can later serve the same shapes from a CMS.
//
// Wording rule respected throughout: this is an educational guidance profile,
// NOT a clinical diagnosis and NOT an official MBTI assessment.

// ─────────────────────────── MBTI-inspired axes ───────────────────────────
export const AXIS_META = {
  EI: {
    letters: ['E', 'I'],
    name: { fa: 'انرژی اجتماعی', en: 'Social energy', tr: 'Sosyal enerji', ar: 'الطاقة الاجتماعية' },
    poles: {
      E: {
        label: { fa: 'برون‌گرایی', en: 'Extraversion', tr: 'Dışadönüklük', ar: 'الانبساط' },
        insight: {
          fa: 'در بحث گروهی، ارائه و یادگیری تعاملی بهترین عملکرد را دارید — کلاس‌های پرتعامل را دست‌کم نگیرید.',
          en: 'You study best with discussion, presentations and interactive classes — group energy is fuel, not distraction.',
          tr: 'Tartışma, sunum ve etkileşimli derslerde en iyi hâlindesin — grup enerjisi senin için yakıt.',
          ar: 'تتعلم أفضل عبر النقاش والعروض والصفوف التفاعلية — طاقة المجموعة وقود لك لا تشتيت.',
        },
      },
      I: {
        label: { fa: 'درون‌گرایی', en: 'Introversion', tr: 'İçedönüklük', ar: 'الانطواء' },
        insight: {
          fa: 'بهترین یادگیری شما در تمرکز عمیق و مطالعه مستقل اتفاق می‌افتد؛ برای کلاس‌های شلوغ، زمان بازیابی بگذارید.',
          en: 'Deep, independent focus is where you learn best; plan quiet recovery time around crowded classes.',
          tr: 'En iyi öğrenmen derin ve bağımsız odaklı çalışmada; kalabalık dersler için sessiz toparlanma zamanı planla.',
          ar: 'تتعلم أفضل في التركيز العميق والدراسة المستقلة؛ خصص وقتاً هادئاً للتعافي بعد الصفوف المزدحمة.',
        },
      },
    },
  },
  SN: {
    letters: ['S', 'N'],
    name: { fa: 'سبک یادگیری', en: 'Learning lens', tr: 'Öğrenme merceği', ar: 'عدسة التعلم' },
    poles: {
      S: {
        label: { fa: 'واقع‌گرایی', en: 'Sensing', tr: 'Duyumsama', ar: 'الحسية' },
        insight: {
          fa: 'با مثال واقعی، تمرین عملی و کاربرد ملموس سریع‌تر یاد می‌گیرید — رشته‌هایی با کارآموزی و آزمایشگاه به شما می‌سازند.',
          en: 'Real cases, labs and hands-on practice click fastest for you — favor programs with internships and applied work.',
          tr: 'Gerçek vakalar, laboratuvar ve uygulama sana daha hızlı oturur — staj ve uygulamalı programları öne al.',
          ar: 'الحالات الواقعية والتطبيق العملي والمختبرات أسرع طريق لفهمك — فضّل البرامج ذات التدريب العملي.',
        },
      },
      N: {
        label: { fa: 'شهود و الگو', en: 'Intuition', tr: 'Sezgi', ar: 'الحدس' },
        insight: {
          fa: 'با مفاهیم، الگوها و «چرا»های پشت موضوع درگیر می‌شوید — درس‌های نظری و پژوهشی برایتان خسته‌کننده نیستند، سوخت هستند.',
          en: 'Concepts, patterns and the “why” behind topics pull you in — theory-rich and research-driven courses energize you.',
          tr: 'Kavramlar, örüntüler ve konuların “neden”i seni içine çeker — teori ve araştırma ağırlıklı dersler sana enerji verir.',
          ar: 'تجذبك المفاهيم والأنماط و«لماذا» وراء المواضيع — المقررات النظرية والبحثية تمنحك طاقة.',
        },
      },
    },
  },
  TF: {
    letters: ['T', 'F'],
    name: { fa: 'سبک تصمیم‌گیری', en: 'Decision style', tr: 'Karar stili', ar: 'أسلوب اتخاذ القرار' },
    poles: {
      T: {
        label: { fa: 'تحلیل‌محوری', en: 'Thinking', tr: 'Düşünme', ar: 'التفكير التحليلي' },
        insight: {
          fa: 'تصمیم‌هایتان با معیار و منطق ساخته می‌شوند — در رشته‌هایی که استدلال و دقت می‌خواهند مزیت دارید.',
          en: 'You build decisions on criteria and logic — an advantage in majors that demand rigorous reasoning.',
          tr: 'Kararlarını ölçüt ve mantıkla kurarsın — sıkı akıl yürütme isteyen bölümlerde avantaj.',
          ar: 'تبني قراراتك على المعايير والمنطق — ميزة في التخصصات التي تتطلب استدلالاً دقيقاً.',
        },
      },
      F: {
        label: { fa: 'ارزش‌محوری', en: 'Feeling', tr: 'Hissetme', ar: 'التعاطف القيمي' },
        insight: {
          fa: 'اثر تصمیم روی آدم‌ها برایتان معیار اصلی است — مسیرهای انسان‌محور حس معنا به شما می‌دهند.',
          en: 'The human impact of a choice is your core criterion — people-centered paths will feel meaningful to you.',
          tr: 'Bir kararın insanlara etkisi senin ana ölçütün — insan odaklı yollar sana anlamlı gelecek.',
          ar: 'أثر القرار على الناس معيارك الأساسي — المسارات الإنسانية ستشعرك بالمعنى.',
        },
      },
    },
  },
  JP: {
    letters: ['J', 'P'],
    name: { fa: 'سبک برنامه‌ریزی', en: 'Planning style', tr: 'Planlama stili', ar: 'أسلوب التخطيط' },
    poles: {
      J: {
        label: { fa: 'ساختارگرایی', en: 'Judging', tr: 'Yargılama (düzen)', ar: 'التنظيم' },
        insight: {
          fa: 'با برنامه روشن و مسیر مشخص اوج می‌گیرید — برنامه درسی ساخت‌یافته و اهداف مرحله‌ای برایتان بهترین است.',
          en: 'You thrive on clear plans and defined milestones — structured curricula suit you best.',
          tr: 'Net plan ve belirlenmiş kilometre taşlarıyla yükselirsin — yapılandırılmış müfredat sana en uygunu.',
          ar: 'تزدهر مع الخطط الواضحة والمراحل المحددة — المناهج المنظمة هي الأنسب لك.',
        },
      },
      P: {
        label: { fa: 'انعطاف‌پذیری', en: 'Perceiving', tr: 'Algılama (esneklik)', ar: 'المرونة' },
        insight: {
          fa: 'گزینه‌های باز و آزادی عمل به شما انرژی می‌دهد — برنامه‌های درسی منعطف با درس‌های انتخابی زیاد را بگردید.',
          en: 'Open options and freedom energize you — look for flexible programs with many electives.',
          tr: 'Açık seçenekler ve özgürlük sana enerji verir — bol seçmeli, esnek programlara bak.',
          ar: 'الخيارات المفتوحة والحرية تمنحك طاقة — ابحث عن برامج مرنة بمواد اختيارية كثيرة.',
        },
      },
    },
  },
};

export const AXIS_BALANCED_NOTE = {
  fa: 'محور {axis} شما متعادل است، با تمایل خفیف به {pole}.',
  en: 'Your {axis} axis is balanced, with a slight preference toward {pole}.',
  tr: '{axis} eksenin dengeli; {pole} yönüne hafif bir eğilim var.',
  ar: 'محور {axis} لديك متوازن، مع ميل خفيف نحو {pole}.',
};

// ───────────────── Big-Five / HEXACO-inspired traits ─────────────────
export const TRAIT_META = {
  O: {
    label: { fa: 'گشودگی به تجربه', en: 'Openness', tr: 'Deneyime açıklık', ar: 'الانفتاح على التجربة' },
    blurb: {
      fa: 'اشتیاق به ایده‌ها و تجربه‌های نو؛ هرچه بالاتر، تحمل تکرار پایین‌تر.',
      en: 'Appetite for new ideas and experiences; the higher it is, the less routine you tolerate.',
      tr: 'Yeni fikir ve deneyimlere iştah; yükseldikçe rutine tahammül azalır.',
      ar: 'شهية للأفكار والتجارب الجديدة؛ كلما ارتفعت قلّ تحملك للروتين.',
    },
  },
  C: {
    label: { fa: 'وظیفه‌شناسی', en: 'Conscientiousness', tr: 'Sorumluluk', ar: 'يقظة الضمير' },
    blurb: {
      fa: 'نظم، پیگیری و تمام‌کردن کارها؛ پیش‌بینی‌کننده قوی موفقیت تحصیلی.',
      en: 'Order, follow-through and finishing what you start; a strong predictor of academic success.',
      tr: 'Düzen, takip ve bitiricilik; akademik başarının güçlü bir göstergesi.',
      ar: 'النظام والمتابعة وإنهاء ما تبدأه؛ مؤشر قوي على النجاح الأكاديمي.',
    },
  },
  E: {
    label: { fa: 'برون‌گرایی', en: 'Extraversion', tr: 'Dışadönüklük', ar: 'الانبساط' },
    blurb: {
      fa: 'انرژی گرفتن از تعامل؛ روی انتخاب محیط کلاس و خوابگاه اثر می‌گذارد.',
      en: 'Energy from interaction; shapes which class formats and campus life suit you.',
      tr: 'Etkileşimden enerji almak; ders formatı ve kampüs yaşamı seçimini etkiler.',
      ar: 'استمداد الطاقة من التفاعل؛ يؤثر على شكل الصفوف وحياة الحرم المناسبة لك.',
    },
  },
  A: {
    label: { fa: 'سازگاری', en: 'Agreeableness', tr: 'Uyumluluk', ar: 'الوفاق' },
    blurb: {
      fa: 'همکاری و اعتمادسازی؛ سرمایه مسیرهای تیمی و انسان‌محور.',
      en: 'Cooperation and trust-building; an asset in team-based and human-centered paths.',
      tr: 'İş birliği ve güven inşası; ekip temelli ve insan odaklı yollarda sermaye.',
      ar: 'التعاون وبناء الثقة؛ رصيد في المسارات الجماعية والإنسانية.',
    },
  },
  Em: {
    label: { fa: 'هیجان‌پذیری', en: 'Emotionality', tr: 'Duygusallık', ar: 'الانفعالية' },
    blurb: {
      fa: 'حساسیت به فشار و عمق احساسات؛ با برنامه‌ریزی درست به همدلی حرفه‌ای تبدیل می‌شود.',
      en: 'Sensitivity to pressure and emotional depth; with good planning it becomes professional empathy.',
      tr: 'Baskıya duyarlılık ve duygusal derinlik; iyi planlamayla profesyonel empatiye dönüşür.',
      ar: 'حساسية للضغط وعمق عاطفي؛ مع تخطيط جيد يتحولان إلى تعاطف مهني.',
    },
  },
  H: {
    label: { fa: 'صداقت-تواضع', en: 'Honesty-Humility', tr: 'Dürüstlük-Alçakgönüllülük', ar: 'الأمانة-التواضع' },
    blurb: {
      fa: 'انصاف و اصالت در تصمیم‌ها؛ در حرفه‌های مبتنی بر اعتماد (سلامت، حقوق) طلاست.',
      en: 'Fairness and authenticity in decisions; gold in trust-based professions like health and law.',
      tr: 'Kararlarda adalet ve özgünlük; sağlık ve hukuk gibi güven temelli mesleklerde altın değerinde.',
      ar: 'الإنصاف والأصالة في القرارات؛ ذهبٌ في المهن القائمة على الثقة كالصحة والقانون.',
    },
  },
};

export const LEVEL_LABELS = {
  high: { fa: 'بالا', en: 'High', tr: 'Yüksek', ar: 'مرتفع' },
  medium: { fa: 'متوسط', en: 'Medium', tr: 'Orta', ar: 'متوسط' },
  low: { fa: 'ملایم', en: 'Mild', tr: 'Hafif', ar: 'منخفض' },
};

export const CONFIDENCE_LABELS = {
  high: { fa: 'اطمینان بالا', en: 'High confidence', tr: 'Yüksek güven', ar: 'ثقة عالية' },
  medium: { fa: 'اطمینان متوسط', en: 'Medium confidence', tr: 'Orta güven', ar: 'ثقة متوسطة' },
  balanced: { fa: 'متعادل', en: 'Balanced', tr: 'Dengeli', ar: 'متوازن' },
};

// ─────────────────────────── Hidden strengths ───────────────────────────
// `when(s)` receives the signals object built in scoring.js. First 3 wins.
export const HIDDEN_STRENGTHS = [
  {
    id: 'pattern_vision',
    when: (s) => s.letters.has('N') && s.letters.has('T'),
    text: {
      fa: 'احتمالاً الگوها و پیامدهای آینده را زودتر از اطرافیانتان می‌بینید.',
      en: 'You may notice patterns and future implications faster than most people around you.',
      tr: 'Örüntüleri ve gelecekteki sonuçları çevrendekilerden daha hızlı fark ediyor olabilirsin.',
      ar: 'قد تلاحظ الأنماط وتبعات المستقبل أسرع من معظم من حولك.',
    },
  },
  {
    id: 'long_term_strategy',
    when: (s) => s.letters.has('J') && s.letters.has('T'),
    text: {
      fa: 'به‌جای تصمیم‌های هیجانی سریع، به استراتژی بلندمدت تمایل دارید — مزیتی کمیاب در سن انتخاب رشته.',
      en: 'You may prefer long-term strategy over quick emotional decisions — rare at major-choosing age.',
      tr: 'Hızlı duygusal kararlar yerine uzun vadeli stratejiye eğilimlisin — bölüm seçme yaşında nadir bir özellik.',
      ar: 'تميل إلى الاستراتيجية طويلة الأمد بدل القرارات العاطفية السريعة — ميزة نادرة في سن اختيار التخصص.',
    },
  },
  {
    id: 'deep_focus',
    when: (s) => s.letters.has('I') && s.riasecTop.includes('I'),
    text: {
      fa: 'توان تمرکز عمیق و طولانی روی یک موضوع دارید — همان عضله‌ای که پژوهش و رشته‌های دقیق می‌خواهند.',
      en: 'You can hold deep, long focus on one problem — exactly the muscle research-heavy fields demand.',
      tr: 'Tek bir konuya derin ve uzun odaklanabiliyorsun — araştırma ağırlıklı alanların istediği kas tam da bu.',
      ar: 'تستطيع التركيز العميق الطويل على مسألة واحدة — وهي العضلة التي تتطلبها المجالات البحثية.',
    },
  },
  {
    id: 'people_reading',
    when: (s) => s.letters.has('F') && s.riasecTop.includes('S'),
    text: {
      fa: 'چیزهایی را که آدم‌ها به زبان نمی‌آورند حس می‌کنید — مهارتی که در حرفه‌های انسانی قابل آموزش نیست.',
      en: 'You sense what people leave unsaid — a skill human-centered professions cannot easily teach.',
      tr: 'İnsanların söylemediklerini sezebiliyorsun — insan odaklı mesleklerin kolay öğretemediği bir beceri.',
      ar: 'تستشعر ما لا يقوله الناس — مهارة يصعب تعليمها في المهن الإنسانية.',
    },
  },
  {
    id: 'calm_execution',
    when: (s) => s.big5.C === 'high' && s.big5.Em !== 'high',
    text: {
      fa: 'زیر فشار، اجرا و کیفیت‌تان پایدار می‌ماند — استادها و کارفرماها عاشق این ویژگی‌اند.',
      en: 'Your execution stays steady under pressure — professors and employers love this trait.',
      tr: 'Baskı altında işin kalitesi düşmüyor — hocalar ve işverenler bu özelliğe bayılır.',
      ar: 'أداؤك يبقى ثابتاً تحت الضغط — صفة يعشقها الأساتذة وأصحاب العمل.',
    },
  },
  {
    id: 'creative_bridge',
    when: (s) => s.big5.O === 'high' && s.riasecTop.includes('A'),
    text: {
      fa: 'ایده‌های نامرتبط را به هم وصل می‌کنید — منبع راه‌حل‌هایی که بقیه نمی‌بینند.',
      en: 'You connect unrelated ideas — the source of solutions others simply do not see.',
      tr: 'Alakasız fikirleri birbirine bağlıyorsun — başkalarının göremediği çözümlerin kaynağı.',
      ar: 'تربط أفكاراً غير مترابطة — وهذا مصدر حلول لا يراها الآخرون.',
    },
  },
  {
    id: 'adaptive_pivot',
    when: (s) => s.letters.has('P') && s.big5.O !== 'low',
    text: {
      fa: 'وقتی شرایط عوض می‌شود، سریع‌تر از بقیه مسیر را اصلاح می‌کنید — در دنیای شغلیِ در حال تغییر، طلاست.',
      en: 'When conditions change, you re-route faster than most — gold in a fast-changing job market.',
      tr: 'Koşullar değişince rotanı çoğu kişiden hızlı düzeltiyorsun — değişen iş dünyasında altın değerinde.',
      ar: 'عندما تتغير الظروف تعدّل مسارك أسرع من الآخرين — ميزة ذهبية في سوق عمل متغيّر.',
    },
  },
  {
    id: 'quiet_leadership',
    when: (s) => s.accaTop.includes('Leadership') || (s.letters.has('E') && s.big5.A === 'high'),
    text: {
      fa: 'آدم‌ها بدون اینکه مجبورشان کنید دنبال برنامه شما می‌آیند — رهبریِ آرام اما واقعی.',
      en: 'People follow your plans without being pushed — quiet but real leadership.',
      tr: 'İnsanlar zorlanmadan planlarına katılıyor — sessiz ama gerçek liderlik.',
      ar: 'يتبع الناس خططك دون إجبار — قيادة هادئة لكنها حقيقية.',
    },
  },
  {
    id: 'precision_eye',
    when: (s) => s.riasecTop.includes('C') || s.accaTop.includes('Precision'),
    text: {
      fa: 'خطاهایی را می‌بینید که از چشم بقیه رد می‌شود — در رشته‌های پرجزئیات یک سپر محافظ است.',
      en: 'You catch errors others scroll past — a protective shield in detail-heavy fields.',
      tr: 'Başkalarının gözünden kaçan hataları yakalıyorsun — detay yoğun alanlarda koruyucu kalkan.',
      ar: 'تلتقط أخطاء تمر على غيرك — درع واقٍ في المجالات كثيفة التفاصيل.',
    },
  },
  {
    id: 'mission_driven',
    when: (s) => s.motivTop.includes('SocialImpact'),
    text: {
      fa: 'وقتی مسیر درسی یک مأموریت روشن داشته باشد، عملکردتان چند پله بالا می‌رود.',
      en: 'You may perform several levels higher when your study path has a clear mission.',
      tr: 'Eğitim yolunun net bir misyonu olduğunda performansın birkaç seviye yükselir.',
      ar: 'قد يرتفع أداؤك عدة درجات عندما يكون لمسارك الدراسي رسالة واضحة.',
    },
  },
  {
    id: 'independent_drive',
    when: (s) => s.motivTop.includes('Autonomy'),
    text: {
      fa: 'برای حرکت، منتظر دستور نمی‌مانید — خودتان موتور خودتان هستید.',
      en: 'You do not wait for instructions to move — you are your own engine.',
      tr: 'Harekete geçmek için talimat beklemiyorsun — kendi motorun sensin.',
      ar: 'لا تنتظر التعليمات لتتحرك — أنت محرك نفسك.',
    },
  },
  {
    id: 'steady_growth',
    when: () => true,
    text: {
      fa: 'پاسخ‌هایتان ثبات و یادگیری تدریجی نشان می‌دهد — همان چیزی که مسیرهای چهارساله می‌خواهند.',
      en: 'Your answers show steadiness and gradual growth — exactly what four-year paths reward.',
      tr: 'Yanıtların istikrar ve kademeli gelişim gösteriyor — dört yıllık yolların ödüllendirdiği şey.',
      ar: 'تُظهر إجاباتك ثباتاً ونمواً تدريجياً — وهو ما تكافئه المسارات الجامعية.',
    },
  },
];

// ─────────────────────────── Possible blind spots ───────────────────────────
export const BLIND_SPOTS = [
  {
    id: 'overthink_options',
    when: (s) => s.letters.has('N') && s.letters.has('P'),
    text: {
      fa: 'وقتی گزینه‌ها زیاد و باز باشند، ممکن است بیش از حد فکر کنید و تصمیم عقب بیفتد.',
      en: 'You may overthink when options are too open, and the decision quietly slips.',
      tr: 'Seçenekler çok açık olduğunda fazla düşünebilir, karar sessizce gecikebilir.',
      ar: 'قد تفرط في التفكير عندما تكون الخيارات مفتوحة جداً فيتأخر القرار بهدوء.',
    },
  },
  {
    id: 'repetition_fatigue',
    when: (s) => s.big5.O === 'high',
    text: {
      fa: 'اگر رشته بیش از حد تکراری شود، ممکن است انگیزه‌تان افت کند — به تنوع درس‌ها دقت کنید.',
      en: 'You may lose motivation if the field feels too repetitive — check the variety inside the curriculum.',
      tr: 'Alan fazla tekrara dönerse motivasyonun düşebilir — müfredattaki çeşitliliğe bak.',
      ar: 'قد تفقد الحافز إذا صار المجال متكرراً جداً — تحقق من تنوع المنهج.',
    },
  },
  {
    id: 'perfection_stall',
    when: (s) => s.letters.has('J') && s.big5.C === 'high',
    text: {
      fa: 'گاهی آن‌قدر کار را صیقل می‌دهید که از زمان عبور می‌کند — «به‌اندازه کافی خوب» را تمرین کنید.',
      en: 'You may polish work past the deadline — practice “good enough, shipped”.',
      tr: 'İşi bazen teslim tarihini aşacak kadar cilalayabilirsin — “yeterince iyi”yi çalış.',
      ar: 'قد تصقل العمل حتى يتجاوز موعده — تدرّب على «جيد بما يكفي».',
    },
  },
  {
    id: 'conflict_avoidance',
    when: (s) => s.letters.has('F') && s.big5.A === 'high',
    text: {
      fa: 'برای حفظ آرامش جمع، ممکن است زیادی «بله» بگویید — مرز سالم را از حالا تمرین کنید.',
      en: 'To keep the peace, you may say “yes” too often — start practicing healthy boundaries now.',
      tr: 'Ortamı korumak için fazla “evet” diyebilirsin — sağlıklı sınırları şimdiden çalış.',
      ar: 'قد تقول «نعم» أكثر من اللازم حفاظاً على الهدوء — تدرّب على الحدود الصحية من الآن.',
    },
  },
  {
    id: 'silent_burnout',
    when: (s) => s.big5.Em === 'high' && s.big5.C !== 'low',
    text: {
      fa: 'ممکن است بی‌صدا فشار را تحمل کنید تا جایی که خسته شوید — زود کمک خواستن، ضعف نیست.',
      en: 'You may carry pressure silently until it drains you — asking for help early is not weakness.',
      tr: 'Baskıyı sessizce taşıyıp tükenebilirsin — erken yardım istemek zayıflık değildir.',
      ar: 'قد تتحمل الضغط بصمت حتى يستنزفك — طلب المساعدة مبكراً ليس ضعفاً.',
    },
  },
  {
    id: 'spotlight_drain',
    when: (s) => s.axes.EI.winner === 'I' && s.axes.EI.confidence === 'high',
    text: {
      fa: 'رشته‌های پرتعاملِ دائمی می‌توانند خسته‌تان کنند — به ساعت‌های بازیابی در برنامه فکر کنید.',
      en: 'Nonstop people-facing programs can drain you — build recovery hours into any such plan.',
      tr: 'Sürekli insan yüzlü programlar seni yorabilir — böyle bir planda toparlanma saatleri bırak.',
      ar: 'البرامج الدائمة التواصل قد تستنزفك — ضع ساعات تعافٍ في أي خطة كهذه.',
    },
  },
  {
    id: 'solo_marathon_drain',
    when: (s) => s.axes.EI.winner === 'E' && s.axes.EI.confidence !== 'balanced',
    text: {
      fa: 'دوره‌های طولانی مطالعه انفرادی برایتان سخت می‌شود — گروه مطالعه بسازید، حتی دونفره.',
      en: 'Long solo study marathons get hard for you — build a study group, even of two.',
      tr: 'Uzun yalnız çalışma maratonları sana zor gelir — iki kişilik bile olsa çalışma grubu kur.',
      ar: 'مذاكرة فردية طويلة سترهقك — كوّن مجموعة دراسة ولو من شخصين.',
    },
  },
  {
    id: 'needs_clear_why',
    when: () => true,
    text: {
      fa: 'وقتی ارتباط رشته با شغل آینده مبهم باشد، انگیزه‌تان نوسان می‌کند — از همان ترم اول «چرا» را روشن نگه دارید.',
      en: 'You may need a clear connection between the major and a future career — keep the “why” visible from term one.',
      tr: 'Bölümle gelecekteki kariyer bağı belirsizse motivasyonun dalgalanabilir — “neden”i ilk dönemden görünür tut.',
      ar: 'قد تحتاج صلة واضحة بين التخصص والمستقبل المهني — أبقِ «لماذا» ظاهرة من الفصل الأول.',
    },
  },
];

// ─────────────────────── Best learning environment ───────────────────────
export const LEARNING_ENV = {
  social: {
    label: { fa: 'شیوه یادگیری', en: 'Learning mode', tr: 'Öğrenme biçimi', ar: 'نمط التعلم' },
    a: {
      label: { fa: 'مستقل', en: 'Independent', tr: 'Bağımsız', ar: 'مستقل' },
      desc: {
        fa: 'بخش بزرگی از پیشرفت‌تان در مطالعه عمیق فردی ساخته می‌شود.',
        en: 'Most of your progress is built in deep individual study.',
        tr: 'İlerlemenin büyük kısmı derin bireysel çalışmada şekillenir.',
        ar: 'معظم تقدمك يُبنى في الدراسة الفردية العميقة.',
      },
    },
    b: {
      label: { fa: 'گروهی', en: 'Group-based', tr: 'Grup temelli', ar: 'جماعي' },
      desc: {
        fa: 'بحث و هم‌تیمی‌ها سرعت یادگیری‌تان را چند برابر می‌کنند.',
        en: 'Discussion and teammates multiply your learning speed.',
        tr: 'Tartışma ve takım arkadaşları öğrenme hızını katlar.',
        ar: 'النقاش والزملاء يضاعفون سرعة تعلمك.',
      },
    },
  },
  structure: {
    label: { fa: 'ساختار برنامه', en: 'Curriculum structure', tr: 'Müfredat yapısı', ar: 'هيكل المنهج' },
    a: {
      label: { fa: 'ساخت‌یافته', en: 'Structured', tr: 'Yapılandırılmış', ar: 'منظم' },
      desc: {
        fa: 'نقشه راه روشن و ارزیابی منظم، بهترین خروجی را از شما می‌گیرد.',
        en: 'A clear roadmap with regular checkpoints gets your best output.',
        tr: 'Net yol haritası ve düzenli kontrol noktaları en iyi çıktını alır.',
        ar: 'خارطة طريق واضحة ونقاط تقييم منتظمة تستخرج أفضل ما لديك.',
      },
    },
    b: {
      label: { fa: 'منعطف', en: 'Flexible', tr: 'Esnek', ar: 'مرن' },
      desc: {
        fa: 'حق انتخاب در درس‌ها و پروژه‌ها انگیزه‌تان را زنده نگه می‌دارد.',
        en: 'Choice in courses and projects keeps your motivation alive.',
        tr: 'Ders ve projelerde seçim hakkı motivasyonunu canlı tutar.',
        ar: 'حرية اختيار المواد والمشاريع تبقي حافزك حياً.',
      },
    },
  },
  theory: {
    label: { fa: 'نظری یا عملی', en: 'Theory vs practice', tr: 'Teori / uygulama', ar: 'نظري أم عملي' },
    a: {
      label: { fa: 'نظریه‌محور', en: 'Theory-heavy', tr: 'Teori ağırlıklı', ar: 'نظري' },
      desc: {
        fa: 'مدل‌ها و مفاهیم عمیق برایتان جذاب‌اند؛ از درس‌های پایه قوی فرار نکنید.',
        en: 'Models and deep concepts attract you; embrace the heavy foundation courses.',
        tr: 'Modeller ve derin kavramlar seni çeker; ağır temel derslerden kaçma.',
        ar: 'النماذج والمفاهيم العميقة تجذبك؛ لا تتهرب من المقررات التأسيسية الثقيلة.',
      },
    },
    b: {
      label: { fa: 'عمل‌محور', en: 'Practice-heavy', tr: 'Uygulama ağırlıklı', ar: 'تطبيقي' },
      desc: {
        fa: 'آزمایشگاه، کارگاه و کارآموزی جایی است که دانش در شما ته‌نشین می‌شود.',
        en: 'Labs, workshops and internships are where knowledge actually sticks for you.',
        tr: 'Laboratuvar, atölye ve staj — bilgi sende asıl oralarda kalıcılaşır.',
        ar: 'المختبرات والورش والتدريب العملي حيث تترسخ المعرفة لديك فعلاً.',
      },
    },
  },
  focus: {
    label: { fa: 'جهت‌گیری مسیر', en: 'Path orientation', tr: 'Yol yönelimi', ar: 'توجه المسار' },
    a: {
      label: { fa: 'پژوهش‌محور', en: 'Research-facing', tr: 'Araştırma odaklı', ar: 'بحثي' },
      desc: {
        fa: 'محیط‌های دانشگاهی، آزمایشگاهی و داده‌محور با ذهن شما هم‌فرکانس‌اند.',
        en: 'Academic, lab and data environments run on your frequency.',
        tr: 'Akademik, laboratuvar ve veri ortamları seninle aynı frekansta.',
        ar: 'البيئات الأكاديمية والمختبرية والمعتمدة على البيانات على ترددك.',
      },
    },
    b: {
      label: { fa: 'انسان‌محور', en: 'People-facing', tr: 'İnsan odaklı', ar: 'تواصلي' },
      desc: {
        fa: 'محیط‌هایی که هر روز با آدم‌های واقعی سروکار دارند به شما انرژی می‌دهند.',
        en: 'Environments with real people every day give you energy back.',
        tr: 'Her gün gerçek insanlarla temas eden ortamlar sana enerji verir.',
        ar: 'البيئات التي تتعامل يومياً مع أناس حقيقيين تمنحك الطاقة.',
      },
    },
  },
};

// ───────────────────────────── Recap templates ─────────────────────────────
// {a} / {b} slots are filled with localized fragments computed mid-flow.
export const RECAP_TEMPLATES = {
  5: {
    fa: 'جمع‌بندی کوتاه: تا اینجا پاسخ‌هایتان نشان می‌دهد {a} و {b}. هنوز چیزی را قطعی نمی‌کنم — چند سؤال بعدی درباره سبک تصمیم‌گیری شماست.',
    en: 'Quick read so far: your answers suggest {a}, and {b}. Nothing is final yet — the next few questions look at how you decide.',
    tr: 'Kısa özet: Şu ana dek yanıtların {a} ve {b} olduğunu gösteriyor. Henüz hiçbir şey kesin değil — sıradaki sorular karar verme tarzına bakıyor.',
    ar: 'قراءة سريعة: تشير إجاباتك حتى الآن إلى {a} و{b}. لا شيء نهائي بعد — الأسئلة التالية عن طريقتك في اتخاذ القرار.',
  },
  10: {
    fa: 'نیمه راه! الگوی تصمیم‌گیری شما به {a} نزدیک است و در برنامه‌ریزی {b}. حالا برویم سراغ علاقه‌های واقعی‌تان.',
    en: 'Halfway there! Your decision pattern leans toward {a}, and your planning style looks {b}. Now let’s map your real interests.',
    tr: 'Yarıyı geçtik! Karar deseni {a} yönünde, planlama tarzın {b} görünüyor. Şimdi gerçek ilgi alanlarını haritalayalım.',
    ar: 'وصلنا المنتصف! نمط قراراتك يميل إلى {a} وأسلوب تخطيطك يبدو {b}. الآن لنرسم اهتماماتك الحقيقية.',
  },
  15: {
    fa: 'الگوی علایق‌تان دارد شکل می‌گیرد: {a} پررنگ‌ترین است و {b} هم پشت‌سرش. چند تصویر شخصیتی کوتاه مانده.',
    en: 'Your interest pattern is taking shape: {a} leads, with {b} right behind. A few short personality snapshots left.',
    tr: 'İlgi desenin şekilleniyor: {a} önde, {b} hemen arkasında. Birkaç kısa kişilik fotoğrafı kaldı.',
    ar: 'نمط اهتماماتك يتشكل: {a} في الصدارة و{b} خلفه مباشرة. بقيت لقطات شخصية قصيرة.',
  },
  20: {
    fa: 'تقریباً تمام است! تصویر شخصیتی شما {a} نشان می‌دهد. پنج سؤال آخر درباره انگیزه‌ها و نقطه شروع واقعی شماست — همین‌ها نتیجه را دقیق می‌کنند.',
    en: 'Almost done! Your personality snapshot shows {a}. The last five are about motivations and your real starting point — they sharpen the final result.',
    tr: 'Neredeyse bitti! Kişilik fotoğrafın {a} gösteriyor. Son beş soru motivasyonlar ve gerçek başlangıç noktan hakkında — sonucu bunlar netleştirir.',
    ar: 'كدنا ننتهي! لقطتك الشخصية تُظهر {a}. الأسئلة الخمسة الأخيرة عن الدوافع ونقطة انطلاقك الواقعية — وهي ما يصقل النتيجة.',
  },
};

export const RECAP_FRAGMENTS = {
  EI: {
    E: { fa: 'از تعامل با آدم‌ها انرژی می‌گیرید', en: 'you draw energy from people', tr: 'insanlardan enerji aldığını', ar: 'أنك تستمد طاقتك من الناس' },
    I: { fa: 'به تمرکز مستقل و عمیق تمایل دارید', en: 'you lean toward independent, deep focus', tr: 'bağımsız ve derin odaklanmaya eğilimli olduğunu', ar: 'أنك تميل إلى التركيز المستقل العميق' },
    balanced: { fa: 'بین کار جمعی و فردی تعادل دارید', en: 'you balance social and solo energy well', tr: 'sosyal ve bireysel enerjiyi dengelediğini', ar: 'أنك توازن بين الطاقة الاجتماعية والفردية' },
  },
  SN: {
    S: { fa: 'با واقعیت‌های ملموس بهتر یاد می‌گیرید', en: 'you learn best from concrete, real material', tr: 'somut ve gerçek materyalle daha iyi öğrendiğini', ar: 'أنك تتعلم أفضل من المواد الملموسة الواقعية' },
    N: { fa: 'به تصویر کلی و الگوها جذب می‌شوید', en: 'you are drawn to big pictures and patterns', tr: 'büyük resme ve örüntülere çekildiğini', ar: 'أنك تنجذب إلى الصورة الكبرى والأنماط' },
    balanced: { fa: 'هم به جزئیات و هم به تصویر کلی توجه می‌کنید', en: 'you watch both details and the big picture', tr: 'hem detaya hem büyük resme baktığını', ar: 'أنك تنتبه للتفاصيل والصورة الكبرى معاً' },
  },
  TF: {
    T: { fa: 'تحلیل ساخت‌یافته و منطقی', en: 'structured, analytical reasoning', tr: 'yapılandırılmış, analitik akıl yürütme', ar: 'التحليل المنطقي المنظم' },
    F: { fa: 'ارزش‌ها و اثر انسانی', en: 'values and human impact', tr: 'değerler ve insani etki', ar: 'القيم والأثر الإنساني' },
    balanced: { fa: 'ترکیبی از منطق و ارزش‌ها', en: 'a blend of logic and values', tr: 'mantık ve değerlerin bir karışımı', ar: 'مزيج من المنطق والقيم' },
  },
  JP: {
    J: { fa: 'ساخت‌یافته و برنامه‌محور به‌نظر می‌رسد', en: 'structured and plan-driven', tr: 'yapılandırılmış ve plan odaklı', ar: 'منظماً وقائماً على الخطط' },
    P: { fa: 'منعطف و کاوشگر به‌نظر می‌رسد', en: 'flexible and exploratory', tr: 'esnek ve keşfe açık', ar: 'مرناً واستكشافياً' },
    balanced: { fa: 'ترکیبی از نظم و انعطاف دارد', en: 'a mix of order and flexibility', tr: 'düzen ve esneklik karışımı', ar: 'مزيجاً من النظام والمرونة' },
  },
};

// ───────────────────── Headlines per primary archetype ─────────────────────
export const ARCHETYPE_HEADLINES = {
  clinical_helper: {
    fa: 'به‌نظر می‌رسد یک «یاری‌گر بالینی» هستید — همدلی عمیق با دقت علمی، آماده برای محیط‌های درمانی.',
    en: 'You seem like a Clinical Helper — deep empathy fused with scientific care, built for healing environments.',
    tr: 'Bir “Klinik Yardımcı” gibisin — bilimsel özenle birleşen derin empati, iyileştiren ortamlar için doğmuş.',
    ar: 'تبدو «معالجاً ميدانياً» — تعاطف عميق مع دقة علمية، مهيأ لبيئات الرعاية.',
  },
  scientific_analyst: {
    fa: 'به‌نظر می‌رسد یک «متفکر علمی استراتژیک» هستید — کنجکاوی تحلیلی قوی با تصمیم‌گیری آینده‌نگر.',
    en: 'You seem like a Strategic Scientific Thinker — strong analytical curiosity with future-oriented decision-making.',
    tr: 'Bir “Stratejik Bilimsel Düşünür” gibisin — güçlü analitik merak ve geleceğe dönük kararlar.',
    ar: 'تبدو «مفكراً علمياً استراتيجياً» — فضول تحليلي قوي مع قرارات موجهة نحو المستقبل.',
  },
  strategic_builder: {
    fa: 'به‌نظر می‌رسد یک «استراتژیست سازنده» هستید — انرژی رهبری با نگاه بلندمدت به ساختن تیم‌ها و کسب‌وکارها.',
    en: 'You seem like a Strategic Builder — leadership energy with a long-game view of building teams and ventures.',
    tr: 'Bir “Stratejik Kurucu” gibisin — uzun vadeli bakışla ekipler ve girişimler kuran liderlik enerjisi.',
    ar: 'تبدو «بانياً استراتيجياً» — طاقة قيادية مع نظرة بعيدة المدى لبناء الفرق والمشاريع.',
  },
  creative_designer: {
    fa: 'به‌نظر می‌رسد یک «طراح خلاق» هستید — ایده‌ها در دست شما شکل، رنگ و روایت می‌گیرند.',
    en: 'You seem like a Creative Designer — ideas take shape, color and story in your hands.',
    tr: 'Bir “Yaratıcı Tasarımcı” gibisin — fikirler senin elinde biçim, renk ve hikâye kazanıyor.',
    ar: 'تبدو «مصمماً مبدعاً» — الأفكار تتخذ شكلاً ولوناً وحكاية بين يديك.',
  },
  technical_solver: {
    fa: 'به‌نظر می‌رسد یک «حل‌کننده فنی» هستید — منطق دقیق به‌علاوه دستِ سازنده؛ سیستم‌ها زیر دست شما بهتر کار می‌کنند.',
    en: 'You seem like a Technical Problem Solver — precise logic plus a builder’s hands; systems simply run better around you.',
    tr: 'Bir “Teknik Problem Çözücü” gibisin — hassas mantık ve kurucu eller; sistemler senin yanında daha iyi çalışır.',
    ar: 'تبدو «حلاّل مشكلات تقنياً» — منطق دقيق ويدٌ بنّاءة؛ الأنظمة تعمل أفضل بقربك.',
  },
  social_communicator: {
    fa: 'به‌نظر می‌رسد یک «ارتباط‌گر اجتماعی» هستید — پلی طبیعی میان آدم‌ها، ایده‌ها و فرهنگ‌ها.',
    en: 'You seem like a Social Communicator — a natural bridge between people, ideas and cultures.',
    tr: 'Bir “Sosyal İletişimci” gibisin — insanlar, fikirler ve kültürler arasında doğal bir köprü.',
    ar: 'تبدو «متواصلاً اجتماعياً» — جسر طبيعي بين الناس والأفكار والثقافات.',
  },
  stability_planner: {
    fa: 'به‌نظر می‌رسد یک «برنامه‌ریز باثبات» هستید — نظم، اعتمادپذیری و مسیرهای مطمئن، امضای شماست.',
    en: 'You seem like a Stability Planner — order, dependability and secure paths are your signature.',
    tr: 'Bir “İstikrar Planlayıcısı” gibisin — düzen, güvenilirlik ve sağlam yollar senin imzan.',
    ar: 'تبدو «مخطِّط استقرار» — النظام والموثوقية والمسارات الآمنة توقيعك.',
  },
  global_seeker: {
    fa: 'به‌نظر می‌رسد یک «جوینده فرصت جهانی» هستید — مرزها برایتان دیوار نیستند، نقشه‌اند.',
    en: 'You seem like a Global Opportunity Seeker — borders are not walls to you, they are a map.',
    tr: 'Bir “Küresel Fırsat Avcısı” gibisin — sınırlar senin için duvar değil, harita.',
    ar: 'تبدو «باحثاً عن الفرص العالمية» — الحدود ليست جدراناً لك بل خريطة.',
  },
  precision_specialist: {
    fa: 'به‌نظر می‌رسد یک «متخصص دقت» هستید — جزئیات در دست شما از خطا به کیفیت تبدیل می‌شوند.',
    en: 'You seem like a Precision Specialist — in your hands, details turn from risk into quality.',
    tr: 'Bir “Hassasiyet Uzmanı” gibisin — detaylar senin elinde riskten kaliteye dönüşür.',
    ar: 'تبدو «اختصاصي دقة» — التفاصيل بين يديك تتحول من خطر إلى جودة.',
  },
  behavior_explorer: {
    fa: 'به‌نظر می‌رسد یک «کاوشگر رفتار انسان» هستید — ذهن تحلیلی شما مدام می‌پرسد: آدم‌ها چرا این‌گونه‌اند؟',
    en: 'You seem like a Human Behavior Explorer — your analytical mind keeps asking why people are the way they are.',
    tr: 'Bir “İnsan Davranışı Kâşifi” gibisin — analitik zihnin sürekli insanların neden böyle olduğunu soruyor.',
    ar: 'تبدو «مستكشف سلوك إنساني» — عقلك التحليلي يسأل باستمرار: لماذا الناس هكذا؟',
  },
};

// ───────────────────── Admission reality note templates ─────────────────────
export const REALITY_NOTES = {
  competitive: {
    fa: 'با معدل قوی و بودجه منعطف، می‌توانید برنامه‌های رقابتی را هدف بگیرید؛ فقط زمان‌بندی مهم است — صندلی‌های برتر زود پر می‌شوند و مدارک باید بی‌نقص باشند.',
    en: 'With a strong GPA and flexible budget you can target competitive programs; timing is the key constraint — top seats fill early and documents must be flawless.',
    tr: 'Güçlü not ortalaması ve esnek bütçeyle rekabetçi programları hedefleyebilirsin; kilit kısıt zamanlama — iyi kontenjanlar erken dolar, belgeler kusursuz olmalı.',
    ar: 'بمعدل قوي وميزانية مرنة يمكنك استهداف البرامج التنافسية؛ التوقيت هو القيد الأهم — المقاعد المميزة تمتلئ مبكراً ويجب أن تكون المستندات متقنة.',
  },
  balanced: {
    fa: 'پروفایل شما به استراتژی «ترکیبی» می‌خورد: یکی دو انتخاب جاه‌طلبانه، دو انتخاب مطمئن. شهریه و بورسیه هر گزینه را قبل از نهایی‌کردن مقایسه کنید.',
    en: 'Your profile fits a mixed strategy: one or two ambitious picks plus two safe ones. Compare tuition and scholarship terms before locking any choice.',
    tr: 'Profilin karma stratejiye uygun: bir-iki iddialı, iki güvenli tercih. Seçimi kilitlemeden önce ücret ve burs koşullarını karşılaştır.',
    ar: 'يناسب ملفك استراتيجية مختلطة: خيار أو خياران طموحان واثنان آمنان. قارن الرسوم وشروط المنح قبل تثبيت أي خيار.',
  },
  scholarship_first: {
    fa: 'چون بورسیه اولویت اول است، ترتیب درست این است: اول لیست رشته‌های بورسیه‌پذیر، بعد عاشق یک دانشگاه خاص شدن. رشته‌های پرهزینه را فعلاً «گزینه دوم» نگه دارید.',
    en: 'Since scholarships come first, the right order is: shortlist scholarship-friendly programs first, fall in love with a university second. Keep high-cost majors as a “plan B” for now.',
    tr: 'Burs öncelikli olduğundan doğru sıra şu: önce burs dostu programların listesi, sonra bir üniversiteye âşık olmak. Yüksek maliyetli bölümleri şimdilik “B planı” olarak tut.',
    ar: 'بما أن المنح أولاً، فالترتيب الصحيح: قائمة البرامج الصديقة للمنح أولاً، ثم التعلق بجامعة بعينها. أبقِ التخصصات المكلفة «خطة بديلة» حالياً.',
  },
  foundation_first: {
    fa: 'یک سال آمادگی یا تقویت زبان، تأخیر نیست — سرمایه‌گذاری است. مسیر پیشنهادی: پذیرش مشروط بگیرید، سال آمادگی را بگذرانید و با اعتمادبه‌نفس وارد رشته اصلی شوید.',
    en: 'A prep or language year is not a delay — it is an investment. Suggested route: secure conditional admission, complete the prep year, then enter your major with confidence.',
    tr: 'Hazırlık ya da dil yılı gecikme değil, yatırımdır. Önerilen rota: koşullu kabul al, hazırlık yılını tamamla, bölümüne özgüvenle başla.',
    ar: 'سنة التحضير أو اللغة ليست تأخيراً — بل استثمار. المسار المقترح: قبول مشروط، إتمام السنة التحضيرية، ثم دخول التخصص بثقة.',
  },
};

export const HIGH_COST_ADDENDUM = {
  fa: 'نکته مهم: برخی رشته‌های پیشنهادی (مثل پزشکی یا دندانپزشکی) شهریه بالایی دارند — قبل از اینکه آن‌ها را هدف اصلی بگیرید، بودجه و معدل را با مشاور بازبینی کنید.',
  en: 'Important: some recommended majors (like Medicine or Dentistry) carry high tuition — review budget and GPA with a counselor before treating them as the primary target.',
  tr: 'Önemli: önerilen bazı bölümlerin (Tıp, Diş Hekimliği gibi) ücreti yüksektir — ana hedef yapmadan önce bütçe ve notları danışmanla gözden geçir.',
  ar: 'مهم: بعض التخصصات المقترحة (كالطب وطب الأسنان) رسومها مرتفعة — راجع الميزانية والمعدل مع مستشار قبل اعتبارها هدفاً رئيسياً.',
};

export const CAUTION_INTRO = {
  fa: 'این مسیرها همچنان ممکن‌اند، اما با پروفایل فعلی شما هم‌خوانی کمتری دارند — اگر به یکی‌شان علاقه جدی دارید، با مشاور دقیق‌تر بررسی‌اش کنید:',
  en: 'These fields may still be possible, but they may not match your current profile as strongly — if one of them matters to you, review it more closely with a counselor:',
  tr: 'Bu alanlar yine de mümkün, ancak mevcut profilinle daha az örtüşüyor — biri senin için önemliyse danışmanla daha yakından incele:',
  ar: 'هذه المجالات لا تزال ممكنة، لكنها أقل تطابقاً مع ملفك الحالي — إن كان أحدها مهماً لك فراجعه عن قرب مع مستشار:',
};
