import { DISCOVERY_QUESTIONS } from './discoveryQuestions';

const option = (id, fa, en, weights) => ({
  id,
  label: { fa, en },
  weights,
});

const question = (id, layer, fa, en, options) => ({
  id,
  layer,
  text: { fa, en },
  options,
});

// Questions 1-25 are the guest discovery. Signed-in students continue from
// question 26, while a student with no guest history can complete all 52 here.
const DEEP_FIT_ADDITIONAL_QUESTIONS = [
  question('df26', 'traits', 'وقتی یک پروژه طولانی جذابیت اولیه‌اش را از دست می‌دهد، معمولاً چه می‌کنی؟', 'When a long project loses its initial excitement, what do you usually do?', [
    option('df26_a', 'با برنامه جلو می‌روم تا تمام شود', 'I follow the plan until it is finished', { big5: { C: 3 }, hexaco: { C: 3 }, mbti: { J: 2 }, lifestyle: { Routine: 2 }, identity: { Expert: 1 } }),
    option('df26_b', 'روش تازه‌ای پیدا می‌کنم تا دوباره جذاب شود', 'I find a new approach to make it interesting again', { big5: { O: 2 }, hexaco: { O: 2 }, mbti: { N: 1, P: 2 }, motiv: { Creativity: 1 }, identity: { Creator: 1 } }),
    option('df26_c', 'با یک هم‌تیمی انرژی می‌گیرم', 'I regain momentum with a teammate', { big5: { E: 1, A: 1 }, hexaco: { X: 2 }, mbti: { E: 1 }, acca: { People: 1 }, identity: { Leader: 1 } }),
    option('df26_d', 'اگر ارزشش کم شده باشد، مسیر را عوض می‌کنم', 'If its value has faded, I change direction', { big5: { O: 1 }, mbti: { P: 2, T: 1 }, motiv: { Autonomy: 2 }, lifestyle: { Risk: 1, Independence: 2 }, identity: { Founder: 1 } }),
  ]),
  question('df27', 'cognitive', 'وقتی دستورالعمل کامل نیست و مسئله مبهم است، واکنش طبیعی تو چیست؟', 'When instructions are incomplete and the problem is ambiguous, what is your natural response?', [
    option('df27_a', 'فرضیه می‌سازم و با آزمایش جلو می‌روم', 'I form a hypothesis and test it', { riasec: { I: 2 }, mbti: { N: 2, T: 1, P: 1 }, big5: { O: 2 }, acca: { Research: 2, Tech: 1 }, identity: { Researcher: 2 } }),
    option('df27_b', 'اول چارچوب و معیار دقیق می‌سازم', 'I first build a clear framework and criteria', { riasec: { C: 2 }, mbti: { S: 1, J: 2, T: 1 }, big5: { C: 2 }, acca: { Precision: 2, Stability: 1 }, identity: { Expert: 1 } }),
    option('df27_c', 'با افراد مرتبط حرف می‌زنم تا مسئله روشن شود', 'I speak with the people involved to clarify it', { riasec: { S: 2 }, mbti: { E: 1, F: 1 }, big5: { A: 2 }, acca: { People: 2, Communication: 1 }, identity: { Helper: 1 } }),
    option('df27_d', 'تصویر بزرگ را می‌بینم و سریع یک جهت انتخاب می‌کنم', 'I read the big picture and choose a direction quickly', { riasec: { E: 2 }, mbti: { N: 2, P: 1 }, big5: { E: 1 }, acca: { Leadership: 2, Business: 1 }, lifestyle: { Risk: 2 }, identity: { Founder: 2, Leader: 1 } }),
  ]),
  question('df28', 'traits', 'کدام نوع بازخورد بیشترین کمک را به رشد تو می‌کند؟', 'Which kind of feedback helps you grow most?', [
    option('df28_a', 'مستقیم، دقیق و بدون تعارف', 'Direct, precise, and candid', { mbti: { T: 2 }, big5: { C: 1 }, hexaco: { H: 1 }, acca: { Precision: 2 }, identity: { Expert: 1 } }),
    option('df28_b', 'همدلانه، همراه با مثال و مسیر بهبود', 'Empathetic, with examples and a path to improve', { mbti: { F: 2 }, big5: { A: 2 }, hexaco: { A: 2 }, acca: { People: 1, Communication: 1 }, identity: { Helper: 1 } }),
    option('df28_c', 'آزادی برای بازطراحی کار به سبک خودم', 'Freedom to redesign the work in my own way', { mbti: { N: 1, P: 2 }, big5: { O: 2 }, motiv: { Autonomy: 2, Creativity: 1 }, identity: { Creator: 2 } }),
    option('df28_d', 'معیار، رتبه و هدف قابل‌اندازه‌گیری', 'A benchmark, ranking, and measurable target', { riasec: { E: 1, C: 1 }, mbti: { J: 2 }, big5: { C: 2 }, motiv: { Prestige: 1 }, lifestyle: { Competition: 2 }, identity: { Leader: 1 } }),
  ]),
  question('df29', 'learning', 'برای یادگیری یک موضوع سخت، کدام روش واقعاً برایت جواب می‌دهد؟', 'When learning something difficult, what genuinely works for you?', [
    option('df29_a', 'مطالعه عمیق و تنهایی، بعد خلاصه‌نویسی', 'Deep solo study followed by written summaries', { riasec: { I: 2, C: 1 }, mbti: { I: 2, J: 1 }, strengths: { ResearchWriting: 2 }, acca: { Research: 2 }, identity: { Researcher: 1, Expert: 1 } }),
    option('df29_b', 'تمرین عملی و ساختن نمونه', 'Hands-on practice and building a prototype', { riasec: { R: 3 }, mbti: { S: 2, T: 1 }, strengths: { TechnologyComputing: 2, MathPhysics: 1 }, acca: { Tech: 2 }, identity: { Expert: 1 } }),
    option('df29_c', 'بحث، تدریس به دیگران و پرسش‌وپاسخ', 'Discussion, teaching others, and Q&A', { riasec: { S: 3 }, mbti: { E: 2, F: 1 }, strengths: { LanguageCommunication: 2 }, acca: { People: 2, Communication: 2 }, identity: { Helper: 1, Leader: 1 } }),
    option('df29_d', 'نقشه ذهنی، تصویر و ارتباط بین ایده‌ها', 'Mind maps, visuals, and connections between ideas', { riasec: { A: 2, I: 1 }, mbti: { N: 3 }, strengths: { ArtDesign: 1 }, acca: { Creative: 2, Research: 1 }, identity: { Creator: 2 } }),
  ]),
  question('df30', 'lifestyle', 'در یک هفته کاری ایده‌آل، کدام ریتم برایت مناسب‌تر است؟', 'In an ideal work week, which rhythm suits you best?', [
    option('df30_a', 'برنامه ثابت، مسئولیت روشن و پیشرفت قابل‌پیش‌بینی', 'A stable schedule, clear duties, predictable progress', { riasec: { C: 2 }, mbti: { S: 1, J: 2 }, motiv: { Security: 2, Lifestyle: 1 }, lifestyle: { Routine: 3 }, acca: { Stability: 2 } }),
    option('df30_b', 'پروژه‌های متنوع با زمان تمرکز عمیق', 'Varied projects with protected deep-focus time', { riasec: { I: 2, A: 1 }, mbti: { I: 1, N: 1, P: 1 }, motiv: { Autonomy: 2 }, lifestyle: { Independence: 2 }, identity: { Researcher: 1, Creator: 1 } }),
    option('df30_c', 'تعامل زیاد، جلسه و تصمیم‌های سریع', 'High interaction, meetings, and fast decisions', { riasec: { E: 2, S: 1 }, mbti: { E: 2 }, acca: { Leadership: 2, Communication: 1 }, lifestyle: { HumanIntensity: 2, Competition: 1 }, identity: { Leader: 2 } }),
    option('df30_d', 'آزادی بالا؛ حتی اگر برنامه هر روز تغییر کند', 'High freedom, even if the plan changes daily', { mbti: { P: 3 }, big5: { O: 2 }, motiv: { Autonomy: 3 }, lifestyle: { Risk: 2, Independence: 3 }, identity: { Founder: 2, Creator: 1 } }),
  ]),
  question('df31', 'values', 'اگر یک تصمیم سودآور باشد اما از نظر تو منصفانه نباشد، چه می‌کنی؟', 'If a decision is profitable but feels unfair to you, what do you do?', [
    option('df31_a', 'ردش می‌کنم؛ اعتبار بلندمدت مهم‌تر است', 'I reject it; long-term integrity matters more', { hexaco: { H: 3 }, big5: { A: 2 }, mbti: { F: 1, J: 1 }, motiv: { SocialImpact: 1 }, identity: { Helper: 1, Expert: 1 } }),
    option('df31_b', 'راه سومی پیدا می‌کنم که هم عملی باشد هم منصفانه', 'I find a third option that is both practical and fair', { hexaco: { H: 2, A: 1 }, mbti: { N: 2, T: 1, F: 1 }, acca: { Business: 1, People: 1 }, identity: { Leader: 1 } }),
    option('df31_c', 'داده و پیامدها را بررسی می‌کنم؛ حس اولیه کافی نیست', 'I examine evidence and consequences; instinct alone is not enough', { riasec: { I: 2 }, mbti: { T: 3 }, acca: { Research: 2, Precision: 1 }, identity: { Researcher: 2 } }),
    option('df31_d', 'با افراد اثرپذیر گفت‌وگو می‌کنم و بعد تصمیم می‌گیرم', 'I consult the people affected before deciding', { riasec: { S: 2 }, mbti: { F: 2, E: 1 }, big5: { A: 2 }, acca: { People: 2, Communication: 1 }, identity: { Helper: 2 } }),
  ]),
  question('df32', 'pressure', 'وقتی اشتباه تو روی نتیجه یک تیم اثر گذاشته، واکنش اولت چیست؟', 'When your mistake affects a team result, what is your first response?', [
    option('df32_a', 'مسئولیت را می‌پذیرم و فوراً برنامه اصلاح می‌دهم', 'I own it and immediately propose a recovery plan', { big5: { C: 3 }, hexaco: { H: 2, C: 2 }, mbti: { J: 2 }, acca: { Leadership: 1, Precision: 1 }, lifestyle: { Pressure: 2 }, identity: { Leader: 1, Expert: 1 } }),
    option('df32_b', 'علت سیستماتیک خطا را پیدا می‌کنم تا تکرار نشود', 'I find the systemic cause so it does not repeat', { riasec: { I: 2, C: 1 }, mbti: { T: 2 }, acca: { Research: 2, Tech: 1 }, lifestyle: { Pressure: 1 }, identity: { Researcher: 2 } }),
    option('df32_c', 'اول مطمئن می‌شوم اعضای تیم احساس حمایت می‌کنند', 'I first make sure the team feels supported', { riasec: { S: 2 }, mbti: { F: 2 }, big5: { A: 2 }, hexaco: { A: 2 }, acca: { People: 2 }, lifestyle: { HumanIntensity: 1 }, identity: { Helper: 2 } }),
    option('df32_d', 'سریع راه جایگزین می‌سازم و در حرکت اصلاح می‌کنم', 'I quickly build an alternative and correct course in motion', { mbti: { P: 2, N: 1 }, big5: { O: 1 }, acca: { Tech: 1, Business: 1 }, lifestyle: { Risk: 2, Pressure: 2 }, identity: { Founder: 2 } }),
  ]),
  question('df33', 'lifestyle', 'رقابت شدید معمولاً چه اثری روی تو دارد؟', 'How does intense competition usually affect you?', [
    option('df33_a', 'تمرکزم را بیشتر می‌کند و بهترین عملکردم را می‌سازم', 'It sharpens my focus and brings out my best', { riasec: { E: 2 }, big5: { E: 1, C: 1 }, motiv: { Prestige: 2, Income: 1 }, lifestyle: { Competition: 3, Pressure: 2 }, identity: { Leader: 2 } }),
    option('df33_b', 'اگر رقابت با خودم باشد عالی‌ام، نه با دیگران', 'I thrive when competing with myself, not with others', { mbti: { I: 1 }, big5: { C: 2 }, motiv: { Autonomy: 1 }, lifestyle: { Competition: -1, Independence: 2 }, identity: { Expert: 2 } }),
    option('df33_c', 'ترجیح می‌دهم تیم برنده شود، نه یک نفر', 'I prefer the team to win rather than one individual', { riasec: { S: 2 }, big5: { A: 2 }, hexaco: { A: 2 }, acca: { People: 2 }, lifestyle: { HumanIntensity: 1 }, identity: { Helper: 1, Leader: 1 } }),
    option('df33_d', 'رقابت زیاد خلاقیتم را کم می‌کند', 'Too much competition reduces my creativity', { riasec: { A: 2 }, big5: { O: 2 }, motiv: { Creativity: 2 }, lifestyle: { Competition: -2, Independence: 2 }, identity: { Creator: 2 } }),
  ]),
  question('df34', 'lifestyle', 'تعامل روزانه با افراد مضطرب، بیمار یا در بحران برایت چگونه است؟', 'How do you feel about daily contact with people who are anxious, ill, or in crisis?', [
    option('df34_a', 'معنادار است؛ در چنین موقعیت‌هایی آرام می‌مانم', 'Meaningful; I stay calm in those situations', { riasec: { S: 3, I: 1 }, big5: { A: 2, Em: 2 }, hexaco: { Em: 2, A: 1 }, acca: { Health: 3, People: 2 }, lifestyle: { HumanIntensity: 3, Pressure: 2 }, identity: { Helper: 3 } }),
    option('df34_b', 'می‌توانم، ولی نیاز دارم بخشی از کار تحلیلی و پشت‌صحنه باشد', 'I can do it, but need part of the work to be analytical and behind the scenes', { riasec: { I: 2, S: 1 }, mbti: { I: 1, T: 1 }, acca: { Health: 2, Research: 2 }, lifestyle: { HumanIntensity: 1 }, identity: { Researcher: 2, Helper: 1 } }),
    option('df34_c', 'ترجیح می‌دهم با مسئله کار کنم نه با بحران انسانی', 'I prefer working with the problem rather than the human crisis', { riasec: { I: 2, R: 1 }, mbti: { T: 2 }, acca: { Tech: 2, Research: 1 }, lifestyle: { HumanIntensity: -2 }, identity: { Expert: 2 } }),
    option('df34_d', 'فشار عاطفی مداوم برایم فرساینده است', 'Constant emotional pressure would drain me', { mbti: { I: 1 }, motiv: { Lifestyle: 2 }, lifestyle: { HumanIntensity: -3, Pressure: -1 }, acca: { Stability: 1 } }),
  ]),
  question('df35', 'identity', 'در یک تیم تازه، چه زمانی رهبری را به‌عهده می‌گیری؟', 'In a new team, when do you take the lead?', [
    option('df35_a', 'تقریباً از ابتدا؛ جهت دادن برایم طبیعی است', 'Almost immediately; setting direction feels natural', { riasec: { E: 3 }, mbti: { E: 2, J: 1 }, acca: { Leadership: 3, Business: 1 }, identity: { Leader: 3, Founder: 1 } }),
    option('df35_b', 'وقتی تخصص من برای تصمیم لازم باشد', 'When my expertise is needed for the decision', { riasec: { I: 2 }, mbti: { I: 1, T: 1 }, acca: { Precision: 1, Research: 1 }, identity: { Expert: 3 } }),
    option('df35_c', 'وقتی تیم پراکنده شده و باید هماهنگ شود', 'When the team is fragmented and needs alignment', { riasec: { S: 2, E: 1 }, mbti: { F: 1, J: 1 }, acca: { People: 2, Leadership: 2 }, identity: { Leader: 2, Helper: 1 } }),
    option('df35_d', 'ترجیح می‌دهم ایده و کیفیت کار را هدایت کنم، نه افراد را', 'I prefer leading the idea and quality, not managing people', { riasec: { A: 1, I: 2 }, mbti: { I: 2, N: 1 }, acca: { Creative: 1, Research: 1 }, identity: { Creator: 2, Expert: 2 } }),
  ]),
  question('df36', 'cognitive', 'با نظریه‌های انتزاعی و مدل‌هایی که کاربرد فوری ندارند چه رابطه‌ای داری؟', 'How do you relate to abstract theories and models with no immediate application?', [
    option('df36_a', 'خیلی جذبم می‌کنند؛ فهم الگو خودش ارزشمند است', 'I am deeply drawn to them; understanding patterns is valuable itself', { riasec: { I: 3 }, mbti: { N: 3, I: 1 }, big5: { O: 3 }, hexaco: { O: 3 }, acca: { Research: 3 }, identity: { Researcher: 3 } }),
    option('df36_b', 'وقتی به یک مسئله واقعی وصل شوند، عالی‌اند', 'They are excellent when linked to a real problem', { riasec: { I: 2, R: 1 }, mbti: { N: 1, S: 1, T: 1 }, acca: { Tech: 2, Research: 1 }, identity: { Expert: 2 } }),
    option('df36_c', 'اگر بتوانم برای دیگران ساده‌شان کنم، لذت می‌برم', 'I enjoy them when I can make them clear for others', { riasec: { S: 2, I: 1 }, mbti: { F: 1, N: 1 }, strengths: { LanguageCommunication: 2 }, acca: { Communication: 2, People: 1 }, identity: { Helper: 1, Leader: 1 } }),
    option('df36_d', 'ترجیح می‌دهم مستقیماً روی یک خروجی ملموس کار کنم', 'I prefer working directly toward a tangible output', { riasec: { R: 3 }, mbti: { S: 3 }, acca: { Tech: 1, Precision: 1 }, identity: { Expert: 1 } }),
  ]),
  question('df37', 'academic', 'اگر یک جدول بزرگ داده جلویت باشد، اولین کنجکاوی تو چیست؟', 'When you see a large dataset, what are you curious about first?', [
    option('df37_a', 'الگوها، استثناها و علت پشت آن‌ها', 'Patterns, anomalies, and what causes them', { riasec: { I: 3 }, mbti: { N: 2, T: 2 }, strengths: { MathPhysics: 2, TechnologyComputing: 2 }, acca: { Research: 2, Tech: 2 }, identity: { Researcher: 2, Expert: 1 } }),
    option('df37_b', 'چطور به یک تصمیم تجاری بهتر تبدیلش کنم', 'How to turn it into a better business decision', { riasec: { E: 2, I: 1 }, mbti: { T: 2, J: 1 }, strengths: { BusinessEconomics: 2 }, acca: { Business: 3 }, identity: { Leader: 1, Founder: 2 } }),
    option('df37_c', 'داستان انسانی پشت عددها چیست', 'What human story sits behind the numbers', { riasec: { S: 2, A: 1 }, mbti: { F: 2, N: 1 }, strengths: { PsychologyHumanities: 2, ResearchWriting: 1 }, acca: { People: 2, Communication: 1 }, identity: { Helper: 1, Creator: 1 } }),
    option('df37_d', 'چطور آن را بصری و قابل‌فهم ارائه کنم', 'How to visualize it so it becomes understandable', { riasec: { A: 2, I: 1 }, mbti: { N: 1 }, strengths: { ArtDesign: 2, TechnologyComputing: 1 }, acca: { Creative: 2, Communication: 2 }, identity: { Creator: 2 } }),
  ]),
  question('df38', 'academic', 'در ساختن یک محصول یا راه‌حل، کدام بخش بیشتر تو را جذب می‌کند؟', 'When building a product or solution, which part attracts you most?', [
    option('df38_a', 'معماری فنی و اینکه چطور کار می‌کند', 'The technical architecture and how it works', { riasec: { R: 2, I: 2 }, mbti: { T: 2 }, strengths: { TechnologyComputing: 3, MathPhysics: 1 }, acca: { Tech: 3 }, identity: { Expert: 2 } }),
    option('df38_b', 'شناخت کاربر و اینکه واقعاً چه نیاز دارد', 'Understanding the user and what they genuinely need', { riasec: { S: 2, I: 1 }, mbti: { F: 2, N: 1 }, strengths: { PsychologyHumanities: 2 }, acca: { People: 2, Research: 1 }, identity: { Helper: 1, Researcher: 1 } }),
    option('df38_c', 'تجربه، زیبایی و نحوه ارتباط محصول', 'The experience, aesthetics, and how it communicates', { riasec: { A: 3 }, mbti: { N: 2, F: 1 }, strengths: { ArtDesign: 3 }, acca: { Creative: 3, Communication: 1 }, identity: { Creator: 3 } }),
    option('df38_d', 'مدل درآمد، رشد و رساندنش به بازار', 'The business model, growth, and taking it to market', { riasec: { E: 3 }, mbti: { E: 1, T: 1 }, strengths: { BusinessEconomics: 3 }, acca: { Business: 3, Leadership: 1 }, identity: { Founder: 3 } }),
  ]),
  question('df39', 'interests', 'اگر لازم باشد یک نفر را به تغییر نظرش قانع کنی، کدام روش را انتخاب می‌کنی؟', 'If you need to persuade someone to change their mind, which approach do you use?', [
    option('df39_a', 'داده، منطق و مقایسه روشن', 'Data, logic, and a clear comparison', { riasec: { I: 2, E: 1 }, mbti: { T: 3 }, strengths: { MathPhysics: 1, ResearchWriting: 1 }, acca: { Research: 1, Business: 1 }, identity: { Expert: 1 } }),
    option('df39_b', 'شناخت دغدغه‌هایش و ساختن اعتماد', 'Understanding their concerns and building trust', { riasec: { S: 3 }, mbti: { F: 3 }, big5: { A: 2 }, acca: { People: 2, Communication: 2 }, identity: { Helper: 2 } }),
    option('df39_c', 'یک داستان یا تصویر قوی از نتیجه', 'A compelling story or vision of the outcome', { riasec: { A: 2, E: 1 }, mbti: { N: 2, F: 1 }, strengths: { LanguageCommunication: 2 }, acca: { Creative: 1, Communication: 2 }, identity: { Creator: 2, Leader: 1 } }),
    option('df39_d', 'مذاکره برای ساختن سود مشترک', 'Negotiating toward a shared benefit', { riasec: { E: 3 }, mbti: { T: 1, E: 1 }, strengths: { BusinessEconomics: 2 }, acca: { Business: 2, Leadership: 2 }, identity: { Leader: 2, Founder: 1 } }),
  ]),
  question('df40', 'academic', 'نوشتن یک گزارش طولانی و دقیق برایت چگونه است؟', 'How do you feel about writing a long, rigorous report?', [
    option('df40_a', 'دوستش دارم؛ فرصت می‌دهد استدلال را کامل بسازم', 'I enjoy it; it lets me build a complete argument', { riasec: { I: 2, C: 1 }, mbti: { I: 1, J: 1 }, strengths: { ResearchWriting: 3, LanguageCommunication: 1 }, acca: { Research: 2, Precision: 1 }, identity: { Researcher: 2, Expert: 1 } }),
    option('df40_b', 'اگر موضوع انسانی یا اجتماعی باشد، خوب پیش می‌روم', 'I do well when the topic is human or social', { riasec: { S: 2, A: 1 }, mbti: { F: 2 }, strengths: { PsychologyHumanities: 2, ResearchWriting: 2 }, acca: { People: 2, Communication: 1 }, identity: { Helper: 1 } }),
    option('df40_c', 'ترجیح می‌دهم آن را به ارائه یا محتوای بصری تبدیل کنم', 'I would rather turn it into a presentation or visual story', { riasec: { A: 3 }, mbti: { E: 1, N: 1 }, strengths: { ArtDesign: 2, LanguageCommunication: 2 }, acca: { Creative: 2, Communication: 2 }, identity: { Creator: 2 } }),
    option('df40_d', 'گزارش کوتاه و تصمیم عملی را ترجیح می‌دهم', 'I prefer a short brief and an actionable decision', { riasec: { E: 2 }, mbti: { T: 1, J: 1 }, strengths: { BusinessEconomics: 1 }, acca: { Business: 2, Leadership: 1 }, identity: { Leader: 1, Founder: 1 } }),
  ]),
  question('df41', 'reality', 'برای رسیدن به یک حرفه تخصصی، با مسیر تحصیلی طولانی چه حسی داری؟', 'How do you feel about a long education path for a specialized profession?', [
    option('df41_a', 'اگر هدف معنادار باشد، برای ۶ تا ۱۰ سال آماده‌ام', 'If the goal is meaningful, I am ready for 6-10 years', { big5: { C: 3 }, hexaco: { C: 2 }, motiv: { Prestige: 1, SocialImpact: 1 }, lifestyle: { LongTraining: 3 }, identity: { Expert: 3 } }),
    option('df41_b', 'تا مقطع کارشناسی یا ارشد خوب است، بعد می‌خواهم وارد کار شوم', 'Bachelor or master level is fine; then I want to work', { big5: { C: 1 }, motiv: { Security: 1 }, lifestyle: { LongTraining: 1 }, identity: { Expert: 1 } }),
    option('df41_c', 'ترجیح می‌دهم زود وارد بازار شوم و حین کار یاد بگیرم', 'I prefer entering the market early and learning while working', { riasec: { E: 1, R: 1 }, mbti: { P: 2 }, motiv: { Income: 1, Autonomy: 2 }, lifestyle: { LongTraining: -2 }, identity: { Founder: 2 } }),
    option('df41_d', 'مسیرهای پروژه‌ای و پورتفولیو برایم جذاب‌تر از مدرک طولانی است', 'Project and portfolio paths appeal to me more than long degrees', { riasec: { A: 2, R: 1 }, big5: { O: 1 }, motiv: { Creativity: 2, Autonomy: 1 }, lifestyle: { LongTraining: -2, Independence: 2 }, identity: { Creator: 2 } }),
  ]),
  question('df42', 'pressure', 'در تصمیم‌هایی که خطا می‌تواند پیامد جدی داشته باشد، چگونه عمل می‌کنی؟', 'How do you operate when a mistake could have serious consequences?', [
    option('df42_a', 'چک‌لیست، استاندارد و بررسی دوباره به من اطمینان می‌دهد', 'Checklists, standards, and double-checking give me confidence', { riasec: { C: 3 }, mbti: { S: 2, J: 2 }, big5: { C: 3 }, hexaco: { C: 3 }, acca: { Precision: 3, Health: 1 }, lifestyle: { Pressure: 2 }, identity: { Expert: 2 } }),
    option('df42_b', 'با تمرکز بالا و تحلیل سریع تصمیم می‌گیرم', 'I decide through intense focus and rapid analysis', { riasec: { I: 2 }, mbti: { T: 2 }, acca: { Research: 1, Tech: 1 }, lifestyle: { Pressure: 3 }, identity: { Expert: 1, Leader: 1 } }),
    option('df42_c', 'مسئولیت را با تیم تقسیم می‌کنم و نظر دوم می‌گیرم', 'I share responsibility with the team and seek a second opinion', { riasec: { S: 2 }, big5: { A: 1 }, acca: { People: 1, Communication: 1 }, lifestyle: { Pressure: 1, HumanIntensity: 1 }, identity: { Leader: 1, Helper: 1 } }),
    option('df42_d', 'ترجیح می‌دهم شغلم فضای خطا و آزمایش بیشتری داشته باشد', 'I prefer work with more room for experimentation and error', { mbti: { P: 2, N: 1 }, big5: { O: 2 }, motiv: { Creativity: 1 }, lifestyle: { Pressure: -3, Risk: 1 }, identity: { Creator: 1, Researcher: 1 } }),
  ]),
  question('df43', 'lifestyle', 'در پایان یک روز پر از گفت‌وگو و تعامل انسانی چه حسی داری؟', 'How do you feel after a day full of conversation and human interaction?', [
    option('df43_a', 'انرژی گرفته‌ام و هنوز آماده تعامل هستم', 'Energized and still ready to engage', { riasec: { S: 2, E: 1 }, mbti: { E: 3 }, big5: { E: 3 }, hexaco: { X: 3 }, acca: { People: 2, Communication: 2 }, lifestyle: { HumanIntensity: 3 }, identity: { Leader: 1, Helper: 1 } }),
    option('df43_b', 'خوبم، اگر بخشی از روز زمان تمرکز تنها داشته باشم', 'Good, if part of the day includes quiet focus', { riasec: { S: 1, I: 1 }, mbti: { E: 1, I: 1 }, acca: { People: 1, Research: 1 }, lifestyle: { HumanIntensity: 1, Independence: 1 } }),
    option('df43_c', 'خسته‌ام؛ ترجیح می‌دهم تعامل‌ها محدود و عمیق باشند', 'Drained; I prefer fewer, deeper interactions', { riasec: { I: 2 }, mbti: { I: 3 }, lifestyle: { HumanIntensity: -2, Independence: 2 }, identity: { Researcher: 1, Expert: 1 } }),
    option('df43_d', 'تعامل خوب است، اما ترجیح می‌دهم از طریق ساختن یا نوشتن اثر بگذارم', 'Interaction is fine, but I prefer impact through making or writing', { riasec: { A: 2, I: 1 }, mbti: { I: 2, N: 1 }, strengths: { ResearchWriting: 1, ArtDesign: 1 }, lifestyle: { HumanIntensity: -1, Independence: 2 }, identity: { Creator: 2 } }),
  ]),
  question('df44', 'motivation', 'اگر درآمد دو شغل مشابه باشد، کدام ویژگی انتخابت را تعیین می‌کند؟', 'If two jobs pay similarly, what determines your choice?', [
    option('df44_a', 'آزادی تصمیم و مالکیت روی کار', 'Decision freedom and ownership of the work', { motiv: { Autonomy: 3 }, lifestyle: { Independence: 3 }, identity: { Founder: 2, Creator: 1 } }),
    option('df44_b', 'اعتبار تخصصی و امکان عمیق شدن', 'Professional credibility and room to specialize deeply', { motiv: { Prestige: 2 }, riasec: { I: 1 }, lifestyle: { LongTraining: 1 }, identity: { Expert: 3, Researcher: 1 } }),
    option('df44_c', 'اثر مثبت و ارتباط با آدم‌ها', 'Positive impact and connection with people', { motiv: { SocialImpact: 3 }, riasec: { S: 2 }, acca: { People: 2 }, lifestyle: { HumanIntensity: 2 }, identity: { Helper: 3 } }),
    option('df44_d', 'تعادل زندگی، امنیت و ساعت قابل‌پیش‌بینی', 'Life balance, security, and predictable hours', { motiv: { Lifestyle: 3, Security: 2 }, acca: { Stability: 2 }, lifestyle: { Routine: 2, Pressure: -1 } }),
  ]),
  question('df45', 'motivation', 'کدام جمله به تعریف شخصی تو از موفقیت نزدیک‌تر است؟', 'Which statement is closest to your personal definition of success?', [
    option('df45_a', 'در یک حوزه، مرجع و متخصص قابل‌اعتماد باشم', 'Become a trusted authority in one field', { motiv: { Prestige: 2 }, riasec: { I: 1 }, identity: { Expert: 3, Researcher: 1 }, lifestyle: { LongTraining: 1 } }),
    option('df45_b', 'چیزی بسازم که قبلاً وجود نداشته', 'Build something that did not exist before', { motiv: { Creativity: 2, Autonomy: 2 }, riasec: { A: 1, E: 1 }, identity: { Creator: 2, Founder: 2 }, lifestyle: { Risk: 2 } }),
    option('df45_c', 'زندگی دیگران را ملموس بهتر کنم', 'Make other people’s lives tangibly better', { motiv: { SocialImpact: 3 }, riasec: { S: 2 }, acca: { Health: 1, People: 2 }, identity: { Helper: 3 } }),
    option('df45_d', 'یک تیم یا سازمان را به نتیجه بزرگ برسانم', 'Lead a team or organization to a major outcome', { motiv: { Prestige: 1, Income: 1 }, riasec: { E: 2 }, acca: { Leadership: 3, Business: 1 }, identity: { Leader: 3 } }),
  ]),
  question('df46', 'reality', 'برای تحصیل و کار بین‌المللی، یادگیری زبان و سازگاری فرهنگی را چطور می‌بینی؟', 'How do you view language learning and cultural adaptation for international study and work?', [
    option('df46_a', 'بخش جذاب مسیر است و برایش انرژی می‌گذارم', 'It is an exciting part of the journey and worth the effort', { big5: { O: 3 }, hexaco: { O: 2 }, motiv: { Migration: 3 }, acca: { GlobalMobility: 3 }, strengths: { LanguageCommunication: 1 } }),
    option('df46_b', 'انجامش می‌دهم، اگر مسیر شغلی روشن باشد', 'I will do it if the career path is clear', { big5: { C: 1 }, motiv: { Migration: 1, Security: 2 }, acca: { GlobalMobility: 1, Stability: 1 } }),
    option('df46_c', 'ترجیح می‌دهم محیطی با جامعه فرهنگی نزدیک‌تر انتخاب کنم', 'I prefer an environment with a more familiar cultural community', { motiv: { FamilyApproval: 2, Security: 1 }, lifestyle: { HumanIntensity: 1 } }),
    option('df46_d', 'فعلاً اولویت من ساختن مسیر قوی در محیط آشناست', 'For now, my priority is building a strong path in a familiar environment', { motiv: { Security: 2, FamilyApproval: 1 }, acca: { Stability: 2 }, lifestyle: { Risk: -1 } }),
  ]),
  question('df47', 'values', 'اگر رشته مورد علاقه‌ات با انتظار خانواده متفاوت باشد، چه می‌کنی؟', 'If your preferred major differs from your family’s expectation, what do you do?', [
    option('df47_a', 'با شواهد و برنامه شغلی مذاکره می‌کنم', 'I negotiate using evidence and a career plan', { mbti: { T: 2, J: 1 }, strengths: { ResearchWriting: 1 }, acca: { Communication: 2, Business: 1 }, motiv: { FamilyApproval: 1, Autonomy: 1 }, identity: { Leader: 1 } }),
    option('df47_b', 'مسیر خودم را انتخاب می‌کنم، حتی اگر سخت باشد', 'I choose my own path even if it is difficult', { motiv: { Autonomy: 3 }, lifestyle: { Risk: 2, Independence: 3 }, identity: { Founder: 2, Creator: 1 } }),
    option('df47_c', 'دنبال گزینه‌ای می‌گردم که هر دو طرف با آن راحت باشند', 'I look for an option both sides can support', { mbti: { F: 2 }, big5: { A: 2 }, hexaco: { A: 2 }, motiv: { FamilyApproval: 2, Security: 1 }, identity: { Helper: 1 } }),
    option('df47_d', 'نظر خانواده برایم وزن زیادی دارد و احتمالاً تطبیق می‌دهم', 'Family opinion carries major weight and I would likely adapt', { motiv: { FamilyApproval: 3, Security: 1 }, acca: { Stability: 1 }, lifestyle: { Risk: -1 } }),
  ]),
  question('df48', 'learning', 'در امتحان یا پروژه سخت، نقطه قوت قابل‌اتکای تو چیست؟', 'In a difficult exam or project, what is your most dependable strength?', [
    option('df48_a', 'حافظه دقیق، نظم و رعایت جزئیات', 'Accurate recall, organization, and attention to detail', { riasec: { C: 3 }, mbti: { S: 2, J: 2 }, strengths: { BiologyChemistry: 1, ResearchWriting: 1 }, acca: { Precision: 3, Stability: 1 }, identity: { Expert: 2 } }),
    option('df48_b', 'فهم منطق، کشف الگو و حل مسئله جدید', 'Understanding logic, finding patterns, and solving novel problems', { riasec: { I: 3 }, mbti: { N: 2, T: 2 }, strengths: { MathPhysics: 2, TechnologyComputing: 1 }, acca: { Research: 2, Tech: 2 }, identity: { Researcher: 2 } }),
    option('df48_c', 'بیان روشن، ارتباط و دفاع از ایده', 'Clear expression, communication, and defending an idea', { riasec: { S: 1, E: 2 }, mbti: { E: 1, F: 1 }, strengths: { LanguageCommunication: 3 }, acca: { Communication: 3, Leadership: 1 }, identity: { Leader: 1, Helper: 1 } }),
    option('df48_d', 'دید متفاوت، ترکیب ایده‌ها و ارائه خلاقانه', 'A different perspective, combining ideas, and creative presentation', { riasec: { A: 3 }, mbti: { N: 2, P: 1 }, strengths: { ArtDesign: 2, ResearchWriting: 1 }, acca: { Creative: 3 }, identity: { Creator: 3 } }),
  ]),
  question('df49', 'reality', 'اگر نتیجه تحصیلی‌ات پایین‌تر از انتظارت شود، معمولاً چه می‌کنی؟', 'If an academic result is below your expectation, what do you usually do?', [
    option('df49_a', 'اشتباه‌ها را تحلیل می‌کنم و سیستم مطالعه را اصلاح می‌کنم', 'I analyze errors and redesign my study system', { big5: { C: 3 }, hexaco: { C: 2 }, mbti: { T: 1, J: 2 }, acca: { Precision: 1 }, identity: { Expert: 1 } }),
    option('df49_b', 'از استاد یا دوست قوی کمک می‌گیرم', 'I ask a strong teacher or peer for help', { big5: { A: 1 }, riasec: { S: 1 }, acca: { People: 1, Communication: 1 }, identity: { Helper: 1 } }),
    option('df49_c', 'روش دیگری امتحان می‌کنم؛ شاید سبک قبلی مناسب من نبوده', 'I try a different method; the old one may not fit me', { big5: { O: 2 }, mbti: { P: 2 }, motiv: { Autonomy: 1 }, identity: { Creator: 1 } }),
    option('df49_d', 'مدتی اعتمادبه‌نفسم افت می‌کند، ولی با هدف کوتاه برمی‌گردم', 'My confidence dips for a while, but I return with a short goal', { big5: { Em: 2, C: 1 }, hexaco: { Em: 2 }, motiv: { Security: 1 }, lifestyle: { Pressure: -1 } }),
  ]),
  question('df50', 'identity', 'ده سال بعد، دوست داری دیگران تو را بیشتر با کدام نقش بشناسند؟', 'Ten years from now, which role would you most like to be known for?', [
    option('df50_a', 'متخصصی که مسائل پیچیده را دقیق حل می‌کند', 'The expert who solves complex problems precisely', { riasec: { I: 2, C: 1 }, acca: { Research: 1, Precision: 2 }, identity: { Expert: 3, Researcher: 1 } }),
    option('df50_b', 'سازنده یا بنیان‌گذاری که فرصت ایجاد می‌کند', 'The builder or founder who creates opportunity', { riasec: { E: 3 }, acca: { Business: 2, Leadership: 1 }, lifestyle: { Risk: 2 }, identity: { Founder: 3, Leader: 1 } }),
    option('df50_c', 'فردی که زندگی و تصمیم دیگران را بهتر می‌کند', 'The person who improves others’ lives and decisions', { riasec: { S: 3 }, acca: { People: 2, Health: 1 }, identity: { Helper: 3 } }),
    option('df50_d', 'خالق ایده یا تجربه‌ای که سبک خودش را دارد', 'The creator of ideas or experiences with a distinct voice', { riasec: { A: 3 }, acca: { Creative: 3 }, lifestyle: { Independence: 2 }, identity: { Creator: 3 } }),
  ]),
  question('df51', 'lifestyle', 'در انتخاب مسیر تحصیلی، با ریسک و عدم‌قطعیت چقدر راحتی؟', 'How comfortable are you with risk and uncertainty in choosing an academic path?', [
    option('df51_a', 'مسیر روشن، مجوز حرفه‌ای و بازار کار قابل‌پیش‌بینی می‌خواهم', 'I want a clear path, professional credential, and predictable market', { riasec: { C: 2 }, mbti: { S: 1, J: 2 }, motiv: { Security: 3 }, acca: { Stability: 3 }, lifestyle: { Risk: -3, Routine: 2 }, identity: { Expert: 1 } }),
    option('df51_b', 'ریسک متوسط خوب است، اگر مهارت‌های قابل‌انتقال بسازم', 'Moderate risk is fine if I build transferable skills', { big5: { O: 1, C: 1 }, motiv: { Autonomy: 1, Security: 1 }, lifestyle: { Risk: 1 }, identity: { Expert: 1, Founder: 1 } }),
    option('df51_c', 'مسیر نو و رو‌به‌رشد را حتی با ابهام انتخاب می‌کنم', 'I choose an emerging path even with uncertainty', { riasec: { I: 1, E: 1 }, mbti: { N: 2, P: 2 }, big5: { O: 2 }, acca: { Tech: 1, Business: 1 }, lifestyle: { Risk: 3 }, identity: { Founder: 2, Researcher: 1 } }),
    option('df51_d', 'اگر امکان خلق و استقلال باشد، ریسک برایم پذیرفتنی است', 'Risk is acceptable when it brings creative freedom and independence', { riasec: { A: 2 }, motiv: { Creativity: 2, Autonomy: 2 }, lifestyle: { Risk: 2, Independence: 3 }, identity: { Creator: 3 } }),
  ]),
  question('df52', 'environment', 'آخرین سؤال اصلی: در کدام محیط دانشگاهی احتمالاً بهترین نسخه خودت می‌شوی؟', 'Final core question: in which university environment would you likely become your best self?', [
    option('df52_a', 'دانشگاه پژوهش‌محور با آزمایشگاه و استادان فعال', 'A research-focused university with active labs and faculty', { riasec: { I: 3 }, strengths: { ResearchWriting: 1 }, acca: { Research: 3 }, lifestyle: { LongTraining: 1 }, identity: { Researcher: 3, Expert: 1 } }),
    option('df52_b', 'محیط پروژه‌ای با صنعت، استارتاپ و کارآموزی', 'A project-based environment linked to industry, startups, and internships', { riasec: { E: 2, R: 1 }, acca: { Business: 2, Tech: 1 }, lifestyle: { Risk: 1 }, identity: { Founder: 2, Leader: 1 } }),
    option('df52_c', 'کلاس‌های تعاملی، جامعه دانشجویی قوی و ارتباط انسانی', 'Interactive classes, a strong student community, and human connection', { riasec: { S: 3 }, acca: { People: 2, Communication: 2 }, lifestyle: { HumanIntensity: 2 }, identity: { Helper: 2, Leader: 1 } }),
    option('df52_d', 'استودیو و فضای آزاد برای ساخت پورتفولیو و تجربه', 'A studio-like environment with freedom to build a portfolio and experiment', { riasec: { A: 3 }, acca: { Creative: 3 }, lifestyle: { Independence: 2, Risk: 1 }, identity: { Creator: 3 } }),
  ]),
];

export const DEEP_FIT_ADAPTIVE_QUESTIONS = [
  question('dfa_jp', 'adaptive', 'وقتی بین برنامه دقیق و فرصت ناگهانی تعارض پیش می‌آید، کدام را انتخاب می‌کنی؟', 'When a careful plan conflicts with an unexpected opportunity, which do you choose?', [
    option('dfa_jp_a', 'برنامه را حفظ می‌کنم؛ تعهد قبلی مهم‌تر است', 'I keep the plan; the earlier commitment matters more', { mbti: { J: 3 }, big5: { C: 2 }, lifestyle: { Routine: 2 } }),
    option('dfa_jp_b', 'فرصت را می‌سنجم و اگر قوی باشد مسیر را عوض می‌کنم', 'I assess the opportunity and pivot if it is strong', { mbti: { P: 3, N: 1 }, lifestyle: { Risk: 2 }, identity: { Founder: 1 } }),
  ]),
  question('dfa_health', 'adaptive', 'در حوزه سلامت، کدام نقش واقعاً به تو نزدیک‌تر است؟', 'Within health, which role feels genuinely closer to you?', [
    option('dfa_health_a', 'ارتباط مستقیم، مراقبت و تصمیم بالینی', 'Direct contact, care, and clinical decisions', { riasec: { S: 3, I: 1 }, acca: { Health: 3, People: 2 }, lifestyle: { HumanIntensity: 3, Pressure: 2 }, identity: { Helper: 2 } }),
    option('dfa_health_b', 'آزمایشگاه، داده و ساخت فناوری سلامت', 'Lab work, data, and building health technology', { riasec: { I: 3, R: 1 }, acca: { Health: 2, Research: 2, Tech: 2 }, lifestyle: { HumanIntensity: -1 }, identity: { Researcher: 2, Expert: 1 } }),
  ]),
  question('dfa_people', 'adaptive', 'برای کمک به آدم‌ها، کدام مسیر طبیعی‌تر است؟', 'Which way of helping people feels more natural?', [
    option('dfa_people_a', 'گفت‌وگوی عمیق، آموزش و تغییر رفتار', 'Deep conversation, education, and behavior change', { riasec: { S: 3, I: 1 }, acca: { People: 3, Communication: 1 }, strengths: { PsychologyHumanities: 2 }, identity: { Helper: 3 } }),
    option('dfa_people_b', 'طراحی سیستم، سیاست یا محصولی که به افراد زیادی کمک کند', 'Designing a system, policy, or product that helps many people', { riasec: { I: 2, E: 1 }, acca: { Business: 1, Tech: 1, People: 2 }, identity: { Leader: 2, Researcher: 1 } }),
  ]),
  question('dfa_tech', 'adaptive', 'در فناوری، بیشتر از کدام نوع مسئله لذت می‌بری؟', 'In technology, which type of problem do you enjoy more?', [
    option('dfa_tech_a', 'الگوریتم، داده و منطق سیستم', 'Algorithms, data, and system logic', { riasec: { I: 3, R: 1 }, acca: { Tech: 3, Research: 2 }, strengths: { MathPhysics: 2, TechnologyComputing: 2 }, identity: { Expert: 2, Researcher: 2 } }),
    option('dfa_tech_b', 'رفتار کاربر، تجربه و کاربرد انسانی فناوری', 'User behavior, experience, and human use of technology', { riasec: { S: 2, A: 1, I: 1 }, acca: { Tech: 1, People: 2, Creative: 1 }, strengths: { PsychologyHumanities: 1, ArtDesign: 1 }, identity: { Creator: 1, Helper: 1 } }),
  ]),
  question('dfa_business', 'adaptive', 'در کسب‌وکار، کدام موفقیت برایت جذاب‌تر است؟', 'In business, which kind of success attracts you more?', [
    option('dfa_business_a', 'تحلیل بازار و ساختن تصمیم دقیق', 'Analyzing markets and making rigorous decisions', { riasec: { I: 2, E: 1 }, acca: { Business: 3, Research: 1 }, strengths: { BusinessEconomics: 2, MathPhysics: 1 }, identity: { Expert: 2 } }),
    option('dfa_business_b', 'ساختن تیم، فروش و رشد یک ایده', 'Building a team, selling, and growing an idea', { riasec: { E: 3 }, acca: { Business: 3, Leadership: 2 }, lifestyle: { Risk: 2, Competition: 2 }, identity: { Founder: 3, Leader: 2 } }),
  ]),
  question('dfa_creative', 'adaptive', 'در کار خلاق، بیشتر به کدام خروجی علاقه داری؟', 'In creative work, which output interests you more?', [
    option('dfa_creative_a', 'فضا، فرم و تجربه فیزیکی', 'Space, form, and physical experience', { riasec: { A: 3, R: 1 }, acca: { Creative: 3, Precision: 1 }, strengths: { ArtDesign: 3 }, identity: { Creator: 2 } }),
    option('dfa_creative_b', 'رسانه، روایت و تجربه دیجیتال', 'Media, narrative, and digital experience', { riasec: { A: 3, S: 1 }, acca: { Creative: 3, Communication: 2, Tech: 1 }, strengths: { ArtDesign: 2, LanguageCommunication: 1 }, identity: { Creator: 3 } }),
  ]),
  question('dfa_pressure', 'adaptive', 'اگر شغلی بسیار معنادار اما پرفشار باشد، انتخابت چیست؟', 'If a career is highly meaningful but high-pressure, what do you choose?', [
    option('dfa_pressure_a', 'می‌پذیرم؛ معنا و اثرگذاری ارزش فشار را دارد', 'I accept it; meaning and impact are worth the pressure', { motiv: { SocialImpact: 3 }, lifestyle: { Pressure: 3, HumanIntensity: 2 }, identity: { Helper: 2 } }),
    option('dfa_pressure_b', 'مسیر کم‌فشارتر و پایدارتر را ترجیح می‌دهم', 'I prefer a more sustainable, lower-pressure path', { motiv: { Lifestyle: 3, Security: 1 }, lifestyle: { Pressure: -3, Routine: 1 }, acca: { Stability: 1 } }),
  ]),
  question('dfa_identity', 'adaptive', 'بین «متخصص عمیق» و «سازنده چندمهارته»، کدام به تو نزدیک‌تر است؟', 'Which feels closer: deep specialist or multi-skilled builder?', [
    option('dfa_identity_a', 'متخصص عمیق با استاندارد و اعتبار روشن', 'A deep specialist with clear standards and credibility', { identity: { Expert: 3, Researcher: 1 }, lifestyle: { LongTraining: 2 }, motiv: { Prestige: 1 } }),
    option('dfa_identity_b', 'سازنده چندمهارته که ایده‌ها را به نتیجه می‌رساند', 'A multi-skilled builder who turns ideas into outcomes', { identity: { Founder: 2, Creator: 1, Leader: 1 }, lifestyle: { Risk: 1, Independence: 2 }, motiv: { Autonomy: 2 } }),
  ]),
];

export const DEEP_FIT_CORE_QUESTIONS = [
  ...DISCOVERY_QUESTIONS,
  ...DEEP_FIT_ADDITIONAL_QUESTIONS,
];

export const DEEP_FIT_CORE_TOTAL = DEEP_FIT_CORE_QUESTIONS.length;
// How many of the core questions are the guest discovery (1-25). These are
// never re-asked in Deep Fit when the student already answered them.
export const DISCOVERY_SECTION_COUNT = DISCOVERY_QUESTIONS.length;
export const DEEP_FIT_ADAPTIVE_COUNT = 4;

export function findDeepFitQuestion(questionId) {
  return [...DEEP_FIT_CORE_QUESTIONS, ...DEEP_FIT_ADAPTIVE_QUESTIONS]
    .find((item) => item.id === questionId) || null;
}

export function findDeepFitOption(optionId) {
  for (const item of [...DEEP_FIT_CORE_QUESTIONS, ...DEEP_FIT_ADAPTIVE_QUESTIONS]) {
    const hit = item.options.find((candidate) => candidate.id === optionId);
    if (hit) return { question: item, option: hit };
  }
  return null;
}
