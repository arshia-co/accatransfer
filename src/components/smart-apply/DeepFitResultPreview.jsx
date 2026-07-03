import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  BadgeCheck,
  BrainCircuit,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Compass,
  GraduationCap,
  Globe2,
  Languages,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  WalletCards,
} from 'lucide-react';
import { L } from '../../lib/lang';
import { useAccaMajorUrl } from '../../lib/useAccaMajorUrl';

const SHOW_PROGRAMS_LABEL = {
  fa: 'نمایش دانشگاه‌ها و شهریه‌ها',
  en: 'Show universities & tuition',
  tr: 'Üniversite ve ücretleri gör',
  ar: 'عرض الجامعات والرسوم',
};
import {
  ACCA_CATEGORY_LABELS,
  ACADEMIC_STRENGTH_LABELS,
  MOTIVATION_LABELS,
} from '../../data/majorQuestions';

const TABS = [
  { id: 'profile', icon: BrainCircuit, fa: 'امضای تحصیلی', en: 'Academic signature' },
  { id: 'majors', icon: Compass, fa: 'مسیرهای پیشنهادی', en: 'Recommended paths' },
  { id: 'reality', icon: ShieldCheck, fa: 'واقعیت مسیر', en: 'Path reality' },
];

const FIT_LABELS = {
  strong: { fa: 'تناسب قوی', en: 'Strong fit' },
  unexpected: { fa: 'تناسب غیرمنتظره', en: 'Unexpected fit' },
  stretch: { fa: 'مسیر بلندپروازانه', en: 'High-potential stretch' },
};

const IDENTITY_LABELS = {
  Expert: { fa: 'متخصص', en: 'Expert' },
  Founder: { fa: 'سازنده و بنیان‌گذار', en: 'Founder-builder' },
  Creator: { fa: 'خالق', en: 'Creator' },
  Leader: { fa: 'رهبر', en: 'Leader' },
  Researcher: { fa: 'پژوهشگر', en: 'Researcher' },
  Helper: { fa: 'یاری‌گر', en: 'Helper' },
};

const PROFILE_BRIEF = {
  title: { fa: 'Educational Fit Profile کامل‌تر', en: 'Fuller Educational Fit Profile' },
  glossary: { fa: 'واژه‌نامه پروفایل', en: 'Profile glossary' },
  learning: { fa: 'سبک یادگیری', en: 'Learning style' },
  work: { fa: 'محیط کاری مناسب', en: 'Preferred work environment' },
  social: { fa: 'تعامل اجتماعی', en: 'Social interaction' },
  risk: { fa: 'ریسک‌پذیری', en: 'Risk tolerance' },
  budget: { fa: 'بودجه و محدودیت مالی', en: 'Budget and financial limits' },
  language: { fa: 'زبان تحصیل', en: 'Study language' },
  countries: { fa: 'کشورهای مناسب', en: 'Suitable countries' },
  confidence: { fa: 'اطمینان سیستم', en: 'System confidence' },
  counselor: { fa: 'مشاوره انسانی', en: 'Human counseling' },
};

function pctOf(result, key) {
  return Number(result?.lifestyleFit?.[key]?.pct || 0);
}

function averageMatch(result) {
  const majors = Array.isArray(result?.recommendedMajors) ? result.recommendedMajors.slice(0, 4) : [];
  if (!majors.length) return null;
  return Math.round(majors.reduce((sum, item) => sum + Number(item.match || 0), 0) / majors.length);
}

function deepBriefItems(result, lang) {
  const fa = lang === 'fa';
  const highHuman = pctOf(result, 'HumanIntensity') >= 55;
  const highIndependence = pctOf(result, 'Independence') >= 55;
  const highRisk = pctOf(result, 'Risk') >= 58;
  const financeAware = (result.motivationalCore || []).some((item) => ['Income', 'Security', 'Lifestyle'].includes(item.key));
  const match = averageMatch(result);

  return [
    {
      key: 'learning',
      icon: BookOpen,
      label: PROFILE_BRIEF.learning,
      text: fa
        ? `${result.cognitiveStyle?.mbtiLike?.type || ''}-like · ${result.cognitiveStyle?.topInterestCode || ''}. این یک خلاصه ترجیح مطالعه است، نه نوع شخصیت قطعی.`
        : `${result.cognitiveStyle?.mbtiLike?.type || ''}-like · ${result.cognitiveStyle?.topInterestCode || ''}. This is a study-preference summary, not a fixed personality type.`,
    },
    {
      key: 'work',
      icon: BriefcaseBusiness,
      label: PROFILE_BRIEF.work,
      text: fa
        ? highIndependence
          ? 'فضای پروژه‌ای، مستقل و دارای آزادی تصمیم برای شما مناسب‌تر دیده می‌شود.'
          : 'فضای ساختارمند، روشن و دارای مسیر مرحله‌ای برای شما امن‌تر دیده می‌شود.'
        : highIndependence
          ? 'Project-based, independent environments with room for choice look more suitable.'
          : 'Structured, clear environments with staged progress look safer.',
    },
    {
      key: 'social',
      icon: Users,
      label: PROFILE_BRIEF.social,
      text: fa
        ? highHuman
          ? 'تعامل انسانی بخشی از انرژی مسیر شماست؛ رشته‌های ارتباطی یا انسان‌محور ارزش بررسی دارند.'
          : 'زمان تمرکز عمیق و کار تحلیلی برای کیفیت تصمیم شما مهم است.'
        : highHuman
          ? 'Human interaction appears to energize your path; people-facing fields are worth reviewing.'
          : 'Deep-focus time and analytical work appear important for your decision quality.',
    },
    {
      key: 'risk',
      icon: TrendingUp,
      label: PROFILE_BRIEF.risk,
      text: fa
        ? highRisk
          ? 'با مسیرهای نو و رقابتی راحت‌تر هستید، اما باید هزینه و ظرفیت واقعی دانشگاه چک شود.'
          : 'مسیرهای قابل‌پیش‌بینی‌تر و کم‌ریسک‌تر احتمالاً تصمیم امن‌تری می‌سازند.'
        : highRisk
          ? 'You seem more comfortable with novel or competitive paths, but cost and university capacity must be checked.'
          : 'More predictable, lower-risk paths are likely safer decisions.',
    },
    {
      key: 'budget',
      icon: WalletCards,
      label: PROFILE_BRIEF.budget,
      text: fa
        ? financeAware
          ? 'پاسخ‌ها نشان می‌دهد شهریه، امنیت مالی یا بازگشت سرمایه باید در انتخاب نهایی وزن جدی داشته باشد.'
          : 'بودجه باید در مرحله پذیرش با شهریه، بورسیه و برنامه پرداخت هر دانشگاه تطبیق داده شود.'
        : financeAware
          ? 'Your answers suggest tuition, financial security, or return on investment should carry real weight.'
          : 'Budget should be matched later against tuition, scholarships, and payment plans for each university.',
    },
    {
      key: 'language',
      icon: Languages,
      label: PROFILE_BRIEF.language,
      text: fa
        ? 'انگلیسی یا ترکی، بسته به رشته و دانشگاه؛ قبل از ارسال رسمی باید دقیق تأیید شود.'
        : 'English or Turkish depending on the program and university; confirm before formal submission.',
    },
    {
      key: 'countries',
      icon: Globe2,
      label: PROFILE_BRIEF.countries,
      text: fa ? 'ترکیه و قبرس شمالی؛ محدوده اصلی خدمات پذیرش آکا.' : 'Turkey and Northern Cyprus, the main ACCA admission service scope.',
    },
    {
      key: 'confidence',
      icon: ShieldCheck,
      label: PROFILE_BRIEF.confidence,
      text: match
        ? (fa ? `میانگین تطابق مسیرهای برتر حدود ${match}٪ است؛ تصمیم نهایی باید انسانی بررسی شود.` : `Top-path average fit is about ${match}%; the final decision still needs human review.`)
        : (fa ? 'اطمینان سیستم پس از تکمیل گزینه‌های دانشگاه و مدارک دقیق‌تر می‌شود.' : 'System confidence improves after university and document details are confirmed.'),
    },
    {
      key: 'counselor',
      icon: Target,
      label: PROFILE_BRIEF.counselor,
      text: fa
        ? 'مشاور انسانی باید نتیجه را با معدل، بودجه، زبان، مدارک و ظرفیت واقعی دانشگاه تطبیق دهد.'
        : 'A human counselor should validate this against grades, budget, language, documents, and real university capacity.',
    },
  ];
}

function Insight({ icon: Icon, title, children, tone = 'emerald' }) {
  const style = tone === 'gold'
    ? 'border-gold/25 bg-gold/[0.07]'
    : tone === 'warning'
      ? 'border-amber-500/20 bg-amber-500/[0.06]'
      : 'border-emerald-700/15 bg-emerald-600/[0.05]';
  return (
    <div className={`rounded-[18px] border p-4 ${style}`}>
      <div className="flex items-start gap-2.5">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone === 'warning' ? 'text-amber-700' : 'text-emerald-700'}`} />
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-navy/45">{title}</p>
          <p className="mt-1 text-[11px] font-semibold leading-6 text-navy/70">{children}</p>
        </div>
      </div>
    </div>
  );
}

function DeepProfileBrief({ result, lang }) {
  const items = deepBriefItems(result, lang);
  return (
    <section className="rounded-[22px] border border-emerald-700/15 bg-gradient-to-br from-emerald-600/[0.06] via-white/78 to-gold/[0.06] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-navy/45">{L(PROFILE_BRIEF.title, lang)}</p>
          <p className="mt-1 text-[11px] font-semibold leading-6 text-navy/62">
            {lang === 'fa'
              ? 'این خلاصه نشان می‌دهد چرا مسیرهای پیشنهادی به پاسخ‌های شما نزدیک شده‌اند.'
              : 'This summary shows why the suggested paths moved closer to your answers.'}
          </p>
        </div>
        <a
          href="/smart-apply/glossary"
          className="inline-flex items-center gap-1.5 rounded-full border border-navy/10 bg-white px-3 py-1.5 text-[10px] font-black text-navy/65 transition hover:border-gold/45 hover:text-navy"
        >
          <BookOpen className="h-3.5 w-3.5 text-gold" />
          {L(PROFILE_BRIEF.glossary, lang)}
        </a>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="rounded-2xl border border-white/85 bg-white/76 p-3">
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
    </section>
  );
}

function DeepFitMajorCard({ major, index, lang }) {
  const programsUrl = useAccaMajorUrl(major.id, L(major.name, 'en'));
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-[19px] border border-white bg-white/78 p-4 shadow-[0_8px_28px_rgba(7,26,61,0.05)]"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600/15 to-gold/20 text-emerald-800">
          <GraduationCap className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-[12px] font-black leading-6 text-navy">{L(major.name, lang)}</h4>
            <span className="rounded-full bg-navy px-2.5 py-1 text-[9px] font-black text-gold">
              {major.match}% · {L(FIT_LABELS[major.fitType], lang)}
            </span>
          </div>
          <p className="mt-1 text-[11px] font-semibold leading-6 text-navy/60">{L(major.reason, lang)}</p>
        </div>
      </div>
      <a
        href={programsUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-navy px-3 py-2.5 text-[11px] font-black text-cream transition hover:brightness-110"
      >
        <Building2 className="h-3.5 w-3.5 text-gold" />
        {L(SHOW_PROGRAMS_LABEL, lang)}
      </a>
    </motion.article>
  );
}

export default function DeepFitResultPreview({ result, lang }) {
  const [tab, setTab] = useState('profile');
  if (!result) return null;

  return (
    <div className="overflow-hidden rounded-[26px] border border-gold/25 bg-gradient-to-b from-white via-white/90 to-emerald-700/[0.045] shadow-[0_28px_80px_rgba(7,26,61,0.13)]">
      <div className="relative overflow-hidden border-b border-navy/[0.06] bg-navy px-4 py-5 text-white sm:px-5">
        <div className="absolute -end-10 -top-16 h-40 w-40 rounded-full bg-gold/25 blur-3xl" />
        <div className="relative flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-gold ring-1 ring-white/15">
            <Sparkles className="h-6 w-6" />
          </span>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-gold">EDUCATIONAL FIT PROFILE</p>
            <h3 className="mt-1 text-lg font-black leading-7">{L(result.signature?.label, lang)}</h3>
            <p className="mt-1 text-[11px] font-semibold text-white/62">
              {result.questionCount} {lang === 'fa' ? 'پاسخ تحلیل‌شده' : 'answers analyzed'} · {result.cognitiveStyle?.topInterestCode}
            </p>
          </div>
        </div>

        <div className="relative mt-4 flex gap-1.5 overflow-x-auto">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-black transition ${
                  active ? 'bg-white text-navy' : 'bg-white/[0.07] text-white/65 hover:bg-white/12'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${active ? 'text-emerald-700' : 'text-gold'}`} />
                {lang === 'fa' ? item.fa : item.en}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            {tab === 'profile' && (
              <>
                <DeepProfileBrief result={result} lang={lang} />

                <Insight icon={Target} title={lang === 'fa' ? 'الگوی عمیق' : 'Deep pattern'}>
                  {L(result.deepPattern, lang)}
                </Insight>
                <Insight icon={Lightbulb} title={lang === 'fa' ? 'نقطه قوت پنهان' : 'Hidden strength'} tone="gold">
                  {L(result.hiddenStrength, lang)}
                </Insight>
                <Insight icon={AlertTriangle} title={lang === 'fa' ? 'هشدار تناسب' : 'Fit warning'} tone="warning">
                  {L(result.riskWarning, lang)}
                </Insight>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <section className="rounded-[18px] border border-white bg-white/75 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-navy/40">
                      {lang === 'fa' ? 'حوزه‌های علاقه برتر' : 'Top interest areas'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {result.topInterestAreas?.map((item, index) => (
                        <span key={item.key} className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                          index === 0 ? 'bg-emerald-700 text-white' : 'bg-navy/[0.05] text-navy/65'
                        }`}>
                          {L(ACCA_CATEGORY_LABELS[item.key], lang)}
                        </span>
                      ))}
                    </div>
                  </section>
                  <section className="rounded-[18px] border border-white bg-white/75 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-navy/40">
                      {lang === 'fa' ? 'هسته انگیزشی' : 'Motivational core'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {result.motivationalCore?.map((item) => (
                        <span key={item.key} className="rounded-full bg-gold/12 px-2.5 py-1 text-[10px] font-black text-[#84652f]">
                          {L(MOTIVATION_LABELS[item.key], lang)}
                        </span>
                      ))}
                    </div>
                  </section>
                </div>

                <section className="rounded-[18px] border border-white bg-white/75 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-navy/40">
                    {lang === 'fa' ? 'توان‌های تحصیلی و تصویر آینده' : 'Academic strengths & future identity'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {result.academicStrengths?.map((item) => (
                      <span key={item.key} className="rounded-full bg-emerald-600/10 px-2.5 py-1 text-[10px] font-black text-emerald-800">
                        {L(ACADEMIC_STRENGTH_LABELS[item.key], lang)}
                      </span>
                    ))}
                    {result.identityProjection?.map((item) => (
                      <span key={item.key} className="rounded-full border border-navy/10 px-2.5 py-1 text-[10px] font-black text-navy/60">
                        {L(IDENTITY_LABELS[item.key], lang)}
                      </span>
                    ))}
                  </div>
                </section>
              </>
            )}

            {tab === 'majors' && (
              <>
                <p className="text-[11px] font-semibold leading-6 text-navy/60">
                  {lang === 'fa'
                    ? 'این فهرست عمداً از عنوان‌های خیلی کلی عبور می‌کند و مسیرهای دقیق‌تر را نشان می‌دهد. موجودبودن هر رشته در دانشگاه مقصد جداگانه بررسی می‌شود.'
                    : 'This list intentionally moves beyond broad labels toward more precise paths. Actual program availability is checked separately.'}
                </p>
                {result.recommendedMajors?.map((major, index) => (
                  <DeepFitMajorCard key={major.id} major={major} index={index} lang={lang} />
                ))}
              </>
            )}

            {tab === 'reality' && (
              <>
                <Insight icon={ShieldCheck} title={lang === 'fa' ? 'یادداشت واقعیت پذیرش' : 'Admission reality'}>
                  {L(result.admissionRealityNote, lang)}
                </Insight>
                <section className="rounded-[18px] border border-navy/10 bg-white/70 p-4">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-emerald-700" />
                    <p className="text-[10px] font-black uppercase tracking-wider text-navy/45">
                      {lang === 'fa' ? 'مسیرهای نیازمند بررسی بیشتر' : 'Paths needing extra validation'}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {result.cautionMajors?.map((major) => (
                      <span key={major.id} className="rounded-full border border-navy/10 bg-white px-2.5 py-1 text-[10px] font-black text-navy/55">
                        {L(major.name, lang)}
                      </span>
                    ))}
                  </div>
                </section>
                <div className="rounded-[18px] bg-navy px-4 py-3 text-[10px] font-semibold leading-6 text-white/68">
                  {L(result.disclaimer, lang)}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
