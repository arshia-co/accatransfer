import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Cookie,
  Image,
  Mic,
  Play,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Speaker,
  Volume2,
  X,
} from 'lucide-react';
import { dirFor, L } from '../../lib/lang';
import {
  DEFAULT_SMART_APPLY_SETTINGS,
  SMART_APPLY_REALTIME_VOICES,
  normalizeSmartApplySettings,
  saveSmartApplySettings,
} from '../../lib/smartApplySettings';
import { playRealtimeVoicePreview } from '../../services/realtimeVoiceService';

const COPY = {
  title: {
    fa: 'تنظیمات دستیار پذیرش آکا',
    en: 'ACCA assistant settings',
    tr: 'ACCA asistan ayarları',
    ar: 'إعدادات مساعد ACCA',
  },
  subtitle: {
    fa: 'صدا، ورودی و خروجی صوتی، کوکی‌ها و مجوزهای تجربه گفت‌وگو را همین‌جا تنظیم کنید.',
    en: 'Adjust voice, audio devices, cookies, and conversation permissions here.',
    tr: 'Ses, ses cihazları, çerezler ve görüşme izinlerini buradan ayarlayın.',
    ar: 'اضبط الصوت وأجهزة الصوت وملفات تعريف الارتباط وأذونات المحادثة هنا.',
  },
  voiceTitle: { fa: 'صدای AI', en: 'AI voice', tr: 'AI sesi', ar: 'صوت الذكاء الاصطناعي' },
  voiceNote: {
    fa: 'نمونه صدا برای انتخاب حس و ریتم است. در گفت‌وگوی زنده، همین انتخاب به سرویس صوتی آکا ارسال می‌شود.',
    en: 'The sample helps you choose the tone. Live voice uses the selected ACCA voice setting.',
    tr: 'Örnek, tonu seçmenize yardımcı olur. Canlı ses seçilen ACCA ses ayarını kullanır.',
    ar: 'العينة تساعدك على اختيار النبرة. يستخدم الصوت المباشر إعداد صوت ACCA المحدد.',
  },
  preview: { fa: 'پخش نمونه', en: 'Preview', tr: 'Önizle', ar: 'معاينة' },
  previewUnsupported: {
    fa: 'پخش نمونه در این مرورگر فعال نیست.',
    en: 'Voice preview is not available in this browser.',
    tr: 'Bu tarayıcıda ses önizleme kullanılamıyor.',
    ar: 'معاينة الصوت غير متاحة في هذا المتصفح.',
  },
  audioTitle: { fa: 'میکروفون و اسپیکر', en: 'Microphone and speaker', tr: 'Mikrofon ve hoparlör', ar: 'الميكروفون والسماعة' },
  input: { fa: 'میکروفون ورودی', en: 'Input microphone', tr: 'Giriş mikrofonu', ar: 'ميكروفون الإدخال' },
  output: { fa: 'اسپیکر خروجی', en: 'Output speaker', tr: 'Çıkış hoparlörü', ar: 'سماعة الإخراج' },
  browserDefault: { fa: 'پیش‌فرض مرورگر', en: 'Browser default', tr: 'Tarayıcı varsayılanı', ar: 'افتراضي المتصفح' },
  refreshDevices: { fa: 'بررسی دستگاه‌ها', en: 'Refresh devices', tr: 'Cihazları yenile', ar: 'تحديث الأجهزة' },
  allowMic: { fa: 'اجازه میکروفون', en: 'Allow microphone', tr: 'Mikrofona izin ver', ar: 'السماح بالميكروفون' },
  deviceUnsupported: {
    fa: 'مرورگر اجازه انتخاب دستگاه صوتی را محدود کرده است.',
    en: 'This browser limits audio device selection.',
    tr: 'Bu tarayıcı ses cihazı seçimini sınırlıyor.',
    ar: 'هذا المتصفح يقيّد اختيار أجهزة الصوت.',
  },
  cookiesTitle: { fa: 'کوکی‌ها و حافظه', en: 'Cookies and memory', tr: 'Çerezler ve hafıza', ar: 'ملفات الارتباط والذاكرة' },
  essentialCookies: { fa: 'کوکی‌های ضروری', en: 'Essential cookies', tr: 'Zorunlu çerezler', ar: 'ملفات أساسية' },
  essentialCookiesBody: {
    fa: 'برای امنیت، زبان، جلسه و عملکرد اصلی همیشه روشن است.',
    en: 'Always on for security, language, session, and core functionality.',
    tr: 'Güvenlik, dil, oturum ve temel işlevler için her zaman açık.',
    ar: 'مفعلة دائماً للأمان واللغة والجلسة والوظائف الأساسية.',
  },
  preferenceCookies: { fa: 'ذخیره ترجیحات', en: 'Save preferences', tr: 'Tercihleri kaydet', ar: 'حفظ التفضيلات' },
  analyticsCookies: { fa: 'تحلیل بهبود تجربه', en: 'Experience analytics', tr: 'Deneyim analitiği', ar: 'تحليلات التجربة' },
  permissionsTitle: { fa: 'مجوزهای فایل و تصویر', en: 'File and image permissions', tr: 'Dosya ve görsel izinleri', ar: 'أذونات الملفات والصور' },
  askBeforeFiles: { fa: 'قبل از ارسال فایل یا تصویر، اجازه بپرس', en: 'Ask before sending files or images', tr: 'Dosya veya görsel göndermeden önce sor', ar: 'اسأل قبل إرسال الملفات أو الصور' },
  allowImageContext: { fa: 'اجازه استفاده از تصویر به‌عنوان زمینه گفت‌وگو', en: 'Allow images as conversation context', tr: 'Görselleri görüşme bağlamı olarak kullan', ar: 'السماح باستخدام الصور كسياق للمحادثة' },
  allowSecureDocuments: { fa: 'اجازه پردازش امن مدارک تحصیلی', en: 'Allow secure document processing', tr: 'Güvenli belge işlemeye izin ver', ar: 'السماح بمعالجة المستندات بأمان' },
  chatTitle: { fa: 'رفتار چت‌بات', en: 'Chat behavior', tr: 'Sohbet davranışı', ar: 'سلوك المحادثة' },
  autoReadNext: { fa: 'بعد از هر انتخاب، مرحله بعد را خودکار بخوان', en: 'Automatically read the next step after each selection', tr: 'Her seçimden sonra sonraki adımı otomatik oku', ar: 'اقرأ الخطوة التالية تلقائياً بعد كل اختيار' },
  saveMemory: { fa: 'حافظه جلسه تا زمان ریست باقی بماند', en: 'Keep session memory until reset', tr: 'Oturum hafızasını sıfırlanana kadar koru', ar: 'احتفظ بذاكرة الجلسة حتى إعادة الضبط' },
  responseDepth: { fa: 'جزئیات پاسخ‌ها', en: 'Response detail', tr: 'Yanıt ayrıntısı', ar: 'تفاصيل الرد' },
  concise: { fa: 'کوتاه', en: 'Concise', tr: 'Kısa', ar: 'مختصر' },
  balanced: { fa: 'متعادل', en: 'Balanced', tr: 'Dengeli', ar: 'متوازن' },
  detailed: { fa: 'کامل‌تر', en: 'Detailed', tr: 'Daha detaylı', ar: 'مفصل' },
  reset: { fa: 'بازگشت به پیش‌فرض', en: 'Reset defaults', tr: 'Varsayılana dön', ar: 'إعادة الافتراضي' },
  cancel: { fa: 'انصراف', en: 'Cancel', tr: 'Vazgeç', ar: 'إلغاء' },
  save: { fa: 'ذخیره تنظیمات', en: 'Save settings', tr: 'Ayarları kaydet', ar: 'حفظ الإعدادات' },
  saved: { fa: 'تنظیمات ذخیره شد.', en: 'Settings saved.', tr: 'Ayarlar kaydedildi.', ar: 'تم حفظ الإعدادات.' },
};

function t(key, lang) {
  return L(COPY[key], lang);
}

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      aria-pressed={checked}
      className={`relative h-7 w-12 rounded-full border transition disabled:cursor-not-allowed disabled:opacity-60 ${
        checked
          ? 'border-emerald-500/30 bg-emerald-600'
          : 'border-navy/10 bg-navy/10'
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

function SettingRow({ icon: Icon, title, body, children }) {
  return (
    <div className="flex items-center gap-3 rounded-[22px] border border-navy/8 bg-white/72 p-3 shadow-[0_10px_28px_rgba(7,26,61,0.045)]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cream text-navy">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black text-navy">{title}</p>
        {body && <p className="mt-1 text-[10px] font-semibold leading-5 text-navy/45">{body}</p>}
      </div>
      {children}
    </div>
  );
}

function deviceLabel(device, fallback, index) {
  return device.label || `${fallback} ${index + 1}`;
}

export default function AssistantSettingsModal({
  open,
  lang,
  settings,
  onSave,
  onClose,
}) {
  const [draft, setDraft] = useState(() => normalizeSmartApplySettings(settings));
  const [devices, setDevices] = useState({ inputs: [], outputs: [] });
  const [deviceNote, setDeviceNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const previewSessionRef = useRef(null);
  const dir = dirFor(lang);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      setDraft(normalizeSmartApplySettings(settings));
      setSaved(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [open, settings]);

  useEffect(() => {
    if (open) return;
    previewSessionRef.current?.stop?.();
    previewSessionRef.current = null;
  }, [open]);

  useEffect(() => () => {
    previewSessionRef.current?.stop?.();
    previewSessionRef.current = null;
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  }, []);

  const selectedVoice = useMemo(
    () => SMART_APPLY_REALTIME_VOICES.find((voice) => voice.id === draft.voiceId) || SMART_APPLY_REALTIME_VOICES[0],
    [draft.voiceId],
  );

  const updateDraft = (patch) => {
    setDraft((current) => normalizeSmartApplySettings({
      ...current,
      ...patch,
      cookies: { ...current.cookies, ...(patch.cookies || {}) },
      permissions: { ...current.permissions, ...(patch.permissions || {}) },
      chat: { ...current.chat, ...(patch.chat || {}) },
    }));
    setSaved(false);
  };

  const loadDevices = async ({ askPermission = false } = {}) => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setDeviceNote(t('deviceUnsupported', lang));
      return;
    }
    try {
      let stream = null;
      if (askPermission) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      const list = await navigator.mediaDevices.enumerateDevices();
      stream?.getTracks().forEach((track) => track.stop());
      setDevices({
        inputs: list.filter((device) => device.kind === 'audioinput'),
        outputs: list.filter((device) => device.kind === 'audiooutput'),
      });
      setDeviceNote('');
    } catch {
      setDeviceNote(t('deviceUnsupported', lang));
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    const frame = requestAnimationFrame(() => loadDevices());
    return () => cancelAnimationFrame(frame);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const playPreview = async () => {
    const text = L(selectedVoice.sample, lang);
    setDeviceNote('');
    previewSessionRef.current?.stop?.();
    previewSessionRef.current = null;
    setPreviewing(true);

    try {
      previewSessionRef.current = await playRealtimeVoicePreview({
        language: lang,
        voiceId: selectedVoice.id,
        outputDeviceId: draft.outputDeviceId,
        text,
        sessionId: `settings_preview_${Date.now()}`,
        onEnded: () => {
          previewSessionRef.current = null;
          setPreviewing(false);
        },
      });
    } catch {
      previewSessionRef.current = null;
      setPreviewing(false);
      setDeviceNote(t('previewUnsupported', lang));
    }
  };

  const save = () => {
    const normalized = saveSmartApplySettings(draft);
    onSave?.(normalized);
    setDraft(normalized);
    setSaved(true);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          dir={dir}
          className="fixed inset-0 z-[65] flex items-end justify-center bg-navy/35 p-3 backdrop-blur-xl sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={t('title', lang)}
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 26, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="sa-scroll relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[30px] border border-white/80 bg-cream/96 p-4 text-navy shadow-[0_34px_110px_rgba(7,26,61,0.24)] sm:p-6"
          >
            <div className="absolute inset-x-8 top-0 h-24 rounded-full bg-emerald-300/20 blur-3xl" aria-hidden="true" />
            <button
              type="button"
              onClick={onClose}
              className="absolute end-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-navy/10 bg-white/80 text-navy/55 transition hover:text-navy"
              aria-label={t('cancel', lang)}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative pe-11">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-navy text-gold shadow-[0_14px_34px_rgba(7,26,61,0.20)]">
                <SlidersHorizontal className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-xl font-black sm:text-2xl">{t('title', lang)}</h2>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-7 text-navy/55">{t('subtitle', lang)}</p>
            </div>

            <div className="relative mt-6 grid gap-4">
              <section className="rounded-[26px] border border-white/75 bg-white/58 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-black">
                  <Volume2 className="h-4 w-4 text-gold" />
                  {t('voiceTitle', lang)}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {SMART_APPLY_REALTIME_VOICES.map((voice) => {
                    const active = draft.voiceId === voice.id;
                    return (
                      <button
                        key={voice.id}
                        type="button"
                        onClick={() => updateDraft({ voiceId: voice.id })}
                        className={`rounded-[22px] border p-4 text-start transition ${
                          active
                            ? 'border-emerald-600/35 bg-emerald-50 shadow-[0_14px_36px_rgba(5,150,105,0.10)]'
                            : 'border-navy/8 bg-white/72 hover:border-gold/40'
                        }`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span>
                            <b className="block text-sm font-black">{L(voice.label, lang)}</b>
                            <small className="mt-1 block text-[11px] font-bold leading-5 text-navy/50">{L(voice.tone, lang)}</small>
                          </span>
                          {active && <Check className="h-5 w-5 text-emerald-700" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-col gap-3 rounded-[22px] border border-gold/20 bg-gold/[0.08] p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] font-bold leading-5 text-navy/55">{t('voiceNote', lang)}</p>
                  <button
                    type="button"
                    onClick={playPreview}
                    disabled={previewing}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-navy px-4 py-2.5 text-[11px] font-black text-white shadow-[0_10px_26px_rgba(7,26,61,0.20)] transition hover:bg-navy/90 disabled:cursor-wait disabled:opacity-70"
                  >
                    <Play className="h-3.5 w-3.5" />
                    {previewing ? '...' : t('preview', lang)}
                  </button>
                </div>
              </section>

              <section className="overflow-hidden rounded-[26px] border border-white/75 bg-white/58 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-black">
                    <Speaker className="h-4 w-4 text-gold" />
                    {t('audioTitle', lang)}
                  </span>
                  <button
                    type="button"
                    onClick={() => loadDevices({ askPermission: true })}
                    className="rounded-full border border-navy/10 bg-white/80 px-3 py-2 text-[10px] font-black text-navy/65 transition hover:border-gold/40 hover:text-navy"
                  >
                    {t('allowMic', lang)}
                  </button>
                </div>
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  <label className="grid min-w-0 gap-1.5 text-[11px] font-black text-navy/55">
                    {t('input', lang)}
                    <select
                      value={draft.inputDeviceId}
                      onChange={(event) => updateDraft({ inputDeviceId: event.target.value })}
                      className="h-11 w-full min-w-0 rounded-2xl border border-navy/10 bg-white px-3 text-xs font-bold text-navy outline-none focus:border-emerald-600/40"
                    >
                      <option value="">{t('browserDefault', lang)}</option>
                      {devices.inputs.map((device, index) => (
                        <option key={device.deviceId || index} value={device.deviceId}>
                          {deviceLabel(device, 'Microphone', index)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid min-w-0 gap-1.5 text-[11px] font-black text-navy/55">
                    {t('output', lang)}
                    <select
                      value={draft.outputDeviceId}
                      onChange={(event) => updateDraft({ outputDeviceId: event.target.value })}
                      className="h-11 w-full min-w-0 rounded-2xl border border-navy/10 bg-white px-3 text-xs font-bold text-navy outline-none focus:border-emerald-600/40"
                    >
                      <option value="">{t('browserDefault', lang)}</option>
                      {devices.outputs.map((device, index) => (
                        <option key={device.deviceId || index} value={device.deviceId}>
                          {deviceLabel(device, 'Speaker', index)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => loadDevices()}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-navy/10 bg-white/75 px-3 py-2 text-[10px] font-black text-navy/60 transition hover:border-gold/40 hover:text-navy"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t('refreshDevices', lang)}
                </button>
                {deviceNote && <p className="mt-2 text-[10px] font-bold text-rose-700">{deviceNote}</p>}
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[26px] border border-white/75 bg-white/58 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-black">
                    <Cookie className="h-4 w-4 text-gold" />
                    {t('cookiesTitle', lang)}
                  </div>
                  <div className="grid gap-3">
                    <SettingRow icon={ShieldCheck} title={t('essentialCookies', lang)} body={t('essentialCookiesBody', lang)}>
                      <Toggle checked disabled onChange={() => {}} />
                    </SettingRow>
                    <SettingRow icon={Cookie} title={t('preferenceCookies', lang)}>
                      <Toggle checked={draft.cookies.preferences} onChange={(value) => updateDraft({ cookies: { preferences: value } })} />
                    </SettingRow>
                    <SettingRow icon={SlidersHorizontal} title={t('analyticsCookies', lang)}>
                      <Toggle checked={draft.cookies.analytics} onChange={(value) => updateDraft({ cookies: { analytics: value } })} />
                    </SettingRow>
                  </div>
                </div>

                <div className="rounded-[26px] border border-white/75 bg-white/58 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-black">
                    <Image className="h-4 w-4 text-gold" />
                    {t('permissionsTitle', lang)}
                  </div>
                  <div className="grid gap-3">
                    <SettingRow icon={ShieldCheck} title={t('askBeforeFiles', lang)}>
                      <Toggle checked={draft.permissions.askBeforeFiles} onChange={(value) => updateDraft({ permissions: { askBeforeFiles: value } })} />
                    </SettingRow>
                    <SettingRow icon={Image} title={t('allowImageContext', lang)}>
                      <Toggle checked={draft.permissions.allowImageContext} onChange={(value) => updateDraft({ permissions: { allowImageContext: value } })} />
                    </SettingRow>
                    <SettingRow icon={ShieldCheck} title={t('allowSecureDocuments', lang)}>
                      <Toggle checked={draft.permissions.allowSecureDocuments} onChange={(value) => updateDraft({ permissions: { allowSecureDocuments: value } })} />
                    </SettingRow>
                  </div>
                </div>
              </section>

              <section className="rounded-[26px] border border-white/75 bg-white/58 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-black">
                  <Mic className="h-4 w-4 text-gold" />
                  {t('chatTitle', lang)}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <SettingRow icon={Volume2} title={t('autoReadNext', lang)}>
                    <Toggle checked={draft.chat.autoReadNextStep} onChange={(value) => updateDraft({ chat: { autoReadNextStep: value } })} />
                  </SettingRow>
                  <SettingRow icon={ShieldCheck} title={t('saveMemory', lang)}>
                    <Toggle checked={draft.chat.saveSessionMemory} onChange={(value) => updateDraft({ chat: { saveSessionMemory: value } })} />
                  </SettingRow>
                  <label className="grid gap-1.5 rounded-[22px] border border-navy/8 bg-white/72 p-3 text-[11px] font-black text-navy/55 sm:col-span-2">
                    {t('responseDepth', lang)}
                    <select
                      value={draft.chat.responseDepth}
                      onChange={(event) => updateDraft({ chat: { responseDepth: event.target.value } })}
                      className="h-11 rounded-2xl border border-navy/10 bg-white px-3 text-xs font-bold text-navy outline-none focus:border-emerald-600/40"
                    >
                      <option value="concise">{t('concise', lang)}</option>
                      <option value="balanced">{t('balanced', lang)}</option>
                      <option value="detailed">{t('detailed', lang)}</option>
                    </select>
                  </label>
                </div>
              </section>
            </div>

            <div className="relative mt-5 flex flex-col gap-3 border-t border-navy/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => updateDraft(DEFAULT_SMART_APPLY_SETTINGS)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-navy/10 bg-white/70 px-4 py-3 text-xs font-black text-navy/60 transition hover:text-navy"
              >
                <RotateCcw className="h-4 w-4" />
                {t('reset', lang)}
              </button>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {saved && <span className="text-center text-[11px] font-black text-emerald-700">{t('saved', lang)}</span>}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-navy/10 bg-white/70 px-5 py-3 text-xs font-black text-navy/60 transition hover:text-navy"
                >
                  {t('cancel', lang)}
                </button>
                <button
                  type="button"
                  onClick={save}
                  className="rounded-full bg-emerald-700 px-5 py-3 text-xs font-black text-white shadow-[0_12px_30px_rgba(5,150,105,0.22)] transition hover:bg-emerald-800"
                >
                  {t('save', lang)}
                </button>
              </div>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
