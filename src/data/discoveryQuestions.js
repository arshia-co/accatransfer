// Major Discovery question bank — 25 questions in 5 layers:
//   Q1–12  MBTI-inspired cognitive preferences (3× EI, 3× SN, 3× TF, 3× JP)
//   Q13–17 RIASEC / Holland-style interests
//   Q18–21 Big-Five / HEXACO-inspired personality snapshot
//   Q22–23 Motivation & life values
//   Q24–25 Academic strengths & admission reality
//
// Every option adds weighted scores to several dimensions at once:
//   mbti     : E I S N T F J P
//   riasec   : R I A S E C
//   big5     : O C E A Em
//   hexaco   : H Em X A C O
//   acca     : Health Business Tech Creative Research People Stability
//              Leadership Communication Precision GlobalMobility
//   motiv    : Income Prestige Security SocialImpact Autonomy Creativity
//              Migration FamilyApproval Lifestyle
//   strengths: BiologyChemistry MathPhysics LanguageCommunication ArtDesign
//              BusinessEconomics PsychologyHumanities TechnologyComputing
//              ResearchWriting
// Q25 options additionally carry `reality` (admission feasibility profile).
//
// Weights are plain integers so this whole layer can be replaced by a real
// scoring backend without touching the UI. Wording stays guidance-flavored:
// this is NOT an official MBTI assessment and NOT a clinical instrument.

export const DISCOVERY_QUESTIONS = [
  // ─────────────────────────── MBTI layer · E/I ───────────────────────────
  {
    id: 'd01',
    layer: 'mbti',
    axis: 'EI',
    text: {
      fa: 'بعد از یک روز طولانی و شلوغ، چه چیزی واقعاً انرژی‌تان را برمی‌گرداند؟',
      en: 'After a long, busy day, what actually recharges you?',
      tr: 'Uzun ve yoğun bir günün ardından seni gerçekten ne toparlar?',
      ar: 'بعد يوم طويل ومزدحم، ما الذي يعيد طاقتك فعلاً؟',
    },
    options: [
      {
        id: 'd01_a',
        label: { fa: 'جمع دوستان و حرف و خنده', en: 'Being out with friends', tr: 'Arkadaşlarla dışarıda olmak', ar: 'الخروج مع الأصدقاء' },
        weights: { mbti: { E: 3 }, big5: { E: 2 }, hexaco: { X: 2 }, acca: { People: 1 } },
      },
      {
        id: 'd01_b',
        label: { fa: 'یک گفت‌وگوی خوب با یک دوست نزدیک', en: 'One good talk with a close friend', tr: 'Yakın bir dostla iyi bir sohbet', ar: 'حديث جيد مع صديق مقرب' },
        weights: { mbti: { E: 1 }, big5: { A: 1 }, hexaco: { A: 1 }, acca: { Communication: 1 } },
      },
      {
        id: 'd01_c',
        label: { fa: 'موسیقی، فیلم یا کتاب در آرامش', en: 'Quiet time with music or a book', tr: 'Müzik ya da kitapla sakin vakit', ar: 'وقت هادئ مع موسيقى أو كتاب' },
        weights: { mbti: { I: 1 }, big5: { O: 1 }, hexaco: { O: 1 } },
      },
      {
        id: 'd01_d',
        label: { fa: 'تنهایی کامل با فکرها و پروژه‌هایم', en: 'Full alone time with my own projects', tr: 'Kendi projelerimle tamamen yalnız', ar: 'وقت كامل وحدي مع مشاريعي' },
        weights: { mbti: { I: 3 }, riasec: { I: 1 }, acca: { Research: 1 }, motiv: { Autonomy: 1 } },
      },
    ],
  },
  {
    id: 'd02',
    layer: 'mbti',
    axis: 'EI',
    text: {
      fa: 'روز اول در یک کلاس جدید، معمولاً چه می‌کنید؟',
      en: 'First day in a new class — what do you usually do?',
      tr: 'Yeni bir sınıfta ilk gün genelde ne yaparsın?',
      ar: 'في اليوم الأول بصف جديد، ماذا تفعل عادة؟',
    },
    options: [
      {
        id: 'd02_a',
        label: { fa: 'سریع با چند نفر آشنا می‌شوم', en: 'Introduce myself to several people', tr: 'Birkaç kişiyle hemen tanışırım', ar: 'أتعرف بسرعة على عدة أشخاص' },
        weights: { mbti: { E: 3 }, big5: { E: 2 }, hexaco: { X: 2 }, acca: { Communication: 2 } },
      },
      {
        id: 'd02_b',
        label: { fa: 'اگر سر صحبت باز شود، همراه می‌شوم', en: 'Join in when someone starts talking', tr: 'Sohbet açılırsa katılırım', ar: 'أنضم إذا بدأ أحدهم الحديث' },
        weights: { mbti: { E: 1 }, big5: { A: 1 }, hexaco: { A: 1 } },
      },
      {
        id: 'd02_c',
        label: { fa: 'اول فضا را می‌خوانم، بعد حرف می‌زنم', en: 'Observe first, talk later', tr: 'Önce gözlemler, sonra konuşurum', ar: 'أراقب أولاً ثم أتكلم' },
        weights: { mbti: { I: 1 }, big5: { C: 1 }, acca: { Precision: 1 } },
      },
      {
        id: 'd02_d',
        label: { fa: 'با یک نفر، ولی عمیق آشنا می‌شوم', en: 'Connect with one person, deeply', tr: 'Tek kişiyle ama derin bağ kurarım', ar: 'أتواصل مع شخص واحد بعمق' },
        weights: { mbti: { I: 3 }, big5: { A: 1 }, hexaco: { A: 1 }, acca: { People: 1 } },
      },
    ],
  },
  {
    id: 'd03',
    layer: 'mbti',
    axis: 'EI',
    text: {
      fa: 'ایده‌ها کی برایتان شفاف می‌شوند؟',
      en: 'When do ideas become clear to you?',
      tr: 'Fikirler senin için ne zaman netleşir?',
      ar: 'متى تتضح الأفكار في ذهنك؟',
    },
    options: [
      {
        id: 'd03_a',
        label: { fa: 'وقتی بلند با دیگران حرفشان را می‌زنم', en: 'When I talk them out loud with others', tr: 'Başkalarıyla yüksek sesle konuşunca', ar: 'عندما أتحدث عنها بصوت عالٍ مع الآخرين' },
        weights: { mbti: { E: 3 }, big5: { E: 1 }, acca: { Communication: 2 }, strengths: { LanguageCommunication: 1 } },
      },
      {
        id: 'd03_b',
        label: { fa: 'بعد از کمی فکر، در گفت‌وگو پخته می‌شوند', en: 'In discussion, after some thinking', tr: 'Biraz düşünüp tartışınca', ar: 'في النقاش بعد قليل من التفكير' },
        weights: { mbti: { E: 1, T: 1 } },
      },
      {
        id: 'd03_c',
        label: { fa: 'وقتی اول روی کاغذ می‌نویسمشان', en: 'When I write them down first', tr: 'Önce kâğıda dökünce', ar: 'عندما أكتبها أولاً' },
        weights: { mbti: { I: 1 }, strengths: { ResearchWriting: 2 }, big5: { C: 1 } },
      },
      {
        id: 'd03_d',
        label: { fa: 'در سکوت، از اول تا آخر در ذهنم', en: 'Silently, start to finish in my head', tr: 'Sessizce, baştan sona zihnimde', ar: 'بصمت، من البداية للنهاية في ذهني' },
        weights: { mbti: { I: 3 }, riasec: { I: 1 }, acca: { Research: 1 } },
      },
    ],
  },

  // ─────────────────────────── MBTI layer · S/N ───────────────────────────
  {
    id: 'd04',
    layer: 'mbti',
    axis: 'SN',
    text: {
      fa: 'موضوع جدید را چطور بهتر یاد می‌گیرید؟',
      en: 'How do you learn a new topic best?',
      tr: 'Yeni bir konuyu en iyi nasıl öğrenirsin?',
      ar: 'كيف تتعلم موضوعاً جديداً بشكل أفضل؟',
    },
    options: [
      {
        id: 'd04_a',
        label: { fa: 'با مثال واقعی و نمونه ملموس', en: 'Concrete examples and real cases', tr: 'Somut örnekler ve gerçek vakalar', ar: 'أمثلة ملموسة وحالات حقيقية' },
        weights: { mbti: { S: 3 }, riasec: { R: 1 } },
      },
      {
        id: 'd04_b',
        label: { fa: 'با دستور‌العمل مرحله‌به‌مرحله', en: 'Clear step-by-step instructions', tr: 'Net, adım adım yönergeler', ar: 'تعليمات واضحة خطوة بخطوة' },
        weights: { mbti: { S: 1, J: 1 }, big5: { C: 1 }, hexaco: { C: 1 } },
      },
      {
        id: 'd04_c',
        label: { fa: 'اول تصویر کلی، بعد جزئیات', en: 'The big picture first, then details', tr: 'Önce büyük resim, sonra detaylar', ar: 'الصورة الكبرى أولاً ثم التفاصيل' },
        weights: { mbti: { N: 1 } },
      },
      {
        id: 'd04_d',
        label: { fa: 'با نظریه‌ها، الگوها و احتمال‌های آینده', en: 'Theories, patterns and future possibilities', tr: 'Teoriler, örüntüler ve gelecek olasılıkları', ar: 'النظريات والأنماط واحتمالات المستقبل' },
        weights: { mbti: { N: 3 }, big5: { O: 2 }, hexaco: { O: 1 }, acca: { Research: 1 } },
      },
    ],
  },
  {
    id: 'd05',
    layer: 'mbti',
    axis: 'SN',
    text: {
      fa: 'کدام تعریف از شما به‌نظرتان خوشایندتر است؟',
      en: 'Which compliment would please you more?',
      tr: 'Hangi iltifat seni daha çok mutlu eder?',
      ar: 'أي مديح يسعدك أكثر؟',
    },
    options: [
      {
        id: 'd05_a',
        label: { fa: '«فوق‌العاده عملی و قابل‌اتکا هستی»', en: '“You are incredibly practical and reliable”', tr: '“İnanılmaz pratik ve güvenilirsin”', ar: '«أنت عملي وموثوق للغاية»' },
        weights: { mbti: { S: 3 }, big5: { C: 1 }, hexaco: { C: 1 }, acca: { Stability: 1 } },
      },
      {
        id: 'd05_b',
        label: { fa: '«جزئیاتی را می‌بینی که هیچ‌کس نمی‌بیند»', en: '“You notice details no one else sees”', tr: '“Kimsenin görmediği detayları görüyorsun”', ar: '«تلاحظ تفاصيل لا يراها أحد»' },
        weights: { mbti: { S: 1 }, acca: { Precision: 2 }, riasec: { C: 1 } },
      },
      {
        id: 'd05_c',
        label: { fa: '«همیشه یک ایده تازه داری»', en: '“You always have a fresh idea”', tr: '“Hep yeni bir fikrin var”', ar: '«لديك دائماً فكرة جديدة»' },
        weights: { mbti: { N: 1 }, big5: { O: 1 }, acca: { Creative: 1 }, motiv: { Creativity: 1 } },
      },
      {
        id: 'd05_d',
        label: { fa: '«قبل از همه می‌فهمی اوضاع به کجا می‌رود»', en: '“You see where things are going before others”', tr: '“Olayların gidişatını herkesten önce görüyorsun”', ar: '«ترى إلى أين تتجه الأمور قبل الآخرين»' },
        weights: { mbti: { N: 3 }, acca: { Leadership: 1, Research: 1 } },
      },
    ],
  },
  {
    id: 'd06',
    layer: 'mbti',
    axis: 'SN',
    text: {
      fa: 'پروژه درسی ایدئال شما کدام است؟',
      en: 'Your ideal school project would be…',
      tr: 'İdeal okul projen hangisi olurdu?',
      ar: 'ما هو مشروعك المدرسي المثالي؟',
    },
    options: [
      {
        id: 'd06_a',
        label: { fa: 'ساختن و آزمایش یک چیز واقعی', en: 'Building and testing something real', tr: 'Gerçek bir şey yapıp test etmek', ar: 'بناء شيء حقيقي واختباره' },
        weights: { mbti: { S: 3 }, riasec: { R: 2 }, acca: { Tech: 1 } },
      },
      {
        id: 'd06_b',
        label: { fa: 'مرتب‌کردن و تحلیل دقیق داده‌ها', en: 'Organizing and analyzing data precisely', tr: 'Verileri düzenleyip titizce analiz etmek', ar: 'تنظيم البيانات وتحليلها بدقة' },
        weights: { mbti: { S: 1, T: 1 }, riasec: { C: 2 }, acca: { Precision: 1 }, strengths: { MathPhysics: 1 } },
      },
      {
        id: 'd06_c',
        label: { fa: 'طراحی یک راه‌حل کاملاً نو', en: 'Imagining a completely new solution', tr: 'Tamamen yeni bir çözüm hayal etmek', ar: 'تصور حلّ جديد كلياً' },
        weights: { mbti: { N: 1 }, riasec: { A: 1 }, big5: { O: 1 }, motiv: { Creativity: 1 } },
      },
      {
        id: 'd06_d',
        label: { fa: 'دنبال‌کردن یک سؤال «چه می‌شد اگر…؟»', en: 'Chasing a “what if…?” question', tr: '“Ya şöyle olsaydı?” sorusunun peşine düşmek', ar: 'تتبع سؤال «ماذا لو…؟»' },
        weights: { mbti: { N: 3 }, riasec: { I: 2 }, acca: { Research: 1 }, big5: { O: 1 } },
      },
    ],
  },

  // ─────────────────────────── MBTI layer · T/F ───────────────────────────
  {
    id: 'd07',
    layer: 'mbti',
    axis: 'TF',
    text: {
      fa: 'دوستانتان درباره توصیه‌های شما چه می‌گویند؟',
      en: 'What do friends say about your advice?',
      tr: 'Arkadaşların tavsiyelerin hakkında ne der?',
      ar: 'ماذا يقول أصدقاؤك عن نصائحك؟',
    },
    options: [
      {
        id: 'd07_a',
        label: { fa: 'صادق و منطقی، حتی وقتی تلخ است', en: 'Honest and logical, even when it stings', tr: 'Acı da olsa dürüst ve mantıklı', ar: 'صادقة ومنطقية حتى لو كانت قاسية' },
        weights: { mbti: { T: 3 }, hexaco: { H: 1 } },
      },
      {
        id: 'd07_b',
        label: { fa: 'منصفانه، با سبک‌سنگین‌کردن دقیق', en: 'Fair, with careful pros and cons', tr: 'Adil; artıları eksileri tartan', ar: 'منصفة مع موازنة دقيقة' },
        weights: { mbti: { T: 1 }, acca: { Precision: 1 }, big5: { C: 1 } },
      },
      {
        id: 'd07_c',
        label: { fa: 'دلگرم‌کننده و حمایتگر', en: 'Understanding and supportive', tr: 'Anlayışlı ve destekleyici', ar: 'متفهمة وداعمة' },
        weights: { mbti: { F: 1 }, big5: { A: 1 }, hexaco: { A: 1 } },
      },
      {
        id: 'd07_d',
        label: { fa: 'عمیقاً همدلانه؛ انگار جای آن‌ها هستم', en: 'Deeply empathetic — I feel their situation', tr: 'Derinden empatik — durumu hissederim', ar: 'متعاطفة بعمق — أشعر بحالتهم' },
        weights: { mbti: { F: 3 }, big5: { A: 2, Em: 1 }, hexaco: { Em: 1 }, acca: { People: 1 } },
      },
    ],
  },
  {
    id: 'd08',
    layer: 'mbti',
    axis: 'TF',
    text: {
      fa: 'یکی از هم‌تیمی‌ها ضعیف کار می‌کند. اولین واکنش شما؟',
      en: 'A teammate is underperforming. Your first move?',
      tr: 'Bir takım arkadaşı düşük performans gösteriyor. İlk hamlen?',
      ar: 'زميل في الفريق أداؤه ضعيف. ما أول خطوة لك؟',
    },
    options: [
      {
        id: 'd08_a',
        label: { fa: 'مشکل را شفاف و با مدرک مطرح می‌کنم', en: 'Raise the issue directly, with facts', tr: 'Sorunu doğrudan, kanıtla dile getiririm', ar: 'أطرح المشكلة مباشرة وبالحقائق' },
        weights: { mbti: { T: 3 }, acca: { Leadership: 1 }, big5: { E: 1 } },
      },
      {
        id: 'd08_b',
        label: { fa: 'اول می‌بینم دقیقاً کجای کار گیر است', en: 'Check what exactly is blocking the work', tr: 'Önce işin neresinin tıkandığına bakarım', ar: 'أتحقق أولاً مما يعيق العمل بالضبط' },
        weights: { mbti: { T: 1 }, riasec: { I: 1 }, acca: { Precision: 1 } },
      },
      {
        id: 'd08_c',
        label: { fa: 'اول حالش را می‌پرسم؛ شاید مشکلی دارد', en: 'Ask how they are doing personally first', tr: 'Önce kişisel olarak nasıl olduğunu sorarım', ar: 'أسأل أولاً عن حاله الشخصي' },
        weights: { mbti: { F: 1 }, big5: { A: 1 }, acca: { People: 1 } },
      },
      {
        id: 'd08_d',
        label: { fa: 'بی‌سروصدا کمکش می‌کنم تا اعتمادبه‌نفسش نشکند', en: 'Quietly help, protecting their confidence', tr: 'Sessizce yardım eder, özgüvenini korurum', ar: 'أساعده بهدوء حفاظاً على ثقته' },
        weights: { mbti: { F: 3 }, big5: { A: 2 }, hexaco: { A: 2, H: 1 } },
      },
    ],
  },
  {
    id: 'd09',
    layer: 'mbti',
    axis: 'TF',
    text: {
      fa: 'تصمیم‌های خوب بیشتر از کجا می‌آیند؟',
      en: 'Good decisions mostly come from…',
      tr: 'İyi kararlar çoğunlukla nereden gelir?',
      ar: 'من أين تأتي القرارات الجيدة غالباً؟',
    },
    options: [
      {
        id: 'd09_a',
        label: { fa: 'داده‌ها و معیارهای عینی', en: 'Data and objective criteria', tr: 'Veriler ve nesnel ölçütler', ar: 'البيانات والمعايير الموضوعية' },
        weights: { mbti: { T: 3 }, riasec: { I: 1 }, strengths: { MathPhysics: 1 }, acca: { Research: 1 } },
      },
      {
        id: 'd09_b',
        label: { fa: 'منطق، به‌علاوه تجربه عملی', en: 'Logic, adjusted by experience', tr: 'Deneyimle yoğrulmuş mantık', ar: 'المنطق مع خبرة عملية' },
        weights: { mbti: { T: 1, S: 1 } },
      },
      {
        id: 'd09_c',
        label: { fa: 'ارزش‌ها و اثرشان روی آدم‌ها', en: 'Values and their impact on people', tr: 'Değerler ve insanlara etkisi', ar: 'القيم وأثرها على الناس' },
        weights: { mbti: { F: 1 }, motiv: { SocialImpact: 1 }, acca: { People: 1 } },
      },
      {
        id: 'd09_d',
        label: { fa: 'چیزی که برای همه درگیرها درست باشد', en: 'What feels right for everyone involved', tr: 'Herkes için doğru hissettiren şey', ar: 'ما يبدو صائباً لكل المعنيين' },
        weights: { mbti: { F: 3 }, big5: { A: 2 }, hexaco: { A: 1, H: 1 } },
      },
    ],
  },

  // ─────────────────────────── MBTI layer · J/P ───────────────────────────
  {
    id: 'd10',
    layer: 'mbti',
    axis: 'JP',
    text: {
      fa: 'میز درس و فایل‌هایتان چه وضعیتی دارند؟',
      en: 'Your study desk and files look like…',
      tr: 'Çalışma masan ve dosyaların nasıl görünür?',
      ar: 'كيف يبدو مكتبك وملفاتك الدراسية؟',
    },
    options: [
      {
        id: 'd10_a',
        label: { fa: 'کاملاً مرتب؛ هر چیزی جای خودش', en: 'Fully organized — everything in its place', tr: 'Tam düzenli — her şey yerli yerinde', ar: 'منظم تماماً — كل شيء في مكانه' },
        weights: { mbti: { J: 3 }, big5: { C: 2 }, hexaco: { C: 2 }, acca: { Precision: 1 } },
      },
      {
        id: 'd10_b',
        label: { fa: 'مرتب، با چند گوشه شلوغ', en: 'Mostly tidy, with small chaos corners', tr: 'Genelde derli toplu, birkaç dağınık köşe', ar: 'مرتب غالباً مع زوايا فوضوية صغيرة' },
        weights: { mbti: { J: 1 }, big5: { C: 1 } },
      },
      {
        id: 'd10_c',
        label: { fa: 'شلوغِ منظم؛ خودم همه‌چیز را پیدا می‌کنم', en: 'Organized chaos — I find things my way', tr: 'Düzenli kaos — her şeyi kendi yöntemimle bulurum', ar: 'فوضى منظمة — أجد الأشياء بطريقتي' },
        weights: { mbti: { P: 1 } },
      },
      {
        id: 'd10_d',
        label: { fa: 'آزاد و رها؛ نظمِ زیاد خلاقیتم را می‌کشد', en: 'Free-form; too much order kills my flow', tr: 'Serbest — fazla düzen akışımı öldürür', ar: 'حر تماماً — النظام الزائد يقتل تدفقي' },
        weights: { mbti: { P: 3 }, big5: { O: 1 }, acca: { Creative: 1 } },
      },
    ],
  },
  {
    id: 'd11',
    layer: 'mbti',
    axis: 'JP',
    text: {
      fa: 'رابطه‌تان با ددلاین‌ها چطور است؟',
      en: 'What is your relationship with deadlines?',
      tr: 'Teslim tarihleriyle aran nasıl?',
      ar: 'ما علاقتك بالمواعيد النهائية؟',
    },
    options: [
      {
        id: 'd11_a',
        label: { fa: 'زودتر تمام می‌کنم؛ فشار لحظه آخر را نمی‌خواهم', en: 'I finish early; last-minute pressure stresses me', tr: 'Erken bitiririm; son dakika baskısı istemem', ar: 'أنهي مبكراً؛ لا أحب ضغط اللحظة الأخيرة' },
        weights: { mbti: { J: 3 }, big5: { C: 2 }, hexaco: { C: 2 }, motiv: { Security: 1 } },
      },
      {
        id: 'd11_b',
        label: { fa: 'برنامه می‌ریزم ولی در مسیر تنظیمش می‌کنم', en: 'I plan, then adjust along the way', tr: 'Plan yapar, yolda ayarlarım', ar: 'أخطط ثم أعدّل في الطريق' },
        weights: { mbti: { J: 1 } },
      },
      {
        id: 'd11_c',
        label: { fa: 'موجی کار می‌کنم؛ نزدیک ددلاین جدی می‌شوم', en: 'I work in bursts, closer to the deadline', tr: 'Dalga dalga çalışır, tarihe yakın ciddileşirim', ar: 'أعمل على دفعات وأجدّ قرب الموعد' },
        weights: { mbti: { P: 1 } },
      },
      {
        id: 'd11_d',
        label: { fa: 'فشار، بهترین نسخه من را بیرون می‌کشد', en: 'Pressure unlocks my best work', tr: 'Baskı en iyi hâlimi ortaya çıkarır', ar: 'الضغط يستخرج أفضل ما لدي' },
        weights: { mbti: { P: 3 }, big5: { E: 1 } },
      },
    ],
  },
  {
    id: 'd12',
    layer: 'mbti',
    axis: 'JP',
    text: {
      fa: 'در انتخاب رشته، حالت ایدئال شما کدام است؟',
      en: 'Choosing your major, ideally you would…',
      tr: 'Bölüm seçerken ideal olarak…',
      ar: 'عند اختيار التخصص، الوضع المثالي لك هو…',
    },
    options: [
      {
        id: 'd12_a',
        label: { fa: 'یک‌بار تصمیم بگیرم؛ نقشه ۵ ساله روشن', en: 'Decide once, with a clear 5-year plan', tr: 'Bir kez karar verip net 5 yıllık plan yapmak', ar: 'أقرر مرة واحدة بخطة خمس سنوات واضحة' },
        weights: { mbti: { J: 3 }, motiv: { Security: 2 }, acca: { Stability: 1 } },
      },
      {
        id: 'd12_b',
        label: { fa: 'زود تصمیم بگیرم ولی جای اصلاح باشد', en: 'Decide soon, with room to adjust', tr: 'Yakında karar verip ayar payı bırakmak', ar: 'أقرر قريباً مع هامش للتعديل' },
        weights: { mbti: { J: 1 } },
      },
      {
        id: 'd12_c',
        label: { fa: 'دو گزینه را مدتی موازی جلو ببرم', en: 'Keep two options open for a while', tr: 'Bir süre iki seçeneği açık tutmak', ar: 'أُبقي خيارين مفتوحين لفترة' },
        weights: { mbti: { P: 1 } },
      },
      {
        id: 'd12_d',
        label: { fa: 'آزادانه بگردم و دیرتر، مطمئن‌تر انتخاب کنم', en: 'Explore widely, decide later with certainty', tr: 'Geniş keşfedip daha geç, emin karar vermek', ar: 'أستكشف بحرية وأقرر لاحقاً بثقة' },
        weights: { mbti: { P: 3 }, big5: { O: 1 } },
      },
    ],
  },

  // ─────────────────────────── RIASEC layer ───────────────────────────
  {
    id: 'd13',
    layer: 'riasec',
    text: {
      fa: 'یک هفته آزاد دارید؛ کدام کارگاه را انتخاب می‌کنید؟',
      en: 'You get one free week — pick a workshop:',
      tr: 'Bir haftan boş — hangi atölyeyi seçersin?',
      ar: 'لديك أسبوع حر — أي ورشة تختار؟',
    },
    options: [
      {
        id: 'd13_a',
        label: { fa: 'رباتیک و تعمیر و ساخت', en: 'Robotics & repair garage', tr: 'Robotik ve tamir atölyesi', ar: 'الروبوتات والإصلاح والبناء' },
        weights: { riasec: { R: 3 }, acca: { Tech: 2 }, strengths: { TechnologyComputing: 1 } },
      },
      {
        id: 'd13_b',
        label: { fa: 'آزمایش‌های واقعی در آزمایشگاه علوم', en: 'Real experiments in a science lab', tr: 'Bilim laboratuvarında gerçek deneyler', ar: 'تجارب حقيقية في مختبر علمي' },
        weights: { riasec: { I: 3 }, acca: { Research: 2 }, strengths: { BiologyChemistry: 1 } },
      },
      {
        id: 'd13_c',
        label: { fa: 'استودیوی هنر و طراحی', en: 'An art & design studio', tr: 'Sanat ve tasarım stüdyosu', ar: 'استوديو فن وتصميم' },
        weights: { riasec: { A: 3 }, acca: { Creative: 2 }, strengths: { ArtDesign: 1 } },
      },
      {
        id: 'd13_d',
        label: { fa: 'تدریس داوطلبانه به بچه‌ها', en: 'Volunteer tutoring for kids', tr: 'Çocuklara gönüllü ders vermek', ar: 'تدريس تطوعي للأطفال' },
        weights: { riasec: { S: 3 }, acca: { People: 2 }, motiv: { SocialImpact: 1 } },
      },
    ],
  },
  {
    id: 'd14',
    layer: 'riasec',
    text: {
      fa: 'و برای هفته دوم کدام را برمی‌دارید؟',
      en: 'And for a second week, which one?',
      tr: 'İkinci hafta için hangisi?',
      ar: 'وللأسبوع الثاني، أيها تختار؟',
    },
    options: [
      {
        id: 'd14_a',
        label: { fa: 'بوت‌کمپ استارتاپ و ارائه به سرمایه‌گذار', en: 'A startup pitch bootcamp', tr: 'Startup sunum kampı', ar: 'معسكر عرض المشاريع الناشئة' },
        weights: { riasec: { E: 3 }, acca: { Business: 2, Leadership: 1 }, motiv: { Income: 1 } },
      },
      {
        id: 'd14_b',
        label: { fa: 'مدیریت بودجه و اجرای یک رویداد واقعی', en: 'Run the budget & logistics of a real event', tr: 'Gerçek bir etkinliğin bütçe ve lojistiği', ar: 'إدارة ميزانية وتنظيم فعالية حقيقية' },
        weights: { riasec: { C: 3 }, acca: { Stability: 1, Precision: 2 }, strengths: { BusinessEconomics: 1 } },
      },
      {
        id: 'd14_c',
        label: { fa: 'همراهی تیم درمان در یک کلینیک', en: 'Shadowing a clinic care team', tr: 'Klinikte bakım ekibini gözlemlemek', ar: 'مرافقة فريق رعاية في عيادة' },
        weights: { riasec: { S: 2, I: 1 }, acca: { Health: 2 }, strengths: { BiologyChemistry: 1 } },
      },
      {
        id: 'd14_d',
        label: { fa: 'جمِ ساخت بازی و دنیای دیجیتال', en: 'A game development jam', tr: 'Oyun geliştirme maratonu', ar: 'ماراثون تطوير ألعاب' },
        weights: { riasec: { R: 1, A: 2 }, acca: { Tech: 1, Creative: 1 }, strengths: { TechnologyComputing: 1 } },
      },
    ],
  },
  {
    id: 'd15',
    layer: 'riasec',
    text: {
      fa: 'کدام «چرا» بیشتر ذهن‌تان را قلاب می‌کند؟',
      en: 'Which “why” hooks your mind the most?',
      tr: 'Hangi “neden” zihnini en çok yakalar?',
      ar: 'أي «لماذا» تشدّ ذهنك أكثر؟',
    },
    options: [
      {
        id: 'd15_a',
        label: { fa: 'چرا این دستگاه از کار افتاد؟', en: 'Why did this machine fail?', tr: 'Bu makine neden bozuldu?', ar: 'لماذا تعطلت هذه الآلة؟' },
        weights: { riasec: { R: 3 }, acca: { Tech: 1 }, strengths: { MathPhysics: 1 } },
      },
      {
        id: 'd15_b',
        label: { fa: 'چرا این بیماری پخش می‌شود؟', en: 'Why does this disease spread?', tr: 'Bu hastalık neden yayılıyor?', ar: 'لماذا ينتشر هذا المرض؟' },
        weights: { riasec: { I: 3 }, acca: { Health: 1, Research: 1 }, strengths: { BiologyChemistry: 2 } },
      },
      {
        id: 'd15_c',
        label: { fa: 'چرا این برند این‌قدر خاص به‌نظر می‌رسد؟', en: 'Why does this brand feel so premium?', tr: 'Bu marka neden bu kadar özel duruyor?', ar: 'لماذا تبدو هذه العلامة مميزة جداً؟' },
        weights: { riasec: { A: 2, E: 1 }, acca: { Business: 1, Creative: 1 }, strengths: { BusinessEconomics: 1 } },
      },
      {
        id: 'd15_d',
        label: { fa: 'چرا آدم‌ها این‌طور رفتار می‌کنند؟', en: 'Why do people behave this way?', tr: 'İnsanlar neden böyle davranıyor?', ar: 'لماذا يتصرف الناس بهذه الطريقة؟' },
        weights: { riasec: { S: 2, I: 1 }, acca: { People: 1, Research: 1 }, strengths: { PsychologyHumanities: 2 } },
      },
    ],
  },
  {
    id: 'd16',
    layer: 'riasec',
    text: {
      fa: 'در یک پروژه بزرگ، نقش رویایی‌تان چیست؟',
      en: 'In a big project, your dream role is…',
      tr: 'Büyük bir projede hayalindeki rol…',
      ar: 'في مشروع كبير، ما دورك الحلم؟',
    },
    options: [
      {
        id: 'd16_a',
        label: { fa: 'سرمهندس؛ مسئول ساختن و کارکردن همه‌چیز', en: 'Chief engineer — making it all work', tr: 'Baş mühendis — her şeyi çalıştıran', ar: 'كبير المهندسين — تشغيل كل شيء' },
        weights: { riasec: { R: 2, I: 1 }, acca: { Tech: 2 }, strengths: { MathPhysics: 1 } },
      },
      {
        id: 'd16_b',
        label: { fa: 'سرپژوهشگر؛ کشف پاسخ سؤال‌های سخت', en: 'Lead researcher — answering the hard questions', tr: 'Baş araştırmacı — zor soruları yanıtlayan', ar: 'الباحث الرئيس — يجيب عن الأسئلة الصعبة' },
        weights: { riasec: { I: 3 }, acca: { Research: 2 }, strengths: { ResearchWriting: 1 } },
      },
      {
        id: 'd16_c',
        label: { fa: 'مدیر خلاقیت؛ شکل و حس نهایی کار', en: 'Creative director — the final look and feel', tr: 'Kreatif direktör — son görünüm ve his', ar: 'المدير الإبداعي — الشكل والإحساس النهائي' },
        weights: { riasec: { A: 3 }, acca: { Creative: 2 }, strengths: { ArtDesign: 1 } },
      },
      {
        id: 'd16_d',
        label: { fa: 'رهبر تیم و رابط با مشتری‌ها', en: 'Team & client lead — people and momentum', tr: 'Ekip ve müşteri lideri — insanlar ve ivme', ar: 'قائد الفريق والعملاء — الناس والزخم' },
        weights: { riasec: { S: 1, E: 2 }, acca: { Leadership: 2, Communication: 1 }, motiv: { Prestige: 1 } },
      },
    ],
  },
  {
    id: 'd17',
    layer: 'riasec',
    text: {
      fa: 'آخر روز، کدام حس رضایت برایتان واقعی‌تر است؟',
      en: 'At day’s end, which satisfaction feels most real?',
      tr: 'Gün sonunda hangi tatmin daha gerçek gelir?',
      ar: 'في نهاية اليوم، أي رضا تشعر به أكثر؟',
    },
    options: [
      {
        id: 'd17_a',
        label: { fa: 'چیزی که خراب بود، حالا کار می‌کند', en: 'Something physical now works', tr: 'Bozuk olan şey artık çalışıyor', ar: 'شيء ملموس صار يعمل الآن' },
        weights: { riasec: { R: 3 }, acca: { Tech: 1 } },
      },
      {
        id: 'd17_b',
        label: { fa: 'سؤالی که بالاخره جوابش را پیدا کردم', en: 'A question finally answered', tr: 'Sonunda yanıtlanan bir soru', ar: 'سؤال وجدت إجابته أخيراً' },
        weights: { riasec: { I: 3 }, acca: { Research: 1 } },
      },
      {
        id: 'd17_c',
        label: { fa: 'چیز زیبایی که امروز خلق شد', en: 'Something beautiful now exists', tr: 'Bugün ortaya çıkan güzel bir şey', ar: 'شيء جميل وُجد اليوم' },
        weights: { riasec: { A: 3 }, acca: { Creative: 1 }, motiv: { Creativity: 1 } },
      },
      {
        id: 'd17_d',
        label: { fa: 'برنامه‌ها و پرونده‌های مرتبِ تکمیل‌شده', en: 'Clean, completed plans and records', tr: 'Tamamlanmış düzenli planlar ve kayıtlar', ar: 'خطط وسجلات مكتملة ومنظمة' },
        weights: { riasec: { C: 3 }, acca: { Stability: 1, Precision: 1 }, motiv: { Security: 1 } },
      },
    ],
  },

  // ───────────────────── Big-Five / HEXACO layer ─────────────────────
  {
    id: 'd18',
    layer: 'traits',
    text: {
      fa: 'با چیزهای جدید و ناآشنا (غذا، موسیقی، ایده) چطورید؟',
      en: 'How are you with new, unfamiliar things (food, music, ideas)?',
      tr: 'Yeni ve alışılmadık şeylerle aran nasıl (yemek, müzik, fikir)?',
      ar: 'كيف تتعامل مع الأشياء الجديدة وغير المألوفة (طعام، موسيقى، أفكار)؟',
    },
    options: [
      {
        id: 'd18_a',
        label: { fa: 'فعالانه دنبالشان می‌گردم', en: 'I actively hunt for them', tr: 'Onları aktif olarak ararım', ar: 'أبحث عنها بنشاط' },
        weights: { big5: { O: 3 }, hexaco: { O: 3 }, mbti: { N: 1 }, motiv: { Creativity: 1 } },
      },
      {
        id: 'd18_b',
        label: { fa: 'وقتی پیش بیایند، لذت می‌برم', en: 'I enjoy them when they show up', tr: 'Karşıma çıkınca keyif alırım', ar: 'أستمتع بها عندما تظهر' },
        weights: { big5: { O: 1 }, hexaco: { O: 1 } },
      },
      {
        id: 'd18_c',
        label: { fa: 'گزینه‌های آشنای محبوبم را ترجیح می‌دهم', en: 'I prefer my familiar favorites', tr: 'Bildiğim favorilerimi tercih ederim', ar: 'أفضّل خياراتي المألوفة' },
        weights: { big5: { C: 1 }, hexaco: { C: 1 }, motiv: { Security: 1 }, mbti: { S: 1 } },
      },
      {
        id: 'd18_d',
        label: { fa: 'تغییرِ زیاد خسته‌ام می‌کند', en: 'Too much novelty drains me', tr: 'Fazla yenilik beni yorar', ar: 'كثرة الجديد ترهقني' },
        weights: { big5: { Em: 1 }, hexaco: { Em: 1 }, motiv: { Security: 2 }, acca: { Stability: 1 } },
      },
    ],
  },
  {
    id: 'd19',
    layer: 'traits',
    text: {
      fa: 'قولی داده‌اید و حالا اجرایش سخت شده. چه می‌کنید؟',
      en: 'You made a promise and now it is inconvenient. What do you do?',
      tr: 'Söz verdin ama artık zor geliyor. Ne yaparsın?',
      ar: 'قطعت وعداً وأصبح تنفيذه صعباً. ماذا تفعل؟',
    },
    options: [
      {
        id: 'd19_a',
        label: { fa: 'به هر قیمتی سر قولم می‌مانم', en: 'I keep it, period', tr: 'Ne olursa olsun tutarım', ar: 'أفي به مهما كلف الأمر' },
        weights: { big5: { C: 3 }, hexaco: { C: 2, H: 2 }, mbti: { J: 1 } },
      },
      {
        id: 'd19_b',
        label: { fa: 'انجامش می‌دهم ولی زمانش را دوباره چانه می‌زنم', en: 'I keep it, but renegotiate the timing', tr: 'Tutarım ama zamanını yeniden konuşurum', ar: 'أفي به لكن أعيد التفاوض على وقته' },
        weights: { big5: { C: 1 }, hexaco: { C: 1 }, mbti: { T: 1 } },
      },
      {
        id: 'd19_c',
        label: { fa: 'رو راست توضیح می‌دهم و راه‌حل مشترک می‌سازیم', en: 'Explain openly and find a shared fix', tr: 'Açıkça anlatır, ortak çözüm bulurum', ar: 'أشرح بصراحة ونجد حلاً مشتركاً' },
        weights: { hexaco: { H: 2 }, big5: { A: 1 }, acca: { Communication: 1 }, mbti: { F: 1 } },
      },
      {
        id: 'd19_d',
        label: { fa: 'برنامه‌ها گاهی باید عوض شوند؛ طبیعی است', en: 'Plans sometimes have to change — that’s life', tr: 'Planlar bazen değişmeli — hayat bu', ar: 'الخطط تتغير أحياناً — هذه هي الحياة' },
        weights: { mbti: { P: 2 }, big5: { O: 1 } },
      },
    ],
  },
  {
    id: 'd20',
    layer: 'traits',
    text: {
      fa: 'شب قبل از یک امتحان مهم، حال‌تان معمولاً چطور است؟',
      en: 'The night before a big exam, how do you usually feel?',
      tr: 'Büyük bir sınavdan önceki gece genelde nasılsın?',
      ar: 'ليلة قبل امتحان مهم، كيف تشعر عادة؟',
    },
    options: [
      {
        id: 'd20_a',
        label: { fa: 'آرام؛ از هفته‌ها قبل آماده‌ام', en: 'Calm — I prepared weeks ago', tr: 'Sakin — haftalar önce hazırlandım', ar: 'هادئ — استعددت قبل أسابيع' },
        weights: { big5: { C: 2 }, hexaco: { C: 2 }, mbti: { J: 1 } },
      },
      {
        id: 'd20_b',
        label: { fa: 'کمی هیجان دارم که تمرکزم را بهتر می‌کند', en: 'Focused nerves that actually help', tr: 'Odaklayan hafif bir heyecan', ar: 'توتر خفيف يزيد تركيزي' },
        weights: { big5: { Em: 1 }, hexaco: { Em: 1 } },
      },
      {
        id: 'd20_c',
        label: { fa: 'مضطربم ولی مدیریتش می‌کنم', en: 'Stressed, but I manage it', tr: 'Stresliyim ama yönetirim', ar: 'متوتر لكنني أتدبر الأمر' },
        weights: { big5: { Em: 2 }, hexaco: { Em: 2 } },
      },
      {
        id: 'd20_d',
        label: { fa: 'خیلی نگرانم؛ دلگرمی بقیه کمکم می‌کند', en: 'Very anxious — reassurance from others helps', tr: 'Çok endişeli — başkalarının desteği iyi gelir', ar: 'قلق جداً — يساعدني تطمين الآخرين' },
        weights: { big5: { Em: 3 }, hexaco: { Em: 3 }, acca: { People: 1 } },
      },
    ],
  },
  {
    id: 'd21',
    layer: 'traits',
    text: {
      fa: 'وقتی در گروه اختلاف پیش می‌آید، شما…',
      en: 'When conflict appears in a group, you…',
      tr: 'Grupta anlaşmazlık çıktığında sen…',
      ar: 'عندما يظهر خلاف في المجموعة، أنت…',
    },
    options: [
      {
        id: 'd21_a',
        label: { fa: 'میانجی می‌شوم تا حرف همه شنیده شود', en: 'Mediate until everyone is heard', tr: 'Herkes duyulana dek arabuluculuk yaparım', ar: 'أتوسط حتى يُسمع الجميع' },
        weights: { big5: { A: 3 }, hexaco: { A: 3 }, acca: { Communication: 2, People: 1 }, mbti: { F: 1 } },
      },
      {
        id: 'd21_b',
        label: { fa: 'از راه‌حلِ عادلانه دفاع می‌کنم، حتی اگر محبوب نباشد', en: 'Push for the fair call, even if unpopular', tr: 'Sevilmese de adil olanı savunurum', ar: 'أدافع عن الحل العادل ولو لم يعجب الجميع' },
        weights: { hexaco: { H: 3 }, mbti: { T: 1 }, big5: { C: 1 } },
      },
      {
        id: 'd21_c',
        label: { fa: 'محکم از موضع خودم دفاع می‌کنم', en: 'Defend my position strongly', tr: 'Kendi pozisyonumu güçlü savunurum', ar: 'أدافع عن موقفي بقوة' },
        weights: { big5: { E: 2 }, hexaco: { X: 1 }, acca: { Leadership: 2 }, mbti: { E: 1 } },
      },
      {
        id: 'd21_d',
        label: { fa: 'یک قدم عقب می‌روم تا فضا آرام شود', en: 'Step back and let things cool down', tr: 'Geri çekilir, ortamın yatışmasını beklerim', ar: 'أتراجع خطوة حتى تهدأ الأجواء' },
        weights: { mbti: { I: 1 }, big5: { Em: 1 }, hexaco: { Em: 1 } },
      },
    ],
  },

  // ───────────────────── Motivation & values layer ─────────────────────
  {
    id: 'd22',
    layer: 'motiv',
    text: {
      fa: 'خودتان را در ۳۰ سالگی تصور کنید؛ کدام عکس بیشتر به شما افتخار می‌دهد؟',
      en: 'Picture yourself at 30 — which photo makes you proudest?',
      tr: '30 yaşındaki hâlini düşün — hangi fotoğraf seni en çok gururlandırır?',
      ar: 'تخيّل نفسك في الثلاثين — أي صورة تجعلك أكثر فخراً؟',
    },
    options: [
      {
        id: 'd22_a',
        label: { fa: 'لحظه‌ای در کلینیک، کنار بیماری که بهتر شد', en: 'A clinic moment, next to a recovered patient', tr: 'Klinikte, iyileşen bir hastanın yanında', ar: 'لحظة في العيادة بجانب مريض تعافى' },
        weights: { motiv: { SocialImpact: 2, Prestige: 1 }, acca: { Health: 2 }, riasec: { S: 1 } },
      },
      {
        id: 'd22_b',
        label: { fa: 'تابلوی شرکت خودم یا امضای یک قرارداد بزرگ', en: 'My own company sign, or closing a big deal', tr: 'Kendi şirket tabelam ya da büyük bir anlaşma', ar: 'لافتة شركتي أو توقيع صفقة كبيرة' },
        weights: { motiv: { Income: 2, Autonomy: 2 }, acca: { Business: 2, Leadership: 1 }, riasec: { E: 1 } },
      },
      {
        id: 'd22_c',
        label: { fa: 'پاسپورت پر از مهر و یک شغل بین‌المللی', en: 'A passport full of stamps, an international career', tr: 'Damga dolu pasaport, uluslararası bir kariyer', ar: 'جواز مليء بالأختام ومهنة دولية' },
        weights: { motiv: { Migration: 3, Lifestyle: 1 }, acca: { GlobalMobility: 3 }, big5: { O: 1 } },
      },
      {
        id: 'd22_d',
        label: { fa: 'دریافت جایزه برای یک کار علمی یا خلاقانه', en: 'An award for my scientific or creative work', tr: 'Bilimsel ya da yaratıcı işime verilen ödül', ar: 'جائزة عن عمل علمي أو إبداعي' },
        weights: { motiv: { Prestige: 2, Creativity: 2 }, acca: { Research: 1, Creative: 1 }, riasec: { I: 1, A: 1 } },
      },
    ],
  },
  {
    id: 'd23',
    layer: 'motiv',
    text: {
      fa: 'در زندگی روزمره آینده، کدام برایتان غیرقابل‌مذاکره است؟',
      en: 'In your future daily life, which one is non-negotiable?',
      tr: 'Gelecekteki günlük hayatında hangisi vazgeçilmez?',
      ar: 'في حياتك اليومية المستقبلية، ما هو غير القابل للتفاوض؟',
    },
    options: [
      {
        id: 'd23_a',
        label: { fa: 'درآمد پایدار و امنیت بلندمدت', en: 'Stable income and long-term security', tr: 'İstikrarlı gelir ve uzun vadeli güvence', ar: 'دخل مستقر وأمان طويل الأمد' },
        weights: { motiv: { Security: 3, Income: 1 }, acca: { Stability: 2 }, mbti: { J: 1 } },
      },
      {
        id: 'd23_b',
        label: { fa: 'جایگاه اجتماعی و احترام حرفه‌ای', en: 'Social standing and professional respect', tr: 'Toplumsal konum ve mesleki saygı', ar: 'مكانة اجتماعية واحترام مهني' },
        weights: { motiv: { Prestige: 3, FamilyApproval: 1 }, acca: { Leadership: 1 } },
      },
      {
        id: 'd23_c',
        label: { fa: 'وقت آزاد و تعادل واقعی کار و زندگی', en: 'Free time and real work-life balance', tr: 'Boş zaman ve gerçek iş-yaşam dengesi', ar: 'وقت حر وتوازن حقيقي بين العمل والحياة' },
        weights: { motiv: { Lifestyle: 3, Autonomy: 1 }, big5: { O: 1 } },
      },
      {
        id: 'd23_d',
        label: { fa: 'اینکه خانواده‌ام واقعاً به مسیرم افتخار کنند', en: 'My family being truly proud of my path', tr: 'Ailemin yolumla gerçekten gurur duyması', ar: 'فخر عائلتي الحقيقي بمساري' },
        weights: { motiv: { FamilyApproval: 3 }, big5: { A: 1 }, hexaco: { A: 1 } },
      },
    ],
  },

  // ───────────────── Academic & admission reality layer ─────────────────
  {
    id: 'd24',
    layer: 'academic',
    text: {
      fa: 'روراست: نمره‌هایتان در کدام گروه درس‌ها بهتر است؟',
      en: 'Honestly — where do your grades shine most?',
      tr: 'Dürüstçe — notların en çok hangi derslerde parlıyor?',
      ar: 'بصراحة — في أي مواد تتألق درجاتك أكثر؟',
    },
    options: [
      {
        id: 'd24_a',
        label: { fa: 'زیست و شیمی', en: 'Biology & chemistry', tr: 'Biyoloji ve kimya', ar: 'الأحياء والكيمياء' },
        weights: { strengths: { BiologyChemistry: 3 }, acca: { Health: 1 }, riasec: { I: 1 } },
      },
      {
        id: 'd24_b',
        label: { fa: 'ریاضی، فیزیک و کامپیوتر', en: 'Math, physics & computing', tr: 'Matematik, fizik ve bilgisayar', ar: 'الرياضيات والفيزياء والحاسوب' },
        weights: { strengths: { MathPhysics: 2, TechnologyComputing: 2 }, acca: { Tech: 1 }, mbti: { T: 1 } },
      },
      {
        id: 'd24_c',
        label: { fa: 'زبان، انشا و ارائه', en: 'Languages, essays & presentations', tr: 'Diller, kompozisyon ve sunum', ar: 'اللغات والمقالات والعروض' },
        weights: { strengths: { LanguageCommunication: 2, ResearchWriting: 2 }, acca: { Communication: 1 }, riasec: { S: 1 } },
      },
      {
        id: 'd24_d',
        label: { fa: 'هنر، علوم انسانی و اقتصاد', en: 'Art, humanities & economics', tr: 'Sanat, sosyal bilimler ve ekonomi', ar: 'الفن والإنسانيات والاقتصاد' },
        weights: { strengths: { ArtDesign: 1, PsychologyHumanities: 2, BusinessEconomics: 1 }, riasec: { A: 1 } },
      },
    ],
  },
  {
    id: 'd25',
    layer: 'reality',
    text: {
      fa: 'سؤال آخر! نقطه شروع واقعی شما کدام است؟',
      en: 'Last one! Which best describes your realistic starting point?',
      tr: 'Son soru! Gerçekçi başlangıç noktanı en iyi hangisi anlatır?',
      ar: 'السؤال الأخير! ما الذي يصف نقطة انطلاقك الواقعية؟',
    },
    options: [
      {
        id: 'd25_a',
        reality: 'competitive',
        label: { fa: 'معدل قوی + بودجه منعطف؛ هدفم برنامه‌های رقابتی است', en: 'Strong GPA + flexible budget — aiming high', tr: 'Güçlü not + esnek bütçe — hedef yüksek', ar: 'معدل قوي + ميزانية مرنة — أستهدف العالي' },
        weights: { motiv: { Prestige: 1 }, big5: { C: 1 } },
      },
      {
        id: 'd25_b',
        reality: 'balanced',
        label: { fa: 'معدل خوب + بودجه متوسط؛ تعادل کیفیت و هزینه', en: 'Good GPA + mid budget — balance fit and cost', tr: 'İyi not + orta bütçe — uyum ve maliyet dengesi', ar: 'معدل جيد + ميزانية متوسطة — توازن بين الملاءمة والتكلفة' },
        weights: { motiv: { Security: 1 } },
      },
      {
        id: 'd25_c',
        reality: 'scholarship_first',
        label: { fa: 'بودجه محدود؛ بورسیه برایم اولویت اول است', en: 'Budget is tight — scholarships come first', tr: 'Bütçe kısıtlı — önce burslar', ar: 'الميزانية محدودة — المنح أولاً' },
        weights: { motiv: { Security: 2 }, acca: { Stability: 1 } },
      },
      {
        id: 'd25_d',
        reality: 'foundation_first',
        label: { fa: 'شاید اول به سال آمادگی یا تقویت زبان نیاز داشته باشم', en: 'I may need a prep year or language track first', tr: 'Önce hazırlık yılı ya da dil desteği gerekebilir', ar: 'قد أحتاج أولاً سنة تحضيرية أو دعماً لغوياً' },
        weights: { strengths: { LanguageCommunication: 1 }, big5: { O: 1 } },
      },
    ],
  },
];

export const DISCOVERY_TOTAL = DISCOVERY_QUESTIONS.length;

/** Index lookup used by the scoring engine. */
export function findDiscoveryOption(optionId) {
  for (const q of DISCOVERY_QUESTIONS) {
    const opt = q.options.find((o) => o.id === optionId);
    if (opt) return { question: q, option: opt };
  }
  return null;
}
