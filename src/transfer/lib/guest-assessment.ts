import {
  type TransferReportJson,
  safeParseReportJson,
  SAMPLE_COURSE_EQUIVALENCIES,
  REPORT_DISCLAIMER,
  HUMAN_REVIEW_PENDING,
} from "./report-types";
import type { CoreCourse } from "./course-matching";

export const GUEST_ASSESSMENT_KEY = "acca-transfer-guest-assessment";
export const GUEST_ASSESSMENT_EVENT = "acca-transfer-guest-assessment-change";

export type GuestDocument = {
  name: string;
  size: number;
  type: string;
};

export type GuestAssessmentAnswers = {
  currentUniversity: string;
  currentProgram: string;
  currentYear: string;
  gpa: string;
  completedCredits: string;
  targetCountry: string;
  targetUniversity: string;
  targetProgram: string;
};

export type GuestPreliminaryResult = {
  headline: string;
  overview: string;
  estimatedTransferMatch: number;
  estimatedEntryLevel: string;
  likelyRecognizedCourses: string;
  missingDocumentsCount: number;
  aiConfidence: "Low" | "Medium";
  riskLevel: "Medium" | "High";
  classification:
    | "Good Candidate with Document Review Needed"
    | "Possible Candidate with Significant Risks"
    | "Weak Transfer Fit"
    | "Not Enough Data";
  recommendedNextStep: string;
  nextSteps: string[];
  providedFacts: string[];
  estimatedFacts: string[];
  universityDecision: string[];
  disclaimer: string;
};

export type GuestAssessmentDraft = {
  id: string;
  createdAt: string;
  updatedAt: string;
  document: GuestDocument | null;
  documentDeferred: boolean;
  answers: GuestAssessmentAnswers;
  /** Core / specialised courses the student entered, for per-course matching. */
  courses: CoreCourse[];
  preliminaryResult: GuestPreliminaryResult | null;
  completed: boolean;
};

const emptyAnswers = (): GuestAssessmentAnswers => ({
  currentUniversity: "",
  currentProgram: "",
  currentYear: "",
  gpa: "",
  completedCredits: "",
  targetCountry: "",
  targetUniversity: "",
  targetProgram: "",
});

export function createGuestAssessmentDraft(): GuestAssessmentDraft {
  const now = new Date().toISOString();
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `guest-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
    document: null,
    documentDeferred: false,
    answers: emptyAnswers(),
    courses: [],
    preliminaryResult: null,
    completed: false,
  };
}

export function readGuestAssessment(): GuestAssessmentDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(GUEST_ASSESSMENT_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as GuestAssessmentDraft;
    return {
      ...createGuestAssessmentDraft(),
      ...parsed,
      answers: { ...emptyAnswers(), ...parsed.answers },
      courses: Array.isArray(parsed.courses) ? parsed.courses : [],
      preliminaryResult: parsed.preliminaryResult ?? null,
    };
  } catch {
    return null;
  }
}

export function saveGuestAssessment(draft: GuestAssessmentDraft) {
  if (typeof window === "undefined") return;
  const next = { ...draft, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(GUEST_ASSESSMENT_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(GUEST_ASSESSMENT_EVENT, { detail: next }));
  return next;
}

export function clearGuestAssessment() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GUEST_ASSESSMENT_KEY);
  window.dispatchEvent(new CustomEvent(GUEST_ASSESSMENT_EVENT, { detail: null }));
}

export function guestAssessmentProgress(draft: GuestAssessmentDraft | null) {
  if (!draft) return 0;
  const completedAnswers = Object.values(draft.answers).filter(Boolean).length;
  const totalAnswers = Object.keys(emptyAnswers()).length;
  return Math.round(completedAnswers / totalAnswers * 100);
}

function parseFirstNumber(value: string) {
  const match = value.replace(",", ".").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function normalizedGpa(value: string) {
  const numbers = value.replace(",", ".").match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (!numbers.length) return null;
  const [score, explicitScale] = numbers;
  const scale = explicitScale || (score <= 4 ? 4 : score <= 20 ? 20 : 100);
  if (!scale || score > scale) return null;
  return Math.max(0, Math.min(1, score / scale));
}

function normalizeProgram(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function programAlignment(currentProgram: string, targetProgram: string) {
  const current = normalizeProgram(currentProgram);
  const target = normalizeProgram(targetProgram);
  if (!current.length || !target.length) return 0;
  if (current.join(" ") === target.join(" ")) return 16;
  const overlap = current.filter((token) => target.includes(token)).length;
  if (overlap > 0) return 10;
  return 5;
}

/**
 * Generates a deliberately limited local preview. It never claims to have
 * read the selected file because guest memory stores file metadata only.
 */
export function buildGuestPreliminaryResult(draft: GuestAssessmentDraft): GuestPreliminaryResult {
  const answers = draft.answers;
  const gpaRatio = normalizedGpa(answers.gpa);
  const completedCredits = parseFirstNumber(answers.completedCredits);
  const populatedAnswers = Object.values(answers).filter(Boolean).length;

  let match = 35;
  if (gpaRatio !== null) match += Math.round(gpaRatio * 22);
  if (completedCredits !== null) {
    match += completedCredits >= 90 ? 16 : completedCredits >= 60 ? 13 : completedCredits >= 30 ? 8 : 4;
  }
  match += programAlignment(answers.currentProgram, answers.targetProgram);
  if (answers.currentYear) match += 3;
  if (answers.targetUniversity) match += 4;
  if (draft.document) match += 2;
  match = Math.max(30, Math.min(78, match));

  const hasCoreData = Boolean(
    answers.currentUniversity
    && answers.currentProgram
    && answers.gpa
    && answers.completedCredits
    && answers.targetCountry
    && answers.targetProgram
  );
  const aiConfidence: GuestPreliminaryResult["aiConfidence"] =
    hasCoreData && populatedAnswers >= 7 ? "Medium" : "Low";
  const riskLevel: GuestPreliminaryResult["riskLevel"] = match >= 55 ? "Medium" : "High";
  const classification: GuestPreliminaryResult["classification"] =
    !hasCoreData
      ? "Not Enough Data"
      : match >= 70
        ? "Good Candidate with Document Review Needed"
        : match >= 55
          ? "Possible Candidate with Significant Risks"
          : "Weak Transfer Fit";

  const estimatedEntryLevel =
    completedCredits === null
      ? "Cannot be estimated without verified credits"
      : completedCredits >= 60
        ? "Year 2 may be possible"
        : completedCredits >= 30
          ? "Year 1 or Year 2 may be possible"
          : "Year 1 is more likely";

  const targetLabel = answers.targetUniversity || answers.targetCountry || "the selected destination";
  const overview =
    classification === "Good Candidate with Document Review Needed"
      ? `Your academic profile appears potentially suitable for transfer review at ${targetLabel}, but transcript extraction and course-level review are still required.`
      : classification === "Possible Candidate with Significant Risks"
        ? `A transfer review may be possible, but important academic and document risks must be checked before choosing a university or entry level.`
        : classification === "Weak Transfer Fit"
          ? `The information entered suggests a cautious transfer strategy. A new admission backup or alternative university may also be worth reviewing.`
          : `There is not enough verified academic information yet to estimate transfer suitability reliably.`;

  return {
    headline: "Your preliminary transfer snapshot is ready",
    overview,
    estimatedTransferMatch: match,
    estimatedEntryLevel,
    likelyRecognizedCourses: "Requires transcript and syllabus analysis",
    missingDocumentsCount: 3,
    aiConfidence,
    riskLevel,
    classification,
    recommendedNextStep: "Create an account to save this snapshot, upload your transcript securely, and unlock the full transfer analysis.",
    nextSteps: [
      "Save this guest assessment in your central ACCA account.",
      "Upload the official transcript for OCR and academic extraction.",
      "Add course syllabi for detailed equivalency review.",
      "Request ACCA advisor review before university submission.",
    ],
    providedFacts: [
      "Current university, program, year, GPA and completed credits",
      "Target country, university and program",
      draft.document ? "Selected transcript file name and metadata" : "No transcript file selected",
    ],
    estimatedFacts: [
      "Preliminary transfer match",
      "Possible entry level",
      "Current risk and confidence level",
    ],
    universityDecision: [
      "Admission or transfer approval",
      "Final course recognition",
      "Final year or semester placement",
    ],
    disclaimer: REPORT_DISCLAIMER,
  };
}

// TODO(real authentication): after login, send this guest draft to the account
// migration endpoint and clear local storage only after the server confirms it.

// ───────────────────────────────────────────────────────────────────────────
// Guest assessment v1 — the richer, 6-step wizard state used by the new
// guest-first `/upload` flow. Kept additive so the existing landing modals
// (which use GuestAssessmentDraft above) keep working unchanged.
// No binary file data is ever stored — document entries hold metadata only.
// ───────────────────────────────────────────────────────────────────────────

export const GUEST_ASSESSMENT_V1_KEY = 'acca_transfer_guest_assessment_v1';

export type GuestDocumentStatus = 'missing' | 'selected' | 'mock_verified' | 'requires_login';

export type GuestAssessmentState = {
  version: 1;
  currentStep: number;
  personalInfo: {
    fullName?: string;
    email?: string;
    phone?: string;
    nationality?: string;
    preferredLanguage?: string;
  };
  academicInfo: {
    currentCountry?: string;
    currentUniversity?: string;
    currentProgram?: string;
    currentYear?: string;
    gpa?: string;
    gpaScale?: string;
    completedCredits?: string;
  };
  targetInfo: {
    targetCountry?: string;
    targetUniversity?: string;
    targetProgram?: string;
    preferredEntryYear?: string;
    educationLanguage?: string;
    budgetRange?: string;
  };
  documents: Array<{
    documentType: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    status: GuestDocumentStatus;
  }>;
  demoResult?: {
    estimatedTransferMatch: number;
    estimatedEntryLevel: string;
    likelyRecognizedCourses: string;
    missingDocumentsCount: number;
    aiConfidence: string;
    riskLevel: string;
    recommendedUniversity: string;
    recommendedNextStep: string;
  };
  updatedAt: string;
};

export function createGuestAssessmentState(): GuestAssessmentState {
  return {
    version: 1,
    currentStep: 0,
    personalInfo: {},
    academicInfo: {},
    targetInfo: {},
    documents: [],
    updatedAt: new Date().toISOString(),
  };
}

/** Safe, versioned read. Malformed/old data → clears only the broken key. */
export function loadGuestAssessmentState(): GuestAssessmentState | null {
  if (typeof window === 'undefined') return null;
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(GUEST_ASSESSMENT_V1_KEY);
  } catch {
    return null;
  }
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as Partial<GuestAssessmentState>;
    if (!parsed || parsed.version !== 1) throw new Error('unsupported version');
    const base = createGuestAssessmentState();
    return {
      ...base,
      ...parsed,
      version: 1,
      personalInfo: { ...parsed.personalInfo },
      academicInfo: { ...parsed.academicInfo },
      targetInfo: { ...parsed.targetInfo },
      documents: Array.isArray(parsed.documents) ? parsed.documents : [],
    };
  } catch {
    // Clear only the broken key after a safe warning; never throw to the UI.
    try { window.localStorage.removeItem(GUEST_ASSESSMENT_V1_KEY); } catch { /* ignore */ }
    console.warn('[guest-assessment] cleared malformed v1 state');
    return null;
  }
}

export function saveGuestAssessmentState(state: GuestAssessmentState): GuestAssessmentState {
  const next = { ...state, version: 1 as const, updatedAt: new Date().toISOString() };
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(GUEST_ASSESSMENT_V1_KEY, JSON.stringify(next)); } catch { /* quota/private mode */ }
  }
  return next;
}

export function clearGuestAssessmentState() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(GUEST_ASSESSMENT_V1_KEY); } catch { /* ignore */ }
}

/**
 * Build a clearly-labeled DEMO report preview from guest memory (no backend).
 * Course rows are the structured sample set — the UI must badge this as a
 * "Demo Preview", never as a permanently saved report.
 */
export function buildGuestDemoReport(state: GuestAssessmentState): TransferReportJson {
  const p = state.personalInfo;
  const a = state.academicInfo;
  const t = state.targetInfo;
  const d = state.demoResult;
  const missingCount = state.documents.filter((doc) => doc.status === 'missing' || doc.status === 'requires_login').length;

  return safeParseReportJson({
    student_summary: {
      student_name: p.fullName || 'Guest student',
      email: p.email || '—',
      phone: p.phone || '—',
      nationality: p.nationality || '—',
      preferred_language: p.preferredLanguage || '—',
    },
    academic_profile: {
      current_country: a.currentCountry, current_university: a.currentUniversity,
      current_program: a.currentProgram, current_year: a.currentYear,
      gpa: a.gpa, gpa_scale: a.gpaScale, completed_credits: a.completedCredits,
    },
    target_profile: {
      target_country: t.targetCountry, target_university: t.targetUniversity,
      target_program: t.targetProgram, preferred_entry_year: t.preferredEntryYear,
      education_language: t.educationLanguage, budget_range: t.budgetRange,
    },
    analysis_summary: {
      estimated_transfer_match: d?.estimatedTransferMatch ?? 87,
      estimated_entry_level: d?.estimatedEntryLevel ?? 'Year 2',
      likely_recognized_courses: d?.likelyRecognizedCourses ?? '12 / 18',
      missing_documents_count: d?.missingDocumentsCount ?? missingCount,
      ai_confidence: d?.aiConfidence ?? 'High',
      risk_level: d?.riskLevel ?? 'Medium',
      recommended_university: d?.recommendedUniversity ?? (t.targetUniversity || 'Istanbul Medipol University'),
      recommended_next_step: d?.recommendedNextStep ?? 'Create an account to save this analysis and unlock the full AI report.',
    },
    course_equivalencies: SAMPLE_COURSE_EQUIVALENCIES,
    missing_documents: [
      { document_type: 'Course Syllabus', reason: 'Needed for detailed course equivalency review', priority: 'High' },
      { document_type: 'Language Certificate', reason: 'May be required by the target university', priority: 'Medium' },
    ],
    risk_factors: [
      { title: 'Demo preview only', description: 'This preview is generated on your device and is not a saved report.', severity: 'Low' },
      { title: 'Course descriptions', description: 'Some course descriptions may be missing until a transcript is analyzed.', severity: 'Medium' },
    ],
    ai_recommendation: {
      summary: 'This is a preliminary demo estimate based on the details you entered. Create an account to upload your transcript, run real AI extraction and get a saved, human-reviewable report.',
      next_steps: ['Create a free account to save this analysis.', 'Upload your real transcript for AI course extraction.', 'Request ACCA advisor review.'],
    },
    human_review: { status: HUMAN_REVIEW_PENDING, reviewer: '', notes: '' },
    disclaimer: { text: REPORT_DISCLAIMER },
  });
}
