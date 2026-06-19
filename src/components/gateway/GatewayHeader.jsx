import { ExternalLink, Grid2X2, LayoutDashboard, LogIn, Moon, Sun } from 'lucide-react';
import { LOGO_SRC, MAIN_SITE_URL } from '../../lib/constants';
import { useAuth } from '../../auth/AuthContext';

export default function GatewayHeader({
  compact = false,
  lang = 'fa',
  theme = 'light',
  onLangChange,
  onThemeToggle,
  showPreferences = false,
}) {
  const { user, openAuth } = useAuth();
  const fa = lang !== 'en';
  const t = (faText, enText) => (fa ? faText : enText);

  const openPanel = () => {
    if (user) {
      window.location.href = '/account';
      return;
    }
    openAuth('smart_apply', { returnTo: '/account' });
  };

  return (
    <header className="gateway-header">
      <a
        href="/"
        className="gateway-brand"
        aria-label="ACCA AI Services"
      >
        <img
          src={LOGO_SRC}
          alt="ACCA EDU"
          width="100"
          height="44"
          className="h-10 w-auto object-contain sm:h-11"
        />
        <span className="gateway-brand-divider" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block truncate text-[10px] font-black uppercase tracking-[0.2em] text-gold">
            ACCA AI Services
          </span>
          <span className="mt-0.5 block truncate text-xs font-extrabold text-navy/68">
            {t('مسیر هوشمند تحصیل بین‌المللی', 'AI-guided international education')}
          </span>
        </span>
      </a>

      <nav className="gateway-nav" aria-label={t('ناوبری اصلی', 'Primary navigation')}>
        {showPreferences && (
          <div className="gateway-preferences" aria-label={t('تنظیمات نمایش', 'Display settings')}>
            <div className="gateway-lang-seg" role="group" aria-label={t('انتخاب زبان', 'Choose language')}>
              <button type="button" className={fa ? 'is-active' : ''} onClick={() => onLangChange?.('fa')}>فا</button>
              <button type="button" className={!fa ? 'is-active' : ''} onClick={() => onLangChange?.('en')}>EN</button>
            </div>
            <button
              type="button"
              className="gateway-icon-button"
              onClick={onThemeToggle}
              aria-label={theme === 'dark' ? t('حالت روشن', 'Light mode') : t('حالت تاریک', 'Dark mode')}
              title={theme === 'dark' ? t('حالت روشن', 'Light mode') : t('حالت تاریک', 'Dark mode')}
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
        {compact && (
          <a href="/" className="gateway-header-button">
            <Grid2X2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('همه سرویس‌ها', 'All services')}</span>
          </a>
        )}
        <a
          href={MAIN_SITE_URL}
          className="gateway-header-button gateway-main-site-button"
          target="_blank"
          rel="noreferrer"
          aria-label={t('باز کردن سایت اصلی آکا', 'Open ACCA main website')}
          title={t('سایت اصلی آکا', 'ACCA main website')}
        >
          <span className="hidden sm:inline">{t('وب‌سایت آکا', 'ACCA website')}</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <button
          type="button"
          onClick={openPanel}
          className="gateway-header-button is-primary"
          aria-label={user ? t('پنل کاربری من', 'My account panel') : t('ورود به پنل کاربری', 'Log in to account panel')}
        >
          {user ? <LayoutDashboard className="h-3.5 w-3.5" /> : <LogIn className="h-3.5 w-3.5" />}
          <span>{user ? t('پنل من', 'My panel') : t('ورود به پنل', 'Login')}</span>
        </button>
      </nav>
    </header>
  );
}
