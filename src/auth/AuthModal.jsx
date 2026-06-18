import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UserRound,
  X,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { findRememberedAccountPreview } from './accountPreview';

const COPY = {
  smart_apply: {
    eyebrow: 'ACCA Smart Apply',
    title: 'حساب مرکزی ACCA',
    body: 'نتیجه اولیه، انتخاب رشته، دانشگاه‌های پیشنهادی و مدارک پذیرش در یک پنل امن ذخیره می‌شوند.',
    benefits: ['ذخیره نتیجه و ادامه از همین نقطه', 'مشاهده دانشگاه‌های متناسب', 'آپلود امن مدارک پذیرش'],
  },
  ai_transfer: {
    eyebrow: 'ACCA AI Transfer',
    title: 'حساب مرکزی ACCA',
    body: 'نتیجه انتقالی، ریزنمرات، OCR، تطبیق درس‌ها و ادامه پرونده در یک پنل مرکزی نگهداری می‌شود.',
    benefits: ['انتقال حافظه و نتیجه به پنل مرکزی', 'آپلود امن، OCR و تحلیل ریزنمرات', 'تطبیق دروس و ادامه درخواست'],
  },
};

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export default function AuthModal() {
  const { authRequest } = useAuth();
  const key = authRequest
    ? `${authRequest.product || 'smart_apply'}-${authRequest.reason || ''}-${authRequest.startMode || ''}-${authRequest.method || ''}-${authRequest.returnTo || ''}`
    : 'closed';

  return (
    <AnimatePresence>
      {authRequest && <AuthModalPanel key={key} authRequest={authRequest} />}
    </AnimatePresence>
  );
}

function AuthModalPanel({ authRequest }) {
  const {
    closeAuth,
    sendCode,
    verifyCode,
    signInWithPassword,
    signUpWithPassword,
    resetPassword,
    isConfigured,
  } = useAuth();
  const [flow, setFlow] = useState(authRequest.startMode === 'signup' ? 'signup' : 'signin'); // signin | signup
  const [method, setMethod] = useState(authRequest.method === 'otp' || authRequest.startMode === 'otp' ? 'otp' : 'password'); // password | otp
  const [stage, setStage] = useState('email');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const product = authRequest?.product || 'smart_apply';
  const copy = authRequest?.reason === 'program_selection'
    ? {
        eyebrow: 'ACCA Central Account',
        title: 'رشته انتخابی آماده اتصال به حساب شماست',
        body: 'پس از ورود یا ساخت حساب، رشته و دانشگاهی که انتخاب کردید خودکار در پرونده مرکزی ثبت می‌شود.',
        benefits: ['حفظ دقیق رشته و شهریه انتخاب‌شده', 'نمایش مدارک لازم برای اپلای', 'ادامه با راهنمایی AI و تیم پذیرش'],
      }
    : (COPY[product] || COPY.smart_apply);

  const preview = useMemo(() => findRememberedAccountPreview(email), [email]);
  const previewInitial = (preview?.fullName || preview?.email || '?').trim().charAt(0).toUpperCase();
  const isOtp = flow === 'signin' && method === 'otp';
  const cleanEmail = normalizeEmail(email);

  const resetFormState = () => {
    setFlow('signin');
    setMethod('password');
    setStage('email');
    setFullName('');
    setEmail('');
    setCode('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setBusy(false);
    setError('');
    setNotice('');
  };

  const goToAccount = () => {
    const destination = authRequest?.returnTo || '/account';
    resetFormState();
    window.history.pushState({}, '', destination);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const dismiss = () => {
    resetFormState();
    closeAuth();
  };

  const switchFlow = (nextFlow) => {
    setFlow(nextFlow);
    setMethod('password');
    setStage('email');
    setCode('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setNotice('');
  };

  const requestPasswordReset = async () => {
    if (!cleanEmail) {
      setError('برای ارسال لینک تغییر رمز، ابتدا ایمیل را وارد کنید.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await resetPassword({ email: cleanEmail });
      setNotice('لینک امن تغییر رمز به ایمیل شما ارسال شد.');
    } catch (err) {
      setError(err?.message || 'ارسال لینک تغییر رمز انجام نشد.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (flow === 'signup') {
        if (!fullName.trim()) throw new Error('نام و نام خانوادگی را وارد کنید.');
        if (password.length < 8) throw new Error('رمز عبور باید حداقل ۸ کاراکتر باشد.');
        if (password !== confirmPassword) throw new Error('تکرار رمز عبور با رمز اصلی یکسان نیست.');
        const result = await signUpWithPassword({
          email: cleanEmail,
          password,
          fullName,
          product,
        });
        if (result.needsEmailConfirmation) {
          setNotice('حساب ساخته شد. اگر تأیید ایمیل در Supabase فعال باشد، لینک تأیید به ایمیل شما ارسال شده است.');
          setFlow('signin');
          setMethod('password');
          setPassword('');
          setConfirmPassword('');
          return;
        }
        goToAccount();
        return;
      }

      if (method === 'password') {
        await signInWithPassword({ email: cleanEmail, password, product });
        goToAccount();
        return;
      }

      if (stage === 'email') {
        await sendCode({ email: cleanEmail, product });
        setStage('code');
        setNotice('کد یک‌بارمصرف به ایمیل شما ارسال شد.');
        return;
      }

      await verifyCode({ email: cleanEmail, token: code, product });
      goToAccount();
    } catch (err) {
      setError(err?.message || 'ورود انجام نشد. دوباره تلاش کنید.');
    } finally {
      setBusy(false);
    }
  };

  return (
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
            <h2>{flow === 'signup' ? 'ساخت حساب مرکزی ACCA' : copy.title}</h2>
            <p className="acca-auth-body">
              {flow === 'signup'
                ? 'یک حساب امن بسازید تا Smart Apply و AI Transfer هر دو زیر یک پروفایل مرکزی ادامه پیدا کنند.'
                : copy.body}
            </p>

            <div className="acca-auth-switch" role="tablist" aria-label="ورود یا ثبت نام">
              <button
                type="button"
                role="tab"
                aria-selected={flow === 'signin'}
                className={flow === 'signin' ? 'is-active' : ''}
                onClick={() => switchFlow('signin')}
              >
                <LockKeyhole size={15} /> ورود
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={flow === 'signup'}
                className={flow === 'signup' ? 'is-active' : ''}
                onClick={() => switchFlow('signup')}
              >
                <UserPlus size={15} /> ساخت حساب
              </button>
            </div>

            <div className="acca-auth-benefits">
              {copy.benefits.map((item) => (
                <span key={item}><CheckCircle2 size={15} />{item}</span>
              ))}
            </div>

            {flow === 'signin' && (
              <div className="acca-auth-methods" role="tablist" aria-label="روش ورود">
                <button
                  type="button"
                  role="tab"
                  aria-selected={method === 'password'}
                  className={method === 'password' ? 'is-active' : ''}
                  onClick={() => { setMethod('password'); setStage('email'); setCode(''); setError(''); setNotice(''); }}
                >
                  رمز عبور
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={method === 'otp'}
                  className={method === 'otp' ? 'is-active' : ''}
                  onClick={() => { setMethod('otp'); setStage('email'); setPassword(''); setError(''); setNotice(''); }}
                >
                  کد ایمیل
                </button>
              </div>
            )}

            {flow === 'signin' && preview && (
              <motion.div
                className="acca-auth-preview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <span>
                  {preview.avatarUrl ? <img src={preview.avatarUrl} alt="" /> : previewInitial}
                </span>
                <div>
                  <b>{preview.fullName || 'حساب ذخیره‌شده روی این دستگاه'}</b>
                  <small dir="ltr">{preview.email}</small>
                </div>
                <ShieldCheck size={18} />
              </motion.div>
            )}

            <form onSubmit={submit} className="acca-auth-form">
              {flow === 'signup' && (
                <label>
                  <UserRound size={17} />
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="نام و نام خانوادگی"
                  />
                </label>
              )}

              {isOtp && stage === 'code' ? (
                <>
                  <p className="acca-auth-sent">کد ورود به <b dir="ltr">{cleanEmail}</b> ارسال شد.</p>
                  <label>
                    <KeyRound size={17} />
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="کد یک‌بارمصرف"
                      dir="ltr"
                    />
                  </label>
                </>
              ) : (
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
              )}

              {(flow === 'signup' || method === 'password') && !(isOtp && stage === 'code') && (
                <label>
                  <LockKeyhole size={17} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={flow === 'signup' ? 8 : undefined}
                    autoComplete={flow === 'signup' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={flow === 'signup' ? 'رمز عبور امن، حداقل ۸ کاراکتر' : 'رمز عبور'}
                    dir="ltr"
                  />
                  <button type="button" className="acca-auth-eye" onClick={() => setShowPassword((value) => !value)} aria-label="نمایش رمز">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </label>
              )}

              {flow === 'signup' && (
                <label>
                  <KeyRound size={17} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="تکرار رمز عبور"
                    dir="ltr"
                  />
                </label>
              )}

              {notice && <p className="acca-auth-notice">{notice}</p>}
              {error && <p className="acca-auth-error">{error}</p>}
              {!isConfigured && <p className="acca-auth-error">اتصال احراز هویت هنوز پیکربندی نشده است.</p>}

              <button type="submit" disabled={busy || !isConfigured} className="acca-auth-submit">
                {busy ? <span className="acca-auth-loading" /> : flow === 'signup' ? <UserPlus size={17} /> : <LockKeyhole size={17} />}
                {busy
                  ? 'در حال بررسی...'
                  : flow === 'signup'
                    ? 'ساخت حساب و ادامه'
                    : method === 'password'
                      ? 'ورود به پنل مرکزی'
                      : stage === 'email'
                        ? 'ارسال کد امن'
                        : 'ورود و ادامه'}
              </button>

              {flow === 'signin' && method === 'password' && (
                <button type="button" className="acca-auth-back" onClick={requestPasswordReset} disabled={busy}>
                  فراموشی رمز؟ ارسال لینک تغییر رمز
                </button>
              )}

              {isOtp && stage === 'code' && (
                <button type="button" className="acca-auth-back" onClick={() => { setStage('email'); setCode(''); setError(''); setNotice(''); }}>
                  <ArrowLeft size={14} /> تغییر ایمیل
                </button>
              )}
            </form>

            <small>
              {flow === 'signup'
                ? 'بعد از ساخت حساب، همین ایمیل برای ورود با رمز یا کد یک‌بارمصرف استفاده می‌شود.'
                : method === 'password'
                  ? 'اگر قبلاً رمز تنظیم کرده‌اید، مستقیم وارد پنل شوید. پیش‌نمایش حساب فقط روی همین دستگاه نمایش داده می‌شود.'
                  : 'کد یک‌بارمصرف از طریق ایمیل ارسال می‌شود و به رمز عبور نیاز ندارد.'}
            </small>
          </motion.section>
        </motion.div>
  );
}
