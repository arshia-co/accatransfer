import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, BrainCircuit, Compass, Sparkles } from 'lucide-react';
import { L, dirFor, readStoredLang, subscribeStoredLang } from '../../lib/lang';

const COPY = {
  eyebrow: {
    fa: 'ACCA SMART APPLY GLOSSARY',
    en: 'ACCA SMART APPLY GLOSSARY',
  },
  title: {
    fa: 'راهنمای کوتاه مفاهیم پروفایل تحصیلی',
    en: 'Short guide to the educational fit profile',
  },
  lead: {
    fa: 'این صفحه کمک می‌کند بفهمید اصطلاح‌هایی مثل MBTI-inspired، Big Five-style و Educational Fit Profile در Smart Apply چه معنی دارند. این‌ها ابزار تشخیص روان‌شناختی نیستند؛ فقط زبان ساده‌ای برای توضیح ترجیحات یادگیری، علایق و مسیرهای تحصیلی‌اند.',
    en: 'This page explains terms such as MBTI-inspired, Big Five-style, and Educational Fit Profile in Smart Apply. They are not psychological diagnosis tools; they are simple language for describing learning preferences, interests, and academic direction.',
  },
  back: {
    fa: 'بازگشت به Smart Apply',
    en: 'Back to Smart Apply',
  },
};

const TERMS = [
  {
    icon: Compass,
    title: { fa: 'Educational Fit Profile', en: 'Educational Fit Profile' },
    body: {
      fa: 'خلاصه‌ای از علایق تحصیلی، سبک یادگیری، ترجیح محیط کاری، محدودیت‌های واقعی و رشته‌های پیشنهادی بر اساس پاسخ‌های شما.',
      en: 'A summary of academic interests, learning style, preferred work environment, practical constraints, and suggested majors based on your answers.',
    },
  },
  {
    icon: BrainCircuit,
    title: { fa: 'MBTI-inspired یعنی چه؟', en: 'What does MBTI-inspired mean?' },
    body: {
      fa: 'Smart Apply آزمون رسمی MBTI نیست. فقط از ایده‌های ساده مثل تمرکز فردی/تعاملی، واقع‌گرایی/الگومحوری و ساختار/انعطاف استفاده می‌کند تا سبک مطالعه را قابل فهم‌تر کند.',
      en: 'Smart Apply is not an official MBTI test. It only uses simple ideas such as solo/interactive focus, concrete/pattern thinking, and structure/flexibility to explain study preferences.',
    },
  },
  {
    icon: Sparkles,
    title: { fa: 'Big Five-style snapshot', en: 'Big Five-style snapshot' },
    body: {
      fa: 'این بخش چند گرایش عمومی مثل نظم، علاقه به تجربه‌های تازه، تعامل اجتماعی و حساسیت به فشار را به زبان آموزشی توضیح می‌دهد. نتیجه ثابت یا تشخیصی نیست.',
      en: 'This part describes broad tendencies such as structure, openness to new experiences, social interaction, and pressure sensitivity in educational language. It is not fixed or diagnostic.',
    },
  },
  {
    icon: BookOpen,
    title: { fa: 'چرا این رشته پیشنهاد شده؟', en: 'Why was this major suggested?' },
    body: {
      fa: 'هر رشته از چند زاویه بررسی می‌شود: علاقه، توان تحصیلی، سبک یادگیری، واقعیت پذیرش، بودجه، زبان تحصیل و نیاز به بررسی انسانی پیش از تصمیم نهایی.',
      en: 'Each major is reviewed from several angles: interest, academic strengths, learning style, admission reality, budget, study language, and the need for human review before a final decision.',
    },
  },
];

export default function SmartApplyGlossary() {
  const [lang, setLang] = useState(() => readStoredLang({ fallback: 'fa', allowed: ['fa', 'en'] }) || 'fa');

  useEffect(() => subscribeStoredLang((next) => setLang(next === 'fa' ? 'fa' : 'en'), { allowed: ['fa', 'en', 'tr', 'ar'] }), []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dirFor(lang);
    document.title = lang === 'fa' ? 'واژه‌نامه Smart Apply' : 'Smart Apply Glossary';
  }, [lang]);

  return (
    <main dir={dirFor(lang)} className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(198,167,104,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(14,125,96,0.13),transparent_30%),#f8f5ed] px-4 py-8 text-navy">
      <section className="mx-auto max-w-4xl rounded-[34px] border border-white/80 bg-white/72 p-5 shadow-[0_30px_90px_rgba(7,26,61,0.10)] backdrop-blur-2xl sm:p-8">
        <a
          href="/smart-apply"
          className="inline-flex items-center gap-2 rounded-full border border-navy/10 bg-white px-4 py-2 text-[12px] font-black text-navy transition hover:-translate-y-0.5 hover:border-gold/45 hover:shadow-[0_10px_24px_rgba(7,26,61,0.08)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {L(COPY.back, lang)}
        </a>

        <div className="mt-8 max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gold">{L(COPY.eyebrow, lang)}</p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">{L(COPY.title, lang)}</h1>
          <p className="mt-4 text-sm font-semibold leading-8 text-navy/62">{L(COPY.lead, lang)}</p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {TERMS.map((term) => {
            const Icon = term.icon;
            return (
              <article key={L(term.title, 'en')} className="rounded-[24px] border border-white bg-white/76 p-5 shadow-[0_12px_32px_rgba(7,26,61,0.055)]">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700/10 text-emerald-800">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-base font-black">{L(term.title, lang)}</h2>
                <p className="mt-2 text-[13px] font-semibold leading-7 text-navy/62">{L(term.body, lang)}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
