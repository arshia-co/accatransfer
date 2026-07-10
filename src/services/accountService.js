import { supabase } from '../lib/supabaseClient';
import { getTurnstileToken } from '../lib/turnstile';
import { inspectDocumentQuality } from './documentQualityService';
import { prepareUploadFile } from './documentSecurity';

const DOCUMENT_BUCKET = 'student-documents';
const GUEST_TRANSFER_KEY = 'acca-transfer-guest-assessment';
const GUEST_TRANSFER_HISTORY_KEY = 'acca-transfer-guest-assessment-history-v1';
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

async function turnstileToken(action) {
  try {
    return await getTurnstileToken(action);
  } catch (error) {
    throw new Error(error?.message || 'Security check failed. Please refresh and try again.', { cause: error });
  }
}

async function verifySecurityGate(action) {
  const token = await turnstileToken(action);
  if (!token) return null;
  const client = requireClient();
  const { data, error } = await client.functions.invoke('security-verify', {
    body: { turnstileToken: token, action },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
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

  const captchaToken = await turnstileToken('password_change_verify');
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: currentPassword,
    ...(captchaToken ? { options: { captchaToken } } : {}),
  });
  if (signInError) throw new Error('رمز فعلی درست نیست یا حساب با رمز عبور فعال نشده است.');

  const { error } = await client.auth.updateUser({ password: nextPassword });
  if (error) throw error;
  await sendAccountEventEmail('password_changed', {
    method: 'current_password',
    source: 'profile_editor',
  }).catch(() => null);
}

export async function requestAccountPasswordReset(email) {
  const client = requireClient();
  if (!email) throw new Error('ایمیل حساب مشخص نیست.');
  const redirectTo = typeof window === 'undefined'
    ? undefined
    : `${window.location.origin}/?/reset-password`;
  const captchaToken = await turnstileToken('password_reset');
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo,
    ...(captchaToken ? { captchaToken } : {}),
  });
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
  await sendAccountEventEmail('profile_updated', {
    source: 'profile_editor',
    changedFields: [{ field: 'avatar_url', label: 'عکس پروفایل', next: 'به‌روزرسانی شد' }],
  }).catch(() => null);
  return avatarUrl;
}

export async function sendAccountEventEmail(eventType, details = {}) {
  const client = requireClient();
  const { data, error } = await client.functions.invoke('account-event-email', {
    body: { eventType, details },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function sendAccountAdminAlert(eventType, details = {}) {
  const client = requireClient();
  const body = { eventType, details };
  if (eventType === 'signup') {
    body.turnstileToken = await turnstileToken('signup_admin_alert');
  }
  const { data, error } = await client.functions.invoke('account-admin-alert', { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
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
      target_university: draft.answers?.targetUniversity || null,
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

  // Carry the destination programs the guest shortlisted (step 4 catalog picker)
  // into the account's AI Transfer selection so they don't have to re-pick.
  if (Array.isArray(draft.targetSelection) && draft.targetSelection.length) {
    try {
      await upsertProgramSelection(user, 'ai_transfer', draft.targetSelection);
    } catch {
      // Non-fatal: the assessment is already saved; selection can be redone in-panel.
    }
  }

  window.localStorage.removeItem(GUEST_TRANSFER_KEY);
  window.dispatchEvent(new CustomEvent('acca-transfer-guest-assessment-change', { detail: null }));
  return { assessment: data, documentMetadata: draft.document || null };
}

export async function migrateGuestTransferDraftV2(user) {
  if (typeof window === 'undefined') return null;
  const drafts = readGuestTransferDraftsForMigration();
  if (!drafts.length) return null;

  const client = requireClient();
  const migrated = [];
  const orderedDrafts = [...drafts].sort((a, b) => (
    Date.parse(a.updatedAt || a.createdAt || 0) - Date.parse(b.updatedAt || b.createdAt || 0)
  ));

  for (const draft of orderedDrafts) {
    const aiResult = buildMigratedTransferResult(draft, draft.preliminaryResult || null);
    const { data, error } = await client
      .from('transfer_assessments')
      .upsert({
        user_id: user.id,
        guest_draft_id: draft.id,
        current_university: draft.answers?.currentUniversity || null,
        current_program: draft.answers?.currentProgram || null,
        target_country: draft.answers?.targetCountry || null,
        target_university: draft.answers?.targetUniversity || null,
        target_program: draft.answers?.targetProgram || null,
        status: aiResult ? 'preliminary_result' : 'draft',
        ai_result: aiResult,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,guest_draft_id' })
      .select()
      .single();

    if (error) throw error;
    migrated.push({ assessment: data, draft });
  }

  const activeDraft = [...orderedDrafts].reverse().find((item) => (
    Array.isArray(item.targetSelection) && item.targetSelection.length
  ));
  if (activeDraft) {
    try {
      await upsertProgramSelection(user, 'ai_transfer', activeDraft.targetSelection);
    } catch {
      // Non-fatal: the assessment is already saved; selection can be redone in-panel.
    }
  }

  window.localStorage.removeItem(GUEST_TRANSFER_KEY);
  window.localStorage.removeItem(GUEST_TRANSFER_HISTORY_KEY);
  window.dispatchEvent(new CustomEvent('acca-transfer-guest-assessment-change', { detail: null }));
  const latest = migrated[migrated.length - 1] || null;
  return {
    assessment: latest?.assessment || null,
    migratedCount: migrated.length,
    documentMetadata: latest?.draft?.document || null,
  };
}

function readGuestTransferDraftsForMigration() {
  const parse = (raw) => {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  };
  const active = parse(window.localStorage.getItem(GUEST_TRANSFER_KEY));
  const historyRaw = parse(window.localStorage.getItem(GUEST_TRANSFER_HISTORY_KEY));
  const history = Array.isArray(historyRaw) ? historyRaw : [];
  const byId = new Map();
  [active, ...history].filter(Boolean).forEach((draft) => {
    const normalized = normalizeGuestTransferDraft(draft);
    if (isMeaningfulGuestTransferDraft(normalized)) byId.set(normalized.id, normalized);
  });
  return [...byId.values()];
}

function normalizeGuestTransferDraft(draft = {}) {
  return {
    ...draft,
    id: draft.id || `guest-${Date.now()}`,
    answers: draft.answers || {},
    targetSelection: Array.isArray(draft.targetSelection) ? draft.targetSelection : [],
    courses: Array.isArray(draft.courses) ? draft.courses : [],
    document: draft.document || null,
    preliminaryResult: draft.preliminaryResult || null,
  };
}

function isMeaningfulGuestTransferDraft(draft) {
  return Boolean(
    draft?.document
    || draft?.preliminaryResult
    || draft?.completed
    || draft?.targetSelection?.length
    || draft?.courses?.some((course) => course?.name || course?.grade)
    || Object.values(draft?.answers || {}).some(Boolean)
  );
}

function buildMigratedTransferResult(draft, guestResult) {
  const hasCourses = Array.isArray(draft.courses) && draft.courses.length;
  const hasAnswers = Object.values(draft.answers || {}).some(Boolean);
  if (!guestResult && !hasCourses && !hasAnswers && !draft.document) return null;

  const answers = draft.answers || {};
  const base = guestResult ? {
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
  } : {
    headline: 'پیش نویس انتقالی ذخیره شده از مسیر رایگان',
    overview: 'این پیش نویس از اطلاعاتی ساخته شده که قبل از ورود در AI Transfer وارد کرده بودید. برای ادامه رسمی، فایل ریزنمرات را در آپلود امن پنل انتخاب کنید.',
    estimated_transfer_match: null,
    estimated_entry_level: null,
    likely_recognized_courses: hasCourses ? `${draft.courses.length} درس خوانده شده` : 'نیازمند ریزنمرات',
    missing_documents_count: 3,
    ai_confidence: 'Low',
    risk_level: 'Medium',
    preliminary_transfer_fit: 'Saved Guest Draft',
    next_steps: [
      'ریز نمرات را در پنل امن دوباره آپلود کنید تا فایل واقعی به حساب شما متصل شود.',
      'درس ها و نمره های خوانده شده را بررسی کنید.',
      'دانشگاه و رشته مقصد را تایید کنید.',
    ],
    admission_reality_note: 'این فقط حافظه مسیر رایگان است و جایگزین آپلود امن فایل، بررسی انسانی یا تصمیم نهایی دانشگاه نمی شود.',
  };

  return {
    ...base,
    guest_answers: answers,
    guest_courses: draft.courses || [],
    guest_document: draft.document ? {
      name: draft.document.name,
      size: draft.document.size,
      type: draft.document.type,
      uploaded_before_login: true,
    } : null,
    guest_draft_id: draft.id,
    guest_draft_created_at: draft.createdAt || null,
    guest_draft_updated_at: draft.updatedAt || null,
    current_university: answers.currentUniversity || null,
    current_program: answers.currentProgram || null,
    target_country: answers.targetCountry || null,
    target_university: answers.targetUniversity || null,
    target_program: answers.targetProgram || null,
  };
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
  const client = requireClient();
  onStage?.('security');
  onProgress?.(2);
  await verifySecurityGate('document_upload');

  // Real-MIME + per-type size + PDF-threat checks, EXIF strip, sanitised name, hash.
  onStage?.('prepare');
  onProgress?.(8);
  const prepared = await prepareUploadFile(file);
  onProgress?.(16);

  // Duplicate detection by content hash (per user).
  if (prepared.hash) {
    const { data: duplicate } = await client
      .from('student_documents')
      .select('id, original_name')
      .eq('user_id', user.id)
      .eq('file_hash', prepared.hash)
      .limit(1)
      .maybeSingle();
    if (duplicate) {
      throw new Error(`این فایل قبلاً آپلود شده است${duplicate.original_name ? ` («${duplicate.original_name}»)` : ''}.`);
    }
  }

  onStage?.('quality');
  const qualityReport = await inspectDocumentQuality(prepared.file);

  // Versioning: a fresh upload of the same document kind supersedes the prior one.
  let version = 1;
  let replacesId = null;
  const { data: prior } = await client
    .from('student_documents')
    .select('id, version')
    .eq('user_id', user.id)
    .eq('product', product)
    .eq('document_kind', kind)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (prior?.id) {
    version = (prior.version || 1) + 1;
    replacesId = prior.id;
  }

  const objectPath = `${user.id}/${product}/${assessmentId || 'general'}/${crypto.randomUUID()}-${prepared.sanitizedName}`;
  onStage?.('upload');
  onProgress?.(22);

  const { error: uploadError } = await client.storage
    .from(DOCUMENT_BUCKET)
    .upload(objectPath, prepared.file, { cacheControl: '3600', upsert: false, contentType: prepared.mimeType });
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
      original_name: prepared.originalName,
      mime_type: prepared.mimeType,
      size_bytes: prepared.sizeBytes,
      file_hash: prepared.hash,
      version,
      replaces_id: replacesId,
      status: 'uploaded',
      quality_report: qualityReport,
    })
    .select()
    .single();

  if (rowError) {
    await client.storage.from(DOCUMENT_BUCKET).remove([objectPath]);
    throw rowError;
  }

  // Server-side re-validation + anti-virus (defense in depth). An unsafe verdict
  // purges the object + row server-side; a transient scan error fails open since
  // the client-side checks already passed.
  onStage?.('scan');
  onProgress?.(72);
  try {
    await scanStudentDocument(data.id);
  } catch (scanError) {
    if (scanError?.isUnsafe) throw scanError;
    console.warn('Server document scan skipped:', scanError?.message || scanError);
  }

  onStage?.('ocr');
  onProgress?.(82);

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

/** Server-side security re-validation + anti-virus for an uploaded document.
 *  Throws err.isUnsafe=true when the server rejected (and purged) the file; a
 *  transport/availability error is thrown plain so callers can fail open. */
export async function scanStudentDocument(documentId) {
  const client = requireClient();
  const { data, error } = await client.functions.invoke('scan-document', { body: { documentId } });
  if (error) throw error;
  if (data?.safe === false) {
    const unsafe = new Error(data.reason || 'فایل در بررسی امنیتی سرور رد شد.');
    unsafe.isUnsafe = true;
    throw unsafe;
  }
  return data;
}

/** Delete a student-uploaded document (storage object + row). Locked documents
 *  (e.g. submitted/company-bound) are refused; company-issued files live in
 *  user_letters and cannot be deleted by the client at all (RLS). */
export async function deleteStudentDocument(document) {
  const client = requireClient();
  if (!document?.id) throw new Error('مدرک نامعتبر است.');
  if (document.is_locked) throw new Error('این مدرک قفل شده و قابل حذف نیست.');
  if (document.object_path) {
    await client.storage.from(DOCUMENT_BUCKET).remove([document.object_path]).catch(() => null);
  }
  const { error } = await client.from('student_documents').delete().eq('id', document.id);
  if (error) throw error;
  return true;
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
  const token = await turnstileToken('transfer_analyze');
  const { data, error } = await client.functions.invoke('transfer-analyze', {
    body: { assessmentId, documentId, turnstileToken: token },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function requestDocumentOcr({ documentId, force = false }) {
  const client = requireClient();
  const token = await turnstileToken('document_ocr');
  const { data, error } = await client.functions.invoke('document-ocr', {
    body: { documentId, force, turnstileToken: token },
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

export async function createDocumentSignedUrl(objectPath, bucketId = DOCUMENT_BUCKET) {
  const client = requireClient();
  // Short-lived (60s) signed URL — covers both student uploads and company letters.
  const { data, error } = await client.storage.from(bucketId || DOCUMENT_BUCKET).createSignedUrl(objectPath, 60);
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

const GUEST_OCR_MAX_BYTES = 10 * 1024 * 1024;
const GUEST_OCR_MAX_EDGE = 1600; // px — OCR doesn't need full phone-camera res

/**
 * Downscale large images off the sync path before base64-encoding: a 10MB
 * phone photo became a ~14MB base64 string whose allocation + JSON stringify
 * froze the OCR spinner. createImageBitmap + toBlob are async (decode happens
 * off the main thread); the JPEG re-encode also shrinks the payload ~10x.
 */
async function shrinkImageForOcr(file) {
  if (!file.type?.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = GUEST_OCR_MAX_EDGE / Math.max(bitmap.width, bitmap.height);
    if (scale >= 1 && file.size < 2 * 1024 * 1024) {
      bitmap.close?.();
      return file; // already small — keep the original bytes
    }
    const w = Math.round(bitmap.width * Math.min(1, scale));
    const h = Math.round(bitmap.height * Math.min(1, scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
  } catch {
    return file; // any decode failure → send the original, server validates
  }
}

/**
 * Guest (no-login) transcript OCR. Sends the image directly to the public
 * `guest-transcript-ocr` Edge Function and returns the extracted courses/GPA for
 * the student to confirm. Nothing is uploaded to storage or persisted.
 */
export async function guestTranscriptOcr(file, turnstileToken = null) {
  const client = requireClient();
  if (file.size > GUEST_OCR_MAX_BYTES) {
    throw new Error('حجم فایل بیشتر از ۱۰ مگابایت است؛ لطفاً نسخه کم‌حجم‌تری آپلود کنید.');
  }
  const payloadFile = await shrinkImageForOcr(file);
  const imageBase64 = await fileToDataUrl(payloadFile);
  const { data, error } = await client.functions.invoke('guest-transcript-ocr', {
    body: { imageBase64, mimeType: payloadFile.type || 'image/jpeg', fileName: payloadFile.name, turnstileToken },
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
