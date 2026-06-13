import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, KeyRound, LockKeyhole, Mail, Sparkles, X } from 'lucide-react';
import { useAuth } from './AuthContext';

const COPY = {
  smart_apply: {
    eyebrow: 'ACCA Smart Apply',
    title: 'نتیجه شما آماده ذخیره است',
    body: 'با ساخت حساب، نتیجه اولیه، دانشگاه‌های پیشنهادی و ادامه مسیر پذیرش را در یک پنل امن نگه دارید.',
    benefits: ['ذخیره نتیجه و ادامه از همین نقطه', 'مشاهده دانشگاه‌های متناسب', 'آپلود امن مدارک پذیرش'],
  },
  ai_transfer: {
    eyebrow: 'ACCA AI Transfer',
    title: 'پرونده انتقالی‌تان را ادامه دهید',
    body: 'ورود کنید تا پیش‌نویس این دستگاه به حساب شما منتقل شود، مدارک واقعی را امن آپلود کنید و تحلیل اولیه بگیرید.',
    benefits: ['انتقال حافظه فرم به حساب', 'فضای خصوصی برای ریزنمرات', 'تحلیل اولیه و پیگیری پرونده'],
  },
};

export default function AuthModal() {
  const { authRequest, closeAuth, sendCode, verifyCode, isConfigured } = useAuth();
  const [stage, setStage] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setStage('email');
    setEmail('');
    setCode('');
    setBusy(false);
    setError('');
  };

  const dismiss = () => {
    reset();
    closeAuth();
  };

  const product = authRequest?.product || 'smart_apply';
  const copy = COPY[product];

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (stage === 'email') {
        await sendCode({ email, product });
        setStage('code');
      } else {
        await verifyCode({ email, token: code, product });
        reset();
        const destination = authRequest?.returnTo || '/account';
        window.history.pushState({}, '', destination);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    } catch (err) {
      setError(err?.message || 'ورود انجام نشد. دوباره تلاش کنید.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {authRequest && (
        <motion.div
          className="acca-auth-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
        >
          <motion.section
            dir="rtl"
            role="dialog"
            aria-modal="true"
            className="acca-auth-card"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="acca-auth-close" onClick={dismiss} aria-label="بستن">
              <X size={17} />
            </button>
            <div className="acca-auth-orb"><Sparkles size={26} /></div>
            <p className="acca-auth-eyebrow">{copy.eyebrow}</p>
            <h2>{copy.title}</h2>
            <p className="acca-auth-body">{copy.body}</p>

            <div className="acca-auth-benefits">
              {copy.benefits.map((item) => (
                <span key={item}><CheckCircle2 size={15} />{item}</span>
              ))}
            </div>

            <form onSubmit={submit} className="acca-auth-form">
              {stage === 'email' ? (
                <label>
                  <Mail size={17} />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="ایمیل شما"
                    dir="ltr"
                  />
                </label>
              ) : (
                <>
                  <p className="acca-auth-sent">کد ورود به <b dir="ltr">{email}</b> ارسال شد.</p>
                  <label>
                    <KeyRound size={17} />
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="کد ورود"
                      dir="ltr"
                    />
                  </label>
                </>
              )}
              {error && <p className="acca-auth-error">{error}</p>}
              {!isConfigured && <p className="acca-auth-error">اتصال احراز هویت هنوز پیکربندی نشده است.</p>}
              <button type="submit" disabled={busy || !isConfigured} className="acca-auth-submit">
                <LockKeyhole size={17} />
                {busy ? 'در حال بررسی...' : stage === 'email' ? 'ارسال کد امن' : 'ورود و ادامه'}
              </button>
              {stage === 'code' && (
                <button type="button" className="acca-auth-back" onClick={() => setStage('email')}>
                  <ArrowLeft size={14} /> تغییر ایمیل
                </button>
              )}
            </form>
            <small>بدون رمز عبور. کد یک‌بارمصرف از طریق ایمیل ارسال می‌شود.</small>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
