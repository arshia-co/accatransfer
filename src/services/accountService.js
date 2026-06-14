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
  const { error } = await client.from('profiles').upsert({
    id: user.id,
    current_product: product,
    language: fields.language || 'fa',
    full_name: fields.fullName || null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
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
  const { data, error } = await client
    .from('transfer_assessments')
    .upsert({
      user_id: user.id,
      guest_draft_id: draft.id,
      current_university: draft.answers?.currentUniversity || null,
      current_program: draft.answers?.currentProgram || null,
      target_country: draft.answers?.targetCountry || null,
      target_program: draft.answers?.targetProgram || null,
      status: 'draft',
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
  const [profile, documents, smartApply, transfer] = await Promise.all([
    client.from('profiles').select('*').eq('id', userId).maybeSingle(),
    client.from('student_documents').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    client.from('smart_apply_sessions').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
    client.from('transfer_assessments').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
  ]);

  const failure = [profile, documents, smartApply, transfer].find((result) => result.error);
  if (failure?.error) throw failure.error;

  return {
    profile: profile.data || null,
    documents: documents.data || [],
    smartApply: smartApply.data || [],
    transfer: transfer.data || [],
  };
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
      target_program: fields.targetProgram || null,
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
