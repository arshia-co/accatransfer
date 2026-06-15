// ───────────────────────────────────────────────────────────────────────────
// Per-course transfer matching engine for the guest "Check Eligibility" flow.
//
// Pure, deterministic, dependency-free. NO backend and NO randomness, so the
// same inputs always produce the same scores (stable across React re-renders).
// This is the on-device "mock AI" seam: when the real backend is connected
// post-login, the same CourseMatch[] shape can be returned by the Edge Function
// instead, with no UI changes.
//
// It estimates, for each CORE / specialised course a student entered, how likely
// it is to be recognised at the chosen target program & university, then averages
// those into an overall transfer-success estimate.
// ───────────────────────────────────────────────────────────────────────────

export type CoreCourse = {
  id: string;
  name: string;
  /** Free-text grade: "18/20", "A", "3.4/4", "85", Persian digits, etc. */
  grade: string;
};

export type CourseMatchStatus = 'likely' | 'review' | 'unlikely';

export type CourseMatch = {
  id: string;
  name: string;
  gradeLabel: string;
  /** 0–100 probability that this course is recognised at the target program. */
  matchScore: number;
  status: CourseMatchStatus;
};

export type MatchContext = {
  currentProgram: string;
  targetProgram: string;
  /** Overall GPA as a 0–1 ratio, used as a soft prior when a course grade is unparseable. */
  gpaRatio: number | null;
};

export type OverallMatch = {
  /** Average of the per-course match scores (the headline transfer-success %). */
  score: number;
  total: number;
  likely: number;
  review: number;
  unlikely: number;
};

const LETTER_GRADES: Record<string, number> = {
  'a+': 0.98, a: 0.94, 'a-': 0.9,
  'b+': 0.87, b: 0.83, 'b-': 0.79,
  'c+': 0.75, c: 0.71, 'c-': 0.67,
  'd+': 0.63, d: 0.6, 'd-': 0.56,
  e: 0.5, f: 0.4,
};

/** Normalise Persian (۰-۹) and Arabic (٠-٩) digits to ASCII so grades parse. */
function toAsciiDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/**
 * Parse a free-text grade into a 0–1 ratio.
 * Supports letter grades (A, B+, …), "score/scale" (18/20, 3.4/4), and a bare
 * number whose scale is inferred (≤4 → /4, ≤20 → /20, else → /100).
 * Returns null when nothing usable is found.
 */
export function parseGradeRatio(grade: string): number | null {
  const raw = toAsciiDigits((grade ?? '').trim().toLowerCase());
  if (!raw) return null;

  const numbers = raw.replace(',', '.').match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];

  if (!numbers.length) {
    const letter = raw.match(/^[a-f][+-]?/)?.[0];
    return letter && letter in LETTER_GRADES ? LETTER_GRADES[letter] : null;
  }

  const [score, explicitScale] = numbers;
  const scale = explicitScale || (score <= 4 ? 4 : score <= 20 ? 20 : 100);
  if (!scale || score > scale) return null;
  return Math.max(0, Math.min(1, score / scale));
}

/** Stable per-string hash → small deterministic variance, never Math.random. */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function normalizeProgram(value: string): string[] {
  return (value ?? '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

/**
 * How aligned the current and target programs are, 0–1.
 * Identical → 1, strong token overlap → 0.85, some overlap → 0.6,
 * no overlap → 0.3, unknown (empty) → 0.45 (neutral).
 */
export function programAlignmentRatio(currentProgram: string, targetProgram: string): number {
  const current = normalizeProgram(currentProgram);
  const target = normalizeProgram(targetProgram);
  if (!current.length || !target.length) return 0.45;
  if (current.join(' ') === target.join(' ')) return 1;
  const overlap = current.filter((token) => target.includes(token)).length;
  if (overlap >= 2) return 0.85;
  if (overlap === 1) return 0.6;
  return 0.3;
}

export function computeCourseMatch(course: CoreCourse, ctx: MatchContext): CourseMatch {
  const gradeRatio = parseGradeRatio(course.grade) ?? ctx.gpaRatio ?? 0.7;
  const alignment = programAlignmentRatio(ctx.currentProgram, ctx.targetProgram);

  const base = 50;
  const gradeComponent = (gradeRatio - 0.5) * 48; // -24 … +24 — grade is the strongest signal
  const alignmentComponent = (alignment - 0.45) * 30; // program fit shifts every course up/down
  const jitter = (hashString(course.name || course.id) % 9) - 4; // -4 … +4, deterministic

  let score = Math.round(base + gradeComponent + alignmentComponent + jitter);
  score = Math.max(28, Math.min(97, score));

  const status: CourseMatchStatus = score >= 80 ? 'likely' : score >= 58 ? 'review' : 'unlikely';
  return { id: course.id, name: course.name.trim(), gradeLabel: course.grade.trim(), matchScore: score, status };
}

export function computeCourseMatches(courses: CoreCourse[], ctx: MatchContext): CourseMatch[] {
  return courses
    .filter((course) => course.name.trim().length > 0)
    .map((course) => computeCourseMatch(course, ctx));
}

/** Overall transfer-success estimate = the average of the per-course scores. */
export function overallMatch(matches: CourseMatch[]): OverallMatch {
  const total = matches.length;
  if (!total) return { score: 0, total: 0, likely: 0, review: 0, unlikely: 0 };
  const sum = matches.reduce((acc, m) => acc + m.matchScore, 0);
  return {
    score: Math.round(sum / total),
    total,
    likely: matches.filter((m) => m.status === 'likely').length,
    review: matches.filter((m) => m.status === 'review').length,
    unlikely: matches.filter((m) => m.status === 'unlikely').length,
  };
}

export function newCoreCourse(): CoreCourse {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `course-${hashString(String(performance?.now?.() ?? '')) }-${Math.round((performance?.now?.() ?? 0))}`;
  return { id, name: '', grade: '' };
}
