import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  Cookie,
  Mic,
  ShieldCheck,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { L, dirFor } from '../../lib/lang';
import { normalizeSmartApplySettings, saveSmartApplySettings } from '../../lib/smartApplySettings';

const COPY = {
  eyebrow: {
    fa: 'ACCA Smart Apply',
    en: 'ACCA Smart Apply',
    tr: 'ACCA Smart Apply',
    ar: 'ACCA Smart Apply',
  },
  title: {
    fa: 'قبل از شروع، تجربه دستیار را آماده کنیم.',
    en: 'Before we start, let us prepare the assistant experience.',
    tr: 'Başlamadan önce asistan deneyimini hazırlayalım.',
    ar: 'قبل أن نبدأ، لنجهز تجربة المساعد.',
  },
  body: {
    fa: 'برای اینکه صدا، میکروفون، حافظه جلسه و مجوزهای ضروری وسط مسیر شما را متوقف نکنند، همین ابتدا تنظیمات اصلی را تأیید کنید.',
    en: 'Confirm the essentials now so audio, microphone, session memory, and permissions do not interrupt your journey later.',
    tr: 'Ses, mikrofon, oturum hafızası ve izinler yolculuğunuzu bölmesin diye temel ayarları şimdi onaylayın.',
    ar: 'أكد الإعدادات الأساسية الآن حتى لا تقاطعك الصوتيات والميكروفون وذاكرة الجلسة لاحقاً.',
  },
  essential: {
    fa: 'کوکی‌های ضروری و امنیت جلسه',
    en: 'Essential cookies and session security',
    tr: 'Zorunlu çerezler ve oturum güvenliği',
    ar: 'ملفات الارتباط الأساسية وأمان الجلسة',
  },
  memory: {
    fa: 'ذخیره حافظه همین مرورگر تا زمان ریست شما',
    en: 'Keep this browser session memory until you reset it',
    tr: 'Siz sıfırlayana kadar bu tarayıcı oturum hafızası kalsın',
    ar: 'حفظ ذاكرة هذه الجلسة حتى تقوم بإعادة ضبطها',
  },
  audio: {
    fa: 'آماده‌سازی پخش صدا و انتخاب اسپیکر',
    en: 'Prepare voice playback and speaker output',
    tr: 'Ses oynatmayı ve hoparlörü hazırla',
    ar: 'تجهيز تشغيل الصوت ومخرج السماعة',
  },
  microphone: {
    fa: 'بررسی میکروفون برای گفت‌وگوی صوتی زنده',
    en: 'Check microphone for live voice conversation',
    tr: 'Canlı sesli görüşme için mikrofonu kontrol et',
    ar: 'فحص الميكروفون للمحادثة الصوتية المباشرة',
  },
  documents: {
    fa: 'مجوز امن برای پردازش فایل و تصویر فقط وقتی خودتان ارسال کنید',
    en: 'Secure file and image processing only when you choose to send them',
    tr: 'Dosya ve görsel işleme yalnızca siz gönderdiğinizde yapılır',
    ar: 'معالجة آمنة للملفات والصور فقط عندما تختار إرسالها',
  },
  micToggle: {
    fa: 'الان میکروفون را هم آماده کن',
    en: 'Prepare microphone now',
    tr: 'Mikrofonu şimdi hazırla',
    ar: 'جهز الميكروفون الآن',
  },
  start: {
    fa: 'تأیید و شروع دستیار',
    en: 'Confirm and start assistant',
    tr: 'Onayla ve asistanı başlat',
    ar: 'تأكيد وبدء المساعد',
  },
  textOnly: {
    fa: 'فعلاً فقط با متن شروع کنم',
    en: 'Start with text only for now',
    tr: 'Şimdilik sadece metinle başla',
    ar: 'ابدأ بالنص فقط حالياً',
  },
  preparing: {
    fa: 'در حال آماده‌سازی...',
    en: 'Preparing...',
    tr: 'Hazırlanıyor...',
    ar: 'جارٍ التجهيز...',
  },
  micDenied: {
    fa: 'میکروفون آماده نشد؛ مسیر متنی و دکمه تنظیمات همچنان فعال است.',
    en: 'Microphone was not prepared; text mode and settings remain available.',
    tr: 'Mikrofon hazırlanmadı; metin modu ve ayarlar kullanılabilir.',
    ar: 'لم يتم تجهيز الميكروفون؛ وضع النص والإعدادات ما زالا متاحين.',
  },
};

function t(key, lang) {
  return L(COPY[key], lang);
}

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={checked}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full border transition disabled:cursor-not-allowed disabled:opacity-70 ${
        checked ? 'border-emerald-500/30 bg-emerald-600' : 'border-navy/10 bg-navy/10'
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
          checked ? 'start-6' : 'start-1'
        }`}
      />
    </button>
  );
}

function ConsentRow({ icon: Icon, title, fixed, children }) {
  return (
    <div className="flex items-center gap-3 rounded-[22px] border border-white/80 bg-white/72 p-3 shadow-[0_12px_30px_rgba(7,26,61,0.045)]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cream text-navy">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <p className="min-w-0 flex-1 text-xs font-black leading-6 text-navy">{title}</p>
      {fixed ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" /> : children}
    </div>
  );
}

function storageAvailable() {
  if (typeof window === 'undefined') return false;
  try {
    const key = 'acca.smartApply.preflight';
    window.localStorage.setItem(key, '1');
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

async function unlockAudioPlayback() {
  if (typeof window === 'undefined') return false;
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return true;
  try {
    const context = new AudioContextCtor();
    await context.resume();
    await context.close();
    return true;
  } catch {
    return false;
  }
}

async function requestMicrophone() {
  if (!navigator.mediaDevices?.getUserMedia) return false;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((track) => track.stop());
  return true;
}

export default function SmartApplyConsentGate({
  open,
  lang,
  settings,
  onAccept,
}) {
  const [prepareMic, setPrepareMic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const dir = dirFor(lang);

  const normalized = useMemo(() => normalizeSmartApplySettings(settings), [settings]);

  const accept = async ({ textOnly = false } = {}) => {
    if (busy) return;
    setBusy(true);
    setNote('');

    const storageOk = storageAvailable();
    let audioPrepared = false;
    let microphoneAllowed = false;

    if (!textOnly) {
      audioPrepared = await unlockAudioPlayback();
      if (prepareMic) {
        try {
          microphoneAllowed = await requestMicrophone();
        } catch {
          setNote(t('micDenied', lang));
        }
      }
    }

    const next = saveSmartApplySettings({
      ...normalized,
      cookies: {
        ...normalized.cookies,
        preferences: true,
      },
      permissions: {
        ...normalized.permissions,
        askBeforeFiles: true,
        allowSecureDocuments: true,
      },
      chat: {
        ...normalized.chat,
        saveSessionMemory: true,
      },
      consent: {
        accepted: true,
        acceptedAt: new Date().toISOString(),
        audioPrepared,
        microphoneAllowed,
        storageAvailable: storageOk,
      },
    });

    onAccept?.(next);
    setBusy(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          dir={dir}
          className="fixed inset-0 z-[80] flex items-end justify-center bg-navy/35 p-3 backdrop-blur-xl sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={t('title', lang)}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 250, damping: 28 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-[30px] border border-white/80 bg-cream/97 p-4 text-navy shadow-[0_34px_110px_rgba(7,26,61,0.26)] sm:p-6"
          >
            <div className="pointer-events-none absolute inset-x-10 top-0 h-28 rounded-full bg-emerald-300/20 blur-3xl" aria-hidden="true" />

            <div className="relative">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-gold shadow-[0_16px_36px_rgba(7,26,61,0.22)]">
                <Sparkles className="h-5 w-5" />
              </span>
              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-gold">{t('eyebrow', lang)}</p>
              <h2 className="mt-2 text-2xl font-black leading-10 sm:text-3xl">{t('title', lang)}</h2>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-7 text-navy/58">{t('body', lang)}</p>
            </div>

            <div className="relative mt-5 grid gap-3">
              <ConsentRow icon={ShieldCheck} title={t('essential', lang)} fixed />
              <ConsentRow icon={Cookie} title={t('memory', lang)} fixed />
              <ConsentRow icon={Volume2} title={t('audio', lang)} fixed />
              <ConsentRow icon={Mic} title={t('micToggle', lang)}>
                <Toggle checked={prepareMic} onChange={setPrepareMic} disabled={busy} />
              </ConsentRow>
              <ConsentRow icon={ShieldCheck} title={t('documents', lang)} fixed />
            </div>

            {note && (
              <p className="relative mt-3 rounded-2xl border border-gold/25 bg-gold/[0.08] px-3 py-2 text-xs font-bold leading-6 text-navy/65">
                {note}
              </p>
            )}

            <div className="relative mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => accept({ textOnly: true })}
                disabled={busy}
                className="rounded-full border border-navy/10 bg-white/75 px-4 py-3 text-xs font-black text-navy/60 transition hover:border-gold/40 hover:text-navy disabled:cursor-wait disabled:opacity-60"
              >
                {t('textOnly', lang)}
              </button>
              <button
                type="button"
                onClick={() => accept()}
                disabled={busy}
                className="rounded-full bg-emerald-700 px-5 py-3 text-xs font-black text-white shadow-[0_14px_36px_rgba(5,150,105,0.24)] transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-70"
              >
                {busy ? t('preparing', lang) : t('start', lang)}
              </button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
