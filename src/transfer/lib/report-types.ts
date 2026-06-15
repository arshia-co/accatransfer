// Shared TransferReportJson contract + safe builders/parsers.
//
// This is the single source of truth for the AI Transfer report shape, used by
// `/report-demo` (rendering), the report Edge Function (writing), and the guest
// demo preview. Everything here is pure and dependency-free so it is safe to
// import from both the browser and (a copy in) Edge Functions.
//
// IMPORTANT: AI output is advisory and human-reviewable. The "Deniz A." sample
// must appear ONLY via `DEMO_FALLBACK_REPORT` (explicit demo fallback mode).

export type TransferReportJson = {
  student_summary: {
    student_name: string;
    email: string;
    phone: string;
    nationality: string;
    preferred_language: string;
  };
  academic_profile: {
    current_country: string;
    current_university: string;
    current_program: string;
    current_year: string;
    gpa: string;
    gpa_scale: string;
    completed_credits: string;
  };
  target_profile: {
    target_country: string;
    target_university: string;
    target_program: string;
    preferred_entry_year: string;
    education_language: string;
    budget_range: string;
  };
  analysis_summary: {
    estimated_transfer_match: number;
    estimated_entry_level: string;
    likely_recognized_courses: string;
    missing_documents_count: number;
    ai_confidence: string;
    risk_level: string;
    recommended_university: string;
    recommended_next_step: string;
  };
  course_equivalencies: Array<{
    source_course: string;
    target_course: string;
    ects: number;
    match_score: number;
    status: string;
    notes: string;
  }>;
  missing_documents: Array<{
    document_type: string;
    reason: string;
    priority: 'Low' | 'Medium' | 'High' | string;
  }>;
  risk_factors: Array<{
    title: string;
    description: string;
    severity: 'Low' | 'Medium' | 'High' | string;
  }>;
  ai_recommendation: {
    summary: string;
    next_steps: string[];
  };
  human_review: {
    status: string;
    reviewer: string;
    notes: string;
  };
  disclaimer: {
    text: string;
  };
};

export const REPORT_DISCLAIMER =
  'ACCA Transfer AI provides AI-assisted academic transfer analysis based on available documents and university rules. Results are estimates and do not guarantee admission, course recognition, or year placement. Final decisions are made by the receiving university.';

export const HUMAN_REVIEW_PENDING = 'Pending ACCA advisor review';

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : fallback;
const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/**
 * Coerce arbitrary JSON (e.g. `transfer_reports.report_json`) into a complete,
 * render-safe TransferReportJson. Never throws; missing fields become safe
 * defaults so the report UI can always render all 11 sections.
 */
export function safeParseReportJson(input: unknown): TransferReportJson {
  const root = isObj(input) ? input : {};
  const ss = isObj(root.student_summary) ? root.student_summary : {};
  const ap = isObj(root.academic_profile) ? root.academic_profile : {};
  const tp = isObj(root.target_profile) ? root.target_profile : {};
  const as = isObj(root.analysis_summary) ? root.analysis_summary : {};
  const ar = isObj(root.ai_recommendation) ? root.ai_recommendation : {};
  const hr = isObj(root.human_review) ? root.human_review : {};
  const dc = isObj(root.disclaimer) ? root.disclaimer : {};

  return {
    student_summary: {
      student_name: str(ss.student_name, '—'),
      email: str(ss.email, '—'),
      phone: str(ss.phone, '—'),
      nationality: str(ss.nationality, '—'),
      preferred_language: str(ss.preferred_language, '—'),
    },
    academic_profile: {
      current_country: str(ap.current_country, '—'),
      current_university: str(ap.current_university, '—'),
      current_program: str(ap.current_program, '—'),
      current_year: str(ap.current_year, '—'),
      gpa: str(ap.gpa, '—'),
      gpa_scale: str(ap.gpa_scale, '—'),
      completed_credits: str(ap.completed_credits, '—'),
    },
    target_profile: {
      target_country: str(tp.target_country, '—'),
      target_university: str(tp.target_university, '—'),
      target_program: str(tp.target_program, '—'),
      preferred_entry_year: str(tp.preferred_entry_year, '—'),
      education_language: str(tp.education_language, '—'),
      budget_range: str(tp.budget_range, '—'),
    },
    analysis_summary: {
      estimated_transfer_match: num(as.estimated_transfer_match, 0),
      estimated_entry_level: str(as.estimated_entry_level, 'Pending review'),
      likely_recognized_courses: str(as.likely_recognized_courses, '—'),
      missing_documents_count: num(as.missing_documents_count, 0),
      ai_confidence: str(as.ai_confidence, 'Pending'),
      risk_level: str(as.risk_level, 'Pending'),
      recommended_university: str(as.recommended_university, '—'),
      recommended_next_step: str(as.recommended_next_step, 'Human review required'),
    },
    course_equivalencies: arr(root.course_equivalencies).map((row) => {
      const r = isObj(row) ? row : {};
      return {
        source_course: str(r.source_course, '—'),
        target_course: str(r.target_course, '—'),
        ects: num(r.ects, 0),
        match_score: num(r.match_score, 0),
        status: str(r.status, 'Needs review'),
        notes: str(r.notes, ''),
      };
    }),
    missing_documents: arr(root.missing_documents).map((row) => {
      const r = isObj(row) ? row : {};
      return {
        document_type: str(r.document_type, '—'),
        reason: str(r.reason, ''),
        priority: str(r.priority, 'Medium'),
      };
    }),
    risk_factors: arr(root.risk_factors).map((row) => {
      const r = isObj(row) ? row : {};
      return {
        title: str(r.title, '—'),
        description: str(r.description, ''),
        severity: str(r.severity, 'Medium'),
      };
    }),
    ai_recommendation: {
      summary: str(ar.summary, 'Human review is recommended before submission to the university.'),
      next_steps: arr(ar.next_steps).map((s) => str(s)).filter(Boolean),
    },
    human_review: {
      status: str(hr.status, HUMAN_REVIEW_PENDING),
      reviewer: str(hr.reviewer, ''),
      notes: str(hr.notes, ''),
    },
    disclaimer: {
      text: str(dc.text, REPORT_DISCLAIMER),
    },
  };
}

/** Flat application fields used to build a report when no AI report exists yet. */
export type ApplicationFields = {
  student_name?: string;
  email?: string;
  phone?: string;
  nationality?: string;
  preferred_language?: string;
  current_country?: string;
  current_university?: string;
  current_program?: string;
  current_year?: string;
  gpa?: string;
  gpa_scale?: string;
  completed_credits?: string;
  target_country?: string;
  target_university?: string;
  target_program?: string;
  preferred_entry_year?: string;
  education_language?: string;
  budget_range?: string;
  has_syllabus?: boolean;
  has_language_certificate?: boolean;
};

/**
 * Build a report from raw application fields when there is no AI report yet
 * (e.g. courses empty → "Pending OCR / human review required" content).
 */
export function buildReportFromApplication(fields: ApplicationFields): TransferReportJson {
  const missing: TransferReportJson['missing_documents'] = [];
  if (!fields.has_syllabus) {
    missing.push({ document_type: 'Course Syllabus', reason: 'Needed for detailed course equivalency review', priority: 'High' });
  }
  if (!fields.has_language_certificate) {
    missing.push({ document_type: 'Language Certificate', reason: 'May be required by the target university', priority: 'Medium' });
  }

  return safeParseReportJson({
    student_summary: {
      student_name: fields.student_name, email: fields.email, phone: fields.phone,
      nationality: fields.nationality, preferred_language: fields.preferred_language,
    },
    academic_profile: {
      current_country: fields.current_country, current_university: fields.current_university,
      current_program: fields.current_program, current_year: fields.current_year,
      gpa: fields.gpa, gpa_scale: fields.gpa_scale, completed_credits: fields.completed_credits,
    },
    target_profile: {
      target_country: fields.target_country, target_university: fields.target_university,
      target_program: fields.target_program, preferred_entry_year: fields.preferred_entry_year,
      education_language: fields.education_language, budget_range: fields.budget_range,
    },
    analysis_summary: {
      estimated_transfer_match: 0,
      estimated_entry_level: 'Pending review',
      likely_recognized_courses: 'Pending OCR / human review required',
      missing_documents_count: missing.length,
      ai_confidence: 'Pending',
      risk_level: 'Pending',
      recommended_university: fields.target_university || '—',
      recommended_next_step: 'Upload your transcript so the AI can extract courses, then request human review.',
    },
    course_equivalencies: [],
    missing_documents: missing,
    risk_factors: [
      { title: 'Transcript not yet analyzed', description: 'Course equivalencies require an extracted transcript or human review.', severity: 'High' },
    ],
    ai_recommendation: {
      summary: 'Your application is saved. Upload a clear transcript to unlock AI course extraction, or request ACCA advisor review.',
      next_steps: ['Upload a clear transcript (PDF or image).', 'Add missing documents.', 'Request ACCA advisor review.'],
    },
    human_review: { status: HUMAN_REVIEW_PENDING, reviewer: '', notes: '' },
    disclaimer: { text: REPORT_DISCLAIMER },
  });
}

/** The structured sample course matrix shared by demo + early-stage reports. */
export const SAMPLE_COURSE_EQUIVALENCIES: TransferReportJson['course_equivalencies'] = [
  { source_course: 'Calculus I', target_course: 'Mathematics I', ects: 6, match_score: 94, status: 'Likely Recognized', notes: 'Syllabus and credit overlap > 90%.' },
  { source_course: 'Programming I', target_course: 'Intro to Programming', ects: 6, match_score: 96, status: 'Likely Recognized', notes: 'Identical learning outcomes.' },
  { source_course: 'Physics I', target_course: 'General Physics', ects: 5, match_score: 82, status: 'Needs Syllabus Review', notes: 'Missing lab component verification.' },
  { source_course: 'Linear Algebra', target_course: 'Linear Algebra', ects: 5, match_score: 91, status: 'Likely Recognized', notes: 'Direct topic match.' },
  { source_course: 'Academic English', target_course: 'English for Engineers', ects: 4, match_score: 88, status: 'Needs Review', notes: 'Equivalent CEFR target level.' },
];

/** Explicit demo fallback (the ONLY place "Deniz A." may appear). */
export const DEMO_FALLBACK_REPORT: TransferReportJson = safeParseReportJson({
  student_summary: { student_name: 'Deniz A.', email: 'demo@acca-transfer.ai', phone: '—', nationality: 'Türkiye', preferred_language: 'English' },
  academic_profile: {
    current_country: 'Türkiye', current_university: 'Example University', current_program: 'Computer Engineering',
    current_year: 'Year 2', gpa: '2.91', gpa_scale: '4.00', completed_credits: '72 ECTS',
  },
  target_profile: {
    target_country: 'Türkiye', target_university: 'Istanbul Medipol University', target_program: 'Software Engineering',
    preferred_entry_year: '2026', education_language: 'English', budget_range: '$3k–$6k / year',
  },
  analysis_summary: {
    estimated_transfer_match: 87, estimated_entry_level: 'Year 2', likely_recognized_courses: '12 / 18',
    missing_documents_count: 2, ai_confidence: 'High', risk_level: 'Medium',
    recommended_university: 'Istanbul Medipol University',
    recommended_next_step: 'Upload syllabus for Physics I and Academic English',
  },
  course_equivalencies: SAMPLE_COURSE_EQUIVALENCIES,
  missing_documents: [
    { document_type: 'Physics I syllabus', reason: 'Needed for detailed course equivalency review', priority: 'High' },
    { document_type: 'English certificate', reason: 'May be required by the target university', priority: 'Medium' },
  ],
  risk_factors: [
    { title: 'Missing course descriptions', description: 'Some course descriptions are missing.', severity: 'Medium' },
    { title: 'Final year placement', description: 'Final year placement depends on university committee review.', severity: 'Medium' },
    { title: 'Language certificate', description: 'Language certificate may be required.', severity: 'Low' },
  ],
  ai_recommendation: {
    summary: 'The student appears to be a strong candidate for transfer review. The estimated transfer match is high based on GPA, completed credits, and STEM course alignment. Human review is recommended before submission to the university.',
    next_steps: ['Upload Physics I syllabus.', 'Add an English language certificate.', 'Request ACCA advisor review before submission.'],
  },
  human_review: { status: HUMAN_REVIEW_PENDING, reviewer: '', notes: '' },
  disclaimer: { text: REPORT_DISCLAIMER },
});
