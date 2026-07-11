// Deliberately exclude Persian/Arabic digits. An English OCR sentence may
// contain dates or grades such as ۱۳۹۸/۰۵/۰۵ and is still not Persian copy.
const PERSIAN_LETTERS = /[\u0621-\u063a\u0641-\u064a\u066e-\u06d3\u06fa-\u06ff]/;

const DOCUMENT_TYPE_FA = {
  passport: 'گذرنامه',
  transcript: 'ریزنمرات',
  diploma: 'مدرک تحصیلی',
  language_certificate: 'مدرک زبان',
  student_certificate: 'گواهی اشتغال یا وضعیت تحصیلی',
  syllabus: 'سرفصل دروس',
  acceptance_letter: 'نامه پذیرش دانشگاه',
  photo: 'عکس پرسنلی',
  other: 'مدرک دیگر',
  unreadable: 'فایل ناخوانا',
};

function valueOf(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function isPersian(value) {
  return PERSIAN_LETTERS.test(valueOf(value));
}

function extractionOf(document) {
  return document?.confirmed_extraction || document?.ai_extraction || document?.ocrResult || null;
}

function qualityOf(document, extraction) {
  return extraction?.quality || document?.quality_report || {};
}

function expectedTypeLabel(kind) {
  return DOCUMENT_TYPE_FA[kind] || 'مدرک انتخاب‌شده';
}

function buildPersianSummary(document, extraction) {
  if (!extraction) return '';
  const fields = extraction.fields || {};
  const type = extraction.detected_document_type || 'other';
  const typeLabel = DOCUMENT_TYPE_FA[type] || DOCUMENT_TYPE_FA.other;
  const student = valueOf(fields.student_name);
  const institution = valueOf(fields.institution);
  const program = valueOf(fields.program);
  const documentNumber = valueOf(fields.document_number);
  const issueDate = valueOf(fields.issue_date || fields.graduation_date);
  const gpa = valueOf(fields.gpa);
  const gpaScale = valueOf(fields.gpa_scale);
  const credits = valueOf(fields.total_credits);
  const parts = [];

  if (type === 'unreadable') {
    parts.push('محتوای این فایل با اطمینان کافی خوانده نشد.');
  } else if (type === 'passport') {
    parts.push(`این فایل به‌عنوان گذرنامه${student ? ` متعلق به ${student}` : ''} شناسایی شد.`);
  } else if (type === 'transcript') {
    parts.push(`این فایل به‌عنوان ریزنمرات${institution ? ` دانشگاه ${institution}` : ''}${student ? ` برای ${student}` : ''} شناسایی شد.`);
  } else if (type === 'student_certificate') {
    parts.push(`این فایل به‌عنوان گواهی وضعیت تحصیلی${institution ? ` صادرشده از ${institution}` : ''}${student ? ` برای ${student}` : ''} شناسایی شد.`);
  } else if (type === 'acceptance_letter') {
    parts.push(`این فایل به‌عنوان نامه پذیرش${institution ? ` دانشگاه ${institution}` : ''}${student ? ` برای ${student}` : ''} شناسایی شد.`);
  } else {
    parts.push(`این فایل به‌عنوان ${typeLabel}${institution ? ` مربوط به ${institution}` : ''}${student ? ` برای ${student}` : ''} شناسایی شد.`);
  }

  const facts = [];
  if (program) facts.push(`رشته یا برنامه ${program}`);
  if (documentNumber) facts.push(`شماره مدرک ${documentNumber}`);
  if (gpa) facts.push(`معدل ${gpa}${gpaScale ? ` از ${gpaScale}` : ''}`);
  if (credits) facts.push(`مجموع واحدهای ثبت‌شده ${credits}`);
  if (issueDate) facts.push(`تاریخ صدور ${issueDate}`);
  if (facts.length) parts.push(`${facts.join('، ')} از روی مدرک استخراج شده است.`);

  if (document?.document_kind === 'acceptance_letter' && type !== 'acceptance_letter') {
    parts.push('این فایل نامه پذیرش نیست و نباید به‌عنوان پذیرش دانشگاهی تأیید شود.');
  } else if (extraction.matches_expected_type === false) {
    parts.push(`محتوای فایل با نوع انتخاب‌شده «${expectedTypeLabel(document?.document_kind)}» مطابقت ندارد.`);
  }

  if (extraction.requires_student_confirmation !== false) {
    parts.push('لطفاً اطلاعات نمایش‌داده‌شده را با اصل مدرک تطبیق دهید.');
  }
  return parts.join(' ');
}

function buildPersianAction(document, extraction) {
  const quality = qualityOf(document, extraction);
  const issueText = Array.isArray(quality.issues) ? quality.issues.join(' ').toLowerCase() : '';

  if (extraction?.matches_expected_type === false) {
    return `نوع محتوای فایل با «${expectedTypeLabel(document?.document_kind)}» مطابقت ندارد؛ لطفاً نوع مدرک یا فایل درست را بررسی کنید.`;
  }
  if (/overexpos|washed|too bright|exposure/.test(issueText)) {
    return 'تصویر کمی بیش از حد روشن است، اما بخش عمده اطلاعات خواناست. لطفاً مشخصات هویتی و تحصیلی نمایش‌داده‌شده را با اصل مدرک تطبیق دهید.';
  }
  if (/blur|focus|low resolution|pixel/.test(issueText)) {
    return 'بخشی از تصویر تار یا کم‌وضوح است. لطفاً اطلاعات استخراج‌شده را بررسی کنید و در صورت وجود خطا، نسخه واضح‌تری بارگذاری کنید.';
  }
  if (/crop|cut off|missing page|incomplete/.test(issueText)) {
    return 'بخشی از مدرک یا یکی از صفحه‌ها کامل دیده نمی‌شود. لطفاً فایل کامل را بررسی یا دوباره بارگذاری کنید.';
  }
  if (/glare|shadow|reflection/.test(issueText)) {
    return 'بازتاب نور یا سایه روی بخشی از مدرک دیده می‌شود. لطفاً اطلاعات قابل مشاهده را با اصل فایل تطبیق دهید.';
  }
  if (quality.status === 'poor') {
    return 'کیفیت فایل برای تأیید خودکار کافی نیست. لطفاً نسخه‌ای واضح‌تر، کامل‌تر و بدون برش بارگذاری کنید.';
  }
  return 'لطفاً مشخصات هویتی و تحصیلی قابل مشاهده را با اصل مدرک تطبیق و تأیید کنید.';
}

export function getLocalizedOcrSummary(document, lang = 'fa') {
  const extraction = extractionOf(document);
  if (!extraction) return '';
  if (lang === 'en') {
    return valueOf(extraction.summary_en) || valueOf(extraction.summary) || '';
  }
  const localized = valueOf(extraction.summary_fa);
  if (isPersian(localized)) return localized;
  if (isPersian(extraction.summary)) return valueOf(extraction.summary);
  return buildPersianSummary(document, extraction);
}

export function getLocalizedOcrAction(document, lang = 'fa') {
  const extraction = extractionOf(document);
  if (!extraction) return '';
  const quality = qualityOf(document, extraction);
  if (lang === 'en') {
    return valueOf(quality.student_action_en) || valueOf(quality.student_action) || '';
  }
  const localized = valueOf(quality.student_action_fa);
  if (isPersian(localized)) return localized;
  if (isPersian(quality.student_action)) return valueOf(quality.student_action);
  return buildPersianAction(document, extraction);
}
