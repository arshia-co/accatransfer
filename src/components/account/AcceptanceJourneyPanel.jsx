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
  AlertTriangle,
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

function formatMoney(amount, currency) {
  if (!amount) return '';
  const normalizedAmount = String(amount).trim();
  const normalizedCurrency = String(currency || '').trim();
  if (!normalizedCurrency) return normalizedAmount;
  const upperAmount = normalizedAmount.toUpperCase();
  const upperCurrency = normalizedCurrency.toUpperCase();
  const alreadyIncludesCurrency = upperAmount.includes(upperCurrency)
    || (upperCurrency === 'USD' && normalizedAmount.includes('$'))
    || (upperCurrency === 'EUR' && normalizedAmount.includes('€'))
    || (upperCurrency === 'TRY' && /₺|\bTL\b/i.test(normalizedAmount));
  return alreadyIncludesCurrency ? normalizedAmount : `${normalizedAmount} ${normalizedCurrency}`;
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
  const offerDetails = acceptanceDoc?.ai_extraction?.offer_details;
  const offerStatus = offerDetails?.status;
  const isConditional = offerStatus === 'conditional_offer' || offerStatus === 'provisional_acceptance';
  const isFinal = offerStatus === 'final_acceptance';
  const needsReview = accepted && acceptanceDoc?.review_status === 'admin_review';
  const acceptanceTitle = !accepted
    ? 'درخواست شما ثبت شد — مراحل بعدی'
    : isFinal
      ? 'پذیرش نهایی شما صادر شد 🎉'
      : isConditional
        ? 'پذیرش مشروط شما صادر شد'
        : needsReview
          ? 'نامه دانشگاه دریافت شد و نیازمند بررسی است'
          : 'نامه پذیرش شما دریافت شد';
  const acceptanceDescription = !accepted
    ? 'پرونده شما برای صدور پذیرش در صف بررسی دانشگاه قرار گرفت.'
    : isFinal
      ? 'پذیرش نهایی آماده است؛ فایل را دانلود کنید و مراحل ثبت‌نام را ادامه دهید.'
      : isConditional
        ? 'این نامه شامل شرط‌هایی است که باید پیش از صدور پذیرش نهایی تکمیل شوند.'
        : needsReview
          ? 'فایل در حساب شما ذخیره شده است؛ نتیجه OCR یا نوع نامه باید توسط تیم پذیرش بررسی شود.'
          : 'فایل دانشگاه آماده است؛ آن را دانلود کنید و توضیح هوشمند را با متن اصلی تطبیق دهید.';
  const statusLabel = !accepted
    ? 'در انتظار پذیرش'
    : isFinal
      ? 'پذیرش نهایی'
      : isConditional
        ? 'پذیرش مشروط'
        : needsReview
          ? 'نیازمند بررسی'
          : 'نامه دریافت شد';
  const documentLabel = isFinal
    ? 'پذیرش نهایی دانشگاه'
    : isConditional
      ? 'نامه پذیرش مشروط دانشگاه'
      : 'نامه رسمی دانشگاه';
  const offerFacts = [
    ['سال تحصیلی', offerDetails?.academic_year],
    ['شهریه', formatMoney(offerDetails?.tuition_amount, offerDetails?.tuition_currency)],
    ['دیپوزیت', formatMoney(offerDetails?.deposit_amount, offerDetails?.deposit_currency)],
    ['مهلت پرداخت', offerDetails?.payment_deadline],
    ['مهلت ثبت‌نام', offerDetails?.registration_deadline],
    ['شرط زبان', offerDetails?.language_requirement],
    ['بورسیه یا تخفیف', offerDetails?.scholarship_or_discount],
  ].filter(([, value]) => value);

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
          <h3>{acceptanceTitle}</h3>
          <p>{acceptanceDescription}</p>
        </div>
        <span className={`acceptance-status ${
          !accepted ? 'is-pending' : isConditional || needsReview ? 'is-conditional' : 'is-accepted'
        }`}>
          {accepted ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}
          {statusLabel}
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
          <b>{statusLabel}</b>
        </div>
      </div>

      {accepted ? (
        <div className="acceptance-doc">
          <FileCheck2 size={18} />
          <div>
            <b>{acceptanceDoc.original_name || 'نامه پذیرش'}</b>
            <small>{documentLabel}</small>
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

      {accepted && offerFacts.length > 0 && (
        <div className="acceptance-facts">
          {offerFacts.map(([label, value]) => (
            <div key={label}>
              <small>{label}</small>
              <b dir="auto">{value}</b>
            </div>
          ))}
        </div>
      )}

      {accepted && offerDetails?.visa_usable === false && (
        <div className="acceptance-offer-warning">
          <AlertTriangle size={18} />
          <div>
            <b>این فایل برای فرایند ویزا قابل استفاده نیست</b>
            <small>این محدودیت در خود نامه دانشگاه ذکر شده است. برای مدرک مناسب ویزا با تیم پذیرش هماهنگ کنید.</small>
          </div>
        </div>
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
