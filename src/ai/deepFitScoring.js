import { computeDiscoveryResult } from './scoring';
import {
  DEEP_FIT_ADAPTIVE_COUNT,
  DEEP_FIT_ADAPTIVE_QUESTIONS,
  DEEP_FIT_CORE_QUESTIONS,
  findDeepFitOption,
} from '../data/deepFitQuestions';

const LAYERS = {
  mbti: ['E', 'I', 'S', 'N', 'T', 'F', 'J', 'P'],
  riasec: ['R', 'I', 'A', 'S', 'E', 'C'],
  big5: ['O', 'C', 'E', 'A', 'Em'],
  hexaco: ['H', 'Em', 'X', 'A', 'C', 'O'],
  acca: [
    'Health', 'Business', 'Tech', 'Creative', 'Research', 'People', 'Stability',
    'Leadership', 'Communication', 'Precision', 'GlobalMobility',
  ],
  motiv: [
    'Income', 'Prestige', 'Security', 'SocialImpact', 'Autonomy', 'Creativity',
    'Migration', 'FamilyApproval', 'Lifestyle',
  ],
  strengths: [
    'BiologyChemistry', 'MathPhysics', 'LanguageCommunication', 'ArtDesign',
    'BusinessEconomics', 'PsychologyHumanities', 'TechnologyComputing', 'ResearchWriting',
  ],
  lifestyle: ['Pressure', 'HumanIntensity', 'Routine', 'Risk', 'Independence', 'LongTraining', 'Competition'],
  identity: ['Expert', 'Founder', 'Creator', 'Leader', 'Researcher', 'Helper'],
};

const ALL_QUESTIONS = [...DEEP_FIT_CORE_QUESTIONS, ...DEEP_FIT_ADAPTIVE_QUESTIONS];
const zeros = (keys) => Object.fromEntries(keys.map((key) => [key, 0]));
const emptyTotals = () => Object.fromEntries(
  Object.entries(LAYERS).map(([layer, keys]) => [layer, zeros(keys)]),
);

function addWeights(totals, weights = {}) {
  for (const [layer, values] of Object.entries(weights)) {
    if (!totals[layer]) continue;
    for (const [key, value] of Object.entries(values)) {
      if (key in totals[layer]) totals[layer][key] += Number(value) || 0;
    }
  }
}

export function tallyDeepFitAnswers(answerOptionIds = []) {
  const totals = emptyTotals();
  for (const optionId of answerOptionIds) {
    const hit = findDeepFitOption(optionId);
    if (hit) addWeights(totals, hit.option.weights);
  }
  return totals;
}

function attainableRanges() {
  const ranges = Object.fromEntries(
    Object.entries(LAYERS).map(([layer, keys]) => [
      layer,
      Object.fromEntries(keys.map((key) => [key, { min: 0, max: 0 }])),
    ]),
  );

  for (const item of ALL_QUESTIONS) {
    for (const [layer, keys] of Object.entries(LAYERS)) {
      for (const key of keys) {
        const values = item.options.map((candidate) => Number(candidate.weights?.[layer]?.[key]) || 0);
        ranges[layer][key].min += Math.min(0, ...values);
        ranges[layer][key].max += Math.max(0, ...values);
      }
    }
  }
  return ranges;
}

const RANGES = attainableRanges();

function pct(totals, layer, key) {
  const { min, max } = RANGES[layer][key];
  const span = Math.max(1, max - min);
  return Math.max(0, Math.min(100, Math.round(((totals[layer][key] - min) / span) * 100)));
}

function ranked(totals, layer) {
  return LAYERS[layer]
    .map((key) => ({ key, score: totals[layer][key], pct: pct(totals, layer, key) }))
    .sort((a, b) => b.score - a.score || b.pct - a.pct);
}

const MAJOR_CATALOG = [
  {
    id: 'bioinformatics',
    name: { fa: 'بیوانفورماتیک و زیست‌شناسی محاسباتی', en: 'Bioinformatics & Computational Biology' },
    reason: { fa: 'ترکیب زیست، داده و کشف الگو؛ مناسب برای ذهن پژوهشی که از فناوری برای پاسخ‌های سلامت استفاده می‌کند.', en: 'Combines biology, data, and pattern discovery for a research-minded student using technology in health.' },
    acca: ['Research', 'Health', 'Tech'], riasec: ['I', 'R'], strengths: ['BiologyChemistry', 'TechnologyComputing', 'MathPhysics'], identity: ['Researcher', 'Expert'],
  },
  {
    id: 'health_informatics',
    name: { fa: 'انفورماتیک سلامت و سیستم‌های اطلاعات پزشکی', en: 'Health Informatics & Medical Information Systems' },
    reason: { fa: 'برای کسی که به سلامت علاقه دارد اما اثرگذاری سیستمی، داده و فناوری را به کار بالینی مستقیم ترجیح می‌دهد.', en: 'Fits students drawn to health who prefer systemic impact, data, and technology over direct clinical work.' },
    acca: ['Health', 'Tech', 'Precision'], riasec: ['I', 'C'], strengths: ['TechnologyComputing', 'BiologyChemistry'], identity: ['Expert', 'Researcher'],
  },
  {
    id: 'neuroscience',
    name: { fa: 'علوم اعصاب و شناخت', en: 'Neuroscience & Cognitive Science' },
    reason: { fa: 'پیوندی میان زیست، رفتار انسان و پژوهش عمیق؛ مناسب برای کنجکاوی درباره مغز و تصمیم‌گیری.', en: 'Connects biology, human behavior, and deep research for curiosity about the brain and decision-making.' },
    acca: ['Research', 'Health', 'People'], riasec: ['I', 'S'], strengths: ['BiologyChemistry', 'PsychologyHumanities', 'ResearchWriting'], identity: ['Researcher', 'Helper'],
  },
  {
    id: 'molecular_biotech',
    name: { fa: 'زیست‌فناوری مولکولی', en: 'Molecular Biotechnology' },
    reason: { fa: 'مسیر آزمایشگاهی و نوآورانه برای تبدیل علم زیستی به درمان، محصول یا فناوری قابل‌استفاده.', en: 'A lab-driven innovation path that turns biological science into usable treatments, products, or technology.' },
    acca: ['Research', 'Health', 'Tech'], riasec: ['I', 'R'], strengths: ['BiologyChemistry', 'ResearchWriting'], identity: ['Researcher', 'Expert'],
  },
  {
    id: 'biomedical_engineering',
    name: { fa: 'مهندسی پزشکی و طراحی تجهیزات سلامت', en: 'Biomedical Engineering & Health Device Design' },
    reason: { fa: 'برای ذهنی که حل مسئله فنی را با اثر واقعی در سلامت و ساختن محصول ملموس ترکیب می‌کند.', en: 'For a mind that combines technical problem-solving, tangible building, and real health impact.' },
    acca: ['Tech', 'Health', 'Precision'], riasec: ['R', 'I'], strengths: ['MathPhysics', 'TechnologyComputing', 'BiologyChemistry'], identity: ['Expert', 'Creator'],
  },
  {
    id: 'hci_ux_research',
    name: { fa: 'تعامل انسان و کامپیوتر و پژوهش تجربه کاربر', en: 'Human-Computer Interaction & UX Research' },
    reason: { fa: 'ترکیبی دقیق از رفتار انسان، پژوهش، طراحی و فناوری برای ساخت تجربه‌های دیجیتال بهتر.', en: 'A precise mix of human behavior, research, design, and technology for better digital experiences.' },
    acca: ['Tech', 'People', 'Creative', 'Research'], riasec: ['I', 'A', 'S'], strengths: ['PsychologyHumanities', 'ArtDesign', 'TechnologyComputing'], identity: ['Researcher', 'Creator', 'Helper'],
  },
  {
    id: 'behavioral_economics',
    name: { fa: 'اقتصاد رفتاری و تحلیل تصمیم', en: 'Behavioral Economics & Decision Analytics' },
    reason: { fa: 'برای کسی که هم رفتار انسان را می‌کاود و هم می‌خواهد تصمیم‌های تجاری یا سیاستی را با داده بهتر کند.', en: 'For someone who studies human behavior and improves business or policy decisions with evidence.' },
    acca: ['Business', 'People', 'Research'], riasec: ['I', 'E', 'S'], strengths: ['BusinessEconomics', 'PsychologyHumanities', 'MathPhysics'], identity: ['Researcher', 'Expert', 'Leader'],
  },
  {
    id: 'industrial_engineering',
    name: { fa: 'مهندسی صنایع و بهینه‌سازی سیستم‌ها', en: 'Industrial Engineering & Systems Optimization' },
    reason: { fa: 'مناسب برای ذهن ساختارمند و تحلیلی که از داده، فرایند و فناوری برای بهترکردن سیستم‌ها استفاده می‌کند.', en: 'Fits a structured analytical mind improving systems through data, process design, and technology.' },
    acca: ['Tech', 'Business', 'Precision', 'Stability'], riasec: ['I', 'C', 'E'], strengths: ['MathPhysics', 'BusinessEconomics', 'TechnologyComputing'], identity: ['Expert', 'Leader'],
  },
  {
    id: 'business_analytics',
    name: { fa: 'تحلیل کسب‌وکار و هوش تصمیم', en: 'Business Analytics & Decision Intelligence' },
    reason: { fa: 'تبدیل داده به تصمیم، رشد و مزیت رقابتی؛ برای ترکیب منطق، بازار و اثر مدیریتی.', en: 'Turns data into decisions, growth, and advantage by combining logic, markets, and managerial impact.' },
    acca: ['Business', 'Tech', 'Research'], riasec: ['I', 'E', 'C'], strengths: ['BusinessEconomics', 'MathPhysics', 'TechnologyComputing'], identity: ['Expert', 'Leader', 'Founder'],
  },
  {
    id: 'supply_chain_analytics',
    name: { fa: 'مدیریت زنجیره تأمین و تحلیل عملیات', en: 'Supply Chain Management & Operations Analytics' },
    reason: { fa: 'برای فردی دقیق و نتیجه‌محور که از هماهنگی، پیش‌بینی و حل مسئله‌های واقعی در مقیاس بزرگ لذت می‌برد.', en: 'For a precise outcome-driven student who enjoys coordination, forecasting, and large-scale practical problems.' },
    acca: ['Business', 'Precision', 'Stability'], riasec: ['C', 'E', 'I'], strengths: ['BusinessEconomics', 'MathPhysics'], identity: ['Leader', 'Expert'],
  },
  {
    id: 'digital_media',
    name: { fa: 'رسانه دیجیتال، طراحی ارتباط و تجربه محتوا', en: 'Digital Media, Communication Design & Content Experience' },
    reason: { fa: 'برای خلاقیتی که می‌خواهد ایده را به روایت، تصویر و تجربه دیجیتال قابل‌اثر تبدیل کند.', en: 'For creativity that turns ideas into influential narratives, visuals, and digital experiences.' },
    acca: ['Creative', 'Communication', 'Tech'], riasec: ['A', 'S', 'E'], strengths: ['ArtDesign', 'LanguageCommunication', 'TechnologyComputing'], identity: ['Creator', 'Founder'],
  },
  {
    id: 'computational_design',
    name: { fa: 'معماری محاسباتی و طراحی پارامتریک', en: 'Computational Architecture & Parametric Design' },
    reason: { fa: 'ترکیب فرم، فضا، منطق و ابزارهای دیجیتال برای کسی که هم طراح است هم سیستم‌ساز.', en: 'Combines form, space, logic, and digital tools for a student who is both designer and systems thinker.' },
    acca: ['Creative', 'Tech', 'Precision'], riasec: ['A', 'R', 'I'], strengths: ['ArtDesign', 'MathPhysics', 'TechnologyComputing'], identity: ['Creator', 'Expert'],
  },
  {
    id: 'public_health',
    name: { fa: 'سلامت عمومی و سیاست‌گذاری سلامت', en: 'Public Health & Health Policy' },
    reason: { fa: 'اثرگذاری بر سلامت جمعیت از مسیر پژوهش، آموزش و طراحی سیستم، نه فقط درمان فردی.', en: 'Improves population health through research, education, and system design rather than only individual care.' },
    acca: ['Health', 'People', 'Research', 'Leadership'], riasec: ['S', 'I', 'E'], strengths: ['BiologyChemistry', 'PsychologyHumanities', 'ResearchWriting'], identity: ['Helper', 'Leader', 'Researcher'],
  },
  {
    id: 'psychology_behavior',
    name: { fa: 'روان‌شناسی و علوم رفتاری', en: 'Psychology & Behavioral Science' },
    reason: { fa: 'برای کنجکاوی علمی درباره رفتار انسان، همراه با توان گفت‌وگو، پژوهش و درک تفاوت‌های فردی.', en: 'For scientific curiosity about human behavior combined with communication, research, and individual understanding.' },
    acca: ['People', 'Research', 'Communication'], riasec: ['S', 'I'], strengths: ['PsychologyHumanities', 'ResearchWriting', 'LanguageCommunication'], identity: ['Helper', 'Researcher'],
  },
  {
    id: 'international_policy',
    name: { fa: 'روابط بین‌الملل، سیاست داده و حکمرانی فناوری', en: 'International Relations, Data Policy & Technology Governance' },
    reason: { fa: 'مسیر بین‌رشته‌ای برای تحلیل جهان، مذاکره، پژوهش و تصمیم‌سازی درباره فناوری و جامعه.', en: 'An interdisciplinary path for global analysis, negotiation, research, and decisions about technology and society.' },
    acca: ['GlobalMobility', 'People', 'Research', 'Communication'], riasec: ['I', 'S', 'E'], strengths: ['ResearchWriting', 'LanguageCommunication', 'PsychologyHumanities'], identity: ['Leader', 'Researcher'],
  },
  {
    id: 'entrepreneurship_innovation',
    name: { fa: 'کارآفرینی، نوآوری و طراحی کسب‌وکار', en: 'Entrepreneurship, Innovation & Venture Design' },
    reason: { fa: 'برای دانشجویی با استقلال، تحمل ابهام و میل به تبدیل ایده به تیم، محصول و بازار.', en: 'For a student with autonomy, uncertainty tolerance, and the drive to turn ideas into teams, products, and markets.' },
    acca: ['Business', 'Leadership', 'Creative'], riasec: ['E', 'A'], strengths: ['BusinessEconomics', 'LanguageCommunication'], identity: ['Founder', 'Leader', 'Creator'],
  },
];

const SIGNATURES = [
  { identity: 'Researcher', acca: 'Health', label: { fa: 'پژوهشگر سلامت آینده', en: 'Future Health Researcher' } },
  { identity: 'Researcher', acca: 'Tech', label: { fa: 'کاوشگر سیستم‌های هوشمند', en: 'Intelligent Systems Explorer' } },
  { identity: 'Helper', acca: 'Health', label: { fa: 'راهنمای مراقبت انسانی', en: 'Human Care Guide' } },
  { identity: 'Creator', acca: 'Tech', label: { fa: 'طراح تجربه‌های هوشمند', en: 'Intelligent Experience Designer' } },
  { identity: 'Creator', acca: 'Creative', label: { fa: 'خالق تجربه و معنا', en: 'Experience & Meaning Creator' } },
  { identity: 'Founder', acca: 'Business', label: { fa: 'سازنده فرصت و رشد', en: 'Opportunity & Growth Builder' } },
  { identity: 'Leader', acca: 'People', label: { fa: 'رهبر ارتباط و اثر', en: 'Connection & Impact Leader' } },
  { identity: 'Expert', acca: 'Precision', label: { fa: 'متخصص دقت و استاندارد', en: 'Precision & Standards Specialist' } },
];

function scoreMajor(candidate, signalSets) {
  let score = 0;
  candidate.acca.forEach((key, index) => {
    const rank = signalSets.acca.findIndex((item) => item.key === key);
    if (rank >= 0) score += Math.max(0, 20 - rank * 3) * (index === 0 ? 1.25 : 1);
  });
  candidate.riasec.forEach((key) => {
    const rank = signalSets.riasec.findIndex((item) => item.key === key);
    if (rank >= 0) score += Math.max(0, 13 - rank * 2);
  });
  candidate.strengths.forEach((key) => {
    const rank = signalSets.strengths.findIndex((item) => item.key === key);
    if (rank >= 0) score += Math.max(0, 15 - rank * 2.5);
  });
  candidate.identity.forEach((key) => {
    const rank = signalSets.identity.findIndex((item) => item.key === key);
    if (rank >= 0) score += Math.max(0, 16 - rank * 3);
  });
  return score;
}

function pickSignature(topIdentity, topAcca) {
  return SIGNATURES.find((item) => item.identity === topIdentity && item.acca === topAcca)
    || SIGNATURES.find((item) => item.identity === topIdentity)
    || { label: { fa: 'کاوشگر چندبعدی مسیر تحصیلی', en: 'Multidimensional Academic Explorer' } };
}

function narrative(topIdentity, topAcca, lifestyle) {
  const patternByIdentity = {
    Researcher: {
      fa: 'ذهن تو قبل از انتخاب، دنبال الگو، شواهد و علت عمیق می‌گردد. در محیطی رشد می‌کنی که اجازه پرسش جدی و تمرکز واقعی بدهد.',
      en: 'Your mind looks for patterns, evidence, and underlying causes before choosing. You grow where serious questions and deep focus are supported.',
    },
    Expert: {
      fa: 'وقتی معیار روشن و امکان تسلط واقعی وجود داشته باشد، عملکردت جهش می‌کند. کیفیت برای تو بیشتر از نمایش اهمیت دارد.',
      en: 'Your performance rises when standards are clear and real mastery is possible. Quality matters more to you than display.',
    },
    Founder: {
      fa: 'تو تمایل داری ابهام را به فرصت و ایده را به حرکت تبدیل کنی. مالکیت، آزادی تصمیم و نتیجه ملموس محرک‌های مهم تو هستند.',
      en: 'You tend to turn ambiguity into opportunity and ideas into motion. Ownership, freedom, and tangible outcomes strongly motivate you.',
    },
    Creator: {
      fa: 'قدرت تو در دیدن ارتباط‌هایی است که دیگران سریع نمی‌بینند و تبدیل آن‌ها به تجربه، روایت یا راه‌حل تازه.',
      en: 'Your strength is seeing connections others miss and turning them into a new experience, story, or solution.',
    },
    Leader: {
      fa: 'در موقعیت‌های پیچیده، به‌طور طبیعی جهت، هماهنگی و حرکت ایجاد می‌کنی. بهترین مسیر برای تو باید امکان اثرگذاری واقعی بدهد.',
      en: 'In complex situations, you naturally create direction, alignment, and momentum. Your best path needs room for real influence.',
    },
    Helper: {
      fa: 'تو کیفیت تصمیم را فقط با منطق نمی‌سنجی؛ اثر آن بر انسان‌ها هم برایت مهم است. در کارهای معنادار و رابطه‌محور می‌توانی بدرخشی.',
      en: 'You judge decisions not only by logic but also by their human effect. You can thrive in meaningful, relationship-centered work.',
    },
  };

  const pressure = lifestyle.find((item) => item.key === 'Pressure')?.score || 0;
  const risk = lifestyle.find((item) => item.key === 'Risk')?.score || 0;
  const warning = pressure < 0
    ? {
      fa: 'هشدار تناسب: مسیرهای دائماً پرفشار یا بحران‌محور ممکن است در بلندمدت انرژی تو را کاهش دهند؛ فقط به اعتبار رشته نگاه نکن.',
      en: 'Fit warning: permanently high-pressure or crisis-heavy paths may drain you over time; do not choose on prestige alone.',
    }
    : risk > 4
      ? {
        fa: 'هشدار تناسب: علاقه به مسیرهای نو می‌تواند نقطه قوت باشد، اما قبل از انتخاب، بازار کار و مهارت‌های پایه را واقع‌بینانه بررسی کن.',
        en: 'Fit warning: attraction to emerging paths can be a strength, but validate the market and foundational skills before choosing.',
      }
      : {
        fa: 'هشدار تناسب: ممکن است به‌خاطر توان سازگاری، در مسیرهای زیادی «خوب» باشی؛ انتخاب نهایی باید با سبک زندگی مطلوبت هم سازگار باشد.',
        en: 'Fit warning: adaptability may make you good at many paths; the final choice also needs to fit your desired lifestyle.',
      };

  return {
    deepPattern: patternByIdentity[topIdentity] || patternByIdentity.Expert,
    hiddenStrength: {
      fa: `نقطه قوت پنهان تو، ترکیب «${topIdentity}» با کشش قوی به حوزه «${topAcca}» است؛ این ترکیب برای مسیرهای بین‌رشته‌ای ارزش ویژه دارد.`,
      en: `Your hidden strength is the combination of a ${topIdentity} identity with a strong pull toward ${topAcca}; this is especially valuable in interdisciplinary paths.`,
    },
    riskWarning: warning,
  };
}

export function selectAdaptiveQuestionIds(answerOptionIds = []) {
  const totals = tallyDeepFitAnswers(answerOptionIds);
  const acca = ranked(totals, 'acca');
  const identity = ranked(totals, 'identity');
  const picks = [];
  const add = (id) => {
    if (!picks.includes(id) && picks.length < DEEP_FIT_ADAPTIVE_COUNT) picks.push(id);
  };

  const topAcca = acca[0]?.key;
  if (topAcca === 'Health') add('dfa_health');
  if (topAcca === 'Tech') add('dfa_tech');
  if (topAcca === 'Business' || topAcca === 'Leadership') add('dfa_business');
  if (topAcca === 'Creative' || topAcca === 'Communication') add('dfa_creative');
  if (topAcca === 'People') add('dfa_people');

  const jpGap = Math.abs(totals.mbti.J - totals.mbti.P);
  if (jpGap <= 3) add('dfa_jp');
  if (Math.abs(totals.lifestyle.Pressure) <= 3) add('dfa_pressure');
  if (Math.abs((identity[0]?.score || 0) - (identity[1]?.score || 0)) <= 3) add('dfa_identity');

  ['dfa_health', 'dfa_tech', 'dfa_people', 'dfa_business', 'dfa_creative', 'dfa_pressure', 'dfa_identity', 'dfa_jp']
    .forEach(add);
  return picks;
}

export function buildDeepFitRecap(answerOptionIds = [], stage = 0) {
  const totals = tallyDeepFitAnswers(answerOptionIds);
  const topAcca = ranked(totals, 'acca')[0]?.key || 'Research';
  const topIdentity = ranked(totals, 'identity')[0]?.key || 'Expert';
  const recaps = {
    30: {
      fa: `تا اینجا، پاسخ‌هایت ترکیبی از گرایش به «${topAcca}» و سبک «${topIdentity}» را نشان می‌دهد. هنوز نتیجه نهایی نیست؛ سؤال‌های بعدی مرز بین علاقه و سبک واقعی کار را روشن می‌کنند.`,
      en: `So far, your answers combine a pull toward ${topAcca} with a ${topIdentity} style. This is not the final result; the next questions separate interest from real work fit.`,
    },
    36: {
      fa: 'یک الگوی مهم در حال شکل‌گیری است: فقط موضوع رشته مهم نیست، نوع مسئله و محیطی که در آن کار می‌کنی هم روی رضایت تو اثر جدی دارد.',
      en: 'An important pattern is emerging: not only the subject, but also the kind of problem and work environment strongly affect your fit.',
    },
    42: {
      fa: `پروفایل دارد دقیق‌تر می‌شود. کشش فعلی تو به «${topAcca}» را حالا با تحمل فشار، مسیر آموزش و سبک یادگیری مقایسه می‌کنم.`,
      en: `The profile is getting sharper. I am now cross-checking your pull toward ${topAcca} against pressure tolerance, training length, and learning style.`,
    },
    48: {
      fa: 'تقریباً به تصویر کامل رسیده‌ایم. چند پاسخ آخر کمک می‌کنند پیشنهادها از رشته‌های کلی به مسیرهای دقیق‌تر و بین‌رشته‌ای تبدیل شوند.',
      en: 'We are close to the full picture. The final answers turn broad fields into more precise and interdisciplinary recommendations.',
    },
  };
  return recaps[stage] || null;
}

export function computeDeepFitResult(answerOptionIds = [], adaptiveQuestionIds = []) {
  const baseAnswers = answerOptionIds.slice(0, 25);
  const base = computeDiscoveryResult(baseAnswers);
  const totals = tallyDeepFitAnswers(answerOptionIds);
  const signalSets = {
    acca: ranked(totals, 'acca'),
    riasec: ranked(totals, 'riasec'),
    strengths: ranked(totals, 'strengths'),
    identity: ranked(totals, 'identity'),
    motiv: ranked(totals, 'motiv'),
    lifestyle: ranked(totals, 'lifestyle'),
  };

  const topIdentity = signalSets.identity[0]?.key || 'Expert';
  const topAcca = signalSets.acca[0]?.key || 'Research';
  const signature = pickSignature(topIdentity, topAcca);
  const copy = narrative(topIdentity, topAcca, signalSets.lifestyle);
  const majorRanking = MAJOR_CATALOG
    .map((candidate) => ({ ...candidate, rawScore: scoreMajor(candidate, signalSets) }))
    .sort((a, b) => b.rawScore - a.rawScore);
  const topMajors = majorRanking.slice(0, 8);
  const min = topMajors[topMajors.length - 1]?.rawScore || 0;
  const span = Math.max(1, (topMajors[0]?.rawScore || 1) - min);
  const recommendedMajors = topMajors.map((candidate, index) => ({
    id: candidate.id,
    name: candidate.name,
    reason: candidate.reason,
    match: Math.round(73 + ((candidate.rawScore - min) / span) * 24),
    fitType: index < 4 ? 'strong' : index < 6 ? 'unexpected' : 'stretch',
  }));

  return {
    ...base,
    version: 3,
    assessment: 'acca_deep_fit',
    completedAt: new Date().toISOString(),
    questionCount: answerOptionIds.length,
    coreQuestionCount: DEEP_FIT_CORE_QUESTIONS.length,
    adaptiveQuestionIds,
    signature: {
      ...signature,
      identity: topIdentity,
      domain: topAcca,
    },
    deepPattern: copy.deepPattern,
    hiddenStrength: copy.hiddenStrength,
    riskWarning: copy.riskWarning,
    cognitiveStyle: {
      mbtiLike: base.mbtiLike,
      topInterestCode: signalSets.riasec.slice(0, 3).map((item) => item.key).join('-'),
    },
    topInterestAreas: signalSets.acca.slice(0, 4),
    motivationalCore: signalSets.motiv.slice(0, 4),
    academicStrengths: signalSets.strengths.slice(0, 4),
    lifestyleFit: Object.fromEntries(
      signalSets.lifestyle.map((item) => [item.key, { score: item.score, pct: item.pct }]),
    ),
    identityProjection: signalSets.identity.slice(0, 3),
    recommendedMajors,
    catalogMajors: base.recommendedMajors,
    cautionMajors: majorRanking.slice(-3).reverse().map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
    })),
    admissionRealityNote: {
      fa: 'این نتیجه تناسب آموزشی و سبک مسیر را نشان می‌دهد، نه شانس قطعی پذیرش. انتخاب نهایی باید با معدل، زبان، بودجه، پیش‌نیازها و ظرفیت واقعی دانشگاه‌های ترکیه و قبرس شمالی بررسی شود.',
      en: 'This result describes educational and pathway fit, not guaranteed admission. Final choices must be checked against grades, language, budget, prerequisites, and actual capacity in Turkey and Northern Cyprus.',
    },
    disclaimer: {
      fa: 'این یک نتیجه مقدماتی راهنمایی آموزشی بر اساس پاسخ‌های شماست؛ نه تشخیص روان‌شناختی، نه آزمون رسمی MBTI و نه تضمین پذیرش.',
      en: 'This is a preliminary educational guidance result based on your answers, not a psychological diagnosis, an official MBTI test, or a guaranteed admission result.',
    },
  };
}
