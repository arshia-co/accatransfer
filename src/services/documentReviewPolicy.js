export const OCR_CONTINUE_THRESHOLD = 50;

// Document kinds the OCR pipeline can actually detect & field-extract. Other
// (supporting / identity) kinds — national ID, birth certificate, bank
// statement, CV, motivation/recommendation letters, awards, etc. — are NOT
// type-validated by OCR, so they must not be blocked by a type mismatch or a low
// extraction confidence. They are ready as soon as they upload + pass scanning.
const OCR_TYPE_VALIDATED_KINDS = new Set([
  'passport', 'transcript', 'diploma', 'language_certificate',
  'student_certificate', 'syllabus', 'acceptance_letter', 'photo',
]);

export function getDocumentOcrDecision(document) {
  const extraction = document?.ai_extraction || null;
  const rawConfidence = document?.ocr_confidence ?? extraction?.overall_confidence;
  const confidence = Number(rawConfidence);
  const hasConfidence = Number.isFinite(confidence);
  const qualityStatus = extraction?.quality?.status || document?.quality_report?.status || null;
  const hasExtraction = Boolean(extraction);
  const qualityBlocksProgress = qualityStatus === 'poor';

  // Supporting documents are accepted on upload — no OCR type/confidence gate.
  if (document?.document_kind && !OCR_TYPE_VALIDATED_KINDS.has(document.document_kind)) {
    return {
      confidence: hasConfidence ? confidence : null,
      hasExtraction,
      passesConfidence: true,
      matchesExpectedType: true,
      qualityStatus,
      canContinue: true,
      reason: '',
      humanReviewRecommended: Boolean(document?.review_status === 'admin_review' || qualityBlocksProgress),
    };
  }

  const matchesExpectedType = extraction?.matches_expected_type !== false;
  const passesConfidence = hasConfidence && confidence > OCR_CONTINUE_THRESHOLD;
  const canContinue = hasExtraction
    && passesConfidence
    && matchesExpectedType
    && !qualityBlocksProgress;

  let reason = '';
  if (!hasExtraction) reason = 'OCR هنوز کامل نشده است.';
  else if (!hasConfidence || !passesConfidence) reason = 'اطمینان OCR باید بیشتر از ۵۰٪ باشد.';
  else if (!matchesExpectedType) reason = 'نوع فایل با مدرک انتخاب‌شده مطابقت ندارد.';
  else if (qualityBlocksProgress) reason = 'کیفیت فایل برای ادامه خودکار کافی نیست.';

  return {
    confidence: hasConfidence ? confidence : null,
    hasExtraction,
    passesConfidence,
    matchesExpectedType,
    qualityStatus,
    canContinue,
    reason,
    humanReviewRecommended: Boolean(
      extraction?.requires_human_review
      || document?.review_status === 'admin_review'
      || (hasConfidence && confidence < 75),
    ),
  };
}
