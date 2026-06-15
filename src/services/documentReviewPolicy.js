export const OCR_CONTINUE_THRESHOLD = 50;

export function getDocumentOcrDecision(document) {
  const extraction = document?.ai_extraction || null;
  const rawConfidence = document?.ocr_confidence ?? extraction?.overall_confidence;
  const confidence = Number(rawConfidence);
  const hasConfidence = Number.isFinite(confidence);
  const matchesExpectedType = extraction?.matches_expected_type !== false;
  const qualityStatus = extraction?.quality?.status || document?.quality_report?.status || null;
  const hasExtraction = Boolean(extraction);
  const passesConfidence = hasConfidence && confidence > OCR_CONTINUE_THRESHOLD;
  const qualityBlocksProgress = qualityStatus === 'poor';
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
