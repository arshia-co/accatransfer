import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, ArrowLeft, BadgeCheck, Bell, BookOpen, BrainCircuit, CalendarClock, CheckCircle2, ChevronDown, ChevronUp, Clock3, CloudUpload, Compass,
  Download, FileCheck2, FileText, FolderLock, GraduationCap, Layers, LayoutGrid, ListChecks, LoaderCircle, Lock, LogOut, Moon, Paperclip, Percent,
  RefreshCw, ScanText, ShieldCheck, Sparkles, Sun, Target, Trash2, XCircle,
} from 'lucide-react';
import { computeCourseMatches, overallMatch, parseGradeRatio } from '../../transfer/lib/course-matching';
import { useAuth } from '../../auth/AuthContext';
import { rememberAccountPreview } from '../../auth/accountPreview';
import { readStoredLang, subscribeStoredLang, writeStoredLang } from '../../lib/lang';
import {
  confirmDocumentExtraction,
  createTransferAssessment,
  createDocumentSignedUrl,
  deleteStudentDocument,
  listCentralAccountData,
  migrateGuestTransferDraftV2 as migrateGuestTransferDraft,
  requestDocumentOcr,
  requestHumanDocumentReview,
  requestApplicationSubmission,
  requestTransferAnalysis,
  upsertProgramSelection,
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
import DocumentUploader from './DocumentUploader';
import ApplicationReadinessPanel from './ApplicationReadinessPanel';
import AcceptanceJourneyPanel from './AcceptanceJourneyPanel';
import ProfileEditor from './ProfileEditor';
import ParticleField from '../gateway/ParticleField';
import { getLocalizedOcrAction, getLocalizedOcrSummary } from '../../services/ocrNarrativeService';

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

// Documents issued by the ACCA team / super-admin (stored in student_documents).
// These are shown in the After Application panel, never in the student's own
// upload list, and are not deletable by the student.
const COMPANY_DOC_KINDS = new Set(['acceptance_letter', 'document_request', 'status_update_attachment', 'rejection_notice']);

function DocumentCard({ document, lang = 'fa', busy, deleting, onConfirm, onReview, onRetry, onDelete }) {
  const locked = Boolean(document.is_locked) || COMPANY_DOC_KINDS.has(document.document_kind);
  const [open, setOpen] = useState(false);
  const extraction = document.ai_extraction;
  const fields = extraction?.fields || {};
  const visibleFields = EXTRACTION_FIELDS.filter(([key]) => fields[key]);
  const decision = getDocumentOcrDecision(document);
  const confidence = decision.confidence;
  const quality = extraction?.quality || document.quality_report;
  const ocrSummary = getLocalizedOcrSummary(document, lang);
  const ocrAction = getLocalizedOcrAction(document, lang);
  const confirmed = document.review_status === 'confirmed' || document.review_status === 'reviewed';
  const hasDetail = visibleFields.length > 0 || Boolean(ocrSummary) || (extraction?.courses?.length ?? 0) > 0;
  const expandable = hasDetail || Boolean(extraction && !decision.canContinue);
  const state = confirmed
    ? { cls: 'is-confirmed', label: 'تأیید‌شده', Icon: BadgeCheck }
    : !extraction
      ? { cls: 'is-pending', label: 'در حال پردازش', Icon: Clock3 }
      : decision.canContinue
        ? { cls: 'is-ready', label: 'آماده', Icon: CheckCircle2 }
        : { cls: 'is-review', label: 'نیازمند بررسی', Icon: AlertTriangle };

  return (
    <article className={`account-doc ${state.cls}`}>
      <div className="account-doc-row">
        <span className="account-doc-ic"><FileText size={16} /></span>
        <div className="account-doc-info">
          <b title={document.original_name}>
            {document.original_name}
            {document.version > 1 && <i className="account-doc-version">v{document.version}</i>}
          </b>
          <small>
            {documentKindLabel(document.document_kind)} · {formatSize(document.size_bytes)} · {formatDate(document.created_at)}
            {document.security_scan?.safe && <span className="account-doc-scan"><ShieldCheck size={10} /> اسکن</span>}
          </small>
        </div>
        {Number.isFinite(Number(confidence)) && <span className="account-doc-conf" dir="ltr" title="اطمینان OCR">{confidence}%</span>}
        <span className={`account-doc-state ${state.cls}`}><state.Icon size={12} />{state.label}</span>
        <div className="account-doc-act">
          {decision.canContinue && !confirmed && (
            <button type="button" className="account-doc-confirm" onClick={() => onConfirm(document)} disabled={busy} title="اطلاعات با مدرک مطابقت دارد">
              {busy ? <LoaderCircle className="account-spin" size={13} /> : <BadgeCheck size={13} />}
              تأیید
            </button>
          )}
          {!confirmed && !decision.canContinue && (
            <button type="button" className="account-doc-icon-btn" onClick={() => onRetry(document)} disabled={busy} title="اجرای دوباره OCR">
              {busy ? <LoaderCircle className="account-spin" size={13} /> : <RefreshCw size={13} />}
            </button>
          )}
          {expandable && (
            <button type="button" className="account-doc-icon-btn" onClick={() => setOpen((value) => !value)} aria-expanded={open} title="جزئیات OCR">
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          {locked ? (
            <span className="account-doc-lock" title="مدرک قفل‌شده — توسط آکا صادر شده و قابل حذف نیست"><Lock size={13} /></span>
          ) : (
            <button type="button" className="account-doc-icon-btn is-danger" onClick={() => onDelete?.(document)} disabled={busy || deleting} aria-label="حذف مدرک" title="حذف مدرک">
              {deleting ? <LoaderCircle className="account-spin" size={13} /> : <Trash2 size={13} />}
            </button>
          )}
        </div>
      </div>

      {open && expandable && (
        <div className="account-doc-body">
          {extraction && !decision.canContinue && decision.reason && (
            <p className="account-doc-reason"><AlertTriangle size={13} />{decision.reason}</p>
          )}
          {visibleFields.length > 0 && (
            <dl className="account-ocr-fields">
              {visibleFields.map(([key, label]) => (
                <div key={key}><dt>{label}</dt><dd dir={key === 'student_name' ? 'auto' : 'ltr'}>{fields[key]}</dd></div>
              ))}
            </dl>
          )}
          {ocrSummary && <p className="account-ocr-summary">{ocrSummary}</p>}
          {ocrAction && quality?.status !== 'good' && (
            <p className="account-ocr-warning"><AlertTriangle size={14} />{ocrAction}</p>
          )}
          <ExtractedCourses courses={extraction?.courses} />
          {!confirmed && extraction && (
            <button type="button" className="account-doc-human" onClick={() => onReview(document)} disabled={busy}>
              درخواست بررسی انسانی
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function DocumentList({ documents, lang = 'fa', busyId, deletingId, onConfirm, onReview, onRetry, onDelete }) {
  if (!documents.length) {
    return <div className="account-product-empty"><FolderLock size={22} /><span>هنوز مدرکی در این بخش ثبت نشده است.</span></div>;
  }
  return (
    <div className="account-document-list">
      {documents.map((document) => (
        <DocumentCard
          key={document.id}
          document={document}
          lang={lang}
          busy={busyId === document.id}
          deleting={deletingId === document.id}
          onConfirm={onConfirm}
          onReview={onReview}
          onRetry={onRetry}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

const LETTER_TYPE_LABEL = {
  acceptance: 'پذیرش',
  conditional_acceptance: 'پذیرش مشروط',
  offer: 'پیشنهاد پذیرش',
  invitation: 'دعوت‌نامه',
  visa_support: 'پشتیبانی ویزا',
  general: 'نامه رسمی',
};

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

const TRANSFER_STATUS_META = {
  likely: { fa: 'محتمل', cls: 'is-likely' },
  review: { fa: 'نیازمند بررسی', cls: 'is-review' },
  unlikely: { fa: 'کم‌احتمال', cls: 'is-unlikely' },
};

function localizeEntry(value) {
  const map = {
    'Year 2 may be possible': 'سال دوم',
    'Year 1 or Year 2 may be possible': 'سال ۱ یا ۲',
    'Year 1 is more likely': 'سال اول',
    'Cannot be estimated without verified credits': 'نیازمند تأیید واحد',
  };
  return value ? (map[value] || value) : '—';
}

function localizeConfidence(value) {
  const map = { Low: 'پایین', Medium: 'متوسط', High: 'بالا' };
  return value ? (map[value] || value) : '—';
}

function transferStatusFromScore(score) {
  if (score >= 80) return 'likely';
  if (score >= 58) return 'review';
  return 'unlikely';
}

function docVerified(doc) {
  const status = (doc?.review_status || '').toLowerCase();
  return status === 'confirmed' || status === 'verified' || status === 'approved';
}

function firstNonEmpty(...values) {
  return values.find((value) => String(value ?? '').trim()) ?? '';
}

function toNumber(value) {
  const match = String(value ?? '').replace(',', '.').match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function stableHash(value) {
  return String(value || '').split('').reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) | 0, 0);
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function normalizeTargetItems(selection) {
  const catalogItems = getSelectionItems(selection);
  const items = catalogItems.length ? catalogItems : (selection ? [selection.catalog_snapshot || selection] : []);
  return items.map((item) => ({
    id: item.id || item.catalog_program_id || `${item.university || item.university_name}-${item.program || item.program_name}`,
    university: item.university || item.university_name || item.name || '',
    program: item.program || item.program_name || '',
    country: item.country || '',
    city: item.city || '',
    degree: item.degree || '',
    language: item.language || '',
    tuitionFee: item.tuitionFee || item.tuition_fee || item.cashFees || item.cash_fee || '',
    logo: item.universityLogo || item.university_logo || '',
    raw: item,
  })).filter((item) => item.university || item.program);
}

function getExtraction(document) {
  return document?.confirmed_extraction || document?.ai_extraction || document?.ocrResult || null;
}

function normalizeOcrCourses(document) {
  const extraction = getExtraction(document);
  const courses = Array.isArray(extraction?.courses) ? extraction.courses : [];
  return courses.map((course, index) => ({
    id: course.id || course.code || `${course.title || course.name || 'course'}-${index}`,
    name: course.title || course.name || course.course_name || '',
    grade: course.grade || course.gradeLabel || course.mark || '',
    credits: course.credits || course.ects || '',
  })).filter((course) => course.name.trim());
}

function normalizeGuestCourses(courses) {
  return (Array.isArray(courses) ? courses : []).map((course, index) => ({
    id: course.id || `${course.name || course.title || 'guest'}-${index}`,
    name: course.name || course.title || course.course_name || '',
    grade: course.grade || course.gradeLabel || course.mark || '',
    credits: course.credits || course.ects || '',
  })).filter((course) => course.name.trim());
}

function suggestedTargetCourse(sourceName, targetProgram) {
  const name = String(sourceName || '').toLowerCase();
  if (name.includes('calculus') || name.includes('math') || name.includes('ریاضی')) return 'Mathematics I';
  if (name.includes('program') || name.includes('software') || name.includes('computer') || name.includes('برنامه')) return 'Intro to Programming';
  if (name.includes('physics') || name.includes('فیزیک')) return 'General Physics';
  if (name.includes('english') || name.includes('academic') || name.includes('انگلیسی')) return 'English for Engineers';
  if (name.includes('linear') || name.includes('algebra') || name.includes('جبر')) return 'Linear Algebra';
  if (name.includes('chem') || name.includes('شیمی')) return 'General Chemistry';
  if (name.includes('bio') || name.includes('زیست')) return 'General Biology';
  return targetProgram ? `${targetProgram} core equivalent` : 'Target course review';
}

function entryFromCredits(credits, courseCount) {
  const creditValue = toNumber(credits);
  if (creditValue != null) {
    if (creditValue >= 90) return 'Year 2 may be possible';
    if (creditValue >= 45) return 'Year 1 or Year 2 may be possible';
    return 'Year 1 is more likely';
  }
  if (courseCount >= 10) return 'Year 2 may be possible';
  if (courseCount >= 5) return 'Year 1 or Year 2 may be possible';
  return 'Cannot be estimated without verified credits';
}

function confidenceFromDocument(document, courses) {
  const decision = getDocumentOcrDecision(document);
  if (decision?.confidence >= 80 && courses.length >= 4) return 'High';
  if (decision?.confidence >= OCR_CONTINUE_THRESHOLD || courses.length >= 3) return 'Medium';
  return 'Low';
}

function documentChecklist(documents = []) {
  const kinds = [
    ['transcript', 'ریزنمرات', true],
    ['passport', 'پاسپورت', true],
    ['student_certificate', 'گواهی اشتغال به تحصیل', true],
    ['syllabus', 'سرفصل دروس', false],
    ['language_certificate', 'مدرک زبان', false],
    ['diploma', 'مدرک تحصیلی', false],
  ];
  return kinds.map(([kind, label, mandatory]) => {
    const doc = documents.find((item) => item.document_kind === kind);
    return {
      kind,
      label,
      mandatory,
      present: Boolean(doc),
      verified: Boolean(doc && docVerified(doc)),
      confidence: getDocumentOcrDecision(doc).confidence,
      document: doc,
    };
  });
}

function buildDestinationFits(targetItems, baseScore, overall, targetProgram) {
  if (!targetItems.length) return [];
  return targetItems.slice(0, 6).map((item, index) => {
    const variance = (Math.abs(stableHash(`${item.university}-${item.program}`)) % 11) - 5;
    const primaryBoost = index === 0 ? 3 : 0;
    const score = clampPercent((baseScore || overall.score || 62) + variance + primaryBoost);
    const recognized = overall.total
      ? `${Math.max(0, Math.min(overall.total, overall.likely + (score >= 76 ? 1 : 0)))}/${overall.total}`
      : 'نیازمند ریزنمرات';
    return {
      ...item,
      score,
      recognized,
      entry: localizeEntry(entryFromCredits(null, overall.total)),
      note: `${item.program || targetProgram || 'رشته مقصد'} در ${item.university || 'دانشگاه مقصد'}`,
    };
  }).sort((a, b) => b.score - a.score);
}

function buildLiveTransferResult({ assessment, selection, transcript, documents }) {
  const saved = assessment?.ai_result || null;
  const targetItems = normalizeTargetItems(selection);
  const primaryTarget = targetItems[0] || {};
  const extraction = getExtraction(transcript);
  const fields = extraction?.fields || {};
  const savedAnswers = saved?.guest_answers || {};
  const ocrCourses = normalizeOcrCourses(transcript);
  const guestCourses = normalizeGuestCourses(saved?.guest_courses);
  const courses = ocrCourses.length ? ocrCourses : guestCourses;

  const targetProgram = firstNonEmpty(primaryTarget.program, selection?.program_name, assessment?.target_program, savedAnswers.targetProgram);
  const targetUniversity = firstNonEmpty(primaryTarget.university, selection?.university_name, assessment?.target_university, savedAnswers.targetUniversity);
  const targetCountry = firstNonEmpty(primaryTarget.country, selection?.country, assessment?.target_country, savedAnswers.targetCountry);
  const currentProgram = firstNonEmpty(assessment?.current_program, fields.program, saved?.detected_program, savedAnswers.currentProgram);
  const currentUniversity = firstNonEmpty(assessment?.current_university, fields.institution, savedAnswers.currentUniversity);
  const gpa = firstNonEmpty(fields.gpa, saved?.detected_gpa, savedAnswers.gpa);
  const gpaScale = firstNonEmpty(fields.gpa_scale, saved?.detected_gpa_scale, savedAnswers.gpaScale);
  const completedCredits = firstNonEmpty(fields.total_credits, saved?.detected_completed_credits, savedAnswers.completedCredits);
  const gpaRatio = parseGradeRatio(gpaScale && gpa && !String(gpa).includes('/') ? `${gpa}/${gpaScale}` : gpa);
  const matches = computeCourseMatches(courses, { currentProgram, targetProgram, targetUniversity, gpaRatio });
  const overall = overallMatch(matches);
  const existingScore = saved?.estimated_transfer_match ?? saved?.analysis_summary?.estimated_transfer_match;
  const baseScore = overall.total
    ? overall.score
    : existingScore ?? clampPercent(45 + (gpaRatio ?? 0.55) * 35 + (targetProgram ? 6 : 0));
  const checklist = documentChecklist(documents);
  const missingDocs = checklist
    .filter((item) => item.mandatory && !item.present)
    .map((item) => ({
      document_name: item.label,
      reason: 'برای بررسی دقیق‌تر انتقالی و ارسال پرونده لازم است.',
      priority: 'High',
      needed_when: 'Before advisor review',
      affects_confidence: true,
    }));
  const coursePreview = matches.map((match) => ({
    source_course: match.name,
    suggested_target_course: suggestedTargetCourse(match.name, targetProgram),
    grade: match.gradeLabel,
    match_score: match.matchScore,
    confidence: match.matchScore >= 80 ? 'High' : match.matchScore >= 58 ? 'Medium' : 'Low',
    status: match.status === 'likely' ? 'Likely Recognized' : match.status === 'review' ? 'Needs Syllabus Review' : 'Weak Match',
    tone: match.status,
    explanation: match.status === 'likely'
      ? 'نام درس و نمره برای بررسی اولیه با مقصد هم‌خوان است.'
      : match.status === 'review'
        ? 'برای تصمیم دقیق‌تر، سرفصل یا توضیح درس لازم است.'
        : 'هم‌خوانی اولیه پایین است و باید توسط مشاور بررسی شود.',
    required_next_action: match.status === 'likely' ? 'Keep transcript available' : 'Upload syllabus or request advisor review',
  }));
  const destinationFits = buildDestinationFits(targetItems, baseScore, overall, targetProgram);
  const isLivePreview = Boolean(!saved || (targetProgram && savedAnswers.targetProgram && savedAnswers.targetProgram !== targetProgram));
  const recognizedText = overall.total ? `${overall.likely}/${overall.total}` : (saved?.likely_recognized_courses || 'نیازمند ریزنمرات');

  if (!assessment && !selection && !transcript && !saved) return null;

  return {
    ...(saved || {}),
    headline: saved?.headline || 'نمای زنده مسیر انتقالی شما',
    overview: saved?.overview || `این پیش‌نمایش با ریزنمرات خوانده‌شده، مقصد انتخابی و حافظه جلسه شما ساخته شده است${targetUniversity ? `؛ مقصد فعلی ${targetUniversity}` : ''}.`,
    current_university: currentUniversity,
    current_program: currentProgram,
    target_country: targetCountry,
    target_university: targetUniversity,
    target_program: targetProgram,
    detected_gpa: gpa,
    detected_gpa_scale: gpaScale,
    detected_completed_credits: completedCredits,
    completed_course_count: courses.length || saved?.completed_course_count || null,
    estimated_transfer_match: baseScore,
    estimated_entry_level: saved?.estimated_entry_level || entryFromCredits(completedCredits, courses.length),
    likely_recognized_courses: recognizedText,
    missing_documents_count: missingDocs.length || saved?.missing_documents_count || 0,
    ai_confidence: saved?.ai_confidence || confidenceFromDocument(transcript, courses),
    risk_level: saved?.risk_level || (baseScore >= 78 ? 'Low' : baseScore >= 58 ? 'Medium' : 'High'),
    preliminary_transfer_fit: saved?.preliminary_transfer_fit || (baseScore >= 78 ? 'Strong Candidate for Transfer Review' : baseScore >= 58 ? 'Good Candidate with Document Review Needed' : 'Possible Candidate with Significant Risks'),
    course_equivalency_preview: coursePreview.length ? coursePreview : (saved?.course_equivalency_preview || []),
    missing_documents: saved?.missing_documents?.length ? saved.missing_documents : missingDocs,
    risk_factors: saved?.risk_factors?.length ? saved.risk_factors : [
      !targetProgram ? { title: 'رشته مقصد انتخاب نشده', explanation: 'بدون رشته مقصد، تطبیق درس‌به‌درس دقیق نیست.', severity: 'Medium', recommended_action: 'از کاتالوگ ACCA یک رشته و دانشگاه انتخاب کنید.' } : null,
      !courses.length ? { title: 'دروس خوانده‌شده کم است', explanation: 'برای تطبیق قوی‌تر باید درس‌ها و نمره‌ها از ریزنمرات خوانده شوند.', severity: 'Medium', recommended_action: 'ریزنمرات واضح‌تر آپلود کنید یا OCR را دوباره اجرا کنید.' } : null,
    ].filter(Boolean),
    next_steps: saved?.next_steps || [
      targetProgram ? `مقصد فعلی را بررسی کنید: ${targetProgram}${targetUniversity ? ` در ${targetUniversity}` : ''}` : 'دانشگاه و رشته مقصد را از کاتالوگ انتخاب کنید.',
      courses.length ? 'دروس و نمره‌های OCR شده را در بخش مدارک تأیید کنید.' : 'ریزنمرات را آپلود یا OCR را تکمیل کنید.',
      'برای گزارش رسمی‌تر، تحلیل اولیه ریزنمرات را اجرا کنید.',
      'برای ارسال پرونده، بررسی انسانی مشاور ACCA را درخواست کنید.',
    ],
    admission_reality_note: saved?.admission_reality_note || 'این یک پیش‌نمایش آموزشی و مقدماتی است. تصمیم نهایی انتقالی، پذیرش، معادل‌سازی درس و ورود به ترم بالاتر همیشه با دانشگاه مقصد است.',
    guest_answers: { ...savedAnswers, currentProgram, currentUniversity, targetProgram, targetUniversity, targetCountry, gpa, gpaScale, completedCredits },
    guest_courses: courses,
    destination_universities: destinationFits,
    document_checklist: checklist,
    is_live_preview: isLivePreview,
  };
}

function AiConfidenceRing({ value }) {
  const v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="account-ai-ring" role="img" aria-label={`${v}%`}>
      <svg viewBox="0 0 120 120">
        <circle className="account-ai-ring-track" cx="60" cy="60" r={radius} />
        <circle
          className="account-ai-ring-fill"
          cx="60" cy="60" r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - v / 100)}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="account-ai-ring-center" dir="ltr"><b>{v}<span>%</span></b></div>
    </div>
  );
}

function TransferAnalysisPanel({ result, documents = [] }) {
  // Course-by-course equivalency: use the stored preview if present, otherwise
  // compute it on the fly from the saved guest courses + answers so the table
  // is always populated (the matching engine is deterministic).
  const courses = useMemo(() => {
    if (!result) return [];
    if (Array.isArray(result.course_equivalency_preview) && result.course_equivalency_preview.length) {
      return result.course_equivalency_preview.map((c) => {
        const score = c.match_score == null ? null : Number(c.match_score);
        return {
          name: c.source_course,
          target: c.suggested_target_course || '',
          grade: c.grade || c.gradeLabel || '',
          score,
          tone: c.tone || (score == null ? 'review' : transferStatusFromScore(score)),
          explanation: c.explanation || c.required_next_action || '',
        };
      });
    }
    const answers = result.guest_answers || {};
    const guestCourses = Array.isArray(result.guest_courses) ? result.guest_courses : [];
    if (!guestCourses.length) return [];
    return computeCourseMatches(guestCourses, {
      currentProgram: answers.currentProgram || '',
      targetProgram: answers.targetProgram || '',
      targetUniversity: answers.targetUniversity || result.target_university || '',
      gpaRatio: parseGradeRatio(answers.gpa || ''),
    }).map((m) => ({
      name: m.name,
      target: answers.targetProgram || '',
      grade: m.gradeLabel,
      score: m.matchScore,
      tone: m.status,
    }));
  }, [result]);

  if (!result) return null;

  const answers = result.guest_answers || {};
  const matchValue = result.estimated_transfer_match != null
    ? Number(result.estimated_transfer_match)
    : (courses.length
      ? overallMatch(courses.map((c, i) => ({ id: String(i), name: c.name, gradeLabel: c.grade, matchScore: c.score ?? 0, status: c.tone }))).score
      : 0);
  const counts = courses.reduce((acc, c) => { acc[c.tone] = (acc[c.tone] || 0) + 1; return acc; }, {});
  const destinationFits = Array.isArray(result.destination_universities) ? result.destination_universities : [];
  const checklist = Array.isArray(result.document_checklist) ? result.document_checklist : documentChecklist(documents);
  const verifiedDocs = checklist.filter((item) => item.verified || item.present).length;
  const requiredMissing = checklist.filter((item) => item.mandatory && !item.present).length;
  const gpaValue = firstNonEmpty(result.detected_gpa, answers.gpa);
  const gpaScale = firstNonEmpty(result.detected_gpa_scale, answers.gpaScale);
  const creditsValue = firstNonEmpty(result.detected_completed_credits, answers.completedCredits);
  const targetUniversity = firstNonEmpty(result.target_university, answers.targetUniversity);
  const targetProgram = firstNonEmpty(result.target_program, answers.targetProgram);
  const currentUniversity = firstNonEmpty(result.current_university, answers.currentUniversity);
  const currentProgram = firstNonEmpty(result.current_program, answers.currentProgram);
  const recognizedText = firstNonEmpty(result.likely_recognized_courses, courses.length ? `${counts.likely || 0}/${courses.length}` : '');
  const stats = [
    { icon: CalendarClock, label: 'ورودی پیشنهادی', value: localizeEntry(result.estimated_entry_level) },
    { icon: Percent, label: 'برآورد تطبیق', value: matchValue ? `${Math.round(matchValue)}٪` : '—' },
    { icon: Layers, label: 'واحد/درس خوانده‌شده', value: creditsValue || (courses.length ? `${courses.length} درس` : '—') },
    { icon: GraduationCap, label: 'معدل', value: gpaValue ? `${gpaValue}${gpaScale ? ` / ${gpaScale}` : ''}` : '—' },
  ];
  const missingDocuments = Array.isArray(result.missing_documents) ? result.missing_documents : [];
  const risks = Array.isArray(result.risk_factors) ? result.risk_factors : [];
  const guestDocument = result.guest_document || null;
  return (
    <motion.div className="account-transfer-result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="account-transfer-hero">
        <span className="account-transfer-hero-glow" aria-hidden="true" />
        <div className="account-transfer-hero-main">
          <span className="account-transfer-hero-kicker"><Sparkles size={13} /> Matching Engine · تحلیل هوشمند</span>
          <h3>{result.headline || 'تحلیل مقدماتی انتقالی'}</h3>
          <p>{result.overview || result.admission_reality_note || 'تطبیق دروس شما با برنامهٔ دانشگاه مقصد، بر پایهٔ ریزنمرات، واحدها و معدل.'}</p>
          {result.preliminary_transfer_fit && <span className="account-transfer-fit">{result.preliminary_transfer_fit}</span>}
        </div>
        <div className="account-transfer-hero-ring">
          <AiConfidenceRing value={matchValue} />
          <div><b>{localizeConfidence(result.ai_confidence)}</b><small>AI Confidence</small></div>
        </div>
      </div>

      <div className="account-transfer-command">
        <div>
          <small>STUDENT PATH</small>
          <b>{currentUniversity || 'دانشگاه فعلی ثبت نشده'}</b>
          <span>{currentProgram || 'رشته فعلی تکمیل نشده'}</span>
        </div>
        <span><ArrowLeft size={16} /></span>
        <div>
          <small>TARGET UNIVERSITY</small>
          <b>{targetUniversity || 'دانشگاه مقصد انتخاب نشده'}</b>
          <span>{targetProgram || 'رشته مقصد انتخاب نشده'}</span>
        </div>
        <strong className={result.is_live_preview ? 'is-live' : 'is-official'}>
          {result.is_live_preview ? 'Live preliminary preview' : 'Saved AI report'}
        </strong>
      </div>

      <div className="account-transfer-stats">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label}>
            <span><Icon size={15} /></span>
            <div><small>{label}</small><b dir="auto">{value}</b></div>
          </div>
        ))}
      </div>

      {(counts.likely || counts.review || counts.unlikely || recognizedText || requiredMissing) ? (
        <div className="account-transfer-legend">
          <span className="is-likely"><b>{counts.likely || 0}</b> محتمل</span>
          <span className="is-review"><b>{counts.review || 0}</b> نیازمند بررسی</span>
          <span className="is-unlikely"><b>{counts.unlikely || 0}</b> کم‌احتمال</span>
          <span><b>{recognizedText || '—'}</b> دروس محتمل</span>
          <span><b>{requiredMissing}</b> مدرک اجباری ناقص</span>
        </div>
      ) : null}

      {guestDocument?.uploaded_before_login && (
        <div className="account-transfer-guest-file">
          <Paperclip size={15} />
          <div>
            <b>حافظه فایل قبل از ورود وصل شد</b>
            <span>
              {guestDocument.name || 'ریز‌نمرات انتخاب‌شده قبل از ورود'} در نتیجه شما ذخیره شده است؛
              برای ادامه رسمی، همین فایل را در آپلود امن پنل دوباره انتخاب کنید تا به Storage حساب شما منتقل و OCR کامل‌تر اجرا شود.
            </span>
          </div>
          {guestDocument.size ? <strong>{formatSize(guestDocument.size)}</strong> : null}
        </div>
      )}

      {result.is_live_preview && (
        <div className="account-transfer-live-note">
          <Sparkles size={15} />
          <span>
            این عدد با مقصد فعلی و حافظه ریزنمرات شما به‌صورت زنده محاسبه شده است. برای گزارش رسمی‌تر و قابل ارسال، «تحلیل اولیه ریزنمرات» را اجرا کنید.
          </span>
        </div>
      )}

      {destinationFits.length > 0 && (
        <section className="account-result-section account-university-fit">
          <div className="account-result-section-title"><GraduationCap size={17} /><h4>دانشگاه‌های مقصد و شانس تطبیق</h4></div>
          <div className="account-university-grid">
            {destinationFits.map((item) => (
              <article key={item.id || item.university}>
                <div>
                  <b>{item.university}</b>
                  <small>{item.program || targetProgram || 'رشته مقصد'}{item.city ? ` · ${item.city}` : ''}</small>
                </div>
                <strong dir="ltr">{item.score}%</strong>
                <span><i style={{ width: `${item.score}%` }} /></span>
                <em>{item.recognized} درس · {item.entry}</em>
              </article>
            ))}
          </div>
        </section>
      )}

      {courses.length > 0 && (
        <section className="account-result-section">
          <div className="account-result-section-title"><ListChecks size={17} /><h4>تطبیق درس‌به‌درس</h4></div>
          <div className="account-equiv-list">
            {courses.map((course, index) => {
              const meta = TRANSFER_STATUS_META[course.tone] || TRANSFER_STATUS_META.review;
              return (
                <div className="account-equiv-row" key={`${course.name}-${index}`}>
                  <div className="account-equiv-pair">
                    <b>{course.name}{course.grade ? <em> · {course.grade}</em> : null}</b>
                    <span><BookOpen size={11} />{course.target || 'برنامهٔ مقصد'}</span>
                  </div>
                  <div className="account-equiv-bar"><span className={meta.cls} style={{ width: `${course.score ?? 0}%` }} /></div>
                  <span className={`account-equiv-score ${meta.cls}`} dir="ltr">{course.score == null ? '—' : `${course.score}%`}</span>
                  <span className={`account-equiv-badge ${meta.cls}`}>{meta.fa}</span>
                  {course.explanation && <small className="account-equiv-note">{course.explanation}</small>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {checklist.length > 0 && (
        <section className="account-result-section">
          <div className="account-result-section-title"><FileCheck2 size={17} /><h4>چک‌لیست مدارک انتقالی</h4><small>{verifiedDocs}/{checklist.length}</small></div>
          <div className="account-doc-checklist">
            {checklist.map((item) => {
              return (
                <span key={item.kind} className={item.verified ? 'is-ok' : item.present ? 'is-present' : item.mandatory ? 'is-missing' : 'is-pending'}>
                  {item.verified ? <CheckCircle2 size={13} /> : item.present ? <Clock3 size={13} /> : item.mandatory ? <AlertTriangle size={13} /> : <FileText size={13} />}
                  {item.label}
                  {item.mandatory && !item.present ? <em>اجباری</em> : null}
                </span>
              );
            })}
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

function TransferHistoryPanel({ assessments = [], activeId, onSelect }) {
  if (!Array.isArray(assessments) || assessments.length <= 1) return null;
  return (
    <section className="account-transfer-history">
      <div className="account-result-section-title">
        <Clock3 size={17} />
        <h4>تاریخچه ارزیابی های AI Transfer</h4>
        <small>{assessments.length} نسخه ذخیره شده</small>
      </div>
      <div className="account-transfer-history-list">
        {assessments.slice(0, 8).map((assessment, index) => {
          const result = assessment.ai_result || {};
          const score = result.estimated_transfer_match ?? result.analysis_summary?.estimated_transfer_match;
          const target = firstNonEmpty(assessment.target_program, result.target_program, result.guest_answers?.targetProgram);
          const university = firstNonEmpty(assessment.target_university, result.target_university, result.guest_answers?.targetUniversity);
          const sourceFile = result.guest_document?.name;
          const active = assessment.id === activeId;
          return (
            <article key={assessment.id} className={active ? 'is-active' : ''}>
              <div>
                <b>{index === 0 ? 'آخرین ارزیابی' : `ارزیابی قبلی ${index}`}</b>
                <small>{target || 'رشته مقصد نامشخص'}{university ? ` · ${university}` : ''}</small>
                {sourceFile && <em><Paperclip size={11} /> {sourceFile}</em>}
              </div>
              <strong dir="ltr">{score == null ? 'Draft' : `${Math.round(Number(score))}%`}</strong>
              <span>{formatDate(assessment.updated_at || assessment.created_at)}</span>
              <button type="button" disabled={active} onClick={() => onSelect(assessment.id)}>
                {active ? 'در حال نمایش' : 'نمایش این نسخه'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
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

function SmartApplyHistoryPanel({ sessions = [], activeId, onSelect }) {
  if (!Array.isArray(sessions) || sessions.length <= 1) return null;
  return (
    <section className="account-transfer-history account-session-history">
      <div className="account-result-section-title">
        <Clock3 size={17} />
        <h4>تاریخچه Smart Apply</h4>
        <small>{sessions.length} جلسه ذخیره شده</small>
      </div>
      <div className="account-transfer-history-list">
        {sessions.slice(0, 8).map((session, index) => {
          const active = session.id === activeId;
          const resultTitle = session.result?.profileTitle
            || session.result?.headline
            || session.result?.academicArchetype
            || session.goal
            || 'جلسه راهنمای پذیرش';
          return (
            <article key={session.id} className={active ? 'is-active' : ''}>
              <div>
                <b>{index === 0 ? 'آخرین جلسه' : `جلسه قبلی ${index}`}</b>
                <small>{resultTitle}</small>
                <em><Sparkles size={11} /> {session.status || 'in_progress'}</em>
              </div>
              <strong>{session.result ? 'Result' : 'Draft'}</strong>
              <span>{formatDate(session.updated_at || session.created_at)}</span>
              <button type="button" disabled={active} onClick={() => onSelect(session.id)}>
                {active ? 'در حال نمایش' : 'نمایش این جلسه'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SignedOut({ lang = 'fa' }) {
  const { openAuth, isConfigured } = useAuth();
  const fa = lang !== 'en';
  const returnTo = typeof window === 'undefined'
    ? '/account'
    : `${window.location.pathname}${window.location.search}`;
  const deepLink = readCatalogDeepLink();
  return (
    <main className="account-page account-central" dir={fa ? 'rtl' : 'ltr'}>
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
  const [deletingDocId, setDeletingDocId] = useState(null);
  const [selectionBusy, setSelectionBusy] = useState(false);
  const [submissionBusy, setSubmissionBusy] = useState(false);
  const [helpBusy, setHelpBusy] = useState(false);
  // Account-level appearance + language, persisted per browser. `t(fa, en)` keeps
  // strings bilingual inline so the panel can switch FA/EN without a key registry.
  const [theme, setTheme] = useState(() => {
    if (typeof localStorage === 'undefined') return 'light';
    return localStorage.getItem('acca-account-theme') === 'dark' ? 'dark' : 'light';
  });
  const [lang, setLang] = useState(() => {
    if (typeof localStorage === 'undefined') return 'fa';
    return readStoredLang({ fallback: 'fa', allowed: ['fa', 'en'] });
  });
  const fa = lang === 'fa';
  const t = useCallback((faText, enText) => (lang === 'en' ? enText : faText), [lang]);
  const handleLangChange = useCallback((nextLang) => {
    const normalized = nextLang === 'en' ? 'en' : 'fa';
    setLang(normalized);
    writeStoredLang(normalized, { allowed: ['fa', 'en'] });
  }, []);
  useEffect(() => { try { localStorage.setItem('acca-account-theme', theme); } catch { /* ignore */ } }, [theme]);
  useEffect(() => subscribeStoredLang((nextLang) => {
    const normalized = nextLang === 'en' ? 'en' : 'fa';
    setLang((current) => (current === normalized ? current : normalized));
  }, { allowed: ['fa', 'en'] }), []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = fa ? 'rtl' : 'ltr';
    document.title = t('ACCA Central Account | پنل مرکزی آکا', 'ACCA Central Account | Student panel');
  }, [fa, lang, t]);
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
  const [selectedTransferId, setSelectedTransferId] = useState(null);
  const [selectedSmartSessionId, setSelectedSmartSessionId] = useState(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      // Bring the free AI Transfer eligibility result into the central account
      // before rendering the dashboard, so OCR-read courses and grades from the
      // landing flow are visible even before the secure upload is reprocessed.
      await migrateGuestTransferDraft(user).catch(() => null);
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

  const activeSmartSessionId = selectedSmartSessionId && data.smartApply.some((item) => item.id === selectedSmartSessionId)
    ? selectedSmartSessionId
    : data.smartApply[0]?.id || null;
  const activeTransferId = selectedTransferId && data.transfer.some((item) => item.id === selectedTransferId)
    ? selectedTransferId
    : data.transfer[0]?.id || null;
  const smartSession = data.smartApply.find((item) => item.id === activeSmartSessionId) || null;
  const transferAssessment = data.transfer.find((item) => item.id === activeTransferId) || null;
  const smartSelection = data.selections.find((item) => item.product === 'smart_apply') || null;
  const transferSelection = data.selections.find((item) => item.product === 'ai_transfer') || null;
  const smartSubmission = data.submissions.find((item) => item.product === 'smart_apply') || null;
  const transferSubmission = data.submissions.find((item) => item.product === 'ai_transfer') || null;
  const smartDocuments = data.documents.filter((item) => item.product === 'smart_apply');
  const transferDocuments = data.documents.filter((item) => item.product === 'ai_transfer');
  const legacyAcceptanceDoc = data.documents.find((doc) => doc.document_kind === 'acceptance_letter' && !doc.product) || null;
  const smartAcceptanceDoc = smartDocuments.find((doc) => doc.document_kind === 'acceptance_letter') || legacyAcceptanceDoc;
  const transferAcceptanceDoc = transferDocuments.find((doc) => doc.document_kind === 'acceptance_letter') || legacyAcceptanceDoc;
  // Student-uploaded only (admin/company docs are surfaced in After Application).
  const smartStudentDocs = smartDocuments.filter((doc) => !COMPANY_DOC_KINDS.has(doc.document_kind));
  const transferStudentDocs = transferDocuments.filter((doc) => !COMPANY_DOC_KINDS.has(doc.document_kind));
  const buildCompanyDocs = (productDocs) => [
    ...productDocs
      .filter((doc) => COMPANY_DOC_KINDS.has(doc.document_kind) && doc.document_kind !== 'acceptance_letter')
      .map((doc) => ({
        id: doc.id, title: doc.original_name, label: documentKindLabel(doc.document_kind),
        object_path: doc.object_path, bucket_id: doc.bucket_id, created_at: doc.created_at,
      })),
    ...(data.letters || []).map((letter) => ({
      id: letter.id, title: letter.title || letter.original_name, label: LETTER_TYPE_LABEL[letter.letter_type] || 'نامه رسمی',
      object_path: letter.object_path, bucket_id: letter.bucket_id, created_at: letter.created_at,
    })),
  ];
  const smartCompanyDocs = buildCompanyDocs(smartDocuments);
  const transferCompanyDocs = buildCompanyDocs(transferDocuments);
  const transferTranscript = transferDocuments.find((item) => item.document_kind === 'transcript');
  const transferGuestMemory = transferAssessment?.ai_result?.guest_document
    || (Array.isArray(transferAssessment?.ai_result?.guest_courses) && transferAssessment.ai_result.guest_courses.length
      ? { name: 'Guest OCR course memory', uploaded_before_login: true }
      : null);
  const transferOcrDecision = getDocumentOcrDecision(transferTranscript);
  const transferDashboardResult = useMemo(() => buildLiveTransferResult({
    assessment: transferAssessment,
    selection: transferSelection,
    transcript: transferTranscript,
    documents: transferDocuments,
  }), [transferAssessment, transferSelection, transferTranscript, transferDocuments]);
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
    : !transferTranscript && !transferGuestMemory
      ? 1
    : transferTranscript && !transferOcrDecision.canContinue
      ? 2
    : !transferSelection || !transferDashboardResult
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
    const resultScore = (smartSession?.result ? 10 : 0) + (transferDashboardResult ? 10 : 0);
    return Math.min(100, smartScore + deepFitScore + transferScore + documentScore + selectionScore + resultScore);
  }, [smartSession, smartSelection, transferAssessment, transferSelection, transferDashboardResult, data.deepFit, data.documents.length]);

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

  const requestRegistrationHelp = async (product = 'smart_apply') => {
    setHelpBusy(true);
    setError('');
    try {
      // Reuses the existing submit-application to company Telegram path with a
      // dedicated intent so the team is notified the student wants in-person help.
      await requestApplicationSubmission({
        product,
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
      const primaryTransferTarget = normalizeTargetItems(transferSelection)[0];
      const assessment = transferAssessment || await createTransferAssessment(user, {
        targetCountry: primaryTransferTarget?.country || transferSelection?.country,
        targetUniversity: primaryTransferTarget?.university || transferSelection?.university_name,
        targetProgram: primaryTransferTarget?.program || transferSelection?.program_name,
        targetProgramId: primaryTransferTarget?.id || transferSelection?.catalog_program_id,
        targetProgramSnapshot: primaryTransferTarget?.raw || transferSelection?.catalog_snapshot,
      });
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

  const deleteDocument = async (document) => {
    if (!document?.id) return;
    if (typeof window !== 'undefined' && !window.confirm('این مدرک حذف شود؟ این کار قابل بازگشت نیست.')) return;
    setDeletingDocId(document.id);
    setError('');
    try {
      await deleteStudentDocument(document);
      await refresh();
    } catch (err) {
      setError(err?.message || 'حذف مدرک انجام نشد.');
    } finally {
      setDeletingDocId(null);
    }
  };

  if (authLoading) return <main className="account-page account-loading" dir={fa ? 'rtl' : 'ltr'}><LoaderCircle className="account-spin" /></main>;
  if (!user) return <SignedOut lang={lang} />;

  const accountName = data.profile?.full_name || user.user_metadata?.full_name || 'دانشجوی ACCA';
  const accountAvatar = data.profile?.avatar_url || user.user_metadata?.avatar_url || '';
  const accountInitial = (accountName || user.email || '?').trim().charAt(0).toUpperCase();

  return (
    <main className="account-page account-central" data-theme={theme} dir={fa ? 'rtl' : 'ltr'}>
      <div className="account-ambient" aria-hidden="true">
        {theme === 'dark' && <ParticleField theme="dark" className="account-star-field" />}
      </div>
      <header className="account-header">
        <a href="/" className="account-brand"><LayoutGrid size={17} /> ACCA AI Services</a>
        <div className="account-header-meta">
          <span className="account-header-greeting">{t('سلام،', 'Hi,')} <b>{(accountName || '').split(' ')[0]}</b></span>
          <span className="account-header-dot" aria-hidden="true" />
          <span className="account-header-chip"><ShieldCheck size={12} /> {t('حساب فعال', 'Active account')}</span>
          <span className="account-header-dot" aria-hidden="true" />
          <span className="account-header-chip">{usedProducts}/2 {t('سرویس', 'services')} · {completion}%</span>
        </div>
        <div className="account-header-actions">
          <div className="account-seg" role="group" aria-label="Language">
            <button type="button" className={fa ? 'is-active' : ''} onClick={() => handleLangChange('fa')}>فا</button>
            <button type="button" className={!fa ? 'is-active' : ''} onClick={() => handleLangChange('en')}>EN</button>
          </div>
          <button
            type="button"
            className="account-icon-btn"
            onClick={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
            aria-label={theme === 'dark' ? t('حالت روشن', 'Light mode') : t('حالت تاریک', 'Dark mode')}
            title={theme === 'dark' ? t('حالت روشن', 'Light mode') : t('حالت تاریک', 'Dark mode')}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <a href="/"><ArrowLeft size={15} /> {t('خدمات', 'Services')}</a>
          <button type="button" onClick={signOut}><LogOut size={15} /> {t('خروج', 'Sign out')}</button>
        </div>
      </header>

      <div className="account-shell">
        <section className="account-hero">
          <div>
            <span className="account-kicker">ACCA Central Account</span>
            <h1>{t('پنل مرکزی شما', 'Your central panel')}</h1>
            <p>{t('تمام فعالیت‌های پذیرش و انتقال دانشگاهی شما، بدون ساخت حساب یا داشبورد جداگانه.', 'All your admission and university-transfer activity in one place — no separate account or dashboard.')}</p>
          </div>
          <div className="account-identity">
            <span className="account-identity-avatar">
              {accountAvatar ? <img src={accountAvatar} alt="" /> : <b>{accountInitial}</b>}
            </span>
            <div><small>{t('حساب فعال', 'Active account')} · {accountName}</small><b dir="ltr">{user.email}</b></div>
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
              <button type="button" onClick={refresh} aria-label={t('به‌روزرسانی', 'Refresh')}><RefreshCw size={15} /></button>
            </div>
            <strong>{completion}%</strong>
            <h3>{t('آمادگی حساب', 'Account readiness')}</h3>
            <div className="account-progress"><span style={{ width: `${completion}%` }} /></div>
            <p>{t('اطلاعات هر دو سرویس در همین شاخص جمع‌بندی می‌شود.', 'Both services roll up into this single readiness score.')}</p>
          </article>
          <article className="account-card">
            <div className="account-card-head"><span><Compass size={19} /></span><b>{usedProducts}/2</b></div>
            <h3>{t('سرویس‌های فعال', 'Active services')}</h3>
            <p>{usedProducts ? t('سوابق سرویس‌های استفاده‌شده در پایین همین صفحه دیده می‌شود.', 'Your used services appear lower on this page.') : t('هنوز فعالیتی از محصولات ACCA ذخیره نشده است.', 'No ACCA product activity saved yet.')}</p>
          </article>
          <article className="account-card">
            <div className="account-card-head"><span><FileText size={19} /></span><b>{data.documents.length}</b></div>
            <h3>{t('مدارک خصوصی', 'Private documents')}</h3>
            <p>{t('فایل‌ها با تفکیک کاربرد در همان حساب مرکزی نگهداری می‌شوند.', 'Files are kept in your central account, organized by purpose.')}</p>
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
              <p>{t('پروفایل تحصیلی، نتیجه کشف رشته، مسیر پذیرش و مدارک مرتبط.', 'Academic profile, major-discovery result, admission path and related documents.')}</p>
            </div>
            <div className="account-product-actions">
              <StatusPill status={smartSession?.status || 'draft'} />
              <a href="/smart-apply">{t('ادامه Smart Apply', 'Continue Smart Apply')}</a>
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

          <SmartApplyHistoryPanel
            sessions={data.smartApply}
            activeId={smartSession?.id}
            onSelect={setSelectedSmartSessionId}
          />

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
          <DocumentUploader product="smart_apply" user={user} onUploaded={refresh} />
          <DocumentList
            documents={smartStudentDocs}
            lang={lang}
            busyId={documentBusyId}
            onConfirm={(document) => updateDocumentReview(document, 'confirm')}
            onReview={(document) => updateDocumentReview(document, 'review')}
            onRetry={(document) => updateDocumentReview(document, 'retry')}
            deletingId={deletingDocId}
            onDelete={deleteDocument}
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
          {(smartSubmission || smartAcceptanceDoc || smartCompanyDocs.length > 0) && (
            <AcceptanceJourneyPanel
              submission={smartSubmission}
              acceptanceDoc={smartAcceptanceDoc}
              lang={lang}
              theme={theme}
              companyDocs={smartCompanyDocs}
              onRequestRegistrationHelp={() => requestRegistrationHelp('smart_apply')}
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
              <p>{t('ارزیابی انتقالی، ریزنمرات، تحلیل اولیه و مسیر بررسی انسانی.', 'Transfer assessment, transcripts, preliminary analysis and the human-review path.')}</p>
            </div>
            <div className="account-product-actions">
              <StatusPill status={transferAssessment?.status || 'draft'} />
              <a href="/ai-transfer">{t('ادامه AI Transfer', 'Continue AI Transfer')}</a>
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

          <TransferHistoryPanel
            assessments={data.transfer}
            activeId={transferAssessment?.id}
            onSelect={setSelectedTransferId}
          />

          <SelectedProgramCard
            selection={transferSelection}
            product="ai_transfer"
            onChange={() => setCatalogPicker({ product: 'ai_transfer', initialSelection: getSelectionItems(transferSelection) })}
          />
          <TransferAnalysisPanel result={transferDashboardResult} documents={transferDocuments} />
          <div className="account-transfer-tools">
            <DocumentUploader
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
          {transferDashboardResult?.is_live_preview && transferAssessment?.ai_result && (
            <p className="account-tool-note is-ready">
              مقصد جدید تشخیص داده شد و پیش‌نمایش زنده به‌روزرسانی شده است؛ برای ثبت گزارش رسمی همین مقصد، تحلیل را دوباره اجرا کنید.
            </p>
          )}
          <DocumentList
            documents={transferStudentDocs}
            lang={lang}
            busyId={documentBusyId}
            onConfirm={(document) => updateDocumentReview(document, 'confirm')}
            onReview={(document) => updateDocumentReview(document, 'review')}
            onRetry={(document) => updateDocumentReview(document, 'retry')}
            deletingId={deletingDocId}
            onDelete={deleteDocument}
          />
          <ApplicationReadinessPanel
            product="ai_transfer"
            documents={transferDocuments}
            selection={transferSelection}
            hasGuidance={Boolean(transferDashboardResult)}
            submission={transferSubmission}
            busy={submissionBusy}
            onSubmit={submitTransferApplication}
          />
          {(transferSubmission || transferAcceptanceDoc || transferCompanyDocs.length > 0) && (
            <AcceptanceJourneyPanel
              submission={transferSubmission}
              acceptanceDoc={transferAcceptanceDoc}
              lang={lang}
              theme={theme}
              companyDocs={transferCompanyDocs}
              onRequestRegistrationHelp={() => requestRegistrationHelp('ai_transfer')}
              helpBusy={helpBusy}
            />
          )}
        </section>
        )}

        {loading && <div className="account-loading-line"><LoaderCircle className="account-spin" size={18} /> {t('در حال همگام‌سازی حساب...', 'Syncing your account…')}</div>}

        <footer className="account-footer-note">
          <Clock3 size={16} />
          {t('نتایج AI راهنمای اولیه آموزشی هستند و تضمین پذیرش یا معادل‌سازی واحد محسوب نمی‌شوند.', 'AI results are preliminary educational guidance — not a guarantee of admission or course equivalency.')}
        </footer>
      </div>

      <ProgramCatalogPicker
        open={Boolean(catalogPicker)}
        product={catalogPicker?.product || 'smart_apply'}
        initialProgramId={catalogPicker?.initialProgramId}
        initialUniversity={catalogPicker?.initialUniversity}
        initialSelection={catalogPicker?.initialSelection || []}
        saving={selectionBusy}
        lang={lang}
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
        <span className="account-kicker">Educational Fit Profile</span>
        <h3>
          {completed
            ? localizedFa(result.signature?.label) || 'پروفایل کامل جهت‌گیری تحصیلی شما'
            : profile
              ? 'تحلیل عمیق شما در حال تکمیل است'
              : 'از نتیجه اولیه به یک مسیر دقیق‌تر برسید'}
        </h3>
        <p>
          {completed
            ? 'پاسخ‌ها از نظر علایق تحصیلی، ترجیح یادگیری، محیط مطلوب، انگیزه، توان تحصیلی و واقعیت مسیر کنار هم تحلیل شده‌اند.'
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
