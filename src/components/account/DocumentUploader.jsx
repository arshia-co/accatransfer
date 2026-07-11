import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, Check, ChevronDown, CloudUpload, FileText, Image as ImageIcon,
  LoaderCircle, ScanText, ShieldCheck, Trash2,
} from 'lucide-react';
import { uploadStudentDocument } from '../../services/accountService';
import { humanFileSize, prepareUploadFile } from '../../services/documentSecurity';

// Identity / supporting categories shared by both products.
const SHARED_EXTRA = [
  { value: 'identity_document', label: 'مدارک هویتی' },
  { value: 'national_id', label: 'کارت ملی' },
  { value: 'birth_certificate', label: 'شناسنامه' },
  { value: 'bank_statement', label: 'تمکن مالی / گردش حساب' },
  { value: 'motivation_letter', label: 'انگیزه‌نامه' },
  { value: 'recommendation_letter', label: 'توصیه‌نامه' },
  { value: 'cv', label: 'رزومه (CV)' },
  { value: 'medical_certificate', label: 'گواهی سلامت / واکسن' },
  { value: 'other_certificate', label: 'سایر مدارک' },
];

const KINDS = {
  ai_transfer: [
    { value: 'transcript', label: 'ریزنمرات' },
    { value: 'syllabus', label: 'سرفصل دروس' },
    { value: 'student_certificate', label: 'گواهی اشتغال به تحصیل' },
    { value: 'passport', label: 'پاسپورت' },
    { value: 'diploma', label: 'مدرک تحصیلی' },
    { value: 'language_certificate', label: 'مدرک زبان' },
    ...SHARED_EXTRA,
  ],
  smart_apply: [
    { value: 'passport', label: 'پاسپورت' },
    { value: 'transcript', label: 'ریزنمرات' },
    { value: 'diploma', label: 'مدرک تحصیلی' },
    { value: 'language_certificate', label: 'مدرک زبان' },
    { value: 'photo', label: 'عکس پرسنلی' },
    { value: 'award_certificate', label: 'لوح تقدیر و افتخارات' },
    ...SHARED_EXTRA,
  ],
};

const STAGE_LABEL = {
  security: 'بررسی امنیتی',
  prepare: 'پردازش امن فایل',
  quality: 'بررسی کیفیت',
  upload: 'آپلود امن',
  scan: 'اسکن امنیتی سرور',
  ocr: 'خواندن هوشمند مدرک',
};

// Apple-style document-type picker: a styled trigger + custom popover list,
// replacing the native <select> (whose closed state and label had poor
// contrast in dark mode and could not be themed).
function KindPicker({ kinds, value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = kinds.find((k) => k.value === value) || kinds[0];

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => { if (ref.current && !ref.current.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={`doc-kind-picker ${open ? 'is-open' : ''}`} ref={ref}>
      <button
        type="button"
        className="doc-kind-trigger"
        onClick={() => { if (!disabled) setOpen((o) => !o); }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{current?.label}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <ul className="doc-kind-menu" role="listbox">
          {kinds.map((item) => (
            <li key={item.value}>
              <button
                type="button"
                role="option"
                aria-selected={item.value === value}
                className={item.value === value ? 'is-active' : ''}
                onClick={() => { onChange(item.value); setOpen(false); }}
              >
                <span>{item.label}</span>
                {item.value === value && <Check size={15} aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// A professional drag-drop uploader with a pre-upload setup/validation stage
// (the student reviews, picks the document type and sees the security checks
// before committing). All hardening runs in documentSecurity / accountService.
export default function DocumentUploader({ product, user, assessmentId = null, onUploaded }) {
  const kinds = KINDS[product] || KINDS.smart_apply;
  const [staged, setStaged] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [uploadError, setUploadError] = useState('');
  const inputRef = useRef(null);

  const clearStaged = () => {
    setStaged((current) => {
      if (current?.preview) URL.revokeObjectURL(current.preview);
      return null;
    });
  };

  const pick = async (file) => {
    if (!file || busy) return;
    setUploadError('');
    clearStaged();
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    const next = { file, kind: kinds[0].value, preview, status: 'checking', report: null, error: '' };
    setStaged(next);
    try {
      const prepared = await prepareUploadFile(file);
      setStaged((current) => (current?.file === file
        ? { ...current, status: 'ready', report: { metadataStripped: prepared.metadataStripped, mimeType: prepared.mimeType, size: prepared.sizeBytes } }
        : current));
    } catch (err) {
      setStaged((current) => (current?.file === file
        ? { ...current, status: 'error', error: err?.message || 'فایل پذیرفته نشد.' }
        : current));
    }
  };

  const confirmUpload = async () => {
    if (!staged || staged.status !== 'ready' || busy) return;
    setBusy(true);
    setUploadError('');
    setProgress(2);
    try {
      const uploaded = await uploadStudentDocument({
        user, product, kind: staged.kind, file: staged.file, assessmentId,
        onProgress: setProgress, onStage: setStage,
      });
      if (uploaded?.ocrError) {
        setUploadError('فایل امن ذخیره شد، اما خواندن هوشمند کامل نشد؛ می‌توانید دوباره پردازش را اجرا کنید.');
      }
      clearStaged();
      await onUploaded?.();
    } catch (err) {
      setUploadError(err?.message || 'آپلود انجام نشد.');
    } finally {
      setBusy(false);
      setStage('');
      window.setTimeout(() => setProgress(0), 700);
    }
  };

  return (
    <div className="doc-uploader">
      {!staged ? (
        <label
          className={`doc-dropzone ${dragOver ? 'is-drag' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => { event.preventDefault(); setDragOver(false); pick(event.dataTransfer.files?.[0]); }}
        >
          <span className="doc-dropzone-orb"><CloudUpload size={22} /></span>
          <b>فایل را اینجا رها کنید یا برای انتخاب کلیک کنید</b>
          <small>PDF تا ۱۰ مگابایت · عکس JPG/PNG تا ۵ مگابایت — MIME واقعی، حذف EXIF و اسکن امنیتی خودکار انجام می‌شود.</small>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="sr-only"
            onChange={(event) => pick(event.target.files?.[0])}
          />
        </label>
      ) : (
        <div className="doc-stage">
          <div className="doc-stage-preview">
            {staged.preview ? <img src={staged.preview} alt="" /> : <FileText size={26} />}
          </div>
          <div className="doc-stage-body">
            <b title={staged.file.name}>{staged.file.name}</b>
            <small>{(staged.file.type || '').includes('pdf') ? 'PDF' : 'تصویر'} · {humanFileSize(staged.file.size)}</small>

            <div className="doc-stage-kind">
              <span>نوع مدرک را مشخص کنید</span>
              <KindPicker
                kinds={kinds}
                value={staged.kind}
                disabled={busy}
                onChange={(next) => setStaged((current) => ({ ...current, kind: next }))}
              />
            </div>

            <div className="doc-stage-checks">
              {staged.status === 'checking' && (
                <span className="is-checking"><LoaderCircle className="account-spin" size={13} /> در حال بررسی امنیتی…</span>
              )}
              {staged.status === 'ready' && (
                <>
                  <span className="is-ok"><ShieldCheck size={13} /> نوع و حجم تأیید شد</span>
                  <span className="is-ok"><Check size={13} /> بدون اسکریپت/فایل اجرایی</span>
                  {staged.report?.metadataStripped && <span className="is-ok"><ImageIcon size={13} /> EXIF حذف شد</span>}
                </>
              )}
              {staged.status === 'error' && (
                <span className="is-bad"><AlertTriangle size={13} /> {staged.error}</span>
              )}
            </div>
          </div>
          <div className="doc-stage-actions">
            <button type="button" className="doc-stage-cancel" onClick={clearStaged} disabled={busy}>
              <Trash2 size={14} /> حذف
            </button>
            <button type="button" className="doc-stage-upload" onClick={confirmUpload} disabled={busy || staged.status !== 'ready'}>
              {busy
                ? <><LoaderCircle className="account-spin" size={15} /> {STAGE_LABEL[stage] || 'در حال آپلود'} · {progress}%</>
                : <><CloudUpload size={15} /> آپلود امن مدرک</>}
            </button>
          </div>
        </div>
      )}

      {busy && progress > 0 && (
        <div className="doc-uploader-progress">
          <div className="account-progress"><span style={{ width: `${progress}%` }} /></div>
          <span><ScanText size={12} /> {STAGE_LABEL[stage] || 'پردازش'}</span>
        </div>
      )}
      {uploadError && <small className="account-error">{uploadError}</small>}
    </div>
  );
}
