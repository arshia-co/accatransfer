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
    title: 'نتیجه مقدماتی شما آماده ذخیره است',
    body: 'حساب خود را بسازید تا این نتیجه ذخیره شود، دانشگاه‌های متناسب را ببینید، مدارک را امن آپلود کنید و فرایند انتقالی را ادامه دهید.',
    benefits: ['انتقال حافظه و نتیجه به پنل مرکزی', 'آپلود امن، OCR و تحلیل ریزنمرات', 'تطبیق دروس، دانشگاه‌های پیشنهادی و ادامه درخواست'],
  },
};

export default function AuthModal() {
  const { authRequest, closeAuth, sendCode, verifyCode, signInWithPassword, isConfigured } = useAuth();
  const [mode, setMode] = useState('code'); // 'code' (email OTP, default) | 'password'
  const [stage, setStage] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setMode('code');
    setStage('email');
    setEmail('');
    setCode('');
    setPassword('');
    setBusy(false);
    setError('');
  };

  const goToAccount = () => {
    reset();
    const destination = authRequest?.returnTo || '/account';
    window.history.pushState({}, '', destination);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const dismiss = () => {
    reset();
    closeAuth();
  };

  const product = authRequest?.product || 'smart_apply';
  const copy = authRequest?.reason === 'program_selection'
    ? {
        eyebrow: 'ACCA Central Account',
        title: 'رشته انتخابی آماده اتصال به حساب شماست',
        body: 'پس از ورود، رشته و دانشگاهی که در آکاکو انتخاب کردید خودکار در پرونده مرکزی ثبت می‌شود.',
        benefits: ['حفظ دقیق رشته و شهریه انتخاب‌شده', 'نمایش مدارک لازم برای اپلای', 'ادامه با راهنمایی AI و تیم پذیرش'],
      }
    : COPY[product];

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'password') {
        await signInWithPassword({ email, password, product });
        goToAccount();
      } else if (stage === 'email') {
        await sendCode({ email, product });
        setStage('code');
      } else {
        await verifyCode({ email, token: code, product });
        goToAccount();
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
              {mode === 'password' ? (
                <>
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
                  <label>
                    <LockKeyhole size={17} />
                    <input
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="رمز عبور"
                      dir="ltr"
                    />
                  </label>
                </>
              ) : stage === 'email' ? (
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
                {busy ? 'در حال بررسی...' : mode === 'password' ? 'ورود با رمز عبور' : stage === 'email' ? 'ارسال کد امن' : 'ورود و ادامه'}
              </button>
              {mode === 'code' && stage === 'code' && (
                <button type="button" className="acca-auth-back" onClick={() => { setStage('email'); setError(''); }}>
                  <ArrowLeft size={14} /> تغییر ایمیل
                </button>
              )}
              <button
                type="button"
                className="acca-auth-back"
                onClick={() => { setMode(mode === 'password' ? 'code' : 'password'); setStage('email'); setCode(''); setPassword(''); setError(''); }}
              >
                {mode === 'password' ? 'ورود با کد ایمیل' : 'ورود با رمز عبور'}
              </button>
            </form>
            <small>
              {mode === 'password'
                ? 'با رمز عبوری که در پنل کاربری تنظیم کرده‌اید وارد شوید.'
                : 'بدون رمز عبور. کد یک‌بارمصرف از طریق ایمیل ارسال می‌شود.'}
            </small>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
