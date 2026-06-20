import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bot,
  CircleCheck,
  GraduationCap,
  Route,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import GatewayHeader from './GatewayHeader';
import ServicePreviewArt from './ServicePreviewArt';
import { readStoredLang, subscribeStoredLang, writeStoredLang } from '../../lib/lang';

const particles = [
  { left: '7%', top: '21%', size: 5, delay: '0s' },
  { left: '15%', top: '72%', size: 3, delay: '1.8s' },
  { left: '30%', top: '10%', size: 4, delay: '3s' },
  { left: '52%', top: '84%', size: 5, delay: '1.1s' },
  { left: '73%', top: '15%', size: 3, delay: '2.4s' },
  { left: '88%', top: '64%', size: 4, delay: '.7s' },
  { left: '95%', top: '30%', size: 2, delay: '3.5s' },
];

const services = [
  {
    id: 'smart',
    eyebrow: 'AI ADMISSION ASSISTANT',
    title: 'Smart Apply',
    PersianTitle: 'دستیار هوشمند پذیرش',
    englishTitle: 'AI admission assistant',
    description:
      'از شناخت هدفتان تا انتخاب رشته، بررسی مسیر پذیرش و آماده‌سازی مدارک؛ قدم‌به‌قدم با یک دستیار مرکزی.',
    descriptionEn:
      'From understanding your goal to major selection, admission guidance and document preparation, one central assistant guides the journey.',
    href: '/smart-apply',
    status: 'آماده شروع',
    statusEn: 'Ready to start',
    statusTone: 'live',
    cta: 'شروع Smart Apply',
    ctaEn: 'Start Smart Apply',
    note: 'بدون نیاز به ثبت‌نام اولیه',
    noteEn: 'No account required to begin',
    icon: Bot,
    benefits: ['گفت‌وگوی شخصی‌سازی‌شده', 'راهنمایی مرحله‌به‌مرحله'],
    benefitsEn: ['Personalized conversation', 'Step-by-step guidance'],
  },
  {
    id: 'transfer',
    eyebrow: 'AI TRANSFER PATHWAY',
    title: 'AI Transfer',
    PersianTitle: 'مسیر هوشمند انتقالی',
    englishTitle: 'Smart transfer pathway',
    description:
      'یک فضای تخصصی برای بررسی مسیر انتقال، تطبیق اولیه واحدها و شناخت گزینه‌های مناسب دانشگاهی.',
    descriptionEn:
      'A focused workspace for transfer eligibility, preliminary course matching and clearer university options.',
    href: '/ai-transfer',
    status: 'آماده ورود',
    statusEn: 'Ready to enter',
    statusTone: 'preview',
    cta: 'ورود به AI Transfer',
    ctaEn: 'Enter AI Transfer',
    note: 'ارزیابی هوشمند مسیر انتقالی',
    noteEn: 'AI-guided transfer review',
    icon: Route,
    benefits: ['نقشه انتقال دانشگاهی', 'چک‌لیست مدارک و واحدها'],
    benefitsEn: ['University transfer map', 'Documents and credits checklist'],
  },
];

function AmbientStage() {
  return (
    <div className="gateway-ambient" aria-hidden="true">
      <div className="gateway-grid" />
      <div className="gateway-orb gateway-orb--gold" />
      <div className="gateway-orb gateway-orb--emerald" />
      <div className="gateway-orb gateway-orb--violet" />
      <svg className="gateway-constellation" viewBox="0 0 1200 650" preserveAspectRatio="none">
        <path d="M-80 500C180 430 186 135 468 181s299 340 545 239c119-49 132-202 276-282" />
        <path d="M-20 260C197 310 296 49 552 109s250 307 521 189c79-34 125-101 177-184" />
      </svg>
      {particles.map((particle, index) => (
        <span
          key={index}
          className="gateway-particle"
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
            animationDelay: particle.delay,
          }}
        />
      ))}
    </div>
  );
}

function ServiceCard({ service, index, lang }) {
  const Icon = service.icon;
  const fa = lang !== 'en';

  return (
    <motion.article
      className={`gateway-service-card gateway-service-card--${service.id}`}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.18 + index * 0.12 }}
    >
      <div className="gateway-card-shine" aria-hidden="true" />
      <div className="gateway-service-topline">
        <span className="gateway-service-icon">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <span className={`gateway-status gateway-status--${service.statusTone}`}>
          <span className="gateway-status-dot" />
          {fa ? service.status : service.statusEn}
        </span>
      </div>

      <div className="gateway-service-copy">
        <p className="gateway-eyebrow">{service.eyebrow}</p>
        <h2>
          <span>{service.title}</span>
          <small>{fa ? service.PersianTitle : service.englishTitle}</small>
        </h2>
        <p className="gateway-service-description">{fa ? service.description : service.descriptionEn}</p>
      </div>

      <ServicePreviewArt service={service.id} />

      <div className="gateway-benefit-row">
        {(fa ? service.benefits : service.benefitsEn).map((benefit) => (
          <span key={benefit}>
            <CircleCheck className="h-3.5 w-3.5" />
            {benefit}
          </span>
        ))}
      </div>

      <a href={service.href} className="gateway-service-action">
        <span>
          <strong>{fa ? service.cta : service.ctaEn}</strong>
          <small>{fa ? service.note : service.noteEn}</small>
        </span>
        <span className="gateway-action-arrow" aria-hidden="true">
          <ArrowLeft className="h-4.5 w-4.5" />
        </span>
      </a>
    </motion.article>
  );
}

export default function ServiceGateway() {
  const [theme, setTheme] = useState(() => {
    if (typeof localStorage === 'undefined') return 'light';
    return localStorage.getItem('acca-gateway-theme') === 'dark' ? 'dark' : 'light';
  });
  const [lang, setLang] = useState(() => {
    if (typeof localStorage === 'undefined') return 'fa';
    return readStoredLang({ fallback: 'fa', allowed: ['fa', 'en'] });
  });
  const fa = lang !== 'en';

  const handleLangChange = useCallback((nextLang) => {
    const normalized = nextLang === 'en' ? 'en' : 'fa';
    setLang(normalized);
    writeStoredLang(normalized, { allowed: ['fa', 'en'] });
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = fa ? 'rtl' : 'ltr';
    document.title = fa
      ? 'ACCA AI Services | مسیر هوشمند تحصیل'
      : 'ACCA AI Services | Digital education experience';
  }, [fa, lang]);

  useEffect(() => { try { localStorage.setItem('acca-gateway-theme', theme); } catch { /* ignore */ } }, [theme]);
  useEffect(() => subscribeStoredLang((nextLang) => {
    const normalized = nextLang === 'en' ? 'en' : 'fa';
    setLang((current) => (current === normalized ? current : normalized));
  }, { allowed: ['fa', 'en'] }), []);

  return (
    <div dir={fa ? 'rtl' : 'ltr'} className="gateway-page" data-theme={theme}>
      <AmbientStage />

      <div className="gateway-shell">
        <GatewayHeader
          lang={lang}
          theme={theme}
          showPreferences
          onLangChange={handleLangChange}
          onThemeToggle={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
        />

        <main className="gateway-main">
          <motion.section
            className="gateway-hero"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65 }}
          >
            <div className="gateway-hero-badge">
              <Sparkles className="h-3.5 w-3.5" />
              <span>ACCA DIGITAL EXPERIENCE</span>
            </div>
            <h1>
              {fa ? 'یک مقصد،' : 'One destination,'}
              <span>{fa ? ' دو مسیر هوشمند' : ' two intelligent paths'}</span>
            </h1>
            <p>
              {fa
                ? 'سرویس مورد نیازتان را انتخاب کنید. هر مسیر، فضای کاری و راهنمای هوشمند اختصاصی خودش را دارد.'
                : 'Choose the service you need. Each path has its own focused workspace and intelligent guidance experience.'}
            </p>
            <div className="gateway-trust-row" aria-label={fa ? 'ویژگی‌های تجربه' : 'Experience features'}>
              <span><ShieldCheck className="h-3.5 w-3.5" /> {fa ? 'شروع امن و بدون ورود' : 'Secure start without login'}</span>
              <span><GraduationCap className="h-3.5 w-3.5" /> {fa ? 'طراحی‌شده برای دانشجویان بین‌المللی' : 'Designed for international students'}</span>
            </div>
          </motion.section>

          <section className="gateway-services" aria-label={fa ? 'انتخاب سرویس آکا' : 'Choose an ACCA service'}>
            {services.map((service, index) => (
              <ServiceCard key={service.id} service={service} index={index} lang={lang} />
            ))}
          </section>
        </main>

        <footer className="gateway-footer">
          <span>ACCA EDU · AI-guided international education</span>
          <span>{fa ? 'هر تصمیم مهم، با یک مسیر روشن‌تر شروع می‌شود.' : 'Every important decision starts with a clearer path.'}</span>
        </footer>
      </div>
    </div>
  );
}
