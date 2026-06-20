import { getDocumentOcrDecision } from '../services/documentReviewPolicy';

export const APPLICATION_DOCUMENT_REQUIREMENTS = {
  smart_apply: {
    required: [
      {
        kind: 'passport',
        label: 'پاسپورت',
        description: 'صفحه مشخصات پاسپورت معتبر',
      },
      {
        kind: 'transcript',
        label: 'ریزنمرات',
        description: 'آخرین ریزنمرات رسمی و خوانا',
      },
      {
        kind: 'diploma',
        label: 'مدرک تحصیلی',
        description: 'دیپلم مدرسه یا مدرک مقطع قبلی، متناسب با مقطع مقصد',
      },
      {
        kind: 'photo',
        label: 'عکس پرسنلی',
        description: 'عکس جدید با پس‌زمینه ساده',
      },
    ],
    optional: [
      {
        kind: 'language_certificate',
        label: 'مدرک زبان',
        description: 'برای شروع اپلای ترکیه و قبرس شمالی الزامی نیست',
      },
      {
        kind: 'award_certificate',
        label: 'لوح تقدیر و افتخارات',
        description: 'برای تقویت پرونده، در صورت مرتبط بودن',
      },
      {
        kind: 'other_certificate',
        label: 'گواهی دوره و سرتیفیکیت',
        description: 'اختیاری و فقط در صورت ارتباط با رشته',
      },
      {
        kind: 'acceptance_letter',
        label: 'نامه پذیرش',
        description: 'فایل رسمی پذیرش دانشگاه که توسط تیم ACCA بارگذاری شده است',
      },
      {
        kind: 'document_request',
        label: 'درخواست تکمیل مدارک',
        description: 'فایل یا نامه مربوط به نقص مدارک پرونده',
      },
      {
        kind: 'status_update_attachment',
        label: 'پیوست وضعیت پرونده',
        description: 'فایل تکمیلی ارسال‌شده توسط تیم ACCA',
      },
      {
        kind: 'rejection_notice',
        label: 'نامه نتیجه منفی',
        description: 'نامه یا فایل مربوط به نتیجه منفی بررسی پرونده',
      },
    ],
  },
  ai_transfer: {
    required: [
      {
        kind: 'passport',
        label: 'پاسپورت',
        description: 'صفحه مشخصات پاسپورت معتبر',
      },
      {
        kind: 'transcript',
        label: 'ریزنمرات دانشگاهی',
        description: 'ریز کامل دروس، نمرات و واحدها',
      },
    ],
    optional: [
      {
        kind: 'student_certificate',
        label: 'گواهی اشتغال به تحصیل',
        description: 'در صورت درخواست دانشگاه مقصد',
      },
      {
        kind: 'syllabus',
        label: 'سرفصل دروس',
        description: 'برای تطبیق دقیق‌تر واحدها بسیار مفید است',
      },
      {
        kind: 'language_certificate',
        label: 'مدرک زبان',
        description: 'برای ارزیابی اولیه انتقالی الزامی نیست',
      },
      {
        kind: 'other_certificate',
        label: 'مدارک تکمیلی',
        description: 'گواهی‌ها و مستندات مرتبط با پرونده',
      },
      {
        kind: 'acceptance_letter',
        label: 'نامه پذیرش',
        description: 'فایل رسمی پذیرش دانشگاه که توسط تیم ACCA بارگذاری شده است',
      },
      {
        kind: 'document_request',
        label: 'درخواست تکمیل مدارک',
        description: 'فایل یا نامه مربوط به نقص مدارک پرونده',
      },
      {
        kind: 'status_update_attachment',
        label: 'پیوست وضعیت پرونده',
        description: 'فایل تکمیلی ارسال‌شده توسط تیم ACCA',
      },
      {
        kind: 'rejection_notice',
        label: 'نامه نتیجه منفی',
        description: 'نامه یا فایل مربوط به نتیجه منفی بررسی پرونده',
      },
    ],
  },
};

// Extra student-uploadable categories (not tied to the readiness checklist).
export const EXTRA_DOCUMENT_KIND_LABELS = {
  identity_document: 'مدارک هویتی',
  national_id: 'کارت ملی',
  birth_certificate: 'شناسنامه',
  bank_statement: 'تمکن مالی / گردش حساب',
  motivation_letter: 'انگیزه‌نامه',
  recommendation_letter: 'توصیه‌نامه',
  cv: 'رزومه (CV)',
  medical_certificate: 'گواهی سلامت / واکسن',
};

export function documentKindLabel(kind) {
  const all = Object.values(APPLICATION_DOCUMENT_REQUIREMENTS)
    .flatMap((group) => [...group.required, ...group.optional]);
  return all.find((item) => item.kind === kind)?.label || EXTRA_DOCUMENT_KIND_LABELS[kind] || kind;
}

function bestDocumentForKind(documents, kind) {
  const matching = documents.filter((document) => document.document_kind === kind);
  return matching.find((document) => getDocumentOcrDecision(document).canContinue)
    || matching[0]
    || null;
}

export function buildApplicationReadiness(product, documents = [], hasSelection = false) {
  const requirements = APPLICATION_DOCUMENT_REQUIREMENTS[product]
    || APPLICATION_DOCUMENT_REQUIREMENTS.smart_apply;
  const mapRequirement = (requirement) => {
    const document = bestDocumentForKind(documents, requirement.kind);
    const decision = getDocumentOcrDecision(document);
    return {
      ...requirement,
      document,
      decision,
      ready: Boolean(document && decision.canContinue),
      confirmed: document?.review_status === 'confirmed' || document?.review_status === 'reviewed',
    };
  };

  const required = requirements.required.map(mapRequirement);
  const optional = requirements.optional.map(mapRequirement);
  const readyRequired = required.filter((item) => item.ready).length;
  const totalChecks = required.length + 1;
  const passedChecks = readyRequired + Number(Boolean(hasSelection));

  return {
    required,
    optional,
    readyRequired,
    totalRequired: required.length,
    missingRequired: required.filter((item) => !item.ready),
    hasSelection: Boolean(hasSelection),
    canSubmit: Boolean(hasSelection) && readyRequired === required.length,
    progress: Math.round((passedChecks / totalChecks) * 100),
  };
}
