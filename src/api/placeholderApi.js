// Placeholder API layer — the future backend surface of Smart Apply.
//
// Nothing here performs real I/O. Each function documents the contract the
// backend team should implement; the UI and store already call through these
// seams (or are ready to), so integration is a drop-in replacement:
//
//   aiApi        → real AI provider (LLM) — replaces src/ai/mockAIProvider.js
//   authApi      → real authentication (OTP / OAuth) — replaces the mock login
//   documentsApi → secure file upload + OCR extraction
//   crmApi       → lead/application sync with the ACCA CRM
//   voiceApi     → speech-to-text / text-to-speech streaming
//
// Keep the return shapes stable: the UI is built against them.

const notConnected = (feature) =>
  Promise.reject(new Error(`[SmartApply demo] ${feature} is not connected yet — backend integration pending.`));

export const aiApi = {
  // TODO(real AI provider): replace the mock conversation engine with a
  // server-side provider while preserving the message/action contract.
  /**
   * POST /api/smart-apply/converse
   * body: { sessionId, language, intent?, text?, state: studentProfileSnapshot }
   * returns: { messages: [{ id, role, content, actions?, component?, payload? }],
   *            patch: {...}, effect?: string }
   */
  converse: () => notConnected('AI conversation'),
};

export const authApi = {
  // TODO(real authentication): connect OTP/OAuth and persist the guest session
  // only after the student explicitly chooses to create an account.
  /** POST /api/auth/request-otp  body: { phone | email } */
  requestOtp: () => notConnected('Authentication'),
  /** POST /api/auth/verify  → { token, student } */
  verifyOtp: () => notConnected('Authentication'),
};

export const documentsApi = {
  // TODO(real document upload): send files to private, access-controlled
  // storage and return upload progress plus a durable document id.
  /** POST /api/documents (multipart) → { documentId, status } */
  upload: () => notConnected('Document upload'),
  // TODO(real OCR): extract structured fields server-side and require student
  // confirmation before any extracted value is used in an application.
  /** GET /api/documents/:id/extraction → OCR fields (passport no, names, …) */
  getExtraction: () => notConnected('AI document extraction'),
};

export const crmApi = {
  // TODO(real CRM sync): send only consented profile/application fields and
  // record the source session id for counselor follow-up.
  /** POST /api/crm/leads — sync the guest Smart Apply profile as a lead. */
  syncLead: () => notConnected('CRM sync'),
  /** POST /api/crm/applications — create the real application record. */
  createApplication: () => notConnected('CRM applications'),
};

export const voiceApi = {
  // TODO(real voice integration): replace the demo timer with permission-aware
  // streaming STT/TTS and clear recording indicators.
  /** WebSocket /api/voice/stt — streaming speech-to-text. */
  startListening: () => notConnected('Speech-to-text'),
  /** POST /api/voice/tts → audio stream for assistant replies. */
  speak: () => notConnected('Text-to-speech'),
};

export const universitiesApi = {
  // TODO(real university matching API): replace sample program rows with
  // verified intake, eligibility, tuition, scholarship, and availability data.
  /** POST /api/universities/match → { matches, assumptions, verifiedAt } */
  match: () => notConnected('University matching'),
};
