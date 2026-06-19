import { ExternalLink, Grid2X2, LayoutDashboard, LogIn } from 'lucide-react';
import { LOGO_SRC, MAIN_SITE_URL } from '../../lib/constants';
import { useAuth } from '../../auth/AuthContext';

export default function GatewayHeader({ compact = false }) {
  const { user, openAuth } = useAuth();

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
            مسیر هوشمند تحصیل بین‌المللی
          </span>
        </span>
      </a>

      <nav className="flex items-center gap-2" aria-label="ناوبری اصلی">
        {compact && (
          <a href="/" className="gateway-header-button">
            <Grid2X2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">همه سرویس‌ها</span>
          </a>
        )}
        <a
          href={MAIN_SITE_URL}
          className="gateway-header-button"
          target="_blank"
          rel="noreferrer"
        >
          <span className="hidden sm:inline">وب‌سایت آکا</span>
          <span className="sm:hidden">ACCA</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <button
          type="button"
          onClick={openPanel}
          className="gateway-header-button is-primary"
          aria-label={user ? 'پنل کاربری من' : 'ورود به پنل کاربری'}
        >
          {user ? <LayoutDashboard className="h-3.5 w-3.5" /> : <LogIn className="h-3.5 w-3.5" />}
          <span>{user ? 'پنل من' : 'ورود به پنل'}</span>
        </button>
      </nav>
    </header>
  );
}
