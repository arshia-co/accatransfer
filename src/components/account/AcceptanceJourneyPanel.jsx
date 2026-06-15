import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Download,
  FileCheck2,
  Hotel,
  LoaderCircle,
  MessageCircle,
  Plane,
  ScanText,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { WHATSAPP_URL } from '../../lib/constants';
import { createDocumentSignedUrl } from '../../services/accountService';

function waLink(message) {
  return `${WHATSAPP_URL}?text=${encodeURIComponent(message)}`;
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value;
  }
}

// The post-acceptance roadmap. The exact numbers (tuition, deposit, dates) come
// from the student's real acceptance letter via OCR + AI; these steps frame them.
const STEPS = [
  {
    icon: FileCheck2,
    title: 'پذیرش‌نامه را با دقت بخوانید',
    desc: 'مبلغ شهریه، مهلت پرداخت، مبلغ دیپوزیت خوابگاه و تاریخ حضور در دانشگاه، همگی داخل همین نامه نوشته شده‌اند.',
  },
  {
    icon: Wallet,
    title: 'پیش‌پرداخت / دیپوزیت را واریز کنید',
    desc: 'برای قطعی‌شدن جایگاه و رزرو خوابگاه، مبلغ تعیین‌شده در پذیرش باید تا مهلت مشخص پرداخت شود.',
  },
  {
    icon: Plane,
    title: 'پرواز و اقامت را رزرو کنید',
    desc: 'بلیط پرواز و هتل یا خوابگاه را هماهنگ کنید؛ تیم ما در انتخاب و رزرو در کنار شماست.',
  },
  {
    icon: CalendarClock,
    title: 'به‌موقع وارد ترکیه شوید',
    desc: 'تا پایان مهلت ثبت‌نام باید در دانشگاه حاضر شوید؛ تاریخ دقیق آن در پذیرش‌نامه آمده است.',
  },
  {
    icon: BadgeCheck,
    title: 'ثبت‌نام حضوری را کامل کنید',
    desc: 'در صورت نیاز، متخصص ثبت‌نام ما به‌صورت رایگان همراه شما خواهد بود.',
  },
];

export default function AcceptanceJourneyPanel({
  submission,
  acceptanceDoc,
  onRequestRegistrationHelp,
  helpBusy,
}) {
  const [showOcr, setShowOcr] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const accepted = Boolean(acceptanceDoc);
  const ocrSummary = acceptanceDoc?.ai_extraction?.summary;

  const openAcceptance = async () => {
    if (!acceptanceDoc?.object_path || downloading) return;
    setDownloading(true);
    try {
      const url = await createDocumentSignedUrl(acceptanceDoc.object_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      // Signed-URL generation failed; the panel stays usable.
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.section
      className="acceptance-journey"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <header className="acceptance-head">
        <span><Sparkles size={20} /></span>
        <div>
          <p className="account-kicker">After Application</p>
          <h3>{accepted ? 'پذیرش شما صادر شد 🎉' : 'درخواست شما ثبت شد — مراحل بعدی'}</h3>
          <p>
            {accepted
              ? 'پذیرش‌نامه‌تان آماده است؛ آن را دانلود کنید و مراحل زیر را دنبال کنید.'
              : 'پرونده شما برای صدور پذیرش در صف بررسی دانشگاه قرار گرفت.'}
          </p>
        </div>
        <span className={`acceptance-status ${accepted ? 'is-accepted' : 'is-pending'}`}>
          {accepted ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}
          {accepted ? 'پذیرش صادر شد' : 'در انتظار پذیرش'}
        </span>
      </header>

      <div className="acceptance-record">
        <div>
          <small>تاریخ ثبت درخواست</small>
          <b>{formatDate(submission?.submitted_at || submission?.created_at)}</b>
        </div>
        <div>
          <small>کد پیگیری</small>
          <b dir="ltr">{submission?.id ? String(submission.id).slice(0, 8) : '—'}</b>
        </div>
        <div>
          <small>وضعیت</small>
          <b>{accepted ? 'پذیرش آماده' : 'در حال بررسی'}</b>
        </div>
      </div>

      {accepted ? (
        <div className="acceptance-doc">
          <FileCheck2 size={18} />
          <div>
            <b>{acceptanceDoc.original_name || 'نامه پذیرش'}</b>
            <small>پذیرش رسمی دانشگاه</small>
          </div>
          {acceptanceDoc.object_path ? (
            <button type="button" className="acceptance-download" onClick={openAcceptance} disabled={downloading}>
              {downloading ? <LoaderCircle className="account-spin" size={15} /> : <Download size={15} />}
              دانلود پذیرش
            </button>
          ) : (
            <span className="acceptance-soon">به‌زودی قابل دانلود</span>
          )}
        </div>
      ) : (
        <p className="acceptance-pending-note">
          به‌محض صدور پذیرش از سوی دانشگاه، فایل آن همین‌جا برای دانلود قرار می‌گیرد و از طریق ایمیل یا تلگرام هم برایتان ارسال می‌شود.
        </p>
      )}

      {ocrSummary && (
        <div className="acceptance-ocr">
          <button type="button" className="account-ocr-toggle" onClick={() => setShowOcr((value) => !value)} aria-expanded={showOcr}>
            {showOcr ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            توضیح هوشمند پذیرش (OCR + AI)
          </button>
          {showOcr && (
            <p className="acceptance-ocr-text"><ScanText size={14} /> {ocrSummary}</p>
          )}
        </div>
      )}

      <ol className="acceptance-steps">
        {STEPS.map((step, index) => (
          <li key={step.title}>
            <span className="acceptance-step-num">{index + 1}</span>
            <span className="acceptance-step-icon"><step.icon size={16} /></span>
            <div>
              <b>{step.title}</b>
              <small>{step.desc}</small>
            </div>
          </li>
        ))}
      </ol>

      <div className="acceptance-visa">
        <ShieldCheck size={18} />
        <div>
          <b>برای ورود به ترکیه ویزا لازم نیست</b>
          <small>
            اگر تابعیت ایران، آذربایجان، عراق یا دیگر کشورهای معاف از ویزای ترکیه را دارید، می‌توانید مستقیماً از کشور خود وارد ترکیه شوید و ثبت‌نام را تکمیل کنید؛ پس قوانین ویزای دانشجویی شامل شما نمی‌شود.
          </small>
        </div>
      </div>

      <div className="acceptance-ctas">
        <a className="acceptance-wa" href={waLink('سلام، درباره پذیرش و مراحل بعد از آن سؤال دارم.')} target="_blank" rel="noreferrer">
          <MessageCircle size={16} /> سوال دارید؟ از واتساپ بپرسید
        </a>
        <a className="acceptance-wa" href={waLink('سلام، برای پیدا کردن هتل یا خوابگاه در ترکیه به کمک نیاز دارم.')} target="_blank" rel="noreferrer">
          <Hotel size={16} /> پیدا کردن هتل یا خوابگاه
        </a>
        <button type="button" className="acceptance-help" onClick={onRequestRegistrationHelp} disabled={helpBusy}>
          {helpBusy ? <LoaderCircle className="account-spin" size={16} /> : <BadgeCheck size={16} />}
          درخواست کمک حضوری رایگان برای ثبت‌نام
        </button>
      </div>
      <p className="acceptance-help-note">
        همراهی برای ثبت‌نام حضوری در دانشگاه از سوی تیم ما رایگان است؛ پس از درخواست، کارشناس ما با شما هماهنگ می‌کند.
      </p>
    </motion.section>
  );
}
