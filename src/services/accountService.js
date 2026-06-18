import { supabase } from '../lib/supabaseClient';
import { inspectDocumentQuality } from './documentQualityService';

const DOCUMENT_BUCKET = 'student-documents';
const GUEST_TRANSFER_KEY = 'acca-transfer-guest-assessment';
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

function safeFilename(name) {
  const extension = name.includes('.') ? `.${name.split('.').pop().toLowerCase()}` : '';
  const base = name
    .replace(/\.[^.]+$/, '')
    .normalize('NFKD')
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'document';
  return `${base}${extension}`;
}

export function validateDocument(file) {
  if (!file) throw new Error('Choose a file first.');
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('Only PDF, JPG and PNG files are accepted.');
  if (file.size > MAX_FILE_SIZE) throw new Error('The maximum file size is 15 MB.');
}

export async function upsertProfile(user, product, fields = {}) {
  const client = requireClient();
  const fullName = fields.fullName ?? user?.user_metadata?.full_name ?? user?.user_metadata?.name;
  const payload = {
    id: user.id,
    current_product: product,
    language: fields.language || user?.user_metadata?.language || 'fa',
    updated_at: new Date().toISOString(),
  };
  if (typeof fullName === 'string' && fullName.trim()) {
    payload.full_name = fullName.trim();
  }
  if (typeof fields.avatarUrl === 'string' && fields.avatarUrl.trim()) {
    payload.avatar_url = fields.avatarUrl.trim();
  }
  if (typeof fields.phoneCountryCode === 'string') {
    payload.phone_country_code = fields.phoneCountryCode.trim() || null;
  }
  if (typeof fields.phoneNumber === 'string') {
    const phoneNumber = fields.phoneNumber.trim();
    payload.phone_number = phoneNumber || null;
    payload.phone_e164 = phoneNumber && payload.phone_country_code
      ? `${payload.phone_country_code}${phoneNumber.replace(/\D/g, '')}`
      : null;
  }

  const { error } = await client.from('profiles').upsert(payload);
  if (error) throw error;
}

const AVATAR_BUCKET = 'avatars';

/** Update the student's own profile details. */
export async function updateProfileDetails(user, { fullName, phoneCountryCode, phoneNumber }) {
  const client = requireClient();
  if (!user?.id) throw new Error('برای ویرایش پروفایل وارد حساب شوید.');
  const normalizedPhone = (phoneNumber || '').trim();
  const normalizedCountryCode = (phoneCountryCode || '').trim();
  const payload = {
    id: user.id,
    full_name: (fullName || '').trim() || null,
    phone_country_code: normalizedPhone ? normalizedCountryCode || null : null,
    phone_number: normalizedPhone || null,
    phone_e164: normalizedPhone && normalizedCountryCode
      ? `${normalizedCountryCode}${normalizedPhone.replace(/\D/g, '')}`
      : null,
    updated_at: new Date().toISOString(),
  };
  // Upsert (not update) so the save persists even if the profile row doesn't
  // exist yet — an .update() on a missing row silently writes nothing.
  const { data, error } = await client
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Set or change the account password (lets the student log in with email + password). */
export async function updateAccountPassword({ email, currentPassword, nextPassword }) {
  const client = requireClient();
  if (!email) throw new Error('ایمیل حساب مشخص نیست.');
  if (!currentPassword) throw new Error('رمز فعلی را وارد کنید.');
  if (!nextPassword || nextPassword.length < 8) throw new Error('رمز جدید باید حداقل ۸ کاراکتر باشد.');

  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (signInError) throw new Error('رمز فعلی درست نیست یا حساب با رمز عبور فعال نشده است.');

  const { error } = await client.auth.updateUser({ password: nextPassword });
  if (error) throw error;
}

export async function requestAccountPasswordReset(email) {
  const client = requireClient();
  if (!email) throw new Error('ایمیل حساب مشخص نیست.');
  const redirectTo = typeof window === 'undefined'
    ? undefined
    : `${window.location.origin}/account`;
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

/** Upload a profile photo to the public avatars bucket and store its URL. */
export async function uploadAvatar(user, file) {
  const client = requireClient();
  if (!user?.id) throw new Error('برای آپلود عکس وارد حساب شوید.');
  if (!file?.type?.startsWith('image/')) throw new Error('فقط فایل تصویری مجاز است.');
  if (file.size > 4 * 1024 * 1024) throw new Error('حجم عکس باید کمتر از ۴ مگابایت باشد.');

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const objectPath = `${user.id}/avatar-${Date.now()}.${ext}`;
  const { error: uploadError } = await client.storage
    .from(AVATAR_BUCKET)
    .upload(objectPath, file, { upsert: true, contentType: file.type, cacheControl: '3600' });
  if (uploadError) throw uploadError;

  const { data: pub } = client.storage.from(AVATAR_BUCKET).getPublicUrl(objectPath);
  const avatarUrl = pub.publicUrl;
  const { error: updateError } = await client
    .from('profiles')
    .upsert({ id: user.id, avatar_url: avatarUrl, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (updateError) throw updateError;
  return avatarUrl;
}

export async function migrateGuestTransferDraft(user) {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(GUEST_TRANSFER_KEY);
  if (!raw) return null;

  let draft;
  try {
    draft = JSON.parse(raw);
  } catch {
    return null;
  }

  const client = requireClient();
  const guestResult = draft.preliminaryResult || null;
  const { data, error } = await client
    .from('transfer_assessments')
    .upsert({
      user_id: user.id,
      guest_draft_id: draft.id,
      current_university: draft.answers?.currentUniversity || null,
      current_program: draft.answers?.currentProgram || null,
      target_country: draft.answers?.targetCountry || null,
      target_program: draft.answers?.targetProgram || null,
      status: guestResult ? 'preliminary_result' : 'draft',
      ai_result: guestResult ? {
        headline: 'نتیجه مقدماتی انتقالی شما',
        overview: guestResult.overview,
        estimated_transfer_match: guestResult.estimatedTransferMatch,
        estimated_entry_level: guestResult.estimatedEntryLevel,
        likely_recognized_courses: guestResult.likelyRecognizedCourses,
        missing_documents_count: guestResult.missingDocumentsCount,
        ai_confidence: guestResult.aiConfidence,
        risk_level: guestResult.riskLevel,
        preliminary_transfer_fit: guestResult.classification,
        next_steps: guestResult.nextSteps,
        admission_reality_note: guestResult.disclaimer,
        source_boundaries: {
          provided_by_student: guestResult.providedFacts,
          estimated_by_ai: guestResult.estimatedFacts,
          requires_university_decision: guestResult.universityDecision,
        },
        guest_answers: draft.answers || {},
        guest_courses: Array.isArray(draft.courses) ? draft.courses : [],
      } : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,guest_draft_id' })
    .select()
    .single();

  if (error) throw error;
  window.localStorage.removeItem(GUEST_TRANSFER_KEY);
  window.dispatchEvent(new CustomEvent('acca-transfer-guest-assessment-change', { detail: null }));
  return { assessment: data, documentMetadata: draft.document || null };
}

export async function saveSmartApplySession(user, state) {
  const client = requireClient();
  const payload = {
    user_id: user.id,
    guest_session_id: state.sessionId,
    language: state.language,
    goal: state.goal,
    status: state.discoveryResult ? 'preliminary_result' : 'in_progress',
    profile_snapshot: state.studentProfile || {},
    result: state.discoveryResult || null,
    transcript: state.messages || [],
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client
    .from('smart_apply_sessions')
    .upsert(payload, { onConflict: 'user_id,guest_session_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listAccountData(userId, product) {
  const client = requireClient();
  const documentsPromise = client
    .from('student_documents')
    .select('*')
    .eq('user_id', userId)
    .eq('product', product)
    .order('created_at', { ascending: false });

  const recordsPromise = product === 'ai_transfer'
    ? client.from('transfer_assessments').select('*').eq('user_id', userId).order('updated_at', { ascending: false })
    : client.from('smart_apply_sessions').select('*').eq('user_id', userId).order('updated_at', { ascending: false });

  const [documentsResult, recordsResult] = await Promise.all([documentsPromise, recordsPromise]);
  if (documentsResult.error) throw documentsResult.error;
  if (recordsResult.error) throw recordsResult.error;
  return { documents: documentsResult.data || [], records: recordsResult.data || [] };
}

export async function listCentralAccountData(userId) {
  const client = requireClient();
  const [profile, documents, smartApply, deepFit, transfer, selections, submissions, notifications, letters] = await Promise.all([
    client.from('profiles').select('*').eq('id', userId).maybeSingle(),
    client.from('student_documents').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    client.from('smart_apply_sessions').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
    client.from('smart_apply_deep_profiles').select('*').eq('user_id', userId).maybeSingle(),
    client.from('transfer_assessments').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
    client.from('student_program_selections').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
    client.from('application_submissions').select('*').eq('user_id', userId).order('submitted_at', { ascending: false }),
    client.from('user_notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(8),
    client.from('user_letters').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
  ]);

  const failure = [profile, documents, smartApply, deepFit, transfer, selections, submissions, notifications, letters]
    .find((result) => result.error);
  if (failure?.error) throw failure.error;

  return {
    profile: profile.data || null,
    documents: documents.data || [],
    smartApply: smartApply.data || [],
    deepFit: deepFit.data || null,
    transfer: transfer.data || [],
    selections: selections.data || [],
    submissions: submissions.data || [],
    notifications: notifications.data || [],
    letters: letters.data || [],
  };
}

export async function upsertProgramSelection(user, product, selection) {
  const client = requireClient();
  if (!user?.id) throw new Error('برای ذخیره انتخاب وارد حساب شوید.');
  if (!['smart_apply', 'ai_transfer'].includes(product)) throw new Error('سرویس انتخاب‌شده معتبر نیست.');

  // Accepts a single program (legacy) or a shortlist array. The first item is
  // the primary; the full list is kept inside catalog_snapshot.items so the
  // single-row schema (unique user_id+product) stays unchanged.
  const items = (Array.isArray(selection) ? selection : [selection]).filter(Boolean);
  if (!items.length) throw new Error('حداقل یک رشته و دانشگاه را انتخاب کنید.');
  if (!items.every((item) => ['Turkey', 'KKTC'].includes(item?.country))) {
    throw new Error('فقط دانشگاه‌های ترکیه و قبرس شمالی قابل انتخاب هستند.');
  }
  const program = items[0];

  const payload = {
    user_id: user.id,
    product,
    catalog_program_id: String(program.id),
    country: program.country,
    city: program.city || null,
    university_name: program.university,
    program_name: program.program,
    degree: program.degree || null,
    language: program.language || null,
    tuition_fee: program.tuitionFee || null,
    cash_fee: program.cashFees || null,
    university_logo: program.universityLogo || null,
    official_url: program.universityUrl || null,
    source: 'accaco',
    catalog_snapshot: { ...program, items },
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from('student_program_selections')
    .upsert(payload, { onConflict: 'user_id,product' })
    .select()
    .single();
  if (error) throw error;

  if (product === 'ai_transfer') {
    const transferTarget = {
      target_country: program.country,
      target_university: program.university,
      target_program: program.program,
      target_program_id: String(program.id),
      target_program_snapshot: program,
      updated_at: new Date().toISOString(),
    };
    const { data: latest, error: latestError } = await client
      .from('transfer_assessments')
      .select('id')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) throw latestError;

    const transferResult = latest?.id
      ? await client.from('transfer_assessments').update({
          ...transferTarget,
          status: 'draft',
          ai_result: null,
        }).eq('id', latest.id)
      : await client.from('transfer_assessments').insert({
          user_id: user.id,
          ...transferTarget,
          status: 'draft',
        });
    if (transferResult.error) throw transferResult.error;
  }

  return data;
}

export async function loadSmartApplyDeepProfile(userId) {
  const client = requireClient();
  const { data, error } = await client
    .from('smart_apply_deep_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function saveSmartApplyDeepProfile(user, state) {
  const client = requireClient();
  const completed = state.deepFitStatus === 'completed' && Boolean(state.deepFitResult);
  const { data, error } = await client
    .from('smart_apply_deep_profiles')
    .upsert({
      user_id: user.id,
      status: completed ? 'completed' : 'in_progress',
      answers: state.deepFitAnswers || [],
      adaptive_question_ids: state.deepFitAdaptiveIds || [],
      result: state.deepFitResult || null,
      completed_at: completed
        ? (state.deepFitResult?.completedAt || new Date().toISOString())
        : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function uploadStudentDocument({
  user,
  product,
  kind,
  file,
  assessmentId = null,
  onProgress,
  onStage,
}) {
  validateDocument(file);
  const client = requireClient();
  onStage?.('quality');
  onProgress?.(6);
  const qualityReport = await inspectDocumentQuality(file);
  const objectPath = `${user.id}/${product}/${assessmentId || 'general'}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
  onStage?.('upload');
  onProgress?.(18);

  const { error: uploadError } = await client.storage
    .from(DOCUMENT_BUCKET)
    .upload(objectPath, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (uploadError) throw uploadError;
  onProgress?.(62);

  const { data, error: rowError } = await client
    .from('student_documents')
    .insert({
      user_id: user.id,
      product,
      assessment_id: assessmentId,
      document_kind: kind,
      object_path: objectPath,
      original_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      status: 'uploaded',
      quality_report: qualityReport,
    })
    .select()
    .single();

  if (rowError) {
    await client.storage.from(DOCUMENT_BUCKET).remove([objectPath]);
    throw rowError;
  }
  onStage?.('ocr');
  onProgress?.(76);

  try {
    const ocr = await requestDocumentOcr({ documentId: data.id });
    onProgress?.(100);
    return { ...ocr.document, ocrResult: ocr.result, qualityReport, ocrError: null };
  } catch (error) {
    onProgress?.(100);
    return {
      ...data,
      quality_report: qualityReport,
      qualityReport,
      ocrResult: null,
      ocrError: error?.message || 'OCR could not be completed.',
    };
  }
}

export async function createTransferAssessment(user, fields = {}) {
  const client = requireClient();
  const { data, error } = await client
    .from('transfer_assessments')
    .insert({
      user_id: user.id,
      current_university: fields.currentUniversity || null,
      current_program: fields.currentProgram || null,
      target_country: fields.targetCountry || null,
      target_university: fields.targetUniversity || null,
      target_program: fields.targetProgram || null,
      target_program_id: fields.targetProgramId || null,
      target_program_snapshot: fields.targetProgramSnapshot || null,
      status: 'draft',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function requestTransferAnalysis({ assessmentId, documentId }) {
  const client = requireClient();
  const { data, error } = await client.functions.invoke('transfer-analyze', {
    body: { assessmentId, documentId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function requestDocumentOcr({ documentId, force = false }) {
  const client = requireClient();
  const { data, error } = await client.functions.invoke('document-ocr', {
    body: { documentId, force },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function confirmDocumentExtraction(document) {
  const client = requireClient();
  const { data, error } = await client
    .from('student_documents')
    .update({
      status: 'verified',
      review_status: 'confirmed',
      confirmed_extraction: document.ai_extraction,
      confirmed_at: new Date().toISOString(),
      review_notes: null,
    })
    .eq('id', document.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function requestHumanDocumentReview(documentId) {
  const client = requireClient();
  const { data, error } = await client
    .from('student_documents')
    .update({
      review_status: 'admin_review',
      review_notes: 'Student requested a human review.',
    })
    .eq('id', documentId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createDocumentSignedUrl(objectPath) {
  const client = requireClient();
  const { data, error } = await client.storage.from(DOCUMENT_BUCKET).createSignedUrl(objectPath, 60);
  if (error) throw error;
  return data.signedUrl;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

/**
 * Guest (no-login) transcript OCR. Sends the image directly to the public
 * `guest-transcript-ocr` Edge Function and returns the extracted courses/GPA for
 * the student to confirm. Nothing is uploaded to storage or persisted.
 */
export async function guestTranscriptOcr(file) {
  const client = requireClient();
  const imageBase64 = await fileToDataUrl(file);
  const { data, error } = await client.functions.invoke('guest-transcript-ocr', {
    body: { imageBase64, mimeType: file.type || 'image/jpeg', fileName: file.name },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.result;
}

export async function requestApplicationSubmission({
  product = 'smart_apply',
  intent = 'apply',
  consent = false,
  dryRun = false,
}) {
  const client = requireClient();
  const { data, error } = await client.functions.invoke('submit-application', {
    body: { product, intent, consent, dryRun },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
