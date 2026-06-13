import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, BrainCircuit, CheckCircle2, Clock3, CloudUpload, Compass,
  FileText, FolderLock, GraduationCap, LayoutGrid, LoaderCircle, LogOut,
  RefreshCw, ShieldCheck, Sparkles, UserRound,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import {
  createTransferAssessment,
  listCentralAccountData,
  requestTransferAnalysis,
  uploadStudentDocument,
} from '../../services/accountService';

const EMPTY_DATA = { profile: null, documents: [], smartApply: [], transfer: [] };

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    setError('');
    setProgress(5);
    try {
      await uploadStudentDocument({ user, product, kind, file, assessmentId, onProgress: setProgress });
      await onUploaded();
    } catch (err) {
      setError(err?.message || 'آپلود انجام نشد.');
    } finally {
      setBusy(false);
      window.setTimeout(() => setProgress(0), 700);
    }
  };

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
          </>
        )}
      </select>
      <label>
        {busy ? <LoaderCircle className="account-spin" size={17} /> : <CloudUpload size={17} />}
        {busy ? `${progress}%` : 'آپلود مدرک'}
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={busy} onChange={(event) => upload(event.target.files?.[0])} />
      </label>
      {progress > 0 && <div className="account-progress"><span style={{ width: `${progress}%` }} /></div>}
      {error && <small className="account-error">{error}</small>}
    </div>
  );
}

function DocumentList({ documents }) {
  if (!documents.length) {
    return <div className="account-product-empty"><FolderLock size={22} /><span>هنوز مدرکی در این بخش ثبت نشده است.</span></div>;
  }
  return (
    <div className="account-document-list">
      {documents.map((document) => (
        <article key={document.id}>
          <span><FileText size={18} /></span>
          <div>
            <b>{document.original_name}</b>
            <small>{formatSize(document.size_bytes)} · {formatDate(document.created_at)}</small>
          </div>
          <StatusPill status={document.status} />
        </article>
      ))}
    </div>
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
  return (
    <main className="account-page account-central" dir="rtl">
      <div className="account-ambient" />
      <section className="account-signed-out">
        <div className="account-orb"><FolderLock size={32} /></div>
        <span className="account-kicker">ACCA Central Account</span>
        <h1>یک حساب برای تمام مسیر شما</h1>
        <p>سوابق Smart Apply، ارزیابی AI Transfer، نتایج و مدارک شما در یک پنل مرکزی و امن نمایش داده می‌شوند.</p>
        <button type="button" onClick={() => openAuth('smart_apply', { returnTo: '/account' })}>
          <Sparkles size={18} /> ورود با کد ایمیل
        </button>
        {!isConfigured && <small>اتصال Supabase در محیط اجرا پیکربندی نشده است.</small>}
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

  const smartSession = data.smartApply[0] || null;
  const transferAssessment = data.transfer[0] || null;
  const smartDocuments = data.documents.filter((item) => item.product === 'smart_apply');
  const transferDocuments = data.documents.filter((item) => item.product === 'ai_transfer');
  const transferTranscript = transferDocuments.find((item) => item.document_kind === 'transcript');
  const usedProducts = Number(Boolean(smartSession || smartDocuments.length)) + Number(Boolean(transferAssessment || transferDocuments.length));

  const completion = useMemo(() => {
    const smartScore = smartSession ? 25 : 0;
    const transferScore = transferAssessment ? 25 : 0;
    const documentScore = Math.min(30, data.documents.length * 6);
    const resultScore = (smartSession?.result ? 10 : 0) + (transferAssessment?.ai_result ? 10 : 0);
    return Math.min(100, smartScore + transferScore + documentScore + resultScore);
  }, [smartSession, transferAssessment, data.documents.length]);

  const runTransferAnalysis = async () => {
    if (!transferTranscript || !user) return;
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

  if (authLoading) return <main className="account-page account-loading"><LoaderCircle className="account-spin" /></main>;
  if (!user) return <SignedOut />;

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
            <span><UserRound size={19} /></span>
            <div><small>حساب فعال</small><b dir="ltr">{user.email}</b></div>
            <ShieldCheck size={20} />
          </div>
        </section>

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

          <div className="account-product-summary">
            <div><small>آخرین فعالیت</small><b>{smartSession ? formatDate(smartSession.updated_at || smartSession.created_at) : 'هنوز شروع نشده'}</b></div>
            <div><small>هدف ثبت‌شده</small><b>{smartSession?.goal || '—'}</b></div>
            <div><small>مدارک</small><b>{smartDocuments.length}</b></div>
          </div>

          <ResultCard result={smartSession?.result} type="smart" />
          <DocumentUpload product="smart_apply" user={user} onUploaded={refresh} />
          <DocumentList documents={smartDocuments} />
        </section>

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

          <div className="account-product-summary">
            <div><small>دانشگاه فعلی</small><b>{transferAssessment?.current_university || 'تکمیل نشده'}</b></div>
            <div><small>رشته مقصد</small><b>{transferAssessment?.target_program || 'تکمیل نشده'}</b></div>
            <div><small>مدارک</small><b>{transferDocuments.length}</b></div>
          </div>

          <ResultCard result={transferAssessment?.ai_result} type="transfer" />
          <div className="account-transfer-tools">
            <DocumentUpload
              product="ai_transfer"
              user={user}
              assessmentId={transferAssessment?.id || null}
              onUploaded={refresh}
            />
            <button type="button" onClick={runTransferAnalysis} disabled={!transferTranscript || analysisBusy}>
              {analysisBusy ? <LoaderCircle className="account-spin" size={17} /> : <Sparkles size={17} />}
              {analysisBusy ? 'در حال تحلیل...' : transferAssessment?.ai_result ? 'تحلیل دوباره' : 'تحلیل اولیه ریزنمرات'}
            </button>
          </div>
          {!transferTranscript && <p className="account-tool-note">برای فعال شدن تحلیل اولیه، یک فایل ریزنمرات آپلود کنید.</p>}
          <DocumentList documents={transferDocuments} />
        </section>

        {loading && <div className="account-loading-line"><LoaderCircle className="account-spin" size={18} /> در حال همگام‌سازی حساب...</div>}

        <footer className="account-footer-note">
          <Clock3 size={16} />
          نتایج AI راهنمای اولیه آموزشی هستند و تضمین پذیرش یا معادل‌سازی واحد محسوب نمی‌شوند.
        </footer>
      </div>
    </main>
  );
}
