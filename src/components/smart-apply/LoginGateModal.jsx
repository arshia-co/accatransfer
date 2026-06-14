// The value-gated login modal. Appears only AFTER the student has received
// something useful (result / direction).
//
// Two modes: when Supabase is configured it does REAL passwordless auth (an
// emailed one-time code → Supabase session, profile + result saved). Without a
// backend it falls back to the simulated demo sign-in, so the public preview
// still works. Guests can always keep exploring.
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserRound, MessageCircle, X, Sparkles, CheckCircle2, Mail, KeyRound, ArrowLeft } from 'lucide-react';
import { L, dirFor } from '../../lib/lang';
import { UI } from '../../i18n/ui';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { useSmartApplyStore } from '../../store/smartApplyStore';

const BENEFITS = [
  { fa: 'ذخیره نتیجه و ادامه از همین نقطه', en: 'Save your result and resume from here', tr: 'Sonucunuzu kaydedin ve buradan devam edin', ar: 'احفظ نتيجتك وتابع من هنا' },
  { fa: 'دیدن گزینه‌های دانشگاهی دقیق‌تر', en: 'See more precise university matches', tr: 'Daha net üniversite eşleşmeleri görün', ar: 'شاهد مطابقات جامعية أدق' },
  { fa: 'مرتب‌سازی مدارک و ادامه درخواست', en: 'Organize documents and continue applying', tr: 'Belgeleri düzenleyin ve başvuruya devam edin', ar: 'نظم المستندات وتابع التقديم' },
];

function RealAuthForm({ lang }) {
  const authStage = useSmartApplyStore((s) => s.authStage);
  const authBusy = useSmartApplyStore((s) => s.authBusy);
  const authError = useSmartApplyStore((s) => s.authError);
  const authEmail = useSmartApplyStore((s) => s.authEmail);
  const sendAuthCode = useSmartApplyStore((s) => s.sendAuthCode);
  const verifyAuthCode = useSmartApplyStore((s) => s.verifyAuthCode);
  const resetAuth = useSmartApplyStore((s) => s.resetAuth);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const codeSent = authStage === 'code_sent';

  const dir = dirFor(lang);

  return (
    <form
      dir={dir}
      onSubmit={(e) => {
        e.preventDefault();
        if (authBusy) return;
        if (codeSent) verifyAuthCode(code);
        else sendAuthCode(email);
      }}
      className="space-y-2.5"
    >
      {!codeSent ? (
        <label className="flex items-center gap-2 rounded-full border border-navy/12 bg-white px-4 py-3 focus-within:border-emerald-700/40">
          <Mail className="h-4.5 w-4.5 shrink-0 text-navy/40" />
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={L(UI.authEmailPlaceholder, lang)}
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-navy outline-none placeholder:font-semibold placeholder:text-navy/35"
          />
        </label>
      ) : (
        <>
          <p className="px-1 text-[11px] font-bold leading-5 text-navy/60">
            {L(UI.authSentTo, lang)} <span className="text-navy" dir="ltr">{authEmail}</span>
          </p>
          <label className="flex items-center gap-2 rounded-full border border-navy/12 bg-white px-4 py-3 focus-within:border-emerald-700/40">
            <KeyRound className="h-4.5 w-4.5 shrink-0 text-navy/40" />
            <input
              type="text"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={L(UI.authCodePlaceholder, lang)}
              className="min-w-0 flex-1 bg-transparent text-sm font-black tracking-[0.3em] text-navy outline-none placeholder:font-semibold placeholder:tracking-normal placeholder:text-navy/35"
              dir="ltr"
            />
          </label>
        </>
      )}

      {authError && (
        <p className="px-1 text-[11px] font-bold leading-5 text-rose-600" dir="ltr">
          {typeof authError === 'string' ? authError : L(UI.authError, lang)}
        </p>
      )}

      <motion.button
        type="submit"
        disabled={authBusy}
        whileHover={authBusy ? undefined : { scale: 1.02 }}
        whileTap={authBusy ? undefined : { scale: 0.98 }}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-6 py-3.5 text-sm font-black text-white shadow-[0_10px_34px_rgba(5,150,105,0.4)] transition-colors hover:bg-emerald-800 disabled:opacity-60"
      >
        <LogIn className="h-4.5 w-4.5" />
        {authBusy
          ? L(codeSent ? UI.authVerifying : UI.authSending, lang)
          : L(codeSent ? UI.authVerify : UI.authSendCode, lang)}
      </motion.button>

      {codeSent && !authBusy && (
        <button
          type="button"
          onClick={resetAuth}
          className="flex w-full items-center justify-center gap-1.5 text-[11px] font-bold text-navy/50 transition hover:text-navy"
        >
          <ArrowLeft className="h-3.5 w-3.5 rtl:-scale-x-100" />
          {L(UI.authChangeEmail, lang)}
        </button>
      )}
    </form>
  );
}

export default function LoginGateModal({ lang }) {
  const isOpen = useSmartApplyStore((s) => s.isLoginGateOpen);
  const closeLoginGate = useSmartApplyStore((s) => s.closeLoginGate);
  const mockLogin = useSmartApplyStore((s) => s.mockLogin);
  const continueAsGuest = useSmartApplyStore((s) => s.continueAsGuest);
  const talkToCounselor = useSmartApplyStore((s) => s.talkToCounselor);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-navy/30 p-4 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeLoginGate}
        >
          <motion.div
            dir={dirFor(lang)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-gate-title"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-white/80 bg-white/90 p-7 shadow-[0_40px_120px_rgba(7,26,61,0.35)] backdrop-blur-2xl"
          >
            {/* soft halo */}
            <div
              className="pointer-events-none absolute -top-20 start-1/2 h-44 w-44 -translate-x-1/2 rounded-full blur-3xl"
              style={{ background: 'radial-gradient(circle, rgba(198,167,104,0.4), transparent 70%)' }}
            />

            <button
              type="button"
              onClick={closeLoginGate}
              aria-label={L(UI.close, lang)}
              className="absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-navy/[0.05] text-navy/60 transition hover:bg-navy/10"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gold via-gold/70 to-emerald-600/60 text-white shadow-[0_14px_40px_rgba(198,167,104,0.5)]">
                <Sparkles className="h-7 w-7" strokeWidth={2.2} />
              </span>

              <h2 id="login-gate-title" className="mt-5 text-center text-lg font-black text-navy">
                {L(UI.loginGateTitle, lang)}
              </h2>
              <p className="mt-3 text-center text-[13px] font-semibold leading-7 text-navy/65">
                {L(UI.loginGateBody, lang)}
              </p>

              <div className="mt-5 space-y-2 rounded-[20px] bg-navy/[0.035] p-4">
                {BENEFITS.map((item) => (
                  <p key={item.en} className="flex items-center gap-2 text-[11px] font-bold text-navy/65">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                    {L(item, lang)}
                  </p>
                ))}
              </div>

              <div className="mt-6 space-y-2.5">
                {isSupabaseConfigured ? (
                  <RealAuthForm lang={lang} />
                ) : (
                  <motion.button
                    type="button"
                    onClick={mockLogin}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-6 py-3.5 text-sm font-black text-white shadow-[0_10px_34px_rgba(5,150,105,0.4)] transition-colors hover:bg-emerald-800"
                  >
                    <LogIn className="h-4.5 w-4.5" />
                    {L(UI.loginGateLogin, lang)}
                  </motion.button>
                )}

                <button
                  type="button"
                  onClick={continueAsGuest}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-navy/10 bg-white px-6 py-3.5 text-sm font-black text-navy transition hover:border-navy/25"
                >
                  <UserRound className="h-4.5 w-4.5 text-navy/50" />
                  {L(UI.loginGateGuest, lang)}
                </button>
                <button
                  type="button"
                  onClick={talkToCounselor}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-emerald-700/25 bg-emerald-600/[0.06] px-6 py-3.5 text-sm font-black text-emerald-800 transition hover:bg-emerald-600/10"
                >
                  <MessageCircle className="h-4.5 w-4.5" />
                  {L(UI.loginGateCounselor, lang)}
                </button>
              </div>

              {!isSupabaseConfigured && (
                <p className="mt-4 text-center text-[10px] font-semibold text-navy/40">
                  {L(UI.loginGateDemoNote, lang)}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
