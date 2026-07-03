// Smart in-conversation understanding for Smart Apply guided questions.
//
// While the student is on a guided question they can type freely instead of
// tapping an option. This module classifies that text so the assistant can:
//   - explain a term they don't understand (e.g. "what does introvert mean?")
//   - answer a general/off-topic study question (via the knowledge base)
//   - reassure when they ask "which should I pick?"
//   - compare two close options when the student is stuck between them
//   - map their own words to the closest option and ask them to confirm
//
// This is deterministic mock reasoning. A real LLM can replace classify() later
// while keeping the same return contract. Nothing here selects an answer on its
// own: option mapping always returns a proposal the student must confirm.
import { L } from '../lib/lang';
import { matchGlossary } from '../data/discoveryGlossary';
import { matchKnowledge } from '../data/knowledgeBase';

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[‌‏‎]/g, ' ')
    .replace(/[ي]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const QUESTION_PUNCT = ['?', '؟'];
const QUESTION_WORDS = [
  'چیه', 'چیست', 'یعنی', 'معنی', 'منظور', 'چرا', 'چطور', 'چگونه', 'فرق', 'تفاوت',
  'نمیدونم', 'نمی دانم', 'نمیفهمم', 'متوجه نشدم', 'متوجه نمیشم', 'توضیح',
  'what', 'why', 'how', 'which', 'mean', 'meaning', 'difference', 'explain',
  'confused', "don't understand", 'dont understand', "don't know", 'idk', 'not sure',
  'neden', 'nasıl', 'nasil', 'hangi', 'anlam', 'anlamadım', 'bilmiyorum', 'açıkla',
  'لماذا', 'كيف', 'معنى', 'الفرق', 'لا أفهم', 'لا أعرف', 'اشرح', 'ماذا',
];

const PICK_MARKERS = [
  'کدوم', 'کدام', 'برای من بهتر', 'پیشنهاد', 'انتخاب کن', 'تو بگو', 'کمکم کن',
  'which should', 'which one', 'best for me', 'recommend', 'you choose', 'help me choose', 'suggest',
  'hangisini', 'bana uygun', 'sen seç', 'öner',
  'أيها', 'أيهما', 'الأنسب لي', 'اقترح', 'اختر لي', 'ساعدني',
];

const COMPARE_MARKERS = [
  'بین', 'میان', 'موندم', 'ماندم', 'شک دارم', 'دو تا', 'دوتا', 'فرق', 'تفاوت', 'مقایسه',
  'between', 'stuck between', 'compare', 'difference', 'two options', 'both',
  'arasında', 'ikisi', 'kararsız', 'fark',
  'بين', 'محتار', 'الفرق', 'قارن',
];

// Ordinal phrases -> option index (0-based). Latin + fa/ar numerals + words.
const ORDINALS = [
  { i: 0, words: ['first one', '1st', 'option 1', 'option one', 'اولی', 'گزینه اول', 'گزینه یک', 'شماره یک', 'عدد یک', 'birinci', '1.', 'الأول', 'الأولى', '۱', '1'] },
  { i: 1, words: ['second one', '2nd', 'option 2', 'option two', 'دومی', 'گزینه دوم', 'گزینه دو', 'شماره دو', 'عدد دو', 'ikinci', '2.', 'الثاني', 'الثانية', '۲', '2'] },
  { i: 2, words: ['third one', '3rd', 'option 3', 'option three', 'سومی', 'گزینه سوم', 'گزینه سه', 'شماره سه', 'عدد سه', 'üçüncü', 'ucuncu', '3.', 'الثالث', 'الثالثة', '۳', '3'] },
  { i: 3, words: ['fourth one', '4th', 'option 4', 'option four', 'چهارمی', 'گزینه چهارم', 'گزینه چهار', 'شماره چهار', 'عدد چهار', 'dördüncü', 'dorduncu', '4.', 'الرابع', 'الرابعة', '۴', '4'] },
];

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with', 'i', 'me', 'my', 'is', 'am', 'are', 'be', 'it', 'that', 'this', 'like', 'want', 'would', 'prefer',
  'و', 'با', 'به', 'از', 'که', 'را', 'رو', 'یه', 'یک', 'من', 'هم', 'تو', 'این', 'اون', 'می', 'خیلی', 'دوست', 'دارم', 'کنم', 'هست',
  've', 'bir', 'ben', 'çok', 'daha', 'için',
  'في', 'من', 'على', 'مع', 'أنا', 'هذا', 'هذه',
]);

// Semantic hints are intentionally broad. They let the mock assistant infer
// meaning from a student's sentence even when it does not repeat the option
// label verbatim. This is a frontend demo substitute for an embedding/LLM ranker.
const CONCEPT_HINTS = {
  'mbti.E': ['جمع', 'گروه', 'دوستان', 'حرف', 'گفتگو', 'صحبت', 'تعامل', 'جلسه', 'آشنا', 'team', 'people', 'talk', 'social', 'meeting', 'friends', 'discussion', 'insan', 'sohbet', 'arkadaş', 'ناس', 'حديث'],
  'mbti.I': ['تنهایی', 'تنها', 'سکوت', 'آرام', 'فکر', 'نوشتن', 'تمرکز', 'خلوت', 'alone', 'quiet', 'solo', 'focus', 'write', 'think', 'yalnız', 'sessiz', 'وحدي', 'هدوء'],
  'mbti.S': ['جزئیات', 'واقعی', 'عملی', 'مرحله', 'ملموس', 'نمونه', 'دقیق', 'real', 'practical', 'detail', 'step', 'concrete', 'hands', 'somut', 'detay', 'gerçek', 'تفاصيل', 'واقعي'],
  'mbti.N': ['ایده', 'الگو', 'تصویر کلی', 'آینده', 'احتمال', 'خلاق', 'نظریه', 'big picture', 'idea', 'pattern', 'future', 'theory', 'creative', 'fikir', 'örüntü', 'gelecek', 'فكرة', 'نمط'],
  'mbti.T': ['منطق', 'داده', 'تحلیل', 'معیار', 'مدرک', 'عینی', 'تصمیم', 'logic', 'data', 'evidence', 'criteria', 'analysis', 'objective', 'mantık', 'veri', 'kanıt', 'بيانات'],
  'mbti.F': ['احساس', 'ارزش', 'همدل', 'آدم', 'حمایت', 'اثر روی دیگران', 'human', 'values', 'support', 'empathy', 'people', 'impact', 'değer', 'destek', 'empati', 'تعاطف', 'قيم'],
  'mbti.J': ['برنامه', 'نظم', 'مرتب', 'ساختار', 'تعهد', 'قابل پیش بینی', 'plan', 'organized', 'structure', 'schedule', 'commitment', 'predictable', 'planlı', 'düzen', 'خطة', 'منظم'],
  'mbti.P': ['آزاد', 'منعطف', 'تغییر', 'خودجوش', 'گزینه باز', 'لحظه', 'freedom', 'flexible', 'change', 'spontaneous', 'open options', 'pivot', 'esnek', 'özgür', 'تغيير', 'مرن'],
  'riasec.R': ['ساختن', 'ابزار', 'عملی', 'فنی', 'دست', 'نمونه', 'prototype', 'build', 'hands on', 'technical', 'physical', 'yapmak', 'teknik', 'بناء'],
  'riasec.I': ['پژوهش', 'تحقیق', 'سؤال', 'کشف', 'تحلیل', 'فرضیه', 'research', 'question', 'investigate', 'discover', 'hypothesis', 'araştırma', 'بحث'],
  'riasec.A': ['هنر', 'طراحی', 'زیبا', 'خلاق', 'تصویر', 'روایت', 'design', 'art', 'creative', 'visual', 'story', 'tasarım', 'sanat', 'فن', 'تصميم'],
  'riasec.S': ['کمک', 'آموزش', 'آدم', 'گفتگو', 'حمایت', 'رابطه', 'help', 'teach', 'people', 'support', 'care', 'education', 'yardım', 'تعليم', 'مساعدة'],
  'riasec.E': ['رهبری', 'فروش', 'مذاکره', 'کسب و کار', 'تیم', 'رشد', 'lead', 'business', 'sell', 'negotiate', 'growth', 'team', 'lider', 'satış', 'قيادة'],
  'riasec.C': ['پرونده', 'داده', 'مرتب', 'قانون', 'سیستم', 'دقیق', 'records', 'organized', 'data', 'system', 'rules', 'precision', 'düzen', 'نظام'],
  'big5.O': ['تازه', 'جدید', 'ناشناخته', 'تجربه', 'ایده', 'خلاق', 'new', 'novel', 'curious', 'explore', 'creative', 'yenilik', 'جديد'],
  'big5.C': ['مسئولیت', 'قول', 'منظم', 'دقیق', 'تمام', 'برنامه', 'responsible', 'discipline', 'finish', 'organized', 'careful', 'sorumluluk', 'مسؤولية'],
  'big5.E': ['پر انرژی', 'اجتماعی', 'جلسه', 'رهبری', 'حرف', 'social', 'active', 'lead', 'expressive', 'meeting', 'sosyal', 'اجتماعي'],
  'big5.A': ['مهربان', 'همکار', 'حمایت', 'اعتماد', 'مصالحه', 'kind', 'cooperate', 'support', 'trust', 'compromise', 'destek', 'ثقة'],
  'big5.Em': ['استرس', 'نگران', 'دلگرمی', 'فشار', 'اضطراب', 'stress', 'anxious', 'pressure', 'reassurance', 'worry', 'stres', 'قلق'],
  'hexaco.H': ['صداقت', 'منصفانه', 'اعتبار', 'درستکاری', 'اعتماد', 'honest', 'fair', 'integrity', 'trust', 'adil', 'dürüst', 'أمانة'],
  'hexaco.X': ['انرژی اجتماعی', 'جمع', 'اعتماد اجتماعی', 'social energy', 'outgoing', 'confidence', 'اجتماعي'],
  'acca.Health': ['سلامت', 'بیمار', 'کلینیک', 'درمان', 'پزشکی', 'health', 'patient', 'clinic', 'medical', 'care', 'sağlık', 'مريض'],
  'acca.Business': ['کسب و کار', 'بازار', 'شرکت', 'قرارداد', 'درآمد', 'business', 'market', 'company', 'deal', 'growth', 'iş', 'شركة'],
  'acca.Tech': ['فناوری', 'کامپیوتر', 'سیستم', 'الگوریتم', 'نرم افزار', 'technology', 'computing', 'software', 'system', 'algorithm', 'teknoloji', 'تقنية'],
  'acca.Creative': ['طراحی', 'هنر', 'خلاق', 'رسانه', 'استودیو', 'creative', 'design', 'media', 'studio', 'visual', 'yaratıcı', 'إبداع'],
  'acca.Research': ['تحقیق', 'پژوهش', 'آزمایش', 'سؤال', 'داده', 'research', 'lab', 'analysis', 'question', 'data', 'araştırma', 'بحث'],
  'acca.People': ['آدم', 'دانشجو', 'مشتری', 'بیمار', 'کمک', 'people', 'student', 'client', 'patient', 'help', 'insan', 'ناس'],
  'acca.Stability': ['امنیت', 'پایدار', 'قابل پیش بینی', 'ثابت', 'stable', 'security', 'predictable', 'safe', 'güven', 'استقرار'],
  'acca.Leadership': ['رهبر', 'مدیر', 'تیم', 'جهت', 'تصمیم', 'leader', 'manage', 'team', 'direction', 'decision', 'lider', 'قيادة'],
  'acca.Communication': ['ارتباط', 'ارائه', 'نوشتن', 'توضیح', 'گفتگو', 'communication', 'presentation', 'writing', 'explain', 'speak', 'iletişim', 'تواصل'],
  'acca.Precision': ['دقیق', 'جزئیات', 'کیفیت', 'خطا', 'معیار', 'precise', 'detail', 'quality', 'error', 'standard', 'detay', 'دقة'],
  'acca.GlobalMobility': ['بین المللی', 'مهاجرت', 'پاسپورت', 'زبان', 'خارج', 'international', 'migration', 'passport', 'language', 'global', 'yurt dışı', 'دولي'],
  'motiv.Income': ['درآمد', 'پول', 'حقوق', 'مالی', 'income', 'money', 'salary', 'financial', 'gelir', 'مال'],
  'motiv.Prestige': ['اعتبار', 'جایگاه', 'احترام', 'رتبه', 'prestige', 'respect', 'rank', 'status', 'itibar', 'مكانة'],
  'motiv.Security': ['امنیت', 'ثبات', 'ریسک کم', 'مطمئن', 'security', 'stable', 'safe', 'low risk', 'güven', 'أمان'],
  'motiv.SocialImpact': ['اثر', 'معنا', 'کمک', 'زندگی دیگران', 'impact', 'meaning', 'help others', 'social', 'etki', 'أثر'],
  'motiv.Autonomy': ['استقلال', 'آزادی', 'تصمیم خودم', 'مالکیت', 'autonomy', 'freedom', 'ownership', 'independent', 'özgürlük', 'استقلال'],
  'motiv.Creativity': ['خلاقیت', 'خلق', 'ایده تازه', 'نو', 'creativity', 'create', 'fresh idea', 'invent', 'yaratıcılık', 'إبداع'],
  'motiv.Migration': ['مهاجرت', 'خارج', 'بین المللی', 'پاسپورت', 'migration', 'abroad', 'international', 'relocate', 'yurt dışı', 'هجرة'],
  'motiv.FamilyApproval': ['خانواده', 'والدین', 'افتخار خانواده', 'family', 'parents', 'approval', 'proud', 'aile', 'عائلة'],
  'motiv.Lifestyle': ['تعادل', 'وقت آزاد', 'سبک زندگی', 'ساعت کاری', 'balance', 'free time', 'lifestyle', 'hours', 'denge', 'حياة'],
  'strengths.BiologyChemistry': ['زیست', 'شیمی', 'biology', 'chemistry', 'biyoloji', 'كيمياء'],
  'strengths.MathPhysics': ['ریاضی', 'فیزیک', 'math', 'physics', 'matematik', 'فيزياء'],
  'strengths.LanguageCommunication': ['زبان', 'انشا', 'ارائه', 'language', 'essay', 'presentation', 'dil', 'لغة'],
  'strengths.ArtDesign': ['هنر', 'طراحی', 'art', 'design', 'sanat', 'تصميم'],
  'strengths.BusinessEconomics': ['اقتصاد', 'بیزنس', 'مدیریت', 'business', 'economics', 'management', 'işletme', 'اقتصاد'],
  'strengths.PsychologyHumanities': ['روانشناسی', 'انسانی', 'رفتار', 'psychology', 'humanities', 'behavior', 'psikoloji', 'نفس'],
  'strengths.TechnologyComputing': ['کامپیوتر', 'نرم افزار', 'برنامه نویسی', 'computer', 'software', 'programming', 'yazılım', 'حاسوب'],
  'strengths.ResearchWriting': ['تحقیق', 'نوشتن', 'گزارش', 'research', 'writing', 'report', 'araştırma', 'كتابة'],
  'lifestyle.Routine': ['روتین', 'برنامه ثابت', 'تکرار', 'routine', 'stable schedule', 'regular', 'rutin', 'روتين'],
  'lifestyle.Risk': ['ریسک', 'ابهام', 'عدم قطعیت', 'risk', 'uncertainty', 'ambiguity', 'risk', 'مخاطرة'],
  'lifestyle.Independence': ['مستقل', 'تنهایی کار', 'آزادی', 'independent', 'solo work', 'freedom', 'bağımsız', 'مستقل'],
  'lifestyle.HumanIntensity': ['تعامل زیاد', 'بحران انسانی', 'آدم زیاد', 'high interaction', 'human pressure', 'crisis', 'insan', 'أشخاص'],
  'lifestyle.Competition': ['رقابت', 'برنده', 'بهترین عملکرد', 'competition', 'win', 'compete', 'rekabet', 'منافسة'],
  'lifestyle.Pressure': ['فشار', 'ددلاین', 'استرس', 'pressure', 'deadline', 'stress', 'baskı', 'ضغط'],
  'lifestyle.LongTraining': ['تخصص طولانی', 'سالها', 'آموزش طولانی', 'long training', 'specialize', 'uzun eğitim', 'تدريب طويل'],
  'identity.Expert': ['متخصص', 'استاندارد', 'دقت', 'اعتبار تخصصی', 'expert', 'specialist', 'standard', 'credibility', 'uzman', 'خبير'],
  'identity.Creator': ['خالق', 'طراح', 'ایده', 'سبک خودم', 'creator', 'designer', 'distinct voice', 'creative', 'yaratıcı', 'مبدع'],
  'identity.Leader': ['رهبر', 'مدیر', 'تیم', 'نتیجه بزرگ', 'leader', 'manager', 'team outcome', 'lider', 'قائد'],
  'identity.Researcher': ['پژوهشگر', 'کشف', 'سؤال سخت', 'researcher', 'discover', 'hard question', 'araştırmacı', 'باحث'],
  'identity.Helper': ['کمک کننده', 'حمایت', 'بهبود زندگی', 'helper', 'support', 'improve lives', 'yardımcı', 'مساعد'],
  'identity.Founder': ['بنیانگذار', 'سازنده', 'فرصت', 'استارتاپ', 'founder', 'builder', 'startup', 'opportunity', 'kurucu', 'مؤسس'],
};

const OPTION_HINTS = {
  d03_a: [
    'بلند فکر می‌کنم', 'بلند فکر میکنم', 'با صدای بلند', 'با دیگران حرف می‌زنم', 'با دیگران حرف میزنم',
    'وقتی توضیح می‌دهم', 'وقتی توضیح میدم', 'با بقیه صحبت', 'در جمع مطرح می‌کنم', 'در جمع مطرح میکنم',
    'talk it out', 'say it out loud', 'with others', 'explain it to someone',
  ],
  d03_b: [
    'بعد از کمی فکر', 'اول فکر می‌کنم بعد حرف می‌زنم', 'اول فکر میکنم بعد حرف میزنم',
    'در گفتگو پخته', 'با بحث بهتر می‌شود', 'با بحث بهتر میشه', 'وقتی با کسی مطرح می‌کنم',
    'after thinking', 'after some thought', 'in discussion', 'talk after thinking',
  ],
  d03_c: [
    'روی کاغذ', 'کاغذ', 'می‌نویسم', 'مینویسم', 'یادداشت', 'دفتر', 'تایپ می‌کنم', 'تایپ میکنم',
    'write it down', 'on paper', 'notes', 'journal', 'type it',
  ],
  d03_d: [
    'الهام', 'بهم الهام', 'الهام می‌شود', 'الهام میشه', 'الهام میشن', 'الهام می‌شوند',
    'به ذهنم می‌رسد', 'به ذهنم میرسد', 'به ذهنم می‌رسه', 'به ذهنم میرسه', 'به ذهنم میاد',
    'در ذهنم', 'تو ذهنم', 'داخل ذهنم', 'ذهنم', 'جرقه', 'ایده جرقه', 'خودش روشن می‌شود',
    'خودش روشن میشه', 'ناگهان روشن می‌شود', 'ناگهان روشن میشه', 'در سکوت', 'سکوت', 'خلوت',
    'بدون حرف زدن', 'خودم فکر می‌کنم', 'خودم فکر میکنم', 'از اول تا آخر',
    'in my head', 'in silence', 'silently', 'it comes to me', 'inspiration', 'inspired', 'spark',
  ],
  d07_a: [
    'انتقاد', 'انتقاد می‌کنم', 'انتقاد میکنم', 'سخت می‌گیرم', 'سخت میگیرم', 'سختگیر', 'سخت‌گیر',
    'قضاوت', 'قضاوت می‌کنم', 'قضاوت میکنم', 'رک', 'حقیقت', 'واقعیت', 'تلخ', 'صادق', 'منطقی',
    'اشتباهش را می‌گویم', 'اشتباهش رو میگم', 'برای بهتر شدن', 'بهتر بشن', 'پیشرفت کنن', 'پیشرفت کنند',
    'اصلاح بشن', 'اصلاح کنند', 'direct', 'critical', 'criticism', 'tough love', 'honest', 'logical',
  ],
  d07_b: [
    'مزایا و معایب', 'سبک سنگین', 'سبک‌سنگین', 'منصفانه', 'دو طرف', 'هر دو طرف', 'مقایسه',
    'دقیق بررسی', 'بالانس', 'تعادل', 'pros and cons', 'fair', 'balanced', 'weigh both sides',
  ],
  d07_c: [
    'کمک', 'کمک کنم', 'کمکشان کنم', 'حمایت', 'حمایتگر', 'دلگرم', 'دلگرمی', 'تشویق', 'کنارشان',
    'بهشون توجه', 'حواس جمع', 'بهتر بشن', 'پیشرفت کنن', 'support', 'supportive', 'encourage', 'help',
  ],
  d07_d: [
    'جای آنها', 'جای اونا', 'خودم را جای', 'خودمو جای', 'احساسشان', 'احساسشون', 'دردشان', 'دردشون',
    'همدلی', 'همدلانه', 'عمیقاً درک', 'deeply empathize', 'feel their situation', 'put myself in their place',
  ],
};

const OPTION_HINT_REASONS = {
  d03_a: {
    fa: 'چون در جوابت نشانه‌هایی از روشن شدن ایده از طریق حرف زدن با دیگران دیده می‌شود.',
    en: 'Because your answer points to ideas becoming clearer by talking them through with others.',
  },
  d03_b: {
    fa: 'چون جوابت به ترکیب فکر کردن و پخته شدن ایده در گفت‌وگو نزدیک است.',
    en: 'Because your answer sounds like ideas mature through both thinking and discussion.',
  },
  d03_c: {
    fa: 'چون جوابت به روشن شدن ایده از طریق نوشتن، یادداشت کردن یا بیرون آوردن فکر روی کاغذ نزدیک است.',
    en: 'Because your answer points to ideas becoming clearer through writing or externalizing them.',
  },
  d03_d: {
    fa: 'چون وقتی از الهام و شفاف شدن ایده می‌گویی، بیشتر شبیه حالتی است که ایده در سکوت و داخل ذهن خودت روشن می‌شود.',
    en: 'Because when you describe inspiration and the idea becoming clear, it sounds closest to the idea forming silently inside your own mind.',
  },
  d07_a: {
    fa: 'چون در جوابت نشانه‌هایی از رک‌بودن، انتقاد برای بهتر شدن و سخت‌گیری سازنده دیده می‌شود؛ این بیشتر به توصیه‌ی صادق و منطقی نزدیک است، حتی اگر کمی تلخ باشد.',
    en: 'Because your answer points to direct honesty, constructive criticism, and pushing people to improve, even if it can feel a little sharp.',
  },
  d07_b: {
    fa: 'چون جوابت به بررسی منصفانه، سبک‌سنگین کردن و دیدن چند زاویه‌ی موضوع نزدیک است.',
    en: 'Because your answer points to weighing both sides carefully and trying to be fair.',
  },
  d07_c: {
    fa: 'چون در جوابت نشانه‌هایی از کمک، حمایت و بهتر شدن حال یا مسیر دیگران دیده می‌شود.',
    en: 'Because your answer points to helping, supporting, and encouraging others to improve.',
  },
  d07_d: {
    fa: 'چون جوابت به همدلی عمیق، گذاشتن خودت جای طرف مقابل و فهمیدن موقعیت احساسی او نزدیک است.',
    en: 'Because your answer points to deep empathy and putting yourself in the other person’s situation.',
  },
};

const CONCEPT_COPY = {
  'mbti.E': { fa: 'انرژی گرفتن از تعامل و گفت‌وگو', en: 'energy from interaction and conversation', tr: 'etkileşim ve sohbetten enerji almak', ar: 'اكتساب الطاقة من التفاعل والحديث' },
  'mbti.I': { fa: 'تمرکز، خلوت و فکرکردن قبل از پاسخ', en: 'focus, quiet time, and thinking before responding', tr: 'odaklanma, sakinlik ve yanıtlamadan önce düşünme', ar: 'التركيز والهدوء والتفكير قبل الرد' },
  'mbti.S': { fa: 'مثال واقعی، جزئیات و مسیر مرحله‌به‌مرحله', en: 'real examples, details, and step-by-step work', tr: 'gerçek örnekler, ayrıntılar ve adım adım çalışma', ar: 'أمثلة واقعية وتفاصيل وخطوات واضحة' },
  'mbti.N': { fa: 'ایده‌ها، الگوها و تصویر کلی آینده', en: 'ideas, patterns, and the big picture', tr: 'fikirler, örüntüler ve büyük resim', ar: 'الأفكار والأنماط والصورة الكبرى' },
  'mbti.T': { fa: 'منطق، داده و معیارهای قابل بررسی', en: 'logic, data, and reviewable criteria', tr: 'mantık, veri ve ölçülebilir kriterler', ar: 'المنطق والبيانات والمعايير القابلة للمراجعة' },
  'mbti.F': { fa: 'ارزش‌ها، همدلی و اثر تصمیم روی آدم‌ها', en: 'values, empathy, and human impact', tr: 'değerler, empati ve insan etkisi', ar: 'القيم والتعاطف وأثر القرار على الناس' },
  'mbti.J': { fa: 'برنامه، نظم و تعهد روشن', en: 'planning, order, and clear commitment', tr: 'plan, düzen ve net bağlılık', ar: 'الخطة والنظام والالتزام الواضح' },
  'mbti.P': { fa: 'انعطاف، آزادی و باز گذاشتن گزینه‌ها', en: 'flexibility, freedom, and open options', tr: 'esneklik, özgürlük ve açık seçenekler', ar: 'المرونة والحرية وترك الخيارات مفتوحة' },
  'riasec.R': { fa: 'کار عملی، ساختن و آزمودن چیزهای واقعی', en: 'hands-on building and testing real things' },
  'riasec.I': { fa: 'تحقیق، تحلیل و کشف پاسخ سؤال‌های سخت', en: 'research, analysis, and hard questions' },
  'riasec.A': { fa: 'خلق، طراحی، تصویر و بیان خلاق', en: 'creation, design, visuals, and creative expression' },
  'riasec.S': { fa: 'کمک، آموزش، ارتباط و کار با آدم‌ها', en: 'helping, teaching, communication, and people work' },
  'riasec.E': { fa: 'رهبری، مذاکره، رشد و کسب‌وکار', en: 'leadership, negotiation, growth, and business' },
  'riasec.C': { fa: 'نظم، داده، پرونده و کار دقیق', en: 'order, data, records, and precise work' },
  'big5.O': { fa: 'کنجکاوی و راحتی با تجربه‌های تازه', en: 'curiosity and comfort with novelty' },
  'big5.C': { fa: 'مسئولیت‌پذیری، نظم و تمام‌کردن کار', en: 'responsibility, discipline, and finishing tasks' },
  'big5.E': { fa: 'بیانگری، انرژی اجتماعی و حضور فعال', en: 'expressiveness, social energy, and active presence' },
  'big5.A': { fa: 'همکاری، مهربانی و ساختن اعتماد', en: 'cooperation, kindness, and trust-building' },
  'big5.Em': { fa: 'حساسیت به فشار، اضطراب یا نیاز به دلگرمی', en: 'sensitivity to pressure, stress, or reassurance needs' },
  'hexaco.H': { fa: 'صداقت، انصاف و اعتبار بلندمدت', en: 'honesty, fairness, and long-term integrity' },
  'hexaco.X': { fa: 'اعتماد و انرژی اجتماعی', en: 'social confidence and energy' },
  'acca.Health': { fa: 'علاقه به سلامت، مراقبت و اثر مستقیم روی زندگی آدم‌ها', en: 'interest in health, care, and direct human impact' },
  'acca.Business': { fa: 'علاقه به بازار، شرکت، درآمد و رشد', en: 'interest in markets, companies, income, and growth' },
  'acca.Tech': { fa: 'علاقه به فناوری، سیستم و حل مسئله فنی', en: 'interest in technology, systems, and technical problem-solving' },
  'acca.Creative': { fa: 'علاقه به طراحی، رسانه و خروجی خلاق', en: 'interest in design, media, and creative output' },
  'acca.Research': { fa: 'علاقه به پژوهش، داده و فهم عمیق', en: 'interest in research, data, and deep understanding' },
  'acca.People': { fa: 'علاقه به کار انسانی و ارتباط مستقیم', en: 'interest in people-centered work and direct contact' },
  'acca.Stability': { fa: 'نیاز به مسیر پایدار و قابل پیش‌بینی', en: 'need for a stable and predictable path' },
  'acca.Leadership': { fa: 'تمایل به هدایت تیم و تصمیم‌سازی', en: 'preference for leading teams and shaping decisions' },
  'acca.Communication': { fa: 'قدرت بیان، ارائه و توضیح دادن', en: 'communication, presentation, and explanation strengths' },
  'acca.Precision': { fa: 'دقت، جزئیات و استاندارد بالا', en: 'precision, detail, and high standards' },
  'acca.GlobalMobility': { fa: 'میل به مسیر بین‌المللی، زبان و جابه‌جایی', en: 'interest in international mobility, language, and relocation' },
  'motiv.Income': { fa: 'اهمیت درآمد و محدودیت مالی', en: 'income and financial considerations' },
  'motiv.Prestige': { fa: 'اهمیت اعتبار، احترام و جایگاه حرفه‌ای', en: 'prestige, respect, and professional status' },
  'motiv.Security': { fa: 'اهمیت امنیت، ثبات و ریسک کمتر', en: 'security, stability, and lower risk' },
  'motiv.SocialImpact': { fa: 'اهمیت معنا و اثر مثبت روی دیگران', en: 'meaning and positive impact on others' },
  'motiv.Autonomy': { fa: 'اهمیت استقلال و آزادی تصمیم', en: 'autonomy and decision freedom' },
  'motiv.Creativity': { fa: 'اهمیت خلاقیت و ساختن چیز تازه', en: 'creativity and building something new' },
  'motiv.Migration': { fa: 'تمایل به تجربه بین‌المللی یا مهاجرت', en: 'international or migration-oriented goals' },
  'motiv.FamilyApproval': { fa: 'اهمیت نظر خانواده و حمایت اطرافیان', en: 'family approval and support' },
  'motiv.Lifestyle': { fa: 'اهمیت تعادل زندگی، زمان آزاد و فشار کمتر', en: 'life balance, free time, and sustainable pressure' },
  'strengths.BiologyChemistry': { fa: 'قوت در زیست و شیمی', en: 'strength in biology and chemistry' },
  'strengths.MathPhysics': { fa: 'قوت در ریاضی و فیزیک', en: 'strength in math and physics' },
  'strengths.LanguageCommunication': { fa: 'قوت در زبان، نوشتن و ارائه', en: 'strength in language, writing, and presentation' },
  'strengths.ArtDesign': { fa: 'قوت در هنر و طراحی', en: 'strength in art and design' },
  'strengths.BusinessEconomics': { fa: 'قوت در اقتصاد، مدیریت و کسب‌وکار', en: 'strength in economics, management, and business' },
  'strengths.PsychologyHumanities': { fa: 'قوت در علوم انسانی، رفتار و جامعه', en: 'strength in humanities, behavior, and society' },
  'strengths.TechnologyComputing': { fa: 'قوت در کامپیوتر، فناوری و برنامه‌نویسی', en: 'strength in computing, technology, and programming' },
  'strengths.ResearchWriting': { fa: 'قوت در تحقیق، نوشتن و گزارش دقیق', en: 'strength in research, writing, and rigorous reports' },
  'lifestyle.Routine': { fa: 'راحتی با ریتم ثابت و برنامه روشن', en: 'comfort with routine and clear structure' },
  'lifestyle.Risk': { fa: 'راحتی با ریسک، ابهام و تغییر مسیر', en: 'comfort with risk, ambiguity, and changing direction' },
  'lifestyle.Independence': { fa: 'نیاز به استقلال و فضای کار شخصی', en: 'need for independence and personal work space' },
  'lifestyle.HumanIntensity': { fa: 'راحتی یا حساسیت نسبت به تعامل انسانی زیاد', en: 'comfort or sensitivity around intense human interaction' },
  'lifestyle.Competition': { fa: 'رابطه با رقابت و عملکرد تحت فشار', en: 'relationship with competition and performance pressure' },
  'lifestyle.Pressure': { fa: 'تحمل فشار، ددلاین و موقعیت‌های سخت', en: 'tolerance for pressure, deadlines, and difficult situations' },
  'lifestyle.LongTraining': { fa: 'آمادگی برای مسیر تخصصی و آموزش طولانی', en: 'readiness for specialization and long training' },
  'identity.Expert': { fa: 'تصویر آینده به‌عنوان متخصص دقیق', en: 'future identity as a precise specialist' },
  'identity.Creator': { fa: 'تصویر آینده به‌عنوان خالق یا طراح', en: 'future identity as a creator or designer' },
  'identity.Leader': { fa: 'تصویر آینده به‌عنوان رهبر یا هماهنگ‌کننده', en: 'future identity as a leader or coordinator' },
  'identity.Researcher': { fa: 'تصویر آینده به‌عنوان پژوهشگر و تحلیلگر', en: 'future identity as a researcher and analyst' },
  'identity.Helper': { fa: 'تصویر آینده به‌عنوان فرد اثرگذار و کمک‌کننده', en: 'future identity as a helper and positive-impact person' },
  'identity.Founder': { fa: 'تصویر آینده به‌عنوان سازنده، بنیان‌گذار یا کارآفرین', en: 'future identity as a builder, founder, or entrepreneur' },
};

const REASON_COPY = {
  fa: (parts) => `چون در پاسخ شما نشانه‌هایی از ${parts} دیده می‌شود.`,
  en: (parts) => `Because your answer points toward ${parts}.`,
  tr: (parts) => `Çünkü yanıtın ${parts} yönüne işaret ediyor.`,
  ar: (parts) => `لأن إجابتك تشير إلى ${parts}.`,
};

const ORDINAL_REASON = {
  fa: (label) => `چون خودت به ${label} اشاره کردی.`,
  en: (label) => `Because you explicitly referred to ${label}.`,
  tr: (label) => `Çünkü açıkça ${label} seçeneğini söyledin.`,
  ar: (label) => `لأنك أشرت بوضوح إلى ${label}.`,
};

const OPTION_GUIDE_OVERRIDES = {
  d02_a: {
    fa: 'این را انتخاب کن اگر معمولاً خودت راحت سر صحبت را باز می‌کنی، از آشنایی با چند نفر انرژی می‌گیری و حضور در جمع برایت طبیعی است.',
    en: 'Choose this if you usually start conversations easily, enjoy meeting several people, and feel natural in a group.',
    tr: 'Genelde sohbeti rahatça başlatıyor, birkaç kişiyle tanışmaktan enerji alıyor ve kalabalıkta doğal hissediyorsan bunu seç.',
    ar: 'اختر هذا إذا كنت تبدأ الحديث بسهولة، وتستمتع بالتعرّف إلى عدة أشخاص، وتشعر بالراحة داخل المجموعة.',
  },
  d02_b: {
    fa: 'این را انتخاب کن اگر اجتماعی هستی، اما معمولاً شروع‌کننده نیستی؛ وقتی کسی سر صحبت را باز کند، راحت همراه می‌شوی.',
    en: 'Choose this if you are social, but usually not the one who starts; once someone opens the conversation, you join comfortably.',
    tr: 'Sosyalsin ama genelde ilk adımı sen atmıyorsan; biri sohbeti başlatınca rahatça katılıyorsan bunu seç.',
    ar: 'اختر هذا إذا كنت اجتماعياً لكنك لا تبدأ الحديث غالباً؛ عندما يفتح شخص آخر الموضوع تشارك بسهولة.',
  },
  d02_c: {
    fa: 'این را انتخاب کن اگر اول ترجیح می‌دهی فضا و آدم‌ها را بسنجی، بعد وقتی خیالت راحت شد وارد صحبت شوی.',
    en: 'Choose this if you prefer to read the room first, then talk once you feel comfortable.',
    tr: 'Önce ortamı ve insanları gözlemleyip, rahat hissedince konuşmaya giriyorsan bunu seç.',
    ar: 'اختر هذا إذا كنت تفضّل فهم الجو والأشخاص أولاً، ثم تبدأ الحديث عندما تشعر بالراحة.',
  },
  d02_d: {
    fa: 'این را انتخاب کن اگر معمولاً با آدم‌های کم‌تری صمیمی می‌شوی، اما همان رابطه‌ها برایت عمیق و واقعی‌اند؛ لازم نیست با همه صحبت کنی.',
    en: 'Choose this if you usually connect with fewer people, but those connections become deeper and more genuine; you do not need to talk to everyone.',
    tr: 'Daha az kişiyle yakınlaşıyor ama bu ilişkiler senin için daha derin ve gerçek oluyorsa; herkesle konuşma ihtiyacı duymuyorsan bunu seç.',
    ar: 'اختر هذا إذا كنت تقترب من عدد قليل من الأشخاص، لكن علاقاتك معهم تكون أعمق وأكثر صدقاً؛ ولا تحتاج إلى الحديث مع الجميع.',
  },
};

const STUDENT_GUIDE_COPY = {
  'mbti.E': {
    fa: 'از صحبت با آدم‌ها انرژی می‌گیری و راحت وارد جمع می‌شوی',
    en: 'talking with people gives you energy and joining a group feels natural',
    tr: 'insanlarla konuşmak sana enerji veriyor ve gruba katılmak doğal geliyor',
    ar: 'الكلام مع الناس يعطيك طاقة والدخول في مجموعة يبدو طبيعياً لك',
  },
  'mbti.I': {
    fa: 'قبل از جواب دادن یا وارد شدن به جمع، کمی زمان و فضای آرام می‌خواهی',
    en: 'you need a little quiet time before answering or joining a group',
    tr: 'cevap vermeden veya gruba katılmadan önce biraz sakin zamana ihtiyaç duyuyorsun',
    ar: 'تحتاج إلى قليل من الهدوء قبل الرد أو الدخول في المجموعة',
  },
  'mbti.S': {
    fa: 'با مثال واقعی، جزئیات روشن و قدم‌های مشخص بهتر تصمیم می‌گیری',
    en: 'real examples, clear details, and concrete steps help you decide',
    tr: 'gerçek örnekler, net ayrıntılar ve somut adımlar karar vermeni kolaylaştırıyor',
    ar: 'الأمثلة الواقعية والتفاصيل الواضحة والخطوات المحددة تساعدك على القرار',
  },
  'mbti.N': {
    fa: 'ایده‌های تازه، تصویر کلی و احتمال‌های آینده برایت جذاب‌تر است',
    en: 'new ideas, the big picture, and future possibilities attract you more',
    tr: 'yeni fikirler, büyük resim ve gelecek ihtimalleri seni daha çok çekiyor',
    ar: 'الأفكار الجديدة والصورة الكبرى واحتمالات المستقبل تجذبك أكثر',
  },
  'mbti.T': {
    fa: 'موقع انتخاب، بیشتر دنبال دلیل منطقی، داده و مقایسه روشن هستی',
    en: 'when choosing, you look for logic, evidence, and clear comparison',
    tr: 'seçim yaparken mantık, kanıt ve net karşılaştırma arıyorsun',
    ar: 'عند الاختيار تبحث أكثر عن المنطق والدليل والمقارنة الواضحة',
  },
  'mbti.F': {
    fa: 'اثر تصمیم روی آدم‌ها، ارزش‌ها و حس درست بودن برایت مهم است',
    en: 'the effect on people, values, and what feels right matter to you',
    tr: 'kararın insanlar üzerindeki etkisi, değerler ve doğru hissettirmesi senin için önemli',
    ar: 'تأثير القرار على الناس والقيم والإحساس بالصواب مهم بالنسبة لك',
  },
  'mbti.J': {
    fa: 'با برنامه، نظم و مسیر مشخص احساس آرامش بیشتری داری',
    en: 'a plan, order, and a clear path make you feel calmer',
    tr: 'plan, düzen ve net bir yol seni daha rahat hissettiriyor',
    ar: 'الخطة والنظام والطريق الواضح يجعلك أكثر ارتياحاً',
  },
  'mbti.P': {
    fa: 'دوست داری گزینه‌ها باز بمانند و بتوانی مسیرت را انعطاف‌پذیر تغییر بدهی',
    en: 'you like keeping options open and changing direction flexibly',
    tr: 'seçeneklerin açık kalmasını ve yönünü esnek biçimde değiştirmeyi seviyorsun',
    ar: 'تحب أن تبقى الخيارات مفتوحة وأن تغيّر المسار بمرونة',
  },
  'riasec.R': {
    fa: 'با کار عملی، ساختن، آزمایش کردن و دیدن نتیجه واقعی راحت‌تری',
    en: 'hands-on work, building, testing, and seeing real results suit you',
  },
  'riasec.I': {
    fa: 'از تحقیق، پرسیدن سؤال‌های سخت و پیدا کردن دلیل پشت مسائل لذت می‌بری',
    en: 'you enjoy research, hard questions, and finding the reason behind things',
  },
  'riasec.A': {
    fa: 'بیان خلاق، طراحی، تصویر، داستان یا ساختن چیزهای متفاوت برایت جذاب است',
    en: 'creative expression, design, visuals, stories, or making something different attract you',
  },
  'riasec.S': {
    fa: 'کمک کردن، آموزش دادن یا ارتباط مستقیم با آدم‌ها برایت معنا دارد',
    en: 'helping, teaching, or direct contact with people feels meaningful to you',
  },
  'riasec.E': {
    fa: 'رهبری، مذاکره، فروش، رشد یا جلو بردن یک تیم برایت هیجان‌انگیز است',
    en: 'leadership, negotiation, sales, growth, or moving a team forward excites you',
  },
  'riasec.C': {
    fa: 'کار مرتب، دقیق، قابل پیگیری و قانون‌مند را بیشتر می‌پسندی',
    en: 'you prefer organized, precise, trackable, and rule-based work',
  },
  'big5.O': {
    fa: 'با تجربه‌های تازه، ایده‌های جدید و مسیرهای کمتر تکراری راحتی',
    en: 'you are comfortable with new experiences, fresh ideas, and less routine paths',
  },
  'big5.C': {
    fa: 'قول، مسئولیت، نظم و تمام کردن کارها برایت جدی است',
    en: 'commitment, responsibility, order, and finishing tasks matter to you',
  },
  'big5.E': {
    fa: 'حضور فعال، گفت‌وگو و دیده شدن در جمع برایت طبیعی‌تر است',
    en: 'active presence, conversation, and being visible in a group feel natural',
  },
  'big5.A': {
    fa: 'همکاری، مهربانی و حفظ رابطه خوب با دیگران برایت مهم است',
    en: 'cooperation, kindness, and maintaining good relationships matter to you',
  },
  'big5.Em': {
    fa: 'در موقعیت‌های پر فشار به آرامش، اطمینان یا حمایت بیشتری نیاز داری',
    en: 'in high-pressure situations, you need more calm, reassurance, or support',
  },
  'hexaco.H': {
    fa: 'صداقت، انصاف و درست‌کاری در انتخاب‌ها برایت خیلی مهم است',
    en: 'honesty, fairness, and integrity are very important in your choices',
  },
  'hexaco.X': {
    fa: 'در جمع راحت‌تر اعتماد می‌کنی، صحبت می‌کنی و انرژی می‌گیری',
    en: 'you more easily trust, speak, and gain energy in social settings',
  },
  'acca.Health': {
    fa: 'سلامت، مراقبت و اثر مستقیم روی زندگی آدم‌ها برایت مهم است',
    en: 'health, care, and direct impact on people’s lives matter to you',
  },
  'acca.Business': {
    fa: 'بازار، شرکت، درآمد، رشد و تصمیم‌های تجاری برایت جذاب است',
    en: 'markets, companies, income, growth, and business decisions attract you',
  },
  'acca.Tech': {
    fa: 'فناوری، سیستم‌ها، نرم‌افزار یا حل مسئله فنی برایت جذاب است',
    en: 'technology, systems, software, or technical problem-solving attract you',
  },
  'acca.Creative': {
    fa: 'طراحی، رسانه، ایده‌پردازی یا خروجی خلاق برایت جذاب است',
    en: 'design, media, ideation, or creative output attract you',
  },
  'acca.Research': {
    fa: 'پژوهش، داده، آزمایش و فهم عمیق مسائل برایت جذاب است',
    en: 'research, data, experiments, and deep understanding attract you',
  },
  'acca.People': {
    fa: 'دوست داری کار آینده‌ات ارتباط انسانی و تماس مستقیم با آدم‌ها داشته باشد',
    en: 'you want your future work to include human connection and direct contact',
  },
  'acca.Stability': {
    fa: 'مسیر پایدار، قابل پیش‌بینی و کم‌ریسک برایت آرامش‌بخش‌تر است',
    en: 'a stable, predictable, lower-risk path feels more reassuring',
  },
  'acca.Leadership': {
    fa: 'دوست داری تصمیم‌ساز باشی، تیم را جلو ببری یا مسئولیت مسیر را بگیری',
    en: 'you like shaping decisions, moving a team forward, or taking responsibility',
  },
  'acca.Communication': {
    fa: 'توضیح دادن، ارائه کردن، نوشتن یا قانع کردن دیگران برایت طبیعی است',
    en: 'explaining, presenting, writing, or persuading others feels natural',
  },
  'acca.Precision': {
    fa: 'جزئیات، کیفیت، دقت و کم کردن خطا برایت مهم است',
    en: 'details, quality, precision, and reducing errors matter to you',
  },
  'acca.GlobalMobility': {
    fa: 'زبان، تجربه بین‌المللی، جابه‌جایی یا مسیر خارج از کشور برایت مهم است',
    en: 'language, international experience, relocation, or an abroad path matter to you',
  },
  'motiv.Income': {
    fa: 'درآمد، هزینه‌ها و امنیت مالی در تصمیم رشته برایت نقش مهمی دارد',
    en: 'income, costs, and financial security play a major role in your study choice',
  },
  'motiv.Prestige': {
    fa: 'اعتبار رشته، جایگاه اجتماعی و احترام حرفه‌ای برایت مهم است',
    en: 'program prestige, social status, and professional respect matter to you',
  },
  'motiv.Security': {
    fa: 'ثبات شغلی، مسیر مطمئن و ریسک کمتر برایت اولویت دارد',
    en: 'job stability, a secure path, and lower risk are priorities for you',
  },
  'motiv.SocialImpact': {
    fa: 'دوست داری انتخابت برای دیگران مفید باشد و حس معنا بدهد',
    en: 'you want your choice to help others and feel meaningful',
  },
  'motiv.Autonomy': {
    fa: 'استقلال، آزادی تصمیم و کنترل روی مسیرت برایت مهم است',
    en: 'independence, decision freedom, and control over your path matter to you',
  },
  'motiv.Creativity': {
    fa: 'ساختن ایده تازه، خلق کردن و متفاوت فکر کردن برایت مهم است',
    en: 'building fresh ideas, creating, and thinking differently matter to you',
  },
  'motiv.Migration': {
    fa: 'انتخاب رشته را به تجربه بین‌المللی یا مهاجرت آینده وصل می‌کنی',
    en: 'you connect your study choice with international experience or future migration',
  },
  'motiv.FamilyApproval': {
    fa: 'نظر خانواده، حمایت اطرافیان یا افتخار خانواده در انتخابت اثر دارد',
    en: 'family opinion, support, or making your family proud affects your choice',
  },
  'motiv.Lifestyle': {
    fa: 'تعادل زندگی، زمان آزاد و فشار قابل مدیریت برایت مهم است',
    en: 'life balance, free time, and manageable pressure matter to you',
  },
  'strengths.BiologyChemistry': {
    fa: 'در درس‌هایی مثل زیست، شیمی یا موضوعات مرتبط با بدن و سلامت قوی‌تری',
    en: 'you are stronger in biology, chemistry, or topics related to health and the body',
  },
  'strengths.MathPhysics': {
    fa: 'ریاضی، فیزیک، محاسبه یا حل مسئله عددی برایت راحت‌تر است',
    en: 'math, physics, calculation, or numeric problem-solving feels easier to you',
  },
  'strengths.LanguageCommunication': {
    fa: 'زبان، نوشتن، ارائه یا توضیح دادن از توانایی‌های قوی‌تر توست',
    en: 'language, writing, presenting, or explaining are stronger abilities for you',
  },
  'strengths.ArtDesign': {
    fa: 'در هنر، طراحی، تصویرسازی یا سلیقه بصری احساس توانایی بیشتری داری',
    en: 'you feel more capable in art, design, visual work, or aesthetic judgment',
  },
  'strengths.BusinessEconomics': {
    fa: 'اقتصاد، مدیریت، پول، بازار یا کسب‌وکار برایت قابل فهم‌تر و جذاب‌تر است',
    en: 'economics, management, money, markets, or business feel clearer and more attractive',
  },
  'strengths.PsychologyHumanities': {
    fa: 'رفتار آدم‌ها، جامعه، فرهنگ یا موضوعات انسانی برایت جالب‌تر است',
    en: 'human behavior, society, culture, or humanities topics interest you more',
  },
  'strengths.TechnologyComputing': {
    fa: 'کامپیوتر، نرم‌افزار، سیستم‌ها یا برنامه‌نویسی برایت جذاب‌تر است',
    en: 'computers, software, systems, or programming attract you more',
  },
  'strengths.ResearchWriting': {
    fa: 'تحقیق کردن، نوشتن گزارش و مرتب کردن اطلاعات برایت طبیعی‌تر است',
    en: 'researching, writing reports, and organizing information feel natural to you',
  },
  'lifestyle.Routine': {
    fa: 'روتین مشخص، برنامه ثابت و کار قابل پیش‌بینی برایت مناسب‌تر است',
    en: 'a clear routine, stable schedule, and predictable work suit you better',
  },
  'lifestyle.Risk': {
    fa: 'با ابهام، تغییر مسیر و تصمیم‌های کم‌تر قطعی راحتی',
    en: 'you are comfortable with ambiguity, changing direction, and less certain decisions',
  },
  'lifestyle.Independence': {
    fa: 'فضای مستقل، کار شخصی و آزادی در روش انجام کار را ترجیح می‌دهی',
    en: 'you prefer independence, personal work space, and freedom in how you work',
  },
  'lifestyle.HumanIntensity': {
    fa: 'می‌توانی با تعامل زیاد، فشار انسانی یا موقعیت‌های احساسی روبه‌رو شوی',
    en: 'you can handle frequent interaction, human pressure, or emotional situations',
  },
  'lifestyle.Competition': {
    fa: 'رقابت، سنجیده شدن و تلاش برای نتیجه بهتر برایت انگیزه ایجاد می‌کند',
    en: 'competition, being measured, and striving for better results motivate you',
  },
  'lifestyle.Pressure': {
    fa: 'می‌توانی با ددلاین، فشار کاری و موقعیت‌های سخت کنار بیایی',
    en: 'you can handle deadlines, work pressure, and difficult situations',
  },
  'lifestyle.LongTraining': {
    fa: 'برای مسیر طولانی‌تر، تخصصی‌تر و آموزش چندساله آمادگی داری',
    en: 'you are ready for a longer, more specialized path with years of training',
  },
  'identity.Expert': {
    fa: 'دوست داری در آینده به عنوان متخصص دقیق و قابل اعتماد شناخته شوی',
    en: 'you want to be known as a precise and trusted specialist',
  },
  'identity.Creator': {
    fa: 'دوست داری در آینده چیزهای جدید بسازی، طراحی کنی یا سبک خودت را داشته باشی',
    en: 'you want to create, design, or have your own distinct style in the future',
  },
  'identity.Leader': {
    fa: 'دوست داری در آینده مسئولیت تیم، مسیر یا تصمیم‌های مهم را بگیری',
    en: 'you want to take responsibility for a team, direction, or important decisions',
  },
  'identity.Researcher': {
    fa: 'دوست داری با سؤال‌های عمیق، تحلیل و کشف پاسخ شناخته شوی',
    en: 'you want to be known for deep questions, analysis, and discovering answers',
  },
  'identity.Helper': {
    fa: 'دوست داری کار آینده‌ات به بهتر شدن زندگی دیگران کمک کند',
    en: 'you want your future work to help improve other people’s lives',
  },
  'identity.Founder': {
    fa: 'دوست داری چیزی را از صفر بسازی، فرصت پیدا کنی یا مسیر خودت را شکل بدهی',
    en: 'you want to build something from scratch, find opportunities, or shape your own path',
  },
};

const SHORT_MEANING = {
  fa: (parts) => `این را انتخاب کن اگر ${parts}.`,
  en: (parts) => `Choose this if ${parts}.`,
  tr: (parts) => `${parts} durumda bunu seç.`,
  ar: (parts) => `اختر هذا إذا كان ${parts}.`,
};

function tokens(s) {
  return norm(s).split(' ').filter((w) => w.length >= 2 && !STOPWORDS.has(w));
}

function detectOrdinals(text, optionCount) {
  const t = ` ${norm(text)} `;
  const hits = [];
  for (const o of ORDINALS) {
    if (o.i >= optionCount) continue;
    if (o.words.some((w) => t.includes(` ${norm(w)} `))) hits.push(o.i);
  }
  return [...new Set(hits)];
}

function detectOrdinal(text, optionCount) {
  return detectOrdinals(text, optionCount)[0] ?? null;
}

// Lenient token match: exact, or shared stem/substring for tokens >=4 chars.
function tokenMatch(a, b) {
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4) {
    return a.startsWith(b) || b.startsWith(a) || a.includes(b) || b.includes(a);
  }
  return false;
}

function localizedValues(value, lang) {
  if (!value || typeof value !== 'object') return [String(value || '')].filter(Boolean);
  return [value[lang], value.fa, value.en, value.tr, value.ar].filter(Boolean);
}

function overlapScore(textTokens, candidateText) {
  const optTokens = tokens(candidateText);
  if (!optTokens.length) return 0;
  const shared = optTokens.filter((o) => textTokens.some((t) => tokenMatch(t, o))).length;
  return shared / Math.max(2, optTokens.length * 0.6);
}

function optionLabelScore(textTokens, optionLabel, lang) {
  return Math.max(
    0,
    ...localizedValues(optionLabel, lang).map((label) => overlapScore(textTokens, label)),
  );
}

function optionHintScore(textTokens, option) {
  const hints = OPTION_HINTS[option.id] || [];
  if (!hints.length) return 0;
  return Math.max(0, ...hints.map((hint) => overlapScore(textTokens, hint)));
}

function flattenWeights(option) {
  const rows = [];
  for (const [group, values] of Object.entries(option.weights || {})) {
    for (const [key, raw] of Object.entries(values || {})) {
      const weight = Number(raw) || 0;
      if (weight > 0) rows.push({ code: `${group}.${key}`, weight });
    }
  }
  return rows.sort((a, b) => b.weight - a.weight);
}

function conceptCopy(code, lang) {
  const copy = CONCEPT_COPY[code];
  if (!copy) return null;
  return L(copy, lang) || copy.en || copy.fa || null;
}

function guideCopy(code, lang) {
  const copy = STUDENT_GUIDE_COPY[code];
  if (!copy) return null;
  return L(copy, lang) || copy.en || copy.fa || null;
}

function conceptHitCount(textTokens, code) {
  const hints = CONCEPT_HINTS[code] || [];
  let hits = 0;
  for (const hint of hints) {
    const hintTokens = tokens(hint);
    if (hintTokens.some((h) => textTokens.some((t) => tokenMatch(t, h)))) hits += 1;
  }
  return hits;
}

function semanticScore(textTokens, option) {
  const concepts = flattenWeights(option);
  if (!concepts.length) return 0;
  let score = 0;
  let possible = 0;
  for (const concept of concepts) {
    const cappedWeight = Math.min(3, Math.max(1, concept.weight));
    possible += cappedWeight;
    const hits = conceptHitCount(textTokens, concept.code);
    if (hits) score += cappedWeight * Math.min(1, hits / 2);
  }
  return possible ? Math.min(1, score / Math.max(3, possible * 0.48)) : 0;
}

function rankedOptions(text, question, lang) {
  const tt = tokens(text);
  return question.options
    .map((option) => {
      const label = optionLabelScore(tt, option.label, lang);
      const hint = optionHintScore(tt, option);
      const semantic = semanticScore(tt, option);
      const score = Math.min(1, label * 0.55 + hint * 0.95 + semantic * 0.65);
      return { option, score, label, hint, semantic };
    })
    .sort((a, b) => b.score - a.score);
}

const hasMarker = (t, markers) => markers.some((m) => {
  const n = norm(m);
  return n.length > 0 && t.includes(n);
});

const isQuestionLike = (text) => {
  const raw = String(text || '');
  if (QUESTION_PUNCT.some((p) => raw.includes(p))) return true;
  return hasMarker(norm(text), QUESTION_WORDS);
};

const asksToPick = (text) => hasMarker(norm(text), PICK_MARKERS);
const asksToCompare = (text) => hasMarker(norm(text), COMPARE_MARKERS);

function topConcepts(option, lang, text = '') {
  const textTokens = tokens(text);
  const weighted = flattenWeights(option)
    .map((concept) => ({
      ...concept,
      hits: textTokens.length ? conceptHitCount(textTokens, concept.code) : 0,
      label: conceptCopy(concept.code, lang),
    }))
    .filter((concept) => concept.label);

  const matched = weighted
    .filter((concept) => concept.hits > 0)
    .sort((a, b) => (b.hits * b.weight) - (a.hits * a.weight));

  const selected = (matched.length ? matched : weighted).slice(0, 2);
  return selected.map((concept) => concept.label);
}

function topGuideParts(option, lang) {
  const selected = [];
  const seen = new Set();
  for (const concept of flattenWeights(option)) {
    const label = guideCopy(concept.code, lang);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    selected.push(label);
    if (selected.length >= 2) break;
  }
  return selected;
}

function guideParts(parts, lang) {
  const clean = parts.filter(Boolean).slice(0, 2);
  if (!clean.length) {
    return L({
      fa: 'این گزینه از بین جواب‌ها به تجربه واقعی تو نزدیک‌تر است',
      en: 'this option feels closest to your real experience',
      tr: 'bu seçenek gerçek deneyimine en yakın hissettiriyor',
      ar: 'هذا الخيار هو الأقرب إلى تجربتك الحقيقية',
    }, lang);
  }
  if (clean.length === 1) return clean[0];
  if (lang === 'en') return `${clean[0]} and ${clean[1]}`;
  if (lang === 'tr') return `${clean[0]} ve ${clean[1]}`;
  if (lang === 'ar') return `${clean[0]} و${clean[1]}`;
  return `${clean[0]} و ${clean[1]}`;
}

function listParts(parts, lang) {
  const clean = parts.filter(Boolean).slice(0, 3);
  if (!clean.length) {
    return L({
      fa: 'الگوی کلی این گزینه',
      en: 'the general pattern of this option',
      tr: 'bu seçeneğin genel örüntüsü',
      ar: 'النمط العام لهذا الخيار',
    }, lang);
  }
  return clean.join(lang === 'en' ? ' and ' : '، ');
}

function ordinalOptionLabel(index, lang) {
  const labels = {
    fa: ['گزینه اول', 'گزینه دوم', 'گزینه سوم', 'گزینه چهارم'],
    en: ['the first option', 'the second option', 'the third option', 'the fourth option'],
    tr: ['birinci', 'ikinci', 'üçüncü', 'dördüncü'],
    ar: ['الخيار الأول', 'الخيار الثاني', 'الخيار الثالث', 'الخيار الرابع'],
  };
  return labels[lang]?.[index] || labels.en[index] || 'that option';
}

function explicitOrdinalReason(index, lang) {
  const label = ordinalOptionLabel(index, lang);
  return (ORDINAL_REASON[lang] || ORDINAL_REASON.en)(label);
}

export function optionReason(option, text, lang = 'fa') {
  if (optionHintScore(tokens(text), option) >= 0.35 && OPTION_HINT_REASONS[option.id]) {
    return L(OPTION_HINT_REASONS[option.id], lang);
  }
  const parts = listParts(topConcepts(option, lang, text), lang);
  return (REASON_COPY[lang] || REASON_COPY.en)(parts);
}

export function optionShortMeaning(option, lang = 'fa') {
  const override = OPTION_GUIDE_OVERRIDES[option.id];
  if (override) return L(override, lang) || override.en || override.fa;
  const parts = guideParts(topGuideParts(option, lang), lang);
  return (SHORT_MEANING[lang] || SHORT_MEANING.en)(parts);
}

const STRONG = 0.42;
const WEAK = 0.24;
const CLOSE_MARGIN = 0.14;
const VOICE_STRONG = 0.46;
const VOICE_WEAK = 0.26;
const VOICE_CLOSE_MARGIN = 0.18;

/**
 * @returns {{
 *   kind: 'map'|'compare'|'clarify'|'kb'|'help'|'unsure',
 *   optionId?: string,
 *   reason?: string,
 *   candidates?: Array<{ optionId: string, reason: string }>,
 *   glossary?: object,
 *   kb?: object
 * }}
 */
export function classifyDiscoveryText(text, question, lang, options = {}) {
  const mode = options.mode || options.source || 'text';
  const strongThreshold = options.strongThreshold ?? (mode === 'voice' ? VOICE_STRONG : STRONG);
  const weakThreshold = options.weakThreshold ?? (mode === 'voice' ? VOICE_WEAK : WEAK);
  const closeMargin = options.closeMargin ?? (mode === 'voice' ? VOICE_CLOSE_MARGIN : CLOSE_MARGIN);
  const allowWeakMap = options.allowWeakMap ?? true;
  const optionCount = question.options.length;
  const explicitOrdinals = detectOrdinals(text, optionCount);
  const comparing = asksToCompare(text);

  // 1) Explicit comparison ("between first and second") -> compare them.
  if (explicitOrdinals.length >= 2) {
    const candidates = explicitOrdinals.slice(0, 2).map((index) => {
      const option = question.options[index];
      return { optionId: option.id, reason: explicitOrdinalReason(index, lang), confidence: 1 };
    });
    return { kind: 'compare', candidates };
  }

  // 2) Explicit ordinal / number ("the second one", "گزینه ۳") -> propose it.
  const ord = detectOrdinal(text, optionCount);
  if (ord != null && !isQuestionLike(text)) {
    const option = question.options[ord];
    return {
      kind: 'map',
      optionId: option.id,
      reason: explicitOrdinalReason(ord, lang),
      confidence: 1,
    };
  }

  const glossary = matchGlossary(text);
  const kb = matchKnowledge(norm(text));
  const ranked = rankedOptions(text, question, lang);
  const match = ranked[0] || { option: null, score: 0 };
  const runnerUp = ranked[1] || null;
  const closeEnough = Boolean(
    match.option
      && runnerUp?.option
      && runnerUp.score >= weakThreshold
      && Math.abs(match.score - runnerUp.score) <= closeMargin,
  );

  const semanticCandidates = (comparing || (asksToPick(text) && closeEnough))
    ? ranked
        .filter((item) => item.score >= weakThreshold)
        .slice(0, 2)
        .map((item) => ({
          optionId: item.option.id,
          reason: optionReason(item.option, text, lang),
          confidence: item.score,
        }))
    : [];

  if (semanticCandidates.length >= 2) {
    return { kind: 'compare', candidates: semanticCandidates };
  }

  // 3) Clearly a question / confusion -> explain or answer, never auto-answer.
  if (isQuestionLike(text) || asksToPick(text)) {
    if (asksToPick(text) && match.option && match.score >= strongThreshold) {
      return {
        kind: 'map',
        optionId: match.option.id,
        reason: optionReason(match.option, text, lang),
        confidence: match.score,
      };
    }
    if (asksToPick(text) && !glossary) return { kind: 'help' };
    if (glossary) return { kind: 'clarify', glossary };
    if (kb) return { kind: 'kb', kb };
    return { kind: 'help' };
  }

  // 4) A statement -> try to map it to an option, then confirm.
  if (closeEnough) {
    return {
      kind: 'compare',
      candidates: [match, runnerUp].map((item) => ({
        optionId: item.option.id,
        reason: optionReason(item.option, text, lang),
        confidence: item.score,
      })),
    };
  }
  if (match.option && match.score >= strongThreshold) {
    return {
      kind: 'map',
      optionId: match.option.id,
      reason: optionReason(match.option, text, lang),
      confidence: match.score,
    };
  }
  if (glossary) return { kind: 'clarify', glossary };
  if (kb) return { kind: 'kb', kb };
  if (allowWeakMap && match.option && match.score >= weakThreshold) {
    return {
      kind: 'map',
      optionId: match.option.id,
      reason: optionReason(match.option, text, lang),
      confidence: match.score,
    };
  }
  return { kind: 'unsure' };
}
