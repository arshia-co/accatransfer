import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, ArrowLeft, BadgeCheck, Bell, BookOpen, BrainCircuit, CheckCircle2, ChevronDown, ChevronUp, Clock3, CloudUpload, Compass,
  FileText, FolderLock, GraduationCap, LayoutGrid, ListChecks, LoaderCircle, LogOut, Paperclip,
  RefreshCw, ScanText, ShieldCheck, Sparkles, Target,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { rememberAccountPreview } from '../../auth/accountPreview';
import {
  confirmDocumentExtraction,
  createTransferAssessment,
  createDocumentSignedUrl,
  listCentralAccountData,
  requestDocumentOcr,
  requestHumanDocumentReview,
  requestApplicationSubmission,
  requestTransferAnalysis,
  upsertProgramSelection,
  uploadStudentDocument,
} from '../../services/accountService';
import { getDocumentOcrDecision, OCR_CONTINUE_THRESHOLD } from '../../services/documentReviewPolicy';
import ProgramCatalogPicker, { SelectedProgramCard } from './ProgramCatalogPicker';
import {
  clearCatalogDeepLink,
  getSelectionItems,
  readCatalogDeepLink,
  resolveCatalogDeepLink,
} from '../../services/programCatalogService';
import { documentKindLabel } from '../../data/applicationDocuments';
import ApplicationReadinessPanel from './ApplicationReadinessPanel';
import AcceptanceJourneyPanel from './AcceptanceJourneyPanel';
import ProfileEditor from './ProfileEditor';

const EMPTY_DATA = {
  profile: null,
  documents: [],
  smartApply: [],
  deepFit: null,
  transfer: [],
  selections: [],
  submissions: [],
  notifications: [],
  letters: [],
};

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatSize(bytes) {
  if (!bytes) return '';
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusPill({ status = 'draft' }) {
  const labels = {
    draft: 'پیش‌نویس',
    in_progress: 'در حال تکمیل',
    documents_ready: 'مدارک آماده',
    analyzing: 'در حال تحلیل',
    preliminary_result: 'نتیجه اولیه',
    application_started: 'در حال درخواست',
    uploaded: 'آپلود شده',
    processing: 'در حال پردازش',
    review_ready: 'آماده بررسی',
    verified: 'تأیید شده',
  };
  return <span className="account-status"><CheckCircle2 size={13} />{labels[status] || status}</span>;
}

function DocumentUpload({ product, user, assessmentId, onUploaded }) {
  const [kind, setKind] = useState(product === 'ai_transfer' ? 'transcript' : 'passport');
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    setError('');
    setStage('quality');
    setProgress(5);
    try {
      const uploaded = await uploadStudentDocument({
        user,
        product,
        kind,
        file,
        assessmentId,
        onProgress: setProgress,
        onStage: setStage,
      });
      if (uploaded.ocrError) {
        setError('فایل امن ذخیره شد، اما OCR کامل نشد. می‌توانید دوباره پردازش را اجرا کنید.');
      }
      await onUploaded();
    } catch (err) {
      setError(err?.message || 'آپلود انجام نشد.');
    } finally {
      setBusy(false);
      setStage('');
      window.setTimeout(() => setProgress(0), 700);
    }
  };

  const stageLabel = {
    quality: 'بررسی کیفیت',
    upload: 'آپلود امن',
    ocr: 'خواندن هوشمند مدرک',
  }[stage];

  return (
    <div className="account-product-upload">
      <select value={kind} onChange={(event) => setKind(event.target.value)} disabled={busy}>
        {product === 'ai_transfer' ? (
          <>
            <option value="transcript">ریزنمرات</option>
            <option value="syllabus">سرفصل دروس</option>
            <option value="student_certificate">گواهی اشتغال به تحصیل</option>
            <option value="passport">پاسپورت</option>
          </>
        ) : (
          <>
            <option value="passport">پاسپورت</option>
            <option value="transcript">ریزنمرات</option>
            <option value="diploma">مدرک تحصیلی</option>
            <option value="language_certificate">مدرک زبان</option>
            <option value="photo">عکس</option>
            <option value="award_certificate">لوح تقدیر و افتخارات</option>
            <option value="other_certificate">گواهی دوره و سرتیفیکیت</option>
          </>
        )}
      </select>
      <label>
        {busy ? <LoaderCircle className="account-spin" size={17} /> : <CloudUpload size={17} />}
        {busy ? `${stageLabel || 'در حال پردازش'} · ${progress}%` : 'آپلود و بررسی مدرک'}
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={busy} onChange={(event) => upload(event.target.files?.[0])} />
      </label>
      {progress > 0 && <div className="account-progress"><span style={{ width: `${progress}%` }} /></div>}
      {error && <small className="account-error">{error}</small>}
    </div>
  );
}

const EXTRACTION_FIELDS = [
  ['student_name', 'نام دانشجو'],
  ['institution', 'دانشگاه / مؤسسه'],
  ['program', 'رشته'],
  ['gpa', 'معدل'],
  ['gpa_scale', 'مقیاس معدل'],
  ['total_credits', 'واحدهای ثبت‌شده'],
  ['document_number', 'شماره مدرک'],
];

function JourneySteps({ steps, current }) {
  return (
    <div className="account-journey" aria-label="مراحل ادامه">
      {steps.map((step, index) => {
        const state = index < current ? 'complete' : index === current ? 'current' : 'upcoming';
        return (
          <div key={step} className={`account-journey-step is-${state}`}>
            <span>{index < current ? <CheckCircle2 size={14} /> : index + 1}</span>
            <b>{step}</b>
          </div>
        );
      })}
    </div>
  );
}

function ExtractedCourses({ courses }) {
  if (!Array.isArray(courses) || courses.length === 0) return null;
  return (
    <details className="account-course-extraction">
      <summary><BookOpen size={15} />{courses.length} درس از ریزنمرات شناسایی شد</summary>
      <div className="account-course-table-wrap">
        <table className="account-course-table">
          <thead>
            <tr>
              <th>درس</th>
              <th>کد</th>
              <th>واحد</th>
              <th>نمره</th>
              <th>ترم</th>
            </tr>
          </thead>
          <tbody>
            {courses.slice(0, 16).map((course, index) => (
              <tr key={`${course.code || course.title}-${index}`}>
                <td>{course.title || '—'}</td>
                <td dir="ltr">{course.code || '—'}</td>
                <td>{course.credits || '—'}</td>
                <td>{course.grade || '—'}</td>
                <td>{course.semester || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {courses.length > 16 && <small>{courses.length - 16} درس دیگر نیز در نتیجه ذخیره شده است.</small>}
    </details>
  );
}

function DocumentCard({ document, busy, onConfirm, onReview, onRetry }) {
  const [open, setOpen] = useState(false);
  const extraction = document.ai_extraction;
  const fields = extraction?.fields || {};
  const visibleFields = EXTRACTION_FIELDS.filter(([key]) => fields[key]);
  const decision = getDocumentOcrDecision(document);
  const confidence = decision.confidence;
  const quality = extraction?.quality || document.quality_report;
  const needsHuman = !decision.canContinue && document.review_status === 'admin_review';
  const confirmed = document.review_status === 'confirmed';
  const reviewRecommended = decision.canContinue && decision.humanReviewRecommended && !confirmed;
  const hasDetail = visibleFields.length > 0 || Boolean(extraction?.summary) || (extraction?.courses?.length ?? 0) > 0;

  return (
    <article className="account-document-card">
      <div className="account-document-main">
        <span><FileText size={18} /></span>
        <div>
          <b>{document.original_name}</b>
          <small>
            {documentKindLabel(document.document_kind)} · {formatSize(document.size_bytes)} · {formatDate(document.created_at)}
          </small>
        </div>
        <StatusPill status={document.status} />
      </div>

      {extraction ? (
        <div className="account-ocr-panel">
          <div className="account-ocr-head">
            <span><ScanText size={15} /> OCR هوشمند</span>
            <div>
              {Number.isFinite(Number(confidence)) && <b>{confidence}% اطمینان</b>}
              <span className={needsHuman ? 'is-review' : confirmed ? 'is-confirmed' : reviewRecommended ? 'is-caution' : ''}>
                {needsHuman
                  ? 'فعلاً قابل ادامه نیست'
                  : confirmed
                    ? 'تأیید دانشجو'
                    : reviewRecommended
                      ? 'قابل ادامه · بررسی توصیه می‌شود'
                      : 'منتظر تأیید دانشجو'}
              </span>
            </div>
          </div>

          <div className={`account-ocr-gate ${decision.canContinue ? 'is-open' : 'is-closed'}`}>
            {decision.canContinue ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            <span>
              {decision.canContinue
                ? `اطمینان OCR بیشتر از ${OCR_CONTINUE_THRESHOLD}٪ است؛ این مدرک می‌تواند وارد مرحله بعد شود.`
                : decision.reason}
            </span>
          </div>

          {hasDetail && (
            <button type="button" className="account-ocr-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {open ? 'بستن جزئیات' : 'دیدن کامل OCR'}
            </button>
          )}

          {open && (
            <div className="account-ocr-detail">
              {visibleFields.length > 0 && (
                <dl className="account-ocr-fields">
                  {visibleFields.map(([key, label]) => (
                    <div key={key}><dt>{label}</dt><dd dir={key === 'student_name' ? 'auto' : 'ltr'}>{fields[key]}</dd></div>
                  ))}
                </dl>
              )}
              {extraction.summary && <p className="account-ocr-summary">{extraction.summary}</p>}
              {quality?.student_action && quality.status !== 'good' && (
                <p className="account-ocr-warning"><AlertTriangle size={14} />{quality.student_action}</p>
              )}
              <ExtractedCourses courses={extraction.courses} />
            </div>
          )}

          {!confirmed && (
            <div className="account-ocr-actions">
              <button type="button" onClick={() => onConfirm(document)} disabled={busy || !decision.canContinue}>
                {busy ? <LoaderCircle className="account-spin" size={14} /> : <BadgeCheck size={14} />}
                اطلاعات با مدرک مطابقت دارد
              </button>
              <button type="button" className="secondary" onClick={() => onReview(document)} disabled={busy}>
                درخواست بررسی انسانی
              </button>
            </div>
          )}
          <small className="account-ocr-disclaimer">
            خروجی OCR مقدماتی است. نام، شماره مدرک، معدل و نمرات را پیش از استفاده تأیید کنید.
          </small>
        </div>
      ) : (
        <div className="account-ocr-pending">
          <span><AlertTriangle size={15} />هنوز خروجی OCR آماده نیست.</span>
          <button type="button" onClick={() => onRetry(document)} disabled={busy}>
            {busy ? <LoaderCircle className="account-spin" size={14} /> : <RefreshCw size={14} />}
            اجرای دوباره OCR
          </button>
        </div>
      )}
    </article>
  );
}

function DocumentList({ documents, busyId, onConfirm, onReview, onRetry }) {
  if (!documents.length) {
    return <div className="account-product-empty"><FolderLock size={22} /><span>هنوز مدرکی در این بخش ثبت نشده است.</span></div>;
  }
  return (
    <div className="account-document-list">
      {documents.map((document) => (
        <DocumentCard
          key={document.id}
          document={document}
          busy={busyId === document.id}
          onConfirm={onConfirm}
          onReview={onReview}
          onRetry={onRetry}
        />
      ))}
    </div>
  );
}

function AccountNotifications({ notifications = [], documents = [] }) {
  const [openingId, setOpeningId] = useState(null);
  const visible = notifications.slice(0, 5);
  if (!visible.length) return null;

  const openLinkedDocument = async (notification) => {
    const document = documents.find((item) => item.id === notification.document_id);
    if (!document?.object_path) return;
    setOpeningId(notification.id);
    try {
      const url = await createDocumentSignedUrl(document.object_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <motion.section className="account-notifications" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="account-notifications-head">
        <span><Bell size={18} /></span>
        <div>
          <b>آخرین پیام‌های پرونده</b>
          <small>وضعیت‌هایی که تیم ACCA ثبت می‌کند اینجا و در ایمیل شما قابل پیگیری است.</small>
        </div>
      </div>
      <div className="account-notification-list">
        {visible.map((notification) => {
          const hasDocument = Boolean(notification.document_id && documents.some((item) => item.id === notification.document_id));
          return (
            <article key={notification.id} className={notification.read_at ? '' : 'is-unread'}>
              <div>
                <b>{notification.title}</b>
                <small>{formatDate(notification.created_at)}</small>
                <p>{notification.message}</p>
              </div>
              {hasDocument && (
                <button type="button" onClick={() => openLinkedDocument(notification)} disabled={openingId === notification.id}>
                  {openingId === notification.id ? <LoaderCircle className="account-spin" size={14} /> : <Paperclip size={14} />}
                  مشاهده فایل
                </button>
              )}
            </article>
          );
        })}
      </div>
    </motion.section>
  );
}

function TransferAnalysisPanel({ result }) {
  if (!result) return null;
  const metrics = [
    ['برآورد آمادگی انتقال', result.estimated_transfer_match != null ? `${result.estimated_transfer_match}٪` : '—'],
    ['اطمینان تحلیل AI', result.ai_confidence || '—'],
    ['سطح ریسک', result.risk_level || '—'],
    ['ورودی احتمالی', result.estimated_entry_level || '—'],
    ['دروس محتمل برای بررسی', result.likely_recognized_courses || '—'],
  ];
  const courses = Array.isArray(result.course_equivalency_preview) ? result.course_equivalency_preview : [];
  const missingDocuments = Array.isArray(result.missing_documents) ? result.missing_documents : [];
  const risks = Array.isArray(result.risk_factors) ? result.risk_factors : [];

  return (
    <motion.div className="account-transfer-result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="account-transfer-result-head">
        <div>
          <span className="account-kicker">گزارش مرحله چهارم</span>
          <h3>{result.headline || 'تحلیل مقدماتی انتقالی'}</h3>
          <p>{result.overview || result.admission_reality_note}</p>
        </div>
        {result.preliminary_transfer_fit && <strong>{result.preliminary_transfer_fit}</strong>}
      </div>

      <div className="account-transfer-metrics">
        {metrics.map(([label, value]) => <div key={label}><small>{label}</small><b>{value}</b></div>)}
      </div>

      {courses.length > 0 && (
        <section className="account-result-section">
          <div className="account-result-section-title"><ListChecks size={17} /><h4>پیش‌نمایش تطبیق درس‌ها</h4></div>
          <div className="account-course-table-wrap">
            <table className="account-course-table account-match-table">
              <thead>
                <tr>
                  <th>درس مبدأ</th>
                  <th>پیشنهاد مقصد</th>
                  <th>امتیاز</th>
                  <th>وضعیت</th>
                  <th>اقدام لازم</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course, index) => (
                  <tr key={`${course.source_course}-${index}`}>
                    <td>{course.source_course}</td>
                    <td>{course.suggested_target_course || 'نیازمند چارت مقصد'}</td>
                    <td>{course.match_score == null ? '—' : `${course.match_score}٪`}</td>
                    <td><span className="account-match-status">{course.status}</span></td>
                    <td>{course.required_next_action || course.explanation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {(missingDocuments.length > 0 || risks.length > 0) && (
        <div className="account-result-columns">
          {missingDocuments.length > 0 && (
            <section className="account-result-section">
              <div className="account-result-section-title"><FileText size={17} /><h4>مدارک لازم برای مرحله بعد</h4></div>
              <ul>
                {missingDocuments.map((item, index) => (
                  <li key={`${item.document_name}-${index}`}><b>{item.document_name}</b><span>{item.reason}</span></li>
                ))}
              </ul>
            </section>
          )}
          {risks.length > 0 && (
            <section className="account-result-section">
              <div className="account-result-section-title"><AlertTriangle size={17} /><h4>موارد نیازمند توجه</h4></div>
              <ul>
                {risks.map((item, index) => (
                  <li key={`${item.title}-${index}`}><b>{item.title}</b><span>{item.recommended_action || item.explanation}</span></li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <div className="account-result-reality">
        <ShieldCheck size={17} />
        <span>{result.admission_reality_note || 'این گزارش مقدماتی است. پذیرش، معادل‌سازی درس و تعیین ترم نهایی فقط توسط دانشگاه مقصد انجام می‌شود.'}</span>
      </div>
    </motion.div>
  );
}

function ResultCard({ result, type }) {
  if (!result) return null;
  const title = result.headline || result.summary || (type === 'smart' ? 'نتیجه راهنمایی تحصیلی شما' : 'نتیجه اولیه انتقالی شما');
  const body = result.overview || result.admission_reality_note || 'این نتیجه بر اساس اطلاعات فعلی حساب شما تهیه شده است.';
  const steps = result.next_steps || result.recommendedMajors?.map((item) => item.title || item.name).filter(Boolean);
  return (
    <motion.div className="account-inline-result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <span className="account-kicker">نتیجه ذخیره‌شده</span>
      <h3>{title}</h3>
      <p>{body}</p>
      {Array.isArray(steps) && (
        <ul>{steps.slice(0, 4).map((item) => <li key={String(item)}><CheckCircle2 size={14} />{String(item)}</li>)}</ul>
      )}
    </motion.div>
  );
}

function SignedOut() {
  const { openAuth, isConfigured } = useAuth();
  const returnTo = typeof window === 'undefined'
    ? '/account'
    : `${window.location.pathname}${window.location.search}`;
  const deepLink = readCatalogDeepLink();
  return (
    <main className="account-page account-central" dir="rtl">
      <div className="account-ambient" />
      <section className="account-signed-out">
        <div className="account-orb"><FolderLock size={32} /></div>
        <span className="account-kicker">ACCA Central Account</span>
        <h1>یک حساب برای تمام مسیر شما</h1>
        <p>
          {deepLink
            ? 'انتخاب رشته و دانشگاه شما آماده است. با ورود، آن را در پرونده مرکزی ذخیره و مسیر را ادامه دهید.'
            : 'سوابق Smart Apply، ارزیابی AI Transfer، نتایج و مدارک شما در یک پنل مرکزی و امن نمایش داده می‌شوند.'}
        </p>
        <div className="account-signed-out-actions">
          <button
            type="button"
            onClick={() => openAuth(deepLink?.product || 'smart_apply', {
              returnTo,
              reason: deepLink ? 'program_selection' : null,
              startMode: 'signin',
              method: 'password',
            })}
          >
            <Sparkles size={18} /> ورود به حساب
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => openAuth(deepLink?.product || 'smart_apply', {
              returnTo,
              reason: deepLink ? 'program_selection' : null,
              startMode: 'signup',
            })}
          >
            ساخت حساب جدید
          </button>
        </div>
        {!isConfigured && <small>ورود امن در این محیط هنوز فعال نشده است.</small>}
        <a href="/"><ArrowLeft size={15} /> بازگشت به خدمات ACCA</a>
      </section>
    </main>
  );
}

export default function AccountPortal() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [documentBusyId, setDocumentBusyId] = useState(null);
  const [selectionBusy, setSelectionBusy] = useState(false);
  const [submissionBusy, setSubmissionBusy] = useState(false);
  const [helpBusy, setHelpBusy] = useState(false);
  const [linkedSelectionNotice, setLinkedSelectionNotice] = useState('');
  const linkedSelectionHandled = useRef(false);
  const [catalogPicker, setCatalogPicker] = useState(() => {
    const deepLink = readCatalogDeepLink();
    return deepLink && !deepLink.programId ? {
      product: deepLink.product,
      initialProgramId: deepLink.programId,
      initialUniversity: deepLink.university,
    } : null;
  });
  const [activeProduct, setActiveProduct] = useState(() => {
    const deepLink = readCatalogDeepLink();
    if (deepLink?.product === 'ai_transfer') return 'ai_transfer';
    // The AI Transfer eligibility flow returns here with ?product=ai_transfer so
    // the panel opens on the AI Transfer tab instead of Smart Apply.
    if (typeof window !== 'undefined'
      && new URLSearchParams(window.location.search).get('product') === 'ai_transfer') {
      return 'ai_transfer';
    }
    return 'smart_apply';
  });

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      setData(await listCentralAccountData(user.id));
    } catch (err) {
      setError(err?.message || 'دریافت اطلاعات حساب انجام نشد.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    if (!user || loading) return;
    rememberAccountPreview(user, data.profile || {});
  }, [user, loading, data.profile]);

  const smartSession = data.smartApply[0] || null;
  const transferAssessment = data.transfer[0] || null;
  const smartSelection = data.selections.find((item) => item.product === 'smart_apply') || null;
  const transferSelection = data.selections.find((item) => item.product === 'ai_transfer') || null;
  const smartSubmission = data.submissions.find((item) => item.product === 'smart_apply') || null;
  const transferSubmission = data.submissions.find((item) => item.product === 'ai_transfer') || null;
  const acceptanceDoc = data.documents.find((doc) => doc.document_kind === 'acceptance_letter') || null;
  const smartDocuments = data.documents.filter((item) => item.product === 'smart_apply');
  const transferDocuments = data.documents.filter((item) => item.product === 'ai_transfer');
  const transferTranscript = transferDocuments.find((item) => item.document_kind === 'transcript');
  const transferOcrDecision = getDocumentOcrDecision(transferTranscript);
  const smartJourneyStep = !smartSession
    ? 0
    : !smartSession.result
      ? 1
      : !smartSelection
        ? 2
        : smartDocuments.length === 0
        ? 3
        : 4;
  const transferJourneyStep = !transferAssessment
    ? 0
    : !transferTranscript
      ? 1
      : !transferOcrDecision.canContinue
        ? 2
        : !transferSelection || !transferAssessment.ai_result
          ? 3
          : 4;
  const usedProducts = Number(Boolean(smartSession || smartDocuments.length || smartSelection)) +
    Number(Boolean(transferAssessment || transferDocuments.length || transferSelection));

  const completion = useMemo(() => {
    const smartScore = smartSession ? 25 : 0;
    const deepFitScore = data.deepFit?.status === 'completed'
      ? 15
      : data.deepFit
        ? 7
        : 0;
    const transferScore = transferAssessment ? 25 : 0;
    const documentScore = Math.min(30, data.documents.length * 6);
    const selectionScore = (smartSelection ? 5 : 0) + (transferSelection ? 5 : 0);
    const resultScore = (smartSession?.result ? 10 : 0) + (transferAssessment?.ai_result ? 10 : 0);
    return Math.min(100, smartScore + deepFitScore + transferScore + documentScore + selectionScore + resultScore);
  }, [smartSession, smartSelection, transferAssessment, transferSelection, data.deepFit, data.documents.length]);

  const saveProgramSelection = async (selection) => {
    if (!catalogPicker?.product || !user) return;
    setSelectionBusy(true);
    setError('');
    try {
      await upsertProgramSelection(user, catalogPicker.product, selection);
      clearCatalogDeepLink();
      setCatalogPicker(null);
      await refresh();
    } catch (err) {
      setError(err?.message || 'ذخیره رشته و دانشگاه انجام نشد.');
    } finally {
      setSelectionBusy(false);
    }
  };

  useEffect(() => {
    if (!user || linkedSelectionHandled.current) return;
    const deepLink = readCatalogDeepLink();
    if (!deepLink?.programId) return;
    linkedSelectionHandled.current = true;

    const connectSelection = async () => {
      setSelectionBusy(true);
      setError('');
      try {
        const program = await resolveCatalogDeepLink(deepLink);
        if (!program) {
          setCatalogPicker({
            product: deepLink.product,
            initialProgramId: deepLink.programId,
            initialUniversity: deepLink.university,
          });
          throw new Error('رشته انتخاب‌شده در نسخه فعلی کاتالوگ پیدا نشد؛ لطفاً نزدیک‌ترین گزینه را انتخاب کنید.');
        }
        await upsertProgramSelection(user, deepLink.product, program);
        clearCatalogDeepLink();
        setLinkedSelectionNotice(`${program.program} در ${program.university} به پرونده شما اضافه شد.`);
        await refresh();
      } catch (err) {
        setError(err?.message || 'انتقال انتخاب رشته به حساب انجام نشد.');
      } finally {
        setSelectionBusy(false);
      }
    };

    connectSelection();
  }, [refresh, user]);

  const submitApplication = async (intent) => {
    setSubmissionBusy(true);
    setError('');
    try {
      await requestApplicationSubmission({
        product: 'smart_apply',
        intent,
        consent: true,
      });
      await refresh();
    } catch (err) {
      setError(err?.message || 'ثبت درخواست انجام نشد.');
    } finally {
      setSubmissionBusy(false);
    }
  };

  const submitTransferApplication = async (intent) => {
    setSubmissionBusy(true);
    setError('');
    try {
      await requestApplicationSubmission({
        product: 'ai_transfer',
        intent,
        consent: true,
      });
      await refresh();
    } catch (err) {
      setError(err?.message || 'ثبت درخواست انجام نشد.');
    } finally {
      setSubmissionBusy(false);
    }
  };

  const requestRegistrationHelp = async () => {
    setHelpBusy(true);
    setError('');
    try {
      // Reuses the existing submit-application → company Telegram seam with a
      // dedicated intent so the team is notified the student wants in-person help.
      await requestApplicationSubmission({
        product: 'smart_apply',
        intent: 'registration_help',
        consent: true,
      });
      setLinkedSelectionNotice('درخواست کمک برای ثبت‌نام حضوری ثبت شد؛ کارشناس ما به‌زودی با شما هماهنگ می‌کند.');
      await refresh();
    } catch (err) {
      setError(err?.message || 'ثبت درخواست کمک انجام نشد.');
    } finally {
      setHelpBusy(false);
    }
  };

  const runTransferAnalysis = async () => {
    if (!transferTranscript || !user || !transferSelection || !transferOcrDecision.canContinue) return;
    setAnalysisBusy(true);
    setError('');
    try {
      const assessment = transferAssessment || await createTransferAssessment(user);
      await requestTransferAnalysis({ assessmentId: assessment.id, documentId: transferTranscript.id });
      await refresh();
    } catch (err) {
      setError(err?.message || 'تحلیل اولیه انتقالی انجام نشد.');
    } finally {
      setAnalysisBusy(false);
    }
  };

  const updateDocumentReview = async (document, action) => {
    setDocumentBusyId(document.id);
    setError('');
    try {
      if (action === 'confirm') await confirmDocumentExtraction(document);
      if (action === 'review') await requestHumanDocumentReview(document.id);
      if (action === 'retry') await requestDocumentOcr({ documentId: document.id, force: true });
      await refresh();
    } catch (err) {
      setError(err?.message || 'به‌روزرسانی بررسی مدرک انجام نشد.');
    } finally {
      setDocumentBusyId(null);
    }
  };

  if (authLoading) return <main className="account-page account-loading"><LoaderCircle className="account-spin" /></main>;
  if (!user) return <SignedOut />;

  const accountName = data.profile?.full_name || user.user_metadata?.full_name || 'دانشجوی ACCA';
  const accountAvatar = data.profile?.avatar_url || user.user_metadata?.avatar_url || '';
  const accountInitial = (accountName || user.email || '?').trim().charAt(0).toUpperCase();

  return (
    <main className="account-page account-central" dir="rtl">
      <div className="account-ambient" />
      <header className="account-header">
        <a href="/" className="account-brand"><LayoutGrid size={17} /> ACCA AI Services</a>
        <div className="account-header-actions">
          <a href="/"><ArrowLeft size={15} /> خدمات</a>
          <button type="button" onClick={signOut}><LogOut size={15} /> خروج</button>
        </div>
      </header>

      <div className="account-shell">
        <section className="account-hero">
          <div>
            <span className="account-kicker">ACCA Central Account</span>
            <h1>پنل مرکزی شما</h1>
            <p>تمام فعالیت‌های پذیرش و انتقال دانشگاهی شما، بدون ساخت حساب یا داشبورد جداگانه.</p>
          </div>
          <div className="account-identity">
            <span className="account-identity-avatar">
              {accountAvatar ? <img src={accountAvatar} alt="" /> : <b>{accountInitial}</b>}
            </span>
            <div><small>حساب فعال · {accountName}</small><b dir="ltr">{user.email}</b></div>
            <ShieldCheck size={20} />
          </div>
        </section>

        <ProfileEditor
          key={data.profile?.updated_at || data.profile?.avatar_url || data.profile?.full_name || user.id}
          user={user}
          profile={data.profile}
          onSaved={refresh}
        />

        <section className="account-grid">
          <article className="account-card account-progress-card">
            <div className="account-card-head">
              <span><BrainCircuit size={19} /></span>
              <button type="button" onClick={refresh} aria-label="به‌روزرسانی"><RefreshCw size={15} /></button>
            </div>
            <strong>{completion}%</strong>
            <h3>آمادگی حساب</h3>
            <div className="account-progress"><span style={{ width: `${completion}%` }} /></div>
            <p>اطلاعات هر دو سرویس در همین شاخص جمع‌بندی می‌شود.</p>
          </article>
          <article className="account-card">
            <div className="account-card-head"><span><Compass size={19} /></span><b>{usedProducts}/2</b></div>
            <h3>سرویس‌های فعال</h3>
            <p>{usedProducts ? 'سوابق سرویس‌های استفاده‌شده در پایین همین صفحه دیده می‌شود.' : 'هنوز فعالیتی از محصولات ACCA ذخیره نشده است.'}</p>
          </article>
          <article className="account-card">
            <div className="account-card-head"><span><FileText size={19} /></span><b>{data.documents.length}</b></div>
            <h3>مدارک خصوصی</h3>
            <p>فایل‌ها با تفکیک کاربرد در همان حساب مرکزی نگهداری می‌شوند.</p>
          </article>
        </section>

        {error && <div className="account-error-banner">{error}</div>}
        {linkedSelectionNotice && (
          <div className="account-selection-notice">
            <BadgeCheck size={17} />
            <span>{linkedSelectionNotice}</span>
          </div>
        )}

        <AccountNotifications notifications={data.notifications} documents={data.documents} />

        <nav className="account-product-tabs" role="tablist" aria-label="انتخاب سرویس">
          <button
            type="button"
            role="tab"
            aria-selected={activeProduct === 'smart_apply'}
            className={activeProduct === 'smart_apply' ? 'is-active' : ''}
            onClick={() => setActiveProduct('smart_apply')}
          >
            <GraduationCap size={17} /> Smart Apply
            {smartSelection || smartSession ? <i className="account-tab-dot" /> : null}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeProduct === 'ai_transfer'}
            className={activeProduct === 'ai_transfer' ? 'is-active' : ''}
            onClick={() => setActiveProduct('ai_transfer')}
          >
            <Sparkles size={17} /> AI Transfer
            {transferSelection || transferAssessment ? <i className="account-tab-dot" /> : null}
          </button>
        </nav>

        {activeProduct === 'smart_apply' && (
        <section className="account-product-space account-product-smart">
          <div className="account-product-head">
            <div className="account-product-icon"><GraduationCap size={24} /></div>
            <div>
              <span className="account-kicker">Admission Journey</span>
              <h2>Smart Apply</h2>
              <p>پروفایل تحصیلی، نتیجه کشف رشته، مسیر پذیرش و مدارک مرتبط.</p>
            </div>
            <div className="account-product-actions">
              <StatusPill status={smartSession?.status || 'draft'} />
              <a href="/smart-apply">ادامه Smart Apply</a>
            </div>
          </div>

          <JourneySteps
            current={smartJourneyStep}
            steps={['شروع جلسه', 'شناخت هدف', 'نتیجه اولیه', 'مدارک', 'تطبیق دانشگاه‌ها']}
          />

          <div className="account-product-summary">
            <div><small>آخرین فعالیت</small><b>{smartSession ? formatDate(smartSession.updated_at || smartSession.created_at) : 'هنوز شروع نشده'}</b></div>
            <div><small>هدف ثبت‌شده</small><b>{smartSession?.goal || '—'}</b></div>
            <div><small>مدارک</small><b>{smartDocuments.length}</b></div>
          </div>

          <SelectedProgramCard
            selection={smartSelection}
            product="smart_apply"
            onChange={() => setCatalogPicker({ product: 'smart_apply', initialSelection: getSelectionItems(smartSelection) })}
          />
          <ResultCard result={smartSession?.result} type="smart" />
          <DeepFitAccountCard profile={data.deepFit} />
          <div className="account-next-action">
            <Target size={18} />
            <div>
              <b>
                {!smartSession?.result
                  ? 'جلسه راهنمایی را ادامه دهید'
                  : smartDocuments.length === 0
                    ? 'نتیجه اولیه آماده است؛ مدارک را تکمیل کنید'
                    : 'پرونده برای ساخت فهرست پیشنهادی دانشگاه‌ها آماده است'}
              </b>
              <span>
                {!smartSession?.result
                  ? 'AI پاسخ‌های قبلی شما را نگه داشته و از همان مرحله ادامه می‌دهد.'
                  : 'اطلاعات ثبت‌شده در همین حساب مرکزی برای ادامه مسیر استفاده می‌شود.'}
              </span>
            </div>
            <a href="/smart-apply">ادامه مسیر</a>
          </div>
          <DocumentUpload product="smart_apply" user={user} onUploaded={refresh} />
          <DocumentList
            documents={smartDocuments}
            busyId={documentBusyId}
            onConfirm={(document) => updateDocumentReview(document, 'confirm')}
            onReview={(document) => updateDocumentReview(document, 'review')}
            onRetry={(document) => updateDocumentReview(document, 'retry')}
          />
          <ApplicationReadinessPanel
            product="smart_apply"
            documents={smartDocuments}
            selection={smartSelection}
            hasGuidance={Boolean(smartSession?.result || data.deepFit?.result)}
            submission={smartSubmission}
            busy={submissionBusy}
            onSubmit={submitApplication}
          />
          {(smartSubmission || acceptanceDoc) && (
            <AcceptanceJourneyPanel
              submission={smartSubmission}
              acceptanceDoc={acceptanceDoc}
              onRequestRegistrationHelp={requestRegistrationHelp}
              helpBusy={helpBusy}
            />
          )}
        </section>
        )}

        {activeProduct === 'ai_transfer' && (
        <section className="account-product-space account-product-transfer">
          <div className="account-product-head">
            <div className="account-product-icon"><Sparkles size={24} /></div>
            <div>
              <span className="account-kicker">University Transfer</span>
              <h2>AI Transfer</h2>
              <p>ارزیابی انتقالی، ریزنمرات، تحلیل اولیه و مسیر بررسی انسانی.</p>
            </div>
            <div className="account-product-actions">
              <StatusPill status={transferAssessment?.status || 'draft'} />
              <a href="/ai-transfer">ادامه AI Transfer</a>
            </div>
          </div>

          <JourneySteps
            current={transferJourneyStep}
            steps={['شروع پرونده', 'آپلود ریزنمرات', 'OCR و تأیید', 'تطبیق درس‌ها', 'بررسی مشاور/دانشگاه']}
          />

          <div className="account-product-summary">
            <div><small>دانشگاه فعلی</small><b>{transferAssessment?.current_university || 'تکمیل نشده'}</b></div>
            <div><small>رشته مقصد</small><b>{transferAssessment?.target_program || 'تکمیل نشده'}</b></div>
            <div><small>مدارک</small><b>{transferDocuments.length}</b></div>
          </div>

          <SelectedProgramCard
            selection={transferSelection}
            product="ai_transfer"
            onChange={() => setCatalogPicker({ product: 'ai_transfer', initialSelection: getSelectionItems(transferSelection) })}
          />
          <TransferAnalysisPanel result={transferAssessment?.ai_result} />
          <div className="account-transfer-tools">
            <DocumentUpload
              product="ai_transfer"
              user={user}
              assessmentId={transferAssessment?.id || null}
              onUploaded={refresh}
            />
            <button type="button" onClick={runTransferAnalysis} disabled={!transferOcrDecision.canContinue || !transferSelection || analysisBusy}>
              {analysisBusy ? <LoaderCircle className="account-spin" size={17} /> : <Sparkles size={17} />}
              {analysisBusy ? 'در حال تحلیل...' : transferAssessment?.ai_result ? 'تحلیل دوباره' : 'تحلیل اولیه ریزنمرات'}
            </button>
          </div>
          {!transferTranscript && <p className="account-tool-note">برای فعال شدن تحلیل اولیه، یک فایل ریزنمرات آپلود کنید.</p>}
          {transferTranscript && transferOcrDecision.canContinue && !transferSelection && (
            <p className="account-tool-note is-warning">برای تحلیل مرتبط با مقصد، ابتدا دانشگاه و رشته مقصد را از کاتالوگ انتخاب کنید.</p>
          )}
          {transferTranscript && !transferTranscript.ai_extraction && (
            <p className="account-tool-note">ابتدا OCR ریزنمرات را کامل کنید؛ سپس تحلیل انتقالی فعال می‌شود.</p>
          )}
          {transferTranscript?.ai_extraction && !transferOcrDecision.canContinue && (
            <p className="account-tool-note is-warning">
              {transferOcrDecision.reason} یک فایل واضح‌تر آپلود کنید یا درخواست بررسی انسانی بدهید.
            </p>
          )}
          {transferOcrDecision.canContinue && !transferAssessment?.ai_result && (
            <p className="account-tool-note is-ready">
              OCR با {transferOcrDecision.confidence}٪ اطمینان قابل استفاده است. اکنون «تحلیل اولیه ریزنمرات» را اجرا کنید.
            </p>
          )}
          <DocumentList
            documents={transferDocuments}
            busyId={documentBusyId}
            onConfirm={(document) => updateDocumentReview(document, 'confirm')}
            onReview={(document) => updateDocumentReview(document, 'review')}
            onRetry={(document) => updateDocumentReview(document, 'retry')}
          />
          <ApplicationReadinessPanel
            product="ai_transfer"
            documents={transferDocuments}
            selection={transferSelection}
            hasGuidance={Boolean(transferAssessment?.ai_result)}
            submission={transferSubmission}
            busy={submissionBusy}
            onSubmit={submitTransferApplication}
          />
          {(transferSubmission || acceptanceDoc) && (
            <AcceptanceJourneyPanel
              submission={transferSubmission}
              acceptanceDoc={acceptanceDoc}
              onRequestRegistrationHelp={requestRegistrationHelp}
              helpBusy={helpBusy}
            />
          )}
        </section>
        )}

        {loading && <div className="account-loading-line"><LoaderCircle className="account-spin" size={18} /> در حال همگام‌سازی حساب...</div>}

        <footer className="account-footer-note">
          <Clock3 size={16} />
          نتایج AI راهنمای اولیه آموزشی هستند و تضمین پذیرش یا معادل‌سازی واحد محسوب نمی‌شوند.
        </footer>
      </div>

      <ProgramCatalogPicker
        open={Boolean(catalogPicker)}
        product={catalogPicker?.product || 'smart_apply'}
        initialProgramId={catalogPicker?.initialProgramId}
        initialUniversity={catalogPicker?.initialUniversity}
        initialSelection={catalogPicker?.initialSelection || []}
        saving={selectionBusy}
        onClose={() => setCatalogPicker(null)}
        onSelect={saveProgramSelection}
      />
    </main>
  );
}

function localizedFa(value) {
  if (!value) return '';
  return typeof value === 'string' ? value : value.fa || value.en || '';
}

function DeepFitAccountCard({ profile }) {
  const answers = Array.isArray(profile?.answers) ? profile.answers : [];
  const adaptiveIds = Array.isArray(profile?.adaptive_question_ids)
    ? profile.adaptive_question_ids
    : [];
  const total = 52 + Math.max(4, adaptiveIds.length);
  const completed = profile?.status === 'completed' && Boolean(profile?.result);
  const progress = completed ? 100 : Math.min(98, Math.round((answers.length / total) * 100));
  const result = profile?.result;
  const majors = Array.isArray(result?.recommendedMajors)
    ? result.recommendedMajors.slice(0, 3)
    : [];

  return (
    <motion.article
      className="account-deep-fit"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="account-deep-fit-orb"><BrainCircuit size={23} /></div>
      <div className="account-deep-fit-main">
        <span className="account-kicker">ACCA Deep Fit</span>
        <h3>
          {completed
            ? localizedFa(result.signature?.label) || 'پروفایل عمیق تحصیلی شما'
            : profile
              ? 'تحلیل عمیق شما در حال تکمیل است'
              : 'از نتیجه اولیه به یک مسیر دقیق‌تر برسید'}
        </h3>
        <p>
          {completed
            ? 'پاسخ‌ها از نظر سبک شناختی، علایق، انگیزه، توان تحصیلی و واقعیت محیط دانشگاهی کنار هم تحلیل شده‌اند.'
            : profile
              ? `پاسخ‌ها ذخیره شده‌اند و از سؤال ${answers.length + 1} ادامه خواهید داد.`
              : 'نسخه ورودکرده تست، پاسخ‌های قبلی را حفظ می‌کند و با ۵۲ سؤال اصلی و چند سؤال تطبیقی، رشته‌های دقیق‌تر و بین‌رشته‌ای پیشنهاد می‌دهد.'}
        </p>

        {!completed && (
          <div className="account-deep-fit-progress">
            <span style={{ width: `${progress}%` }} />
            <b>{progress}%</b>
          </div>
        )}

        {majors.length > 0 && (
          <div className="account-deep-fit-majors">
            {majors.map((major) => (
              <span key={major.id}><BadgeCheck size={13} />{localizedFa(major.name)}</span>
            ))}
          </div>
        )}
      </div>
      <a href="/smart-apply?deep-fit=1">
        <Sparkles size={15} />
        {completed ? 'مشاهده نتیجه در دستیار' : profile ? 'ادامه تست عمیق' : 'شروع تست عمیق'}
      </a>
    </motion.article>
  );
}
