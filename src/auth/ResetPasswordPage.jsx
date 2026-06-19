import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { sendAccountEventEmail } from '../services/accountService';

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    if (!supabase) {
      setReady(true);
      return undefined;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setReady(Boolean(data.session));
    });

    return () => {
      mounted = false;
    };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('رمز جدید باید حداقل ۸ کاراکتر باشد.');
      return;
    }
    if (password !== confirmPassword) {
      setError('تکرار رمز با رمز جدید یکسان نیست.');
      return;
    }
    if (!supabase) {
      setError('اتصال احراز هویت هنوز فعال نیست.');
      return;
    }

    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await sendAccountEventEmail('password_changed', {
        method: 'reset_link',
        source: 'reset_password_page',
      }).catch(() => null);
      setPassword('');
      setConfirmPassword('');
      setComplete(true);
      window.history.replaceState({}, '', '/reset-password');
    } catch (err) {
      setError(err?.message || 'تغییر رمز انجام نشد. لطفاً دوباره از ایمیل لینک جدید بگیرید.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="reset-password-page" dir="rtl">
      <motion.section
        className="reset-password-card"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      >
        <div className="reset-password-orb">
          {complete ? <CheckCircle2 size={30} /> : <Sparkles size={30} />}
        </div>
        <p className="account-kicker">ACCA Central Account</p>
        <h1>{complete ? 'رمز عبور شما با موفقیت تغییر کرد' : 'تنظیم رمز عبور جدید'}</h1>
        <p>
          {complete
            ? 'اکنون می‌توانید با رمز جدید وارد پنل مرکزی شوید یا به گیت‌وی اصلی ACCA Transfer برگردید.'
            : 'برای امنیت حساب، فقط رمز جدید را وارد کنید. بعد از ذخیره، مسیر ورود به پنل به شما نمایش داده می‌شود.'}
        </p>

        <AnimatePresence mode="wait">
          {complete ? (
            <motion.div
              key="done"
              className="reset-password-actions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <a className="reset-password-primary" href="/account">
                <LockKeyhole size={17} /> ورود به پنل مرکزی
              </a>
              <a className="reset-password-secondary" href="/">
                <ArrowLeft size={16} /> ورود به گیت‌وی اصلی
              </a>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              className="reset-password-form"
              onSubmit={submit}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              {!ready && (
                <div className="reset-password-status">
                  <LoaderCircle className="account-spin" size={17} />
                  در حال بررسی لینک امن...
                </div>
              )}
              {ready && (
                <>
                  <label>
                    <KeyRound size={17} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="رمز جدید، حداقل ۸ کاراکتر"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </label>
                  <label>
                    <ShieldCheck size={17} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="تکرار رمز جدید"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      dir="ltr"
                    />
                  </label>
                </>
              )}
              {error && <p className="reset-password-error">{error}</p>}
              <button
                type="submit"
                className="reset-password-primary"
                disabled={!ready || busy}
              >
                {busy ? <LoaderCircle className="account-spin" size={17} /> : <CheckCircle2 size={17} />}
                {busy ? 'در حال ذخیره...' : 'ذخیره رمز جدید'}
              </button>
              <a className="reset-password-subtle" href="/account">بازگشت به ورود حساب</a>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.section>
    </main>
  );
}
