import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpLeft,
  BadgeCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Download,
  AlertTriangle,
  FileCheck2,
  FileSearch,
  Hotel,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Plane,
  ReceiptText,
  ScanText,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import { WHATSAPP_URL } from '../../lib/constants';
import { createDocumentSignedUrl } from '../../services/accountService';
import { getLocalizedOcrSummary } from '../../services/ocrNarrativeService';

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
    key: 'read',
    icon: FileCheck2,
    title: 'پذیرش‌نامه را با دقت بخوانید',
    desc: 'مبلغ شهریه، مهلت پرداخت، مبلغ دیپوزیت خوابگاه و تاریخ حضور در دانشگاه، همگی داخل همین نامه نوشته شده‌اند.',
  },
  {
    key: 'payment',
    icon: Wallet,
    title: 'پیش‌پرداخت / دیپوزیت را واریز کنید',
    desc: 'برای قطعی‌شدن جایگاه و رزرو خوابگاه، مبلغ تعیین‌شده در پذیرش باید تا مهلت مشخص پرداخت شود.',
  },
  {
    key: 'travel',
    icon: Plane,
    title: 'پرواز و اقامت را رزرو کنید',
    desc: 'بلیط پرواز و هتل یا خوابگاه را هماهنگ کنید؛ تیم ما در انتخاب و رزرو در کنار شماست.',
  },
  {
    key: 'arrival',
    icon: CalendarClock,
    title: 'به‌موقع وارد ترکیه شوید',
    desc: 'تا پایان مهلت ثبت‌نام باید در دانشگاه حاضر شوید؛ تاریخ دقیق آن در پذیرش‌نامه آمده است.',
  },
  {
    key: 'registration',
    icon: BadgeCheck,
    title: 'ثبت‌نام حضوری را کامل کنید',
    desc: 'در صورت نیاز، متخصص ثبت‌نام ما به‌صورت رایگان همراه شما خواهد بود.',
  },
];

const GUIDE_COPY = {
  read: {
    eyebrow: 'مرحله ۱ · کنترل نامه',
    intro: 'اول مشخص کنید نامه شما پذیرش نهایی، پذیرش مشروط یا صرفاً Offer Letter است. این تفاوت روی امکان ثبت‌نام، پرداخت و استفاده اداری از نامه اثر دارد.',
    focus: ['header', 'fees', 'conditions'],
    checklist: [
      'نام دانشجو، شماره درخواست، دانشگاه، دانشکده و رشته را با اطلاعات خودتان تطبیق دهید.',
      'تاریخ اعتبار نامه را با مهلت پرداخت و مهلت ثبت‌نام یکی ندانید؛ هرکدام ممکن است تاریخ جداگانه داشته باشند.',
      'فهرست مدارک لازم، شرط زبان، ترجمه یا تأیید رسمی مدارک و هر شرط تکمیلی را یادداشت کنید.',
      'هشدارهای مربوط به ویزا، بازگشت وجه و قطعی‌نبودن ظرفیت را کامل بخوانید.',
    ],
    selfPath: 'فایل اصلی را باز کنید و هر مقدار نمایش‌داده‌شده در این پنل را با متن نامه تطبیق دهید. موارد مبهم را قبل از هر پرداخت از دانشگاه تأیید کتبی بگیرید.',
    accaPath: 'تیم آکا نامه را همراه شما مرور می‌کند، شرط‌ها و ددلاین‌ها را روشن می‌کند و برای موارد مبهم از دانشگاه پیگیری می‌گیرد. این راهنمایی هزینه‌ای ندارد.',
    note: 'در قالب Biruni، اطلاعات هویتی و اعتبار نامه در بالای صفحه، مدارک لازم در متن میانی و جدول هزینه‌ها در نیمه پایین صفحه آمده‌اند.',
  },
  payment: {
    eyebrow: 'مرحله ۲ · پرداخت امن',
    intro: 'قبل از حواله، مبلغ دیپوزیت، مبلغ کل شهریه، مهلت پرداخت، شرایط بازگشت وجه و مشخصات حساب دانشگاه را از همان فایل رسمی بررسی کنید.',
    focus: ['fees', 'conditions', 'bank'],
    checklist: [
      'نام صاحب حساب باید با نام رسمی دانشگاه یا نهاد معرفی‌شده در نامه مطابقت داشته باشد.',
      'در توضیحات حواله، شماره درخواست و نام کامل یا شماره پاسپورت را دقیقاً مطابق دستور نامه درج کنید.',
      'اگر بورسیه یا تخفیف دارید، پیش از پرداخت مطمئن شوید مبلغ تخفیف‌خورده در نامه یا تأییدیه رسمی ثبت شده است.',
      'رسید نهایی حواله را نگه دارید و برای دانشگاه یا تیم آکا ارسال کنید؛ اسکرین‌شات درخواست پرداخت، رسید بانکی نیست.',
    ],
    selfPath: 'می‌توانید شخصاً از بانک یا صرافی مجاز و روش مورد تأیید دانشگاه استفاده کنید. هرگز از روی PDF نمونه، تصویر شبکه‌های اجتماعی یا حسابی که جداگانه برایتان فرستاده شده پرداخت نکنید.',
    accaPath: 'برای دانشجویان داخل ایران، آکا می‌تواند بررسی نامه، هماهنگی روش حواله و ثبت رسید نزد دانشگاه را رایگان همراهی کند. مبلغ دانشگاه و کارمزد بانک یا صرافی همچنان بر عهده دانشجو است.',
    note: 'در قالب Biruni، جدول شهریه و دیپوزیت در میانه صفحه و بخش BANK DETAILS در پایین صفحه قرار دارد. اطلاعات بانکی هر دانشجو باید فقط از نامه واقعی خودش خوانده شود.',
  },
  travel: {
    eyebrow: 'مرحله ۳ · سفر و اقامت',
    intro: 'رزرو پرواز و اقامت را بعد از روشن‌شدن وضعیت پرداخت، زمان حضور و مدارک ورود انجام دهید تا هزینه تغییر یا لغو ناخواسته ایجاد نشود.',
    focus: ['header', 'fees'],
    checklist: [
      'آخرین تاریخ حضور یا ثبت‌نام را پیدا کنید و چند روز کاری حاشیه امن برای سفر در نظر بگیرید.',
      'قوانین ورود، اقامت تحصیلی و اعتبار پاسپورت را بر اساس تابعیت خود از منبع رسمی بررسی کنید.',
      'برای رزرو اولیه، گزینه قابل استرداد یا قابل تغییر را در اولویت بگذارید.',
      'فاصله اقامتگاه تا دانشگاه، هزینه رفت‌وآمد و زمان تحویل اتاق را قبل از پرداخت بررسی کنید.',
    ],
    selfPath: 'می‌توانید پرواز، هتل یا خوابگاه را مستقل رزرو کنید؛ فقط تاریخ را با ددلاین رسمی نامه و پاسخ دانشگاه هماهنگ نگه دارید.',
    accaPath: 'تیم آکا می‌تواند گزینه‌های اقامت، مسیر رسیدن به دانشگاه و زمان مناسب سفر را با شما مرور کند. انتخاب و پرداخت نهایی همیشه با تأیید خود دانشجو انجام می‌شود.',
    note: 'Offer Letter معمولاً جای بلیط یا رزرو اقامت را مشخص نمی‌کند؛ تاریخ‌های نامه ورودی تصمیم شما هستند، نه توصیه قطعی برای خرید.',
  },
  arrival: {
    eyebrow: 'مرحله ۴ · مدیریت ددلاین',
    intro: 'تاریخ اعتبار Offer Letter، مهلت پرداخت، آخرین روز ثبت‌نام و تاریخ پیشنهادی ورود چهار مفهوم جدا هستند. پنل فقط تاریخ‌هایی را نشان می‌دهد که واقعاً از نامه استخراج شده‌اند.',
    focus: ['header', 'fees', 'conditions'],
    checklist: [
      'اگر مهلت ثبت‌نام در نامه نیامده، از دانشگاه تأیید کتبی بگیرید و به حدس یا تاریخ سال قبل تکیه نکنید.',
      'برای ترجمه، تأیید مدارک و تأخیر احتمالی پرواز زمان جداگانه در نظر بگیرید.',
      'نسخه PDF نامه، رسید پرداخت و مدارک اصلی را هم در فضای امن آنلاین و هم همراه خود نگه دارید.',
      'در صورت احتمال تأخیر، قبل از ددلاین با دانشگاه و تیم آکا تماس بگیرید؛ تمدید فقط با تأیید دانشگاه معتبر است.',
    ],
    selfPath: 'می‌توانید برنامه ورود را خودتان تنظیم کنید؛ یک تقویم بسازید و تاریخ‌های پرداخت، پرواز و ثبت‌نام را جدا ثبت کنید.',
    accaPath: 'آکا می‌تواند ددلاین‌های پرونده را با شما چک کند و در صورت ابهام برای تأیید تاریخ درست با دانشگاه هماهنگ شود.',
    note: 'در نمونه Biruni، Offer Letter Expiration Date در بالای صفحه و Payment Deadline داخل جدول هزینه‌ها قرار دارد؛ این دو الزاماً یک معنا ندارند.',
  },
  registration: {
    eyebrow: 'مرحله ۵ · ثبت‌نام دانشگاه',
    intro: 'ثبت‌نام حضوری زمانی کامل است که دانشگاه اصل مدارک، پرداخت و شرط‌های پذیرش را تأیید کند. داشتن Offer Letter به‌تنهایی به معنی تکمیل ثبت‌نام نیست.',
    focus: ['header', 'conditions'],
    checklist: [
      'اصل پاسپورت، پذیرش، رسید پرداخت، مدرک تحصیلی و ریزنمرات را همراه داشته باشید.',
      'ترجمه رسمی، تأییدات و مدرک زبان را فقط مطابق الزام نامه یا دانشگاه آماده کنید.',
      'پیش از مراجعه، محل و ساعت دفتر ثبت‌نام و نیاز احتمالی به وقت قبلی را تأیید کنید.',
      'پس از ثبت‌نام، رسید یا Student Certificate و اطلاعات ورود به سامانه دانشجویی را دریافت کنید.',
    ],
    selfPath: 'اگر ترجیح می‌دهید مستقل پیش بروید، این چک‌لیست را آماده کنید و مستقیم در بازه اعلام‌شده به دفتر دانشجویان بین‌المللی دانشگاه مراجعه کنید.',
    accaPath: 'در صورت درخواست، کارشناس آکا برای آماده‌سازی پرونده و همراهی ثبت‌نام حضوری کنار شماست. این همراهی رایگان است و تصمیم نهایی مدارک با دانشگاه خواهد بود.',
    note: 'در نمونه Biruni، مدارک پایه در متن میانی نامه فهرست شده‌اند؛ دانشگاه ممکن است بر اساس پرونده مدارک تکمیلی هم درخواست کند.',
  },
};

const DOCUMENT_AREAS = [
  { id: 'header', label: 'بالای نامه', detail: 'نوع نامه، شماره درخواست و تاریخ اعتبار' },
  { id: 'fees', label: 'جدول هزینه‌ها', detail: 'شهریه، دیپوزیت و مهلت پرداخت' },
  { id: 'conditions', label: 'شرایط و هشدارها', detail: 'مدارک، بازگشت وجه و محدودیت‌ها' },
  { id: 'bank', label: 'پایین نامه', detail: 'اطلاعات بانکی رسمی دانشگاه' },
];

function getGuideFacts(stepKey, offerDetails) {
  const all = {
    academicYear: ['سال تحصیلی', offerDetails?.academic_year],
    tuition: ['شهریه', formatMoney(offerDetails?.tuition_amount, offerDetails?.tuition_currency)],
    deposit: ['دیپوزیت', formatMoney(offerDetails?.deposit_amount, offerDetails?.deposit_currency)],
    payment: ['مهلت پرداخت', offerDetails?.payment_deadline],
    registration: ['مهلت ثبت‌نام', offerDetails?.registration_deadline],
    arrival: ['تاریخ حضور', offerDetails?.arrival_date],
    language: ['شرط زبان', offerDetails?.language_requirement],
    discount: ['بورسیه یا تخفیف', offerDetails?.scholarship_or_discount],
  };
  const keys = {
    read: ['academicYear', 'tuition', 'deposit', 'payment', 'registration', 'language'],
    payment: ['tuition', 'deposit', 'payment', 'discount'],
    travel: ['arrival', 'registration'],
    arrival: ['registration', 'arrival', 'payment'],
    registration: ['registration', 'language'],
  }[stepKey] || [];
  return keys.map((key) => all[key]).filter(([, value]) => value);
}

function AcceptanceGuideModal({
  step,
  offerDetails,
  accepted,
  downloading,
  theme,
  onClose,
  onOpenAcceptance,
  onRequestRegistrationHelp,
  helpBusy,
}) {
  const modalRef = useRef(null);
  const closeRef = useRef(null);
  const guide = GUIDE_COPY[step.key];
  const facts = getGuideFacts(step.key, offerDetails);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !modalRef.current) return;
      const focusable = [...modalRef.current.querySelectorAll('button:not([disabled]), a[href]')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const modal = (
    <motion.div
      className={`acceptance-guide-backdrop${theme === 'dark' ? ' is-dark' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <motion.section
        ref={modalRef}
        className="acceptance-guide-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`acceptance-guide-${step.key}`}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.985 }}
        transition={{ duration: 0.2 }}
      >
        <header className="acceptance-guide-head">
          <span className="acceptance-guide-step"><step.icon size={20} /></span>
          <div>
            <small>{guide.eyebrow}</small>
            <h3 id={`acceptance-guide-${step.key}`}>{step.title}</h3>
            <p>{guide.intro}</p>
          </div>
          <button ref={closeRef} type="button" className="acceptance-guide-close" onClick={onClose} aria-label="بستن راهنما">
            <X size={18} />
          </button>
        </header>

        {facts.length > 0 ? (
          <section className="acceptance-guide-facts" aria-label="اطلاعات خوانده‌شده از پذیرش شما">
            <div className="acceptance-guide-section-title"><ScanText size={16} /><b>از پذیرش شما خوانده شد</b></div>
            <div>
              {facts.map(([label, value]) => <span key={label}><small>{label}</small><b dir="auto">{value}</b></span>)}
            </div>
            <p>این اطلاعات هوشمند است؛ قبل از اقدام، هر مقدار را با فایل اصلی تطبیق دهید.</p>
          </section>
        ) : (
          <section className="acceptance-guide-missing">
            <FileSearch size={17} />
            <span>این مقدار از OCR نامه شما استخراج نشده است. فایل اصلی را باز کنید یا از تیم آکا بخواهید آن را بررسی کند.</span>
          </section>
        )}

        <section className="acceptance-guide-map">
          <div className="acceptance-guide-section-title"><FileSearch size={16} /><b>در کجای پذیرش پیدا کنم؟</b></div>
          <div className="acceptance-letter-map" aria-label="نقشه بخش‌های پذیرش‌نامه">
            {DOCUMENT_AREAS.map((area) => (
              <span key={area.id} className={guide.focus.includes(area.id) ? 'is-focus' : ''}>
                <b>{area.label}</b><small>{area.detail}</small>
              </span>
            ))}
          </div>
          <p>{guide.note}</p>
        </section>

        <section className="acceptance-guide-checklist">
          <div className="acceptance-guide-section-title"><CheckCircle2 size={16} /><b>چک‌لیست این مرحله</b></div>
          <ul>
            {guide.checklist.map((item) => <li key={item}><CheckCircle2 size={14} /><span>{item}</span></li>)}
          </ul>
        </section>

        <section className="acceptance-guide-paths">
          <article>
            <span><ArrowUpLeft size={17} /></span>
            <div><b>می‌خواهم خودم انجام بدهم</b><p>{guide.selfPath}</p></div>
          </article>
          <article className="is-acca">
            <span><Building2 size={17} /></span>
            <div><b>می‌خواهم آکا همراهم باشد</b><p>{guide.accaPath}</p></div>
          </article>
        </section>

        {step.key === 'payment' && (
          <div className="acceptance-guide-warning">
            <ShieldCheck size={17} />
            <span>برای امنیت، اطلاعات بانکی نمونه در سایت نمایش داده نمی‌شود. فقط مشخصات داخل نامه رسمی خودتان یا تأیید کتبی دانشگاه معتبر است.</span>
          </div>
        )}

        <footer className="acceptance-guide-actions">
          {accepted && (
            <button type="button" className="acceptance-guide-open" onClick={onOpenAcceptance} disabled={downloading}>
              {downloading ? <LoaderCircle className="account-spin" size={16} /> : <ReceiptText size={16} />}
              باز کردن فایل پذیرش من
            </button>
          )}
          <a href={waLink(`سلام، برای مرحله «${step.title}» پرونده‌ام راهنمایی می‌خواهم.`)} target="_blank" rel="noreferrer">
            <MessageCircle size={16} /> گفت‌وگو با آکا
          </a>
          {step.key === 'registration' && (
            <button type="button" className="acceptance-guide-help" onClick={onRequestRegistrationHelp} disabled={helpBusy}>
              {helpBusy ? <LoaderCircle className="account-spin" size={16} /> : <MapPin size={16} />}
              درخواست همراهی رایگان
            </button>
          )}
        </footer>
      </motion.section>
    </motion.div>
  );

  return typeof document === 'undefined' ? null : createPortal(modal, document.body);
}

export default function AcceptanceJourneyPanel({
  submission,
  acceptanceDoc,
  lang = 'fa',
  theme = 'light',
  companyDocs = [],
  onRequestRegistrationHelp,
  helpBusy,
}) {
  const [showOcr, setShowOcr] = useState(false);
  const [activeGuideKey, setActiveGuideKey] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [openingDocId, setOpeningDocId] = useState(null);
  const guideTriggerRef = useRef(null);

  const openCompanyDoc = async (doc) => {
    if (!doc?.object_path || openingDocId) return;
    setOpeningDocId(doc.id);
    try {
      const url = await createDocumentSignedUrl(doc.object_path, doc.bucket_id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      // signed-url failure keeps the panel usable
    } finally {
      setOpeningDocId(null);
    }
  };
  const accepted = Boolean(acceptanceDoc);
  const ocrSummary = getLocalizedOcrSummary(acceptanceDoc, lang);
  const offerDetails = acceptanceDoc?.ai_extraction?.offer_details;
  const offerStatus = offerDetails?.status;
  // The admin-controlled application status is authoritative. OCR describes
  // the letter, but its document review flag must not downgrade an issued offer.
  const adminStatus = submission?.admin_status || acceptanceDoc?.quality_report?.admin_status;
  const hasAdminAcceptanceStatus = adminStatus === 'conditional_acceptance' || adminStatus === 'final_acceptance';
  const isFinal = adminStatus === 'final_acceptance'
    || (!hasAdminAcceptanceStatus && offerStatus === 'final_acceptance');
  const isConditional = adminStatus === 'conditional_acceptance'
    || (!hasAdminAcceptanceStatus && (offerStatus === 'conditional_offer' || offerStatus === 'provisional_acceptance'));
  const needsReview = accepted && !isConditional && !isFinal && acceptanceDoc?.review_status === 'admin_review';
  const acceptanceTitle = !accepted
    ? 'درخواست شما ثبت شد — مراحل بعدی'
    : isFinal
      ? 'پذیرش نهایی شما صادر شد 🎉'
      : isConditional
        ? 'پذیرش اولیه شما صادر شد'
        : needsReview
          ? 'نامه دانشگاه دریافت شد و نیازمند بررسی است'
          : 'نامه پذیرش شما دریافت شد';
  const acceptanceDescription = !accepted
    ? 'پرونده شما برای صدور پذیرش در صف بررسی دانشگاه قرار گرفت.'
    : isFinal
      ? 'پذیرش نهایی آماده است؛ فایل را دانلود کنید و مراحل ثبت‌نام را ادامه دهید.'
      : isConditional
        ? 'پذیرش اولیه شما صادر شده است؛ شرط‌های داخل نامه را بررسی و برای صدور پذیرش نهایی تکمیل کنید.'
        : needsReview
          ? 'فایل در حساب شما ذخیره شده است؛ نتیجه OCR یا نوع نامه باید توسط تیم پذیرش بررسی شود.'
          : 'فایل دانشگاه آماده است؛ آن را دانلود کنید و توضیح هوشمند را با متن اصلی تطبیق دهید.';
  const statusLabel = !accepted
    ? 'در انتظار پذیرش'
    : isFinal
      ? 'پذیرش نهایی'
      : isConditional
        ? 'پذیرش اولیه صادر شد'
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
  const activeGuide = STEPS.find((step) => step.key === activeGuideKey) || null;

  const openGuide = (stepKey, event) => {
    guideTriggerRef.current = event.currentTarget;
    setActiveGuideKey(stepKey);
  };

  const closeGuide = () => {
    setActiveGuideKey(null);
    window.setTimeout(() => guideTriggerRef.current?.focus(), 0);
  };

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

      {companyDocs.length > 0 && (
        <div className="acceptance-company-docs">
          <div className="acceptance-company-head"><ShieldCheck size={14} /> مدارک و نامه‌های دریافتی از آکا</div>
          <div className="acceptance-company-list">
            {companyDocs.map((doc) => (
              <div className="acceptance-company-item" key={doc.id}>
                <span className="acceptance-company-icon"><FileCheck2 size={15} /></span>
                <div>
                  <b>{doc.title || 'نامه رسمی'}</b>
                  <small>{doc.label} · {formatDate(doc.created_at)}</small>
                </div>
                {doc.object_path ? (
                  <button type="button" onClick={() => openCompanyDoc(doc)} disabled={openingDocId === doc.id}>
                    {openingDocId === doc.id ? <LoaderCircle className="account-spin" size={13} /> : <Download size={13} />}
                    دانلود
                  </button>
                ) : (
                  <span className="acceptance-soon">به‌زودی</span>
                )}
              </div>
            ))}
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
            <button
              type="button"
              className="acceptance-step-button"
              onClick={(event) => openGuide(step.key, event)}
              aria-haspopup="dialog"
              aria-expanded={activeGuideKey === step.key}
            >
              <span className="acceptance-step-num">{index + 1}</span>
              <span className="acceptance-step-icon"><step.icon size={16} /></span>
              <span className="acceptance-step-copy">
                <b>{step.title}</b>
                <small>{step.desc}</small>
              </span>
              <span className="acceptance-step-more">راهنمای کامل <ChevronDown size={13} /></span>
            </button>
          </li>
        ))}
      </ol>

      <AnimatePresence>
        {activeGuide && (
          <AcceptanceGuideModal
            key={activeGuide.key}
            step={activeGuide}
            offerDetails={offerDetails}
            accepted={accepted}
            downloading={downloading}
            theme={theme}
            onClose={closeGuide}
            onOpenAcceptance={openAcceptance}
            onRequestRegistrationHelp={onRequestRegistrationHelp}
            helpBusy={helpBusy}
          />
        )}
      </AnimatePresence>

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
