import { useEffect, useState } from 'react';
import {
  Database,
  Globe,
  LayoutGrid,
  LogIn,
  Menu,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { useUI } from '@/lib/ui-context';
import { cn } from '@/lib/utils';
import {
  GUEST_ASSESSMENT_EVENT,
  guestAssessmentProgress,
  readGuestAssessment,
} from '@/lib/guest-assessment';
import accaLogo from '@/assets/acca-logo.png';
import { useAuth } from '../../../auth/AuthContext';

export function Logo({ className }: { className?: string }) {
  return (
    <a
      href="/"
      aria-label="بازگشت به سرویس‌های هوشمند آکا"
      className={cn('flex items-center gap-2 group shrink-0', className)}
    >
      <img
        src={accaLogo}
        alt="ACCA EDU logo"
        className="h-9 sm:h-10 w-auto object-contain select-none"
        draggable={false}
      />
    </a>
  );
}

export function Navbar() {
  const { tr, lang, setLang } = useI18n();
  const { openModal } = useUI();
  const { user, openAuth } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [memoryProgress, setMemoryProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const syncMemory = () => setMemoryProgress(guestAssessmentProgress(readGuestAssessment()));
    syncMemory();
    window.addEventListener(GUEST_ASSESSMENT_EVENT, syncMemory);
    window.addEventListener('storage', syncMemory);
    return () => {
      window.removeEventListener(GUEST_ASSESSMENT_EVENT, syncMemory);
      window.removeEventListener('storage', syncMemory);
    };
  }, []);

  const links = [
    { href: '#product', label: lang === 'fa' ? 'معرفی محصول' : 'Product Overview' },
    { href: '#how', label: tr('navHow') },
    { href: '#students', label: tr('navStudents') },
    { href: '#institutions', label: lang === 'fa' ? 'برای مؤسسات' : 'For Institutions' },
    { href: '#faq', label: tr('navFaq') },
  ];

  const handleAnchor = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    setOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', `/ai-transfer${href}`);
  };

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-500',
        scrolled ? 'py-2.5' : 'py-4',
      )}
    >
      <div
        className={cn(
          'mx-auto max-w-7xl px-4 sm:px-6 transition-all duration-500',
          scrolled && 'px-3 sm:px-4',
        )}
      >
        {/* Always-on glass pill, matching the accaco.com navbar language:
            rounded-full, translucent, blurred, thin warm border. */}
        <div
          className={cn(
            'flex items-center justify-between gap-4 transition-all duration-500 rounded-full border backdrop-blur-xl',
            scrolled
              ? 'border-[color:var(--ta-gold)]/30 bg-white/70 px-4 py-2 ta-shadow-cinema'
              : 'border-white/60 bg-white/45 px-4 py-2.5 shadow-[0_10px_32px_rgba(18,63,88,0.08)]',
          )}
        >
          <Logo />

          <nav className="hidden lg:flex items-center gap-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(event) => handleAnchor(event, link.href)}
                className="px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors relative group"
              >
                {link.label}
                <span className="absolute inset-x-3 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-cyan to-transparent scale-x-0 group-hover:scale-x-100 transition-transform" />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div
              className="hidden sm:inline-flex items-center gap-1 rounded-full border border-[color:var(--ta-gold)]/30 bg-white/70 backdrop-blur p-1 text-[11px] ta-shadow-soft"
              dir="ltr"
            >
              <Globe className="w-3 h-3 text-[color:var(--ta-navy)]/60 ml-1.5 mr-0.5" />
              {(['en', 'fa'] as const).map((locale) => (
                <button
                  key={locale}
                  onClick={() => setLang(locale)}
                  className={cn(
                    'px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold transition-all',
                    lang === locale
                      ? 'bg-gradient-to-b from-[#F3C978] to-[#D9A441] text-[#0B2F42] shadow-[0_4px_14px_-2px_rgba(217,164,65,0.45)]'
                      : 'text-[color:var(--ta-navy)]/70 hover:text-[color:var(--ta-navy)]',
                  )}
                >
                  {locale === 'fa' ? 'فا' : 'EN'}
                </button>
              ))}
              <button
                onClick={() => toast('Turkish language support is coming soon.')}
                className="px-2.5 py-1 rounded-full uppercase tracking-wider font-medium text-[color:var(--ta-navy)]/45 hover:text-[color:var(--ta-navy)]/70 inline-flex items-center gap-1"
              >
                TR <span className="text-[8px] text-[#B98245]">soon</span>
              </button>
            </div>

            <button
              onClick={() => {
                if (user) {
                  window.location.href = '/account';
                  return;
                }
                openAuth('ai_transfer', { returnTo: '/account' });
              }}
              className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-[color:var(--ta-gold)]/40 bg-white/60 backdrop-blur text-[#0B2F42] text-[12.5px] font-medium px-3.5 py-2 hover:bg-white/80 transition"
            >
              <LogIn className="w-3.5 h-3.5" /> {user ? (lang === 'fa' ? 'پنل من' : 'My Panel') : (lang === 'fa' ? 'ورود / ثبت‌نام' : 'Login / Sign Up')}
            </button>
            <button
              onClick={() => openModal('memory')}
              className="relative hidden md:inline-flex items-center gap-1.5 rounded-full border border-[color:var(--ta-gold)]/35 bg-white/60 backdrop-blur text-[#0B2F42] text-[12.5px] font-medium px-3.5 py-2 hover:bg-white/80 transition"
            >
              <Database className="w-3.5 h-3.5 text-[#B98245]" />
              {lang === 'fa' ? 'حافظه فرم' : 'Form Memory'}
              {memoryProgress > 0 && (
                <span className="ms-1 rounded-full bg-[color:var(--ta-gold)]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#0B2F42]">
                  {memoryProgress}%
                </span>
              )}
            </button>

            <button
              onClick={() => openModal('assessment')}
              className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#D6A46B] to-[#C8965F] text-[#0B2F42] text-[12.5px] font-semibold px-4 py-2 ring-1 ring-white/15 shadow-[0_8px_30px_-8px_rgba(185,130,69,0.7)] hover:brightness-110 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {tr('ctaCheckEligibility')}
            </button>

            <a
              href="/"
              title={lang === 'fa' ? 'همه سرویس‌ها' : 'All services'}
              className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--ta-navy)]/10 bg-white/60 text-[color:var(--ta-navy)]/70"
            >
              <LayoutGrid className="h-4 w-4" />
            </a>

            <button
              onClick={() => setOpen((value) => !value)}
              className="lg:hidden p-2 rounded-lg border border-[color:var(--ta-navy)]/10 text-foreground"
              aria-label="Menu"
            >
              {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="lg:hidden mt-2 ta-glass-strong rounded-2xl p-4">
            <div className="flex flex-col">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(event) => handleAnchor(event, link.href)}
                  className="py-2.5 text-sm text-muted-foreground hover:text-foreground border-b border-[color:var(--ta-navy)]/5 last:border-0"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-3 flex items-center gap-2">
                {(['en', 'fa'] as const).map((locale) => (
                  <button
                    key={locale}
                    onClick={() => setLang(locale)}
                    className={cn(
                      'flex-1 px-3 py-2 rounded-lg text-xs uppercase tracking-wider',
                      lang === locale
                        ? 'bg-foreground text-background'
                        : 'border border-[color:var(--ta-navy)]/10 text-muted-foreground',
                    )}
                  >
                    {locale}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setOpen(false);
                  openModal('assessment');
                }}
                className="mt-3 inline-flex justify-center items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#D6A46B] to-[#C8965F] text-[#0B2F42] text-sm font-semibold px-4 py-3 ring-1 ring-white/15 shadow-[0_8px_30px_-8px_rgba(185,130,69,0.7)]"
              >
                <Sparkles className="w-4 h-4" />
                {tr('ctaCheckEligibility')}
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  openModal('memory');
                }}
                className="mt-2 inline-flex justify-center items-center gap-1.5 rounded-xl border border-[color:var(--ta-gold)]/35 bg-white/70 text-[#0B2F42] text-sm font-medium px-4 py-3"
              >
                <Database className="w-4 h-4 text-[#B98245]" />
                {lang === 'fa' ? 'حافظه فرم' : 'Form Memory'}
                {memoryProgress > 0 && <span className="ms-1 text-xs">{memoryProgress}%</span>}
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  if (user) window.location.href = '/account';
                  else openAuth('ai_transfer', { returnTo: '/account' });
                }}
                className="mt-2 inline-flex justify-center items-center gap-1.5 rounded-xl border border-[color:var(--ta-navy)]/10 bg-white/80 text-[color:var(--ta-navy)] text-sm font-medium px-4 py-3"
              >
                <LogIn className="w-4 h-4" />
                {user ? (lang === 'fa' ? 'پنل من' : 'My Panel') : (lang === 'fa' ? 'ورود / ثبت‌نام' : 'Login / Sign Up')}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
