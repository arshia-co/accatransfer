// The "value moment": the full 25-question discovery profile rendered inside
// the conversation as a premium tabbed card — Overview · Personality ·
// Interests · Major match · Admission fit · Next steps.
// Pure presentation: every number/id comes from src/ai/scoring.js, every
// sentence from the data catalogs (backend-replaceable).
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  BadgeCheck,
  ShieldCheck,
  Lightbulb,
  AlertTriangle,
  LogIn,
  Building2,
  FileText,
  MessageCircle,
  UserRound,
  Compass,
  Target,
  BookOpen,
  BriefcaseBusiness,
  Globe2,
  Languages,
  TrendingUp,
  Users,
  WalletCards,
} from 'lucide-react';
import { L } from '../../lib/lang';
import { UI } from '../../i18n/ui';
import { renderIcon } from '../../lib/icons';
import {
  ARCHETYPES,
  ACCA_CATEGORY_LABELS,
  MOTIVATION_LABELS,
  ACADEMIC_STRENGTH_LABELS,
} from '../../data/majorQuestions';
import {
  AXIS_META,
  AXIS_BALANCED_NOTE,
  TRAIT_META,
  LEVEL_LABELS,
  CONFIDENCE_LABELS,
  HIDDEN_STRENGTHS,
  BLIND_SPOTS,
  LEARNING_ENV,
  ARCHETYPE_HEADLINES,
  REALITY_NOTES,
  HIGH_COST_ADDENDUM,
  CAUTION_INTRO,
} from '../../data/discoveryProfile';
import { getMajor } from '../../data/mockPrograms';
import { BUDGET_RANGES } from '../../data/mockAdmissionRules';
import { useSmartApplyStore } from '../../store/smartApplyStore';
import { INTENTS } from '../../ai/intents';
import RecommendedMajorCard from './RecommendedMajorCard';

const RIASEC_LETTER_LABELS = {
  R: { fa: 'واقع‌گرا (عملی)', en: 'Realistic', tr: 'Gerçekçi', ar: 'واقعي' },
  I: { fa: 'جستجوگر (تحلیلی)', en: 'Investigative', tr: 'Araştırmacı', ar: 'استقصائي' },
  A: { fa: 'هنری', en: 'Artistic', tr: 'Sanatsal', ar: 'فني' },
  S: { fa: 'اجتماعی', en: 'Social', tr: 'Sosyal', ar: 'اجتماعي' },
  E: { fa: 'متهور (پیشرو)', en: 'Enterprising', tr: 'Girişimci', ar: 'ريادي' },
  C: { fa: 'منظم (قراردادی)', en: 'Conventional', tr: 'Düzenli', ar: 'تقليدي' },
};

const TABS = [
  { id: 'overview', label: UI.tabOverview, icon: Sparkles },
  { id: 'personality', label: UI.tabPersonality, icon: Target },
  { id: 'interests', label: UI.tabInterests, icon: Compass },
  { id: 'majors', label: UI.tabMajors, icon: BadgeCheck },
  { id: 'admission', label: UI.tabAdmission, icon: ShieldCheck },
  { id: 'next', label: UI.tabNext, icon: LogIn },
];

const AXIS_ORDER = ['EI', 'SN', 'TF', 'JP'];
const TRAIT_ORDER = ['O', 'C', 'E', 'A', 'Em', 'H'];

const PROFILE_NAME = {
  fa: 'Educational Fit Profile',
  en: 'Educational Fit Profile',
  tr: 'Educational Fit Profile',
  ar: 'Educational Fit Profile',
};

const BRIEF_LABELS = {
  interests: { fa: 'علایق تحصیلی', en: 'Academic interests', tr: 'Akademik ilgiler', ar: 'الاهتمامات الأكاديمية' },
  learning: { fa: 'سبک یادگیری', en: 'Learning style', tr: 'Öğrenme stili', ar: 'أسلوب التعلم' },
  work: { fa: 'ترجیح محیط کاری', en: 'Work environment preference', tr: 'Çalışma ortamı tercihi', ar: 'تفضيل بيئة العمل' },
  social: { fa: 'تعامل اجتماعی', en: 'Social interaction', tr: 'Sosyal etkileşim', ar: 'التفاعل الاجتماعي' },
  risk: { fa: 'ریسک‌پذیری مسیر', en: 'Path risk tolerance', tr: 'Yol risk toleransı', ar: 'تحمل مخاطر المسار' },
  budget: { fa: 'بودجه و محدودیت مالی', en: 'Budget and financial limits', tr: 'Bütçe ve mali sınırlar', ar: 'الميزانية والقيود المالية' },
  language: { fa: 'زبان تحصیل', en: 'Study language', tr: 'Eğitim dili', ar: 'لغة الدراسة' },
  countries: { fa: 'کشورهای مناسب', en: 'Suitable countries', tr: 'Uygun ülkeler', ar: 'الدول المناسبة' },
  confidence: { fa: 'سطح اطمینان سیستم', en: 'System confidence', tr: 'Sistem güveni', ar: 'مستوى ثقة النظام' },
  counselor: { fa: 'مشاوره انسانی', en: 'Human counseling', tr: 'İnsan danışmanlığı', ar: 'استشارة بشرية' },
};

const BRIEF_TEXT = {
  learningPractice: {
    fa: 'با مثال واقعی، تمرین عملی و خروجی ملموس سریع‌تر یاد می‌گیرید.',
    en: 'You learn fastest through real cases, practice, and tangible outputs.',
  },
  learningTheory: {
    fa: 'با مفاهیم، الگوها و دلیل پشت موضوعات بهتر درگیر می‌شوید.',
    en: 'You engage well with concepts, patterns, and the “why” behind topics.',
  },
  structureFixed: {
    fa: 'برنامه ساختارمند و مرحله‌به‌مرحله برای شما امن‌تر است.',
    en: 'A structured, step-by-step curriculum is likely safer for you.',
  },
  structureFlexible: {
    fa: 'برنامه منعطف، پروژه و انتخاب واحدهای متنوع به شما انرژی می‌دهد.',
    en: 'Flexible programs, projects, and varied electives give you energy.',
  },
  workPeople: {
    fa: 'محیط‌های انسان‌محور، تیمی و ارتباطی با شما هم‌خوانی بیشتری دارند.',
    en: 'People-facing, team-based, communication-rich environments fit you better.',
  },
  workAnalytical: {
    fa: 'محیط‌های تحلیلی، پژوهشی و دارای زمان تمرکز عمیق مناسب‌ترند.',
    en: 'Analytical or research-heavy environments with deep-focus time suit you better.',
  },
  socialHigh: {
    fa: 'تعامل، بحث و ارائه می‌تواند بخشی از سوخت یادگیری شما باشد.',
    en: 'Discussion, presentation, and interaction can fuel your learning.',
  },
  socialMeasured: {
    fa: 'تمرکز فردی و زمان آرام برای پردازش، کیفیت تصمیم شما را بالا می‌برد.',
    en: 'Solo focus and quiet processing time improve your decision quality.',
  },
  language: {
    fa: 'انگلیسی یا ترکی، بسته به رشته و دانشگاه مقصد؛ قبل از اپلای باید تأیید شود.',
    en: 'English or Turkish, depending on the target program and university; it must be confirmed before applying.',
  },
  countries: {
    fa: 'ترکیه و قبرس شمالی؛ محدوده اصلی خدمات پذیرش آکا.',
    en: 'Turkey and Northern Cyprus, the main ACCA admission service scope.',
  },
  counselor: {
    fa: 'پیشنهاد AI نقطه شروع است؛ قبل از ارسال رسمی، مشاور آکا آن را با معدل، بودجه، مدارک و ظرفیت دانشگاه چک می‌کند.',
    en: 'The AI suggestion is a starting point; before submission, an ACCA counselor checks it against grades, budget, documents, and university capacity.',
  },
  budgetUnknown: {
    fa: 'بودجه هنوز ثبت نشده؛ در مرحله بعد شهریه، بورسیه و سقف پرداخت بررسی می‌شود.',
    en: 'Budget is not set yet; tuition, scholarships, and payment limits are reviewed in the next step.',
  },
  budgetScholarship: {
    fa: 'پاسخ‌ها نشان می‌دهد مسیر باید با نگاه بورسیه و کنترل شهریه بررسی شود.',
    en: 'Your answers suggest the plan should be reviewed with scholarships and tuition control in mind.',
  },
};

const RISK_TEXT = {
  competitive: {
    fa: 'آمادگی مسیرهای رقابتی دیده می‌شود، اما معدل و مدارک باید دقیق بررسی شوند.',
    en: 'You show readiness for competitive paths, but grades and documents need close review.',
  },
  scholarship_first: {
    fa: 'ریسک مالی مهم است؛ گزینه‌های کم‌هزینه‌تر و بورسیه‌محور باید اولویت بگیرند.',
    en: 'Financial risk matters; lower-cost and scholarship-oriented options should come first.',
  },
  foundation_first: {
    fa: 'مسیر مرحله‌ای امن‌تر است؛ بهتر است گزینه‌های قابل‌دسترس‌تر و مسیرهای تقویتی بررسی شوند.',
    en: 'A staged route is safer; accessible options and booster paths should be reviewed.',
  },
  balanced: {
    fa: 'ریسک مسیر متعادل است؛ تصمیم نهایی باید با دانشگاه، شهریه و مدارک چک شود.',
    en: 'Path risk looks balanced; the final decision should be checked against university, tuition, and documents.',
  },
};

function localizedList(items, lang) {
  return items.filter(Boolean).map((item) => L(item, lang)).filter(Boolean).join('، ');
}

function budgetText(profile, result, lang) {
  const budget = BUDGET_RANGES.find((item) => item.id === profile?.budget);
  if (budget) return L(budget.label, lang);
  if (result?.reality === 'scholarship_first') return L(BRIEF_TEXT.budgetScholarship, lang);
  return L(BRIEF_TEXT.budgetUnknown, lang);
}

function buildDecisionBrief(result, profile, lang) {
  const learning = result.learningEnvironment || {};
  const interests = localizedList(
    (result.accaTop || []).slice(0, 3).map((item) => ACCA_CATEGORY_LABELS[item.key]),
    lang,
  );
  const learningParts = [
    L(learning.theory?.side === 'b' ? BRIEF_TEXT.learningPractice : BRIEF_TEXT.learningTheory, lang),
    L(learning.structure?.side === 'b' ? BRIEF_TEXT.structureFlexible : BRIEF_TEXT.structureFixed, lang),
  ];
  const confidence = result.mbtiLike?.confidence
    ? (lang === 'fa'
        ? `حدود ${result.mbtiLike.confidence}٪ برای الگوی ترجیحی؛ نتیجه رشته همچنان نیازمند بررسی انسانی است.`
        : `About ${result.mbtiLike.confidence}% for the preference pattern; the major decision still needs human review.`)
    : L(UI.resultExplanation, lang);

  return [
    { key: 'interests', icon: BookOpen, label: BRIEF_LABELS.interests, text: interests || L(UI.topInterestsLabel, lang) },
    { key: 'learning', icon: Compass, label: BRIEF_LABELS.learning, text: learningParts.join(' ') },
    { key: 'work', icon: BriefcaseBusiness, label: BRIEF_LABELS.work, text: L(learning.focus?.side === 'b' ? BRIEF_TEXT.workPeople : BRIEF_TEXT.workAnalytical, lang) },
    { key: 'social', icon: Users, label: BRIEF_LABELS.social, text: L(learning.social?.side === 'b' ? BRIEF_TEXT.socialHigh : BRIEF_TEXT.socialMeasured, lang) },
    { key: 'risk', icon: TrendingUp, label: BRIEF_LABELS.risk, text: L(RISK_TEXT[result.reality] || RISK_TEXT.balanced, lang) },
    { key: 'budget', icon: WalletCards, label: BRIEF_LABELS.budget, text: budgetText(profile, result, lang) },
    { key: 'language', icon: Languages, label: BRIEF_LABELS.language, text: L(BRIEF_TEXT.language, lang) },
    { key: 'countries', icon: Globe2, label: BRIEF_LABELS.countries, text: L(BRIEF_TEXT.countries, lang) },
    { key: 'confidence', icon: ShieldCheck, label: BRIEF_LABELS.confidence, text: confidence },
    { key: 'counselor', icon: MessageCircle, label: BRIEF_LABELS.counselor, text: L(BRIEF_TEXT.counselor, lang) },
  ];
}

function SectionTitle({ children }) {
  return <p className="mb-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-navy/45">{children}</p>;
}

function Card({ children, tint = '' }) {
  return (
    <div className={`rounded-[18px] border p-4 ${tint || 'border-white/80 bg-white/65'}`}>{children}</div>
  );
}

function DecisionBrief({ items, lang, onCounselor }) {
  return (
    <Card tint="border-emerald-700/15 bg-gradient-to-br from-emerald-600/[0.06] via-white/78 to-gold/[0.06]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <SectionTitle>{L(PROFILE_NAME, lang)}</SectionTitle>
          <h4 className="text-sm font-black text-navy">
            {lang === 'fa' ? 'خلاصه تصمیم انتخاب رشته' : 'Major-choice decision brief'}
          </h4>
        </div>
        <a
          href="/smart-apply/glossary"
          className="inline-flex items-center gap-1.5 rounded-full border border-navy/10 bg-white px-3 py-1.5 text-[10px] font-black text-navy/65 transition hover:border-gold/45 hover:text-navy"
        >
          <BookOpen className="h-3.5 w-3.5 text-gold" />
          {lang === 'fa' ? 'واژه‌نامه پروفایل' : 'Profile glossary'}
        </a>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="rounded-2xl border border-white/85 bg-white/74 p-3">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-navy/[0.045] text-emerald-800">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] font-black text-navy/78">{L(item.label, lang)}</p>
                  <p className="mt-1 text-[10.5px] font-semibold leading-5 text-navy/57">{item.text}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onCounselor}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-navy px-4 py-2.5 text-[11px] font-black text-cream transition hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(7,26,61,0.18)]"
      >
        <MessageCircle className="h-4 w-4 text-gold" />
        {lang === 'fa' ? 'مرور نتیجه با مشاور انسانی' : 'Review this result with a human counselor'}
      </button>
    </Card>
  );
}

// One MBTI-inspired axis row: pole labels at both ends, a marker pulled
// toward the winner, and a confidence chip. Balanced axes say so honestly.
function AxisRow({ axisId, axis, lang }) {
  const meta = AXIS_META[axisId];
  const pos = axis.winner === meta.letters[1] ? axis.score : 100 - axis.score; // % toward end B
  const balanced = axis.confidence === 'balanced';
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[11px] font-black ${axis.winner === meta.letters[0] && !balanced ? 'text-emerald-800' : 'text-navy/50'}`}>
          {meta.letters[0]} · {L(meta.poles[meta.letters[0]].label, lang)}
        </span>
        <span className="rounded-full bg-navy/[0.05] px-2 py-0.5 text-[9px] font-black text-navy/55">
          {L(CONFIDENCE_LABELS[axis.confidence], lang)}{!balanced && ` · ${axis.score}%`}
        </span>
        <span className={`text-[11px] font-black ${axis.winner === meta.letters[1] && !balanced ? 'text-emerald-800' : 'text-navy/50'}`}>
          {L(meta.poles[meta.letters[1]].label, lang)} · {meta.letters[1]}
        </span>
      </div>
      <div className="relative mt-1.5 h-2 rounded-full bg-navy/[0.06]">
        <span className="absolute inset-y-0 start-1/2 w-px bg-navy/15" />
        <motion.span
          className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-white bg-gradient-to-br from-emerald-600 to-gold shadow-[0_2px_8px_rgba(7,26,61,0.25)]"
          initial={{ insetInlineStart: '50%' }}
          animate={{ insetInlineStart: `calc(${pos}% - 7px)` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>
      {balanced && (
        <p className="mt-1.5 text-[10px] font-semibold leading-5 text-navy/55">
          {L(AXIS_BALANCED_NOTE, lang)
            .replace('{axis}', `${meta.letters[0]}/${meta.letters[1]}`)
            .replace('{pole}', L(meta.poles[axis.winner].label, lang))}
        </p>
      )}
    </div>
  );
}

function SpectrumRow({ spec, data, lang }) {
  const leaning = data.side === 'a' ? spec.a : spec.b;
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] font-black text-navy/50">
        <span className={data.side === 'a' ? 'text-emerald-800' : ''}>{L(spec.a.label, lang)}</span>
        <span className="text-[9px] font-bold uppercase tracking-wide text-navy/35">{L(spec.label, lang)}</span>
        <span className={data.side === 'b' ? 'text-emerald-800' : ''}>{L(spec.b.label, lang)}</span>
      </div>
      <div className="relative mt-1.5 h-1.5 rounded-full bg-navy/[0.06]">
        <motion.span
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-emerald-700 shadow"
          initial={{ insetInlineStart: '50%' }}
          animate={{ insetInlineStart: `calc(${data.pos}% - 6px)` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>
      <p className="mt-1.5 text-[10px] font-semibold leading-5 text-navy/55">{L(leaning.desc, lang)}</p>
    </div>
  );
}

export default function MajorResultPreview({ result, lang }) {
  const [tab, setTab] = useState('overview');
  const chooseAction = useSmartApplyStore((s) => s.chooseAction);
  const openLoginGate = useSmartApplyStore((s) => s.openLoginGate);
  const talkToCounselor = useSmartApplyStore((s) => s.talkToCounselor);
  const continueAsGuest = useSmartApplyStore((s) => s.continueAsGuest);
  const isAuthenticated = useSmartApplyStore((s) => s.isAuthenticated);
  const studentProfile = useSmartApplyStore((s) => s.studentProfile);

  if (!result) return null;

  // Legacy guard: sessions resumed from the older 5-question result keep working.
  const isDeep = result.version === 2 && result.mbtiLike;

  const primary = ARCHETYPES.find((a) => a.id === (isDeep ? result.accaArchetype.primary : result.archetypeId));
  const secondary = isDeep ? ARCHETYPES.find((a) => a.id === result.accaArchetype.secondary) : null;
  const typeLike = (t) => L(UI.typeLikeFormat, lang).replace('{type}', t);
  const decisionBrief = isDeep ? buildDecisionBrief(result, studentProfile, lang) : [];

  const nextSteps = [
    isAuthenticated
      ? {
          key: 'panel', primary: true, icon: LogIn,
          label: L({ fa: 'پنل کامل من', en: 'My full panel', tr: 'Tam panelim', ar: 'لوحتي الكاملة' }, lang),
          run: () => window.location.assign('/account'),
        }
      : {
          key: 'save', primary: true, icon: LogIn, label: L(UI.loginGateLogin, lang),
          run: () => openLoginGate(),
        },
    {
      key: 'universities', icon: Building2, label: L({ fa: 'دیدن دانشگاه‌های منطبق', en: 'See matching universities', tr: 'Eşleşen üniversiteleri gör', ar: 'عرض الجامعات المطابقة' }, lang),
      run: () => chooseAction({ id: 'ns_uni', label: L({ fa: 'دیدن دانشگاه‌های منطبق', en: 'See matching universities', tr: 'Eşleşen üniversiteleri gör', ar: 'عرض الجامعات المطابقة' }, lang), value: 'universities', nextIntent: INTENTS.DISCOVERY_SEE_UNIVERSITIES }),
    },
    {
      key: 'docs', icon: FileText, label: L({ fa: 'بارگذاری مدارک', en: 'Upload documents', tr: 'Belgeleri yükle', ar: 'رفع المستندات' }, lang),
      run: () => chooseAction({ id: 'ns_docs', label: L({ fa: 'بارگذاری مدارک', en: 'Upload documents', tr: 'Belgeleri yükle', ar: 'رفع المستندات' }, lang), value: 'docs', nextIntent: INTENTS.DOCUMENTS_OVERVIEW }),
    },
    { key: 'counselor', icon: MessageCircle, label: L(UI.loginGateCounselor, lang), run: () => talkToCounselor() },
    { key: 'guest', icon: UserRound, label: L(UI.loginGateGuest, lang), run: () => continueAsGuest() },
  ];

  return (
    <div className="overflow-hidden rounded-[24px] border border-gold/25 bg-gradient-to-b from-white/95 via-white/78 to-gold/[0.06] shadow-[0_24px_70px_rgba(7,26,61,0.105)] sm:rounded-[26px]">
      {/* ---- Header + headline ---- */}
      <div className="relative overflow-hidden border-b border-navy/[0.06] bg-gradient-to-r from-navy/[0.035] via-white/70 to-gold/[0.10] px-4 pb-4 pt-4 sm:px-5">
        <div className="pointer-events-none absolute -end-10 -top-16 h-36 w-36 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-navy text-gold shadow-[0_8px_24px_rgba(7,26,61,0.22)]">
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-gold">
              {isDeep ? L(UI.deepResultBadge, lang) : 'ACCA Smart Apply'}
            </p>
            <h3 className="mt-0.5 text-sm font-black text-navy sm:text-base">{L(UI.resultReady, lang)}</h3>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="relative mt-4 flex items-start gap-3.5 rounded-[20px] border border-white/85 bg-white/80 p-4 shadow-[0_10px_30px_rgba(198,167,104,0.14)]"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gold/85 via-gold/55 to-emerald-600/45 text-white shadow-[0_8px_24px_rgba(198,167,104,0.38)] sm:h-14 sm:w-14">
            {renderIcon(primary?.icon, { className: 'h-7 w-7', strokeWidth: 2 })}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black leading-7 text-navy sm:text-[15px]">
              {isDeep ? L(ARCHETYPE_HEADLINES[primary?.id], lang) : L(primary?.blurb, lang)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-navy px-2.5 py-1 text-[10px] font-black text-gold">
                {L(UI.archetypeLabel, lang)}: {L(primary?.name, lang)}
              </span>
              {secondary && (
                <span className="inline-flex items-center gap-1 rounded-full bg-navy/[0.05] px-2.5 py-1 text-[10px] font-black text-navy/70">
                  {L(UI.archetypeSecondaryLabel, lang)}: {L(secondary.name, lang)}
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* ---- Tabs ---- */}
        {isDeep && (
          <div className="sa-scroll relative mt-4 flex gap-1.5 overflow-x-auto pb-0.5">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black transition ${
                    active
                      ? 'bg-navy text-cream shadow-[0_6px_18px_rgba(7,26,61,0.25)]'
                      : 'bg-white/70 text-navy/55 hover:bg-white'
                  }`}
                >
                  <Icon className={`h-3 w-3 ${active ? 'text-gold' : ''}`} />
                  {L(t.label, lang)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ---- Tab content ---- */}
      <div className="p-4 sm:p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            className="space-y-4"
          >
            {/* ════════ OVERVIEW ════════ */}
            {isDeep && tab === 'overview' && (
              <>
                <DecisionBrief items={decisionBrief} lang={lang} onCounselor={talkToCounselor} />

                <div className="grid gap-2.5 sm:grid-cols-3">
                  <Card>
                    <SectionTitle>{L(UI.mbtiPatternLabel, lang)}</SectionTitle>
                    <p className="font-mono text-lg font-black tracking-[0.18em] text-navy">{typeLike(result.mbtiLike.type)}</p>
                    <p className="mt-1 text-[10px] font-bold text-navy/50">
                      {L(UI.overallConfidenceLabel, lang)}: {result.mbtiLike.confidence}%
                    </p>
                  </Card>
                  <Card>
                    <SectionTitle>{L(UI.riasecCodeLabel, lang)}</SectionTitle>
                    <p className="font-mono text-lg font-black tracking-[0.18em] text-emerald-700">{result.riasec.code}</p>
                    <p className="mt-1 truncate text-[10px] font-bold text-navy/50">
                      {result.riasec.top.map((k) => L(RIASEC_LETTER_LABELS[k], lang)).join(' · ')}
                    </p>
                  </Card>
                  <Card>
                    <SectionTitle>{L(UI.topInterestsLabel, lang)}</SectionTitle>
                    <p className="text-sm font-black leading-6 text-navy">
                      {L(ACCA_CATEGORY_LABELS[result.accaTop[0]?.key], lang)}
                    </p>
                    <p className="mt-1 truncate text-[10px] font-bold text-navy/50">
                      {result.accaTop.slice(1, 3).map((c) => L(ACCA_CATEGORY_LABELS[c.key], lang)).join(' · ')}
                    </p>
                  </Card>
                </div>

                <Card tint="border-emerald-700/15 bg-emerald-600/[0.05]">
                  <div className="mb-2 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-emerald-700" />
                    <SectionTitle>{L(UI.hiddenStrengthsLabel, lang)}</SectionTitle>
                  </div>
                  <ul className="space-y-2">
                    {result.hiddenStrengths.map((id) => {
                      const item = HIDDEN_STRENGTHS.find((h) => h.id === id);
                      return item ? (
                        <li key={id} className="flex items-start gap-2 text-xs font-semibold leading-6 text-navy/70">
                          <BadgeCheck className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-700" />
                          {L(item.text, lang)}
                        </li>
                      ) : null;
                    })}
                  </ul>
                </Card>

                <Card tint="border-gold/25 bg-gold/[0.06]">
                  <div className="mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-[#a8853f]" />
                    <SectionTitle>{L(UI.blindSpotsLabel, lang)}</SectionTitle>
                  </div>
                  <ul className="space-y-2">
                    {result.blindSpots.map((id) => {
                      const item = BLIND_SPOTS.find((b) => b.id === id);
                      return item ? (
                        <li key={id} className="flex items-start gap-2 text-xs font-semibold leading-6 text-navy/70">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                          {L(item.text, lang)}
                        </li>
                      ) : null;
                    })}
                  </ul>
                </Card>
              </>
            )}

            {/* ════════ PERSONALITY ════════ */}
            {isDeep && tab === 'personality' && (
              <>
                <Card>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <SectionTitle>{L(UI.mbtiPatternLabel, lang)}</SectionTitle>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-navy px-2.5 py-1 font-mono text-[11px] font-black tracking-[0.14em] text-gold">
                        {typeLike(result.mbtiLike.type)}
                      </span>
                      {result.mbtiLike.secondaryType && (
                        <span className="rounded-full bg-navy/[0.05] px-2.5 py-1 text-[10px] font-black text-navy/60">
                          {L(UI.secondaryTypeLabel, lang)}: {typeLike(result.mbtiLike.secondaryType)}
                        </span>
                      )}
                      <span className="rounded-full bg-emerald-600/10 px-2.5 py-1 text-[10px] font-black text-emerald-800">
                        {L(UI.overallConfidenceLabel, lang)}: {result.mbtiLike.confidence}%
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {AXIS_ORDER.map((axisId) => (
                      <AxisRow key={axisId} axisId={axisId} axis={result.mbtiLike.axes[axisId]} lang={lang} />
                    ))}
                  </div>
                  <div className="mt-4 space-y-1.5 border-t border-navy/[0.05] pt-3">
                    {AXIS_ORDER.map((axisId) => {
                      const axis = result.mbtiLike.axes[axisId];
                      if (axis.confidence === 'balanced') return null;
                      return (
                        <p key={axisId} className="flex items-start gap-2 text-[11px] font-semibold leading-6 text-navy/65">
                          <BadgeCheck className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-700" />
                          {L(AXIS_META[axisId].poles[axis.winner].insight, lang)}
                        </p>
                      );
                    })}
                  </div>
                </Card>

                <Card>
                  <SectionTitle>{L(UI.traitsLabel, lang)}</SectionTitle>
                  <div className="space-y-3">
                    {TRAIT_ORDER.map((key) => {
                      const data = key === 'H' ? result.hexaco.H : result.bigFive[key];
                      if (!data) return null;
                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-black text-navy">{L(TRAIT_META[key].label, lang)}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                              data.level === 'high'
                                ? 'bg-emerald-700 text-white'
                                : data.level === 'medium'
                                  ? 'bg-gold/20 text-[#8a6c33]'
                                  : 'bg-navy/[0.05] text-navy/55'
                            }`}>
                              {L(LEVEL_LABELS[data.level], lang)}
                            </span>
                          </div>
                          <div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-navy/[0.06]">
                            <motion.span
                              className="absolute inset-y-0 start-0 rounded-full bg-gradient-to-r from-emerald-500 to-gold"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(8, data.pct)}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                            />
                          </div>
                          <p className="mt-1 text-[10px] font-semibold leading-5 text-navy/50">{L(TRAIT_META[key].blurb, lang)}</p>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <Card>
                  <SectionTitle>{L(UI.learningEnvLabel, lang)}</SectionTitle>
                  <div className="space-y-4">
                    {Object.entries(LEARNING_ENV).map(([key, spec]) => (
                      <SpectrumRow key={key} spec={spec} data={result.learningEnvironment[key]} lang={lang} />
                    ))}
                  </div>
                </Card>
              </>
            )}

            {/* ════════ INTERESTS ════════ */}
            {isDeep && tab === 'interests' && (
              <>
                <Card>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <SectionTitle>{L(UI.riasecCodeLabel, lang)}</SectionTitle>
                    <span className="font-mono text-base font-black tracking-[0.2em] text-emerald-700">{result.riasec.code}</span>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(result.riasec.scores).map(([letter, pct]) => (
                      <div key={letter} className="flex items-center gap-2.5">
                        <span className={`w-5 text-center font-mono text-[11px] font-black ${result.riasec.top.includes(letter) ? 'text-emerald-700' : 'text-navy/40'}`}>
                          {letter}
                        </span>
                        <span className="w-28 truncate text-[10px] font-bold text-navy/55">{L(RIASEC_LETTER_LABELS[letter], lang)}</span>
                        <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-navy/[0.06]">
                          <motion.span
                            className={`absolute inset-y-0 start-0 rounded-full ${result.riasec.top.includes(letter) ? 'bg-gradient-to-r from-emerald-500 to-gold' : 'bg-navy/15'}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(6, pct)}%` }}
                            transition={{ duration: 0.6 }}
                          />
                        </span>
                        <span className="w-8 text-end text-[10px] font-black text-navy/50">{pct}%</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Card>
                    <SectionTitle>{L(UI.topInterestsLabel, lang)}</SectionTitle>
                    <div className="flex flex-wrap gap-1.5">
                      {result.accaTop.map((cat, i) => (
                        <span key={cat.key} className={`rounded-full px-2.5 py-1 text-[10px] font-black ${i === 0 ? 'bg-emerald-700 text-white' : 'bg-navy/[0.05] text-navy'}`}>
                          {L(ACCA_CATEGORY_LABELS[cat.key], lang)}
                        </span>
                      ))}
                    </div>
                  </Card>
                  <Card>
                    <SectionTitle>{L(UI.motivationsLabel, lang)}</SectionTitle>
                    <div className="flex flex-wrap gap-1.5">
                      {result.motivTop.map((m) => (
                        <span key={m} className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[10px] font-black text-[#8a6c33]">
                          {L(MOTIVATION_LABELS[m], lang)}
                        </span>
                      ))}
                    </div>
                  </Card>
                </div>

                {result.strengthsTop.length > 0 && (
                  <Card>
                    <SectionTitle>{L(UI.strengthsChipsLabel, lang)}</SectionTitle>
                    <div className="flex flex-wrap gap-1.5">
                      {result.strengthsTop.map((s) => (
                        <span key={s.key} className="rounded-full bg-emerald-600/10 px-2.5 py-1 text-[10px] font-black text-emerald-800">
                          {L(ACADEMIC_STRENGTH_LABELS[s.key], lang)}
                        </span>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}

            {/* ════════ MAJOR MATCH ════════ */}
            {tab === 'majors' || !isDeep ? (
              <>
                <div>
                  <SectionTitle>{L(UI.recommendedMajorsLabel, lang)}</SectionTitle>
                  <div className="space-y-2.5">
                    {result.recommendedMajors.map((rec, i) => (
                      <RecommendedMajorCard
                        key={rec.majorId}
                        majorId={rec.majorId}
                        match={rec.match}
                        lang={lang}
                        index={i}
                        detailed={isDeep}
                      />
                    ))}
                  </div>
                </div>

                {isDeep && result.cautionMajors?.length > 0 && (
                  <Card tint="border-navy/10 bg-navy/[0.03]">
                    <SectionTitle>{L(UI.cautionPathsLabel, lang)}</SectionTitle>
                    <p className="mb-2.5 text-[11px] font-semibold leading-6 text-navy/60">{L(CAUTION_INTRO, lang)}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.cautionMajors.map((c) => {
                        const major = getMajor(c.majorId);
                        return major ? (
                          <span key={c.majorId} className="rounded-full border border-navy/10 bg-white/70 px-2.5 py-1 text-[10px] font-black text-navy/60">
                            {L(major.name, lang)}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </Card>
                )}
              </>
            ) : null}

            {/* ════════ ADMISSION FIT ════════ */}
            {isDeep && tab === 'admission' && (
              <>
                <Card tint="border-emerald-700/15 bg-emerald-600/[0.055]">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                    <div>
                      <p className="text-[11px] font-black text-navy">{L(UI.admissionRealityTitle, lang)}</p>
                      <p className="mt-1 text-[11px] font-semibold leading-6 text-navy/65">
                        {L(REALITY_NOTES[result.reality] || REALITY_NOTES.balanced, lang)}
                      </p>
                    </div>
                  </div>
                </Card>

                {result.highCostRecommended && result.reality !== 'competitive' && (
                  <Card tint="border-gold/25 bg-gold/[0.06]">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[#a8853f]" />
                      <p className="text-[11px] font-semibold leading-6 text-navy/65">{L(HIGH_COST_ADDENDUM, lang)}</p>
                    </div>
                  </Card>
                )}

                <Card>
                  <p className="text-[11px] font-semibold leading-6 text-navy/60">{L(UI.admissionRealityNote, lang)}</p>
                </Card>
              </>
            )}

            {/* ════════ NEXT STEPS ════════ */}
            {isDeep && tab === 'next' && (
              <Card>
                <SectionTitle>{L(UI.nextStepsLabel, lang)}</SectionTitle>
                <div className="space-y-2">
                  {nextSteps.map((step) => {
                    const Icon = step.icon;
                    return (
                      <button
                        key={step.key}
                        type="button"
                        onClick={step.run}
                        className={`flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-[12px] font-black transition ${
                          step.primary
                            ? 'bg-emerald-700 text-white shadow-[0_8px_26px_rgba(5,150,105,0.35)] hover:bg-emerald-800'
                            : 'border border-navy/10 bg-white text-navy hover:border-gold/50'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {step.label}
                      </button>
                    );
                  })}
                </div>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ---- Always-visible guidance footer ---- */}
        <div className="mt-4 space-y-2 rounded-2xl bg-navy/[0.04] px-4 py-3">
          <p className="text-[11px] font-semibold leading-6 text-navy/60">{L(UI.resultExplanation, lang)}</p>
          <p className="border-t border-navy/[0.06] pt-2 text-[10px] font-semibold leading-5 text-navy/48">
            {L(UI.resultDisclaimer, lang)}
          </p>
        </div>
      </div>
    </div>
  );
}
