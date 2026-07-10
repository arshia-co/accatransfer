// Per-course transfer matching engine for the guest "Check Eligibility" flow
// and the central AI Transfer account panel.
//
// This stays deterministic and frontend-safe, but it is no longer a flat/random
// estimate: it reads Turkish letter grades, detects related program families
// such as Dentistry / Dis Hekimligi, weighs specialised courses above general
// electives, and applies a small destination-university strictness adjustment.

export type CoreCourse = {
  id: string;
  name: string;
  /** Free-text grade: "AA", "BB", "18/20", "3.4/4", "85", Persian digits, etc. */
  grade: string;
  credits?: string | number | null;
  isCore?: boolean | null;
};

export type CourseMatchStatus = 'likely' | 'review' | 'unlikely';

export type CourseMatch = {
  id: string;
  name: string;
  gradeLabel: string;
  /** 0-100 probability that this course is recognised at the target program. */
  matchScore: number;
  status: CourseMatchStatus;
  /** Internal weighting for overall score; UI can ignore it. */
  weight?: number;
};

export type MatchContext = {
  currentProgram: string;
  targetProgram: string;
  targetUniversity?: string;
  /** Overall GPA as a 0-1 ratio, used as a soft prior when a course grade is unparseable. */
  gpaRatio: number | null;
};

export type OverallMatch = {
  /** Weighted average of per-course scores (the headline transfer-success %). */
  score: number;
  total: number;
  likely: number;
  review: number;
  unlikely: number;
};

const GENERIC_LETTER_GRADES: Record<string, number> = {
  'a+': 0.98, a: 0.94, 'a-': 0.9,
  'b+': 0.87, b: 0.83, 'b-': 0.79,
  'c+': 0.75, c: 0.71, 'c-': 0.67,
  'd+': 0.63, d: 0.6, 'd-': 0.56,
  e: 0.5, f: 0.4,
};

// Common Turkish higher-education letter grades. Values represent the middle
// of common percentage bands printed on Turkish transcripts:
// AA 90-100, BA 85-89, BB 75/80-84, CB 70/75-79, CC 60/70-74, etc.
const TURKISH_LETTER_GRADES: Record<string, number> = {
  aa: 0.96,
  ab: 0.92,
  ba: 0.875,
  bb: 0.82,
  bc: 0.775,
  cb: 0.725,
  cc: 0.645,
  dc: 0.57,
  dd: 0.52,
  fd: 0.25,
  ff: 0,
  fg: 0,
  na: 0,
  g: 0.78,
  b: 0.78,
  p: 0.72,
  yt: 0.72,
};

const HEALTH_FAMILIES = new Set([
  'dentistry',
  'medicine',
  'pharmacy',
  'nursing',
  'physiotherapy',
  'nutrition',
  'biomedical',
]);

/** Normalise Persian and Arabic digits to ASCII so grades parse. */
function toAsciiDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

function stripMarks(value: string): string {
  return toAsciiDigits(value ?? '')
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9\s/.,+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstKnownLetterGrade(raw: string): string | null {
  const normalized = stripMarks(raw);
  const compact = normalized.replace(/\s+/g, '');
  const turkish = compact.match(/(?:^|[^a-z])(aa|ab|ba|bb|bc|cb|cc|dc|dd|fd|ff|fg|na|yt|g|p|b)(?:[^a-z]|$)/)?.[1]
    || compact.match(/(aa|ab|ba|bb|bc|cb|cc|dc|dd|fd|ff|fg|na|yt)/)?.[1];
  if (turkish && turkish in TURKISH_LETTER_GRADES) return turkish;

  const generic = normalized.match(/(?:^|\s)(a\+|a-|a|b\+|b-|b|c\+|c-|c|d\+|d-|d|e|f)(?:\s|$)/)?.[1];
  return generic && generic in GENERIC_LETTER_GRADES ? generic : null;
}

/**
 * Parse a free-text grade into a 0-1 ratio.
 * Supports Turkish grades (AA, BA, BB, CB, CC, DC, DD, FD, FF), generic letter
 * grades, "score/scale" (18/20, 3.4/4), and bare numbers whose scale is inferred.
 */
export function parseGradeRatio(grade: string): number | null {
  const raw = toAsciiDigits((grade ?? '').trim().toLowerCase());
  if (!raw) return null;

  // Prefer letter grades first because OCR often returns values like
  // "16,00AA4" where numbers are attendance/credits, not the grade itself.
  const letter = firstKnownLetterGrade(raw);
  if (letter) {
    if (letter in TURKISH_LETTER_GRADES) return TURKISH_LETTER_GRADES[letter];
    if (letter in GENERIC_LETTER_GRADES) return GENERIC_LETTER_GRADES[letter];
  }

  const numbers = raw.replace(',', '.').match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (!numbers.length) return null;

  const [score, explicitScale] = numbers;
  const scale = explicitScale || (score <= 4 ? 4 : score <= 20 ? 20 : 100);
  if (!scale || score > scale) return null;
  return Math.max(0, Math.min(1, score / scale));
}

/** Stable per-string hash -> small deterministic variance, never Math.random. */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function normalizeProgram(value: string): string[] {
  return stripMarks(value)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function programFamily(value: string): string | null {
  const tokens = normalizeProgram(value);
  const text = tokens.join(' ');
  if (!text) return null;

  if (/(dent|dental|dentistry|odont|stomat|hekim|dish|dis|dnt)/.test(text)) return 'dentistry';
  if (/(medicine|medical|tip|tibbi|md\b)/.test(text)) return 'medicine';
  if (/(pharmacy|eczane|eczacilik)/.test(text)) return 'pharmacy';
  if (/(nursing|hemsire|hemsirelik)/.test(text)) return 'nursing';
  if (/(physio|fizyoterapi|rehabilitation)/.test(text)) return 'physiotherapy';
  if (/(nutrition|diyet|beslenme)/.test(text)) return 'nutrition';
  if (/(bioengineering|biomedical|biomedikal)/.test(text)) return 'biomedical';
  if (/(psychology|psikoloji)/.test(text)) return 'psychology';
  if (/(software|computer|programming|engineering|muhendis)/.test(text)) return 'engineering';
  if (/(business|management|finance|marketing|isletme|iktisat)/.test(text)) return 'business';
  if (/(law|hukuk)/.test(text)) return 'law';
  return null;
}

/**
 * How aligned the current and target programs are, 0-1.
 * Same family (e.g. Dentistry -> Dentistry) is a strong signal even when one
 * side is Turkish and the other is English.
 */
export function programAlignmentRatio(currentProgram: string, targetProgram: string): number {
  const current = normalizeProgram(currentProgram);
  const target = normalizeProgram(targetProgram);
  if (!current.length || !target.length) return 0.45;

  const currentFamily = programFamily(currentProgram);
  const targetFamily = programFamily(targetProgram);
  if (currentFamily && targetFamily) {
    if (currentFamily === targetFamily) return 1;
    if (HEALTH_FAMILIES.has(currentFamily) && HEALTH_FAMILIES.has(targetFamily)) return 0.72;
  }

  if (current.join(' ') === target.join(' ')) return 1;
  const overlap = current.filter((token) => target.includes(token)).length;
  if (overlap >= 2) return 0.85;
  if (overlap === 1) return 0.6;
  return 0.3;
}

function courseRelevanceRatio(course: CoreCourse, targetProgram: string): number {
  if (course.isCore === true) return 0.9;
  if (course.isCore === false) return 0.6;

  const name = stripMarks(`${course.name} ${course.id}`);
  const targetFamily = programFamily(targetProgram);

  if (targetFamily === 'dentistry') {
    if (/(^|\s)dnt\d+|tooth|dental|dentomaxillofacial|endodont|prosthodont|restorative|oral|periodont|orthodont|radiology|materials/.test(name)) return 1;
    if (/(anatomy|physiology|histology|embryology|microbiology|biochemistry|biology|genetics|chemistry|biophysics|biostatistics)/.test(name)) return 0.9;
    if (/(research|methodology|psychology|public speaking|presentation|academic writing|occupational health|health rights)/.test(name)) return 0.72;
    if (/(ataturk|turkish language|german|leadership|career planning|time management|entrepreneurship|brand)/.test(name)) return 0.58;
  }

  if (targetFamily && HEALTH_FAMILIES.has(targetFamily)) {
    if (/(anatomy|physiology|histology|embryology|microbiology|biochemistry|biology|genetics|chemistry|health|medical)/.test(name)) return 0.86;
  }

  const targetTokens = normalizeProgram(targetProgram);
  const courseTokens = normalizeProgram(course.name);
  const overlap = courseTokens.filter((token) => targetTokens.includes(token)).length;
  if (overlap >= 2) return 0.88;
  if (overlap === 1) return 0.7;
  return 0.62;
}

function universityStrictnessAdjustment(targetUniversity = '', targetProgram = ''): number {
  const university = stripMarks(targetUniversity);
  const family = programFamily(targetProgram);
  let adjustment = 0;

  if (/(koc|sabanci|bilkent|bogazici)/.test(university)) adjustment -= 8;
  else if (/(medipol|bahcesehir|yeditepe|acibadem|bezmialem)/.test(university)) adjustment -= 5;
  else if (/(aydin|istanbul aydin|biruni|altinbas|okan|gelisim|uskudar|kent|nisantasi|istinye)/.test(university)) adjustment -= 2;
  else if (university) adjustment -= 3;

  if (family === 'dentistry' || family === 'medicine' || family === 'pharmacy') adjustment -= 2;
  return adjustment;
}

function courseWeight(course: CoreCourse, relevance: number): number {
  const credit = typeof course.credits === 'number'
    ? course.credits
    : Number(String(course.credits ?? '').replace(',', '.').match(/\d+(?:\.\d+)?/)?.[0] ?? 0);
  const creditWeight = credit > 0 ? Math.min(1.35, Math.max(0.85, credit / 4)) : 1;
  const relevanceWeight = relevance >= 0.88 ? 1.28 : relevance >= 0.72 ? 1.05 : 0.72;
  return Number((creditWeight * relevanceWeight).toFixed(2));
}

export function computeCourseMatch(course: CoreCourse, ctx: MatchContext): CourseMatch {
  const gradeRatio = parseGradeRatio(course.grade) ?? ctx.gpaRatio ?? 0.7;
  const alignment = programAlignmentRatio(ctx.currentProgram, ctx.targetProgram);
  const relevance = courseRelevanceRatio(course, ctx.targetProgram);
  const strictness = universityStrictnessAdjustment(ctx.targetUniversity, ctx.targetProgram);

  const base = 42;
  const gradeComponent = (gradeRatio - 0.5) * 56;
  const alignmentComponent = (alignment - 0.45) * 28;
  const relevanceComponent = (relevance - 0.58) * 28;
  const gpaComponent = ctx.gpaRatio == null ? 0 : (ctx.gpaRatio - 0.7) * 8;
  const jitter = (hashString(course.name || course.id) % 5) - 2;

  let score = Math.round(base + gradeComponent + alignmentComponent + relevanceComponent + gpaComponent + strictness + jitter);
  score = Math.max(18, Math.min(97, score));

  const status: CourseMatchStatus = score >= 78 ? 'likely' : score >= 58 ? 'review' : 'unlikely';
  return {
    id: course.id,
    name: course.name.trim(),
    gradeLabel: course.grade.trim(),
    matchScore: score,
    status,
    weight: courseWeight(course, relevance),
  };
}

export function computeCourseMatches(courses: CoreCourse[], ctx: MatchContext): CourseMatch[] {
  return courses
    .filter((course) => course.name.trim().length > 0)
    .map((course) => computeCourseMatch(course, ctx));
}

/** Overall transfer-success estimate = weighted average of the per-course scores. */
export function overallMatch(matches: CourseMatch[]): OverallMatch {
  const total = matches.length;
  if (!total) return { score: 0, total: 0, likely: 0, review: 0, unlikely: 0 };
  const weighted = matches.reduce((acc, m) => {
    const weight = Number.isFinite(Number(m.weight)) ? Number(m.weight) : 1;
    return { score: acc.score + m.matchScore * weight, weight: acc.weight + weight };
  }, { score: 0, weight: 0 });
  return {
    score: Math.round(weighted.score / (weighted.weight || total)),
    total,
    likely: matches.filter((m) => m.status === 'likely').length,
    review: matches.filter((m) => m.status === 'review').length,
    unlikely: matches.filter((m) => m.status === 'unlikely').length,
  };
}

export function newCoreCourse(): CoreCourse {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `course-${hashString(String(performance?.now?.() ?? ''))}-${Math.round((performance?.now?.() ?? 0))}`;
  return { id, name: '', grade: '' };
}
