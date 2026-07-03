import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bug,
  Check,
  Copy,
  Loader2,
  Send,
  Share2,
  Volume2,
  X,
} from 'lucide-react';
import { L, dirFor } from '../../lib/lang';
import { PRODUCT_NAME } from '../../lib/constants';
import { readSmartApplySettings } from '../../lib/smartApplySettings';
import { playRealtimeVoicePreview } from '../../services/realtimeVoiceService';
import { reportSmartApplyMessageIssue } from '../../services/smartApplyFeedbackService';

const COPY_TEXT = {
  copy: { fa: 'کپی', en: 'Copy', tr: 'Kopyala', ar: 'نسخ' },
  copied: { fa: 'کپی شد', en: 'Copied', tr: 'Kopyalandı', ar: 'تم النسخ' },
  speak: { fa: 'خواندن', en: 'Speak', tr: 'Oku', ar: 'اقرأ' },
  speaking: { fa: 'در حال خواندن', en: 'Speaking', tr: 'Okunuyor', ar: 'جارٍ القراءة' },
  forward: { fa: 'ارسال', en: 'Forward', tr: 'Gönder', ar: 'إرسال' },
  bug: { fa: 'گزارش باگ', en: 'Report bug', tr: 'Hata bildir', ar: 'إبلاغ عن خطأ' },
  shareTitle: { fa: 'پیش‌نمایش ارسال پیام', en: 'Message forward preview', tr: 'Mesaj gönderim önizlemesi', ar: 'معاينة إرسال الرسالة' },
  shareLead: {
    fa: 'این پیام از چت‌بات Smart Apply سایت آکا ارسال می‌شود.',
    en: 'This message is forwarded from the ACCA Smart Apply chatbot.',
    tr: 'Bu mesaj ACCA Smart Apply sohbetinden gönderiliyor.',
    ar: 'يتم إرسال هذه الرسالة من محادثة ACCA Smart Apply.',
  },
  nativeShare: { fa: 'ارسال با دستگاه', en: 'Share from device', tr: 'Cihazdan paylaş', ar: 'مشاركة من الجهاز' },
  close: { fa: 'بستن', en: 'Close', tr: 'Kapat', ar: 'إغلاق' },
  bugTitle: { fa: 'گزارش مشکل این پیام', en: 'Report this message', tr: 'Bu mesajı bildir', ar: 'الإبلاغ عن هذه الرسالة' },
  bugBody: {
    fa: 'اگر این پاسخ اشتباه، ناقص، نامرتبط یا از نظر فنی مشکل‌دار است، برای تیم آکا گزارش کنید.',
    en: 'If this reply is wrong, incomplete, unrelated, or technically broken, report it to the ACCA team.',
    tr: 'Bu yanıt yanlış, eksik, ilgisiz veya teknik olarak sorunluysa ACCA ekibine bildirin.',
    ar: 'إذا كانت هذه الإجابة خاطئة أو ناقصة أو غير مرتبطة أو بها خلل تقني، أبلغ فريق ACCA.',
  },
  bugPlaceholder: {
    fa: 'اختیاری: خیلی کوتاه بنویسید مشکل چیست...',
    en: 'Optional: briefly describe the issue...',
    tr: 'İsteğe bağlı: sorunu kısaca yazın...',
    ar: 'اختياري: اشرح المشكلة باختصار...',
  },
  sendBug: { fa: 'ارسال گزارش', en: 'Send report', tr: 'Raporu gönder', ar: 'إرسال التقرير' },
  sentBug: { fa: 'گزارش ارسال شد', en: 'Report sent', tr: 'Rapor gönderildi', ar: 'تم إرسال التقرير' },
  failedBug: { fa: 'ارسال گزارش انجام نشد', en: 'Report failed', tr: 'Rapor gönderilemedi', ar: 'فشل إرسال التقرير' },
};

function t(key, lang) {
  return L(COPY_TEXT[key], lang);
}

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function messageToShareText(message, lang) {
  const parts = [];
  if (message?.content) parts.push(String(message.content).trim());
  if (Array.isArray(message?.actions) && message.actions.length) {
    const options = message.actions
      .slice(0, 8)
      .map((action, index) => `${index + 1}. ${action.label}`)
      .join('\n');
    if (options) {
      parts.push(lang === 'fa' ? `گزینه‌ها:\n${options}` : `Options:\n${options}`);
    }
  }
  if (!parts.length && message?.component) {
    parts.push(lang === 'fa'
      ? `یک کارت نتیجه/راهنما در ${PRODUCT_NAME} نمایش داده شده است.`
      : `A result or guidance card was shown in ${PRODUCT_NAME}.`);
  }
  return parts.join('\n\n').trim();
}

function brandedForwardText(messageText, lang) {
  const url = typeof window !== 'undefined' ? window.location.href : 'https://accatransfer.com/smart-apply';
  const lead = t('shareLead', lang);
  return `${lead}\n\n${messageText}\n\n${url}`;
}

async function writeClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', 'true');
  area.style.position = 'fixed';
  area.style.left = '-10000px';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  area.remove();
}

function ToolButton({ icon: Icon, label, onClick, disabled, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-black transition disabled:cursor-wait disabled:opacity-60 ${
        active
          ? 'border-emerald-600/25 bg-emerald-600/[0.10] text-emerald-800'
          : 'border-navy/8 bg-white/68 text-navy/50 hover:border-gold/35 hover:text-navy'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function PreviewModal({ open, lang, title, children, onClose }) {
  const dir = dirFor(lang);
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          dir={dir}
          className="fixed inset-0 z-[9999] isolate flex items-end justify-center overflow-y-auto overscroll-contain bg-navy/40 p-3 backdrop-blur-xl sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="relative my-4 max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-hidden rounded-[28px] border border-white/80 bg-cream/97 p-4 text-navy shadow-[0_34px_100px_rgba(7,26,61,0.30)] sm:my-6 sm:p-5"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-navy/10 bg-white/80 text-navy/55 transition hover:text-navy"
              aria-label={t('close', lang)}
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="pe-10 text-base font-black">{title}</h3>
            {children}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default function MessageTools({ message, lang }) {
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);
  const [bugNote, setBugNote] = useState('');
  const [bugStatus, setBugStatus] = useState('idle');
  const [speaking, setSpeaking] = useState(false);
  const speechRef = useRef(null);

  const messageText = useMemo(() => messageToShareText(message, lang), [message, lang]);
  const forwardText = useMemo(() => brandedForwardText(messageText, lang), [messageText, lang]);
  const canUse = cleanText(messageText).length > 0;

  if (!canUse) return null;

  const copyMessage = async () => {
    await writeClipboard(messageText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1300);
  };

  const speakMessage = async () => {
    speechRef.current?.stop?.();
    speechRef.current = null;
    setSpeaking(true);
    try {
      const settings = readSmartApplySettings();
      speechRef.current = await playRealtimeVoicePreview({
        language: lang,
        voiceId: settings.voiceId,
        outputDeviceId: settings.outputDeviceId,
        text: messageText.slice(0, 1400),
        sessionId: `message_read_${message.id || Date.now()}`,
        onEnded: () => {
          speechRef.current = null;
          setSpeaking(false);
        },
      });
    } catch {
      setSpeaking(false);
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: PRODUCT_NAME,
        text: forwardText,
      });
      return;
    }
    await writeClipboard(forwardText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1300);
  };

  const sendBug = async () => {
    if (bugStatus === 'sending') return;
    setBugStatus('sending');
    try {
      await reportSmartApplyMessageIssue({
        product: 'smart_apply',
        language: lang,
        pageUrl: typeof window !== 'undefined' ? window.location.href : '',
        message: {
          id: message.id,
          role: message.role,
          component: message.component || null,
          content: message.content || '',
          actions: (message.actions || []).map((action) => ({ label: action.label, nextIntent: action.nextIntent })),
          meta: message.meta || null,
        },
        messageText,
        note: bugNote,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      });
      setBugStatus('sent');
      window.setTimeout(() => {
        setBugOpen(false);
        setBugStatus('idle');
        setBugNote('');
      }, 1200);
    } catch {
      setBugStatus('failed');
    }
  };

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <ToolButton icon={copied ? Check : Copy} label={copied ? t('copied', lang) : t('copy', lang)} onClick={copyMessage} active={copied} />
        <ToolButton icon={speaking ? Loader2 : Volume2} label={speaking ? t('speaking', lang) : t('speak', lang)} onClick={speakMessage} disabled={speaking} active={speaking} />
        <ToolButton icon={Share2} label={t('forward', lang)} onClick={() => setShareOpen(true)} />
        <ToolButton icon={Bug} label={t('bug', lang)} onClick={() => setBugOpen(true)} />
      </div>

      <PreviewModal open={shareOpen} lang={lang} title={t('shareTitle', lang)} onClose={() => setShareOpen(false)}>
        <p className="mt-2 text-xs font-bold leading-6 text-navy/55">{t('shareLead', lang)}</p>
        <div className="sa-scroll mt-4 max-h-[45vh] overflow-y-auto rounded-[22px] border border-gold/20 bg-white/75 p-4 shadow-inner">
          <p className="whitespace-pre-line text-sm font-bold leading-7 text-navy">{messageText}</p>
        </div>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setShareOpen(false)}
            className="rounded-full border border-navy/10 bg-white/75 px-4 py-2.5 text-xs font-black text-navy/60 hover:text-navy"
          >
            {t('close', lang)}
          </button>
          <button
            type="button"
            onClick={nativeShare}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-navy px-4 py-2.5 text-xs font-black text-white shadow-[0_12px_28px_rgba(7,26,61,0.20)]"
          >
            <Send className="h-3.5 w-3.5" />
            {t('nativeShare', lang)}
          </button>
        </div>
      </PreviewModal>

      <PreviewModal open={bugOpen} lang={lang} title={t('bugTitle', lang)} onClose={() => setBugOpen(false)}>
        <p className="mt-2 text-xs font-bold leading-6 text-navy/55">{t('bugBody', lang)}</p>
        <div className="mt-3 max-h-40 overflow-y-auto rounded-[20px] border border-navy/8 bg-white/70 p-3 text-xs font-bold leading-6 text-navy/70 sa-scroll">
          {messageText}
        </div>
        <textarea
          value={bugNote}
          onChange={(event) => setBugNote(event.target.value)}
          placeholder={t('bugPlaceholder', lang)}
          className="mt-3 min-h-24 w-full resize-none rounded-[20px] border border-navy/10 bg-white/80 p-3 text-sm font-semibold leading-7 text-navy outline-none transition placeholder:text-navy/30 focus:border-emerald-600/35"
        />
        {bugStatus === 'failed' && <p className="mt-2 text-xs font-black text-rose-700">{t('failedBug', lang)}</p>}
        {bugStatus === 'sent' && <p className="mt-2 text-xs font-black text-emerald-700">{t('sentBug', lang)}</p>}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={sendBug}
            disabled={bugStatus === 'sending' || bugStatus === 'sent'}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-4 py-2.5 text-xs font-black text-white shadow-[0_12px_28px_rgba(5,150,105,0.20)] disabled:cursor-wait disabled:opacity-70"
          >
            {bugStatus === 'sending' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bug className="h-3.5 w-3.5" />}
            {bugStatus === 'sent' ? t('sentBug', lang) : t('sendBug', lang)}
          </button>
        </div>
      </PreviewModal>
    </>
  );
}
