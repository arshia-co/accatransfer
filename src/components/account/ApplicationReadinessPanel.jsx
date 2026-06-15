import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  CheckCircle2,
  CircleDashed,
  FileCheck2,
  GraduationCap,
  LoaderCircle,
  MessageCircleMore,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { buildApplicationReadiness } from '../../data/applicationDocuments';

function RequirementRow({ item, optional = false }) {
  const confidence = item.decision?.confidence;
  return (
    <div className={`application-requirement ${item.ready ? 'is-ready' : ''}`}>
      <span className="application-requirement-icon">
        {item.ready ? <CheckCircle2 size={17} /> : <CircleDashed size={17} />}
      </span>
      <div>
        <b>{item.label}</b>
        <small>{item.description}</small>
      </div>
      <div className="application-requirement-state">
        {item.ready ? (
          <>
            <strong>آماده</strong>
            {Number.isFinite(Number(confidence)) && <small>OCR {confidence}٪</small>}
          </>
        ) : item.document ? (
          <>
            <strong>نیاز به اصلاح</strong>
            <small>{item.decision.reason}</small>
          </>
        ) : (
          <>
            <strong>{optional ? 'اختیاری' : 'آپلود نشده'}</strong>
            <small>{optional ? 'مانع ارسال نیست' : 'برای ارسال پرونده لازم است'}</small>
          </>
        )}
      </div>
    </div>
  );
}

export default function ApplicationReadinessPanel({
  product = 'smart_apply',
  documents,
  selection,
  hasGuidance,
  submission,
  busy,
  onSubmit,
}) {
  const [consent, setConsent] = useState(false);
  const readiness = useMemo(
    () => buildApplicationReadiness(product, documents, Boolean(selection)),
    [documents, product, selection],
  );

  return (
    <motion.section
      className="application-readiness"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <header className="application-readiness-head">
        <span><FileCheck2 size={22} /></span>
        <div>
          <p className="account-kicker">Application Readiness</p>
          <h3>پرونده اپلای شما چقدر آماده است؟</h3>
          <p>مدارک فقط وقتی آماده محسوب می‌شوند که نوع فایل درست باشد و اطمینان OCR بیشتر از ۵۰٪ باشد.</p>
        </div>
        <strong>{readiness.progress}٪</strong>
      </header>

      <div className="application-readiness-progress">
        <span style={{ width: `${readiness.progress}%` }} />
      </div>

      <div className={`application-program-check ${selection ? 'is-ready' : ''}`}>
        <GraduationCap size={18} />
        <div>
          <b>{selection ? 'رشته و دانشگاه مقصد انتخاب شده است' : 'رشته و دانشگاه مقصد هنوز انتخاب نشده است'}</b>
          <small>
            {selection
              ? `${selection.program_name} · ${selection.university_name}`
              : 'ابتدا یک گزینه از کاتالوگ آکادو انتخاب کنید.'}
          </small>
        </div>
        {selection && <BadgeCheck size={19} />}
      </div>

      <div className="application-guidance-note">
        <Sparkles size={18} />
        <div>
          <b>{hasGuidance ? 'پروفایل راهنمایی AI در پرونده شما ثبت شده است' : 'تحلیل انتخاب رشته AI هنوز تکمیل نشده است'}</b>
          <small>
            {hasGuidance
              ? 'نتیجه گفت‌وگو و تست عمیق همراه پرونده برای مشاور قابل مشاهده خواهد بود.'
              : 'این تحلیل اجباری نیست، اما می‌تواند انتخاب رشته و گفت‌وگوی مشاوره را دقیق‌تر کند.'}
          </small>
        </div>
        {!hasGuidance && <a href="/smart-apply?deep-fit=1">شروع تحلیل حرفه‌ای</a>}
      </div>

      <div className="application-requirement-groups">
        <section>
          <div className="application-requirement-title">
            <span>مدارک اجباری</span>
            <b>{readiness.readyRequired}/{readiness.totalRequired} آماده</b>
          </div>
          {readiness.required.map((item) => <RequirementRow key={item.kind} item={item} />)}
        </section>
        <section>
          <div className="application-requirement-title">
            <span>مدارک اختیاری</span>
            <b>برای تقویت پرونده</b>
          </div>
          {readiness.optional.map((item) => <RequirementRow key={item.kind} item={item} optional />)}
        </section>
      </div>

      {submission && (
        <div className="application-submitted">
          <CheckCircle2 size={19} />
          <div>
            <b>پرونده با موفقیت ثبت و برای تیم پذیرش صف‌بندی شد</b>
            <small>کد پیگیری: <span dir="ltr">{submission.id}</span></small>
          </div>
        </div>
      )}

      <label className="application-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <ShieldCheck size={18} />
        <span>
          اجازه می‌دهم اطلاعات پروفایل، نتیجه‌های AI، گفت‌وگوها و مدارک خصوصی این پرونده
          برای بررسی به تیم پذیرش ACCA از طریق بات تلگرام امن شرکت ارسال شود.
        </span>
      </label>

      <div className="application-submit-actions">
        <button
          type="button"
          disabled={!readiness.canSubmit || !consent || busy}
          onClick={() => onSubmit('apply')}
        >
          {busy ? <LoaderCircle className="account-spin" size={17} /> : <Send size={17} />}
          {busy ? 'در حال ثبت پرونده...' : 'ارسال درخواست اپلای'}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={!readiness.canSubmit || !consent || busy}
          onClick={() => onSubmit('consultation')}
        >
          <MessageCircleMore size={17} />
          درخواست مشاوره با همین پرونده
        </button>
      </div>

      {!readiness.canSubmit && (
        <p className="application-block-note">
          برای فعال شدن ارسال، رشته مقصد و هر چهار مدرک اجباری باید آماده باشند.
        </p>
      )}
    </motion.section>
  );
}
