import { useEffect } from 'react';
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
    description:
      'از شناخت هدفتان تا انتخاب رشته، بررسی مسیر پذیرش و آماده‌سازی مدارک؛ قدم‌به‌قدم با یک دستیار مرکزی.',
    href: '/smart-apply',
    status: 'آماده شروع',
    statusTone: 'live',
    cta: 'شروع Smart Apply',
    note: 'بدون نیاز به ثبت‌نام اولیه',
    icon: Bot,
    benefits: ['گفت‌وگوی شخصی‌سازی‌شده', 'راهنمایی مرحله‌به‌مرحله'],
  },
  {
    id: 'transfer',
    eyebrow: 'AI TRANSFER PATHWAY',
    title: 'AI Transfer',
    PersianTitle: 'مسیر هوشمند انتقالی',
    description:
      'یک فضای تخصصی برای بررسی مسیر انتقال، تطبیق اولیه واحدها و شناخت گزینه‌های مناسب دانشگاهی.',
    href: '/ai-transfer',
    status: 'آماده ورود',
    statusTone: 'preview',
    cta: 'ورود به AI Transfer',
    note: 'ارزیابی هوشمند مسیر انتقالی',
    icon: Route,
    benefits: ['نقشه انتقال دانشگاهی', 'چک‌لیست مدارک و واحدها'],
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

function ServiceCard({ service, index }) {
  const Icon = service.icon;

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
          {service.status}
        </span>
      </div>

      <div className="gateway-service-copy">
        <p className="gateway-eyebrow">{service.eyebrow}</p>
        <h2>
          <span>{service.title}</span>
          <small>{service.PersianTitle}</small>
        </h2>
        <p className="gateway-service-description">{service.description}</p>
      </div>

      <ServicePreviewArt service={service.id} />

      <div className="gateway-benefit-row">
        {service.benefits.map((benefit) => (
          <span key={benefit}>
            <CircleCheck className="h-3.5 w-3.5" />
            {benefit}
          </span>
        ))}
      </div>

      <a href={service.href} className="gateway-service-action">
        <span>
          <strong>{service.cta}</strong>
          <small>{service.note}</small>
        </span>
        <span className="gateway-action-arrow" aria-hidden="true">
          <ArrowLeft className="h-4.5 w-4.5" />
        </span>
      </a>
    </motion.article>
  );
}

export default function ServiceGateway() {
  useEffect(() => {
    document.documentElement.lang = 'fa';
    document.documentElement.dir = 'rtl';
    document.title = 'ACCA AI Services | مسیر هوشمند تحصیل';
  }, []);

  return (
    <div dir="rtl" className="gateway-page">
      <AmbientStage />

      <div className="gateway-shell">
        <GatewayHeader />

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
              یک مقصد،
              <span> دو مسیر هوشمند</span>
            </h1>
            <p>
              سرویس مورد نیازتان را انتخاب کنید. هر مسیر، فضای کاری و راهنمای هوشمند
              اختصاصی خودش را دارد.
            </p>
            <div className="gateway-trust-row" aria-label="ویژگی‌های تجربه">
              <span><ShieldCheck className="h-3.5 w-3.5" /> شروع امن و بدون ورود</span>
              <span><GraduationCap className="h-3.5 w-3.5" /> طراحی‌شده برای دانشجویان بین‌المللی</span>
            </div>
          </motion.section>

          <section className="gateway-services" aria-label="انتخاب سرویس آکا">
            {services.map((service, index) => (
              <ServiceCard key={service.id} service={service} index={index} />
            ))}
          </section>
        </main>

        <footer className="gateway-footer">
          <span>ACCA EDU · AI-guided international education</span>
          <span>هر تصمیم مهم، با یک مسیر روشن‌تر شروع می‌شود.</span>
        </footer>
      </div>
    </div>
  );
}
